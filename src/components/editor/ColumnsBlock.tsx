import React, { useState, useRef, useEffect } from "react";
import { Plus, Minus, Palette, Check } from "lucide-react";
import { COLUMN_TINTS } from "../../utils/helpers";
// Aliased to avoid colliding with this file's own `ColumnsBlock` component
// name (same pattern as CodeBlockData vs. the CodeBlock component).
import type { ColumnsBlock as ColumnsBlockData } from "../../../types/blocks";

const GRID_MAP = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4", 5: "grid-cols-5" };

// Named column tint → light/dark-correct fill + border, driven by CSS color-mix
// against theme tokens so it stays correct in both modes. "none" = transparent.
const TINT_NAMES = ["none", "green", "blue", "orange", "purple", "yellow", "pink", "red", "gray"];

function tintStyle(name?: string): { background: string; borderColor: string } {
  if (!name || name === "none") {
    return { background: "transparent", borderColor: "var(--border)" };
  }
  const base = ({
    green: "#22c55e", blue: "#3b82f6", orange: "#f97316", purple: "#a855f7",
    yellow: "#eab308", pink: "#ec4899", red: "#ef4444", gray: "#8b8b8b",
  } as Record<string, string>)[name] || "#8b8b8b";
  return {
    background: `color-mix(in srgb, ${base} 12%, var(--surface))`,
    borderColor: `color-mix(in srgb, ${base} 32%, var(--border))`,
  };
}

function swatchColor(name: string): string {
  if (name === "none") return "var(--surface-3, #ccc)";
  return ({ green: "#22c55e", blue: "#3b82f6", orange: "#f97316", purple: "#a855f7",
    yellow: "#eab308", pink: "#ec4899", red: "#ef4444", gray: "#8b8b8b" } as Record<string, string>)[name] || "#8b8b8b";
}

/**
 * ColumnsBlock — multi-column layout that visually matches the slash-menu preview:
 * tinted column cards (green/blue/… from the shared palette) with empty-state
 * placeholders (no fake text), immediate editing, and a per-column color picker.
 */
interface ColumnsBlockProps {
  block: ColumnsBlockData;
  onPatch: (patch: Partial<ColumnsBlockData>) => void;
  isLocked?: boolean;
}

export default function ColumnsBlock({ block, onPatch, isLocked }: ColumnsBlockProps) {
  const columns = block.columns || [[""], [""]];
  const count = columns.length;
  const gridClass = (GRID_MAP as Record<number, string>)[count] || "grid-cols-2";
  const colors = block.columnColors || columns.map((_, i) => COLUMN_TINTS[i % COLUMN_TINTS.length]);

  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pickerFor === null) return;
    const handler = (e: MouseEvent) => { if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerFor(null); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pickerFor]);

  const setColColor = (i: number, name: string) => {
    const next = columns.map((_, ci) => colors[ci] || COLUMN_TINTS[ci % COLUMN_TINTS.length]);
    next[i] = name;
    onPatch({ columnColors: next });
    setPickerFor(null);
  };

  const addColumn = () => {
    onPatch({
      columns: [...columns, [""]],
      columnColors: [...colors, COLUMN_TINTS[count % COLUMN_TINTS.length]],
    });
  };

  const removeColumn = () => {
    onPatch({ columns: columns.slice(0, -1), columnColors: colors.slice(0, -1) });
  };

  return (
    <div className="group/cols my-2">
      <div className={`grid gap-3 ${gridClass}`}>
        {columns.map((col, i) => {
          const tint = colors[i] || COLUMN_TINTS[i % COLUMN_TINTS.length];
          const style = tintStyle(tint);
          return (
            <div
              key={i}
              style={{ background: style.background, borderColor: style.borderColor }}
              className="relative rounded-lg border transition-colors focus-within:ring-1 focus-within:ring-[var(--accent)]"
            >
              {/* Per-column color control (appears on hover) */}
              {!isLocked && (
                <div className="absolute top-1.5 right-1.5 z-10">
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => setPickerFor(pickerFor === i ? null : i)}
                    title="Change column background color"
                    className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] opacity-0 group-hover/cols:opacity-100 focus:opacity-100 transition cursor-pointer"
                  >
                    <Palette size={13} />
                  </button>
                  {pickerFor === i && (
                    <div
                      ref={pickerRef}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="absolute top-full right-0 mt-1 z-30 w-[168px] rounded-lg border border-[var(--border-strong)] bg-[var(--elevated)] p-2 shadow-xl"
                    >
                      <div className="text-[9px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1.5 px-0.5">Column background</div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {TINT_NAMES.map((name) => (
                          <button
                            key={name}
                            onClick={() => setColColor(i, name)}
                            title={name === "none" ? "None" : name}
                            className={`relative w-6 h-6 rounded-md border transition-transform hover:scale-110 cursor-pointer ${
                              tint === name ? "ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--elevated)]" : "border-[var(--border)]"
                            }`}
                            style={{ background: name === "none" ? "transparent" : swatchColor(name) }}
                          >
                            {name === "none" && <span className="absolute inset-0 flex items-center justify-center text-[var(--muted)] text-[10px]">∅</span>}
                            {tint === name && name !== "none" && <Check size={12} className="absolute inset-0 m-auto text-white drop-shadow" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <textarea
                value={Array.isArray(col) ? col.join("\n") : ""}
                readOnly={isLocked}
                onChange={(e) =>
                  onPatch({
                    columns: columns.map((c, ci) => (ci === i ? e.target.value.split("\n") : c)),
                  })
                }
                placeholder="Type or drag blocks here…"
                className="w-full min-h-[120px] resize-none rounded-lg bg-transparent p-3 pr-8 text-sm leading-relaxed text-[var(--text)] outline-none placeholder:text-[var(--muted)]/70"
              />
            </div>
          );
        })}
      </div>

      {!isLocked && (
        <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover/cols:opacity-100 transition-opacity">
          {count < 5 && (
            <button
              className="flex items-center gap-1 rounded-md border border-dashed border-[var(--border)] px-2.5 py-1 text-[11px] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)] cursor-pointer transition"
              onClick={addColumn}
            >
              <Plus size={11} /> Add column
            </button>
          )}
          {count > 1 && (
            <button
              className="flex items-center gap-1 rounded-md border border-dashed border-[var(--border)] px-2.5 py-1 text-[11px] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)] cursor-pointer transition"
              onClick={removeColumn}
            >
              <Minus size={11} /> Remove last
            </button>
          )}
        </div>
      )}
    </div>
  );
}
