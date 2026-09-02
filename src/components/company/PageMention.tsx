import React, { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AtSign, X } from "lucide-react"
import { useCompany } from "../../contexts/CompanyContext"
import { getCompanyMembers, type OrganizationMember } from "../../lib/company"

interface PageMentionProps {
  onSelect: (mention: { userId: string; userName: string }) => void
}

export function PageMention({ onSelect }: PageMentionProps) {
  const { currentCompany } = useCompany()
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [query, setQuery] = useState("")
  const [show, setShow] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!currentCompany) return
    getCompanyMembers(currentCompany.id).then(setMembers).catch(() => {})
  }, [currentCompany])

  const filtered = members.filter(m =>
    m.user_profiles?.user_name?.toLowerCase().includes(query.toLowerCase()) ||
    m.user_profiles?.email?.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 6)

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShow(!show)}
        className="p-1 rounded hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)] transition cursor-pointer"
        title="Mention someone"
      >
        <AtSign size={14} />
      </button>

      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute left-0 top-full mt-1 z-50 w-64 bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-xl overflow-hidden"
          >
            <div className="p-2 border-b border-[var(--border)]/70">
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search people..."
                className="w-full px-2 py-1.5 bg-[var(--surface-2)] rounded-lg text-[11px] text-[var(--text)] focus:outline-none"
                autoFocus
              />
            </div>
            <div className="max-h-48 overflow-y-auto p-1">
              {filtered.map(m => (
                <button
                  key={m.user_id}
                  onClick={() => {
                    onSelect({ userId: m.user_id, userName: m.user_profiles?.user_name || "Unknown" })
                    setShow(false)
                    setQuery("")
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--surface-2)] transition cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[8px] font-bold overflow-hidden">
                    {m.user_profiles?.avatar_url ? (
                      <img src={m.user_profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (m.user_profiles?.user_name || "?").slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <span className="text-[11px] text-[var(--text)] truncate">{m.user_profiles?.user_name}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-[10px] text-[var(--muted)] py-3">No results</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
