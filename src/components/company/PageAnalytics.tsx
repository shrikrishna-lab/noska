import React, { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { BarChart3, Eye, Edit2, Clock, Users, TrendingUp, Loader2 } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useCompany } from "../../contexts/CompanyContext"

interface AnalyticsData {
  views: number
  edits: number
  uniqueViewers: number
  lastViewed: string | null
  lastEdited: string | null
  topEditors: { user_name: string; count: number }[]
  recentActivity: { action: string; user_name: string; timestamp: string }[]
}

interface PageAnalyticsProps {
  pageId: string
}

export function PageAnalytics({ pageId }: PageAnalyticsProps) {
  const { currentCompany } = useCompany()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("7d")

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      // Get page views from analytics table
      const daysAgo = period === "7d" ? 7 : period === "30d" ? 30 : 90
      const since = new Date(Date.now() - daysAgo * 86400000).toISOString()

      const { data: views } = await (supabase as any)
        .from("page_analytics")
        .select("*")
        .eq("page_id", pageId)
        .gte("created_at", since)

      // Get edit count from audit logs
      const { data: edits } = await (supabase as any)
        .from("audit_logs")
        .select("*")
        .eq("entity_id", pageId)
        .eq("action", "update")
        .gte("created_at", since)

      const viewCount = views?.length || 0
      const editCount = edits?.length || 0
      const uniqueViewers = new Set((views || []).map((v: any) => v.user_id)).size

      // Get top editors
      const editorCounts: Record<string, number> = {}
      const editorNames: Record<string, string> = {}
      for (const e of (edits || [])) {
        const uid = (e as any).actor_id
        editorCounts[uid] = (editorCounts[uid] || 0) + 1
      }
      const topEditors = Object.entries(editorCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([uid, count]) => ({ user_name: editorNames[uid] || uid.slice(0, 8), count }))

      // Recent activity
      const recentActivity = [
        ...(views || []).slice(-5).map((v: any) => ({
          action: "view",
          user_name: "User",
          timestamp: v.created_at,
        })),
        ...(edits || []).slice(-5).map((e: any) => ({
          action: "edit",
          user_name: "User",
          timestamp: e.created_at,
        })),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10)

      setAnalytics({
        views: viewCount,
        edits: editCount,
        uniqueViewers,
        lastViewed: views?.length ? (views[views.length - 1] as any).created_at : null,
        lastEdited: edits?.length ? (edits[edits.length - 1] as any).created_at : null,
        topEditors,
        recentActivity,
      })
    } catch { setAnalytics(null) }
    finally { setLoading(false) }
  }, [pageId, period])

  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={16} className="animate-spin text-[var(--muted)]" />
      </div>
    )
  }

  if (!analytics) return null

  const stats = [
    { label: "Views", value: analytics.views, icon: Eye, color: "text-blue-500" },
    { label: "Edits", value: analytics.edits, icon: Edit2, color: "text-green-500" },
    { label: "Viewers", value: analytics.uniqueViewers, icon: Users, color: "text-purple-500" },
  ]

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex gap-1 bg-[var(--surface-2)] rounded-lg p-0.5 w-fit">
        {(["7d", "30d", "90d"] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition cursor-pointer ${
              period === p ? "bg-[var(--surface)] text-[var(--text)] shadow-xs" : "text-[var(--muted)]"
            }`}
          >
            {p === "7d" ? "7 days" : p === "30d" ? "30 days" : "90 days"}
          </button>
        ))}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-2">
        {stats.map(s => (
          <div key={s.label} className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
            <s.icon size={14} className={`${s.color} mb-1`} />
            <p className="text-[18px] font-bold text-[var(--text)]">{s.value}</p>
            <p className="text-[10px] text-[var(--muted)]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div>
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-2">Recent Activity</h4>
        {analytics.recentActivity.length === 0 ? (
          <p className="text-[11px] text-[var(--muted)]">No activity in this period</p>
        ) : (
          <div className="space-y-1">
            {analytics.recentActivity.map((a, i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                <div className={`w-1.5 h-1.5 rounded-full ${a.action === "view" ? "bg-blue-400" : "bg-green-400"}`} />
                <span className="text-[10px] text-[var(--text)] flex-1">{a.user_name} {a.action === "view" ? "viewed" : "edited"}</span>
                <span className="text-[9px] text-[var(--muted)]">{new Date(a.timestamp).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top editors */}
      {analytics.topEditors.length > 0 && (
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-2">Top Editors</h4>
          <div className="space-y-1">
            {analytics.topEditors.map((e, i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                <span className="text-[11px] text-[var(--text)] flex-1">{e.user_name}</span>
                <span className="text-[10px] text-[var(--muted)]">{e.count} edits</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
