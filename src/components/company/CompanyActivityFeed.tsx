import React, { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import {
  FileText, FolderKanban, Users, Clock, UserPlus, Edit2,
  Trash2, Loader2, Check, RotateCcw, Shield
} from "lucide-react"
import { useCompany } from "../../contexts/CompanyContext"
import { getCompanyAuditLogs, type AuditLog } from "../../lib/company"

interface ActivityItem {
  id: string
  action: string
  entity_type: string
  entity_id: string
  user_name: string
  user_avatar?: string
  created_at: string
}

interface CompanyActivityFeedProps {
  limit?: number
}

export function CompanyActivityFeed({ limit = 20 }: CompanyActivityFeedProps) {
  const { currentCompany } = useCompany()
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchActivities = useCallback(async () => {
    if (!currentCompany) return
    setLoading(true)
    try {
      const logs = await getCompanyAuditLogs(currentCompany.id, limit)
      const items: ActivityItem[] = logs.map((log: AuditLog) => ({
        id: log.id,
        action: log.action,
        entity_type: log.target_resource || "system",
        entity_id: log.details?.entity_id as string || log.target_resource || "",
        user_name: (log as any).actor_name || "System",
        user_avatar: (log as any).actor_avatar,
        created_at: log.created_at,
      }))
      setActivities(items)
    } catch { setActivities([]) }
    finally { setLoading(false) }
  }, [currentCompany, limit])

  useEffect(() => { fetchActivities() }, [fetchActivities])

  const getActionIcon = (action: string) => {
    switch (action) {
      case "create": return <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center"><Check size={10} className="text-green-500" /></div>
      case "update": return <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center"><Edit2 size={10} className="text-blue-500" /></div>
      case "delete": return <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center"><Trash2 size={10} className="text-red-500" /></div>
      case "invite": return <div className="w-5 h-5 rounded-full bg-purple-500/10 flex items-center justify-center"><UserPlus size={10} className="text-purple-500" /></div>
      case "join": return <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center"><Users size={10} className="text-green-500" /></div>
      case "restore": return <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center"><RotateCcw size={10} className="text-green-500" /></div>
      case "login": return <div className="w-5 h-5 rounded-full bg-indigo-500/10 flex items-center justify-center"><Shield size={10} className="text-indigo-500" /></div>
      default: return <div className="w-5 h-5 rounded-full bg-[var(--surface-2)] flex items-center justify-center"><Clock size={10} className="text-[var(--muted)]" /></div>
    }
  }

  const getEntityIcon = (type: string) => {
    switch (type) {
      case "pages": return <FileText size={10} className="text-[var(--muted)]" />
      case "projects": return <FolderKanban size={10} className="text-[var(--muted)]" />
      case "organization_members": return <Users size={10} className="text-[var(--muted)]" />
      case "company_teams": return <Users size={10} className="text-[var(--muted)]" />
      default: return <Clock size={10} className="text-[var(--muted)]" />
    }
  }

  const formatAction = (action: string) => {
    switch (action) {
      case "create": return "created"
      case "update": return "updated"
      case "delete": return "deleted"
      case "invite": return "invited to"
      case "join": return "joined"
      case "restore": return "restored"
      case "login": return "logged in"
      case "permanent_delete": return "permanently deleted"
      case "empty_trash": return "emptied trash"
      default: return action
    }
  }

  const formatTime = (date: string) => {
    const now = new Date()
    const d = new Date(date)
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (mins < 1) return "just now"
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 size={16} className="animate-spin text-[var(--muted)]" />
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-center">
        <Clock size={20} className="text-[var(--muted)] mb-2" />
        <p className="text-[12px] text-[var(--muted)]">No activity yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {activities.map((activity, i) => (
        <motion.div
          key={activity.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.02 }}
          className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[var(--surface-2)] transition-all"
        >
          {getActionIcon(activity.action)}
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-[var(--text)] leading-relaxed">
              <span className="font-semibold">{activity.user_name}</span>
              <span className="text-[var(--muted)]"> {formatAction(activity.action)} </span>
              <span className="font-medium inline-flex items-center gap-1">
                {getEntityIcon(activity.entity_type)}
                {activity.entity_id}
              </span>
            </p>
          </div>
          <span className="text-[10px] text-[var(--muted)] shrink-0 mt-0.5">
            {formatTime(activity.created_at)}
          </span>
        </motion.div>
      ))}
    </div>
  )
}
