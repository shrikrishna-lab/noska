import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Building2, Users, FileText, Clock, Star, Plus, ArrowRight, Settings, Shield, Loader2 } from "lucide-react"
import { useCompany } from "../../contexts/CompanyContext"
import { getCompanyAuditLogs, type CompanyAuditLog } from "../../lib/company"
import { isCompanyAdmin } from "../../lib/companyAuth"

interface CompanyHomeProps {
  onViewSelect: (view: string, options?: Record<string, unknown>) => void
}

export function CompanyHome({ onViewSelect }: CompanyHomeProps) {
  const { currentCompany, currentMember, companyMembers, companyTeams } = useCompany()
  const [recentActivity, setRecentActivity] = useState<CompanyAuditLog[]>([])
  const [loadingActivity, setLoadingActivity] = useState(true)

  useEffect(() => {
    if (!currentCompany) return
    setLoadingActivity(true)
    getCompanyAuditLogs(currentCompany.id, 10)
      .then(setRecentActivity)
      .catch(() => setRecentActivity([]))
      .finally(() => setLoadingActivity(false))
  }, [currentCompany])

  if (!currentCompany) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-[320px]">
          <div className="w-16 h-16 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center mx-auto mb-4 text-3xl">
            🏢
          </div>
          <h2 className="text-[16px] font-semibold text-[var(--text)] mb-1">No Company Selected</h2>
          <p className="text-[12px] text-[var(--muted)] mb-4">
            Create a company or switch to one from the sidebar.
          </p>
        </div>
      </div>
    )
  }

  const stats = [
    { label: "Members", value: companyMembers.length, icon: Users, color: "text-blue-500" },
    { label: "Teams", value: companyTeams.length, icon: Building2, color: "text-purple-500" },
  ]

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const actionMap: Record<string, string> = {
    "company.created": "Created the company",
    "member.joined": "Joined the company",
    "member.invited": "Invited a member",
    "member.removed": "Removed a member",
    "role.changed": "Changed a role",
    "team.created": "Created a team",
    "ownership.transferred": "Transferred ownership",
    "company.deleted": "Deleted the company",
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[720px] mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-4 mb-8"
        >
          <div className="w-14 h-14 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-3xl shrink-0">
            {currentCompany.logo_url || "🏢"}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[22px] font-bold text-[var(--text)] leading-tight">{currentCompany.name}</h1>
            {currentCompany.description && (
              <p className="text-[13px] text-[var(--text-secondary)] mt-1">{currentCompany.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-[11px] text-[var(--muted)]">
              <span>/{currentCompany.slug}</span>
              {currentMember && (
                <span className="px-1.5 py-0.5 bg-[var(--surface-2)] rounded text-[var(--text-secondary)] capitalize">
                  {currentMember.job_title}
                </span>
              )}
            </div>
          </div>
          {isCompanyAdmin(currentMember, currentCompany) && (
            <button
              onClick={() => onViewSelect("companySettings")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[12px] text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition-colors cursor-pointer"
            >
              <Settings size={13} />
              Settings
            </button>
          )}
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]"
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon size={14} className={stat.color} />
                <span className="text-[11px] font-medium text-[var(--muted)]">{stat.label}</span>
              </div>
              <div className="text-[20px] font-bold text-[var(--text)]">{stat.value}</div>
            </motion.div>
          ))}
        </div>

        {/* Teams */}
        {companyTeams.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-semibold text-[var(--text)]">Teams</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {companyTeams.map((team) => (
                <button
                  key={team.id}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] hover:bg-[var(--hover)] transition-colors cursor-pointer text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-sm shrink-0">
                    {team.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-[var(--text)] truncate">{team.name}</div>
                    <div className="text-[10px] text-[var(--muted)]">{team.member_count ?? 0} members</div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3 className="text-[13px] font-semibold text-[var(--text)] mb-3">Recent Activity</h3>
          {loadingActivity ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={16} className="animate-spin text-[var(--muted)]" />
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="py-8 text-center text-[12px] text-[var(--muted)]">
              No activity yet
            </div>
          ) : (
            <div className="space-y-1">
              {recentActivity.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--noska-blue)] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[12px] text-[var(--text)]">
                      {actionMap[log.action] || log.action}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--muted)] shrink-0">
                    {formatTimeAgo(log.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
