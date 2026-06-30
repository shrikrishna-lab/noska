import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ZoomIn, ZoomOut, Maximize, RotateCcw, GripVertical, FileText, MessageSquare } from "lucide-react";
import { SPRING_PRESETS } from "../motion/MotionSystem";
import { usePresence } from "../../hooks/usePresence";
import { useCursor } from "../../hooks/useCursor";
import CollabPresenceBar from "../../components/collab/CollabPresenceBar";
import CollabCursorLayer from "../../components/collab/CollabCursorLayer";
import CanvasCollabLayer from "./CanvasCollabLayer";

const BLOCK_ICONS = {
  h1: "H1", h2: "H2", h3: "H3",
  text: "T", bullet: "•", number: "#",
  todo: "☐", quote: '"', code: "</>",
  callout: "!", divider: "—", toggle: "▶"
};

export default function CanvasView({ page, onBlockPatch, onAddBlock }) {
  const [pan, setPan] = useState({ x: 100, y: 100 });
  const [scale, setScale] = useState(1);
  const [positions, setPositions] = useState({});
  const canvasRef = useRef(null);
  const isDraggingBg = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Load and initialize positions for page blocks
  useEffect(() => {
    const saved = localStorage.getItem(`noska-canvas-pos-${page.id}`);
    const initialPos = saved ? JSON.parse(saved) : {};
    
    // Ensure every block has a valid x, y coordinate
    page.blocks.forEach((block, idx) => {
      if (!initialPos[block.id]) {
        initialPos[block.id] = {
          x: 120 + (idx % 2) * 380,
          y: 80 + Math.floor(idx / 2) * 200
        };
      }
    });

    setPositions(initialPos);
  }, [page.id, page.blocks]);

  // Persist positions to local storage
  const savePositions = (newPos) => {
    setPositions(newPos);
    localStorage.setItem(`noska-canvas-pos-${page.id}`, JSON.stringify(newPos));
  };

  // Zoom Handler with scroll wheel
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomIntensity = 0.08;
    const delta = e.deltaY < 0 ? 1 : -1;
    const nextScale = Math.min(2.0, Math.max(0.25, scale + delta * zoomIntensity));
    
    // Focus zoom on mouse position if container is available
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Adjust pan to zoom towards mouse cursor
      setPan((prev) => ({
        x: mouseX - ((mouseX - prev.x) * nextScale) / scale,
        y: mouseY - ((mouseY - prev.y) * nextScale) / scale
      }));
    }
    
    setScale(nextScale);
  };

  // Drag Canvas background to pan
  const handleMouseDown = (e) => {
    // Only drag on left click on the empty canvas space
    if (e.button !== 0 || e.target !== e.currentTarget && !e.target.classList.contains("grid-bg")) return;
    
    isDraggingBg.current = true;
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    canvasRef.current.style.cursor = "grabbing";
  };

  const handleMouseMove = (e) => {
    if (!isDraggingBg.current) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    if (isDraggingBg.current) {
      isDraggingBg.current = false;
      if (canvasRef.current) canvasRef.current.style.cursor = "grab";
    }
  };

  // Center/Fit all cards inside viewport
  const handleFitView = () => {
    const cardIds = Object.keys(positions);
    if (!cardIds.length) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    cardIds.forEach((id) => {
      const pos = positions[id];
      if (pos) {
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + 320);
        maxY = Math.max(maxY, pos.y + 160);
      }
    });

    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const contentW = maxX - minX;
      const contentH = maxY - minY;
      
      const newScale = Math.min(1.2, Math.max(0.4, Math.min((rect.width - 120) / contentW, (rect.height - 120) / contentH)));
      setScale(newScale);
      setPan({
        x: rect.width / 2 - (minX + contentW / 2) * newScale,
        y: rect.height / 2 - (minY + contentH / 2) * newScale
      });
    }
  };

  const handleResetZoom = () => {
    setScale(1);
    setPan({ x: 100, y: 100 });
  };

  // Update card coordinates after user drags a block card
  const handleDragEnd = (blockId, info) => {
    const cardPos = positions[blockId] || { x: 0, y: 0 };
    savePositions({
      ...positions,
      [blockId]: {
        x: cardPos.x + info.offset.x / scale,
        y: cardPos.y + info.offset.y / scale
      }
    });
  };

  const { users, ownStatus, setStatus } = usePresence(page?.id);
  const { cursors, handleMouseMove: handleCursorMove } = useCursor(page?.id);

  return (
    <div
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={(e) => { handleMouseMove(e); handleCursorMove(e); }}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      className="relative flex-1 overflow-hidden select-none bg-[var(--editor)] border-t border-[var(--border)] outline-none"
      style={{ cursor: "grab" }}
    >
      {/* Real collaborator cursors */}
      <CollabCursorLayer cursors={cursors} containerRef={canvasRef} />
      <CanvasCollabLayer cursors={cursors} />

      {/* Real collaborator presence toolbar */}
      <div className="absolute top-3 left-3 z-20 pointer-events-auto">
        <CollabPresenceBar
          users={users}
          ownStatus={ownStatus}
          pageId={page?.id}
          onStatusChange={setStatus}
        />
      </div>

      {/* Zoomable, Pannable Workspace Plane */}
      <motion.div
        animate={{ x: pan.x, y: pan.y, scale }}
        transition={SPRING_PRESETS.gentle}
        className="absolute inset-0 w-[4000px] h-[3000px] origin-top-left grid-bg"
        style={{
          backgroundImage: "radial-gradient(var(--border-strong) 1px, transparent 1.5px)",
          backgroundSize: "24px 24px"
        }}
      >
        {/* Render note cards on Canvas */}
        {page.blocks.map((block) => {
          const pos = positions[block.id] || { x: 100, y: 100 };
          return (
            <motion.div
              key={block.id}
              drag
              dragMomentum={true}
              dragElastic={0.05}
              onDragEnd={(e, info) => handleDragEnd(block.id, info)}
              whileHover={{ scale: 1.025, boxShadow: "var(--shadow)" }}
              whileDrag={{ scale: 1.05, zIndex: 50, rotate: 1 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              style={{
                left: pos.x,
                top: pos.y,
                position: "absolute"
              }}
              className="w-[320px] rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text)] overflow-hidden shadow-md flex flex-col p-4 cursor-default select-text active:cursor-grabbing"
            >
              {/* Card Header Drag Bar */}
              <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-[var(--border)] drag-handle cursor-grab active:cursor-grabbing select-none">
                <GripVertical size={12} className="shrink-0 text-[var(--muted)]" />
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--secondary)]">
                  <span className="text-[var(--accent)]">{BLOCK_ICONS[block.type] || "T"}</span>
                  {block.type}
                </span>
              </div>

              {/* Card Content representation */}
              <div className="flex-1 text-sm leading-relaxed overflow-hidden text-[var(--text)] whitespace-pre-wrap max-h-[120px] line-clamp-4">
                {block.text ? (
                  block.text
                ) : (
                  <span className="text-[var(--muted)] italic">Empty block preview</span>
                )}
              </div>

              {/* Quick block controls */}
              <div className="mt-4 pt-2 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--secondary)] select-none">
                <span className="opacity-60 flex items-center gap-1">
                  <FileText size={10} /> {block.id.slice(0, 4)}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onBlockPatch(block.id, { text: prompt("Edit content:", block.text || "") || block.text })}
                    className="px-2 py-0.5 rounded bg-[var(--hover)] hover:bg-[var(--surface-3)] hover:text-[var(--text)] transition"
                  >
                    Edit
                  </button>
                  <button className="p-0.5 rounded text-[var(--muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--hover)] transition" title="Link chat to this block">
                    <MessageSquare size={10} />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* minimap overlay widget */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-3 pointer-events-none select-none">
        {/* Zoom dashboard */}
        <div className="flex items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-[var(--elevated)] p-1 shadow-lg pointer-events-auto text-[var(--text)]">
          <button
            onClick={() => setScale((s) => Math.max(0.25, s - 0.1))}
            className="p-1.5 rounded hover:bg-[var(--hover)] transition text-[var(--secondary)] hover:text-[var(--text)]"
            title="Zoom out"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-xs px-1.5 font-mono min-w-[48px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(2.0, s + 0.1))}
            className="p-1.5 rounded hover:bg-[var(--hover)] transition text-[var(--secondary)] hover:text-[var(--text)]"
            title="Zoom in"
          >
            <ZoomIn size={14} />
          </button>
          <div className="w-[1px] h-4 bg-[var(--border-strong)] mx-1" />
          <button
            onClick={handleFitView}
            className="p-1.5 rounded hover:bg-[var(--hover)] transition text-[var(--secondary)] hover:text-[var(--text)]"
            title="Fit to screen"
          >
            <Maximize size={14} />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1.5 rounded hover:bg-[var(--hover)] transition text-[var(--secondary)] hover:text-[var(--text)]"
            title="Reset position"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Dynamic Minimap */}
        <div className="w-[140px] h-[90px] rounded-lg border border-[var(--border-strong)] bg-[var(--elevated)]/90 backdrop-blur-[2px] shadow-lg relative overflow-hidden pointer-events-auto">
          <div className="absolute inset-0 opacity-15" style={{
            backgroundImage: "radial-gradient(var(--text) 1px, transparent 1px)",
            backgroundSize: "6px 6px"
          }} />
          {/* Small thumbnail map viewport locator */}
          <div
            className="absolute border border-[var(--accent)] bg-[var(--accent)]/10 rounded transition-all duration-75"
            style={{
              left: `${Math.max(0, Math.min(100, 50 - pan.x / 40))}%`,
              top: `${Math.max(0, Math.min(100, 50 - pan.y / 30))}%`,
              width: `${Math.max(16, 120 / scale)}px`,
              height: `${Math.max(10, 80 / scale)}px`,
              transform: "translate(-50%, -50%)"
            }}
          />
          <div className="absolute bottom-1 left-2 text-[8px] font-bold text-[var(--muted)] uppercase tracking-wide">
            Mini-map
          </div>
        </div>
      </div>
    </div>
  );
}
