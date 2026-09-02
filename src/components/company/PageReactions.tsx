import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { SmilePlus, Loader2 } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useCompany } from "../../contexts/CompanyContext"

const QUICK_EMOJI = ["👍", "❤️", "🎉", "🚀", "👀", "🔥", "💯", "✅", "😂", "🤔", "👏", "💪"]

interface Reaction {
  emoji: string
  count: number
  users: string[]
  reacted: boolean
}

interface PageReactionsProps {
  pageId: string
}

export function PageReactions({ pageId }: PageReactionsProps) {
  const { currentCompany, currentMember } = useCompany()
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReactions = async () => {
      try {
        const { data } = await (supabase as any)
          .from("page_reactions")
          .select("*")
          .eq("page_id", pageId)

        if (data) {
          const grouped: Record<string, Reaction> = {}
          data.forEach((r: any) => {
            if (!grouped[r.emoji]) grouped[r.emoji] = { emoji: r.emoji, count: 0, users: [], reacted: false }
            grouped[r.emoji].count++
            grouped[r.emoji].users.push(r.user_id)
            if (r.user_id === currentMember?.user_id) grouped[r.emoji].reacted = true
          })
          setReactions(Object.values(grouped))
        }
      } catch {}
      finally { setLoading(false) }
    }
    fetchReactions()
  }, [pageId, currentMember])

  const handleReact = async (emoji: string) => {
    if (!currentMember) return
    const existing = reactions.find(r => r.emoji === emoji && r.reacted)
    try {
      if (existing) {
        await (supabase as any)
          .from("page_reactions")
          .delete()
          .eq("page_id", pageId)
          .eq("user_id", currentMember.user_id)
          .eq("emoji", emoji)
        setReactions(prev => prev.map(r =>
          r.emoji === emoji ? { ...r, count: r.count - 1, reacted: false, users: r.users.filter(u => u !== currentMember.user_id) } : r
        ).filter(r => r.count > 0))
      } else {
        await (supabase as any)
          .from("page_reactions")
          .insert({ page_id: pageId, user_id: currentMember.user_id, emoji })
        setReactions(prev => {
          const existing = prev.find(r => r.emoji === emoji)
          if (existing) return prev.map(r => r.emoji === emoji ? { ...r, count: r.count + 1, reacted: true, users: [...r.users, currentMember.user_id] } : r)
          return [...prev, { emoji, count: 1, users: [currentMember.user_id], reacted: true }]
        })
      }
    } catch {}
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {reactions.map(r => (
        <motion.button
          key={r.emoji}
          layout
          onClick={() => handleReact(r.emoji)}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border transition cursor-pointer ${
            r.reacted
              ? "bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)]"
              : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)]/30"
          }`}
        >
          <span>{r.emoji}</span>
          <span className="font-semibold">{r.count}</span>
        </motion.button>
      ))}

      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-dashed border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition cursor-pointer"
        >
          <SmilePlus size={12} />
        </button>

        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute left-0 top-full mt-1 z-50 bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-xl p-2 grid grid-cols-6 gap-1"
            >
              {QUICK_EMOJI.map(e => (
                <button
                  key={e}
                  onClick={() => { handleReact(e); setShowPicker(false) }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--surface-2)] transition text-base cursor-pointer"
                >
                  {e}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
