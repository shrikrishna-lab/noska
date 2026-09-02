import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Filter, X, Plus, ChevronDown, Trash2 } from "lucide-react"

interface FilterRule {
  id: string
  field: string
  operator: string
  value: string
}

interface DatabaseFilterProps {
  fields: { key: string; label: string; type: string }[]
  rules: FilterRule[]
  onChange: (rules: FilterRule[]) => void
}

const OPERATORS = {
  text: ["contains", "does not contain", "equals", "does not equal", "starts with", "ends with", "is empty", "is not empty"],
  number: ["equals", "does not equal", "greater than", "less than", "greater or equal", "less or equal", "is empty"],
  select: ["equals", "does not equal", "is set", "is not set"],
  date: ["equals", "before", "after", "between", "is empty"],
  checkbox: ["is checked", "is not checked"],
} as const

export function DatabaseFilter({ fields, rules, onChange }: DatabaseFilterProps) {
  const [open, setOpen] = useState(false)

  const addRule = () => {
    onChange([...rules, { id: Date.now().toString(), field: fields[0]?.key || "", operator: "contains", value: "" }])
  }

  const updateRule = (id: string, updates: Partial<FilterRule>) => {
    onChange(rules.map(r => r.id === id ? { ...r, ...updates } : r))
  }

  const removeRule = (id: string) => {
    onChange(rules.filter(r => r.id !== id))
  }

  const activeField = (key: string) => fields.find(f => f.key === key)
  const getOperators = (fieldKey: string) => {
    const field = activeField(fieldKey)
    return OPERATORS[field?.type as keyof typeof OPERATORS] || OPERATORS.text
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
        <Filter size={11} />
        Filter{rules.length > 0 ? ` (${rules.length})` : ""}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute left-0 top-full mt-1 z-50 w-96 bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-xl p-3"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-[var(--text)]">Filters</span>
                <button onClick={() => setOpen(false)} className="text-[var(--muted)] cursor-pointer"><X size={12} /></button>
              </div>

              <div className="space-y-2">
                {rules.map(rule => (
                  <div key={rule.id} className="flex items-center gap-1.5">
                    <select
                      value={rule.field}
                      onChange={e => updateRule(rule.id, { field: e.target.value, operator: getOperators(e.target.value)[0] })}
                      className="flex-1 px-2 py-1.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[10px] text-[var(--text)] cursor-pointer"
                    >
                      {fields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                    </select>
                    <select
                      value={rule.operator}
                      onChange={e => updateRule(rule.id, { operator: e.target.value })}
                      className="w-28 px-2 py-1.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[10px] text-[var(--text)] cursor-pointer"
                    >
                      {getOperators(rule.field).map(op => <option key={op} value={op}>{op}</option>)}
                    </select>
                    {!["is empty", "is not empty", "is set", "is not set", "is checked", "is not checked"].includes(rule.operator) && (
                      <input
                        value={rule.value}
                        onChange={e => updateRule(rule.id, { value: e.target.value })}
                        placeholder="Value..."
                        className="w-24 px-2 py-1.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[10px] text-[var(--text)]"
                      />
                    )}
                    <button onClick={() => removeRule(rule.id)} className="p-1 rounded hover:bg-red-500/10 text-[var(--muted)] hover:text-red-500 cursor-pointer">
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={addRule}
                className="w-full mt-2 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-dashed border-[var(--border)] text-[10px] font-medium text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition cursor-pointer"
              >
                <Plus size={10} /> Add filter
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
