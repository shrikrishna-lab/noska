import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Flag, ChevronDown, Check, Loader2 } from "lucide-react"
import { supabase } from "../../lib/supabase"

const PRIORITIES = [
  { value: "urgent", label: "Urgent", color: "#ef4444", emoji: "🔴" },
  { value: "high", label: "High", color: "#f97316", emoji: "🟠" },
  { value: "medium", label: "Medium", color: "#eab308", emoji: "🟡" },
  { value: "low", label: "Low", color: "#22c55e", emoji: "🟢" },
  { value: "none", label: "None", color: "#6b7280", emoji: "⚪" },
]

interface PagePriorityProps {
  pageId: string
  priority: string
  onPriorityChange?: (priority: string) => void
}

export function PagePriority({ pageId, priority, onPriorityChange }: PagePriorityProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const current = PRIORITIES.find(p => p.value === priority) || PRIORITIES[4]

  const handleChange = async (newPriority: string) => {
    setLoading(true)
    try {
      await supabase
        .from("pages" as any)
        .update({ priority: newPriority } as any)
        .eq("id", pageId)
      onPriorityChange?.(newPriority)
      setOpen(false)
    } catch {}
    finally { setLoading(false) }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border border-[var(--border)] hover:border-[var(--accent)]/50 transition cursor-pointer"
        style={{ borderColor: current.color + "40" }}
      >
        <span>{current.emoji}</span>
        {current.label}
        <ChevronDown size={9} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute left-0 top-full mt-1 z-50 w-40 bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-xl p-1"
            >
              {PRIORITIES.map(p => (
                <button
                  key={p.value}
                  onClick={() => handleChange(p.value)}
                  disabled={loading}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-[var(--surface-2)] transition text-left cursor-pointer"
                >
                  <span>{p.emoji}</span>
                  <span className="text-[11px] text-[var(--text)]">{p.label}</span>
                  {p.value === priority && <Check size={10} className="ml-auto text-[var(--accent)]" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
