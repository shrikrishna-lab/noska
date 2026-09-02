import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bookmark, Plus, Trash2, ExternalLink, Loader2, X } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useCompany } from "../../contexts/CompanyContext"

interface TeamBookmark {
  id: string
  title: string
  url: string
  description: string
  created_by: string
  created_at: string
}

interface TeamBookmarksProps {
  teamId: string
}

export function TeamBookmarks({ teamId }: TeamBookmarksProps) {
  const { currentMember } = useCompany()
  const [bookmarks, setBookmarks] = useState<TeamBookmark[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newUrl, setNewUrl] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchBookmarks = async () => {
      try {
        const { data } = await (supabase as any)
          .from("team_bookmarks")
          .select("*")
          .eq("team_id", teamId)
          .order("created_at", { ascending: false })
        setBookmarks(data || [])
      } catch { setBookmarks([]) }
      finally { setLoading(false) }
    }
    fetchBookmarks()
  }, [teamId])

  const handleAdd = async () => {
    if (!newTitle.trim() || !newUrl.trim()) return
    setSaving(true)
    try {
      const { data } = await (supabase as any)
        .from("team_bookmarks")
        .insert({
          team_id: teamId,
          title: newTitle.trim(),
          url: newUrl.trim(),
          description: newDesc.trim(),
          created_by: currentMember?.user_id,
        })
        .select()
        .single()
      if (data) setBookmarks(prev => [data, ...prev])
      setNewTitle(""); setNewUrl(""); setNewDesc(""); setShowAdd(false)
    } catch {}
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try {
      await (supabase as any).from("team_bookmarks").delete().eq("id", id)
      setBookmarks(prev => prev.filter(b => b.id !== id))
    } catch {}
  }

  const getDomain = (url: string) => {
    try { return new URL(url).hostname.replace("www.", "") } catch { return url }
  }

  const getFavicon = (url: string) => {
    try {
      const domain = new URL(url).hostname
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    } catch { return null }
  }

  if (loading) return <div className="flex items-center justify-center py-6"><Loader2 size={14} className="animate-spin text-[var(--muted)]" /></div>

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[12px] font-bold text-[var(--text)]">Bookmarks</h4>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 text-[10px] text-[var(--accent)] cursor-pointer">
          <Plus size={10} /> Add bookmark
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] space-y-2">
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Title..." className="w-full px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[11px] text-[var(--text)]" autoFocus />
              <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://..." className="w-full px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[11px] text-[var(--text)]" />
              <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)..." className="w-full px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[11px] text-[var(--text)]" />
              <div className="flex gap-2">
                <button onClick={handleAdd} disabled={saving || !newTitle.trim() || !newUrl.trim()} className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-[10px] font-semibold disabled:opacity-50 cursor-pointer">
                  {saving ? <Loader2 size={10} className="animate-spin" /> : "Add"}
                </button>
                <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded-lg bg-[var(--surface)] text-[var(--muted)] text-[10px] font-semibold cursor-pointer">Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-1">
        {bookmarks.map(b => (
          <div key={b.id} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-[var(--surface-2)] transition group">
            {getFavicon(b.url) ? (
              <img src={getFavicon(b.url)!} alt="" className="w-4 h-4" />
            ) : (
              <Bookmark size={12} className="text-[var(--muted)]" />
            )}
            <div className="flex-1 min-w-0">
              <a href={b.url} target="_blank" rel="noopener" className="text-[11px] font-semibold text-[var(--text)] hover:text-[var(--accent)] truncate block">
                {b.title}
              </a>
              {b.description && <p className="text-[9px] text-[var(--muted)] truncate">{b.description}</p>}
              <p className="text-[8px] text-[var(--muted)]">{getDomain(b.url)}</p>
            </div>
            <a href={b.url} target="_blank" rel="noopener" className="p-1 rounded hover:bg-[var(--surface-3)] text-[var(--muted)] opacity-0 group-hover:opacity-100 transition cursor-pointer">
              <ExternalLink size={10} />
            </a>
            <button onClick={() => handleDelete(b.id)} className="p-1 rounded hover:bg-red-500/10 text-[var(--muted)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition cursor-pointer">
              <Trash2 size={10} />
            </button>
          </div>
        ))}
      </div>

      {bookmarks.length === 0 && (
        <div className="text-center py-6">
          <Bookmark size={16} className="text-[var(--muted)] mx-auto mb-1" />
          <p className="text-[10px] text-[var(--muted)]">No bookmarks yet</p>
        </div>
      )}
    </div>
  )
}
