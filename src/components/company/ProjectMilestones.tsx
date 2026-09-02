import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Flag, Plus, Loader2, Trash2, Check, Calendar, Edit2, X } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useCompany } from "../../contexts/CompanyContext"

interface Milestone {
  id: string
  title: string
  due_date: string | null
  completed: boolean
  completed_at: string | null
}

interface ProjectMilestonesProps {
  projectId: string
}

export function ProjectMilestones({ projectId }: ProjectMilestonesProps) {
  const { currentMember } = useCompany()
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newDate, setNewDate] = useState("")
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  React.useEffect(() => {
    const fetchMilestones = async () => {
      try {
        const { data } = await (supabase as any)
          .from("project_milestones")
          .select("*")
          .eq("project_id", projectId)
          .order("due_date", { ascending: true })
        setMilestones(data || [])
      } catch { setMilestones([]) }
      finally { setLoading(false) }
    }
    fetchMilestones()
  }, [projectId])

  const handleAdd = async () => {
    if (!newTitle.trim()) return
    setSaving(true)
    try {
      const { data } = await (supabase as any)
        .from("project_milestones")
        .insert({ project_id: projectId, title: newTitle.trim(), due_date: newDate || null, completed: false })
        .select()
        .single()
      if (data) setMilestones(prev => [...prev, data])
      setNewTitle(""); setNewDate(""); setShowAdd(false)
    } catch {}
    finally { setSaving(false) }
  }

  const toggleComplete = async (id: string, completed: boolean) => {
    try {
      await (supabase as any)
        .from("project_milestones")
        .update({ completed: !completed, completed_at: !completed ? new Date().toISOString() : null })
        .eq("id", id)
      setMilestones(prev => prev.map(m => m.id === id ? { ...m, completed: !completed, completed_at: !completed ? new Date().toISOString() : null } : m))
    } catch {}
  }

  const handleDelete = async (id: string) => {
    try {
      await (supabase as any).from("project_milestones").delete().eq("id", id)
      setMilestones(prev => prev.filter(m => m.id !== id))
    } catch {}
  }

  const completedCount = milestones.filter(m => m.completed).length
  const progress = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0

  if (loading) return <div className="flex items-center justify-center py-6"><Loader2 size={14} className="animate-spin text-[var(--muted)]" /></div>

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-[12px] font-bold text-[var(--text)]">Milestones</h4>
          <span className="text-[10px] text-[var(--muted)]">{completedCount}/{milestones.length}</span>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 text-[10px] text-[var(--accent)] cursor-pointer">
          <Plus size={10} /> Add milestone
        </button>
      </div>

      {/* Progress */}
      {milestones.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-[10px] font-bold text-[var(--text)]">{progress}%</span>
        </div>
      )}

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] space-y-2">
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Milestone title..." className="w-full px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[11px] text-[var(--text)]" autoFocus />
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[11px] text-[var(--text)]" />
              <div className="flex gap-2">
                <button onClick={handleAdd} disabled={saving || !newTitle.trim()} className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-[10px] font-semibold disabled:opacity-50 cursor-pointer">
                  {saving ? <Loader2 size={10} className="animate-spin" /> : "Add"}
                </button>
                <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded-lg bg-[var(--surface)] text-[var(--muted)] text-[10px] font-semibold cursor-pointer">Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-1">
        {milestones.map(m => (
          <div key={m.id} className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition group ${
            m.completed ? "bg-green-500/5 border-green-500/20" : "bg-[var(--surface)] border-[var(--border)]"
          }`}>
            <button
              onClick={() => toggleComplete(m.id, m.completed)}
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition cursor-pointer ${
                m.completed ? "bg-green-500 border-green-500 text-white" : "border-[var(--border)] hover:border-green-500"
              }`}
            >
              {m.completed && <Check size={10} />}
            </button>
            <div className="flex-1 min-w-0">
              <span className={`text-[11px] font-medium ${m.completed ? "line-through text-[var(--muted)]" : "text-[var(--text)]"}`}>
                {m.title}
              </span>
              {m.due_date && (
                <span className="flex items-center gap-1 text-[9px] text-[var(--muted)] mt-0.5">
                  <Calendar size={8} /> Due {new Date(m.due_date).toLocaleDateString()}
                </span>
              )}
            </div>
            <button onClick={() => handleDelete(m.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-[var(--muted)] hover:text-red-500 transition cursor-pointer">
              <Trash2 size={10} />
            </button>
          </div>
        ))}
      </div>

      {milestones.length === 0 && (
        <div className="text-center py-6">
          <Flag size={16} className="text-[var(--muted)] mx-auto mb-1" />
          <p className="text-[10px] text-[var(--muted)]">No milestones yet</p>
        </div>
      )}
    </div>
  )
}
