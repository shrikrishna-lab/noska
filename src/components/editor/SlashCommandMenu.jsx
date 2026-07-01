import React, { useState, useRef, useEffect, useCallback, useMemo, useLayoutEffect, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ChevronRight, Star } from "lucide-react";
import { getFilteredCommands, getAllCommands } from "../../core/commands/CommandRegistry";
import * as Icons from "lucide-react";
import SlashCommandPreviewPanel from "./SlashCommandPreviewPanel";

const CATEGORIES_ORDER = [
  "Suggested", "Basic blocks", "Media", "Layout",
  "Database", "Advanced blocks", "Inline", "Embeds"
];

const CATEGORY_ICONS = {
  "Basic blocks": "Type",
  "Media": "Image",
  "Layout": "Columns2",
  "Database": "Database",
  "Advanced blocks": "Sparkles",
  "Inline": "Bold",
  "Embeds": "Globe",
  "Suggested": "Star",
};

const CATEGORY_LABELS = {
  "Basic blocks": "Basic",
  "Media": "Media",
  "Layout": "Layout",
  "Database": "Database",
  "Advanced blocks": "Advanced",
  "Inline": "Inline",
  "Embeds": "Embeds",
  "Suggested": "Suggested",
};

const SUGGESTED_IDS = ["text", "h1", "h2", "h3", "bullet", "todo", "image", "divider", "toggle", "callout", "database-inline", "code"];

function RenderIcon({ iconName, size = 14, className = "" }) {
  const IconComponent = Icons[iconName];
  if (!IconComponent) return null;
  return <IconComponent size={size} className={`shrink-0 ${className}`} />;
}

function getFavorites() {
  try { return JSON.parse(localStorage.getItem("slash-favorites") || "[]"); } catch { return []; }
}

function addFavorite(id) {
  const favs = getFavorites().filter(f => f !== id);
  favs.unshift(id);
  localStorage.setItem("slash-favorites", JSON.stringify(favs.slice(0, 6)));
}

const MENU_WIDTH = 352;

export default forwardRef(function SlashCommandMenu({ open, onClose, onSelect, position, initialSearch = "" }, menuRef) {
  const [search, setSearch] = useState(initialSearch);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [previewCmd, setPreviewCmd] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [viewportWidth, setViewportWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  const listRef = useRef(null);
  const searchRef = useRef(null);
  const innerMenuRef = useRef(null);

  const favorites = useMemo(() => getFavorites(), [open]);

  // Viewport width tracking for responsive panel hide
  useEffect(() => {
    const handler = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // Compute panel side based on viewport collision
  const panelSide = useMemo(() => {
    if (!position) return "right";
    const PANEL_WIDTH = 260;
    const GAP = 8;
    const menuRight = position.left + MENU_WIDTH;
    const spaceRight = window.innerWidth - menuRight;
    if (spaceRight >= PANEL_WIDTH + GAP) return "right";
    return "left";
  }, [position, viewportWidth]);

  const panelVisible = !!previewCmd && viewportWidth >= 500;

  const wrappedOnClose = useCallback(() => {
    searchRef.current?.blur();
    onClose?.();
  }, [onClose]);

  const handleSelect = useCallback((type) => {
    searchRef.current?.blur();
    onSelect?.(type);
  }, [onSelect]);

  const groups = useMemo(() => {
    const all = getFilteredCommands(search);
    const byCategory = {};
    CATEGORIES_ORDER.forEach(cat => { byCategory[cat] = []; });

    all.forEach(cmd => {
      if (cmd.category === "Page actions") return;
      if (cmd.hideFromSlash) return; // formatting/color commands live in the selection toolbar, not the slash menu
      const cat = !search ? cmd.category || "Basic blocks" : cmd.category;
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(cmd);
    });

    let result = CATEGORIES_ORDER
      .map(name => ({ name, items: byCategory[name] || [], icon: CATEGORY_ICONS[name] }))
      .filter(g => g.items.length > 0);

    if (!search) {
      const favItems = favorites.map(id => getAllCommands().find(c => c.id === id)).filter(Boolean);
      if (favItems.length > 0) {
        result = [{ name: "Favorites", items: favItems, icon: "Star" }, ...result];
      }
      const suggested = all.filter(cmd => SUGGESTED_IDS.includes(cmd.id));
      if (suggested.length > 0) {
        result = result.filter(g => g.name !== "Suggested");
        result = [{ name: "Suggested", items: suggested, icon: "Star" }, ...result];
      }
    }

    if (activeCategory && !search) {
      result = result.filter(g => g.name === activeCategory);
    }

    return result;
  }, [search, activeCategory, favorites]);

  const flatItems = useMemo(() => {
    const result = [];
    for (const group of groups) {
      result.push({ _isGroup: true, _groupName: group.name, _groupIcon: group.icon });
      for (const item of group.items) {
        result.push(item);
      }
    }
    return result;
  }, [groups]);

  // Auto-highlight first non-group item on open.
  // Focus the search box ONLY on the closed→open transition — never on
  // subsequent initialSearch changes, so clicking back into the block editor
  // (or continuing to type there) doesn't keep stealing focus into the menu.
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open) {
      const justOpened = !wasOpenRef.current;
      wasOpenRef.current = true;
      setSearch(initialSearch);
      setActiveCategory(null);
      // Find first non-group item index
      const firstItemIdx = flatItems.findIndex(item => !item._isGroup);
      setHighlightedIndex(firstItemIdx >= 0 ? firstItemIdx : -1);
      if (justOpened) {
        setTimeout(() => searchRef.current?.focus(), 50);
      }
    } else {
      wasOpenRef.current = false;
      setPreviewCmd(null);
    }
  }, [open, initialSearch]);

  // Re-auto-highlight when flatItems changes (e.g. search or category change)
  useEffect(() => {
    if (open && highlightedIndex === -1) {
      const firstItemIdx = flatItems.findIndex(item => !item._isGroup);
      if (firstItemIdx >= 0) setHighlightedIndex(firstItemIdx);
    }
  }, [flatItems, open]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex(i => {
        let next = i + 1;
        while (next < flatItems.length && flatItems[next]._isGroup) next++;
        return Math.min(next, flatItems.length - 1);
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(i => {
        let prev = i - 1;
        while (prev >= 0 && flatItems[prev]._isGroup) prev--;
        return Math.max(prev, 0);
      });
    } else if (e.key === "ArrowRight" && !search) {
      e.preventDefault();
      const idx = groups.findIndex(g => g.name === activeCategory);
      if (idx < groups.length - 1) setActiveCategory(groups[idx + 1].name);
      setHighlightedIndex(-1);
    } else if (e.key === "ArrowLeft" && !search) {
      e.preventDefault();
      const idx = groups.findIndex(g => g.name === activeCategory);
      if (idx > 0) setActiveCategory(groups[idx - 1].name);
      else setActiveCategory(null);
      setHighlightedIndex(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && flatItems[highlightedIndex] && !flatItems[highlightedIndex]._isGroup) {
        addFavorite(flatItems[highlightedIndex].id);
        handleSelect(flatItems[highlightedIndex].id);
        wrappedOnClose();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      wrappedOnClose();
    }
  }, [flatItems, highlightedIndex, handleSelect, wrappedOnClose, groups, activeCategory, search]);

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-slash-item]");
      const itemIndex = flatItems.slice(0, highlightedIndex + 1).filter(i => !i._isGroup).length - 1;
      items[itemIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex, flatItems]);

  useEffect(() => {
    if (highlightedIndex >= 0 && flatItems[highlightedIndex] && !flatItems[highlightedIndex]._isGroup) {
      setPreviewCmd(flatItems[highlightedIndex]);
    } else {
      setPreviewCmd(null);
    }
  }, [highlightedIndex, flatItems]);

  if (!open && flatItems.length === 0) return null;

  const visibleCategories = groups.map(g => ({ name: g.name, icon: g.icon }));
  const activeCatName = activeCategory || (visibleCategories[0]?.name || null);

  return (
    <AnimatePresence>
      {open && (
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: position?.top ?? 0,
            left: position?.left ?? 0,
            zIndex: 130,
          }}
        >
          {/* Offscreen live region for screen readers */}
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {previewCmd ? `${previewCmd.title} — ${previewCmd.preview?.description || previewCmd.description || ""}` : ""}
          </div>

          {/* Main Menu */}
          <motion.div
            ref={innerMenuRef}
            initial={{ opacity: 0, scale: 0.95, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 3, transition: { duration: 0.08, ease: [0.7, 0, 0.84, 0] } }}
            transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: MENU_WIDTH }}
            className="flex overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--elevated)]/95 backdrop-blur-md shadow-[var(--shadow-floating)] max-h-[460px]"
            role="dialog" aria-label="Block type selector"
          >
            {/* Category sidebar */}
            {!search && (
              <div className="flex flex-col gap-0.5 border-r border-[var(--border)] bg-[var(--surface)] p-1.5 w-9 shrink-0">
                {visibleCategories.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => setActiveCategory(activeCatName === cat.name ? null : cat.name)}
                    className={`grid h-6 w-6 place-items-center rounded transition cursor-pointer ${
                      activeCatName === cat.name ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
                    }`}
                    title={cat.name}
                  >
                    <RenderIcon iconName={CATEGORY_ICONS[cat.name] || cat.icon} size={13} />
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-col flex-1 min-w-0">
              {/* Search */}
              <div className="relative border-b border-[var(--border)]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setHighlightedIndex(-1); setActiveCategory(null); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search or type a command..."
                  className="w-full bg-transparent py-[10px] pl-[32px] pr-3 text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={open}
                  aria-haspopup="listbox"
                  aria-controls="slash-listbox"
                  aria-activedescendant={highlightedIndex >= 0 && flatItems[highlightedIndex] && !flatItems[highlightedIndex]._isGroup ? `slash-item-${flatItems[highlightedIndex].id}` : undefined}
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)]">
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Results */}
              <div ref={listRef} className="overflow-y-auto scrollbar-none py-1" role="listbox" id="slash-listbox" style={{ maxHeight: 320 }}>
                {flatItems.length === 0 ? (
                  <div className="px-3 py-8 text-center text-xs text-[var(--muted)]">No blocks found</div>
                ) : (
                  flatItems.map((item, idx) => {
                    if (item._isGroup) {
                      return (
                        <div key={`group-${item._groupName}`} className="flex items-center gap-1.5 px-3 py-1.5 border-b border-[var(--border)] mb-1" role="presentation">
                          <RenderIcon iconName={item._groupIcon} size={11} className="text-[var(--muted)]" />
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--muted)]" style={{ letterSpacing: "0.05em" }}>
                            {CATEGORY_LABELS[item._groupName] || item._groupName}
                          </span>
                        </div>
                      );
                    }

                    const isSelected = highlightedIndex === idx;
                    const isFav = favorites.includes(item.id);

                    return (
                      <button
                        key={`${item.id}-${idx}`}
                        data-slash-item
                        id={`slash-item-${item.id}`}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => { addFavorite(item.id); handleSelect(item.id); wrappedOnClose(); }}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors duration-75 cursor-pointer ${
                          isSelected ? "bg-[var(--accent)]/8" : ""
                        }`}
                      >
                        <div className={`flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${
                          isSelected ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "bg-[var(--surface)] text-[var(--secondary)]"
                        }`}>
                          <RenderIcon iconName={item.icon} size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="truncate text-[13px] font-medium flex items-center gap-1.5">
                            {item.title}
                            {isFav && !search && <Star size={9} className="text-[var(--muted)] shrink-0" />}
                          </div>
                          {item.description && (
                            <div className="truncate text-[11px] text-[var(--muted)] mt-0.5">
                              {item.description}
                            </div>
                          )}
                        </div>
                        {item.shortcut && (
                          <span className="shrink-0 text-[10px] text-[var(--muted)] px-1.5 py-0.5 rounded border border-[var(--border)]" style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas", background: "var(--surface)" }}>
                            {item.shortcut}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-[var(--border)] bg-[var(--surface)] px-3 py-2 flex items-center justify-between text-[10px] text-[var(--muted)]">
                <div className="flex items-center gap-3">
                  <span><kbd className="px-1 rounded bg-[var(--hover)] border border-[var(--border)] font-mono">↑↓</kbd> Navigate</span>
                  <span><kbd className="px-1 rounded bg-[var(--hover)] border border-[var(--border)] font-mono">↵</kbd> Select</span>
                  {!search && <span><kbd className="px-1 rounded bg-[var(--hover)] border border-[var(--border)] font-mono">←→</kbd> Category</span>}
                </div>
                <kbd className="px-1 rounded bg-[var(--hover)] border border-[var(--border)] font-mono">esc</kbd>
              </div>
            </div>
          </motion.div>

          {/* Side Preview Panel */}
          <SlashCommandPreviewPanel
            command={previewCmd}
            side={panelSide}
            visible={panelVisible}
            menuWidth={MENU_WIDTH}
          />
        </div>
      )}
    </AnimatePresence>
  );
});
