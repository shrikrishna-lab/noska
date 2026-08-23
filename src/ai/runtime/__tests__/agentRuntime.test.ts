import { describe, it, expect, vi, beforeEach } from "vitest";
import { agentRuntime } from "../AgentRuntime";
import { respondToApproval } from "../approvals";

// Mock the AI manager so the loop is fully deterministic.
vi.mock("../../AIManager", () => ({
  aiManager: {
    getConfig: () => ({ context: { tokenBudget: 2048 } }),
    isConfigured: () => true,
    getActiveProvider: () => null,
    sendRaw: vi.fn(),
  },
}));

import { aiManager } from "../../AIManager";
const mockSendRaw = aiManager.sendRaw as unknown as ReturnType<typeof vi.fn>;

// Some vitest environments boot without a working localStorage — provide a
// minimal in-memory shim so agent-store mirroring works under test.
if (typeof globalThis.localStorage === "undefined" || !globalThis.localStorage?.setItem) {
  const mem: Record<string, string> = {};
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => (k in mem ? mem[k] : null),
    setItem: (k: string, v: string) => { mem[k] = String(v); },
    removeItem: (k: string) => { delete mem[k]; },
    clear: () => { for (const k of Object.keys(mem)) delete mem[k]; },
    key: (i: number) => Object.keys(mem)[i] ?? null,
    get length() { return Object.keys(mem).length; },
  } as Storage;
}

function makeToolContext() {
  const pages = [
    { id: "p1", title: "Project Alpha", trashed: false, blocks: [{ id: "b1", type: "text", text: "Alpha notes" }] },
    { id: "p2", title: "Meeting Notes", trashed: false, blocks: [] },
  ];
  const created: string[] = [];
  return {
    ctx: {
      currentPage: pages[0],
      pages,
      actions: {
        createPage: (title: string) => {
          const id = `new_${created.length + 1}`;
          created.push(title);
          pages.push({ id, title, trashed: false, blocks: [] });
          return id;
        },
        updateAnyPage: (_id: string, _patch: Record<string, unknown>) => {},
        appendBlocks: () => {},
        renamePage: () => {},
      },
    },
    created,
    pages,
  };
}

describe("AgentRuntime end-to-end", () => {
  beforeEach(() => {
    mockSendRaw.mockReset();
    try { globalThis.localStorage?.clear(); } catch { /* jsdom/node may not provide it */ }
  });

  it("runs a multi-step create job: plans, uses tools via permission gate, verifies, reports", async () => {
    const tc = makeToolContext();

    // Step 1 round 1: the model emits a create_page tool call
    mockSendRaw.mockResolvedValueOnce(
      '<<TOOL:create_page>>{"title":"Launch Plan","icon":"🚀","content":"# Plan\\n- [ ] step one"}<</TOOL>>Creating the page now.'
    );
    // Step 1 round 2: completion summary without tools
    mockSendRaw.mockResolvedValueOnce("Context reviewed.");
    // Step 2 (creating content): already satisfied, plain text
    mockSendRaw.mockResolvedValueOnce("The Launch Plan page has been created.");

    const progressEvents: number[] = [];
    const run = await agentRuntime.execute({
      goal: "Create a launch plan page",
      sourceId: "test-agent",
      sourceKind: "agent",
      trigger: "manual",
      permissions: undefined, // defaults: create=auto
      getContext: () => tc.ctx,
      maxSteps: 4,
      onProgress: (steps) => progressEvents.push(steps.length),
    });

    expect(mockSendRaw).toHaveBeenCalledTimes(3);
    expect(run.status).toBe("completed");
    expect(run.errors).toHaveLength(0);
    expect(tc.created).toContain("Launch Plan");
    expect(run.toolCalls.some((t) => t.name === "create_page" && t.ok)).toBe(true);
    expect(run.summary).toContain("Launch Plan page has been created");
    // Progress was emitted for understand/plan/execute steps
    expect(progressEvents.length).toBeGreaterThanOrEqual(3);
  });

  it("refuses disabled categories honestly and never fabricates success", async () => {
    const tc = makeToolContext();
    mockSendRaw
      .mockResolvedValueOnce('<<TOOL:create_page>>{"title":"Nope"}<</TOOL>>')
      .mockResolvedValueOnce("I could not complete that action because permission is disabled.");

    const run = await agentRuntime.execute({
      goal: "Create something",
      sourceId: "test-agent",
      sourceKind: "agent",
      trigger: "manual",
      permissions: { read: "auto", create: "disabled", update: "disabled", delete: "disabled", memory: "disabled", agents: "disabled", automations: "disabled", external: "disabled" },
      getContext: () => tc.ctx,
      maxSteps: 3,
    });

    expect(tc.created).toHaveLength(0);
    expect(run.toolCalls[0].ok).toBe(false);
    expect(run.toolCalls[0].error).toMatch(/disabled/i);
    expect(run.status).toBe("completed"); // the run completes but reports refusal
  });

  it("pauses for approval when category mode is approval, and honors rejection", async () => {
    const tc = makeToolContext();
    mockSendRaw
      .mockResolvedValueOnce('<<TOOL:trash_page>>{"page_id":"p2"}<</TOOL>>')
      .mockResolvedValue("Understood — I will not delete anything.");

    const runPromise = agentRuntime.execute({
      goal: "Clean up meeting notes",
      sourceId: "test-agent",
      sourceKind: "agent",
      trigger: "manual",
      permissions: { read: "auto", create: "auto", update: "auto", delete: "approval", memory: "auto", agents: "disabled", automations: "disabled", external: "approval" },
      getContext: () => tc.ctx,
      maxSteps: 3,
    });

    // Wait for the approval request, then decline it.
    const { getPendingApprovals } = await import("../approvals");
    await vi.waitFor(async () => {
      if (getPendingApprovals().length === 0) throw new Error("no approval yet");
    });
    const pending = getPendingApprovals()[0];
    respondToApproval(pending.id, false);

    const run = await runPromise;
    expect(run.approvals.length).toBeGreaterThanOrEqual(1);
    expect(run.approvals[0].approved).toBe(false);
    expect(run.toolCalls[0].ok).toBe(false);
    expect(String(run.toolCalls[0].error)).toMatch(/declined/i);
  }, 15000);

  it("records honest failures when the model call throws", async () => {
    mockSendRaw.mockRejectedValue(new Error("All providers failed"));
    const run = await agentRuntime.execute({
      goal: "Analyze my workspace",
      sourceId: "noska-ai",
      sourceKind: "ai",
      trigger: "manual",
      getContext: () => makeToolContext().ctx,
      maxSteps: 3,
    });
    expect(run.status).toBe("failed");
    expect(run.errors.join(" ")).toMatch(/providers failed/i);
  });

  it("delegates to another persisted agent through run_agent (agents:auto)", async () => {
    // Seed the agent mirror so the delegate resolves
    const specialist = {
      id: "spec-1", name: "Weekly Reporter", description: "compiles reports", icon: "📊",
      instructions: "Write the weekly report.", status: "active", modelClass: "default",
      trigger: { type: "manual" }, contextScope: [], permissions: { read: "auto", create: "auto", update: "disabled", delete: "disabled", memory: "auto", agents: "disabled", automations: "disabled", external: "disabled" },
      maxRunsPerHour: 12, notifyOnRun: true,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    localStorage.setItem("noska_custom_agents", JSON.stringify([specialist]));

    // Orchestrator round 1: emits delegation; delegate round: plain text;
    // orchestrator round 2: wraps up.
    mockSendRaw
      .mockResolvedValueOnce('<<TOOL:run_agent>>{"agent_name":"Weekly Reporter","instruction":"compile Q3 numbers"}<</TOOL>>Delegating now.')
      .mockResolvedValueOnce("Report compiled.")
      .mockResolvedValueOnce("The Weekly Reporter compiled the report successfully.");

    const run = await agentRuntime.execute({
      goal: "Coordinate the weekly report",
      sourceId: "orchestrator-agent",
      sourceKind: "agent",
      trigger: "manual",
      permissions: { read: "auto", create: "auto", update: "auto", delete: "approval", memory: "auto", agents: "auto", automations: "auto", external: "approval" },
      getContext: () => makeToolContext().ctx,
      maxSteps: 3,
    });

    const delegation = run.toolCalls.find((t) => t.name === "run_agent");
    expect(delegation).toBeTruthy();
    expect(delegation!.ok).toBe(true);
    expect(String(delegation!.resultSummary)).toMatch(/Weekly Reporter/);
    // The delegate's summary was captured into vars for later steps
    expect(run.summary.length).toBeGreaterThan(0);
  });

  it("blocks delegation when the agents category is disabled", async () => {
    mockSendRaw
      .mockResolvedValueOnce('<<TOOL:run_agent>>{"agent_name":"Anyone"}<</TOOL>>')
      .mockResolvedValue("I could not delegate because permission is disabled.");

    const run = await agentRuntime.execute({
      goal: "Delegate some work",
      sourceId: "orchestrator-agent",
      sourceKind: "agent",
      trigger: "manual",
      permissions: { read: "auto", create: "auto", update: "auto", delete: "approval", memory: "auto", agents: "disabled", automations: "disabled", external: "disabled" },
      getContext: () => makeToolContext().ctx,
      maxSteps: 3,
    });

    const delegation = run.toolCalls.find((t) => t.name === "run_agent");
    expect(delegation!.ok).toBe(false);
    expect(String(delegation!.error)).toMatch(/disabled/i);
  });

  it("evaluates automation conditions across all operators", () => {
    const vars = { "event.pageTitle": "Project Phoenix", "event.blockText": "", "ai.response": "CRITICAL" };
    const evalC = (group: ConstructorParameters<typeof Object>[0]) =>
      agentRuntime.evaluateConditions(group as never, vars);

    expect(evalC({ op: "and", conditions: [{ field: "event.pageTitle", op: "contains", value: "phoenix" }] })).toBe(true);
    expect(evalC({ op: "and", conditions: [{ field: "event.pageTitle", op: "equals", value: "project phoenix" }] })).toBe(true);
    expect(evalC({ op: "and", conditions: [{ field: "event.blockText", op: "is_empty" }] })).toBe(true);
    expect(evalC({ op: "and", conditions: [{ field: "ai.response", op: "equals", value: "critical" }] })).toBe(true);
    expect(evalC({ op: "and", conditions: [
      { field: "event.pageTitle", op: "contains", value: "phoenix" },
      { field: "ai.response", op: "equals", value: "low" },
    ] })).toBe(false); // AND requires all
    expect(evalC({ op: "or", conditions: [
      { field: "ai.response", op: "equals", value: "low" },
      { field: "event.pageTitle", op: "starts_with", value: "project" },
    ] })).toBe(true); // OR requires any
    expect(evalC(null)).toBe(true); // no conditions → pass
    expect(evalC({ op: "and", conditions: [] })).toBe(true);
  });
});
