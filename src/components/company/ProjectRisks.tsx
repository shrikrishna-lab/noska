import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, Plus, Loader2, Trash2, Shield, AlertCircle, Info, ChevronDown } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useCompany } from "../../contexts/CompanyContext"

interface Risk {
  id: string
  title: string
  description: string
  probability: "low" | "medium" | "high"
  impact: "low" | "medium" | "high"
  status: "open" | "mitigated" | "closed"
  mitigation: string
  created_at: string
}

interface ProjectRisksProps {
  projectId: string
}

const PROBABILITY_COLORS = { low: "text-green-500 bg-green-500/10", medium: "text-amber-500 bg-amber-500/10", high: "text-red-500 bg-red-500/10" }
const IMPACT_COLORS = { low: "text-blue-500 bg-blue-500/10", medium: "text-amber-500 bg-amber-500/10", high: "text-red-500 bg-red-500/10" }
const STATUS_COLORS = { open: "text-red-500 bg-red-500/10", mitigated: "text-amber-500 bg-amber-500/10", closed: "text-green-500 bg-green-500/10" }

const getRiskLevel = (prob: string, impact: string) => {
  const scores = { low: 1, medium: 2, high: 3 }
  const score = (scores[prob as keyof typeof scores] || 1) * (scores[impact as keyof typeof scores] || 1)
  if (score >= 6) return { label: "Critical", color: "text-red-500" }
  if (score >= 4) return { label: "High", color: "text-orange-500" }
  if (score >= 2) return { label: "Medium", color: "text-amber-500" }
  return { label: "Low", color: "text-green-500" }
}

export function ProjectRisks({ projectId }: ProjectRisksProps) {
  const { currentMember } = useCompany()
  const [risks, setRisks] = useState<Risk[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: "", description: "", probability: "medium" as const, impact: "medium" as const, mitigation: "" })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchRisks = async () => {
      try {
        const { data } = await (supabase as any).from("project_risks").select("*").eq("project_id", projectId).order("created_at", { ascending: false })
        setRisks(data || [])
      } catch { setRisks([]) }
      finally { setLoading(false) }
    }
    fetchRisks()
  }, [projectId])

  const handleAdd = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const { data } = await (supabase as any)
        .from("project_risks")
        .insert({ project_id: projectId, ...form, status: "open" })
        .select()
        .single()
      if (data) setRisks(prev => [data, ...prev])
      setForm({ title: "", description: "", probability: "medium", impact: "medium", mitigation: "" })
      setShowAdd(false)
    } catch {}
    finally { setSaving(false) }
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await (supabase as any).from("project_risks").update({ status }).eq("id", id)
      setRisks(prev => prev.map(r => r.id === id ? { ...r, status: status as any } : r))
    } catch {}
  }

  const handleDelete = async (id: string) => {
    try {
      await (supabase as any).from("project_risks").delete().eq("id", id)
      setRisks(prev => prev.filter(r => r.id !== id))
    } catch {}
  }

  if (loading) return <div className="flex items-center justify-center py-6"><Loader2 size={14} className="animate-spin text-[var(--muted)]" /></div>

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-[12px] font-bold text-[var(--text)]">Risks</h4>
          <span className="text-[10px] text-[var(--muted)]">{risks.filter(r => r.status === "open").length} open</span>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 text-[10px] text-[var(--accent)] cursor-pointer">
          <Plus size={10} /> Add risk
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] space-y-2">
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Risk title..." className="w-full px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[11px] text-[var(--text)]" autoFocus />
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description..." rows={2} className="w-full px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[11px] text-[var(--text)] resize-none" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-[var(--muted)] mb-1 block">Probability</label>
                  <select value={form.probability} onChange={e => setForm(f => ({ ...f, probability: e.target.value as any }))}
                    className="w-full px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[10px] text-[var(--text)] cursor-pointer">
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--muted)] mb-1 block">Impact</label>
                  <select value={form.impact} onChange={e => setForm(f => ({ ...f, impact: e.target.value as any }))}
                    className="w-full px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[10px] text-[var(--text)] cursor-pointer">
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                  </select>
                </div>
              </div>
              <textarea value={form.mitigation} onChange={e => setForm(f => ({ ...f, mitigation: e.target.value }))} placeholder="Mitigation plan..." rows={2} className="w-full px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[11px] text-[var(--text)] resize-none" />
              <div className="flex gap-2">
                <button onClick={handleAdd} disabled={saving || !form.title.trim()} className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-[10px] font-semibold disabled:opacity-50 cursor-pointer">
                  {saving ? <Loader2 size={10} className="animate-spin" /> : "Add Risk"}
                </button>
                <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded-lg bg-[var(--surface)] text-[var(--muted)] text-[10px] font-semibold cursor-pointer">Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        {risks.map(risk => {
          const level = getRiskLevel(risk.probability, risk.impact)
          return (
            <div key={risk.id} className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] group">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h5 className="text-[11px] font-semibold text-[var(--text)]">{risk.title}</h5>
                    <span className={`text-[9px] font-bold ${level.color}`}>{level.label}</span>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_COLORS[risk.status]}`}>
                      {risk.status}
                    </span>
                  </div>
                  {risk.description && <p className="text-[10px] text-[var(--muted)] mt-0.5">{risk.description}</p>}
                </div>
                <button onClick={() => handleDelete(risk.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-[var(--muted)] hover:text-red-500 transition cursor-pointer">
                  <Trash2 size={10} />
                </button>
              </div>

              <div className="flex items-center gap-3 mb-2">
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${PROBABILITY_COLORS[risk.probability]}`}>
                  P: {risk.probability}
                </span>
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${IMPACT_COLORS[risk.impact]}`}>
                  I: {risk.impact}
                </span>
              </div>

              {risk.mitigation && (
                <div className="p-2 rounded-lg bg-[var(--surface-2)] mb-2">
                  <p className="text-[9px] font-bold text-[var(--muted)] mb-0.5">Mitigation</p>
                  <p className="text-[10px] text-[var(--text)]">{risk.mitigation}</p>
                </div>
              )}

              {risk.status === "open" && (
                <div className="flex gap-1">
                  <button onClick={() => handleStatusChange(risk.id, "mitigated")} className="px-2 py-0.5 rounded text-[9px] font-semibold bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition cursor-pointer">
                    Mitigate
                  </button>
                  <button onClick={() => handleStatusChange(risk.id, "closed")} className="px-2 py-0.5 rounded text-[9px] font-semibold bg-green-500/10 text-green-500 hover:bg-green-500/20 transition cursor-pointer">
                    Close
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {risks.length === 0 && (
        <div className="text-center py-6">
          <Shield size={16} className="text-[var(--muted)] mx-auto mb-1" />
          <p className="text-[10px] text-[var(--muted)]">No risks identified</p>
        </div>
      )}
    </div>
  )
}
