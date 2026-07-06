import React from "react";
import { Plus } from "lucide-react";
import type { DatabaseRow, PropertyDefinition, ViewDefinition } from "../../types/database";

export interface FeedViewProps {
  rows: DatabaseRow[];
  properties: PropertyDefinition[];
  onAddRow: () => void;
  activeView?: ViewDefinition;
  onRowClick?: (rowId: string) => void;
}

/**
 * FeedView — a newest-first vertical stream of database rows, styled like an
 * activity/RSS feed. Uses the same row data as every other view; no fake data.
 * Empty state shows only the "New" affordance.
 */
export default function FeedView({ rows, properties, onAddRow, activeView, onRowClick }: FeedViewProps) {
  const hiddenSet = new Set(activeView?.hiddenProperties || []);
  const visibleProps = properties.filter((p) => !hiddenSet.has(p.id));

  // Newest first: prefer updatedAt/createdAt if present, else preserve order reversed.
  const ordered = [...rows].sort((a, b) => {
    const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return tb - ta;
  });

  return (
    <div className="rounded-lg border border-[var(--border)] divide-y divide-[var(--border)]">
      {ordered.map((row) => {
        const bodyProps = visibleProps.filter(
          (p) => p.id !== "name" && row[p.id] !== undefined && row[p.id] !== null && String(row[p.id]).trim() !== ""
        );
        const ts = row.updatedAt || row.createdAt;
        return (
          <div
            key={row.id}
            onClick={() => onRowClick?.(row.id)}
            className="flex gap-3 px-4 py-3 hover:bg-[var(--hover)]/50 transition cursor-pointer"
          >
            <span className="shrink-0 text-lg mt-0.5">{row.icon || "📄"}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-[13px] text-[var(--text)] truncate">{row.name || "Untitled"}</span>
                {ts && <span className="text-[10px] text-[var(--muted)] shrink-0">{new Date(ts).toLocaleDateString()}</span>}
              </div>
              {bodyProps.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {bodyProps.slice(0, 5).map((p) => {
                    const val = row[p.id];
                    const display = Array.isArray(val) ? val.join(", ") : String(val);
                    return (
                      <span key={p.id} className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] text-[var(--muted)] max-w-[160px] truncate" title={`${p.name}: ${display}`}>
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
        className="flex w-full items-center gap-1 px-4 py-2.5 text-xs text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--secondary)] transition cursor-pointer"
      >
        <Plus size={13} />
        <span>New</span>
      </button>
    </div>
  );
}
