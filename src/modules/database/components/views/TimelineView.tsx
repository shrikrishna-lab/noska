import React, { useMemo, useState } from "react";
import { Plus, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import type { DatabaseRow, PropertyDefinition, ViewDefinition } from "../../types/database";

export interface TimelineViewProps {
  rows: DatabaseRow[];
  properties: PropertyDefinition[];
  onPatchRow: (rowId: string, patch: Partial<DatabaseRow>) => void;
  onAddRow: () => void;
  onRowClick?: (rowId: string) => void;
  activeView?: ViewDefinition;
}

export default function TimelineView({ rows, properties, onAddRow, onRowClick }: TimelineViewProps) {
  const [zoom, setZoom] = useState(1);
  const dateProp = properties.find(p => p.type === 'date' && p.id !== 'created-time' && p.id !== 'updated-time');

  const dated = useMemo(() => rows.filter(r => dateProp && r[dateProp.id]), [rows, dateProp]);
  // Casts through this file (`r[dateProp.id] as string`, etc.) narrow
  // DatabaseRow's per-property index-signature access (`unknown`) to
  // `string` — `dateProp` is always filtered to `p.type === 'date'`, and
  // every date-property value in this module is an ISO date string
  // (same rationale as CalendarView.tsx's identical cast). Matches the
  // original JS's untyped `new Date(row[dateProp.id])` exactly.
  const startDate = useMemo(
    () => (dated.length && dateProp) ? dated.reduce((a, b) => new Date(a[dateProp.id] as string).getTime() < new Date(b[dateProp.id] as string).getTime() ? a : b) : null,
    [dated, dateProp]
  );
  const endDate = useMemo(
    () => (dated.length && dateProp) ? dated.reduce((a, b) => new Date(a[dateProp.id] as string).getTime() > new Date(b[dateProp.id] as string).getTime() ? a : b) : null,
    [dated, dateProp]
  );

  const dayWidth = 20 * zoom;
  const totalDays = (startDate && endDate && dateProp)
    ? Math.ceil((new Date(endDate[dateProp.id] as string).getTime() - new Date(startDate[dateProp.id] as string).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 30;

  // Date-scale ticks and the "today" marker offset (in px from the track start).
  const rangeStart = (startDate && dateProp) ? new Date(startDate[dateProp.id] as string) : null;
  const scaleTicks = useMemo(() => {
    if (!rangeStart) return [] as Array<{ offset: number; label: string }>;
    const ticks: Array<{ offset: number; label: string }> = [];
    // One tick per ~week (or per day when zoomed in enough).
    const step = dayWidth >= 40 ? 1 : 7;
    for (let d = 0; d < totalDays; d += step) {
      const date = new Date(rangeStart);
      date.setDate(date.getDate() + d);
      ticks.push({ offset: d * dayWidth, label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) });
    }
    return ticks;
  }, [rangeStart, totalDays, dayWidth]);

  const todayOffset = useMemo(() => {
    if (!rangeStart) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0 || diffDays > totalDays) return null; // today outside range
    return diffDays * dayWidth;
  }, [rangeStart, totalDays, dayWidth]);

  const LABEL_COL = 144; // width of the left task-label column (w-36)

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
        <span className="text-[11px] font-semibold text-[var(--secondary)]">Timeline</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="grid h-6 w-6 place-items-center rounded hover:bg-[var(--hover)] cursor-pointer"><ZoomOut size={13} /></button>
          <span className="text-[10px] text-[var(--muted)] w-8 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="grid h-6 w-6 place-items-center rounded hover:bg-[var(--hover)] cursor-pointer"><ZoomIn size={13} /></button>
          <button onClick={() => setZoom(1)} className="grid h-6 w-6 place-items-center rounded hover:bg-[var(--hover)] cursor-pointer"><RotateCcw size={13} /></button>
          <div className="w-px h-4 bg-[var(--border)] mx-1" />
          <button onClick={onAddRow} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--secondary)] transition cursor-pointer"><Plus size={13} /><span>New</span></button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[600px] p-4" style={{ width: totalDays * dayWidth + 200 }}>
          {!dateProp ? (
            <div className="flex flex-col items-center justify-center gap-1 py-12 text-center">
              <div className="text-sm font-medium text-[var(--secondary)]">Timeline needs a Date property</div>
              <div className="text-xs text-[var(--muted)] max-w-[280px]">Add a <span className="font-medium text-[var(--text)]">Date</span> property to position rows along the timeline.</div>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-[var(--muted)]">Add rows with date properties to see them on the timeline</div>
          ) : (
            <>
              {/* Date scale header */}
              <div className="flex items-end gap-3 pb-1 mb-2 border-b border-[var(--border)]">
                <div className="shrink-0" style={{ width: LABEL_COL }} />
                <div className="relative flex-1 h-5">
                  {scaleTicks.map((t, i) => (
                    <div key={i} className="absolute top-0 flex flex-col items-start" style={{ left: t.offset }}>
                      <span className="text-[9px] text-[var(--muted)] whitespace-nowrap">{t.label}</span>
                    </div>
                  ))}
                  {/* Today marker label */}
                  {todayOffset != null && (
                    <div className="absolute -top-0.5 flex flex-col items-center" style={{ left: todayOffset, transform: 'translateX(-50%)' }}>
                      <span className="text-[8px] font-semibold text-[var(--danger)]">Today</span>
                    </div>
                  )}
                </div>
                <div className="w-24 shrink-0" />
              </div>

              <div className="relative">
                {/* Today vertical line spanning all rows */}
                {todayOffset != null && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-[var(--danger)]/70 z-10 pointer-events-none"
                    style={{ left: LABEL_COL + 12 + todayOffset }}
                  />
                )}
                {rows.map((row) => {
                  const dt = dateProp ? row[dateProp.id] : undefined;
                  const dayOffset = (dt && startDate && dateProp)
                    ? Math.round((new Date(dt as string).getTime() - new Date(startDate[dateProp.id] as string).getTime()) / (1000 * 60 * 60 * 24))
                    : 0;
                  return (
                    <div key={row.id} onClick={() => onRowClick?.(row.id)} className="flex items-center gap-3 py-1.5 group">
                      <div className="w-36 shrink-0 text-xs text-[var(--text)] truncate font-medium">{row.name || 'Untitled'}</div>
                      <div className="relative h-6 flex-1 rounded bg-[var(--surface-2)]">
                        <div
                          className="absolute top-0.5 h-5 rounded bg-[var(--accent)]/60 flex items-center px-2 text-[9px] text-white font-medium truncate cursor-pointer hover:bg-[var(--accent)]/80 transition"
                          style={{ left: dayOffset * dayWidth, width: Math.max(60, dayWidth * 2) }}
                          title={row.name}
                        >
                          {row.name || 'Untitled'}
                        </div>
                      </div>
                      <span className="w-24 shrink-0 text-[10px] text-[var(--muted)] text-right">{(dt as string) || ''}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
