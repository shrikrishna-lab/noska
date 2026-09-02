/**
 * Local-only diagnostics for the workspace operator.
 *
 * Reports intentionally contain storage key names, sizes, and AI health
 * metadata only. They never read or export localStorage values, which may
 * contain API keys, session material, or private page content.
 */
import { getRecentDiagnostics } from "../../ai/core/AIDiagnostics";

export const LOCAL_BUG_REPORTS_KEY = "noska_local_bug_reports";

export interface LocalDiagnosticReport {
  createdAt: string;
  storage: Array<{ key: string; bytes: number; protected: boolean }>;
  ai: { recentRequests: number; errors: number; latestError: string | null };
}

export interface LocalBugReport {
  id: string;
  createdAt: string;
  description: string;
  diagnostics: LocalDiagnosticReport;
  status: "queued";
}

const PROTECTED_KEY = /(?:api.?key|token|secret|password|credential|session|auth)/i;
const MAX_STORAGE_KEYS = 80;

function byteLength(value: string): number {
  return new Blob([value]).size;
}

/** Summarize local browser state without reading private values into a report. */
export function collectLocalDiagnostics(): LocalDiagnosticReport {
  const storage: LocalDiagnosticReport["storage"] = [];
  try {
    for (let index = 0; index < Math.min(localStorage.length, MAX_STORAGE_KEYS); index += 1) {
      const key = localStorage.key(index);
      if (!key) continue;
      const protectedKey = PROTECTED_KEY.test(key);
      // Size is useful for spotting quota/performance problems. Do not retain a
      // protected value beyond this expression and never put it in the report.
      const bytes = protectedKey ? 0 : byteLength(localStorage.getItem(key) || "");
      storage.push({ key, bytes, protected: protectedKey });
    }
  } catch {
    // Privacy mode or disabled storage: the report remains useful for AI health.
  }

  const recent = getRecentDiagnostics();
  const failures = recent.filter((entry) => entry.finalStatus === "error" || entry.finalStatus === "timeout");
  return {
    createdAt: new Date().toISOString(),
    storage: storage.sort((a, b) => b.bytes - a.bytes),
    ai: {
      recentRequests: recent.length,
      errors: failures.length,
      latestError: failures[0]?.lastError || null,
    },
  };
}

/** Queue a reviewable report locally. Sending it to a developer is a separate, explicit action. */
export function queueLocalBugReport(description: string): LocalBugReport {
  const report: LocalBugReport = {
    id: `bug_${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    description: description.trim() || "User requested a diagnostics report.",
    diagnostics: collectLocalDiagnostics(),
    status: "queued",
  };
  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_BUG_REPORTS_KEY) || "[]");
    const reports = Array.isArray(existing) ? existing : [];
    localStorage.setItem(LOCAL_BUG_REPORTS_KEY, JSON.stringify([report, ...reports].slice(0, 20)));
  } catch { /* local storage is best-effort */ }
  return report;
}
