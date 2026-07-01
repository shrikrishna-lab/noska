import React, { useMemo } from "react";
import { Plus } from "lucide-react";
import { colorForOption } from "../../utils/optionColors";

export default function GalleryView({ rows, properties, onPatchRow, onAddRow, activeView, onRowClick }) {
  const hiddenSet = new Set(activeView?.hiddenProperties || []);
  const visibleProps = properties.filter(p => !hiddenSet.has(p.id));

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {rows.map(row => {
          const previewProps = visibleProps.filter(p =>
            p.id !== 'name' &&
            row[p.id] !== undefined &&
            row[p.id] !== null &&
            String(row[p.id]).trim() !== ''
          ).slice(0, 3);

          return (
            <div
              key={row.id}
              onClick={() => onRowClick?.(row.id)}
              className="group rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden hover:border-[var(--accent)]/50 transition cursor-pointer"
            >
              <div className="h-24 flex items-center justify-center text-3xl bg-[var(--surface-2)]">
                {row.icon || '📄'}
              </div>
              <div className="p-3">
                <div className="text-[13px] font-medium text-[var(--text)] truncate">{row.name || 'Untitled'}</div>
                {previewProps.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {previewProps.map(p => {
                      const val = row[p.id];
                      const display = Array.isArray(val) ? val.join(', ') : String(val);
                      const isSelectType = p.type === 'select' || p.type === 'status' || p.type === 'priority' || p.type === 'multi-select';
                      if (isSelectType) {
                        const c = colorForOption(display);
                        return (
                          <span key={p.id} className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium max-w-[110px] truncate"
                            style={{ background: c.fill, color: c.text }} title={`${p.name}: ${display}`}>
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.dot }} />
                            <span className="truncate">{display}</span>
                          </span>
                        );
                      }
                      return (
                        <span
                          key={p.id}
                          className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[9px] text-[var(--muted)] max-w-[110px] truncate"
                          title={`${p.name}: ${display}`}
                        >
                          {display}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <button
          onClick={onAddRow}
          className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] p-6 text-xs text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--secondary)] hover:border-[var(--border-strong)] transition cursor-pointer"
        >
          <Plus size={18} />
          <span>New page</span>
        </button>
      </div>
    </div>
  );
}
