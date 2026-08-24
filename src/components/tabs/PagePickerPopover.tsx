import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, X } from "lucide-react";
import type { Page } from "../../lib/supabaseService";
import type { WorkspaceTab } from "../../contexts/TabContext";
import { PageIcon } from "../PageIcon";

interface PagePickerPopoverProps {
  open: boolean;
  onClose: () => void;
  currentPageTitle: string;
  currentPageId: string;
  sourcePaneId?: string;
  pages: Page[];
  openTabs: WorkspaceTab[];
  onSelectPage: (pageId: string) => void;
  onCreateNewPage: () => void;
  anchorRect?: { top: number; left: number; bottom: number; right: number } | null;
}

export default function PagePickerPopover({
  open,
  onClose,
  currentPageTitle,
  currentPageId,
  pages,
  openTabs,
  onSelectPage,
  onCreateNewPage,
  anchorRect
}: PagePickerPopoverProps) {
  const [search, setSearch] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus search on open
  useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [open]);

  // Dismiss on outside click and Escape key
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  // 1. Open tabs (excluding current page and trashed pages)
  const openTabsPages = useMemo(() => {
    const pageTabIds = openTabs
      .filter((t) => t.type === "page" && t.targetId !== currentPageId)
      .map((t) => t.targetId);

    const uniqueIds = Array.from(new Set(pageTabIds));
    return uniqueIds
      .map((id) => pages.find((p) => p.id === id))
      .filter((p): p is Page => Boolean(p && !p.trashed));
  }, [openTabs, currentPageId, pages]);

  // 2. All pages (excluding current page and trashed pages) filtered by search
  const filteredPages = useMemo(() => {
    const term = search.trim().toLowerCase();
    return pages
      .filter((p) => !p.trashed && p.id !== currentPageId)
      .filter((p) => {
        if (!term) return true;
        const title = (p.title || "Untitled").toLowerCase();
        return title.includes(term);
      })
      .slice(0, 30);
  }, [pages, currentPageId, search]);

  if (!open) return null;

  // Compute position relative to anchor
  let style: React.CSSProperties = {
    top: anchorRect ? Math.min(anchorRect.bottom + 6, window.innerHeight - 380) : 38,
    left: anchorRect ? Math.max(8, Math.min(anchorRect.left - 40, window.innerWidth - 300)) : 100
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={popoverRef}
        initial={{ opacity: 0, y: -4, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.98 }}
        transition={{ duration: 0.12 }}
        className="fixed z-[70] w-[280px] max-h-[380px] flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl backdrop-blur-md overflow-hidden text-[12px]"
        style={style}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3 pb-2 border-b border-[var(--border)] bg-[var(--surface-2)]">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-[12.5px] text-[var(--text)] truncate pr-2">
              Split {currentPageTitle || "Untitled"}
            </h4>
            <button
              onClick={onClose}
              className="grid h-4 w-4 place-items-center rounded text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition cursor-pointer"
              title="Close"
            >
              <X size={11} />
            </button>
          </div>
          <p className="text-[11px] text-[var(--muted)] mt-0.5 leading-snug">
            Open a page beside {currentPageTitle || "Untitled"}
          </p>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto p-1.5 space-y-2 scrollbar-thin">
          {/* OPEN TABS Section (only if not actively searching and tabs exist) */}
          {!search && openTabsPages.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">
                Open Tabs
              </div>
              <div className="space-y-0.5">
                {openTabsPages.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => {
                      onSelectPage(page.id);
                      onClose();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] text-[var(--text)] hover:bg-[var(--hover)] transition-colors duration-100 cursor-pointer group"
                  >
                    <PageIcon icon={page.icon} size={13} fallback={<span>📄</span>} />
                    <span className="truncate flex-1 font-medium">{page.title || "Untitled"}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ALL PAGES Section with Search */}
          <div>
            <div className="px-2 py-1 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider flex items-center justify-between">
              <span>All Pages</span>
            </div>

            <div className="mb-1 flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1 focus-within:border-[var(--accent)] transition-colors">
              <Search size={11} className="text-[var(--muted)] shrink-0" />
              <input
                ref={inputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search pages..."
                className="w-full bg-transparent text-[11.5px] text-[var(--text)] placeholder-[var(--muted)] outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="grid h-3.5 w-3.5 place-items-center text-[var(--muted)] hover:text-[var(--text)]"
                >
                  <X size={10} />
                </button>
              )}
            </div>

            <div className="space-y-0.5 max-h-[160px] overflow-y-auto">
              {filteredPages.length === 0 ? (
                <div className="px-2 py-2 text-center text-[11px] text-[var(--muted)]">
                  {search ? "No matching pages found" : "No other pages in workspace"}
                </div>
              ) : (
                filteredPages.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => {
                      onSelectPage(page.id);
                      onClose();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] text-[var(--text)] hover:bg-[var(--hover)] transition-colors duration-100 cursor-pointer"
                  >
                    <PageIcon icon={page.icon} size={13} fallback={<span>📄</span>} />
                    <span className="truncate flex-1">{page.title || "Untitled"}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer: Create New Page */}
        <div className="p-1.5 border-t border-[var(--border)] bg-[var(--surface-2)]">
          <button
            onClick={() => {
              onCreateNewPage();
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] font-medium text-[var(--accent)] hover:bg-[var(--hover)] transition-colors duration-100 cursor-pointer"
          >
            <Plus size={13} strokeWidth={2.2} />
            <span>Create new page</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
