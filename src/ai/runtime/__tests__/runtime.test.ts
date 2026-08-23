import { describe, it, expect, beforeEach } from "vitest";
import { classifyIntent } from "../intent";
import { resolveTemplate, resolveParams, buildVars } from "../variables";
import { evaluatePermission, categoryForTool } from "../permissions";
import { LoopProtector } from "../loopProtection";
import { parseSchedule, describeSchedule, isScheduleDue, isValidTrigger, lastOccurrenceOnOrBefore } from "../scheduler";
import { buildPlan } from "../planner";
import { defaultPermissions, READ_ONLY_PERMISSIONS } from "../types";

describe("intent classification", () => {
  it("keeps plain questions informational", () => {
    expect(classifyIntent("What is a B+ tree?").intent).toBe("question");
    expect(classifyIntent("What is spaced repetition?").multiStep).toBe(false);
    expect(classifyIntent("How does photosynthesis work?").intent).toBe("question");
  });

  it("routes creation requests to create", () => {
    const r = classifyIntent("Create a Java Notes page");
    expect(r.intent).toBe("create");
    expect(r.multiStep).toBe(true);
  });

  it("detects automation requests", () => {
    expect(classifyIntent("Every Friday summarize my project progress").intent).toBe("automation_intent");
    expect(classifyIntent("When a task becomes completed, summarize it").intent).toBe("automation_intent");
    expect(classifyIntent("Automate my weekly report").intent).toBe("automation_intent");
  });

  it("detects agent creation requests", () => {
    expect(classifyIntent("Create an agent that manages my project tasks").intent).toBe("agent_intent");
    expect(classifyIntent("I want something that automatically reviews my notes").intent).toBe("agent_intent");
  });

  it("routes organize/analyze/plan intents", () => {
    expect(classifyIntent("Organize my project workspace").intent).toBe("organize");
    expect(classifyIntent("Analyze this project").intent).toBe("analyze");
    expect(classifyIntent("Find why this project is delayed").intent).toBe("analyze");
    expect(classifyIntent("Prepare me for tomorrow's meeting").intent).toBe("plan");
  });
});

describe("safe variables", () => {
  const vars = { task: { title: "Fix login", status: "Done" }, ai: { summary: "It works" } };

  it("resolves dotted paths", () => {
    expect(resolveTemplate("{{task.title}} is {{task.status}}", vars)).toBe("Fix login is Done");
  });

  it("resolves unknown variables to empty strings (never throws)", () => {
    expect(resolveTemplate("Hello {{nope.missing}}!", vars)).toBe("Hello !");
  });

  it("ignores input without templates", () => {
    expect(resolveTemplate("plain text", vars)).toBe("plain text");
  });

  it("resolves params objects", () => {
    expect(resolveParams({ content: "- {{ai.summary}}", count: 2 }, vars)).toEqual({ content: "- It works", count: 2 });
  });

  it("buildVars flattens nested objects", () => {
    const flat = buildVars("step", { page: { id: "p1", title: "T" }, n: 5 });
    expect(flat["step.page.id"]).toBe("p1");
    expect(flat["step.n"]).toBe("5");
  });
});

describe("permission gate", () => {
  it("maps tools to categories", () => {
    expect(categoryForTool("create_page")).toBe("create");
    expect(categoryForTool("trash_page")).toBe("delete");
    expect(categoryForTool("search_pages")).toBe("read");
    expect(categoryForTool("unknown_tool_xyz")).toBeNull();
  });

  it("refuses unknown tools outright", () => {
    const d = evaluatePermission("rm_rf_everything", undefined);
    expect(d.allowed).toBe(false);
  });

  it("blocks disabled categories", () => {
    const d = evaluatePermission("create_page", READ_ONLY_PERMISSIONS);
    expect(d.allowed).toBe(false);
    expect(d.reason).toContain("disabled");
  });

  it("requires approval for deletes by default", () => {
    const d = evaluatePermission("trash_page", defaultPermissions());
    expect(d.allowed).toBe(true);
    expect(d.requiresApproval).toBe(true);
  });

  it("allows reads silently by default", () => {
    const d = evaluatePermission("search_pages", defaultPermissions());
    expect(d.allowed && !d.requiresApproval).toBe(true);
  });
});

describe("loop protection", () => {
  const evt = () => ({
    type: "page_updated" as const,
    pageId: "p1",
    blockText: "hello",
    at: new Date().toISOString(),
  });

  it("blocks events caused by the same source", () => {
    const lp = new LoopProtector();
    const e = { ...evt(), provenance: { executionId: "x", sourceId: "agent-1" } };
    expect(lp.checkTrigger("agent-1", e)).toMatch(/itself/);
  });

  it("blocks runtime-caused events for other sources too", () => {
    const lp = new LoopProtector();
    const e = { ...evt(), provenance: { executionId: "x", sourceId: "other" } };
    expect(lp.checkTrigger("agent-2", e)).toMatch(/runtime execution/);
  });

  it("deduplicates identical events within the window", () => {
    const lp = new LoopProtector({ cooldownMs: 0 });
    expect(lp.checkTrigger("a", evt())).toBeNull();
    lp.recordRun("a", evt());
    expect(lp.checkTrigger("a", evt())).toMatch(/identical/);
  });

  it("enforces cooldowns between runs", () => {
    const lp = new LoopProtector({ cooldownMs: 60_000, dedupWindowMs: 0 });
    expect(lp.checkTrigger("a", evt())).toBeNull();
    lp.recordRun("a", evt());
    const e2 = { ...evt(), blockText: "different content entirely" };
    expect(lp.checkTrigger("a", e2)).toMatch(/cooling down/);
  });

  it("caps runs per rolling hour", () => {
    const lp = new LoopProtector({ cooldownMs: 0, dedupWindowMs: 0, maxRunsPerHour: 3 });
    let texts = 0;
    while (!lp.checkTrigger("a", { ...evt(), blockText: `unique-${texts++}` })) {
      lp.recordRun("a", { ...evt(), blockText: `unique-${texts}` });
      if (texts > 10) break;
    }
    expect(lp.checkTrigger("a", { ...evt(), blockText: `final-unique` })).toMatch(/limit/);
  });
});

describe("scheduler", () => {
  it("parses common schedule phrases", () => {
    expect(parseSchedule("every weekday at 8am")).toEqual({ kind: "every_weekday", hour: 8, minute: 0 });
    expect(parseSchedule("Every day at 6:30pm")).toEqual({ kind: "every_day", hour: 18, minute: 30 });
    expect(parseSchedule("weekly on friday at 4pm")).toEqual({ kind: "weekly", dayOfWeek: 5, hour: 16, minute: 0 });
    expect(parseSchedule("monthly on the 5th")).toEqual({ kind: "monthly", dayOfMonth: 5, hour: 8, minute: 0 });
    expect(parseSchedule("every 15 minutes")).toEqual({ kind: "interval", intervalMinutes: 15 });
    expect(parseSchedule("gibberish")).toBeNull();
  });

  it("describes schedules for humans", () => {
    expect(describeSchedule({ kind: "every_weekday", hour: 8, minute: 0 })).toBe("Every weekday · 8:00 AM");
  });

  it("fires the first scheduled run even when never run before", () => {
    const now = new Date("2026-08-20T09:00:00"); // Thursday
    expect(isScheduleDue({ kind: "every_day", hour: 8, minute: 0 }, now, null)).toBe(true);
    // 9am is after today's 8am occurrence → due with no lastRun
    const occ = lastOccurrenceOnOrBefore({ kind: "every_day", hour: 8, minute: 0 }, now);
    expect(occ?.getDate()).toBe(20);
  });

  it("does not refire after running past the latest occurrence", () => {
    const now = new Date("2026-08-20T09:00:00");
    // last run was today at 8am — today's 8am occurrence already consumed
    expect(isScheduleDue({ kind: "every_day", hour: 8, minute: 0 }, now, "2026-08-20T08:00:00")).toBe(false);
    // last run was yesterday at noon — today's 8am hasn't been consumed
    expect(isScheduleDue({ kind: "every_day", hour: 8, minute: 0 }, now, "2026-08-19T12:00:00")).toBe(true);
  });

  it("weekday schedules skip weekends", () => {
    const saturday = new Date("2026-08-22T09:00:00"); // Saturday
    const occ = lastOccurrenceOnOrBefore({ kind: "every_weekday", hour: 8, minute: 0 }, saturday);
    expect(occ?.getDay()).toBe(5); // Friday
    expect(isScheduleDue({ kind: "every_weekday", hour: 8, minute: 0 }, saturday, null)).toBe(true);
  });

  it("validates triggers defensively", () => {
    expect(isValidTrigger({ type: "manual" })).toBe(true);
    expect(isValidTrigger({ type: "schedule", schedule: { kind: "every_day", hour: 8 } })).toBe(true);
    expect(isValidTrigger({ type: "schedule", schedule: { kind: "nonsense" } })).toBe(false);
    expect(isValidTrigger({ type: "launch_missiles" })).toBe(false);
    expect(isValidTrigger(null)).toBe(false);
    expect(isValidTrigger("manual")).toBe(false);
  });
});

describe("planner", () => {
  it("builds multi-step plans for agentic intents", () => {
    const plan = buildPlan("Create a project plan", { intent: "plan", multiStep: true, rationale: "" });
    expect(plan.steps.length).toBeGreaterThan(1);
    expect(plan.steps.every((s) => s.label.length > 0)).toBe(true);
  });

  it("answers directly for questions", () => {
    const plan = buildPlan("What is a B+ tree?", { intent: "question", multiStep: false, rationale: "" });
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].kind).toBe("answer");
  });

  it("respects maxSteps cap", () => {
    const plan = buildPlan("Organize workspace", { intent: "organize", multiStep: true, rationale: "" }, { maxSteps: 2 });
    expect(plan.steps.length).toBeLessThanOrEqual(2);
  });
});
