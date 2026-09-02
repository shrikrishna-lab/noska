import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { DollarSign, TrendingUp, TrendingDown, Loader2, Plus, Trash2, Edit2, AlertTriangle } from "lucide-react"
import { supabase } from "../../lib/supabase"

interface BudgetEntry {
  id: string
  category: string
  amount: number
  type: "income" | "expense"
  description: string
  date: string
}

interface ProjectBudgetProps {
  projectId: string
  budget?: number
  onBudgetChange?: (budget: number) => void
}

export function ProjectBudget({ projectId, budget = 0, onBudgetChange }: ProjectBudgetProps) {
  const [entries, setEntries] = useState<BudgetEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newCategory, setNewCategory] = useState("")
  const [newAmount, setNewAmount] = useState("")
  const [newType, setNewType] = useState<"income" | "expense">("expense")
  const [newDesc, setNewDesc] = useState("")
  const [saving, setSaving] = useState(false)
  const [editingBudget, setEditingBudget] = useState(false)
  const [budgetInput, setBudgetInput] = useState(String(budget))

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const { data } = await (supabase as any)
          .from("budget_entries")
          .select("*")
          .eq("project_id", projectId)
          .order("date", { ascending: false })
        setEntries(data || [])
      } catch { setEntries([]) }
      finally { setLoading(false) }
    }
    fetchEntries()
  }, [projectId])

  const handleAdd = async () => {
    if (!newCategory.trim() || !newAmount) return
    setSaving(true)
    try {
      const { data } = await (supabase as any)
        .from("budget_entries")
        .insert({
          project_id: projectId,
          category: newCategory.trim(),
          amount: parseFloat(newAmount),
          type: newType,
          description: newDesc.trim(),
          date: new Date().toISOString(),
        })
        .select()
        .single()
      if (data) setEntries(prev => [data, ...prev])
      setNewCategory(""); setNewAmount(""); setNewDesc(""); setShowAdd(false)
    } catch {}
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try {
      await (supabase as any).from("budget_entries").delete().eq("id", id)
      setEntries(prev => prev.filter(e => e.id !== id))
    } catch {}
  }

  const totalIncome = entries.filter(e => e.type === "income").reduce((sum, e) => sum + e.amount, 0)
  const totalExpense = entries.filter(e => e.type === "expense").reduce((sum, e) => sum + e.amount, 0)
  const remaining = budget - totalExpense + totalIncome
  const usagePercent = budget > 0 ? Math.round((totalExpense / budget) * 100) : 0
  const isOverBudget = remaining < 0

  if (loading) return <div className="flex items-center justify-center py-6"><Loader2 size={14} className="animate-spin text-[var(--muted)]" /></div>

  return (
    <div className="space-y-4">
      {/* Budget overview */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
          <p className="text-[9px] text-[var(--muted)] mb-0.5">Budget</p>
          {editingBudget ? (
            <div className="flex items-center gap-1">
              <input type="number" value={budgetInput} onChange={e => setBudgetInput(e.target.value)}
                className="w-full px-1 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded text-[13px] font-bold text-[var(--text)]"
                autoFocus onBlur={() => { onBudgetChange?.(parseFloat(budgetInput) || 0); setEditingBudget(false) }}
              />
            </div>
          ) : (
            <p className="text-[13px] font-bold text-[var(--text)] cursor-pointer hover:text-[var(--accent)]" onClick={() => setEditingBudget(true)}>
              ${budget.toLocaleString()}
            </p>
          )}
        </div>
        <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
          <p className="text-[9px] text-[var(--muted)] mb-0.5">Spent</p>
          <p className="text-[13px] font-bold text-red-500">${totalExpense.toLocaleString()}</p>
        </div>
        <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
          <p className="text-[9px] text-[var(--muted)] mb-0.5">Remaining</p>
          <p className={`text-[13px] font-bold ${isOverBudget ? "text-red-500" : "text-green-500"}`}>
            ${remaining.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {budget > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-[var(--muted)]">Budget usage</span>
            <span className={`text-[10px] font-bold ${usagePercent > 90 ? "text-red-500" : usagePercent > 70 ? "text-amber-500" : "text-green-500"}`}>
              {usagePercent}%
            </span>
          </div>
          <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${usagePercent > 90 ? "bg-red-500" : usagePercent > 70 ? "bg-amber-500" : "bg-green-500"}`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
          {usagePercent > 90 && (
            <div className="flex items-center gap-1 mt-1 text-[9px] text-red-500">
              <AlertTriangle size={9} /> Budget nearly exhausted
            </div>
          )}
        </div>
      )}

      {/* Entries */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-bold text-[var(--text)]">Entries</h4>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 text-[10px] text-[var(--accent)] cursor-pointer">
            <Plus size={10} /> Add entry
          </button>
        </div>

        {showAdd && (
          <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] space-y-2">
            <div className="flex gap-2">
              <button onClick={() => setNewType("expense")} className={`flex-1 px-2 py-1 rounded-lg text-[10px] font-semibold cursor-pointer ${newType === "expense" ? "bg-red-500 text-white" : "bg-[var(--surface)] text-[var(--muted)]"}`}>
                <TrendingDown size={10} className="inline mr-1" />Expense
              </button>
              <button onClick={() => setNewType("income")} className={`flex-1 px-2 py-1 rounded-lg text-[10px] font-semibold cursor-pointer ${newType === "income" ? "bg-green-500 text-white" : "bg-[var(--surface)] text-[var(--muted)]"}`}>
                <TrendingUp size={10} className="inline mr-1" />Income
              </button>
            </div>
            <input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Category..." className="w-full px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[11px] text-[var(--text)]" />
            <input type="number" value={newAmount} onChange={e => setNewAmount(e.target.value)} placeholder="Amount..." className="w-full px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[11px] text-[var(--text)]" />
            <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description..." className="w-full px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[11px] text-[var(--text)]" />
            <div className="flex gap-2">
              <button onClick={handleAdd} disabled={saving || !newCategory.trim() || !newAmount} className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-[10px] font-semibold disabled:opacity-50 cursor-pointer">
                {saving ? <Loader2 size={10} className="animate-spin" /> : "Add"}
              </button>
              <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded-lg bg-[var(--surface)] text-[var(--muted)] text-[10px] font-semibold cursor-pointer">Cancel</button>
            </div>
          </div>
        )}

        {entries.map(entry => (
          <div key={entry.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] group">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${entry.type === "income" ? "bg-green-500/10" : "bg-red-500/10"}`}>
              {entry.type === "income" ? <TrendingUp size={12} className="text-green-500" /> : <TrendingDown size={12} className="text-red-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-[var(--text)]">{entry.category}</p>
              {entry.description && <p className="text-[9px] text-[var(--muted)] truncate">{entry.description}</p>}
            </div>
            <span className={`text-[12px] font-bold ${entry.type === "income" ? "text-green-500" : "text-red-500"}`}>
              {entry.type === "income" ? "+" : "-"}${entry.amount.toLocaleString()}
            </span>
            <button onClick={() => handleDelete(entry.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-[var(--muted)] hover:text-red-500 transition cursor-pointer">
              <Trash2 size={10} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
