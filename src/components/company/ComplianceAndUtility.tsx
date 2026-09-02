import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { FileText, Download, Loader2, Check, AlertTriangle, Clock } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useCompany } from "../../contexts/CompanyContext"

interface ComplianceEntry {
  id: string
  type: string
  description: string
  status: string
  created_by: string
  created_at: string
}

interface ComplianceLogProps {}

export function ComplianceLog({}: ComplianceLogProps) {
  const { currentCompany } = useCompany()
  const [entries, setEntries] = useState<ComplianceEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentCompany) return
    const fetch = async () => {
      try {
        const { data } = await (supabase as any)
          .from("audit_logs")
          .select("*")
          .eq("organization_id", currentCompany.id)
          .order("created_at", { ascending: false })
          .limit(100)
        setEntries(data || [])
      } catch { setEntries([]) }
      finally { setLoading(false) }
    }
    fetch()
  }, [currentCompany])

  const statusColors: Record<string, string> = {
    passed: "text-green-500 bg-green-500/10",
    warning: "text-amber-500 bg-amber-500/10",
    failed: "text-red-500 bg-red-500/10",
    info: "text-blue-500 bg-blue-500/10",
  }

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 size={16} className="animate-spin text-[var(--muted)]" /></div>

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[12px] font-bold text-[var(--text)]">Compliance & Audit Log</h4>
        <button className="flex items-center gap-1 text-[10px] text-[var(--accent)] cursor-pointer">
          <Download size={10} /> Export
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left px-3 py-2 text-[9px] font-bold text-[var(--muted)] uppercase">Date</th>
              <th className="text-left px-3 py-2 text-[9px] font-bold text-[var(--muted)] uppercase">Type</th>
              <th className="text-left px-3 py-2 text-[9px] font-bold text-[var(--muted)] uppercase">Description</th>
              <th className="text-left px-3 py-2 text-[9px] font-bold text-[var(--muted)] uppercase">Actor</th>
              <th className="text-left px-3 py-2 text-[9px] font-bold text-[var(--muted)] uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id} className="border-b border-[var(--border)]/50 hover:bg-[var(--surface-2)] transition">
                <td className="px-3 py-2 text-[10px] text-[var(--muted)]">
                  <div className="flex items-center gap-1"><Clock size={9} />{new Date(e.created_at).toLocaleDateString()}</div>
                </td>
                <td className="px-3 py-2">
                  <span className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[9px] font-semibold text-[var(--text)]">{e.type}</span>
                </td>
                <td className="px-3 py-2 text-[10px] text-[var(--text)] max-w-[200px] truncate">{e.description}</td>
                <td className="px-3 py-2 text-[10px] text-[var(--muted)]">{e.created_by?.slice(0, 8)}</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold ${statusColors[e.status] || statusColors.info}`}>
                    {e.status === "passed" && <Check size={8} />}
                    {e.status === "warning" && <AlertTriangle size={8} />}
                    {e.status === "failed" && <AlertTriangle size={8} />}
                    {e.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {entries.length === 0 && (
        <div className="text-center py-6">
          <FileText size={16} className="text-[var(--muted)] mx-auto mb-1" />
          <p className="text-[10px] text-[var(--muted)]">No compliance entries yet</p>
        </div>
      )}
    </div>
  )
}

interface DataExportProps {}

export function DataExport({}: DataExportProps) {
  const { currentCompany } = useCompany()
  const [exporting, setExporting] = useState(false)
  const [format, setFormat] = useState<"json" | "csv">("json")

  const handleExport = async () => {
    if (!currentCompany) return
    setExporting(true)
    try {
      const [pages, projects, members, teams] = await Promise.all([
        (supabase as any).from("pages").select("*").eq("organization_id", currentCompany.id),
        (supabase as any).from("projects").select("*").eq("organization_id", currentCompany.id),
        (supabase as any).from("organization_members").select("*, user_profiles(*)").eq("organization_id", currentCompany.id),
        (supabase as any).from("company_teams").select("*").eq("organization_id", currentCompany.id),
      ])

      const exportData = {
        organization: currentCompany,
        pages: pages.data || [],
        projects: projects.data || [],
        members: members.data || [],
        teams: teams.data || [],
        exported_at: new Date().toISOString(),
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${currentCompany.slug || "export"}-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {}
    finally { setExporting(false) }
  }

  return (
    <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] space-y-3">
      <h4 className="text-[12px] font-bold text-[var(--text)]">Export Organization Data</h4>
      <p className="text-[10px] text-[var(--muted)]">Download all your organization data in {format.toUpperCase()} format.</p>

      <div className="flex gap-2">
        <button onClick={() => setFormat("json")} className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer transition ${format === "json" ? "bg-[var(--accent)] text-white" : "bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]"}`}>
          JSON
        </button>
        <button onClick={() => setFormat("csv")} className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer transition ${format === "csv" ? "bg-[var(--accent)] text-white" : "bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]"}`}>
          CSV
        </button>
      </div>

      <button onClick={handleExport} disabled={exporting} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-[11px] font-semibold hover:bg-[var(--accent-deep)] transition disabled:opacity-50 cursor-pointer">
        {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
        {exporting ? "Exporting..." : "Export Data"}
      </button>
    </div>
  )
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode; fallback?: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4 rounded-2xl bg-[var(--surface-2)] border border-red-500/20">
          <AlertTriangle size={24} className="text-red-500 mb-3" />
          <h3 className="text-[13px] font-bold text-[var(--text)] mb-1">Something went wrong</h3>
          <p className="text-[11px] text-[var(--muted)] mb-3 max-w-sm text-center">{this.state.error?.message || "An unexpected error occurred"}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })} className="px-3 py-1.5 rounded-lg bg-[var(--surface)] text-[11px] font-semibold text-[var(--text)] hover:bg-[var(--surface-2)] transition cursor-pointer">
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

interface CommandHistoryEntry {
  id: string
  command: string
  result: string
  timestamp: Date
}

export function CommandHistory() {
  const [history, setHistory] = useState<CommandHistoryEntry[]>([])

  const addEntry = (command: string, result: string) => {
    setHistory(prev => [{ id: crypto.randomUUID(), command, result, timestamp: new Date() }, ...prev].slice(0, 50))
  }

  const clear = () => setHistory([])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-[12px] font-bold text-[var(--text)]">Command History</h4>
        {history.length > 0 && (
          <button onClick={clear} className="text-[10px] text-[var(--muted)] cursor-pointer">Clear</button>
        )}
      </div>
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {history.map(h => (
          <div key={h.id} className="p-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
            <div className="flex items-center gap-2 mb-0.5">
              <code className="text-[10px] text-[var(--accent)] font-mono">{h.command}</code>
              <span className="text-[8px] text-[var(--muted)]">{h.timestamp.toLocaleTimeString()}</span>
            </div>
            <p className="text-[9px] text-[var(--muted)] truncate">{h.result}</p>
          </div>
        ))}
      </div>
      {history.length === 0 && (
        <p className="text-[10px] text-[var(--muted)] text-center py-4">No commands yet</p>
      )}
    </div>
  )
}
