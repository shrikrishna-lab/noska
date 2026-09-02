import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Clock, Calendar, Loader2, X, Check, Bell } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useCompany } from "../../contexts/CompanyContext"
import { writeAuditLog } from "../../lib/company"

interface PageSchedulerProps {
  pageId: string
  scheduledAt?: string | null
  onScheduled?: (date: string | null) => void
  size?: "sm" | "md"
}

export function PageScheduler({ pageId, scheduledAt, onScheduled, size = "md" }: PageSchedulerProps) {
  const { currentCompany, currentMember } = useCompany()
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(scheduledAt ? new Date(scheduledAt).toISOString().slice(0, 16) : "")
  const [loading, setLoading] = useState(false)

  const handleSchedule = async () => {
    setLoading(true)
    try {
      const scheduledDate = date ? new Date(date).toISOString() : null
      await supabase
        .from("pages" as any)
        .update({ scheduled_at: scheduledDate } as any)
        .eq("id", pageId)

      if (currentMember) {
        await writeAuditLog(
          currentCompany!.id,
          currentMember.user_id,
          scheduledDate ? "schedule" : "unschedule",
          "pages",
          { entity_id: pageId, scheduled_at: scheduledDate }
        )
      }

      onScheduled?.(scheduledDate)
      setOpen(false)
    } catch {}
    finally { setLoading(false) }
  }

  const btnSize = size === "sm" ? "w-7 h-7" : "w-8 h-8"
  const iconSize = size === "sm" ? 12 : 14

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`${btnSize} rounded-lg flex items-center justify-center transition cursor-pointer ${
          scheduledAt
            ? "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
            : "hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)]"
        }`}
        title={scheduledAt ? `Scheduled for ${new Date(scheduledAt).toLocaleString()}` : "Schedule publish"}
      >
        <Clock size={iconSize} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[170]"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              className="absolute right-0 top-full mt-1 z-[171] w-64 bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-xl p-3"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[12px] font-bold text-[var(--text)]">Schedule</h4>
                <button onClick={() => setOpen(false)} className="text-[var(--muted)] cursor-pointer">
                  <X size={12} />
                </button>
              </div>

              <input
                type="datetime-local"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-2 py-1.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[11px] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50 mb-3"
              />

              {scheduledAt && (
                <p className="text-[10px] text-[var(--muted)] mb-2">
                  Currently scheduled: {new Date(scheduledAt).toLocaleString()}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleSchedule}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-[10px] font-semibold hover:bg-[var(--accent-deep)] transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                  {scheduledAt ? "Update" : "Schedule"}
                </button>
                {scheduledAt && (
                  <button
                    onClick={() => { setDate(""); handleSchedule() }}
                    className="px-3 py-1.5 rounded-lg bg-[var(--surface-2)] text-[var(--muted)] text-[10px] font-semibold hover:bg-[var(--surface-3)] transition cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
