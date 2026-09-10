import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  RotateCcw,
  GripVertical,
  FileText,
  MessageSquare,
  Plus,
  StickyNote,
  Palette
} from "lucide-react";
import { usePresence } from "../../hooks/usePresence";
import { useCursor } from "../../hooks/useCursor";
import { usePageIsShared } from "../collab/hooks";
import CollabPresenceBar from "../../components/collab/CollabPresenceBar";
import CollabCursorLayer from "../../components/collab/CollabCursorLayer";
import CanvasCollabLayer from "./CanvasCollabLayer";
import CanvasToolbar from "./CanvasToolbar";
import CanvasElement from "./CanvasElement";
import CanvasConnectors from "./CanvasConnectors";
import CanvasContextBar from "./CanvasContextBar";
import CanvasCategoryLegend from "./CanvasCategoryLegend";
import StickyAttachment from "./StickyAttachment";
import CanvasBoardSidebar from "./CanvasBoardSidebar";
import CanvasKanbanView from "./CanvasKanbanView";
import CanvasAIModal from "./CanvasAIModal";
import CanvasPresentationMode from "./CanvasPresentationMode";
import TemplateBrowserModal from "./templates/TemplateBrowserModal";
import MarketplacePublishModal from "./templates/MarketplacePublishModal";
import CanvasChecklistBar from "./templates/CanvasChecklistBar";
import { generateCanvasFromTemplate } from "./templates/templateGenerator";
import { getOfficialTemplateById } from "./templates/officialTemplates";
import { computeBlockedCards } from "./templates/canvasWorkflowEngine";
import type { NoskaTemplate, TemplateCustomizationOptions, TemplateChecklistItem } from "./templates/templateTypes";
import {
  playNoteLiftSound,
  playNoteDropSound,
  playConnectorSound,
  playTidySound,
  isSoundEnabled,
  toggleSound
} from "./canvasAudio";
import {
  CARD_W,
  CARD_H,
  GRID,
  snap,
  uid,
  makeElement,
  loadPositions,
  savePositions,
  loadCanvasData,
  saveCanvasData,
  emptyData,
  getCardPalette,
  getCardRotation,
  getCardAttachment,
  STICKY_PALETTES,
  loadBoardList,
  createBoard,
  duplicateBoard,
  deleteBoard,
  saveBoardList,
  autoTidyCanvas,
  autoSuggestConnections,
  type CanvasData,
  type CanvasBoardMeta,
  type CanvasElementData,
  type Connector
} from "./canvasStore";
import type { Page, Block } from "../../lib/supabaseService";

const BLOCK_ICONS: Record<string, string> = {
  h1: "H1",
  h2: "H2",
  h3: "H3",
  text: "T",
  bullet: "•",
  number: "#",
  todo: "☐",
  quote: '"',
  code: "</>",
  callout: "!",
  divider: "—",
  toggle: "▶",
};

// Item keys: block cards use raw block id; elements use "el:<id>".
const elKey = (id: string) => `el:${id}`;
const isElKey = (k: string) => typeof k === "string" && k.startsWith("el:");
const rawId = (k: string) => (isElKey(k) ? k.slice(3) : k);

interface CanvasViewProps {
  page: Page;
  onBlockPatch: (blockId: string, patch: Record<string, unknown>) => void;
  onAddBlock?: (blockId?: string, type?: string, text?: string) => void;
}

export default function CanvasView({ page, onBlockPatch, onAddBlock }: CanvasViewProps) {
  const [pan, setPan] = useState({ x: 100, y: 100 });
  const [scale, setScale] = useState(1);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [data, setData] = useState<CanvasData>(emptyData());
  const [tool, setTool] = useState("select");
  const [selection, setSelection] = useState<string[]>([]); // array of item keys
  const [selectedConnector, setSelectedConnector] = useState<string | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [draftConnector, setDraftConnector] = useState<{ fromKey: string; x: number; y: number } | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [activeColorPickerBlockId, setActiveColorPickerBlockId] = useState<string | null>(null);

  // Multi-Board & View Modes & AI State
  const [boards, setBoards] = useState<CanvasBoardMeta[]>(() => loadBoardList(page.id));
  const [activeBoardId, setActiveBoardId] = useState<string>("main");
  const [boardsSidebarOpen, setBoardsSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"flow" | "kanban">("flow");
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [presentationOpen, setPresentationOpen] = useState(false);
  const [soundActive, setSoundActive] = useState<boolean>(() => isSoundEnabled());
  const [templateBrowserOpen, setTemplateBrowserOpen] = useState(false);
  const [marketplacePublishOpen, setMarketplacePublishOpen] = useState(false);
  const [boardChecklist, setBoardChecklist] = useState<TemplateChecklistItem[]>([]);

  const activeBoard = boards.find(b => b.id === activeBoardId);
  const activeTemplate = activeBoard?.template ? getOfficialTemplateById(activeBoard.template) : null;

  useEffect(() => {
    if (activeTemplate?.checklist) {
      setBoardChecklist(activeTemplate.checklist);
    } else {
      setBoardChecklist([]);
    }
  }, [activeBoardId, activeTemplate?.id]);

  const handleToggleChecklistItem = (itemId: string) => {
    setBoardChecklist(prev => prev.map(item => item.id === itemId ? { ...item, completed: !item.completed } : item));
  };

  const canvasRef = useRef<HTMLDivElement>(null);
  const isDraggingBg = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragItem = useRef<{ keys: string[]; start: Record<string, { x: number; y: number }>; origin: { x: number; y: number } } | null>(null);
  const resizeItem = useRef<{ key: string; handle: string; startRect: { x: number; y: number; w: number; h: number }; origin: { x: number; y: number } } | null>(null);
  const undoStack = useRef<Array<{ positions: Record<string, { x: number; y: number }>; data: CanvasData }>>([]);
  const redoStack = useRef<Array<{ positions: Record<string, { x: number; y: number }>; data: CanvasData }>>([]);
  const [, forceUndoRender] = useState(0);

  // Privacy gate: presence/cursors only broadcast on shared pages
  const sharedViaPermissions = usePageIsShared(page?.id ?? null);
  const canvasPage = page as { sharedRole?: string; visibility?: string } | undefined;
  const pageIsShared = !!canvasPage?.sharedRole || canvasPage?.visibility === "public" || sharedViaPermissions;
  const { users, ownStatus, setStatus } = usePresence(pageIsShared ? page?.id : null);
  const { cursors, handleMouseMove: handleCursorMove } = useCursor(pageIsShared ? page?.id : null, { enabled: pageIsShared });

  // ── Load / init ──────────────────────────────────────────────────────────
  useEffect(() => {
    const loadedBoards = loadBoardList(page.id);
    setBoards(loadedBoards);
    const validActiveId = loadedBoards.some(b => b.id === activeBoardId) ? activeBoardId : loadedBoards[0]?.id || "main";
    setActiveBoardId(validActiveId);

    const savedPos = loadPositions(page.id, validActiveId);
    const initialPos = { ...savedPos };
    (page.blocks || []).forEach((block, idx) => {
      if (!initialPos[block.id]) {
        initialPos[block.id] = { x: 120 + (idx % 2) * 360, y: 100 + Math.floor(idx / 2) * 240 };
      }
    });
    setPositions(initialPos);
    setData(loadCanvasData(page.id, validActiveId));
    setSelection([]);
    setSelectedConnector(null);
    undoStack.current = [];
    redoStack.current = [];
    forceUndoRender((n) => n + 1);
  }, [page.id, activeBoardId]);

  // Keep positions in sync when new blocks appear
  useEffect(() => {
    setPositions((prev) => {
      let changed = false;
      const next = { ...prev };
      (page.blocks || []).forEach((block, idx) => {
        if (!next[block.id]) {
          next[block.id] = { x: 120 + (idx % 2) * 360, y: 100 + Math.floor(idx / 2) * 240 };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [page.blocks]);

  const persistPositions = useCallback((next: Record<string, { x: number; y: number }>) => {
    setPositions(next);
    savePositions(page.id, next, activeBoardId);
  }, [page.id, activeBoardId]);

  const persistData = useCallback((next: CanvasData) => {
    setData(next);
    saveCanvasData(page.id, next, activeBoardId);
  }, [page.id, activeBoardId]);

  // Multi-board Actions
  const handleCreateBoard = (name: string, template?: string) => {
    const created = createBoard(page.id, name, template);
    setBoards(loadBoardList(page.id));
    setActiveBoardId(created.id);
    setBoardsSidebarOpen(false);
  };

  const handleDuplicateBoard = (boardId: string) => {
    const duplicated = duplicateBoard(page.id, boardId);
    setBoards(loadBoardList(page.id));
    setActiveBoardId(duplicated.id);
  };

  const handleDeleteBoard = (boardId: string) => {
    const updated = deleteBoard(page.id, boardId);
    setBoards(updated);
    if (activeBoardId === boardId) {
      setActiveBoardId(updated[0]?.id || "main");
    }
  };

  const handleRenameBoard = (boardId: string, newName: string) => {
    const updated = boards.map(b => b.id === boardId ? { ...b, name: newName, updatedAt: new Date().toISOString() } : b);
    setBoards(updated);
    saveBoardList(page.id, updated);
  };

  // Apply Customized Template from Library / Marketplace
  const handleApplyTemplateCustomized = (template: NoskaTemplate, options: TemplateCustomizationOptions) => {
    const generated = generateCanvasFromTemplate(template, options);
    const newBoard = createBoard(page.id, options.boardName, template.id);
    saveCanvasData(page.id, generated.data, newBoard.id);
    savePositions(page.id, generated.positions, newBoard.id);
    setBoards(loadBoardList(page.id));
    setActiveBoardId(newBoard.id);
    setData(generated.data);
    setPositions(generated.positions);
    playTidySound();
  };

  // Auto-Tidy Action (DAG Topological Reorder)
  const handleAutoTidy = () => {
    snapshot();
    const result = autoTidyCanvas(data.elements, data.connectors, positions);
    persistData({ ...data, elements: result.elements });
    persistPositions(result.positions);
  };

  // Smart Auto-Connect Action
  const handleAutoConnect = () => {
    snapshot();
    const suggestions = autoSuggestConnections(data.elements, data.connectors);
    if (suggestions.length > 0) {
      persistData({
        ...data,
        connectors: [...data.connectors, ...suggestions]
      });
    }
  };

  // Connector Mutations
  const handleUpdateConnector = (id: string, updates: Partial<Connector>) => {
    snapshot();
    persistData({
      ...data,
      connectors: data.connectors.map(c => c.id === id ? { ...c, ...updates } : c)
    });
  };

  const handleDeleteConnector = (id: string) => {
    snapshot();
    persistData({
      ...data,
      connectors: data.connectors.filter(c => c.id !== id)
    });
    setSelectedConnector(null);
  };

  // AI & Document Bridge Handlers
  const handleApplyGeneratedCards = (cards: Array<{ text: string; color: string }>) => {
    snapshot();
    const newElements = { ...data.elements };
    const newPositions = { ...positions };
    const startX = -pan.x / scale + 200;
    const startY = -pan.y / scale + 200;

    cards.forEach((card, idx) => {
      const el = makeElement("sticky", startX + (idx % 3) * 280, startY + Math.floor(idx / 3) * 190);
      el.text = card.text;
      el.color = card.color;
      newElements[el.id] = el;
      newPositions[el.id] = { x: el.x, y: el.y };
    });

    persistData({ ...data, elements: newElements });
    persistPositions(newPositions);
  };

  const handleApplyCategories = (categories: Record<string, string>) => {
    snapshot();
    const updatedElements = { ...data.elements };
    Object.entries(categories).forEach(([id, color]) => {
      if (updatedElements[id]) {
        updatedElements[id] = { ...updatedElements[id], color };
      }
    });
    persistData({ ...data, elements: updatedElements });
  };

  const handleExportToDocument = (newBlocks: Block[]) => {
    newBlocks.forEach(b => {
      onAddBlock?.(undefined, b.type, b.text);
    });
  };

  const handleImportFromDocument = (imported: { elements: Record<string, CanvasElementData>; connectors: Connector[]; positions: Record<string, { x: number; y: number }> }) => {
    snapshot();
    persistData({
      ...data,
      elements: { ...data.elements, ...imported.elements },
      connectors: [...data.connectors, ...imported.connectors]
    });
    persistPositions({ ...positions, ...imported.positions });
  };

  // ── Undo / redo (snapshot of positions + data) ─────────────────────────────
  const snapshot = useCallback(() => {
    undoStack.current.push({
      positions: JSON.parse(JSON.stringify(positions)),
      data: JSON.parse(JSON.stringify(data))
    });
    if (undoStack.current.length > 60) undoStack.current.shift();
    redoStack.current = [];
    forceUndoRender((n) => n + 1);
  }, [positions, data]);

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push({ positions, data });
    setPositions(prev.positions);
    savePositions(page.id, prev.positions);
    setData(prev.data);
    saveCanvasData(page.id, prev.data);
    forceUndoRender((n) => n + 1);
  }, [positions, data, page.id]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push({ positions, data });
    setPositions(next.positions);
    savePositions(page.id, next.positions);
    setData(next.data);
    saveCanvasData(page.id, next.data);
    forceUndoRender((n) => n + 1);
  }, [positions, data, page.id]);

  // ── Coordinate helpers ─────────────────────────────────────────────────────
  const screenToCanvas = useCallback((sx: number, sy: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const ox = rect ? sx - rect.left : sx;
    const oy = rect ? sy - rect.top : sy;
    return { x: (ox - pan.x) / scale, y: (oy - pan.y) / scale };
  }, [pan, scale]);

  const canvasToScreen = useCallback((cx: number, cy: number) => ({
    x: cx * scale + pan.x,
    y: cy * scale + pan.y,
  }), [pan, scale]);

  const getRect = useCallback((key: string) => {
    if (isElKey(key)) {
      const el = data.elements[rawId(key)];
      return el ? { x: el.x, y: el.y, w: el.w, h: el.h } : null;
    }
    const p = positions[key];
    return p ? { x: p.x, y: p.y, w: CARD_W, h: CARD_H } : null;
  }, [data.elements, positions]);

  // ── Zoom (wheel, cursor-focused) ────────────────────────────────────────────
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > 0) {
      const delta = e.deltaY < 0 ? 1 : -1;
      const nextScale = Math.min(2.5, Math.max(0.2, scale + delta * 0.08 * scale));
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setPan((prev) => ({
        x: mx - ((mx - prev.x) * nextScale) / scale,
        y: my - ((my - prev.y) * nextScale) / scale,
      }));
      setScale(nextScale);
    }
  };

  // ── Background interactions (create element / pan / deselect) ───────────────
  const handleBgPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const onBg = e.target === e.currentTarget || (e.target as HTMLElement).classList.contains("grid-bg");
    if (!onBg) return;

    setActiveColorPickerBlockId(null);

    // Creation tools spawn an element where clicked
    if (["sticky", "rect", "ellipse", "text", "frame"].includes(tool)) {
      const c = screenToCanvas(e.clientX, e.clientY);
      const el = makeElement(tool, snap(c.x, snapEnabled), snap(c.y, snapEnabled));
      snapshot();
      persistData({ ...data, elements: { ...data.elements, [el.id]: el } });
      setSelection([elKey(el.id)]);
      setTool("select");
      return;
    }

    // Otherwise pan
    isDraggingBg.current = true;
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    setSelection([]);
    setSelectedConnector(null);
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
  };

  const handleBgPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    handleCursorMove?.(e as any);

    if (draftConnector) {
      const c = screenToCanvas(e.clientX, e.clientY);
      setDraftConnector((d) => (d ? { ...d, x: c.x, y: c.y } : d));
      return;
    }

    if (resizeItem.current) {
      const { key, handle, startRect, origin } = resizeItem.current;
      const c = screenToCanvas(e.clientX, e.clientY);
      let { x, y, w, h } = startRect;
      const dx = c.x - origin.x;
      const dy = c.y - origin.y;
      if (handle.includes("e")) w = Math.max(50, startRect.w + dx);
      if (handle.includes("s")) h = Math.max(40, startRect.h + dy);
      if (handle.includes("w")) { w = Math.max(50, startRect.w - dx); x = startRect.x + dx; }
      if (handle.includes("n")) { h = Math.max(40, startRect.h - dy); y = startRect.y + dy; }
      if (snapEnabled) { x = snap(x, true); y = snap(y, true); w = snap(w, true); h = snap(h, true); }
      const id = rawId(key);
      setData((prev) => ({
        ...prev,
        elements: { ...prev.elements, [id]: { ...prev.elements[id], x, y, w, h } }
      }));
      return;
    }

    if (dragItem.current) {
      const c = screenToCanvas(e.clientX, e.clientY);
      const { keys, start, origin } = dragItem.current;
      const dx = c.x - origin.x;
      const dy = c.y - origin.y;
      setPositions((prevPos) => {
        const nextPos = { ...prevPos };
        keys.forEach((k) => {
          if (!isElKey(k) && start[k]) {
            nextPos[k] = { x: snap(start[k].x + dx, snapEnabled), y: snap(start[k].y + dy, snapEnabled) };
          }
        });
        return nextPos;
      });
      setData((prevData) => {
        let touched = false;
        const els = { ...prevData.elements };
        keys.forEach((k) => {
          if (isElKey(k) && start[k]) {
            const id = rawId(k);
            els[id] = { ...els[id], x: snap(start[k].x + dx, snapEnabled), y: snap(start[k].y + dy, snapEnabled) };
            touched = true;
          }
        });
        return touched ? { ...prevData, elements: els } : prevData;
      });
      return;
    }

    if (isDraggingBg.current) {
      setPan({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
    }
  };

  const endInteraction = () => {
    if (dragItem.current || resizeItem.current) {
      if (dragItem.current) playNoteDropSound();
      savePositions(page.id, positions);
      saveCanvasData(page.id, data);
    }
    dragItem.current = null;
    resizeItem.current = null;
    if (isDraggingBg.current) {
      isDraggingBg.current = false;
      if (canvasRef.current) canvasRef.current.style.cursor = tool === "pan" ? "grab" : "default";
    }
    if (draftConnector) setDraftConnector(null);
  };

  // ── Keyboard shortcuts & Power workflows ───────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingBlockId) return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (document.activeElement as HTMLElement)?.isContentEditable) return;

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      // Duplicate
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelection();
        return;
      }
      // Select All
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        const allKeys = [
          ...Object.keys(data.elements).map(id => elKey(id)),
          ...(page.blocks || []).map(b => b.id)
        ];
        setSelection(allKeys);
        return;
      }
      // Presentation Mode Shortcut
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setPresentationOpen(prev => !prev);
        return;
      }
      // Auto-Tidy Shortcut
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        handleAutoTidy();
        return;
      }
      // Tab to spawn next linked sticky note
      if (e.key === "Tab" && selection.length === 1) {
        e.preventDefault();
        const selKey = selection[0];
        const rect = getRect(selKey);
        if (rect) {
          const nextEl = makeElement("sticky", rect.x + rect.w + 60, rect.y);
          snapshot();
          playConnectorSound();
          persistData({
            ...data,
            elements: { ...data.elements, [nextEl.id]: nextEl },
            connectors: [
              ...data.connectors,
              { id: uid("cn"), from: selKey, to: elKey(nextEl.id), type: "leads_to" }
            ]
          });
          setSelection([elKey(nextEl.id)]);
        }
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        deleteSelection();
        return;
      }
      if (e.key === "Escape") {
        setSelection([]);
        setSelectedConnector(null);
        setDraftConnector(null);
        setTool("select");
        setLegendOpen(false);
        setActiveColorPickerBlockId(null);
        setPresentationOpen(false);
        return;
      }
      const map: Record<string, string> = {
        v: "select",
        h: "pan",
        s: "sticky",
        r: "rect",
        o: "ellipse",
        t: "text",
        f: "frame",
        c: "connector",
      };
      if (map[e.key.toLowerCase()]) setTool(map[e.key.toLowerCase()]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ── Element interactions ────────────────────────────────────────────────────
  const beginDragItems = (key: string, e: React.PointerEvent) => {
    const keys = selection.includes(key) && selection.length > 1 ? selection : [key];
    if (!selection.includes(key)) setSelection([key]);
    setSelectedConnector(null);
    const c = screenToCanvas(e.clientX, e.clientY);
    const start: Record<string, { x: number; y: number }> = {};
    keys.forEach((k) => {
      const r = getRect(k);
      if (r) start[k] = { x: r.x, y: r.y };
    });
    snapshot();
    playNoteLiftSound();
    dragItem.current = { keys, start, origin: c };
  };

  const beginResize = (id: string, handle: string, e: React.PointerEvent) => {
    const key = elKey(id);
    const el = data.elements[id];
    if (!el) return;
    setSelection([key]);
    const c = screenToCanvas(e.clientX, e.clientY);
    snapshot();
    resizeItem.current = {
      key,
      handle,
      startRect: { x: el.x, y: el.y, w: el.w, h: el.h },
      origin: c
    };
  };

  const startConnectorFrom = (id: string, e: React.PointerEvent) => {
    const c = screenToCanvas(e.clientX, e.clientY);
    setDraftConnector({ fromKey: isElKey(id) ? id : id, x: c.x, y: c.y });
  };

  // Finish connector when pointer released over an element/card
  const handleElementPointerUp = (targetKey: string) => {
    if (draftConnector && draftConnector.fromKey !== targetKey) {
      const exists = data.connectors.some(
        (cn) =>
          (cn.from === draftConnector.fromKey && cn.to === targetKey) ||
          (cn.from === targetKey && cn.to === draftConnector.fromKey)
      );
      if (!exists) {
        snapshot();
        playConnectorSound();
        persistData({
          ...data,
          connectors: [
            ...data.connectors,
            { id: uid("cn"), from: draftConnector.fromKey, to: targetKey, type: "leads_to" }
          ],
        });
      }
    }
    setDraftConnector(null);
  };

  const changeElementText = (id: string, text: string) => {
    snapshot();
    persistData({
      ...data,
      elements: { ...data.elements, [id]: { ...data.elements[id], text } }
    });
  };

  // Set color for selected element or block card
  const setColorForSelection = (colorId: string) => {
    snapshot();
    const els = { ...data.elements };
    const bMeta = { ...data.blockMeta } as Record<string, any>;
    let touched = false;

    selection.forEach((k) => {
      if (isElKey(k)) {
        const id = rawId(k);
        if (els[id]) {
          els[id] = { ...els[id], color: colorId };
          touched = true;
        }
      } else {
        bMeta[k] = { ...(bMeta[k] || {}), color: colorId };
        touched = true;
      }
    });

    if (touched) {
      persistData({ ...data, elements: els, blockMeta: bMeta });
    }
  };

  const setBlockColor = (blockId: string, colorId: string) => {
    snapshot();
    const bMeta = { ...data.blockMeta } as Record<string, any>;
    bMeta[blockId] = { ...(bMeta[blockId] || {}), color: colorId };
    persistData({ ...data, blockMeta: bMeta });
    setActiveColorPickerBlockId(null);
  };

  const bringToFront = () => {
    const els = { ...data.elements };
    const moved: Record<string, any> = {};
    selection.forEach((k) => {
      if (isElKey(k)) {
        const id = rawId(k);
        if (els[id]) {
          moved[id] = els[id];
          delete els[id];
        }
      }
    });
    if (Object.keys(moved).length) {
      snapshot();
      persistData({ ...data, elements: { ...els, ...moved } });
    }
  };

  const duplicateSelection = () => {
    if (!selection.length) return;
    snapshot();
    const els = { ...data.elements };
    const newSel: string[] = [];
    selection.forEach((k) => {
      if (isElKey(k)) {
        const src = data.elements[rawId(k)];
        if (src) {
          const copy = { ...src, id: uid(src.kind), x: src.x + 24, y: src.y + 24 };
          els[copy.id] = copy;
          newSel.push(elKey(copy.id));
        }
      }
    });
    persistData({ ...data, elements: els });
    if (newSel.length) setSelection(newSel);
  };

  const deleteSelection = () => {
    if (selectedConnector) {
      snapshot();
      persistData({ ...data, connectors: data.connectors.filter((c) => c.id !== selectedConnector) });
      setSelectedConnector(null);
      return;
    }
    if (!selection.length) return;
    snapshot();
    const els = { ...data.elements };
    const removedKeys = new Set(selection);
    selection.forEach((k) => {
      if (isElKey(k)) delete els[rawId(k)];
    });
    const connectors = data.connectors.filter((c) => !removedKeys.has(c.from) && !removedKeys.has(c.to));
    persistData({ ...data, elements: els, connectors });
    setSelection([]);
  };

  // ── Block card drag ─────────────────────────────────────────────────────────
  const beginBlockDrag = (blockId: string, e: React.PointerEvent) => {
    if (tool === "connector") {
      startConnectorFrom(blockId, e);
      return;
    }
    beginDragItems(blockId, e);
  };



  // ── View ops ────────────────────────────────────────────────────────────────
  const allItemRects = useMemo(() => {
    const rects: Array<{ x: number; y: number; w: number; h: number; color?: string }> = [];
    (page.blocks || []).forEach((b) => {
      const p = positions[b.id];
      const customColor = (data.blockMeta?.[b.id] as any)?.color;
      const palette = getCardPalette(b.id, customColor);
      if (p) rects.push({ x: p.x, y: p.y, w: CARD_W, h: CARD_H, color: palette.border });
    });
    Object.values(data.elements).forEach((el) => {
      const palette = getCardPalette(el.id, el.color);
      rects.push({ x: el.x, y: el.y, w: el.w, h: el.h, color: palette.border });
    });
    return rects;
  }, [page.blocks, positions, data.elements, data.blockMeta]);

  const handleFitView = () => {
    if (!allItemRects.length || !canvasRef.current) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    allItemRects.forEach((r) => {
      minX = Math.min(minX, r.x);
      minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + r.w);
      maxY = Math.max(maxY, r.y + r.h);
    });
    const rect = canvasRef.current.getBoundingClientRect();
    const w = maxX - minX, h = maxY - minY;
    const s = Math.min(1.4, Math.max(0.25, Math.min((rect.width - 160) / w, (rect.height - 160) / h)));
    setScale(s);
    setPan({ x: rect.width / 2 - (minX + w / 2) * s, y: rect.height / 2 - (minY + h / 2) * s });
  };

  const handleResetZoom = () => {
    setScale(1);
    setPan({ x: 100, y: 100 });
  };

  // ── Context bar anchor ──────────────────────────────────────────────────────
  const selectionRect = useMemo(() => {
    if (!selection.length) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    selection.forEach((k) => {
      const r = getRect(k);
      if (r) {
        minX = Math.min(minX, r.x);
        minY = Math.min(minY, r.y);
        maxX = Math.max(maxX, r.x + r.w);
        maxY = Math.max(maxY, r.y + r.h);
      }
    });
    if (minX === Infinity) return null;
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }, [selection, getRect]);

  const contextBarPos = selectionRect
    ? canvasToScreen(selectionRect.x + selectionRect.w / 2, selectionRect.y - 14)
    : null;

  const activeColorId = useMemo(() => {
    if (!selection.length) return "yellow";
    const first = selection[0];
    if (isElKey(first)) {
      return data.elements[rawId(first)]?.color || "yellow";
    }
    return (data.blockMeta?.[first] as any)?.color || "yellow";
  }, [selection, data.elements, data.blockMeta]);

  const cursorStyle = tool === "pan" ? "grab" : ["sticky", "rect", "ellipse", "text", "frame"].includes(tool) ? "crosshair" : "default";

  const isCanvasEmpty = (!page.blocks || page.blocks.length === 0) && Object.keys(data.elements).length === 0;

  return (
    <div
      ref={canvasRef}
      onPointerDown={handleBgPointerDown}
      onPointerMove={handleBgPointerMove}
      onPointerUp={endInteraction}
      onPointerLeave={endInteraction}
      onWheel={handleWheel}
      className="relative flex-1 overflow-hidden select-none bg-[#faf7f2] dark:bg-[#1a1714] border-t border-[var(--border)] outline-none"
      style={{ cursor: cursorStyle }}
    >
      <CollabCursorLayer cursors={cursors} containerRef={canvasRef} />
      <CanvasCollabLayer cursors={cursors} />

      {/* Board Onboarding Checklist Bar */}
      <CanvasChecklistBar
        checklist={boardChecklist}
        onToggleItem={handleToggleChecklistItem}
      />

      {/* Multi-Board Canvas Sidebar */}
      <CanvasBoardSidebar
        boards={boards}
        activeBoardId={activeBoardId}
        onSelectBoard={setActiveBoardId}
        onCreateBoard={handleCreateBoard}
        onDuplicateBoard={handleDuplicateBoard}
        onDeleteBoard={handleDeleteBoard}
        onRenameBoard={handleRenameBoard}
        isOpen={boardsSidebarOpen}
        onToggle={() => setBoardsSidebarOpen(prev => !prev)}
        onOpenTemplateBrowser={() => setTemplateBrowserOpen(true)}
      />

      {/* Main Canvas Toolbar with Mode Switcher & Smart Actions */}
      <CanvasToolbar
        tool={tool}
        onToolChange={setTool}
        onUndo={undo}
        onRedo={redo}
        canUndo={undoStack.current.length > 0}
        canRedo={redoStack.current.length > 0}
        snapEnabled={snapEnabled}
        onToggleSnap={() => setSnapEnabled((s) => !s)}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid((s) => !s)}
        showLegend={legendOpen}
        onToggleLegend={() => setLegendOpen((prev) => !prev)}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        onAutoTidy={handleAutoTidy}
        onAutoConnect={handleAutoConnect}
        onToggleBoards={() => setBoardsSidebarOpen(prev => !prev)}
        boardsCount={boards.length}
        onOpenAIModal={() => setAiModalOpen(true)}
        soundActive={soundActive}
        onToggleSound={() => setSoundActive(toggleSound())}
        onPresentationMode={() => setPresentationOpen(true)}
        onOpenTemplates={() => setTemplateBrowserOpen(true)}
        onAddCard={() => {
          const el = makeElement("sticky", -pan.x / scale + 240, -pan.y / scale + 180);
          snapshot();
          persistData({
            ...data,
            elements: { ...data.elements, [el.id]: el }
          });
          setSelection([elKey(el.id)]);
        }}
      />

      {/* Template Browser & Marketplace Hub */}
      <TemplateBrowserModal
        isOpen={templateBrowserOpen}
        onClose={() => setTemplateBrowserOpen(false)}
        existingBoards={boards}
        projectName={page.title || "My Project"}
        onApplyTemplate={handleApplyTemplateCustomized}
        onOpenPublishModal={() => setMarketplacePublishOpen(true)}
      />

      {/* Marketplace Publisher Modal */}
      <MarketplacePublishModal
        isOpen={marketplacePublishOpen}
        onClose={() => setMarketplacePublishOpen(false)}
        boardData={data}
        boardName={boards.find(b => b.id === activeBoardId)?.name || page.title || "My Strategy Board"}
        onPublished={() => {
          setTemplateBrowserOpen(true);
        }}
      />

      {/* Presentation Mode Spotlight Overlay */}
      <CanvasPresentationMode
        isOpen={presentationOpen}
        onClose={() => setPresentationOpen(false)}
        elements={data.elements}
        connectors={data.connectors}
        pageBlocks={page.blocks || []}
        blockMeta={data.blockMeta || {}}
        positions={positions}
      />

      {/* AI Reasoning, Document Bridge & Export Modal */}
      <CanvasAIModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        elements={data.elements}
        connectors={data.connectors}
        pageBlocks={page.blocks || []}
        onApplyGeneratedCards={handleApplyGeneratedCards}
        onApplyCategories={handleApplyCategories}
        onExportToDocument={handleExportToDocument}
        onImportFromDocument={handleImportFromDocument}
      />

      {/* Color Category Legend Modal */}
      <CanvasCategoryLegend
        open={legendOpen}
        onClose={() => setLegendOpen(false)}
        onSelectCategory={(colorId) => {
          if (selection.length > 0) {
            setColorForSelection(colorId);
          }
          setLegendOpen(false);
        }}
      />

      {/* Dual View Modes: Kanban Board View Mode */}
      {viewMode === "kanban" ? (
        <div className="absolute inset-0 pt-16 flex flex-col pointer-events-auto">
          <CanvasKanbanView
            elements={data.elements}
            onUpdateElement={(id, updates) => {
              snapshot();
              persistData({
                ...data,
                elements: {
                  ...data.elements,
                  [id]: { ...data.elements[id], ...updates }
                }
              });
            }}
            onDeleteElement={(id) => {
              snapshot();
              const copy = { ...data.elements };
              delete copy[id];
              persistData({ ...data, elements: copy });
            }}
            onAddStickyInColumn={(colorId) => {
              const el = makeElement("sticky", 100, 100);
              el.color = colorId;
              snapshot();
              persistData({
                ...data,
                elements: { ...data.elements, [el.id]: el }
              });
            }}
          />
        </div>
      ) : (
        /* Pannable / zoomable plane with warm dot grid */
        <motion.div
          animate={{ x: pan.x, y: pan.y, scale }}
          transition={
            dragItem.current || resizeItem.current || isDraggingBg.current
              ? { duration: 0 }
              : { type: "spring", stiffness: 280, damping: 32 }
          }
          className="absolute inset-0 w-[8000px] h-[6000px] origin-top-left grid-bg"
          style={
            showGrid
              ? {
                  backgroundImage:
                    "radial-gradient(#d6cbbe 1.2px, transparent 1.5px)",
                  backgroundSize: `${GRID}px ${GRID}px`,
                }
              : {}
          }
        >
          {/* Soft roadmap connectors under notes with typed markers & midpoint chips */}
          <CanvasConnectors
            connectors={data.connectors}
            getRect={getRect}
            draft={draftConnector}
            selectedId={selectedConnector}
            onSelect={(id) => {
              setSelectedConnector(id);
              setSelection([]);
            }}
            onUpdateConnector={handleUpdateConnector}
            onDeleteConnector={handleDeleteConnector}
          />

        {/* Free-form elements (Sticky notes, Rectangles, Bubbles, Text, Frames) */}
        {Object.values(data.elements).map((el) => (
          <div key={el.id} onPointerUp={() => handleElementPointerUp(elKey(el.id))}>
            <CanvasElement
              el={el}
              selected={selection.includes(elKey(el.id))}
              scale={scale}
              tool={tool}
              onPointerDownBody={(id, e) => beginDragItems(elKey(id), e)}
              onPointerDownHandle={(id, handle, e) => beginResize(id, handle, e)}
              onStartConnector={(id, e) => startConnectorFrom(elKey(id), e)}
              onChangeText={changeElementText}
              onSelect={() => setSelection([elKey(el.id)])}
            />
          </div>
        ))}

        {/* Document Block Cards rendered as warm sticky notes */}
        {(page.blocks || []).map((block) => {
          const pos = positions[block.id] || { x: 100, y: 100 };
          const selected = selection.includes(block.id);
          const customColor = (data.blockMeta?.[block.id] as any)?.color;
          const palette = getCardPalette(block.id, customColor);
          const rotation = getCardRotation(block.id);
          const attachment = getCardAttachment(block.id);
          const isColorPickerOpen = activeColorPickerBlockId === block.id;

          return (
            <div
              key={block.id}
              onPointerDown={(e) => {
                e.stopPropagation();
                beginBlockDrag(block.id, e);
              }}
              onPointerUp={() => handleElementPointerUp(block.id)}
              style={{
                left: pos.x,
                top: pos.y,
                width: CARD_W,
                position: "absolute",
                transform: `rotate(${rotation}deg)`,
              }}
              className="group/card select-text transition-transform duration-150"
            >
              {/* Washi Tape or Pushpin Graphic */}
              <StickyAttachment
                type={attachment.type}
                rotation={attachment.rotation}
                offset={attachment.offset}
                tapeBg={palette.tapeBg}
                pinColor={palette.pinColor}
              />

              {/* Sticky Note Body Container */}
              <div
                style={{
                  backgroundColor: palette.bg,
                  borderColor: palette.border,
                  color: palette.text,
                  boxShadow: `0 12px 30px -8px ${palette.shadow}, 0 2px 6px rgba(0,0,0,0.04)`,
                }}
                className={`rounded-2xl border flex flex-col p-4 relative overflow-hidden transition-all duration-150 ${
                  selected
                    ? "ring-2 ring-slate-900 dark:ring-white ring-offset-2 ring-offset-transparent shadow-xl scale-[1.01]"
                    : "hover:scale-[1.01] hover:shadow-md"
                }`}
              >
                {/* Top header: Drag Handle, Type & Category Tag, Color Picker */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/5 dark:border-white/5 select-none">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <GripVertical size={13} className="shrink-0 opacity-40 cursor-grab hover:opacity-100 transition-opacity" />
                    <span className="flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 opacity-90">
                      <span>{palette.emoji}</span>
                      <span>{palette.label}</span>
                    </span>
                  </div>

                  {/* Category Color Swatch Switcher */}
                  <div className="relative flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveColorPickerBlockId(isColorPickerOpen ? null : block.id);
                      }}
                      title="Change sticky note color & category"
                      className="w-4.5 h-4.5 rounded-full border border-black/20 hover:scale-125 transition-transform flex items-center justify-center text-[8px] cursor-pointer shadow-xs"
                      style={{ backgroundColor: palette.border }}
                    >
                      {palette.emoji}
                    </button>

                    {/* Popover Swatch Picker */}
                    {isColorPickerOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-6 z-50 flex items-center gap-1 p-1.5 rounded-xl bg-[var(--elevated)] border border-[var(--border-strong)] shadow-xl"
                      >
                        {STICKY_PALETTES.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => setBlockColor(block.id, p.id)}
                            title={`${p.emoji} ${p.label}`}
                            className="w-5 h-5 rounded-full border border-black/15 hover:scale-120 transition-transform flex items-center justify-center text-[9px] cursor-pointer"
                            style={{ backgroundColor: p.bg, borderColor: p.border }}
                          >
                            <span>{p.emoji}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Main Text Content */}
                {editingBlockId === block.id ? (
                  <textarea
                    autoFocus
                    defaultValue={block.text}
                    onPointerDown={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      onBlockPatch(block.id, { text: e.target.value });
                      setEditingBlockId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") e.currentTarget.blur();
                      e.stopPropagation();
                    }}
                    className="flex-1 min-h-[90px] bg-transparent outline-none resize-none text-[13.5px] leading-relaxed font-medium placeholder-black/30"
                    placeholder="Write on sticky note..."
                  />
                ) : (
                  <div
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingBlockId(block.id);
                    }}
                    className="flex-1 text-[13.5px] leading-relaxed overflow-hidden whitespace-pre-wrap max-h-[130px] line-clamp-5 cursor-text font-medium"
                  >
                    {block.text || <span className="opacity-40 italic">Double-click to write note...</span>}
                  </div>
                )}

                {/* Card Footer: Block ID, Edit action & Chat Link */}
                <div className="mt-3 pt-2 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-[11px] select-none opacity-85">
                  <span className="opacity-60 flex items-center gap-1 font-mono text-[10px]">
                    <FileText size={10} /> {block.id.slice(0, 4)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => setEditingBlockId(block.id)}
                      className="px-2 py-0.5 rounded-lg bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 transition cursor-pointer font-semibold text-[10.5px]"
                    >
                      Edit
                    </button>
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/20 transition cursor-pointer"
                      title="Link AI chat to this block"
                    >
                      <MessageSquare size={11} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Connector nub on card hover (select or connector tool) */}
              {(selected || tool === "connector") && (
                <button
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    startConnectorFrom(block.id, e);
                  }}
                  style={{
                    position: "absolute",
                    right: -10,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                  title="Drag to create roadmap connector"
                  className="w-5 h-5 rounded-full bg-[#d97706] border-2 border-white shadow-md cursor-crosshair flex items-center justify-center text-white text-[9px] font-bold hover:scale-125 transition-transform z-30"
                >
                  +
                </button>
              )}
            </div>
          );
        })}

        {/* Empty Canvas Friendly State */}
        {isCanvasEmpty && (
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none select-none"
            style={{ width: 400, height: 300 }}
          >
            {/* Ghost Sticky Note Shape */}
            <div className="relative w-64 h-64 rounded-3xl bg-[#fef9c3]/30 border-2 border-dashed border-[#fde047]/60 shadow-lg backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center rotate-[-2deg]">
              <StickyAttachment type="tape" rotation={-3} tapeBg="rgba(254, 240, 138, 0.4)" />
              <div className="w-12 h-12 rounded-2xl bg-[#fef3c7] text-[#d97706] flex items-center justify-center mb-3 shadow-sm">
                <StickyNote size={24} />
              </div>
              <h3 className="text-base font-bold text-[var(--text)] mb-1">Noska Sticky Canvas</h3>
              <p className="text-xs text-[var(--muted)] leading-relaxed mb-4">
                Click <span className="font-bold text-[#d97706]">+ Add Note</span> in the toolbar to add your first note
              </p>
              <button
                onClick={() => {
                  const lastBlock = page.blocks?.[page.blocks.length - 1];
                  onAddBlock?.(lastBlock?.id, "text", "My First Idea");
                }}
                className="pointer-events-auto flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#d97706] text-white text-xs font-semibold shadow-md hover:scale-105 transition-all cursor-pointer"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span>Add First Note</span>
              </button>
            </div>
          </div>
        )}
      </motion.div>
      )}

      {/* Floating Format Context Bar */}
      {(selectionRect || selectedConnector) && !dragItem.current && !resizeItem.current && (
        <CanvasContextBar
          screenPos={
            selectedConnector
              ? (() => {
                  const r = getRect(data.connectors.find((c) => c.id === selectedConnector)?.from || "");
                  return r ? canvasToScreen(r.x + r.w / 2, r.y - 14) : null;
                })()
              : contextBarPos
          }
          showColors={true}
          activeColor={activeColorId}
          onColor={setColorForSelection}
          onDuplicate={duplicateSelection}
          onDelete={deleteSelection}
          onBringToFront={bringToFront}
        />
      )}

      {/* Bottom-right Navigation & MiniMap */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-2.5 pointer-events-none select-none">
        <div className="flex items-center gap-1 rounded-full border border-black/[0.08] dark:border-white/[0.1] bg-white/80 dark:bg-[#181920]/80 backdrop-blur-2xl p-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)] pointer-events-auto text-[var(--text)]">
          <button
            onClick={() => setScale((s) => Math.max(0.2, s - 0.1))}
            className="w-7 h-7 rounded-full hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            title="Zoom out"
          >
            <ZoomOut size={13.5} strokeWidth={2} />
          </button>
          <span className="text-[11.5px] px-1 font-mono min-w-[42px] text-center font-medium text-slate-700 dark:text-slate-200">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(2.5, s + 0.1))}
            className="w-7 h-7 rounded-full hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            title="Zoom in"
          >
            <ZoomIn size={13.5} strokeWidth={2} />
          </button>
          <div className="w-px h-3.5 bg-black/[0.08] dark:bg-white/[0.1] mx-0.5" />
          <button
            onClick={handleFitView}
            className="w-7 h-7 rounded-full hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            title="Fit to screen"
          >
            <Maximize size={13} strokeWidth={2} />
          </button>
          <button
            onClick={handleResetZoom}
            className="w-7 h-7 rounded-full hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            title="Reset position"
          >
            <RotateCcw size={13} strokeWidth={2} />
          </button>
        </div>

        <CanvasMiniMap
          rects={allItemRects}
          pan={pan}
          scale={scale}
          containerRef={canvasRef}
          onJump={(cx, cy) => {
            if (!canvasRef.current) return;
            const rect = canvasRef.current.getBoundingClientRect();
            setPan({ x: rect.width / 2 - cx * scale, y: rect.height / 2 - cy * scale });
          }}
        />
      </div>
    </div>
  );
}

// ── Live pastel mini-map reflecting actual sticky note colors ─────────────────
interface CanvasMiniMapProps {
  rects: Array<{ x: number; y: number; w: number; h: number; color?: string }>;
  pan: { x: number; y: number };
  scale: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onJump?: (cx: number, cy: number) => void;
}

function CanvasMiniMap({ rects, pan, scale, containerRef, onJump }: CanvasMiniMapProps) {
  const W = 160, H = 110, PAD = 10;
  if (!rects.length) {
    return (
      <div className="w-[160px] h-[110px] rounded-2xl border border-[var(--border-strong)] bg-[var(--elevated)]/90 backdrop-blur-md shadow-xl flex items-center justify-center text-[10px] text-[var(--muted)] pointer-events-auto">
        Empty canvas
      </div>
    );
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  rects.forEach((r) => {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w);
    maxY = Math.max(maxY, r.y + r.h);
  });
  const bw = Math.max(1, maxX - minX), bh = Math.max(1, maxY - minY);
  const s = Math.min((W - PAD * 2) / bw, (H - PAD * 2) / bh);
  const offX = (W - bw * s) / 2, offY = (H - bh * s) / 2;

  // viewport rect in canvas coords
  const cont = containerRef.current?.getBoundingClientRect();
  const vpX = cont ? -pan.x / scale : 0;
  const vpY = cont ? -pan.y / scale : 0;
  const vpW = cont ? cont.width / scale : 0;
  const vpH = cont ? cont.height / scale : 0;

  const toMap = (x: number, y: number) => ({
    x: offX + (x - minX) * s,
    y: offY + (y - minY) * s,
  });

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const cx = minX + (mx - offX) / s;
    const cy = minY + (my - offY) / s;
    onJump?.(cx, cy);
  };

  return (
    <div
      onClick={handleClick}
      className="w-[160px] h-[110px] rounded-2xl border border-[var(--border-strong)] bg-[var(--elevated)]/90 backdrop-blur-md shadow-xl relative overflow-hidden pointer-events-auto cursor-pointer"
    >
      <svg width={W} height={H} className="absolute inset-0">
        {rects.map((r, i) => {
          const p = toMap(r.x, r.y);
          return (
            <rect
              key={i}
              x={p.x}
              y={p.y}
              width={Math.max(3, r.w * s)}
              height={Math.max(3, r.h * s)}
              rx={2}
              fill={r.color || "#d97706"}
              opacity={0.8}
            />
          );
        })}
        {cont && (() => {
          const p = toMap(vpX, vpY);
          return (
            <rect
              x={p.x}
              y={p.y}
              width={vpW * s}
              height={vpH * s}
              fill="#d97706"
              opacity={0.15}
              stroke="#d97706"
              strokeWidth={1.5}
              rx={3}
            />
          );
        })()}
      </svg>
      <div className="absolute bottom-1.5 left-2.5 text-[9px] font-bold text-[var(--muted)] uppercase tracking-wider pointer-events-none">
        Mini-map
      </div>
    </div>
  );
}
