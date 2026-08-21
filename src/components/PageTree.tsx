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
  ChevronDown, Link2, Copy, ArchiveRestore, Lock, Star,
  Plus, MoreHorizontal, Sparkles, Eye, GripVertical,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { FloatingMenu } from './ui';
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

interface TreeConnectorProps {
  depth: number;
  activePath: boolean | undefined;
  hoverPath: boolean | undefined;
  depthLevel: number;
}

function TreeConnector({ depth, activePath, hoverPath, depthLevel }: TreeConnectorProps) {
  const opacity = activePath ? 0.6 : hoverPath ? 0.4 : smartDepthOpacity(depthLevel);
  const color = activePath ? 'var(--accent)' : hoverPath ? 'var(--text)' : 'var(--border)';
  if (depth <= 0) return null;
  const segments = [];
  for (let d = 0; d < depth; d++) {
    // Real pre-existing quirk, preserved exactly: both call sites pass a
    // plain boolean for activePath/hoverPath (`active`, `isHovered ||
    // parentHovered`), not an array — so the original JS's
    // `d < activePath.length` was really `d < undefined`, which is always
    // `false`. isActive/isHover here were therefore always false at
    // runtime; only the top-level opacity/color ternary above the loop
    // ever had any visual effect. Replicating that exact always-false
    // result explicitly rather than guessing this was meant to check
    // array membership (which would change the rendered look).
    const isActive = false;
    const isHover = false;
    const segOpacity = isActive ? 0.6 : isHover ? 0.4 : smartDepthOpacity(d);
    const segColor = isActive ? 'var(--accent)' : isHover ? 'var(--text)' : 'var(--border)';
    segments.push(
      <motion.div
        key={d}
        initial={{ opacity: 0, scaleY: 0 }}
        animate={{ opacity: segOpacity, scaleY: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25, delay: d * 0.02 }}
        className="absolute left-0 top-0 w-px origin-top"
        style={{
          left: d * 14 + 7,
          height: '100%',
          backgroundColor: segColor,
          opacity: segOpacity,
          borderRadius: 1,
        }}
      />
    );
  }
  return <>{segments}</>;
}

interface TreeBranchProps {
  children: ReactNode;
  depth: number;
  isLast: boolean;
  expanded: boolean;
  animateHeight: boolean;
}

function TreeBranch({ children, depth, isLast, expanded, animateHeight }: TreeBranchProps) {
  return (
    <AnimatePresence initial={false}>
      {expanded && (
        <motion.div
          initial={animateHeight ? { height: 0, opacity: 0 } : false}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28, mass: 0.8 }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface HoverToolbarProps {
  onAddInside?: () => void;
  onMenu?: () => void;
  onFavorite?: () => void;
  onAI?: () => void;
  onPeek?: () => void;
  isFavorite?: boolean;
  isHovered: boolean;
}

function HoverToolbar({ onAddInside, onMenu, onFavorite, onAI, onPeek, isFavorite, isHovered }: HoverToolbarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : 8 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="flex items-center gap-0.5 mr-1 z-20"
    >
      <button
        onClick={(e) => { e.stopPropagation(); onAddInside?.(); }}
        className="grid h-5 w-5 place-items-center rounded-md hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] cursor-pointer transition-colors"
        title="Add page inside"
      >
        <Plus size={11} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onMenu?.(); }}
        className="grid h-5 w-5 place-items-center rounded-md hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] cursor-pointer transition-colors"
        title="Page options"
      >
        <MoreHorizontal size={11} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onFavorite?.(); }}
        className={`grid h-5 w-5 place-items-center rounded-md hover:bg-[var(--hover)] cursor-pointer transition-colors ${isFavorite ? 'text-[var(--accent)]' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Star size={11} className={isFavorite ? 'fill-[var(--accent)]' : ''} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onAI?.(); }}
        className="grid h-5 w-5 place-items-center rounded-md hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] cursor-pointer transition-colors"
        title="AI actions"
      >
        <Sparkles size={11} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onPeek?.(); }}
        className="grid h-5 w-5 place-items-center rounded-md hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] cursor-pointer transition-colors"
        title="Peek preview"
      >
        <Eye size={11} />
      </button>
    </motion.div>
  );
}

// `icon` is used interchangeably with real LucideIcon components (Link2,
// Copy, ArchiveRestore) and this codebase's custom AnimatedX icon
// components (AnimatedBookmark, AnimatedTrash, etc. — see
// src/components/ui/icons/index.tsx), which share the same size/className
// prop shape as LucideIcon but aren't LucideIcon instances themselves.
type MenuActionIcon = LucideIcon | ((props: { size?: number; className?: string }) => JSX.Element);

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

// Shared handler props threaded down through every tree-item level —
// PremiumBranch, PremiumPageItem, and BranchExpanded all take the same set.
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

interface BranchExpandedProps extends TreeHandlerProps {
  page: Page;
  allBlocks: Page[];
  activeId: string | null;
  collapsedPages: Set<string>;
}

function BranchExpanded({ page, allBlocks, activeId, collapsedPages, onToggleCollapse, onSelect, onAddInside, onPatchPage, onDuplicatePage, onRenamePage, onTrashPage, onCopyLink, onRemoveFromRecents, onToggleOffline, onToast }: BranchExpandedProps) {
  const [childHoverId, setChildHoverId] = useState<string | null>(null);
  if (!collapsedPages.has(page.id) && page.content?.length) {
    const children = page.content.filter(id => isPageEntity(allBlocks.find(b => b.id === id)));
    if (children.length === 0) return null;
    return (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="relative"
        onMouseEnter={() => setChildHoverId(page.id)}
        onMouseLeave={() => setChildHoverId(null)}
      >
        {children.map((childId, ci) => {
          const childPage = allBlocks.find(b => b.id === childId);
          if (!childPage) return null;
          const grandChildren = childPage.content?.filter(id => isPageEntity(allBlocks.find(b => b.id === id))) || [];
          return (
            <div key={childPage.id} className="relative">
              <PremiumBranch
                page={childPage}
                depth={1}
                active={childPage.id === activeId}
                hasChildren={grandChildren.length > 0}
                expanded={!collapsedPages.has(childPage.id)}
                onToggleCollapse={onToggleCollapse}
                onSelect={onSelect}
                onAddInside={onAddInside}
                onPatchPage={onPatchPage}
                onDuplicatePage={onDuplicatePage}
                onRenamePage={onRenamePage}
                onTrashPage={onTrashPage}
                onCopyLink={onCopyLink}
                onRemoveFromRecents={onRemoveFromRecents}
                onToggleOffline={onToggleOffline}
                onToast={onToast}
                parentHovered={childHoverId === page.id}
              />
            </div>
          );
        })}
      </motion.div>
    );
  }
  return null;
}

interface PremiumBranchProps extends TreeHandlerProps {
  page: Page;
  depth: number;
  active: boolean;
  hasChildren: boolean;
  expanded: boolean;
  parentHovered: boolean;
}

function PremiumBranch({
  page, depth, active, hasChildren, expanded, onToggleCollapse,
  onSelect, onAddInside, onPatchPage, parentHovered,
  onDuplicatePage, onRenamePage, onTrashPage, onCopyLink,
  onRemoveFromRecents, onToggleOffline, onToast,
}: PremiumBranchProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback((e: ReactMouseEvent) => {
    onSelect(page.id, selectOptionsFromEvent(e));
  }, [page.id, onSelect]);

  const handleAuxClick = useCallback((e: ReactMouseEvent) => {
    if (e.button !== 1) return;
    e.preventDefault();
    onSelect(page.id, selectOptionsFromEvent(e));
  }, [page.id, onSelect]);

  return (
    <div
      data-page-id={page.id}
      className={`group relative flex items-center min-h-[30px] rounded-lg transition-all duration-150 cursor-pointer select-none ${
        active
          ? 'text-[var(--text)] font-semibold'
          : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
      }`}
      style={{ paddingLeft: depth * 14 + 8, paddingRight: 4 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      onAuxClick={handleAuxClick}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(true); }}
    >
      <TreeConnector
        depth={depth}
        activePath={active}
        hoverPath={isHovered || parentHovered}
        depthLevel={depth}
      />

      {/* Chevron */}
      <div className="z-10 flex items-center shrink-0" style={{ marginLeft: -depth * 14 }}>
        {hasChildren ? (
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="grid h-5 w-5 shrink-0 place-items-center rounded text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] z-10 cursor-pointer transition-colors"
            onClick={(e) => { e.stopPropagation(); onToggleCollapse?.(page.id); }}
          >
            <motion.div
              animate={{ rotate: expanded ? 0 : -90 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            >
              <ChevronDown size={11} />
            </motion.div>
          </motion.button>
        ) : (
          <div className="w-5 h-5 shrink-0" />
        )}
      </div>

      {/* Icon */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        className="grid h-5 w-[18px] shrink-0 place-items-center text-[13px] cursor-pointer z-10"
        onClick={(e) => {
          e.stopPropagation();
          onPatchPage(page.id, { icon: emojis[(emojis.indexOf(page.icon) + 1) % emojis.length] });
        }}
      >
        <PageIcon icon={page.icon} size={14} fallback={<span className="text-[12px] leading-none">📄</span>} />
      </motion.button>

      {/* Title */}
      <div className="flex min-w-0 flex-1 items-center gap-1 z-10 pl-0.5">
        <span className={`truncate text-[12.5px] ${active ? 'font-semibold' : 'font-normal'}`}>
          {page.title || 'Untitled'}
        </span>
        {page.favorite && <Star size={8} className="text-[var(--accent)] shrink-0 inline fill-[var(--accent)] ml-0.5" />}
        {page.isEncrypted && <Lock size={9} className="text-[var(--secondary)] shrink-0 inline ml-0.5" />}
      </div>

      {/* Hover Toolbar */}
      <HoverToolbar
        onAddInside={() => onAddInside?.(page.id)}
        onMenu={() => setMenuOpen(true)}
        onFavorite={() => onPatchPage(page.id, { favorite: !page.favorite })}
        isFavorite={page.favorite}
        onPeek={() => onSelect(page.id, { sidePeek: true })}
        isHovered={isHovered}
      />

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
        <PageMenuAction icon={AnimatedUpload} label="Open in new tab" shortcut="Ctrl+Shift+Enter" onClick={() => { window.open(pageUrl(page.id), '_blank'); setMenuOpen(false); }} />
        <PageMenuAction icon={AnimatedCanvas} label="Open in new window" onClick={() => { window.open(pageUrl(page.id), '_blank', 'width=1200,height=800'); setMenuOpen(false); }} />
        <PageMenuAction icon={AnimatedSidebar} label="Open in side peek" shortcut="Alt+Click" onClick={() => { onSelect?.(page.id, { sidePeek: true }); setMenuOpen(false); }} />
      </FloatingMenu>
    </div>
  );
}

interface PremiumPageItemProps extends TreeHandlerProps {
  page: Page;
  active: boolean;
  selected: boolean;
  hasChildren: boolean;
  expanded: boolean;
  depth: number;
  ancestors: string[];
  allBlocks: Page[];
  collapsedPages: Set<string>;
  activeId: string | null;
}

function PremiumPageItem({
  page, active, selected, hasChildren, expanded,
  depth, ancestors, onToggleCollapse, onSelect, onPatchPage,
  onAddInside, allBlocks, collapsedPages, activeId,
  onDuplicatePage, onRenamePage, onTrashPage, onCopyLink,
  onRemoveFromRecents, onToggleOffline, onToast,
}: PremiumPageItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [childHovered, setChildHovered] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const isAncestor = ancestors?.includes(page.id);
  const showActivePath = active || isAncestor;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative"
    >
      <div
        data-page-id={page.id}
        role="treeitem"
        aria-expanded={hasChildren ? expanded : undefined}
        aria-level={depth + 1}
        aria-selected={active}
        className={`group relative flex items-center transition-all duration-150 cursor-pointer select-none ${
          active
            ? 'text-[var(--text)] font-semibold'
            : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
        }`}
        style={{
          minHeight: 30,
          paddingLeft: depth * 14 + 6,
          paddingRight: 2,
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onSelect(page.id, selectOptionsFromEvent(e));
          }
        }}
        onAuxClick={(e) => {
          if (e.button !== 1) return;
          e.preventDefault();
          if (e.target === e.currentTarget) {
            onSelect(page.id, selectOptionsFromEvent(e));
          }
        }}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(true); }}
      >
        {/* Animated active background */}
        {active && (
          <motion.div
            layoutId="tree-active-bg"
            initial={false}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute inset-0 rounded-lg bg-[var(--active)] border border-[var(--border)] shadow-sm z-0"
            style={{ marginLeft: depth * 14, marginRight: 2 }}
          />
        )}
        {selected && !active && (
          <div
            className="absolute inset-0 rounded-lg bg-[var(--accent-soft)] border border-[var(--accent)]/20 shadow-sm z-0"
            style={{ marginLeft: depth * 14, marginRight: 2 }}
          />
        )}

        {/* Active ancestry glow */}
        {isAncestor && !active && (
          <div
            className="absolute inset-0 rounded-lg bg-[var(--accent)]/[0.04] z-0"
            style={{ marginLeft: depth * 14, marginRight: 2 }}
          />
        )}

        {/* Connectors */}
        <TreeConnector
          depth={depth}
          activePath={showActivePath}
          hoverPath={isHovered}
          depthLevel={depth}
        />

        {/* Chevron */}
        <div className="z-10 flex items-center shrink-0">
          {hasChildren ? (
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="grid h-5 w-5 shrink-0 place-items-center rounded text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] z-10 cursor-pointer transition-colors"
              onClick={(e) => { e.stopPropagation(); onToggleCollapse?.(page.id); }}
              title={expanded ? 'Collapse' : 'Expand'}
            >
              <motion.div
                animate={{ rotate: expanded ? 0 : -90 }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              >
                <ChevronDown size={11} />
              </motion.div>
            </motion.button>
          ) : (
            <div className="w-5 h-5 shrink-0" />
          )}
        </div>

        {/* Icon */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          className="grid h-5 w-[18px] shrink-0 place-items-center text-[13px] cursor-pointer z-10"
          onClick={(e) => {
            e.stopPropagation();
            onPatchPage(page.id, {
              icon: emojis[(emojis.indexOf(page.icon) + 1) % emojis.length],
            });
          }}
        >
          <PageIcon icon={page.icon} size={14} fallback={<span className="text-[12px] leading-none">📄</span>} />
        </motion.button>

        {/* Title */}
        <div
          className="flex min-w-0 flex-1 items-center gap-1 z-10 pl-0.5 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(page.id, selectOptionsFromEvent(e));
          }}
        >
          <span className={`truncate text-[12.5px] ${active ? 'font-semibold' : 'font-normal'}`}>
            {page.title || 'Untitled'}
          </span>
          {page.favorite && <Star size={8} className="text-[var(--accent)] shrink-0 inline fill-[var(--accent)] ml-0.5" />}
          {page.isEncrypted && <Lock size={9} className="text-[var(--secondary)] shrink-0 inline ml-0.5" />}
        </div>

        {/* Hover Toolbar */}
        <HoverToolbar
          onAddInside={() => onAddInside?.(page.id)}
          onMenu={() => setMenuOpen(true)}
          onFavorite={() => onPatchPage(page.id, { favorite: !page.favorite })}
          isFavorite={page.favorite}
          onPeek={() => onSelect(page.id, { sidePeek: true })}
          isHovered={isHovered}
        />

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
        </FloatingMenu>
      </div>
    </div>
  );
}

interface SortablePremiumItemProps extends PremiumPageItemProps {
  id: string;
  focused: boolean;
}

function SortablePremiumItem({ id, focused, ...props }: SortablePremiumItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    position: 'relative',
    zIndex: isDragging ? 10 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div {...listeners} className="cursor-grab active:cursor-grabbing">
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
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      className="flex min-h-[28px] items-center gap-2 rounded-lg bg-[var(--surface-2)] border border-[var(--accent)]/50 shadow-xl px-2.5 py-1 text-[12px] text-[var(--text)] font-semibold backdrop-blur-sm"
    >
      <GripVertical size={10} className="text-[var(--muted)] shrink-0" />
      <div style={{ width: depth * 14 }} className="shrink-0" />
      <PageIcon icon={page.icon} size={14} fallback={<span className="text-[12px] leading-none">📄</span>} />
      <span className="truncate">{page.title || 'Untitled'}</span>
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
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
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
          {visibleItems.map((page, vi) => (
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
          ))}
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
