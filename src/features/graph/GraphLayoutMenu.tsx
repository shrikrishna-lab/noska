import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, LayoutGrid } from "lucide-react";
import { LucideIcon } from "@/components/PageIcon";
import { LAYOUTS } from "./graphLayouts";

/**
 * GraphLayoutMenu — dropdown for choosing a graph arrangement algorithm.
 * Selecting a layout applies it immediately via onApply(id).
 */
export default function GraphLayoutMenu({ activeLayout, onApply }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const activeIconName = LAYOUTS.find((l) => l.id === activeLayout)?.icon || "LayoutGrid";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Layout"
        aria-label="Choose layout"
        className={`relative group flex items-center justify-center w-8 h-8 rounded-lg border transition-all cursor-pointer ${
          open
            ? "bg-[var(--accent)] border-[var(--accent)] text-white shadow-sm"
            : "bg-[var(--surface)]/50 border-[var(--border)] text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)] hover:border-[var(--secondary)]"
        }`}
      >
        <LucideIcon name={activeIconName} size={14} fallback={<LayoutGrid size={14} />} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            className="absolute top-full right-0 mt-2 z-30 min-w-[180px] rounded-xl bg-[var(--elevated)]/95 backdrop-blur-md border border-[var(--border-strong)] p-1.5 shadow-xl"
          >
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Arrange as</div>
            {LAYOUTS.map((l) => {
              const active = l.id === activeLayout;
              return (
                <button
                  key={l.id}
                  onClick={() => { onApply(l.id); setOpen(false); }}
                  className={`flex w-full items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs transition cursor-pointer ${
                    active ? "bg-[var(--accent)]/12 text-[var(--accent)] font-medium" : "text-[var(--text)] hover:bg-[var(--hover)]"
                  }`}
                >
                  <LucideIcon name={l.icon} size={14} className="shrink-0" fallback={<LayoutGrid size={14} className="shrink-0" />} />
                  {l.label}
                  {active && <Check size={13} className="ml-auto" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
