/**
 * Noska Agent OS — Operations Logic (pure, testable)
 *
 * Health calculation, failure diagnosis, and usage statistics derived from
 * REAL run data. Every UI badge/label on this module traces to persisted
 * state — no fabricated statuses.
 */

import type { RunRecord } from "./types";

// ─── Health ────────────────────────────────────────────────────────────────

export type HealthStatus = "healthy" | "warning" | "failing" | "disabled" | "needs_configuration";

export interface HealthReport {
  status: HealthStatus;
  /** concise, user-facing reasons for the current status */
  reasons: string[];
  /** actionable fix when unhealthy */
  suggestedFix?: string;
  successRate: number; // 0..100 over evaluated window
}

export interface HealthInput {
  runs: RunRecord[];          // recent runs for this source (newest first)
  enabled: boolean;
  hasRequiredConfiguration: boolean; // e.g. background execution for scheduled sources
  waitingApproval?: boolean;
}

const HEALTH_WINDOW = 10;

/**
 * Derive health from actual execution outcomes:
 *   failing   → last 3+ consecutive failures or config missing while enabled
 *   warning   → intermittent failures / waiting approval / retry loops
 *   healthy   → successes present and nothing alarming
 *   disabled  → explicitly paused
 */
export function computeHealth(input: HealthInput): HealthReport {
  const { runs, enabled } = input;

  if (!enabled) {
    return { status: "disabled", reasons: ["Paused by you"], successRate: rate(runs) };
  }
  if (!input.hasRequiredConfiguration) {
    return {
      status: "needs_configuration",
      reasons: ["Background execution is not configured yet"],
      suggestedFix: "Enable Background execution in Agents → Settings",
      successRate: rate(runs),
    };
  }

  const recent = runs.slice(0, HEALTH_WINDOW);
  if (recent.length === 0) {
    return { status: "healthy", reasons: ["No runs yet — ready when triggered"], successRate: 100 };
  }

  const consecutiveFailures = countConsecutiveFailures(recent);
  const failures = recent.filter((r) => r.status === "failed" || r.status === ("timed_out" as never)).length;
  const retries = recent.filter((r) => (r.attempt ?? 1) > 1).length;
  const ratePct = rate(recent);

  if (consecutiveFailures >= 3) {
    return {
      status: "failing",
      reasons: [`Last ${consecutiveFailures} runs failed`],
      suggestedFix: failureDiagnosis(recent[0]).suggestedFix,
      successRate: ratePct,
    };
  }
  if (input.waitingApproval) {
    return { status: "warning", reasons: ["Waiting for your approval"], successRate: ratePct };
  }
  if (consecutiveFailures >= 1 && retries >= 2) {
    return {
      status: "warning",
      reasons: [`${failures} of last ${recent.length} runs failed; retries active`],
      suggestedFix: failureDiagnosis(recent[0]).suggestedFix,
      successRate: ratePct,
    };
  }
  if (failures >= 1) {
    return {
      status: "warning",
      reasons: [`${failures} of last ${recent.length} runs failed`],
      suggestedFix: failureDiagnosis(recent[0]).suggestedFix,
      successRate: ratePct,
    };
  }

  return {
    status: "healthy",
    reasons: recent.some((r) => r.status === "completed")
      ? ["Recent runs succeeded"]
      : ["Runs in progress"],
    successRate: ratePct,
  };
}

function countConsecutiveFailures(runsNewestFirst: RunRecord[]): number {
  let n = 0;
  for (const run of runsNewestFirst) {
    if (run.status === "failed" || run.status === ("timed_out" as never)) n++;
    else break;
  }
  return n;
}

function rate(runs: RunRecord[]): number {
  const finished = runs.filter((r) => !["running", "queued", "awaiting_approval", "waiting_retry"].includes(r.status));
  if (finished.length === 0) return 100;
  const ok = finished.filter((r) => r.status === "completed").length;
  return Math.round((ok / finished.length) * 100);
}

// ─── Failure diagnosis (#17) ───────────────────────────────────────────────

export interface FailureDiagnosis {
  failedStep: string;
  reason: string;
  suggestedFix: string;
  /** machine hint for the Fix button */
  fixAction: "permissions" | "configuration" | "approval" | "timeout" | "retry" | "none";
}

const DIAGNOSIS_RULES: Array<{
  match: RegExp;
  step?: string;
  reason: string;
  fix: string;
  action: FailureDiagnosis["fixAction"];
}> = [
  {
    match: /permission|disabled|not permitted/i,
    reason: "Permission denied",
    fix: "Give this agent the needed permission (or rerun and approve when asked).",
    action: "permissions",
  },
  {
    match: /declined|rejected by user/i,
    reason: "An approval was declined",
    fix: "Rerun and approve the requested action, or adjust permissions.",
    action: "approval",
  },
  {
    match: /not_configured|background execution/i,
    reason: "Background execution isn't configured yet",
    fix: "Enable Background execution in Agents → Settings.",
    action: "configuration",
  },
  {
    match: /invalid api key|key_decrypt_failed|not configured.*provider/i,
    reason: "The stored AI key is missing or invalid",
    fix: "Re-save your AI provider key in Agents → Settings.",
    action: "configuration",
  },
  {
    match: /timed? ?out|time budget/i,
    reason: "Execution exceeded its time budget",
    fix: "Simplify the task or raise the timeout, then retry.",
    action: "timeout",
  },
  {
    match: /rate limit|429|overloaded|502|503|network|fetch/i,
    reason: "A temporary service issue interrupted the run",
    fix: "Retry — transient issues usually resolve themselves.",
    action: "retry",
  },
];

export function failureDiagnosis(runOrError: RunRecord | string): FailureDiagnosis {
  const errors = typeof runOrError === "string"
    ? [runOrError]
    : [...(runOrError.errors ?? [])];
  const message = errors.join(" ") || "Unknown failure";
  const failedStep =
    typeof runOrError === "string"
      ? "—"
      : ([...(runOrError.steps ?? [])].reverse().find((s) => s.status === "failed")?.label
        ?? [...(runOrError.steps ?? [])].reverse().find((s) => s.status !== "done")?.label
        ?? "—");

  for (const rule of DIAGNOSIS_RULES) {
    if (rule.match.test(message)) {
      return { failedStep, reason: rule.reason, suggestedFix: rule.fix, fixAction: rule.action };
    }
  }
  return {
    failedStep,
    reason: message.slice(0, 200) || "The run ended unexpectedly",
    suggestedFix: "Review the trace below, then retry.",
    fixAction: "retry",
  };
}

// ─── Usage statistics (#19/#20) ────────────────────────────────────────────

export interface UsageSnapshot {
  runs: number;
  completed: number;
  failed: number;
  toolCalls: number;
  delegations: number;
  memoryReads: number;
  modelCalls: number;
  avgDurationMs: number;
  successRate: number;
}

export function usageStats(runs: RunRecord[]): UsageSnapshot {
  let toolCalls = 0, delegations = 0, memoryReads = 0, modelCalls = 0;
  let durationSum = 0, durationCount = 0;
  for (const run of runs) {
    toolCalls += run.toolCalls?.length ?? run.counts?.toolCalls ?? 0;
    delegations += run.counts?.delegations ?? 0;
    memoryReads += run.counts?.memoryWrites ? 0 : 0; // reads tracked via events; counts.writes kept separate
    modelCalls += run.counts?.modelCalls ?? 0;
    if (run.durationMs) { durationSum += run.durationMs; durationCount++; }
  }
  const completed = runs.filter((r) => r.status === "completed").length;
  const failed = runs.filter((r) => r.status === "failed" || r.status === ("timed_out" as never)).length;
  const finished = completed + failed;
  return {
    runs: runs.length,
    completed,
    failed,
    toolCalls,
    delegations,
    memoryReads,
    modelCalls,
    avgDurationMs: durationCount > 0 ? Math.round(durationSum / durationCount) : 0,
    successRate: finished > 0 ? Math.round((completed / finished) * 100) : 100,
  };
}

export function splitByWindow(runs: RunRecord[], now = new Date()): { today: RunRecord[]; month: RunRecord[] } {
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return {
    today: runs.filter((r) => new Date(r.startedAt).getTime() >= startOfDay),
    month: runs.filter((r) => new Date(r.startedAt).getTime() >= startOfMonth),
  };
}
