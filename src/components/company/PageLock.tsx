import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Lock, Unlock, Loader2, Shield } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useCompany } from "../../contexts/CompanyContext"
import { writeAuditLog } from "../../lib/company"

interface PageLockProps {
  pageId: string
  isLocked: boolean
  lockedBy?: string | null
  lockedAt?: string | null
  onToggle?: (locked: boolean) => void
  size?: "sm" | "md"
}

export function PageLock({ pageId, isLocked, lockedBy, lockedAt, onToggle, size = "md" }: PageLockProps) {
  const { currentCompany, currentMember } = useCompany()
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    if (loading) return
    setLoading(true)
    try {
      const newLocked = !isLocked
      await supabase
        .from("pages" as any)
        .update({
          is_locked: newLocked,
          locked_by: newLocked ? currentMember?.user_id : null,
          locked_at: newLocked ? new Date().toISOString() : null,
        } as any)
        .eq("id", pageId)

      if (currentMember) {
        await writeAuditLog(
          currentCompany!.id,
          currentMember.user_id,
          newLocked ? "lock" : "unlock",
          "pages",
          { entity_id: pageId }
        )
      }

      onToggle?.(newLocked)
    } catch {}
    finally { setLoading(false) }
  }

  const btnSize = size === "sm" ? "w-7 h-7" : "w-8 h-8"
  const iconSize = size === "sm" ? 12 : 14

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`${btnSize} rounded-lg flex items-center justify-center transition-all cursor-pointer ${
        isLocked
          ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
          : "hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)]"
      }`}
      title={isLocked ? "Unlock page" : "Lock page"}
    >
      {loading ? (
        <Loader2 size={iconSize} className="animate-spin" />
      ) : isLocked ? (
        <Lock size={iconSize} />
      ) : (
        <Unlock size={iconSize} />
      )}
    </button>
  )
}

interface LockBannerProps {
  lockedBy?: string | null
  lockedAt?: string | null
}

export function LockBanner({ lockedBy, lockedAt }: LockBannerProps) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="overflow-hidden"
    >
      <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400">
        <Shield size={13} />
        <span className="text-[11px] font-medium">
          This page is locked{lockedBy ? ` by ${lockedBy}` : ""}{lockedAt ? ` since ${new Date(lockedAt).toLocaleDateString()}` : ""}
        </span>
      </div>
    </motion.div>
  )
}
