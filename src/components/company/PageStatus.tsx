import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, Check, ChevronDown, FileEdit, Eye, Archive, Send } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useCompany } from "../../contexts/CompanyContext"
import { writeAuditLog } from "../../lib/company"

const STATUSES = [
  { value: "draft", label: "Draft", icon: FileEdit, color: "text-gray-500 bg-gray-500/10 border-gray-500/20" },
  { value: "review", label: "In Review", icon: Eye, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  { value: "published", label: "Published", icon: Check, color: "text-green-500 bg-green-500/10 border-green-500/20" },
  { value: "archived", label: "Archived", icon: Archive, color: "text-red-500 bg-red-500/10 border-red-500/20" },
]

interface PageStatusProps {
  pageId: string
  status: string
  onStatusChange?: (status: string) => void
}

export function PageStatus({ pageId, status, onStatusChange }: PageStatusProps) {
  const { currentCompany, currentMember } = useCompany()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const current = STATUSES.find(s => s.value === status) || STATUSES[0]

  const handleChange = async (newStatus: string) => {
    setLoading(true)
    try {
      await supabase
        .from("pages" as any)
        .update({ status: newStatus } as any)
        .eq("id", pageId)
      if (currentMember) {
        await writeAuditLog(currentCompany!.id, currentMember.user_id, "status_change", "pages", { entity_id: pageId, from: status, to: newStatus })
      }
      onStatusChange?.(newStatus)
      setOpen(false)
    } catch {}
    finally { setLoading(false) }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition cursor-pointer ${current.color}`}
      >
        <current.icon size={10} />
        {current.label}
        <ChevronDown size={9} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              className="absolute left-0 top-full mt-1 z-50 w-44 bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-xl p-1"
            >
              {STATUSES.map(s => (
                <button
                  key={s.value}
                  onClick={() => handleChange(s.value)}
                  disabled={loading || s.value === status}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-[var(--surface-2)] transition text-left cursor-pointer disabled:opacity-50"
                >
                  <s.icon size={12} className={s.color.split(" ")[0]} />
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
