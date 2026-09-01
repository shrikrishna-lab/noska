import React, { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search, FileText, FolderKanban, Users, Building2, Hash,
  ArrowRight, Loader2, Command, CornerDownLeft
} from "lucide-react"
import { useCompany } from "../../contexts/CompanyContext"
import { searchCompany, type SearchResult } from "../../lib/company"

interface CompanyCommandPaletteProps {
  open: boolean
  onClose: () => void
  onNavigate: (view: string, id?: string) => void
}

export function CompanyCommandPalette({ open, onClose, onNavigate }: CompanyCommandPaletteProps) {
  const { currentCompany } = useCompany()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery("")
      setResults([])
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Search on query change
  useEffect(() => {
    if (!currentCompany || !query.trim()) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const userId = localStorage.getItem("noska_user_id") || ""
        const data = await searchCompany(currentCompany.id, query.trim(), userId)
        setResults(data)
        setSelectedIndex(0)
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 200)
    return () => clearTimeout(timer)
  }, [query, currentCompany])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault()
      handleSelect(results[selectedIndex])
    } else if (e.key === "Escape") {
      onClose()
    }
  }, [results, selectedIndex, onClose])

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const item = listRef.current.children[selectedIndex] as HTMLElement
      item?.scrollIntoView({ block: "nearest" })
    }
  }, [selectedIndex])

  const handleSelect = (result: SearchResult) => {
    onClose()
    switch (result.type) {
      case "page": onNavigate("page", result.id); break
      case "project": onNavigate("projects"); break
      case "team": onNavigate("teamHome", result.id); break
      case "member": onNavigate("members"); break
    }
  }

  const typeConfig: Record<string, { icon: React.FC<{ size: number; className?: string }>; color: string; label: string }> = {
    page: { icon: FileText, color: "text-blue-500", label: "Page" },
    project: { icon: FolderKanban, color: "text-orange-500", label: "Project" },
    team: { icon: Building2, color: "text-purple-500", label: "Team" },
    member: { icon: Users, color: "text-green-500", label: "Person" },
  }

  // Quick actions when no query
  const quickActions = [
    { label: "New Page", icon: FileText, action: () => { onClose(); onNavigate("pages") } },
    { label: "New Project", icon: FolderKanban, action: () => { onClose(); onNavigate("projects") } },
    { label: "Invite Member", icon: Users, action: () => { onClose(); onNavigate("members") } },
    { label: "Create Team", icon: Building2, action: () => { onClose(); onNavigate("teams") } },
  ]

  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 z-[201] w-full max-w-[520px]"
          >
            <div className="bg-[var(--surface)]/95 dark:bg-[#161a23]/95 backdrop-blur-2xl border border-[var(--border)]/80 rounded-2xl shadow-2xl overflow-hidden">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]/60">
                <Search size={16} className="text-[var(--muted)] shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search pages, projects, teams, people..."
                  className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--muted)] outline-none"
                />
                <kbd className="text-[10px] text-[var(--muted)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded border border-[var(--border)] font-mono">
                  ESC
                </kbd>
              </div>

              {/* Results / Quick Actions */}
              <div ref={listRef} className="max-h-[360px] overflow-y-auto p-1.5">
                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={16} className="animate-spin text-[var(--muted)]" />
                  </div>
                )}

                {!loading && query && results.length === 0 && (
                  <div className="py-8 text-center">
                    <p className="text-xs text-[var(--muted)]">No results for "{query}"</p>
                  </div>
                )}

                {!loading && !query && (
                  <div>
                    <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                      Quick Actions
                    </div>
                    {quickActions.map((action, i) => (
                      <button
                        key={action.label}
                        onClick={action.action}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-[var(--hover)] transition-colors cursor-pointer group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center">
                          <action.icon size={13} className="text-[var(--muted)]" />
                        </div>
                        <span className="text-xs font-semibold text-[var(--text)]">{action.label}</span>
                        <ArrowRight size={12} className="ml-auto text-[var(--muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                )}

                {!loading && results.length > 0 && (
                  <div>
                    <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                      Results
                    </div>
                    {results.map((result, i) => {
                      const config = typeConfig[result.type]
                      const Icon = config.icon
                      return (
                        <button
                          key={`${result.type}-${result.id}`}
                          onClick={() => handleSelect(result)}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                            i === selectedIndex
                              ? "bg-[var(--accent)]/10 border border-[var(--accent)]/20"
                              : "hover:bg-[var(--hover)] border border-transparent"
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center`}>
                            {result.icon ? (
                              <span className="text-sm">{result.icon}</span>
                            ) : (
                              <Icon size={13} className={config.color} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-[var(--text)] truncate">{result.title}</div>
                            {result.subtitle && (
                              <div className="text-[10px] text-[var(--muted)] truncate">{result.subtitle}</div>
                            )}
                          </div>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${config.color} bg-[var(--surface-2)]`}>
                            {config.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-4 px-4 py-2 border-t border-[var(--border)]/60 text-[10px] text-[var(--muted)]">
                <span className="flex items-center gap-1">
                  <kbd className="bg-[var(--surface-2)] px-1 py-0.5 rounded border border-[var(--border)] font-mono">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <CornerDownLeft size={10} />
                  Select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="bg-[var(--surface-2)] px-1 py-0.5 rounded border border-[var(--border)] font-mono">ESC</kbd>
                  Close
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
