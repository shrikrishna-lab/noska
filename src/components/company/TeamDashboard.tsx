import React, { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Users, FileText, MessageSquare, ListChecks, Target, Calendar,
  Activity, Settings, Loader2, Plus, Send, Paperclip, Smile,
  MoreHorizontal, Pin, Trash2, Edit2, Check, Clock, AlertCircle,
  Circle, ArrowUpRight, Star, Hash, Image, Link as LinkIcon, X,
  ChevronDown, Filter, Search, GripVertical, Archive, Eye, EyeOff,
  Bell, BellOff, PinOff, Upload, Download, FolderOpen, File,
  BarChart3, TrendingUp, CheckCircle2, CircleDot, Timer, Zap,
  Bookmark, Flag, Tag, SortAsc, LayoutGrid, List, GanttChart
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useCompany } from "../../contexts/CompanyContext"
import {
  getCompanyTeamMembers, getCompanyMembers,
  addCompanyTeamMember, removeCompanyTeamMember,
  getOrgPages, writeAuditLog,
  type OrgTeam, type OrgTeamMember, type OrganizationMember, type OrgPage
} from "../../lib/company"
import { isCompanyAdmin } from "../../lib/companyAuth"

// ═════════════════════════════════════════════════════════════════════════════
// TEAM DASHBOARD — Main tabbed interface
// ═════════════════════════════════════════════════════════════════════════════

type TeamTab = "overview" | "tasks" | "chat" | "files" | "goals" | "calendar" | "activity" | "settings"

interface TeamDashboardProps {
  teamId: string
  company: NonNullable<ReturnType<typeof useCompany>["currentCompany"]>
  member: OrganizationMember | null
  onBack: () => void
  onSettings?: (team: OrgTeam) => void
}

export function TeamDashboard({ teamId, company, member, onBack, onSettings }: TeamDashboardProps) {
  const [team, setTeam] = useState<OrgTeam | null>(null)
  const [teamMembers, setTeamMembers] = useState<(OrgTeamMember & { member?: OrganizationMember })[]>([])
  const [allMembers, setAllMembers] = useState<OrganizationMember[]>([])
  const [teamPages, setTeamPages] = useState<OrgPage[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TeamTab>("overview")
  const isAdmin = isCompanyAdmin(member, company)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [teamData, members, pages, allMems] = await Promise.all([
        (supabase as any).from("company_teams").select("*").eq("id", teamId).single(),
        getCompanyTeamMembers(teamId),
        getOrgPages(company.id),
        getCompanyMembers(company.id),
      ])
      setTeam(teamData as any)
      setTeamMembers(members as any)
      setTeamPages(pages.filter(p => p.team_id === teamId))
      setAllMembers(allMems)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [teamId, company.id])

  useEffect(() => { loadData() }, [loadData])

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 size={24} className="animate-spin text-[var(--muted)]" /></div>
  if (!team) return <div className="flex items-center justify-center h-full"><p className="text-[13px] text-[var(--muted)]">Team not found</p></div>

  const tabs: { id: TeamTab; label: string; icon: any; badge?: number }[] = [
    { id: "overview", label: "Overview", icon: Users },
    { id: "tasks", label: "Tasks", icon: ListChecks },
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "files", label: "Files", icon: FolderOpen },
    { id: "goals", label: "Goals", icon: Target },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "activity", label: "Activity", icon: Activity },
    ...(isAdmin ? [{ id: "settings" as TeamTab, label: "Settings", icon: Settings }] : []),
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: (team.color || "#6366f1") + "20" }}>
            {team.icon || "👥"}
          </div>
          <div className="flex-1">
            <h1 className="text-[18px] font-bold text-[var(--text)]">{team.name}</h1>
            {team.description && <p className="text-[12px] text-[var(--muted)]">{team.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[var(--muted)] px-2 py-1 bg-[var(--surface-2)] rounded-lg">
              {teamMembers.length} member{teamMembers.length !== 1 ? "s" : ""}
            </span>
            <span className="text-[11px] text-[var(--muted)] px-2 py-1 bg-[var(--surface-2)] rounded-lg">
              {teamPages.length} page{teamPages.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? "bg-[var(--surface-2)] text-[var(--text)]"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              <tab.icon size={12} />
              {tab.label}
              {tab.badge ? <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-[var(--accent)] text-white text-[8px]">{tab.badge}</span> : null}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === "overview" && <TeamOverview key="overview" team={team} members={teamMembers} pages={teamPages} />}
          {activeTab === "tasks" && <TeamTaskBoard key="tasks" teamId={teamId} companyId={company.id} members={teamMembers} member={member} />}
          {activeTab === "chat" && <TeamChat key="chat" teamId={teamId} companyId={company.id} member={member} teamName={team.name} />}
          {activeTab === "files" && <TeamFiles key="files" teamId={teamId} companyId={company.id} pages={teamPages} />}
          {activeTab === "goals" && <TeamGoalsBoard key="goals" teamId={teamId} companyId={company.id} member={member} />}
          {activeTab === "calendar" && <TeamCalendarView key="calendar" teamId={teamId} companyId={company.id} />}
          {activeTab === "activity" && <TeamActivityFeed key="activity" teamId={teamId} companyId={company.id} members={teamMembers} />}
          {activeTab === "settings" && isAdmin && <TeamSettingsPanel key="settings" team={team} members={teamMembers} allMembers={allMembers} onRefresh={loadData} />}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// OVERVIEW
// ═════════════════════════════════════════════════════════════════════════════

function TeamOverview({ team, members, pages }: {
  team: OrgTeam
  members: (OrgTeamMember & { member?: OrganizationMember })[]
  pages: OrgPage[]
}) {
  const recentPages = [...pages].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 5)
  const pinnedPages = pages.filter(p => (p as any).pinned).slice(0, 5)

  return (
    <div className="p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Members", value: members.length, icon: Users, color: "text-blue-500" },
          { label: "Pages", value: pages.length, icon: FileText, color: "text-green-500" },
          { label: "Active", value: members.filter(m => !m.left_at).length, icon: Zap, color: "text-amber-500" },
          { label: "This Week", value: pages.filter(p => new Date(p.updated_at) > new Date(Date.now() - 7 * 86400000)).length, icon: TrendingUp, color: "text-purple-500" },
        ].map(s => (
          <div key={s.label} className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
            <s.icon size={14} className={`${s.color} mb-1`} />
            <p className="text-[18px] font-bold text-[var(--text)]">{s.value}</p>
            <p className="text-[10px] text-[var(--muted)]">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Members */}
        <div>
          <h3 className="text-[13px] font-semibold text-[var(--text)] mb-3">Members</h3>
          <div className="space-y-1">
              {members.slice(0, 8).map(tm => {
              const m = tm.member
              return (
                <div key={tm.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--surface-2)] transition">
                  <div className="w-7 h-7 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[9px] font-medium overflow-hidden shrink-0">
                    {m?.user_profiles?.avatar_url ? (
                      <img src={m.user_profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (m?.user_profiles?.user_name || "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-[var(--text)] truncate">{m?.user_profiles?.user_name || "Unknown"}</p>
                    <p className="text-[9px] text-[var(--muted)] capitalize">{tm.role}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${!tm.left_at ? "bg-green-500" : "bg-gray-400"}`} />
                </div>
              )
            })}
            {members.length > 8 && <p className="text-[10px] text-[var(--muted)] text-center py-1">+{members.length - 8} more</p>}
          </div>
        </div>

        {/* Recent Pages */}
        <div>
          <h3 className="text-[13px] font-semibold text-[var(--text)] mb-3">Recent Pages</h3>
          {recentPages.length === 0 ? (
            <div className="py-6 text-center bg-[var(--surface-2)] rounded-xl border border-[var(--border)]">
              <FileText size={16} className="mx-auto mb-1 text-[var(--muted)]" />
              <p className="text-[10px] text-[var(--muted)]">No pages yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentPages.map(page => (
                <div key={page.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--surface-2)] transition cursor-pointer">
                  <span className="text-sm">{page.icon || "📝"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-[var(--text)] truncate">{page.title}</p>
                    <p className="text-[9px] text-[var(--muted)]">{new Date(page.updated_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// TEAM TASK BOARD (Kanban)
// ═════════════════════════════════════════════════════════════════════════════

const TASK_COLUMNS = [
  { id: "backlog", label: "Backlog", icon: Circle, color: "text-gray-400", bg: "bg-gray-500/10" },
  { id: "todo", label: "To Do", icon: CircleDot, color: "text-blue-400", bg: "bg-blue-500/10" },
  { id: "in_progress", label: "In Progress", icon: Timer, color: "text-amber-400", bg: "bg-amber-500/10" },
  { id: "review", label: "Review", icon: Eye, color: "text-purple-400", bg: "bg-purple-500/10" },
  { id: "done", label: "Done", icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/10" },
]

interface TeamTask {
  id: string
  title: string
  status: string
  priority: string
  assignee_id: string | null
  due_date: string | null
  description: string | null
  tags: string[]
  created_at: string
}

function TeamTaskBoard({ teamId, companyId, members, member }: {
  teamId: string
  companyId: string
  members: (OrgTeamMember & { member?: OrganizationMember })[]
  member: OrganizationMember | null
}) {
  const [tasks, setTasks] = useState<TeamTask[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newPriority, setNewPriority] = useState("medium")
  const [newAssignee, setNewAssignee] = useState<string | null>(null)
  const [filterAssignee, setFilterAssignee] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [dragTask, setDragTask] = useState<string | null>(null)

  const loadTasks = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("team_tasks")
        .select("*")
        .eq("team_id", teamId)
        .order("created_at", { ascending: false })
      setTasks(data || [])
    } catch { setTasks([]) }
    finally { setLoading(false) }
  }, [teamId])

  useEffect(() => { loadTasks() }, [loadTasks])

  const handleCreate = async () => {
    if (!newTitle.trim()) return
    try {
      await (supabase as any).from("team_tasks").insert({
        team_id: teamId,
        organization_id: companyId,
        title: newTitle.trim(),
        status: "backlog",
        priority: newPriority,
        assignee_id: newAssignee,
        created_by: member?.user_id,
        tags: [],
      })
      setNewTitle(""); setNewPriority("medium"); setNewAssignee(null); setShowCreate(false)
      loadTasks()
    } catch (e) { console.error(e) }
  }

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await (supabase as any).from("team_tasks").update({ status: newStatus }).eq("id", taskId)
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    } catch (e) { console.error(e) }
  }

  const handleDelete = async (taskId: string) => {
    try {
      await (supabase as any).from("team_tasks").delete().eq("id", taskId)
      setTasks(prev => prev.filter(t => t.id !== taskId))
    } catch (e) { console.error(e) }
  }

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDragTask(taskId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault()
    if (dragTask) {
      handleStatusChange(dragTask, status)
      setDragTask(null)
    }
  }

  const filteredTasks = tasks.filter(t => {
    if (filterAssignee !== "all" && t.assignee_id !== filterAssignee) return false
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const priorityColors: Record<string, string> = {
    urgent: "text-red-500 bg-red-500/10",
    high: "text-orange-500 bg-orange-500/10",
    medium: "text-yellow-500 bg-yellow-500/10",
    low: "text-green-500 bg-green-500/10",
  }

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
          <Search size={12} className="text-[var(--muted)]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..." className="bg-transparent text-[11px] text-[var(--text)] focus:outline-none w-40" />
        </div>
        <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} className="px-2 py-1.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[10px] text-[var(--text)] cursor-pointer">
          <option value="all">All members</option>
          {members.map(m => (
            <option key={m.member?.user_id} value={m.member?.user_id}>{m.member?.user_profiles?.user_name || "Unknown"}</option>
          ))}
        </select>
        <div className="flex-1" />
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 px-3 py-1.5 bg-[var(--accent)] text-white rounded-lg text-[11px] font-semibold cursor-pointer">
          <Plus size={12} /> New Task
        </button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
            <div className="p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl space-y-3">
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Task title..." className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[12px] text-[var(--text)]" autoFocus onKeyDown={e => e.key === "Enter" && handleCreate()} />
              <div className="flex gap-2">
                <select value={newPriority} onChange={e => setNewPriority(e.target.value)} className="px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[10px] text-[var(--text)] cursor-pointer">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <select value={newAssignee || ""} onChange={e => setNewAssignee(e.target.value || null)} className="px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[10px] text-[var(--text)] cursor-pointer">
                  <option value="">Unassigned</option>
                  {members.map(m => (
                    <option key={m.member?.user_id} value={m.member?.user_id}>{m.member?.user_profiles?.user_name || "Unknown"}</option>
                  ))}
                </select>
                <div className="flex-1" />
                <button onClick={handleCreate} disabled={!newTitle.trim()} className="px-3 py-1.5 bg-[var(--accent)] text-white rounded-lg text-[10px] font-semibold disabled:opacity-50 cursor-pointer">Create</button>
                <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 bg-[var(--surface)] text-[var(--muted)] rounded-lg text-[10px] font-semibold cursor-pointer">Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 size={20} className="animate-spin text-[var(--muted)]" /></div>
      ) : (
        <div className="flex gap-3 flex-1 overflow-x-auto pb-4">
          {TASK_COLUMNS.map(col => {
            const colTasks = filteredTasks.filter(t => t.status === col.id)
            return (
              <div
                key={col.id}
                className="flex-1 min-w-[220px] max-w-[280px]"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${col.bg} mb-2`}>
                  <col.icon size={12} className={col.color} />
                  <span className={`text-[11px] font-semibold ${col.color}`}>{col.label}</span>
                  <span className="ml-auto text-[9px] text-[var(--muted)] bg-[var(--surface)] px-1.5 py-0.5 rounded-full">{colTasks.length}</span>
                </div>
                <div className="space-y-1.5 min-h-[100px]">
                  {colTasks.map(task => {
                    const assignee = members.find(m => m.member?.user_id === task.assignee_id)
                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        className={`p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] cursor-grab active:cursor-grabbing hover:border-[var(--accent)]/30 transition group ${dragTask === task.id ? "opacity-50" : ""}`}
                      >
                        <div className="flex items-start justify-between mb-1.5">
                          <p className="text-[11px] font-medium text-[var(--text)] flex-1">{task.title}</p>
                          <button onClick={() => handleDelete(task.id)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/10 text-[var(--muted)] hover:text-red-500 transition cursor-pointer ml-1">
                            <Trash2 size={10} />
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold ${priorityColors[task.priority] || priorityColors.medium}`}>{task.priority}</span>
                          {task.due_date && (
                            <span className="text-[8px] text-[var(--muted)] flex items-center gap-0.5">
                              <Calendar size={8} />{new Date(task.due_date).toLocaleDateString()}
                            </span>
                          )}
                          {assignee && (
                            <div className="ml-auto w-5 h-5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[7px] font-bold overflow-hidden">
                              {assignee.member?.user_profiles?.avatar_url ? (
                                <img src={assignee.member.user_profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (assignee.member?.user_profiles?.user_name || "?").slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {colTasks.length === 0 && (
                    <div className="py-4 text-center text-[10px] text-[var(--muted)] border border-dashed border-[var(--border)] rounded-xl">
                      Drop tasks here
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// TEAM CHAT
// ═════════════════════════════════════════════════════════════════════════════

interface ChatMessage {
  id: string
  content: string
  sender_id: string
  sender_name: string
  sender_avatar: string | null
  created_at: string
  pinned: boolean
  reactions: Record<string, string[]>
  reply_to: string | null
}

function TeamChat({ teamId, companyId, member, teamName }: {
  teamId: string
  companyId: string
  member: OrganizationMember | null
  teamName: string
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null)

  const loadMessages = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("team_messages")
        .select("*")
        .eq("team_id", teamId)
        .order("created_at", { ascending: true })
        .limit(200)
      setMessages(data || [])
    } catch { setMessages([]) }
    finally { setLoading(false) }
  }, [teamId])

  useEffect(() => { loadMessages() }, [loadMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`team-chat-${teamId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "team_messages", filter: `team_id=eq.${teamId}` }, (payload: any) => {
        setMessages(prev => [...prev, payload.new as ChatMessage])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [teamId])

  const handleSend = async () => {
    if (!newMessage.trim() || !member) return
    setSending(true)
    try {
      await (supabase as any).from("team_messages").insert({
        team_id: teamId,
        organization_id: companyId,
        content: newMessage.trim(),
        sender_id: member.user_id,
        sender_name: member.user_profiles?.user_name || "Unknown",
        sender_avatar: member.user_profiles?.avatar_url || null,
        pinned: false,
        reactions: {},
        reply_to: null,
      })
      setNewMessage("")
    } catch (e) { console.error(e) }
    finally { setSending(false) }
  }

  const handleReact = async (msgId: string, emoji: string) => {
    const msg = messages.find(m => m.id === msgId)
    if (!msg || !member) return
    const reactions = { ...msg.reactions }
    if (!reactions[emoji]) reactions[emoji] = []
    if (reactions[emoji].includes(member.user_id)) {
      reactions[emoji] = reactions[emoji].filter(id => id !== member.user_id)
      if (reactions[emoji].length === 0) delete reactions[emoji]
    } else {
      reactions[emoji].push(member.user_id)
    }
    try {
      await (supabase as any).from("team_messages").update({ reactions }).eq("id", msgId)
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reactions } : m))
    } catch (e) { console.error(e) }
  }

  const handlePin = async (msgId: string) => {
    const msg = messages.find(m => m.id === msgId)
    if (!msg) return
    try {
      await (supabase as any).from("team_messages").update({ pinned: !msg.pinned }).eq("id", msgId)
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, pinned: !m.pinned } : m))
    } catch (e) { console.error(e) }
  }

  const handleDelete = async (msgId: string) => {
    try {
      await (supabase as any).from("team_messages").delete().eq("id", msgId)
      setMessages(prev => prev.filter(m => m.id !== msgId))
    } catch (e) { console.error(e) }
  }

  const quickEmojis = ["👍", "❤️", "😂", "🎉", "🔥", "👀", "✅", "💯"]

  const pinnedMessages = messages.filter(m => m.pinned)

  if (loading) return <div className="flex-1 flex items-center justify-center"><Loader2 size={20} className="animate-spin text-[var(--muted)]" /></div>

  return (
    <div className="flex flex-col h-full">
      {/* Pinned messages */}
      {pinnedMessages.length > 0 && (
        <div className="px-4 py-2 bg-amber-500/5 border-b border-amber-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <Pin size={10} className="text-amber-500" />
            <span className="text-[9px] font-semibold text-amber-600">Pinned</span>
          </div>
          {pinnedMessages.slice(0, 2).map(pm => (
            <p key={pm.id} className="text-[10px] text-[var(--text)] truncate">{pm.sender_name}: {pm.content}</p>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <MessageSquare size={32} className="text-[var(--muted)] mb-2" />
            <p className="text-[13px] font-semibold text-[var(--text)]">Start a conversation</p>
            <p className="text-[11px] text-[var(--muted)]">Messages in {teamName} are visible to all team members</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isOwn = msg.sender_id === member?.user_id
            const showAvatar = i === 0 || messages[i - 1].sender_id !== msg.sender_id
            const reactionEntries = Object.entries(msg.reactions || {}).filter(([, users]) => users.length > 0)
            return (
              <div key={msg.id} className={`group flex gap-2.5 ${!showAvatar ? "ml-9" : ""} ${msg.pinned ? "bg-amber-500/5 -mx-2 px-2 py-1 rounded-lg" : ""}`}>
                {showAvatar && (
                  <div className="w-7 h-7 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[9px] font-bold overflow-hidden shrink-0">
                    {msg.sender_avatar ? (
                      <img src={msg.sender_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (msg.sender_name || "?").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {showAvatar && (
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-semibold text-[var(--text)]">{msg.sender_name}</span>
                      <span className="text-[9px] text-[var(--muted)]">{new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      {msg.pinned && <Pin size={9} className="text-amber-500" />}
                    </div>
                  )}
                  <p className="text-[12px] text-[var(--text)] break-words">{msg.content}</p>
                  {reactionEntries.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {reactionEntries.map(([emoji, users]) => (
                        <button
                          key={emoji}
                          onClick={() => handleReact(msg.id, emoji)}
                          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] border transition cursor-pointer ${
                            users.includes(member?.user_id || "")
                              ? "bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)]"
                              : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]/30"
                          }`}
                        >
                          {emoji} {users.length}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Actions */}
                <div className="opacity-0 group-hover:opacity-100 flex items-start gap-0.5 transition shrink-0">
                  <div className="relative">
                    <button onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)} className="p-1 rounded hover:bg-[var(--surface-2)] text-[var(--muted)] cursor-pointer" title="React">
                      <Smile size={11} />
                    </button>
                    {showEmojiPicker === msg.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(null)} />
                        <div className="absolute right-0 top-full mt-1 z-50 flex gap-0.5 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl">
                          {quickEmojis.map(e => (
                            <button key={e} onClick={() => { handleReact(msg.id, e); setShowEmojiPicker(null) }} className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--surface-2)] text-sm cursor-pointer">{e}</button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <button onClick={() => handlePin(msg.id)} className="p-1 rounded hover:bg-[var(--surface-2)] text-[var(--muted)] cursor-pointer" title={msg.pinned ? "Unpin" : "Pin"}>
                    {msg.pinned ? <PinOff size={11} /> : <Pin size={11} />}
                  </button>
                  {isOwn && (
                    <button onClick={() => handleDelete(msg.id)} className="p-1 rounded hover:bg-red-500/10 text-[var(--muted)] hover:text-red-500 cursor-pointer" title="Delete">
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-[var(--border)]">
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface-2)] rounded-xl border border-[var(--border)] focus-within:border-[var(--accent)]/30 transition">
          <input
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={`Message ${teamName}...`}
            className="flex-1 bg-transparent text-[12px] text-[var(--text)] focus:outline-none"
            disabled={sending}
          />
          <button onClick={handleSend} disabled={!newMessage.trim() || sending} className="p-1.5 rounded-lg bg-[var(--accent)] text-white disabled:opacity-30 cursor-pointer transition">
            <Send size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// TEAM FILES
// ═════════════════════════════════════════════════════════════════════════════

function TeamFiles({ teamId, companyId, pages }: {
  teamId: string
  companyId: string
  pages: OrgPage[]
}) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [search, setSearch] = useState("")

  const filtered = pages.filter(p =>
    !search || p.title?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] flex-1">
          <Search size={12} className="text-[var(--muted)]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search files..." className="bg-transparent text-[11px] text-[var(--text)] focus:outline-none flex-1" />
        </div>
        <div className="flex gap-0.5 bg-[var(--surface-2)] rounded-lg p-0.5">
          <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded cursor-pointer transition ${viewMode === "grid" ? "bg-[var(--surface)] text-[var(--text)]" : "text-[var(--muted)]"}`}><LayoutGrid size={12} /></button>
          <button onClick={() => setViewMode("list")} className={`p-1.5 rounded cursor-pointer transition ${viewMode === "list" ? "bg-[var(--surface)] text-[var(--text)]" : "text-[var(--muted)]"}`}><List size={12} /></button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen size={32} className="text-[var(--muted)] mx-auto mb-2" />
          <p className="text-[13px] font-semibold text-[var(--text)]">No files</p>
          <p className="text-[11px] text-[var(--muted)]">Assign pages to this team to see them here</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-3 gap-3">
          {filtered.map(page => (
            <div key={page.id} className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)]/30 transition cursor-pointer">
              <span className="text-2xl">{page.icon || "📄"}</span>
              <p className="text-[12px] font-medium text-[var(--text)] mt-2 truncate">{page.title}</p>
              <p className="text-[9px] text-[var(--muted)] mt-0.5">{new Date(page.updated_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map(page => (
            <div key={page.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--surface-2)] transition cursor-pointer">
              <span className="text-lg">{page.icon || "📄"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-[var(--text)] truncate">{page.title}</p>
              </div>
              <p className="text-[10px] text-[var(--muted)]">{new Date(page.updated_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// TEAM GOALS
// ═════════════════════════════════════════════════════════════════════════════

interface TeamGoal {
  id: string
  title: string
  description: string | null
  progress: number
  status: "not_started" | "in_progress" | "completed" | "cancelled"
  due_date: string | null
  created_at: string
}

function TeamGoalsBoard({ teamId, companyId, member }: {
  teamId: string
  companyId: string
  member: OrganizationMember | null
}) {
  const [goals, setGoals] = useState<TeamGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [newDueDate, setNewDueDate] = useState("")

  const loadGoals = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("team_goals")
        .select("*")
        .eq("team_id", teamId)
        .order("created_at", { ascending: false })
      setGoals(data || [])
    } catch { setGoals([]) }
    finally { setLoading(false) }
  }, [teamId])

  useEffect(() => { loadGoals() }, [loadGoals])

  const handleCreate = async () => {
    if (!newTitle.trim()) return
    try {
      await (supabase as any).from("team_goals").insert({
        team_id: teamId,
        organization_id: companyId,
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        progress: 0,
        status: "not_started",
        due_date: newDueDate || null,
        created_by: member?.user_id,
      })
      setNewTitle(""); setNewDesc(""); setNewDueDate(""); setShowCreate(false)
      loadGoals()
    } catch (e) { console.error(e) }
  }

  const handleUpdateProgress = async (goalId: string, progress: number) => {
    const status = progress >= 100 ? "completed" : progress > 0 ? "in_progress" : "not_started"
    try {
      await (supabase as any).from("team_goals").update({ progress, status }).eq("id", goalId)
      setGoals(prev => prev.map(g => g.id === goalId ? { ...g, progress, status } : g))
    } catch (e) { console.error(e) }
  }

  const handleDelete = async (goalId: string) => {
    try {
      await (supabase as any).from("team_goals").delete().eq("id", goalId)
      setGoals(prev => prev.filter(g => g.id !== goalId))
    } catch (e) { console.error(e) }
  }

  const statusColors: Record<string, string> = {
    not_started: "text-gray-400 bg-gray-400/10",
    in_progress: "text-blue-500 bg-blue-500/10",
    completed: "text-green-500 bg-green-500/10",
    cancelled: "text-red-400 bg-red-400/10",
  }

  const statusLabels: Record<string, string> = {
    not_started: "Not Started",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  }

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-[var(--muted)]" /></div>

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-[var(--text)]">Team Goals</h3>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 px-3 py-1.5 bg-[var(--accent)] text-white rounded-lg text-[11px] font-semibold cursor-pointer">
          <Plus size={12} /> New Goal
        </button>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl space-y-3">
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Goal title..." className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[12px] text-[var(--text)]" autoFocus />
              <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)..." className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[12px] text-[var(--text)]" />
              <div className="flex gap-2">
                <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[10px] text-[var(--text)] cursor-pointer" />
                <div className="flex-1" />
                <button onClick={handleCreate} disabled={!newTitle.trim()} className="px-3 py-1.5 bg-[var(--accent)] text-white rounded-lg text-[10px] font-semibold disabled:opacity-50 cursor-pointer">Create</button>
                <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 bg-[var(--surface)] text-[var(--muted)] rounded-lg text-[10px] font-semibold cursor-pointer">Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {goals.map(goal => (
          <div key={goal.id} className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] group">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[12px] font-semibold text-[var(--text)]">{goal.title}</p>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold ${statusColors[goal.status]}`}>{statusLabels[goal.status]}</span>
                </div>
                {goal.description && <p className="text-[10px] text-[var(--muted)] mt-0.5">{goal.description}</p>}
              </div>
              <button onClick={() => handleDelete(goal.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-[var(--muted)] hover:text-red-500 transition cursor-pointer">
                <Trash2 size={10} />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-[var(--surface-2)]">
                <div className="h-2 rounded-full bg-[var(--accent)] transition-all" style={{ width: `${goal.progress}%` }} />
              </div>
              <span className="text-[10px] font-semibold text-[var(--text)] w-8 text-right">{goal.progress}%</span>
              <input
                type="range" min={0} max={100} step={5}
                value={goal.progress}
                onChange={e => handleUpdateProgress(goal.id, parseInt(e.target.value))}
                className="w-20 h-1 accent-[var(--accent)] cursor-pointer"
              />
            </div>
            {goal.due_date && (
              <p className="text-[9px] text-[var(--muted)] mt-1.5 flex items-center gap-1">
                <Calendar size={9} /> Due {new Date(goal.due_date).toLocaleDateString()}
              </p>
            )}
          </div>
        ))}
        {goals.length === 0 && (
          <div className="text-center py-8">
            <Target size={24} className="text-[var(--muted)] mx-auto mb-2" />
            <p className="text-[12px] text-[var(--muted)]">No goals yet. Set team objectives and track progress.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// TEAM CALENDAR
// ═════════════════════════════════════════════════════════════════════════════

function TeamCalendarView({ teamId, companyId }: { teamId: string; companyId: string }) {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  useEffect(() => {
    const load = async () => {
      try {
        const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString()
        const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59).toISOString()
        const { data } = await (supabase as any)
          .from("team_events")
          .select("*")
          .eq("team_id", teamId)
          .gte("start_time", start)
          .lte("start_time", end)
        setEvents(data || [])
      } catch { setEvents([]) }
      finally { setLoading(false) }
    }
    load()
  }, [teamId, currentMonth])

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()
  const today = new Date()

  const monthName = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-[var(--text)]">{monthName}</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--muted)] cursor-pointer">◀</button>
          <button onClick={() => setCurrentMonth(new Date())} className="px-2 py-1 text-[10px] font-semibold text-[var(--accent)] hover:bg-[var(--surface-2)] rounded-lg cursor-pointer">Today</button>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--muted)] cursor-pointer">▶</button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-[var(--muted)]" /></div>
      ) : (
        <div className="grid grid-cols-7 gap-px bg-[var(--border)] rounded-xl overflow-hidden">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} className="bg-[var(--surface-2)] px-2 py-1.5 text-[9px] font-bold text-[var(--muted)] text-center">{d}</div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-[var(--surface)] min-h-[80px]" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
            const isToday = date.toDateString() === today.toDateString()
            const dayEvents = events.filter(e => new Date(e.start_time).toDateString() === date.toDateString())
            return (
              <div key={day} className={`bg-[var(--surface)] min-h-[80px] p-1.5 ${isToday ? "ring-2 ring-[var(--accent)] ring-inset" : ""}`}>
                <span className={`text-[10px] font-medium ${isToday ? "text-[var(--accent)]" : "text-[var(--text)]"}`}>{day}</span>
                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 3).map((ev, j) => (
                    <div key={j} className="px-1 py-0.5 rounded bg-[var(--accent)]/10 text-[8px] text-[var(--accent)] truncate font-medium">{ev.title}</div>
                  ))}
                  {dayEvents.length > 3 && <p className="text-[8px] text-[var(--muted)]">+{dayEvents.length - 3} more</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// TEAM ACTIVITY FEED
// ═════════════════════════════════════════════════════════════════════════════

function TeamActivityFeed({ teamId, companyId, members }: {
  teamId: string
  companyId: string
  members: (OrgTeamMember & { member?: OrganizationMember })[]
}) {
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const memberIds = members.map(m => m.member?.user_id).filter(Boolean) as string[]
        if (memberIds.length === 0) { setLoading(false); return }

        const { data } = await (supabase as any)
          .from("audit_logs")
          .select("*")
          .eq("organization_id", companyId)
          .in("actor_id", memberIds)
          .order("created_at", { ascending: false })
          .limit(50)
        setActivities(data || [])
      } catch { setActivities([]) }
      finally { setLoading(false) }
    }
    load()
  }, [teamId, companyId, members])

  const actionIcons: Record<string, { icon: any; color: string }> = {
    page_created: { icon: FileText, color: "text-green-500" },
    page_updated: { icon: Edit2, color: "text-blue-500" },
    page_deleted: { icon: Trash2, color: "text-red-500" },
    member_joined: { icon: Users, color: "text-purple-500" },
    team_created: { icon: Users, color: "text-amber-500" },
  }

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-[var(--muted)]" /></div>

  return (
    <div className="p-6 space-y-3">
      <h3 className="text-[14px] font-bold text-[var(--text)]">Team Activity</h3>
      {activities.length === 0 ? (
        <div className="text-center py-8">
          <Activity size={24} className="text-[var(--muted)] mx-auto mb-2" />
          <p className="text-[12px] text-[var(--muted)]">No activity yet</p>
        </div>
      ) : (
        activities.map(act => {
          const config = actionIcons[act.action] || { icon: Activity, color: "text-[var(--muted)]" }
          const Icon = config.icon
          return (
            <div key={act.id} className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-[var(--surface-2)] transition">
              <div className="w-7 h-7 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center shrink-0">
                <Icon size={12} className={config.color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-[var(--text)]">
                  <span className="font-semibold">{act.actor_id?.slice(0, 8) || "System"}</span>
                  {" "}{act.action?.replace("_", " ")}
                </p>
                {act.details && Object.keys(act.details).length > 0 && (
                  <p className="text-[9px] text-[var(--muted)] mt-0.5">
                    {Object.entries(act.details).slice(0, 2).map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}
                  </p>
                )}
              </div>
              <span className="text-[9px] text-[var(--muted)] shrink-0">{new Date(act.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          )
        })
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// TEAM SETTINGS PANEL
// ═════════════════════════════════════════════════════════════════════════════

function TeamSettingsPanel({ team, members, allMembers, onRefresh }: {
  team: OrgTeam
  members: (OrgTeamMember & { member?: OrganizationMember })[]
  allMembers: OrganizationMember[]
  onRefresh: () => void
}) {
  const [name, setName] = useState(team.name)
  const [description, setDescription] = useState(team.description || "")
  const [icon, setIcon] = useState(team.icon || "👥")
  const [color, setColor] = useState(team.color || "#6366f1")
  const [saving, setSaving] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [selectedMember, setSelectedMember] = useState("")
  const [selectedRole, setSelectedRole] = useState("member")

  const handleSave = async () => {
    setSaving(true)
    try {
      await (supabase as any).from("company_teams").update({
        name: name.trim(), description: description.trim(), icon, color
      }).eq("id", team.id)
      onRefresh()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const handleAddMember = async () => {
    if (!selectedMember) return
    try {
      await addCompanyTeamMember(team.id, selectedMember, selectedRole as any)
      setSelectedMember(""); setSelectedRole("member"); setShowAddMember(false)
      onRefresh()
    } catch (e) { console.error(e) }
  }

  const handleRemoveMember = async (userId: string) => {
    try {
      await removeCompanyTeamMember(team.id, userId)
      onRefresh()
    } catch (e) { console.error(e) }
  }

  const iconOptions = ["👥", "🚀", "💻", "🎨", "📊", "🔬", "🎯", "⚡", "🌟", "🔧", "📚", "🛡️"]
  const colorOptions = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"]

  const nonMemberUsers = allMembers.filter(m => !members.some(tm => tm.member?.user_id === m.user_id))

  return (
    <div className="p-6 space-y-6 max-w-[600px]">
      <h3 className="text-[14px] font-bold text-[var(--text)]">Team Settings</h3>

      {/* Icon & Color */}
      <div className="space-y-3">
        <label className="text-[11px] font-medium text-[var(--text-secondary)]">Icon</label>
        <div className="flex gap-1.5 flex-wrap">
          {iconOptions.map(i => (
            <button key={i} onClick={() => setIcon(i)} className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg cursor-pointer transition border ${icon === i ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-[var(--border)] hover:border-[var(--accent)]/30"}`}>{i}</button>
          ))}
        </div>
        <label className="text-[11px] font-medium text-[var(--text-secondary)]">Color</label>
        <div className="flex gap-1.5">
          {colorOptions.map(c => (
            <button key={c} onClick={() => setColor(c)} className={`w-7 h-7 rounded-full cursor-pointer transition border-2 ${color === c ? "border-[var(--text)] scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>

      {/* Name & Description */}
      <div className="space-y-3">
        <div>
          <label className="text-[11px] font-medium text-[var(--text-secondary)]">Name</label>
          <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[12px] text-[var(--text)] mt-1" />
        </div>
        <div>
          <label className="text-[11px] font-medium text-[var(--text-secondary)]">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[12px] text-[var(--text)] mt-1 resize-none" />
        </div>
        <button onClick={handleSave} disabled={saving || (name === team.name && description === (team.description || "") && icon === (team.icon || "👥") && color === (team.color || "#6366f1"))}
          className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-[11px] font-semibold disabled:opacity-50 cursor-pointer">
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Members */}
      <div className="border-t border-[var(--border)] pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[12px] font-bold text-[var(--text)]">Members ({members.length})</h4>
          <button onClick={() => setShowAddMember(!showAddMember)} className="flex items-center gap-1 text-[10px] text-[var(--accent)] cursor-pointer">
            <Plus size={10} /> Add member
          </button>
        </div>

        <AnimatePresence>
          {showAddMember && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-3">
              <div className="p-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl space-y-2">
                <select value={selectedMember} onChange={e => setSelectedMember(e.target.value)} className="w-full px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[11px] text-[var(--text)] cursor-pointer">
                  <option value="">Select member...</option>
                  {nonMemberUsers.map(m => (
                    <option key={m.user_id} value={m.user_id}>{m.user_profiles?.user_name || m.user_id}</option>
                  ))}
                </select>
                <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)} className="w-full px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[11px] text-[var(--text)] cursor-pointer">
                  <option value="member">Member</option>
                  <option value="lead">Lead</option>
                  <option value="admin">Admin</option>
                </select>
                <div className="flex gap-2">
                  <button onClick={handleAddMember} disabled={!selectedMember} className="flex-1 px-3 py-1.5 bg-[var(--accent)] text-white rounded-lg text-[10px] font-semibold disabled:opacity-50 cursor-pointer">Add</button>
                  <button onClick={() => setShowAddMember(false)} className="px-3 py-1.5 bg-[var(--surface)] text-[var(--muted)] rounded-lg text-[10px] font-semibold cursor-pointer">Cancel</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-1">
          {members.map(tm => {
            const m = tm.member
            return (
              <div key={tm.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--surface-2)] transition group">
                <div className="w-7 h-7 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[9px] font-medium overflow-hidden shrink-0">
                  {m?.user_profiles?.avatar_url ? (
                    <img src={m.user_profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (m?.user_profiles?.user_name || "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-[var(--text)] truncate">{m?.user_profiles?.user_name || "Unknown"}</p>
                  <p className="text-[9px] text-[var(--muted)] capitalize">{tm.role}</p>
                </div>
                <button onClick={() => handleRemoveMember(tm.member?.user_id || "")} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-[var(--muted)] hover:text-red-500 transition cursor-pointer">
                  <X size={10} />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
