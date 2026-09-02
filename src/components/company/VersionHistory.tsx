import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { History, Loader2, X, RotateCcw, Clock, User, ChevronRight } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useCompany } from "../../contexts/CompanyContext"

interface Version {
  id: string
  page_id: string
  title: string
  blocks: any
  edited_by: string
  edited_at: string
  user_name?: string
}

interface VersionHistoryProps {
  pageId: string
  open: boolean
  onClose: () => void
  onRestore?: (version: Version) => void
}

export function VersionHistory({ pageId, open, onClose, onRestore }: VersionHistoryProps) {
  const { currentCompany } = useCompany()
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const fetchVersions = async () => {
      setLoading(true)
      try {
        const { data } = await supabase
          .from("page_versions" as any)
          .select("*")
          .eq("page_id", pageId)
          .order("edited_at", { ascending: false })
          .limit(50)

        if (data) {
          const userIds = [...new Set(data.map((v: any) => v.edited_by).filter(Boolean))]
          const { data: profiles } = userIds.length > 0
            ? await supabase.from("user_profiles").select("user_id, user_name").in("user_id", userIds)
            : { data: [] }

          const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]))
          const enriched = data.map((v: any) => ({
            ...v,
            user_name: profileMap.get(v.edited_by)?.user_name || "Unknown",
          }))
          setVersions(enriched)
        }
      } catch { setVersions([]) }
      finally { setLoading(false) }
    }
    fetchVersions()
  }, [open, pageId])

  const handleRestore = async (version: Version) => {
    setRestoring(version.id)
    try {
      await supabase
        .from("pages" as any)
        .update({ title: version.title, blocks: version.blocks } as any)
        .eq("id", pageId)
      onRestore?.(version)
      onClose()
    } catch {}
    finally { setRestoring(null) }
  }

  const formatTime = (date: string) => {
    const d = new Date(date)
    return d.toLocaleString()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[180] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 z-[181] w-[380px] bg-[var(--surface)] border-l border-[var(--border)] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]/70">
              <div className="flex items-center gap-2">
                <History size={15} className="text-[var(--muted)]" />
                <h2 className="text-[14px] font-bold text-[var(--text)]">Version History</h2>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-xl hover:bg-[var(--hover)] flex items-center justify-center text-[var(--muted)] cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Versions */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={16} className="animate-spin text-[var(--muted)]" />
                </div>
              ) : versions.length === 0 ? (
                <div className="text-center py-12">
                  <Clock size={24} className="text-[var(--muted)] mx-auto mb-2" />
                  <p className="text-[12px] text-[var(--muted)]">No version history yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {versions.map((version, i) => (
                    <motion.div
                      key={version.id}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="group relative flex items-start gap-3 p-3 rounded-xl hover:bg-[var(--surface-2)] transition"
                    >
                      {/* Timeline dot */}
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center">
                          <User size={12} className="text-[var(--muted)]" />
                        </div>
                        {i < versions.length - 1 && (
                          <div className="absolute top-full left-1/2 -translate-x-1/2 w-px h-4 bg-[var(--border)]" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-[var(--text)]">{version.user_name}</span>
                          <span className="text-[10px] text-[var(--muted)]">edited</span>
                        </div>
                        <p className="text-[10px] text-[var(--muted)] mt-0.5">
                          {formatTime(version.edited_at)}
                        </p>
                        {version.title && (
                          <p className="text-[10px] text-[var(--text)] mt-1 truncate">
                            Title: {version.title}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => handleRestore(version)}
                        disabled={restoring === version.id}
                        className="opacity-0 group-hover:opacity-100 transition p-1.5 rounded-lg hover:bg-[var(--accent)]/10 text-[var(--muted)] hover:text-[var(--accent)] cursor-pointer"
                        title="Restore this version"
                      >
                        {restoring === version.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <RotateCcw size={12} />
                        )}
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
