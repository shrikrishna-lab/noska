import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, ChevronRight, ChevronLeft, Link2, Copy, Move, Trash2, FileEdit, Sparkles, Check,
  Type, Heading1, Heading2, Heading3, Heading4, List, ListChecks, CheckSquare, Quote, MessageSquare, Code,
  Palette, MessageCircle, Play, Square, Brain
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { TEXT_COLORS, BG_COLORS } from "../../utils/colors";
import type { Block } from "../../../types/blocks";
import type { Page } from "../../lib/supabaseService";

/** Single flexible shape covering every item type this menu's
 * `getVisibleItems()` can produce (main actions, block-type entries,
 * color entries, move-to-page entries) — matches the actual runtime
 * shape (each branch only ever populates the subset of fields relevant
 * to it) rather than a discriminated union, since the render code below
 * already branches on `activeSubmenu`/presence of `colorInfo`/
 * `pageInfo` rather than a `kind` tag. */
interface MenuItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  submenu?: boolean;
  section?: string;
  group?: number;
  danger?: boolean;
  shortcut?: string;
  badge?: string;
  colorInfo?: { name: string; value: string; bg: string };
  pageInfo?: Page;
}

const blockTypes: MenuItem[] = [
  { id: "text", icon: Type, label: "Text" },
  { id: "h1", icon: Heading1, label: "Heading 1" },
  { id: "h2", icon: Heading2, label: "Heading 2" },
  { id: "h3", icon: Heading3, label: "Heading 3" },
  { id: "bullet", icon: List, label: "Bullet list" },
  { id: "number", icon: ListChecks, label: "Numbered list" },
  { id: "todo", icon: CheckSquare, label: "To-do" },
  { id: "toggle", icon: ChevronRight, label: "Toggle list" },
  { id: "quote", icon: Quote, label: "Quote" },
  { id: "callout", icon: MessageSquare, label: "Callout" },
  { id: "code", icon: Code, label: "Code" }
];

function darken(hex: string, amount: number): string {
  if (hex.startsWith('var(') || hex === 'transparent') return hex;
  const num = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0xff) - amount);
  const b = Math.max(0, (num & 0xff) - amount);
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

interface BlockContextMenuProps {
  open: boolean;
  onClose: () => void;
  // Accepted but not read anywhere in this component's body — Editor.tsx
  // passes the current block in on every render (line ~2338) yet nothing
  // here ever touches `block`. Pre-existing dead prop, preserved as-is
  // per migration scope (type-in-place only, no behavior change).
  block?: Block;
  onAction?: (action: string, payload?: string) => void;
  lastEditedBy?: string;
  lastEditedAt?: string;
  pages?: Page[];
  onToast?: (message: string) => void;
}

export default function BlockContextMenu({
  open,
  onClose,
  block,
  onAction,
  lastEditedBy,
  lastEditedAt,
  pages = [],
  onToast
}: BlockContextMenuProps) {
  const [search, setSearch] = useState("");
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [colorTab, setColorTab] = useState("text");
  const [customColor, setCustomColor] = useState("#ffffff");
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Layout actions and groups matching Image 2
  const isReviewCard = Boolean((block as { review?: unknown } | undefined)?.review);
  const mainActions: MenuItem[] = [
    { id: "turn-into", icon: Type, label: "Turn into", submenu: true, section: "Text" },
    { id: "color", icon: Palette, label: "Color", submenu: true, section: "Text" },

    // Divider group 1
    { id: "copy-link", icon: Link2, label: "Copy link to block", shortcut: "Alt+⇧+L", group: 2 },
    { id: "duplicate", icon: Copy, label: "Duplicate", shortcut: "Ctrl+D", group: 2 },
    { id: "template", icon: Square, label: "Turn into template", group: 2 },
    { id: "copy-synced", icon: Copy, label: "Copy as synced block", group: 2 },
    { id: "move-to", icon: Move, label: "Move to", shortcut: "Ctrl+⇧+P", submenu: true, group: 2 },
    { id: "delete", icon: Trash2, label: "Delete", shortcut: "Del", group: 2, danger: true },

    // Divider group 2
    {
      id: isReviewCard ? "remove-from-review" : "add-to-review",
      icon: Brain,
      label: isReviewCard ? "Remove from review" : "Add to review",
      group: 3
    },
    { id: "comment", icon: MessageCircle, label: "Comment", shortcut: "Ctrl+⇧+M", group: 3 },
    { id: "suggest", icon: FileEdit, label: "Suggest edits", shortcut: "Ctrl+⇧+Alt+X", group: 3 },
    { id: "present", icon: Play, label: "Present from here", badge: "Beta", shortcut: "Ctrl+Alt+P", group: 3 },
    { id: "ask-ai", icon: Sparkles, label: "Ask AI", shortcut: "Ctrl+J", group: 3 }
  ];

  const fuzzyMatch = (query: string, text: string): boolean => {
    if (!query) return true;
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    let qi = 0;
    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
      if (t[ti] === q[qi]) qi++;
    }
    return qi === q.length;
  };

  const getVisibleItems = (): MenuItem[] => {
    if (activeSubmenu === "turn-into") {
      return blockTypes.filter(t => fuzzyMatch(search, t.label));
    }
    if (activeSubmenu === "color") {
      const colors = colorTab === "bg" ? BG_COLORS : TEXT_COLORS;
      return colors.map(c => ({
        id: `color-${c.name.toLowerCase()}`,
        label: c.name,
        colorInfo: { name: c.name, value: c.value, bg: c.name === (colorTab === "bg" ? "None" : "Default") ? "transparent" : darken(c.value, 90) }
      })).filter(item => fuzzyMatch(search, item.label));
    }
    if (activeSubmenu === "move-to") {
      return pages.filter(p => !p.trashed).map(p => ({ id: `move-to-page-${p.id}`, label: p.title || "Untitled", pageInfo: p })).filter(item => fuzzyMatch(search, item.label));
    }
    return mainActions.filter(a => fuzzyMatch(search, a.label));
  };

  const filtered = getVisibleItems();

  useEffect(() => {
    if (open) {
      setSearch("");
      setActiveSubmenu(null);
      setHighlightedIndex(-1);
      setColorTab("text");
      setShowCustomPicker(false);
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  const handleAction = (item: MenuItem) => {
    if (item.submenu) {
      setActiveSubmenu(item.id);
      setSearch("");
      setHighlightedIndex(-1);
      return;
    }

    if (activeSubmenu === "turn-into") {
      onAction?.("convert", item.id);
      onToast?.(`Block turned into ${item.label}`);
      onClose();
      return;
    }

    if (activeSubmenu === "color" && item.colorInfo) {
      const colName = item.colorInfo.name.toLowerCase();
      if (colorTab === "bg") {
        onAction?.("bgColor", colName === "none" ? undefined : colName);
        onToast?.(`Block background color set to ${item.colorInfo.name}`);
      } else {
        onAction?.("color", colName === "default" ? undefined : colName);
        onToast?.(`Block color updated to ${item.colorInfo.name}`);
      }
      onClose();
      return;
    }

    if (activeSubmenu === "move-to" && item.pageInfo) {
      onAction?.("move-to-page", item.pageInfo.id);
      onToast?.(`Block moved to page "${item.pageInfo.title || "Untitled"}"`);
      onClose();
      return;
    }

    if (item.id === "copy-link") {
      const slug = window.location.pathname.split('/').filter(Boolean)[0] || 'workspace';
      navigator.clipboard.writeText(`${window.location.origin}/${slug}/${pages[0]?.id || ""}`);
      onToast?.("Block deep link copied!");
    }

    onAction?.(item.id);
    onClose();
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && filtered[highlightedIndex]) {
        handleAction(filtered[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (activeSubmenu) {
        setActiveSubmenu(null);
        setSearch("");
        setHighlightedIndex(-1);
      } else {
        onClose();
      }
    }
  }, [filtered, highlightedIndex, activeSubmenu]);

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const el = listRef.current.children[highlightedIndex];
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  const formatTimeAgo = (ts?: string): string => {
    if (!ts) return "Today at 12:36 PM";
    const date = new Date(ts);
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " at " + date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -3 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
          style={{ width: 268 }}
          className="flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/95 backdrop-blur-xl shadow-[0_20px_45px_-12px_rgba(0,0,0,0.25)] z-[120] max-h-[480px]"
        >
          {/* Header Bar */}
          <div className="flex items-center border-b border-[var(--border)] px-2 py-1.5 bg-[var(--surface-3)]/60">
            {activeSubmenu && (
              <button
                onClick={() => {
                  setActiveSubmenu(null);
                  setSearch("");
                  setHighlightedIndex(-1);
                }}
                className="p-1 rounded-lg text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition cursor-pointer mr-1"
              >
                <ChevronLeft size={15} />
              </button>
            )}
            <span className="flex-1 text-[11px] font-semibold text-[var(--text-secondary)] pl-1">
              {activeSubmenu === "turn-into" ? "Turn block into..." : activeSubmenu === "color" ? "" : activeSubmenu === "move-to" ? "Move block to page..." : "Block actions"}
            </span>
          </div>

          {/* Color submenu header with tabs + custom picker */}
          {activeSubmenu === "color" && (
            <div className="border-b border-[var(--border)] px-2.5 py-2.5 flex flex-col gap-2">
              <div className="flex items-center gap-1 p-0.5 rounded-xl bg-[var(--surface-3)] border border-[var(--border)]">
                <button
                  onClick={() => setColorTab("text")}
                  className={`flex-1 py-1 text-[10px] font-semibold rounded-lg transition cursor-pointer ${
                    colorTab === "text" ? "bg-[var(--surface-2)] text-[var(--text)] shadow-xs" : "text-[var(--secondary)] hover:text-[var(--text)]"
                  }`}
                >
                  Text
                </button>
                <button
                  onClick={() => setColorTab("bg")}
                  className={`flex-1 py-1 text-[10px] font-semibold rounded-lg transition cursor-pointer ${
                    colorTab === "bg" ? "bg-[var(--surface-2)] text-[var(--text)] shadow-xs" : "text-[var(--secondary)] hover:text-[var(--text)]"
                  }`}
                >
                  Background
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="w-7 h-7 rounded-lg border border-[var(--border)] cursor-pointer p-0 bg-transparent shrink-0"
                />
                <button
                  onClick={() => {
                    const val = customColor;
                    if (colorTab === "bg") {
                      onAction?.("bgColor", val);
                      onToast?.(`Block background color set to custom`);
                    } else {
                      onAction?.("color", val);
                      onToast?.(`Block color set to custom`);
                    }
                    onClose();
                  }}
                  className="flex-1 py-1 px-2 text-[10px] font-semibold text-[var(--text)] bg-[var(--surface-3)] hover:bg-[var(--surface-4)] border border-[var(--border)] rounded-lg transition cursor-pointer shadow-2xs"
                >
                  Apply custom color
                </button>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative border-b border-[var(--border)]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setHighlightedIndex(-1); }}
              onKeyDown={handleKeyDown}
              placeholder="Search actions..."
              className="w-full bg-transparent px-8 py-2 text-xs text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)] cursor-pointer">
                <X size={13} />
              </button>
            )}
          </div>

          {/* List Area */}
          <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-none py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-8 text-center text-xs text-[var(--muted)]">No actions found</div>
            ) : (
              filtered.map((item, idx) => {
                const isSelected = highlightedIndex === idx;

                // Group Section Header / Divider Rendering
                const showHeader = !activeSubmenu && item.section && (idx === 0 || mainActions[idx - 1]?.section !== item.section);
                const showDivider = !activeSubmenu && item.group && idx > 0 && mainActions[idx - 1]?.group !== item.group;

                return (
                  <React.Fragment key={item.id}>
                    {showHeader && (
                      <div className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--border)] mb-1">
                        {item.section}
                      </div>
                    )}
                    {showDivider && (
                      <div className="my-1 border-t border-[var(--border)]" />
                    )}

                    <button
                      onClick={() => handleAction(item)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                        item.danger ? "text-[var(--danger)] hover:bg-[var(--danger)]/10" : "text-[var(--text)]"
                      } ${isSelected ? "bg-[var(--hover)]" : ""}`}
                    >
                      {activeSubmenu === "color" && item.colorInfo ? (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[var(--border)]" style={{ backgroundColor: item.colorInfo.bg }}>
                          <span style={{ color: item.colorInfo.value }} className="text-[10px] font-bold">T</span>
                        </span>
                      ) : activeSubmenu === "move-to" ? (
                        <span className="text-sm">📄</span>
                      ) : (
                        item.icon && <item.icon size={13} className={`shrink-0 ${item.danger ? "text-[var(--danger)]" : "text-[var(--secondary)]"}`} />
                      )}

                      <span className="flex-1 truncate">{item.label}</span>

                      {item.badge && (
                        <span className="rounded bg-[var(--accent)]/10 px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-[var(--accent)] mr-1">
                          {item.badge}
                        </span>
                      )}

                      {item.shortcut && (
                        <span className="text-[9px] text-[var(--muted)] font-mono">{item.shortcut}</span>
                      )}
                      {item.submenu && (
                        <ChevronRight size={12} className="text-[var(--muted)] font-bold" />
                      )}
                    </button>
                  </React.Fragment>
                );
              })
            )}
          </div>

          {/* Fixed Footer */}
          <div className="border-t border-[var(--border)] bg-[var(--surface)] px-3 py-2 flex flex-col gap-0.5 text-[10px] text-[var(--muted)]">
            <div className="truncate">Last edited by <span className="text-[var(--secondary)] font-medium">{lastEditedBy || "Workspace User"}</span></div>
            <div>{formatTimeAgo(lastEditedAt)}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
