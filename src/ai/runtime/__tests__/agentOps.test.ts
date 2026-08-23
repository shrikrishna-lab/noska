import { describe, it, expect } from "vitest";
import {
  computeHealth, failureDiagnosis, usageStats, splitByWindow,
} from "../agentOps";
import type { RunRecord } from "../types";

function run(overrides: Partial<RunRecord>): RunRecord {
  return {
    id: `run_${Math.random().toString(36).slice(2)}`,
    sourceId: "agent-1",
    sourceKind: "agent",
    trigger: "schedule",
    status: "completed",
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    steps: [],
    toolCalls: [],
    affectedResources: [],
    approvals: [],
    errors: [],
    ...overrides,
  };
}

describe("computeHealth", () => {
  it("reports disabled when paused", () => {
    const h = computeHealth({ runs: [], enabled: false, hasRequiredConfiguration: true });
    expect(h.status).toBe("disabled");
  });

  it("reports needs_configuration honestly (#2)", () => {
    const h = computeHealth({ runs: [], enabled: true, hasRequiredConfiguration: false });
    expect(h.status).toBe("needs_configuration");
    expect(h.suggestedFix).toMatch(/Background execution/i);
  });

  it("healthy with no runs but ready", () => {
    const h = computeHealth({ runs: [], enabled: true, hasRequiredConfiguration: true });
    expect(h.status).toBe("healthy");
    expect(h.reasons[0]).toMatch(/No runs yet/);
  });

  it("failing after 3+ consecutive failures, with a diagnosis fix", () => {
    const runs = [
      run({ status: "failed", errors: ["Permission denied for page editing"] }),
      run({ status: "failed" }),
      run({ status: "failed" }),
      run({ status: "completed" }), // older success doesn't break the streak
    ];
    const h = computeHealth({ runs, enabled: true, hasRequiredConfiguration: true });
    expect(h.status).toBe("failing");
    expect(h.reasons[0]).toMatch(/3 runs failed/);
    expect(h.suggestedFix).toMatch(/permission/i);
  });

  it("warning on intermittent failures", () => {
    const runs = [run({ status: "failed" }), run({ status: "completed" }), run({ status: "completed" })];
    const h = computeHealth({ runs, enabled: true, hasRequiredConfiguration: true });
    expect(h.status).toBe("warning");
  });

  it("healthy with recent successes", () => {
    const runs = [run({}), run({})];
    const h = computeHealth({ runs, enabled: true, hasRequiredConfiguration: true });
    expect(h.status).toBe("healthy");
    expect(h.successRate).toBe(100);
  });

  it("warning while waiting approval", () => {
    const h = computeHealth({
      runs: [run({ status: "awaiting_approval" })],
      enabled: true,
      hasRequiredConfiguration: true,
      waitingApproval: true,
    });
    expect(h.status).toBe("warning");
    expect(h.reasons[0]).toMatch(/approval/i);
  });
});

describe("failureDiagnosis", () => {
  it("diagnoses permission failures with fix action", () => {
    const d = failureDiagnosis(run({
      status: "failed",
      steps: [
        { stepId: "1", label: "Gather data", status: "done" },
        { stepId: "2", label: "Update research page", status: "failed" },
      ],
      errors: ["Tool append_blocks failed: Permission denied for page editing"],
    }));
    expect(d.failedStep).toBe("Update research page");
    expect(d.reason).toBe("Permission denied");
    expect(d.fixAction).toBe("permissions");
    expect(d.suggestedFix).toMatch(/permission|approval/i);
  });

  it("diagnoses timeouts", () => {
    const d = failureDiagnosis(run({ status: "timed_out", errors: ["Execution exceeded its time budget"] }));
    expect(d.fixAction).toBe("timeout");
  });

  it("diagnoses missing configuration without retry suggestion", () => {
    const d = failureDiagnosis("Background execution is not configured yet (skipped: not_configured)");
    expect(d.fixAction).toBe("configuration");
    expect(d.suggestedFix).toMatch(/Background execution/);
  });

  it("falls back to retry for unknown errors", () => {
    const d = failureDiagnosis("Something unusual happened");
    expect(d.fixAction).toBe("retry");
  });
});

describe("usage stats", () => {
  it("aggregates real counts only", () => {
    const runs = [
      run({ status: "completed", durationMs: 2000, toolCalls: [{ name: "search_pages", ok: true }, { name: "create_page", ok: true }] as never, counts: { modelCalls: 3, toolCalls: 2, delegations: 1, memoryWrites: 0 } }),
      run({ status: "failed", durationMs: 4000, counts: { modelCalls: 1, toolCalls: 0, delegations: 0, memoryWrites: 0 }, errors: ["x"] }),
    ];
    const s = usageStats(runs);
    expect(s.runs).toBe(2);
    expect(s.completed).toBe(1);
    expect(s.failed).toBe(1);
    expect(s.successRate).toBe(50);
    expect(s.toolCalls).toBe(2);
    expect(s.delegations).toBe(1);
    expect(s.modelCalls).toBe(4);
    expect(s.avgDurationMs).toBe(3000);
  });

  it("splits today vs month windows", () => {
    const now = new Date();
    const todayRun = run({});
    const oldRun = run({ startedAt: new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString() });
    const w = splitByWindow([todayRun, oldRun], now);
    expect(w.today).toHaveLength(1);
    expect(w.month).toHaveLength(1);
  });
});
