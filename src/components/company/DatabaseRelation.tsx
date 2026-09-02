import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Link2, X, Search, Loader2, ArrowRight } from "lucide-react"
import { supabase } from "../../lib/supabase"

interface Relation {
  id: string
  source_id: string
  target_id: string
  target_title?: string
}

interface DatabaseRelationProps {
  sourceTable: string
  sourceId: string
  targetTable: string
  targetTitleField: string
  relations: Relation[]
  onAdd: (targetId: string) => void
  onRemove: (relationId: string) => void
}

export function DatabaseRelation({ sourceTable, sourceId, targetTable, targetTitleField, relations, onAdd, onRemove }: DatabaseRelationProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [targets, setTargets] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    const fetchTargets = async () => {
      setLoading(true)
      try {
        const { data } = await (supabase as any).from(targetTable).select(`id, ${targetTitleField}`).limit(50)
        setTargets(data || [])
      } catch { setTargets([]) }
      finally { setLoading(false) }
    }
    fetchTargets()
  }, [open, targetTable, targetTitleField])

  const filtered = targets.filter(t =>
    String(t[targetTitleField]).toLowerCase().includes(search.toLowerCase()) &&
    !relations.some(r => r.target_id === t.id)
  )

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5">
        {relations.map(r => (
          <span key={r.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[10px] font-medium text-[var(--text)]">
            {r.target_title || r.target_id.slice(0, 8)}
            <button onClick={() => onRemove(r.id)} className="text-[var(--muted)] hover:text-red-500 cursor-pointer"><X size={9} /></button>
          </span>
        ))}
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-dashed border-[var(--border)] text-[10px] font-medium text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition cursor-pointer"
        >
          <Link2 size={9} /> Link
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute left-0 top-full mt-1 z-50 w-64 bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-xl overflow-hidden"
            >
              <div className="p-2 border-b border-[var(--border)]/70">
                <div className="flex items-center gap-2 px-2 py-1.5 bg-[var(--surface-2)] rounded-lg">
                  <Search size={11} className="text-[var(--muted)]" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="flex-1 bg-transparent text-[10px] text-[var(--text)] focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto p-1">
                {loading ? (
                  <div className="flex items-center justify-center py-4"><Loader2 size={12} className="animate-spin text-[var(--muted)]" /></div>
                ) : filtered.length === 0 ? (
                  <p className="text-center text-[10px] text-[var(--muted)] py-3">No items</p>
                ) : (
                  filtered.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { onAdd(t.id); setOpen(false); setSearch("") }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--surface-2)] transition text-left cursor-pointer"
                    >
                      <span className="text-[11px] text-[var(--text)] truncate">{String(t[targetTitleField])}</span>
                      <ArrowRight size={10} className="ml-auto text-[var(--muted)]" />
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
