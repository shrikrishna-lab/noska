import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Columns, X, ChevronDown, ChevronRight } from "lucide-react"

interface DatabaseGroupProps {
  fields: { key: string; label: string }[]
  groupBy: string | null
  onChange: (field: string | null) => void
}

export function DatabaseGroup({ fields, groupBy, onChange }: DatabaseGroupProps) {
  const [open, setOpen] = useState(false)
  const current = fields.find(f => f.key === groupBy)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition cursor-pointer ${
          groupBy
            ? "bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)]"
            : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]/50"
        }`}
      >
        <Columns size={11} />
        Group{groupBy ? `: ${current?.label}` : ""}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute left-0 top-full mt-1 z-50 w-48 bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-xl p-1"
            >
              <button
                onClick={() => { onChange(null); setOpen(false) }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-[var(--surface-2)] transition text-left cursor-pointer"
              >
                <span className="text-[11px] text-[var(--muted)]">No grouping</span>
                {!groupBy && <span className="ml-auto text-[var(--accent)] text-[10px]">✓</span>}
              </button>
              {fields.map(f => (
                <button
                  key={f.key}
                  onClick={() => { onChange(f.key); setOpen(false) }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-[var(--surface-2)] transition text-left cursor-pointer"
                >
                  <span className="text-[11px] text-[var(--text)]">{f.label}</span>
                  {groupBy === f.key && <span className="ml-auto text-[var(--accent)] text-[10px]">✓</span>}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
