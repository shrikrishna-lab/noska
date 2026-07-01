import React from "react";
import { motion } from "framer-motion";
import { Trash2, Copy, Palette, BringToFront } from "lucide-react";
import { CANVAS_COLORS } from "./canvasStore";

/**
 * CanvasContextBar — floating format bar shown above the current selection.
 * Works for both free-form elements and block cards (color applies to elements only).
 *
 * Props:
 *   screenPos    — {x,y} screen coords to anchor the bar
 *   showColors   — whether to render the color swatches (elements only)
 *   activeColor  — current color id
 *   onColor, onDuplicate, onDelete, onBringToFront
 */
export default function CanvasContextBar({
  screenPos, showColors, activeColor, onColor, onDuplicate, onDelete, onBringToFront,
}) {
  if (!screenPos) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      style={{ position: "absolute", left: screenPos.x, top: screenPos.y, transform: "translate(-50%, -100%)" }}
      className="z-40 flex items-center gap-1 rounded-xl bg-[var(--elevated)]/95 backdrop-blur-md border border-[var(--border-strong)] p-1 shadow-xl"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {showColors && (
        <>
          <div className="flex items-center gap-0.5 px-0.5">
            {CANVAS_COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => onColor?.(c.id)}
                title={c.label}
                className={`w-5 h-5 rounded-full border transition-transform hover:scale-110 cursor-pointer ${
                  activeColor === c.id ? "ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--elevated)]" : "border-[var(--border)]"
                }`}
                style={{ background: c.id === "default" ? "var(--surface-3, #ccc)" : c.stroke }}
              />
            ))}
          </div>
          <div className="w-px h-5 bg-[var(--border-strong)] mx-0.5" />
        </>
      )}

      <button onClick={onBringToFront} title="Bring to front" className="p-1.5 rounded-lg text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition cursor-pointer">
        <BringToFront size={14} />
      </button>
      <button onClick={onDuplicate} title="Duplicate (Ctrl+D)" className="p-1.5 rounded-lg text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition cursor-pointer">
        <Copy size={14} />
      </button>
      <button onClick={onDelete} title="Delete (Del)" className="p-1.5 rounded-lg text-[var(--secondary)] hover:bg-[var(--danger)]/12 hover:text-[var(--danger)] transition cursor-pointer">
        <Trash2 size={14} />
      </button>
    </motion.div>
  );
}
