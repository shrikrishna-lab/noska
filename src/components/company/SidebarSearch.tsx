import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search, FileText, FolderKanban, Users, Hash, X,
  Filter, Loader2, Clock, Star
} from "lucide-react"
import { useCompany } from "../../contexts/CompanyContext"
import {
  getOrgPages, getOrgProjects, getCompanyTeams, getCompanyMembers,
  type OrgPage, type OrgProject, type OrgTeam, type OrganizationMember
} from "../../lib/company"

interface SearchResult {
  id: string
  type: "page" | "project" | "team" | "member"
  title: string
  subtitle?: string
  icon: React.ReactNode
}

interface SidebarSearchProps {
  onNavigate: (type: string, id: string) => void
}

export function SidebarSearch({ onNavigate }: SidebarSearchProps) {
  const { currentCompany } = useCompany()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [filterType, setFilterType] = useState<string>("all")
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [showRecent, setShowRecent] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem("noska_recent_searches")
      if (stored) setRecentSearches(JSON.parse(stored))
    } catch {}
  }, [])

  useEffect(() => {
    if (!query.trim() || !currentCompany) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const q = query.toLowerCase()
        const allResults: SearchResult[] = []

        if (filterType === "all" || filterType === "page") {
          const pages = await getOrgPages(currentCompany.id, 50)
          pages.filter(p => p.title?.toLowerCase().includes(q)).forEach(p =>
            allResults.push({
              id: p.id, type: "page", title: p.title || "Untitled",
              subtitle: p.visibility, icon: <FileText size={13} className="text-blue-400" />
            })
          )
        }

        if (filterType === "all" || filterType === "project") {
          const projects = await getOrgProjects(currentCompany.id)
          projects.filter(p => p.name?.toLowerCase().includes(q)).forEach(p =>
            allResults.push({
              id: p.id, type: "project", title: p.name,
              subtitle: p.status, icon: <FolderKanban size={13} className="text-green-400" />
            })
          )
        }

        if (filterType === "all" || filterType === "team") {
          const teams = await getCompanyTeams(currentCompany.id)
          teams.filter(t => t.name?.toLowerCase().includes(q)).forEach(t =>
            allResults.push({
              id: t.id, type: "team", title: t.name,
              subtitle: t.description, icon: <Hash size={13} className="text-purple-400" />
            })
          )
        }

        if (filterType === "all" || filterType === "member") {
          const members = await getCompanyMembers(currentCompany.id)
          members.filter(m => m.user_profiles?.user_name?.toLowerCase().includes(q)).forEach(m =>
            allResults.push({
              id: m.user_id, type: "member",
              title: m.user_profiles?.user_name || "Unknown",
              subtitle: m.job_title, icon: <Users size={13} className="text-orange-400" />
            })
          )
        }

        setResults(allResults)
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 200)

    return () => clearTimeout(timer)
  }, [query, filterType, currentCompany])

  const handleSelect = (result: SearchResult) => {
    onNavigate(result.type, result.id)
    // Save to recent
    const updated = [result.title, ...recentSearches.filter(s => s !== result.title)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem("noska_recent_searches", JSON.stringify(updated))
    setQuery("")
  }

  const filters = [
    { value: "all", label: "All" },
    { value: "page", label: "Pages" },
    { value: "project", label: "Projects" },
    { value: "team", label: "Teams" },
    { value: "member", label: "People" },
  ]

  return (
    <div className="relative">
      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[var(--surface-2)]/50 hover:bg-[var(--surface-2)] border border-[var(--border)]/60 rounded-xl transition-all">
        <Search size={12} className="text-[var(--muted)]" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => !query && setShowRecent(true)}
          onBlur={() => setTimeout(() => setShowRecent(false), 200)}
          placeholder="Search..."
          className="flex-1 bg-transparent text-[11px] text-[var(--text)] focus:outline-none placeholder:text-[var(--muted)]"
        />
        {query && (
          <button onClick={() => setQuery("")} className="text-[var(--muted)] cursor-pointer">
            <X size={10} />
          </button>
        )}
      </div>

      {/* Filters */}
      {query && (
        <div className="flex gap-0.5 mt-1 px-1">
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => setFilterType(f.value)}
              className={`px-2 py-0.5 rounded text-[8px] font-semibold transition cursor-pointer ${
                filterType === f.value
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--muted)] hover:bg-[var(--surface-2)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Results dropdown */}
      <AnimatePresence>
        {(query && (results.length > 0 || loading)) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute left-0 right-0 top-full mt-1 z-50 bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-xl overflow-hidden"
          >
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={14} className="animate-spin text-[var(--muted)]" />
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto py-1">
                {results.slice(0, 10).map(r => (
                  <button
                    key={`${r.type}-${r.id}`}
                    onClick={() => handleSelect(r)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--surface-2)] transition cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-[var(--surface-2)] flex items-center justify-center shrink-0">
                      {r.icon}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-[11px] font-medium text-[var(--text)] truncate">{r.title}</p>
                      {r.subtitle && <p className="text-[9px] text-[var(--muted)] truncate">{r.subtitle}</p>}
                    </div>
                    <span className="text-[8px] text-[var(--muted)] uppercase">{r.type}</span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent searches */}
      <AnimatePresence>
        {showRecent && !query && recentSearches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute left-0 right-0 top-full mt-1 z-50 bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-xl p-2"
          >
            <p className="text-[9px] font-bold text-[var(--muted)] px-2 mb-1">Recent</p>
            {recentSearches.map((s, i) => (
              <button
                key={i}
                onClick={() => setQuery(s)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--surface-2)] transition cursor-pointer text-left"
              >
                <Clock size={10} className="text-[var(--muted)]" />
                <span className="text-[11px] text-[var(--text)]">{s}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
