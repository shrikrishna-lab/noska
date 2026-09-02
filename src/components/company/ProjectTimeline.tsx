import React, { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { Calendar, ChevronLeft, ChevronRight, Loader2, Clock } from "lucide-react"

interface TimelineItem {
  id: string
  name: string
  start: string
  end: string
  progress: number
  color: string
  status: string
}

interface ProjectTimelineProps {
  items: TimelineItem[]
  onItemClick?: (id: string) => void
}

export function ProjectTimeline({ items, onItemClick }: ProjectTimelineProps) {
  const [viewStart, setViewStart] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const days = useMemo(() => {
    const result: Date[] = []
    const start = new Date(viewStart)
    for (let i = 0; i < 60; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      result.push(d)
    }
    return result
  }, [viewStart])

  const today = new Date()
  const dayWidth = 40
  const totalWidth = days.length * dayWidth

  const getItemPosition = (item: TimelineItem) => {
    const start = new Date(item.start)
    const end = new Date(item.end)
    const startOffset = Math.max(0, (start.getTime() - viewStart.getTime()) / 86400000)
    const duration = Math.max(1, (end.getTime() - start.getTime()) / 86400000)
    return { left: startOffset * dayWidth, width: duration * dayWidth }
  }

  const prevMonth = () => setViewStart(new Date(viewStart.getFullYear(), viewStart.getMonth() - 1))
  const nextMonth = () => setViewStart(new Date(viewStart.getFullYear(), viewStart.getMonth() + 1))

  const statusColors: Record<string, string> = {
    not_started: "#6b7280",
    in_progress: "#3b82f6",
    completed: "#22c55e",
    on_hold: "#eab308",
    cancelled: "#ef4444",
  }

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1 rounded hover:bg-[var(--surface-2)] text-[var(--muted)] cursor-pointer"><ChevronLeft size={12} /></button>
          <span className="text-[11px] font-bold text-[var(--text)]">{viewStart.toLocaleString("default", { month: "long", year: "numeric" })}</span>
          <button onClick={nextMonth} className="p-1 rounded hover:bg-[var(--surface-2)] text-[var(--muted)] cursor-pointer"><ChevronRight size={12} /></button>
        </div>
        <div className="flex items-center gap-3 text-[9px]">
          {Object.entries(statusColors).map(([key, color]) => (
            <span key={key} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[var(--muted)] capitalize">{key.replace("_", " ")}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex overflow-x-auto">
        {/* Item names */}
        <div className="w-48 shrink-0 bg-[var(--surface)] border-r border-[var(--border)]">
          <div className="h-8 border-b border-[var(--border)] px-3 flex items-center">
            <span className="text-[9px] font-bold uppercase text-[var(--muted)]">Project</span>
          </div>
          {items.map(item => (
            <div
              key={item.id}
              onClick={() => onItemClick?.(item.id)}
              className="h-10 px-3 flex items-center border-b border-[var(--border)]/50 hover:bg-[var(--surface-2)] cursor-pointer"
            >
              <span className="text-[11px] font-medium text-[var(--text)] truncate">{item.name}</span>
            </div>
          ))}
        </div>

        {/* Timeline grid */}
        <div className="flex-1 overflow-x-auto">
          {/* Day headers */}
          <div className="flex h-8 border-b border-[var(--border)] bg-[var(--surface)]" style={{ width: totalWidth }}>
            {days.map((day, i) => {
              const isToday = day.toDateString() === today.toDateString()
              const isWeekend = day.getDay() === 0 || day.getDay() === 6
              return (
                <div
                  key={i}
                  className={`shrink-0 flex items-center justify-center border-r border-[var(--border)]/50 ${
                    isToday ? "bg-[var(--accent)]/10" : isWeekend ? "bg-[var(--surface-2)]/50" : ""
                  }`}
                  style={{ width: dayWidth }}
                >
                  <span className={`text-[8px] ${isToday ? "font-bold text-[var(--accent)]" : "text-[var(--muted)]"}`}>
                    {day.getDate()}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Items */}
          {items.map(item => {
            const pos = getItemPosition(item)
            return (
              <div key={item.id} className="h-10 border-b border-[var(--border)]/50 relative" style={{ width: totalWidth }}>
                {/* Weekend backgrounds */}
                {days.map((day, i) => {
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6
                  if (!isWeekend) return null
                  return <div key={i} className="absolute top-0 bottom-0 bg-[var(--surface-2)]/30" style={{ left: i * dayWidth, width: dayWidth }} />
                })}

                {/* Bar */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  className="absolute top-2 h-6 rounded-lg cursor-pointer hover:brightness-110 transition group"
                  style={{
                    left: pos.left,
                    width: Math.max(pos.width, 24),
                    backgroundColor: item.color || statusColors[item.status] || "#6b7280",
                    transformOrigin: "left",
                  }}
                  onClick={() => onItemClick?.(item.id)}
                >
                  {/* Progress fill */}
                  <div
                    className="absolute inset-y-0 left-0 rounded-lg opacity-30 bg-white"
                    style={{ width: `${item.progress}%` }}
                  />
                  <span className="relative z-10 px-2 text-[9px] font-semibold text-white truncate leading-6 block">
                    {item.name}
                  </span>
                </motion.div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
