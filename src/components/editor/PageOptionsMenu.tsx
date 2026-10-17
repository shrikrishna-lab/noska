import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import {
  Link2, Copy, CopyPlus, Move, Trash2, Presentation, Wifi, Type, Maximize2,
  Palette, Lock, Sparkles, FileEdit, Languages, FileDown, Upload, Globe,
  BarChart3, History, Bell, Cable, Search, X, ChevronRight, ChevronLeft, Eye,
  FolderKanban, Check,
  type LucideIcon
} from "lucide-react";
import { executeCommand } from "../../core/commands/ActionExecutor";
import type { Page } from "../../lib/supabaseService";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { useNotificationPlatform } from "../../features/notifications/Provider";
import { loadPagePreference, savePagePreference } from "../../features/notifications/preferences";
import type { PageNotificationMode } from "../../features/notifications/types";

const fontOptions = [
  { id: "default", label: "Default", class: "font-sans", sample: "Ag" },
  { id: "serif", label: "Serif", class: "font-serif", sample: "Ag" },
  { id: "mono", label: "Mono", class: "font-mono", sample: "Ag" }
];

const PAGE_COLORS = [
  { id: "default", name: "System Adaptive", value: null, isLight: true },
  { id: "obsidian", name: "Obsidian Pitch", value: "#000000", isLight: false },
  { id: "midnight", name: "Midnight Indigo", value: "#141829", isLight: false },
  { id: "fjord", name: "Glacial Deep", value: "#0b253a", isLight: false },
  { id: "violet", name: "Velvet Violet", value: "#26153b", isLight: false },
  { id: "crimson", name: "Royal Wine", value: "#330e15", isLight: false },
  { id: "forest", name: "Kyoto Forest", value: "#122618", isLight: false },
  { id: "slate", name: "Smoked Slate", value: "#1e2229", isLight: false },
  { id: "ivory", name: "Warm Ivory", value: "#FAF7F2", isLight: true },
  { id: "glacier", name: "Glacier Ice", value: "#F0FAFF", isLight: true },
  { id: "sage", name: "Botanical Sage", value: "#F0F7F2", isLight: true },
  { id: "rose", name: "Dusty Rose", value: "#FFF0F3", isLight: true },
  { id: "sand", name: "Desert Sand", value: "#FFF8EB", isLight: true },
  { id: "lavender", name: "Dusk Lavender", value: "#F5F0FF", isLight: true },
  { id: "cotton", name: "Pure Cotton", value: "#FFFFFF", isLight: true },
  { id: "crema", name: "Espresso Crema", value: "#211611", isLight: false }
];

interface SubmenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
}

interface Submenu {
  title: string;
  items: SubmenuItem[];
}

const submenus: Record<string, Submenu> = {
  ai: {
    title: "AI Actions",
    items: [
      { id: "ai-summarize", label: "Summarize page", icon: Sparkles },
      { id: "ai-ask", label: "Ask AI about page", icon: Sparkles },
      { id: "ai-generate", label: "Generate ideas", icon: Sparkles }
    ]
  },
  translate: {
    title: "Translate to...",
    items: [
      { id: "lang-en", label: "English", icon: Languages },
      { id: "lang-es", label: "Spanish", icon: Languages },
      { id: "lang-fr", label: "French", icon: Languages },
      { id: "lang-de", label: "German", icon: Languages },
      { id: "lang-zh", label: "Chinese", icon: Languages },
      { id: "lang-ja", label: "Japanese", icon: Languages }
    ]
  },
  notify: {
    title: "Notify me",
    items: [
      { id: "notify-all", label: "All activity", icon: Bell },
      { id: "notify-mentions", label: "Mentions and replies", icon: Bell },
      { id: "notify-muted", label: "Muted", icon: Bell }
    ]
  },
  connections: {
    title: "Connections",
    items: [
      { id: "conn-drive", label: "Google Drive", icon: Cable },
      { id: "conn-github", label: "GitHub", icon: Cable },
      { id: "conn-slack", label: "Slack", icon: Cable },
      { id: "conn-figma", label: "Figma", icon: Cable }
    ]
  }
};

interface MainAction {
  id: string;
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  danger?: boolean;
  toggle?: boolean;
  value?: boolean;
  submenu?: boolean;
}

type MenuItem = MainAction | SubmenuItem;

interface PageOptionsMenuProps {
  open: boolean;
  onClose: () => void;
  page: Page;
  onAction?: (actionId: string) => void;
  wordCount?: number;
  lastEditedBy?: string;
  lastEditedAt?: string;
  onPagePatch?: (patch: Record<string, unknown>) => void;
  onToast?: (message: string) => void;
  onTrash?: (pageId: string) => void;
  onDuplicatePage?: () => void;
  onImport?: () => void;
  onExport?: () => void;
  onAnalytics?: () => void;
  onHistory?: () => void;
  onAskAI?: () => void;
}

const OWNER_ONLY_ACTION_IDS = new Set([
  "duplicate",
  "move-to",
  "move-to-workspace",
  "trash",
  "lock",
  "readonly",
  "customize",
  "wiki"
]);

function formatShortcut(shortcut?: string): string | null {
  if (!shortcut) return null;
  const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  if (isMac) {
    return shortcut
      .replace(/Ctrl\+/gi, "⌘")
      .replace(/Alt\+/gi, "⌥")
      .replace(/Shift\+/gi, "⇧");
  }
  return shortcut;
}

export default function PageOptionsMenu({
  open,
  onClose,
  page,
  onAction,
  wordCount,
  lastEditedBy,
  lastEditedAt,
  onPagePatch,
  onToast,
  onTrash,
  onDuplicatePage,
  onImport,
  onExport,
  onAnalytics,
  onHistory,
  onAskAI
}: PageOptionsMenuProps) {
  const { userId: notificationUserId } = useNotificationPlatform();
  const [{ workspaceRows, activeWorkspaceId }] = useWorkspace();
  const [notifyMode, setNotifyMode] = useState<PageNotificationMode | null>(null);
  const [notifyBusy, setNotifyBusy] = useState(false);
  const dragControls = useDragControls();

  useEffect(() => {
    let active = true;
    setNotifyMode(null);
    if (open && notificationUserId) {
      void loadPagePreference(notificationUserId, page.id)
        .then((mode) => {
          if (active) setNotifyMode(mode);
        })
        .catch(() => {
          if (active) onToast?.("Unable to load page notification settings.");
        });
    }
    return () => {
      active = false;
    };
  }, [open, notificationUserId, page.id, onToast]);

  const [search, setSearch] = useState("");
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const isShared = Boolean(page?.sharedRole);

  const mainActions: MainAction[] = [
    { id: "copy-link", icon: Link2, label: "Copy link", shortcut: "Ctrl+L" },
    { id: "copy-contents", icon: Copy, label: "Copy page contents", shortcut: "" },
    { id: "duplicate", icon: CopyPlus, label: "Duplicate", shortcut: "Ctrl+D" },
    { id: "move-to", icon: Move, label: "Move to", shortcut: "Ctrl+Shift+P" },
    ...(workspaceRows.length > 1
      ? [{ id: "move-to-workspace", icon: FolderKanban, label: "Move to workspace", shortcut: "", submenu: true }]
      : []),
    { id: "trash", icon: Trash2, label: "Move to Trash", shortcut: "", danger: true },
    { id: "present", icon: Presentation, label: "Present (Beta)", shortcut: "Ctrl+Alt+P" },
    { id: "offline", icon: Wifi, label: "Available offline", shortcut: "", toggle: true, value: page?.offline },
    { id: "small-text", icon: Type, label: "Small text", shortcut: "", toggle: true, value: page?.smallText },
    { id: "full-width", icon: Maximize2, label: "Full width", shortcut: "", toggle: true, value: page?.fullWidth },
    { id: "customize", icon: Palette, label: "Customize page", shortcut: "" },
    { id: "lock", icon: Lock, label: "Lock page", shortcut: "", toggle: true, value: page?.isLocked },
    { id: "readonly", icon: Eye, label: "Read-only", shortcut: "", toggle: true, value: page?.permission === "view" },
    { id: "ai", icon: Sparkles, label: "Use with AI", shortcut: "", submenu: true },
    { id: "suggest", icon: FileEdit, label: "Suggest edits", shortcut: "" },
    { id: "translate", icon: Languages, label: "Translate", shortcut: "", submenu: true },
    { id: "import", icon: Upload, label: "Import", shortcut: "" },
    { id: "export", icon: FileDown, label: "Export", shortcut: "" },
    { id: "wiki", icon: Globe, label: "Turn into wiki", shortcut: "" },
    { id: "analytics", icon: BarChart3, label: "Updates & analytics", shortcut: "" },
    { id: "history", icon: History, label: "Version history", shortcut: "" },
    {
      id: "notify",
      icon: Bell,
      label: `Notify me › ${
        notifyBusy
          ? "Saving…"
          : notifyMode === "muted"
          ? "Muted"
          : notifyMode === "mentions"
          ? "Mentions"
          : notifyMode === "all"
          ? "All activity"
          : "Loading…"
      }`,
      shortcut: "",
      submenu: true
    },
    { id: "connections", icon: Cable, label: "Connections › None", shortcut: "", submenu: true }
  ].filter((action) => !isShared || !OWNER_ONLY_ACTION_IDS.has(action.id));

  // Helper fuzzy matching
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

  // Determine actual items shown
  const getVisibleItems = (): MenuItem[] => {
    if (activeSubmenu === "move-to-workspace") {
      const currentWs = (page as Page & { workspaceId?: string | null }).workspaceId || null;
      return workspaceRows
        .map((row) => ({
          id: `movews-${row.id}`,
          label: `${row.name}${row.id === (currentWs || activeWorkspaceId) ? " ✓" : ""}`,
          icon: FolderKanban
        }))
        .filter((item) => fuzzyMatch(search, item.label));
    }
    if (activeSubmenu) {
      const sub = submenus[activeSubmenu];
      return sub
        ? sub.items
            .map((item) =>
              activeSubmenu === "notify"
                ? { ...item, active: item.id === `notify-${notifyMode}` }
                : item
            )
            .filter((item) => fuzzyMatch(search, item.label))
        : [];
    }
    return mainActions.filter((item) => fuzzyMatch(search, item.label));
  };

  const filtered = getVisibleItems();

  useEffect(() => {
    if (open) {
      setSearch("");
      setActiveSubmenu(null);
      setHighlightedIndex(-1);
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  const handleAction = (item: MenuItem) => {
    if ("submenu" in item && item.submenu) {
      setActiveSubmenu(item.id);
      setSearch("");
      setHighlightedIndex(-1);
      return;
    }

    if (item.id.startsWith("movews-")) {
      onAction?.(`move-to-workspace:${item.id.slice(7)}`);
      return;
    }

    if (item.id.startsWith("notify-")) {
      if (!notificationUserId || notifyBusy || !notifyMode) return;
      const mode = item.id.slice(7) as PageNotificationMode;
      const previous = notifyMode;
      setNotifyMode(mode);
      setNotifyBusy(true);
      void savePagePreference(notificationUserId, page.id, mode)
        .then(() => onToast?.("Page notification preference saved."))
        .catch(() => {
          setNotifyMode(previous);
          onToast?.("Could not save notification preference.");
        })
        .finally(() => setNotifyBusy(false));
      return;
    }

    const ctx = {
      page,
      onPagePatch,
      onToast,
      onClose,
      onTrash,
      onDuplicatePage,
      onImport,
      onExport,
      onAnalytics,
      onHistory,
      onAskAI
    };

    executeCommand(item.id, ctx);

    onAction?.(item.id);
    if (!("toggle" in item && item.toggle)) {
      onClose();
    }
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered, highlightedIndex, activeSubmenu]
  );

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const el = listRef.current.children[highlightedIndex];
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  const formatTimeAgo = (ts?: string): string => {
    if (!ts) return "";
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          drag
          dragControls={dragControls}
          dragListener={false}
          dragMomentum={false}
          dragElastic={0.06}
          initial={{ opacity: 0, scale: 0.94, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{
            opacity: 0,
            scale: 0.95,
            y: -6,
            transition: { duration: 0.16, ease: [0.32, 0, 0.67, 0] }
          }}
          transition={{ type: "spring", stiffness: 420, damping: 28, mass: 0.75 }}
          style={{ width: 320, transformOrigin: "top right", willChange: "transform, opacity" }}
          className="apple-liquid-glass flex flex-col overflow-hidden rounded-2xl z-[120] max-h-[min(600px,calc(100vh-32px))] select-none border border-black/10 dark:border-white/15 shadow-2xl"
        >
          {/* ─── Apple Header Bar & Drag Handle ─── */}
          <div
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).closest("button, input")) return;
              dragControls.start(e);
            }}
            className="flex flex-col px-3.5 pt-2 pb-2 border-b border-black/[0.05] dark:border-white/[0.08] cursor-grab active:cursor-grabbing select-none"
            title="Drag to reposition menu"
          >
            {/* Apple Floating Window Grab Capsule */}
            <div
              className="w-10 h-1 rounded-full bg-black/20 dark:bg-white/25 mx-auto mb-1.5 transition-colors group-hover:bg-black/30 dark:group-hover:bg-white/40 cursor-grab active:cursor-grabbing"
              title="Drag to reposition menu"
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                {activeSubmenu ? (
                  <button
                    onClick={() => {
                      setActiveSubmenu(null);
                      setSearch("");
                      setHighlightedIndex(-1);
                    }}
                    className="group -ml-1 flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#0066FF] dark:text-[#4791FF] hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
                  >
                    <ChevronLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
                    <span>Back</span>
                  </button>
                ) : (
                  <span className="text-[13px] font-semibold tracking-tight text-[var(--text)]">
                    Page options
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={onClose}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
                  title="Close (Esc)"
                >
                  <X size={13} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>

          {/* ─── Apple Search Pill Bar ─── */}
          <div className="px-3 pt-2.5 pb-2 border-b border-black/[0.05] dark:border-white/[0.08]">
            <div className="relative flex items-center bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] focus-within:bg-black/[0.06] dark:focus-within:bg-white/[0.09] focus-within:ring-2 focus-within:ring-[#0066FF]/35 rounded-xl px-2.5 py-1.5 transition-all">
              <Search size={13} className="text-[var(--muted)] shrink-0 mr-2" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setHighlightedIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                placeholder={activeSubmenu ? "Search submenu..." : "Search actions & settings..."}
                className="w-full bg-transparent text-xs text-[var(--text)] outline-none placeholder:text-[var(--muted)] font-normal"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="w-4 h-4 rounded-full bg-black/10 dark:bg-white/20 flex items-center justify-center text-[var(--text)] hover:scale-110 active:scale-90 transition cursor-pointer"
                >
                  <X size={10} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>

          {/* ─── Typography & Page Color Controls (Top Level Only) ─── */}
          {!activeSubmenu && !search && (
            <>
              {/* Apple Segmented Typography Control */}
              <div className="px-3 py-2.5 border-b border-black/[0.05] dark:border-white/[0.08] flex flex-col gap-1.5">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    Typography
                  </span>
                  <span className="text-[9.5px] text-[var(--muted)] capitalize">
                    {page?.fontStyle || "default"}
                  </span>
                </div>
                <div className="relative p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.06] grid grid-cols-3 gap-1">
                  {fontOptions.map((f) => {
                    const isActive = (page?.fontStyle || "default") === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => onPagePatch?.({ fontStyle: f.id })}
                        className={`relative z-10 flex flex-col items-center justify-center py-2 px-1 rounded-lg cursor-pointer transition-colors duration-150 select-none ${
                          isActive
                            ? "text-[var(--text)]"
                            : "text-[var(--muted)] hover:text-[var(--text)]"
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="active-font-pill"
                            className="absolute inset-0 bg-white dark:bg-[#20242C] shadow-[0_2px_8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.12)] rounded-lg -z-10"
                            transition={{ type: "spring", stiffness: 450, damping: 32 }}
                          />
                        )}
                        <span className={`text-[17px] font-semibold leading-none mb-1 ${f.class}`}>
                          {f.sample}
                        </span>
                        <span className="text-[9.5px] font-medium tracking-tight">{f.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Apple Curated Page Color Palette */}
              <div className="px-3 py-2.5 border-b border-black/[0.05] dark:border-white/[0.08] flex flex-col gap-2">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    Page Color
                  </span>
                  <span className="text-[9.5px] text-[var(--muted)]">
                    {page?.pageBg ? "Custom Mood" : "System Adaptive"}
                  </span>
                </div>
                <div className="grid grid-cols-8 gap-2 py-0.5 place-items-center">
                  {PAGE_COLORS.map((color) => {
                    const isSelected = (page?.pageBg ?? null) === color.value;
                    const isDefault = color.value === null;
                    return (
                      <motion.button
                        key={color.id}
                        whileHover={{ scale: 1.18 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => {
                          onPagePatch?.({ pageBg: color.value });
                          onToast?.(`Page color: ${color.name}`);
                        }}
                        className={`group relative h-6 w-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? "ring-2 ring-offset-2 ring-offset-[var(--surface-1)] ring-[#0066FF] dark:ring-[var(--accent)] shadow-sm"
                            : "hover:shadow-md"
                        }`}
                        style={{
                          background: isDefault
                            ? "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.9) 0%, rgba(225,235,245,0.7) 100%)"
                            : color.value!
                        }}
                        title={color.name}
                      >
                        {/* 0.5px subtle inner lighting rim */}
                        <div className="absolute inset-0 rounded-full border border-black/10 dark:border-white/15 pointer-events-none" />

                        {isDefault && !isSelected && (
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--muted)]/50" />
                        )}

                        {isSelected && (
                          <Check
                            size={11}
                            strokeWidth={3}
                            className={isDefault || color.isLight ? "text-neutral-900" : "text-white"}
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ─── Action Items List (Smooth Apple Menu Items) ─── */}
          <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-none py-1.5 px-1.5 space-y-0.5">
            {filtered.length === 0 ? (
              <div className="px-3 py-8 text-center text-xs text-[var(--muted)]">No actions found</div>
            ) : (
              filtered.map((item, idx) => {
                const isItemDanger = "danger" in item && item.danger;
                const isSelected = highlightedIndex === idx;

                return (
                  <motion.button
                    key={item.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAction(item)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`group flex w-full items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left text-xs transition-colors cursor-pointer select-none ${
                      isItemDanger
                        ? "text-red-500 hover:bg-red-500/10 active:bg-red-500/15"
                        : isSelected
                        ? "bg-black/[0.06] dark:bg-white/[0.09] text-[var(--text)]"
                        : "text-[var(--text)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isItemDanger
                          ? "text-red-500"
                          : "text-[var(--secondary)] group-hover:text-[var(--text)]"
                      }`}
                    >
                      <item.icon size={14} strokeWidth={2} />
                    </div>

                    <span className="flex-1 truncate font-medium text-[12px]">{item.label}</span>

                    {/* Apple iOS Spring Toggle */}
                    {"toggle" in item && item.toggle && (
                      <div
                        className={`relative inline-flex h-4.5 w-8 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ease-out ${
                          item.value
                            ? "bg-[#0066FF] shadow-[0_0_8px_rgba(0,102,255,0.35)]"
                            : "bg-black/15 dark:bg-white/20"
                        }`}
                      >
                        <motion.span
                          layout
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className={`block h-3.5 w-3.5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.25)] ${
                            item.value ? "translate-x-3.5" : "translate-x-0"
                          }`}
                        />
                      </div>
                    )}

                    {/* Apple Keycap Shortcut */}
                    {"shortcut" in item && item.shortcut && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/[0.06] text-[var(--muted)] tracking-wider">
                        {formatShortcut(item.shortcut)}
                      </span>
                    )}

                    {/* Apple Submenu Chevron */}
                    {"submenu" in item && item.submenu && (
                      <ChevronRight
                        size={13}
                        className="text-[var(--muted)] group-hover:translate-x-0.5 transition-transform"
                      />
                    )}
                  </motion.button>
                );
              })
            )}
          </div>

          {/* ─── Apple Inspector Footer ─── */}
          <div className="border-t border-black/[0.05] dark:border-white/[0.08] px-3.5 py-2.5 bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between text-[10.5px] text-[var(--muted)]">
            <div className="flex flex-col gap-0.5 min-w-0 pr-2">
              <div className="flex items-center gap-1.5 truncate">
                {wordCount !== undefined && (
                  <span className="font-medium text-[var(--text)]">{wordCount} words</span>
                )}
                {wordCount !== undefined && lastEditedAt && (
                  <span className="text-[var(--muted)]/50">•</span>
                )}
                {lastEditedAt && (
                  <span className="truncate">{formatTimeAgo(lastEditedAt)}</span>
                )}
              </div>
              {lastEditedBy && (
                <div className="text-[9.5px] text-[var(--muted)] truncate">
                  By {lastEditedBy}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[9px] uppercase tracking-wider font-semibold text-[var(--muted)]">
                Close
              </span>
              <kbd className="px-1.5 py-0.5 rounded-md text-[9px] font-mono bg-black/[0.05] dark:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.1] text-[var(--muted)] shadow-2xs">
                esc
              </kbd>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
