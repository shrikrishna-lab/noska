import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Plus, X, Pin, Copy, ArrowRight, Layers, Sparkles, ChevronDown, Search, Columns, ExternalLink } from "lucide-react";
import { useTabs, type WorkspaceTab, VIEW_META } from "../../contexts/TabContext";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import type { Page } from "../../lib/supabaseService";
import { PageIcon } from "../PageIcon";
import NewTabModal from "./NewTabModal";
import TabHoverPreview from "./TabHoverPreview";
import PagePickerPopover from "./PagePickerPopover";
import { usePresence } from "../../hooks/usePresence";
import CollabPresenceBar from "../collab/CollabPresenceBar";

interface WorkspaceTabBarProps {
  pages: Page[];
  sharedPages?: Page[];
  pendingInvites?: Array<{ id: string; inviter_username?: string | null; role?: string | null; page_title?: string | null }>;
  aiChats?: Array<{ id: string; name?: string | null; updatedAt?: string | null }>;
  onNewPage: (template?: string) => void;
  onCopyLink?: (pageId: string) => void;
}

interface ContextMenuState {
  open: boolean;
  x: number;
  y: number;
  tab: WorkspaceTab | null;
}

interface PreviewState {
  tab: WorkspaceTab;
  anchor: { left: number; top: number; bottom: number; right: number };
}

interface PickerState {
  open: boolean;
  tab: WorkspaceTab | null;
  anchorRect: { top: number; left: number; bottom: number; right: number } | null;
}

export const WorkspaceTabBar = memo(function WorkspaceTabBar({
  pages,
  sharedPages = [],
  pendingInvites = [],
  aiChats = [],
  onNewPage,
  onCopyLink
}: WorkspaceTabBarProps) {
  const {
    tabs,
    activeTabId,
    openTab,
    closeTab,
    closeOtherTabs,
    closeTabsToRight,
    togglePinTab,
    reorderTabs,
    duplicateTab,
    splitPage,
    activePaneId,
    setPaneActiveTab
  } = useTabs();

  const [
    { stackedPageIds },
    { setStackedPageIds, setAppView, setActiveId }
  ] = useWorkspace();

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const activePageId = activeTab?.type === "page" ? activeTab.targetId : null;
  const { users, ownStatus, setStatus } = usePresence(activePageId);

  const [pickerState, setPickerState] = useState<PickerState>({
    open: false,
    tab: null,
    anchorRect: null
  });

  const handleSplitIconClick = useCallback((e: React.MouseEvent<HTMLButtonElement>, tab: WorkspaceTab) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setPickerState({
      open: true,
      tab,
      anchorRect: {
        top: rect.top,
        left: rect.left,
        bottom: rect.bottom,
        right: rect.right
      }
    });
  }, []);

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    open: false,
    x: 0,
    y: 0,
    tab: null
  });

  const [preview, setPreview] = useState<PreviewState | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewOpenTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const previewCloseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [overflowOpen, setOverflowOpen] = useState(false);
  const [overflowSearch, setOverflowSearch] = useState("");
  const overflowRef = useRef<HTMLButtonElement>(null);
  const overflowMenuRef = useRef<HTMLDivElement>(null);

  const [newTabModalOpen, setNewTabModalOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Clean up preview timers on unmount
  useEffect(() => {
    return () => {
      clearTimeout(previewOpenTimer.current);
      clearTimeout(previewCloseTimer.current);
    };
  }, []);

  // Dismiss hover preview on outside click (Notion-style)
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (previewRef.current?.contains(e.target as Node)) return;
      setPreview(null);
    };
    window.addEventListener("mousedown", handleOutside);
    return () => window.removeEventListener("mousedown", handleOutside);
  }, []);

  // Global keyboard shortcuts: Ctrl+T new tab, Ctrl+W close, Ctrl+Tab cycle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === "t" || e.key === "T")) {
        // Prevent browser new tab if focus is inside app
        e.preventDefault();
        setNewTabModalOpen(true);
        return;
      }
      if (mod && (e.key === "w" || e.key === "W")) {
        e.preventDefault();
        if (activeTabId) closeTab(activeTabId);
        return;
      }
      if (mod && e.key === "Tab") {
        e.preventDefault();
        if (tabs.length < 2) return;
        const idx = tabs.findIndex((t) => t.id === activeTabId);
        const next = e.shiftKey
          ? (idx <= 0 ? tabs.length - 1 : idx - 1)
          : (idx < 0 || idx >= tabs.length - 1 ? 0 : idx + 1);
        const target = tabs[next];
        if (target) setPaneActiveTab(activePaneId, target.id);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tabs, activeTabId, closeTab, setPaneActiveTab, activePaneId]);

  // Dismiss overflow dropdown on outside click / Escape
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (!overflowOpen) return;
      if (overflowRef.current?.contains(e.target as Node)) return;
      if (overflowMenuRef.current?.contains(e.target as Node)) return;
      setOverflowOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOverflowOpen(false);
    };
    window.addEventListener("mousedown", handleOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [overflowOpen]);

  // Close context menu on outside click or escape
  useEffect(() => {
    const handleOutside = () => {
      if (contextMenu.open) setContextMenu((prev) => ({ ...prev, open: false }));
    };
    window.addEventListener("click", handleOutside);
    window.addEventListener("contextmenu", handleOutside);
    return () => {
      window.removeEventListener("click", handleOutside);
      window.removeEventListener("contextmenu", handleOutside);
    };
  }, [contextMenu.open]);

  // Support horizontal mouse wheel scrolling across tabs
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (containerRef.current) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        containerRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  // Helper to resolve title & icon for real data
  const resolveTabMeta = useCallback(
    (tab: WorkspaceTab) => {
      if (tab.type === "page") {
        const page = pages.find((p) => p.id === tab.targetId);
        const title = page?.title?.trim() || "Untitled";
        // Breadcrumb: walk parentId chain up to 2 levels for Notion-style hierarchy
        let breadcrumb = title;
        let parent = page?.parentId ? pages.find((p) => p.id === page.parentId) : undefined;
        const chain: string[] = [];
        while (parent && chain.length < 2) {
          chain.unshift(parent.title?.trim() || "Untitled");
          parent = parent.parentId ? pages.find((p) => p.id === parent.parentId) : undefined;
        }
        if (chain.length > 0) breadcrumb = [...chain, title].join(" › ");
        return {
          icon: page?.icon || "📄",
          title,
          breadcrumb,
          page
        };
      } else {
        const meta = VIEW_META[tab.targetId] || { icon: "📌", title: tab.targetId };
        return {
          icon: meta.icon,
          title: meta.title,
          breadcrumb: meta.title,
          page: null
        };
      }
    },
    [pages]
  );

  const handleContextMenu = (e: React.MouseEvent, tab: WorkspaceTab) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      open: true,
      x: Math.min(e.clientX, window.innerWidth - 200),
      y: Math.min(e.clientY, window.innerHeight - 220),
      tab
    });
  };

  // Handle middle-click to close tab
  const handleAuxClick = (e: React.MouseEvent, tabId: string) => {
    if (e.button === 1) {
      e.preventDefault();
      closeTab(tabId);
    }
  };

  // Hover preview for tabs (Notion-style: delayed show, grace on leave)
  const schedulePreview = (e: React.MouseEvent, tab: WorkspaceTab) => {
    clearTimeout(previewCloseTimer.current);
    clearTimeout(previewOpenTimer.current);
    const el = e.currentTarget as HTMLElement;
    previewOpenTimer.current = setTimeout(() => {
      if (!el.isConnected) return;
      const rect = el.getBoundingClientRect();
      setPreview({
        tab,
        anchor: { left: rect.left, top: rect.top, bottom: rect.bottom, right: rect.right }
      });
    }, 350);
  };
  const cancelPreview = () => {
    clearTimeout(previewOpenTimer.current);
    previewCloseTimer.current = setTimeout(() => setPreview(null), 150);
  };
  const keepPreview = () => {
    clearTimeout(previewOpenTimer.current);
    clearTimeout(previewCloseTimer.current);
  };
  const previewMeta = preview ? resolveTabMeta(preview.tab) : null;

  const filteredTabs = tabs.filter((t) => {
    const m = resolveTabMeta(t);
    return m.title.toLowerCase().includes(overflowSearch.trim().toLowerCase());
  });

  return (
    <div
      className="group/tabbar relative flex h-[44px] w-full select-none items-end border-b border-[var(--border)] bg-[var(--surface-2)] px-3 pt-3.5 overflow-hidden z-20 text-[12px] transition-colors"
      onWheel={handleWheel}
    >
      {/* Scrollable Tabs Container */}
      <div
        ref={containerRef}
        className="flex flex-row flex-nowrap flex-1 items-end gap-1.5 overflow-x-auto no-scrollbar min-w-0"
        style={{ scrollBehavior: "smooth" }}
      >
        <Reorder.Group
          axis="x"
          values={tabs}
          onReorder={reorderTabs}
          className="flex flex-row flex-nowrap items-end gap-1 shrink-0"
        >
          {tabs.map((tab, idx) => {
            const isActive = tab.id === activeTabId;
            const meta = resolveTabMeta(tab);

            return (
              <Reorder.Item
                key={tab.id || `tab-${idx}`}
                value={tab}
                dragListener={!tab.pinned}
                dragElastic={0.12}
                whileDrag={{
                  scale: 1.03,
                  zIndex: 50,
                  opacity: 0.95,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                  cursor: "grabbing"
                }}
                whileHover={{ y: 0 }}
                transition={{ type: "spring", stiffness: 450, damping: 30 }}
                onContextMenu={(e) => handleContextMenu(e, tab)}
                onAuxClick={(e) => handleAuxClick(e, tab.id)}
                onMouseEnter={(e) => schedulePreview(e, tab)}
                onMouseLeave={cancelPreview}
                title={meta.breadcrumb || meta.title}
                className={`group/tab relative flex flex-row flex-nowrap shrink-0 h-[29px] items-center gap-2 rounded-t-md px-3 transition-all cursor-grab active:cursor-grabbing select-none outline-none ${
                  isActive
                    ? "bg-[var(--bg)] text-[var(--text)] font-semibold border-t border-x border-[var(--border)] shadow-[0_-2px_6px_rgba(0,0,0,0.04)] z-10"
                    : "text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)] border-t border-x border-transparent"
                } ${tab.pinned && meta.title !== "Untitled" ? "max-w-[42px] justify-center px-2" : "max-w-[200px] min-w-[115px]"}`}
                onClick={() => {
                  if (!isActive) {
                    setPaneActiveTab(activePaneId, tab.id);
                  }
                }}
              >
                {/* Active tab bottom cover to merge seamlessly with topbar */}
                {isActive && (
                  <div className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-[var(--bg)] z-20" />
                )}

                {/* Tab Icon */}
                <span className="shrink-0 flex items-center justify-center text-[13px] leading-none">
                  {tab.type === "page" ? (
                    <PageIcon icon={meta.icon} size={13} fallback={<span>📄</span>} />
                  ) : (
                    <span>{meta.icon}</span>
                  )}
                </span>

                {/* Tab Title (hidden if pinned) */}
                {(!tab.pinned || meta.title === "Untitled") && (
                  <span className="truncate flex-1 text-[12px] leading-tight font-medium pr-0.5">
                    {meta.title}
                  </span>
                )}

                {/* Pinned Icon indicator */}
                {tab.pinned && <span className="sr-only">{meta.title}</span>}

                {/* Tab Actions (Split & Close buttons on Hover or Active) */}
                {!tab.pinned && (
                  <div className="flex items-center gap-0.5 ml-auto shrink-0 opacity-0 group-hover/tab:opacity-100 transition-opacity duration-150">
                    {tab.type === "page" && (
                      <button
                        onClick={(e) => handleSplitIconClick(e, tab)}
                        title="Split view (open page beside)"
                        className="grid h-4 w-4 place-items-center rounded-sm transition cursor-pointer text-slate-400 hover:bg-black/10 dark:hover:bg-white/10 hover:text-slate-800 dark:hover:text-white"
                      >
                        <Columns size={10} strokeWidth={2.2} />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                      title="Close tab"
                      className="grid h-4 w-4 place-items-center rounded-sm text-slate-400 hover:bg-black/10 dark:hover:bg-white/10 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
                    >
                      <X size={11} strokeWidth={2.2} />
                    </button>
                  </div>
                )}
              </Reorder.Item>
            );
          })}
        </Reorder.Group>

        {/* Plus / New Tab Button */}
        <button
          onClick={() => setNewTabModalOpen(true)}
          title="Open new tab (Ctrl+T)"
          className="flex h-[26px] w-[26px] items-center justify-center rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition duration-150 shrink-0 mb-0.5 cursor-pointer"
        >
          <Plus size={14} strokeWidth={2.2} />
        </button>

        {/* Overflow / Tab Search Dropdown */}
        {tabs.length > 0 && (
          <button
            ref={overflowRef}
            onClick={(e) => { e.stopPropagation(); setOverflowOpen((v) => !v); }}
            title="All tabs (search)"
            className="relative flex h-[26px] w-[26px] items-center justify-center rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition duration-150 shrink-0 mb-0.5 cursor-pointer"
          >
            <ChevronDown size={13} strokeWidth={2.2} />
          </button>
        )}
      </div>

      {/* Tab Split Page Picker Popover */}
      {pickerState.open && pickerState.tab && (
        <PagePickerPopover
          open={pickerState.open}
          onClose={() => setPickerState({ open: false, tab: null, anchorRect: null })}
          currentPageTitle={resolveTabMeta(pickerState.tab).title}
          currentPageId={pickerState.tab.targetId}
          sourcePaneId={activePaneId}
          pages={pages}
          openTabs={tabs}
          anchorRect={pickerState.anchorRect}
          onSelectPage={(targetPageId) => {
            splitPage({
              pageId: targetPageId,
              sourcePaneId: activePaneId,
              direction: "right"
            });
          }}
          onCreateNewPage={() => {
            onNewPage("blank");
          }}
        />
      )}

      {/* Tab Hover Preview — Notion-style with real page content */}
      <AnimatePresence>
        {preview && previewMeta && (
          <TabHoverPreview
            panelRef={previewRef}
            tab={preview.tab}
            icon={previewMeta.icon}
            title={previewMeta.title}
            breadcrumb={previewMeta.breadcrumb}
            page={previewMeta.page}
            pages={pages}
            sharedPages={sharedPages}
            pendingInvites={pendingInvites}
            aiChats={aiChats}
            anchor={preview.anchor}
            onMouseEnter={keepPreview}
            onMouseLeave={cancelPreview}
          />
        )}
      </AnimatePresence>

      {/* Overflow Tab Search Dropdown */}
      <AnimatePresence>
        {overflowOpen && (
          <motion.div
            ref={overflowMenuRef}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.1 }}
            className="fixed z-[60] max-h-[300px] w-[260px] overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-xl backdrop-blur-md"
            style={{ top: 38, right: 8 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1.5 flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1">
              <Search size={12} className="text-[var(--muted)] shrink-0" />
              <input
                autoFocus
                value={overflowSearch}
                onChange={(e) => setOverflowSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && filteredTabs.length === 1) {
                    const t = filteredTabs[0];
                    openTab(t.type, t.targetId, { makeActive: true });
                    setOverflowOpen(false);
                    setOverflowSearch("");
                  }
                }}
                placeholder="Search tabs..."
                className="w-full bg-transparent text-[12px] text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
              />
            </div>
            {filteredTabs.length === 0 && (
              <div className="px-2 py-3 text-center text-[11px] text-[var(--muted)]">No matching tabs</div>
            )}
            {filteredTabs.map((t) => {
              const m = resolveTabMeta(t);
              const isActive = t.id === activeTabId;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setPaneActiveTab(activePaneId, t.id);
                    setOverflowOpen(false);
                    setOverflowSearch("");
                  }}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-[var(--hover)] ${isActive ? "bg-[var(--active)]" : ""}`}
                >
                  <span className="shrink-0 flex items-center justify-center text-[13px] leading-none">
                    {t.type === "page" ? (
                      <PageIcon icon={m.icon} size={13} fallback={<span>📄</span>} />
                    ) : (
                      <span>{m.icon}</span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-[12px] ${isActive ? "font-medium text-[var(--text)]" : "text-[var(--text)]"}`}>{m.title}</div>
                    {m.breadcrumb && m.breadcrumb !== m.title && (
                      <div className="truncate text-[10px] text-[var(--muted)]">{m.breadcrumb}</div>
                    )}
                  </div>
                  {t.pinned && <Pin size={10} className="shrink-0 text-[var(--muted)]" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Tab Switcher Modal with Live Preview */}
      <NewTabModal
        open={newTabModalOpen}
        onClose={() => setNewTabModalOpen(false)}
        pages={pages}
        sharedPages={sharedPages}
        pendingInvites={pendingInvites}
        aiChats={aiChats}
        onOpenPageInNewTab={(pageId) => {
          openTab("page", pageId, { inNewTab: true, makeActive: true });
        }}
        onNewPageInNewTab={(template) => {
          onNewPage(template);
        }}
        onStartChatInNewTab={() => {
          openTab("view", "chats", { inNewTab: true, makeActive: true });
        }}
        onOpenViewInNewTab={(viewId) => {
          openTab("view", viewId, { inNewTab: true, makeActive: true });
        }}
        onCopyLink={onCopyLink}
      />

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu.open && contextMenu.tab && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            style={{ top: contextMenu.y, left: contextMenu.x }}
            className="fixed z-50 min-w-[170px] rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 shadow-xl backdrop-blur-md text-[12px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                duplicateTab(contextMenu.tab!.id);
                setContextMenu((prev) => ({ ...prev, open: false }));
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[var(--text)] hover:bg-[var(--hover)]"
            >
              <Copy size={13} className="text-[var(--text-secondary)]" />
              Duplicate Tab
            </button>

            <button
              onClick={() => {
                togglePinTab(contextMenu.tab!.id);
                setContextMenu((prev) => ({ ...prev, open: false }));
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[var(--text)] hover:bg-[var(--hover)]"
            >
              <Pin size={13} className="text-[var(--text-secondary)]" />
              {contextMenu.tab.pinned ? "Unpin Tab" : "Pin Tab"}
            </button>

            {contextMenu.tab.type === "page" && onCopyLink && (
              <button
                onClick={() => {
                  onCopyLink(contextMenu.tab!.targetId);
                  setContextMenu((prev) => ({ ...prev, open: false }));
                }}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[var(--text)] hover:bg-[var(--hover)]"
              >
                <Layers size={13} className="text-[var(--text-secondary)]" />
                Copy Link
              </button>
            )}

            <div className="my-1 border-t border-[var(--border)]" />

            <button
              onClick={() => {
                closeTab(contextMenu.tab!.id);
                setContextMenu((prev) => ({ ...prev, open: false }));
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[var(--text)] hover:bg-[var(--hover)]"
            >
              <X size={13} className="text-[var(--text-secondary)]" />
              Close Tab
            </button>

            <button
              onClick={() => {
                closeOtherTabs(contextMenu.tab!.id);
                setContextMenu((prev) => ({ ...prev, open: false }));
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[var(--text)] hover:bg-[var(--hover)]"
            >
              <ArrowRight size={13} className="text-[var(--text-secondary)]" />
              Close Other Tabs
            </button>

            <button
              onClick={() => {
                closeTabsToRight(contextMenu.tab!.id);
                setContextMenu((prev) => ({ ...prev, open: false }));
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[var(--text)] hover:bg-[var(--hover)]"
            >
              <ArrowRight size={13} className="text-[var(--text-secondary)]" />
              Close Tabs to the Right
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default WorkspaceTabBar;
