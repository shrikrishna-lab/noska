import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Page } from "../../../lib/supabaseService";
import type { NavigationTreeItem, LineNavigationRailProps, PagePreviewModel } from "./types";
import { buildNavigationTree, generatePagePreview } from "./previewExtractor";
import { PagePreviewCard } from "./PagePreviewCard";
import {
  ChevronRight,
  Heading1,
  Heading2,
  Heading3,
  Code2,
  Lightbulb,
  CheckSquare,
  Database,
  Sparkles,
  FileText,
  FolderTree,
  Crown,
  Layers
} from "lucide-react";

export function LineNavigationRail({
  pages,
  activeId,
  appView = "page",
  currentRoute,
  onSelectPage,
  onSelectView,
  className = "",
  collapsed = false,
  position = "left",
  sidebarOpen,
  offsetX,
}: LineNavigationRailProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<NavigationTreeItem | null>(null);
  const [anchorPos, setAnchorPos] = useState<{ top: number; left: number; right: number; height: number } | null>(null);
  const [activePreview, setActivePreview] = useState<PagePreviewModel | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const railRef = useRef<HTMLDivElement>(null);

  // Build the hierarchical navigation tree containing strictly the Active Page, its In-Page Content Sections, and its Child Sub-Pages
  const navigationTree = useMemo(() => {
    return buildNavigationTree(pages, activeId);
  }, [pages, activeId]);

  // Flatten tree recursively so all in-page content sections & child sub-pages are displayed cleanly
  const flattenedItems = useMemo(() => {
    const list: NavigationTreeItem[] = [];

    const traverse = (item: NavigationTreeItem) => {
      list.push(item);

      if (item.children && item.children.length > 0) {
        item.children.forEach((child) => {
          traverse(child);
        });
      }
    };

    navigationTree.forEach((root) => {
      traverse(root);
    });

    return list;
  }, [navigationTree]);

  // Handle opening preview with debounce delay
  const handleItemHover = useCallback((item: NavigationTreeItem, element: HTMLElement) => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);

    setHoveredId(item.id);
    setHoveredItem(item);

    const updateAnchor = () => {
      const lineEl = element.querySelector<HTMLElement>('[data-line-indicator="true"]') || element;
      const lineRect = lineEl.getBoundingClientRect();
      const rowRect = element.getBoundingClientRect();
      setAnchorPos({
        top: lineRect.top,
        left: lineRect.left,
        right: rowRect.right,
        height: lineRect.height,
      });
    };

    updateAnchor();

    // 90ms debounce to prevent flicker on rapid hover traversal
    hoverTimeoutRef.current = setTimeout(() => {
      updateAnchor();
      if (item.isContentSection && item.rawBlock && item.rawPage) {
        const preview = generatePagePreview(item.rawPage, pages, item.rawBlock);
        setActivePreview(preview);
      } else if (item.rawPage) {
        const preview = generatePagePreview(item.rawPage, pages);
        setActivePreview(preview);
      }
    }, 90);
  }, [pages]);

  // Handle closing preview with graceful exit delay
  const handleItemLeave = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);

    closeTimeoutRef.current = setTimeout(() => {
      setHoveredId(null);
      setHoveredItem(null);
      setActivePreview(null);
      setAnchorPos(null);
    }, 180);
  }, []);

  const handleCardMouseEnter = useCallback(() => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
  }, []);

  const handleCardMouseLeave = useCallback(() => {
    handleItemLeave();
  }, [handleItemLeave]);

  // Handle clicking an item: page navigation or in-page block jump
  const handleItemClick = useCallback((item: NavigationTreeItem) => {
    if (item.isContentSection && item.blockId) {
      const el = document.querySelector(`[data-block-id="${item.blockId}"]`) || document.getElementById(item.blockId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else {
      onSelectPage(item.id);
    }
    setHoveredId(null);
    setActivePreview(null);
  }, [onSelectPage]);

  // Keyboard navigation support
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (flattenedItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => {
        const next = prev < flattenedItems.length - 1 ? prev + 1 : 0;
        const item = flattenedItems[next];
        if (item?.isContentSection && item.rawBlock && item.rawPage) {
          setActivePreview(generatePagePreview(item.rawPage, pages, item.rawBlock));
        } else if (item?.rawPage) {
          setActivePreview(generatePagePreview(item.rawPage, pages));
        }
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => {
        const next = prev > 0 ? prev - 1 : flattenedItems.length - 1;
        const item = flattenedItems[next];
        if (item?.isContentSection && item.rawBlock && item.rawPage) {
          setActivePreview(generatePagePreview(item.rawPage, pages, item.rawBlock));
        } else if (item?.rawPage) {
          setActivePreview(generatePagePreview(item.rawPage, pages));
        }
        return next;
      });
    } else if (e.key === "Enter" && focusedIndex >= 0) {
      e.preventDefault();
      const item = flattenedItems[focusedIndex];
      if (item) handleItemClick(item);
    } else if (e.key === "Escape") {
      setHoveredId(null);
      setActivePreview(null);
      setFocusedIndex(-1);
    }
  }, [flattenedItems, focusedIndex, handleItemClick, pages]);

  // Only display outline ruler on document pages and AI workspace views
  const isEligibleView = !appView || appView === "page" || appView === "chats" || appView === "chat" || appView === "ai";
  if (!isEligibleView || navigationTree.length === 0) return null;

  const posX =
    offsetX !== undefined
      ? offsetX
      : sidebarOpen !== undefined
      ? sidebarOpen
        ? 276
        : 72
      : position === "left"
      ? 16
      : undefined;

  return (
    <motion.nav
      ref={railRef}
      role="navigation"
      aria-label="Content & Sub-page Line Navigation"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      animate={{
        left: posX,
        right: position === "right" ? 16 : undefined,
      }}
      transition={{ type: "spring", stiffness: 450, damping: 32 }}
      style={{
        position: "fixed",
        top: "50%",
        transform: "translateY(-50%)",
        maxHeight: "80vh",
      }}
      className={`z-40 select-none flex flex-col items-start focus:outline-none pointer-events-auto font-mono ${className}`}
    >
      {/* Minimal Scrollable Rail */}
      <div className="flex flex-col items-start gap-[3px] py-2 overflow-y-auto max-h-[75vh] scrollbar-none [mask-image:linear-gradient(to_bottom,transparent,black_12px,black_calc(100%-12px),transparent)]">
        {flattenedItems.map((item, idx) => {
          const isDirectActive = activeId === item.id;
          const isActive = isDirectActive && !item.isContentSection;
          const isHovered = hoveredId === item.id;
          const isFocused = focusedIndex === idx;
          const isChild = item.depth > 0;
          const isContent = item.isContentSection;

          // Minimal line widths & colors
          let lineWidth = 12;
          let lineBg = "rgb(160, 160, 165)"; // neutral resting

          if (isContent) {
            lineWidth = item.type === "heading" ? (item.depth === 1 ? 18 : 14) : 12;
            lineBg = isHovered || isFocused
              ? "rgb(56, 189, 248)"
              : "rgb(175, 175, 182)";
          } else if (item.isParentPage) {
            lineWidth = isHovered || isFocused ? 28 : 22;
            lineBg = isHovered || isFocused ? "rgb(129, 140, 248)" : "rgb(99, 102, 241)";
          } else {
            lineWidth = isHovered || isFocused ? 26 : (isChild ? 10 : 16);
            lineBg = isHovered || isFocused
              ? "rgb(20, 20, 25)"
              : isActive
              ? "rgb(50, 50, 55)"
              : isChild
              ? "rgb(180, 180, 188)"
              : "rgb(140, 140, 148)";
          }

          // Minimal icon
          let microIcon = "";
          if (item.type === "heading") microIcon = item.depth === 1 ? "H1" : item.depth === 2 ? "H2" : "H3";
          else if (item.type === "code") microIcon = "⌨";
          else if (item.type === "callout") microIcon = "💡";
          else if (item.type === "task") microIcon = "☑";
          else if (item.type === "database") microIcon = "⊞";
          else if (item.type === "ai") microIcon = "✦";

          return (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              onMouseEnter={(e) => handleItemHover(item, e.currentTarget)}
              onMouseLeave={handleItemLeave}
              aria-current={isActive && !isContent ? "page" : undefined}
              className={`group relative flex items-center h-[17px] cursor-pointer gap-2 transition-opacity ${
                isChild ? (item.depth === 1 ? "ml-2.5" : "ml-5") : ""
              }`}
            >
              {/* Minimal Line Indicator */}
              <motion.div
                layout
                data-line-indicator="true"
                animate={{
                  width: lineWidth,
                  backgroundColor: lineBg,
                  opacity: isActive || isHovered || isFocused || item.isParentPage ? 1 : isContent ? 0.7 : 0.5,
                }}
                transition={{ type: "spring", stiffness: 600, damping: 35 }}
                style={{
                  height: isChild ? 2 : 2.5,
                  borderRadius: 1.5,
                }}
                className="shrink-0"
              />

              {/* Clean, Minimal Revealed Label */}
              <AnimatePresence>
                {(isHovered || isFocused || (isActive && !isChild)) && (
                  <motion.div
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -4 }}
                    transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-center gap-1.5 whitespace-nowrap pointer-events-none"
                  >
                    {microIcon && (
                      <span className="text-[9.5px] font-mono opacity-60 text-neutral-500 dark:text-neutral-400">
                        {microIcon}
                      </span>
                    )}

                    <span
                      className={`text-[11.5px] tracking-tight font-medium ${
                        item.isParentPage
                          ? "text-indigo-600 dark:text-indigo-400 font-semibold"
                          : isActive && !isContent
                          ? "text-neutral-900 dark:text-white font-semibold"
                          : isContent
                          ? "text-neutral-500 dark:text-neutral-400 italic"
                          : "text-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      {item.title}
                    </span>

                    {/* Pagadi / Crown icon for Parent Page */}
                    {item.isParentPage && !isContent && (
                      <Crown size={12} className="text-amber-500 dark:text-amber-400 fill-amber-500/20 shrink-0" />
                    )}

                    {item.children.length > 0 && !isChild && (
                      <ChevronRight size={10} className="text-neutral-400 dark:text-neutral-500 shrink-0 opacity-60" />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* ─── REAL CONTENT & SECTION HOVER PREVIEW CARD ─── */}
      <AnimatePresence>
        {activePreview && anchorPos && (
          <PagePreviewCard
            preview={activePreview}
            anchorPosition={anchorPos}
            side={position}
            onSelectPage={(pageId) => {
              onSelectPage(pageId);
              setHoveredId(null);
              setActivePreview(null);
            }}
            onJumpToBlock={(blockId) => {
              const el = document.querySelector(`[data-block-id="${blockId}"]`) || document.getElementById(blockId);
              if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
              setHoveredId(null);
              setActivePreview(null);
            }}
            onMouseEnter={handleCardMouseEnter}
            onMouseLeave={handleCardMouseLeave}
          />
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

export default LineNavigationRail;
