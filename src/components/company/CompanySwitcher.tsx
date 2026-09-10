import React, { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Building2, ChevronDown, Plus, Settings, Check, Search, Sparkles, Users, LogOut } from "lucide-react"
import { useCompany } from "../../contexts/CompanyContext"
import { isCompanyAdmin } from "../../lib/companyAuth"
import { CreateCompanyModal } from "./CreateCompanyModal"
import { JoinCompanyModal } from "./JoinCompanyModal"

interface CompanySwitcherProps {
  onView?: (view: string, options?: Record<string, unknown>) => void
}

export function CompanySwitcher({ onView }: CompanySwitcherProps) {
  const { companies, currentCompany, currentMember, switchCompany, resignFromCompany, loading } = useCompany()
  const [open, setOpen] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [search, setSearch] = useState("")
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number; width: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const updateCoords = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setMenuCoords({
        top: rect.bottom + 6,
        left: rect.left,
        width: Math.max(rect.width, 270)
      })
    }
  }, [])

  useEffect(() => {
    if (open) {
      updateCoords()
      const handleScrollOrResize = () => updateCoords()
      window.addEventListener("scroll", handleScrollOrResize, true)
      window.addEventListener("resize", handleScrollOrResize)
      return () => {
        window.removeEventListener("scroll", handleScrollOrResize, true)
        window.removeEventListener("resize", handleScrollOrResize)
      }
    }
  }, [open, updateCoords])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelectCompany = async (companyId: string) => {
    await switchCompany(companyId)
    setOpen(false)
    setSearch("")
    onView?.("companyHome")
  }

  return (
    <>
      <div className="relative select-none w-full">
        {/* Main Switcher Trigger Pill */}
        <button
          ref={triggerRef}
          onClick={() => setOpen(!open)}
          className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition-all duration-150 cursor-pointer text-left border ${
            open
              ? "bg-black/[0.06] dark:bg-white/[0.08] border-black/[0.08] dark:border-white/[0.12] shadow-2xs"
              : "border-black/[0.04] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.045] dark:hover:bg-white/[0.06]"
          }`}
        >
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500/15 via-purple-500/15 to-blue-500/15 border border-indigo-500/25 flex items-center justify-center text-xs shrink-0 shadow-2xs">
            {currentCompany?.logo_url ? (
              <span className="text-xs">{currentCompany.logo_url}</span>
            ) : (
              <Building2 size={13} className="text-indigo-600 dark:text-indigo-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-neutral-800 dark:text-neutral-200 truncate leading-tight">
              {currentCompany?.name || (loading ? "Loading..." : "Join / Select Organization")}
            </div>
            <div className="text-[9.5px] text-neutral-400 dark:text-neutral-500 capitalize leading-tight mt-0.5 truncate">
              {currentCompany ? (currentMember?.job_title ? `${currentMember.job_title} · Organization` : "Company Workspace") : "No Active Company"}
            </div>
          </div>

          <ChevronDown
            size={12}
            className={`text-neutral-400 transition-transform duration-200 shrink-0 ${
              open ? "rotate-180 text-neutral-800 dark:text-neutral-200" : ""
            }`}
          />
        </button>

        {/* Portaled Floating Dropdown Menu */}
        {typeof document !== "undefined" &&
          createPortal(
            <AnimatePresence>
              {open && menuCoords && (
                <motion.div
                  ref={menuRef}
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ type: "spring", stiffness: 500, damping: 32 }}
                  style={{
                    position: "fixed",
                    top: menuCoords.top,
                    left: menuCoords.left,
                    width: menuCoords.width,
                    zIndex: 99999
                  }}
                  className="bg-white/95 dark:bg-[#161a23]/95 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-2xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.35)] overflow-hidden select-none"
                >
                  {/* Header Info */}
                  <div className="px-3.5 py-2.5 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between bg-black/[0.015] dark:bg-white/[0.02]">
                    <span className="text-[10.5px] font-bold tracking-wider text-neutral-400 uppercase">
                      Organizations
                    </span>
                    <button
                      onClick={() => {
                        setOpen(false)
                        setShowJoin(true)
                      }}
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Users size={11} />
                      <span>Browse All ({companies.length})</span>
                    </button>
                  </div>

                  {/* Search bar if companies > 2 */}
                  {companies.length > 2 && (
                    <div className="p-2 border-b border-black/[0.06] dark:border-white/[0.08]">
                      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-black/[0.03] dark:bg-white/[0.04] rounded-xl border border-black/[0.04] dark:border-white/[0.06]">
                        <Search size={12} className="text-neutral-400" />
                        <input
                          type="text"
                          placeholder="Search organizations..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="flex-1 bg-transparent text-xs text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 outline-none"
                          autoFocus
                        />
                      </div>
                    </div>
                  )}

                  {/* Company List */}
                  <div className="max-h-[240px] overflow-y-auto p-1.5 space-y-1 scrollbar-thin">
                    {filtered.length === 0 ? (
                      <div className="px-4 py-7 text-center space-y-2">
                        <div className="w-9 h-9 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center mx-auto text-neutral-400">
                          <Building2 size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">No organizations found</p>
                          <p className="text-[11px] text-neutral-400 mt-0.5">Create your workspace or browse directory</p>
                        </div>
                      </div>
                    ) : (
                      filtered.map((company) => {
                        const isCurrent = currentCompany?.id === company.id
                        return (
                          <button
                            key={company.id}
                            onClick={() => handleSelectCompany(company.id)}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all cursor-pointer text-left select-none ${
                              isCurrent
                                ? "bg-indigo-500/10 text-neutral-900 dark:text-white font-semibold border border-indigo-500/20 shadow-2xs"
                                : "hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-neutral-600 dark:text-neutral-300"
                            }`}
                          >
                            <div className="w-7 h-7 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-sm shrink-0">
                              {company.logo_url || "🏢"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                                {company.name}
                              </div>
                              <div className="text-[10px] text-neutral-400 truncate">
                                /{company.slug}
                              </div>
                            </div>
                            {isCurrent && (
                              <Check size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                            )}
                          </button>
                        )
                      })
                    )}
                  </div>

                  {/* Bottom Actions */}
                  <div className="border-t border-black/[0.06] dark:border-white/[0.08] p-1.5 bg-black/[0.015] dark:bg-white/[0.02] space-y-1">
                    <button
                      onClick={() => {
                        setShowJoin(true)
                        setOpen(false)
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300"
                    >
                      <Users size={13} className="text-neutral-400" />
                      <span>Join / Switch Organization</span>
                    </button>

                    {currentCompany && isCompanyAdmin(currentMember, currentCompany) && (
                      <button
                        onClick={() => {
                          setOpen(false)
                          onView?.("companySettings")
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer text-left text-xs font-medium text-neutral-600 dark:text-neutral-400"
                      >
                        <Settings size={13} className="text-neutral-400" />
                        <span>Company Settings</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setShowCreate(true)
                        setOpen(false)
                      }}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
                    >
                      <Plus size={13} strokeWidth={2.2} />
                      <span>Create Organization</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body
          )}
      </div>

      {showCreate && (
        <CreateCompanyModal onClose={() => setShowCreate(false)} />
      )}

      {showJoin && (
        <JoinCompanyModal
          onClose={() => setShowJoin(false)}
          onJoined={() => onView?.("companyHome")}
        />
      )}
    </>
  )
}
