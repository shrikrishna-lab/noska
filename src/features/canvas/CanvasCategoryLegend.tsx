import React from "react";
import { motion } from "framer-motion";
import { STICKY_PALETTES } from "./canvasStore";
import { X, Tag } from "lucide-react";

interface CanvasCategoryLegendProps {
  open: boolean;
  onClose: () => void;
  onSelectCategory?: (colorId: string) => void;
}

export function CanvasCategoryLegend({ open, onClose, onSelectCategory }: CanvasCategoryLegendProps) {
  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="absolute top-16 left-1/2 -translate-x-1/2 z-40 w-[360px] rounded-2xl border border-black/10 dark:border-white/10 bg-white/95 dark:bg-[#1c1e26]/95 backdrop-blur-2xl p-4 shadow-2xl text-slate-900 dark:text-slate-100 select-none"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-black/5 dark:border-white/10">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Tag size={13} className="text-amber-500" />
          <span>Professional Tags & Statuses</span>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
        >
          <X size={13} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {STICKY_PALETTES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelectCategory?.(cat.id)}
            className="flex items-center gap-2 p-2 rounded-xl border border-black/5 dark:border-white/10 hover:shadow-xs transition-all cursor-pointer text-left hover:scale-[1.02]"
            style={{
              backgroundColor: cat.bg,
              color: cat.text,
              borderColor: cat.border
            }}
          >
            <span className="text-sm shrink-0">{cat.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold leading-tight text-[11.5px]">{cat.label}</div>
              <div className="text-[9.5px] opacity-70">Category</div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/10 text-[10.5px] text-slate-500 dark:text-slate-400 text-center">
        Select a note on canvas and click a category to update
      </div>
    </motion.div>
  );
}

export default CanvasCategoryLegend;
