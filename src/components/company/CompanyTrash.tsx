import React, { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Trash2, RotateCcw, FileText, FolderKanban, Clock, Loader2,
  AlertTriangle, X, Check
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useCompany } from "../../contexts/CompanyContext"
import { writeAuditLog, type OrgPage } from "../../lib/company"

interface TrashItem {
  id: string
  title: string
  type: "page" | "project"
  icon?: string
  deleted_at: string
  table_name: string
}

interface CompanyTrashProps {
  onRestore?: () => void
}

export function CompanyTrash({ onRestore }: CompanyTrashProps) {
  const { currentCompany, currentMember } = useCompany()
  const [items, setItems] = useState<TrashItem[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [emptying, setEmptying] = useState(false)

  const fetchTrash = useCallback(async () => {
    if (!currentCompany) return
    setLoading(true)
    try {
      // Fetch soft-deleted pages
      const { data: pages } = await supabase
        .from("pages" as any)
        .select("id, title, icon, deleted_at, organization_id")
        .eq("organization_id", currentCompany.id)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false })

      // Fetch soft-deleted projects
      const { data: projects } = await supabase
        .from("projects" as any)
        .select("id, name, deleted_at, organization_id")
        .eq("organization_id", currentCompany.id)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false })

      const allItems: TrashItem[] = [
        ...(pages || []).map((p: any) => ({
          id: p.id, title: p.title || "Untitled", type: "page" as const,
          icon: p.icon, deleted_at: p.deleted_at, table_name: "pages"
        })),
        ...(projects || []).map((p: any) => ({
          id: p.id, title: p.name || "Untitled", type: "project" as const,
          icon: "📁", deleted_at: p.deleted_at, table_name: "projects"
        })),
      ].sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime())

      setItems(allItems)
    } catch { setItems([]) }
    finally { setLoading(false) }
  }, [currentCompany])

  useEffect(() => { fetchTrash() }, [fetchTrash])

  const handleRestore = async (item: TrashItem) => {
    setRestoring(item.id)
    try {
      await supabase
        .from(item.table_name as any)
        .update({ deleted_at: null })
        .eq("id", item.id)

      if (currentMember) {
        await writeAuditLog(
          currentCompany!.id,
          currentMember.user_id,
          "restore",
          item.table_name,
          item.id
        )
      }

      setItems(prev => prev.filter(i => i.id !== item.id))
      onRestore?.()
    } catch {}
    finally { setRestoring(null) }
  }

  const handlePermanentDelete = async (item: TrashItem) => {
    try {
      await supabase
        .from(item.table_name as any)
        .delete()
        .eq("id", item.id)

      if (currentMember) {
        await writeAuditLog(
          currentCompany!.id,
          currentMember.user_id,
          "permanent_delete",
          item.table_name,
          item.id
        )
      }

      setItems(prev => prev.filter(i => i.id !== item.id))
      setConfirmDelete(null)
    } catch {}
  }

  const handleEmptyTrash = async () => {
    setEmptying(true)
    try {
      for (const item of items) {
        await supabase.from(item.table_name as any).delete().eq("id", item.id)
      }
      if (currentMember && items.length > 0) {
        await writeAuditLog(
          currentCompany!.id,
          currentMember.user_id,
          "empty_trash",
          "trash",
          `${items.length} items`
        )
      }
      setItems([])
    } catch {}
    finally { setEmptying(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 size={16} className="animate-spin text-[var(--muted)]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      {items.length > 0 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-[11px] text-[var(--muted)]">{items.length} item{items.length !== 1 ? "s" : ""} in trash</p>
          <button
            onClick={handleEmptyTrash}
            disabled={emptying}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-red-500 hover:bg-red-500/10 transition disabled:opacity-50 cursor-pointer"
          >
            {emptying ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
            Empty Trash
          </button>
        </div>
      )}

      {/* Items */}
      <div className="space-y-1">
        <AnimatePresence mode="popLayout">
          {items.map(item => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8, height: 0 }}
              className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]/50 hover:border-[var(--border)] transition-all"
            >
              <span className="text-[13px]">{item.icon || (item.type === "page" ? "📄" : "📁")}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium text-[var(--text)] truncate">{item.title}</div>
                <div className="text-[10px] text-[var(--muted)] flex items-center gap-1">
                  <Clock size={9} />
                  Deleted {new Date(item.deleted_at).toLocaleDateString()}
                  <span className="mx-1">·</span>
                  <span className="capitalize">{item.type}</span>
                </div>
              </div>

              {confirmDelete === item.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePermanentDelete(item)}
                    className="px-2 py-1 rounded-lg bg-red-500 text-white text-[10px] font-semibold hover:bg-red-600 transition cursor-pointer"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="px-2 py-1 rounded-lg bg-[var(--surface-2)] text-[var(--muted)] text-[10px] font-semibold hover:bg-[var(--surface-3)] transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleRestore(item)}
                    disabled={restoring === item.id}
                    className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-green-500 transition cursor-pointer"
                    title="Restore"
                  >
                    {restoring === item.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <RotateCcw size={12} />
                    )}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(item.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--muted)] hover:text-red-500 transition cursor-pointer"
                    title="Delete permanently"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center h-40 text-center">
          <Trash2 size={24} className="text-[var(--muted)] mb-2" />
          <p className="text-[13px] font-medium text-[var(--text)]">Trash is empty</p>
          <p className="text-[11px] text-[var(--muted)] mt-1">Deleted items will appear here</p>
        </div>
      )}
    </div>
  )
}
