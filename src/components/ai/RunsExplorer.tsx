import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, CheckCircle2, XCircle, Clock, Loader2, ChevronRight, RotateCcw,
  XCircle as Cancel, Search, Bot, Zap, Sparkles, BrainCircuit, ShieldCheck,
  Timer, GitBranch, Database,
} from "lucide-react";
import {
  listRuns, refreshFromRemote, fetchRunEvents, subscribeRunLive, subscribeRuns,
} from "../../ai/runtime";
import type { RunRecord } from "../../ai/runtime";
import { supabase, currentAccessToken } from "../../lib/supabase";
import { WhyCard, ActionReceipts, FailureDiagnostics } from "./AgentTransparency";

const anyDb = () => supabase as unknown as {
  from: (t: string) => {
    update: (fields: Record<string, unknown>) => { eq: (c: string, v: string) => Promise<unknown> };
  };
};

const SUPABASE_URL = (import.meta as unknown as { env: Record<string, string> }).env.VITE_SUPABASE_URL ?? "";

// ─── Public API ────────────────────────────────────────────────────────────

export interface RunsExplorerProps {
  /** Restrict to one source ("agent" | "automation") or show everything */
  sourceKind?: RunRecord["sourceKind"] | "all";
  sourceId?: string;
  agents?: Array<{ id: string; name: string; icon: string }>;
  automations?: Array<{ id: string; name: string; icon: string }>;
  onToast?: (msg: string) => void;
  compact?: boolean;
}

interface Filters {
  status: string;
  trigger: string;
  search: string;
  failingOnly: boolean;
  approvalOnly: boolean;
}

const STATUS_META: Record<string, { icon: React.ReactNode; label: string; tone: string }> = {
  completed: { icon: <CheckCircle2 size={12} />, label: "Completed", tone: "text-[var(--success)]" },
  failed: { icon: <XCircle size={12} />, label: "Failed", tone: "text-[var(--danger)]" },
  running: { icon: <Loader2 size={12} className="animate-spin" />, label: "Running", tone: "text-[var(--accent)]" },
  queued: { icon: <Clock size={12} />, label: "Queued", tone: "text-[var(--muted)]" },
  waiting_retry: { icon: <RotateCcw size={12} />, label: "Retrying", tone: "text-[var(--warning)]" },
  awaiting_approval: { icon: <ShieldCheck size={12} />, label: "Needs approval", tone: "text-[var(--warning)]" },
  waiting_approval: { icon: <ShieldCheck size={12} />, label: "Needs approval", tone: "text-[var(--warning)]" },
  rejected: { icon: <Cancel size={12} />, label: "Rejected", tone: "text-[var(--muted)]" },
  cancelled: { icon: <Cancel size={12} />, label: "Cancelled", tone: "text-[var(--muted)]" },
  timed_out: { icon: <Timer size={12} />, label: "Timed out", tone: "text-[var(--danger)]" },
  skipped: { icon: <Clock size={12} />, label: "Skipped", tone: "text-[var(--muted)]" },
  interrupted: { icon: <Cancel size={12} />, label: "Interrupted", tone: "text-[var(--muted)]" },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.failed;
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-semibold ${meta.tone}`}>
      {meta.icon} {meta.label}
    </span>
  );
}

/** Unified run history with metrics, filters, live detail view, retry/cancel. */
export default function RunsExplorer({ sourceKind = "all", sourceId, agents = [], automations = [], onToast, compact }: RunsExplorerProps) {
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [filters, setFilters] = useState<Filters>({ status: "all", trigger: "all", search: "", failingOnly: false, approvalOnly: false });
  const [openRunId, setOpenRunId] = useState<string | null>(null);

  useEffect(() => subscribeRuns(setRuns), []);
  useEffect(() => { void refreshFromRemote(); }, []);

  const filtered = useMemo(() => {
    let list = runs.filter((r) => (sourceKind === "all" ? true : r.sourceKind === sourceKind));
    if (sourceId) list = list.filter((r) => r.sourceId === sourceId);
    if (filters.status !== "all") list = list.filter((r) => r.status === filters.status);
    if (filters.trigger !== "all") list = list.filter((r) => r.trigger === filters.trigger);
    if (filters.failingOnly) list = list.filter((r) => r.status === "failed" || r.status === "timed_out");
    if (filters.approvalOnly) list = list.filter((r) => r.status === "awaiting_approval");
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      list = list.filter((r) =>
        (r.summary || "").toLowerCase().includes(q) ||
        (sourceName(r)).toLowerCase().includes(q));
    }
    return list.slice(0, compact ? 8 : 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runs, filters, sourceKind, sourceId, agents, automations]);

  const metrics = useMemo(() => computeMetrics(runs), [runs]);

  function sourceName(run: RunRecord): string {
    if (run.sourceKind === "ai") return "Noska AI";
    return agents.find((a) => a.id === run.sourceId)?.name
      ?? automations.find((a) => a.id === run.sourceId)?.name
      ?? `${run.sourceKind} ${run.sourceId.slice(0, 10)}`;
  }

  const retryRun = async (run: RunRecord) => {
    try {
      if (run.sourceKind === "ai") { onToast?.("Interactive sessions can't be retried"); return; }
      const token = (await currentAccessToken()) ?? "";
      if (!token) { onToast?.("Sign in first"); return; }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/agent-runtime`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "run_now", source_kind: run.sourceKind, source_id: run.sourceId }),
      });
      if (res.ok) onToast?.("Retry started");
      else onToast?.("Retries need background execution enabled (Agents → Settings)");
    } catch {
      onToast?.("Couldn't start the retry");
    }
  };

  const cancelRun = async (run: RunRecord) => {
    try {
      await anyDb().from("agent_runs").update({ status: "cancelled", completed_at: new Date().toISOString() }).eq("id", run.id);
      void refreshFromRemote();
      onToast?.("Run cancelled");
    } catch {
      onToast?.("Couldn't cancel the run");
    }
  };

  return (
    <div className="space-y-3">
      {/* Metrics strip */}
      {!compact && (
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
          <Metric label="Total runs" value={metrics.total} />
          <Metric label="Success rate" value={`${metrics.successRate}%`} tone="success" />
          <Metric label="Failures" value={metrics.failures} tone={metrics.failures > 0 ? "danger" : undefined} />
          <Metric label="Avg duration" value={`${metrics.avgDuration}s`} />
          <Metric label="Retries" value={metrics.retries} tone={metrics.retries > 0 ? "warning" : undefined} />
          <Metric label="Awaiting approval" value={metrics.awaitingApproval} tone={metrics.awaitingApproval > 0 ? "warning" : undefined} />
        </div>
      )}

      {/* Filters */}
      {!compact && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <FilterSelect value={filters.status} onChange={(v) => setFilters((f) => ({ ...f, status: v }))} options={[
            ["all", "All statuses"], ["completed", "Completed"], ["failed", "Failed"],
            ["running", "Running"], ["waiting_retry", "Retrying"], ["awaiting_approval", "Needs approval"], ["cancelled", "Cancelled"],
          ]} />
          <FilterSelect value={filters.trigger} onChange={(v) => setFilters((f) => ({ ...f, trigger: v }))} options={[
            ["all", "All triggers"], ["manual", "Manual"], ["schedule", "Schedule"],
            ["page_created", "Page created"], ["page_updated", "Page updated"], ["task_completed", "Task completed"],
          ]} />
          <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1">
            <Search size={9} className="text-[var(--muted)]" />
            <input
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Search runs…"
              className="bg-transparent text-[10px] text-[var(--text)] outline-none w-28"
            />
          </div>
          <button
            onClick={() => setFilters((f) => ({ ...f, failingOnly: !f.failingOnly }))}
            className={`rounded-md px-2 py-1 text-[9px] font-medium border transition ${filters.failingOnly ? "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/25" : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--hover)]"}`}
          >Failures only</button>
        </div>
      )}

      {/* Runs */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-[var(--border)] rounded-xl">
          <Activity size={24} className="mx-auto text-[var(--muted)] mb-2" />
          <p className="text-xs text-[var(--muted)]">
            {runs.length === 0
              ? sourceKind === "automation"
                ? "Your automation hasn't executed yet. Use ⚡ Run now, or wait for its schedule."
                : "Your agent hasn't executed yet."
              : filters.search || filters.status !== "all" || filters.trigger !== "all" || filters.failingOnly || filters.approvalOnly
                ? "No runs match these filters."
                : "Nothing here yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((run) => (
            <RunCard
              key={run.id}
              run={run}
              sourceName={sourceName(run)}
              open={openRunId === run.id}
              onToggle={() => setOpenRunId(openRunId === run.id ? null : run.id)}
              onRetry={() => void retryRun(run)}
              onCancel={() => void cancelRun(run)}
              onToast={onToast}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Run card + live detail ───────────────────────────────────────────────

function RunCard({ run, sourceName, open, onToggle, onRetry, onCancel, onToast }: {
  run: RunRecord;
  sourceName: string;
  open: boolean;
  onToggle: () => void;
  onRetry: () => void;
  onCancel: () => void;
  onToast?: (m: string) => void;
}) {
  const kindIcon = run.sourceKind === "agent" ? <Bot size={11} /> : run.sourceKind === "automation" ? <Zap size={11} /> : <Sparkles size={11} />;
  const isLive = run.status === "running";
  useEffect(() => {
    if (!isLive) return;
    return subscribeRunLive(run.id, () => void refreshFromRemote());
  }, [isLive, run.id]);

  return (
    <motion.div layout className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-2 p-3 text-left hover:bg-[var(--hover)]/50 transition">
        <StatusBadge status={run.status} />
        <span className="flex items-center gap-1 text-xs font-medium text-[var(--text)]">
          {kindIcon} {sourceName}
        </span>
        {run.attempt && run.attempt > 1 && (
          <span className="text-[8px] font-bold text-[var(--warning)] bg-[var(--warning)]/10 px-1 py-0.5 rounded">RETRY {run.attempt - 1}</span>
        )}
        <span className="ml-auto flex items-center gap-2 shrink-0">
          <span className="text-[9px] text-[var(--muted)]">{new Date(run.startedAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          {run.durationMs !== undefined && <span className="text-[9px] text-[var(--muted)]">{formatDuration(run.durationMs)}</span>}
          <ChevronRight size={11} className={`text-[var(--muted)] rotate-90 transition-transform ${open ? "" : "rotate-0"}`} style={{ transform: open ? "rotate(90deg)" : "none" }} />
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <RunDetail run={run} sourceLabel={sourceName} onRetry={onRetry} onCancel={onCancel} onToast={onToast} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function RunDetail({ run, sourceLabel, onRetry, onCancel, onToast }: {
  run: RunRecord;
  sourceLabel: string;
  onRetry: () => void;
  onCancel: () => void;
  onToast?: (m: string) => void;
}) {
  const [events, setEvents] = useState<Array<Record<string, unknown>>>([]);
  const isLive = run.status === "running";

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const evts = await fetchRunEvents(run.id);
      if (alive) setEvents(evts);
    };
    void load();
    if (!isLive) return () => { alive = false; };
    const unsub = subscribeRunLive(run.id, () => void load());
    return () => { alive = false; unsub(); };
  }, [run.id, isLive]);

  const childCount = events.filter((e) => e.type === "AGENT_DELEGATED").length;

  return (
    <div className="border-t border-[var(--border)] px-3 py-3 space-y-3">
      {/* Transparency: why / receipts / failure diagnosis (#12/#13/#17) */}
      <WhyCard run={run} sourceName={sourceLabel} />
      <ActionReceipts run={run} />
      <FailureDiagnostics run={run} onRetry={["failed", "timed_out"].includes(run.status) ? onRetry : undefined} />

      {/* Overview */}
      <Section title="Overview" icon={<Database size={10} />}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
          <KV k="Trigger" v={String(run.trigger)} />
          <KV k="Duration" v={run.durationMs !== undefined ? formatDuration(run.durationMs) : "…"} />
          <KV k="Model calls" v={String(run.counts?.modelCalls ?? 0)} />
          <KV k="Tool calls" v={String(run.toolCalls.length)} />
          <KV k="Delegations" v={String(childCount)} />
          {run.attempt !== undefined && run.attempt > 1 && <KV k="Attempt" v={`#${run.attempt}`} />}
        </div>
      </Section>

      {/* Timeline */}
      <Section title="Timeline" icon={<GitBranch size={10} />}>
        {events.length === 0 ? (
          <p className="text-[10px] text-[var(--muted)]">{isLive ? "Waiting for events…" : "No trace recorded for this run."}</p>
        ) : (
          <div className="space-y-0.5 max-h-48 overflow-y-auto scrollbar-thin">
            {events.map((e, i) => (
              <TimelineEvent key={String(e.id ?? i)} event={e} last={i === events.length - 1} />
            ))}
          </div>
        )}
      </Section>

      {/* Tools */}
      {run.toolCalls.length > 0 && (
        <Section title="Tools" icon={<BrainCircuit size={10} />}>
          <div className="space-y-0.5">
            {[...new Set(run.toolCalls.map((t) => t.name))].map((name) => {
              const calls = run.toolCalls.filter((t) => t.name === name);
              const allOk = calls.every((t) => t.ok);
              return (
                <div key={name} className="flex items-center gap-1.5 text-[10px]">
                  {allOk ? <CheckCircle2 size={8} className="text-[var(--success)]" /> : <XCircle size={8} className="text-[var(--danger)]" />}
                  <span className="font-mono text-[var(--text-secondary)]">{name}</span>
                  <span className="text-[var(--muted)]">×{calls.length}</span>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Memory used indicator (#32) */}
      {events.some((e) => e.type === "MEMORY_FOUND") && (
        <Section title="Memory used" icon={<BrainCircuit size={10} />}>
          {(() => {
            const memEvent = [...events].reverse().find((e) => e.type === "MEMORY_FOUND");
            const meta = (memEvent?.metadata ?? {}) as { count?: number; summaries?: string[] };
            return (
              <>
                <p className="text-[10px] text-[var(--text-secondary)] mb-1">Used {meta.count ?? 0} memories</p>
                {(meta.summaries ?? []).map((s, i) => (
                  <p key={i} className="text-[9px] text-[var(--muted)] truncate">• {s}</p>
                ))}
              </>
            );
          })()}
        </Section>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5 pt-1">
        {["failed", "skipped", "timed_out"].includes(run.status) && (
          <button onClick={onRetry} className="flex items-center gap-1 rounded-md bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 px-2 py-1 text-[9px] font-semibold transition">
            <RotateCcw size={9} /> Retry run
          </button>
        )}
        {run.status === "running" && (
          <button onClick={() => { onCancel(); onToast?.("Cancelling…"); }} className="flex items-center gap-1 rounded-md bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20 px-2 py-1 text-[9px] font-semibold transition">
            <Cancel size={9} /> Cancel run
          </button>
        )}
      </div>
    </div>
  );
}

function TimelineEvent({ event, last }: { event: Record<string, unknown>; last: boolean }) {
  const type = String(event.type);
  const isError = ["RUN_FAILED", "TOOL_FAILED", "RUN_TIMED_OUT"].includes(type);
  const isOk = ["RUN_COMPLETED", "TOOL_COMPLETED", "MEMORY_SAVED", "APPROVAL_RESOLVED"].includes(type);
  const color = isError ? "text-[var(--danger)]" : isOk ? "text-[var(--success)]" : "text-[var(--accent)]";
  const meta = (event.metadata ?? {}) as Record<string, unknown>;
  const detail = typeof meta.detail === "string" ? meta.detail : [event.step, meta.tool, meta.count !== undefined ? `${meta.count} found` : ""].filter(Boolean).join(" · ");
  return (
    <div className="flex items-start gap-2">
      <div className="flex flex-col items-center pt-1">
        <span className={`w-1.5 h-1.5 rounded-full ${isError ? "bg-[var(--danger)]" : isOk ? "bg-[var(--success)]" : "bg-[var(--accent)]"}`} />
        {!last && <span className="w-px h-3.5 bg-[var(--border)]" />}
      </div>
      <div className="min-w-0 pb-0.5">
        <p className={`text-[10px] font-medium leading-tight ${color}`}>{type.replace(/_/g, " ").toLowerCase()}</p>
        {detail && <p className="text-[9px] text-[var(--muted)] truncate leading-tight">{detail}</p>}
      </div>
      {event.duration_ms != null && Number(event.duration_ms) > 0 && (
        <span className="ml-auto text-[8px] text-[var(--muted)] shrink-0">{formatDuration(Number(event.duration_ms))}</span>
      )}
    </div>
  );
}

// ─── Primitives ────────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-[var(--muted)] mb-1">{icon} {title}</p>
      {children}
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline gap-1.5 min-w-0">
      <span className="text-[var(--muted)] shrink-0">{k}:</span>
      <span className="text-[var(--text-secondary)] truncate capitalize">{v}</span>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone?: "success" | "danger" | "warning" }) {
  const color = tone === "success" ? "text-[var(--success)]" : tone === "danger" ? "text-[var(--danger)]" : tone === "warning" ? "text-[var(--warning)]" : "text-[var(--text)]";
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5">
      <p className={`text-base font-bold leading-none ${color}`}>{value}</p>
      <p className="text-[8px] text-[var(--muted)] uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: Array<[string, string]> }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[10px] text-[var(--text)] outline-none cursor-pointer">
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

function computeMetrics(runs: RunRecord[]) {
  const total = runs.length;
  const completed = runs.filter((r) => r.status === "completed").length;
  const failures = runs.filter((r) => r.status === "failed" || r.status === ("timed_out" as never)).length;
  const retries = runs.filter((r) => (r.attempt ?? 1) > 1).length;
  const awaitingApproval = runs.filter((r) => r.status === "awaiting_approval").length;
  const durations = runs.map((r) => r.durationMs).filter((d): d is number => typeof d === "number" && d > 0);
  const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 100) / 10 : 0;
  return {
    total,
    successRate: total > 0 ? Math.round((completed / total) * 100) : 100,
    failures,
    avgDuration,
    retries,
    awaitingApproval,
  };
}
