import React, { useState, useEffect } from "react"
import { Star, Loader2 } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useCompany } from "../../contexts/CompanyContext"

interface PageRatingProps {
  pageId: string
  size?: "sm" | "md"
}

export function PageRating({ pageId, size = "md" }: PageRatingProps) {
  const { currentMember } = useCompany()
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [avgRating, setAvgRating] = useState(0)
  const [totalRatings, setTotalRatings] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchRatings = async () => {
      try {
        const { data } = await (supabase as any)
          .from("page_ratings")
          .select("rating, user_id")
          .eq("page_id", pageId)

        if (data && data.length > 0) {
          const avg = data.reduce((sum: number, r: any) => sum + r.rating, 0) / data.length
          setAvgRating(Math.round(avg * 10) / 10)
          setTotalRatings(data.length)
          const myRating = data.find((r: any) => r.user_id === currentMember?.user_id)
          if (myRating) setRating(myRating.rating)
        }
      } catch {}
    }
    fetchRatings()
  }, [pageId, currentMember])

  const handleRate = async (value: number) => {
    if (!currentMember || loading) return
    setLoading(true)
    try {
      const { data: existing } = await (supabase as any)
        .from("page_ratings")
        .select("id")
        .eq("page_id", pageId)
        .eq("user_id", currentMember.user_id)
        .maybeSingle()

      if (existing) {
        await (supabase as any)
          .from("page_ratings")
          .update({ rating: value })
          .eq("id", existing.id)
      } else {
        await (supabase as any)
          .from("page_ratings")
          .insert({ page_id: pageId, user_id: currentMember.user_id, rating: value })
      }

      setRating(value)
      // Recalculate
      const { data } = await (supabase as any)
        .from("page_ratings")
        .select("rating")
        .eq("page_id", pageId)
      if (data) {
        const avg = data.reduce((sum: number, r: any) => sum + r.rating, 0) / data.length
        setAvgRating(Math.round(avg * 10) / 10)
        setTotalRatings(data.length)
      }
    } catch {}
    finally { setLoading(false) }
  }

  const starSize = size === "sm" ? 10 : 14

  return (
    <div className="inline-flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <button
            key={i}
            onClick={() => handleRate(i)}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(0)}
            className="cursor-pointer transition-transform hover:scale-110"
          >
            <Star
              size={starSize}
              className={`transition-colors ${
                i <= (hovered || rating)
                  ? "text-amber-400"
                  : "text-[var(--muted)]"
              }`}
              fill={i <= (hovered || rating) ? "currentColor" : "none"}
            />
          </button>
        ))}
      </div>
      {totalRatings > 0 && (
        <span className="text-[10px] text-[var(--muted)]">
          {avgRating} ({totalRatings})
        </span>
      )}
    </div>
  )
}
