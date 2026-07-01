import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext, DragOverlay, closestCenter,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown, ChevronRight, Link2, Copy, ArchiveRestore, Lock, Star,
  Plus, MoreHorizontal, Sparkles, Eye, GripVertical,
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { SPRING_PRESETS, StaggerContainer, StaggerItem } from '../features/motion/MotionSystem';
import { FloatingMenu } from './ui';
import {
  AnimatedMenu, AnimatedPlus, AnimatedBookmark, AnimatedTrash,
  AnimatedSend, AnimatedUpload, AnimatedDownload, AnimatedCanvas,
  AnimatedSidebar, AnimatedSparkle,
} from './ui/icons';
import { emojis, timeAgo } from '../utils/helpers';
import { isPageEntity } from '../utils/pageTreeOps';
import {
  getAncestorPath, flattenTreeFromContent,
  getDescendantIdsFromContent, smartDepthOpacity,
} from '../core/tree/TreeEngine';

function TreeConnector({ depth, activePath, hoverPath, depthLevel }) {
  const opacity = activePath ? 0.6 : hoverPath ? 0.4 : smartDepthOpacity(depthLevel);
  const color = activePath ? 'var(--accent)' : hoverPath ? 'var(--text)' : 'var(--border)';
  if (depth <= 0) return null;
  const segments = [];
  for (let d = 0; d < depth; d++) {
    const isActive = activePath && d < activePath.length;
    const isHover = hoverPath && d < hoverPath.length;
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

function TreeBranch({ children, depth, isLast, expanded, animateHeight }) {
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

function HoverToolbar({ onAddInside, onMenu, onFavorite, onAI, onPeek, isFavorite, isHovered }) {
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

function PageMenuAction({ icon: Icon, label, shortcut, right, muted, onClick }) {
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

function BranchExpanded({ page, allBlocks, activeId, collapsedPages, onToggleCollapse, onSelect, onAddInside, onPatchPage, onDuplicatePage, onRenamePage, onTrashPage, onCopyLink, onRemoveFromRecents, onToggleOffline, onToast }) {
  const [childHoverId, setChildHoverId] = useState(null);
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

function PremiumBranch({
  page, depth, active, hasChildren, expanded, onToggleCollapse,
  onSelect, onAddInside, onPatchPage, parentHovered,
  onDuplicatePage, onRenamePage, onTrashPage, onCopyLink,
  onRemoveFromRecents, onToggleOffline, onToast,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const menuButtonRef = useRef(null);

  const handleClick = useCallback((e) => {
    onSelect(page.id, { altKey: e.altKey || e.metaKey, shiftKey: e.shiftKey });
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
        {page.icon}
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
        <PageMenuAction icon={AnimatedUpload} label="Open in new tab" shortcut="Ctrl+Shift+Enter" onClick={() => { window.open(`#page/${page.id}`, '_blank'); setMenuOpen(false); }} />
        <PageMenuAction icon={AnimatedCanvas} label="Open in new window" onClick={() => { window.open(`#page/${page.id}`, '_blank', 'width=1200,height=800'); setMenuOpen(false); }} />
        <PageMenuAction icon={AnimatedSidebar} label="Open in side peek" shortcut="Alt+Click" onClick={() => { onSelect?.(page.id, { sidePeek: true }); setMenuOpen(false); }} />
      </FloatingMenu>
    </div>
  );
}

function PremiumPageItem({
  page, active, selected, hasChildren, expanded,
  depth, ancestors, onToggleCollapse, onSelect, onPatchPage,
  onAddInside, allBlocks, collapsedPages, activeId,
  onDuplicatePage, onRenamePage, onTrashPage, onCopyLink,
  onRemoveFromRecents, onToggleOffline, onToast,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [childHovered, setChildHovered] = useState(false);
  const menuButtonRef = useRef(null);

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
            onSelect(page.id, { altKey: e.altKey || e.metaKey, shiftKey: e.shiftKey });
          }
        }}
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
          {page.icon}
        </motion.button>

        {/* Title */}
        <div
          className="flex min-w-0 flex-1 items-center gap-1 z-10 pl-0.5 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(page.id, { altKey: e.altKey || e.metaKey, shiftKey: e.shiftKey });
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
          <PageMenuAction icon={AnimatedUpload} label="Open in new tab" shortcut="Ctrl+Shift+Enter" onClick={() => { window.open(`#page/${page.id}`, '_blank'); setMenuOpen(false); }} />
          <PageMenuAction icon={AnimatedCanvas} label="Open in new window" onClick={() => { window.open(`#page/${page.id}`, '_blank', 'width=1200,height=800'); setMenuOpen(false); }} />
          <PageMenuAction icon={AnimatedSidebar} label="Open in side peek" shortcut="Alt+Click" onClick={() => { onSelect?.(page.id, { sidePeek: true }); setMenuOpen(false); }} />
        </FloatingMenu>
      </div>

      {/* Children */}
      <TreeBranch depth={depth} isLast={false} expanded={expanded} animateHeight={true}>
        <div
          className="relative"
          onMouseEnter={() => setChildHovered(true)}
          onMouseLeave={() => setChildHovered(false)}
        >
          {page.content?.map((childId) => {
            const childPage = allBlocks.find(b => b.id === childId);
            if (!childPage || !isPageEntity(childPage)) return null;
            return (
              <PremiumPageItem
                key={childPage.id}
                page={childPage}
                active={childPage.id === activeId}
                selected={selected}
                hasChildren={childPage.content?.some(id => isPageEntity(allBlocks.find(b => b.id === id))) ?? false}
                expanded={!collapsedPages.has(childPage.id)}
                depth={depth + 1}
                ancestors={ancestors}
                onToggleCollapse={onToggleCollapse}
                onSelect={onSelect}
                onPatchPage={onPatchPage}
                onAddInside={onAddInside}
                allBlocks={allBlocks}
                collapsedPages={collapsedPages}
                activeId={activeId}
              />
            );
          })}
        </div>
      </TreeBranch>
    </div>
  );
}

function SortablePremiumItem({ id, focused, ...props }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
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

function DragGhost({ page, depth }) {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      className="flex min-h-[28px] items-center gap-2 rounded-lg bg-[var(--surface-2)] border border-[var(--accent)]/50 shadow-xl px-2.5 py-1 text-[12px] text-[var(--text)] font-semibold backdrop-blur-sm"
    >
      <GripVertical size={10} className="text-[var(--muted)] shrink-0" />
      <div style={{ width: depth * 14 }} className="shrink-0" />
      <span>{page.icon}</span>
      <span className="truncate">{page.title || 'Untitled'}</span>
    </motion.div>
  );
}

export default function PageTree({
  content, allBlocks, activeId, collapsedPages, onToggleCollapse, onSelect,
  onPatchPage, onMovePage, onDuplicatePage, onAddInside, onRenamePage,
  onRemoveFromRecents, onToggleOffline, onCopyLink, onTrashPage, onToast,
  emptyMessage = 'No pages yet',
}) {
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [activeDragId, setActiveDragId] = useState(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const treeRef = useRef(null);
  const [density, setDensity] = useState('comfortable');

  const ancestorIds = useMemo(() => {
    if (!activeId) return [];
    const ancestors = getAncestorPath(activeId, allBlocks);
    return ancestors.slice(0, -1).map(a => a.id);
  }, [activeId, allBlocks]);

  const visibleItems = useMemo(
    () => flattenTreeFromContent(content, allBlocks, collapsedPages),
    [content, allBlocks, collapsedPages]
  );

  const visibleIds = useMemo(() => visibleItems.map(p => p.id), [visibleItems]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const handleSelect = useCallback((pageId, options = {}) => {
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

  const handleDragStart = useCallback((event) => {
    setActiveDragId(event.active.id);
  }, []);

  const handleDragEnd = useCallback((event) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = visibleIds.indexOf(active.id);
    const newIndex = visibleIds.indexOf(over.id);
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
    if (getDescendantIdsFromContent(active.id, allBlocks).includes(targetPage?.id)) {
      return;
    }
    if (onMovePage) {
      const orderedSiblingIds = reorderedIds.filter((id) => {
        if (id === active.id) return true;
        const page = visibleItems.find(p => p.id === id);
        return page && (page.parentId || null) === (newParentId || null);
      });
      onMovePage(active.id, newParentId || null, orderedSiblingIds);
      return;
    }
    if (draggedPage.parentId !== newParentId) {
      onPatchPage(active.id, { parentId: newParentId });
    }
    reorderedIds.forEach((id, idx) => {
      const page = visibleItems.find(p => p.id === id);
      if (page && (page.parentId || null) === (newParentId || null)) {
        onPatchPage(id, { sortOrder: idx });
      }
    });
  }, [visibleIds, visibleItems, allBlocks, onPatchPage, onMovePage]);

  const activeDragPage = useMemo(
    () => visibleItems.find(p => p.id === activeDragId) || null,
    [visibleItems, activeDragId]
  );

  const handleTreeKeyDown = useCallback((e) => {
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
