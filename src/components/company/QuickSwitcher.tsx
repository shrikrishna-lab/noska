import React, { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search, FileText, FolderKanban, Users, Hash, ArrowRight,
  CornerDownLeft, ArrowUp, ArrowDown, X
} from "lucide-react"
import { useCompany } from "../../contexts/CompanyContext"
import {
  getOrgPages, getOrgProjects, getCompanyTeams, getCompanyMembers,
  type OrgPage, type OrgProject, type OrgTeam, type OrganizationMember
} from "../../lib/company"

interface QuickSwitcherItem {
  id: string
  type: "page" | "project" | "team" | "member"
  title: string
  subtitle?: string
  icon: React.ReactNode
}

interface QuickSwitcherProps {
  open: boolean
  onClose: () => void
  onNavigate: (type: string, id: string) => void
}

export function QuickSwitcher({ open, onClose, onNavigate }: QuickSwitcherProps) {
  const { currentCompany } = useCompany()
  const [query, setQuery] = useState("")
  const [items, setItems] = useState<QuickSwitcherItem[]>([])
  const [filtered, setFiltered] = useState<QuickSwitcherItem[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open || !currentCompany) return
    const fetchAll = async () => {
      setLoading(true)
      try {
        const [pages, projects, teams, members] = await Promise.all([
          getOrgPages(currentCompany.id, 100),
          getOrgProjects(currentCompany.id),
          getCompanyTeams(currentCompany.id),
          getCompanyMembers(currentCompany.id),
        ])

        const allItems: QuickSwitcherItem[] = [
          ...pages.map(p => ({
            id: p.id, type: "page" as const, title: p.title || "Untitled",
            subtitle: p.visibility, icon: <FileText size={14} className="text-blue-400" />
          })),
          ...projects.map(p => ({
            id: p.id, type: "project" as const, title: p.name,
            subtitle: p.status, icon: <FolderKanban size={14} className="text-green-400" />
          })),
          ...teams.map(t => ({
            id: t.id, type: "team" as const, title: t.name,
            subtitle: t.description, icon: <Hash size={14} className="text-purple-400" />
          })),
          ...members.map(m => ({
            id: m.user_id, type: "member" as const,
            title: m.user_profiles?.user_name || "Unknown",
            subtitle: m.job_title, icon: <Users size={14} className="text-orange-400" />
          })),
        ]
        setItems(allItems)
        setFiltered(allItems)
      } catch { setItems([]); setFiltered([]) }
      finally { setLoading(false) }
    }
    fetchAll()
  }, [open, currentCompany])

  useEffect(() => {
    if (!query.trim()) {
      setFiltered(items)
    } else {
      const q = query.toLowerCase()
      setFiltered(items.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle?.toLowerCase().includes(q)
      ))
    }
    setSelectedIndex(0)
  }, [query, items])

  useEffect(() => {
    if (open) {
      setQuery("")
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (filtered[selectedIndex]) {
        onNavigate(filtered[selectedIndex].type, filtered[selectedIndex].id)
        onClose()
      }
    } else if (e.key === "Escape") {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -20 }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            className="fixed z-[201] top-[15%] left-1/2 -translate-x-1/2 w-[520px] bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)]/70">
              <Search size={16} className="text-[var(--muted)] shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search pages, projects, teams, people..."
                className="flex-1 bg-transparent text-[14px] text-[var(--text)] focus:outline-none placeholder:text-[var(--muted)]"
              />
              <kbd className="text-[9px] bg-[var(--surface-2)] px-1.5 py-0.5 rounded border border-[var(--border)] font-mono text-[var(--muted)]">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[400px] overflow-y-auto py-2">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[12px] text-[var(--muted)]">No results found</p>
                </div>
              ) : (
                <>
                  {(["page", "project", "team", "member"] as const).map(type => {
                    const groupItems = filtered.filter(i => i.type === type)
                    if (groupItems.length === 0) return null
                    return (
                      <div key={type}>
                        <div className="px-5 py-1.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--muted)]">
                            {type === "member" ? "People" : type.charAt(0).toUpperCase() + type.slice(1) + "s"}
                          </span>
                        </div>
                        {groupItems.map(item => {
                          const globalIndex = filtered.indexOf(item)
                          return (
                            <div
                              key={item.id}
                              onClick={() => { onNavigate(item.type, item.id); onClose() }}
                              className={`flex items-center gap-3 px-5 py-2.5 cursor-pointer transition ${
                                globalIndex === selectedIndex
                                  ? "bg-[var(--accent)]/10"
                                  : "hover:bg-[var(--surface-2)]"
                              }`}
                            >
                              <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] flex items-center justify-center shrink-0">
                                {item.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-medium text-[var(--text)] truncate">{item.title}</p>
                                {item.subtitle && (
                                  <p className="text-[10px] text-[var(--muted)] truncate">{item.subtitle}</p>
                                )}
                              </div>
                              {globalIndex === selectedIndex && (
                                <CornerDownLeft size={12} className="text-[var(--muted)]" />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-4 px-5 py-2.5 border-t border-[var(--border)]/70 text-[9px] text-[var(--muted)]">
              <span className="flex items-center gap-1"><ArrowUp size={9} /><ArrowDown size={9} /> Navigate</span>
              <span className="flex items-center gap-1"><CornerDownLeft size={9} /> Open</span>
              <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border)]">ESC</kbd> Close</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
