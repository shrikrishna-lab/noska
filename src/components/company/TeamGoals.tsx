import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Target, Plus, Loader2, Check, ChevronDown, Trash2, Edit2, X } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useCompany } from "../../contexts/CompanyContext"
import { writeAuditLog } from "../../lib/company"

interface Goal {
  id: string
  title: string
  description: string
  progress: number
  status: "not_started" | "in_progress" | "completed"
  target_date: string | null
  created_at: string
}

interface TeamGoalsProps {
  teamId: string
}

export function TeamGoals({ teamId }: TeamGoalsProps) {
  const { currentCompany, currentMember } = useCompany()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const { data } = await (supabase as any)
          .from("team_goals")
          .select("*")
          .eq("team_id", teamId)
          .order("created_at", { ascending: false })
        setGoals(data || [])
      } catch { setGoals([]) }
      finally { setLoading(false) }
    }
    fetchGoals()
  }, [teamId])

  const handleCreate = async () => {
    if (!newTitle.trim()) return
    setCreating(true)
    try {
      const { data } = await (supabase as any)
        .from("team_goals")
        .insert({ team_id: teamId, title: newTitle.trim(), description: newDesc.trim(), progress: 0, status: "not_started" })
        .select()
        .single()
      if (data) setGoals(prev => [data, ...prev])
      setNewTitle(""); setNewDesc(""); setShowCreate(false)
    } catch {}
    finally { setCreating(false) }
  }

  const handleUpdateProgress = async (goalId: string, progress: number) => {
    const status = progress >= 100 ? "completed" : progress > 0 ? "in_progress" : "not_started"
    try {
      await (supabase as any).from("team_goals").update({ progress, status }).eq("id", goalId)
      setGoals(prev => prev.map(g => g.id === goalId ? { ...g, progress, status } : g))
    } catch {}
  }

  const handleDelete = async (goalId: string) => {
    try {
      await (supabase as any).from("team_goals").delete().eq("id", goalId)
      setGoals(prev => prev.filter(g => g.id !== goalId))
    } catch {}
  }

  const statusColor = (s: string) => {
    switch (s) {
      case "completed": return "text-green-500 bg-green-500/10"
      case "in_progress": return "text-blue-500 bg-blue-500/10"
      default: return "text-[var(--muted)] bg-[var(--surface-2)]"
    }
  }

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 size={16} className="animate-spin text-[var(--muted)]" /></div>

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[12px] font-bold text-[var(--text)]">Goals & OKRs</h4>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 text-[10px] text-[var(--accent)] hover:underline cursor-pointer">
          <Plus size={10} /> Add goal
        </button>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] space-y-2">
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Goal title..." className="w-full px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[11px] text-[var(--text)]" autoFocus />
              <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)..." rows={2} className="w-full px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[11px] text-[var(--text)] resize-none" />
              <div className="flex gap-2">
                <button onClick={handleCreate} disabled={creating || !newTitle.trim()} className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-[10px] font-semibold disabled:opacity-50 cursor-pointer">
                  {creating ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />} Create
                </button>
                <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 rounded-lg bg-[var(--surface)] text-[var(--muted)] text-[10px] font-semibold cursor-pointer">Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        {goals.map(goal => (
          <div key={goal.id} className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)]/20 transition group">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h5 className="text-[12px] font-semibold text-[var(--text)]">{goal.title}</h5>
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${statusColor(goal.status)}`}>
                    {goal.status.replace("_", " ")}
                  </span>
                </div>
                {goal.description && <p className="text-[10px] text-[var(--muted)] mt-0.5">{goal.description}</p>}
              </div>
              <button onClick={() => handleDelete(goal.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-[var(--muted)] hover:text-red-500 transition cursor-pointer">
                <Trash2 size={10} />
              </button>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${goal.progress}%`,
                    backgroundColor: goal.progress >= 100 ? "#22c55e" : goal.progress > 0 ? "#3b82f6" : "#6b7280",
                  }}
                />
              </div>
              <span className="text-[10px] font-bold text-[var(--text)] w-8 text-right">{goal.progress}%</span>
            </div>

            {/* Quick progress buttons */}
            <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition">
              {[0, 25, 50, 75, 100].map(p => (
                <button
                  key={p}
                  onClick={() => handleUpdateProgress(goal.id, p)}
                  className={`px-1.5 py-0.5 rounded text-[8px] font-semibold cursor-pointer transition ${
                    goal.progress === p ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-2)] text-[var(--muted)] hover:bg-[var(--surface-3)]"
                  }`}
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {goals.length === 0 && (
        <div className="text-center py-8">
          <Target size={20} className="text-[var(--muted)] mx-auto mb-2" />
          <p className="text-[11px] text-[var(--muted)]">No goals yet</p>
        </div>
      )}
    </div>
  )
}
