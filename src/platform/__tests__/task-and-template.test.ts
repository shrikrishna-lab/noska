/* Platform V5 — rich task metadata + template planning tests. */
import { describe, it, expect } from "vitest";
import {
  normalizeTaskFieldPatch, taskCheckedPatch, normalizeTaskMeta,
  planTemplateInstantiation,
} from "../../../supabase/functions/_shared/core/pure.ts";

describe("rich task metadata", () => {
  it("promotes well-typed fields", () => {
    const { set } = normalizeTaskFieldPatch({
      priority: "high",
      assignee: "lena",
      dueAt: "2026-09-01T09:00:00Z",
      labels: ["os", "exam"],
      recurrence: "weekly mon",
      parent_task_id: "9f1d3a2b-1111-2222-3333-abcdefabcdef",
    });
    expect(set).toMatchObject({
      priority: "high", assignee: "lena",
      dueAt: "2026-09-01T09:00:00Z",
      labels: ["os", "exam"], recurrence: "weekly mon",
    });
  });

  it("drops invalid values so legacy data can never be corrupted", () => {
    const { set } = normalizeTaskFieldPatch({
      priority: "mega-ultra",
      dueAt: "tomorrow-ish",
      labels: "not-an-array",
    });
    expect(set.priority).toBeUndefined();
    expect(set.dueAt).toBeUndefined();
    expect(set.labels).toBeUndefined();
  });

  it("explicit null clears a field via the clear list", () => {
    const { set, clear } = normalizeTaskFieldPatch({ priority: null, dueAt: null });
    expect(set.priority).toBeUndefined();
    expect(clear).toContain("priority");
    expect(clear).toContain("dueAt");
  });

  it("checked transitions manage completedAt honestly", () => {
    const done = taskCheckedPatch({ id: "t1" }, true);
    expect(done.checked).toBe(true);
    expect(typeof done.completedAt).toBe("string");

    const reopened = taskCheckedPatch(done, false);
    expect(reopened.checked).toBe(false);
    expect(reopened.completedAt).toBeUndefined();
  });

  it("normalizeTaskMeta ignores page routing fields in block metadata", () => {
    const patch = normalizeTaskMeta({ page_id: "p1", createdBy: "u1", completedAt: "2026-08-24T00:00:00Z" });
    expect(patch.page_id).toBe("p1");
    expect(patch.createdBy).toBe("u1");
    expect(patch.completedAt).toBeTypeOf("string");
  });
});

describe("template instantiation planner", () => {
  it("flattens nested pages with parent references by path", () => {
    const plan = planTemplateInstantiation({
      pages: [
        { title: "OS", markdown: "# Operating Systems", children: [
          { title: "Week 1", markdown: "- [ ] Read chapter 1" },
          { title: "Week 2" },
        ] },
        { title: "DBMS" },
      ],
    });

    const pages = plan.filter((s) => s.op === "create_page");
    expect(pages).toHaveLength(4);
    expect(pages[0]).toMatchObject({ op: "create_page", title: "OS", parentPath: null });
    expect(pages[1]).toMatchObject({ op: "create_page", title: "Week 1", parentPath: "0" });
    expect(pages[2]).toMatchObject({ op: "create_page", title: "Week 2", parentPath: "0" });
    // depth-first ordering guarantees parents are created before children
    const osIdx = plan.findIndex((s) => s.op === "create_page" && (s as { title: string }).title === "OS");
    const w1Idx = plan.findIndex((s) => s.op === "create_page" && (s as { title: string }).title === "Week 1");
    expect(osIdx).toBeLessThan(w1Idx);
  });

  it("orders pages first, then tasks/databases/dashboards/agents", () => {
    const plan = planTemplateInstantiation({
      tasks: [{ title: "T1" }],
      databases: [{ title: "D1" }],
      dashboards: [{ name: "Dash" }],
      agents: [{ name: "Guardian" }],
      pages: [{ title: "P1" }],
    });
    const ops = plan.map((s) => s.op);
    expect(ops).toEqual([
      "create_page", "create_task", "create_database", "create_dashboard", "create_agent",
    ]);
  });

  it("handles an empty body gracefully", () => {
    expect(planTemplateInstantiation({})).toEqual([]);
  });

  it("task steps carry scheduling hints through", () => {
    const plan = planTemplateInstantiation({
      tasks: [{ title: "Exam prep", dueAt: "2026-09-10T09:00:00Z", priority: "urgent", page_title: "OS" }],
    });
    expect(plan[0]).toMatchObject({
      op: "create_task", title: "Exam prep",
      dueAt: "2026-09-10T09:00:00Z", priority: "urgent", pageTitle: "OS",
    });
  });
});
