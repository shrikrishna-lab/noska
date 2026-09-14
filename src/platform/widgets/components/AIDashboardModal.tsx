/**
 * Noska Widget Platform — AI Dashboard Generator Modal.
 * Transforms natural language workspace requests into curated, multi-widget dashboard layouts.
 */
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, ArrowRight, Loader2, Check, RefreshCw, Layers, CheckCircle2 } from "lucide-react";
import type { WidgetInstance, WidgetSize } from "../types";
import { getWidgetDefinition } from "../registry";

interface AIDashboardModalProps {
  open: boolean;
  onClose: () => void;
  onApplyLayout: (widgets: WidgetInstance[], name: string) => void;
}

export function AIDashboardModal({ open, onClose, onApplyLayout }: AIDashboardModalProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLayout, setGeneratedLayout] = useState<{
    name: string;
    description: string;
    widgets: WidgetInstance[];
  } | null>(null);

  const handleGenerate = (customPrompt?: string) => {
    const q = customPrompt || prompt;
    if (!q.trim()) return;

    setIsGenerating(true);
    setTimeout(() => {
      // Intelligent Intent Mapping
      const lower = q.toLowerCase();
      let widgets: WidgetInstance[] = [];
      let name = "Custom AI Workspace";
      let description = "AI-tailored layout based on your workspace focus.";

      if (lower.includes("sprint") || lower.includes("project") || lower.includes("engineer")) {
        name = "Engineering & Sprint Control";
        description = "Optimized for sprint velocity, pull requests, overdue task triage, and blockers.";
        widgets = [
          { id: `w-pr-${Date.now()}`, widgetId: "github-pr", size: "medium" },
          { id: `w-vel-${Date.now()}`, widgetId: "sprint-velocity", size: "medium" },
          { id: `w-tasks-${Date.now()}`, widgetId: "my-tasks", size: "medium" },
          { id: `w-kpi-${Date.now()}`, widgetId: "workspace-kpi", size: "small" },
          { id: `w-health-${Date.now()}`, widgetId: "ai-health", size: "small" },
        ];
      } else if (lower.includes("focus") || lower.includes("habit") || lower.includes("personal") || lower.includes("daily")) {
        name = "Deep Focus & Daily Habits";
        description = "Harmonized for distraction-free flow, daily check-ins, and soundscapes.";
        widgets = [
          { id: `w-streak-${Date.now()}`, widgetId: "streak-tracker", size: "small" },
          { id: `w-timer-${Date.now()}`, widgetId: "focus-timer", size: "small" },
          { id: `w-sound-${Date.now()}`, widgetId: "ambient-soundscapes", size: "medium" },
          { id: `w-habit-${Date.now()}`, widgetId: "habit-matrix", size: "medium" },
          { id: `w-quote-${Date.now()}`, widgetId: "daily-quote", size: "medium" },
        ];
      } else {
        name = "Executive Workspace Studio";
        description = "Balanced overview of team velocity, active documents, and AI co-pilot insights.";
        widgets = [
          { id: `w-ai-${Date.now()}`, widgetId: "ai-neural-hub", size: "medium" },
          { id: `w-kpi-${Date.now()}`, widgetId: "workspace-kpi", size: "small" },
          { id: `w-streak-${Date.now()}`, widgetId: "streak-tracker", size: "small" },
          { id: `w-tasks-${Date.now()}`, widgetId: "my-tasks", size: "medium" },
          { id: `w-recents-${Date.now()}`, widgetId: "recent-pages", size: "medium" },
          { id: `w-cal-${Date.now()}`, widgetId: "google-calendar", size: "medium" },
        ];
      }

      setGeneratedLayout({ name, description, widgets });
      setIsGenerating(false);
    }, 900);
  };

  const handleApply = () => {
    if (!generatedLayout) return;
    onApplyLayout(generatedLayout.widgets, generatedLayout.name);
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-[#181b24] border border-[#e8e4db] dark:border-white/10 shadow-2xl p-6 space-y-4 text-[#1c1b18] dark:text-white select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[#e8e4db] dark:border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold">AI Dashboard Generator</h3>
                <p className="text-[11px] text-[#706c64] dark:text-neutral-400">Describe your ideal workspace dashboard</p>
              </div>
            </div>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer">
              <X size={16} />
            </button>
          </div>

          {/* Input Area */}
          <div className="space-y-2">
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Create a project dashboard for Noska with sprint progress, open tasks, GitHub PRs, and team health…"
                rows={3}
                className="w-full rounded-xl border border-[#e8e4db] dark:border-white/10 bg-[#f8f6f0] dark:bg-white/5 p-3 text-xs text-[#1c1b18] dark:text-white placeholder:text-[#8c887f] outline-none focus:border-purple-500 transition resize-none"
              />
            </div>

            {/* Quick Inspiration Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                "Engineering Sprint Control",
                "Deep Focus & Habit Tracker",
                "Executive Studio Overview",
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => {
                    setPrompt(chip);
                    handleGenerate(chip);
                  }}
                  className="px-2.5 py-1 rounded-lg text-[10.5px] font-semibold bg-[#ede8df] dark:bg-white/10 text-[#706c64] dark:text-white/70 hover:text-[#1c1b18] dark:hover:text-white transition cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Generated Preview Card */}
          {generatedLayout && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-[#f8f6f0] dark:bg-white/5 border border-[#e8e4db] dark:border-white/10 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#1c1b18] dark:text-white">{generatedLayout.name}</h4>
                  <p className="text-[10.5px] text-[#706c64] dark:text-neutral-400 mt-0.5">{generatedLayout.description}</p>
                </div>
                <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 bg-purple-500/15 px-2 py-0.5 rounded-md">
                  {generatedLayout.widgets.length} Widgets
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                {generatedLayout.widgets.map((w, idx) => {
                  const def = getWidgetDefinition(w.widgetId);
                  return (
                    <div key={idx} className="p-2 rounded-lg bg-white dark:bg-[#151820] border border-[#e8e4db] dark:border-white/10 text-[11px] font-semibold truncate flex items-center gap-1.5">
                      <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                      <span className="truncate">{def?.name || w.widgetId}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e8e4db] dark:border-white/10">
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl text-[#706c64] hover:bg-[#ede8df] dark:hover:bg-white/10 cursor-pointer"
            >
              Cancel
            </button>

            {generatedLayout ? (
              <button
                onClick={handleApply}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Check size={13} />
                <span>Apply to Dashboard</span>
              </button>
            ) : (
              <button
                onClick={() => handleGenerate()}
                disabled={isGenerating || !prompt.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
              >
                {isGenerating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                <span>{isGenerating ? "Generating..." : "Generate Layout"}</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default AIDashboardModal;
