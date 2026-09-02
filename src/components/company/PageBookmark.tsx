import React, { useState, useEffect } from "react"
import { Bookmark, Loader2 } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useCompany } from "../../contexts/CompanyContext"

interface PageBookmarkProps {
  pageId: string
  size?: "sm" | "md"
}

export function PageBookmark({ pageId, size = "md" }: PageBookmarkProps) {
  const { currentMember } = useCompany()
  const [bookmarked, setBookmarked] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!currentMember) return
    const check = async () => {
      try {
        const { data } = await (supabase as any)
          .from("page_bookmarks")
          .select("id")
          .eq("page_id", pageId)
          .eq("user_id", currentMember.user_id)
          .maybeSingle()
        setBookmarked(!!data)
      } catch {}
    }
    check()
  }, [pageId, currentMember])

  const toggle = async () => {
    if (!currentMember || loading) return
    setLoading(true)
    try {
      if (bookmarked) {
        await (supabase as any)
          .from("page_bookmarks")
          .delete()
          .eq("page_id", pageId)
          .eq("user_id", currentMember.user_id)
        setBookmarked(false)
      } else {
        await (supabase as any)
          .from("page_bookmarks")
          .insert({ page_id: pageId, user_id: currentMember.user_id })
        setBookmarked(true)
      }
    } catch {}
    finally { setLoading(false) }
  }

  const iconSize = size === "sm" ? 12 : 14
  const btnSize = size === "sm" ? "w-7 h-7" : "w-8 h-8"

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`${btnSize} rounded-lg flex items-center justify-center transition cursor-pointer ${
        bookmarked
          ? "text-amber-400 hover:bg-amber-400/10"
          : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
      }`}
      title={bookmarked ? "Remove bookmark" : "Bookmark page"}
    >
      {loading ? <Loader2 size={iconSize} className="animate-spin" /> : <Bookmark size={iconSize} fill={bookmarked ? "currentColor" : "none"} />}
    </button>
  )
}
