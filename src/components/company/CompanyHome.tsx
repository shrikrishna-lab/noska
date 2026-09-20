import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Building2, Users, FileText, Clock, Star, Plus, ArrowRight,
  Settings, Shield, Loader2, Sparkles, FolderKanban, Database,
  ArrowUpRight, Activity, CheckCircle2, UserPlus, Key, ChevronRight
} from "lucide-react"
import { useCompany } from "../../contexts/CompanyContext"
import { getCompanyAuditLogs, type CompanyAuditLog } from "../../lib/company"
import { isCompanyAdmin } from "../../lib/companyAuth"
import { FinanceWorkflowHub } from "../ui/WorkflowWidgets"

interface CompanyHomeProps {
  onViewSelect: (view: string, options?: Record<string, unknown>) => void
}

export function CompanyHome({ onViewSelect }: CompanyHomeProps) {
  const { currentCompany, currentMember, companyMembers, companyTeams, createCompany } = useCompany()
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
      <div className="flex-1 flex items-center justify-center p-8 select-none">
        <div className="w-full max-w-[420px] text-center p-8 rounded-3xl border border-[var(--border)] bg-[var(--surface-2)]/60 backdrop-blur-xl shadow-2xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto text-2xl shadow-xs text-indigo-500">
            🏢
          </div>
          <h2 className="text-lg font-bold text-[var(--text)] tracking-tight">No Organization Selected</h2>
          <p className="text-xs text-[var(--muted)] leading-relaxed">
            Create or select a company workspace to manage teams, corporate documents, and audit logs.
          </p>
          <button
            onClick={() => createCompany("Noska Labs", "noska-labs", "Enterprise intelligence and workspace collaboration")}
            className="w-full py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-deep)] text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
          >
            Launch Noska Labs Workspace
          </button>
        </div>
      </div>
    )
  }

  const stats = [
    { label: "Active Members", value: companyMembers.length || 1, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" },
    { label: "Teams & Hubs", value: companyTeams.length || 1, icon: Building2, color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/20" },
    { label: "Knowledge Docs", value: 12, icon: FileText, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" },
    { label: "Security & Audit", value: "Verified", icon: Shield, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" },
  ]

  const quickLaunch = [
    { id: "teams", label: "Teams & Departments", desc: "Collaborate by squad and division", icon: Building2, color: "from-blue-500/20 to-indigo-500/20 text-blue-500" },
    { id: "members", label: "Directory & Roles", desc: "Manage members, admins & guests", icon: Users, color: "from-purple-500/20 to-pink-500/20 text-purple-500" },
    { id: "projects", label: "Projects & Roadmaps", desc: "Cross-functional initiatives", icon: FolderKanban, color: "from-amber-500/20 to-orange-500/20 text-amber-500" },
    { id: "security", label: "Security & Audit Logs", desc: "Enterprise compliance & access", icon: Shield, color: "from-emerald-500/20 to-teal-500/20 text-emerald-500" },
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
    "company.created": "Created the organization workspace",
    "member.joined": "Joined the company organization",
    "member.invited": "Sent invite to team collaborator",
    "member.removed": "Removed member access",
    "role.changed": "Updated permission role",
    "team.created": "Created department team",
    "ownership.transferred": "Transferred organization ownership",
    "company.deleted": "Deleted company",
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--bg)] select-none">
      <div className="max-w-[880px] mx-auto px-8 py-10 space-y-8">
        {/* Header Hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="p-6 rounded-3xl border border-[var(--border)] bg-[var(--surface-2)]/70 backdrop-blur-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-blue-500/20 border border-indigo-500/30 flex items-center justify-center text-3xl shrink-0 shadow-xs">
              {currentCompany.logo_url || "🏢"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[var(--text)] tracking-tight leading-snug">
                  {currentCompany.name}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  Active
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-md leading-relaxed">
                {currentCompany.description || "Enterprise workspace for company projects, teams, and internal documentation."}
              </p>
              <div className="flex items-center gap-2.5 mt-2.5 text-[11px] text-[var(--muted)]">
                <span className="font-mono bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-md">/{currentCompany.slug}</span>
                <span>·</span>
                <span className="capitalize">{currentMember?.job_title || "Team Member"}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onViewSelect("invitations")}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--surface-3)] hover:bg-[var(--surface-4)] text-xs font-semibold text-[var(--text)] border border-[var(--border)] shadow-2xs transition active:scale-95 cursor-pointer"
            >
              <UserPlus size={13} />
              <span>Invite</span>
            </button>
            {isCompanyAdmin(currentMember, currentCompany) && (
              <button
                onClick={() => onViewSelect("settings")}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-deep)] text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Settings size={13} />
                <span>Settings</span>
              </button>
            )}
          </div>
        </motion.div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.04 }}
              className="p-4 rounded-2xl bg-[var(--surface-2)]/60 border border-[var(--border)] shadow-2xs"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-[var(--muted)]">{stat.label}</span>
                <div className={`w-6 h-6 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <stat.icon size={13} className={stat.color} />
                </div>
              </div>
              <div className="text-xl font-bold text-[var(--text)] tracking-tight">{stat.value}</div>
            </motion.div>
          ))}
        </div>

        {/* Quick Launch Hub */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              Workspace Hubs
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickLaunch.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => onViewSelect(item.id)}
                  className="flex items-center gap-3.5 p-4 rounded-2xl bg-[var(--surface-2)]/60 hover:bg-[var(--surface-2)] border border-[var(--border)] text-left transition-all hover:shadow-sm cursor-pointer group"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shrink-0 border border-black/5 dark:border-white/10 shadow-2xs`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors flex items-center gap-1">
                      <span>{item.label}</span>
                      <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-[var(--accent)]" />
                    </div>
                    <div className="text-[11px] text-[var(--muted)] mt-0.5 truncate">{item.desc}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Teams Showcase */}
        {companyTeams.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                Departments & Teams
              </h3>
              <button
                onClick={() => onViewSelect("teams")}
                className="text-xs font-semibold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View all ({companyTeams.length})</span>
                <ChevronRight size={12} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {companyTeams.slice(0, 6).map((team) => (
                <button
                  key={team.id}
                  onClick={() => onViewSelect("teamHome", { teamId: team.id })}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-[var(--surface-2)]/60 hover:bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-all cursor-pointer text-left"
                >
                  <div className="w-9 h-9 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-base shrink-0 shadow-2xs">
                    {team.icon || "👥"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-[var(--text)] truncate">{team.name}</div>
                    <div className="text-[10.5px] text-[var(--muted)] mt-0.5">{team.member_count ?? 1} members</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Financial Operations & Cash Flow Hub (Owner Customizable) */}
        <FinanceWorkflowHub
          companyId={currentCompany.id}
          companyName={currentCompany.name}
          isOwner={isCompanyAdmin(currentMember, currentCompany)}
          currentUserId={currentMember?.user_id}
        />

        {/* Live Organization Audit & Activity */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
              <Activity size={13} />
              <span>Recent Organization Activity</span>
            </h3>
            <button
              onClick={() => onViewSelect("audit")}
              className="text-xs font-semibold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Full Audit Log</span>
              <ChevronRight size={12} />
            </button>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/40 divide-y divide-[var(--border)] overflow-hidden">
            {loadingActivity ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={16} className="animate-spin text-[var(--muted)]" />
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--muted)]">
                Organization initialized. No recent audit events recorded.
              </div>
            ) : (
              recentActivity.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3.5 hover:bg-[var(--surface-2)]/80 transition-colors text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 shadow-2xs" />
                    <span className="font-medium text-[var(--text)] truncate">
                      {actionMap[log.action] || log.action}
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--muted)] shrink-0 pl-3">
                    {formatTimeAgo(log.created_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
