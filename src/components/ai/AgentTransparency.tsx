import React, { useMemo } from "react";
import { CheckCircle2, XCircle, Wrench, ShieldCheck, ArrowRight } from "lucide-react";
import {
  failureDiagnosis, computeHealth,
} from "../../ai/runtime/agentOps";
import type { RunRecord } from "../../ai/runtime";

/**
 * Agent Transparency (#12–#18) — safe explanations of what happened.
 * Never exposes chain-of-thought; every line derives from persisted runs/events.
 */

/** "Why did Noska do this?" — trigger → context → action → result (#12). */
export function WhyCard({ run, sourceName }: { run: RunRecord; sourceName: string }) {
  const contextFacts = useMemo(() => buildContextFacts(run), [run]);
  return (
    <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/[0.04] p-3 space-y-1.5">
      <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--accent)]">Why did this happen?</p>
      <Fact label="Trigger" value={describeTrigger(run)} />
      {contextFacts && <Fact label="Context" value={contextFacts} />}
      <Fact label="Action" value={summarizeActions(run)} />
      <Fact label="Result" value={run.errors.length > 0 ? run.errors[0] : run.summary || "Completed."} tone={run.errors.length > 0 ? "danger" : undefined} />
      <p className="text-[8px] text-[var(--muted)] pt-0.5">{sourceName} · full trace in run details</p>
    </div>
  );
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: "danger" }) {
  return (
    <div className="flex items-start gap-2">
      <span className={`text-[10px] font-semibold shrink-0 ${tone === "danger" ? "text-[var(--danger)]" : "text-[var(--muted)]"}`}>{label}:</span>
      <span className={`text-[10px] leading-relaxed ${tone === "danger" ? "text-[var(--danger)]" : "text-[var(--text-secondary)]"}`}>{value}</span>
    </div>
  );
}

function describeTrigger(run: RunRecord): string {
  switch (run.trigger) {
    case "schedule": return `Scheduled${run.triggerDetail ? ` · ${run.triggerDetail}` : ""}`;
    case "manual": return `You ran it manually`;
    case "page_created": return `A page was created${run.triggerDetail ? ` ("${run.triggerDetail}")` : ""}`;
    case "page_updated": return `A page was updated${run.triggerDetail ? ` ("${run.triggerDetail}")` : ""}`;
    case "task_completed": return `Task "${run.triggerDetail ?? ""}" was completed`;
    default: return String(run.trigger).replace(/_/g, " ");
  }
}

function buildContextFacts(run: RunRecord): string | null {
  const facts: string[] = [];
  if (run.counts?.memoryWrites !== undefined) { /* writes ≠ reads; reads come from events */ }
  if (run.affectedResources.length > 0) facts.push(`${run.affectedResources.length} item(s) touched`);
  const tools = new Set(run.toolCalls.map((t) => t.name));
  if (tools.has("search_pages") || tools.has("list_pages")) facts.push("workspace searched");
  if (tools.size > 0) facts.push(`${tools.size} tool(s) used`);
  return facts.length > 0 ? facts.join(", ") : null;
}

function summarizeActions(run: RunRecord): string {
  const byChange = new Map<string, number>();
  for (const r of run.affectedResources) byChange.set(r.change, (byChange.get(r.change) ?? 0) + 1);
  if (byChange.size === 0) {
    return run.toolCalls.length > 0
      ? `Ran ${[...new Set(run.toolCalls.map((t) => t.name))].join(", ")}.`
      : "Answered without changing anything.";
  }
  return [...byChange.entries()].map(([change, n]) => `${n}× ${change}`).join(", ") + ".";
}

/** Action receipts (#13): ✓ Created 5 tasks · ✓ Updated 2 pages */
export function ActionReceipts({ run, onViewDetails }: { run: RunRecord; onViewDetails?: () => void }) {
  if (run.status !== "completed") return null;
  const lines = receiptLines(run);
  if (lines.length === 0) return null;
  return (
    <div className="rounded-lg bg-[var(--success)]/[0.06] border border-[var(--success)]/15 px-2.5 py-2">
      {lines.map((l, i) => (
        <p key={i} className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)] leading-relaxed">
          <CheckCircle2 size={9} className="text-[var(--success)] shrink-0" /> {l}
        </p>
      ))}
      {onViewDetails && (
        <button onClick={onViewDetails} className="mt-1 text-[9px] font-semibold text-[var(--accent)] hover:underline">View details</button>
      )}
    </div>
  );
}

export function receiptLines(run: RunRecord): string[] {
  const counts = new Map<string, number>();
  for (const r of run.affectedResources) counts.set(r.change, (counts.get(r.change) ?? 0) + 1);
  const lines = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([change, n]) => `${cap(change)} ${n} item${n !== 1 ? "s" : ""}`);
  if (lines.length === 0 && run.status === "completed") lines.push("No workspace changes needed");
  return lines;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Failure UX (#17): step → reason → suggested fix with action buttons. */
export function FailureDiagnostics({ run, onRetry, onFix }: {
  run: RunRecord;
  onRetry?: () => void;
  onFix?: () => void;
}) {
  if (!["failed", "timed_out"].includes(run.status)) return null;
  const dx = failureDiagnosis(run);
  return (
    <div className="rounded-xl border border-[var(--danger)]/25 bg-[var(--danger)]/[0.05] p-3 space-y-1.5">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--danger)]">
        <XCircle size={11} /> What went wrong
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]">
        <span className="font-semibold text-[var(--muted)] shrink-0">Step:</span> {dx.failedStep}
      </div>
      <div className="flex items-start gap-1.5 text-[10px] text-[var(--text-secondary)]">
        <span className="font-semibold text-[var(--muted)] shrink-0">Reason:</span> {dx.reason}
      </div>
      <div className="flex items-start gap-1.5 text-[10px]">
        <Wrench size={10} className="text-[var(--warning)] mt-0.5 shrink-0" />
        <span className="text-[var(--text-secondary)]"><span className="font-semibold text-[var(--muted)]">Suggested fix:</span> {dx.suggestedFix}</span>
      </div>
      <div className="flex gap-1.5 pt-1">
        {dx.fixAction === "permissions" && onFix && (
          <button onClick={onFix} className="flex items-center gap-1 rounded-md bg-[var(--warning)]/12 text-[var(--warning)] hover:bg-[var(--warning)]/20 px-2 py-1 text-[9px] font-semibold transition">
            <ShieldCheck size={9} /> Fix permissions
          </button>
        )}
        {onRetry && ["retry", "timeout", "none"].includes(dx.fixAction) && (
          <button onClick={onRetry} className="flex items-center gap-1 rounded-md bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 px-2 py-1 text-[9px] font-semibold transition">
            <ArrowRight size={9} /> Retry
          </button>
        )}
      </div>
    </div>
  );
}

/** Health badge with real reasons tooltip (#5). Reused across surfaces. */
export function HealthBadgeReal({ health, label }: {
  health: ReturnType<typeof computeHealth>;
  label?: string;
}) {
  const tone =
    health.status === "healthy" ? "text-[var(--success)] bg-[var(--success)]/10" :
    health.status === "warning" || health.status === "needs_configuration" ? "text-[var(--warning)] bg-[var(--warning)]/10" :
    health.status === "failing" ? "text-[var(--danger)] bg-[var(--danger)]/10" :
    "text-[var(--muted)] bg-[var(--bg)]";
  const dot =
    health.status === "healthy" ? "bg-[var(--success)]" :
    health.status === "failing" ? "bg-[var(--danger)]" :
    health.status === "disabled" ? "bg-[var(--muted)]" : "bg-[var(--warning)]";
  const displayLabel =
    health.status === "needs_configuration" ? "Needs setup" :
    health.status.charAt(0).toUpperCase() + health.status.slice(1);
  const reasons = health.reasons.join(" · ") + (health.suggestedFix ? ` — ${health.suggestedFix}` : "");
  return (
    <span title={`${displayLabel}: ${reasons}`} className={`inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded ${tone}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label ?? displayLabel}
    </span>
  );
}
