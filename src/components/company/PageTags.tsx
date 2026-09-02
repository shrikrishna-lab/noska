import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Tag, X, Plus, Loader2 } from "lucide-react"
import { supabase } from "../../lib/supabase"

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280", "#0ea5e9",
]

interface PageTag {
  id: string
  name: string
  color: string
}

interface PageTagsProps {
  pageId: string
  tags: PageTag[]
  onTagsChange?: (tags: PageTag[]) => void
}

export function PageTags({ pageId, tags, onTagsChange }: PageTagsProps) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [loading, setLoading] = useState(false)

  const handleAdd = async () => {
    if (!newName.trim()) return
    setLoading(true)
    try {
      const { data } = await (supabase as any)
        .from("page_tags")
        .insert({ page_id: pageId, name: newName.trim(), color: newColor })
        .select()
        .single()
      if (data) {
        onTagsChange?.([...tags, data])
        setNewName("")
        setAdding(false)
      }
    } catch {}
    finally { setLoading(false) }
  }

  const handleRemove = async (tagId: string) => {
    try {
      await (supabase as any).from("page_tags").delete().eq("id", tagId)
      onTagsChange?.(tags.filter(t => t.id !== tagId))
    } catch {}
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map(tag => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white group"
          style={{ backgroundColor: tag.color }}
        >
          {tag.name}
          <button
            onClick={() => handleRemove(tag.id)}
            className="opacity-0 group-hover:opacity-100 transition cursor-pointer"
          >
            <X size={9} />
          </button>
        </span>
      ))}

      {adding ? (
        <div className="flex items-center gap-1">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Tag name..."
            className="w-20 px-2 py-0.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-full text-[10px] text-[var(--text)] focus:outline-none"
            autoFocus
            onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false) }}
          />
          <input
            type="color"
            value={newColor}
            onChange={e => setNewColor(e.target.value)}
            className="w-4 h-4 rounded cursor-pointer"
          />
          <button onClick={handleAdd} disabled={loading} className="cursor-pointer">
            {loading ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} className="text-[var(--accent)]" />}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium border border-dashed border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition cursor-pointer"
        >
          <Plus size={9} /> Add tag
        </button>
      )}
    </div>
  )
}
