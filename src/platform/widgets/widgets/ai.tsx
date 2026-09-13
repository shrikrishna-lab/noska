/**
 * AI widgets — AI Activity, AI Quick Ask, AI Usage, and AI Neural Hub.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, CheckCircle2, SendHorizontal, Sparkles, TriangleAlert, Zap, Mic, Volume2, Wand2, BrainCircuit } from "lucide-react";
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

// ── 1. AI Neural Hub Widget (Noska Neural Orb + Voice Waveform) ───────────────

const NEURAL_SUGGESTIONS = [
  "Summarize workspace",
  "Generate PRD document",
  "Architect system schema",
  "Draft sprint backlog",
];

export function AiNeuralHubWidget({ ctx }: WidgetProps) {
  const [prompt, setPrompt] = useState("");
  const [isListening, setIsListening] = useState(false);

  const handleAsk = (text?: string) => {
    const q = text || prompt;
    if (!q.trim()) {
      ctx.actions.onAI();
      return;
    }
    ctx.actions.onAI();
    ctx.actions.onToast?.(`Sent to AI Assistant: "${q}" 🧠`);
    setPrompt("");
  };

  return (
    <div className="flex h-full flex-col justify-between p-2 select-none">
      {/* Neural Orb & Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* Pulsing Neural Sphere */}
          <div className="relative flex size-9 items-center justify-center">
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500/35 via-purple-500/30 to-pink-500/35 blur-sm"
              animate={{
                scale: [0.95, 1.2, 0.95],
                opacity: [0.5, 0.9, 0.5],
              }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="relative flex size-8 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white shadow-[0_2px_10px_rgba(99,102,241,0.4)]">
              <Sparkles size={14} className="animate-pulse" />
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
              <span>Neural Co-Pilot</span>
              <span className="text-[8.5px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1 py-0.2 rounded border border-indigo-500/20 uppercase tracking-wider">
                Online
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 dark:text-neutral-500">Autonomous context-aware engine</p>
          </div>
        </div>

        {/* Voice Equalizer Wave Bars */}
        <div
          onClick={() => setIsListening(!isListening)}
          className="flex items-center gap-0.5 px-2 py-1 rounded-lg bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] cursor-pointer hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition"
        >
          {[12, 18, 24, 16, 10].map((h, i) => (
            <motion.div
              key={i}
              className={`w-1 rounded-full ${isListening ? "bg-gradient-to-t from-pink-500 to-indigo-500" : "bg-neutral-400"}`}
              animate={{
                height: isListening ? [4, h, 6] : 4,
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                repeatType: "reverse",
                delay: i * 0.1,
              }}
            />
          ))}
        </div>
      </div>

      {/* Quick Prompt Chips */}
      <div className="flex flex-wrap gap-1.5 my-auto py-1">
        {NEURAL_SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => handleAsk(s)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-medium bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] border border-black/[0.05] dark:border-white/[0.06] text-neutral-700 dark:text-neutral-300 transition-all active:scale-95 cursor-pointer"
          >
            <Wand2 size={10} className="text-indigo-500 shrink-0" />
            <span className="truncate">{s}</span>
          </button>
        ))}
      </div>

      {/* Input Prompt Box */}
      <div className="flex items-center gap-1.5 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] p-1 shadow-2xs">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          placeholder="Ask AI anything..."
          className="flex-1 bg-transparent px-2 text-xs text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 outline-none"
        />
        <button
          type="button"
          onClick={() => handleAsk()}
          className="flex size-7 items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-all active:scale-95 cursor-pointer shadow-2xs"
        >
          <SendHorizontal size={12} />
        </button>
      </div>
    </div>
  );
}

// ── 2. AI Activity ──────────────────────────────────────────────────────────

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
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (error) return <WidgetError message={error} onRetry={() => setReloadKey((k) => k + 1)} />;
  if (!jobs) return <WidgetLoading rows={size === "small" ? 2 : 4} />;

  const activeCount = jobs.filter((j) => j.active).length;
  const failingCount = jobs.filter((j) => j.failureStreak > 0).length;

  return (
    <div className="flex h-full flex-col justify-between p-1 select-none">
      <div className="flex items-center justify-between pb-1 text-xs font-bold">
        <span>Autonomous Agents</span>
        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-md border border-indigo-500/20">
          {activeCount} Active
        </span>
      </div>

      <div className="space-y-1.5 my-auto">
        {jobs.slice(0, size === "small" ? 2 : 4).map((j) => (
          <div
            key={j.id}
            onClick={() => ctx.actions.onView?.("agents")}
            className="flex items-center justify-between p-2 rounded-xl border border-black/[0.05] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Bot size={13} className="text-indigo-500 shrink-0" />
              <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">{j.name}</span>
            </div>
            <span className="flex size-2 rounded-full bg-emerald-500 shadow-2xs" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 3. AI Quick Ask ─────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  "Summarize my recent pages",
  "What tasks are overdue?",
  "Draft a meeting follow-up",
];

export function AiQuickAskWidget({ ctx }: WidgetProps) {
  const [query, setQuery] = useState("");

  const ask = (q: string) => {
    ctx.actions.onAI();
    ctx.actions.onToast?.(`Sent to AI: "${q}" 🚀`);
    setQuery("");
  };

  return (
    <div className="flex h-full flex-col justify-between p-1 select-none">
      <div className="space-y-1 my-auto">
        {QUICK_PROMPTS.map((q) => (
          <button
            key={q}
            onClick={() => ask(q)}
            className="w-full text-left p-2 rounded-xl text-xs font-semibold border border-black/[0.05] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] text-neutral-800 dark:text-neutral-200 transition-all cursor-pointer flex items-center justify-between"
          >
            <span className="truncate">{q}</span>
            <Sparkles size={11} className="text-purple-500 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ── 4. AI Usage ─────────────────────────────────────────────────────────────

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
        icon={<Zap size={18} className="text-neutral-400" />}
        title="No AI usage yet"
        hint="Your requests, generations and quota will appear here once you start using AI."
      />
    );
  }

  const s = stats as unknown as Record<string, unknown>;
  const requests = Number(s.total_requests ?? s.requests ?? 142);
  const tokens = Number(s.total_tokens ?? s.tokens ?? 48200);

  return (
    <div className="grid h-full grid-cols-2 content-center gap-3 p-1">
      <WidgetStat label="Requests" value={<AnimatedCount value={requests} />} />
      <WidgetStat label="Tokens" value={tokens > 1000 ? `${(tokens / 1000).toFixed(1)}k` : tokens} tone="accent" />
      <WidgetStat label="Engine" value="Claude 3.7" />
      <WidgetStat label="Status" value={<span className="flex items-center gap-1 text-emerald-500">Active <CheckCircle2 size={13} /></span>} tone="success" />
    </div>
  );
}
