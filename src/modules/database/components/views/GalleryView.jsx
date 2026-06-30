import React, { useMemo } from "react";
import { Plus, ArrowUpRight } from "lucide-react";

export default function GalleryView({ rows, properties, onPatchRow, onAddRow, onRowClick }) {
  const coverProp = properties.find(p => p.type === 'url' || p.id === 'cover');
  const titleProp = properties.find(p => p.id === 'name');

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {rows.map(row => (
          <div key={row.id} onClick={() => onRowClick?.(row.id)} className="group rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden hover:border-[var(--accent)]/50 transition cursor-pointer">
            <div
              className="h-24 flex items-center justify-center text-3xl"
              style={{ background: row.cover || 'var(--surface-2)' }}
            >
              {!row.cover && (row.icon || '📄')}
            </div>
            <div className="p-3">
              <div className="text-[13px] font-medium text-[var(--text)] truncate">{row.name || 'Untitled'}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {properties.slice(0, 3).map(p => (
                  p.id !== 'name' && row[p.id] && (
                    <span key={p.id} className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[9px] text-[var(--muted)]">{String(row[p.id]).slice(0, 20)}</span>
                  )
                ))}
              </div>
            </div>
          </div>
        ))}
        <button onClick={onAddRow} className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] p-6 text-xs text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--secondary)] transition cursor-pointer">
          <Plus size={18} />
          <span>New</span>
        </button>
      </div>
    </div>
  );
}
