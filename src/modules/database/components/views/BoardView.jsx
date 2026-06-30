import React, { useMemo } from "react";
import { Plus } from "lucide-react";

export default function BoardView({ rows, properties, onPatchRow, onAddRow, activeView, onRowClick }) {
  const groupBy = activeView.groupBy || 'status';
  const groupProp = properties.find(p => p.id === groupBy);

  const groups = useMemo(() => {
    const map = {};
    for (const row of rows) {
      const key = String(row[groupBy] ?? 'No status');
      if (!map[key]) map[key] = [];
      map[key].push(row);
    }
    return map;
  }, [rows, groupBy]);

  const groupKeys = groupProp?.options?.filter(o => groups[o]) || Object.keys(groups);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {groupKeys.map(key => (
        <div key={key} className="min-w-[240px] max-w-[280px] flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--secondary)]">
              {key} <span className="ml-1 text-[var(--muted)] font-normal">{groups[key]?.length || 0}</span>
            </span>
          </div>
          <div className="space-y-1.5 p-2">
            {(groups[key] || []).map(row => (
              <div key={row.id} onClick={() => onRowClick?.(row.id)} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] shadow-sm hover:border-[var(--accent)]/50 transition cursor-pointer">
                <div className="flex items-center gap-2">
                  <span>{row.icon || '📄'}</span>
                  <span className="truncate font-medium text-[12px]">{row.name || 'Untitled'}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {properties.filter(p => p.type === 'priority' || p.type === 'status').map(p => (
                    row[p.id] && <span key={p.id} className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">{row[p.id]}</span>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={onAddRow} className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-xs text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--secondary)] transition cursor-pointer">
              <Plus size={13} />
              <span>New</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
