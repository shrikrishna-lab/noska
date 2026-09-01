import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { FileText, Loader2, Filter, ChevronDown } from "lucide-react"
import { useCompany } from "../../contexts/CompanyContext"
import { getCompanyAuditLogs, type CompanyAuditLog } from "../../lib/company"

export function CompanyAuditLog() {
  const { currentCompany } = useCompany()
  const [logs, setLogs] = useState<CompanyAuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const limit = 30

  useEffect(() => {
    if (!currentCompany) return
    setLoading(true)
    setPage(0)
    getCompanyAuditLogs(currentCompany.id, limit, 0)
      .then((data) => {
        setLogs(data)
        setHasMore(data.length === limit)
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [currentCompany])

  const loadMore = async () => {
    if (!currentCompany || loading) return
    setLoading(true)
    try {
      const nextPage = page + 1
      const data = await getCompanyAuditLogs(currentCompany.id, limit, nextPage * limit)
      setLogs((prev) => [...prev, ...data])
      setHasMore(data.length === limit)
      setPage(nextPage)
    } finally {
      setLoading(false)
    }
  }

  const actionLabels: Record<string, string> = {
    "company.created": "Created company",
    "company.deleted": "Deleted company",
    "member.joined": "Joined company",
    "member.invited": "Invited member",
    "member.removed": "Removed member",
    "role.changed": "Changed role",
    "team.created": "Created team",
    "team.deleted": "Deleted team",
    "ownership.transferred": "Transferred ownership",
    "page.visibility_changed": "Changed page visibility",
    "settings.changed": "Changed settings",
  }

  const actionColors: Record<string, string> = {
    "company.created": "text-green-500",
    "company.deleted": "text-red-500",
    "member.joined": "text-blue-500",
    "member.invited": "text-purple-500",
    "member.removed": "text-red-500",
    "role.changed": "text-yellow-500",
    "team.created": "text-blue-500",
    "ownership.transferred": "text-orange-500",
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const filteredLogs = filter === "all" ? logs : logs.filter((l) => l.action.startsWith(filter))

  const uniqueActions = [...new Set(logs.map((l) => l.action.split(".")[0]))]

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="appearance-none px-3 py-1.5 pr-7 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[12px] text-[var(--text)] outline-none cursor-pointer"
          >
            <option value="all">All Activity</option>
            {uniqueActions.map((action) => (
              <option key={action} value={action}>
                {action.charAt(0).toUpperCase() + action.slice(1)}
              </option>
            ))}
          </select>
          <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
        </div>
        <div className="text-[11px] text-[var(--muted)]">
          {filteredLogs.length} event{filteredLogs.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Log List */}
      {loading && logs.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={16} className="animate-spin text-[var(--muted)]" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="py-12 text-center text-[12px] text-[var(--muted)]">
          No audit events found
        </div>
      ) : (
        <div className="space-y-0.5">
          {filteredLogs.map((log) => {
            const color = actionColors[log.action] || "text-[var(--text-secondary)]"
            const label = actionLabels[log.action] || log.action

            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--surface-2)] transition-colors"
              >
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${color.replace("text-", "bg-")}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-[var(--text)]">{label}</span>
                    <span className={`text-[10px] font-medium ${color}`}>
                      {log.action}
                    </span>
                  </div>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <div className="text-[10px] text-[var(--muted)] mt-0.5">
                      {Object.entries(log.details)
                        .filter(([k]) => !["via"].includes(k))
                        .slice(0, 3)
                        .map(([k, v]) => `${k}: ${String(v)}`)
                        .join(" · ")}
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-[var(--muted)] shrink-0 mt-0.5">
                  {formatTime(log.created_at)}
                </div>
              </motion.div>
            )
          })}

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loading}
              className="w-full py-2 text-[11px] text-[var(--noska-blue)] hover:bg-[var(--surface-2)] rounded-lg transition-colors cursor-pointer disabled:opacity-40"
            >
              {loading ? <Loader2 size={12} className="animate-spin mx-auto" /> : "Load more"}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
