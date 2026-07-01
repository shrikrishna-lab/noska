import React from "react";
import { motion } from "framer-motion";
import {
  MousePointer2, Hand, StickyNote, Square, Circle, Type, Frame,
  Spline, Undo2, Redo2, Grid3x3, Magnet, Plus,
} from "lucide-react";

const TOOLS = [
  { id: "select", icon: MousePointer2, label: "Select (V)" },
  { id: "pan", icon: Hand, label: "Pan (H)" },
  { id: "sticky", icon: StickyNote, label: "Sticky note (S)" },
  { id: "rect", icon: Square, label: "Rectangle (R)" },
  { id: "ellipse", icon: Circle, label: "Ellipse (O)" },
  { id: "text", icon: Type, label: "Text (T)" },
  { id: "frame", icon: Frame, label: "Frame (F)" },
  { id: "connector", icon: Spline, label: "Connector (C)" },
];

function ToolButton({ active, label, onClick, children, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`relative group flex items-center justify-center w-9 h-9 rounded-lg border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? "bg-[var(--accent)] border-[var(--accent)] text-white shadow-sm"
          : "bg-[var(--surface)]/60 border-[var(--border)] text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)] hover:border-[var(--secondary)]"
      }`}
    >
      {children}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-[var(--elevated)] border border-[var(--border)] text-[9px] text-[var(--text)] font-medium opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md z-30">
        {label}
      </span>
    </button>
  );
}

export default function CanvasToolbar({
  tool, onToolChange,
  onUndo, onRedo, canUndo, canRedo,
  snapEnabled, onToggleSnap,
  showGrid, onToggleGrid,
  onAddCard,
}) {
  return (
    <motion.div
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 rounded-2xl bg-[var(--elevated)]/85 backdrop-blur-md border border-[var(--border-strong)] p-1.5 shadow-xl"
    >
      {TOOLS.map((t) => (
        <ToolButton key={t.id} active={tool === t.id} label={t.label} onClick={() => onToolChange(t.id)}>
          <t.icon size={16} />
        </ToolButton>
      ))}

      <div className="w-px h-6 bg-[var(--border-strong)] mx-1" />

      <ToolButton label="Add block card" onClick={onAddCard}>
        <Plus size={16} />
      </ToolButton>

      <div className="w-px h-6 bg-[var(--border-strong)] mx-1" />

      <ToolButton label="Undo (Ctrl+Z)" onClick={onUndo} disabled={!canUndo}>
        <Undo2 size={16} />
      </ToolButton>
      <ToolButton label="Redo (Ctrl+Shift+Z)" onClick={onRedo} disabled={!canRedo}>
        <Redo2 size={16} />
      </ToolButton>

      <div className="w-px h-6 bg-[var(--border-strong)] mx-1" />

      <ToolButton label={snapEnabled ? "Snap to grid: on" : "Snap to grid: off"} active={snapEnabled} onClick={onToggleSnap}>
        <Magnet size={16} />
      </ToolButton>
      <ToolButton label={showGrid ? "Hide grid" : "Show grid"} active={showGrid} onClick={onToggleGrid}>
        <Grid3x3 size={16} />
      </ToolButton>
    </motion.div>
  );
}
