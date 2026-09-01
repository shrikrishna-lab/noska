import React, { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Star, FileText, FolderKanban, Loader2, X } from "lucide-react"
import { useCompany } from "../../contexts/CompanyContext"
import {
  getOrgPages, getOrgProjects, type OrgPage, type OrgProject
} from "../../lib/company"

interface CompanyFavoritesProps {
  onNavigateToPage?: (pageId: string) => void
  onNavigateToProject?: (projectId: string) => void
}

export function CompanyFavorites({ onNavigateToPage, onNavigateToProject }: CompanyFavoritesProps) {
  const { currentCompany } = useCompany()
  const [starredPageIds, setStarredPageIds] = useState<Set<string>>(new Set())
  const [starredProjectIds, setStarredProjectIds] = useState<Set<string>>(new Set())
  const [pages, setPages] = useState<OrgPage[]>([])
  const [projects, setProjects] = useState<OrgProject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem("noska_company_favorites")
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setStarredPageIds(new Set(parsed.pages || []))
        setStarredProjectIds(new Set(parsed.projects || []))
      } catch {}
    }
  }, [])

  const saveFavorites = useCallback(() => {
    localStorage.setItem("noska_company_favorites", JSON.stringify({
      pages: Array.from(starredPageIds),
      projects: Array.from(starredProjectIds),
    }))
  }, [starredPageIds, starredProjectIds])

  useEffect(() => { saveFavorites() }, [starredPageIds, starredProjectIds, saveFavorites])

  useEffect(() => {
    if (!currentCompany) return
    const fetchAll = async () => {
      setLoading(true)
      try {
        const [p, pr] = await Promise.all([
          getOrgPages(currentCompany.id),
          getOrgProjects(currentCompany.id)
        ])
        setPages(p)
        setProjects(pr)
      } catch {}
      finally { setLoading(false) }
    }
    fetchAll()
  }, [currentCompany])

  const togglePageStar = (id: string) => {
    setStarredPageIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleProjectStar = (id: string) => {
    setStarredProjectIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const starredPages = pages.filter(p => starredPageIds.has(p.id))
  const starredProjects = projects.filter(p => starredProjectIds.has(p.id))
  const total = starredPages.length + starredProjects.length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 size={16} className="animate-spin text-[var(--muted)]" />
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-center">
        <Star size={24} className="text-[var(--muted)] mb-2" />
        <p className="text-[13px] font-medium text-[var(--text)]">No favorites yet</p>
        <p className="text-[11px] text-[var(--muted)] mt-1">Star pages and projects to see them here</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {starredPages.length > 0 && (
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] px-2 mb-2">Pages</h4>
          <div className="space-y-0.5">
            {starredPages.map(page => (
              <motion.div
                key={page.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="group flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[var(--surface-2)] transition-all cursor-pointer"
                onClick={() => onNavigateToPage?.(page.id)}
              >
                <span className="text-[13px]">{page.icon || "📄"}</span>
                <span className="flex-1 text-[12px] font-medium text-[var(--text)] truncate">
                  {page.title || "Untitled"}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); togglePageStar(page.id) }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-400"
                >
                  <Star size={10} fill="currentColor" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {starredProjects.length > 0 && (
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] px-2 mb-2">Projects</h4>
          <div className="space-y-0.5">
            {starredProjects.map(project => (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="group flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[var(--surface-2)] transition-all cursor-pointer"
                onClick={() => onNavigateToProject?.(project.id)}
              >
                <FolderKanban size={13} className="text-[var(--muted)]" />
                <span className="flex-1 text-[12px] font-medium text-[var(--text)] truncate">
                  {project.name}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleProjectStar(project.id) }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-400"
                >
                  <Star size={10} fill="currentColor" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Hook for managing stars globally
export function useFavorites() {
  const [starredPageIds, setStarredPageIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("noska_company_favorites")
      return stored ? new Set(JSON.parse(stored).pages || []) : new Set()
    } catch { return new Set() }
  })

  const [starredProjectIds, setStarredProjectIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("noska_company_favorites")
      return stored ? new Set(JSON.parse(stored).projects || []) : new Set()
    } catch { return new Set() }
  })

  const togglePageStar = useCallback((id: string) => {
    setStarredPageIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      localStorage.setItem("noska_company_favorites", JSON.stringify({
        pages: Array.from(next),
        projects: Array.from(starredProjectIds),
      }))
      return next
    })
  }, [starredProjectIds])

  const toggleProjectStar = useCallback((id: string) => {
    setStarredProjectIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      localStorage.setItem("noska_company_favorites", JSON.stringify({
        pages: Array.from(starredPageIds),
        projects: Array.from(next),
      }))
      return next
    })
  }, [starredPageIds])

  const isPageStarred = useCallback((id: string) => starredPageIds.has(id), [starredPageIds])
  const isProjectStarred = useCallback((id: string) => starredProjectIds.has(id), [starredProjectIds])

  return { starredPageIds, starredProjectIds, togglePageStar, toggleProjectStar, isPageStarred, isProjectStarred }
}
