import React, { useMemo, useState } from "react";
import { Plus, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

export default function TimelineView({ rows, properties, onPatchRow, onAddRow, onRowClick, activeView }) {
  const [zoom, setZoom] = useState(1);
  const dateProp = properties.find(p => p.type === 'date' && p.id !== 'created-time' && p.id !== 'updated-time');

  const dated = useMemo(() => rows.filter(r => r[dateProp?.id]), [rows, dateProp]);
  const startDate = useMemo(() => dated.length ? dated.reduce((a, b) => new Date(a[dateProp.id]) < new Date(b[dateProp.id]) ? a : b) : null, [dated, dateProp]);
  const endDate = useMemo(() => dated.length ? dated.reduce((a, b) => new Date(a[dateProp.id]) > new Date(b[dateProp.id]) ? a : b) : null, [dated, dateProp]);

  const dayWidth = 20 * zoom;
  const totalDays = startDate && endDate ? Math.ceil((new Date(endDate[dateProp.id]) - new Date(startDate[dateProp.id])) / (1000 * 60 * 60 * 24)) + 1 : 30;

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
          {rows.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-[var(--muted)]">Add rows with date properties to see them on the timeline</div>
          ) : (
            rows.map((row, idx) => {
              const dt = row[dateProp?.id];
              const dayOffset = dt && startDate ? Math.round((new Date(dt) - new Date(startDate[dateProp.id])) / (1000 * 60 * 60 * 24)) : 0;
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
                  <span className="w-24 shrink-0 text-[10px] text-[var(--muted)] text-right">{dt || ''}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
