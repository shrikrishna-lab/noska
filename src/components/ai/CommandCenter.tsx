import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Bot, Zap, ShieldCheck, Activity, CheckCircle2, XCircle, Clock,
  Loader2, ChevronRight, Sparkles, AlertTriangle, LayoutDashboard,
} from "lucide-react";
import {
  listRuns, subscribeRuns, getPendingApprovals, respondToApproval,
  subscribeApprovals,
} from "../../ai/runtime";
import type { RunRecord, ApprovalRequest } from "../../ai/runtime";
import { fetchAgents, type NoskaAgent } from "../../features/agents/agentStore";
import { fetchAutomations, type NoskaAutomation } from "../../features/automations/automationStore";
import { supabase, currentAccessToken } from "../../lib/supabase";
import { usageStats, splitByWindow } from "../../ai/runtime/agentOps";

const SUPABASE_URL = (import.meta as unknown as { env: Record<string, string> }).env.VITE_SUPABASE_URL ?? "";

/** Background (server-side) runs paused for approval — resolvable here even
 * though execution happened without a browser. */
interface BackgroundApprovalRun extends Record<string, unknown> {
  id: string;
  name: string;
  source_kind: string;
  pending_approval: { toolName?: string; category?: string } | null;
}

function useBackgroundApprovals() {
  const [runs, setRuns] = useState<BackgroundApprovalRun[]>([]);
  useEffect(() => {
    const load = async () => {
      try {
        const base = supabase as unknown as { from: (t: string) => any };
        const { data } = await base.from("agent_runs")
          .select("id,name,source_kind,pending_approval")
          .eq("status", "waiting_approval")
          .order("updated_at", { ascending: false })
          .limit(10);
        setRuns((data ?? []) as BackgroundApprovalRun[]);
      } catch { /* pre-migration */ }
    };
    void load();
    const timer = setInterval(() => void load(), 30_000);
    return () => clearInterval(timer);
  }, []);
  return runs;
}

async function resolveServerApproval(runId: string, approved: boolean): Promise<boolean> {
  try {
    const token = await currentAccessToken();
    if (!token) return false;
    const res = await fetch(`${SUPABASE_URL}/functions/v1/agent-runtime`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "resolve_approval", run_id: runId, approved }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

interface CommandCenterProps {
  onToast?: (message: string) => void;
  /** Navigate to a management area when a status row is clicked (#4). */
  onNavigate?: (view: "agents" | "automations" | "commandCenter") => void;
}

/** Noska AI Command Center — the user's control surface for everything
 * intelligent in the workspace: agents, automations, and approvals at a glance. */
export default function CommandCenter({ onToast, onNavigate }: CommandCenterProps) {
  const [agents, setAgents] = useState<NoskaAgent[]>([]);
  const [automations, setAutomations] = useState<NoskaAutomation[]>([]);
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [memoryCount, setMemoryCount] = useState<number | null>(null);
  const [runtimeStatus, setRuntimeStatus] = useState<{ ready: boolean; edgeFunction: boolean; encryptionConfigured: boolean } | null>(null);
  const backgroundApprovals = useBackgroundApprovals();

  useEffect(() => {
    void (async () => {
      setAgents(await fetchAgents());
      setAutomations(await fetchAutomations());
      try {
        const base = supabase as unknown as { from: (t: string) => any };
        const { count } = await base.from("agent_memories").select("id", { count: "exact", head: true }).neq("status", "forgotten");
        setMemoryCount(typeof count === "number" ? count : null);
      } catch { setMemoryCount(null); }
      // Real runtime self-report — never assume operational (#39).
      try {
        const token = await currentAccessToken();
        if (token) {
          const res = await fetch(`${SUPABASE_URL}/functions/v1/agent-runtime`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ action: "status" }),
          });
          if (res.ok) setRuntimeStatus(await res.json());
        }
      } catch { /* unreachable → stays null */ }
    })();
  }, []);
  useEffect(() => subscribeRuns(setRuns), []);
  useEffect(() => subscribeApprovals(setApprovals), []);

  const activeAgents = agents.filter(a => a.status === "active");
  const activeAutomations = automations.filter(a => a.status === "active");
  const recentRuns = useMemo(() => runs.slice(0, 8), [runs]);
  const failedRuns = useMemo(() => runs.filter(r => r.status === "failed" || r.status === ("timed_out" as never)).slice(0, 4), [runs]);
  const usageToday = useMemo(() => usageStats(splitByWindow(runs).today), [runs]);
  const usageMonth = useMemo(() => usageStats(splitByWindow(runs).month), [runs]);

  // Background-jobs status derived from REAL server-originated activity.
  const backgroundJobs: "operational" | "degraded" | "no_data" | "not_configured" =
    runtimeStatus === null || !runtimeStatus.ready
      ? "not_configured"
      : runs.some((r) => r.sourceKind !== "ai" && r.attempt !== undefined && Date.now() - new Date(r.startedAt).getTime() < 86_400_000)
        ? (failedRuns.length > usageMonth.completed ? "degraded" : "operational")
        : "no_data";

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
          <LayoutDashboard size={18} className="text-[var(--accent)]" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">Command Center</h1>
          <p className="text-[11px] text-[var(--muted)]">Your AI control center — agents, automations, and approvals at a glance.</p>
        </div>
      </div>

      {/* Intelligence Status Center (#4) — every value from real state */}
      <section className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-3">Noska Intelligence</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5">
          <StatusRow
            label="Runtime"
            dot={runtimeStatus?.ready ? "ok" : runtimeStatus === null ? "unknown" : "off"}
            value={runtimeStatus?.ready ? "Operational" : runtimeStatus === null ? "Checking…" : "Not configured"}
            onClick={() => onNavigate?.("agents")}
          />
          <StatusRow
            label="Background jobs"
            dot={backgroundJobs === "operational" ? "ok" : backgroundJobs === "degraded" ? "warn" : "off"}
            value={
              backgroundJobs === "operational" ? "Operational"
              : backgroundJobs === "degraded" ? "Degraded"
              : backgroundJobs === "not_configured" ? "Not configured"
              : "No recent activity"
            }
            onClick={() => onNavigate?.("automations")}
          />
          <StatusRow label="Agents" dot={activeAgents.length > 0 ? "ok" : "off"} value={`${activeAgents.length} active`} onClick={() => onNavigate?.("agents")} />
          <StatusRow label="Automations" dot={activeAutomations.length > 0 ? "ok" : "off"} value={`${activeAutomations.length} active`} onClick={() => onNavigate?.("automations")} />
          <StatusRow
            label="Memory"
            dot={memoryCount !== null && memoryCount > 0 ? "ok" : "off"}
            value={memoryCount !== null ? `${memoryCount.toLocaleString()} memories` : "—"}
            onClick={() => onNavigate?.("agents")}
          />
          <StatusRow
            label="Approvals"
            dot={approvals.length + backgroundApprovals.length > 0 ? "warn" : "ok"}
            value={`${approvals.length + backgroundApprovals.length} pending`}
            onClick={() => onNavigate?.("commandCenter")}
          />
        </div>
      </section>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<Bot size={13} />} label="Active Agents" value={String(activeAgents.length)} total={agents.length} tone="accent" />
        <StatCard icon={<Zap size={13} />} label="Active Automations" value={String(activeAutomations.length)} total={automations.length} tone="warning" />
        <StatCard icon={<ShieldCheck size={13} />} label="Pending Approvals" value={String(approvals.length + backgroundApprovals.length)} tone={approvals.length + backgroundApprovals.length > 0 ? "warning" : "muted"} />
        <StatCard icon={<Activity size={13} />} label="Recent Runs" value={String(runs.length)} tone="success" />
      </div>

      {/* Background approvals — server runs paused while you were away */}
      {backgroundApprovals.length > 0 && (
        <section className="mb-6 rounded-2xl border border-[var(--warning)]/25 bg-[var(--warning)]/[0.05] p-4">
          <h2 className="text-xs font-bold text-[var(--warning)] flex items-center gap-1.5 uppercase tracking-wider mb-1">
            <ShieldCheck size={12} /> Awaiting approval — background runs
          </h2>
          <p className="text-[10px] text-[var(--muted)] mb-3">These ran on Noska&apos;s servers and paused for your decision.</p>
          <div className="space-y-2">
            {backgroundApprovals.map(run => (
              <div key={run.id} className="flex items-start gap-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] p-3">
                <AlertTriangle size={14} className="text-[var(--warning)] mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[var(--text)]">{run.name || run.source_kind}</p>
                  <p className="text-[10px] text-[var(--muted)] mt-0.5">
                    Wants to use <span className="font-mono">{run.pending_approval?.toolName ?? "a tool"}</span>
                    {run.pending_approval?.category ? ` (${run.pending_approval.category})` : ""}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={async () => {
                      const ok = await resolveServerApproval(run.id, true);
                      onToast?.(ok ? "Approved — resuming on the server" : "Couldn't reach the runtime");
                    }}
                    className="rounded-lg bg-[var(--success)]/15 text-[var(--success)] hover:bg-[var(--success)]/25 px-3 py-1.5 text-[10px] font-semibold transition"
                  >Approve</button>
                  <button
                    onClick={async () => {
                      const ok = await resolveServerApproval(run.id, false);
                      onToast?.(ok ? "Declined — run cancelled" : "Couldn't reach the runtime");
                    }}
                    className="rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20 px-3 py-1.5 text-[10px] font-semibold transition"
                  >Decline</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Live-session approvals */}
      {approvals.length > 0 && (
        <section className="mb-6 rounded-2xl border border-[var(--warning)]/25 bg-[var(--warning)]/[0.05] p-4">
          <h2 className="text-xs font-bold text-[var(--warning)] flex items-center gap-1.5 uppercase tracking-wider mb-3">
            <ShieldCheck size={12} /> Needs your decision
          </h2>
          <div className="space-y-2">
            {approvals.map(apr => (
              <div key={apr.id} className="flex items-start gap-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] p-3">
                <AlertTriangle size={14} className="text-[var(--warning)] mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[var(--text)]">{apr.action}</p>
                  <p className="text-[10px] text-[var(--muted)] mt-0.5">{apr.reason}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => { respondToApproval(apr.id, true); onToast?.("Approved"); }}
                    className="rounded-lg bg-[var(--success)]/15 text-[var(--success)] hover:bg-[var(--success)]/25 px-3 py-1.5 text-[10px] font-semibold transition"
                  >Approve</button>
                  <button
                    onClick={() => { respondToApproval(apr.id, false); onToast?.("Declined"); }}
                    className="rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20 px-3 py-1.5 text-[10px] font-semibold transition"
                  >Decline</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active workers */}
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-3">Active Workers</h2>
          {activeAgents.length === 0 && activeAutomations.length === 0 ? (
            <EmptyLine icon={<Sparkles size={13} />} text="No active agents or automations yet." />
          ) : (
            <div className="space-y-1.5">
              {activeAgents.map(a => (
                <WorkerRow key={a.id} icon={a.icon} name={a.name} detail={a.description || "Custom agent"} />
              ))}
              {activeAutomations.map(a => (
                <WorkerRow key={a.id} icon={a.icon} name={a.name} detail={a.description || "Automation"} zap />
              ))}
            </div>
          )}
        </section>

        {/* Recent activity */}
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-3">Recent Activity</h2>
          {recentRuns.length === 0 ? (
            <EmptyLine icon={<Clock size={13} />} text="No executions yet." />
          ) : (
            <div className="space-y-1">
              {recentRuns.map(run => (
                <RunRow key={run.id} run={run}
                  sourceName={
                    run.sourceKind === "ai" ? "Noska AI"
                      : agents.find(a => a.id === run.sourceId)?.name
                      ?? automations.find(a => a.id === run.sourceId)?.name
                      ?? run.sourceId.slice(0, 14)
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Usage (#20) — real aggregates from run history */}
      <section className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-3">Usage</h2>
        {runs.length === 0 ? (
          <p className="text-[11px] text-[var(--muted)] py-2">
            Your agent hasn't executed yet — usage appears here after the first run.
          </p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <UsageCol label="Today" stats={usageToday} />
            <UsageCol label="This month" stats={usageMonth} />
            <div className="col-span-1 lg:col-span-2 space-y-1.5">
              <p className="text-[10px] font-semibold text-[var(--secondary)]">Month highlights</p>
              <MiniStat k="Tool calls" v={usageMonth.toolCalls} />
              <MiniStat k="Delegations" v={usageMonth.delegations} />
              <MiniStat k="Model calls" v={usageMonth.modelCalls} />
              <MiniStat k="Avg duration" v={usageMonth.avgDurationMs > 0 ? `${(usageMonth.avgDurationMs / 1000).toFixed(1)}s` : "—"} />
            </div>
          </div>
        )}
      </section>

      {/* Failures */}
      {failedRuns.length > 0 && (
        <section className="mt-4 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/[0.04] p-4">
          <h2 className="text-xs font-bold text-[var(--danger)] flex items-center gap-1.5 uppercase tracking-wider mb-2">
            <XCircle size={12} /> Failed Runs
          </h2>
          <div className="space-y-1">
            {failedRuns.map(run => (
              <div key={run.id} className="flex items-center gap-2 text-[11px]">
                <XCircle size={9} className="text-[var(--danger)] shrink-0" />
                <span className="text-[var(--text-secondary)] truncate">{run.errors[0] || run.summary || "Failed"}</span>
                <span className="text-[9px] text-[var(--muted)] ml-auto shrink-0">{new Date(run.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, total, tone }: { icon: React.ReactNode; label: string; value: string; total?: number; tone: "accent" | "warning" | "success" | "muted" }) {
  const color =
    tone === "accent" ? "text-[var(--accent)] bg-[var(--accent)]/10" :
    tone === "warning" ? "text-[var(--warning)] bg-[var(--warning)]/10" :
    tone === "success" ? "text-[var(--success)] bg-[var(--success)]/10" :
    "text-[var(--muted)] bg-[var(--surface-2)]/50";
  return (
    <motion.div whileHover={{ y: -2 }} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${color}`}>{icon}</div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl font-bold text-[var(--text)]">{value}</span>
        {total !== undefined && total > 0 && <span className="text-[10px] text-[var(--muted)]">of {total}</span>}
      </div>
      <p className="text-[9px] text-[var(--muted)] uppercase tracking-wider mt-0.5">{label}</p>
    </motion.div>
  );
}

function WorkerRow({ icon, name, detail, zap }: { icon: string; name: string; detail: string; zap?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-[var(--hover)] transition">
      <span className="text-base shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-[var(--text)] truncate">{name}</p>
        <p className="text-[9px] text-[var(--muted)] truncate">{detail}</p>
      </div>
      <span className={`shrink-0 w-1.5 h-1.5 rounded-full animate-pulse ${zap ? "bg-[var(--warning)]" : "bg-[var(--success)]"}`} />
    </div>
  );
}

function RunRow({ run, sourceName }: { run: RunRecord; sourceName: string }) {
  return (
    <details className="group">
      <summary className="flex items-center gap-2 cursor-pointer select-none list-none py-1 px-1 rounded hover:bg-[var(--hover)] transition">
        {run.status === "completed" ? <CheckCircle2 size={10} className="text-[var(--success)] shrink-0" />
          : run.status === "failed" ? <XCircle size={10} className="text-[var(--danger)] shrink-0" />
          : run.status === "running" ? <Loader2 size={10} className="text-[var(--accent)] animate-spin shrink-0" />
          : <Clock size={10} className="text-[var(--muted)] shrink-0" />}
        <span className="text-[11px] text-[var(--text-secondary)] truncate">{sourceName}</span>
        <span className="text-[9px] text-[var(--muted)] ml-auto shrink-0">
          {run.finishedAt ? new Date(run.finishedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "…"}
        </span>
        <ChevronRight size={9} className="text-[var(--muted)] rotate-90 group-open:-rotate-90 transition-transform shrink-0" />
      </summary>
      {run.summary && <p className="text-[10px] text-[var(--muted)] pl-6 pb-1 leading-relaxed">{run.summary}</p>}
    </details>
  );
}

function EmptyLine({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-[var(--muted)] py-3 justify-center opacity-70">
      {icon} {text}
    </div>
  );
}

// ─── Status Center primitives (#4) ─────────────────────────────────────────

function StatusRow({ label, dot, value, onClick }: {
  label: string;
  dot: "ok" | "warn" | "off" | "unknown";
  value: string;
  onClick?: () => void;
}) {
  const dotCls =
    dot === "ok" ? "bg-[var(--success)]" :
    dot === "warn" ? "bg-[var(--warning)]" :
    dot === "unknown" ? "bg-[var(--muted)] animate-pulse" : "bg-[var(--border)]";
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 py-1 rounded-lg transition ${onClick ? "hover:bg-[var(--hover)] px-1.5 -mx-1.5" : ""}`}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotCls}`} />
      <span className="text-[11px] font-medium text-[var(--text-secondary)]">{label}</span>
      <span className="ml-auto text-[10px] text-[var(--muted)] truncate">{value}</span>
    </button>
  );
}

function UsageCol({ label, stats }: { label: string; stats: ReturnType<typeof usageStats> }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold text-[var(--secondary)]">{label}</p>
      <MiniStat k="Runs" v={stats.runs} />
      <MiniStat k="Success rate" v={`${stats.successRate}%`} />
      <MiniStat k="Failed" v={stats.failed} danger={stats.failed > 0} />
      <MiniStat k="Tool calls" v={stats.toolCalls} />
    </div>
  );
}

function MiniStat({ k, v, danger }: { k: string; v: string | number; danger?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[10px] text-[var(--muted)]">{k}</span>
      <span className={`text-[11px] font-bold ml-auto ${danger ? "text-[var(--danger)]" : "text-[var(--text)]"}`}>{v}</span>
    </div>
  );
}
