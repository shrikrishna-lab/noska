import React, { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Calendar as CalIcon, ChevronLeft, ChevronRight, Loader2, Plus, Clock } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useCompany } from "../../contexts/CompanyContext"

interface CalendarEvent {
  id: string
  title: string
  date: string
  type: "meeting" | "deadline" | "milestone" | "event"
  color: string
}

const EVENT_COLORS: Record<string, string> = {
  meeting: "#3b82f6",
  deadline: "#ef4444",
  milestone: "#22c55e",
  event: "#8b5cf6",
}

interface TeamCalendarProps {
  teamId?: string
}

export function TeamCalendar({ teamId }: TeamCalendarProps) {
  const { currentCompany } = useCompany()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    if (!currentCompany) return
    setLoading(true)
    try {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      const start = new Date(year, month, 1).toISOString()
      const end = new Date(year, month + 1, 0).toISOString()

      const { data } = await (supabase as any)
        .from("calendar_events")
        .select("*")
        .eq("organization_id", currentCompany.id)
        .gte("event_date", start)
        .lte("event_date", end)
        .order("event_date")

      setEvents((data || []).map((e: any) => ({
        id: e.id,
        title: e.title,
        date: e.event_date,
        type: e.event_type || "event",
        color: EVENT_COLORS[e.event_type] || EVENT_COLORS.event,
      })))
    } catch { setEvents([]) }
    finally { setLoading(false) }
  }, [currentCompany, currentDate])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  const days = Array.from({ length: firstDay }, (_, i) => null)
    .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1))

  const getEventsForDay = (day: number) => {
    const dateStr = new Date(year, month, day).toISOString().split("T")[0]
    return events.filter(e => e.date.split("T")[0] === dateStr)
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1))

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--surface)]">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--muted)] cursor-pointer"><ChevronLeft size={14} /></button>
        <h3 className="text-[13px] font-bold text-[var(--text)]">
          {currentDate.toLocaleString("default", { month: "long", year: "numeric" })}
        </h3>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--muted)] cursor-pointer"><ChevronRight size={14} /></button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 bg-[var(--surface-2)]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} className="px-2 py-1.5 text-center text-[9px] font-bold uppercase text-[var(--muted)]">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 size={16} className="animate-spin text-[var(--muted)]" /></div>
      ) : (
        <div className="grid grid-cols-7 bg-[var(--surface)]">
          {days.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} className="h-20 bg-[var(--surface-2)]/30" />
            const dayEvents = getEventsForDay(day)
            const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
            const isSelected = selectedDate === dateStr

            return (
              <div
                key={day}
                onClick={() => setSelectedDate(dateStr)}
                className={`h-20 p-1 border-t border-r border-[var(--border)]/50 cursor-pointer hover:bg-[var(--surface-2)]/50 transition ${
                  isSelected ? "bg-[var(--accent)]/5" : ""
                }`}
              >
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold ${
                  isToday ? "bg-[var(--accent)] text-white" : "text-[var(--text)]"
                }`}>
                  {day}
                </span>
                <div className="mt-0.5 space-y-0.5">
                  {dayEvents.slice(0, 2).map(e => (
                    <div key={e.id} className="px-1 py-0.5 rounded text-[8px] font-medium text-white truncate" style={{ backgroundColor: e.color }}>
                      {e.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="text-[8px] text-[var(--muted)]">+{dayEvents.length - 2}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
