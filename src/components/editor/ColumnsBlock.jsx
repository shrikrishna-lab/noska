import React from "react";

const GRID_MAP = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4", 5: "grid-cols-5" };

export default function ColumnsBlock({ block, onPatch, isLocked }) {
  const columns = block.columns || [["Column one"], ["Column two"]];
  const count = columns.length;
  const gridClass = GRID_MAP[count] || "grid-cols-2";

  return (
    <div className={`grid gap-3 ${gridClass}`}>
      {columns.map((col, i) => (
        <textarea
          key={i}
          value={col.join("\n")}
          readOnly={isLocked}
          onChange={(e) =>
            onPatch({
              columns: columns.map((c, ci) => (ci === i ? e.target.value.split("\n") : c))
            })
          }
          className="min-h-28 rounded border border-[var(--border)] bg-transparent p-3 outline-none"
        />
      ))}
      {!isLocked && (
        <div className="flex gap-1 col-span-full mt-1">
          {count < 5 && (
            <button
              className="rounded border border-dashed border-[var(--border)] px-3 py-1 text-xs text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border-hover)] cursor-pointer transition"
              onClick={() => onPatch({ columns: [...columns, [`Column ${count + 1}`]] })}
            >
              + Add column
            </button>
          )}
          {count > 1 && (
            <button
              className="rounded border border-dashed border-[var(--border)] px-3 py-1 text-xs text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border-hover)] cursor-pointer transition"
              onClick={() => onPatch({ columns: columns.slice(0, -1) })}
            >
              - Remove last
            </button>
          )}
        </div>
      )}
    </div>
  );
}