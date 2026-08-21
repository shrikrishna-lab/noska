import React from "react";
import { Plus } from "lucide-react";
import { colorForOption } from "../../utils/optionColors";
import { PageIcon } from "../../../../components/PageIcon";
import type { DatabaseRow, PropertyDefinition, ViewDefinition } from "../../types/database";

export interface ListViewProps {
  rows: DatabaseRow[];
  properties: PropertyDefinition[];
  onPatchRow: (rowId: string, patch: Partial<DatabaseRow>) => void;
  onAddRow: () => void;
  activeView?: ViewDefinition;
  onRowClick?: (rowId: string) => void;
}

export default function ListView({ rows, properties, onAddRow, activeView, onRowClick }: ListViewProps) {
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
              <span className="shrink-0 text-base flex items-center justify-center">
                <PageIcon icon={row.icon} size={15} fallback={<span>📄</span>} />
              </span>
              <span className="flex-1 truncate font-medium text-[13px]">{row.name || 'Untitled'}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {inlineProps.slice(0, 4).map(p => {
                  const val = row[p.id];
                  const display = Array.isArray(val) ? val.join(', ') : String(val);
                  const isSelectType = p.type === 'select' || p.type === 'status' || p.type === 'priority' || p.type === 'multi-select';
                  if (isSelectType) {
                    const c = colorForOption(display);
                    return (
                      <span key={p.id} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium max-w-[130px] truncate"
                        style={{ background: c.fill, color: c.text }} title={`${p.name}: ${display}`}>
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.dot }} />
                        <span className="truncate">{display}</span>
                      </span>
                    );
                  }
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
