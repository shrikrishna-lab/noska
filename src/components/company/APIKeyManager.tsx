import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Key, Plus, Trash2, Loader2, Copy, Eye, EyeOff, Check } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useCompany } from "../../contexts/CompanyContext"

interface APIKey {
  id: string
  name: string
  key_prefix: string
  last_used: string | null
  created_at: string
  active: boolean
}

interface APIKeyManagerProps {}

export function APIKeyManager({}: APIKeyManagerProps) {
  const { currentCompany } = useCompany()
  const [keys, setKeys] = useState<APIKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState("")
  const [newKey, setNewKey] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    if (!currentCompany) return
    const fetch = async () => {
      try {
        const { data } = await (supabase as any).from("api_keys").select("*").eq("organization_id", currentCompany.id).order("created_at", { ascending: false })
        setKeys(data || [])
      } catch { setKeys([]) }
      finally { setLoading(false) }
    }
    fetch()
  }, [currentCompany])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      const prefix = "noska_"
      const random = Array.from({ length: 40 }, () => Math.random().toString(36)[2]).join("")
      const fullKey = prefix + random

      const { data } = await (supabase as any)
        .from("api_keys")
        .insert({ organization_id: currentCompany!.id, name: newName.trim(), key_hash: fullKey, key_prefix: fullKey.slice(0, 12), active: true })
        .select()
        .single()

      if (data) {
        setKeys(prev => [data, ...prev])
        setNewKey(fullKey)
      }
      setNewName(""); setShowAdd(false)
    } catch {}
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try {
      await (supabase as any).from("api_keys").delete().eq("id", id)
      setKeys(prev => prev.filter(k => k.id !== id))
    } catch {}
  }

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 size={16} className="animate-spin text-[var(--muted)]" /></div>

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[12px] font-bold text-[var(--text)]">API Keys</h4>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 text-[10px] text-[var(--accent)] cursor-pointer">
          <Plus size={10} /> Generate key
        </button>
      </div>

      {/* New key display */}
      {newKey && (
        <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/20">
          <p className="text-[10px] font-bold text-green-600 mb-1">Key created! Copy it now - it won't be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-[10px] text-[var(--text)] bg-[var(--surface)] px-2 py-1.5 rounded-lg font-mono break-all">
              {showKey ? newKey : newKey.slice(0, 12) + "••••••••••••••••••••"}
            </code>
            <button onClick={() => setShowKey(!showKey)} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--muted)] cursor-pointer">
              {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
            <button onClick={() => copyKey(newKey)} className="p-1.5 rounded-lg bg-[var(--accent)] text-white cursor-pointer">
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] space-y-2">
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Key name (e.g., Production)" className="w-full px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[11px] text-[var(--text)]" autoFocus />
              <div className="flex gap-2">
                <button onClick={handleCreate} disabled={saving || !newName.trim()} className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-[10px] font-semibold disabled:opacity-50 cursor-pointer">
                  {saving ? <Loader2 size={10} className="animate-spin" /> : "Generate"}
                </button>
                <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded-lg bg-[var(--surface)] text-[var(--muted)] text-[10px] font-semibold cursor-pointer">Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-1.5">
        {keys.map(k => (
          <div key={k.id} className="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] group">
            <Key size={14} className="text-[var(--muted)]" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-[var(--text)]">{k.name}</p>
              <div className="flex items-center gap-2">
                <code className="text-[9px] text-[var(--muted)] font-mono">{k.key_prefix}••••</code>
                {k.last_used && <span className="text-[9px] text-[var(--muted)]">Last used {new Date(k.last_used).toLocaleDateString()}</span>}
              </div>
            </div>
            <div className={`w-2 h-2 rounded-full ${k.active ? "bg-green-500" : "bg-gray-400"}`} />
            <button onClick={() => handleDelete(k.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-[var(--muted)] hover:text-red-500 transition cursor-pointer">
              <Trash2 size={10} />
            </button>
          </div>
        ))}
      </div>

      {keys.length === 0 && (
        <div className="text-center py-6">
          <Key size={16} className="text-[var(--muted)] mx-auto mb-1" />
          <p className="text-[10px] text-[var(--muted)]">No API keys</p>
        </div>
      )}
    </div>
  )
}
