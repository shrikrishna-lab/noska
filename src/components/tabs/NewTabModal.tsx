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
  ArrowRight,
  Compass,
  Layers,
  Wand2,
  Calendar,
  CheckSquare,
  BookOpen,
  Plus,
  ArrowUp
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
  onStartChatInNewTab: (initialPrompt?: string) => void;
  onOpenViewInNewTab?: (viewId: string) => void;
  onCopyLink?: (pageId: string) => void;
}

type ListItem =
  | { type: "action"; id: "start_chat" | "new_page"; title: string; subtitle?: string; icon: React.ReactNode; group: "Quick Actions" }
  | { type: "page"; id: string; page: Page; group: "Today" | "Yesterday" | "Older Pages"; subtitle?: string }
  | { type: "view"; id: string; title: string; icon: string; subtitle?: string; group: "Workspace Sections" };

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
  const [aiPrompt, setAiPrompt] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement | null>(null);

  // Focus search input on mount
  useEffect(() => {
    if (open) {
      setQuery("");
      setAiPrompt("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  // Smoothly keep the active item in view inside the scroll container
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

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

  // Group items
  const items: ListItem[] = useMemo(() => {
    const list: ListItem[] = [];

    // Top quick actions
    if (!query.trim() && !filterFavorite) {
      list.push({
        type: "action",
        id: "start_chat",
        title: "Start new chat",
        subtitle: "AI Assistant Workspace",
        icon: (
          <div className="w-7 h-7 rounded-[9px] bg-gradient-to-b from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-[0_2px_6px_rgba(147,51,234,0.25),inset_0_1px_0_rgba(255,255,255,0.35)] shrink-0">
            <Sparkles size={14} strokeWidth={2.2} />
          </div>
        ),
        group: "Quick Actions"
      });
      list.push({
        type: "action",
        id: "new_page",
        title: "New page",
        subtitle: "Blank document or template",
        icon: (
          <div className="w-7 h-7 rounded-[9px] bg-gradient-to-b from-sky-400 via-blue-500 to-blue-600 text-white flex items-center justify-center shadow-[0_2px_6px_rgba(37,99,235,0.25),inset_0_1px_0_rgba(255,255,255,0.35)] shrink-0">
            <FilePlus size={14} strokeWidth={2.2} />
          </div>
        ),
        group: "Quick Actions"
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
            group: "Workspace Sections"
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

      let group: "Today" | "Yesterday" | "Older Pages" = "Older Pages";
      if (diff < oneDay) group = "Today";
      else if (diff < 2 * oneDay) group = "Yesterday";

      const parentTitle = parentMap.get(p.id);

      list.push({
        type: "page",
        id: p.id,
        page: p,
        group,
        subtitle: parentTitle ? `in ${parentTitle}` : undefined
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 dark:bg-black/75 backdrop-blur-xl p-4 sm:p-6 transition-all duration-200"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -8 }}
        transition={{ type: "spring", stiffness: 440, damping: 32, mass: 0.6 }}
        className="w-full max-w-[920px] h-[600px] rounded-[24px] border border-black/[0.08] dark:border-white/[0.12] bg-white/95 dark:bg-[#1a1a1e]/95 text-neutral-900 dark:text-neutral-100 backdrop-blur-3xl backdrop-saturate-150 shadow-[0_32px_80px_-16px_rgba(0,0,0,0.28),0_12px_32px_-8px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.85),0_16px_40px_-8px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] flex flex-col overflow-hidden select-none"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header (Apple Spotlight Style) */}
        <div className="border-b border-black/[0.06] dark:border-white/[0.08] px-5 pt-3.5 pb-3 bg-transparent shrink-0">
          <div className="flex items-center gap-3">
            <Search size={18} className="text-neutral-400 dark:text-neutral-500 shrink-0" strokeWidth={2.2} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Open in new tab..."
              className="flex-1 bg-transparent text-[15px] font-normal tracking-tight text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 outline-none leading-relaxed"
            />
            {query.trim() && (
              <button
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="w-5 h-5 rounded-full bg-black/[0.05] dark:bg-white/[0.1] hover:bg-black/[0.1] dark:hover:bg-white/[0.15] text-neutral-400 hover:text-neutral-700 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
                title="Clear query"
              >
                <X size={12} strokeWidth={2.4} />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/[0.08] text-neutral-400 border border-black/[0.06] dark:border-white/[0.08]">
              ESC
            </kbd>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-neutral-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.08] hover:text-neutral-800 dark:hover:text-white transition cursor-pointer ml-0.5"
              aria-label="Close"
            >
              <X size={17} strokeWidth={2.2} />
            </button>
          </div>

          {/* Filter Chips Bar (Apple Capsule Pills) */}
          <div className="flex items-center gap-2 mt-3 text-[11.5px] select-none overflow-x-auto scrollbar-none py-0.5">
            <button
              onClick={() => setTitleOnly(!titleOnly)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 transition-all duration-150 cursor-pointer ${titleOnly
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs font-medium"
                : "bg-black/[0.035] dark:bg-white/[0.06] text-neutral-600 dark:text-neutral-400 hover:bg-black/[0.07] dark:hover:bg-white/[0.1] hover:text-neutral-900 dark:hover:text-white border border-transparent font-normal"
                }`}
            >
              <Type size={11} strokeWidth={2.4} />
              <span>Title only</span>
            </button>

            <button
              onClick={() => setFilterFavorite(!filterFavorite)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 transition-all duration-150 cursor-pointer ${filterFavorite
                ? "bg-amber-500 text-white shadow-xs font-medium"
                : "bg-black/[0.035] dark:bg-white/[0.06] text-neutral-600 dark:text-neutral-400 hover:bg-black/[0.07] dark:hover:bg-white/[0.1] hover:text-neutral-900 dark:hover:text-white border border-transparent font-normal"
                }`}
            >
              <Star size={11} strokeWidth={2.4} className={filterFavorite ? "fill-white text-white" : ""} />
              <span>Starred</span>
            </button>

            <button
              onClick={() => {
                setQuery((q) => (q.includes("section:") ? "" : "section:"));
              }}
              className="flex items-center gap-1.5 rounded-full px-3 py-1 bg-black/[0.035] dark:bg-white/[0.06] text-neutral-600 dark:text-neutral-400 hover:bg-black/[0.07] dark:hover:bg-white/[0.1] hover:text-neutral-900 dark:hover:text-white border border-transparent transition-all duration-150 cursor-pointer font-normal"
            >
              <Layers size={11} strokeWidth={2.4} />
              <span>Sections</span>
            </button>

            <button
              onClick={() => {
                setQuery((q) => (q.includes("created:today") ? "" : "created:today"));
              }}
              className="flex items-center gap-1.5 rounded-full px-3 py-1 bg-black/[0.035] dark:bg-white/[0.06] text-neutral-600 dark:text-neutral-400 hover:bg-black/[0.07] dark:hover:bg-white/[0.1] hover:text-neutral-900 dark:hover:text-white border border-transparent transition-all duration-150 cursor-pointer font-normal"
            >
              <Clock size={11} strokeWidth={2.4} />
              <span>Recent</span>
            </button>
          </div>
        </div>

        {/* Main Content (Split Pane) */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left Column: List with Apple Floating Spring Selection Capsule */}
          <div
            ref={listRef}
            className="w-[44%] border-r border-black/[0.06] dark:border-white/[0.08] flex flex-col overflow-y-auto p-2.5 space-y-0.5 scrollbar-none relative"
          >
            {items.length === 0 ? (
              <div className="py-16 text-center text-xs text-neutral-400 dark:text-neutral-500 font-medium">
                No matching pages or sections found
              </div>
            ) : (
              (() => {
                let lastGroup: string | null = null;

                return items.map((item, index) => {
                  const isSelected = index === selectedIndex;
                  const showGroupHeader = item.group !== lastGroup;
                  lastGroup = item.group;

                  return (
                    <React.Fragment key={item.type === "action" ? item.id : item.id}>
                      {showGroupHeader && (
                        <div className="px-3 pt-3 pb-1 text-[11px] font-semibold text-neutral-400/90 dark:text-neutral-500 tracking-tight select-none">
                          {item.group}
                        </div>
                      )}

                      <div
                        ref={isSelected ? activeItemRef : null}
                        onMouseEnter={() => setSelectedIndex(index)}
                        onClick={() => handleSelect(item)}
                        className={`group relative flex items-center gap-2.5 rounded-[12px] px-2.5 py-2 text-[13px] cursor-pointer transition-colors duration-150 select-none ${isSelected
                          ? "text-neutral-900 dark:text-white font-medium"
                          : "text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
                          }`}
                      >
                        {/* Apple Liquid Glass Floating Spring Capsule */}
                        {isSelected && (
                          <motion.div
                            layoutId="newTabActiveIndicator"
                            className="absolute inset-0 rounded-[12px] bg-black/[0.05] dark:bg-white/[0.09] shadow-[0_1px_3px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-black/[0.04] dark:ring-white/[0.08] -z-10"
                            transition={{ type: "spring", stiffness: 500, damping: 36 }}
                          />
                        )}

                        {/* Icon */}
                        {item.type === "action" ? (
                          item.icon
                        ) : item.type === "view" ? (
                          <div className="w-7 h-7 rounded-[8px] bg-black/[0.04] dark:bg-white/[0.07] flex items-center justify-center text-[13px] shrink-0 border border-black/[0.03] dark:border-white/[0.06]">
                            <span>{item.icon}</span>
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-[8px] bg-black/[0.03] dark:bg-white/[0.06] flex items-center justify-center text-[13px] shrink-0 border border-black/[0.03] dark:border-white/[0.06]">
                            <PageIcon icon={item.page.icon} size={14} fallback={<span>📄</span>} />
                          </div>
                        )}

                        {/* Title and subtitle */}
                        <div className="flex-1 min-w-0">
                          <div className="truncate leading-tight">
                            {item.type === "action"
                              ? item.title
                              : item.type === "view"
                                ? item.title
                                : item.page.title || "Untitled"}
                          </div>
                          {item.subtitle && (
                            <div className="text-[10.5px] text-neutral-400 dark:text-neutral-500 truncate leading-tight mt-0.5">
                              {item.subtitle}
                            </div>
                          )}
                        </div>

                        {/* Starred badge */}
                        {item.type === "page" && item.page.favorite && (
                          <Star size={11} className="fill-amber-500 text-amber-500 shrink-0 opacity-80" />
                        )}

                        {/* Apple Keyboard Keycap Indicator */}
                        {isSelected && (
                          <kbd className="text-[10px] font-mono font-medium text-neutral-400 dark:text-neutral-400 px-1.5 py-0.5 rounded-[5px] bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 shadow-[0_1px_2px_rgba(0,0,0,0.04)] shrink-0 leading-none">
                            ↵
                          </kbd>
                        )}
                      </div>
                    </React.Fragment>
                  );
                });
              })()
            )}
          </div>

          {/* Right Column: Live Rich Preview & Interactive Launchpad */}
          <div className="w-[56%] bg-black/[0.012] dark:bg-white/[0.01] flex flex-col overflow-y-auto p-5 scrollbar-none relative">
            <AnimatePresence mode="wait">
              {previewPage ? (
                <motion.div
                  key={previewPage.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col h-full space-y-3"
                >
                  {/* Header Actions Bar */}
                  <div className="flex items-center justify-between shrink-0">
                    <div className="text-[10.5px] text-neutral-400 dark:text-neutral-500 uppercase font-semibold tracking-wider flex items-center gap-1.5 truncate">
                      <Folder size={11} className="shrink-0" />
                      <span className="truncate">{parentMap.get(previewPage.id) || "Workspace Root"}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {onCopyLink && (
                        <button
                          onClick={() => handleCopyLink(previewPage.id)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition cursor-pointer ${copiedId === previewPage.id
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-black/[0.04] dark:bg-white/[0.08] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                            }`}
                          title="Copy link (Ctrl+L)"
                        >
                          {copiedId === previewPage.id ? <Check size={11} /> : <Link2 size={11} />}
                          <span>{copiedId === previewPage.id ? "Copied" : "Copy link"}</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          onOpenPageInNewTab(previewPage.id);
                          onClose();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.12)] cursor-pointer"
                        title="Open in new tab"
                      >
                        <span>Open in tab</span>
                        <ExternalLink size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Notion-Style Page Card Container */}
                  <div className="rounded-[18px] border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1e1e22] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0">
                    {/* Cover image or refined top banner */}
                    {previewPage.cover ? (
                      <div
                        className="h-20 w-full shrink-0 border-b border-black/[0.06] dark:border-white/[0.08]"
                        style={{
                          ...(previewPage.cover.includes("gradient(") || previewPage.cover.startsWith("#") || previewPage.cover.startsWith("rgb") || previewPage.cover.startsWith("hsl")
                            ? { background: previewPage.cover }
                            : { backgroundImage: `url(${previewPage.cover})`, backgroundPosition: "center", backgroundSize: "cover", backgroundRepeat: "no-repeat" })
                        }}
                      />
                    ) : (
                      <div className="h-2 w-full bg-gradient-to-r from-sky-500/40 via-blue-500/30 to-purple-500/20 shrink-0" />
                    )}

                    {/* Page Content Body */}
                    <div className="p-4 overflow-y-auto flex-1 space-y-3.5 scrollbar-none">
                      {/* Icon + Title Header */}
                      <div className="space-y-1.5">
                        <div className="flex items-start gap-3">
                          <span className="text-3xl shrink-0 flex items-center justify-center mt-0.5">
                            <PageIcon icon={previewPage.icon} size={30} fallback={<span>📄</span>} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <h2 className="text-base font-bold text-neutral-900 dark:text-white leading-snug break-words">
                              {previewPage.title || "Untitled"}
                            </h2>
                            {/* Metadata Pills */}
                            <div className="flex items-center flex-wrap gap-2 mt-1 text-[10.5px] text-neutral-400 dark:text-neutral-500">
                              <span className="flex items-center gap-1">
                                <FileText size={10} />
                                {previewPage.blocks?.length || 0} blocks
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock size={10} />
                                {timeAgo(previewPage.updatedAt)}
                              </span>
                              <span className="flex items-center gap-0.5 rounded px-1.5 py-0.2 bg-black/[0.04] dark:bg-white/[0.08] text-neutral-600 dark:text-neutral-300">
                                <Lock size={9} />
                                Private
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Rendered Live Blocks */}
                      <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
                        <PageBlocksPreview page={previewPage} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : selectedItem?.type === "view" ? (
                <motion.div
                  key={`view-${selectedItem.id}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col h-full space-y-3"
                >
                  {/* Header Actions Bar */}
                  <div className="flex items-center justify-between shrink-0">
                    <div className="text-[10.5px] text-neutral-400 dark:text-neutral-500 uppercase font-semibold tracking-wider flex items-center gap-1.5 truncate">
                      <Layers size={11} className="shrink-0" />
                      <span className="truncate">Workspace Section</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          onOpenViewInNewTab?.(selectedItem.id);
                          onClose();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.12)] cursor-pointer"
                        title="Open in new tab"
                      >
                        <span>Open in tab</span>
                        <ExternalLink size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Notion-Style View Card Container */}
                  <div className="rounded-[18px] border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1e1e22] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0">
                    <div className="h-2 w-full bg-gradient-to-r from-sky-500/40 via-indigo-500/30 to-purple-500/20 shrink-0" />

                    {/* View Content Body */}
                    <div className="p-4 overflow-y-auto flex-1 space-y-3.5 scrollbar-none">
                      <div className="space-y-1.5">
                        <div className="flex items-start gap-3">
                          <span className="text-3xl shrink-0 flex items-center justify-center mt-0.5">
                            <span>{selectedItem.icon}</span>
                          </span>
                          <div className="min-w-0 flex-1">
                            <h2 className="text-base font-bold text-neutral-900 dark:text-white leading-snug break-words">
                              {selectedItem.title}
                            </h2>
                            <div className="flex items-center flex-wrap gap-2 mt-1 text-[10.5px] text-neutral-400 dark:text-neutral-500">
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

                      {/* Rendered Live View Content */}
                      <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
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
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="relative w-full h-full min-h-[380px] rounded-[18px] overflow-hidden flex items-center justify-center select-none shadow-inner"
                >
                  {/* Background Image from user's design (Image 1) */}
                  <img
                    src="/images/ai-workspace-bg.png"
                    alt="AI Assistant"
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  />

                  {/* Ambient soft vignette */}
                  <div className="absolute inset-0 bg-black/10 dark:bg-black/25 pointer-events-none" />

                  {/* Floating Frosted Glass Prompt Capsule (Image 1) */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      onStartChatInNewTab(aiPrompt.trim() || undefined);
                      onClose();
                    }}
                    className="relative z-10 w-[88%] max-w-[340px] flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/45 dark:bg-black/45 backdrop-blur-2xl border border-white/60 dark:border-white/20 shadow-[0_16px_40px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.7)] transition-all duration-200 focus-within:bg-white/60 dark:focus-within:bg-black/60 focus-within:scale-[1.02] focus-within:shadow-[0_20px_48px_rgba(0,0,0,0.28)]"
                  >
                    {/* Plus Icon Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAiPrompt((prev) => (prev ? prev : "Ai Chat"));
                      }}
                      title="Add prompt idea or context"
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-white/20 transition-all shrink-0 cursor-pointer"
                    >
                      <Plus size={18} strokeWidth={2.4} />
                    </button>

                    {/* Vertical Divider */}
                    <div className="h-4 w-[1px] bg-white/40 dark:bg-white/30 shrink-0" />

                    {/* Text Input matching Image 1 */}
                    <input
                      type="text"
                      autoFocus
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Jesan"
                      className="flex-1 min-w-0 bg-transparent px-2 text-[14px] font-medium text-white placeholder:text-white/65 outline-none drop-shadow-xs"
                    />

                    {/* Circular White Send Button (matching Image 1) */}
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      className="w-8 h-8 rounded-full bg-white text-neutral-900 shadow-[0_4px_12px_rgba(0,0,0,0.25)] flex items-center justify-center shrink-0 cursor-pointer transition-transform"
                      title="Open AI Workspace (Enter)"
                    >
                      <ArrowUp size={16} strokeWidth={2.5} />
                    </motion.button>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="new-page-preview"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col h-full items-center justify-center text-center p-6 space-y-4 relative select-none"
                >
                  {/* Subtle Apple Ambient Aura */}
                  <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-tr from-sky-500/20 via-blue-500/15 to-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

                  {/* Hero Specular Glass Squircle */}
                  <motion.div
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="relative"
                  >
                    <div className="w-[72px] h-[72px] rounded-[24px] bg-gradient-to-b from-sky-400 via-blue-500 to-indigo-600 shadow-[0_20px_48px_-8px_rgba(14,165,233,0.45),inset_0_2px_1.5px_rgba(255,255,255,0.65),inset_0_-2px_4px_rgba(0,0,0,0.2)] ring-1 ring-white/30 flex items-center justify-center text-white">
                      <FilePlus size={32} strokeWidth={2.2} />
                    </div>
                  </motion.div>

                  <div className="space-y-1">
                    <h3 className="text-[19px] font-semibold tracking-tight text-neutral-900 dark:text-white">
                      Create New Page
                    </h3>
                    <p className="text-[13px] text-neutral-500 dark:text-neutral-400 max-w-[310px] leading-relaxed">
                      Open a fresh blank page or choose a starter template for your thoughts.
                    </p>
                  </div>

                  {/* Apple Bento Starter Templates Grid */}
                  <div className="w-full max-w-[340px] grid grid-cols-2 gap-2.5 pt-1 text-left">
                    {/* Blank Note */}
                    <motion.button
                      whileHover={{ scale: 1.025, y: -1 }}
                      whileTap={{ scale: 0.975 }}
                      onClick={() => {
                        onNewPageInNewTab("blank");
                        onClose();
                      }}
                      className="p-3 rounded-[16px] border border-black/[0.06] dark:border-white/[0.08] bg-white/80 dark:bg-white/[0.04] hover:bg-white dark:hover:bg-white/[0.08] backdrop-blur-xl shadow-[0_2px_8px_rgba(0,0,0,0.03),inset_0_1px_1px_rgba(255,255,255,0.8)] hover:shadow-[0_8px_20px_rgba(245,158,11,0.12)] hover:border-amber-500/30 transition-all duration-200 group cursor-pointer flex flex-col justify-between min-h-[76px]"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="w-8 h-8 rounded-[10px] bg-amber-500/10 dark:bg-amber-400/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                          <FileText size={16} strokeWidth={2.2} />
                        </div>
                        <span className="text-[10px] font-medium text-amber-600/80 dark:text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                          Blank
                        </span>
                      </div>
                      <div className="mt-2">
                        <div className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          Blank Note
                        </div>
                        <div className="text-[10.5px] text-neutral-400 dark:text-neutral-500 leading-tight">
                          Clean empty canvas
                        </div>
                      </div>
                    </motion.button>

                    {/* Tasks Tracker */}
                    <motion.button
                      whileHover={{ scale: 1.025, y: -1 }}
                      whileTap={{ scale: 0.975 }}
                      onClick={() => {
                        onNewPageInNewTab("tasks");
                        onClose();
                      }}
                      className="p-3 rounded-[16px] border border-black/[0.06] dark:border-white/[0.08] bg-white/80 dark:bg-white/[0.04] hover:bg-white dark:hover:bg-white/[0.08] backdrop-blur-xl shadow-[0_2px_8px_rgba(0,0,0,0.03),inset_0_1px_1px_rgba(255,255,255,0.8)] hover:shadow-[0_8px_20px_rgba(16,185,129,0.12)] hover:border-emerald-500/30 transition-all duration-200 group cursor-pointer flex flex-col justify-between min-h-[76px]"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="w-8 h-8 rounded-[10px] bg-emerald-500/10 dark:bg-emerald-400/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                          <CheckSquare size={16} strokeWidth={2.2} />
                        </div>
                        <span className="text-[10px] font-medium text-emerald-600/80 dark:text-emerald-400/80 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                          Tasks
                        </span>
                      </div>
                      <div className="mt-2">
                        <div className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          Tasks Tracker
                        </div>
                        <div className="text-[10.5px] text-neutral-400 dark:text-neutral-500 leading-tight">
                          Action items & kanban
                        </div>
                      </div>
                    </motion.button>

                    {/* Meeting Notes */}
                    <motion.button
                      whileHover={{ scale: 1.025, y: -1 }}
                      whileTap={{ scale: 0.975 }}
                      onClick={() => {
                        onNewPageInNewTab("standup");
                        onClose();
                      }}
                      className="p-3 rounded-[16px] border border-black/[0.06] dark:border-white/[0.08] bg-white/80 dark:bg-white/[0.04] hover:bg-white dark:hover:bg-white/[0.08] backdrop-blur-xl shadow-[0_2px_8px_rgba(0,0,0,0.03),inset_0_1px_1px_rgba(255,255,255,0.8)] hover:shadow-[0_8px_20px_rgba(14,165,233,0.12)] hover:border-sky-500/30 transition-all duration-200 group cursor-pointer flex flex-col justify-between min-h-[76px]"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="w-8 h-8 rounded-[10px] bg-sky-500/10 dark:bg-sky-400/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/20">
                          <Calendar size={16} strokeWidth={2.2} />
                        </div>
                        <span className="text-[10px] font-medium text-sky-600/80 dark:text-sky-400/80 bg-sky-500/10 px-1.5 py-0.5 rounded-full">
                          Agenda
                        </span>
                      </div>
                      <div className="mt-2">
                        <div className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                          Meeting Notes
                        </div>
                        <div className="text-[10.5px] text-neutral-400 dark:text-neutral-500 leading-tight">
                          Date, team & summary
                        </div>
                      </div>
                    </motion.button>

                    {/* Brainstorm */}
                    <motion.button
                      whileHover={{ scale: 1.025, y: -1 }}
                      whileTap={{ scale: 0.975 }}
                      onClick={() => {
                        onNewPageInNewTab("brainstorm");
                        onClose();
                      }}
                      className="p-3 rounded-[16px] border border-black/[0.06] dark:border-white/[0.08] bg-white/80 dark:bg-white/[0.04] hover:bg-white dark:hover:bg-white/[0.08] backdrop-blur-xl shadow-[0_2px_8px_rgba(0,0,0,0.03),inset_0_1px_1px_rgba(255,255,255,0.8)] hover:shadow-[0_8px_20px_rgba(168,85,247,0.12)] hover:border-purple-500/30 transition-all duration-200 group cursor-pointer flex flex-col justify-between min-h-[76px]"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="w-8 h-8 rounded-[10px] bg-purple-500/10 dark:bg-purple-400/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
                          <Lightbulb size={16} strokeWidth={2.2} />
                        </div>
                        <span className="text-[10px] font-medium text-purple-600/80 dark:text-purple-400/80 bg-purple-500/10 px-1.5 py-0.5 rounded-full">
                          Ideas
                        </span>
                      </div>
                      <div className="mt-2">
                        <div className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          Brainstorm
                        </div>
                        <div className="text-[10.5px] text-neutral-400 dark:text-neutral-500 leading-tight">
                          Freeform thoughts
                        </div>
                      </div>
                    </motion.button>
                  </div>

                  {/* Primary Apple Specular CTA Button */}
                  <motion.button
                    whileHover={{ scale: 1.025 }}
                    whileTap={{ scale: 0.975 }}
                    onClick={() => {
                      onNewPageInNewTab("blank");
                      onClose();
                    }}
                    className="mt-3 flex items-center justify-center gap-2 px-7 py-2.5 rounded-full bg-gradient-to-b from-sky-400 via-blue-500 to-indigo-600 text-white font-medium text-[13px] tracking-tight shadow-[0_8px_24px_rgba(14,165,233,0.36),inset_0_1px_0_rgba(255,255,255,0.45)] hover:shadow-[0_12px_32px_rgba(14,165,233,0.48)] transition-all cursor-pointer"
                  >
                    <Plus size={15} strokeWidth={2.4} />
                    <span>Create Blank Page</span>
                    <span className="font-mono text-[10px] font-semibold opacity-90 bg-white/20 px-1.5 py-0.5 rounded-[4px] leading-none">
                      ↵
                    </span>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer Toolbar (Apple Keycaps & Information) */}
        <div className="border-t border-black/[0.06] dark:border-white/[0.08] px-5 py-2.5 bg-black/[0.015] dark:bg-white/[0.02] text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <kbd className="font-mono text-[10px] font-semibold bg-white dark:bg-white/10 text-neutral-700 dark:text-neutral-300 border border-black/10 dark:border-white/10 rounded-md px-1.5 py-0.5 shadow-[0_1px_1px_rgba(0,0,0,0.06)]">
                Ctrl+↵
              </kbd>
              <span>Open in tab</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="font-mono text-[10px] font-semibold bg-white dark:bg-white/10 text-neutral-700 dark:text-neutral-300 border border-black/10 dark:border-white/10 rounded-md px-1.5 py-0.5 shadow-[0_1px_1px_rgba(0,0,0,0.06)]">
                Ctrl+L
              </kbd>
              <span>Copy link</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="font-mono text-[10px] font-semibold bg-white dark:bg-white/10 text-neutral-700 dark:text-neutral-300 border border-black/10 dark:border-white/10 rounded-md px-1.5 py-0.5 shadow-[0_1px_1px_rgba(0,0,0,0.06)]">
                Esc
              </kbd>
              <span>Close</span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-neutral-400 dark:text-neutral-500 text-[10.5px]">
            <span>{items.length} items</span>
            <span className="opacity-40">•</span>
            <SlidersHorizontal size={13} className="opacity-70 hover:opacity-100 transition" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default NewTabModal;
