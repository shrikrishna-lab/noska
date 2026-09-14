/**
 * Noska Widget Platform — Metric Explainability & Provenance Modal.
 * Reveals data sources, active filter criteria, calculation formulas, and AI reasoning factors.
 */
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Database, Filter, Calculator, Clock, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";

export interface MetricExplainData {
  title: string;
  metricValue: string | number;
  dataSource: string;
  filterSummary: string;
  calculationFormula: string;
  lastUpdatedText: string;
  aiReasoning?: string;
}

interface WidgetExplainModalProps {
  open: boolean;
  onClose: () => void;
  data: MetricExplainData | null;
}

export function WidgetExplainModal({ open, onClose, data }: WidgetExplainModalProps) {
  if (!open || !data) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#181b24] border border-[#e8e4db] dark:border-white/10 shadow-2xl p-5 space-y-4 text-[#1c1b18] dark:text-white select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#e8e4db] dark:border-white/10">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold">{data.title}</h3>
                <p className="text-[11px] text-[#706c64] dark:text-neutral-400">Metric Calculation & Provenance</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="size-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          {/* Current Value Display */}
          <div className="p-3.5 rounded-xl bg-[#f8f6f0] dark:bg-white/5 border border-[#e8e4db] dark:border-white/10 flex items-baseline justify-between">
            <span className="text-xs font-semibold text-neutral-500">Current Computed Metric</span>
            <span className="text-2xl font-bold font-mono">{data.metricValue}</span>
          </div>

          {/* Provenance Details List */}
          <div className="space-y-3 text-xs">
            {/* 1. Data Source */}
            <div className="flex items-start gap-2.5">
              <div className="size-6 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <Database size={13} />
              </div>
              <div>
                <p className="font-bold text-neutral-800 dark:text-neutral-200">Data Source</p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">{data.dataSource}</p>
              </div>
            </div>

            {/* 2. Active Filters */}
            <div className="flex items-start gap-2.5">
              <div className="size-6 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Filter size={13} />
              </div>
              <div>
                <p className="font-bold text-neutral-800 dark:text-neutral-200">Query & Filters</p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">{data.filterSummary}</p>
              </div>
            </div>

            {/* 3. Calculation Formula */}
            <div className="flex items-start gap-2.5">
              <div className="size-6 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <Calculator size={13} />
              </div>
              <div>
                <p className="font-bold text-neutral-800 dark:text-neutral-200">Calculation Method</p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono mt-0.5">{data.calculationFormula}</p>
              </div>
            </div>

            {/* 4. AI Reasoning (if applicable) */}
            {data.aiReasoning && (
              <div className="flex items-start gap-2.5">
                <div className="size-6 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={13} />
                </div>
                <div>
                  <p className="font-bold text-neutral-800 dark:text-neutral-200">AI Synthesized Reasoning</p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">{data.aiReasoning}</p>
                </div>
              </div>
            )}

            {/* 5. Last Sync Timestamp */}
            <div className="flex items-start gap-2.5">
              <div className="size-6 rounded-md bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 flex items-center justify-center shrink-0 mt-0.5">
                <Clock size={13} />
              </div>
              <div>
                <p className="font-bold text-neutral-800 dark:text-neutral-200">Sync Status</p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">{data.lastUpdatedText}</p>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={onClose}
              className="w-full py-2 rounded-xl bg-[#1c1b18] hover:bg-black text-white dark:bg-white dark:text-[#1c1b18] text-xs font-semibold shadow-xs transition active:scale-98 cursor-pointer"
            >
              Got it
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default WidgetExplainModal;
