import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Link2, Copy, CopyPlus, Move, Trash2, Presentation, Wifi, Type, Maximize2,
  Palette, Lock, Sparkles, FileEdit, Languages, FileDown, Upload, Globe,
  BarChart3, History, Bell, Cable, Search, X, ChevronRight, ChevronLeft, Eye,
  FolderKanban,
  type LucideIcon
} from "lucide-react";
import { executeCommand } from "../../core/commands/ActionExecutor";
import type { Page } from "../../lib/supabaseService";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { useNotificationPlatform } from "../../features/notifications/Provider";
import { loadPagePreference, savePagePreference } from "../../features/notifications/preferences";
import type { PageNotificationMode } from "../../features/notifications/types";

const fontOptions = [
  { id: "default", label: "Default", class: "font-sans" },
  { id: "serif", label: "Serif", class: "font-serif" },
  { id: "mono", label: "Mono", class: "font-mono" }
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

// Page-management actions that only make sense for the actual owner of a
// page — hidden (not just disabled) when `page.sharedRole` is set, i.e.
// this page was opened via a share grant rather than owned. Functionally
// most of these already no-op for a shared page today (App.tsx's
// updateSharedPage() explicitly refuses `trashed`/`parentId` patches, and
// trash/duplicate/move operate on the owner-scoped `pages` array which
// never contains a shared page's id), but hiding them is what actually
// communicates that to the person looking at the menu instead of letting
// them click something that silently does nothing.
const OWNER_ONLY_ACTION_IDS = new Set(["duplicate", "move-to", "move-to-workspace", "trash", "lock", "readonly", "customize", "wiki"]);

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
  useEffect(() => {
    let active = true;
    setNotifyMode(null);
    if (open && notificationUserId) void loadPagePreference(notificationUserId, page.id).then(mode => { if (active) setNotifyMode(mode); }).catch(() => { if (active) onToast?.('Unable to load page notification settings.'); });
    return () => { active = false; };
  }, [open, notificationUserId, page.id]);
  const [search, setSearch] = useState("");
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null); // null | 'ai' | 'translate' | 'notify' | 'connections'
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const isShared = Boolean(page?.sharedRole);

  const mainActions: MainAction[] = [
    { id: "copy-link", icon: Link2, label: "Copy link", shortcut: "Ctrl+L" },
    { id: "copy-contents", icon: Copy, label: "Copy page contents", shortcut: "" },
    { id: "duplicate", icon: CopyPlus, label: "Duplicate", shortcut: "Ctrl+D" },
    { id: "move-to", icon: Move, label: "Move to", shortcut: "Ctrl+Shift+P" },
    ...(workspaceRows.length > 1 ? [{ id: "move-to-workspace", icon: FolderKanban, label: "Move to workspace", shortcut: "", submenu: true }] : []),
    { id: "trash", icon: Trash2, label: "Move to Trash", shortcut: "", danger: true },
    { id: "present", icon: Presentation, label: "Present (Beta)", shortcut: "Ctrl+Alt+P" },
    { id: "offline", icon: Wifi, label: "Available offline", shortcut: "", toggle: true, value: page?.offline },
    { id: "small-text", icon: Type, label: "Small text", shortcut: "", toggle: true, value: page?.smallText },
    { id: "full-width", icon: Maximize2, label: "Full width", shortcut: "", toggle: true, value: page?.fullWidth },
    { id: "customize", icon: Palette, label: "Customize page", shortcut: "" },
    { id: "lock", icon: Lock, label: "Lock page", shortcut: "", toggle: true, value: page?.isLocked },
    { id: "readonly", icon: Eye, label: "Read-only", shortcut: "", toggle: true, value: page?.permission === 'view' },
    { id: "ai", icon: Sparkles, label: "Use with AI", shortcut: "", submenu: true },
    { id: "suggest", icon: FileEdit, label: "Suggest edits", shortcut: "" },
    { id: "translate", icon: Languages, label: "Translate", shortcut: "", submenu: true },
    { id: "import", icon: Upload, label: "Import", shortcut: "" },
    { id: "export", icon: FileDown, label: "Export", shortcut: "" },
    { id: "wiki", icon: Globe, label: "Turn into wiki", shortcut: "" },
    { id: "analytics", icon: BarChart3, label: "Updates & analytics", shortcut: "" },
    { id: "history", icon: History, label: "Version history", shortcut: "" },
    { id: "notify", icon: Bell, label: `Notify me › ${notifyBusy ? 'Saving…' : notifyMode === 'muted' ? 'Muted' : notifyMode === 'mentions' ? 'Mentions' : notifyMode === 'all' ? 'All activity' : 'Loading…'}`, shortcut: "", submenu: true },
    { id: "connections", icon: Cable, label: "Connections › None", shortcut: "", submenu: true },
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
    if (activeSubmenu === 'move-to-workspace') {
      const currentWs = (page as Page & { workspaceId?: string | null }).workspaceId || null;
      return workspaceRows
        .map((row) => ({
          id: `movews-${row.id}`,
          label: `${row.name}${row.id === (currentWs || activeWorkspaceId) ? " ✓" : ""}`,
          icon: FolderKanban,
        }))
        .filter((item) => fuzzyMatch(search, item.label));
    }
    if (activeSubmenu) {
      const sub = submenus[activeSubmenu];
      return sub ? sub.items.map(item => activeSubmenu === 'notify' ? { ...item, active: item.id === `notify-${notifyMode}` } : item).filter(item => fuzzyMatch(search, item.label)) : [];
    }
    return mainActions.filter(item => fuzzyMatch(search, item.label));
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

    if (item.id.startsWith('movews-')) {
      onAction?.(`move-to-workspace:${item.id.slice(7)}`);
      return;
    }

    if (item.id.startsWith('notify-')) {
      if (!notificationUserId || notifyBusy || !notifyMode) return;
      const mode = item.id.slice(7) as PageNotificationMode;
      const previous = notifyMode;
      setNotifyMode(mode); setNotifyBusy(true);
      void savePagePreference(notificationUserId, page.id, mode).then(() => onToast?.('Page notification preference saved.')).catch(() => { setNotifyMode(previous); onToast?.('Could not save notification preference.'); }).finally(() => setNotifyBusy(false));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, highlightedIndex, activeSubmenu]);

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
          initial={{ opacity: 0, scale: 0.96, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -3 }}
          transition={{ type: "spring", stiffness: 380, damping: 26 }}
          style={{ width: 300 }}
          className="flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--elevated)] shadow-[var(--shadow-floating)] z-[120] max-h-[min(560px,calc(100vh-32px))]"
        >
          {/* Header Bar with Submenu Back Action */}
          <div className="flex items-center border-b border-[var(--border)] px-1.5 py-1 bg-[var(--hover)]">
            {activeSubmenu && (
              <button
                onClick={() => {
                  setActiveSubmenu(null);
                  setSearch("");
                  setHighlightedIndex(-1);
                }}
                className="p-1 rounded text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition cursor-pointer mr-1"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            <span className="flex-1 text-xs font-semibold text-[var(--secondary)] pl-1.5">
              {activeSubmenu ? submenus[activeSubmenu].title : "Page options"}
            </span>
          </div>

          {/* Search Input */}
          <div className="relative border-b border-[var(--border)]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setHighlightedIndex(-1); }}
              onKeyDown={handleKeyDown}
              placeholder={activeSubmenu ? "Search submenu..." : "Search actions..."}
              className="w-full bg-transparent px-8 py-2 text-xs text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)] cursor-pointer">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Font segment control (only on top-level and when search is empty) */}
          {!activeSubmenu && !search && (
            <>
            <div className="border-b border-[var(--border)] bg-[var(--surface)] p-2 flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] px-1">Typography</span>
              <div className="grid grid-cols-3 gap-1 bg-[var(--surface)] p-1 rounded-lg border border-[var(--border)]">
                {fontOptions.map((f) => {
                  const isActive = (page?.fontStyle || "default") === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => onPagePatch?.({ fontStyle: f.id })}
                      className={`flex flex-col items-center justify-center rounded-md py-1.5 px-1 cursor-pointer transition ${
                        isActive
                          ? "bg-[var(--hover)] border border-[var(--border-strong)] text-[var(--accent)]"
                          : "text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--hover)]"
                      }`}
                    >
                      <span className={`text-base font-bold mb-0.5 ${f.class} ${isActive ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
                        Ag
                      </span>
                      <span className="text-[9px] font-medium tracking-tight">{f.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-b border-[var(--border)] bg-[var(--surface)] p-2 flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] px-1">Page Color</span>
              <div className="grid grid-cols-8 gap-1.5 px-1 py-1">
                {[
                  null,
                  "#1a1a2e", "#16213e", "#0f3460", "#533483",
                  "#3d0000", "#1b4332", "#2d3436", "#180a20",
                  "#fff3e0", "#fce4ec", "#e8f5e9", "#e3f2fd",
                  "#fff8e1", "#f3e5f5", "#e0f2f1", "#fbe9e7",
                ].map((color) => (
                  <button
                    key={color ?? "default"}
                    onClick={() => onPagePatch?.({ pageBg: color })}
                    className={`h-6 w-6 rounded-full border-2 transition-all cursor-pointer ${
                      (page?.pageBg ?? null) === color
                        ? "border-[var(--accent)] scale-110"
                        : "border-[var(--border)] hover:border-[var(--border-strong)]"
                    }`}
                    style={color ? { background: color } : { background: "var(--bg)", borderStyle: "dashed" }}
                    title={color ?? "Default"}
                  />
                ))}
              </div>
            </div>
            </>
          )}

          {/* Action List (Scrollable middle container) */}
          <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-none py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-8 text-center text-xs text-[var(--muted)]">No actions found</div>
            ) : (
              filtered.map((item, idx) => {
                const isItemDanger = "danger" in item && item.danger;
                const isSelected = highlightedIndex === idx;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleAction(item)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                      isItemDanger ? "text-[var(--danger)] hover:bg-[var(--danger)]/10" : "text-[var(--text)]"
                    } ${isSelected ? "bg-[var(--hover)]" : ""}`}
                  >
                    <item.icon size={13} className={`shrink-0 ${isItemDanger ? "text-[var(--danger)]" : "text-[var(--secondary)]"}`} />
                    <span className="flex-1 truncate">{item.label}</span>

                    {"toggle" in item && item.toggle && (
                      <span className={`flex h-3.5 w-6 shrink-0 items-center rounded-full p-0.5 transition-colors ${item.value ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`}>
                        <span className={`h-2.5 w-2.5 rounded-full bg-[var(--text)] shadow-sm transition-transform ${item.value ? "translate-x-2.5" : "translate-x-0"}`} />
                      </span>
                    )}
                    {"shortcut" in item && item.shortcut && (
                      <span className="text-[9px] text-[var(--muted)] font-mono">{item.shortcut}</span>
                    )}
                    {"submenu" in item && item.submenu && (
                      <ChevronRight size={12} className="text-[var(--muted)]" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer (Fixed container) */}
          <div className="border-t border-[var(--border)] bg-[var(--surface)] px-3 py-2 flex flex-col gap-1 text-[10px] text-[var(--muted)]">
            <div className="flex justify-between items-center text-[9px] uppercase tracking-wider text-[var(--muted)] border-b border-[var(--border)] pb-1 mb-1">
              <span>Close menu</span>
              <kbd className="px-1 rounded bg-[var(--hover)] border border-[var(--border)] font-mono">esc</kbd>
            </div>
            {wordCount !== undefined && (
              <div className="truncate">Word count: <span className="text-[var(--secondary)] font-medium">{wordCount} words</span></div>
            )}
            {lastEditedBy && (
              <div className="truncate">Last edited by: <span className="text-[var(--secondary)] font-medium">{lastEditedBy}</span></div>
            )}
            {lastEditedAt && (
              <div>Edited: <span className="text-[var(--secondary)] font-medium">{formatTimeAgo(lastEditedAt)}</span></div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
