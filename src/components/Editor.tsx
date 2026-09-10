import React, { useEffect, useRef, useState, useCallback, useMemo, memo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { SPRING_PRESETS } from "../features/motion/MotionSystem";
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Block as BlockType } from "../../types/blocks";
import type { Page } from "../lib/supabaseService";
import type { TreeBlock } from "../utils/blockModel";
import { capture } from "../lib/posthog";

/** Editor.tsx's own local tree-manipulation shape — deliberately a
 * minimal structural type (id/parentId/content, matching every block
 * this file's local helpers actually touch) rather than importing
 * blockModel.ts's `TreeBlock` or pageTreeOps.ts's `FlatBlock`. This file
 * has its OWN independent implementations of the same tree operations
 * (flattenEditorBlocks, insertBlockAfterTree, duplicateBlockTree, etc.)
 * that pre-date and duplicate blockModel.ts/pageTreeOps.ts's versions —
 * per explicit instruction, this migration pass types them in place
 * without consolidating onto the utils versions, to stay strictly
 * behavior-identical. `_depth` is a render-only field added by
 * flattenEditorBlocks, not part of the real stored block shape. */
type EditorBlock = BlockType & { _depth?: number };

const DragGhostBlock = React.memo(function DragGhostBlock({ block }: { block: EditorBlock }) {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex items-center gap-2 rounded-lg border border-[var(--accent)]/50 bg-[var(--elevated)] px-3 py-2 text-sm text-[var(--text)] shadow-xl backdrop-blur-sm"
      style={{ width: 200 }}
    >
      <GripVertical size={14} className="text-[var(--muted)] shrink-0" />
      <span className="truncate font-medium">{block.text || block.type || "Block"}</span>
    </motion.div>
  );
});
import { useGhostWriter } from "../features/ghostwriter/GhostWriter";
import { BlockRegistry } from "../registry/BlockRegistry";
import ImagePicker from "./editor/ImagePicker";
import PageIconBlock from "./editor/PageIconBlock";
import PageTitleCustomizer, { TITLE_GRADIENTS } from "./editor/PageTitleCustomizer";
import { PageIcon } from "./PageIcon";

import InPageFind from "./InPageFind";
import { CursorOverlay } from "../features/collab/CursorOverlay";
import { useDebouncedCursor } from "../features/collab/performance";
import useMultiBlockSelect from "../hooks/useMultiBlockSelect";
import {
  AlignLeft, Heading1, Heading2, Heading3, Heading4, List, ListChecks, ChevronLeft, ChevronRight, ChevronDown, CheckSquare,
  Quote, MessageSquare, Clipboard, MoreHorizontal, Image, Link, Table2, Columns3, Edit3, Database, Plus,
  Search, X, GripVertical, Maximize2, Mic, Loader2, Play, Bold, Italic, Underline, SlidersHorizontal, Highlighter,
  Smile, MessageCircle, Settings2, Sparkles, Code, Star, Heart, ThumbsUp, Flag, Bell, Bookmark, Lightbulb,
  Target, Zap, Check, Clock, AlertCircle, HelpCircle, Info, Calendar, Hash, FileDown, Upload, Globe, BarChart3, History, Move, Eye, FileEdit, Palette, Trash2, ExternalLink, Menu
} from "lucide-react";
import { AnimatedSparkle } from "./ui/icons";
import { IconButton, FloatingMenu, useOutsideDismiss, TextArea } from "./ui";
import { emojis, covers, blockFor, getPagePermission, renderInlineMarkdown, softDelete, getDescendants, turnInto, uid } from "../utils/helpers";
import { richTextToPlainText, plainTextToRichText } from "../utils/richText";
import { globalVoiceController } from "../lib/voice/voice-controller";

// Searchable emoji catalog for the /emoji picker (keyword-indexed).
const EMOJI_CATALOG = [
  { e: "😀", k: ["smile", "happy", "grin"] }, { e: "😂", k: ["laugh", "joy", "lol"] },
  { e: "😍", k: ["love", "heart", "eyes"] }, { e: "🤔", k: ["think", "hmm"] },
  { e: "😎", k: ["cool", "sunglasses"] }, { e: "😢", k: ["cry", "sad", "tear"] },
  { e: "😡", k: ["angry", "mad"] }, { e: "👍", k: ["thumbsup", "yes", "like", "ok"] },
  { e: "👎", k: ["thumbsdown", "no", "dislike"] }, { e: "👏", k: ["clap", "applause"] },
  { e: "🙌", k: ["hands", "celebrate", "praise"] }, { e: "🙏", k: ["pray", "please", "thanks"] },
  { e: "💪", k: ["strong", "muscle", "flex"] }, { e: "🔥", k: ["fire", "hot", "lit"] },
  { e: "✨", k: ["sparkle", "shiny", "magic"] }, { e: "⭐", k: ["star", "favorite"] },
  { e: "🎉", k: ["party", "celebrate", "tada"] }, { e: "🚀", k: ["rocket", "launch", "ship"] },
  { e: "💡", k: ["idea", "bulb", "light"] }, { e: "📌", k: ["pin", "important"] },
  { e: "📝", k: ["note", "memo", "write"] }, { e: "✅", k: ["check", "done", "yes", "task"] },
  { e: "❌", k: ["cross", "no", "wrong", "cancel"] }, { e: "⚠️", k: ["warning", "caution"] },
  { e: "❤️", k: ["heart", "love", "red"] }, { e: "💙", k: ["heart", "blue"] },
  { e: "🎯", k: ["target", "goal", "aim"] }, { e: "📚", k: ["books", "read", "study"] },
  { e: "🧠", k: ["brain", "mind", "smart"] }, { e: "🗓️", k: ["calendar", "date", "schedule"] },
  { e: "🔖", k: ["bookmark", "tag"] }, { e: "🏆", k: ["trophy", "win", "award"] },
  { e: "💼", k: ["work", "business", "briefcase"] }, { e: "📊", k: ["chart", "data", "graph"] },
  { e: "🔗", k: ["link", "chain", "url"] }, { e: "🔒", k: ["lock", "secure", "private"] },
  { e: "⏰", k: ["clock", "alarm", "time"] }, { e: "🎨", k: ["art", "paint", "design"] },
  { e: "🌟", k: ["star", "glow", "special"] }, { e: "☕", k: ["coffee", "break", "cafe"] },
];
import BlockContextMenu from "./editor/BlockContextMenu";
import { createReviewState, removedReviewState } from "../features/spaced/scheduler";
import SlashCommandMenu from "./editor/SlashCommandMenu";
// SlashCommandMenu.jsx (still untyped .jsx, out of Phase 4's scope) uses a
// bare `forwardRef(function SlashCommandMenu(props, ref) {...})` with no
// type annotations, so TS infers its ref-forwarding export as
// `RefAttributes<any>` with no other props. One documented cast to a
// minimal typed shape here, instead of an inline `any` per prop at the
// single call site below.
const TypedSlashCommandMenu = SlashCommandMenu as unknown as React.ForwardRefExoticComponent<{
  open: boolean;
  onClose: () => void;
  onSelect: (type: string) => void;
  position: { top: number; left: number } | null;
  initialSearch?: string;
} & React.RefAttributes<HTMLElement>>;
import PageOptionsMenu from "./editor/PageOptionsMenu";
import CustomizePanel from "./editor/CustomizePanel";
import IconPicker from "../modules/ui/IconPicker";
import CoverPicker from "../modules/ui/CoverPicker";
import CoverContextMenu from "../modules/ui/CoverContextMenu";
import CoverLiquidGlassToolbar from "./cover/CoverLiquidGlassToolbar";
import { executeCommand } from "../core/commands/ActionExecutor";
import CollabPresenceBar from "./collab/CollabPresenceBar";
import { realtimeCollab } from "../lib/realtimeCollab";
import CommentThread from "./comments/CommentThread";
import { usePageIsShared } from "../features/collab/hooks";
import Breadcrumbs from "./Breadcrumbs";
import { usePresence } from "../hooks/usePresence";
import CommandPalette from "./CommandPalette";
import AIFlashcardGenerator from "../features/study/AIFlashcardGenerator";
import BacklinksPanel from "./editor/BacklinksPanel";
import SelectionAIBar from "./editor/SelectionAIBar";
import VersionHistoryPanel from "./editor/VersionHistoryPanel";
import NotionAIBar from "./editor/NotionAIBar";
import renderBlockEditor from "./editor/renderBlockEditor";
import FloatingFormatToolbar from "./editor/FloatingFormatToolbar";

function childIdsFor(blocks: EditorBlock[], parentId: string | null): string[] {
  const ids = new Set(blocks.map((block) => block.id));
  if (!parentId) {
    return blocks
      .filter((block) => !block.parentId || !ids.has(block.parentId))
      .map((block) => block.id);
  }

  const parent = blocks.find((block) => block.id === parentId);
  const explicit = (parent?.content || []).filter((id) => ids.has(id));
  const explicitSet = new Set(explicit);
  const implicit = blocks
    .filter((block) => block.parentId === parentId && !explicitSet.has(block.id))
    .map((block) => block.id);
  return [...explicit, ...implicit];
}

function flattenEditorBlocks(blocks: EditorBlock[], parentId: string | null = null, depth: number = 0, seen: Set<string> = new Set()): EditorBlock[] {
  const active = blocks.filter(b => !b.isDeleted);
  const byId = new Map(active.map((block) => [block.id, block]));
  const result: EditorBlock[] = [];

  for (const id of childIdsFor(active, parentId)) {
    if (seen.has(id)) continue;
    const block = byId.get(id);
    if (!block) continue;
    seen.add(id);
    result.push({ ...block, _depth: depth });
    result.push(...flattenEditorBlocks(active, id, depth + 1, seen));
  }

  if (parentId === null) {
    for (const block of active) {
      if (seen.has(block.id)) continue;
      seen.add(block.id);
      result.push({ ...block, _depth: 0 });
    }
  }

  return result;
}

function moveArrayItemAfter<T extends { id: string }>(items: T[], itemId: string, afterId: string): T[] {
  const next = [...items];
  const from = next.findIndex((block) => block.id === itemId);
  const after = next.findIndex((block) => block.id === afterId);
  if (from < 0 || after < 0 || from === after) return next;
  const [item] = next.splice(from, 1);
  const target = next.findIndex((block) => block.id === afterId);
  next.splice(target + 1, 0, item);
  return next;
}

function removeFromParentContent(blocks: EditorBlock[], blockId: string): EditorBlock[] {
  return blocks.map((block) => {
    if (!Array.isArray(block.content) || !block.content.includes(blockId)) return block;
    return { ...block, content: block.content.filter((id) => id !== blockId) };
  });
}

function appendChildBlock(blocks: EditorBlock[], parentId: string, childId: string): EditorBlock[] {
  return blocks.map((block) => {
    if (block.id !== parentId) return block;
    const content = Array.isArray(block.content) ? block.content : [];
    return content.includes(childId) ? block : { ...block, content: [...content, childId] };
  });
}

function insertChildBlockAfter(blocks: EditorBlock[], parentId: string, childId: string, afterId: string): EditorBlock[] {
  return blocks.map((block) => {
    if (block.id !== parentId) return block;
    const content = (Array.isArray(block.content) ? block.content : []).filter((id) => id !== childId);
    const afterIndex = content.indexOf(afterId);
    if (afterIndex < 0) content.push(childId);
    else content.splice(afterIndex + 1, 0, childId);
    return { ...block, content };
  });
}

function indentBlockTree(blocks: EditorBlock[], blockId: string): EditorBlock[] {
  const flat = flattenEditorBlocks(blocks);
  const index = flat.findIndex((block) => block.id === blockId);
  if (index <= 0) return blocks;

  const newParent = flat[index - 1];
  let next = removeFromParentContent(blocks, blockId);
  next = next.map((block) => block.id === blockId ? { ...block, parentId: newParent.id } : block);
  next = appendChildBlock(next, newParent.id, blockId);
  return next;
}

function outdentBlockTree(blocks: EditorBlock[], blockId: string): EditorBlock[] {
  const current = blocks.find((block) => block.id === blockId);
  if (!current?.parentId) return blocks;
  const parent = blocks.find((block) => block.id === current.parentId);
  if (!parent) return blocks;
  const grandParentId = parent.parentId || null;

  let next = removeFromParentContent(blocks, blockId);
  next = next.map((block) => block.id === blockId ? { ...block, parentId: grandParentId } : block);
  if (grandParentId) {
    return insertChildBlockAfter(next, grandParentId, blockId, parent.id);
  }
  return moveArrayItemAfter(next, blockId, parent.id);
}

function insertBlockAfterTree(blocks: EditorBlock[], afterId: string, newBlock: EditorBlock): EditorBlock[] {
  const anchor = blocks.find((block) => block.id === afterId);
  if (!anchor) return [...blocks, newBlock];
  const parentId = anchor.parentId || null;
  const blockToInsert: EditorBlock = { ...newBlock, parentId, content: newBlock.content || [] };
  const withInserted = moveArrayItemAfter([...blocks, blockToInsert], blockToInsert.id, afterId);
  return parentId ? insertChildBlockAfter(withInserted, parentId, blockToInsert.id, afterId) : withInserted;
}

function insertBlockBeforeTree(blocks: EditorBlock[], beforeId: string, newBlock: EditorBlock): EditorBlock[] {
  const anchor = blocks.find((block) => block.id === beforeId);
  if (!anchor) return [newBlock, ...blocks];
  const parentId = anchor.parentId || null;
  const blockToInsert: EditorBlock = { ...newBlock, parentId, content: newBlock.content || [] };
  const beforeIndex = blocks.findIndex((block) => block.id === beforeId);
  const withInserted = [...blocks];
  withInserted.splice(Math.max(beforeIndex, 0), 0, blockToInsert);
  if (!parentId) return withInserted;
  return withInserted.map((block) => {
    if (block.id !== parentId) return block;
    const content = (Array.isArray(block.content) ? block.content : []).filter((id) => id !== blockToInsert.id);
    const anchorIndex = content.indexOf(beforeId);
    if (anchorIndex < 0) content.push(blockToInsert.id);
    else content.splice(anchorIndex, 0, blockToInsert.id);
    return { ...block, content };
  });
}

function duplicateBlockTree(blocks: EditorBlock[], blockId: string): EditorBlock[] {
  const source = blocks.find((block) => block.id === blockId);
  if (!source) return blocks;
  const idsToClone: string[] = [];
  const collect = (id: string) => {
    if (idsToClone.includes(id)) return;
    idsToClone.push(id);
    const block = blocks.find((candidate) => candidate.id === id);
    (block?.content || []).forEach(collect);
    blocks.filter((candidate) => candidate.parentId === id && !(block?.content || []).includes(candidate.id)).forEach((candidate) => collect(candidate.id));
  };
  collect(blockId);

  const idMap = new Map<string, string>(idsToClone.map((id) => [id, uid()]));
  const clones: EditorBlock[] = idsToClone.map((id) => {
    const original = blocks.find((block) => block.id === id)!;
    const clonedParentId = id === blockId ? original.parentId : idMap.get(original.parentId || "") || original.parentId;
    return {
      ...JSON.parse(JSON.stringify(original)),
      id: idMap.get(id),
      parentId: clonedParentId || null,
      content: (original.content || []).map((childId) => idMap.get(childId)).filter((v): v is string => Boolean(v))
    };
  });

  return insertBlockAfterTree(blocks, blockId, clones[0]).concat(clones.slice(1));
}

function blockForTreeConversion(block: EditorBlock, type: string, text: string = block.text || ""): EditorBlock {
  const next = blockFor(type, text);
  return {
    ...next,
    id: block.id,
    parentId: block.parentId || null,
    content: block.content || []
  };
}

function filterCollapsedChildren(blocks: EditorBlock[]): EditorBlock[] {
  const collapsedIds = new Set<string>();
  const walk = (blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    const collapsed = block.properties?.collapsed !== undefined ? block.properties.collapsed : !(block as unknown as { open?: boolean }).open;
    if (collapsed) {
      collapsedIds.add(blockId);
    }
    for (const childId of (block.content || [])) {
      walk(childId);
    }
  };
  for (const block of blocks) {
    const collapsed = block.properties?.collapsed !== undefined ? block.properties.collapsed : !(block as unknown as { open?: boolean }).open;
    if (block.type === "toggle" && collapsed) {
      for (const childId of (block.content || [])) {
        collapsedIds.add(childId);
      }
    }
  }
  return blocks.filter(b => !collapsedIds.has(b.id));
}

interface EditorProps {
  page: Page;
  pages: Page[];
  renameFocusId?: string | null;
  onRenameFocusDone?: () => void;
  onPagePatch?: (patch: Record<string, unknown>) => void;
  onBlockPatch: (blockId: string, patch: Record<string, unknown>) => void;
  onAddBlock: (blockId: string, type: string, text: string) => void;
  onDeleteBlock?: (blockId: string) => void;
  onDuplicateBlock?: (blockId: string) => void;
  onMoveBlock: (blockId: string, dir?: number) => void;
  onBlocks: (blocks: EditorBlock[]) => void;
  onAskAI?: () => void;
  onFocusBlock?: (blockId: string) => void;
  onVoiceCapture?: () => void;
  ghostWriterEnabled?: boolean;
  apiKey?: string;
  aiProvider?: string;
  nvidiaKey?: string;
  onToast?: (message: string) => void;
  onScrollPercent?: (pct: number) => void;
  onUpdatePage?: (pageId: string, patch: Record<string, unknown>) => void;
  onNavigate?: (pageId: string, options?: { altKey?: boolean }) => void;
  onCreateSubpage?: (blockId: string, text: string) => string | null | undefined;
  onTrashPage?: (pageId: string) => void;
}

interface EditorCallbackContext {
  onBlockPatch: (id: string, patch: Partial<BlockType>) => void;
  onBlocks: (blocks: EditorBlock[]) => void;
  onMoveBlock: (id: string, dir: number) => void;
  onAskAI?: (blockId: string, text: string) => void;
  onFocusBlock?: (blockId: string | null) => void;
  onToast?: (message: string) => void;
  onUpdatePage?: (pageId: string, patch: Record<string, unknown>) => void;
  onPagePatch?: (patch: Record<string, unknown>) => void;
  onCreateSubpage?: (blockId: string, text: string) => string | null | undefined;
  onNavigate?: (pageId: string, options?: { altKey?: boolean }) => void;
  page?: Page;
}

function createBlockRefs(blockCtx: React.MutableRefObject<EditorCallbackContext>) {
  return {
    onBlockPatch: (id: string, patch: Partial<BlockType>) => blockCtx.current.onBlockPatch(id, patch),
    onBlocks: (blocks: EditorBlock[]) => blockCtx.current.onBlocks(blocks),
    onAddBlock: (type: string, text: string, afterId: string, customId?: string) => {
      const nextBlock = blockFor(type, text);
      if (customId) nextBlock.id = customId;
      blockCtx.current.onBlocks(insertBlockAfterTree(blockCtx.current.page?.blocks || [], afterId, nextBlock));
    },
    onAddAbove: (type: string, text: string, beforeId: string, customId?: string) => {
      const nextBlock = blockFor(type, text);
      if (customId) nextBlock.id = customId;
      blockCtx.current.onBlocks(insertBlockBeforeTree(blockCtx.current.page?.blocks || [], beforeId, nextBlock));
    },
    onDelete: (blockId: string) => {
      blockCtx.current.onBlocks(softDelete((blockCtx.current.page?.blocks || []) as unknown as TreeBlock[], blockId) as unknown as EditorBlock[]);
    },
    onDuplicate: (blockId: string) => {
      blockCtx.current.onBlocks(duplicateBlockTree(blockCtx.current.page?.blocks || [], blockId));
    },
    onMove: (blockId: string, dir: number) => blockCtx.current.onMoveBlock(blockId, dir),
    onSwapBlocks: (fromId: string, toId: string) => {
      const blocks = [...(blockCtx.current.page?.blocks || [])];
      const fromIdx = blocks.findIndex(b => b.id === fromId);
      const toIdx = blocks.findIndex(b => b.id === toId);
      if (fromIdx < 0 || toIdx < 0) return;
      const [moved] = blocks.splice(fromIdx, 1);
      blocks.splice(toIdx, 0, moved);
      blockCtx.current.onBlocks(blocks);
    },
  };
}

const EditorBlockList = memo(function EditorBlockList({
  renderedBlocks, page, pages, selectedBlockIds,
  openSlashForBlockId, onClearOpenSlash, setOpenSlashForBlockId,
  blockCtx,
  handlePointerDown, activeCommentBlockId, setActiveCommentBlockId,
  pageComments, handleAddComment, handleResolveComment,
  onAskAI, onFocusBlock, ghostWriterEnabled, apiKey, aiProvider, nvidiaKey,
  onToast, onUpdatePage, onPagePatch, onCreateSubpage, onNavigate,
}: {
  renderedBlocks: EditorBlock[];
  page: Page;
  pages: Page[];
  selectedBlockIds: Set<unknown>;
  openSlashForBlockId: string | null;
  onClearOpenSlash: () => void;
  setOpenSlashForBlockId: React.Dispatch<React.SetStateAction<string | null>>;
  blockCtx: React.MutableRefObject<EditorCallbackContext>;
  handlePointerDown: (e: React.PointerEvent, blockId: string, index: number) => void;
  activeCommentBlockId: string | null;
  setActiveCommentBlockId: React.Dispatch<React.SetStateAction<string | null>>;
  pageComments: Array<Record<string, unknown>>;
  handleAddComment: (comment: Record<string, unknown>) => void;
  handleResolveComment: (commentId: string) => void;
  onAskAI?: () => void;
  onFocusBlock?: (blockId: string | null) => void;
  ghostWriterEnabled?: boolean;
  apiKey?: string;
  aiProvider?: string;
  nvidiaKey?: string;
  onToast?: (message: string) => void;
  onUpdatePage?: (pageId: string, patch: Record<string, unknown>) => void;
  onPagePatch?: (patch: Record<string, unknown>) => void;
  onCreateSubpage?: (blockId: string, text: string) => string | null | undefined;
  onNavigate?: (pageId: string, options?: { altKey?: boolean }) => void;
}) {
  const refs = useMemo(() => createBlockRefs(blockCtx), [blockCtx]);

  return renderedBlocks.map((block, index) => (
    <Block
      key={block.id}
      block={block}
      index={index}
      page={page}
      pages={pages}
      isSelected={selectedBlockIds.has(block.id)}
      onSelectBlock={(e) => handlePointerDown(e, block.id, index)}
      onPatch={(patch) => refs.onBlockPatch(block.id, patch)}
      onAdd={(type, text, customId) => refs.onAddBlock(type, text, block.id, customId)}
      onAddAbove={(type, text, customId) => refs.onAddAbove(type, text, block.id, customId)}
      onDelete={() => refs.onDelete(block.id)}
      onDuplicate={() => refs.onDuplicate(block.id)}
      onMove={(dir) => refs.onMove(block.id, dir)}
      onSwapBlocks={(fromId, toId) => refs.onSwapBlocks(fromId, toId)}
      onAskAI={onAskAI}
      onFocusBlock={onFocusBlock}
      ghostWriterEnabled={ghostWriterEnabled}
      apiKey={apiKey}
      aiProvider={aiProvider}
      nvidiaKey={nvidiaKey}
      onToast={onToast}
      onUpdatePage={onUpdatePage}
      onPagePatch={onPagePatch}
      onBlocks={refs.onBlocks}
      openSlash={openSlashForBlockId === block.id}
      onClearOpenSlash={onClearOpenSlash}
      onSetOpenSlashBlockId={setOpenSlashForBlockId}
      onCreateSubpage={onCreateSubpage}
      onNavigate={onNavigate}
      activeCommentBlockId={activeCommentBlockId}
      setActiveCommentBlockId={setActiveCommentBlockId}
      pageComments={pageComments}
      handleAddComment={handleAddComment}
      handleResolveComment={handleResolveComment}
    />
  ));
});

export default function Editor({
  page,
  pages,
  renameFocusId,
  onRenameFocusDone,
  onPagePatch,
  onBlockPatch,
  onAddBlock,
  onDeleteBlock,
  onDuplicateBlock,
  onMoveBlock,
  onBlocks,
  onAskAI,
  onFocusBlock,
  onVoiceCapture,
  ghostWriterEnabled,
  apiKey,
  aiProvider,
  nvidiaKey,
  onToast,
  onScrollPercent,
  onUpdatePage,
  onNavigate,
  onCreateSubpage,
  onTrashPage
}: EditorProps) {
  const titleRef = useRef(null);
  const editorContainerRef = useRef(null);
  const pageOptionsRef = useRef<HTMLDivElement>(null);
  const blockCtx = useRef<EditorCallbackContext>({ onBlockPatch: () => { }, onBlocks: () => { }, onMoveBlock: () => { } });

  interface SelectionState {
    text: string;
    rect: { top: number; left: number; width: number; height: number } | null;
    blockId: string | null;
    selStart?: number;
    selEnd?: number;
  }
  const [selection, setSelection] = useState<SelectionState>({ text: "", rect: null, blockId: null, selStart: 0, selEnd: 0 });
  const [pageMenuOpen, setPageMenuOpen] = useState(false);
  const [pageMenuPos, setPageMenuPos] = useState({ top: 0, left: 0 });
  const [openSlashForBlockId, setOpenSlashForBlockId] = useState(null);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [coverPickerPos, setCoverPickerPos] = useState<{ top: number; left: number } | undefined>(undefined);
  const coverBtnRef = useRef<HTMLButtonElement>(null);
  const [coverMenuOpen, setCoverMenuOpen] = useState(false);
  const [coverMenuPos, setCoverMenuPos] = useState({ left: 0, top: 0 });
  const [isRepositioningCover, setIsRepositioningCover] = useState(false);
  const [coverDragYPercent, setCoverDragYPercent] = useState<number | null>(null);
  const coverDragStartY = useRef<number | null>(null);
  const coverDragStartPercent = useRef<number>(50);
  const isDraggingCover = useRef<boolean>(false);

  const getCoverYPercent = (pos?: string): number => {
    if (!pos) return 50;
    if (pos === "top") return 0;
    if (pos === "center") return 50;
    if (pos === "bottom") return 100;
    const match = pos.match(/(\d+)%/);
    if (match) return parseInt(match[1], 10);
    return 50;
  };

  const handleStartReposition = () => {
    const initialPercent = getCoverYPercent(page?.coverPosition);
    coverDragStartPercent.current = initialPercent;
    setCoverDragYPercent(initialPercent);
    setIsRepositioningCover(true);
  };

  const handleSaveReposition = () => {
    if (coverDragYPercent !== null) {
      onPagePatch({ coverPosition: `center ${coverDragYPercent}%` });
    }
    setIsRepositioningCover(false);
    setCoverDragYPercent(null);
  };

  const handleCancelReposition = () => {
    setIsRepositioningCover(false);
    setCoverDragYPercent(null);
  };
  const [presentationMode, setPresentationMode] = useState(false);
  const [suggestEdits, setSuggestEdits] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [backlinksOpen, setBacklinksOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [studyGeneratorOpen, setStudyGeneratorOpen] = useState(false);
  const [moveToOpen, setMoveToOpen] = useState(false);
  const importInputRef = useRef(null);
  const [activeCommentBlockId, setActiveCommentBlockId] = useState(null);
  const [findOpen, setFindOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [titleEmojiOpen, setTitleEmojiOpen] = useState(false);
  const titleEmojiRef = useRef(null);
  const [titleCustomizerOpen, setTitleCustomizerOpen] = useState(false);
  const titleMenuBtnRef = useRef<HTMLButtonElement>(null);
  const titleDragControls = useDragControls();
  const handleClearOpenSlash = useCallback(() => setOpenSlashForBlockId(null), []);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const {
    selectedBlockIds, selectionMode, selectionRect, containerRef,
    clearSelection, selectBlock, handlePointerDown, handleSelectAll,
    setSelectedBlockIds, hasSelection, handleDragSelectStart
  } = useMultiBlockSelect(page?.blocks || []);

  // Keyboard shortcut: Ctrl+A to select all, Escape to clear
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        const activeEl = document.activeElement;
        if (activeEl?.tagName === "TEXTAREA" || activeEl?.tagName === "INPUT") return;
        e.preventDefault();
        handleSelectAll();
      }
      if (e.key === "Escape" && hasSelection) {
        clearSelection();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((v) => !v);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        if (page?.isLocked) return;
        e.preventDefault();
        setFindOpen((prev) => !prev);
      }
      if (e.key === "Escape" && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSelectAll, hasSelection, clearSelection, commandPaletteOpen, page?.isLocked]);

  blockCtx.current = { onBlockPatch, onBlocks, onMoveBlock, onAskAI, onFocusBlock, onToast, onUpdatePage, onPagePatch, onCreateSubpage, onNavigate, page };

  const wordCount = React.useMemo(() => {
    if (!page?.blocks) return 0;
    return page.blocks.reduce((sum, b) => sum + (b.text || "").split(/\s+/).filter(Boolean).length, 0);
  }, [page?.blocks]);
  const renderedBlocks = React.useMemo(() => {
    const blocks = page?.blocks || [];
    const filtered = filterCollapsedChildren(blocks);
    return flattenEditorBlocks(filtered);
  }, [page?.blocks]);
  const flatBlockIds = React.useMemo(() => renderedBlocks.map(b => b.id), [renderedBlocks]);
  const flatBlockMap = React.useMemo(() => Object.fromEntries(renderedBlocks.map(b => [b.id, b])), [renderedBlocks]);

  const permission = React.useMemo(() => getPagePermission(page, pages), [page, pages]);
  const isEditable = !page.isLocked && permission === 'edit';
  // Privacy gate: presence UI/telemetry only for shared ("public") pages.
  // A page nobody's been invited to is private — no online list, cursors,
  // or typing indicators for anyone.
  const sharedViaPermissions = usePageIsShared(page?.id ?? null);
  const pageIsShared = !!page.sharedRole || sharedViaPermissions || page.visibility === "public";
  const { users, ownStatus, setStatus: setOwnStatus } = usePresence(pageIsShared ? page?.id : null);
  const sendCursor = useDebouncedCursor(pageIsShared ? page?.id : null);

  const handleExport = () => {
    const text = (page.blocks || []).map(b => b.text || "").join("\n\n");
    const md = `# ${page.title || "Untitled"}\n\n${text}`;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${page.title || "page"}.md`; a.click();
    URL.revokeObjectURL(url);
    onToast?.("Page exported as Markdown!");
  };

  const handleWikiConversion = () => {
    const wikiViews = [
      { id: 'wiki-home', type: 'table', name: 'Home', sort: 'name', filter: '', filterGroup: null },
      { id: 'wiki-all', type: 'table', name: 'All pages', sort: 'name', filter: '', filterGroup: null },
      { id: 'wiki-mine', type: 'table', name: 'Pages I own', sort: 'name', filter: '', filterGroup: { op: 'and', conditions: [{ property: 'owner', operator: 'contains', value: 'Krishna' }], groups: [] } }
    ];
    const wikiProperties = [
      { id: 'name', name: 'Page', type: 'text' },
      { id: 'tags', name: 'Tags', type: 'multi-select' },
      { id: 'owner', name: 'Owner', type: 'text' },
      { id: 'status', name: 'Status', type: 'select' },
      { id: 'verification', name: 'Verification', type: 'select' },
      { id: 'lastEdited', name: 'Last-edited', type: 'date' }
    ];
    onPagePatch?.({
      wikiEnabled: true,
      wikiTags: [],
      wikiOwner: realtimeCollab.getUser()?.userName || "Workspace User",
      wikiStatus: "Draft",
      wikiVerification: "Unreviewed",
      database: {
        properties: wikiProperties,
        rows: [],
        views: wikiViews,
        activeViewId: 'wiki-home'
      }
    });
    onToast?.("Converted to wiki with Tags, Owner, Status, Verification properties and Home/All/Mine views");
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      // readAsText below guarantees a string result, never ArrayBuffer.
      const text = ev.target?.result as string;
      const blocks: EditorBlock[] = [];
      const lines = text.split("\n").filter(l => l.trim());
      for (const line of lines) {
        const type = line.startsWith("# ") ? "h1" : line.startsWith("## ") ? "h2" : line.startsWith("### ") ? "h3" : line.startsWith("- ") ? "bullet" : line.match(/^\d+\. /) ? "number" : line.startsWith("> ") ? "quote" : "text";
        const content = line.replace(/^#{1,3} /, "").replace(/^- /, "").replace(/^\d+\. /, "").replace(/^> /, "");
        blocks.push(blockFor(type, content));
      }
      if (blocks.length > 0) onBlocks?.(blocks);
      onToast?.(`Imported ${blocks.length} blocks from ${file.name}`);
    };
    reader.readAsText(file);
    e.target.value = "";
    setImportDialogOpen(false);
  };

  // Version history data from auditEngine
  const [versionHistory, setVersionHistory] = useState([]);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const flat = flattenEditorBlocks(page?.blocks || []);
    const oldIdx = flat.findIndex(b => b.id === active.id);
    const newIdx = flat.findIndex(b => b.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(flat, oldIdx, newIdx);
    onBlocks(reordered.map(b => { const { _depth, ...rest } = b; return rest; }));
  }, [page?.blocks, onBlocks]);

  const handleAddComment = useCallback((comment) => {
    const existing = page.comments || [];
    onPagePatch?.({ comments: [...existing, comment] });
    capture("comment_added", { surface: comment.blockId === "__title__" ? "title" : "block" });
    onToast?.("Comment added");
  }, [page.comments, onPagePatch, onToast]);

  const handleResolveComment = useCallback((commentId) => {
    const existing = page.comments || [];
    onPagePatch?.({
      comments: existing.map(c => c.id === commentId ? { ...c, resolvedAt: new Date().toISOString(), resolvedBy: "You" } : c)
    });
    onToast?.("Comment resolved");
  }, [page.comments, onPagePatch, onToast]);
  const loadVersionHistory = React.useCallback(() => {
    try {
      const auditKey = `audit_${page.id}`;
      const stored = localStorage.getItem(auditKey);
      if (stored) setVersionHistory(JSON.parse(stored).slice(-20).reverse());
      else setVersionHistory([]);
    } catch { setVersionHistory([]); }
  }, [page.id]);

  useEffect(() => {
    if (renameFocusId === page.id && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
      onRenameFocusDone?.();
    }
  }, [renameFocusId, page.id, onRenameFocusDone]);

  // Dismiss title emoji picker on outside click
  useEffect(() => {
    if (!titleEmojiOpen) return;
    const handler = (e) => { if (titleEmojiRef.current && !titleEmojiRef.current.contains(e.target)) setTitleEmojiOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [titleEmojiOpen]);

  // Auto-save version history when blocks change
  useEffect(() => {
    if (!page?.blocks || page.blocks.length === 0) return;
    const timer = setTimeout(() => {
      try {
        const auditKey = `audit_${page.id}`;
        const stored = JSON.parse(localStorage.getItem(auditKey) || "[]");
        stored.push({
          id: uid(),
          timestamp: new Date().toISOString(),
          title: page.title,
          blocks: JSON.parse(JSON.stringify(page.blocks)),
          database: page.database ? JSON.parse(JSON.stringify(page.database)) : undefined,
          label: `Auto-save ${stored.length + 1}`
        });
        // Keep last 50
        localStorage.setItem(auditKey, JSON.stringify(stored.slice(-50)));
        loadVersionHistory();
      } catch { }
    }, 5000);
    return () => clearTimeout(timer);
  }, [page?.id, page?.blocks, loadVersionHistory]);

  // Load version history on mount
  useEffect(() => { loadVersionHistory(); }, [loadVersionHistory]);

  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || page.isLocked) return;
    const text = sel.toString().trim();
    if (text.length > 0 && editorContainerRef.current) {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const parentRect = editorContainerRef.current.getBoundingClientRect();
      const scrollTop = editorContainerRef.current.scrollTop;
      const scrollLeft = editorContainerRef.current.scrollLeft;

      const blockEl = (sel.anchorNode?.parentElement?.closest(".noska-block")
        || document.activeElement?.closest?.(".noska-block")) as HTMLElement | null;
      const blockId = blockEl?.dataset?.blockId;
      if (blockId) {
        const ta = document.activeElement?.tagName === 'TEXTAREA' ? (document.activeElement as HTMLTextAreaElement) : null;
        const selStart = ta ? ta.selectionStart : text.length;
        const selEnd = ta ? ta.selectionEnd : text.length;
        setSelection({
          text,
          rect: {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          },
          blockId,
          selStart,
          selEnd
        });
      }
    } else {
      setSelection({ text: "", rect: null, blockId: null });
    }
  };

  return (
    <section
      ref={editorContainerRef}
      onMouseUp={handleMouseUp}
      onScroll={(e) => {
        const target = e.currentTarget;
        const total = target.scrollHeight - target.clientHeight;
        if (total <= 0) return;
        const pct = Math.round((target.scrollTop / total) * 100);
        onScrollPercent?.(pct);
      }}
      onMouseMove={(e) => {
        if (pageIsShared) {
          const rect = e.currentTarget.getBoundingClientRect();
          sendCursor(e.clientX - rect.left, e.clientY - rect.top + e.currentTarget.scrollTop);
        }
      }}
      className={`min-h-0 flex-1 overflow-y-auto scrollbar-thin relative transition-all duration-200 ${page.fontStyle === "serif" ? "font-serif" : page.fontStyle === "mono" ? "font-mono" : "font-sans"
        }`}
      style={page.pageBg ? { background: page.pageBg } : undefined}
    >
      {/* Live cursors from other collaborators */}
      <CursorOverlay pageId={page.id} />

      {/* Cover Banner — full width of editor container or constrained by coverSize without viewport overflow */}
      {Boolean(page.cover) && (
        <div
          className={`transition-all duration-300 relative group/banner select-none overflow-hidden ${!page.coverSize || page.coverSize === "full"
              ? "w-full"
              : page.coverSize === "wide"
                ? "max-w-5xl mx-auto rounded-b-xl"
                : page.coverSize === "small"
                  ? "max-w-[480px] mx-auto rounded-b-xl"
                  : "max-w-[720px] mx-auto rounded-b-xl"
            } ${isRepositioningCover ? "ring-2 ring-blue-500/60 cursor-grab active:cursor-grabbing" : ""
            }`}
          style={{
            height: (page.coverHeight || 160) + "px",
            background: typeof page.cover === "string" && (page.cover.startsWith('linear-gradient') || page.cover.startsWith('radial-gradient'))
              ? page.cover
              : `url(${page.cover}) ${isRepositioningCover && coverDragYPercent !== null ? `center ${coverDragYPercent}%` : (page.coverPosition || "center")}/cover no-repeat`,
            filter: page.coverOverlay ? `brightness(${page.coverBrightness || 100}%)` : "none",
            ...(page.coverParallax ? { backgroundAttachment: "fixed" } : {})
          }}
          onMouseDown={(e) => {
            if (isRepositioningCover) {
              e.preventDefault();
              isDraggingCover.current = true;
              coverDragStartY.current = e.clientY;
              coverDragStartPercent.current = coverDragYPercent ?? getCoverYPercent(page.coverPosition);
            }
          }}
          onMouseMove={(e) => {
            if (isRepositioningCover && isDraggingCover.current && coverDragStartY.current !== null) {
              const deltaY = e.clientY - coverDragStartY.current;
              const height = page.coverHeight || 160;
              const deltaPercent = (deltaY / height) * 100;
              const newPercent = Math.min(100, Math.max(0, Math.round(coverDragStartPercent.current - deltaPercent)));
              setCoverDragYPercent(newPercent);
            }
          }}
          onMouseUp={() => {
            if (isRepositioningCover) {
              isDraggingCover.current = false;
            }
          }}
          onMouseLeave={() => {
            if (isRepositioningCover) {
              isDraggingCover.current = false;
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setCoverMenuPos({ left: e.clientX, top: e.clientY });
            setCoverMenuOpen(true);
          }}
        >
          {/* Repositioning visual grid hint overlay */}
          {isRepositioningCover && (
            <div className="absolute inset-0 bg-black/25 pointer-events-none flex items-center justify-center">
              <div className="border border-white/30 border-dashed rounded-lg inset-3 absolute pointer-events-none" />
            </div>
          )}

          {/* Apple Liquid Glass Cover Toolbar (Change | Reposition | Download/Options) */}
          <CoverLiquidGlassToolbar
            page={page}
            isEditable={isEditable}
            isRepositioning={isRepositioningCover}
            onStartReposition={handleStartReposition}
            onSaveReposition={handleSaveReposition}
            onCancelReposition={handleCancelReposition}
            onOpenPicker={(pos) => {
              setCoverPickerPos(pos);
              setCoverPickerOpen(true);
            }}
            onOpenSettings={(pos) => {
              setCoverMenuPos(pos);
              setCoverMenuOpen(true);
            }}
            onRemoveCover={() => {
              onPagePatch({ cover: null });
            }}
          />
        </div>
      )}

      <div className={`mx-auto px-16 ${page.cover ? "pt-4 pb-10" : "py-10"} transition-all duration-200 ${page.fullWidth ? "max-w-full px-8" : "max-w-[720px]"
        } ${page.smallText ? "noska-small-text text-xs" : ""
        }`}
        onClick={(e) => {
          if (!page.isLocked && (page.blocks || []).length > 0 && e.target === e.currentTarget) {
            const lastBlock = page.blocks[page.blocks.length - 1];
            onBlocks(insertBlockAfterTree(page.blocks || [], lastBlock.id, blockFor("text", "")));
          }
        }}
      >
        <div className="mb-2 flex items-center justify-between gap-2 relative min-h-[32px]">
          <div className="flex items-center gap-2">
            {page.isLocked && (
              <span className="flex items-center gap-1 rounded bg-[var(--danger)]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--danger)]">
                🔒 Locked
              </span>
            )}
            {permission === 'view' && !page.isLocked && (
              <span className="flex items-center gap-1 rounded bg-[var(--accent)]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                👁 View only
              </span>
            )}
            {page.sharedRole && (
              <span className="flex items-center gap-1 rounded bg-[var(--accent)]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]" title="Shared with you — you are not the owner of this page">
                🤝 Shared {page.sharedRole === "editor" ? "· can edit" : page.sharedRole === "commenter" ? "· can comment" : "· view only"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 ml-auto">
            {/* Live collaboration presence — only when someone else is actually
                on this page; the solo state is covered by the top bar's
                Collab pill (WorkspaceJoinBar) so we don't show it twice. */}
            {pageIsShared && users.length > 0 && (
              <CollabPresenceBar
                users={users}
                ownStatus={ownStatus}
                pageId={page.id}
                onStatusChange={(s) => setOwnStatus(s)}
              />
            )}
            <div className="relative flex items-center">
              <div ref={pageOptionsRef} className="flex items-center">
                <button
                  onClick={() => {
                    if (!pageMenuOpen) {
                      const rect = pageOptionsRef.current?.getBoundingClientRect();
                      const menuW = 300;
                      const margin = 8;
                      let left = (rect?.left ?? 0) - menuW + 32;
                      if (left + menuW > window.innerWidth - margin) {
                        left = Math.max(margin, window.innerWidth - menuW - margin);
                      }
                      if (left < margin) left = margin;
                      let top = (rect?.bottom ?? 0) + 4;
                      const maxMenuH = 560;
                      if (top + maxMenuH > window.innerHeight - margin) {
                        top = Math.max(margin, (rect?.top ?? top) - maxMenuH);
                      }
                      setPageMenuPos({ top, left });
                    }
                    setPageMenuOpen(!pageMenuOpen);
                  }}
                  className="grid h-8 w-8 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition cursor-pointer"
                  title="Page options"
                >
                  <MoreHorizontal size={18} />
                </button>
              </div>
              {pageMenuOpen && createPortal(
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setPageMenuOpen(false)} />
                  <div
                    className="fixed z-50"
                    style={{ top: pageMenuPos.top, left: pageMenuPos.left }}
                  >
                    <PageOptionsMenu
                      open={pageMenuOpen}
                      onClose={() => setPageMenuOpen(false)}
                      page={page}
                      onAction={(action) => {
                        setPageMenuOpen(false);
                        switch (action) {
                          case "trash": onTrashPage?.(page.id); break;
                          case "duplicate": onDuplicateBlock?.(page.id); break;
                          case "present": setPresentationMode(true); break;
                          case "suggest": setSuggestEdits(v => !v); onToast?.(`Suggest edits ${!suggestEdits ? "ON" : "OFF"}`); break;
                          case "move-to": setMoveToOpen(true); break;
                          case "customize": setCustomizeOpen(true); break;
                          case "import": setImportDialogOpen(true); break;
                          case "export": handleExport(); break;
                          case "wiki": handleWikiConversion(); break;
                          case "history": setHistoryOpen(true); break;
                          case "analytics": setAnalyticsOpen(true); break;
                          case "ai": onAskAI?.(); break;
                          default: break;
                        }
                      }}
                      wordCount={wordCount}
                      lastEditedBy={page?.lastEditedBy || realtimeCollab.getUser()?.userName || "Workspace User"}
                      lastEditedAt={page?.lastEditedAt || page?.updatedAt}
                      onPagePatch={onPagePatch}
                      onToast={onToast}
                      onTrash={onTrashPage}
                      onDuplicatePage={() => onDuplicateBlock?.(page.id)}
                      onImport={() => setImportDialogOpen(true)}
                      onExport={handleExport}
                      onAnalytics={() => setAnalyticsOpen(true)}
                      onHistory={() => setHistoryOpen(true)}
                      onAskAI={onAskAI}
                    />
                  </div>
                </>,
                document.body
              )}
            </div>
          </div>
        </div>
        <Breadcrumbs pageId={page.id} pages={pages} onNavigate={onNavigate} />
        <AnimatePresence>
          {findOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-3"
            >
              <InPageFind
                blocks={page.blocks || []}
                onClose={() => setFindOpen(false)}
                onReplace={(blockId, start, end, replacement) => {
                  // Real bug, fixed: this only ever wrote the replacement to
                  // the block's top-level `text` field. Every real block
                  // renderer (renderBlockEditor.tsx, ~10 call sites) reads
                  // and displays `properties.richText`, not `text` — so a
                  // find-and-replace here silently updated a field nothing
                  // shows, while the visible content never changed. Fixed
                  // to update both fields together, matching the exact
                  // pattern every other edit path in this file already
                  // uses (`properties: { ...block.properties, richText },
                  // text`). Confirmed live: before this fix, Replace edited
                  // localStorage's `text` field correctly but the on-screen
                  // block text never updated, even after a full reload.
                  onBlocks((page.blocks || []).map((b) => {
                    if (b.id !== blockId) return b;
                    const nextText = (b.text || "").slice(0, start) + replacement + (b.text || "").slice(end);
                    return {
                      ...b,
                      text: nextText,
                      properties: { ...(b.properties || {}), richText: plainTextToRichText(nextText) }
                    };
                  }));
                }}
              />
            </motion.div>
          )}
          {backlinksOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-3"
            >
              <BacklinksPanel pageId={page.id} pages={pages} onNavigate={onNavigate} onClose={() => setBacklinksOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>
        {/* Page header and title container with hover controls */}
        <div className="group/header relative mb-5">
          {/* Hover-revealed action bar: Change cover, Add/Change icon, Voice capture */}
          {isEditable && (
            <div className="relative z-30 flex items-center gap-2 mb-2 min-h-[30px] opacity-0 group-hover/header:opacity-100 transition-opacity duration-150 select-none pointer-events-none group-hover/header:pointer-events-auto">
              {!page.icon && (
                <button
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] cursor-pointer transition pointer-events-auto"
                  onClick={() => {
                    onPagePatch({ icon: "📝" });
                    setTitleEmojiOpen(true);
                  }}
                >
                  <span>Add icon</span>
                </button>
              )}
              <div className="relative pointer-events-auto">
                <button
                  ref={coverBtnRef}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] cursor-pointer transition pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pickerW = 360;
                    let left = rect.left;
                    if (left + pickerW > window.innerWidth - 16) {
                      left = Math.max(16, window.innerWidth - pickerW - 16);
                    }
                    setCoverPickerPos({ top: rect.bottom + 6, left });
                    setCoverPickerOpen((o) => !o);
                  }}
                >
                  <span>{page.cover ? "Change cover" : "Add cover"}</span>
                </button>
                <CoverPicker
                  open={coverPickerOpen}
                  onClose={() => setCoverPickerOpen(false)}
                  onSelect={(cover) => onPagePatch({ cover: cover.value })}
                  onRemove={() => onPagePatch({ cover: null })}
                  currentCover={page.cover}
                  position={coverPickerPos}
                />
              </div>
              {coverMenuOpen && createPortal(
                <CoverContextMenu
                  open={coverMenuOpen}
                  position={coverMenuPos}
                  settings={{
                    coverPosition: page.coverPosition,
                    coverSize: page.coverSize,
                    coverHeight: page.coverHeight,
                    coverParallax: page.coverParallax,
                    coverBlur: page.coverBlur,
                    coverOverlay: page.coverOverlay,
                    coverBrightness: page.coverBrightness
                  }}
                  onUpdate={(settings) => {
                    onPagePatch(settings);
                  }}
                  onClose={() => setCoverMenuOpen(false)}
                />,
                document.body
              )}
              <button
                className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] cursor-pointer transition pointer-events-auto"
                onMouseDown={(e) => e.preventDefault()}
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await globalVoiceController.toggle();
                    const err = globalVoiceController.getError?.() || null;
                    if (err) {
                      onToast?.(`Flow error: ${err.message}`);
                    }
                  } catch (err: any) {
                    onToast?.(`Flow failed: ${err?.message || "Unknown error"}`);
                  }
                }}
                title="Toggle Flow (Ctrl+Shift+Space)"
              >
                <Mic size={12} />
                <span>Flow</span>
              </button>
            </div>
          )}

          {/* Page icon placed above title with full customization (size, padding, free move, alignment) */}
          <PageIconBlock
            page={page}
            isEditable={isEditable}
            onPagePatch={onPagePatch}
            open={titleEmojiOpen}
            onOpen={() => setTitleEmojiOpen(true)}
            onClose={() => setTitleEmojiOpen(false)}
            hasCover={Boolean(page.cover)}
          />

          {/* Page title row with drag handle and free movement */}
          <motion.div
            drag={isEditable && !page.isLocked}
            dragControls={titleDragControls}
            dragListener={false}
            dragMomentum={false}
            onDragEnd={(_e, info) => {
              const nextX = Math.round((page.titleOffsetX || 0) + info.offset.x);
              const nextY = Math.round((page.titleOffsetY || 0) + info.offset.y);
              onPagePatch({ titleOffsetX: nextX, titleOffsetY: nextY });
            }}
            style={{
              x: page.titleOffsetX || 0,
              y: page.titleOffsetY || 0,
              rotate: page.titleRotation || 0
            }}
            className="group/title relative flex items-start gap-1"
          >
            {!page.isLocked && (
              <div className="block-tools flex w-12 shrink-0 items-start justify-end gap-0.5 pt-2 transition z-20 opacity-0 group-hover/title:opacity-100">
                {isEditable && (
                  <>
                    <button
                      className="grid h-6 w-5 place-items-center rounded text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] hover:scale-110 active:scale-90 cursor-grab active:cursor-grabbing transition-transform touch-none"
                      aria-label="Drag title"
                      draggable="false"
                      title="Drag to freely reposition title"
                      onPointerDown={(e) => {
                        if (isEditable && !page.isLocked) {
                          titleDragControls.start(e);
                        }
                      }}
                    >
                      <GripVertical size={15} />
                    </button>
                    <button
                      className="grid h-6 w-5 place-items-center rounded text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--accent)] cursor-pointer transition"
                      aria-label="Add block above title"
                      onClick={() => {
                        const nextId = uid();
                        const blocks = page.blocks || [];
                        onBlocks([{ id: nextId, type: "text", text: "" }, ...blocks]);
                        setOpenSlashForBlockId(nextId);
                      }}
                    >
                      <Plus size={15} />
                    </button>
                  </>
                )}
                {/* Comment on title */}
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveCommentBlockId(activeCommentBlockId === "__title__" ? null : "__title__"); }}
                    className={`grid h-6 w-5 place-items-center rounded cursor-pointer transition ${(page.comments || []).some(c => c.blockId === "__title__" && !c.resolvedAt)
                        ? "text-[var(--accent)] opacity-100"
                        : "text-[var(--muted)] opacity-0 group-hover/title:opacity-100"
                      } hover:bg-[var(--hover)]`}
                    aria-label="Toggle comments on title"
                  >
                    <MessageCircle size={13} />
                  </button>
                  {activeCommentBlockId === "__title__" && (
                    <>
                      <div className="fixed inset-0 z-[150]" onClick={() => setActiveCommentBlockId(null)} />
                      <div className="absolute top-0 left-full ml-2 z-[160]">
                        <CommentThread
                          comments={(page.comments || []).filter(c => c.blockId === "__title__")}
                          blockId="__title__"
                          pageId={page.id}
                          onAddComment={handleAddComment}
                          onResolveComment={handleResolveComment}
                          onClose={() => setActiveCommentBlockId(null)}
                          pages={pages}
                          onNavigate={onNavigate}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
            <input
              ref={titleRef}
              value={page.title}
              readOnly={page.isLocked}
              onChange={(e) => onPagePatch({ title: e.target.value })}
              style={{
                fontSize: `${page.titleSize || 40}px`,
                fontWeight:
                  page.titleWeight === "normal"
                    ? 400
                    : page.titleWeight === "semibold"
                      ? 600
                      : page.titleWeight === "bold"
                        ? 700
                        : 800,
                fontFamily:
                  page.titleFont === "serif"
                    ? "Georgia, Cambria, serif"
                    : page.titleFont === "mono"
                      ? "JetBrains Mono, Fira Code, monospace"
                      : "inherit",
                textAlign: (page.titleAlign as any) || "left",
                letterSpacing:
                  page.titleTracking === "tighter"
                    ? "-0.04em"
                    : page.titleTracking === "tight"
                      ? "-0.025em"
                      : page.titleTracking === "wide"
                        ? "0.05em"
                        : "-0.015em",
                ...(page.titleColor && page.titleColor !== "default"
                  ? {
                    backgroundImage: TITLE_GRADIENTS.find((g) => g.id === page.titleColor)?.style || "none",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent"
                  }
                  : {})
              }}
              className="flex-1 min-w-0 bg-transparent leading-tight text-[var(--text)] outline-none placeholder:text-[var(--muted)] mt-1 transition-all"
              placeholder="Untitled"
              aria-label="Page title"
            />
            {isEditable && (
              <div className="relative shrink-0 mt-2 flex items-center z-30 pointer-events-auto">
                <button
                  ref={titleMenuBtnRef}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setTitleCustomizerOpen((prev) => !prev);
                  }}
                  className="h-8 w-8 rounded-lg hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] grid place-items-center transition cursor-pointer select-none opacity-60 hover:opacity-100 z-30 pointer-events-auto"
                  title="Customize Title (Size, Font, Color, Style)"
                >
                  <Menu size={18} />
                </button>
                <PageTitleCustomizer
                  page={page}
                  isEditable={isEditable}
                  onPagePatch={onPagePatch}
                  open={titleCustomizerOpen}
                  onClose={() => setTitleCustomizerOpen(false)}
                  anchorRef={titleMenuBtnRef}
                />
              </div>
            )}
          </motion.div>
        </div>
        {(page.blocks || []).length === 0 && <EmptyState onAdd={() => onBlocks([blockFor("text", "")])} onBlocks={onBlocks} disabled={page.isLocked} />}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e) => setActiveId(e.active.id)} onDragEnd={handleDragEnd}>
          <SortableContext items={flatBlockIds} strategy={verticalListSortingStrategy}>
            <div
              ref={containerRef}
              className="space-y-1 relative" role="region" aria-label="Page content"
              onPointerDown={handleDragSelectStart}
            >
              {/* Selection drag marquee */}
              {selectionMode && selectionRect && (
                <div
                  className="absolute z-30 rounded-md border border-[var(--accent)]/50 bg-[var(--accent)]/10 pointer-events-none"
                  style={{
                    left: selectionRect.x,
                    top: selectionRect.y,
                    width: selectionRect.width,
                    height: selectionRect.height,
                  }}
                />
              )}
              <EditorBlockList
                renderedBlocks={renderedBlocks}
                page={page}
                pages={pages}
                selectedBlockIds={selectedBlockIds}
                openSlashForBlockId={openSlashForBlockId}
                onClearOpenSlash={handleClearOpenSlash}
                setOpenSlashForBlockId={setOpenSlashForBlockId}
                blockCtx={blockCtx}
                handlePointerDown={handlePointerDown}
                activeCommentBlockId={activeCommentBlockId}
                setActiveCommentBlockId={setActiveCommentBlockId}
                pageComments={page.comments || []}
                handleAddComment={handleAddComment}
                handleResolveComment={handleResolveComment}
                onAskAI={onAskAI}
                onFocusBlock={onFocusBlock}
                ghostWriterEnabled={ghostWriterEnabled}
                apiKey={apiKey}
                aiProvider={aiProvider}
                nvidiaKey={nvidiaKey}
                onToast={onToast}
                onUpdatePage={onUpdatePage}
                onPagePatch={onPagePatch}
                onCreateSubpage={onCreateSubpage}
                onNavigate={onNavigate}
              />
            </div>
          </SortableContext>
          <DragOverlay>
            {activeId ? <DragGhostBlock block={flatBlockMap[activeId]} /> : null}
          </DragOverlay>
        </DndContext>

        {/* Multi-selection batch action bar — all actions mutate blocks,
            gated on isEditable (not just isLocked); real gap found during
            live UI QA. */}
        {hasSelection && selectedBlockIds.size > 0 && isEditable && (
          <div className="sticky bottom-0 z-40 -mx-16 mt-2 flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--elevated)] px-3 py-2 shadow-lg backdrop-blur-sm w-fit mx-auto">
            <span className="text-[10px] font-medium text-[var(--secondary)] mr-1.5">
              {selectedBlockIds.size} selected
            </span>
            <div className="h-4 w-px bg-[var(--border)]" />
            <button
              onClick={() => {
                const ids = new Set(selectedBlockIds);
                const prevBlocks = page.blocks || [];
                let nextBlocks = prevBlocks.filter((b) => !ids.has(b.id));
                onBlocks(nextBlocks);
                clearSelection();
              }}
              className="rounded-md px-2 py-1 text-xs text-[var(--danger)] hover:bg-[var(--danger)]/10 transition"
            >
              Delete
            </button>
            <button
              onClick={() => {
                let nextBlocks = [...(page.blocks || [])];
                const clones = [];
                for (const block of nextBlocks) {
                  if (selectedBlockIds.has(block.id)) {
                    clones.push(JSON.parse(JSON.stringify({ ...block, id: uid() })));
                  }
                }
                const lastIdx = nextBlocks.findIndex((b) => selectedBlockIds.has(b.id));
                nextBlocks.splice(lastIdx + 1, 0, ...clones);
                onBlocks(nextBlocks);
                clearSelection();
              }}
              className="rounded-md px-2 py-1 text-xs text-[var(--secondary)] hover:bg-[var(--hover)] transition"
            >
              Duplicate
            </button>
            <button
              onClick={() => {
                onBlocks([...(page.blocks || [])].map((b) =>
                  selectedBlockIds.has(b.id) ? { ...b, color: "var(--accent)" } : b
                ));
                clearSelection();
              }}
              className="rounded-md px-2 py-1 text-xs text-[var(--secondary)] hover:bg-[var(--hover)] transition"
            >
              Highlight
            </button>
            <button
              onClick={() => {
                const ids = Array.from(selectedBlockIds);
                const text = ids.map((id) => {
                  const b = (page.blocks || []).find((x) => x.id === id);
                  return b?.text || "";
                }).filter(Boolean).join("\n\n");
                navigator.clipboard.writeText(text);
                clearSelection();
              }}
              className="rounded-md px-2 py-1 text-xs text-[var(--secondary)] hover:bg-[var(--hover)] transition"
            >
              Copy
            </button>
            <button
              onClick={clearSelection}
              className="rounded-md px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--hover)] transition"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Click empty space to add a block — large invisible click target.
            Mutation-only, gated on isEditable (not just isLocked). */}
        {isEditable && (page.blocks || []).length > 0 && (
          <div
            onClick={() => {
              const lastBlock = page.blocks[page.blocks.length - 1];
              const newBlock = blockFor("text", "");
              onBlocks(insertBlockAfterTree(page.blocks || [], lastBlock.id, newBlock));
            }}
            className="flex w-full cursor-text items-center py-12"
          >
            <span className="text-xs text-[var(--muted)]/0 select-none">.</span>
          </div>
        )}

      </div>

      {/* Unified Global Floating Format & Expandable AI Skills Toolbar */}
      {selection.text && !page.isLocked && (
        <FloatingFormatToolbar
          selection={selection}
          onClose={() => setSelection({ text: "", rect: null, blockId: null })}
          onFormat={(formatKey) => {
            const targetBlock = page.blocks.find(b => b.id === selection.blockId);
            if (targetBlock) {
              const text = targetBlock.text || "";
              const selText = selection.text;
              const start = selection.selStart ?? text.indexOf(selText);
              const end = selection.selEnd ?? start + selText.length;
              let formatted = selText;
              if (formatKey === "bold") formatted = `**${selText}**`;
              else if (formatKey === "italic") formatted = `*${selText}*`;
              else if (formatKey === "underline") formatted = `<u>${selText}</u>`;
              else if (formatKey === "code") formatted = `\`${selText}\``;
              else if (formatKey === "strikethrough") formatted = `~~${selText}~~`;
              else if (formatKey === "clear") formatted = selText.replace(/[\*\_~`]|<\/?u>/g, "");
              else if (formatKey.startsWith("color-")) {
                const colorVar = formatKey.slice(6);
                formatted = `@@${colorVar}:${selText}@@`;
              }
              const newText = text.slice(0, start) + formatted + text.slice(end);
              onBlockPatch(selection.blockId!, { text: newText });
            }
          }}
          onReplace={(newText) => {
            const targetBlock = page.blocks.find(b => b.id === selection.blockId);
            if (targetBlock) {
              const text = targetBlock.text || "";
              const start = selection.selStart ?? text.indexOf(selection.text);
              const end = selection.selEnd ?? start + selection.text.length;
              const replacedText = text.slice(0, start) + newText + text.slice(end);
              onBlockPatch(selection.blockId!, { text: replacedText });
            }
            setSelection({ text: "", rect: null, blockId: null });
          }}
          onInsert={(newText) => {
            if (selection.blockId) {
              onAddBlock(selection.blockId, "text", newText);
            }
            setSelection({ text: "", rect: null, blockId: null });
          }}
          onTurnInto={(newType) => {
            const targetBlock = page.blocks.find(b => b.id === selection.blockId);
            if (targetBlock) {
              onBlockPatch(targetBlock.id, { ...blockForTreeConversion(targetBlock, newType, targetBlock.text) });
            }
          }}
          onComment={() => {
            if (selection.blockId) setActiveCommentBlockId(selection.blockId);
          }}
          apiKey={apiKey}
          aiProvider={aiProvider}
          nvidiaKey={nvidiaKey}
        />
      )}
      {presentationMode && (
        <div className="fixed inset-0 z-[200] bg-[var(--bg)] flex flex-col overflow-y-auto">
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-sm">
            <h2 className="text-lg font-bold truncate">{page.title || "Untitled"}</h2>
            <button onClick={() => setPresentationMode(false)} className="grid h-8 w-8 place-items-center rounded-md hover:bg-[var(--hover)] transition cursor-pointer">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 mx-auto max-w-3xl w-full px-8 py-12 space-y-6 text-lg leading-relaxed">
            {(page.blocks || []).map((block, i) => (
              <div key={block.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${i * 80}ms` }}>
                {block.type === "h1" && <h1 className="text-3xl font-bold mt-8 mb-2">{block.text}</h1>}
                {block.type === "h2" && <h2 className="text-2xl font-bold mt-6 mb-1">{block.text}</h2>}
                {block.type === "h3" && <h3 className="text-xl font-semibold mt-4 mb-1">{block.text}</h3>}
                {block.type === "bullet" && <li className="ml-6 list-disc">{block.text}</li>}
                {block.type === "number" && <li className="ml-6 list-decimal">{block.text}</li>}
                {block.type === "todo" && <div className="flex items-center gap-2"><input type="checkbox" checked={Boolean(block.checked)} readOnly className="accent-[var(--accent)]" /><span className={block.checked ? "line-through opacity-60" : ""}>{block.text}</span></div>}
                {block.type === "quote" && <blockquote className="border-l-4 border-[var(--accent)] pl-4 italic opacity-80">{block.text}</blockquote>}
                {block.type === "divider" && <hr className="border-[var(--border)]" />}
                {(block.type === "text" || !block.type) && <p>{block.text}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggest Edits Banner */}
      {suggestEdits && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-2 text-xs text-[var(--accent)] shadow-lg backdrop-blur-sm">
          <FileEdit size={14} />
          <span>Suggest edits mode — changes are highlighted</span>
          <button onClick={() => setSuggestEdits(false)} className="ml-2 hover:text-[var(--accent)] cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Move To Modal */}
      {moveToOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMoveToOpen(false)} />
          <div className="relative z-10 w-[360px] max-h-[400px] rounded-xl border border-[var(--border)] bg-[var(--elevated)] shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <span className="text-sm font-semibold">Move to...</span>
              <button onClick={() => setMoveToOpen(false)} className="text-[var(--muted)] hover:text-[var(--text)] cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {pages.filter(p => p.id !== page.id && !p.trashed).length === 0 && (
                <div className="px-3 py-8 text-center text-xs text-[var(--muted)]">No pages to move to</div>
              )}
              {pages.filter(p => p.id !== page.id && !p.trashed).map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    onPagePatch?.({ parentId: p.id });
                    setMoveToOpen(false);
                    onToast?.(`Moved under "${p.title || "Untitled"}"`);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-left hover:bg-[var(--hover)] transition cursor-pointer"
                >
                  <Move size={13} className="text-[var(--muted)] shrink-0" />
                  <span className="truncate flex items-center gap-1"><PageIcon icon={p.icon} size={13} fallback="📄" /> {p.title || "Untitled"}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Import Dialog */}
      {importDialogOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setImportDialogOpen(false)} />
          <div className="relative z-10 w-[360px] rounded-xl border border-[var(--border)] bg-[var(--elevated)] shadow-2xl p-6 flex flex-col items-center gap-4">
            <Upload size={32} className="text-[var(--muted)]" />
            <p className="text-sm font-medium">Import Markdown</p>
            <p className="text-[11px] text-[var(--muted)] text-center">Upload a .md file to import as blocks</p>
            <input ref={importInputRef} type="file" accept=".md,.markdown,.txt" onChange={handleFileImport} className="hidden" />
            <button
              onClick={() => importInputRef.current?.click()}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition cursor-pointer"
            >
              Choose File
            </button>
          </div>
        </div>
      )}

      {/* Version History Panel */}
      {historyOpen && (
        <VersionHistoryPanel
          versionHistory={versionHistory}
          onClose={() => setHistoryOpen(false)}
          currentBlocks={page.blocks || []}
          currentTitle={page.title}
          currentDb={page.database}
          onRestore={(v) => {
            if (v.blocks) {
              if (v.title) onPagePatch?.({ title: v.title, blocks: v.blocks });
              else onPagePatch?.({ blocks: v.blocks });
              onToast?.("Version restored");
            }
            setHistoryOpen(false);
          }}
          onSelectiveRestore={(blocks) => {
            onPagePatch?.({ blocks });
            onToast?.("Selected blocks restored");
            setHistoryOpen(false);
          }}
          onRestoreDbView={(v) => {
            if (v.database) {
              const currentDb = page.database || {};
              onPagePatch?.({ database: { ...currentDb, properties: v.database.properties, views: v.database.views, activeViewId: v.database.activeViewId } });
              onToast?.("Database views/properties restored (rows preserved)");
            }
            setHistoryOpen(false);
          }}
        />
      )}

      {/* AI study-card generator */}
      {studyGeneratorOpen && (
        <AIFlashcardGenerator
          page={page}
          onBlocks={(next) => onBlocks(next as EditorBlock[])}
          apiKey={apiKey}
          aiProvider={aiProvider}
          nvidiaKey={nvidiaKey}
          onClose={() => setStudyGeneratorOpen(false)}
          onToast={onToast}
        />
      )}

      {/* Analytics Panel */}
      {analyticsOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setAnalyticsOpen(false)} />
          <div className="relative z-10 w-[380px] rounded-xl border border-[var(--border)] bg-[var(--elevated)] shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <BarChart3 size={15} />
                <span className="text-sm font-semibold">Updates & Analytics</span>
              </div>
              <button onClick={() => setAnalyticsOpen(false)} className="text-[var(--muted)] hover:text-[var(--text)] cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-[var(--border)] p-3">
                  <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Words</div>
                  <div className="text-2xl font-bold mt-1">{wordCount}</div>
                </div>
                <div className="rounded-lg border border-[var(--border)] p-3">
                  <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Blocks</div>
                  <div className="text-2xl font-bold mt-1">{(page.blocks || []).length}</div>
                </div>
              </div>
              <div className="rounded-lg border border-[var(--border)] p-3 space-y-2">
                <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Page Info</div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--muted)]">Created</span>
                  <span>{page.createdAt ? new Date(page.createdAt).toLocaleDateString() : "—"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--muted)]">Last edited</span>
                  <span>{page.updatedAt ? new Date(page.updatedAt).toLocaleDateString() : "—"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--muted)]">Version history</span>
                  <span>{versionHistory.length} versions</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        context={{
          page,
          pages,
          onNavigate,
          onPagePatch,
          onToast,
          onBlocks,
          onTrash: onTrashPage,
          onDuplicatePage: () => onDuplicateBlock?.(page.id),
          onImport: () => setImportDialogOpen(true),
          onExport: () => handleExport(),
          onAnalytics: () => setAnalyticsOpen(true),
          onGenerateStudyCards: () => setStudyGeneratorOpen(true),
          onHistory: () => setHistoryOpen(true),
          onMoveTo: () => setMoveToOpen(true),
          onToggleSuggest: () => { setSuggestEdits(v => !v); onToast?.(`Suggest edits ${!suggestEdits ? "ON" : "OFF"}`); },
          onWiki: () => handleWikiConversion(),
          setCustomizeOpen,
          onPresent: () => setPresentationMode(true),
          onAskAI,
        }}
      />

      <CustomizePanel
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        page={page}
        onPagePatch={onPagePatch}
        onToast={onToast}
      />
    </section>
  );
}

interface BlockProps {
  block: EditorBlock;
  index: number;
  page: Page;
  pages: Page[];
  onPatch: (patch: Record<string, unknown>) => void;
  onAdd: (type: string, text: string, customId?: string) => void;
  onAddAbove: (type: string, text: string, customId?: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  // `dir` is optional: most call sites (Ctrl+Shift+Arrow) pass a real
  // direction, but BlockContextMenu's "move-to" action (line ~2346)
  // calls `onMove?.()` with no argument at all — a pre-existing quirk,
  // not something this migration changes. `onMoveBlock` (Editor's own
  // prop, called as `(dir) => onMoveBlock(block.id, dir)`) receives
  // `undefined` in that case.
  onMove: (dir?: number) => void;
  onSwapBlocks: (fromId: string, toId: string) => void;
  onAskAI?: () => void;
  onFocusBlock?: (blockId: string) => void;
  ghostWriterEnabled?: boolean;
  apiKey?: string;
  aiProvider?: string;
  nvidiaKey?: string;
  onToast?: (message: string) => void;
  onUpdatePage?: (pageId: string, patch: Record<string, unknown>) => void;
  onPagePatch?: (patch: Record<string, unknown>) => void;
  onBlocks: (blocks: EditorBlock[]) => void;
  openSlash: boolean;
  onClearOpenSlash: () => void;
  onSetOpenSlashBlockId: (blockId: string | null) => void;
  onCreateSubpage?: (blockId: string, text: string) => string | null | undefined;
  onNavigate?: (pageId: string, options?: { altKey?: boolean }) => void;
  activeCommentBlockId: string | null;
  setActiveCommentBlockId: (blockId: string | null) => void;
  pageComments: Array<Record<string, unknown>>;
  handleAddComment: (comment: Record<string, unknown>) => void;
  handleResolveComment: (commentId: string) => void;
  isSelected: boolean;
  onSelectBlock: (e: React.PointerEvent) => void;
}

const Block = memo(function Block({
  block,
  index,
  page,
  pages,
  onPatch,
  onAdd,
  onAddAbove,
  onDelete,
  onDuplicate,
  onMove,
  onSwapBlocks,
  onAskAI,
  onFocusBlock,
  ghostWriterEnabled,
  apiKey,
  aiProvider,
  nvidiaKey,
  onToast,
  onUpdatePage,
  onPagePatch,
  onBlocks,
  openSlash,
  onClearOpenSlash,
  onSetOpenSlashBlockId,
  onCreateSubpage,
  onNavigate,
  activeCommentBlockId,
  setActiveCommentBlockId,
  pageComments,
  handleAddComment,
  handleResolveComment,
  isSelected,
  onSelectBlock
}: BlockProps) {
  interface CaretRectLike { top: number; bottom: number; left: number; }
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashPos, setSlashPos] = useState<{ top: number; left: number } | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [emojiPickerPos, setEmojiPickerPos] = useState<CaretRectLike | null>(null);
  const [emojiSearch, setEmojiSearch] = useState("");
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionPos, setMentionPos] = useState<CaretRectLike | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [inlineAI, setInlineAI] = useState<{ top: number; left: number; text: string } | null>(null);
  const inlineAIBlockRef = useRef<string | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  // Set true only when the user actually presses the "/" key, so the slash
  // menu opens on a real keystroke — not when clicking into / focusing a block
  // whose text already contains "/".
  const slashKeyPressedRef = useRef(false);

  const slashRef = useOutsideDismiss(slashOpen, () => setSlashOpen(false));
  const mentionRef = useOutsideDismiss<HTMLDivElement>(mentionOpen, () => setMentionOpen(false));
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [blockContextOpen, setBlockContextOpen] = useState(false);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

  const blockPermission = React.useMemo(() => getPagePermission(page, pages), [page, pages]);

  const mentionItems = pages.filter(
    (p) => p.title.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  // Ghost Writer Hook Integration
  const { suggestion, accept, dismiss } = useGhostWriter({
    blockText: block.text,
    contextBefore: index > 0 ? pages.find(p => p.blocks?.some(b => b.id === block.id))?.blocks?.slice(0, index).map(b => b.text).join("\n") || "" : "",
    enabled: isFocused && ghostWriterEnabled && !page.isLocked,
    apiKey,
    aiProvider,
    nvidiaKey
  });

  const positionSlashMenu = useCallback((caretRect) => {
    if (!caretRect) return null;
    const menuWidth = 352;
    const menuHeight = 460;
    const margin = 8;

    const spaceBelow = window.innerHeight - caretRect.bottom;
    let top;
    if (spaceBelow < menuHeight && caretRect.top > menuHeight) {
      top = caretRect.top - menuHeight - margin;
    } else {
      top = caretRect.bottom + margin;
    }

    let left = caretRect.left;
    if (left + menuWidth > window.innerWidth - margin) {
      left = window.innerWidth - menuWidth - margin;
    }
    if (left < margin) left = margin;

    return { top, left };
  }, []);

  const getCaretRect = useCallback(() => {
    try {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return null;
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return null;
      return rect;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (openSlash) {
      setSlashOpen(true);
      const caretRect = getCaretRect();
      const pos = positionSlashMenu(caretRect);
      if (pos) setSlashPos(pos);
      onClearOpenSlash?.();
      setTimeout(() => {
        const textarea = inputRef.current;
        if (textarea) textarea.focus();
      }, 50);
    }
  }, [openSlash, positionSlashMenu, getCaretRect]);

  const applyFormat = (formatType: string) => {
    const ta = inputRef.current;
    if (!ta) return;
    const { selectionStart, selectionEnd } = ta;
    if (selectionStart == null || selectionEnd == null) return;
    const selText = ta.value.substring(selectionStart, selectionEnd);
    if (!selText) {
      const pairs = { bold: '****', italic: '**', underline: '<u></u>', strikethrough: '~~~~', code: '``' };
      const pair = pairs[formatType];
      if (!pair) return;
      const mid = Math.floor(pair.length / 2);
      onPatch({ text: ta.value.slice(0, selectionStart) + pair + ta.value.slice(selectionStart) });
      setTimeout(() => {
        const t = inputRef.current;
        if (t) { t.focus(); t.setSelectionRange(selectionStart + mid, selectionStart + mid); }
      }, 0);
      return;
    }
    let formatted;
    const markerSpec = {
      bold: { open: "**", close: "**" },
      italic: { open: "*", close: "*" },
      underline: { open: "<u>", close: "</u>" },
      strikethrough: { open: "~~", close: "~~" },
      code: { open: "`", close: "`" },
    };
    const spec = markerSpec[formatType];
    if (formatType === 'clear') formatted = selText.replace(/[\*\_~`$]|<\/?u>/g, "").replace(/@@(bg-)?\w+:/g, "").replace(/@@/g, "");
    else if (formatType.startsWith('color-')) {
      const colorVar = formatType.slice(6);
      formatted = `@@${colorVar}:${selText}@@`;
    } else if (spec) {
      formatted = `${spec.open}${selText}${spec.close}`;
    } else return;
    onPatch({ text: ta.value.slice(0, selectionStart) + formatted + ta.value.slice(selectionEnd) });
    setTimeout(() => {
      const t = inputRef.current;
      if (t) { t.focus(); t.setSelectionRange(selectionStart + formatted.length, selectionStart + formatted.length); }
    }, 0);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (page.isLocked) return;
    // Close slash menu on paste (spec §11)
    if (slashOpen) {
      setSlashOpen(false);
    }
    const pasted = e.clipboardData?.getData("text") || "";
    const urlMatch = pasted.match(/^https?:\/\/[^\s]+$/);
    if (!urlMatch) return;
    const targetBlock = (e.target as HTMLElement)?.closest?.("[data-block-id]");
    if (!targetBlock) return;
    const blockId = targetBlock.getAttribute("data-block-id");
    const block = (page.blocks || []).find(b => b.id === blockId);
    if (!block || !["text", "bullet", "number", "todo", "quote", "h1", "h2", "h3", "h4"].includes(block.type)) return;
    e.preventDefault();
    const url = urlMatch[0];
    const embedType = detectEmbedType(url);
    if (embedType) {
      onPatch({
        ...blockForTreeConversion(block, embedType, url),
        text: url
      });
    } else if (/\.(png|jpg|jpeg|gif|svg|webp)/i.test(url)) {
      onPatch({
        ...blockForTreeConversion(block, "image", url),
        text: url
      });
    } else {
      onPatch({
        ...blockForTreeConversion(block, "bookmark", url),
        text: url
      });
    }
  };

  const detectEmbedType = (url: string): string | null => {
    if (/youtube\.com|youtu\.be/i.test(url)) return "video";
    if (/twitter\.com|x\.com/i.test(url)) return "tweet";
    if (/vimeo\.com/i.test(url)) return "video";
    return null;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (page.isLocked || blockPermission === 'view') return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); applyFormat('bold'); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') { e.preventDefault(); applyFormat('italic'); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') { e.preventDefault(); applyFormat('underline'); return; }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') { e.preventDefault(); applyFormat('strikethrough'); return; }
    if ((e.ctrlKey || e.metaKey) && e.code === 'Backquote') { e.preventDefault(); applyFormat('code'); return; }

    if ((e.key === "Tab" || (e.key === "Enter" && !e.shiftKey && !block.text?.trim().endsWith("/"))) && suggestion) {
      e.preventDefault();
      const accepted = accept();
      if (accepted) {
        onPatch({ text: (block.text || "") + " " + accepted });
      }
      return;
    }
    if (e.key === "Escape" && suggestion) {
      e.preventDefault();
      dismiss();
      return;
    }

    if (e.key === " " && !e.shiftKey) {
      // If slash menu is open, close it and insert space (spec §6)
      if (slashOpen) {
        setSlashOpen(false);
        return;
      }

      const shortcuts = {
        "#": "h1",
        "##": "h2",
        "###": "h3",
        "####": "h4",
        "-": "bullet",
        "*": "bullet",
        "+": "bullet",
        ">": "toggle",
        '"': "quote",
        "[]": "todo",
        "[ ]": "todo",
        "[x]": "todo-checked",
        "[X]": "todo-checked",
        "1.": "number",
        "***": "divider",
        "---": "divider"
      };
      const nextType = shortcuts[(block.text || "").trim()];
      if (nextType) {
        e.preventDefault();
        if (nextType === "divider") {
          onDelete();
          onAdd("divider", "");
        } else if (nextType === "todo-checked") {
          onPatch({ ...blockForTreeConversion(block, "todo", ""), checked: true });
        } else {
          onPatch(blockForTreeConversion(block, nextType, ""));
        }
        return;
      }
      // Open Notion AI bar ONLY when pressing Space on a completely empty block or single "/"
      const rawText = block.text || "";
      if (!inlineAI && (rawText === "" || rawText === "/")) {
        e.preventDefault();
        const blockEl = (e.target as HTMLElement).closest(".noska-block");
        inlineAIBlockRef.current = blockEl?.getAttribute("data-block-id") ?? null;
        const rect = blockEl?.getBoundingClientRect();
        setInlineAI({ top: (rect?.bottom || 0) + 8, left: (rect?.left || 0), text: "" });
        return;
      }
      return;
    }
    // Skip slash detection during IME composition
    if (e.nativeEvent?.isComposing) return;

    // Clear any stale slash-key flag when a different key is pressed, so the
    // menu never opens from a leftover flag on later edits.
    if (e.key !== "/" && slashKeyPressedRef.current) {
      slashKeyPressedRef.current = false;
    }

    // ── Slash command trigger (spec §5.1 / §17) ──
    // Skip inside code and math blocks (spec §11)
    if (e.key === "/" && block.type !== "code" && block.type !== "inline-equation") {
      const ta = e.target as HTMLTextAreaElement;
      const cursorPos = ta.selectionStart ?? (block.text || "").length;
      const textBefore = (block.text || "").slice(0, cursorPos);
      // The "/" hasn't been inserted yet on keydown. It's a valid trigger if the
      // caret is at line start or immediately after whitespace.
      const validTrigger = textBefore === "" || /\s$/.test(textBefore);
      if (!validTrigger) return;
      // Flag that a real "/" keystroke happened; patchWithSlashDetection will
      // open the menu once the "/" is inserted into the text.
      slashKeyPressedRef.current = true;
      return;
    }

    // When slash menu is open, intercept keyboard for navigation
    if (slashOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setSlashOpen(false);
        return;
      }
      if (e.key === "Backspace") {
        const ta = e.target as HTMLTextAreaElement;
        const cursorPos = ta.selectionStart ?? (block.text || "").length;
        const textBefore = (block.text || "").slice(0, cursorPos);
        // If backspace would delete the leading /, close the menu
        if (textBefore === "/" || textBefore === "") {
          setSlashOpen(false);
          return;
        }
      }
    }
    if (e.key === "Enter" && !e.shiftKey && block.type !== "code") {
      e.preventDefault();
      const newBlockId = uid();
      onAdd("text", "", newBlockId);
      setTimeout(
        () => {
          const nextEl = document.querySelector(`[data-block-id="${newBlockId}"]`);
          const focusable =
            nextEl?.querySelector<HTMLElement>("[contenteditable='true']") ||
            nextEl?.querySelector<HTMLElement>("textarea, input") ||
            (inputRef.current?.closest(".noska-block")?.nextSibling as Element | null)?.querySelector<HTMLElement>("[contenteditable='true'], textarea, input");
          if (focusable) {
            focusable.focus();
            if (focusable.getAttribute("contenteditable") === "true") {
              const sel = window.getSelection();
              if (sel) {
                const range = document.createRange();
                range.selectNodeContents(focusable);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
              }
            }
          }
        },
        10
      );
    }
    if (e.key === "Backspace" && !block.text) onDelete();
    if (e.key === "Tab") {
      e.preventDefault();
      if (!page?.blocks) return;
      const nextBlocks = e.shiftKey
        ? outdentBlockTree(page.blocks, block.id)
        : indentBlockTree(page.blocks, block.id);
      if (nextBlocks !== page.blocks) onBlocks(nextBlocks);
    }
    // Arrow Up/Down to navigate between blocks
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const dir = e.key === "ArrowDown" ? 1 : -1;
      const flat = flattenEditorBlocks(page.blocks || []);
      const currentIdx = flat.findIndex((b) => b.id === block.id);
      const targetIdx = currentIdx + dir;
      if (targetIdx >= 0 && targetIdx < flat.length) {
        e.preventDefault();
        const targetEl = document.querySelector(`[data-block-id="${flat[targetIdx].id}"]`);
        if (targetEl) {
          const input =
            targetEl.querySelector<HTMLElement>("[contenteditable='true']") ||
            targetEl.querySelector<HTMLTextAreaElement | HTMLInputElement>("textarea, input");
          if (input) {
            input.focus();
            if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
              const len = input.value?.length || 0;
              input.setSelectionRange(len, len);
            } else if (input.getAttribute("contenteditable") === "true") {
              const sel = window.getSelection();
              if (sel) {
                const range = document.createRange();
                range.selectNodeContents(input);
                range.collapse(dir === 1);
                sel.removeAllRanges();
                sel.addRange(range);
              }
            }
          }
        }
      }
    }
    // Ctrl+Shift+Arrow to move block up/down
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      const dir = e.key === "ArrowDown" ? 1 : -1;
      onMove(dir);
    }
    // Ctrl+D to duplicate block
    if ((e.ctrlKey || e.metaKey) && e.key === "d") {
      e.preventDefault();
      onDuplicate();
    }
    // Ctrl+Shift+Enter to add block above
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "Enter") {
      e.preventDefault();
      const newBlockId = uid();
      onAddAbove("text", "", newBlockId);
      setTimeout(
        () => {
          const prevEl = document.querySelector(`[data-block-id="${newBlockId}"]`);
          const focusable =
            prevEl?.querySelector<HTMLElement>("[contenteditable='true']") ||
            prevEl?.querySelector<HTMLElement>("textarea, input") ||
            (inputRef.current?.closest(".noska-block")?.previousSibling as Element | null)?.querySelector<HTMLElement>("[contenteditable='true'], textarea, input");
          if (focusable) {
            focusable.focus();
            if (focusable.getAttribute("contenteditable") === "true") {
              const sel = window.getSelection();
              if (sel) {
                const range = document.createRange();
                range.selectNodeContents(focusable);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
              }
            }
          }
        },
        10
      );
    }
  };

  const applySlash = (type: string) => {
    const text = block.text ? block.text.replace(/^\/\w*\s*/, "") : "";
    const ctx = {
      block,
      text,
      onPatch,
      onAdd,
      onAddAbove,
      onDelete,
      onNavigate,
      onCreateSubpage,
      onToast,
      onBlocks,
      onPagePatch,
      page,
      pages,
      onEmojiPicker: () => {
        if (inputRef.current) setEmojiPickerPos(inputRef.current.getBoundingClientRect());
        setEmojiSearch("");
        setEmojiPickerOpen(true);
      },
      onDatePicker: () => {
        // Reuse the mention picker's Dates section for date selection.
        if (inputRef.current) setMentionPos(inputRef.current.getBoundingClientRect());
        setMentionQuery("");
        setMentionOpen(true);
      },
    };
    executeCommand(type, ctx);
    setSlashOpen(false);
  };

  const detectMention = (text: unknown): boolean => {
    if (typeof text !== "string") return false;
    const bracketMatch = text.match(/\[\[([^\]]*)$/);
    const atMatch = text.match(/@(\w*)$/);
    if (bracketMatch) {
      setMentionQuery(bracketMatch[1]);
      setMentionOpen(true);
      if (inputRef.current) setMentionPos(inputRef.current.getBoundingClientRect());
      return true;
    }
    if (atMatch && atMatch.index > 0 && text[atMatch.index - 1] === " ") {
      setMentionQuery(atMatch[1]);
      setMentionOpen(true);
      if (inputRef.current) setMentionPos(inputRef.current.getBoundingClientRect());
      return true;
    }
    if (mentionOpen && !text.includes("[[") && !text.includes("@")) {
      setMentionOpen(false);
    }
    return mentionOpen;
  };

  const patchWithSlashDetection = (patch: Record<string, unknown>) => {
    if (page.isLocked || blockPermission === 'view') return;
    if (typeof patch.text === "string") {
      const m = patch.text.match(/(?:^|\s)\/([a-zA-Z0-9-]*)$/);
      if (slashKeyPressedRef.current && m) {
        // A real "/" keystroke just inserted a slash at a valid position → open.
        slashKeyPressedRef.current = false;
        setSlashOpen(true);
        setSlashQuery(m[1] || "");
        const caretRect = getCaretRect();
        const pos = positionSlashMenu(caretRect);
        if (pos) setSlashPos(pos);
      } else if (slashOpen) {
        // Menu already open: keep the query in sync while typing after "/".
        if (m) setSlashQuery(m[1] || "");
        else setSlashOpen(false); // caret moved off the "/query" token → close
      }
    }
    if (!mentionOpen && typeof patch.text === "string") {
      detectMention(patch.text);
    }
    onPatch(patch);
  };

  const selectPageMention = (page: Page) => {
    const text = block.text || "";
    const bracketMatch = text.match(/\[\[([^\]]*)$/);
    const atMatch = text.match(/@(\w*)$/);
    if (bracketMatch) {
      const before = text.slice(0, bracketMatch.index);
      const after = text.slice(bracketMatch.index + bracketMatch[0].length);
      onPatch({ text: before + `[[${page.title}]]` + after });
    } else if (atMatch) {
      const before = text.slice(0, atMatch.index);
      const after = text.slice(atMatch.index + atMatch[0].length);
      onPatch({ text: before + `@${page.title}` + after });
    }
    setMentionOpen(false);
    setMentionQuery("");
  };

  const classByType = {
    h1: "noska-h1 text-[26px] font-bold text-[var(--text)] mt-7 mb-2 tracking-tight block w-full",
    h2: "noska-h2 text-[20px] font-semibold text-[var(--text)] mt-5 mb-2 tracking-tight block w-full",
    h3: "noska-h3 text-[16px] font-semibold text-[var(--text)] mt-4 mb-1 tracking-tight block w-full",
    h4: "noska-h4 text-[13.5px] font-semibold text-[var(--text)] mt-3 mb-0.5 tracking-tight block w-full uppercase",
    quote: "noska-body border-l-4 border-[var(--accent)] pl-4 py-1 italic text-[var(--secondary)] my-3.5 text-[14px] bg-[var(--hover)]/20 rounded-r-md pr-3 block w-full",
    code: "rounded-md border border-[var(--border)] bg-[var(--panel)] p-3.5 font-mono text-[12.5px] text-[var(--text)] my-3 block w-full",
    equation: "font-mono text-center text-md my-4 block w-full",
    callout: "noska-body rounded-lg border border-[var(--border-strong)] bg-[var(--callout)] px-4 py-3 text-[13.5px] text-[var(--text)] my-4 shadow-sm block w-full",
    text: "noska-body text-[16px] leading-relaxed text-[var(--text)]/90 block w-full",
    bullet: "noska-body text-[16px] leading-relaxed text-[var(--text)]/90 block w-full",
    number: "noska-body text-[16px] leading-relaxed text-[var(--text)]/90 block w-full",
    toggle: "noska-body text-[16px] leading-relaxed text-[var(--text)]/90 block w-full",
    todo: "noska-body text-[16px] leading-relaxed text-[var(--text)]/90 block w-full",
    image: "block w-full",
    embed: "block w-full"
  };

  return (
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      style={{ transform: CSS.Transform.toString(transform), transition, paddingLeft: `${(block._depth || 0) * 24}px` }}
      className={`noska-block group relative flex gap-1 rounded py-1 hover:bg-[var(--hover)]/55 ${isDragging ? "opacity-30" : ""} ${isSelected ? "bg-[var(--accent)]/15 ring-1 ring-[var(--accent)]/40" : ""}`}
      data-block-id={block.id}
      data-selected={isSelected ? "true" : undefined}
      role="listitem"
      aria-label={`${block.type || "text"} block`}
      onPointerDown={(e) => onSelectBlock?.(e)}
      onContextMenu={(e) => {
        e.preventDefault();
        setBlockContextOpen(true);
      }}
      onPaste={handlePaste}
    >
      {/* Block Hover Affordance. Drag/add-plus are mutation-only, gated on
          blockPermission !== 'view' (not just isLocked) — real gap found
          during live UI QA, same class of bug already fixed for the block
          context menu. Comment indicator intentionally stays available. */}
      {!page.isLocked && (
        <div className={`block-tools flex w-12 shrink-0 items-start justify-end gap-0.5 pt-1 transition z-20 ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
          {blockPermission !== 'view' && (
            <>
              {/* Grip handle (@dnd-kit) */}
              <button
                ref={menuButtonRef}
                {...attributes}
                {...listeners}
                className="grid h-6 w-5 place-items-center rounded text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] hover:scale-110 active:scale-90 cursor-grab active:cursor-grabbing transition-transform touch-none"
                aria-label="Block options and drag reorder"
                onClick={(e) => {
                  e.stopPropagation();
                  setBlockContextOpen((open) => !open);
                }}
              >
                <GripVertical size={15} />
              </button>

              {/* Plus action button */}
              <div className="relative group/plus">
                <motion.button
                  whileHover={{ scale: 1.1, color: "var(--accent)" }}
                  whileTap={{ scale: 0.9 }}
                  className="grid h-6 w-5 place-items-center rounded text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--accent)] cursor-pointer"
                  aria-label="Add block"
                  onClick={(e) => {
                    const nextId = uid();
                    onSetOpenSlashBlockId?.(nextId);
                    if (e.altKey) {
                      onAddAbove?.("text", "", nextId);
                    } else {
                      onAdd("text", "", nextId);
                    }
                  }}
                >
                  <Plus size={15} />
                </motion.button>
                <div className="absolute top-8 left-1/2 -translate-x-1/2 hidden group-hover/plus:block bg-[var(--elevated)] border border-[var(--border-strong)] text-[var(--text)] text-[10px] py-1.5 px-2.5 rounded-lg shadow-xl pointer-events-none z-50 leading-normal min-w-[150px] text-center select-none font-medium">
                  <div><strong>Click</strong> <span className="text-[var(--text-secondary)] font-normal">to add below</span></div>
                  <div><strong>Alt-click</strong> <span className="text-[var(--text-secondary)] font-normal">to add a block above</span></div>
                </div>
              </div>
            </>
          )}

          {/* Comment indicator */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setActiveCommentBlockId(activeCommentBlockId === block.id ? null : block.id); }}
              className={`grid h-6 w-5 place-items-center rounded cursor-pointer transition ${(pageComments || []).some(c => c.blockId === block.id && !c.resolvedAt)
                  ? "text-[var(--accent)] opacity-100"
                  : "text-[var(--muted)] opacity-0 group-hover:opacity-100"
                } hover:bg-[var(--hover)]`}
              aria-label="Toggle comments"
            >
              <MessageCircle size={13} />
            </button>
            {activeCommentBlockId === block.id && (
              <>
                <div className="fixed inset-0 z-[150]" onClick={() => setActiveCommentBlockId(null)} />
                <div className="absolute top-0 left-full ml-2 z-[160]">
                  <CommentThread
                    comments={pageComments || []}
                    blockId={block.id}
                    pageId={page.id}
                    onAddComment={handleAddComment}
                    onResolveComment={handleResolveComment}
                    onClose={() => setActiveCommentBlockId(null)}
                    pages={pages}
                    onNavigate={onNavigate}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div
        className="relative min-w-0 flex-1 cursor-text"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            const focusable =
              e.currentTarget.querySelector<HTMLElement>("[contenteditable='true']") ||
              e.currentTarget.querySelector<HTMLElement>("textarea, input");
            if (focusable && document.activeElement !== focusable) {
              focusable.focus();
            }
          }
        }}
      >
        {renderBlockEditor(
          block,
          index,
          classByType[block.type] || "",
          inputRef,
          patchWithSlashDetection,
          onKeyDown,
          onDelete,
          pages,
          () => setIsFocused(true),
          () => setIsFocused(false),
          page.isLocked,
          isFocused,
          onNavigate,
          () => setImagePickerOpen(true),
          page.id,
          onToast,
          onCreateSubpage,
          apiKey,
          aiProvider,
          page,
          onBlocks,
          (url) => {
            const embedType = detectEmbedType(url);
            if (embedType) {
              onPatch({ ...blockForTreeConversion(block, embedType, url), text: url });
            } else if (/\.(png|jpg|jpeg|gif|svg|webp)/i.test(url)) {
              onPatch({ ...blockForTreeConversion(block, "image", url), text: url });
            } else {
              onPatch({ ...blockForTreeConversion(block, "bookmark", url), text: url });
            }
          }
        )}
        <TypedSlashCommandMenu
          ref={slashRef}
          open={slashOpen}
          onClose={() => setSlashOpen(false)}
          onSelect={(type) => {
            applySlash(type);
            setSlashOpen(false);
          }}
          position={slashPos}
          initialSearch={slashQuery}
        />
        <AnimatePresence>
          {mentionOpen && mentionPos && createPortal(
            <motion.div
              ref={mentionRef}
              initial={{ opacity: 0, scale: 0.95, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 3 }}
              transition={SPRING_PRESETS.stiff}
              style={{ top: mentionPos.bottom + 4, left: mentionPos.left }}
              className="fixed z-[130] w-[280px] rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] p-2 shadow-xl"
              role="dialog" aria-label="Link to page"
            >
              <div className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                Link to page
              </div>
              <div className="max-h-60 overflow-auto scrollbar-thin space-y-0.5">
                {(!mentionQuery || ["today", "tomorrow", "next week", "next month", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].some(d => d.startsWith(mentionQuery.toLowerCase()))) && (
                  <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-wider text-[var(--muted)]">Dates</div>
                )}
                {(!mentionQuery || "today".startsWith(mentionQuery.toLowerCase())) && (
                  <button
                    onClick={() => {
                      const d = new Date();
                      const dateStr = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                      onPatch({ text: (block.text || "").replace(/@\w*$/, `@${dateStr}`) });
                      setMentionOpen(false);
                      setMentionQuery("");
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[var(--text)] hover:bg-[var(--hover)] transition-colors cursor-pointer"
                  >
                    <span className="text-base shrink-0">📅</span>
                    <span className="min-w-0 flex-1">Today</span>
                  </button>
                )}
                {(!mentionQuery || "tomorrow".startsWith(mentionQuery.toLowerCase())) && (
                  <button
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      const dateStr = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                      onPatch({ text: (block.text || "").replace(/@\w*$/, `@${dateStr}`) });
                      setMentionOpen(false);
                      setMentionQuery("");
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[var(--text)] hover:bg-[var(--hover)] transition-colors cursor-pointer"
                  >
                    <span className="text-base shrink-0">📅</span>
                    <span className="min-w-0 flex-1">Tomorrow</span>
                  </button>
                )}
                {(!mentionQuery || "next week".startsWith(mentionQuery.toLowerCase())) && (
                  <button
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 7);
                      const dateStr = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                      onPatch({ text: (block.text || "").replace(/@\w*$/, `@${dateStr}`) });
                      setMentionOpen(false);
                      setMentionQuery("");
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[var(--text)] hover:bg-[var(--hover)] transition-colors cursor-pointer"
                  >
                    <span className="text-base shrink-0">📅</span>
                    <span className="min-w-0 flex-1">Next week</span>
                  </button>
                )}
                {(!mentionQuery || "next month".startsWith(mentionQuery.toLowerCase())) && (
                  <button
                    onClick={() => {
                      const d = new Date();
                      d.setMonth(d.getMonth() + 1);
                      const dateStr = d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
                      onPatch({ text: (block.text || "").replace(/@\w*$/, `@${dateStr}`) });
                      setMentionOpen(false);
                      setMentionQuery("");
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[var(--text)] hover:bg-[var(--hover)] transition-colors cursor-pointer"
                  >
                    <span className="text-base shrink-0">📅</span>
                    <span className="min-w-0 flex-1">Next month</span>
                  </button>
                )}
              </div>
              {mentionItems.length > 0 && (
                <div className="border-t border-[var(--border)] pt-1 mt-1">
                  <div className="px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--muted)]">Pages</div>
                  <div className="max-h-36 overflow-auto scrollbar-thin space-y-0.5">
                    {mentionItems.slice(0, 8).map((pageItem) => (
                      <motion.button
                        key={pageItem.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => selectPageMention(pageItem)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[var(--text)] hover:bg-[var(--hover)] transition-colors cursor-pointer"
                      >
                        <PageIcon icon={pageItem.icon} size={15} fallback="📄" />
                        <span className="min-w-0 flex-1 truncate">{pageItem.title || 'Untitled'}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-1 border-t border-[var(--border)] px-1 pt-1 text-[9px] text-[var(--muted)]">
                Type @today, @tomorrow or filter pages
              </div>
            </motion.div>,
            document.body
          )}
        </AnimatePresence>

        {/* Emoji picker (triggered by the /emoji command) */}
        <AnimatePresence>
          {emojiPickerOpen && emojiPickerPos && createPortal(
            <>
              <div className="fixed inset-0 z-[129]" onClick={() => setEmojiPickerOpen(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 3 }}
                transition={SPRING_PRESETS.stiff}
                style={{ top: emojiPickerPos.bottom + 4, left: emojiPickerPos.left }}
                className="fixed z-[130] w-[280px] rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] p-2 shadow-xl"
                role="dialog" aria-label="Insert emoji"
              >
                <input
                  autoFocus
                  value={emojiSearch}
                  onChange={(e) => setEmojiSearch(e.target.value)}
                  placeholder="Search emoji..."
                  className="w-full mb-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1.5 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]"
                />
                <div className="grid grid-cols-8 gap-0.5 max-h-[180px] overflow-y-auto scrollbar-thin">
                  {(() => {
                    const q = emojiSearch.trim().toLowerCase();
                    const catalog = EMOJI_CATALOG.filter(e => !q || e.k.some(k => k.includes(q)));
                    const list = catalog.length ? catalog.map(e => e.e) : emojis;
                    return list.map((emoji, i) => (
                      <button
                        key={`${emoji}-${i}`}
                        onClick={() => {
                          const base = (block.text || "").replace(/^\/\w*\s*/, "");
                          onPatch({ text: `${base}${emoji}` });
                          setEmojiPickerOpen(false);
                          setEmojiSearch("");
                        }}
                        className="flex items-center justify-center w-7 h-7 rounded text-lg hover:bg-[var(--hover)] transition cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ));
                  })()}
                </div>
              </motion.div>
            </>,
            document.body
          )}
        </AnimatePresence>

        {inlineAI && (
          <NotionAIBar
            blockId={inlineAIBlockRef.current || block.id}
            blockText={inlineAI.text}
            pageContext={page.title + "\n" + (page.blocks || []).map((b) => b.text).filter(Boolean).join("\n")}
            position={inlineAI}
            onClose={() => {
              setInlineAI(null);
              inlineAIBlockRef.current = null;
              inputRef.current?.focus();
            }}
            onReplace={(newText) => {
              onPatch({ text: newText });
              setInlineAI(null);
              inlineAIBlockRef.current = null;
            }}
            onInsertBelow={(newText) => {
              onAdd("text", newText);
              setInlineAI(null);
              inlineAIBlockRef.current = null;
            }}
            apiKey={apiKey}
            aiProvider={aiProvider}
            nvidiaKey={nvidiaKey}
          />
        )}

        <FloatingMenu open={blockContextOpen} anchorRef={menuButtonRef} onClose={() => setBlockContextOpen(false)} width={260}>
          <BlockContextMenu
            open={blockContextOpen}
            onClose={() => setBlockContextOpen(false)}
            block={block}
            pages={pages}
            onAction={(action, payload) => {
              if (page.isLocked && action !== "copy-link") {
                onToast?.("Page is locked. Cannot edit blocks.");
                return;
              }
              // Real gap, fixed: this switch previously only checked
              // `page.isLocked`, not `blockPermission` — a viewer/
              // commenter on a shared page (see `page.sharedRole`/
              // `permission: 'view'` derivation in App.tsx) could still
              // open this menu via the grip handle and delete/duplicate/
              // convert blocks, even though the keyboard-only paths
              // (onKeyDown/patchWithSlashDetection above) already
              // correctly block `blockPermission === 'view'`. "copy-link"
              // is allowed regardless since it's not a mutation.
              if (blockPermission === 'view' && action !== "copy-link") {
                onToast?.("You have view-only access to this page.");
                return;
              }
              switch (action) {
                case "delete": onDelete(); break;
                case "duplicate": onDuplicate(); break;
                case "template": {
                  const blockCopy = { ...blockFor(block.type, block.text || ""), id: uid() };
                  onPatch({ type: "button", text: "Template", templateBlocks: [blockCopy] });
                  break;
                }
                case "copy-synced": {
                  if (!page?.blocks) break;
                  const syncedGroupId = block.syncedGroupId || uid();
                  onPatch({ syncedGroupId });
                  const syncedCopy = {
                    ...blockFor("text", block.text || ""),
                    id: uid(),
                    syncedGroupId,
                    type: "synced-block"
                  };
                  const idx = page.blocks.findIndex(b => b.id === block.id);
                  if (idx < 0) break;
                  const newBlocks = [...page.blocks];
                  newBlocks.splice(idx + 1, 0, syncedCopy);
                  onBlocks(newBlocks);
                  break;
                }
                case "move-to": onMove?.(); break;
                case "ask-ai": onAskAI?.(); break;
                case "add-to-review": {
                  // Same helper as the /review slash command — one source
                  // of truth for review-state creation. Nested under
                  // `review` to mirror removedReviewState()'s shape.
                  onPatch({ review: createReviewState() } as unknown as Partial<typeof block>);
                  onToast?.("Added to your review queue");
                  break;
                }
                case "remove-from-review": {
                  onPatch(removedReviewState() as unknown as Partial<typeof block>);
                  onToast?.("Removed from your review queue");
                  break;
                }
                case "convert": {
                  // turnInto (blockModel.ts) operates on the generic
                  // TreeBlock shape; `properties` is `Record<string,
                  // unknown>` there, so its fields need casts at each
                  // access below — same type-only gap as the softDelete
                  // cast above, not a real behavior change.
                  const newBlock = turnInto(block as unknown as TreeBlock, payload === "todo" ? "to_do" : payload === "toggle" ? "toggle" : payload === "bullet" ? "bulleted_list_item" : payload === "number" ? "numbered_list_item" : payload === "h1" ? "heading_1" : payload === "h2" ? "heading_2" : payload === "h3" ? "heading_3" : payload === "h4" ? "heading_4" : payload === "text" ? "paragraph" : payload === "callout" ? "callout" : payload === "quote" ? "quote" : payload === "code" ? "code" : payload);
                  const props = newBlock.properties as { checked?: boolean; collapsed?: boolean; icon?: string; tone?: string; richText?: Array<{ text?: string }>; text?: string };
                  if (payload === "todo") props.checked = false;
                  if (payload === "toggle") props.collapsed = false;
                  if (payload === "callout") { props.icon = props.icon || "💡"; props.tone = "info"; }
                  if (payload === "code") {
                    newBlock.properties = { text: richTextToPlainText(props.richText as import("../utils/richText").RichTextSpan[] | undefined), language: "plain" };
                    delete props.richText;
                  }
                  if (block.type === "code") {
                    props.richText = [{ text: block.text || "" }];
                    delete props.text;
                  }
                  onPatch(newBlock as unknown as Record<string, unknown>);
                  break;
                }
                case "color": onPatch({ color: payload }); break;
                case "bgColor": onPatch({ bgColor: payload }); break;
                case "move-to-page": {
                  const targetPage = pages.find(p => p.id === payload);
                  if (targetPage && page?.blocks) {
                    const activeBlocks = page.blocks.filter(b => b.id !== block.id);
                    onBlocks(activeBlocks);
                    const updatedTargetBlocks = [...(targetPage.blocks || []), { ...block }];
                    onUpdatePage?.(targetPage.id, { blocks: updatedTargetBlocks });
                  }
                  break;
                }
                default: break;
              }
              setBlockContextOpen(false);
            }}
            lastEditedBy={block?.lastEditedBy || page?.lastEditedBy || realtimeCollab.getUser()?.userName || "Workspace User"}
            // `lastEditedAt` isn't a declared field on `Block` (only
            // `lastEditedTime` is, in BaseBlock) — it only exists via the
            // catch-all index signature, which types as `unknown`. Same
            // type-only gap as the softDelete/turnInto casts above, not a
            // real behavior change: at runtime this is never actually set
            // on a block, so the expression already always fell through to
            // `page?.updatedAt`.
            lastEditedAt={(block as unknown as { lastEditedAt?: string })?.lastEditedAt || page?.updatedAt}
            onToast={onToast}
          />
        </FloatingMenu>

        {imagePickerOpen && createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center">
            <div className="fixed inset-0 bg-black/40" aria-label="Close" onClick={(e) => { e.stopPropagation(); setImagePickerOpen(false); }} />
            <div className="relative z-10 w-[520px] max-h-[80vh] rounded-xl border border-[var(--border)] bg-[var(--elevated)] shadow-2xl overflow-hidden flex flex-col" role="dialog" aria-modal="true" aria-label="Image picker" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                <h3 className="text-sm font-semibold text-[var(--text)]">Pick an Image</h3>
                <button
                  onClick={() => setImagePickerOpen(false)}
                  className="rounded p-1 text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition cursor-pointer"
                  aria-label="Close image picker"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <ImagePicker
                  onSelect={(url) => {
                    onPatch({ text: url });
                    setImagePickerOpen(false);
                  }}
                  onClose={() => setImagePickerOpen(false)}
                />
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </motion.div>
  );
});

const QUICK_BLOCKS = [
  { type: "text", icon: Edit3, label: "Text" },
  { type: "h1", icon: Heading1, label: "Heading 1" },
  { type: "h2", icon: Heading2, label: "Heading 2" },
  { type: "h3", icon: Heading3, label: "Heading 3" },
  { type: "bullet", icon: List, label: "Bullet list" },
  { type: "number", icon: List, label: "Numbered list" },
  { type: "todo", icon: CheckSquare, label: "To-do" },
  { type: "image", icon: Image, label: "Image" },
  { type: "code", icon: Code, label: "Code" },
  { type: "callout", icon: MessageSquare, label: "Callout" },
  { type: "divider", icon: MoreHorizontal, label: "Divider" },
  { type: "toggle", icon: ChevronDown, label: "Toggle" },
  { type: "table", icon: Table2, label: "Table" },
  { type: "database", icon: Database, label: "Database" },
];

interface EmptyStateProps {
  onAdd: () => void;
  onBlocks?: (blocks: EditorBlock[]) => void;
  disabled?: boolean;
}

export function EmptyState({ onAdd, onBlocks, disabled }: EmptyStateProps) {
  return (
    <div className="rounded border border-dashed border-[var(--border)] py-8 px-6 text-center">
      <AnimatedSparkle size={24} className="mb-3 mx-auto text-[var(--accent)]" />
      <p className="text-xs text-[var(--muted)] mb-4">Start with a block type</p>
      <div className="flex flex-wrap justify-center gap-1.5 max-w-md mx-auto">
        {QUICK_BLOCKS.map((qb) => (
          <button
            key={qb.type}
            onClick={() => onBlocks?.([{ ...blockFor(qb.type, ""), text: "" }])}
            disabled={disabled}
            className="flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[11px] text-[var(--text)] hover:bg-[var(--hover)] hover:border-[var(--border-strong)] disabled:opacity-40 transition-colors"
          >
            <qb.icon size={13} className="text-[var(--secondary)]" />
            {qb.label}
          </button>
        ))}
      </div>
      <button
        onClick={onAdd}
        disabled={disabled}
        className="mt-4 text-[11px] text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-50 transition-colors"
      >
        Or start with an empty text block
      </button>
    </div>
  );
}




// ── Diff Engine ────────────────────────────────────────────────


