import React, { useMemo } from "react";
import { Hash, PieChart, CheckSquare, Plus } from "lucide-react";
import type { DatabaseRow, PropertyDefinition } from "../../types/database";

export interface DashboardViewProps {
  rows: DatabaseRow[];
  properties: PropertyDefinition[];
  onAddRow: () => void;
  onRowClick?: (rowId: string) => void;
}

/**
 * DashboardView — summary widgets computed live from the database rows.
 * No fake data: every widget reflects the real current rows/properties.
 * - Total count
 * - Breakdown by each select/status/priority property
 * - Completion % for each checkbox property
 */
export default function DashboardView({ rows, properties, onAddRow }: DashboardViewProps) {
  const selectProps = useMemo(
    () => properties.filter((p) => p.type === "select" || p.type === "status" || p.type === "priority"),
    [properties]
  );
  const checkboxProps = useMemo(() => properties.filter((p) => p.type === "checkbox"), [properties]);

  const breakdown = (prop: PropertyDefinition): Array<[string, number]> => {
    const counts: Record<string, number> = {};
    for (const row of rows) {
      const raw = row[prop.id];
      const key = raw === undefined || raw === null || String(raw).trim() === "" ? "—" : String(raw);
      counts[key] = (counts[key] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  };

  const completion = (prop: PropertyDefinition): number => {
    if (rows.length === 0) return 0;
    const done = rows.filter((r) => r[prop.id] === true || r[prop.id] === "true").length;
    return Math.round((done / rows.length) * 100);
  };

  const COLORS = ["var(--accent)", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ec4899", "#14b8a6", "#ef4444"];

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--secondary)]">Dashboard</span>
        <button onClick={onAddRow} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--secondary)] transition cursor-pointer">
          <Plus size={13} /><span>New</span>
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 py-10 text-center">
          <div className="text-sm font-medium text-[var(--secondary)]">No data yet</div>
          <div className="text-xs text-[var(--muted)] max-w-[280px]">Add rows and Select/Checkbox properties — this dashboard summarizes them automatically.</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {/* Total count widget */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">
              <Hash size={11} /> Total
            </div>
            <div className="text-3xl font-black text-[var(--accent)] tabular-nums">{rows.length}</div>
            <div className="text-[10px] text-[var(--muted)]">row{rows.length === 1 ? "" : "s"}</div>
          </div>

          {/* Breakdown widgets per select property */}
          {selectProps.map((prop) => {
            const data = breakdown(prop);
            const max = Math.max(1, ...data.map(([, n]) => n));
            return (
              <div key={prop.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">
                  <PieChart size={11} /> {prop.name}
                </div>
                <div className="space-y-1.5">
                  {data.slice(0, 5).map(([label, n], i) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="text-[10px] text-[var(--secondary)] w-16 truncate" title={label}>{label}</span>
                      <div className="flex-1 h-3 rounded bg-[var(--hover)] overflow-hidden">
                        <div className="h-full rounded" style={{ width: `${(n / max) * 100}%`, background: COLORS[i % COLORS.length], minWidth: 6 }} />
                      </div>
                      <span className="text-[10px] text-[var(--muted)] tabular-nums w-5 text-right">{n}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Completion widgets per checkbox property */}
          {checkboxProps.map((prop) => {
            const pct = completion(prop);
            return (
              <div key={prop.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">
                  <CheckSquare size={11} /> {prop.name}
                </div>
                <div className="text-2xl font-black text-[var(--accent)] tabular-nums">{pct}%</div>
                <div className="mt-1.5 h-2 rounded bg-[var(--hover)] overflow-hidden">
                  <div className="h-full rounded bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
