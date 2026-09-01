import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mail, Clock, X, RefreshCw, Loader2, Search, CheckCircle, Ban, AlertCircle } from "lucide-react"
import { useCompany } from "../../contexts/CompanyContext"
import {
  revokeInvitation,
  inviteToCompany,
  type CompanyInvitation,
} from "../../lib/company"

export function CompanyInvitations() {
  const { currentCompany, companyInvitations, refreshInvitations } = useCompany()
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<string>("Team Member")
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState("")
  const [search, setSearch] = useState("")

  if (!currentCompany) return null

  const filtered = companyInvitations.filter(
    (inv) =>
      inv.email.toLowerCase().includes(search.toLowerCase())
  )

  const pending = filtered.filter((inv) => inv.status === "pending")
  const others = filtered.filter((inv) => inv.status !== "pending")

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

  const handleRevoke = async (invitationId: string) => {
    try {
      await revokeInvitation(invitationId)
      refreshInvitations()
    } catch (e) {
      console.error("Failed to revoke invitation:", e)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getTimeLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now()
    if (diff < 0) return "Expired"
    const days = Math.floor(diff / 86400000)
    if (days > 0) return `${days}d left`
    const hours = Math.floor(diff / 3600000)
    return `${hours}h left`
  }

  const statusConfig: Record<string, { icon: React.FC<{ size: number; className?: string }>; color: string; label: string }> = {
    pending: { icon: Clock, color: "text-yellow-500", label: "Pending" },
    accepted: { icon: CheckCircle, color: "text-green-500", label: "Accepted" },
    expired: { icon: AlertCircle, color: "text-[var(--muted)]", label: "Expired" },
    revoked: { icon: Ban, color: "text-red-500", label: "Revoked" },
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-[12px] text-[var(--muted)]">
          {pending.length} pending invitation{pending.length !== 1 ? "s" : ""}
        </div>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--noska-blue)] text-white rounded-lg text-[12px] font-medium hover:opacity-90 transition-opacity cursor-pointer"
        >
          <Mail size={12} />
          Invite
        </button>
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
      {companyInvitations.length > 5 && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg">
          <Search size={12} className="text-[var(--muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invitations..."
            className="flex-1 bg-transparent text-[12px] text-[var(--text)] placeholder:text-[var(--muted)] outline-none"
          />
        </div>
      )}

      {/* Pending Invitations */}
      {pending.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-2 px-1">
            Pending
          </div>
          <div className="space-y-0.5">
            {pending.map((inv) => {
              const config = statusConfig[inv.status]
              const Icon = config.icon
              return (
                <div
                  key={inv.id}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--surface-2)] transition-colors group"
                >
                  <div className="w-7 h-7 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center shrink-0">
                    <Mail size={12} className="text-[var(--muted)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-[var(--text)] truncate">{inv.email}</div>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--muted)]">
                      <span className="capitalize">{inv.job_title}</span>
                      <span>·</span>
                      <span>{getTimeLeft(inv.expires_at)}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-medium ${config.color} shrink-0`}>{config.label}</span>
                  <button
                    onClick={() => handleRevoke(inv.id)}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded hover:bg-red-500/10 flex items-center justify-center text-[var(--muted)] hover:text-red-500 transition-all cursor-pointer shrink-0"
                    title="Revoke invitation"
                  >
                    <X size={11} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Other Invitations (accepted, expired, revoked) */}
      {others.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-2 px-1">
            History
          </div>
          <div className="space-y-0.5">
            {others.map((inv) => {
              const config = statusConfig[inv.status]
              const Icon = config.icon
              return (
                <div
                  key={inv.id}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl opacity-60"
                >
                  <Icon size={12} className={config.color} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-[var(--text)] truncate">{inv.email}</div>
                    <div className="text-[10px] text-[var(--muted)]">
                      {config.label} · {formatDate(inv.accepted_at || inv.created_at)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {companyInvitations.length === 0 && (
        <div className="py-8 text-center text-[12px] text-[var(--muted)]">
          No invitations yet
        </div>
      )}
    </div>
  )
}
