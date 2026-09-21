import React, { useState, useEffect, useCallback } from "react"
import { Key, Plus, Trash2, Loader2, Copy, Eye, EyeOff, Check, Ban, RotateCw } from "lucide-react"
import { useCompany } from "../../contexts/CompanyContext"
import { getAuthUserId } from "../../lib/supabase"
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  rotateApiKey,
  deleteApiKey,
  isKeyActive,
  type ApiKeyRecord,
} from "../../lib/apiKeys"

/**
 * Company workspace API keys — secure implementation.
 *
 * Previously this component wrote raw secrets into a legacy `api_keys`
 * table with Math.random(). It now delegates to the canonical
 * `user_api_keys` store (SHA-256 hash only, `nsk_` keys, scoped + expirable),
 * the same store the REST API, MCP and SDK authenticate against.
 * Keys are user-scoped; the company name is used as a name prefix so
 * workspace keys stay identifiable.
 */
export function APIKeyManager() {
  const { currentCompany } = useCompany()
  const [userId, setUserId] = useState<string | null>(null)
  const [keys, setKeys] = useState<ApiKeyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState("")
  const [newKey, setNewKey] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    getAuthUserId().then(setUserId).catch(() => setUserId(null))
  }, [])

  const refresh = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)
    try {
      setKeys(await listApiKeys(userId))
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load API keys.")
      setKeys([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name || !userId || saving) return
    setSaving(true)
    try {
      const label = currentCompany ? `[${currentCompany.name}] ${name}` : name
      const { record, rawKey } = await createApiKey(userId, {
        name: label.slice(0, 80),
        scopes: ["pages:read", "pages:write", "tasks:read", "tasks:write", "search:read"],
        expiresInDays: 90,
      })
      setKeys((prev) => [record, ...prev])
      setNewKey(rawKey)
      setShowKey(true)
      setNewName("")
      setShowAdd(false)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to create key.")
    } finally {
      setSaving(false)
    }
  }

  const handleRevoke = async (k: ApiKeyRecord) => {
    if (!userId) return
    setBusyId(k.id)
    try {
      await revokeApiKey(k.id, userId)
      setKeys((prev) => prev.map((x) => (x.id === k.id ? { ...x, revoked_at: new Date().toISOString() } : x)))
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to revoke key.")
    } finally {
      setBusyId(null)
    }
  }

  const handleRotate = async (k: ApiKeyRecord) => {
    if (!userId) return
    setBusyId(k.id)
    try {
      const { record, rawKey } = await rotateApiKey(userId, k)
      setKeys((prev) => [record, ...prev.map((x) => (x.id === k.id ? { ...x, revoked_at: new Date().toISOString() } : x))])
      setNewKey(rawKey)
      setShowKey(true)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Rotation failed.")
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!userId) return
    try {
      await deleteApiKey(id, userId)
      setKeys((prev) => prev.filter((k) => k.id !== id))
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to delete key.")
    }
  }

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 size={16} className="animate-spin text-[var(--muted)]" /></div>

  if (!userId) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-[12px] font-bold text-[var(--text)]">API Keys</h4>
        </div>
        <p className="text-[11px] text-[var(--muted)]">Sign in to generate workspace API keys. Keys are hashed (`nsk_…`) and shown once.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[12px] font-bold text-[var(--text)]">API Keys</h4>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 text-[10px] text-[var(--accent)] cursor-pointer">
          <Plus size={10} /> Generate key
        </button>
      </div>

      {loadError && (
        <p className="text-[10px] text-red-500">{loadError}</p>
      )}

      {/* New key display — shown exactly once */}
      {newKey && (
        <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/20">
          <p className="text-[10px] font-bold text-green-600 mb-1">Key created! Copy it now - it won&apos;t be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-[10px] text-[var(--text)] bg-[var(--surface)] px-2 py-1.5 rounded-lg font-mono break-all">
              {showKey ? newKey : newKey.slice(0, 12) + "••••••••••••••••••••"}
            </code>
            <button onClick={() => setShowKey(!showKey)} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--muted)] cursor-pointer" title={showKey ? "Hide" : "Reveal"}>
              {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
            <button onClick={() => copyKey(newKey)} className="p-1.5 rounded-lg bg-[var(--accent)] text-white cursor-pointer" title="Copy key">
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] space-y-2">
          <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleCreate() }} placeholder="Key name (e.g., Production)" maxLength={80} className="w-full px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[11px] text-[var(--text)]" autoFocus />
          <p className="text-[9px] text-[var(--muted)]">Scoped to pages/tasks/search, 90-day expiry. Manage scopes in Settings → Developer → API Keys.</p>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving || !newName.trim()} className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-[10px] font-semibold disabled:opacity-50 cursor-pointer">
              {saving ? <Loader2 size={10} className="animate-spin" /> : "Generate"}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded-lg bg-[var(--surface)] text-[var(--muted)] text-[10px] font-semibold cursor-pointer">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {keys.map(k => {
          const active = isKeyActive(k)
          return (
            <div key={k.id} className="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] group">
              <Key size={14} className="text-[var(--muted)]" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-[var(--text)]">{k.name}</p>
                <div className="flex items-center gap-2">
                  <code className="text-[9px] text-[var(--muted)] font-mono">{k.prefix}••••</code>
                  {k.last_used_at && <span className="text-[9px] text-[var(--muted)]">Last used {new Date(k.last_used_at).toLocaleDateString()}</span>}
                  {k.expires_at && <span className="text-[9px] text-[var(--muted)]">Expires {new Date(k.expires_at).toLocaleDateString()}</span>}
                </div>
              </div>
              <div className={`w-2 h-2 rounded-full ${active ? "bg-green-500" : "bg-gray-400"}`} title={k.revoked_at ? "Revoked" : active ? "Active" : "Expired"} />
              {active && (
                <>
                  <button onClick={() => handleRotate(k)} disabled={busyId === k.id} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--surface-2)] text-[var(--muted)] transition cursor-pointer" title="Rotate (new secret, old revoked)">
                    <RotateCw size={10} className={busyId === k.id ? "animate-spin" : ""} />
                  </button>
                  <button onClick={() => handleRevoke(k)} disabled={busyId === k.id} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-amber-500/10 text-[var(--muted)] hover:text-amber-500 transition cursor-pointer" title="Revoke">
                    <Ban size={10} />
                  </button>
                </>
              )}
              <button onClick={() => handleDelete(k.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-[var(--muted)] hover:text-red-500 transition cursor-pointer" title="Delete record">
                <Trash2 size={10} />
              </button>
            </div>
          )
        })}
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
