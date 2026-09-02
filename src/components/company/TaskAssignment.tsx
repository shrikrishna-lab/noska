import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { UserPlus, X, Search, Loader2, Check, ChevronDown } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useCompany } from "../../contexts/CompanyContext"
import { getCompanyMembers, type OrganizationMember } from "../../lib/company"

interface TaskAssignmentProps {
  assigneeId: string | null
  onAssign: (userId: string | null) => void
}

export function TaskAssignment({ assigneeId, onAssign }: TaskAssignmentProps) {
  const { currentCompany } = useCompany()
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !currentCompany) return
    setLoading(true)
    getCompanyMembers(currentCompany.id)
      .then(setMembers)
      .catch(() => setMembers([]))
      .finally(() => setLoading(false))
  }, [open, currentCompany])

  const current = members.find(m => m.user_id === assigneeId)
  const filtered = members.filter(m =>
    m.user_profiles?.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.user_profiles?.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[var(--surface-2)] transition cursor-pointer"
      >
        {current ? (
          <>
            <div className="w-5 h-5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[7px] font-bold overflow-hidden">
              {current.user_profiles?.avatar_url ? (
                <img src={current.user_profiles.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                (current.user_profiles?.user_name || "?").slice(0, 2).toUpperCase()
              )}
            </div>
            <span className="text-[10px] text-[var(--text)]">{current.user_profiles?.user_name}</span>
          </>
        ) : (
          <>
            <UserPlus size={12} className="text-[var(--muted)]" />
            <span className="text-[10px] text-[var(--muted)]">Unassigned</span>
          </>
        )}
        <ChevronDown size={9} className="text-[var(--muted)]" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute left-0 top-full mt-1 z-50 w-56 bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-xl overflow-hidden"
            >
              <div className="p-2 border-b border-[var(--border)]/70">
                <div className="flex items-center gap-2 px-2 py-1 bg-[var(--surface-2)] rounded-lg">
                  <Search size={10} className="text-[var(--muted)]" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="flex-1 bg-transparent text-[10px] text-[var(--text)] focus:outline-none" autoFocus />
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto p-1">
                <button
                  onClick={() => { onAssign(null); setOpen(false) }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--surface-2)] transition text-left cursor-pointer"
                >
                  <X size={10} className="text-[var(--muted)]" />
                  <span className="text-[10px] text-[var(--muted)]">Unassigned</span>
                  {!assigneeId && <Check size={10} className="ml-auto text-[var(--accent)]" />}
                </button>
                {loading ? (
                  <div className="flex items-center justify-center py-3"><Loader2 size={12} className="animate-spin text-[var(--muted)]" /></div>
                ) : (
                  filtered.map(m => (
                    <button
                      key={m.user_id}
                      onClick={() => { onAssign(m.user_id); setOpen(false); setSearch("") }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--surface-2)] transition text-left cursor-pointer"
                    >
                      <div className="w-5 h-5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[7px] font-bold overflow-hidden">
                        {m.user_profiles?.avatar_url ? (
                          <img src={m.user_profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          (m.user_profiles?.user_name || "?").slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <span className="text-[10px] text-[var(--text)] truncate">{m.user_profiles?.user_name}</span>
                      {assigneeId === m.user_id && <Check size={10} className="ml-auto text-[var(--accent)]" />}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
