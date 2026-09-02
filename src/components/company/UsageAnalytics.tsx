import React, { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { BarChart3, Users, FileText, FolderKanban, Clock, TrendingUp, Loader2 } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useCompany } from "../../contexts/CompanyContext"

interface UsageData {
  totalMembers: number
  totalPages: number
  totalProjects: number
  totalTeams: number
  activeMembers7d: number
  pagesCreated30d: number
  storageUsed: string
}

interface UsageAnalyticsProps {}

export function UsageAnalytics({}: UsageAnalyticsProps) {
  const { currentCompany } = useCompany()
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d")

  const fetchData = useCallback(async () => {
    if (!currentCompany) return
    setLoading(true)
    try {
      const daysAgo = period === "7d" ? 7 : period === "30d" ? 30 : 90
      const since = new Date(Date.now() - daysAgo * 86400000).toISOString()

      const [members, pages, projects, teams] = await Promise.all([
        (supabase as any).from("organization_members").select("*", { count: "exact", head: true }).eq("organization_id", currentCompany.id),
        (supabase as any).from("pages").select("*", { count: "exact", head: true }).eq("organization_id", currentCompany.id),
        (supabase as any).from("projects").select("*", { count: "exact", head: true }).eq("organization_id", currentCompany.id),
        (supabase as any).from("company_teams").select("*", { count: "exact", head: true }).eq("organization_id", currentCompany.id),
      ])

      const { count: activeMembers } = await (supabase as any)
        .from("audit_logs")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", currentCompany.id)
        .gte("created_at", since)

      setData({
        totalMembers: members.count || 0,
        totalPages: pages.count || 0,
        totalProjects: projects.count || 0,
        totalTeams: teams.count || 0,
        activeMembers7d: activeMembers || 0,
        pagesCreated30d: pages.count || 0,
        storageUsed: "—",
      })
    } catch { setData(null) }
    finally { setLoading(false) }
  }, [currentCompany, period])

  useEffect(() => { fetchData() }, [fetchData])

  const stats = data ? [
    { label: "Members", value: data.totalMembers, icon: Users, color: "text-blue-500" },
    { label: "Pages", value: data.totalPages, icon: FileText, color: "text-green-500" },
    { label: "Projects", value: data.totalProjects, icon: FolderKanban, color: "text-purple-500" },
    { label: "Teams", value: data.totalTeams, icon: Users, color: "text-amber-500" },
    { label: "Active (period)", value: data.activeMembers7d, icon: TrendingUp, color: "text-cyan-500" },
    { label: "Pages Created", value: data.pagesCreated30d, icon: FileText, color: "text-pink-500" },
  ] : []

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 size={16} className="animate-spin text-[var(--muted)]" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-[12px] font-bold text-[var(--text)]">Usage Analytics</h4>
        <div className="flex gap-1 bg-[var(--surface-2)] rounded-lg p-0.5">
          {(["7d", "30d", "90d"] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition cursor-pointer ${period === p ? "bg-[var(--surface)] text-[var(--text)] shadow-xs" : "text-[var(--muted)]"}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {stats.map(s => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
            <s.icon size={14} className={`${s.color} mb-1`} />
            <p className="text-[16px] font-bold text-[var(--text)]">{s.value}</p>
            <p className="text-[9px] text-[var(--muted)]">{s.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
