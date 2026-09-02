import React from "react"

interface SkeletonProps {
  className?: string
  count?: number
  variant?: "text" | "circular" | "rectangular" | "rounded"
}

export function Skeleton({ className = "", count = 1, variant = "text" }: SkeletonProps) {
  const variants = {
    text: "h-3 rounded",
    circular: "rounded-full",
    rectangular: "rounded-lg",
    rounded: "rounded-xl",
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${variants[variant]} bg-gradient-to-r from-[var(--surface-2)] via-[var(--surface-3)] to-[var(--surface-2)] animate-pulse`}
          style={{
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite",
          }}
        />
      ))}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="p-4 rounded-xl border border-[var(--border)] space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" className="w-10 h-10" />
        <div className="flex-1 space-y-2">
          <Skeleton className="w-1/3" />
          <Skeleton className="w-1/2" />
        </div>
      </div>
      <Skeleton count={2} />
    </div>
  )
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)]">
          <Skeleton variant="circular" className="w-9 h-9" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="w-1/3" />
            <Skeleton className="w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="border border-[var(--border)] rounded-xl overflow-hidden">
      <div className="flex gap-4 px-4 py-3 bg-[var(--surface-2)]">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 border-t border-[var(--border)]/50">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" className="h-24" />
        ))}
      </div>
      <SkeletonCard />
      <SkeletonList count={3} />
    </div>
  )
}
