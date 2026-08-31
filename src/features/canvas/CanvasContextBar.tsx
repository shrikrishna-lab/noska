import React from "react";
import { motion } from "framer-motion";
import { Trash2, Copy, BringToFront, Tag } from "lucide-react";
import { STICKY_PALETTES } from "./canvasStore";

interface CanvasContextBarProps {
  screenPos: { x: number; y: number } | null;
  showColors?: boolean;
  activeColor?: string;
  onColor?: (colorId: string) => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onBringToFront?: () => void;
}

/**
 * CanvasContextBar — floating warm action bar shown above the currently selected note or element.
 */
export default function CanvasContextBar({
  screenPos,
  showColors = true,
  activeColor = "yellow",
  onColor,
  onDuplicate,
  onDelete,
  onBringToFront,
}: CanvasContextBarProps) {
  if (!screenPos) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      style={{
        position: "absolute",
        left: screenPos.x,
        top: screenPos.y,
        transform: "translate(-50%, -100%)",
      }}
      className="z-40 flex items-center gap-1 rounded-2xl bg-[var(--elevated)]/95 backdrop-blur-xl border border-[var(--border-strong)] p-1.5 shadow-2xl select-none"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {showColors && (
        <>
          <div className="flex items-center gap-1 px-1">
            {STICKY_PALETTES.map((c) => (
              <button
                key={c.id}
                onClick={() => onColor?.(c.id)}
                title={`${c.emoji} ${c.label} (${c.id})`}
                className={`group relative w-6 h-6 rounded-full border transition-all duration-150 hover:scale-115 cursor-pointer flex items-center justify-center text-[10px] ${
                  activeColor === c.id
                    ? "ring-2 ring-[#d97706] ring-offset-2 ring-offset-[var(--elevated)] scale-105"
                    : "border-black/10 hover:border-black/20"
                }`}
                style={{
                  backgroundColor: c.bg,
                  borderColor: c.border,
                }}
              >
                <span>{c.emoji}</span>
              </button>
            ))}
          </div>
          <div className="w-px h-5 bg-[var(--border)] mx-1" />
        </>
      )}

      <button
        onClick={onBringToFront}
        title="Bring to Front"
        className="p-1.5 rounded-xl text-[var(--secondary)] hover:bg-[#fef3c7]/60 dark:hover:bg-[#332a18]/60 hover:text-[var(--text)] transition cursor-pointer"
      >
        <BringToFront size={15} />
      </button>

      <button
        onClick={onDuplicate}
        title="Duplicate Note (Ctrl+D)"
        className="p-1.5 rounded-xl text-[var(--secondary)] hover:bg-[#fef3c7]/60 dark:hover:bg-[#332a18]/60 hover:text-[var(--text)] transition cursor-pointer"
      >
        <Copy size={15} />
      </button>

      <button
        onClick={onDelete}
        title="Delete (Del / Backspace)"
        className="p-1.5 rounded-xl text-[var(--secondary)] hover:bg-[var(--danger)]/15 hover:text-[var(--danger)] transition cursor-pointer"
      >
        <Trash2 size={15} />
      </button>
    </motion.div>
  );
}
