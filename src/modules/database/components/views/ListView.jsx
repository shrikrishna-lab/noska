import React from "react";
import { Plus } from "lucide-react";

export default function ListView({ rows, properties, onPatchRow, onAddRow, activeView, onRowClick }) {
  const hiddenSet = new Set(activeView?.hiddenProperties || []);
  const visibleProps = properties.filter(p => !hiddenSet.has(p.id));

  return (
    <div className="rounded-lg border border-[var(--border)]">
      <div className="divide-y divide-[var(--border)]">
        {rows.map(row => {
          const inlineProps = visibleProps.filter(p =>
            p.id !== 'name' &&
            row[p.id] !== undefined &&
            row[p.id] !== null &&
            String(row[p.id]).trim() !== ''
          );

          return (
            <div
              key={row.id}
              onClick={() => onRowClick?.(row.id)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--hover)]/50 transition cursor-pointer"
            >
              <span className="shrink-0 text-base">{row.icon || '📄'}</span>
              <span className="flex-1 truncate font-medium text-[13px]">{row.name || 'Untitled'}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {inlineProps.slice(0, 4).map(p => {
                  const val = row[p.id];
                  const display = Array.isArray(val) ? val.join(', ') : String(val);
                  return (
                    <span
                      key={p.id}
                      className="rounded bg-[var(--surface-2)] px-2 py-0.5 text-[10px] text-[var(--muted)] max-w-[120px] truncate"
                      title={`${p.name}: ${display}`}
                    >
                      {display}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <button
        onClick={onAddRow}
        className="flex w-full items-center gap-1 px-4 py-2 text-xs text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--secondary)] transition cursor-pointer"
      >
        <Plus size={13} />
        <span>New</span>
      </button>
    </div>
  );
}
