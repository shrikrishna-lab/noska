import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, ChevronDown, Check, Circle, Clock, CheckCircle, AlertCircle, XCircle } from "lucide-react"
import { supabase } from "../../lib/supabase"

const STATUSES = [
  { value: "todo", label: "To Do", icon: Circle, color: "text-gray-400" },
  { value: "in_progress", label: "In Progress", icon: Clock, color: "text-blue-500" },
  { value: "in_review", label: "In Review", icon: AlertCircle, color: "text-amber-500" },
  { value: "done", label: "Done", icon: CheckCircle, color: "text-green-500" },
  { value: "cancelled", label: "Cancelled", icon: XCircle, color: "text-red-400" },
]

interface TaskStatusProps {
  taskId: string
  status: string
  onStatusChange?: (status: string) => void
}

export function TaskStatus({ taskId, status, onStatusChange }: TaskStatusProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const current = STATUSES.find(s => s.value === status) || STATUSES[0]

  const handleChange = async (newStatus: string) => {
    setLoading(true)
    try {
      await supabase.from("tasks" as any).update({ status: newStatus } as any).eq("id", taskId)
      onStatusChange?.(newStatus)
      setOpen(false)
    } catch {}
    finally { setLoading(false) }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold hover:bg-[var(--surface-2)] transition cursor-pointer ${current.color}`}
      >
        <current.icon size={11} />
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
              {STATUSES.map(s => (
                <button
                  key={s.value}
                  onClick={() => handleChange(s.value)}
                  disabled={loading || s.value === status}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-[var(--surface-2)] transition text-left cursor-pointer disabled:opacity-50"
                >
                  <s.icon size={12} className={s.color} />
                  <span className="text-[11px] text-[var(--text)]">{s.label}</span>
                  {s.value === status && <Check size={10} className="ml-auto text-[var(--accent)]" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
