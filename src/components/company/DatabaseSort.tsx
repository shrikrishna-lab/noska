import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowUpDown, ArrowUp, ArrowDown, X, Plus, Trash2 } from "lucide-react"

interface SortRule {
  id: string
  field: string
  direction: "asc" | "desc"
}

interface DatabaseSortProps {
  fields: { key: string; label: string }[]
  rules: SortRule[]
  onChange: (rules: SortRule[]) => void
}

export function DatabaseSort({ fields, rules, onChange }: DatabaseSortProps) {
  const [open, setOpen] = useState(false)

  const addRule = () => {
    if (rules.length >= 3) return
    onChange([...rules, { id: Date.now().toString(), field: fields[0]?.key || "", direction: "asc" }])
  }

  const toggleDirection = (id: string) => {
    onChange(rules.map(r => r.id === id ? { ...r, direction: r.direction === "asc" ? "desc" : "asc" } : r))
  }

  const removeRule = (id: string) => {
    onChange(rules.filter(r => r.id !== id))
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition cursor-pointer ${
          rules.length > 0
            ? "bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)]"
            : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]/50"
        }`}
      >
        <ArrowUpDown size={11} />
        Sort{rules.length > 0 ? ` (${rules.length})` : ""}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute left-0 top-full mt-1 z-50 w-72 bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-xl p-3"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-[var(--text)]">Sort by</span>
                <button onClick={() => setOpen(false)} className="text-[var(--muted)] cursor-pointer"><X size={12} /></button>
              </div>

              <div className="space-y-2">
                {rules.map(rule => (
                  <div key={rule.id} className="flex items-center gap-1.5">
                    <select
                      value={rule.field}
                      onChange={e => onChange(rules.map(r => r.id === rule.id ? { ...r, field: e.target.value } : r))}
                      className="flex-1 px-2 py-1.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[10px] text-[var(--text)] cursor-pointer"
                    >
                      {fields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                    </select>
                    <button
                      onClick={() => toggleDirection(rule.id)}
                      className="p-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
                    >
                      {rule.direction === "asc" ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                    </button>
                    <button onClick={() => removeRule(rule.id)} className="p-1 rounded hover:bg-red-500/10 text-[var(--muted)] hover:text-red-500 cursor-pointer">
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>

              {rules.length < 3 && (
                <button
                  onClick={addRule}
                  className="w-full mt-2 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-dashed border-[var(--border)] text-[10px] font-medium text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition cursor-pointer"
                >
                  <Plus size={10} /> Add sort
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
