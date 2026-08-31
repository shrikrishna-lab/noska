import React from "react";
import { Plus, Check, Edit2, Trash2 } from "lucide-react";
import { STICKY_PALETTES, CanvasElementData, getCardPalette } from "./canvasStore";

interface CanvasKanbanViewProps {
  elements: Record<string, CanvasElementData>;
  onUpdateElement: (id: string, updates: Partial<CanvasElementData>) => void;
  onDeleteElement: (id: string) => void;
  onAddStickyInColumn: (colorId: string) => void;
}

export default function CanvasKanbanView({
  elements,
  onUpdateElement,
  onDeleteElement,
  onAddStickyInColumn,
}: CanvasKanbanViewProps) {
  const stickies = Object.values(elements).filter((e) => e.kind === "sticky");

  return (
    <div className="flex-1 min-h-0 overflow-x-auto p-6 scrollbar-thin bg-black/[0.02] dark:bg-black/20">
      <div className="flex items-start gap-4 min-w-max pb-8">
        {STICKY_PALETTES.map((col) => {
          const colCards = stickies.filter((s) => s.color === col.id || (!s.color && col.id === "yellow"));

          return (
            <div
              key={col.id}
              className="w-72 shrink-0 rounded-2xl border border-black/8 dark:border-white/10 bg-white/70 dark:bg-[#15171e]/70 backdrop-blur-xl p-3.5 flex flex-col gap-3 shadow-xs"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">{col.emoji}</span>
                  <span className="text-xs font-bold text-[var(--text)]">{col.label}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-black/[0.05] dark:bg-white/10 text-slate-500">
                    {colCards.length}
                  </span>
                </div>
                <button
                  onClick={() => onAddStickyInColumn(col.id)}
                  title={`Add ${col.label}`}
                  className="h-6 w-6 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] text-slate-600 dark:text-slate-300 grid place-items-center transition cursor-pointer"
                >
                  <Plus size={13} />
                </button>
              </div>

              {/* Card List in Column */}
              <div className="flex-1 space-y-2.5 min-h-[350px]">
                {colCards.length === 0 ? (
                  <div
                    onClick={() => onAddStickyInColumn(col.id)}
                    className="h-28 rounded-xl border border-dashed border-black/10 dark:border-white/10 flex flex-col items-center justify-center text-slate-400 text-xs hover:border-black/20 hover:text-slate-600 cursor-pointer transition"
                  >
                    <Plus size={16} className="mb-1 opacity-60" />
                    <span>Drop or add note</span>
                  </div>
                ) : (
                  colCards.map((card) => {
                    const palette = getCardPalette(card.id, card.color);

                    return (
                      <div
                        key={card.id}
                        className="group relative rounded-xl p-3.5 shadow-2xs border transition-all duration-150"
                        style={{
                          backgroundColor: palette.bg,
                          borderColor: palette.border,
                          color: palette.text
                        }}
                      >
                        {/* Card Content */}
                        <textarea
                          value={card.text || ""}
                          onChange={(e) => onUpdateElement(card.id, { text: e.target.value })}
                          placeholder="Type something..."
                          rows={3}
                          className="w-full bg-transparent resize-none text-xs font-medium outline-none placeholder:opacity-40"
                          style={{ color: palette.text }}
                        />

                        {/* Card Footer Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-black/5">
                          {/* Column Mover Menu */}
                          <div className="flex items-center gap-1">
                            {STICKY_PALETTES.filter(p => p.id !== card.color).map(p => (
                              <button
                                key={p.id}
                                onClick={() => onUpdateElement(card.id, { color: p.id })}
                                title={`Move to ${p.label}`}
                                className="h-4 w-4 rounded-full border border-black/15 transition hover:scale-110 cursor-pointer"
                                style={{ backgroundColor: p.bg }}
                              />
                            ))}
                          </div>

                          <button
                            onClick={() => onDeleteElement(card.id)}
                            title="Delete note"
                            className="text-black/30 hover:text-red-600 transition cursor-pointer p-0.5"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
