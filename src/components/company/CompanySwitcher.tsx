import React, { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Building2, ChevronDown, Plus, Settings, Check, Search, Sparkles } from "lucide-react"
import { useCompany } from "../../contexts/CompanyContext"
import { isCompanyAdmin } from "../../lib/companyAuth"
import { CreateCompanyModal } from "./CreateCompanyModal"

interface CompanySwitcherProps {
  onView?: (view: string, options?: Record<string, unknown>) => void
}

export function CompanySwitcher({ onView }: CompanySwitcherProps) {
  const { companies, currentCompany, currentMember, switchCompany, loading } = useCompany()
  const [open, setOpen] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (loading) return null

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelectCompany = async (companyId: string) => {
    await switchCompany(companyId)
    setOpen(false)
    setSearch("")
    onView?.("companyHome")
  }

  return (
    <>
      <div ref={ref} className="relative select-none">
        <button
          onClick={() => setOpen(!open)}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-2xl transition-all duration-150 cursor-pointer text-left border ${
            open
              ? "bg-[var(--surface-2)] border-[var(--border)] shadow-xs"
              : "border-transparent hover:bg-[var(--hover)] hover:border-[var(--border)]"
          }`}
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/15 to-purple-500/15 border border-indigo-500/25 flex items-center justify-center text-base shrink-0 shadow-2xs">
            {currentCompany?.logo_url || "🏢"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-[var(--text)] truncate leading-tight">
              {currentCompany?.name || "Select Company"}
            </div>
            {currentMember ? (
              <div className="text-[10px] text-[var(--muted)] capitalize leading-tight mt-0.5 truncate">
                {currentMember.job_title} · Organization
              </div>
            ) : (
              <div className="text-[10px] text-[var(--muted)] truncate">Company Workspace</div>
            )}
          </div>
          <ChevronDown size={13} className={`text-[var(--muted)] transition-transform duration-200 shrink-0 ${open ? "rotate-180 text-[var(--text)]" : ""}`} />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.96, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 4 }}
              transition={{ type: "spring", stiffness: 450, damping: 30 }}
              className="absolute top-full left-0 right-0 mt-2 z-50 bg-[var(--surface)]/95 dark:bg-[#161a23]/95 backdrop-blur-2xl border border-[var(--border)]/80 rounded-2xl shadow-2xl overflow-hidden min-w-[240px]"
            >
              {/* Search if multiple companies */}
              {companies.length > 3 && (
                <div className="p-2 border-b border-[var(--border)]/70">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-black/[0.03] dark:bg-white/[0.04] rounded-xl border border-black/[0.04] dark:border-white/[0.04]">
                    <Search size={13} className="text-[var(--muted)]" />
                    <input
                      type="text"
                      placeholder="Search organizations..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="flex-1 bg-transparent text-xs text-[var(--text)] placeholder:text-[var(--muted)] outline-none"
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {/* Company list */}
              <div className="max-h-[240px] overflow-y-auto p-1.5 space-y-1">
                {filtered.length === 0 && (
                  <div className="px-3 py-6 text-center text-xs text-[var(--muted)]">
                    No organizations found
                  </div>
                )}
                {filtered.map((company) => {
                  const isCurrent = currentCompany?.id === company.id
                  return (
                    <button
                      key={company.id}
                      onClick={() => handleSelectCompany(company.id)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all cursor-pointer text-left ${
                        isCurrent
                          ? "bg-[var(--accent)]/10 text-[var(--text)] font-semibold border border-[var(--accent)]/20 shadow-xs"
                          : "hover:bg-[var(--hover)] text-[var(--secondary)] hover:text-[var(--text)]"
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-sm shrink-0">
                        {company.logo_url || "🏢"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-[var(--text)] truncate">
                          {company.name}
                        </div>
                        <div className="text-[10px] text-[var(--muted)] truncate">
                          /{company.slug}
                        </div>
                      </div>
                      {isCurrent && (
                        <Check size={13} className="text-[var(--accent)] shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Actions */}
              <div className="border-t border-[var(--border)]/70 p-1.5 bg-[var(--surface-2)]/30 space-y-0.5">
                {currentCompany && isCompanyAdmin(currentMember, currentCompany) && (
                  <button
                    onClick={() => {
                      setOpen(false)
                      onView?.("companySettings")
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-[var(--hover)] transition-colors cursor-pointer text-left text-xs font-medium text-[var(--secondary)] hover:text-[var(--text)]"
                  >
                    <Settings size={13} className="text-[var(--muted)]" />
                    <span>Company Settings</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowCreate(true)
                    setOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-[var(--hover)] transition-colors cursor-pointer text-left text-xs font-semibold text-[var(--accent)]"
                >
                  <Plus size={13} />
                  <span>Create Organization</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showCreate && (
        <CreateCompanyModal onClose={() => setShowCreate(false)} />
      )}
    </>
  )
}
