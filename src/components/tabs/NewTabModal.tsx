import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MessageSquare,
  FilePlus,
  Link2,
  ExternalLink,
  ChevronDown,
  Filter,
  User,
  Folder,
  X,
  Sparkles,
  List,
  Type,
  SlidersHorizontal,
  CornerDownLeft,
  Star,
  Clock,
  FileText,
  Lock,
  Code2,
  Check,
  ChevronRight,
  Hash,
  Quote,
  Lightbulb,
  ArrowRight
} from "lucide-react";
import type { Page } from "../../lib/supabaseService";
import { PageIcon } from "../PageIcon";
import { timeAgo } from "../../utils/helpers";
import { getBlockTitle } from "../../utils/blockModel";
import { VIEW_META } from "../../contexts/TabContext";
import PageBlocksPreview from "./PageBlocksPreview";
import ViewPreview from "./ViewPreview";

interface NewTabModalProps {
  open: boolean;
  onClose: () => void;
  pages: Page[];
  sharedPages?: Page[];
  pendingInvites?: Array<{ id: string; inviter_username?: string | null; role?: string | null; page_title?: string | null }>;
  aiChats?: Array<{ id: string; name?: string | null; updatedAt?: string | null }>;
  onOpenPageInNewTab: (pageId: string) => void;
  onNewPageInNewTab: (template?: string) => void;
  onStartChatInNewTab: () => void;
  onOpenViewInNewTab?: (viewId: string) => void;
  onCopyLink?: (pageId: string) => void;
}

type ListItem =
  | { type: "action"; id: "start_chat" | "new_page"; title: string; icon: React.ReactNode }
  | { type: "page"; id: string; page: Page; group: "Today" | "Yesterday" | "Older"; subtitle?: string }
  | { type: "view"; id: string; title: string; icon: string; subtitle?: string; group: "Sections" };

export function NewTabModal({
  open,
  onClose,
  pages,
  sharedPages = [],
  pendingInvites = [],
  aiChats = [],
  onOpenPageInNewTab,
  onNewPageInNewTab,
  onStartChatInNewTab,
  onOpenViewInNewTab,
  onCopyLink
}: NewTabModalProps) {
  const [query, setQuery] = useState("");
  const [titleOnly, setTitleOnly] = useState(false);
  const [filterFavorite, setFilterFavorite] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus search input on mount
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  // Parent page breadcrumbs map
  const parentMap = useMemo(() => {
    const map = new Map<string, string>();
    pages.forEach((p) => {
      if (p.parentId) {
        const parent = pages.find((parent) => parent.id === p.parentId);
        if (parent) map.set(p.id, parent.title || "Untitled");
      }
    });
    return map;
  }, [pages]);

  // Group pages by recency (Today, Yesterday, Older)
  const items: ListItem[] = useMemo(() => {
    const list: ListItem[] = [];

    // Top quick actions
    if (!query.trim() && !filterFavorite) {
      list.push({
        type: "action",
        id: "start_chat",
        title: "Start new chat",
        icon: <MessageSquare size={15} className="text-[var(--accent)]" />
      });
      list.push({
        type: "action",
        id: "new_page",
        title: "New page",
        icon: <FilePlus size={15} className="text-[var(--text-secondary)]" />
      });
    }

    // Workspace sections (views) — searchable like pages
    if (!filterFavorite) {
      const q = query.trim().toLowerCase();
      Object.entries(VIEW_META).forEach(([id, meta]) => {
        if (!q || id.toLowerCase().includes(q) || meta.title.toLowerCase().includes(q)) {
          list.push({
            type: "view",
            id,
            title: meta.title,
            icon: meta.icon,
            subtitle: "Workspace section",
            group: "Sections"
          });
        }
      });
    }

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const activePages = pages.filter((p) => !p.trashed);

    // Filter pages
    const filtered = activePages.filter((p) => {
      if (filterFavorite && !p.favorite) return false;
      if (!query.trim()) return true;

      const q = query.toLowerCase();
      const titleMatch = (p.title || "").toLowerCase().includes(q);
      if (titleOnly || titleMatch) return titleMatch;

      // Full content search across blocks
      return (p.blocks || []).some((b) => (getBlockTitle(b as never) || b.text || "").toLowerCase().includes(q));
    });

    // Sort by updatedAt descending
    const sorted = [...filtered].sort((a, b) => {
      const ta = new Date(a.updatedAt || 0).getTime();
      const tb = new Date(b.updatedAt || 0).getTime();
      return tb - ta;
    });

    sorted.forEach((p) => {
      const updatedTime = new Date(p.updatedAt || 0).getTime();
      const diff = now - updatedTime;

      let group: "Today" | "Yesterday" | "Older" = "Older";
      if (diff < oneDay) group = "Today";
      else if (diff < 2 * oneDay) group = "Yesterday";

      const parentTitle = parentMap.get(p.id);

      list.push({
        type: "page",
        id: p.id,
        page: p,
        group,
        subtitle: parentTitle ? `— ${parentTitle}` : undefined
      });
    });

    return list;
  }, [pages, query, titleOnly, filterFavorite, parentMap]);

  // Keep selection in bounds
  useEffect(() => {
    if (selectedIndex >= items.length) {
      setSelectedIndex(Math.max(0, items.length - 1));
    }
  }, [items.length, selectedIndex]);

  const selectedItem = items[selectedIndex] || null;

  const previewPage: Page | null = useMemo(() => {
    if (!selectedItem) return null;
    if (selectedItem.type === "page") return selectedItem.page;
    return null;
  }, [selectedItem]);

  const handleSelect = useCallback(
    (item: ListItem) => {
      if (item.type === "action") {
        if (item.id === "start_chat") onStartChatInNewTab();
        else if (item.id === "new_page") onNewPageInNewTab();
      } else if (item.type === "view") {
        onOpenViewInNewTab?.(item.id);
      } else {
        onOpenPageInNewTab(item.page.id);
      }
      onClose();
    },
    [onClose, onStartChatInNewTab, onNewPageInNewTab, onOpenPageInNewTab, onOpenViewInNewTab]
  );

  const handleCopyLink = useCallback(
    (pageId: string) => {
      if (onCopyLink) {
        onCopyLink(pageId);
        setCopiedId(pageId);
        setTimeout(() => setCopiedId(null), 1800);
      }
    },
    [onCopyLink]
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < items.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : items.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedItem) {
        handleSelect(selectedItem);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if ((e.ctrlKey || e.metaKey) && (e.key === "l" || e.key === "L")) {
      e.preventDefault();
      if (previewPage) {
        handleCopyLink(previewPage.id);
      }
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -10 }}
        transition={{ type: "spring", stiffness: 420, damping: 30 }}
        className="w-full max-w-[900px] h-[580px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="border-b border-[var(--border)] px-4 pt-3 pb-2.5 bg-[var(--surface)] shrink-0">
          <div className="flex items-center gap-2.5">
            <Search size={17} className="text-[var(--text-secondary)] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Open in new tab..."
              className="flex-1 bg-transparent text-[14px] text-[var(--text)] placeholder-[var(--muted)] outline-none font-normal"
            />
            <button
              onClick={onClose}
              className="p-1 rounded-md text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Filter Chips Bar */}
          <div className="flex items-center gap-1.5 mt-2.5 text-[11px] select-none">
            <button
              onClick={() => setTitleOnly(!titleOnly)}
              className={`flex items-center gap-1 rounded-md px-2 py-0.5 transition cursor-pointer ${
                titleOnly
                  ? "bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30 font-medium"
                  : "bg-[var(--hover)] text-[var(--text-secondary)] hover:text-[var(--text)] border border-[var(--border)]"
              }`}
            >
              <Type size={11} />
              Title only
            </button>

            <button
              onClick={() => setFilterFavorite(!filterFavorite)}
              className={`flex items-center gap-1 rounded-md px-2 py-0.5 transition cursor-pointer ${
                filterFavorite
                  ? "bg-[var(--warning)]/15 text-[var(--warning)] border border-[var(--warning)]/30 font-medium"
                  : "bg-[var(--hover)] text-[var(--text-secondary)] hover:text-[var(--text)] border border-[var(--border)]"
              }`}
            >
              <Star size={11} className={filterFavorite ? "fill-[var(--warning)]" : ""} />
              Starred
            </button>

            <button className="flex items-center gap-1 rounded-md px-2 py-0.5 bg-[var(--hover)] text-[var(--text-secondary)] hover:text-[var(--text)] border border-[var(--border)] transition cursor-pointer">
              <User size={11} />
              Created by
              <ChevronDown size={10} className="opacity-60" />
            </button>

            <button className="flex items-center gap-1 rounded-md px-2 py-0.5 bg-[var(--hover)] text-[var(--text-secondary)] hover:text-[var(--text)] border border-[var(--border)] transition cursor-pointer">
              <Folder size={11} />
              In
              <ChevronDown size={10} className="opacity-60" />
            </button>
          </div>
        </div>

        {/* Main Content (Split Pane) */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left Column: List */}
          <div
            ref={listRef}
            className="w-[45%] border-r border-[var(--border)] flex flex-col overflow-y-auto p-2 space-y-0.5 scrollbar-thin"
          >
            {items.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--muted)]">No matching pages found</div>
            ) : (
              (() => {
                let lastGroup: string | null = null;

                return items.map((item, index) => {
                  const isSelected = index === selectedIndex;
                  const showGroupHeader = (item.type === "page" || item.type === "view") && item.group !== lastGroup;
                  if (item.type === "page" || item.type === "view") lastGroup = item.group;

                  return (
                    <React.Fragment key={item.type === "action" ? item.id : item.id}>
                      {showGroupHeader && (
                        <div className="px-2.5 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] select-none">
                          {item.type === "page" ? item.group : item.type === "view" ? "Sections" : ""}
                        </div>
                      )}

                      <div
                        onMouseEnter={() => setSelectedIndex(index)}
                        onClick={() => handleSelect(item)}
                        className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12.5px] cursor-pointer transition-colors select-none ${
                          isSelected
                            ? "bg-[var(--active)] text-[var(--text)] font-medium border border-[var(--border)] shadow-sm"
                            : "text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)] border border-transparent"
                        }`}
                      >
                        {item.type === "action" ? (
                          <span className="shrink-0 flex items-center justify-center w-5 h-5">{item.icon}</span>
                        ) : (
                          <span className="shrink-0 flex items-center justify-center text-[14px]">
                            {item.type === "view" ? (
                              <span>{item.icon}</span>
                            ) : (
                              <PageIcon icon={item.page.icon} size={14} fallback={<span>📄</span>} />
                            )}
                          </span>
                        )}

                        <span className="truncate flex-1">
                          {item.type === "action" ? item.title : item.type === "view" ? item.title : item.page.title || "Untitled"}
                          {item.type !== "action" && item.subtitle && (
                            <span className="text-[11px] text-[var(--muted)] font-normal ml-1">
                              {item.subtitle}
                            </span>
                          )}
                        </span>

                        {item.type === "page" && item.page.favorite && (
                          <Star size={11} className="fill-[var(--warning)] text-[var(--warning)] shrink-0 opacity-70" />
                        )}
                      </div>
                    </React.Fragment>
                  );
                });
              })()
            )}
          </div>

          {/* Right Column: Live Rich Page Preview */}
          <div className="w-[55%] bg-[var(--surface-2)]/50 flex flex-col overflow-y-auto p-4 scrollbar-thin relative">
            <AnimatePresence mode="wait">
              {previewPage ? (
                <motion.div
                  key={previewPage.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.12 }}
                  className="flex flex-col h-full space-y-3"
                >
                  {/* Header Actions Bar */}
                  <div className="flex items-center justify-between shrink-0">
                    <div className="text-[10px] text-[var(--muted)] uppercase font-semibold tracking-wider flex items-center gap-1.5 truncate">
                      <Folder size={11} className="shrink-0" />
                      <span className="truncate">{parentMap.get(previewPage.id) || "Workspace Root"}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {onCopyLink && (
                        <button
                          onClick={() => handleCopyLink(previewPage.id)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                            copiedId === previewPage.id
                              ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                              : "text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
                          }`}
                          title="Copy link (Ctrl+L)"
                        >
                          {copiedId === previewPage.id ? <Check size={12} /> : <Link2 size={12} />}
                          <span>{copiedId === previewPage.id ? "Copied" : "Copy link"}</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          onOpenPageInNewTab(previewPage.id);
                          onClose();
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-[var(--accent)] text-white hover:opacity-90 transition cursor-pointer shadow-sm"
                        title="Open in new tab"
                      >
                        <span>Open in tab</span>
                        <ExternalLink size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Notion-Style Page Card Container */}
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-sm flex flex-col flex-1 min-h-0">
                    {/* Cover image or refined top banner */}
                    {previewPage.cover ? (
                      <div
                        className="h-20 w-full bg-center bg-cover shrink-0 border-b border-[var(--border)]"
                        style={{
                          backgroundImage: previewPage.cover.startsWith("linear-gradient")
                            ? previewPage.cover
                            : `url(${previewPage.cover})`
                        }}
                      />
                    ) : (
                      <div className="h-2 w-full bg-gradient-to-r from-[var(--accent)]/30 via-[var(--noska-blue)]/20 to-transparent shrink-0" />
                    )}

                    {/* Page Content Body */}
                    <div className="p-4 overflow-y-auto flex-1 space-y-3.5 scrollbar-thin">
                      {/* Icon + Title Header */}
                      <div className="space-y-1.5">
                        <div className="flex items-start gap-3">
                          <span className="text-3xl shrink-0 flex items-center justify-center mt-0.5">
                            <PageIcon icon={previewPage.icon} size={32} fallback={<span>📄</span>} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <h2 className="text-base font-bold text-[var(--text)] leading-snug break-words">
                              {previewPage.title || "Untitled"}
                            </h2>
                            {/* Metadata Pills */}
                            <div className="flex items-center flex-wrap gap-2 mt-1 text-[10px] text-[var(--muted)]">
                              <span className="flex items-center gap-1">
                                <FileText size={10} />
                                {previewPage.blocks?.length || 0} blocks
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock size={10} />
                                {timeAgo(previewPage.updatedAt)}
                              </span>
                              <span className="flex items-center gap-0.5 rounded px-1 py-0.2 bg-[var(--hover)] text-[var(--text-secondary)]">
                                <Lock size={9} />
                                Private
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Rendered Live Blocks — faithful, real, scrollable */}
                      <div className="pt-2 border-t border-[var(--border)]">
                        <PageBlocksPreview page={previewPage} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : selectedItem?.type === "view" ? (
                <motion.div
                  key={`view-${selectedItem.id}`}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.12 }}
                  className="flex flex-col h-full space-y-3"
                >
                  {/* Header Actions Bar */}
                  <div className="flex items-center justify-between shrink-0">
                    <div className="text-[10px] text-[var(--muted)] uppercase font-semibold tracking-wider flex items-center gap-1.5 truncate">
                      <Folder size={11} className="shrink-0" />
                      <span className="truncate">Sections</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          onOpenViewInNewTab?.(selectedItem.id);
                          onClose();
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-[var(--accent)] text-white hover:opacity-90 transition cursor-pointer shadow-sm"
                        title="Open in new tab"
                      >
                        <span>Open in tab</span>
                        <ExternalLink size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Notion-Style View Card Container */}
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-sm flex flex-col flex-1 min-h-0">
                    <div className="h-2 w-full bg-gradient-to-r from-[var(--accent)]/30 via-[var(--noska-blue)]/20 to-transparent shrink-0" />

                    {/* View Content Body */}
                    <div className="p-4 overflow-y-auto flex-1 space-y-3.5 scrollbar-thin">
                      <div className="space-y-1.5">
                        <div className="flex items-start gap-3">
                          <span className="text-3xl shrink-0 flex items-center justify-center mt-0.5">
                            <span>{selectedItem.icon}</span>
                          </span>
                          <div className="min-w-0 flex-1">
                            <h2 className="text-base font-bold text-[var(--text)] leading-snug break-words">
                              {selectedItem.title}
                            </h2>
                            <div className="flex items-center flex-wrap gap-2 mt-1 text-[10px] text-[var(--muted)]">
                              <span className="flex items-center gap-1">
                                <FileText size={10} />
                                {pages.filter((p) => !p.trashed).length} pages
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock size={10} />
                                Workspace section
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Rendered Live View Content — faithful, real, scrollable */}
                      <div className="pt-2 border-t border-[var(--border)]">
                        <ViewPreview
                          view={selectedItem.id}
                          pages={pages}
                          sharedPages={sharedPages}
                          pendingInvites={pendingInvites}
                          aiChats={aiChats}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : selectedItem?.id === "start_chat" ? (
                <motion.div
                  key="chat-preview"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex flex-col h-full items-center justify-center text-center p-6 space-y-4"
                >
                  <div className="relative">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 shadow-lg shadow-purple-500/20 flex items-center justify-center text-white">
                      <Sparkles size={24} />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-[var(--text)]">AI Assistant Workspace</h3>
                    <p className="text-xs text-[var(--muted)] mt-1 max-w-[260px] leading-relaxed">
                      Start a new contextual AI chat tab to brainstorm, summarize, and draft content.
                    </p>
                  </div>

                  {/* Suggestion Prompts */}
                  <div className="w-full max-w-[280px] space-y-1.5 pt-2 text-left">
                    <button
                      onClick={() => { onStartChatInNewTab(); onClose(); }}
                      className="w-full flex items-center justify-between p-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--hover)] hover:border-[var(--accent)]/50 text-[11.5px] text-[var(--text)] transition cursor-pointer"
                    >
                      <span>✨ Brainstorm project ideas</span>
                      <ArrowRight size={12} className="text-[var(--muted)]" />
                    </button>
                    <button
                      onClick={() => { onStartChatInNewTab(); onClose(); }}
                      className="w-full flex items-center justify-between p-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--hover)] hover:border-[var(--accent)]/50 text-[11.5px] text-[var(--text)] transition cursor-pointer"
                    >
                      <span>📝 Summarize my recent pages</span>
                      <ArrowRight size={12} className="text-[var(--muted)]" />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="new-page-preview"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex flex-col h-full items-center justify-center text-center p-6 space-y-4"
                >
                  <div className="h-14 w-14 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-md flex items-center justify-center text-[var(--text)] text-2xl">
                    <span>📄</span>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-[var(--text)]">Create Blank Page</h3>
                    <p className="text-xs text-[var(--muted)] mt-1 max-w-[260px] leading-relaxed">
                      Open a fresh blank page or choose a quick starter template.
                    </p>
                  </div>

                  {/* Starter Templates */}
                  <div className="w-full max-w-[280px] grid grid-cols-2 gap-2 pt-2 text-left text-[11.5px]">
                    <button
                      onClick={() => { onNewPageInNewTab("blank"); onClose(); }}
                      className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--hover)] hover:border-[var(--accent)] text-[var(--text)] font-medium transition cursor-pointer"
                    >
                      <span>📝 Blank Note</span>
                    </button>
                    <button
                      onClick={() => { onNewPageInNewTab("tasks"); onClose(); }}
                      className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--hover)] hover:border-[var(--accent)] text-[var(--text)] font-medium transition cursor-pointer"
                    >
                      <span>✅ Tasks Tracker</span>
                    </button>
                    <button
                      onClick={() => { onNewPageInNewTab("standup"); onClose(); }}
                      className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--hover)] hover:border-[var(--accent)] text-[var(--text)] font-medium transition cursor-pointer"
                    >
                      <span>🗓️ Meeting Notes</span>
                    </button>
                    <button
                      onClick={() => { onNewPageInNewTab("brainstorm"); onClose(); }}
                      className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--hover)] hover:border-[var(--accent)] text-[var(--text)] font-medium transition cursor-pointer"
                    >
                      <span>💡 Brainstorm</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer Toolbar */}
        <div className="border-t border-[var(--border)] px-4 py-2 bg-[var(--surface)] text-[11px] text-[var(--muted)] flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-[var(--hover)] px-1.5 py-0.5 rounded border border-[var(--border)] text-[9.5px]">Ctrl+↵</kbd>
              Open in new tab
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-[var(--hover)] px-1.5 py-0.5 rounded border border-[var(--border)] text-[9.5px]">Ctrl+L</kbd>
              Copy link
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-[var(--hover)] px-1.5 py-0.5 rounded border border-[var(--border)] text-[9.5px]">Esc</kbd>
              Close
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <SlidersHorizontal size={13} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default NewTabModal;
