/**
 * Noska Widget Platform — Reusable AI Primitive.
 * Renders AI Workspace Summaries, Health Diagnostics, Pattern Insights, and Q&A Explorers.
 */
import React, { useState } from "react";
import { Sparkles, Brain, ArrowRight, Loader2, CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";
import type { WidgetSize } from "../types";

export type AIWidgetMode = "summary" | "insights" | "health" | "qa";

export interface AIInsightItem {
  id: string;
  type: "positive" | "warning" | "neutral";
  text: string;
  recommendation?: string;
}

export interface AIPrimitiveProps {
  mode: AIWidgetMode;
  title?: string;
  summaryText?: string;
  healthScore?: number;
  /** Optional factual sub-line for health mode (e.g. "12/20 tasks complete · 3 overdue"). */
  detailText?: string;
  insights?: AIInsightItem[];
  size?: WidgetSize;
  onAskAI?: (prompt: string) => void;
  onExplain?: () => void;
}

export function AIPrimitive({
  mode,
  title,
  summaryText = "No summary available yet.",
  healthScore,
  detailText,
  insights = [],
  size = "medium",
  onAskAI,
  onExplain,
}: AIPrimitiveProps) {
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAsk = () => {
    if (!prompt.trim()) return;
    setIsSubmitting(true);
    onAskAI?.(prompt);
    setTimeout(() => {
      setIsSubmitting(false);
      setPrompt("");
    }, 800);
  };

  // 1. Health Diagnostic Mode
  if (mode === "health") {
    const hasScore = typeof healthScore === "number" && Number.isFinite(healthScore);
    const score = hasScore ? Math.max(0, Math.min(100, healthScore)) : 0;
    const isGood = hasScore && score >= 80;
    const isModerate = hasScore && score >= 60 && score < 80;
    const strokeColor = !hasScore ? "#a3a3a3" : isGood ? "#10b981" : isModerate ? "#f59e0b" : "#ef4444";
    const statusLabel = !hasScore ? "No data yet" : isGood ? "Healthy" : isModerate ? "Needs Attention" : "At Risk";
    const statusCopy =
      detailText ??
      (!hasScore
        ? "Task data will appear here once your workspace has todos."
        : isGood
        ? "Completion and overdue balance look healthy."
        : isModerate
        ? "Some open or overdue tasks need attention."
        : "Several tasks are overdue or incomplete — worth a review.");

    return (
      <div className="flex h-full w-full flex-col justify-between p-3 select-none font-sans">
        <div className="flex items-center justify-between pb-1 border-b border-black/[0.04] dark:border-white/[0.06]">
          <div className="flex items-center gap-1.5">
            <Brain size={13} className="text-purple-500" />
            <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">Workspace Health</span>
          </div>
          {onExplain && (
            <button onClick={onExplain} className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white">
              <HelpCircle size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 my-auto">
          <div className="relative flex items-center justify-center size-16 shrink-0">
            <svg className="size-full rotate-[-90deg]">
              <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="6" className="text-black/5 dark:text-white/10" />
              <circle
                cx="32"
                cy="32"
                r="26"
                fill="none"
                stroke={strokeColor}
                strokeWidth="6"
                strokeDasharray={`${(score / 100) * 163.3} 163.3`}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>
            <span className="absolute text-sm font-bold text-neutral-900 dark:text-white font-mono">{hasScore ? `${score}%` : "—"}</span>
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1 text-xs font-bold text-neutral-800 dark:text-neutral-200">
              {isGood ? (
                <CheckCircle2 size={13} className="text-emerald-500" />
              ) : hasScore ? (
                <AlertCircle size={13} className="text-amber-500" />
              ) : (
                <HelpCircle size={13} className="text-neutral-400" />
              )}
              <span>{statusLabel}</span>
            </div>
            <p className="text-[10.5px] text-neutral-500 dark:text-neutral-400 leading-snug line-clamp-2">
              {statusCopy}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Summary & Q&A Mode
  return (
    <div className="flex h-full w-full flex-col justify-between p-3 select-none font-sans">
      <div className="flex items-center justify-between pb-1 border-b border-black/[0.04] dark:border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          <Sparkles size={13} className="text-purple-500" />
          <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">{title || "AI Workspace Insight"}</span>
        </div>
        {onExplain && (
          <button onClick={onExplain} className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white">
            <HelpCircle size={13} />
          </button>
        )}
      </div>

      <div className="my-auto py-1">
        <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed line-clamp-3">
          {summaryText}
        </p>
      </div>

      {onAskAI && (
        <div className="flex items-center gap-1 pt-1.5">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
            placeholder="Ask AI about this data…"
            className="flex-1 rounded-lg border border-black/[0.08] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.04] px-2.5 py-1 text-[11px] text-neutral-900 dark:text-white placeholder:text-neutral-400 outline-none focus:border-purple-500"
          />
          <button
            onClick={handleAsk}
            disabled={isSubmitting || !prompt.trim()}
            className="size-7 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white flex items-center justify-center transition shrink-0 cursor-pointer"
          >
            {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
          </button>
        </div>
      )}
    </div>
  );
}

export default AIPrimitive;
