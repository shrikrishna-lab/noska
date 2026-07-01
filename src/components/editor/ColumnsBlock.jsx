import React from "react";
import { Plus, Minus } from "lucide-react";

const GRID_MAP = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4", 5: "grid-cols-5" };

/**
 * ColumnsBlock — multi-column layout matching the slash-menu preview:
 * clean bordered column cards with hover affordances, inline editing,
 * and unobtrusive add/remove controls that appear on hover.
 */
export default function ColumnsBlock({ block, onPatch, isLocked }) {
  const columns = block.columns || [["Column one"], ["Column two"]];
  const count = columns.length;
  const gridClass = GRID_MAP[count] || "grid-cols-2";

  return (
    <div className="group/cols my-2">
      <div className={`grid gap-3 ${gridClass}`}>
        {columns.map((col, i) => (
          <div
            key={i}
            className="relative rounded-lg border border-[var(--border)] bg-[var(--surface)]/60 transition-colors hover:border-[var(--border-strong)] focus-within:border-[var(--accent)] focus-within:bg-[var(--surface)]"
          >
            <textarea
              value={Array.isArray(col) ? col.join("\n") : ""}
              readOnly={isLocked}
              onChange={(e) =>
                onPatch({
                  columns: columns.map((c, ci) => (ci === i ? e.target.value.split("\n") : c)),
                })
              }
              placeholder={`Column ${i + 1}`}
              className="w-full min-h-[112px] resize-none rounded-lg bg-transparent p-3 text-sm leading-relaxed text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
            />
          </div>
        ))}
      </div>

      {!isLocked && (
        <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover/cols:opacity-100 transition-opacity">
          {count < 5 && (
            <button
              className="flex items-center gap-1 rounded-md border border-dashed border-[var(--border)] px-2.5 py-1 text-[11px] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)] cursor-pointer transition"
              onClick={() => onPatch({ columns: [...columns, [`Column ${count + 1}`]] })}
            >
              <Plus size={11} /> Add column
            </button>
          )}
          {count > 1 && (
            <button
              className="flex items-center gap-1 rounded-md border border-dashed border-[var(--border)] px-2.5 py-1 text-[11px] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)] cursor-pointer transition"
              onClick={() => onPatch({ columns: columns.slice(0, -1) })}
            >
              <Minus size={11} /> Remove last
            </button>
          )}
        </div>
      )}
    </div>
  );
}
