import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Building2, Plus, Check, Search, X, ArrowRight, Sparkles, Key, Users } from "lucide-react"
import { useCompany, OFFICIAL_NOSKA_COMPANY } from "../../contexts/CompanyContext"
import { CreateCompanyModal } from "./CreateCompanyModal"

interface JoinCompanyModalProps {
  onClose: () => void
  onJoined?: (companyId: string) => void
}

export function JoinCompanyModal({ onClose, onJoined }: JoinCompanyModalProps) {
  const { companies, currentCompany, switchCompany } = useCompany()
  const [search, setSearch] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [activeTab, setActiveTab] = useState<"directory" | "code">("directory")
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [codeError, setCodeError] = useState("")

  const filtered = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  )

  const handleJoin = async (companyId: string) => {
    setJoiningId(companyId)
    await switchCompany(companyId)
    setTimeout(() => {
      onJoined?.(companyId)
      onClose()
    }, 400)
  }

  const handleJoinByCode = async () => {
    if (!inviteCode.trim()) return
    setCodeError("")
    const code = inviteCode.trim().toLowerCase()

    // Match against slug or ID
    const matched = companies.find(
      (c) => c.slug.toLowerCase() === code || c.id.toLowerCase() === code
    )

    if (matched) {
      await handleJoin(matched.id)
    } else {
      setCodeError("Invalid invitation code or organization slug. Please verify and try again.")
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/45 dark:bg-black/65 backdrop-blur-md p-4 select-none"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 8 }}
          transition={{ type: "spring", stiffness: 450, damping: 32 }}
          className="w-full max-w-[500px] bg-white/95 dark:bg-[#161a23]/95 backdrop-blur-3xl border border-black/10 dark:border-white/10 rounded-3xl shadow-[0_30px_70px_-15px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-blue-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
                <Building2 size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white tracking-tight">
                  Join Organization
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Select an organization workspace or create your own
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-black/[0.05] dark:hover:bg-white/[0.08] flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          {/* Sub tabs */}
          <div className="px-6 pt-3 pb-1 flex items-center gap-2 border-b border-black/[0.04] dark:border-white/[0.04]">
            <button
              onClick={() => setActiveTab("directory")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === "directory"
                  ? "bg-black/[0.06] dark:bg-white/[0.08] text-neutral-900 dark:text-white"
                  : "text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              Directory ({companies.length})
            </button>
            <button
              onClick={() => setActiveTab("code")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === "code"
                  ? "bg-black/[0.06] dark:bg-white/[0.08] text-neutral-900 dark:text-white"
                  : "text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              Enter Invite Code
            </button>
          </div>

          {/* Body */}
          {activeTab === "directory" ? (
            <div className="p-6 space-y-4">
              {/* Search */}
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-black/[0.03] dark:bg-white/[0.04] rounded-xl border border-black/[0.08] dark:border-white/[0.08] focus-within:border-indigo-500 dark:focus-within:border-indigo-400 transition-all shadow-2xs">
                <Search size={14} className="text-neutral-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search organizations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 outline-none"
                />
              </div>

              {/* Companies List */}
              <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {filtered.map((company) => {
                  const isCurrent = currentCompany?.id === company.id
                  const isNoskaHub = company.id === OFFICIAL_NOSKA_COMPANY.id
                  const isJoining = joiningId === company.id

                  return (
                    <div
                      key={company.id}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                        isCurrent
                          ? "bg-indigo-500/10 border-indigo-500/30 shadow-2xs"
                          : "bg-black/[0.015] dark:bg-white/[0.02] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] border-black/[0.06] dark:border-white/[0.08]"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-3">
                        <div className="w-10 h-10 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-center text-lg shrink-0 shadow-2xs">
                          {company.logo_url || "🏢"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                              {company.name}
                            </span>
                            {isNoskaHub && (
                              <span className="text-[9.5px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-500/15 px-1.5 py-0.5 rounded-md border border-indigo-500/20">
                                Official
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5 max-w-[240px]">
                            {company.description || `/${company.slug}`}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleJoin(company.id)}
                        disabled={isCurrent || isJoining}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                          isCurrent
                            ? "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 cursor-default"
                            : "bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-neutral-900 shadow-2xs"
                        }`}
                      >
                        {isCurrent ? (
                          <>
                            <Check size={12} strokeWidth={2.5} />
                            <span>Active</span>
                          </>
                        ) : isJoining ? (
                          <span>Joining...</span>
                        ) : (
                          <>
                            <span>Join</span>
                            <ArrowRight size={12} />
                          </>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Organization Slug or Invite Code
                </label>
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-black/[0.03] dark:bg-white/[0.04] rounded-xl border border-black/[0.08] dark:border-white/[0.08] focus-within:border-indigo-500 dark:focus-within:border-indigo-400 transition-all shadow-2xs outline-none">
                  <Key size={14} className="text-neutral-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="e.g. noska-learning-hub or code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className="flex-1 bg-transparent text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 outline-none border-none ring-0 focus:ring-0 focus:outline-none focus-visible:outline-none"
                    style={{ boxShadow: "none", outline: "none" }}
                    autoFocus
                  />
                </div>
              </div>

              {codeError && (
                <p className="text-xs font-medium text-rose-500 bg-rose-500/10 border border-rose-500/20 px-3.5 py-2 rounded-xl">
                  {codeError}
                </p>
              )}

              <button
                onClick={handleJoinByCode}
                disabled={!inviteCode.trim()}
                className="w-full py-2.5 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-neutral-900 rounded-xl text-xs font-semibold shadow-xs disabled:opacity-40 transition-all active:scale-95 cursor-pointer"
              >
                Join Organization by Code
              </button>
            </div>
          )}

          {/* Footer with Create Company */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-black/[0.06] dark:border-white/[0.08] bg-black/[0.015] dark:bg-white/[0.02]">
            <span className="text-xs text-neutral-400">Want to start your own?</span>
            <button
              onClick={() => {
                setShowCreate(true)
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs"
            >
              <Plus size={13} strokeWidth={2.2} />
              <span>Create New Company</span>
            </button>
          </div>
        </motion.div>
      </motion.div>

      {showCreate && (
        <CreateCompanyModal
          onClose={() => {
            setShowCreate(false)
            onClose()
          }}
        />
      )}
    </>
  )
}
