import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING_PRESETS } from "../features/motion/MotionSystem";
import { useGhostWriter } from "../features/ghostwriter/GhostWriter";
import { runAI } from "../utils/ai";
import { BlockRegistry } from "../registry/BlockRegistry";
import EmbedBlock from "./editor/EmbedBlock";
import ImagePicker from "./editor/ImagePicker";
import ImageBlock from "./editor/ImageBlock";
import PagePeek from "./editor/PagePeek";
import FormsBlock from "./FormsBlock";

import InPageFind from "./InPageFind";
import useMultiBlockSelect from "../hooks/useMultiBlockSelect";
import {
  AlignLeft, Heading1, Heading2, Heading3, Heading4, List, ListChecks, ChevronLeft, ChevronRight, ChevronDown, CheckSquare,
  Quote, MessageSquare, Clipboard, MoreHorizontal, Image, Link, Table2, Columns3, Edit3, Database, Plus,
  Search, X, GripVertical, Maximize2, Mic, Loader2, Play, Bold, Italic, Underline, SlidersHorizontal, Highlighter,
  Smile, MessageCircle, Settings2, Sparkles, Code, Star, Heart, ThumbsUp, Flag, Bell, Bookmark, Lightbulb,
  Target, Zap, Check, Clock, AlertCircle, HelpCircle, Info, Calendar, Hash, FileDown, Upload, Globe, BarChart3, History, Move, Eye, FileEdit, Palette, Trash2, ExternalLink
} from "lucide-react";
import { AnimatedSparkle } from "./ui/icons";
import { IconButton, FloatingMenu, useOutsideDismiss, TextArea } from "./ui";
import { emojis, covers, blockFor, getPagePermission, renderInlineMarkdown, softDelete, getDescendants, uid } from "../utils/helpers";
import { TEXT_COLORS, BG_COLORS } from "../utils/colors";
import DatabaseBlock from "./DatabaseBlock";
import BlockContextMenu from "./editor/BlockContextMenu";
import SlashCommandMenu from "./editor/SlashCommandMenu";
import PageOptionsMenu from "./editor/PageOptionsMenu";
import { executeCommand } from "../core/commands/ActionExecutor";
import CollabPresenceBar from "./collab/CollabPresenceBar";
import CommentThread from "./comments/CommentThread";
import Breadcrumbs from "./Breadcrumbs";
import { usePresence } from "../hooks/usePresence";
import CommandPalette from "./CommandPalette";

const dragState = { fromBlockId: null };

function childIdsFor(blocks, parentId) {
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

function flattenEditorBlocks(blocks, parentId = null, depth = 0, seen = new Set()) {
  const active = blocks.filter(b => !b.isDeleted);
  const byId = new Map(active.map((block) => [block.id, block]));
  const result = [];

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

function moveArrayItemAfter(items, itemId, afterId) {
  const next = [...items];
  const from = next.findIndex((block) => block.id === itemId);
  const after = next.findIndex((block) => block.id === afterId);
  if (from < 0 || after < 0 || from === after) return next;
  const [item] = next.splice(from, 1);
  const target = next.findIndex((block) => block.id === afterId);
  next.splice(target + 1, 0, item);
  return next;
}

function removeFromParentContent(blocks, blockId) {
  return blocks.map((block) => {
    if (!Array.isArray(block.content) || !block.content.includes(blockId)) return block;
    return { ...block, content: block.content.filter((id) => id !== blockId) };
  });
}

function appendChildBlock(blocks, parentId, childId) {
  return blocks.map((block) => {
    if (block.id !== parentId) return block;
    const content = Array.isArray(block.content) ? block.content : [];
    return content.includes(childId) ? block : { ...block, content: [...content, childId] };
  });
}

function insertChildBlockAfter(blocks, parentId, childId, afterId) {
  return blocks.map((block) => {
    if (block.id !== parentId) return block;
    const content = (Array.isArray(block.content) ? block.content : []).filter((id) => id !== childId);
    const afterIndex = content.indexOf(afterId);
    if (afterIndex < 0) content.push(childId);
    else content.splice(afterIndex + 1, 0, childId);
    return { ...block, content };
  });
}

function indentBlockTree(blocks, blockId) {
  const flat = flattenEditorBlocks(blocks);
  const index = flat.findIndex((block) => block.id === blockId);
  if (index <= 0) return blocks;

  const newParent = flat[index - 1];
  let next = removeFromParentContent(blocks, blockId);
  next = next.map((block) => block.id === blockId ? { ...block, parentId: newParent.id } : block);
  next = appendChildBlock(next, newParent.id, blockId);
  return next;
}

function outdentBlockTree(blocks, blockId) {
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

function insertBlockAfterTree(blocks, afterId, newBlock) {
  const anchor = blocks.find((block) => block.id === afterId);
  if (!anchor) return [...blocks, newBlock];
  const parentId = anchor.parentId || null;
  const blockToInsert = { ...newBlock, parentId, content: newBlock.content || [] };
  const withInserted = moveArrayItemAfter([...blocks, blockToInsert], blockToInsert.id, afterId);
  return parentId ? insertChildBlockAfter(withInserted, parentId, blockToInsert.id, afterId) : withInserted;
}

function insertBlockBeforeTree(blocks, beforeId, newBlock) {
  const anchor = blocks.find((block) => block.id === beforeId);
  if (!anchor) return [newBlock, ...blocks];
  const parentId = anchor.parentId || null;
  const blockToInsert = { ...newBlock, parentId, content: newBlock.content || [] };
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

function duplicateBlockTree(blocks, blockId) {
  const source = blocks.find((block) => block.id === blockId);
  if (!source) return blocks;
  const idsToClone = [];
  const collect = (id) => {
    if (idsToClone.includes(id)) return;
    idsToClone.push(id);
    const block = blocks.find((candidate) => candidate.id === id);
    (block?.content || []).forEach(collect);
    blocks.filter((candidate) => candidate.parentId === id && !(block?.content || []).includes(candidate.id)).forEach((candidate) => collect(candidate.id));
  };
  collect(blockId);

  const idMap = new Map(idsToClone.map((id) => [id, crypto.randomUUID()]));
  const clones = idsToClone.map((id) => {
    const original = blocks.find((block) => block.id === id);
    const clonedParentId = id === blockId ? original.parentId : idMap.get(original.parentId) || original.parentId;
    return {
      ...JSON.parse(JSON.stringify(original)),
      id: idMap.get(id),
      parentId: clonedParentId || null,
      content: (original.content || []).map((childId) => idMap.get(childId)).filter(Boolean)
    };
  });

  return insertBlockAfterTree(blocks, blockId, clones[0]).concat(clones.slice(1));
}

function blockForTreeConversion(block, type, text = block.text || "") {
  const next = blockFor(type, text);
  return {
    ...next,
    id: block.id,
    parentId: block.parentId || null,
    content: block.content || []
  };
}

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
}) {
  const titleRef = useRef(null);
  const editorContainerRef = useRef(null);
  const pageOptionsRef = useRef(null);
  
  const [selection, setSelection] = useState({ text: "", rect: null, blockId: null, selStart: 0, selEnd: 0 });
  const [pageMenuOpen, setPageMenuOpen] = useState(false);
  const [openSlashForBlockId, setOpenSlashForBlockId] = useState(null);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const [suggestEdits, setSuggestEdits] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [moveToOpen, setMoveToOpen] = useState(false);
  const importInputRef = useRef(null);
  const [activeCommentBlockId, setActiveCommentBlockId] = useState(null);
  const [findOpen, setFindOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

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
      if (e.key === "Escape" && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSelectAll, hasSelection, clearSelection, commandPaletteOpen]);

  const wordCount = React.useMemo(() => {
    if (!page?.blocks) return 0;
    return page.blocks.reduce((sum, b) => sum + (b.text || "").split(/\s+/).filter(Boolean).length, 0);
  }, [page?.blocks]);
  const renderedBlocks = React.useMemo(() => flattenEditorBlocks(page?.blocks || []), [page?.blocks]);

  const permission = React.useMemo(() => getPagePermission(page, pages), [page, pages]);
  const isEditable = !page.isLocked && permission === 'edit';
  const { users, ownStatus, setStatus: setOwnStatus } = usePresence(page?.id);

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
      wikiOwner: "Krishna Handibag",
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

  const handleFileImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const blocks = [];
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

  const handleAddComment = (comment) => {
    const existing = page.comments || [];
    onPagePatch?.({ comments: [...existing, comment] });
    onToast?.("Comment added");
  };

  const handleResolveComment = (commentId) => {
    const existing = page.comments || [];
    onPagePatch?.({
      comments: existing.map(c => c.id === commentId ? { ...c, resolvedAt: new Date().toISOString(), resolvedBy: "You" } : c)
    });
    onToast?.("Comment resolved");
  };
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

  // Auto-save version history when blocks change
  useEffect(() => {
    if (!page?.blocks || page.blocks.length === 0) return;
    const timer = setTimeout(() => {
      try {
        const auditKey = `audit_${page.id}`;
        const stored = JSON.parse(localStorage.getItem(auditKey) || "[]");
        stored.push({
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          title: page.title,
          blocks: JSON.parse(JSON.stringify(page.blocks)),
          database: page.database ? JSON.parse(JSON.stringify(page.database)) : undefined,
          label: `Auto-save ${stored.length + 1}`
        });
        // Keep last 50
        localStorage.setItem(auditKey, JSON.stringify(stored.slice(-50)));
        loadVersionHistory();
      } catch {}
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

      const blockEl = sel.anchorNode?.parentElement?.closest(".noska-block") 
        || document.activeElement?.closest?.(".noska-block");
      const blockId = blockEl?.dataset?.blockId;
      if (blockId) {
        const ta = document.activeElement?.tagName === 'TEXTAREA' ? document.activeElement : null;
        const selStart = ta ? ta.selectionStart : text.length;
        const selEnd = ta ? ta.selectionEnd : text.length;
        setSelection({
          text,
          rect: {
            top: rect.top - parentRect.top + scrollTop,
            left: rect.left - parentRect.left + scrollLeft,
            width: rect.width,
            height: rect.height
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
        const target = e.target;
        const total = target.scrollHeight - target.clientHeight;
        if (total <= 0) return;
        const pct = Math.round((target.scrollTop / total) * 100);
        onScrollPercent?.(pct);
      }}
      className={`min-h-0 flex-1 overflow-y-auto bg-[var(--bg)] scrollbar-thin relative transition-all duration-200 ${
        page.fontStyle === "serif" ? "font-serif" : page.fontStyle === "mono" ? "font-mono" : "font-sans"
      }`}
    >
      <div className={`mx-auto px-16 py-10 transition-all duration-200 ${
        page.fullWidth ? "max-w-full px-8" : "max-w-[720px]"
      } ${
        page.smallText ? "noska-small-text text-xs" : ""
      }`}
        onClick={(e) => {
          if (!page.isLocked && (page.blocks || []).length > 0 && e.target === e.currentTarget) {
            const lastBlock = page.blocks[page.blocks.length - 1];
            onBlocks(insertBlockAfterTree(page.blocks || [], lastBlock.id, blockFor("text", "")));
          }
        }}
      >
        {(page.cover || page.cover === undefined) && (
          <div
            className="-mx-16 mb-6 h-40 rounded-b-xl transition-all duration-300"
            style={{
              background: (page.cover ?? covers[0]).startsWith('linear-gradient')
                ? (page.cover ?? covers[0])
                : `url(${page.cover}) center/cover no-repeat`,
              marginTop: '-2.5rem'
            }}
          />
        )}
          <div className="mb-2 flex items-center gap-2 relative">
            <button
              disabled={page.isLocked}
              className="grid h-10 w-10 place-items-center rounded-md text-3xl transition hover:bg-[var(--hover)] disabled:opacity-50"
              onClick={() => setIconPickerOpen(!iconPickerOpen)}
            >
              {page.icon || "📄"}
            </button>
            {iconPickerOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIconPickerOpen(false)} />
                <div className="absolute top-12 left-0 z-50 grid grid-cols-8 gap-1 rounded-xl border border-[var(--border-strong)] bg-[var(--elevated)] p-3 shadow-2xl w-[280px] max-h-[200px] overflow-y-auto">
                  {["📄","📝","📌","💡","✅","🧠","🚀","📚","🎯","🗓️","🔖","⭐","❤️","👍","🔥","🎨",
                    "💻","📊","📈","📁","🗂️","📋","🖊️","✏️","🔧","⚙️","🛠️","📦","🎁","🏆","🥇","💎",
                    "🔒","🔓","🔑","🛡️","🚩","🎯","🎪","🎭","🎵","🎶","🎬","🎤","🎧","🎲","♟️","🧩",
                    "🐛","🐞","🤖","👾","🌐","📡","📰","🔬","🧪","🔭","🌍","🌎","🌏","🌈","⚡","💫",
                    "🗣️","💬","📢","🔔","📧","✉️","💌","📨","📩","📤","📥","📎","🖇️","📐","📏","🔍",
                    "🔎","🕐","🕑","🕒","🕓","🕔","🕕","🕖","🕗","🕘","🕙","🕚","🕛","⌛","⏳","⏰",
                    "📅","📆","☀️","🌙","⭐","🌟","💫","✨","🔥","💦","❄️","☔","🌈","🌪️","🌊","🏔️",
                    "🏠","🏡","🏢","🏣","🏤","🏥","🏦","🏨","🏩","🏪","🏫","🏬","🏭","🏯","🏰","💒",
                    "🗼","🗽","⛲","🌋","⛰️","🏖️","🏜️","🏝️","🌅","🌄","🌇","🌆","🏙️","🌃","🌌","🌉"
                  ].map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => { onPagePatch({ icon: emoji }); setIconPickerOpen(false); }}
                      className={`h-8 w-8 flex items-center justify-center rounded-md text-lg hover:bg-[var(--hover)] transition ${page.icon === emoji ? 'ring-2 ring-[var(--accent)]' : ''}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </>
            )}
          {!page.isLocked && (
            <>
              <div className="relative">
                <button
                  className="rounded px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--secondary)]"
                  onClick={() => setCoverPickerOpen(!coverPickerOpen)}
                >
                  {page.cover ? "Change cover" : "Add cover"}
                </button>
                {coverPickerOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setCoverPickerOpen(false)} />
                    <div className="absolute top-8 left-0 z-50 grid grid-cols-3 gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--elevated)] p-3 shadow-2xl w-[320px]">
                      <button
                        onClick={() => { onPagePatch({ cover: null }); setCoverPickerOpen(false); }}
                        className="h-10 rounded-lg border border-dashed border-[var(--border)] flex items-center justify-center text-[10px] text-[var(--muted)] hover:bg-[var(--hover)] transition"
                      >
                        Remove
                      </button>
                      {covers.map((gradient, i) => (
                        <button
                          key={i}
                          onClick={() => { onPagePatch({ cover: gradient }); setCoverPickerOpen(false); }}
                          className={`h-10 rounded-lg transition hover:scale-105 ${page.cover === gradient ? 'ring-2 ring-[var(--accent)]' : ''}`}
                          style={{ background: gradient }}
                        />
                      ))}
                      <label className="col-span-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border)] py-2.5 text-[10px] text-[var(--muted)] hover:bg-[var(--hover)] transition">
                        <Upload size={12} />
                        Upload from device
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const url = URL.createObjectURL(file);
                              onPagePatch({ cover: url });
                              setCoverPickerOpen(false);
                            }
                          }}
                        />
                      </label>
                      <button
                        onClick={() => {
                          const url = window.prompt("Enter image URL for cover:");
                          if (url) { onPagePatch({ cover: url }); setCoverPickerOpen(false); }
                        }}
                        className="col-span-3 flex items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border)] py-2.5 text-[10px] text-[var(--muted)] hover:bg-[var(--hover)] transition"
                      >
                        + Image URL
                      </button>
                    </div>
                  </>
                )}
              </div>
              <button
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--secondary)]"
                onClick={onVoiceCapture}
              >
                <Mic size={12} />
                Voice capture
              </button>
            </>
          )}
          {page.isLocked && (
            <span className="flex items-center gap-1 rounded bg-rose-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-rose-400">
              🔒 Locked
            </span>
          )}
          {permission === 'view' && !page.isLocked && (
            <span className="flex items-center gap-1 rounded bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
              👁 View only
            </span>
          )}
          <CollabPresenceBar users={users} ownStatus={ownStatus} pageId={page?.id} onStatusChange={(s) => setOwnStatus(s)} />
          <div className="ml-auto relative">
            <div ref={pageOptionsRef}>
              <button
                onClick={() => setPageMenuOpen(!pageMenuOpen)}
                className="grid h-8 w-8 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition cursor-pointer"
                title="Page options"
              >
                <MoreHorizontal size={18} />
              </button>
            </div>
            <div className="fixed z-[115]" style={{ display: pageMenuOpen ? "block" : "none" }}>
              {pageMenuOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setPageMenuOpen(false)} />
              )}
              <div className="relative z-50">
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
                      case "customize": onToast?.("Customize page panel opened"); break;
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
                  lastEditedBy={page?.lastEditedBy || "Krishna Handibagシ"}
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
              <InPageFind blocks={page.blocks || []} onClose={() => setFindOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>
        <input
          ref={titleRef}
          value={page.title}
          readOnly={page.isLocked}
          onChange={(e) => onPagePatch({ title: e.target.value })}
          className="mb-5 w-full bg-transparent text-[36px] font-bold leading-tight tracking-normal text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
          placeholder="Untitled"
        />
        {(page.blocks || []).length === 0 && <EmptyState onAdd={() => onBlocks([blockFor("text", "")])} disabled={page.isLocked} />}
        <div
          ref={containerRef}
          className="space-y-1 relative"
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
          {renderedBlocks.map((block, index) => (
            <Block
              key={block.id}
              block={block}
              index={index}
              page={page}
              pages={pages}
              isSelected={selectedBlockIds.has(block.id)}
              onSelectBlock={(e) => handlePointerDown(e, block.id, index)}
              onPatch={(patch) => onBlockPatch(block.id, patch)}
              onAdd={(type, text, customId) => {
                const nextBlock = blockFor(type, text);
                if (customId) nextBlock.id = customId;
                onBlocks(insertBlockAfterTree(page.blocks || [], block.id, nextBlock));
              }}
              onAddAbove={(type, text, customId) => {
                const nextBlock = blockFor(type, text);
                if (customId) nextBlock.id = customId;
                onBlocks(insertBlockBeforeTree(page.blocks || [], block.id, nextBlock));
              }}
              onDelete={() => onBlocks(softDelete(page.blocks || [], block.id))}
              onDuplicate={() => onBlocks(duplicateBlockTree(page.blocks || [], block.id))}
              onMove={(dir) => onMoveBlock(block.id, dir)}
              onSwapBlocks={(fromId, toId) => {
                const blocks = [...(page.blocks || [])];
                const fromIdx = blocks.findIndex(b => b.id === fromId);
                const toIdx = blocks.findIndex(b => b.id === toId);
                if (fromIdx < 0 || toIdx < 0) return;
                const [moved] = blocks.splice(fromIdx, 1);
                blocks.splice(toIdx, 0, moved);
                onBlocks(blocks);
              }}
              onAskAI={onAskAI}
              onFocusBlock={onFocusBlock}
              ghostWriterEnabled={ghostWriterEnabled}
              apiKey={apiKey}
              aiProvider={aiProvider}
              nvidiaKey={nvidiaKey}
              onToast={onToast}
              onUpdatePage={onUpdatePage}
              onPagePatch={onPagePatch}
              onBlocks={onBlocks}
              openSlash={openSlashForBlockId === block.id}
              onClearOpenSlash={() => setOpenSlashForBlockId(null)}
              onSetOpenSlashBlockId={setOpenSlashForBlockId}
              onCreateSubpage={onCreateSubpage}
              onNavigate={onNavigate}
              activeCommentBlockId={activeCommentBlockId}
              setActiveCommentBlockId={setActiveCommentBlockId}
              pageComments={page.comments || []}
              handleAddComment={handleAddComment}
              handleResolveComment={handleResolveComment}
            />
          ))}
        </div>

        {/* Multi-selection batch action bar */}
        {hasSelection && selectedBlockIds.size > 0 && !page.isLocked && (
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
              className="rounded-md px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 transition"
            >
              Delete
            </button>
            <button
              onClick={() => {
                let nextBlocks = [...(page.blocks || [])];
                const clones = [];
                for (const block of nextBlocks) {
                  if (selectedBlockIds.has(block.id)) {
                    clones.push(JSON.parse(JSON.stringify({ ...block, id: crypto.randomUUID() })));
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

        {/* Click empty space to add a block — large invisible click target */}
        {!page.isLocked && (page.blocks || []).length > 0 && (
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

      <AnimatePresence>
        {selection.text && !page.isLocked && (
          <SelectionAIBar
            selection={selection}
            apiKey={apiKey}
            aiProvider={aiProvider}
            nvidiaKey={nvidiaKey}
            onFormat={(type) => {
              const targetBlock = page.blocks.find(b => b.id === selection.blockId);
              if (targetBlock) {
                const text = targetBlock.text;
                const selText = selection.text;
                const start = selection.selStart ?? text.indexOf(selText);
                const end = selection.selEnd ?? start + selText.length;
                let formatted = selText;
                if (type === "bold") formatted = `**${selText}**`;
                else if (type === "italic") formatted = `*${selText}*`;
                else if (type === "underline") formatted = `<u>${selText}</u>`;
                else if (type === "code") formatted = `\`${selText}\``;
                else if (type === "strikethrough") formatted = `~~${selText}~~`;
                else if (type === "clear") {
                  formatted = selText.replace(/[\*\_~`]|<\/?u>/g, "");
                }
                const newText = text.slice(0, start) + formatted + text.slice(end);
                onBlockPatch(selection.blockId, { text: newText });
              }
              setSelection({ text: "", rect: null, blockId: null });
            }}
            onReplace={(newText) => {
              const targetBlock = page.blocks.find(b => b.id === selection.blockId);
              if (targetBlock) {
                const text = targetBlock.text;
                const start = selection.selStart ?? text.indexOf(selection.text);
                const end = selection.selEnd ?? start + selection.text.length;
                const replacedText = text.slice(0, start) + newText + text.slice(end);
                onBlockPatch(selection.blockId, { text: replacedText });
              }
              setSelection({ text: "", rect: null, blockId: null });
            }}
            onInsert={(newText) => {
              onAddBlock(selection.blockId, "text", newText);
              setSelection({ text: "", rect: null, blockId: null });
            }}
            onClose={() => setSelection({ text: "", rect: null, blockId: null })}
            onToast={onToast}
            page={page}
            onBlockPatch={onBlockPatch}
            onPagePatch={onPagePatch}
          />
        )}
      </AnimatePresence>

      {/* Presentation Mode */}
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
                {block.type === "todo" && <div className="flex items-center gap-2"><input type="checkbox" checked={block.checked} readOnly className="accent-[var(--accent)]" /><span className={block.checked ? "line-through opacity-60" : ""}>{block.text}</span></div>}
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
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-400 shadow-lg backdrop-blur-sm">
          <FileEdit size={14} />
          <span>Suggest edits mode — changes are highlighted</span>
          <button onClick={() => setSuggestEdits(false)} className="ml-2 hover:text-amber-300 cursor-pointer">
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
                  <span className="truncate">{p.icon || "📄"} {p.title || "Untitled"}</span>
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
          onHistory: () => setHistoryOpen(true),
          onAskAI,
        }}
      />
    </section>
  );
}

function Block({
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
}) {
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashPos, setSlashPos] = useState(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionPos, setMentionPos] = useState(null);
  const [isFocused, setIsFocused] = useState(false);
  const [inlineAI, setInlineAI] = useState(null);
  const menuButtonRef = useRef(null);
  
  const slashRef = useOutsideDismiss(slashOpen, () => setSlashOpen(false));
  const mentionRef = useOutsideDismiss(mentionOpen, () => setMentionOpen(false));
  const inputRef = useRef(null);
  const [blockContextOpen, setBlockContextOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);

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

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        if (page?.isLocked) return;
        e.preventDefault();
        setFindOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [page?.isLocked]);

  useEffect(() => {
    if (openSlash) {
      setSlashOpen(true);
      const rect = inputRef.current?.closest(".noska-block")?.getBoundingClientRect();
      if (rect) {
        const menuWidth = 320;
        const margin = 12;
        let left = rect.left + 48;
        if (left + menuWidth > window.innerWidth - margin) {
          left = Math.max(margin, window.innerWidth - menuWidth - margin);
        }
        let top = rect.bottom + 4;
        if (top + 400 > window.innerHeight - margin) {
          top = Math.max(margin, rect.top - 400);
        }
        setSlashPos({ top, left });
      }
      onClearOpenSlash?.();
      setTimeout(() => {
        const textarea = inputRef.current;
        if (textarea) textarea.focus();
      }, 50);
    }
  }, [openSlash]);

  const applyFormat = (formatType) => {
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
    if (formatType === 'bold') formatted = `**${selText}**`;
    else if (formatType === 'italic') formatted = `*${selText}*`;
    else if (formatType === 'underline') formatted = `<u>${selText}</u>`;
    else if (formatType === 'strikethrough') formatted = `~~${selText}~~`;
    else if (formatType === 'code') formatted = `\`${selText}\``;
    else if (formatType === 'clear') formatted = selText.replace(/[\*\_~`$]|<\/?u>/g, "");
    else return;
    const cStart = selectionStart;
    onPatch({ text: ta.value.slice(0, selectionStart) + formatted + ta.value.slice(selectionEnd) });
    setTimeout(() => {
      const t = inputRef.current;
      if (t) { t.focus(); t.setSelectionRange(cStart, cStart + formatted.length); }
    }, 0);
  };

  const onKeyDown = (e) => {
    if (page.isLocked || blockPermission === 'view') return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); applyFormat('bold'); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') { e.preventDefault(); applyFormat('italic'); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') { e.preventDefault(); applyFormat('underline'); return; }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') { e.preventDefault(); applyFormat('strikethrough'); return; }
    if ((e.ctrlKey || e.metaKey) && e.code === 'Backquote') { e.preventDefault(); applyFormat('code'); return; }

    if (e.key === "Tab" && suggestion) {
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
      const shortcuts = {
        "#": "h1",
        "##": "h2",
        "###": "h3",
        "####": "h4",
        "-": "bullet",
        "*": "bullet",
        "+": "bullet",
        ">": "quote",
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
      // No shortcut matched — on space key, show inline AI bar if user is at end of text
      if (e.key === " ") {
        const trimmed = (block.text || "").trim();
        const ta = e.target;
        if (trimmed.length >= 3 && !inlineAI && ta.selectionStart === (block.text || "").length) {
          const rect = e.target.closest(".noska-block")?.getBoundingClientRect();
          setInlineAI({ top: (rect?.bottom || 0) + 4, left: (rect?.left || 0), text: trimmed });
        }
      }
    }
    if (e.key === "/" && !block.text) {
      setSlashOpen(true);
      setSlashQuery("");
      const rect = e.target.closest(".noska-block")?.getBoundingClientRect();
      if (rect) {
        const menuWidth = 320;
        const margin = 12;
        let left = rect.left + 48;
        if (left + menuWidth > window.innerWidth - margin) {
          left = Math.max(margin, window.innerWidth - menuWidth - margin);
        }
        let top = rect.bottom + 4;
        if (top + 400 > window.innerHeight - margin) {
          top = Math.max(margin, rect.top - 400);
        }
        setSlashPos({ top, left });
      }
    }
    if (e.key === "Enter" && !e.shiftKey && block.type !== "code") {
      e.preventDefault();
      onAdd("text", "");
      setTimeout(
        () => inputRef.current?.closest(".noska-block")?.nextSibling?.querySelector("textarea,input")?.focus(),
        0
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
          const input = targetEl.querySelector("textarea, input");
          if (input) {
            input.focus();
            const len = input.value?.length || 0;
            input.setSelectionRange(len, len);
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
      onAddAbove("text", "");
      setTimeout(
        () => inputRef.current?.closest(".noska-block")?.previousSibling?.querySelector("textarea,input")?.focus(),
        0
      );
    }
  };

  const applySlash = (type) => {
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
    };
    executeCommand(type, ctx);
    setSlashOpen(false);
  };

  const detectMention = (text) => {
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

  const patchWithSlashDetection = (patch) => {
    if (page.isLocked || blockPermission === 'view') return;
    if (typeof patch.text === "string" && patch.text.trim() === "/" && !block.text) {
      setSlashOpen(true);
      setSlashQuery("");
    }
    if (!mentionOpen && typeof patch.text === "string") {
      detectMention(patch.text);
    }
    onPatch(patch);
  };

  const selectPageMention = (page) => {
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
    quote: "noska-body border-l-4 border-[var(--accent)] pl-4 py-1 italic text-[var(--secondary)] my-3.5 text-[14px] bg-[var(--hover)]/20 rounded-r-md pr-3 block w-full",
    code: "rounded-md border border-[var(--border)] bg-[var(--panel)] p-3.5 font-mono text-[12.5px] text-[var(--text)] my-3 block w-full",
    equation: "font-mono text-center text-md my-4 block w-full",
    callout: "noska-body rounded-lg border border-[var(--border-strong)] bg-[var(--callout)] px-4 py-3 text-[13.5px] text-[var(--text)] my-4 shadow-sm block w-full",
    text: "noska-body text-[14.5px] leading-relaxed text-[var(--text)]/90 block w-full",
    bullet: "noska-body text-[14.5px] leading-relaxed text-[var(--text)]/90 block w-full",
    number: "noska-body text-[14.5px] leading-relaxed text-[var(--text)]/90 block w-full",
    toggle: "noska-body text-[14.5px] leading-relaxed text-[var(--text)]/90 block w-full",
    todo: "noska-body text-[14.5px] leading-relaxed text-[var(--text)]/90 block w-full",
    image: "block w-full",
    embed: "block w-full"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className={`noska-block group relative flex gap-1 rounded py-1 transition hover:bg-[var(--hover)]/55 ${isDragOver ? "bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]" : ""} ${isSelected ? "bg-[var(--accent)]/15 ring-1 ring-[var(--accent)]/40" : ""}`}
      data-block-id={block.id}
      data-selected={isSelected ? "true" : undefined}
      style={{ paddingLeft: `${(block._depth || 0) * 24}px` }}
      onPointerDown={(e) => onSelectBlock?.(e)}
      onContextMenu={(e) => {
        e.preventDefault();
        setBlockContextOpen(true);
      }}
      onDragOver={(e) => {
        if (page.isLocked) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setIsDragOver(true);
      }}
      onDragLeave={(e) => {
        setIsDragOver(false);
      }}
      onDrop={(e) => {
        if (page.isLocked) return;
        e.preventDefault();
        setIsDragOver(false);
        const fromId = dragState.fromBlockId;
        if (fromId && fromId !== block.id) {
          onSwapBlocks?.(fromId, block.id);
        }
        dragState.fromBlockId = null;
      }}
    >
      {/* Block Hover Affordance */}
      {!page.isLocked && (
        <div className="block-tools flex w-12 shrink-0 items-start justify-end gap-0.5 pt-1 opacity-0 group-hover:opacity-100 transition z-20">
          {/* Grip handle */}
          <motion.button
            ref={menuButtonRef}
            draggable="true"
            whileHover={{ scale: 1.1, color: "var(--text)" }}
            whileTap={{ scale: 0.9 }}
            className="grid h-6 w-5 place-items-center rounded text-[var(--muted)] hover:bg-[var(--hover)] cursor-grab active:cursor-grabbing"
            title="Drag to reorder, click for options"
            onClick={(e) => {
              e.stopPropagation();
              setBlockContextOpen((open) => !open);
            }}
            onDragStart={(e) => {
              dragState.fromBlockId = block.id;
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={() => { dragState.fromBlockId = null; }}
          >
            <GripVertical size={15} />
          </motion.button>

          {/* Plus action button */}
          <div className="relative group/plus">
            <motion.button
              whileHover={{ scale: 1.1, color: "var(--accent)" }}
              whileTap={{ scale: 0.9 }}
              className="grid h-6 w-5 place-items-center rounded text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--accent)] cursor-pointer"
              onClick={(e) => {
                const nextId = crypto.randomUUID();
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

          {/* Comment indicator */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setActiveCommentBlockId(activeCommentBlockId === block.id ? null : block.id); }}
              className={`grid h-6 w-5 place-items-center rounded cursor-pointer transition ${
                (pageComments || []).some(c => c.blockId === block.id && !c.resolvedAt)
                  ? "text-[var(--accent)] opacity-100"
                  : "text-[var(--muted)] opacity-0 group-hover:opacity-100"
              } hover:bg-[var(--hover)]`}
              title="Comments"
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

      <div className="relative min-w-0 flex-1">
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
          onCreateSubpage
        )}
        
        {/* Render GhostSuggestion inline at the end when focused */}
        {isFocused && suggestion && !page.isLocked && (
          <div className="absolute right-2 bottom-1.5 pointer-events-none select-none flex items-center gap-1.5 opacity-70 bg-[var(--surface)] px-2 py-0.5 rounded border border-[var(--border-strong)] text-xs text-[var(--muted)] z-10 shadow-sm">
            <span className="italic">{suggestion}</span>
            <span className="bg-[var(--hover)] px-1 rounded text-[9px] font-mono border border-[var(--border)] font-semibold text-[var(--text)]">Tab</span>
          </div>
        )}

        <SlashCommandMenu
          ref={slashRef}
          open={slashOpen}
          onClose={() => setSlashOpen(false)}
          onSelect={(type) => {
            applySlash(type);
            setSlashOpen(false);
          }}
          position={slashPos}
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
            >
              <div className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                Link to page
              </div>
              {mentionItems.length === 0 ? (
                <div className="px-2 py-3 text-center text-xs text-[var(--muted)]">
                  No pages found
                </div>
              ) : (
                <div className="max-h-60 overflow-auto scrollbar-thin space-y-0.5">
                  {mentionItems.slice(0, 8).map((pageItem) => (
                    <motion.button
                      key={pageItem.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => selectPageMention(pageItem)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[var(--text)] hover:bg-[var(--hover)] transition-colors cursor-pointer"
                    >
                      <span className="text-base shrink-0">{pageItem.icon}</span>
                      <span className="min-w-0 flex-1 truncate">{pageItem.title || 'Untitled'}</span>
                    </motion.button>
                  ))}
                </div>
              )}
              <div className="mt-1 border-t border-[var(--border)] px-1 pt-1 text-[9px] text-[var(--muted)]">
                Type to filter pages
              </div>
            </motion.div>,
            document.body
          )}
        </AnimatePresence>

        {createPortal(
          <AnimatePresence>
            {inlineAI && (
              <InlineAIBar
                text={inlineAI.text}
                apiKey={apiKey}
                aiProvider={aiProvider}
                nvidiaKey={nvidiaKey}
                style={{ top: inlineAI.top, left: inlineAI.left }}
                onClose={() => setInlineAI(null)}
                onResult={(result) => {
                  onPatch({ text: result });
                  setInlineAI(null);
                }}
              />
            )}
          </AnimatePresence>,
          document.body
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
              switch (action) {
                case "delete": onDelete(); break;
                case "duplicate": onDuplicate(); break;
                case "template": {
                  const blockCopy = { ...blockFor(block.type, block.text || ""), id: crypto.randomUUID() };
                  onPatch({ type: "button", text: "Template", templateBlocks: [blockCopy] });
                  break;
                }
                case "copy-synced": {
                  if (!page?.blocks) break;
                  const syncedGroupId = block.syncedGroupId || crypto.randomUUID();
                  onPatch({ syncedGroupId });
                  const syncedCopy = {
                    ...blockFor("text", block.text || ""),
                    id: crypto.randomUUID(),
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
                case "convert": onPatch(blockForTreeConversion(block, payload, block.text)); break;
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
            lastEditedBy={block?.lastEditedBy || page?.lastEditedBy || "Krishna Handibagシ"}
            lastEditedAt={block?.lastEditedAt || page?.updatedAt}
            onToast={onToast}
          />
        </FloatingMenu>

        {imagePickerOpen && createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center">
            <div className="fixed inset-0 bg-black/40" onClick={(e) => { e.stopPropagation(); setImagePickerOpen(false); }} />
            <div className="relative z-10 w-[520px] max-h-[80vh] rounded-xl border border-[var(--border)] bg-[var(--elevated)] shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                <h3 className="text-sm font-semibold text-[var(--text)]">Pick an Image</h3>
                <button
                  onClick={() => setImagePickerOpen(false)}
                  className="rounded p-1 text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition cursor-pointer"
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
}

function renderBlockEditor(block, index, cls, ref, onPatch, onKeyDown, onDelete, pages, onFocus, onBlur, isLocked, isFocused, onNavigate, onOpenImagePicker, pageId, onToast, onCreateSubpage) {
  const registryItem = BlockRegistry.find(r => r.type === block.type);
  if (registryItem?.category === "Embeds") {
    return <EmbedBlock block={block} onPatch={onPatch} onKeyDown={onKeyDown} onDelete={onDelete} />;
  }

  if (block.type === "page") {
    const linked = pages.find((p) => p.id === (block.linkedPageId || block.id));
    const previewPage = linked || pages.find((p) => p.id === block.linkedPageId);
    return (
      <PagePeek page={previewPage} pages={pages} onNavigate={onNavigate}>
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            const targetId = linked?.id || block.linkedPageId;
            if (targetId && pages.find((p) => p.id === targetId)) {
              onNavigate?.(targetId, { altKey: e.altKey });
            } else if (onCreateSubpage) {
              const newId = onCreateSubpage(block.id, block.text || "");
              if (newId) onNavigate?.(newId, { altKey: e.altKey });
            }
          }}
          className="flex w-full items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left text-sm font-medium text-[var(--text)] hover:bg-[var(--hover)]"
        >
          <span>{linked?.icon || "📄"}</span>
          <span>{linked?.title || block.text || "Untitled"}</span>
          <span className="ml-auto text-[10px] uppercase tracking-wide text-[var(--muted)]">Subpage</span>
        </button>
      </PagePeek>
    );
  }

  if (block.type === "link-to-page") {
    const target = pages.find((p) => p.id === block.targetPageId);
    return (
      <div className="flex items-center gap-2 rounded-md border border-dashed border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
        <Link size={14} className="text-[var(--accent)] shrink-0" />
        {target ? (
          <PagePeek page={target} pages={pages} onNavigate={onNavigate}>
              <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => onNavigate?.(target.id, { altKey: e.altKey })} className="truncate font-medium text-[var(--accent)] hover:underline">
              {target.icon} {target.title || "Untitled"}
            </button>
          </PagePeek>
        ) : (
          <select
            disabled={isLocked}
            value={block.targetPageId || ""}
            onChange={(e) => onPatch({ targetPageId: e.target.value })}
            className="min-w-0 flex-1 bg-transparent outline-none text-[var(--secondary)]"
          >
            <option value="">Select a page to link…</option>
            {pages.filter((p) => !p.trashed).map((p) => (
              <option key={p.id} value={p.id}>{p.icon} {p.title || "Untitled"}</option>
            ))}
          </select>
        )}
        <span className="ml-auto text-[10px] uppercase tracking-wide text-[var(--muted)]">Link</span>
      </div>
    );
  }

  if (block.type === "mention") {
    const target = pages.find((p) => p.id === block.mentionPageId);
    return (
      <PagePeek page={target} pages={pages} onNavigate={onNavigate}>
        <div className="inline-flex items-center gap-1 rounded bg-[var(--accent)]/10 px-2 py-0.5 text-sm text-[var(--accent)]">
          <span>@</span>
          {target ? (
            <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => onNavigate?.(target.id, { altKey: e.altKey })} className="font-medium hover:underline">
              {target.title || "Untitled"}
            </button>
          ) : (
            <select
              disabled={isLocked}
              value={block.mentionPageId || ""}
              onChange={(e) => {
                const picked = pages.find((p) => p.id === e.target.value);
                onPatch({ mentionPageId: e.target.value, text: `@${picked?.title || "Untitled"}` });
              }}
              className="bg-transparent outline-none"
            >
              <option value="">Mention a page…</option>
              {pages.filter((p) => !p.trashed).map((p) => (
                <option key={p.id} value={p.id}>{p.title || "Untitled"}</option>
              ))}
            </select>
          )}
        </div>
      </PagePeek>
    );
  }

  if (block.type === "divider") return <hr className="my-4 border-[var(--border)]" />;
  if (block.type === "todo") {
    return (
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={!!block.checked}
          disabled={isLocked}
          onChange={(e) => onPatch({ checked: e.target.checked })}
          className="mt-1.5 h-4 w-4 accent-[var(--accent)] cursor-pointer"
        />
        <TextArea
          ref={ref}
          value={block.text}
          onChange={(text) => onPatch({ text })}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          readOnly={isLocked}
          className={block.checked ? "text-[var(--muted)] line-through" : ""}
          placeholder="To-do"
        />
      </label>
    );
  }
  if (block.type === "toggle") {
    return (
      <div className="rounded-md bg-[var(--surface)] px-3 py-2">
        <button
          className="mr-1 inline-grid h-5 w-5 place-items-center rounded text-[var(--secondary)] hover:bg-[var(--hover)] cursor-pointer"
          onClick={() => onPatch({ open: !block.open })}
        >
          {block.open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <TextArea
          ref={ref}
          value={block.text}
          onChange={(text) => onPatch({ text })}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          readOnly={isLocked}
          className="inline-block w-[calc(100%-28px)] align-top font-semibold"
          placeholder="Toggle"
        />
        {block.open && (
          <div className="ml-7 mt-2 border-l-2 border-[var(--border)] pl-3">
            <TextArea
              value={block.nestedText || ""}
              onChange={(nestedText) => onPatch({ nestedText })}
              readOnly={isLocked}
              placeholder="Empty toggle content. Type here..."
              className="text-sm text-[var(--secondary)]"
            />
          </div>
        )}
      </div>
    );
  }
  if (block.type === "image") {
    return (
      <ImageBlock
        block={block}
        onPatch={onPatch}
        onDelete={onDelete}
        isLocked={isLocked}
        pageId={pageId}
        pages={pages}
        onNavigate={onNavigate}
        onToast={onToast}
      />
    );
  }
  if (block.type === "video") {
    return (
      <div className="my-4 rounded-xl overflow-hidden border border-[var(--border)] bg-black relative group/video">
        {block.text ? (
          <>
            <video
              controls
              className="w-full max-h-[480px] object-contain bg-black"
              src={block.text}
              poster={block.poster}
            >
              Your browser does not support the video tag.
            </video>
            {!isLocked && (
              <div className="absolute top-2 right-2 opacity-0 group-hover/video:opacity-100 transition flex gap-1">
                <input
                  type="text"
                  value={block.text}
                  onChange={(e) => onPatch({ text: e.target.value })}
                  className="w-48 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] text-[var(--text)] outline-none"
                  placeholder="Video URL..."
                />
                <button
                  onClick={onDelete}
                  className="rounded-md bg-red-500/80 px-2 py-1 text-[10px] text-white hover:bg-red-500 transition"
                >
                  Delete
                </button>
              </div>
            )}
          </>
        ) : (
          <MediaUploadPlaceholder
            type="video"
            onSelect={(url) => onPatch({ text: url })}
            onDelete={onDelete}
            isLocked={isLocked}
            accept="video/*"
          />
        )}
      </div>
    );
  }
  if (block.type === "audio") {
    return (
      <div className="my-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 group/audio">
        {block.text ? (
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-lg shrink-0">
              🎵
            </div>
            <div className="min-w-0 flex-1">
              <audio controls className="w-full h-8" src={block.text}>
                Your browser does not support the audio tag.
              </audio>
              <div className="text-[10px] text-[var(--muted)] mt-1 truncate">{block.text}</div>
            </div>
            {!isLocked && (
              <button
                onClick={onDelete}
                className="text-[var(--muted)] hover:text-red-400 transition opacity-0 group-hover/audio:opacity-100"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ) : (
          <MediaUploadPlaceholder
            type="audio"
            onSelect={(url) => onPatch({ text: url })}
            onDelete={onDelete}
            isLocked={isLocked}
            accept="audio/*"
          />
        )}
      </div>
    );
  }
  if (block.type === "file") {
    const fileName = block.name || block.text?.split("/").pop() || "file";
    return (
      <div className="my-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 group/file">
        {block.text ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center text-lg shrink-0">
              📎
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-[var(--text)] truncate">{fileName}</div>
              <div className="text-[10px] text-[var(--muted)] truncate">{block.text}</div>
            </div>
            <a
              href={block.text}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition shrink-0"
            >
              Download
            </a>
            {!isLocked && (
              <button
                onClick={onDelete}
                className="text-[var(--muted)] hover:text-red-400 transition opacity-0 group-hover/file:opacity-100 shrink-0"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ) : (
          <MediaUploadPlaceholder
            type="file"
            onSelect={(url) => onPatch({ text: url })}
            onDelete={onDelete}
            isLocked={isLocked}
            accept="*/*"
            fileName={true}
          />
        )}
      </div>
    );
  }
  if (block.type === "bookmark") {
    const url = block.text || block.url || "";
    return (
      <div className="my-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden group/bookmark">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-4 p-4 hover:bg-[var(--hover)] transition"
          >
            <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center text-lg shrink-0">
              <Globe size={18} className="text-[var(--accent)]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-[var(--text)] truncate">{block.title || url}</div>
              <div className="text-[10px] text-[var(--muted)] truncate">{url}</div>
            </div>
            <ExternalLink size={14} className="text-[var(--muted)] shrink-0" />
          </a>
        ) : (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe size={14} className="text-[var(--accent)]" />
              <span className="text-xs font-semibold text-[var(--text)]">Web Bookmark</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={block.text || ""}
                onChange={(e) => onPatch({ text: e.target.value, url: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                placeholder="Paste any URL..."
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]"
                disabled={isLocked}
              />
              {!isLocked && (
                <button onClick={onDelete} className="text-[var(--muted)] hover:text-red-400 transition">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
  if (block.type === "table") return <SimpleTable block={block} onPatch={onPatch} isLocked={isLocked} />;
  if (block.type === "columns") return <ColumnsBlock block={block} onPatch={onPatch} isLocked={isLocked} />;
  if (block.type === "database") return <DatabaseBlock block={block} onPatch={onPatch} isLocked={isLocked} apiKey={apiKey} aiProvider={aiProvider} page={page} />;
  
  if (block.type === "callout") {
    return (
      <div className={cls}>
        <div className="flex gap-2">
          <button
            disabled={isLocked}
            onClick={() =>
              onPatch({
                meta: {
                  ...block.meta,
                  icon: emojis[(emojis.indexOf(block.meta?.icon) + 1) % emojis.length]
                }
              })
            }
          >
            {block.meta?.icon || "💡"}
          </button>
          <TextArea
            ref={ref}
            value={block.text}
            onChange={(text) => onPatch({ text })}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            onBlur={onBlur}
            readOnly={isLocked}
            placeholder="Callout"
          />
        </div>
      </div>
    );
  }
  if (block.type === "bullet") {
    return (
      <div className="flex gap-2">
        <span className="pt-1.5 text-[var(--secondary)]">•</span>
        <TextArea
          ref={ref}
          value={block.text}
          onChange={(text) => onPatch({ text })}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          readOnly={isLocked}
          placeholder="List item"
        />
      </div>
    );
  }
  if (block.type === "number") {
    return (
      <div className="flex gap-2">
        <span className="pt-1.5 text-[var(--secondary)]">{index + 1}.</span>
        <TextArea
          ref={ref}
          value={block.text}
          onChange={(text) => onPatch({ text })}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          readOnly={isLocked}
          placeholder="List item"
        />
      </div>
    );
  }

  if (block.type === "table-of-contents") {
    const owningPage = pages.find(p => p.blocks?.some(b => b.id === block.id));
    const headings = (owningPage?.blocks || []).filter(b => ["h1", "h2", "h3", "h4"].includes(b.type)) || [];
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-2">Table of Contents</div>
        {headings.length === 0 ? (
          <div className="text-xs text-[var(--muted)]">Add headings to view table of contents</div>
        ) : (
          <div className="space-y-1.5 text-xs text-[var(--accent)] font-medium">
            {headings.map(h => (
              <div
                key={h.id}
                style={{ paddingLeft: h.type === "h2" ? 12 : h.type === "h3" ? 24 : h.type === "h4" ? 36 : 0 }}
                className="hover:underline cursor-pointer truncate"
              >
                {h.text || "Untitled Section"}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (block.type === "tabs") {
    const tabs = block.tabs || ["Tab 1", "Tab 2", "Tab 3"];
    const activeTabIdx = block.activeTabIdx || 0;
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <div className="flex bg-[var(--surface)] border-b border-[var(--border)]">
          {tabs.map((tabLabel, idx) => (
            <button
              key={idx}
              onClick={() => onPatch({ activeTabIdx: idx })}
              className={`px-4 py-2 text-xs font-semibold border-r border-[var(--border)] transition cursor-pointer ${
                activeTabIdx === idx ? "bg-[var(--hover)] text-[var(--accent)]" : "text-[var(--secondary)] hover:text-[var(--text)]"
              }`}
            >
              {tabLabel}
            </button>
          ))}
        </div>
        <div className="p-4 text-xs text-[var(--text)]">
          <TextArea
            value={block[`tabContent_${activeTabIdx}`] || ""}
            onChange={(val) => onPatch({ [`tabContent_${activeTabIdx}`]: val })}
            readOnly={isLocked}
            placeholder={`Type content for ${tabs[activeTabIdx]}...`}
          />
        </div>
      </div>
    );
  }

  if (block.type.includes("chart")) {
    const title = block.text || "Chart Data Visualization";
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">{block.type.replace("-", " ")}</span>
          <span className="text-[11px] text-[var(--secondary)] font-semibold">{title}</span>
        </div>
        <div className="h-32 flex items-center justify-center gap-3 border border-[var(--border)] bg-[var(--surface)] rounded-md p-3">
          {block.type === "bar-chart-v" && (
            <div className="flex items-end justify-around w-full h-full pt-4">
              <div className="w-6 bg-[var(--accent)] rounded-t h-[30%]" />
              <div className="w-6 bg-[var(--noska-blue)] rounded-t h-[65%]" />
              <div className="w-6 bg-emerald-500 rounded-t h-[45%]" />
              <div className="w-6 bg-amber-500 rounded-t h-[90%]" />
            </div>
          )}
          {block.type === "bar-chart-h" && (
            <div className="flex flex-col justify-around w-full h-full py-2">
              <div className="h-3 bg-[var(--accent)] rounded-r w-[60%]" />
              <div className="h-3 bg-[var(--noska-blue)] rounded-r w-[85%]" />
              <div className="h-3 bg-emerald-500 rounded-r w-[40%]" />
            </div>
          )}
          {block.type === "line-chart" && (
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="absolute inset-0 flex items-center justify-between px-4">
                <div className="w-2 h-2 rounded-full bg-[var(--accent)]" style={{ marginTop: 20 }} />
                <div className="w-2 h-2 rounded-full bg-[var(--noska-blue)]" style={{ marginBottom: 40 }} />
                <div className="w-2 h-2 rounded-full bg-emerald-500" style={{ marginTop: 10 }} />
              </div>
              <svg className="w-full h-full absolute inset-0 text-[var(--accent)]" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M 0 60 Q 25 20, 50 80 T 100 40" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
          )}
          {block.type === "donut-chart" && (
            <div className="relative w-24 h-24 flex items-center justify-center rounded-full border-4 border-[var(--accent)] border-t-[var(--noska-blue)] border-r-emerald-500 rotate-45">
              <div className="w-12 h-12 rounded-full bg-[var(--elevated)] flex items-center justify-center -rotate-45">
                <span className="text-[9px] font-bold text-[var(--text-secondary)]">75%</span>
              </div>
            </div>
          )}
          {block.type === "number-chart" && (
            <div className="text-center">
              <div className="text-3xl font-black text-[var(--accent)]">1,248</div>
              <div className="text-[9px] text-[var(--muted)] uppercase font-semibold">Page Interactions</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (block.type === "button") {
    const isTemplate = Array.isArray(block.templateBlocks) && block.templateBlocks.length > 0;
    return (
      <div className="my-2">
        <button
          disabled={isLocked}
          onClick={() => {
            if (!isTemplate || isLocked || !page?.blocks) return;
            const clones = block.templateBlocks.map(t => ({
              ...JSON.parse(JSON.stringify(t)),
              id: crypto.randomUUID()
            }));
            const idx = page.blocks.findIndex(b => b.id === block.id);
            if (idx < 0) return;
            const newBlocks = [...page.blocks];
            newBlocks.splice(idx + 1, 0, ...clones);
            onBlocks(newBlocks);
          }}
          className={`rounded-lg px-4 py-2 text-xs font-semibold shadow-md active:scale-95 transition cursor-pointer ${
            isTemplate
              ? "bg-emerald-600 hover:bg-emerald-500 text-white"
              : "bg-[var(--accent)] hover:bg-[var(--accent-deep)] text-white"
          }`}
        >
          {isTemplate ? "▶ " : ""}{block.text || (isTemplate ? "Template button" : "Interactive Button")}
        </button>
        {isTemplate && (
          <span className="ml-2 text-[10px] text-[var(--muted)]">
            {block.templateBlocks.length} block{block.templateBlocks.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    );
  }

  if (block.type === "breadcrumb") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-[var(--muted)] font-medium bg-[var(--surface)] py-1.5 px-3 rounded-lg border border-[var(--border)]">
        <span>Workspace</span>
        <span>/</span>
        <span className="text-[var(--secondary)]">{pages[0]?.title || "My Page"}</span>
        <span>/</span>
        <span className="text-[var(--text)] font-semibold">{block.text || "Current Block"}</span>
      </div>
    );
  }

  if (block.type === "form") {
    return <FormsBlock block={block} onPatch={onPatch} isLocked={isLocked} />;
  }

  if (block.type === "synced-block") {
    return (
      <div className="my-2 rounded-lg border border-blue-500/30 bg-blue-500/5">
        <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-blue-400 border-b border-blue-500/20">
          <span>⟳</span>
          <span>Synced block</span>
          <span className="ml-auto text-[9px] text-[var(--muted)] font-normal normal-case">
            {block.syncedGroupId?.slice(0, 8)}
          </span>
        </div>
        <div className="p-2">
          <TextArea
            ref={ref}
            value={block.text}
            onChange={(text) => onPatch({ text })}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            onBlur={onBlur}
            readOnly={isLocked}
            className="text-[14.5px] leading-relaxed text-[var(--text)]/90 block w-full"
            placeholder="Edit synced block content..."
          />
        </div>
      </div>
    );
  }

  const hasMarkers = block.text && /\*\*|\*(?!\*)|\`|~~|<u>|<\/u>|\$\$/.test(block.text);
  const showFormatted = !isFocused && hasMarkers && !isLocked;

  return (
    <div className="relative">
      <TextArea
        ref={ref}
        value={block.text}
        onChange={(text) => onPatch({ text })}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        readOnly={isLocked}
        className={`${cls} ${showFormatted ? 'opacity-0' : ''}`}
        style={{
          ...(block.color && block.color !== 'default' ? { color: block.color } : {}),
          ...(block.bgColor ? { backgroundColor: block.bgColor } : {})
        }}
        placeholder={placeholderFor(block.type)}
      />
      {showFormatted && (
        <div
          className="absolute inset-0 cursor-text"
          style={{
            ...(block.bgColor ? { backgroundColor: block.bgColor } : {})
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            ref.current?.focus();
            onFocus();
          }}
        >
          <div
            className={cls}
            style={{
              ...(block.color && block.color !== 'default' ? { color: block.color } : {}),
              ...(block.bgColor ? { backgroundColor: block.bgColor } : {})
            }}
            dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(block.text) }}
          />
        </div>
      )}
    </div>
  );
}

function InlineAIBar({ text, apiKey, aiProvider, nvidiaKey, style, onClose, onResult }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const barRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) onClose?.();
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    try {
      const response = await runAI({
        provider: aiProvider,
        anthropicKey: apiKey,
        nvidiaKey,
        system: "You are an AI writing assistant. Given the context before the cursor and a user request, provide the output directly without explanations.",
        prompt: `Context: "${text}"\n\nUser request: ${prompt}\n\nOutput:`
      });
      onResult(response);
    } catch {
      onClose?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      ref={barRef}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      style={style}
      className="fixed z-[150] flex items-center gap-2 rounded-lg border border-[var(--border-strong)] bg-[var(--elevated)] px-3 py-2 shadow-2xl"
    >
      <span className="text-[10px] font-semibold text-[var(--accent)] shrink-0">AI</span>
      <input
        ref={inputRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") onClose?.(); }}
        placeholder={`Edit, expand, or rewrite "${text.slice(0, 40)}${text.length > 40 ? "..." : ""}"`}
        className="flex-1 min-w-0 bg-transparent px-2 py-1 text-xs text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
      />
      <button
        onClick={handleSubmit}
        disabled={loading || !prompt.trim()}
        className="shrink-0 rounded-md bg-[var(--accent)] px-3 py-1 text-[10px] font-semibold text-white transition hover:bg-[var(--accent-deep)] disabled:opacity-40 cursor-pointer"
      >
        {loading ? "..." : "Send"}
      </button>
    </motion.div>
  );
}

function placeholderFor(type) {
  return type === "code" ? "Code" : type === "equation" ? "E = mc^2" : "Press 'space' for AI or '/' for commands";
}

function SimpleTable({ block, onPatch, isLocked }) {
  const table = block.table || [[""]];
  const setCell = (r, c, value) =>
    onPatch({
      table: table.map((row, ri) => (ri === r ? row.map((cell, ci) => (ci === c ? value : cell)) : row))
    });
  return (
    <div className="overflow-auto rounded border border-[var(--border)] scrollbar-thin">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {table.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td key={c} className={`border border-[var(--border)] ${r === 0 ? "bg-[var(--panel)] font-semibold" : ""}`}>
                  <input
                    value={cell}
                    readOnly={isLocked}
                    onChange={(e) => setCell(r, c, e.target.value)}
                    className="w-full bg-transparent px-2 py-2 outline-none"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!isLocked && (
        <div className="flex gap-1 p-1">
          <button
            className="rounded px-2 py-1 text-xs hover:bg-[var(--hover)] cursor-pointer"
            onClick={() => onPatch({ table: [...table, Array(table[0].length).fill("")] })}
          >
            Add row
          </button>
          <button
            className="rounded px-2 py-1 text-xs hover:bg-[var(--hover)] cursor-pointer"
            onClick={() => onPatch({ table: table.map((row) => [...row, ""]) })}
          >
            Add column
          </button>
        </div>
      )}
    </div>
  );
}

function ColumnsBlock({ block, onPatch, isLocked }) {
  const columns = block.columns || [[], []];
  return (
    <div className={`grid gap-3 ${columns.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
      {columns.map((col, i) => (
        <textarea
          key={i}
          value={col.join("\n")}
          readOnly={isLocked}
          onChange={(e) =>
            onPatch({
              columns: columns.map((c, ci) => (ci === i ? e.target.value.split("\n") : c))
            })
          }
          className="min-h-28 rounded border border-[var(--border)] bg-transparent p-3 outline-none"
        />
      ))}
      {!isLocked && (
        <button
          className="rounded border border-dashed border-[var(--border)] text-sm text-[var(--muted)] cursor-pointer"
          onClick={() => onPatch({ columns: columns.length === 2 ? [...columns, ["Column three"]] : columns.slice(0, 2) })}
        >
          {columns.length === 2 ? "3 columns" : "2 columns"}
        </button>
      )}
    </div>
  );
}

export function EmptyState({ onAdd, disabled }) {
  return (
    <button
      onClick={onAdd}
      disabled={disabled}
      className="grid w-full place-items-center rounded border border-dashed border-[var(--border)] py-12 text-center text-[var(--muted)] hover:bg-[var(--hover)] disabled:opacity-50"
    >
      <AnimatedSparkle size={28} className="mb-2 text-[var(--accent)]" />
      Start with an empty block
    </button>
  );
}

function SelectionAIBar({ selection, apiKey, aiProvider, nvidiaKey, onFormat, 
onReplace, onInsert, onClose, onToast, page, onBlockPatch, onPagePatch }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [subView, setSubView] = useState("main");
  const [colorTab, setColorTab] = useState("text");
  const [customColor, setCustomColor] = useState("#ffffff"); // "main" | "more" | "color" | "turn-into"
  const [emojiOpen, setEmojiOpen] = useState(false);
  const barRef = useRef(null);
  const emojiRef = useRef(null);

  useEffect(() => {
    if (!selection?.text) return;
    const handler = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) onClose?.();
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [selection?.text, onClose]);

  useEffect(() => {
    if (!emojiOpen) return;
    const handler = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) setEmojiOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [emojiOpen]);

  if (!selection || !selection.text) return null;

  const handleAIAction = async (promptText) => {
    setLoading(true);
    setResult("");
    try {
      const response = await runAI({
        provider: aiProvider,
        anthropicKey: apiKey,
        nvidiaKey: nvidiaKey,
        system: "You are an expert AI editor inside the Noska note-taking workspace. Provide only the polished/requested text back directly without any conversational intros or formatting wraps.",
        prompt: `${promptText}\n\nSelected text:\n"${selection.text}"`
      });
      setResult(response);
    } catch (e) {
      setResult("AI request failed. Confirm your key is added in Settings.");
    } finally {
      setLoading(false);
    }
  };

  const currentBlock = page?.blocks?.find(b => b.id === selection.blockId);
  const blockTypeLabel = currentBlock
    ? BlockRegistry.find(r => r.type === currentBlock.type)?.label || "Normal Text"
    : "Normal Text";

  const handleBlockConvert = (typeId) => {
    if (selection.blockId && currentBlock) {
      onBlockPatch(selection.blockId, { ...blockFor(typeId, currentBlock.text), id: selection.blockId });
      onToast?.(`Converted block to ${typeId}`);
    }
    setSubView("main");
  };

  const rect = selection.rect;
  const barWidth = 270;
  const barHeight = 360;
  let top = Math.max(10, rect.top - barHeight);
  if (top < 10) top = Math.min(rect.bottom + 10, window.innerHeight - barHeight - 10);
  let left = Math.min(window.innerWidth - barWidth - 16, Math.max(16, rect.left + rect.width / 2 - barWidth / 2));
  if (left + barWidth > window.innerWidth - 16) left = window.innerWidth - barWidth - 16;

  return (
    <div
      ref={barRef}
      style={{ top: `${top}px`, left: `${left}px` }}
      className="absolute z-[150] rounded-xl border border-[var(--border-strong)] bg-[var(--elevated)] p-2.5 shadow-2xl selection-toolbar flex flex-col gap-2 w-[270px] select-none"
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      {!result && !loading ? (
        <>
          {subView === "main" && (
            <div className="flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-1 px-1">
                <button
                  onClick={() => setSubView("turn-into")}
                  className="text-[11px] font-semibold text-[var(--secondary)] flex items-center gap-1 cursor-pointer hover:text-white"
                >
                  {blockTypeLabel} <ChevronDown size={11} />
                </button>
              </div>

              <div className="flex items-center justify-between px-1">
                <button
                  onClick={() => setSubView("color")}
                  className="p-1 rounded hover:bg-[var(--hover)] text-xs text-[var(--secondary)] cursor-pointer"
                  title="Text color"
                >
                  <span className="font-bold underline text-amber-500 decoration-amber-500">A</span>
                </button>
                <button onClick={() => onFormat("bold")} className="p-1 rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer" title="Bold">
                  <Bold size={13} />
                </button>
                <button onClick={() => onFormat("italic")} className="p-1 rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer" title="Italic">
                  <Italic size={13} />
                </button>
                <button onClick={() => onFormat("underline")} className="p-1 rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer" title="Underline">
                  <Underline size={13} />
                </button>
                <button onClick={() => onFormat("clear")} className="p-1 rounded hover:bg-[var(--hover)] text-xs text-[var(--secondary)] font-semibold cursor-pointer" title="Clear formatting">
                  Tx
                </button>
              </div>

              <div className="flex items-center justify-between px-1 border-b border-[var(--border)] pb-1.5">
                <button onClick={() => {
                  const url = window.prompt("Enter hyperlink URL:");
                  if (url) {
                    const targetBlock = selection.text;
                    onReplace(`[${targetBlock}](${url})`);
                  }
                }} className="p-1 rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer" title="Add Link">
                  <Link size={13} />
                </button>
                <button onClick={() => onFormat("strikethrough")} className="p-1 rounded hover:bg-[var(--hover)] text-xs font-semibold line-through text-[var(--secondary)] cursor-pointer" title="Strikethrough">
                  S
                </button>
                <button onClick={() => onFormat("code")} className="p-1 rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer" title="Code block">
                  <Code size={13} />
                </button>
                <button onClick={() => {
                  const equation = window.prompt("Enter LaTeX equation formula:");
                  if (equation) onReplace(`$$${equation}$$`);
                }} className="p-1 rounded hover:bg-[var(--hover)] text-xs font-bold font-mono text-[var(--secondary)] cursor-pointer" title="Inline Math">
                  √x
                </button>
                <button
                  onClick={() => setSubView("more")}
                  className="p-1 rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer"
                  title="More options"
                >
                  <MoreHorizontal size={13} />
                </button>
              </div>

              <div className="flex items-center justify-between px-1 border-b border-[var(--border)] pb-1.5">
                <button onClick={() => {
                  if (selection.blockId && page?.id) {
                    const existing = page.comments || [];
                    const comment = {
                      id: uid(),
                      blockId: selection.blockId,
                      pageId: page.id,
                      text: selection.text || "Selected text",
                      userId: "local",
                      userName: "You",
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      resolvedAt: null,
                      resolvedBy: null
                    };
                    onPagePatch?.({ comments: [...existing, comment] });
                    onToast?.("Comment added");
                    setTimeout(() => { onClose?.(); }, 100);
                    setSelection({ text: "", rect: null, blockId: null });
                  }
                }} className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[var(--hover)] text-[10px] text-[var(--secondary)] cursor-pointer">
                  <MessageCircle size={12} /> Comment
                </button>
                <div className="relative" ref={emojiRef}>
                  <button onClick={() => setEmojiOpen(!emojiOpen)} className="p-1 rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer" title="Smile emoji">
                    <Smile size={13} />
                  </button>
                  {emojiOpen && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 grid grid-cols-5 gap-0.5 rounded-lg border border-[var(--border-strong)] bg-[var(--elevated)] p-2 shadow-2xl z-[160] w-[170px]">
                      <button onClick={() => { onReplace('📝'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-sm cursor-pointer">📝</button>
                      <button onClick={() => { onReplace('📌'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-sm cursor-pointer">📌</button>
                      <button onClick={() => { onReplace('🧠'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-sm cursor-pointer">🧠</button>
                      <button onClick={() => { onReplace('🚀'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-sm cursor-pointer">🚀</button>
                      <button onClick={() => { onReplace('📚'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-sm cursor-pointer">📚</button>
                      <button onClick={() => { onReplace('🗓️'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-sm cursor-pointer">🗓️</button>
                      <button onClick={() => { onReplace('🔖'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-sm cursor-pointer">🔖</button>
                      <button onClick={() => { onReplace('⭐'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer"><Star size={13} /></button>
                      <button onClick={() => { onReplace('❤️'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer"><Heart size={13} /></button>
                      <button onClick={() => { onReplace('👍'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer"><ThumbsUp size={13} /></button>
                      <button onClick={() => { onReplace('🚩'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer"><Flag size={13} /></button>
                      <button onClick={() => { onReplace('🔔'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer"><Bell size={13} /></button>
                      <button onClick={() => { onReplace('🔖'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer"><Bookmark size={13} /></button>
                      <button onClick={() => { onReplace('💡'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer"><Lightbulb size={13} /></button>
                      <button onClick={() => { onReplace('🎯'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer"><Target size={13} /></button>
                      <button onClick={() => { onReplace('⚡'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer"><Zap size={13} /></button>
                      <button onClick={() => { onReplace('✅'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer"><Check size={13} /></button>
                      <button onClick={() => { onReplace('🕐'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer"><Clock size={13} /></button>
                      <button onClick={() => { onReplace('⚠️'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer"><AlertCircle size={13} /></button>
                      <button onClick={() => { onReplace('❓'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer"><HelpCircle size={13} /></button>
                    </div>
                  )}
                </div>
                <button onClick={() => onBlockPatch(selection.blockId, { bgColor: '#ffeb3b33' })} className="p-1 rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer" title="Marker highlight">
                  <Highlighter size={13} />
                </button>
              </div>

              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between items-center text-[9px] uppercase font-bold tracking-wider text-[var(--muted)] px-1">
                  <span>Skills</span>
                  <div className="flex items-center gap-1 text-[var(--muted)]">
                    <SlidersHorizontal size={10} />
                    <span>▲ ▼</span>
                  </div>
                </div>
                <button
                  onClick={() => handleAIAction("Improve writing, flow, and vocabulary:")}
                  className="flex items-center gap-2 rounded px-1.5 py-1 text-left text-xs text-[var(--text)] hover:bg-[var(--hover)] cursor-pointer font-medium"
                >
                  ✨ Improve writing
                </button>
                <button
                  onClick={() => handleAIAction("Proofread the following text for spelling, punctuation, and grammar mistakes:")}
                  className="flex items-center gap-2 rounded px-1.5 py-1 text-left text-xs text-[var(--text)] hover:bg-[var(--hover)] cursor-pointer font-medium"
                >
                  ✓ Proofread
                </button>
                <button
                  onClick={() => handleAIAction("Explain the meaning and context of this text:")}
                  className="flex items-center gap-2 rounded px-1.5 py-1 text-left text-xs text-[var(--text)] hover:bg-[var(--hover)] cursor-pointer font-medium"
                >
                  💡 Explain
                </button>
                <button
                  onClick={() => handleAIAction("Reformat this text into a clean professional paragraph:")}
                  className="flex items-center gap-2 rounded px-1.5 py-1 text-left text-xs text-[var(--text)] hover:bg-[var(--hover)] cursor-pointer font-medium"
                >
                  📝 Reformat
                </button>
              </div>

              <div className="relative mt-1 border-t border-[var(--border)] pt-2 px-1">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && aiPrompt.trim()) {
                      handleAIAction(aiPrompt.trim());
                    }
                  }}
                  placeholder="Edit with AI"
                  className="w-full bg-[var(--surface)] rounded-md border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/3 text-[8px] text-[var(--muted)] font-mono font-semibold pointer-events-none select-none">
                  Alt+⇧+E
                </span>
              </div>
            </div>
          )}

          {subView === "more" && (
            <div className="flex flex-col gap-1 animate-in fade-in slide-in-from-right-2 duration-150 py-1">
              <div className="flex items-center gap-2 border-b border-[var(--border)] pb-1.5 mb-1 px-1">
                <button onClick={() => setSubView("main")} className="p-0.5 rounded text-[var(--muted)] hover:bg-[var(--hover)] hover:text-white transition cursor-pointer">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-semibold text-[var(--secondary)]">More formatting</span>
              </div>
              <button
                onClick={() => { onFormat("strikethrough"); setSubView("main"); }}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs text-[var(--text)] hover:bg-[var(--hover)] rounded transition cursor-pointer"
              >
                <span className="text-xs font-semibold line-through">S</span> Strikethrough
              </button>
              <button
                onClick={() => { onFormat("code"); setSubView("main"); }}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs text-[var(--text)] hover:bg-[var(--hover)] rounded transition cursor-pointer"
              >
                <Code size={13} /> Code Block
              </button>
              <button
                onClick={() => {
                  const val = window.prompt("Enter LaTeX equation formula:");
                  if (val) onReplace(`$$${val}$$`);
                  setSubView("main");
                }}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs text-[var(--text)] hover:bg-[var(--hover)] rounded transition cursor-pointer"
              >
                <span className="font-mono text-xs font-bold">√x</span> Inline Math Equation
              </button>
              <button
                onClick={() => setSubView("color")}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs text-[var(--text)] hover:bg-[var(--hover)] rounded transition cursor-pointer justify-between"
              >
                <span className="flex items-center gap-2">
                  <span className="font-bold underline text-amber-500">A</span> Colors & Highlights
                </span>
                <ChevronDown size={11} className="-rotate-90 text-[var(--muted)]" />
              </button>
            </div>
          )}

          {subView === "color" && (
            <div className="flex flex-col gap-1 animate-in fade-in slide-in-from-right-2 duration-150 py-1 max-h-[340px] overflow-y-auto scrollbar-none">
              <div className="flex items-center gap-2 border-b border-[var(--border)] pb-1.5 mb-1 px-1">
                <button onClick={() => setSubView("main")} className="p-0.5 rounded text-[var(--muted)] hover:bg-[var(--hover)] hover:text-white transition cursor-pointer">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-semibold text-[var(--secondary)]">Colors & Highlights</span>
              </div>
              <div className="flex items-center gap-1 px-1 mb-1">
                <button
                  onClick={() => setColorTab("text")}
                  className={`flex-1 py-1 text-[10px] font-semibold rounded transition cursor-pointer ${
                    colorTab === "text" ? "bg-[var(--accent)] text-white" : "text-[var(--secondary)] hover:bg-[var(--hover)]"
                  }`}
                >
                  Text
                </button>
                <button
                  onClick={() => setColorTab("bg")}
                  className={`flex-1 py-1 text-[10px] font-semibold rounded transition cursor-pointer ${
                    colorTab === "bg" ? "bg-[var(--accent)] text-white" : "text-[var(--secondary)] hover:bg-[var(--hover)]"
                  }`}
                >
                  Background
                </button>
              </div>
              <div className="flex items-center gap-2 px-1 mb-1">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="w-7 h-7 rounded border border-[var(--border)] cursor-pointer p-0 bg-transparent"
                />
                <button
                  onClick={() => {
                    if (selection.blockId) {
                      if (colorTab === "bg") {
                        onBlockPatch(selection.blockId, { bgColor: customColor });
                        onToast?.("Block background color set to custom");
                      } else {
                        onBlockPatch(selection.blockId, { color: customColor });
                        onToast?.("Block text color set to custom");
                      }
                    }
                    setSubView("main");
                  }}
                  className="flex-1 py-1 text-[10px] font-semibold text-[var(--secondary)] bg-[var(--hover)] hover:bg-[var(--surface-3)] rounded transition cursor-pointer"
                >
                  Apply custom color
                </button>
              </div>
              {(colorTab === "text" ? TEXT_COLORS : BG_COLORS).map((c) => (
                <button
                  key={c.name}
                  onClick={() => {
                    if (selection.blockId) {
                      if (c.name === "Default" || c.name === "None") {
                        if (colorTab === "bg") {
                          const { bgColor, ...rest } = currentBlock || {};
                          onBlockPatch(selection.blockId, rest);
                        } else {
                          const { color, ...rest } = currentBlock || {};
                          onBlockPatch(selection.blockId, rest);
                        }
                      } else {
                        const patch = colorTab === "bg" ? { bgColor: c.name.toLowerCase() } : { color: c.name.toLowerCase() };
                        onBlockPatch(selection.blockId, patch);
                      }
                      onToast?.(`${colorTab === "bg" ? "Background" : "Text"} color set to ${c.name}`);
                    }
                    setSubView("main");
                  }}
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs text-[var(--text)] hover:bg-[var(--hover)] rounded transition cursor-pointer"
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded border border-[var(--border)]" style={{ backgroundColor: c.value }}>
                    <span className="text-[9px] font-bold text-[#111]">T</span>
                  </span>
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {subView === "turn-into" && (
            <div className="flex flex-col gap-1 animate-in fade-in slide-in-from-right-2 duration-150 py-1 max-h-[300px] overflow-y-auto scrollbar-none">
              <div className="flex items-center gap-2 border-b border-[var(--border)] pb-1.5 mb-1 px-1">
                <button onClick={() => setSubView("main")} className="p-0.5 rounded text-[var(--muted)] hover:bg-[var(--hover)] hover:text-white transition cursor-pointer">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-semibold text-[var(--secondary)]">Turn block into...</span>
              </div>
              {[
                { id: "text", label: "Text" },
                { id: "h1", label: "Heading 1" },
                { id: "h2", label: "Heading 2" },
                { id: "h3", label: "Heading 3" },
                { id: "bullet", label: "Bullet list" },
                { id: "number", label: "Numbered list" },
                { id: "todo", label: "To-do list" },
                { id: "quote", label: "Quote" },
                { id: "callout", label: "Callout" },
                { id: "code", label: "Code Block" }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleBlockConvert(t.id)}
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs text-[var(--text)] hover:bg-[var(--hover)] rounded transition cursor-pointer"
                >
                  📄 {t.label}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5">
            <span className="text-[9px] uppercase font-semibold text-[var(--muted)]">AI Response</span>
            <button onClick={() => { setResult(""); setLoading(false); }} className="text-[10px] text-[var(--muted)] hover:text-[var(--text)] cursor-pointer">✕ Reset</button>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 py-4 justify-center text-xs text-[var(--secondary)]">
              <Loader2 className="animate-spin" size={14} />
              <span>YoYo is writing...</span>
            </div>
          ) : (
            <div className="text-xs text-[var(--text)] max-h-48 overflow-y-auto scrollbar-thin bg-[var(--bg)]/20 p-2 rounded border border-[var(--border)] leading-relaxed">
              {result}
            </div>
          )}
          {!loading && result && (
            <div className="flex gap-1.5 justify-end mt-1 border-t border-[var(--border)] pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(result);
                  onToast?.("AI result copied to clipboard!");
                }}
                className="rounded bg-[var(--surface)] border border-[var(--border-strong)] px-2 py-1 text-[10px] font-semibold text-[var(--text)] hover:bg-[var(--hover)] transition cursor-pointer"
              >
                Copy
              </button>
              <button
                onClick={() => onReplace(result)}
                className="rounded bg-[var(--accent)] hover:bg-[var(--accent-deep)] px-2.5 py-1 text-[10px] font-semibold text-white transition cursor-pointer"
              >
                Replace
              </button>
              <button
                onClick={() => onInsert(result)}
                className="rounded bg-[var(--surface)] border border-[var(--border-strong)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text)] hover:bg-[var(--hover)] transition cursor-pointer"
              >
                Insert
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Diff Engine ────────────────────────────────────────────────
function computeBlockDiff(oldBlocks, newBlocks) {
  const oldMap = new Map((oldBlocks || []).map(b => [b.id, b]));
  const newMap = new Map((newBlocks || []).map(b => [b.id, b]));
  const allIds = new Set([...oldMap.keys(), ...newMap.keys()]);
  const added = [], removed = [], changed = [], unchanged = [];
  for (const id of allIds) {
    const old = oldMap.get(id);
    const cur = newMap.get(id);
    if (!old && cur) { added.push(cur); }
    else if (old && !cur) { removed.push(old); }
    else if (old && cur) {
      if (old.text !== cur.text || old.type !== cur.type || JSON.stringify(old.properties) !== JSON.stringify(cur.properties)) {
        changed.push({ id, oldText: old.text, newText: cur.text, oldType: old.type, newType: cur.type });
      } else {
        unchanged.push(old);
      }
    }
  }
  return { added, removed, changed, unchanged, addedCount: added.length, removedCount: removed.length, changedCount: changed.length };
}

function VersionHistoryPanel({ versionHistory, onClose, currentBlocks, currentTitle, currentDb, onRestore, onSelectiveRestore, onRestoreDbView }) {
  const [selectedDiff, setSelectedDiff] = useState(null);
  const [selectedBlocks, setSelectedBlocks] = useState(new Set());

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-[480px] max-h-[560px] rounded-xl border border-[var(--border)] bg-[var(--elevated)] shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <History size={15} />
            <span className="text-sm font-semibold">Version History</span>
          </div>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--text)] cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {versionHistory.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--muted)]">No version history yet</div>
          ) : selectedDiff ? (
            <div className="space-y-2">
              <button onClick={() => setSelectedDiff(null)} className="text-[10px] text-[var(--accent)] hover:underline cursor-pointer flex items-center gap-1">
                <ChevronLeft size={12} /> Back to versions
              </button>
              <div className="rounded-lg border border-[var(--border)] p-2 space-y-1">
                <div className="flex items-center gap-2 text-[10px] text-[var(--muted)] mb-1">
                  <span className="text-green-400 font-medium">+{selectedDiff.addedCount} added</span>
                  <span className="text-red-400 font-medium">-{selectedDiff.removedCount} removed</span>
                  <span className="text-amber-400 font-medium">~{selectedDiff.changedCount} changed</span>
                </div>
                {selectedDiff.changed.map(c => (
                  <div key={c.id} className="rounded border border-amber-500/20 bg-amber-500/5 p-2 text-[11px]">
                    <div className="flex items-center gap-1 text-[10px] text-[var(--muted)] mb-1">
                      <span className="font-mono">{c.id.slice(0, 8)}</span>
                      {c.oldType !== c.newType && <span className="font-medium">{c.oldType} → {c.newType}</span>}
                    </div>
                    <div className="font-mono text-[10px] leading-relaxed">
                      <div className="text-red-400 line-through">- {c.oldText || "(empty)"}</div>
                      <div className="text-green-400">+ {c.newText || "(empty)"}</div>
                    </div>
                  </div>
                ))}
                {selectedDiff.added.map(b => (
                  <div key={b.id} className="rounded border border-green-500/20 bg-green-500/5 p-2 text-[11px]">
                    <div className="text-green-400 font-mono text-[10px]">+ {b.text || "(empty)"}</div>
                  </div>
                ))}
                {selectedDiff.removed.map(b => (
                  <div key={b.id} className="rounded border border-red-500/20 bg-red-500/5 p-2 text-[11px]">
                    <div className="text-red-400 line-through font-mono text-[10px]">- {b.text || "(empty)"}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            versionHistory.map((v, i) => {
              const diff = i === 0 ? null : computeBlockDiff(versionHistory[i - 1].blocks, v.blocks);
              const hasDb = v.database && v.database.properties && v.database.properties.length > 0;
              return (
                <div key={v.id || i} className="rounded-lg border border-[var(--border)] p-3 hover:bg-[var(--hover)]/30 transition">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <div className="text-xs font-medium">{new Date(v.timestamp).toLocaleString()}</div>
                      <div className="text-[10px] text-[var(--muted)]">{v.label || `Version ${versionHistory.length - i}`}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedDiff(diff)}
                        disabled={!diff}
                        className="rounded px-2 py-0.5 text-[10px] text-[var(--secondary)] hover:bg-[var(--hover)] disabled:opacity-30 cursor-pointer"
                      >
                        Diff
                      </button>
                      <button
                        onClick={() => onRestore(v)}
                        className="rounded-md px-2.5 py-1 text-[10px] font-medium bg-[var(--accent)] text-white hover:opacity-90 transition cursor-pointer"
                      >
                        Restore
                      </button>
                    </div>
                  </div>
                  {diff && (diff.addedCount > 0 || diff.removedCount > 0 || diff.changedCount > 0) && (
                    <div className="flex items-center gap-2 text-[10px] text-[var(--muted)]">
                      <span className="text-green-400">+{diff.addedCount}</span>
                      <span className="text-red-400">-{diff.removedCount}</span>
                      <span className="text-amber-400">~{diff.changedCount}</span>
                    </div>
                  )}
                  {hasDb && (
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => onRestoreDbView(v)}
                        className="text-[10px] text-[var(--accent)] hover:underline cursor-pointer"
                      >
                        Restore DB views/properties only (keep rows)
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function MediaUploadPlaceholder({ type, onSelect, onDelete, isLocked, accept = "*/*", fileName }) {
  const fileInputRef = React.useRef(null);
  const [urlInput, setUrlInput] = useState("");
  const [tab, setTab] = useState("upload");

  const handleFile = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    onSelect(url);
  };

  return (
    <div className="p-6 flex flex-col items-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center text-3xl">
        {type === "video" ? "🎬" : type === "audio" ? "🎵" : "📎"}
      </div>
      <div className="flex gap-1 bg-[var(--surface)] rounded-lg border border-[var(--border)] p-0.5">
        <button
          onClick={() => setTab("upload")}
          className={`rounded-md px-3 py-1 text-xs font-medium transition cursor-pointer ${
            tab === "upload" ? "bg-[var(--accent)] text-white" : "text-[var(--secondary)] hover:text-[var(--text)]"
          }`}
        >
          Upload
        </button>
        <button
          onClick={() => setTab("link")}
          className={`rounded-md px-3 py-1 text-xs font-medium transition cursor-pointer ${
            tab === "link" ? "bg-[var(--accent)] text-white" : "text-[var(--secondary)] hover:text-[var(--text)]"
          }`}
        >
          Link
        </button>
      </div>

      {tab === "upload" ? (
        <div
          onClick={() => !isLocked && fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-[var(--border)] rounded-xl p-8 text-center cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition group"
        >
          <Upload size={24} className="mx-auto text-[var(--muted)] group-hover:text-[var(--accent)] transition mb-2" />
          <div className="text-xs text-[var(--secondary)]">
            Click to upload {type === "video" ? "a video" : type === "audio" ? "an audio file" : "a file"}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }}
            disabled={isLocked}
          />
        </div>
      ) : (
        <div className="w-full flex gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && urlInput.trim()) { onSelect(urlInput.trim()); } }}
            placeholder={`Paste ${type === "video" ? "a video" : type === "audio" ? "an audio" : "a file"} URL...`}
            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]"
            disabled={isLocked}
          />
          <button
            onClick={() => urlInput.trim() && onSelect(urlInput.trim())}
            disabled={isLocked || !urlInput.trim()}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition disabled:opacity-40"
          >
            Embed
          </button>
        </div>
      )}

      {!isLocked && (
        <button
          onClick={onDelete}
          className="text-[10px] text-[var(--muted)] hover:text-red-400 transition cursor-pointer"
        >
          Delete block
        </button>
      )}
    </div>
  );
}
