import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { ZoomIn, ZoomOut, Maximize, RotateCcw, GripVertical, FileText, MessageSquare } from "lucide-react";
import { usePresence } from "../../hooks/usePresence";
import { useCursor } from "../../hooks/useCursor";
import CollabPresenceBar from "../../components/collab/CollabPresenceBar";
import CollabCursorLayer from "../../components/collab/CollabCursorLayer";
import CanvasCollabLayer from "./CanvasCollabLayer";
import CanvasToolbar from "./CanvasToolbar";
import CanvasElement from "./CanvasElement";
import CanvasConnectors from "./CanvasConnectors";
import CanvasContextBar from "./CanvasContextBar";
import {
  CARD_W, CARD_H, GRID, snap, uid, makeElement,
  loadPositions, savePositions, loadCanvasData, saveCanvasData, emptyData,
} from "./canvasStore";

const BLOCK_ICONS = {
  h1: "H1", h2: "H2", h3: "H3", text: "T", bullet: "•", number: "#",
  todo: "☐", quote: '"', code: "</>", callout: "!", divider: "—", toggle: "▶",
};

// Item keys: block cards use raw block id; elements use "el:<id>".
const elKey = (id) => `el:${id}`;
const isElKey = (k) => typeof k === "string" && k.startsWith("el:");
const rawId = (k) => (isElKey(k) ? k.slice(3) : k);

export default function CanvasView({ page, onBlockPatch, onAddBlock }) {
  const [pan, setPan] = useState({ x: 100, y: 100 });
  const [scale, setScale] = useState(1);
  const [positions, setPositions] = useState({});
  const [data, setData] = useState(emptyData());
  const [tool, setTool] = useState("select");
  const [selection, setSelection] = useState([]); // array of item keys
  const [selectedConnector, setSelectedConnector] = useState(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [draftConnector, setDraftConnector] = useState(null);
  const [editingBlockId, setEditingBlockId] = useState(null);

  const canvasRef = useRef(null);
  const isDraggingBg = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragItem = useRef(null); // { keys, start:{[key]:{x,y}}, origin:{x,y} }
  const resizeItem = useRef(null); // { key, handle, startRect, origin }
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const [, forceUndoRender] = useState(0);

  const { users, ownStatus, setStatus } = usePresence(page?.id);
  const { cursors, handleMouseMove: handleCursorMove } = useCursor(page?.id);

  // ── Load / init ──────────────────────────────────────────────────────────
  useEffect(() => {
    const savedPos = loadPositions(page.id);
    const initialPos = { ...savedPos };
    page.blocks.forEach((block, idx) => {
      if (!initialPos[block.id]) {
        initialPos[block.id] = { x: 120 + (idx % 2) * 380, y: 80 + Math.floor(idx / 2) * 220 };
      }
    });
    setPositions(initialPos);
    setData(loadCanvasData(page.id));
    setSelection([]);
    setSelectedConnector(null);
    undoStack.current = [];
    redoStack.current = [];
    forceUndoRender((n) => n + 1);
  }, [page.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep positions in sync when new blocks appear
  useEffect(() => {
    setPositions((prev) => {
      let changed = false;
      const next = { ...prev };
      page.blocks.forEach((block, idx) => {
        if (!next[block.id]) {
          next[block.id] = { x: 120 + (idx % 2) * 380, y: 80 + Math.floor(idx / 2) * 220 };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [page.blocks]);

  const persistPositions = useCallback((next) => {
    setPositions(next);
    savePositions(page.id, next);
  }, [page.id]);

  const persistData = useCallback((next) => {
    setData(next);
    saveCanvasData(page.id, next);
  }, [page.id]);

  // ── Undo / redo (snapshot of positions + data) ─────────────────────────────
  const snapshot = useCallback(() => {
    undoStack.current.push({ positions: JSON.parse(JSON.stringify(positions)), data: JSON.parse(JSON.stringify(data)) });
    if (undoStack.current.length > 60) undoStack.current.shift();
    redoStack.current = [];
    forceUndoRender((n) => n + 1);
  }, [positions, data]);

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push({ positions, data });
    setPositions(prev.positions); savePositions(page.id, prev.positions);
    setData(prev.data); saveCanvasData(page.id, prev.data);
    forceUndoRender((n) => n + 1);
  }, [positions, data, page.id]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push({ positions, data });
    setPositions(next.positions); savePositions(page.id, next.positions);
    setData(next.data); saveCanvasData(page.id, next.data);
    forceUndoRender((n) => n + 1);
  }, [positions, data, page.id]);

  // ── Coordinate helpers ─────────────────────────────────────────────────────
  const screenToCanvas = useCallback((sx, sy) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const ox = rect ? sx - rect.left : sx;
    const oy = rect ? sy - rect.top : sy;
    return { x: (ox - pan.x) / scale, y: (oy - pan.y) / scale };
  }, [pan, scale]);

  const canvasToScreen = useCallback((cx, cy) => ({
    x: cx * scale + pan.x,
    y: cy * scale + pan.y,
  }), [pan, scale]);

  const getRect = useCallback((key) => {
    if (isElKey(key)) {
      const el = data.elements[rawId(key)];
      return el ? { x: el.x, y: el.y, w: el.w, h: el.h } : null;
    }
    const p = positions[key];
    return p ? { x: p.x, y: p.y, w: CARD_W, h: CARD_H } : null;
  }, [data.elements, positions]);

  // ── Zoom (wheel, cursor-focused) ────────────────────────────────────────────
  const handleWheel = (e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > 0) {
      const delta = e.deltaY < 0 ? 1 : -1;
      const nextScale = Math.min(2.5, Math.max(0.2, scale + delta * 0.08 * scale));
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
  const handleBgPointerDown = (e) => {
    if (e.button !== 0) return;
    const onBg = e.target === e.currentTarget || e.target.classList.contains("grid-bg");
    if (!onBg) return;

    // Creation tools spawn an element where you click
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

  const handleBgPointerMove = (e) => {
    handleCursorMove?.(e);

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
      if (handle.includes("e")) w = Math.max(40, startRect.w + dx);
      if (handle.includes("s")) h = Math.max(30, startRect.h + dy);
      if (handle.includes("w")) { w = Math.max(40, startRect.w - dx); x = startRect.x + dx; }
      if (handle.includes("n")) { h = Math.max(30, startRect.h - dy); y = startRect.y + dy; }
      if (snapEnabled) { x = snap(x, true); y = snap(y, true); w = snap(w, true); h = snap(h, true); }
      const id = rawId(key);
      setData((prev) => ({ ...prev, elements: { ...prev.elements, [id]: { ...prev.elements[id], x, y, w, h } } }));
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
      savePositions(page.id, positions);
      saveCanvasData(page.id, data);
    }
    dragItem.current = null;
    resizeItem.current = null;
    if (isDraggingBg.current) {
      isDraggingBg.current = false;
      if (canvasRef.current) canvasRef.current.style.cursor = tool === "pan" ? "grab" : "default";
    }
    // Drop connector onto an item under the cursor is handled in element pointerup below
    if (draftConnector) setDraftConnector(null);
  };

  // ── Element interactions ────────────────────────────────────────────────────
  const beginDragItems = (key, e) => {
    const keys = selection.includes(key) && selection.length > 1 ? selection : [key];
    if (!selection.includes(key)) setSelection([key]);
    setSelectedConnector(null);
    const c = screenToCanvas(e.clientX, e.clientY);
    const start = {};
    keys.forEach((k) => {
      const r = getRect(k);
      if (r) start[k] = { x: r.x, y: r.y };
    });
    snapshot();
    dragItem.current = { keys, start, origin: c };
  };

  const beginResize = (id, handle, e) => {
    const key = elKey(id);
    const el = data.elements[id];
    if (!el) return;
    setSelection([key]);
    const c = screenToCanvas(e.clientX, e.clientY);
    snapshot();
    resizeItem.current = { key, handle, startRect: { x: el.x, y: el.y, w: el.w, h: el.h }, origin: c };
  };

  const startConnectorFrom = (id, e) => {
    const c = screenToCanvas(e.clientX, e.clientY);
    setDraftConnector({ fromKey: elKey(id), x: c.x, y: c.y });
  };

  // Finish connector when pointer released over an element/card
  const handleElementPointerUp = (targetKey) => {
    if (draftConnector && draftConnector.fromKey !== targetKey) {
      const exists = data.connectors.some(
        (cn) => (cn.from === draftConnector.fromKey && cn.to === targetKey) ||
                (cn.from === targetKey && cn.to === draftConnector.fromKey)
      );
      if (!exists) {
        snapshot();
        persistData({
          ...data,
          connectors: [...data.connectors, { id: uid("cn"), from: draftConnector.fromKey, to: targetKey }],
        });
      }
    }
    setDraftConnector(null);
  };

  const changeElementText = (id, text) => {
    snapshot();
    persistData({ ...data, elements: { ...data.elements, [id]: { ...data.elements[id], text } } });
  };

  // ── Selection ops ───────────────────────────────────────────────────────────
  const setColorForSelection = (colorId) => {
    const els = { ...data.elements };
    let touched = false;
    selection.forEach((k) => {
      if (isElKey(k)) { const id = rawId(k); if (els[id]) { els[id] = { ...els[id], color: colorId }; touched = true; } }
    });
    if (touched) { snapshot(); persistData({ ...data, elements: els }); }
  };

  const bringToFront = () => {
    // Re-insert selected elements at end of object (last drawn = top)
    const els = { ...data.elements };
    const moved = {};
    selection.forEach((k) => { if (isElKey(k)) { const id = rawId(k); if (els[id]) { moved[id] = els[id]; delete els[id]; } } });
    if (Object.keys(moved).length) { snapshot(); persistData({ ...data, elements: { ...els, ...moved } }); }
  };

  const duplicateSelection = () => {
    if (!selection.length) return;
    snapshot();
    const els = { ...data.elements };
    const newSel = [];
    selection.forEach((k) => {
      if (isElKey(k)) {
        const src = data.elements[rawId(k)];
        if (src) { const copy = { ...src, id: uid(src.kind), x: src.x + 24, y: src.y + 24 }; els[copy.id] = copy; newSel.push(elKey(copy.id)); }
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
    selection.forEach((k) => { if (isElKey(k)) delete els[rawId(k)]; });
    const connectors = data.connectors.filter((c) => !removedKeys.has(c.from) && !removedKeys.has(c.to));
    persistData({ ...data, elements: els, connectors });
    // Block cards can't be deleted from canvas (they belong to the doc) — only elements
    setSelection([]);
  };

  // ── Block card drag ─────────────────────────────────────────────────────────
  const beginBlockDrag = (blockId, e) => {
    if (tool === "connector") { startConnectorFrom(blockId, e); return; }
    beginDragItems(blockId, e);
  };

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (editingBlockId) return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault(); duplicateSelection(); return;
      }
      if (e.key === "Delete" || e.key === "Backspace") { deleteSelection(); return; }
      if (e.key === "Escape") { setSelection([]); setSelectedConnector(null); setDraftConnector(null); setTool("select"); return; }
      const map = { v: "select", h: "pan", s: "sticky", r: "rect", o: "ellipse", t: "text", f: "frame", c: "connector" };
      if (map[e.key.toLowerCase()]) setTool(map[e.key.toLowerCase()]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // deps intentionally broad; handlers read latest via closure recreation

  // ── View ops ────────────────────────────────────────────────────────────────
  const allItemRects = useMemo(() => {
    const rects = [];
    page.blocks.forEach((b) => { const p = positions[b.id]; if (p) rects.push({ x: p.x, y: p.y, w: CARD_W, h: CARD_H }); });
    Object.values(data.elements).forEach((el) => rects.push({ x: el.x, y: el.y, w: el.w, h: el.h }));
    return rects;
  }, [page.blocks, positions, data.elements]);

  const handleFitView = () => {
    if (!allItemRects.length) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    allItemRects.forEach((r) => {
      minX = Math.min(minX, r.x); minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + r.w); maxY = Math.max(maxY, r.y + r.h);
    });
    const rect = canvasRef.current.getBoundingClientRect();
    const w = maxX - minX, h = maxY - minY;
    const s = Math.min(1.4, Math.max(0.25, Math.min((rect.width - 140) / w, (rect.height - 140) / h)));
    setScale(s);
    setPan({ x: rect.width / 2 - (minX + w / 2) * s, y: rect.height / 2 - (minY + h / 2) * s });
  };

  const handleResetZoom = () => { setScale(1); setPan({ x: 100, y: 100 }); };

  // ── Context bar anchor ──────────────────────────────────────────────────────
  const selectionRect = useMemo(() => {
    if (!selection.length) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    selection.forEach((k) => {
      const r = getRect(k);
      if (r) { minX = Math.min(minX, r.x); minY = Math.min(minY, r.y); maxX = Math.max(maxX, r.x + r.w); maxY = Math.max(maxY, r.y + r.h); }
    });
    if (minX === Infinity) return null;
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }, [selection, getRect]);

  const contextBarPos = selectionRect ? canvasToScreen(selectionRect.x + selectionRect.w / 2, selectionRect.y - 12) : null;
  const selectionHasElement = selection.some(isElKey);
  const activeColorId = selectionHasElement ? (data.elements[rawId(selection.find(isElKey))]?.color || "default") : "default";

  const cursorStyle = tool === "pan" ? "grab" : ["sticky", "rect", "ellipse", "text", "frame"].includes(tool) ? "crosshair" : "default";

  return (
    <div
      ref={canvasRef}
      onPointerDown={handleBgPointerDown}
      onPointerMove={handleBgPointerMove}
      onPointerUp={endInteraction}
      onPointerLeave={endInteraction}
      onWheel={handleWheel}
      className="relative flex-1 overflow-hidden select-none bg-[var(--editor)] border-t border-[var(--border)] outline-none"
      style={{ cursor: cursorStyle }}
    >
      <CollabCursorLayer cursors={cursors} containerRef={canvasRef} />
      <CanvasCollabLayer cursors={cursors} />

      <div className="absolute top-3 left-3 z-20 pointer-events-auto">
        <CollabPresenceBar users={users} ownStatus={ownStatus} pageId={page?.id} onStatusChange={setStatus} />
      </div>

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
        onAddCard={() => {
          const lastBlock = page.blocks[page.blocks.length - 1];
          onAddBlock?.(lastBlock?.id, "text", "");
        }}
      />

      {/* Pannable / zoomable plane */}
      <motion.div
        animate={{ x: pan.x, y: pan.y, scale }}
        transition={dragItem.current || resizeItem.current || isDraggingBg.current ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 30 }}
        className="absolute inset-0 w-[6000px] h-[4500px] origin-top-left grid-bg"
        style={showGrid ? {
          backgroundImage: "radial-gradient(var(--border-strong) 1px, transparent 1.5px)",
          backgroundSize: `${GRID}px ${GRID}px`,
        } : {}}
      >
        {/* Connectors under items */}
        <CanvasConnectors
          connectors={data.connectors}
          getRect={getRect}
          draft={draftConnector}
          selectedId={selectedConnector}
          onSelect={(id) => { setSelectedConnector(id); setSelection([]); }}
        />

        {/* Free-form elements */}
        {Object.values(data.elements).map((el) => (
          <div key={el.id} onPointerUp={() => handleElementPointerUp(elKey(el.id))}>
            <CanvasElement
              el={el}
              selected={selection.includes(elKey(el.id))}
              scale={scale}
              tool={tool}
              onPointerDownBody={(id, e) => beginDragItems(elKey(id), e)}
              onPointerDownHandle={(id, handle, e) => beginResize(id, handle, e)}
              onStartConnector={(id, e) => startConnectorFrom(id, e)}
              onChangeText={changeElementText}
              onSelect={() => setSelection([elKey(el.id)])}
            />
          </div>
        ))}

        {/* Block cards (document blocks) */}
        {page.blocks.map((block) => {
          const pos = positions[block.id] || { x: 100, y: 100 };
          const selected = selection.includes(block.id);
          return (
            <div
              key={block.id}
              onPointerDown={(e) => { e.stopPropagation(); beginBlockDrag(block.id, e); }}
              onPointerUp={() => handleElementPointerUp(block.id)}
              style={{ left: pos.x, top: pos.y, width: CARD_W, position: "absolute" }}
              className={`rounded-xl border bg-[var(--surface)] text-[var(--text)] overflow-hidden shadow-md flex flex-col p-4 select-text ${
                selected ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/40" : "border-[var(--border-strong)]"
              }`}
            >
              <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-[var(--border)] select-none">
                <GripVertical size={12} className="shrink-0 text-[var(--muted)] cursor-grab" />
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--secondary)]">
                  <span className="text-[var(--accent)]">{BLOCK_ICONS[block.type] || "T"}</span>
                  {block.type}
                </span>
              </div>

              {editingBlockId === block.id ? (
                <textarea
                  autoFocus
                  defaultValue={block.text}
                  onPointerDown={(e) => e.stopPropagation()}
                  onBlur={(e) => { onBlockPatch(block.id, { text: e.target.value }); setEditingBlockId(null); }}
                  onKeyDown={(e) => { if (e.key === "Escape") e.currentTarget.blur(); e.stopPropagation(); }}
                  className="flex-1 min-h-[80px] bg-transparent outline-none resize-none text-sm leading-relaxed"
                />
              ) : (
                <div
                  onDoubleClick={(e) => { e.stopPropagation(); setEditingBlockId(block.id); }}
                  className="flex-1 text-sm leading-relaxed overflow-hidden whitespace-pre-wrap max-h-[120px] line-clamp-4 cursor-text"
                >
                  {block.text || <span className="text-[var(--muted)] italic">Double-click to edit</span>}
                </div>
              )}

              <div className="mt-4 pt-2 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--secondary)] select-none">
                <span className="opacity-60 flex items-center gap-1"><FileText size={10} /> {block.id.slice(0, 4)}</span>
                <div className="flex items-center gap-1">
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => setEditingBlockId(block.id)}
                    className="px-2 py-0.5 rounded bg-[var(--hover)] hover:bg-[var(--surface-3)] hover:text-[var(--text)] transition"
                  >Edit</button>
                  <button onPointerDown={(e) => e.stopPropagation()} className="p-0.5 rounded text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition" title="Link chat to this block">
                    <MessageSquare size={10} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Floating format bar */}
      {(selectionRect || selectedConnector) && !dragItem.current && !resizeItem.current && (
        <CanvasContextBar
          screenPos={selectedConnector
            ? (() => { const r = getRect(data.connectors.find(c => c.id === selectedConnector)?.from); return r ? canvasToScreen(r.x + r.w / 2, r.y - 12) : null; })()
            : contextBarPos}
          showColors={selectionHasElement}
          activeColor={activeColorId}
          onColor={setColorForSelection}
          onDuplicate={duplicateSelection}
          onDelete={deleteSelection}
          onBringToFront={bringToFront}
        />
      )}

      {/* Bottom-right dashboard + minimap */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-3 pointer-events-none select-none">
        <div className="flex items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-[var(--elevated)] p-1 shadow-lg pointer-events-auto text-[var(--text)]">
          <button onClick={() => setScale((s) => Math.max(0.2, s - 0.1))} className="p-1.5 rounded hover:bg-[var(--hover)] transition text-[var(--secondary)] hover:text-[var(--text)]" title="Zoom out"><ZoomOut size={14} /></button>
          <span className="text-xs px-1.5 font-mono min-w-[48px] text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale((s) => Math.min(2.5, s + 0.1))} className="p-1.5 rounded hover:bg-[var(--hover)] transition text-[var(--secondary)] hover:text-[var(--text)]" title="Zoom in"><ZoomIn size={14} /></button>
          <div className="w-px h-4 bg-[var(--border-strong)] mx-1" />
          <button onClick={handleFitView} className="p-1.5 rounded hover:bg-[var(--hover)] transition text-[var(--secondary)] hover:text-[var(--text)]" title="Fit to screen"><Maximize size={14} /></button>
          <button onClick={handleResetZoom} className="p-1.5 rounded hover:bg-[var(--hover)] transition text-[var(--secondary)] hover:text-[var(--text)]" title="Reset position"><RotateCcw size={14} /></button>
        </div>

        <CanvasMiniMap rects={allItemRects} pan={pan} scale={scale} containerRef={canvasRef} onJump={(cx, cy) => {
          const rect = canvasRef.current.getBoundingClientRect();
          setPan({ x: rect.width / 2 - cx * scale, y: rect.height / 2 - cy * scale });
        }} />
      </div>
    </div>
  );
}

// ── Live minimap that reflects actual item bounds ──────────────────────────────
function CanvasMiniMap({ rects, pan, scale, containerRef, onJump }) {
  const W = 150, H = 100, PAD = 8;
  if (!rects.length) {
    return (
      <div className="w-[150px] h-[100px] rounded-lg border border-[var(--border-strong)] bg-[var(--elevated)]/90 backdrop-blur-[2px] shadow-lg flex items-center justify-center text-[9px] text-[var(--muted)] pointer-events-auto">
        Empty canvas
      </div>
    );
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  rects.forEach((r) => { minX = Math.min(minX, r.x); minY = Math.min(minY, r.y); maxX = Math.max(maxX, r.x + r.w); maxY = Math.max(maxY, r.y + r.h); });
  const bw = Math.max(1, maxX - minX), bh = Math.max(1, maxY - minY);
  const s = Math.min((W - PAD * 2) / bw, (H - PAD * 2) / bh);
  const offX = (W - bw * s) / 2, offY = (H - bh * s) / 2;

  // viewport rect in canvas coords
  const cont = containerRef.current?.getBoundingClientRect();
  const vpX = cont ? -pan.x / scale : 0;
  const vpY = cont ? -pan.y / scale : 0;
  const vpW = cont ? cont.width / scale : 0;
  const vpH = cont ? cont.height / scale : 0;

  const toMap = (x, y) => ({ x: offX + (x - minX) * s, y: offY + (y - minY) * s });

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const cx = minX + (mx - offX) / s;
    const cy = minY + (my - offY) / s;
    onJump?.(cx, cy);
  };

  return (
    <div onClick={handleClick} className="w-[150px] h-[100px] rounded-lg border border-[var(--border-strong)] bg-[var(--elevated)]/90 backdrop-blur-[2px] shadow-lg relative overflow-hidden pointer-events-auto cursor-pointer">
      <svg width={W} height={H} className="absolute inset-0">
        {rects.map((r, i) => {
          const p = toMap(r.x, r.y);
          return <rect key={i} x={p.x} y={p.y} width={Math.max(2, r.w * s)} height={Math.max(2, r.h * s)} rx={1.5} fill="var(--secondary)" opacity={0.5} />;
        })}
        {cont && (() => {
          const p = toMap(vpX, vpY);
          return <rect x={p.x} y={p.y} width={vpW * s} height={vpH * s} fill="var(--accent)" opacity={0.12} stroke="var(--accent)" strokeWidth={1} rx={2} />;
        })()}
      </svg>
      <div className="absolute bottom-1 left-2 text-[8px] font-bold text-[var(--muted)] uppercase tracking-wide pointer-events-none">Mini-map</div>
    </div>
  );
}
