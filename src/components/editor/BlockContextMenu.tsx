import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import {
  Search, X, ChevronRight, ChevronLeft, Link2, Copy, Move, Trash2, FileEdit, Sparkles, Check,
  Type, Heading1, Heading2, Heading3, Heading4, List, ListChecks, CheckSquare, Quote, MessageSquare, Code,
  Palette, MessageCircle, Play, Square, Brain, GripVertical
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { TEXT_COLORS, BG_COLORS } from "../../utils/colors";
import type { Block } from "../../../types/blocks";
import type { Page } from "../../lib/supabaseService";
import { buildPageLink } from "../../lib/share/origin";

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
  const dragControls = useDragControls();
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
      // Send the hex, not the name. renderBlockEditor applies block.color /
      // block.bgColor straight into a style object, and `color: "brown"` is not
      // valid CSS — the browser dropped the declaration and the menu looked
      // like it had done nothing. colorInfo.value is the palette hex.
      if (colorTab === "bg") {
        onAction?.("bgColor", colName === "none" ? undefined : item.colorInfo.value);
        onToast?.(`Block background color set to ${item.colorInfo.name}`);
      } else {
        onAction?.("color", colName === "default" ? undefined : item.colorInfo.value);
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
      navigator.clipboard.writeText(buildPageLink(slug, pages[0]?.id || ""));
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

  if (!open) return null;

  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0}
      style={{ width: 280 }}
      className="flex flex-col overflow-hidden rounded-[18px] border border-black/[0.08] dark:border-white/[0.12] bg-white/98 dark:bg-[#1a1b20]/98 backdrop-blur-3xl shadow-[0_24px_56px_-8px_rgba(0,0,0,0.28),0_8px_20px_-4px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_28px_64px_-10px_rgba(0,0,0,0.85),0_10px_24px_-4px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.12)] max-h-[500px] select-none text-[var(--text)] font-sans"
    >
      {/* Header Bar - Draggable Handle */}
      <div
        onPointerDown={(e) => {
          if (!(e.target as HTMLElement).closest("button")) {
            dragControls.start(e);
          }
        }}
        className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] px-3.5 py-2.5 bg-black/[0.015] dark:bg-white/[0.02] cursor-grab active:cursor-grabbing touch-none select-none"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {activeSubmenu && (
            <button
              onClick={() => {
                setActiveSubmenu(null);
                setSearch("");
                setHighlightedIndex(-1);
              }}
              className="w-5 h-5 rounded-md flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer mr-0.5"
            >
              <ChevronLeft size={13} strokeWidth={2.5} />
            </button>
          )}
          <span className="text-[12px] font-semibold text-neutral-800 dark:text-neutral-200 tracking-tight truncate flex items-center gap-1.5">
            {!activeSubmenu && (
              <span
                className="cursor-grab active:cursor-grabbing text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-0.5 -ml-1 rounded transition-colors flex items-center"
                title="Drag to reposition menu"
              >
                <GripVertical size={13} className="shrink-0" />
              </span>
            )}
            <span className="cursor-grab active:cursor-grabbing">
              {activeSubmenu === "turn-into" ? "Turn block into..." : activeSubmenu === "color" ? "Block Colors" : activeSubmenu === "move-to" ? "Move block to page..." : "Block actions"}
            </span>
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-5 h-5 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
          title="Close (Esc)"
          aria-label="Close"
        >
          <X size={11} strokeWidth={2.5} />
        </button>
      </div>

      {/* Color submenu header with tabs + custom picker */}
      {activeSubmenu === "color" && (
        <div className="border-b border-black/[0.06] dark:border-white/[0.08] p-2.5 flex flex-col gap-2 bg-black/[0.015] dark:bg-white/[0.02]">
          <div className="flex items-center gap-1 p-0.5 rounded-[10px] bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.06]">
            <button
              onClick={() => setColorTab("text")}
              className={`flex-1 py-1 text-[10px] font-semibold rounded-[8px] transition cursor-pointer ${
                colorTab === "text"
                  ? "bg-white dark:bg-[#282a32] text-neutral-900 dark:text-white shadow-xs"
                  : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white"
              }`}
            >
              Text
            </button>
            <button
              onClick={() => setColorTab("bg")}
              className={`flex-1 py-1 text-[10px] font-semibold rounded-[8px] transition cursor-pointer ${
                colorTab === "bg"
                  ? "bg-white dark:bg-[#282a32] text-neutral-900 dark:text-white shadow-xs"
                  : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white"
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
              className="w-7 h-7 rounded-lg border border-black/[0.08] dark:border-white/[0.12] cursor-pointer p-0 bg-transparent shrink-0"
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
              className="flex-1 py-1 px-2 text-[10.5px] font-semibold text-neutral-800 dark:text-neutral-200 bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] border border-black/[0.06] dark:border-white/[0.08] rounded-lg transition cursor-pointer shadow-2xs"
            >
              Apply custom color
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="p-2 border-b border-black/[0.05] dark:border-white/[0.06]">
        <div className="relative flex items-center w-full px-2.5 py-1.5 rounded-[10px] bg-black/[0.035] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08] transition-all focus-within:ring-2 focus-within:ring-sky-500/30 focus-within:bg-white dark:focus-within:bg-[#202228] focus-within:border-sky-500/40">
          <Search size={13} className="text-neutral-400 dark:text-neutral-500 shrink-0" strokeWidth={2.2} />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setHighlightedIndex(-1); }}
            onKeyDown={handleKeyDown}
            placeholder="Search actions..."
            className="w-full bg-transparent px-1.5 text-[12px] text-neutral-900 dark:text-white outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-500 font-normal leading-tight"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer">
              <X size={11} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {/* List Area */}
      <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-none py-1 px-1.5 space-y-0.5">
        {filtered.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-neutral-400">No actions found</div>
        ) : (
          filtered.map((item, idx) => {
            const isSelected = highlightedIndex === idx;

            // Group Section Header / Divider Rendering
            const showHeader = !activeSubmenu && item.section && (idx === 0 || mainActions[idx - 1]?.section !== item.section);
            const showDivider = !activeSubmenu && item.group && idx > 0 && mainActions[idx - 1]?.group !== item.group;

            return (
              <React.Fragment key={item.id}>
                {showHeader && (
                  <div className="px-2.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 select-none">
                    {item.section}
                  </div>
                )}
                {showDivider && (
                  <div className="my-1 mx-2 h-[1px] bg-black/[0.05] dark:border-white/[0.07] bg-black/[0.05] dark:bg-white/[0.07]" />
                )}

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAction(item)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`group flex w-full items-center gap-2.5 px-2.5 py-1.5 rounded-[10px] text-left text-[12px] font-medium transition-all duration-150 cursor-pointer select-none ${
                    item.danger
                      ? isSelected
                        ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                        : "text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                      : isSelected
                        ? "bg-black/[0.05] dark:bg-white/[0.09] text-neutral-900 dark:text-white shadow-2xs"
                        : "text-neutral-700 dark:text-neutral-300 hover:bg-black/[0.035] dark:hover:bg-white/[0.06] hover:text-neutral-900 dark:hover:text-white"
                  }`}
                >
                  {activeSubmenu === "color" && item.colorInfo ? (
                    <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border border-black/10 dark:border-white/15" style={{ backgroundColor: item.colorInfo.bg }}>
                      <span style={{ color: item.colorInfo.value }} className="text-[9.5px] font-bold">T</span>
                    </span>
                  ) : activeSubmenu === "move-to" ? (
                    <span className="text-sm">📄</span>
                  ) : (
                    item.icon && <item.icon size={14} strokeWidth={2} className={`shrink-0 ${item.danger ? "text-rose-500" : "text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-700 dark:group-hover:text-neutral-200"}`} />
                  )}

                  <span className="flex-1 truncate">{item.label}</span>

                  {item.badge && (
                    <span className="rounded bg-sky-500/15 text-sky-600 dark:text-sky-400 px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-wider mr-1">
                      {item.badge}
                    </span>
                  )}

                  {item.shortcut && (
                    <kbd className="ml-auto text-[9.5px] font-mono font-medium tracking-tight px-1.5 py-0.5 rounded-[5px] bg-black/[0.04] dark:bg-white/[0.08] text-neutral-400 dark:text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 border border-black/[0.05] dark:border-white/[0.08] shadow-2xs leading-none shrink-0">
                      {item.shortcut}
                    </kbd>
                  )}
                  {item.submenu && (
                    <ChevronRight size={13} strokeWidth={2.4} className="ml-auto text-neutral-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                  )}
                </motion.button>
              </React.Fragment>
            );
          })
        )}
      </div>

      {/* Fixed Footer */}
      <div className="border-t border-black/[0.06] dark:border-white/[0.08] bg-black/[0.015] dark:bg-white/[0.02] px-3.5 py-2 flex items-center justify-between text-[10px] text-neutral-400 dark:text-neutral-500 select-none">
        <div className="truncate">Last edited by <span className="text-neutral-600 dark:text-neutral-300 font-medium">{lastEditedBy || "Workspace User"}</span></div>
        <div className="shrink-0 ml-2">{formatTimeAgo(lastEditedAt)}</div>
      </div>
    </motion.div>
  );
}
