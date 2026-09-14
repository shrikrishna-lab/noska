/**
 * WidgetPicker — "Add widget" dialog: the registry filtered by server
 * availability, grouped by category tabs, with search, URL smart detection, and 1-click additions.
 */
import React, { useMemo, useState } from "react";
import { Check, LayoutGrid, Plus, Search, Sparkles, Link as LinkIcon, Compass } from "lucide-react";
import { Modal, ModalHeader } from "../../../components/ui";
import { useWidgetEngine } from "../engine";
import { getAllWidgetDefinitions, WIDGET_CATEGORIES } from "../registry";
import { SmartPreviewResolver } from "../providers/smartPreview";
import type { WidgetCategory, WidgetDefinition } from "../types";

const CATEGORY_LABELS: Record<string, string> = {
  all: "All Widgets",
  productivity: "Productivity",
  gamified: "Gamified",
  ai: "AI & Neural",
  analytics: "Analytics & KPI",
  project: "Projects",
  integrations: "Connected",
  workspace: "Workspace",
  automation: "Automation",
  notifications: "Notifications",
  system: "System & Ambient",
  embed: "Web Embed",
};

export function WidgetPicker({
  open,
  onClose,
  onOpenAIDashboard,
}: {
  open: boolean;
  onClose: () => void;
  onOpenAIDashboard?: () => void;
}) {
  const { layout, addWidget, isAvailable, isBeta } = useWidgetEngine();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [smartPreview, setSmartPreview] = useState<ReturnType<typeof SmartPreviewResolver.resolve> | null>(null);

  const present = useMemo(() => new Set(layout.widgets.map((w) => w.widgetId)), [layout.widgets]);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUrlInput(val);
    if (val.trim().startsWith("http://") || val.trim().startsWith("https://")) {
      const resolved = SmartPreviewResolver.resolve(val.trim());
      setSmartPreview(resolved);
    } else {
      setSmartPreview(null);
    }
  };

  const handleAddSmartUrl = () => {
    if (!smartPreview) return;
    if (smartPreview.suggestedWidgetId) {
      addWidget(smartPreview.suggestedWidgetId);
    } else {
      addWidget("external-embed");
    }
    onClose();
  };

  const filteredDefs = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = getAllWidgetDefinitions();

    return all.filter((def) => {
      if (selectedCategory !== "all" && def.category !== selectedCategory) return false;
      if (!isAvailable(def.id)) return false;
      if (q && !`${def.name} ${def.description} ${def.category}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [selectedCategory, query, isAvailable]);

  if (!open) return null;

  return (
    <Modal onClose={onClose}>
      <div className="w-[680px] max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-2xl font-sans">
        <ModalHeader icon={LayoutGrid} title="Add a Widget to Dashboard" onClose={onClose} />

        {/* AI Dashboard Banner & Smart URL Detector */}
        <div className="px-5 pt-1 pb-3 space-y-2.5">
          {onOpenAIDashboard && (
            <div
              onClick={() => {
                onClose();
                onOpenAIDashboard();
              }}
              className="flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-pink-500/10 border border-purple-500/20 hover:border-purple-500/40 cursor-pointer transition group"
            >
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-2xs">
                  <Sparkles size={13} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                    <span>Generate AI Dashboard</span>
                    <span className="text-[9px] font-bold bg-purple-500/20 text-purple-600 dark:text-purple-300 px-1.5 py-0.2 rounded-full uppercase">
                      Instant
                    </span>
                  </h4>
                  <p className="text-[10.5px] text-neutral-500 dark:text-neutral-400">
                    Describe your project or role and let AI arrange optimized widgets
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 group-hover:translate-x-0.5 transition-transform">
                Generate →
              </span>
            </div>
          )}

          {/* Search Bar & Smart URL Input */}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
              <Search size={14} className="text-[var(--muted)]" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search widgets by name, category or capability…"
                className="w-full bg-transparent text-xs text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
              />
            </div>

            <div className="flex-1 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
              <LinkIcon size={14} className="text-[var(--muted)]" />
              <input
                value={urlInput}
                onChange={handleUrlChange}
                placeholder="Paste URL (GitHub, Figma, Sheet, Drive)…"
                className="w-full bg-transparent text-xs text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
              />
              {smartPreview && (
                <button
                  onClick={handleAddSmartUrl}
                  className="px-2 py-0.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-[10.5px] font-bold shrink-0 transition"
                >
                  Add {smartPreview.suggestedRepresentation === "native_widget" ? "Widget" : "Embed"}
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {["all", ...WIDGET_CATEGORIES].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-2xs"
                    : "bg-black/[0.03] dark:bg-white/[0.04] text-neutral-600 dark:text-neutral-400 hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
                }`}
              >
                {CATEGORY_LABELS[cat] ?? cat}
              </button>
            ))}
          </div>
        </div>

        {/* Widgets Grid */}
        <div className="max-h-[380px] overflow-y-auto px-5 pb-5 pt-1 scrollbar-thin">
          {filteredDefs.length === 0 ? (
            <p className="py-12 text-center text-xs text-[var(--muted)]">
              {query ? `No widgets found matching "${query}".` : "No widgets available in this category."}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {filteredDefs.map((def) => {
                const added = present.has(def.id);
                return (
                  <button
                    key={def.id}
                    disabled={added}
                    onClick={() => {
                      addWidget(def.id);
                      onClose();
                    }}
                    className={`group relative rounded-xl border p-3.5 text-left transition-all ${
                      added
                        ? "cursor-default border-[var(--border)] bg-[var(--surface)] opacity-60"
                        : "cursor-pointer border-[var(--border)] bg-[var(--panel)] hover:border-[var(--accent)] hover:shadow-md active:scale-[0.99]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-bold text-[var(--text)]">{def.name}</span>
                      {added ? (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-500">
                          <Check size={11} /> Added
                        </span>
                      ) : (
                        <Plus size={13} className="text-[var(--muted)] transition-colors group-hover:text-[var(--accent)]" />
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[var(--muted)]">{def.description}</p>
                    <div className="mt-2.5 flex items-center gap-1.5">
                      <span className="rounded-md bg-black/[0.03] dark:bg-white/[0.05] px-1.5 py-0.5 text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
                        {def.category}
                      </span>
                      {def.widgetClass && def.widgetClass !== "native" && (
                        <span className="rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                          {def.widgetClass}
                        </span>
                      )}
                      {isBeta(def.id) && (
                        <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400">
                          BETA
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

