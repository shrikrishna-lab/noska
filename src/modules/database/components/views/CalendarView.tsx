import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from "lucide-react";
import type { DatabaseRow, PropertyDefinition, ViewDefinition } from "../../types/database";
import { InlineAction } from "@/components/ui/inline-action";
import { flushStorageSync } from "@/utils/storage";

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export interface CalendarViewProps {
  rows: DatabaseRow[];
  properties: PropertyDefinition[];
  onPatchRow: (rowId: string, patch: Partial<DatabaseRow>) => void;
  onAddRow: () => void;
  onRowClick?: (rowId: string) => void;
  activeView: ViewDefinition;
}

export default function CalendarView({ rows, properties, onAddRow, onRowClick }: CalendarViewProps) {
  const dateProp = properties.find(p => p.type === 'date' && p.id !== 'created-time' && p.id !== 'updated-time');
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());

  const days = useMemo(() => {
    const first = new Date(currentYear, currentMonth, 1);
    const last = new Date(currentYear, currentMonth + 1, 0);
    const startPad = first.getDay();
    const daysInMonth = last.getDate();
    const result: Array<number | null> = [];
    for (let i = 0; i < startPad; i++) result.push(null);
    for (let d = 1; d <= daysInMonth; d++) result.push(d);
    return result;
  }, [currentMonth, currentYear]);

  const rowMap = useMemo(() => {
    if (!dateProp) return {} as Record<number, DatabaseRow[]>;
    const map: Record<number, DatabaseRow[]> = {};
    for (const row of rows) {
      const dt = row[dateProp.id];
      if (!dt) continue;
      // Cast: `dt` comes through DatabaseRow's index signature (`unknown`)
      // — `dateProp` is filtered to `p.type === 'date'` just above, and
      // every date-property value in this module is written as an ISO
      // date string (TableView.tsx's date `<input>`, PeekPanel.jsx's date
      // field, databaseService.ts's getDefaultValue for 'date'). Matches
      // the original JS's untyped `new Date(dt)` exactly.
      const d = new Date(dt as string);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(row);
      }
    }
    return map;
  }, [rows, dateProp, currentMonth, currentYear]);

  return (
    <div className="rounded-lg border border-[var(--border)]">
      {!dateProp && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--border)] bg-[var(--accent)]/8 text-[11px] text-[var(--secondary)]">
          <span className="text-[var(--accent)]">ℹ</span>
          Add a <span className="font-medium text-[var(--text)]">Date</span> property to plot entries on the calendar.
        </div>
      )}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <button onClick={() => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); } else setCurrentMonth(m => m - 1); }} className="grid h-7 w-7 place-items-center rounded hover:bg-[var(--hover)] cursor-pointer"><ChevronLeft size={15} /></button>
          <span className="text-sm font-semibold text-[var(--text)]">{MONTH_NAMES[currentMonth]} {currentYear}</span>
          <button onClick={() => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); } else setCurrentMonth(m => m + 1); }} className="grid h-7 w-7 place-items-center rounded hover:bg-[var(--hover)] cursor-pointer"><ChevronRight size={15} /></button>
          <button
            onClick={() => { const now = new Date(); setCurrentMonth(now.getMonth()); setCurrentYear(now.getFullYear()); }}
            className="ml-1 rounded-md border border-[var(--border)] px-2 py-1 text-[11px] font-medium text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition cursor-pointer"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-2">
          <InlineAction
            label="Database"
            icon={<CalendarDays size={16} />}
            actionText="Sync"
            onAction={async () => { await flushStorageSync(); }}
            className="px-0 w-auto"
          />
          <button onClick={onAddRow} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--secondary)] transition cursor-pointer"><Plus size={13} /><span>New</span></button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wider text-[var(--secondary)] border-b border-[var(--border)]">
        {DAY_NAMES.map(d => <div key={d} className="py-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const dayRows = day ? rowMap[day] || [] : [];
          const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();
          return (
            <div key={i} className={`min-h-[80px] border-b border-r border-[var(--border)] p-1 ${day ? 'bg-[var(--surface)]' : 'bg-[var(--surface-2)]'}`}>
              {day && (
                <>
                  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${isToday ? 'bg-[var(--accent)] text-white font-bold' : 'text-[var(--secondary)]'}`}>
                    {day}
                  </span>
                  <div className="mt-0.5 space-y-0.5">
                    {dayRows.slice(0, 3).map(row => (
                      <div key={row.id} onClick={() => onRowClick?.(row.id)} className="truncate rounded bg-[var(--accent)]/10 px-1 py-0.5 text-[10px] text-[var(--accent)] cursor-pointer hover:bg-[var(--accent)]/20 transition">{row.name || 'Untitled'}</div>
                    ))}
                    {dayRows.length > 3 && <div className="text-[9px] text-[var(--muted)] px-1" onClick={() => onRowClick?.(dayRows[3].id)}>+{dayRows.length - 3} more</div>}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
