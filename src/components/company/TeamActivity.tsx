import React, { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Activity, UserPlus, Edit2, Trash2, FileText, FolderKanban, Clock, Loader2, Users } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useCompany } from "../../contexts/CompanyContext"

interface TeamActivityItem {
  id: string
  action: string
  entity_type: string
  entity_name: string
  user_name: string
  created_at: string
}

interface TeamActivityProps {
  teamId: string
  limit?: number
}

export function TeamActivity({ teamId, limit = 15 }: TeamActivityProps) {
  const { currentCompany } = useCompany()
  const [activities, setActivities] = useState<TeamActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchActivities = useCallback(async () => {
    try {
      const { data: logs } = await (supabase as any)
        .from("audit_logs")
        .select("*")
        .eq("organization_id", currentCompany?.id)
        .contains("details", JSON.stringify({ team_id: teamId }))
        .order("created_at", { ascending: false })
        .limit(limit)

      if (!logs) { setActivities([]); return }

      const userIds = [...new Set(logs.map((l: any) => l.actor_id).filter(Boolean))] as string[]
      const { data: profiles } = userIds.length > 0
        ? await supabase.from("user_profiles").select("user_id, user_name").in("user_id", userIds)
        : { data: [] }

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]))

      setActivities(logs.map((log: any) => ({
        id: log.id,
        action: log.action,
        entity_type: log.target_resource || "",
        entity_name: log.details?.entity_name || log.entity_id || "",
        user_name: profileMap.get(log.actor_id)?.user_name || "System",
        created_at: log.created_at,
      })))
    } catch { setActivities([]) }
    finally { setLoading(false) }
  }, [currentCompany, teamId, limit])

  useEffect(() => { fetchActivities() }, [fetchActivities])

  const getActionIcon = (action: string) => {
    switch (action) {
      case "create": return <UserPlus size={10} className="text-green-500" />
      case "update": return <Edit2 size={10} className="text-blue-500" />
      case "delete": return <Trash2 size={10} className="text-red-500" />
      case "join": return <Users size={10} className="text-green-500" />
      case "leave": return <Users size={10} className="text-orange-500" />
      default: return <Clock size={10} className="text-[var(--muted)]" />
    }
  }

  const formatTime = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "just now"
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(diff / 3600000)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  if (loading) return <div className="flex items-center justify-center py-6"><Loader2 size={14} className="animate-spin text-[var(--muted)]" /></div>

  return (
    <div className="space-y-0.5">
      {activities.length === 0 ? (
        <div className="text-center py-6"><Activity size={16} className="text-[var(--muted)] mx-auto mb-1" /><p className="text-[10px] text-[var(--muted)]">No activity</p></div>
      ) : (
        activities.map((a, i) => (
          <motion.div key={a.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--surface-2)] transition">
            {getActionIcon(a.action)}
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-[var(--text)]">
                <span className="font-semibold">{a.user_name}</span> {a.action} <span className="font-medium">{a.entity_name}</span>
              </span>
            </div>
            <span className="text-[9px] text-[var(--muted)]">{formatTime(a.created_at)}</span>
          </motion.div>
        ))
      )}
    </div>
  )
}
