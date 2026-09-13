/**
 * WidgetPicker — "Add widget" dialog: the registry filtered by server
 * availability, grouped by category, with search. One instance per widget
 * (duplicates add no information — matching the widget philosophy).
 */
import React, { useMemo, useState } from "react";
import { Check, LayoutGrid, Plus, Search } from "lucide-react";
import { Modal, ModalHeader } from "../../../components/ui";
import { useWidgetEngine } from "../engine";
import { getWidgetDefinition, WIDGET_CATEGORIES } from "../registry";
import type { WidgetCategory } from "../types";

const CATEGORY_LABELS: Record<WidgetCategory, string> = {
  productivity: "Productivity",
  gamified: "Gamified",
  ai: "AI",
  workspace: "Workspace",
  project: "Projects",
  notifications: "Notifications",
  integrations: "Integrations",
  system: "System",
};

export function WidgetPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { catalog, layout, addWidget, isAvailable, isBeta } = useWidgetEngine();
  const [query, setQuery] = useState("");

  const present = useMemo(() => new Set(layout.widgets.map((w) => w.widgetId)), [layout.widgets]);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result: Array<[WidgetCategory, NonNullable<ReturnType<typeof getWidgetDefinition>>[]]> = [];
    for (const category of WIDGET_CATEGORIES) {
      const items = catalog
        .filter((entry) => {
          if (entry.category !== category) return false;
          if (!isAvailable(entry.id)) return false;
          const def = getWidgetDefinition(entry.id);
          if (!def) return false;
          if (q && !`${def.name} ${def.description}`.toLowerCase().includes(q)) return false;
          return true;
        })
        .map((entry) => getWidgetDefinition(entry.id)!);
      if (items.length) result.push([category, items]);
    }
    return result;
  }, [catalog, isAvailable, query]);

  if (!open) return null;

  return (
    <Modal onClose={onClose}>
      <div className="w-[520px] max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-2xl">
        <ModalHeader icon={LayoutGrid} title="Add a widget" onClose={onClose} />
        <div className="px-5">
          <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
            <Search size={14} className="text-[var(--muted)]" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search widgets…"
              className="w-full bg-transparent text-xs text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
            />
          </div>
        </div>
        <div className="max-h-[420px] overflow-y-auto p-5 pt-4 scrollbar-thin">
          {grouped.length === 0 && (
            <p className="py-8 text-center text-xs text-[var(--muted)]">
              {query ? "No widgets match that search." : "No widgets are currently available to you."}
            </p>
          )}
          {grouped.map(([category, defs]) => (
            <section key={category} className="mb-4 last:mb-0">
              <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                {CATEGORY_LABELS[category] ?? category}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {defs.map((def) => {
                  const added = present.has(def.id);
                  return (
                    <button
                      key={def.id}
                      disabled={added}
                      onClick={() => {
                        addWidget(def.id);
                        onClose();
                      }}
                      className={`group relative rounded-xl border p-3 text-left transition-all ${
                        added
                          ? "cursor-default border-[var(--border)] bg-[var(--surface)] opacity-60"
                          : "cursor-pointer border-[var(--border)] bg-[var(--panel)] hover:border-[var(--accent)] hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-bold text-[var(--text)]">{def.name}</span>
                        {added ? (
                          <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-500">
                            <Check size={11} /> Added
                          </span>
                        ) : (
                          <Plus size={12} className="text-[var(--muted)] transition-colors group-hover:text-[var(--accent)]" />
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-[10.5px] leading-4 text-[var(--muted)]">{def.description}</p>
                      {isBeta(def.id) && (
                        <span className="absolute right-2 top-2 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400">
                          BETA
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </Modal>
  );
}
