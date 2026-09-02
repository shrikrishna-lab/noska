import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Link2, X, Search, Loader2, ArrowRight, Unlink } from "lucide-react"
import { supabase } from "../../lib/supabase"

interface TaskDep {
  id: string
  dependency_id: string
  dependency_title?: string
}

interface TaskDependenciesProps {
  taskId: string
  dependencies: TaskDep[]
  onAdd: (depId: string) => void
  onRemove: (depId: string) => void
}

export function TaskDependencies({ taskId, dependencies, onAdd, onRemove }: TaskDependenciesProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    const fetchTasks = async () => {
      setLoading(true)
      try {
        const { data } = await (supabase as any)
          .from("tasks")
          .select("id, title")
          .neq("id", taskId)
          .limit(50)
        setTasks(data || [])
      } catch { setTasks([]) }
      finally { setLoading(false) }
    }
    fetchTasks()
  }, [open, taskId])

  const filtered = tasks.filter(t =>
    t.title?.toLowerCase().includes(search.toLowerCase()) &&
    !dependencies.some(d => d.dependency_id === t.id)
  )

  return (
    <div className="space-y-1.5">
      {dependencies.map(d => (
        <div key={d.id} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-[var(--surface-2)] group">
          <Link2 size={10} className="text-[var(--muted)]" />
          <span className="text-[10px] text-[var(--text)] flex-1 truncate">{d.dependency_title || d.dependency_id.slice(0, 8)}</span>
          <button onClick={() => onRemove(d.id)} className="opacity-0 group-hover:opacity-100 text-[var(--muted)] hover:text-red-500 cursor-pointer">
            <Unlink size={9} />
          </button>
        </div>
      ))}

      <div className="relative">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-1 text-[10px] text-[var(--accent)] cursor-pointer">
          <Link2 size={9} /> Add dependency
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute left-0 top-full mt-1 z-50 w-56 bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-xl overflow-hidden"
            >
              <div className="p-2 border-b border-[var(--border)]/70">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-[var(--surface-2)] rounded-lg">
                  <Search size={10} className="text-[var(--muted)]" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..." className="flex-1 bg-transparent text-[10px] text-[var(--text)] focus:outline-none" autoFocus />
                </div>
              </div>
              <div className="max-h-40 overflow-y-auto p-1">
                {loading ? (
                  <div className="flex items-center justify-center py-3"><Loader2 size={12} className="animate-spin text-[var(--muted)]" /></div>
                ) : filtered.length === 0 ? (
                  <p className="text-center text-[10px] text-[var(--muted)] py-3">No tasks</p>
                ) : (
                  filtered.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { onAdd(t.id); setOpen(false); setSearch("") }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--surface-2)] transition text-left cursor-pointer"
                    >
                      <span className="text-[10px] text-[var(--text)] truncate">{t.title}</span>
                      <ArrowRight size={9} className="ml-auto text-[var(--muted)]" />
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
