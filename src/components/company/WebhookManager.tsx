import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Webhook, Plus, Trash2, Loader2, Check, X, ExternalLink, RefreshCw, Copy } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useCompany } from "../../contexts/CompanyContext"

interface WebhookConfig {
  id: string
  url: string
  events: string[]
  secret: string
  active: boolean
  created_at: string
}

const AVAILABLE_EVENTS = ["page.created", "page.updated", "page.deleted", "member.joined", "member.left", "project.created", "project.updated"]

interface WebhookManagerProps {}

export function WebhookManager({}: WebhookManagerProps) {
  const { currentCompany } = useCompany()
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newUrl, setNewUrl] = useState("")
  const [newEvents, setNewEvents] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  useEffect(() => {
    if (!currentCompany) return
    const fetch = async () => {
      try {
        const { data } = await (supabase as any).from("webhooks").select("*").eq("organization_id", currentCompany.id)
        setWebhooks(data || [])
      } catch { setWebhooks([]) }
      finally { setLoading(false) }
    }
    fetch()
  }, [currentCompany])

  const handleAdd = async () => {
    if (!newUrl.trim() || newEvents.length === 0) return
    setSaving(true)
    try {
      const secret = Array.from({ length: 32 }, () => Math.random().toString(36)[2]).join("")
      const { data } = await (supabase as any)
        .from("webhooks")
        .insert({ organization_id: currentCompany!.id, url: newUrl.trim(), events: newEvents, secret, active: true })
        .select()
        .single()
      if (data) setWebhooks(prev => [...prev, data])
      setNewUrl(""); setNewEvents([]); setShowAdd(false)
    } catch {}
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try {
      await (supabase as any).from("webhooks").delete().eq("id", id)
      setWebhooks(prev => prev.filter(w => w.id !== id))
    } catch {}
  }

  const toggleActive = async (id: string, active: boolean) => {
    try {
      await (supabase as any).from("webhooks").update({ active: !active }).eq("id", id)
      setWebhooks(prev => prev.map(w => w.id === id ? { ...w, active: !active } : w))
    } catch {}
  }

  const copySecret = (secret: string) => {
    navigator.clipboard.writeText(secret)
    setTestResult("Copied!")
    setTimeout(() => setTestResult(null), 2000)
  }

  const toggleEvent = (event: string) => {
    setNewEvents(prev => prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event])
  }

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 size={16} className="animate-spin text-[var(--muted)]" /></div>

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[12px] font-bold text-[var(--text)]">Webhooks</h4>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 text-[10px] text-[var(--accent)] cursor-pointer">
          <Plus size={10} /> Add webhook
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] space-y-2">
              <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://your-app.com/webhook" className="w-full px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[11px] text-[var(--text)]" autoFocus />
              <div>
                <p className="text-[9px] font-bold text-[var(--muted)] mb-1">Events</p>
                <div className="flex flex-wrap gap-1">
                  {AVAILABLE_EVENTS.map(e => (
                    <button key={e} onClick={() => toggleEvent(e)} className={`px-2 py-0.5 rounded text-[9px] font-semibold cursor-pointer transition ${newEvents.includes(e) ? "bg-[var(--accent)] text-white" : "bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]"}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAdd} disabled={saving || !newUrl.trim() || newEvents.length === 0} className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-[10px] font-semibold disabled:opacity-50 cursor-pointer">
                  {saving ? <Loader2 size={10} className="animate-spin" /> : "Create"}
                </button>
                <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded-lg bg-[var(--surface)] text-[var(--muted)] text-[10px] font-semibold cursor-pointer">Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        {webhooks.map(w => (
          <div key={w.id} className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] group">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${w.active ? "bg-green-500" : "bg-gray-400"}`} />
              <span className="text-[11px] font-medium text-[var(--text)] flex-1 truncate">{w.url}</span>
              <div className="flex gap-1">
                <button onClick={() => copySecret(w.secret)} className="p-1 rounded hover:bg-[var(--surface-2)] text-[var(--muted)] cursor-pointer" title="Copy secret">
                  <Copy size={10} />
                </button>
                <button onClick={() => toggleActive(w.id, w.active)} className={`p-1 rounded hover:bg-[var(--surface-2)] cursor-pointer ${w.active ? "text-green-500" : "text-[var(--muted)]"}`} title={w.active ? "Disable" : "Enable"}>
                  <RefreshCw size={10} />
                </button>
                <button onClick={() => handleDelete(w.id)} className="p-1 rounded hover:bg-red-500/10 text-[var(--muted)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition cursor-pointer">
                  <Trash2 size={10} />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-0.5">
              {w.events.map(e => (
                <span key={e} className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[8px] text-[var(--muted)]">{e}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {webhooks.length === 0 && (
        <div className="text-center py-6">
          <Webhook size={16} className="text-[var(--muted)] mx-auto mb-1" />
          <p className="text-[10px] text-[var(--muted)]">No webhooks configured</p>
        </div>
      )}
    </div>
  )
}
