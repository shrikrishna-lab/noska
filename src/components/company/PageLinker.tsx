import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Link as LinkIcon, FileText, Search, X, ArrowRight } from "lucide-react"
import { useCompany } from "../../contexts/CompanyContext"
import { getOrgPages, type OrgPage } from "../../lib/company"

interface PageLinkerProps {
  onSelect: (pageId: string, pageTitle: string) => void
}

export function PageLinker({ onSelect }: PageLinkerProps) {
  const { currentCompany } = useCompany()
  const [pages, setPages] = useState<OrgPage[]>([])
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open || !currentCompany) return
    getOrgPages(currentCompany.id, 200).then(setPages).catch(() => {})
  }, [open, currentCompany])

  const filtered = pages.filter(p =>
    p.title?.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 10)

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="p-1 rounded hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)] transition cursor-pointer"
        title="Link to page"
      >
        <LinkIcon size={14} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute left-0 top-full mt-1 z-50 w-72 bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-xl overflow-hidden"
            >
              <div className="p-2 border-b border-[var(--border)]/70">
                <div className="flex items-center gap-2 px-2 py-1.5 bg-[var(--surface-2)] rounded-lg">
                  <Search size={11} className="text-[var(--muted)]" />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search pages..."
                    className="flex-1 bg-transparent text-[11px] text-[var(--text)] focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto p-1">
                {filtered.map(page => (
                  <button
                    key={page.id}
                    onClick={() => {
                      onSelect(page.id, page.title || "Untitled")
                      setOpen(false)
                      setQuery("")
                    }}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-[var(--surface-2)] transition cursor-pointer text-left"
                  >
                    <span className="text-sm">{page.icon || "📄"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-[var(--text)] truncate">{page.title || "Untitled"}</p>
                      <p className="text-[9px] text-[var(--muted)] capitalize">{page.visibility}</p>
                    </div>
                    <ArrowRight size={10} className="text-[var(--muted)]" />
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="text-center text-[10px] text-[var(--muted)] py-3">No pages found</p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
