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
import { ChevronDown, ChevronRight, Link2, Copy, ArchiveRestore, Lock, Star } from 'lucide-react';
import { SPRING_PRESETS, StaggerContainer, StaggerItem } from '../features/motion/MotionSystem';
import { FloatingMenu } from './ui';
import {
  AnimatedMenu, AnimatedPlus, AnimatedBookmark, AnimatedTrash,
  AnimatedSend, AnimatedUpload, AnimatedDownload, AnimatedCanvas,
  AnimatedSidebar,
} from './ui/icons';
import { emojis } from '../utils/helpers';
import { isPageEntity } from '../utils/pageTreeOps';

function getDescendantIdsFromContent(pageId, allBlocks) {
  const ids = [];
  const page = allBlocks.find(b => b.id === pageId);
  if (!page?.content) return ids;
  for (const childId of page.content) {
    const child = allBlocks.find(b => b.id === childId);
    if (isPageEntity(child)) {
      ids.push(childId, ...getDescendantIdsFromContent(childId, allBlocks));
    }
  }
  return ids;
}

function flattenTreeFromContent(content, allBlocks, collapsedPages, depth = 0) {
  const result = [];
  for (const childId of content || []) {
    const block = allBlocks.find(b => b.id === childId);
    if (!isPageEntity(block)) continue;
    const hasChildren = block.content?.some(childId =>
      isPageEntity(allBlocks.find(b => b.id === childId))
    ) ?? false;
    result.push({ ...block, _depth: depth, _hasChildren: hasChildren });
    if (!collapsedPages.has(block.id) && block.content) {
      const children = flattenTreeFromContent(block.content, allBlocks, collapsedPages, depth + 1);
      result.push(...children);
    }
  }
  return result;
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

function NoskaPageItem({
  page, active, selected, focused, multiSelect, hasChildren, expanded,
  depth, onToggleCollapse, onSelect, onPatchPage, onDuplicatePage,
  onAddInside, onRenamePage, onRemoveFromRecents, onToggleOffline,
  onCopyLink, onTrashPage, onToast, allBlocks, dragListeners,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);

  return (
    <div
      role="treeitem"
      data-page-id={page.id}
      tabIndex={-1}
      aria-expanded={hasChildren ? expanded : undefined}
      aria-level={depth + 1}
      aria-selected={active}
      className={`group relative flex min-h-[28px] items-center rounded-md text-[12.5px] transition-all duration-150 cursor-pointer ${
        active ? 'text-[var(--text)] font-semibold' : 'text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]'
      } ${focused && !active ? 'ring-1 ring-[var(--accent)]/50' : ''} px-1.5 py-[3px] gap-0.5`}
      onClick={(e) => {
        // Only navigate if clicking the row background itself, not a child button
        if (e.target === e.currentTarget) {
          onSelect(page.id, { altKey: e.altKey || e.metaKey, shiftKey: e.shiftKey });
        }
      }}
    >
      {active && (
        <motion.div
          layoutId="sidebar-active-bg"
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          className="absolute inset-0 bg-[var(--active)] border border-[var(--border)] shadow-sm rounded-md z-0"
        />
      )}
      {selected && !active && (
        <div className="absolute inset-0 bg-[var(--accent-soft)] border border-[var(--accent)]/20 shadow-sm rounded-md z-0" />
      )}

      {/* Indentation spacer */}
      <div style={{ width: depth * 14 }} className="shrink-0 z-10" />

      {/* Chevron toggle for expand/collapse */}
      {hasChildren ? (
        <button
          className="grid h-5 w-4 shrink-0 place-items-center rounded text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] z-10 cursor-pointer transition"
          onClick={(e) => { e.stopPropagation(); onToggleCollapse?.(page.id); }}
          title={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </button>
      ) : (
        <div className="w-4 h-5 shrink-0 z-10" />
      )}

      {/* Draggable icon + title area — drag listeners applied HERE only */}
      <div
        className="flex min-w-0 flex-1 items-center gap-1 z-10"
        {...(dragListeners || {})}
      >
        <button
          className="grid h-5 w-[18px] shrink-0 place-items-center text-[13px] cursor-pointer"
          onClick={(e) => { e.stopPropagation(); onPatchPage(page.id, { icon: emojis[(emojis.indexOf(page.icon) + 1) % emojis.length] }); }}
        >
          {page.icon}
        </button>
        <button
          className={`min-w-0 flex-1 truncate text-left flex items-center gap-0.5 pl-0.5 cursor-pointer ${
            active ? 'text-[var(--text)] font-semibold' : 'font-normal text-[var(--text-secondary)] group-hover:text-[var(--text)]'
          }`}
          onClick={(e) => { e.stopPropagation(); onSelect(page.id, { altKey: e.altKey || e.metaKey, shiftKey: e.shiftKey }); }}
        >
          <span className="truncate">{page.title || 'Untitled'}</span>
          {page.favorite && <Star size={8} className="text-amber-400 shrink-0 inline ml-0.5 fill-amber-400" />}
          {page.isEncrypted && <Lock size={9} className="text-rose-400 shrink-0 inline ml-0.5" />}
        </button>
      </div>

      {/* Hover action buttons — NO drag listeners here */}
      {multiSelect && selected && (
        <button
          className="grid h-4.5 w-4.5 shrink-0 place-items-center rounded-md z-10"
          onClick={(e) => { e.stopPropagation(); onSelect(page.id, { altKey: true }); }}
        >
          <Star size={10} className="text-[var(--accent)]" />
        </button>
      )}
      <button
        ref={menuButtonRef}
        className="mr-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md opacity-0 hover:bg-[var(--hover)] group-hover:opacity-100 z-10 cursor-pointer transition-all"
        onClick={(e) => { e.stopPropagation(); setMenuOpen((open) => !open); }}
        title="Page options"
      >
        <AnimatedMenu size={12} className="text-[var(--text-secondary)]" />
      </button>
      <button
        className="grid h-5 w-5 shrink-0 place-items-center rounded-md opacity-0 hover:bg-[var(--hover)] group-hover:opacity-100 z-10 cursor-pointer transition-all"
        onClick={(e) => { e.stopPropagation(); onAddInside?.(page.id); }}
        title="Add a page inside"
      >
        <AnimatedPlus size={12} className="text-[var(--text-secondary)]" />
      </button>
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
          right={
            <span className={`flex h-6 w-10 items-center rounded-full p-0.5 transition ${page.offline ? 'bg-[var(--accent)] justify-end' : 'bg-[var(--toggle)] justify-start'}`}>
              <span className="h-5 w-5 rounded-full bg-white" />
            </span>
          }
          onClick={() => { onToggleOffline?.(page.id); }}
        />
        <div className="my-2 border-t border-[var(--border)]" />
        <PageMenuAction icon={Link2} label="Copy link" onClick={() => { onCopyLink?.(page.id); setMenuOpen(false); }} />
        <PageMenuAction icon={Copy} label="Duplicate" shortcut="Ctrl+D" onClick={() => { onDuplicatePage?.(page.id); setMenuOpen(false); }} />
        <PageMenuAction icon={AnimatedSend} label="Rename" shortcut="Ctrl+Shift+R" onClick={() => { onRenamePage?.(page.id); setMenuOpen(false); }} />
        <PageMenuAction
          icon={AnimatedUpload}
          label="Move to"
          shortcut="Ctrl+Shift+P"
          onClick={async () => {
            setMenuOpen(false);
            const targetTitle = await window.noskaPrompt('Enter parent page title to move this page under (or leave empty for root):', '', 'Parent Page Title');
            if (targetTitle !== null) {
              if (targetTitle.trim() === '') {
                onPatchPage(page.id, { parentId: null });
              } else {
                const parent = allBlocks.find(p => isPageEntity(p) && p.title?.toLowerCase() === targetTitle.trim().toLowerCase() && p.id !== page.id);
                if (parent) onPatchPage(page.id, { parentId: parent.id });
                else onToast?.('Page not found');
              }
            }
          }}
        />
        <PageMenuAction icon={AnimatedTrash} label="Move to Trash" onClick={() => { onTrashPage?.(page.id); setMenuOpen(false); }} />
        <div className="my-2 border-t border-[var(--border)]" />
        <PageMenuAction icon={AnimatedUpload} label="Open in new tab" shortcut="Ctrl+Shift+Enter" onClick={() => { onSelect(page.id, { altKey: true }); setMenuOpen(false); }} />
        <PageMenuAction icon={AnimatedCanvas} label="Open in new window" onClick={() => { const url = `${window.location.origin}${window.location.pathname}#page/${page.id}`; window.open(url, '_blank'); setMenuOpen(false); }} />
        <PageMenuAction icon={AnimatedSidebar} label="Open in side peek" shortcut="Alt+Click" onClick={() => { onSelect(page.id, { sidePeek: true }); setMenuOpen(false); }} />
        <div className="px-2 pt-2 text-[10px] leading-normal text-[var(--muted)] border-t border-[var(--border)] mt-2">
          Last edited by <span className="text-[var(--secondary)] font-medium">{page.lastEditedBy || "Krishna Handibagシ"}</span><br />
          {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " at " + new Date(page.updatedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "Recently"}
        </div>
      </FloatingMenu>
    </div>
  );
}

function SortablePageItem({ id, focused, ...props }) {
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
      <NoskaPageItem {...props} focused={focused} dragListeners={listeners} />
    </div>
  );
}

function DragGhost({ page, depth }) {
  return (
    <div className="flex min-h-[26px] items-center gap-2 rounded-lg bg-[var(--surface-2)] border border-[var(--accent)]/40 shadow-lg px-2.5 py-1 text-[12px] text-[var(--text)] font-semibold">
      <div style={{ width: depth * 14 }} className="shrink-0" />
      <span>{page.icon}</span>
      <span className="truncate">{page.title || 'Untitled'}</span>
    </div>
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const visibleItems = useMemo(
    () => flattenTreeFromContent(content, allBlocks, collapsedPages),
    [content, allBlocks, collapsedPages]
  );

  const visibleIds = useMemo(() => visibleItems.map(p => p.id), [visibleItems]);

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
  }, [visibleIds, visibleItems, allBlocks, onPatchPage]);

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
        e.preventDefault();
        {
          const page = visibleItems[safeIdx];
          if (page._hasChildren && collapsedPages.has(page.id)) {
            onToggleCollapse?.(page.id);
          }
          onSelect(page.id, {});
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        {
          const page = visibleItems[safeIdx];
          if (page._hasChildren && !collapsedPages.has(page.id)) {
            onToggleCollapse?.(page.id);
          }
        }
        break;
      case 'Enter':
        e.preventDefault();
        {
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

  // Scroll focused item into view
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
          className="space-y-0.5 outline-none"
        >
          {visibleItems.length === 0 && (
            <div className="px-2 py-1 text-[10px] text-[var(--muted)] italic">{emptyMessage}</div>
          )}
          {visibleItems.map((page, vi) => (
            <SortablePageItem
              key={page.id}
              id={page.id}
              page={page}
              active={page.id === activeId}
              selected={selectedIds.has(page.id)}
              focused={vi === focusedIndex}
              multiSelect={selectedIds.size > 0}
              hasChildren={page._hasChildren}
              expanded={!collapsedPages.has(page.id)}
              depth={page._depth}
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
