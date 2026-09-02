import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Copy, Loader2, Check, FileText } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useCompany } from "../../contexts/CompanyContext"
import { writeAuditLog } from "../../lib/company"

interface PageDuplicatorProps {
  pageId: string
  pageTitle: string
  onDuplicated?: (newPageId: string) => void
  size?: "sm" | "md"
}

export function PageDuplicator({ pageId, pageTitle, onDuplicated, size = "md" }: PageDuplicatorProps) {
  const { currentCompany, currentMember } = useCompany()
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDuplicate = async () => {
    setLoading(true)
    try {
      // Fetch original page
      const { data: original } = await supabase
        .from("pages" as any)
        .select("*")
        .eq("id", pageId)
        .single()

      if (!original) return

      // Create duplicate
      const { data: newPage } = await supabase
        .from("pages" as any)
        .insert({
          title: `${(original as any).title || "Untitled"} (Copy)`,
          icon: (original as any).icon,
          blocks: (original as any).blocks,
          visibility: (original as any).visibility,
          team_id: (original as any).team_id,
          organization_id: (original as any).organization_id,
          parent_page_id: (original as any).parent_page_id,
          user_id: currentMember?.user_id,
          cover_url: (original as any).cover_url,
          is_locked: false,
          is_template: false,
          trashed: false,
        } as any)
        .select("id")
        .single()

      if (newPage && currentMember) {
        await writeAuditLog(
          currentCompany!.id,
          currentMember.user_id,
          "duplicate",
          "pages",
          { entity_id: pageId, new_page_id: (newPage as any).id, original_title: pageTitle }
        )
        onDuplicated?.((newPage as any).id)
      }

      setShowConfirm(false)
    } catch {}
    finally { setLoading(false) }
  }

  const btnSize = size === "sm" ? "w-7 h-7" : "w-8 h-8"
  const iconSize = size === "sm" ? 12 : 14

  return (
    <div className="relative">
      <button
        onClick={() => setShowConfirm(!showConfirm)}
        className={`${btnSize} rounded-lg hover:bg-[var(--surface-2)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] transition cursor-pointer`}
        title="Duplicate page"
      >
        <Copy size={iconSize} />
      </button>

      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            className="absolute right-0 top-full mt-1 z-50 w-56 bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-xl p-3"
          >
            <p className="text-[11px] text-[var(--text)] font-medium mb-2">
              Duplicate "{pageTitle}"?
            </p>
            <p className="text-[10px] text-[var(--muted)] mb-3">
              Creates a copy with all content
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDuplicate}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-[10px] font-semibold hover:bg-[var(--accent-deep)] transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 size={10} className="animate-spin" /> : <Copy size={10} />}
                Duplicate
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="px-3 py-1.5 rounded-lg bg-[var(--surface-2)] text-[var(--muted)] text-[10px] font-semibold hover:bg-[var(--surface-3)] transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
