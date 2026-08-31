import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckSquare, ChevronDown, ChevronUp, Check, Sparkles } from "lucide-react";
import { TemplateChecklistItem } from "./templateTypes";
import { getChecklistProgress } from "./canvasWorkflowEngine";

interface CanvasChecklistBarProps {
  checklist: TemplateChecklistItem[];
  onToggleItem: (itemId: string) => void;
}

export default function CanvasChecklistBar({
  checklist,
  onToggleItem,
}: CanvasChecklistBarProps) {
  const [expanded, setExpanded] = useState(false);

  if (!checklist || checklist.length === 0) return null;

  const { completed, total, percent } = getChecklistProgress(checklist);
  const isAllDone = completed === total;

  return (
    <div className="absolute top-16 left-3 z-20 select-none">
      <motion.div
        layout
        className="rounded-2xl bg-white/90 dark:bg-[#181a22]/90 backdrop-blur-xl border border-black/10 dark:border-white/10 shadow-lg p-2.5 min-w-[240px] max-w-[320px] transition-all"
      >
        {/* Header Bar */}
        <div
          onClick={() => setExpanded((prev) => !prev)}
          className="flex items-center justify-between gap-2 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs transition ${
                isAllDone
                  ? "bg-emerald-500 text-white"
                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold"
              }`}
            >
              {isAllDone ? <Check size={13} strokeWidth={3} /> : <CheckSquare size={13} />}
            </div>
            <div className="flex flex-col">
              <span className="text-[11.5px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <span>Board Checklist</span>
                {isAllDone && (
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    DONE
                  </span>
                )}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {completed} of {total} completed ({percent}%)
              </span>
            </div>
          </div>

          <button
            type="button"
            className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Progress bar line */}
        <div className="w-full h-1 bg-black/5 dark:bg-white/10 rounded-full mt-2 overflow-hidden">
          <motion.div
            className={`h-full ${isAllDone ? "bg-emerald-500" : "bg-amber-500"}`}
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Expanded Checklist Items */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 space-y-1.5 border-t border-black/5 dark:border-white/5 pt-2.5 overflow-hidden"
            >
              {checklist.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onToggleItem(item.id)}
                  className={`w-full flex items-start gap-2 p-1.5 rounded-lg text-left text-xs transition cursor-pointer ${
                    item.completed
                      ? "text-slate-400 line-through bg-black/[0.02] dark:bg-white/[0.02]"
                      : "text-slate-700 dark:text-slate-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded mt-0.5 shrink-0 flex items-center justify-center transition ${
                      item.completed
                        ? "bg-emerald-500 text-white"
                        : "border border-slate-300 dark:border-slate-600 hover:border-amber-500"
                    }`}
                  >
                    {item.completed && <Check size={10} strokeWidth={3} />}
                  </div>
                  <span className="leading-snug text-[11px]">{item.label}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
