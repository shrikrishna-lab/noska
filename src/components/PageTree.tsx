import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import type { ReactNode, RefObject, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext, DragOverlay, closestCenter,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown, ChevronRight, Link2, Copy, ArchiveRestore, Lock, Star,
  Plus, MoreHorizontal, Sparkles, Eye, GripVertical,
  Columns, ArrowRight, ArrowLeft, ArrowUp, ArrowDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { FloatingMenu } from './ui';
import { HoverMarqueeText } from './ui/HoverMarqueeText';
import { useTabs } from '../contexts/TabContext';
import {
  AnimatedBookmark, AnimatedTrash,
  AnimatedSend, AnimatedUpload, AnimatedDownload, AnimatedCanvas,
  AnimatedSidebar,
} from './ui/icons';
import { emojis } from '../utils/helpers';
import { isPageEntity } from '../utils/pageTreeOps';
import type { Page } from '../lib/supabaseService';
import {
  getAncestorPath, flattenTreeFromContent,
  getDescendantIdsFromContent, smartDepthOpacity,
} from '../core/tree/TreeEngine';
import type { FlattenedPage } from '../core/tree/TreeEngine';
import { PageIcon } from './PageIcon';


/** Builds a real /<workspace-slug>/<pageId> URL by swapping the page-id
 * segment of the current path — App.jsx's URL-sync effect keeps the
 * workspace-slug segment accurate, so this stays correct without needing to
 * thread workspaceName through the whole tree. */
function pageUrl(pageId: string): string {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const slug = parts[0] || 'workspace';
  return `${window.location.origin}/${slug}/${pageId}`;
}

/** Options bag passed to onSelect — mirrors the real shapes read at every
 * call site (altKey/shiftKey from click modifiers, sidePeek from the
 * peek-preview and side-peek menu actions). `openInNewTab` is set when the
 * user Ctrl/Cmd+clicks or middle-clicks a sidebar page, mirroring how
 * browser tabs (and Notion) treat those gestures. */
export interface PageSelectOptions {
  altKey?: boolean;
  shiftKey?: boolean;
  sidePeek?: boolean;
  openInNewTab?: boolean;
}

type OnSelect = (pageId: string, options?: PageSelectOptions) => void;
type OnPatchPage = (pageId: string, patch: Partial<Page>) => void;
type OnPageIdAction = (pageId: string) => void;

/** Build PageSelectOptions from a mouse event. Follows Notion's navigation
 * philosophy: plain click navigates the active tab, Ctrl/Cmd+Click and
 * middle-click open a new tab, Alt+Click side-peeks. */
export function selectOptionsFromEvent(e: { altKey: boolean; metaKey: boolean; shiftKey: boolean; ctrlKey: boolean; button?: number }): PageSelectOptions {
  const openInNewTab = e.button === 1 || e.ctrlKey || e.metaKey;
  return {
    altKey: !openInNewTab && e.altKey,
    shiftKey: e.shiftKey,
    openInNewTab,
  };
}

interface TreeSvgConnectorProps {
  depth: number;
  isLastChild?: boolean;
  ancestorHasMore?: boolean[];
}

function TreeSvgConnector({ depth, isLastChild, ancestorHasMore }: TreeSvgConnectorProps) {
  if (depth <= 0) return null;
  return (
    <div
      className="pointer-events-none absolute left-0 top-0 bottom-0 z-0 select-none text-neutral-300 dark:text-neutral-700/70"
      style={{ width: depth * 16 + 10 }}
    >
      {/* Ancestor straight vertical pass-through lines */}
      {ancestorHasMore?.map((hasMore, d) => {
        if (!hasMore || d >= depth - 1) return null;
        return (
          <svg
            key={d}
            aria-hidden="true"
            width="12"
            height="100%"
            className="absolute top-0"
            style={{ left: d * 16 + 10 }}
          >
            <line x1="0.5" y1="0" x2="0.5" y2="1000" stroke="currentColor" strokeWidth="1" />
          </svg>
        );
      })}

      {/* Immediate parent curved branch into this child node */}
      <svg
        aria-hidden="true"
        width="16"
        height="100%"
        className="absolute top-0"
        style={{ left: (depth - 1) * 16 + 10 }}
      >
        <path
          d={
            isLastChild
              ? "M0.5 0 V11 Q0.5 16 5.5 16 H14"
              : "M0.5 0 V11 Q0.5 16 5.5 16 H14 M0.5 16 V1000"
          }
          stroke="currentColor"
          strokeWidth="1"
          fill="none"
        />
      </svg>
    </div>
  );
}

// `icon` is used interchangeably with real LucideIcon components (Link2,
// Copy, ArchiveRestore) and this codebase's custom AnimatedX icon
// components (AnimatedBookmark, AnimatedTrash, etc. — see
// src/components/ui/icons/index.tsx), which share the same size/className
// prop shape as LucideIcon but aren't LucideIcon instances themselves.
type MenuActionIcon = LucideIcon | ((props: { size?: number; className?: string }) => React.JSX.Element);

interface PageMenuActionProps {
  icon: MenuActionIcon;
  label: string;
  shortcut?: string;
  right?: ReactNode;
  muted?: boolean;
  onClick: () => void;
}

function PageMenuAction({ icon: Icon, label, shortcut, right, muted, onClick }: PageMenuActionProps) {
  return (
    <button
      onClick={onClick}
      className={`flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-left text-[13px] hover:bg-[var(--hover)] ${muted ? 'text-[var(--secondary)]' : 'text-[var(--text)]'}`}
    >
      <Icon size={15} className="text-[var(--secondary)]" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {shortcut && <span className="text-[10px] text-[var(--muted)]">{shortcut}</span>}
      {right}
    </button>
  );
}

// Shared handler props threaded down through tree items
interface TreeHandlerProps {
  onToggleCollapse?: OnPageIdAction;
  onSelect: OnSelect;
  onAddInside?: OnPageIdAction;
  onPatchPage: OnPatchPage;
  onDuplicatePage?: OnPageIdAction;
  onRenamePage?: OnPageIdAction;
  onTrashPage?: OnPageIdAction;
  onCopyLink?: OnPageIdAction;
  onRemoveFromRecents?: OnPageIdAction;
  onToggleOffline?: OnPageIdAction;
  onToast?: (message: string) => void;
}

interface PremiumPageItemProps extends TreeHandlerProps {
  page: Page;
  active: boolean;
  selected: boolean;
  hasChildren: boolean;
  expanded: boolean;
  depth: number;
  isLastChild?: boolean;
  ancestorHasMore?: boolean[];
  ancestors: string[];
  allBlocks: Page[];
  collapsedPages: Set<string>;
  activeId: string | null;
}

function PremiumPageItemBase({
  page, active, selected, hasChildren, expanded,
  depth, isLastChild, ancestorHasMore, ancestors, onToggleCollapse, onSelect, onPatchPage,
  onAddInside, allBlocks, collapsedPages, activeId,
  onDuplicatePage, onRenamePage, onTrashPage, onCopyLink,
  onRemoveFromRecents, onToggleOffline, onToast,
}: PremiumPageItemProps) {
  const { splitPage } = useTabs();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [actionsExpanded, setActionsExpanded] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const isAncestor = ancestors?.includes(page.id);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        if (!menuOpen) setActionsExpanded(false);
      }}
      className="relative select-none"
    >
      <div
        data-page-id={page.id}
        role="treeitem"
        aria-expanded={hasChildren ? expanded : undefined}
        aria-level={depth + 1}
        aria-selected={active}
        className={`group relative flex items-center justify-between min-h-[34px] h-[34px] py-1.5 rounded-lg transition-all duration-150 cursor-pointer select-none ${active
          ? 'text-neutral-900 dark:text-white font-medium bg-black/[0.055] dark:bg-white/[0.08] border border-black/[0.03] dark:border-white/[0.06] shadow-2xs'
          : 'text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-black/[0.035] dark:hover:bg-white/[0.05]'
          }`}
        style={{
          paddingLeft: depth === 0 ? 8 : depth * 12 + 8,
          paddingRight: 8,
        }}
        onClick={(e) => {
          onSelect(page.id, selectOptionsFromEvent(e));
        }}
        onAuxClick={(e) => {
          if (e.button !== 1) return;
          e.preventDefault();
          onSelect(page.id, selectOptionsFromEvent(e));
        }}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(true); }}
      >
        {/* Active ancestry subtle highlight */}
        {isAncestor && !active && (
          <div
            className="absolute inset-0 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] z-0 pointer-events-none"
          />
        )}

        {/* SVG Curved Branching Tree Connectors */}
        <TreeSvgConnector
          depth={depth}
          isLastChild={isLastChild}
          ancestorHasMore={ancestorHasMore}
        />

        {/* Left Content: Icon + Title */}
        <div className="flex min-w-0 flex-1 items-center gap-2 z-10 mr-1">
          {/* Page Icon button */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            className="grid h-4.5 w-4 shrink-0 place-items-center text-[11.5px] cursor-pointer z-10"
            onClick={(e) => {
              e.stopPropagation();
              onPatchPage(page.id, {
                icon: emojis[(emojis.indexOf(page.icon) + 1) % emojis.length],
              });
            }}
            title="Change icon"
          >
            <PageIcon icon={page.icon} size={13.5} fallback={<span className="text-[11.5px] leading-none">📄</span>} />
          </motion.button>

          {/* Title */}
          <HoverMarqueeText
            text={page.title || 'Untitled'}
            isHovered={isHovered}
            className={`text-[11.5px] leading-tight ${active ? 'font-medium text-neutral-900 dark:text-white' : 'font-normal text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white'}`}
          />
          {page.favorite && <Star size={8} className="text-amber-500 shrink-0 inline fill-amber-500 ml-0.5" />}
          {page.isEncrypted && <Lock size={8} className="text-neutral-400 shrink-0 inline ml-0.5" />}
        </div>

        {/* Right Content: Expand/Collapse Chevron */}
        <div className="relative z-10 flex items-center shrink-0">
          {hasChildren && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse?.(page.id);
              }}
              className="grid h-6 w-6 place-items-center rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
              title={expanded ? 'Collapse' : 'Expand'}
            >
              <ChevronRight
                size={13}
                className={`transition-transform duration-200 ${expanded ? 'rotate-90 text-neutral-700 dark:text-neutral-200' : 'text-neutral-400'
                  }`}
              />
            </button>
          )}
        </div>

        {/* Floating Hover Action Toolbar — shows single icon on hover, expands to full action pill on click */}
        <AnimatePresence>
          {(isHovered || menuOpen || actionsExpanded) && (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 480, damping: 28 }}
              className="absolute right-1 top-1/2 -translate-y-1/2 z-20 flex items-center"
              onClick={(e) => e.stopPropagation()}
            >
              {!actionsExpanded && !menuOpen ? (
                /* 1. Single Clean Action Trigger Icon */
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActionsExpanded(true);
                  }}
                  className="grid h-5 w-5 place-items-center rounded-md bg-neutral-100/90 dark:bg-neutral-800/90 border border-black/5 dark:border-white/10 text-neutral-500 hover:text-neutral-900 dark:hover:text-white shadow-xs backdrop-blur-sm transition-all cursor-pointer hover:scale-105"
                  title="Page actions (+, options, favorite, peek)"
                >
                  <MoreHorizontal size={12} />
                </button>
              ) : (
                /* 2. Expanded Multi-Action Toolbar */
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.92, x: 4 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.92, x: 4 }}
                  transition={{ type: "spring", stiffness: 450, damping: 26 }}
                  className="flex items-center gap-0.5 rounded-lg bg-neutral-100/95 dark:bg-neutral-800/95 border border-black/5 dark:border-white/10 px-1 py-0.5 shadow-sm backdrop-blur-sm"
                >
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onAddInside?.(page.id); }}
                    className="grid h-5 w-5 place-items-center rounded hover:bg-black/5 dark:hover:bg-white/10 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                    title="Add page inside"
                  >
                    <Plus size={12} />
                  </button>
                  <button
                    ref={menuButtonRef}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(true); }}
                    className="grid h-5 w-5 place-items-center rounded hover:bg-black/5 dark:hover:bg-white/10 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                    title="Page options"
                  >
                    <MoreHorizontal size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onPatchPage(page.id, { favorite: !page.favorite }); }}
                    className={`grid h-5 w-5 place-items-center rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer ${page.favorite ? 'text-amber-500' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
                    title={page.favorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Star size={12} className={page.favorite ? 'fill-amber-500' : ''} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onSelect(page.id, { sidePeek: true }); }}
                    className="grid h-5 w-5 place-items-center rounded hover:bg-black/5 dark:hover:bg-white/10 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                    title="Side peek"
                  >
                    <Eye size={12} />
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Menu */}
        <FloatingMenu open={menuOpen} anchorRef={menuButtonRef} onClose={() => setMenuOpen(false)}>
          <div className="px-2 pb-2 text-xs font-semibold text-[var(--secondary)]">Page</div>
          <PageMenuAction
            icon={AnimatedBookmark}
            label={page.favorite ? 'Remove from Favorites' : 'Add to Favorites'}
            onClick={() => { onPatchPage(page.id, { favorite: !page.favorite }); setMenuOpen(false); }}
          />
          <PageMenuAction
            icon={ArchiveRestore}
            label="Remove from Recents"
            muted
            onClick={() => { onRemoveFromRecents?.(page.id); setMenuOpen(false); }}
          />
          <div className="my-2 border-t border-[var(--border)]" />
          <PageMenuAction
            icon={AnimatedDownload}
            label="Available offline"
            onClick={() => { onToggleOffline?.(page.id); setMenuOpen(false); }}
            right={
              <span className={`flex h-6 w-10 items-center rounded-full p-0.5 transition ${page.offline ? 'bg-[var(--accent)] justify-end' : 'bg-[var(--toggle)] justify-start'}`}>
                <span className="h-5 w-5 rounded-full bg-[var(--surface-2)]" />
              </span>
            }
          />
          <div className="my-2 border-t border-[var(--border)]" />
          <PageMenuAction icon={Link2} label="Copy link" onClick={() => { onCopyLink?.(page.id); setMenuOpen(false); }} />
          <PageMenuAction icon={Copy} label="Duplicate" shortcut="Ctrl+D" onClick={() => { onDuplicatePage?.(page.id); setMenuOpen(false); }} />
          <PageMenuAction icon={AnimatedSend} label="Rename" shortcut="Ctrl+Shift+R" onClick={() => { onRenamePage?.(page.id); setMenuOpen(false); }} />
          <PageMenuAction icon={AnimatedUpload} label="Move to" shortcut="Ctrl+Shift+P" onClick={() => { onToast?.("Move to is not yet implemented"); setMenuOpen(false); }} />
          <PageMenuAction icon={AnimatedTrash} label="Move to Trash" onClick={() => { onTrashPage?.(page.id); setMenuOpen(false); }} />
          <div className="my-2 border-t border-[var(--border)]" />
          <PageMenuAction icon={AnimatedUpload} label="Open in new tab" shortcut="Ctrl+Click" onClick={() => { onSelect(page.id, { openInNewTab: true }); setMenuOpen(false); }} />
          <PageMenuAction icon={AnimatedCanvas} label="Open in new window" onClick={() => { window.open(pageUrl(page.id), '_blank', 'width=1200,height=800'); setMenuOpen(false); }} />
          <PageMenuAction icon={AnimatedSidebar} label="Open in side peek" shortcut="Alt+Click" onClick={() => { onSelect?.(page.id, { sidePeek: true }); setMenuOpen(false); }} />

          {/* Split Actions */}
          <div className="my-2 border-t border-[var(--border)]" />
          <div className="px-2 py-0.5 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">
            Split
          </div>
          <PageMenuAction icon={ArrowRight} label="Split right" onClick={() => { splitPage({ pageId: page.id, direction: 'right' }); setMenuOpen(false); }} />
          <PageMenuAction icon={ArrowLeft} label="Split left" onClick={() => { splitPage({ pageId: page.id, direction: 'left' }); setMenuOpen(false); }} />
          <PageMenuAction icon={ArrowUp} label="Split above" onClick={() => { splitPage({ pageId: page.id, direction: 'above' }); setMenuOpen(false); }} />
          <PageMenuAction icon={ArrowDown} label="Split below" onClick={() => { splitPage({ pageId: page.id, direction: 'below' }); setMenuOpen(false); }} />
        </FloatingMenu>
      </div>
    </div>
  );
}
const PremiumPageItem = React.memo(PremiumPageItemBase);

interface SortablePremiumItemProps extends PremiumPageItemProps {
  id: string;
  focused?: boolean;
}

function SortablePremiumItem({ id, focused, ...props }: SortablePremiumItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 200ms cubic-bezier(0.2, 0, 0, 1), opacity 200ms ease",
    opacity: isDragging ? 0.35 : 1,
    position: 'relative',
    zIndex: isDragging ? 20 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div {...listeners} className="cursor-grab active:cursor-grabbing select-none transition-transform duration-150 active:scale-[0.99]">
        <PremiumPageItem {...props} />
      </div>
    </div>
  );
}

interface DragGhostProps {
  page: Page;
  depth: number;
}

function DragGhost({ page, depth }: DragGhostProps) {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0, y: 4 }}
      animate={{ scale: 1.03, opacity: 1, y: 0 }}
      exit={{ scale: 0.95, opacity: 0 }}
      transition={{ type: "spring", stiffness: 450, damping: 28 }}
      className="flex min-h-[30px] items-center gap-2 rounded-lg bg-[var(--surface-2)] border border-[var(--accent)] shadow-2xl px-3 py-1.5 text-[12px] text-[var(--text)] font-semibold backdrop-blur-md z-50 cursor-grabbing pointer-events-none"
    >
      <GripVertical size={11} className="text-[var(--accent)] shrink-0" />
      <div style={{ width: depth * 14 }} className="shrink-0" />
      <PageIcon icon={page.icon} size={14} fallback={<span className="text-[12px] leading-none">📄</span>} />
      <span className="truncate max-w-[200px]">{page.title || 'Untitled'}</span>
    </motion.div>
  );
}

export interface PageTreeProps extends TreeHandlerProps {
  content: string[];
  allBlocks: Page[];
  activeId: string | null;
  collapsedPages: Set<string>;
  onMovePage?: (pageId: string, newParentId: string | null, orderedSiblingIds: string[]) => void;
  emptyMessage?: string;
}

export default function PageTree({
  content, allBlocks, activeId, collapsedPages, onToggleCollapse, onSelect,
  onPatchPage, onMovePage, onDuplicatePage, onAddInside, onRenamePage,
  onRemoveFromRecents, onToggleOffline, onCopyLink, onTrashPage, onToast,
  emptyMessage = 'No pages yet',
}: PageTreeProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const treeRef = useRef<HTMLDivElement>(null);
  // `density`/`setDensity` state exists but is never read anywhere in this
  // file's JSX (pre-existing dead state, not introduced by this
  // conversion — confirmed via grep, preserved as-is).
  const [density, setDensity] = useState('comfortable');

  const ancestorIds: string[] = useMemo(() => {
    if (!activeId) return [];
    const ancestors = getAncestorPath(activeId, allBlocks);
    return ancestors.slice(0, -1).map(a => a.id);
  }, [activeId, allBlocks]);

  const visibleItems: FlattenedPage[] = useMemo(
    () => flattenTreeFromContent(content, allBlocks, collapsedPages),
    [content, allBlocks, collapsedPages]
  );

  const visibleIds: string[] = useMemo(() => visibleItems.map(p => p.id), [visibleItems]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
        tolerance: 5,
      }
    })
  );

  const handleSelect = useCallback((pageId: string, options: PageSelectOptions = {}) => {
    if (options.shiftKey && options.altKey) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(pageId)) next.delete(pageId);
        else next.add(pageId);
        return next;
      });
      onSelect(pageId, { altKey: false });
    } else {
      setSelectedIds(new Set());
      onSelect(pageId, options);
    }
  }, [onSelect]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const oldIndex = visibleIds.indexOf(activeIdStr);
    const newIndex = visibleIds.indexOf(overIdStr);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedIds = arrayMove(visibleIds, oldIndex, newIndex);
    const draggedPage = visibleItems[oldIndex];
    const targetPage = visibleItems[newIndex];

    let newParentId = targetPage.parentId;
    if (newIndex <= oldIndex) {
      newParentId = targetPage._depth <= draggedPage._depth ? targetPage.parentId : targetPage.id;
    } else {
      newParentId = targetPage._depth < draggedPage._depth ? targetPage.parentId : targetPage.id;
    }
    if (getDescendantIdsFromContent(activeIdStr, allBlocks).includes(targetPage?.id)) {
      return;
    }
    if (onMovePage) {
      const orderedSiblingIds = reorderedIds.filter((id) => {
        if (id === activeIdStr) return true;
        const page = visibleItems.find(p => p.id === id);
        return page && (page.parentId || null) === (newParentId || null);
      });
      onMovePage(activeIdStr, newParentId || null, orderedSiblingIds);
      return;
    }
    if (draggedPage.parentId !== newParentId) {
      onPatchPage(activeIdStr, { parentId: newParentId });
    }
    reorderedIds.forEach((id, idx) => {
      const page = visibleItems.find(p => p.id === id);
      if (page && (page.parentId || null) === (newParentId || null)) {
        // Real gap found here, preserved as-is (not a migration bug):
        // `sortOrder` is not a field on `Page` (grepped types/blocks.ts and
        // supabaseService.ts's Page interface) — this patch has always
        // been a no-op write of an untracked field, same category as the
        // other "field exists in code, not in the DB/type" gaps already
        // documented elsewhere in this migration (content, fontStyle,
        // etc.). Cast narrowly here rather than widening Page for a field
        // nothing else reads.
        onPatchPage(id, { sortOrder: idx } as unknown as Partial<Page>);
      }
    });
  }, [visibleIds, visibleItems, allBlocks, onPatchPage, onMovePage]);

  const activeDragPage = useMemo(
    () => visibleItems.find(p => p.id === activeDragId) || null,
    [visibleItems, activeDragId]
  );

  const handleTreeKeyDown = useCallback((e: ReactKeyboardEvent) => {
    if (visibleItems.length === 0) return;
    const idx = focusedIndex === -1 ? visibleItems.findIndex(p => p.id === activeId) : focusedIndex;
    const safeIdx = idx === -1 ? 0 : idx;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(Math.min(safeIdx + 1, visibleItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(Math.max(safeIdx - 1, 0));
        break;
      case 'ArrowRight':
        e.preventDefault(); {
          const page = visibleItems[safeIdx];
          if (page._hasChildren && collapsedPages.has(page.id)) {
            onToggleCollapse?.(page.id);
          }
          onSelect(page.id, {});
        }
        break;
      case 'ArrowLeft':
        e.preventDefault(); {
          const page = visibleItems[safeIdx];
          if (page._hasChildren && !collapsedPages.has(page.id)) {
            onToggleCollapse?.(page.id);
          }
        }
        break;
      case 'Enter':
        e.preventDefault(); {
          const page = visibleItems[safeIdx];
          onSelect(page.id, {});
        }
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(visibleItems.length - 1);
        break;
    }
  }, [visibleItems, focusedIndex, activeId, collapsedPages, onToggleCollapse, onSelect]);

  useEffect(() => {
    if (focusedIndex === -1 || !treeRef.current) return;
    const focusedId = visibleItems[focusedIndex]?.id;
    if (!focusedId) return;
    const el = treeRef.current.querySelector(`[data-page-id="${focusedId}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex, visibleItems]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={visibleIds} strategy={verticalListSortingStrategy}>
        <div
          ref={treeRef}
          role="tree"
          tabIndex={0}
          onKeyDown={handleTreeKeyDown}
          onFocus={() => {
            if (focusedIndex === -1) {
              const idx = visibleItems.findIndex(p => p.id === activeId);
              setFocusedIndex(idx === -1 ? 0 : idx);
            }
          }}
          className="space-y-px outline-none"
        >
          {visibleItems.length === 0 && (
            <div className="px-2 py-1 text-[10px] text-[var(--muted)] italic">{emptyMessage}</div>
          )}
          {visibleItems.map((page, vi) => {
            const isLastChild = (() => {
              if (page._depth === 0) return false;
              for (let j = vi + 1; j < visibleItems.length; j++) {
                if (visibleItems[j]._depth < page._depth) return true;
                if (visibleItems[j]._depth === page._depth) return false;
              }
              return true;
            })();

            const ancestorHasMore = (() => {
              const res: boolean[] = [];
              for (let d = 0; d < page._depth - 1; d++) {
                let hasMore = false;
                for (let j = vi + 1; j < visibleItems.length; j++) {
                  if (visibleItems[j]._depth < d + 1) break;
                  if (visibleItems[j]._depth === d + 1) {
                    hasMore = true;
                    break;
                  }
                }
                res.push(hasMore);
              }
              return res;
            })();

            return (
              <SortablePremiumItem
                key={page.id}
                id={page.id}
                page={page}
                active={page.id === activeId}
                selected={selectedIds.has(page.id)}
                focused={vi === focusedIndex}
                hasChildren={page._hasChildren}
                expanded={!collapsedPages.has(page.id)}
                depth={page._depth}
                isLastChild={isLastChild}
                ancestorHasMore={ancestorHasMore}
                ancestors={ancestorIds}
                onToggleCollapse={onToggleCollapse}
                onSelect={handleSelect}
                onPatchPage={onPatchPage}
                onDuplicatePage={onDuplicatePage}
                onAddInside={onAddInside}
                onRenamePage={onRenamePage}
                onRemoveFromRecents={onRemoveFromRecents}
                onToggleOffline={onToggleOffline}
                onCopyLink={onCopyLink}
                onTrashPage={onTrashPage}
                onToast={onToast}
                allBlocks={allBlocks}
                collapsedPages={collapsedPages}
                activeId={activeId}
              />
            );
          })}
        </div>
      </SortableContext>
      {createPortal(
        <DragOverlay dropAnimation={null}>
          {activeDragPage ? <DragGhost page={activeDragPage} depth={activeDragPage._depth} /> : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
}
