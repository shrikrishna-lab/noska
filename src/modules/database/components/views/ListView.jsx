import React from "react";
import { Plus } from "lucide-react";

export default function ListView({ rows, properties, onPatchRow, onAddRow, onRowClick }) {
  return (
    <div className="rounded-lg border border-[var(--border)]">
      <div className="space-y-0">
        {rows.map(row => (
          <div key={row.id} onClick={() => onRowClick?.(row.id)} className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--hover)]/50 transition cursor-pointer">
            <input
              type="checkbox"
              checked={row.done === true}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onPatchRow(row.id, { done: e.target.checked })}
              className="accent-[var(--accent)] cursor-pointer shrink-0"
            />
            <span className="shrink-0 text-base">{row.icon || '📄'}</span>
            <span className="flex-1 truncate font-medium">{row.name || 'Untitled'}</span>
            {properties.filter(p => p.type === 'status' || p.type === 'priority').map(p => (
              row[p.id] && <span key={p.id} className="shrink-0 rounded bg-[var(--surface-2)] px-2 py-0.5 text-[10px] text-[var(--muted)]">{row[p.id]}</span>
            ))}
          </div>
        ))}
      </div>
      <button onClick={onAddRow} className="flex w-full items-center gap-1 px-4 py-2 text-xs text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--secondary)] transition cursor-pointer">
        <Plus size={13} />
        <span>New</span>
      </button>
    </div>
  );
}
