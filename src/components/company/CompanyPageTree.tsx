import React, { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronRight, ChevronDown, FileText, FolderOpen, Plus,
  MoreHorizontal, Trash2, Edit2, Eye, EyeOff, Globe, Lock,
  Hash, Loader2, GripVertical, Star
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useCompany } from "../../contexts/CompanyContext"
import {
  getOrgPages, type OrgPage
} from "../../lib/company"

interface PageNode extends OrgPage {
  children: PageNode[]
  expanded?: boolean
}

interface CompanyPageTreeProps {
  onNavigateToPage?: (pageId: string) => void
  onStarPage?: (pageId: string) => void
  starredPages?: Set<string>
}

export function CompanyPageTree({ onNavigateToPage, onStarPage, starredPages }: CompanyPageTreeProps) {
  const { currentCompany } = useCompany()
  const [pages, setPages] = useState<OrgPage[]>([])
  const [tree, setTree] = useState<PageNode[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const fetchPages = useCallback(async () => {
    if (!currentCompany) return
    setLoading(true)
    try {
      const data = await getOrgPages(currentCompany.id)
      setPages(data)
      buildTree(data)
    } catch { setPages([]); setTree([]) }
    finally { setLoading(false) }
  }, [currentCompany])

  useEffect(() => { fetchPages() }, [fetchPages])

  const buildTree = (flatPages: OrgPage[]) => {
    const map = new Map<string, PageNode>()
    const roots: PageNode[] = []

    flatPages.forEach(p => {
      map.set(p.id, { ...p, children: [], expanded: expandedIds.has(p.id) })
    })

    flatPages.forEach(p => {
      const node = map.get(p.id)!
      if (p.parent_page_id && map.has(p.parent_page_id)) {
        map.get(p.parent_page_id)!.children.push(node)
      } else {
        roots.push(node)
      }
    })

    setTree(roots)
  }

  useEffect(() => { buildTree(pages) }, [expandedIds, pages])

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const getVisibilityIcon = (v?: string) => {
    switch (v) {
      case "private": return <Lock size={10} className="text-red-400" />
      case "team": return <Hash size={10} className="text-blue-400" />
      case "public": return <Globe size={10} className="text-green-400" />
      default: return <Eye size={10} className="text-[var(--muted)]" />
    }
  }

  const renderNode = (node: PageNode, depth: number = 0) => {
    const hasChildren = node.children.length > 0
    const isExpanded = expandedIds.has(node.id)
    const isStarred = starredPages?.has(node.id)

    return (
      <div key={node.id}>
        <div
          className="group flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-[var(--surface-2)] transition-all cursor-pointer"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {/* Expand toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); if (hasChildren) toggleExpand(node.id) }}
            className={`w-4 h-4 flex items-center justify-center shrink-0 transition-transform ${
              hasChildren ? "opacity-100" : "opacity-0"
            }`}
          >
            {hasChildren && (
              <ChevronDown
                size={10}
                className={`text-[var(--muted)] transition-transform ${isExpanded ? "" : "-rotate-90"}`}
              />
            )}
          </button>

          {/* Page icon */}
          <span className="text-[13px] shrink-0">{node.icon || "📄"}</span>

          {/* Title */}
          <span
            className="flex-1 text-[12px] font-medium text-[var(--text)] truncate group-hover:text-[var(--accent)]"
            onClick={() => onNavigateToPage?.(node.id)}
          >
            {node.title || "Untitled"}
          </span>

          {/* Visibility */}
          <span className="opacity-0 group-hover:opacity-100 transition-opacity">
            {getVisibilityIcon(node.visibility)}
          </span>

          {/* Star */}
          <button
            onClick={(e) => { e.stopPropagation(); onStarPage?.(node.id) }}
            className={`opacity-0 group-hover:opacity-100 transition-opacity ${
              isStarred ? "!opacity-100 text-amber-400" : "text-[var(--muted)]"
            }`}
          >
            <Star size={10} fill={isStarred ? "currentColor" : "none"} />
          </button>
        </div>

        {/* Children */}
        <AnimatePresence>
          {isExpanded && hasChildren && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              {node.children.map(child => renderNode(child, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 size={14} className="animate-spin text-[var(--muted)]" />
      </div>
    )
  }

  if (tree.length === 0) {
    return (
      <div className="p-3 text-center">
        <p className="text-[11px] text-[var(--muted)]">No pages yet</p>
      </div>
    )
  }

  return (
    <div className="py-1 px-1">
      {tree.map(node => renderNode(node))}
    </div>
  )
}
