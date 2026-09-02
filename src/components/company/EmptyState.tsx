import React from "react"
import { motion } from "framer-motion"

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  size?: "sm" | "md" | "lg"
}

export function EmptyState({ icon, title, description, action, size = "md" }: EmptyStateProps) {
  const sizeClasses = {
    sm: "py-8",
    md: "py-12",
    lg: "py-16",
  }

  const iconSizes = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-20 h-20",
  }

  const iconInner = {
    sm: 20,
    md: 28,
    lg: 36,
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center text-center ${sizeClasses[size]}`}
    >
      <div className={`${iconSizes[size]} rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center mb-4`}>
        <div className="text-[var(--muted)]">{icon}</div>
      </div>
      <h3 className="text-[14px] font-bold text-[var(--text)] mb-1">{title}</h3>
      {description && <p className="text-[12px] text-[var(--muted)] max-w-xs leading-relaxed">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-[12px] font-semibold hover:bg-[var(--accent-deep)] transition cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  )
}

export function EmptyPage({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="8" y="4" width="32" height="40" rx="4" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" /><path d="M16 16h16M16 22h12M16 28h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>}
      title="No pages yet"
      description="Create your first page to get started"
      action={onCreate ? { label: "Create Page", onClick: onCreate } : undefined}
    />
  )
}

export function EmptyTeam() {
  return (
    <EmptyState
      icon={<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="16" r="8" stroke="currentColor" strokeWidth="2" /><path d="M12 40c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>}
      title="No teams yet"
      description="Create a team to organize your workspace"
    />
  )
}

export function EmptySearch({ query }: { query: string }) {
  return (
    <EmptyState
      icon={<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="22" cy="22" r="14" stroke="currentColor" strokeWidth="2" /><path d="M32 32l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>}
      title={`No results for "${query}"`}
      description="Try different keywords or check your filters"
      size="sm"
    />
  )
}
