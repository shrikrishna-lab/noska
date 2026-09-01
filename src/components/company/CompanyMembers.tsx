import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { UserPlus, MoreHorizontal, Shield, Trash2, ChevronDown, Mail, Loader2, Search } from "lucide-react"
import { useCompany } from "../../contexts/CompanyContext"
import {
  removeCompanyMember,
  changeCompanyRole,
  inviteToCompany,
  type CompanyMember,
} from "../../lib/company"
import { isCompanyAdmin, canRemoveMember, COMPANY_ROLE_CONFIG, getRoleBadge } from "../../lib/companyAuth"

export function CompanyMembers() {
  const { currentCompany, currentMember, companyMembers, refreshMembers, refreshInvitations } = useCompany()
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<string>("Team Member")
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState("")
  const [actionMenu, setActionMenu] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [changingRole, setChangingRole] = useState<string | null>(null)

  if (!currentCompany || !currentMember) return null

  const filtered = companyMembers.filter(
    (m) =>
      m.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase()) ||
      m.user_id.toLowerCase().includes(search.toLowerCase())
  )

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteError("")
    try {
      await inviteToCompany(currentCompany.id, inviteEmail.trim(), inviteRole)
      setInviteEmail("")
      setShowInvite(false)
      refreshInvitations()
    } catch (e: unknown) {
      setInviteError(e instanceof Error ? e.message : "Failed to send invitation")
    } finally {
      setInviting(false)
    }
  }

  const handleRemove = async (userId: string) => {
    try {
      await removeCompanyMember(currentCompany.id, userId)
      setActionMenu(null)
      refreshMembers()
    } catch (e) {
      console.error("Failed to remove member:", e)
    }
  }

  const handleChangeRole = async (userId: string, newRole: string) => {
    setChangingRole(userId)
    try {
      await changeCompanyRole(currentCompany.id, userId, newRole)
      setActionMenu(null)
      refreshMembers()
    } catch (e) {
      console.error("Failed to change role:", e)
    } finally {
      setChangingRole(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-[12px] text-[var(--muted)]">
          {companyMembers.length} member{companyMembers.length !== 1 ? "s" : ""}
        </div>
        {isCompanyAdmin(currentMember, currentCompany) && (
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--noska-blue)] text-white rounded-lg text-[12px] font-medium hover:opacity-90 transition-opacity cursor-pointer"
          >
            <UserPlus size={12} />
            Invite
          </button>
        )}
      </div>

      {/* Invite Form */}
      <AnimatePresence>
        {showInvite && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl space-y-3">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@company.com"
                  className="flex-1 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--noska-blue)] transition-colors"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as typeof inviteRole)}
                  className="px-2 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[12px] text-[var(--text)] outline-none cursor-pointer"
                >
                  <option value="Team Member">Member</option>
                  <option value="Organization Admin">Admin</option>
                  <option value="Guest">Guest</option>
                </select>
              </div>
              {inviteError && (
                <p className="text-[11px] text-red-500">{inviteError}</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setShowInvite(false); setInviteError("") }}
                  className="px-3 py-1.5 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInvite}
                  disabled={!inviteEmail.trim() || inviting}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--noska-blue)] text-white rounded-lg text-[12px] font-medium hover:opacity-90 disabled:opacity-40 cursor-pointer"
                >
                  {inviting && <Loader2 size={11} className="animate-spin" />}
                  Send Invite
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      {companyMembers.length > 5 && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg">
          <Search size={12} className="text-[var(--muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members..."
            className="flex-1 bg-transparent text-[12px] text-[var(--text)] placeholder:text-[var(--muted)] outline-none"
          />
        </div>
      )}

      {/* Member List */}
      <div className="space-y-1">
        {filtered.length === 0 && (
          <div className="py-8 text-center text-[12px] text-[var(--muted)]">
            No members found
          </div>
        )}
        {filtered.map((member) => {
          const badge = getRoleBadge(member.job_title)
          const isSelf = member.user_id === localStorage.getItem("noska_user_id")
          const canAct = isCompanyAdmin(currentMember, currentCompany) && !isSelf

          return (
            <div
              key={member.user_id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--surface-2)] transition-colors group"
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[12px] font-medium text-[var(--text)] shrink-0 overflow-hidden">
                {member.avatar_url ? (
                  <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  (member.user_name || member.user_id).slice(0, 2).toUpperCase()
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium text-[var(--text)] truncate">
                  {member.user_name || "Unknown"}
                  {isSelf && <span className="text-[var(--muted)] ml-1">(you)</span>}
                </div>
                <div className="text-[10px] text-[var(--muted)] truncate">
                  {member.email || member.user_id}
                </div>
              </div>

              {/* Role */}
              <div className="relative">
                {canAct ? (
                  <button
                    onClick={() => setActionMenu(actionMenu === member.user_id ? null : member.user_id)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-[var(--hover)] transition-colors cursor-pointer"
                  >
                    <span className={`text-[11px] font-medium ${badge.color}`}>{badge.label}</span>
                    <ChevronDown size={10} className="text-[var(--muted)]" />
                  </button>
                ) : (
                  <span className={`text-[11px] font-medium px-2 py-1 ${badge.color}`}>{badge.label}</span>
                )}

                <AnimatePresence>
                  {actionMenu === member.user_id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute right-0 top-full mt-1 z-10 w-[140px] bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden"
                    >
                      {member.job_title !== "Organization Owner" && member.user_id !== currentCompany.created_by && (
                        <>
                          <div className="px-2 py-1 text-[10px] text-[var(--muted)] font-medium border-b border-[var(--border)]">
                            Change Role
                          </div>
                          {(["Organization Admin", "Team Member", "Guest"] as const).map((r) => (
                            r !== member.job_title && (
                              <button
                                key={r}
                                onClick={() => handleChangeRole(member.user_id, r)}
                                disabled={changingRole === member.user_id}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-[var(--text)] hover:bg-[var(--hover)] transition-colors cursor-pointer text-left"
                              >
                                {changingRole === member.user_id && <Loader2 size={10} className="animate-spin" />}
                                <span className={COMPANY_ROLE_CONFIG[r]?.color}>{COMPANY_ROLE_CONFIG[r]?.label}</span>
                              </button>
                            )
                          ))}
                          <div className="border-t border-[var(--border)]">
                            <button
                              onClick={() => handleRemove(member.user_id)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-red-500 hover:bg-red-500/5 transition-colors cursor-pointer text-left"
                            >
                              <Trash2 size={10} />
                              Remove
                            </button>
                          </div>
                        </>
                      )}
                      {(member.job_title === "Organization Owner" || member.user_id === currentCompany.created_by) && (
                        <div className="px-2.5 py-2 text-[10px] text-[var(--muted)]">
                          Company owners cannot be modified
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
