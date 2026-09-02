import React, { useState, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Building2, Users, FileText, Settings, Shield, Clock, ArrowLeft,
  Plus, Search, Loader2, Trash2, Edit2, Mail, Check, ChevronDown,
  BarChart3, Eye, Lock, Globe, UserPlus, X, FolderKanban, Database,
  Home, Briefcase, Activity, ChevronRight, Star, MoreHorizontal,
  Crown, ShieldCheck, UserMinus, Send, RotateCcw, Calendar,
  Hash, LayoutGrid, List, ArrowUpRight, Sparkles, Command, CheckSquare, Key, Webhook, FileWarning
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useCompany } from "../../contexts/CompanyContext"
import {
  getCompanyMembers, getCompanyTeams, getCompanyInvitations, getCompanyAuditLogs,
  inviteToCompany, removeCompanyMember, changeCompanyRole,
  createCompanyTeam, deleteCompanyTeam, updateCompanyTeam,
  getCompanyTeamMembers, addCompanyTeamMember, removeCompanyTeamMember,
  revokeInvitation, updateCompany, deleteCompany,
  getOrgPages, getOrgProjects, createOrgProject, deleteOrgProject,
  getOrgDatabases, searchCompany, writeAuditLog,
  type OrganizationMember, type OrgTeam, type OrgTeamMember,
  type OrganizationInvitation, type AuditLog, type OrgPage, type OrgProject
} from "../../lib/company"
import {
  isCompanyAdmin, isCompanyOwner, canDeleteCompany,
  COMPANY_ROLE_CONFIG, getRoleBadge
} from "../../lib/companyAuth"
import { CompanyCommandPalette } from "./CompanyCommandPalette"
import { CompanyNotificationBell } from "./CompanyNotifications"
import { CompanyPageCreator } from "./CompanyPageCreator"
import { CompanyMemberProfile } from "./CompanyMemberProfile"
import { CompanyBreadcrumb } from "./CompanyBreadcrumb"
import { CompanyPageTree } from "./CompanyPageTree"
import { CompanyFavorites, useFavorites } from "./CompanyFavorites"
import { CompanyTrash } from "./CompanyTrash"
import { TeamSettings } from "./TeamSettings"
import { CompanyShortcutsPanel } from "./CompanyShortcutsPanel"
import { CompanyActivityFeed } from "./CompanyActivityFeed"
import { QuickSwitcher } from "./QuickSwitcher"
import { UsageAnalytics } from "./UsageAnalytics"
import { SecuritySettings } from "./SecuritySettings"
import { APIKeyManager } from "./APIKeyManager"
import { WebhookManager } from "./WebhookManager"
import { ComplianceLog } from "./ComplianceAndUtility"
import { DataExport } from "./ComplianceAndUtility"
import { TeamDashboard } from "./TeamDashboard"

// ─── Types ──────────────────────────────────────────────────────────────────

type CompanyView =
  | "dashboard" | "myWork" | "updates"
  | "pages" | "projects" | "databases"
  | "teamHome" | "teams"
  | "members" | "tasks"
  | "invitations" | "audit" | "settings" | "analytics" | "security" | "compliance"

interface CompanyWorkspaceProps {
  onBack: () => void
}

interface TeamWithMembers extends OrgTeam {
  members?: OrgTeamMember[]
  memberCount?: number
}

// ─── Sidebar Section Component ──────────────────────────────────────────────

function SidebarSection({ title, children, defaultExpanded = true }: {
  title: string
  children: React.ReactNode
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer select-none"
      >
        <span>{title}</span>
        <ChevronRight size={11} className={`transition-transform duration-200 ${expanded ? "rotate-90 text-[var(--text)]" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="overflow-hidden space-y-0.5 mt-0.5 px-1"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Sidebar Nav Item ───────────────────────────────────────────────────────

function SidebarNavItem({ icon: Icon, label, active, onClick, badge, compact }: {
  icon: any
  label: string
  active?: boolean
  onClick: () => void
  badge?: string | number
  compact?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`relative w-full flex items-center gap-2.5 ${compact ? "px-3 py-1.5" : "px-3 py-2"} rounded-xl text-xs font-semibold select-none cursor-pointer transition-all duration-150 text-left group z-10 ${
        active
          ? "text-[var(--text)] font-bold shadow-2xs"
          : "text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--hover)]"
      }`}
    >
      {active && (
        <motion.div
          layoutId="companySidebarActive"
          className="absolute inset-0 rounded-xl bg-[var(--surface)] shadow-[0_1px_4px_rgba(0,0,0,0.06),0_1px_1px_rgba(0,0,0,0.03)] border border-[var(--border)]/80 -z-10"
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}
      <Icon size={14} className={active ? "text-[var(--accent)]" : "text-[var(--muted)] group-hover:text-[var(--text)]"} />
      <span className="flex-1 truncate">{label}</span>
      {badge !== undefined && (
        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full transition-colors ${
          active ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "bg-black/5 dark:bg-white/10 text-[var(--muted)]"
        }`}>
          {badge}
        </span>
      )}
    </button>
  )
}

// ─── Empty State Component ──────────────────────────────────────────────────

function EmptyState({ icon: Icon, title, description, action, onAction }: {
  icon: any
  title: string
  description: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface-2)]/20">
      <div className="w-14 h-14 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center mb-4 shadow-xs">
        <Icon size={24} className="text-[var(--muted)]" />
      </div>
      <h3 className="text-sm font-bold text-[var(--text)] mb-1 tracking-tight">{title}</h3>
      <p className="text-xs text-[var(--muted)] max-w-[320px] mb-5 leading-relaxed">{description}</p>
      {action && onAction && (
        <button
          onClick={onAction}
          className="flex items-center gap-1.5 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-deep)] text-white rounded-xl text-xs font-semibold shadow-xs active:scale-95 transition cursor-pointer"
        >
          <Plus size={13} />
          <span>{action}</span>
        </button>
      )}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function CompanyWorkspace({ onBack }: CompanyWorkspaceProps) {
  const {
    currentCompany, currentMember, companyMembers, companyTeams,
    companyInvitations, companies, refreshMembers, refreshTeams,
    refreshInvitations, switchCompany, refreshCompany
  } = useCompany()

  const [view, setView] = useState<CompanyView>("dashboard")
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loadingAudit, setLoadingAudit] = useState(true)
  const [orgPages, setOrgPages] = useState<OrgPage[]>([])
  const [loadingPages, setLoadingPages] = useState(true)
  const [orgProjects, setOrgProjects] = useState<OrgProject[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)

  // Combined refresh function
  const refreshData = useCallback(async () => {
    await Promise.all([refreshMembers(), refreshTeams(), refreshInvitations()])
  }, [refreshMembers, refreshTeams, refreshInvitations])
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [companySwitcherOpen, setCompanySwitcherOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [pageCreatorOpen, setPageCreatorOpen] = useState(false)
  const [profileMember, setProfileMember] = useState<OrganizationMember | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [teamSettingsTeam, setTeamSettingsTeam] = useState<OrgTeam | null>(null)
  const [teamSettingsOpen, setTeamSettingsOpen] = useState(false)
  const [trashOpen, setTrashOpen] = useState(false)
  const [breadcrumb, setBreadcrumb] = useState<{ label: string; icon?: React.ReactNode; onClick?: () => void }[]>([])
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false)
  const { starredPageIds, togglePageStar, isPageStarred } = useFavorites()

  const isAdmin = isCompanyAdmin(currentMember, currentCompany!)
  const isOwner = isCompanyOwner(currentMember, currentCompany!)

  // Fetch audit logs
  useEffect(() => {
    if (!currentCompany) return
    setLoadingAudit(true)
    getCompanyAuditLogs(currentCompany.id, 50)
      .then(setAuditLogs)
      .catch(() => setAuditLogs([]))
      .finally(() => setLoadingAudit(false))
  }, [currentCompany])

  // Fetch org-scoped pages
  const fetchOrgPages = useCallback(async () => {
    if (!currentCompany) return
    setLoadingPages(true)
    try {
      const pages = await getOrgPages(currentCompany.id)
      setOrgPages(pages)
    } catch { setOrgPages([]) }
    finally { setLoadingPages(false) }
  }, [currentCompany])

  useEffect(() => { fetchOrgPages() }, [fetchOrgPages])

  // Fetch org-scoped projects
  const fetchOrgProjects = useCallback(async () => {
    if (!currentCompany) return
    setLoadingProjects(true)
    try {
      const projects = await getOrgProjects(currentCompany.id)
      setOrgProjects(projects)
    } catch { setOrgProjects([]) }
    finally { setLoadingProjects(false) }
  }, [currentCompany])

  useEffect(() => { fetchOrgProjects() }, [fetchOrgProjects])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setCommandPaletteOpen(prev => !prev)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault()
        setPageCreatorOpen(true)
      }
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault()
        setShortcutsOpen(prev => !prev)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "p") {
        e.preventDefault()
        setQuickSwitcherOpen(prev => !prev)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Navigate to team home
  const handleTeamClick = useCallback((teamId: string) => {
    setSelectedTeamId(teamId)
    setView("teamHome")
  }, [])

  // Navigate from command palette
  const handleCommandNavigate = useCallback((view: string, id?: string) => {
    if (view === "page" && id) {
      onBack()
    } else if (view === "teamHome" && id) {
      handleTeamClick(id)
    } else {
      setView(view as CompanyView)
    }
  }, [onBack, handleTeamClick])

  // Open team settings
  const openTeamSettings = useCallback((team: OrgTeam) => {
    setTeamSettingsTeam(team)
    setTeamSettingsOpen(true)
  }, [])

  if (!currentCompany) return null

  const activeMembers = companyMembers.filter(m => m.status === "active")
  const pendingInvites = companyInvitations.filter(i => i.status === "pending")

  return (
    <div className="fixed inset-0 z-[100] flex bg-[var(--bg)]">
      {/* ─── Command Palette ─── */}
      <CompanyCommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={handleCommandNavigate}
      />

      {/* ─── Page Creator ─── */}
      <CompanyPageCreator
        open={pageCreatorOpen}
        onClose={() => setPageCreatorOpen(false)}
        onPageCreated={(id) => { onBack() }}
        teams={companyTeams}
      />

      {/* ─── Member Profile ─── */}
      <CompanyMemberProfile
        member={profileMember}
        open={profileOpen}
        onClose={() => { setProfileOpen(false); setProfileMember(null) }}
      />

      {/* ─── Shortcuts Panel ─── */}
      <CompanyShortcutsPanel
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      {/* ─── Quick Switcher ─── */}
      <QuickSwitcher
        open={quickSwitcherOpen}
        onClose={() => setQuickSwitcherOpen(false)}
        onNavigate={(type, id) => { onBack() }}
      />

      {/* ─── Team Settings ─── */}
      {teamSettingsTeam && (
        <TeamSettings
          team={teamSettingsTeam}
          open={teamSettingsOpen}
          onClose={() => { setTeamSettingsOpen(false); setTeamSettingsTeam(null) }}
          onUpdated={refreshData}
          onDeleted={() => { setTeamSettingsOpen(false); setTeamSettingsTeam(null); refreshData() }}
        />
      )}

      {/* ─── Company Sidebar ─── */}
      <div className={`${sidebarCollapsed ? "w-[56px]" : "w-[260px]"} h-full bg-[var(--surface)]/90 dark:bg-[#121620]/90 backdrop-blur-2xl border-r border-[var(--border)]/70 flex flex-col shrink-0 transition-all duration-200 relative select-none`}>
        {/* Company Header */}
        <div className="p-3 border-b border-[var(--border)]/70">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-semibold text-[var(--secondary)] hover:text-[var(--text)] transition-colors cursor-pointer mb-2.5 px-1.5 py-1 rounded-xl hover:bg-[var(--surface-2)] w-full group"
          >
            <ArrowLeft size={13} className="text-[var(--muted)] group-hover:text-[var(--text)] group-hover:-translate-x-0.5 transition-transform" />
            {!sidebarCollapsed && <span>Back to Workspace</span>}
          </button>

          {/* Company Identity */}
          <div className="relative">
            <button
              onClick={() => setCompanySwitcherOpen(!companySwitcherOpen)}
              className="w-full flex items-center gap-2.5 p-2 rounded-2xl bg-[var(--surface-2)]/50 hover:bg-[var(--surface-2)] border border-[var(--border)]/80 transition-all cursor-pointer shadow-xs"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/15 to-purple-500/15 border border-indigo-500/25 flex items-center justify-center text-base shrink-0 shadow-2xs">
                {currentCompany.logo_url || "🏢"}
              </div>
              {!sidebarCollapsed && (
                <>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-xs font-bold text-[var(--text)] truncate leading-tight">{currentCompany.name}</div>
                    <div className="text-[10px] text-[var(--muted)] truncate mt-0.5">/{currentCompany.slug}</div>
                  </div>
                  <ChevronDown size={13} className={`text-[var(--muted)] transition-transform duration-200 ${companySwitcherOpen ? "rotate-180 text-[var(--text)]" : ""}`} />
                </>
              )}
            </button>

            {/* Company Switcher Dropdown */}
            <AnimatePresence>
              {companySwitcherOpen && !sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 4 }}
                  transition={{ type: "spring", stiffness: 450, damping: 30 }}
                  className="absolute left-0 right-0 top-full mt-2 z-30 bg-[var(--surface)]/95 dark:bg-[#161a23]/95 backdrop-blur-2xl border border-[var(--border)]/80 rounded-2xl shadow-2xl overflow-hidden min-w-[220px]"
                >
                  <div className="p-1.5 space-y-1">
                    {companies.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { switchCompany(c.id); setCompanySwitcherOpen(false) }}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-left rounded-xl transition-all cursor-pointer ${
                          c.id === currentCompany.id
                            ? "bg-[var(--accent)]/10 text-[var(--text)] font-semibold border border-[var(--accent)]/20 shadow-xs"
                            : "hover:bg-[var(--hover)] text-[var(--secondary)] hover:text-[var(--text)]"
                        }`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-sm">
                          {c.logo_url || "🏢"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-[var(--text)] truncate">{c.name}</div>
                          <div className="text-[10px] text-[var(--muted)]">/{c.slug}</div>
                        </div>
                        {c.id === currentCompany.id && <Check size={13} className="text-[var(--accent)] shrink-0" />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Role Badge */}
          {!sidebarCollapsed && currentMember && (
            <div className="mt-2.5 px-1 flex items-center gap-1.5">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                isOwner ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25" :
                isAdmin ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25" :
                "bg-black/5 dark:bg-white/10 text-[var(--secondary)] border-[var(--border)]"
              }`}>
                {isOwner ? "Owner" : isAdmin ? "Admin" : (currentMember.role_name || "Member")}
              </span>
              <span className="text-[11px] text-[var(--muted)] truncate">· {currentMember.job_title || "Team Member"}</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1 scrollbar-none">
          {/* HOME */}
          <SidebarSection title="Home">
            <SidebarNavItem icon={Home} label="Dashboard" active={view === "dashboard"} onClick={() => setView("dashboard")} />
            <SidebarNavItem icon={Briefcase} label="My Work" active={view === "myWork"} onClick={() => setView("myWork")} />
            <SidebarNavItem icon={Activity} label="Updates" active={view === "updates"} onClick={() => setView("updates")} badge={pendingInvites.length || undefined} />
          </SidebarSection>

          {/* WORKSPACE */}
          <SidebarSection title="Workspace">
            <SidebarNavItem icon={FileText} label="Pages" active={view === "pages"} onClick={() => setView("pages")} badge={orgPages.length || undefined} />
            <SidebarNavItem icon={FolderKanban} label="Projects" active={view === "projects"} onClick={() => setView("projects")} badge={orgProjects.length || undefined} />
            <SidebarNavItem icon={Database} label="Databases" active={view === "databases"} onClick={() => setView("databases")} />
            <SidebarNavItem icon={CheckSquare} label="Tasks" active={view === "tasks"} onClick={() => setView("tasks")} />
          </SidebarSection>

          {/* TEAMS */}
          <SidebarSection title="Teams">
            {companyTeams.length === 0 ? (
              <div className="px-3 py-2 rounded-xl bg-[var(--surface-2)]/30 border border-dashed border-[var(--border)] text-center my-1">
                <p className="text-[11px] text-[var(--muted)] mb-1">No teams yet</p>
                {isAdmin && (
                  <button
                    onClick={() => setView("teams")}
                    className="text-[11px] font-semibold text-[var(--accent)] hover:underline cursor-pointer"
                  >
                    Create team
                  </button>
                )}
              </div>
            ) : (
              companyTeams.map((team) => (
                <SidebarNavItem
                  key={team.id}
                  icon={() => <span className="text-sm leading-none">{team.icon || "👥"}</span>}
                  label={team.name}
                  active={view === "teamHome" && selectedTeamId === team.id}
                  onClick={() => handleTeamClick(team.id)}
                />
              ))
            )}
            {isAdmin && companyTeams.length > 0 && (
              <button
                onClick={() => setView("teams")}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--surface-2)] rounded-xl transition cursor-pointer"
              >
                <Plus size={13} /> <span>Manage Teams</span>
              </button>
            )}
          </SidebarSection>

          {/* PEOPLE */}
          <SidebarSection title="People">
            <SidebarNavItem icon={Users} label="Members" active={view === "members"} onClick={() => setView("members")} badge={activeMembers.length} />
          </SidebarSection>

          {/* ADMIN */}
          {isAdmin && (
            <SidebarSection title="Admin">
              <SidebarNavItem icon={Mail} label="Invitations" active={view === "invitations"} onClick={() => setView("invitations")} badge={pendingInvites.length || undefined} />
              <SidebarNavItem icon={Clock} label="Audit Log" active={view === "audit"} onClick={() => setView("audit")} />
              <SidebarNavItem icon={BarChart3} label="Analytics" active={view === "analytics"} onClick={() => setView("analytics")} />
              <SidebarNavItem icon={Shield} label="Security" active={view === "security"} onClick={() => setView("security")} />
              <SidebarNavItem icon={FileWarning} label="Compliance" active={view === "compliance"} onClick={() => setView("compliance")} />
              <SidebarNavItem icon={Settings} label="Settings" active={view === "settings"} onClick={() => setView("settings")} />
            </SidebarSection>
          )}
        </div>

        {/* Quick Create */}
        {!sidebarCollapsed && (
          <div className="px-3 pb-2 space-y-2">
            <button
              onClick={() => setPageCreatorOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-[var(--accent)] hover:bg-[var(--accent-deep)] text-white rounded-xl text-[11px] font-semibold shadow-xs active:scale-95 transition cursor-pointer"
            >
              <Plus size={13} />
              New Page
            </button>

            {/* Page Tree */}
            <div className="border border-[var(--border)]/60 rounded-xl overflow-hidden">
              <div className="px-2.5 py-1.5 bg-[var(--surface-2)]/30 border-b border-[var(--border)]/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Pages</span>
              </div>
              <CompanyPageTree
                onNavigateToPage={(id) => { onBack() }}
                onStarPage={togglePageStar}
                starredPages={starredPageIds}
              />
            </div>

            {/* Favorites */}
            <div className="border border-[var(--border)]/60 rounded-xl overflow-hidden">
              <div className="px-2.5 py-1.5 bg-[var(--surface-2)]/30 border-b border-[var(--border)]/60 flex items-center gap-1">
                <Star size={10} className="text-amber-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Favorites</span>
              </div>
              <CompanyFavorites
                onNavigateToPage={(id) => { onBack() }}
                onNavigateToProject={(id) => { onBack() }}
              />
            </div>
          </div>
        )}

        {/* Footer Stats + Actions */}
        {!sidebarCollapsed && (
          <div className="p-3 border-t border-[var(--border)]/70 bg-[var(--surface-2)]/20 space-y-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCommandPaletteOpen(true)}
                className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[var(--surface-2)]/50 hover:bg-[var(--surface-2)] border border-[var(--border)]/60 text-[10px] text-[var(--muted)] transition-all cursor-pointer"
              >
                <Search size={11} />
                <span className="flex-1 text-left">Search...</span>
                <kbd className="text-[9px] bg-[var(--surface)] px-1 py-0.5 rounded border border-[var(--border)] font-mono">⌘K</kbd>
              </button>
              <CompanyNotificationBell />
            </div>
            <div className="text-[10px] font-medium text-[var(--muted)] flex items-center justify-between px-1">
              <span>{activeMembers.length} member{activeMembers.length !== 1 ? "s" : ""}</span>
              <span>·</span>
              <span>{companyTeams.length} team{companyTeams.length !== 1 ? "s" : ""}</span>
              <span>·</span>
              <span>{orgProjects.length} project{orgProjects.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center justify-between px-1">
              <button
                onClick={() => setShortcutsOpen(true)}
                className="text-[10px] text-[var(--muted)] hover:text-[var(--text)] transition cursor-pointer"
              >
                ⌨ Shortcuts
              </button>
              <button
                onClick={() => setTrashOpen(true)}
                className="text-[10px] text-[var(--muted)] hover:text-red-500 transition cursor-pointer"
              >
                🗑 Trash
              </button>
            </div>
          </div>
        )}

        {/* Collapse Toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute top-1/2 -right-3 w-6 h-6 bg-[var(--surface)] border border-[var(--border)] rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition shadow-xs cursor-pointer z-10"
        >
          <ChevronRight size={10} className={`transition-transform ${sidebarCollapsed ? "" : "rotate-180"}`} />
        </button>
      </div>

      {/* ─── Trash Modal ─── */}
      {trashOpen && (
        <div className="fixed inset-0 z-[190] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setTrashOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 w-[480px] max-h-[80vh] bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]/70">
              <div className="flex items-center gap-2">
                <Trash2 size={15} className="text-[var(--muted)]" />
                <h2 className="text-[14px] font-bold text-[var(--text)]">Trash</h2>
              </div>
              <button
                onClick={() => setTrashOpen(false)}
                className="w-7 h-7 rounded-xl hover:bg-[var(--hover)] flex items-center justify-center text-[var(--muted)] cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <CompanyTrash onRestore={refreshData} />
            </div>
          </motion.div>
        </div>
      )}

      {/* ─── Content Area ─── */}
      <div className="flex-1 overflow-y-auto">
        {/* Breadcrumb */}
        {breadcrumb.length > 0 && (
          <CompanyBreadcrumb items={breadcrumb} />
        )}

        <AnimatePresence mode="wait">
          {view === "dashboard" && (
            <DashboardView
              key="dashboard"
              company={currentCompany}
              member={currentMember}
              members={companyMembers}
              teams={companyTeams}
              pages={orgPages}
              projects={orgProjects}
              activity={auditLogs}
              loadingActivity={loadingAudit}
              onNavigate={(v) => setView(v)}
              onTeamClick={handleTeamClick}
            />
          )}
          {view === "myWork" && (
            <MyWorkView key="myWork" company={currentCompany} pages={orgPages} projects={orgProjects} />
          )}
          {view === "updates" && (
            <UpdatesView key="updates" activity={auditLogs} loading={loadingAudit} />
          )}
          {view === "pages" && (
            <PagesView
              key="pages"
              company={currentCompany}
              pages={orgPages}
              loading={loadingPages}
              onRefresh={fetchOrgPages}
              isAdmin={isAdmin}
            />
          )}
          {view === "projects" && (
            <ProjectsView
              key="projects"
              company={currentCompany}
              projects={orgProjects}
              loading={loadingProjects}
              onRefresh={fetchOrgProjects}
              teams={companyTeams}
              isAdmin={isAdmin}
            />
          )}
          {view === "databases" && (
            <DatabasesView key="databases" company={currentCompany} pages={orgPages} />
          )}
          {view === "teamHome" && selectedTeamId && (
            <TeamDashboard
              key={`team-${selectedTeamId}`}
              teamId={selectedTeamId}
              company={currentCompany}
              member={currentMember}
              onBack={() => setView("dashboard")}
              onSettings={openTeamSettings}
            />
          )}
          {view === "teams" && (
            <TeamsManageView
              key="teams"
              company={currentCompany}
              member={currentMember}
              teams={companyTeams}
              onRefresh={refreshTeams}
              onTeamClick={handleTeamClick}
              onSettings={openTeamSettings}
            />
          )}
          {view === "members" && (
            <MembersView
              key="members"
              company={currentCompany}
              member={currentMember}
              members={companyMembers}
              onRefresh={refreshMembers}
              teams={companyTeams}
              onProfileClick={(m) => { setProfileMember(m); setProfileOpen(true) }}
            />
          )}
          {view === "invitations" && (
            <InvitationsView
              key="invitations"
              company={currentCompany}
              member={currentMember}
              invitations={companyInvitations}
              onRefresh={refreshInvitations}
            />
          )}
          {view === "audit" && (
            <AuditView key="audit" company={currentCompany} logs={auditLogs} loading={loadingAudit} />
          )}
          {view === "settings" && (
            <SettingsView
              key="settings"
              company={currentCompany}
              member={currentMember}
              onBack={() => setView("dashboard")}
              isOwner={isOwner}
            />
          )}
          {view === "tasks" && (
            <TasksView key="tasks" company={currentCompany} member={currentMember} />
          )}
          {view === "analytics" && (
            <AnalyticsView key="analytics" company={currentCompany} />
          )}
          {view === "security" && (
            <SecurityView key="security" company={currentCompany} />
          )}
          {view === "compliance" && (
            <ComplianceView key="compliance" company={currentCompany} />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════

function DashboardView({ company, member, members, teams, pages, projects, activity, loadingActivity, onNavigate, onTeamClick }: {
  company: NonNullable<ReturnType<typeof useCompany>["currentCompany"]>
  member: OrganizationMember | null
  members: OrganizationMember[]
  teams: OrgTeam[]
  pages: OrgPage[]
  projects: OrgProject[]
  activity: AuditLog[]
  loadingActivity: boolean
  onNavigate: (v: CompanyView) => void
  onTeamClick: (teamId: string) => void
}) {
  const activeMembers = members.filter(m => m.status === "active")
  const recentPages = pages.slice(0, 5)
  const recentProjects = projects.slice(0, 5)
  const recentActivity = activity.slice(0, 8)

  const actionMap: Record<string, string> = {
    "organization.created": "Created the organization",
    "member.joined": "Joined the organization",
    "member.invited": "Invited a member",
    "member.removed": "Removed a member",
    "team.created": "Created a team",
    "project.created": "Created a project",
    "page.updated": "Updated a page",
  }

  const stats = [
    { label: "Members", value: activeMembers.length, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20", action: () => onNavigate("members") },
    { label: "Teams", value: teams.length, icon: Building2, color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/20", action: () => onNavigate("teams") },
    { label: "Projects", value: projects.length, icon: FolderKanban, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20", action: () => onNavigate("projects") },
    { label: "Pages", value: pages.length, icon: FileText, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", action: () => onNavigate("pages") },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.2 }} className="max-w-[1140px] mx-auto p-6 sm:p-8 space-y-8">
      {/* Apple Hero Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-[var(--border)]/80 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent p-7 shadow-xs backdrop-blur-2xl">
        <div className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-3xl shadow-sm">
              {company.logo_url || "🏢"}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text)]">
                  {company.name}
                </h1>
                <span className="rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 text-[11px] font-semibold">
                  Verified Org
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--secondary)] mt-1 max-w-xl leading-relaxed">
                {company.description || "Centralized organization workspace for enterprise docs, projects, and collaborative teamspaces."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate("pages")}
              className="rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-deep)] px-3.5 py-2 text-xs font-semibold text-white transition active:scale-95 cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Plus size={13} />
              <span>New Page</span>
            </button>
            <button
              onClick={() => onNavigate("members")}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/80 hover:bg-[var(--hover)] px-3.5 py-2 text-xs font-semibold text-[var(--text)] transition active:scale-95 cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <UserPlus size={13} />
              <span>Invite</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {stats.map((stat) => (
          <button
            key={stat.label}
            onClick={stat.action}
            className="p-5 rounded-3xl bg-gradient-to-b from-[var(--surface)] to-[var(--surface)]/80 border border-[var(--border)]/80 hover:border-[var(--accent)]/40 hover:-translate-y-0.5 shadow-xs backdrop-blur-xl transition-all cursor-pointer text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-8 h-8 rounded-xl ${stat.bg} border flex items-center justify-center shadow-2xs`}>
                <stat.icon size={15} className={stat.color} />
              </div>
              <span className="text-xs font-semibold text-[var(--muted)] group-hover:text-[var(--text)] transition-colors">{stat.label}</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text)]">{stat.value}</div>
            <div className="text-[11px] text-[var(--muted)] mt-1 font-medium">
              {stat.label === "Teams" && "Active teamspaces"}
              {stat.label === "Projects" && "Current workflows"}
              {stat.label === "Pages" && "Company documents"}
              {stat.label === "Members" && "Collaborators"}
            </div>
          </button>
        ))}
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column (3/5) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Recent Pages */}
          <div className="rounded-3xl border border-[var(--border)]/80 bg-gradient-to-b from-[var(--surface)] to-[var(--surface)]/80 p-6 shadow-xs backdrop-blur-xl">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]/60">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-[var(--accent)]" />
                <h3 className="text-sm font-bold text-[var(--text)]">Recent Pages</h3>
              </div>
              {pages.length > 5 && (
                <button onClick={() => onNavigate("pages")} className="text-xs font-semibold text-[var(--accent)] hover:underline cursor-pointer">
                  View all ({pages.length})
                </button>
              )}
            </div>
            {recentPages.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  icon={FileText}
                  title="No pages yet"
                  description="Pages shared with the organization will appear here."
                  action="Create a Page"
                  onAction={() => onNavigate("pages")}
                />
              </div>
            ) : (
              <div className="space-y-1.5 mt-4">
                {recentPages.map((page) => (
                  <div key={page.id} className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl hover:bg-[var(--surface-2)]/70 border border-transparent hover:border-[var(--border)]/60 transition-all cursor-pointer group">
                    <span className="text-lg leading-none">{page.icon || "📝"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-semibold text-[var(--text)] truncate">{page.title}</div>
                      <div className="text-[10.5px] text-[var(--muted)]">
                        Updated {new Date(page.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                    <VisibilityBadge visibility={page.visibility} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Projects */}
          <div className="rounded-3xl border border-[var(--border)]/80 bg-gradient-to-b from-[var(--surface)] to-[var(--surface)]/80 p-6 shadow-xs backdrop-blur-xl">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]/60">
              <div className="flex items-center gap-2">
                <FolderKanban size={16} className="text-amber-500" />
                <h3 className="text-sm font-bold text-[var(--text)]">Recent Projects</h3>
              </div>
              {projects.length > 5 && (
                <button onClick={() => onNavigate("projects")} className="text-xs font-semibold text-[var(--accent)] hover:underline cursor-pointer">
                  View all ({projects.length})
                </button>
              )}
            </div>
            {recentProjects.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  icon={FolderKanban}
                  title="No projects yet"
                  description="Start your first project to bring your team together."
                  action="Create Project"
                  onAction={() => onNavigate("projects")}
                />
              </div>
            ) : (
              <div className="space-y-1.5 mt-4">
                {recentProjects.map((project) => (
                  <div key={project.id} className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl hover:bg-[var(--surface-2)]/70 border border-transparent hover:border-[var(--border)]/60 transition-all cursor-pointer">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-2xs">
                      <FolderKanban size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-semibold text-[var(--text)] truncate">{project.name}</div>
                      <div className="text-[11px] text-[var(--muted)] truncate">{project.description || "No description"}</div>
                    </div>
                    <StatusBadge status={project.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (2/5) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Teams Card */}
          <div className="rounded-3xl border border-[var(--border)]/80 bg-gradient-to-b from-[var(--surface)] to-[var(--surface)]/80 p-6 shadow-xs backdrop-blur-xl">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]/60">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-purple-500" />
                <h3 className="text-sm font-bold text-[var(--text)]">Teams</h3>
              </div>
              <button onClick={() => onNavigate("teams")} className="text-xs font-semibold text-[var(--accent)] hover:underline cursor-pointer">
                Manage
              </button>
            </div>
            {teams.length === 0 ? (
              <div className="py-8 text-center bg-[var(--surface-2)]/30 rounded-2xl border border-dashed border-[var(--border)] mt-4">
                <Building2 size={22} className="mx-auto mb-2 text-[var(--muted)]" />
                <p className="text-xs font-semibold text-[var(--muted)]">No teams yet</p>
                <p className="text-[10.5px] text-[var(--muted)] mt-0.5">Create a team to organize work</p>
              </div>
            ) : (
              <div className="space-y-2 mt-4">
                {teams.slice(0, 5).map((team) => (
                  <button
                    key={team.id}
                    onClick={() => onTeamClick(team.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-[var(--surface-2)]/70 border border-transparent hover:border-[var(--border)]/60 transition-all cursor-pointer text-left group"
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-2xs border border-[var(--border)]/60" style={{ backgroundColor: (team.color || "#6366f1") + "20" }}>
                      {team.icon || "👥"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-semibold text-[var(--text)] truncate">{team.name}</div>
                      <div className="text-[10.5px] text-[var(--muted)] truncate">{team.description || "Teamspace"}</div>
                    </div>
                    <ChevronRight size={13} className="text-[var(--muted)] group-hover:text-[var(--text)] group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="rounded-3xl border border-[var(--border)]/80 bg-gradient-to-b from-[var(--surface)] to-[var(--surface)]/80 p-6 shadow-xs backdrop-blur-xl">
            <h3 className="text-sm font-bold text-[var(--text)] pb-4 border-b border-[var(--border)]/60">Quick Launch</h3>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {[
                { label: "New Page", icon: FileText, color: "text-blue-500", action: () => onNavigate("pages") },
                { label: "New Project", icon: FolderKanban, color: "text-amber-500", action: () => onNavigate("projects") },
                { label: "Invite Member", icon: UserPlus, color: "text-emerald-500", action: () => onNavigate("members") },
                { label: "Create Team", icon: Building2, color: "text-purple-500", action: () => onNavigate("teams") },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="flex flex-col items-start gap-2 p-3.5 rounded-2xl bg-[var(--surface-2)]/40 hover:bg-[var(--surface-2)] border border-[var(--border)]/60 hover:border-[var(--accent)]/30 transition-all cursor-pointer text-left group active:scale-95"
                >
                  <item.icon size={16} className={item.color} />
                  <span className="text-xs font-semibold text-[var(--text)]">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-3xl border border-[var(--border)]/80 bg-gradient-to-b from-[var(--surface)] to-[var(--surface)]/80 p-6 shadow-xs backdrop-blur-xl">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]/60">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-emerald-500" />
                <h3 className="text-sm font-bold text-[var(--text)]">Recent Activity</h3>
              </div>
              {activity.length > 8 && (
                <button onClick={() => onNavigate("audit")} className="text-xs font-semibold text-[var(--accent)] hover:underline cursor-pointer">
                  View all
                </button>
              )}
            </div>
            <div className="mt-4">
              <CompanyActivityFeed limit={8} />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// MY WORK
// ═════════════════════════════════════════════════════════════════════════════

function MyWorkView({ company, pages, projects }: {
  company: NonNullable<ReturnType<typeof useCompany>["currentCompany"]>
  pages: OrgPage[]
  projects: OrgProject[]
}) {
  const userId = localStorage.getItem("noska_user_id")
  const myPages = pages.filter(p => p.user_id === userId)
  const myProjects = projects.filter(p => p.owner_id === userId)

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.2 }} className="max-w-[940px] mx-auto p-6 sm:p-8 space-y-8">
      <div className="pb-4 border-b border-[var(--border)]/60">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text)]">My Work</h2>
        <p className="text-xs text-[var(--muted)] mt-1">Personal documents, assigned deliverables, and owned projects in {company.name}.</p>
      </div>

      <div className="space-y-6">
        {/* My Pages */}
        <div className="rounded-3xl border border-[var(--border)]/80 bg-gradient-to-b from-[var(--surface)] to-[var(--surface)]/80 p-6 shadow-xs backdrop-blur-xl">
          <h3 className="text-sm font-bold text-[var(--text)] mb-4 flex items-center gap-2">
            <FileText size={16} className="text-[var(--accent)]" />
            <span>My Authored Documents</span>
            <span className="rounded-full bg-black/5 dark:bg-white/10 px-2 py-0.5 text-[10.5px] font-semibold text-[var(--muted)]">{myPages.length}</span>
          </h3>
          {myPages.length === 0 ? (
            <EmptyState icon={FileText} title="No pages authored yet" description="Pages you create within this company will appear here." />
          ) : (
            <div className="space-y-1.5">
              {myPages.map((page) => (
                <div key={page.id} className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl hover:bg-[var(--surface-2)]/70 border border-transparent hover:border-[var(--border)]/60 transition cursor-pointer">
                  <span className="text-lg leading-none">{page.icon || "📝"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm font-semibold text-[var(--text)] truncate">{page.title}</div>
                    <div className="text-[10.5px] text-[var(--muted)]">Updated {new Date(page.updated_at).toLocaleDateString()}</div>
                  </div>
                  <VisibilityBadge visibility={page.visibility} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Projects */}
        <div className="rounded-3xl border border-[var(--border)]/80 bg-gradient-to-b from-[var(--surface)] to-[var(--surface)]/80 p-6 shadow-xs backdrop-blur-xl">
          <h3 className="text-sm font-bold text-[var(--text)] mb-4 flex items-center gap-2">
            <FolderKanban size={16} className="text-amber-500" />
            <span>My Projects</span>
            <span className="rounded-full bg-black/5 dark:bg-white/10 px-2 py-0.5 text-[10.5px] font-semibold text-[var(--muted)]">{myProjects.length}</span>
          </h3>
          {myProjects.length === 0 ? (
            <EmptyState icon={FolderKanban} title="No projects owned yet" description="Projects where you are assigned as lead will appear here." />
          ) : (
            <div className="space-y-1.5">
              {myProjects.map((project) => (
                <div key={project.id} className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl hover:bg-[var(--surface-2)]/70 border border-transparent hover:border-[var(--border)]/60 transition cursor-pointer">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-2xs">
                    <FolderKanban size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm font-semibold text-[var(--text)] truncate">{project.name}</div>
                    <div className="text-[11px] text-[var(--muted)] truncate">{project.description || "No description"}</div>
                  </div>
                  <StatusBadge status={project.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// UPDATES
// ═════════════════════════════════════════════════════════════════════════════

function UpdatesView({ activity, loading }: { activity: AuditLog[]; loading: boolean }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-[700px] mx-auto p-8">
      <h2 className="text-[20px] font-bold text-[var(--text)] mb-6">Updates</h2>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-[var(--muted)]" />
        </div>
      ) : activity.length === 0 ? (
        <EmptyState icon={Activity} title="No updates yet" description="Activity from your team will appear here." />
      ) : (
        <div className="space-y-1">
          {activity.map((log) => (
            <div key={log.id} className="flex items-start gap-3 px-4 py-3 rounded-xl hover:bg-[var(--surface-2)] transition-colors">
              <div className="w-2 h-2 rounded-full bg-[var(--noska-blue)] mt-1.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-[var(--text)]">{log.action}</div>
                {log.details && Object.keys(log.details).length > 0 && (
                  <div className="text-[11px] text-[var(--muted)] mt-0.5">
                    {Object.entries(log.details).slice(0, 3).map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-[var(--muted)] shrink-0 mt-0.5">
                {formatRelativeTime(log.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGES
// ═════════════════════════════════════════════════════════════════════════════

function PagesView({ company, pages, loading, onRefresh, isAdmin }: {
  company: NonNullable<ReturnType<typeof useCompany>["currentCompany"]>
  pages: OrgPage[]
  loading: boolean
  onRefresh: () => Promise<void>
  isAdmin: boolean
}) {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<string>("all")

  const filtered = pages.filter(p => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === "all" || p.visibility === filter
    return matchSearch && matchFilter
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-[900px] mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[20px] font-bold text-[var(--text)]">Pages</h2>
          <p className="text-[12px] text-[var(--muted)] mt-0.5">{pages.length} page{pages.length !== 1 ? "s" : ""} in this company</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg flex-1">
          <Search size={13} className="text-[var(--muted)]" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search pages..."
            className="flex-1 bg-transparent text-[12px] text-[var(--text)] placeholder:text-[var(--muted)] outline-none" />
        </div>
        <div className="flex gap-1">
          {["all", "company", "team", "private", "public"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                filter === f
                  ? "bg-[var(--noska-blue)]/10 text-[var(--noska-blue)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Page List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-[var(--muted)]" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={search ? "No pages match your search" : "No company pages yet"}
          description={search ? "Try a different search term." : "Pages shared with the organization will appear here. Set a page's visibility to 'Company' or 'Team' to share it."}
        />
      ) : (
        <div className="space-y-1">
          {filtered.map((page) => (
            <div key={page.id} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--surface-2)] transition-colors cursor-pointer group">
              <span className="text-base">{page.icon || "📝"}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-[var(--text)] truncate">{page.title}</div>
                <div className="text-[10px] text-[var(--muted)]">
                  Updated {new Date(page.updated_at).toLocaleDateString()}
                </div>
              </div>
              <VisibilityBadge visibility={page.visibility} />
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// PROJECTS
// ═════════════════════════════════════════════════════════════════════════════

function ProjectsView({ company, projects, loading, onRefresh, teams, isAdmin }: {
  company: NonNullable<ReturnType<typeof useCompany>["currentCompany"]>
  projects: OrgProject[]
  loading: boolean
  onRefresh: () => Promise<void>
  teams: OrgTeam[]
  isAdmin: boolean
}) {
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [newTeamId, setNewTeamId] = useState<string>("")
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState("")

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      await createOrgProject(company.id, newName.trim(), newDesc, localStorage.getItem("noska_user_id") || "", newTeamId || null)
      setNewName("")
      setNewDesc("")
      setNewTeamId("")
      setShowCreate(false)
      onRefresh()
    } catch (e) { console.error(e) }
    finally { setCreating(false) }
  }

  const filtered = projects.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-[900px] mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[20px] font-bold text-[var(--text)]">Projects</h2>
          <p className="text-[12px] text-[var(--muted)] mt-0.5">{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[var(--noska-blue)] text-white rounded-lg text-[12px] font-medium hover:opacity-90 transition-opacity cursor-pointer">
            <Plus size={13} /> New Project
          </button>
        )}
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
            <div className="p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl space-y-3">
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Project name"
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--noska-blue)]" autoFocus />
              <input type="text" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description (optional)"
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--noska-blue)]" />
              {teams.length > 0 && (
                <select value={newTeamId} onChange={(e) => setNewTeamId(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[12px] text-[var(--text)] outline-none cursor-pointer">
                  <option value="">No team</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              )}
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text)] cursor-pointer">Cancel</button>
                <button onClick={handleCreate} disabled={!newName.trim() || creating}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-[var(--noska-blue)] text-white rounded-lg text-[12px] font-medium hover:opacity-90 disabled:opacity-40 cursor-pointer">
                  {creating && <Loader2 size={11} className="animate-spin" />} Create
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      {projects.length > 3 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg mb-4">
          <Search size={13} className="text-[var(--muted)]" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects..."
            className="flex-1 bg-transparent text-[12px] text-[var(--text)] placeholder:text-[var(--muted)] outline-none" />
        </div>
      )}

      {/* Project List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-[var(--muted)]" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={search ? "No projects match your search" : "No projects yet"}
          description={search ? "Try a different search term." : "Start your first project and bring your team together."}
          action={!search && isAdmin ? "Create Project" : undefined}
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((project) => {
            const team = teams.find(t => t.id === project.team_id)
            return (
              <div key={project.id} className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--noska-blue)]/20 transition-colors cursor-pointer">
                <div className="flex items-start gap-3">
                  <FolderKanban size={16} className="text-[var(--muted)] mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-[var(--text)]">{project.name}</div>
                    {project.description && (
                      <div className="text-[12px] text-[var(--muted)] mt-0.5">{project.description}</div>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <StatusBadge status={project.status} />
                      <PriorityBadge priority={project.priority} />
                      {team && (
                        <span className="text-[10px] text-[var(--muted)] flex items-center gap-1">
                          <Building2 size={10} /> {team.name}
                        </span>
                      )}
                      {project.due_date && (
                        <span className="text-[10px] text-[var(--muted)] flex items-center gap-1">
                          <Calendar size={10} /> {new Date(project.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {project.progress > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-[var(--surface)] rounded-full overflow-hidden">
                          <div className="h-full bg-[var(--noska-blue)] rounded-full" style={{ width: `${project.progress}%` }} />
                        </div>
                        <span className="text-[10px] text-[var(--muted)]">{project.progress}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// DATABASES
// ═════════════════════════════════════════════════════════════════════════════

function DatabasesView({ company, pages }: {
  company: NonNullable<ReturnType<typeof useCompany>["currentCompany"]>
  pages: OrgPage[]
}) {
  const [databasePages, setDatabasePages] = useState<OrgPage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDatabases = async () => {
      try {
        const dbs = await getOrgDatabases(company.id)
        setDatabasePages(dbs)
      } catch { setDatabasePages([]) }
      finally { setLoading(false) }
    }
    fetchDatabases()
  }, [company.id])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-[900px] mx-auto p-8">
      <div className="mb-6">
        <h2 className="text-[20px] font-bold text-[var(--text)]">Databases</h2>
        <p className="text-[12px] text-[var(--muted)] mt-0.5">Databases are embedded within pages</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-[var(--muted)]" />
        </div>
      ) : databasePages.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No databases yet"
          description="Databases in Noska are created within pages. Add a database block to any page to get started."
        />
      ) : (
        <div className="space-y-1">
          {databasePages.map((page) => (
            <div key={page.id} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--surface-2)] transition-colors cursor-pointer">
              <Database size={14} className="text-[var(--muted)]" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-[var(--text)]">{page.title}</div>
                <div className="text-[10px] text-[var(--muted)]">Updated {new Date(page.updated_at).toLocaleDateString()}</div>
              </div>
              <VisibilityBadge visibility={page.visibility} />
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// TEAM HOME
// ═════════════════════════════════════════════════════════════════════════════

function TeamHomeView({ teamId, company, member, onBack }: {
  teamId: string
  company: NonNullable<ReturnType<typeof useCompany>["currentCompany"]>
  member: OrganizationMember | null
  onBack: () => void
}) {
  const [team, setTeam] = useState<TeamWithMembers | null>(null)
  const [teamMembers, setTeamMembers] = useState<OrgTeamMember[]>([])
  const [teamPages, setTeamPages] = useState<OrgPage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data: teamData } = await (supabase as any)
          .from("company_teams")
          .select("*")
          .eq("id", teamId)
          .single()
        setTeam(teamData as any)

        const members = await getCompanyTeamMembers(teamId)
        setTeamMembers(members)

        const pages = await getOrgPages(company.id)
        setTeamPages(pages.filter(p => p.team_id === teamId))
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [teamId, company.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-[var(--muted)]" />
      </div>
    )
  }

  if (!team) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[13px] text-[var(--muted)]">Team not found</p>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-[900px] mx-auto p-8">
      {/* Team Header */}
      <div className="flex items-start gap-4 mb-8">
        <button onClick={onBack} className="mt-1 text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer">
          <ArrowLeft size={16} />
        </button>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0" style={{ backgroundColor: (team.color || "#6366f1") + "20" }}>
          {team.icon || "👥"}
        </div>
        <div className="flex-1">
          <h1 className="text-[22px] font-bold text-[var(--text)]">{team.name}</h1>
          {team.description && <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">{team.description}</p>}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[11px] text-[var(--muted)]">{teamMembers.length} member{teamMembers.length !== 1 ? "s" : ""}</span>
            <span className="text-[11px] text-[var(--muted)]">{teamPages.length} page{teamPages.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Members */}
        <div>
          <h3 className="text-[13px] font-semibold text-[var(--text)] mb-3">Team Members</h3>
          {teamMembers.length === 0 ? (
            <div className="py-6 text-center bg-[var(--surface-2)] rounded-xl border border-[var(--border)]">
              <Users size={18} className="mx-auto mb-2 text-[var(--muted)]" />
              <p className="text-[11px] text-[var(--muted)]">No members yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {teamMembers.map((tm) => {
                const m = tm.member
                return (
                  <div key={tm.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
                    <div className="w-7 h-7 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[9px] font-medium overflow-hidden">
                      {m?.user_profiles?.avatar_url ? (
                        <img src={m.user_profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (m?.user_profiles?.user_name || m?.user_id || "?").slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium text-[var(--text)] truncate">{m?.user_profiles?.user_name || m?.user_id}</div>
                    </div>
                    <span className="text-[10px] text-[var(--muted)] capitalize">{tm.role}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pages */}
        <div>
          <h3 className="text-[13px] font-semibold text-[var(--text)] mb-3">Team Pages</h3>
          {teamPages.length === 0 ? (
            <div className="py-6 text-center bg-[var(--surface-2)] rounded-xl border border-[var(--border)]">
              <FileText size={18} className="mx-auto mb-2 text-[var(--muted)]" />
              <p className="text-[11px] text-[var(--muted)]">No team pages yet</p>
              <p className="text-[10px] text-[var(--muted)] mt-0.5">Set a page's team to share it here</p>
            </div>
          ) : (
            <div className="space-y-1">
              {teamPages.map((page) => (
                <div key={page.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors cursor-pointer">
                  <span className="text-sm">{page.icon || "📝"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-[var(--text)] truncate">{page.title}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// TEAMS MANAGEMENT
// ═════════════════════════════════════════════════════════════════════════════

function TeamsManageView({ company, member, teams, onRefresh, onTeamClick, onSettings }: {
  company: NonNullable<ReturnType<typeof useCompany>["currentCompany"]>
  member: OrganizationMember | null
  teams: OrgTeam[]
  onRefresh: () => Promise<void>
  onTeamClick: (teamId: string) => void
  onSettings: (team: OrgTeam) => void
}) {
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [creating, setCreating] = useState(false)
  const isAdmin = isCompanyAdmin(member, company)

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      await createCompanyTeam(company.id, newName.trim(), newDesc)
      setNewName("")
      setNewDesc("")
      setShowCreate(false)
      onRefresh()
    } catch (e) { console.error(e) }
    finally { setCreating(false) }
  }

  const handleDelete = async (teamId: string) => {
    try { await deleteCompanyTeam(teamId); onRefresh() }
    catch (e) { console.error(e) }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-[900px] mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[20px] font-bold text-[var(--text)]">Teams</h2>
          <p className="text-[12px] text-[var(--muted)] mt-0.5">{teams.length} team{teams.length !== 1 ? "s" : ""}</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[var(--noska-blue)] text-white rounded-lg text-[12px] font-medium hover:opacity-90 transition-opacity cursor-pointer">
            <Plus size={13} /> Create Team
          </button>
        )}
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
            <div className="p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl space-y-3">
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Team name"
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--noska-blue)]" autoFocus />
              <input type="text" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description (optional)"
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--noska-blue)]" />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text)] cursor-pointer">Cancel</button>
                <button onClick={handleCreate} disabled={!newName.trim() || creating}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-[var(--noska-blue)] text-white rounded-lg text-[12px] font-medium hover:opacity-90 disabled:opacity-40 cursor-pointer">
                  {creating && <Loader2 size={11} className="animate-spin" />} Create
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Team List */}
      {teams.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No teams yet"
          description="Organize your company into teams for focused collaboration."
          action={isAdmin ? "Create Team" : undefined}
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="space-y-2">
          {teams.map((team) => (
            <div key={team.id} className="flex items-center gap-3 p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--noska-blue)]/20 transition-colors cursor-pointer group" onClick={() => onTeamClick(team.id)}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ backgroundColor: (team.color || "#6366f1") + "20" }}>
                {team.icon || "👥"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-[var(--text)]">{team.name}</div>
                <div className="text-[11px] text-[var(--muted)]">{team.description || "No description"}</div>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={(e) => { e.stopPropagation(); onSettings(team) }}
                    className="w-8 h-8 rounded-lg hover:bg-[var(--surface-3)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] transition-all cursor-pointer">
                    <Settings size={13} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(team.id) }}
                    className="w-8 h-8 rounded-lg hover:bg-red-500/10 flex items-center justify-center text-[var(--muted)] hover:text-red-500 transition-all cursor-pointer">
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
              <ChevronRight size={14} className="text-[var(--muted)] shrink-0" />
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// MEMBERS
// ═════════════════════════════════════════════════════════════════════════════

function MembersView({ company, member, members, onRefresh, teams, onProfileClick }: {
  company: NonNullable<ReturnType<typeof useCompany>["currentCompany"]>
  member: OrganizationMember | null
  members: OrganizationMember[]
  onRefresh: () => Promise<void>
  teams: OrgTeam[]
  onProfileClick: (m: OrganizationMember) => void
}) {
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("Team Member")
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [filterRole, setFilterRole] = useState<string>("all")
  const [actionMenu, setActionMenu] = useState<string | null>(null)

  const filtered = members.filter(m => {
    const matchSearch = !search ||
      m.user_profiles?.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.user_profiles?.email?.toLowerCase().includes(search.toLowerCase())
    const matchRole = filterRole === "all" ||
      (filterRole === "admin" && (m.job_title?.includes("Admin") || m.user_id === company.created_by)) ||
      (filterRole === "member" && m.job_title === "Team Member") ||
      (filterRole === "guest" && m.job_title === "Guest")
    return matchSearch && matchRole
  })

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setError("")
    try {
      await inviteToCompany(company.id, inviteEmail.trim(), inviteRole)
      setInviteEmail("")
      setShowInvite(false)
      onRefresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to invite")
    } finally { setInviting(false) }
  }

  const handleRemove = async (userId: string) => {
    try {
      await removeCompanyMember(company.id, userId)
      setActionMenu(null)
      onRefresh()
    } catch (e) { console.error(e) }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-[900px] mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[20px] font-bold text-[var(--text)]">Members</h2>
          <p className="text-[12px] text-[var(--muted)] mt-0.5">{members.length} member{members.length !== 1 ? "s" : ""}</p>
        </div>
        {isCompanyAdmin(member, company) && (
          <button onClick={() => setShowInvite(!showInvite)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[var(--noska-blue)] text-white rounded-lg text-[12px] font-medium hover:opacity-90 transition-opacity cursor-pointer">
            <UserPlus size={13} /> Invite Member
          </button>
        )}
      </div>

      {/* Invite Form */}
      <AnimatePresence>
        {showInvite && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
            <div className="p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl space-y-3">
              <div className="flex gap-2">
                <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@company.com"
                  className="flex-1 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--noska-blue)]"
                  autoFocus onKeyDown={(e) => e.key === "Enter" && handleInvite()} />
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}
                  className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[12px] text-[var(--text)] outline-none cursor-pointer">
                  <option value="Team Member">Member</option>
                  <option value="Organization Admin">Admin</option>
                  <option value="Guest">Guest</option>
                </select>
              </div>
              {error && <p className="text-[11px] text-red-500">{error}</p>}
              <div className="flex justify-end gap-2">
                <button onClick={() => { setShowInvite(false); setError("") }} className="px-3 py-1.5 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text)] cursor-pointer">Cancel</button>
                <button onClick={handleInvite} disabled={!inviteEmail.trim() || inviting}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-[var(--noska-blue)] text-white rounded-lg text-[12px] font-medium hover:opacity-90 disabled:opacity-40 cursor-pointer">
                  {inviting && <Loader2 size={11} className="animate-spin" />} Send Invite
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg flex-1">
          <Search size={13} className="text-[var(--muted)]" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search members..."
            className="flex-1 bg-transparent text-[12px] text-[var(--text)] placeholder:text-[var(--muted)] outline-none" />
        </div>
        <div className="flex gap-1">
          {["all", "admin", "member", "guest"].map((f) => (
            <button
              key={f}
              onClick={() => setFilterRole(f)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                filterRole === f
                  ? "bg-[var(--noska-blue)]/10 text-[var(--noska-blue)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Member List */}
      <div className="space-y-1">
        {filtered.map((m) => {
          const badge = getRoleBadge(m.job_title)
          const isSelf = m.user_id === localStorage.getItem("noska_user_id")
          const isOrgOwner = m.user_id === company.created_by
          const canAct = isCompanyAdmin(member, company) && !isSelf && !isOrgOwner
          const memberTeams = teams.filter(t => t.id === m.primary_team_id)

          return (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--surface-2)] transition-colors group cursor-pointer"
              onClick={() => onProfileClick(m)}
            >
              <div className="w-9 h-9 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[11px] font-medium text-[var(--text)] shrink-0 overflow-hidden">
                {m.user_profiles?.avatar_url ? (
                  <img src={m.user_profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  (m.user_profiles?.user_name || m.user_id).slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-[var(--text)]">
                  {m.user_profiles?.user_name || "Unknown"}
                  {isSelf && <span className="text-[var(--muted)] ml-1.5 text-[11px]">(you)</span>}
                </div>
                <div className="text-[11px] text-[var(--muted)]">{m.user_profiles?.email || m.user_id}</div>
              </div>
              {memberTeams.length > 0 && (
                <div className="hidden md:flex items-center gap-1">
                  {memberTeams.slice(0, 2).map(t => (
                    <span key={t.id} className="text-[10px] text-[var(--muted)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded border border-[var(--border)]">
                      {t.icon} {t.name}
                    </span>
                  ))}
                </div>
              )}
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${badge.color} bg-[var(--surface-2)] border border-[var(--border)]`}>
                {badge.label}
              </span>
              <span className="text-[10px] text-[var(--muted)]">
                {m.status === "active" ? "Active" : m.status}
              </span>
              {canAct && (
                <div className="relative">
                  <button onClick={() => setActionMenu(actionMenu === m.id ? null : m.id)}
                    className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg hover:bg-[var(--hover)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] transition-all cursor-pointer">
                    <MoreHorizontal size={14} />
                  </button>
                  <AnimatePresence>
                    {actionMenu === m.id && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute right-0 top-full mt-1 z-10 w-[160px] bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden">
                        <button onClick={() => handleRemove(m.user_id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-red-500 hover:bg-red-500/5 transition-colors cursor-pointer text-left">
                          <UserMinus size={11} /> Remove Member
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <EmptyState
            icon={Users}
            title={search ? "No members match your search" : "No members yet"}
            description={search ? "Try a different search term." : "Invite your teammates to start collaborating."}
          />
        )}
      </div>
    </motion.div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// INVITATIONS
// ═════════════════════════════════════════════════════════════════════════════

function InvitationsView({ company, member, invitations, onRefresh }: {
  company: NonNullable<ReturnType<typeof useCompany>["currentCompany"]>
  member: OrganizationMember | null
  invitations: OrganizationInvitation[]
  onRefresh: () => Promise<void>
}) {
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("Team Member")
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState("")

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setError("")
    try {
      await inviteToCompany(company.id, inviteEmail.trim(), inviteRole)
      setInviteEmail("")
      setShowInvite(false)
      onRefresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to invite")
    } finally { setInviting(false) }
  }

  const handleRevoke = async (id: string) => {
    try { await revokeInvitation(id); onRefresh() }
    catch (e) { console.error(e) }
  }

  const pending = invitations.filter(i => i.status === "pending")
  const accepted = invitations.filter(i => i.status === "accepted")
  const others = invitations.filter(i => i.status !== "pending" && i.status !== "accepted")

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-[900px] mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[20px] font-bold text-[var(--text)]">Invitations</h2>
          <p className="text-[12px] text-[var(--muted)] mt-0.5">{pending.length} pending · {accepted.length} accepted</p>
        </div>
        {isCompanyAdmin(member, company) && (
          <button onClick={() => setShowInvite(!showInvite)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[var(--noska-blue)] text-white rounded-lg text-[12px] font-medium hover:opacity-90 transition-opacity cursor-pointer">
            <Send size={13} /> Invite
          </button>
        )}
      </div>

      {/* Invite Form */}
      <AnimatePresence>
        {showInvite && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
            <div className="p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl space-y-3">
              <div className="flex gap-2">
                <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@company.com"
                  className="flex-1 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--noska-blue)]"
                  autoFocus onKeyDown={(e) => e.key === "Enter" && handleInvite()} />
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}
                  className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[12px] text-[var(--text)] outline-none cursor-pointer">
                  <option value="Team Member">Member</option>
                  <option value="Organization Admin">Admin</option>
                  <option value="Guest">Guest</option>
                </select>
              </div>
              {error && <p className="text-[11px] text-red-500">{error}</p>}
              <div className="flex justify-end gap-2">
                <button onClick={() => { setShowInvite(false); setError("") }} className="px-3 py-1.5 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text)] cursor-pointer">Cancel</button>
                <button onClick={handleInvite} disabled={!inviteEmail.trim() || inviting}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-[var(--noska-blue)] text-white rounded-lg text-[12px] font-medium hover:opacity-90 disabled:opacity-40 cursor-pointer">
                  {inviting && <Loader2 size={11} className="animate-spin" />} Send Invite
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[12px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Pending ({pending.length})</h3>
          <div className="space-y-1">
            {pending.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--surface-2)] transition-colors group">
                <div className="w-8 h-8 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                  <Mail size={12} className="text-yellow-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-[var(--text)]">{inv.email}</div>
                  <div className="text-[11px] text-[var(--muted)]">
                    {inv.job_title} · Invited {new Date(inv.created_at).toLocaleDateString()}
                    {inv.expires_at && ` · Expires ${new Date(inv.expires_at).toLocaleDateString()}`}
                  </div>
                </div>
                <button onClick={() => handleRevoke(inv.id)}
                  className="opacity-0 group-hover:opacity-10 px-2 py-1 text-[11px] text-red-500 hover:bg-red-500/5 rounded transition-all cursor-pointer flex items-center gap-1">
                  <X size={11} /> Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accepted */}
      {accepted.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[12px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Accepted ({accepted.length})</h3>
          <div className="space-y-1">
            {accepted.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 px-4 py-3 rounded-xl opacity-70">
                <div className="w-8 h-8 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <Check size={12} className="text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-[var(--text)]">{inv.email}</div>
                  <div className="text-[11px] text-[var(--muted)]">
                    Accepted {inv.accepted_at ? new Date(inv.accepted_at).toLocaleDateString() : "—"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Others (expired, revoked) */}
      {others.length > 0 && (
        <div>
          <h3 className="text-[12px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Other ({others.length})</h3>
          <div className="space-y-1">
            {others.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 px-4 py-3 rounded-xl opacity-50">
                <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center">
                  {inv.status === "revoked" ? <X size={12} className="text-[var(--muted)]" /> : <Clock size={12} className="text-[var(--muted)]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-[var(--text)]">{inv.email}</div>
                  <div className="text-[11px] text-[var(--muted)] capitalize">{inv.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {invitations.length === 0 && (
        <EmptyState
          icon={Mail}
          title="No invitations yet"
          description="Invite team members to join this company."
          action={isCompanyAdmin(member, company) ? "Send Invitation" : undefined}
          onAction={() => setShowInvite(true)}
        />
      )}
    </motion.div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// AUDIT LOG
// ═════════════════════════════════════════════════════════════════════════════

function AuditView({ company, logs, loading }: {
  company: NonNullable<ReturnType<typeof useCompany>["currentCompany"]>
  logs: AuditLog[]
  loading: boolean
}) {
  const [search, setSearch] = useState("")
  const [filterAction, setFilterAction] = useState<string>("all")

  const actionMap: Record<string, { label: string; color: string; icon: React.FC<{ size: number; className?: string }> }> = {
    "organization.created": { label: "Created organization", color: "text-green-500", icon: Building2 },
    "member.joined": { label: "Member joined", color: "text-blue-500", icon: Users },
    "member.invited": { label: "Member invited", color: "text-yellow-500", icon: Mail },
    "member.removed": { label: "Member removed", color: "text-red-500", icon: UserMinus },
    "team.created": { label: "Team created", color: "text-purple-500", icon: Building2 },
    "project.created": { label: "Project created", color: "text-orange-500", icon: FolderKanban },
  }

  const actionTypes = ["all", ...new Set(logs.map(l => l.action))]

  const filtered = logs.filter(l => {
    const matchSearch = !search || l.action.includes(search) || JSON.stringify(l.details).toLowerCase().includes(search.toLowerCase())
    const matchFilter = filterAction === "all" || l.action === filterAction
    return matchSearch && matchFilter
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-[900px] mx-auto p-8">
      <h2 className="text-[20px] font-bold text-[var(--text)] mb-6">Audit Log</h2>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg flex-1">
          <Search size={13} className="text-[var(--muted)]" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search audit log..."
            className="flex-1 bg-transparent text-[12px] text-[var(--text)] placeholder:text-[var(--muted)] outline-none" />
        </div>
        <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}
          className="px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[12px] text-[var(--text)] outline-none cursor-pointer">
          {actionTypes.map(a => (
            <option key={a} value={a}>{a === "all" ? "All actions" : (actionMap[a]?.label || a)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-[var(--muted)]" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Clock}
          title={search || filterAction !== "all" ? "No matching entries" : "No activity yet"}
          description={search || filterAction !== "all" ? "Try adjusting your filters." : "Audit events will appear here as team members take actions."}
        />
      ) : (
        <div className="space-y-0.5">
          {filtered.map((log) => {
            const config = actionMap[log.action] || { label: log.action, color: "text-[var(--muted)]", icon: Clock }
            const IconComp = config.icon
            return (
              <div key={log.id} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--surface-2)] transition-colors">
                <div className={`w-7 h-7 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center shrink-0`}>
                  <IconComp size={12} className={config.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] text-[var(--text)]">{config.label}</span>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <span className="text-[11px] text-[var(--muted)] ml-2">
                      {Object.entries(log.details).slice(0, 2).map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-[var(--muted)] shrink-0">
                  {formatRelativeTime(log.created_at)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// SETTINGS
// ═════════════════════════════════════════════════════════════════════════════

function SettingsView({ company, member, onBack, isOwner }: {
  company: NonNullable<ReturnType<typeof useCompany>["currentCompany"]>
  member: OrganizationMember | null
  onBack: () => void
  isOwner: boolean
}) {
  const { refreshCompany } = useCompany()
  const [name, setName] = useState(company.name)
  const [description, setDescription] = useState(company.description)
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteText, setDeleteText] = useState("")
  const [activeTab, setActiveTab] = useState<"general" | "security" | "webhooks" | "apiKeys" | "data" | "danger">("general")

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateCompany(company.id, { name, description })
      await refreshCompany()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (deleteText !== company.name) return
    try { await deleteCompany(company.id); onBack() }
    catch (e) { console.error(e) }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-[700px] mx-auto p-8">
      <h2 className="text-[20px] font-bold text-[var(--text)] mb-6">Settings</h2>

      {/* Settings Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[var(--border)] pb-px">
        {[
          { id: "general" as const, label: "General" },
          { id: "security" as const, label: "Security" },
          { id: "webhooks" as const, label: "Webhooks" },
          { id: "apiKeys" as const, label: "API Keys" },
          { id: "data" as const, label: "Data" },
          { id: "danger" as const, label: "Danger Zone" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-[12px] font-medium transition-colors cursor-pointer border-b-2 -mb-px ${
              activeTab === tab.id
                ? "text-[var(--noska-blue)] border-[var(--noska-blue)]"
                : "text-[var(--muted)] border-transparent hover:text-[var(--text)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "general" && (
        <div className="p-5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-[var(--text-secondary)]">Company Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--text)] outline-none focus:border-[var(--noska-blue)]" />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-[var(--text-secondary)]">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--text)] outline-none focus:border-[var(--noska-blue)] resize-none" />
          </div>
          <div className="flex justify-end">
            <button onClick={handleSave} disabled={saving || (name === company.name && description === company.description)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[var(--noska-blue)] text-white rounded-lg text-[12px] font-medium hover:opacity-90 disabled:opacity-40 cursor-pointer">
              {saving && <Loader2 size={11} className="animate-spin" />} Save Changes
            </button>
          </div>
        </div>
      )}

      {activeTab === "security" && (
        <div className="space-y-6">
          <SecuritySettings />
        </div>
      )}

      {activeTab === "webhooks" && (
        <div className="space-y-6">
          <WebhookManager />
        </div>
      )}

      {activeTab === "apiKeys" && (
        <div className="space-y-6">
          <APIKeyManager />
        </div>
      )}

      {activeTab === "data" && (
        <div className="space-y-6">
          <DataExport />
        </div>
      )}

      {activeTab === "danger" && isOwner && (
        <div className="p-5 rounded-xl border border-red-500/20 space-y-3">
          <h3 className="text-[14px] font-semibold text-red-500">Danger Zone</h3>
          <p className="text-[12px] text-[var(--muted)]">Permanently delete this company and all its data. This action cannot be undone.</p>
          {!showDelete ? (
            <button onClick={() => setShowDelete(true)}
              className="px-4 py-2 border border-red-500/30 text-red-500 rounded-lg text-[12px] hover:bg-red-500/5 transition-colors cursor-pointer">
              Delete Company
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-[12px] text-[var(--muted)]">Type <span className="font-mono font-bold text-red-500">{company.name}</span> to confirm:</p>
              <div className="flex gap-2">
                <input type="text" value={deleteText} onChange={(e) => setDeleteText(e.target.value)} placeholder={company.name}
                  className="flex-1 px-3 py-2 bg-[var(--surface)] border border-red-500/30 rounded-lg text-[13px] text-[var(--text)] outline-none focus:border-red-500" />
                <button onClick={handleDelete} disabled={deleteText !== company.name}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg text-[12px] font-medium hover:opacity-90 disabled:opacity-40 cursor-pointer">
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "danger" && !isOwner && (
        <div className="py-8 text-center">
          <Shield size={24} className="mx-auto mb-2 text-[var(--muted)]" />
          <p className="text-[13px] text-[var(--muted)]">Only the company owner can access danger zone settings.</p>
        </div>
      )}
    </motion.div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// TASKS VIEW
// ═════════════════════════════════════════════════════════════════════════════

function TasksView({ company, member }: {
  company: NonNullable<ReturnType<typeof useCompany>["currentCompany"]>
  member: OrganizationMember | null
}) {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "assigned" | "created">("assigned")

  useEffect(() => {
    const fetch = async () => {
      try {
        let q = (supabase as any).from("tasks").select("*").eq("organization_id", company.id)
        if (filter === "assigned") q = q.eq("assignee_id", member?.user_id)
        if (filter === "created") q = q.eq("created_by", member?.user_id)
        const { data } = await q.order("created_at", { ascending: false }).limit(50)
        setTasks(data || [])
      } catch { setTasks([]) }
      finally { setLoading(false) }
    }
    fetch()
  }, [company.id, member?.user_id, filter])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[20px] font-bold text-[var(--text)]">Tasks</h2>
        <div className="flex gap-1 bg-[var(--surface-2)] rounded-xl p-0.5">
          {(["all", "assigned", "created"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition cursor-pointer ${filter === f ? "bg-[var(--surface)] text-[var(--text)] shadow-xs" : "text-[var(--muted)]"}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-[var(--muted)]" /></div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12">
          <CheckSquare size={32} className="text-[var(--muted)] mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-[var(--text)] mb-1">No tasks</p>
          <p className="text-[12px] text-[var(--muted)]">Tasks from your pages will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(t => (
            <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-2)] transition">
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${t.status === "done" ? "bg-green-500 border-green-500" : "border-[var(--border)]"}`}>
                {t.status === "done" && <Check size={10} className="text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[12px] font-medium ${t.status === "done" ? "line-through text-[var(--muted)]" : "text-[var(--text)]"}`}>{t.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {t.priority && <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${t.priority === "urgent" ? "text-red-500 bg-red-500/10" : t.priority === "high" ? "text-orange-500 bg-orange-500/10" : "text-[var(--muted)] bg-[var(--surface-2)]"}`}>{t.priority}</span>}
                  {t.due_date && <span className="text-[9px] text-[var(--muted)]">Due {new Date(t.due_date).toLocaleDateString()}</span>}
                </div>
              </div>
              <div className={`px-2 py-0.5 rounded text-[9px] font-semibold ${t.status === "done" ? "text-green-500 bg-green-500/10" : t.status === "in_progress" ? "text-blue-500 bg-blue-500/10" : "text-[var(--muted)] bg-[var(--surface-2)]"}`}>
                {t.status?.replace("_", " ") || "To Do"}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// ANALYTICS VIEW
// ═════════════════════════════════════════════════════════════════════════════

function AnalyticsView({ company }: {
  company: NonNullable<ReturnType<typeof useCompany>["currentCompany"]>
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6">
      <h2 className="text-[20px] font-bold text-[var(--text)] mb-6">Analytics</h2>
      <UsageAnalytics />
    </motion.div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// SECURITY VIEW
// ═════════════════════════════════════════════════════════════════════════════

function SecurityView({ company }: {
  company: NonNullable<ReturnType<typeof useCompany>["currentCompany"]>
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6">
      <h2 className="text-[20px] font-bold text-[var(--text)] mb-6">Security</h2>
      <div className="max-w-[700px] space-y-6">
        <SecuritySettings />
        <div className="border-t border-[var(--border)] pt-6">
          <h3 className="text-[14px] font-bold text-[var(--text)] mb-4">API Keys</h3>
          <APIKeyManager />
        </div>
        <div className="border-t border-[var(--border)] pt-6">
          <h3 className="text-[14px] font-bold text-[var(--text)] mb-4">Webhooks</h3>
          <WebhookManager />
        </div>
      </div>
    </motion.div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// COMPLIANCE VIEW
// ═════════════════════════════════════════════════════════════════════════════

function ComplianceView({ company }: {
  company: NonNullable<ReturnType<typeof useCompany>["currentCompany"]>
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6">
      <h2 className="text-[20px] font-bold text-[var(--text)] mb-6">Compliance & Data</h2>
      <div className="max-w-[900px] space-y-6">
        <ComplianceLog />
        <div className="border-t border-[var(--border)] pt-6">
          <DataExport />
        </div>
      </div>
    </motion.div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═════════════════════════════════════════════════════════════════════════════

function VisibilityBadge({ visibility }: { visibility: string }) {
  const config: Record<string, { icon: React.FC<{ size: number; className?: string }>; label: string; color: string }> = {
    private: { icon: Lock, label: "Private", color: "text-gray-400" },
    team: { icon: Users, label: "Team", color: "text-blue-400" },
    company: { icon: Building2, label: "Company", color: "text-purple-400" },
    public: { icon: Globe, label: "Public", color: "text-green-400" },
  }
  const c = config[visibility] || config.private
  const Icon = c.icon
  return (
    <span className={`flex items-center gap-1 text-[10px] ${c.color}`}>
      <Icon size={10} />
      {c.label}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string }> = {
    active: { color: "text-green-500 bg-green-500/10 border-green-500/20" },
    completed: { color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
    paused: { color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" },
    archived: { color: "text-gray-400 bg-gray-400/10 border-gray-400/20" },
    cancelled: { color: "text-red-500 bg-red-500/10 border-red-500/20" },
  }
  const c = config[status] || config.active
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${c.color}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, { color: string }> = {
    urgent: { color: "text-red-500 bg-red-500/10 border-red-500/20" },
    high: { color: "text-orange-500 bg-orange-500/10 border-orange-500/20" },
    medium: { color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" },
    low: { color: "text-green-500 bg-green-500/10 border-green-500/20" },
  }
  const c = config[priority] || config.medium
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${c.color}`}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  )
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}
