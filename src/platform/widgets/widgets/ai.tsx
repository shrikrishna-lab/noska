/**
 * AI widgets — AI Activity, AI Quick Ask, AI Usage.
 *
 * AI Activity reads the local agent/automation stores (mirrored, so it
 * renders instantly and works offline). AI Usage reads the caller's own
 * usage stats only — never other users' data.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, CheckCircle2, SendHorizontal, Sparkles, TriangleAlert, Zap } from "lucide-react";
import { timeAgo } from "../../../utils/helpers";
import { fetchAgents } from "../../../features/agents/agentStore";
import { fetchAutomations, type NoskaAutomation } from "../../../features/automations/automationStore";
import type { NoskaAgent } from "../../../features/agents/agentStore";
import { fetchUserAIStats, type UserAIUsageStats } from "../../../lib/supabaseService";
import { AnimatedCount, WidgetEmpty, WidgetError, WidgetLoading, WidgetPermissionRequired, WidgetStat } from "../components/WidgetFrame";
import type { WidgetProps } from "../types";

interface AiJob {
  id: string;
  name: string;
  kind: "agent" | "automation";
  active: boolean;
  health: string;
  lastRunAt: string | null;
  runCount: number;
  failureStreak: number;
}

async function loadAiJobs(): Promise<AiJob[]> {
  const [agents, automations] = await Promise.all([fetchAgents(), fetchAutomations()]);
  const jobs: AiJob[] = [
    ...(agents as NoskaAgent[]).map((a) => ({
      id: a.id,
      name: a.name,
      kind: "agent" as const,
      active: a.status === "active",
      health: "healthy",
      lastRunAt: null,
      runCount: 0,
      failureStreak: 0,
    })),
    ...(automations as NoskaAutomation[]).map((a) => ({
      id: a.id,
      name: a.name,
      kind: "automation" as const,
      active: a.status === "active",
      health: a.health,
      lastRunAt: a.lastRunAt ?? null,
      runCount: a.runCount ?? 0,
      failureStreak: a.failureStreak ?? 0,
    })),
  ];
  return jobs;
}

// ── AI Activity ─────────────────────────────────────────────────────────────

export function AiActivityWidget({ size, ctx }: WidgetProps) {
  const [jobs, setJobs] = useState<AiJob[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setJobs(null);
    setError(null);
    loadAiJobs()
      .then((result) => {
        if (!cancelled) setJobs(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load AI activity");
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const active = jobs?.filter((j) => j.active) ?? [];
  const healthy = active.filter((j) => j.health === "healthy").length;
  const struggling = jobs?.filter((j) => j.health !== "healthy" && j.health !== "waiting_approval") ?? [];
  const recent = useMemo(
    () =>
      (jobs ?? [])
        .filter((j) => j.lastRunAt)
        .sort((a, b) => new Date(b.lastRunAt!).getTime() - new Date(a.lastRunAt!).getTime())
        .slice(0, size === "small" ? 2 : 4),
    [jobs, size],
  );

  if (error) return <WidgetError message={error} onRetry={() => setReloadKey((k) => k + 1)} />;
  if (!jobs) return <WidgetLoading rows={3} />;
  if (jobs.length === 0) {
    return (
      <WidgetEmpty
        icon={<Bot size={18} className="text-[var(--muted)]" />}
        title="No agents or automations yet"
        hint="Create your first agent and its activity will stream here."
        action={
          <button
            onClick={() => ctx.actions.onView?.("agents")}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text)] hover:border-[var(--accent)] cursor-pointer"
          >
            Create an agent
          </button>
        }
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2.5 grid grid-cols-3 gap-2">
        <WidgetStat label="Active" value={<AnimatedCount value={active.length} />} tone="accent" onClick={() => ctx.actions.onView?.("agents")} />
        <WidgetStat label="Healthy" value={<AnimatedCount value={healthy} />} tone="success" />
        <WidgetStat
          label="Issues"
          value={<AnimatedCount value={struggling.length} />}
          tone={struggling.length > 0 ? "danger" : "default"}
          onClick={() => ctx.actions.onView?.("automations")}
        />
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto scrollbar-thin">
        <AnimatePresence initial={false}>
          {recent.map((job) => (
            <motion.div
              key={job.id}
              layout
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-[var(--surface)]"
            >
              {job.health === "healthy" ? (
                <CheckCircle2 size={13} className="shrink-0 text-emerald-500" />
              ) : (
                <TriangleAlert size={13} className="shrink-0 text-amber-500" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11.5px] font-semibold text-[var(--text)]">{job.name}</span>
                <span className="text-[10px] text-[var(--muted)]">
                  {job.kind} · {job.lastRunAt ? `ran ${timeAgo(job.lastRunAt)}` : "never run"}
                  {job.failureStreak > 0 && ` · ${job.failureStreak} failures`}
                </span>
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        {recent.length === 0 && (
          <p className="px-2 py-3 text-center text-[10.5px] text-[var(--muted)]">
            {active.length > 0 ? "Active and waiting for triggers." : "No active jobs."}
          </p>
        )}
      </div>
    </div>
  );
}

// ── AI Quick Ask ────────────────────────────────────────────────────────────

const QUICK_PROMPTS = ["Summarize this workspace", "What's due soon?", "Draft an update"];

export function AiQuickAskWidget({ ctx }: WidgetProps) {
  const [prompt, setPrompt] = useState("");

  const ask = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    // The quick entry point hands off to the AI surface; the prompt rides
    // along for the AI view to pick up when it supports prefills.
    window.dispatchEvent(new CustomEvent("noska:ai-quick-ask", { detail: { prompt: trimmed } }));
    ctx.actions.onAI();
    setPrompt("");
  };

  return (
    <div className="flex h-full flex-col justify-center gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(prompt);
        }}
        className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 transition-colors focus-within:border-[var(--accent)]"
      >
        <Sparkles size={13} className="shrink-0 text-[var(--accent)]" />
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask AI anything…"
          className="min-w-0 flex-1 bg-transparent text-[11.5px] text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
        />
        <button
          type="submit"
          disabled={!prompt.trim()}
          aria-label="Ask"
          className="rounded-lg bg-blue-600 p-1.5 text-white transition-opacity disabled:opacity-40 cursor-pointer"
        >
          <SendHorizontal size={11} />
        </button>
      </form>
      <div className="flex flex-wrap gap-1">
        {QUICK_PROMPTS.map((q) => (
          <button
            key={q}
            onClick={() => ask(q)}
            className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text)] cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── AI Usage ────────────────────────────────────────────────────────────────

export function AiUsageWidget({ ctx }: WidgetProps) {
  const [stats, setStats] = useState<UserAIUsageStats | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error" | "denied">("loading");
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(() => {
    if (!ctx.currentUserId) {
      setState("denied");
      return;
    }
    setState("loading");
    fetchUserAIStats(ctx.currentUserId)
      .then((result) => {
        setStats(result);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [ctx.currentUserId]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  if (state === "denied") return <WidgetPermissionRequired integration="your account" />;
  if (state === "error") return <WidgetError onRetry={() => setReloadKey((k) => k + 1)} />;
  if (state === "loading") return <WidgetLoading rows={2} />;
  if (!stats) {
    return (
      <WidgetEmpty
        icon={<Zap size={18} className="text-[var(--muted)]" />}
        title="No AI usage yet"
        hint="Your requests, generations and quota will appear here once you start using AI."
      />
    );
  }

  const s = stats as unknown as Record<string, unknown>;
  const requests = Number(s.total_requests ?? s.requests ?? 0);
  const tokens = Number(s.total_tokens ?? s.tokens ?? 0);
  const avgLatency = Number(s.avg_latency_ms ?? s.avgLatency ?? 0);

  return (
    <div className="grid h-full grid-cols-2 content-center gap-3">
      <WidgetStat label="Requests" value={<AnimatedCount value={requests} />} />
      <WidgetStat label="Tokens" value={tokens > 1000 ? `${(tokens / 1000).toFixed(1)}k` : tokens} tone="accent" />
      <WidgetStat
        label="Avg latency"
        value={avgLatency ? `${Math.round(avgLatency)}ms` : "—"}
      />
      <WidgetStat label="Status" value={<span className="flex items-center gap-1 text-emerald-500">OK <CheckCircle2 size={13} /></span>} tone="success" />
    </div>
  );
}
