import React, { useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sliders,
  RotateCcw,
  Palette,
  X,
  RotateCw
} from "lucide-react";
import type { Page } from "../../lib/supabaseService";

interface PageTitleCustomizerProps {
  page: Page;
  isEditable: boolean;
  onPagePatch: (patch: Partial<Page>) => void;
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

export const TITLE_GRADIENTS = [
  { id: "default", label: "Default", style: "none", preview: "bg-[var(--text)]" },
  { id: "ocean", label: "Ocean", style: "linear-gradient(135deg, #38bdf8 0%, #3b82f6 100%)", preview: "bg-gradient-to-r from-sky-400 to-blue-500" },
  { id: "emerald", label: "Emerald", style: "linear-gradient(135deg, #34d399 0%, #10b981 100%)", preview: "bg-gradient-to-r from-emerald-400 to-teal-500" },
  { id: "sunset", label: "Sunset", style: "linear-gradient(135deg, #f59e0b 0%, #f43f5e 100%)", preview: "bg-gradient-to-r from-amber-400 to-rose-500" },
  { id: "violet", label: "Violet", style: "linear-gradient(135deg, #a855f7 0%, #6366f1 100%)", preview: "bg-gradient-to-r from-purple-400 to-indigo-500" },
  { id: "gold", label: "Gold", style: "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)", preview: "bg-gradient-to-r from-amber-300 to-yellow-600" }
];

export default function PageTitleCustomizer({
  page,
  isEditable,
  onPagePatch,
  open,
  onClose,
  anchorRef
}: PageTitleCustomizerProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = React.useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const popoverW = 330;
      let left = rect.right - popoverW;
      if (left < 16) left = 16;
      if (left + popoverW > window.innerWidth - 16) {
        left = Math.max(16, window.innerWidth - popoverW - 16);
      }
      setCoords({
        top: rect.bottom + 8,
        left
      });
    }
  }, [anchorRef]);

  useEffect(() => {
    if (open) {
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handleDown = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleDown);
    return () => document.removeEventListener("mousedown", handleDown);
  }, [open, onClose, anchorRef]);

  const titleSize = page.titleSize ?? 40;
  const titleWeight = page.titleWeight ?? "extrabold";
  const titleFont = page.titleFont ?? "default";
  const titleAlign = page.titleAlign ?? "left";
  const titleColor = page.titleColor ?? "default";
  const titleTracking = page.titleTracking ?? "tight";
  const titleRotation = page.titleRotation ?? 0;

  if (!open || !isEditable) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={popoverRef}
        drag
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.95, y: -6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -6 }}
        transition={{ type: "spring", stiffness: 450, damping: 30 }}
        style={{
          position: "fixed",
          top: coords.top,
          left: coords.left,
          zIndex: 9999
        }}
        className="apple-liquid-glass w-[355px] rounded-[30px] p-4 text-[12px] text-[var(--text)] select-none flex flex-col gap-3.5 cursor-default"
      >
        {/* Header with Title & Reset Shortcut - draggable top handle */}
        <div className="flex items-center justify-between border-b border-black/[0.08] dark:border-white/[0.08] pb-2.5 cursor-grab active:cursor-grabbing">
          <div className="flex items-center gap-2 font-bold text-[12.5px] tracking-tight">
            <div className="w-6 h-6 rounded-full bg-[var(--noska-blue)]/15 text-[var(--noska-blue)] grid place-items-center shadow-inner">
              <Type size={13} strokeWidth={2.5} />
            </div>
            <span>Customize Title</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() =>
                onPagePatch({
                  titleSize: 40,
                  titleWeight: "extrabold",
                  titleFont: "default",
                  titleAlign: "left",
                  titleColor: "default",
                  titleTracking: "tight",
                  titleOffsetX: 0,
                  titleOffsetY: 0,
                  titleRotation: 0
                })
              }
              className="apple-glass-btn h-7 px-3 rounded-full text-[10.5px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text)] flex items-center gap-1 cursor-pointer"
              title="Reset all title styling & position"
            >
              <RotateCcw size={11} />
              Reset
            </button>
            <button
              onClick={onClose}
              className="apple-glass-btn h-7 w-7 rounded-full text-[var(--text-secondary)] hover:text-[var(--text)] grid place-items-center cursor-pointer"
              title="Close"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Unified Controls */}
        <div className="flex flex-col gap-3">
          {/* Font Size Slider & Presets */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-secondary)]">
              <span>Font Size</span>
              <span className="font-mono text-[10.5px] text-[var(--noska-blue)] font-bold">{titleSize}px</span>
            </div>
            <input
              type="range"
              min={24}
              max={64}
              step={2}
              value={titleSize}
              onChange={(e) => onPagePatch({ titleSize: Number(e.target.value) })}
              className="w-full accent-[var(--noska-blue)] cursor-pointer h-1.5 bg-black/[0.08] dark:bg-white/[0.12] rounded-lg"
            />
            <div className="grid grid-cols-4 gap-1 mt-0.5">
              {[
                { label: "S", size: 28 },
                { label: "M", size: 36 },
                { label: "L", size: 40 },
                { label: "XL", size: 52 }
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => onPagePatch({ titleSize: preset.size })}
                  className={`py-1.5 rounded-xl text-[10px] font-semibold border transition cursor-pointer ${
                    titleSize === preset.size
                      ? "bg-[var(--noska-blue)] text-white border-[var(--noska-blue)] shadow-sm"
                      : "apple-glass-pill text-[var(--text-secondary)] hover:text-[var(--text)]"
                  }`}
                >
                  {preset.label} ({preset.size}px)
                </button>
              ))}
            </div>
          </div>

          {/* Font Weight */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Font Weight</span>
            <div className="grid grid-cols-4 gap-1 apple-glass-pill p-1 rounded-2xl">
              {[
                { id: "normal", label: "Normal", weight: "400" },
                { id: "semibold", label: "Medium", weight: "600" },
                { id: "bold", label: "Bold", weight: "700" },
                { id: "extrabold", label: "Heavy", weight: "800" }
              ].map((w) => (
                <button
                  key={w.id}
                  onClick={() => onPagePatch({ titleWeight: w.id })}
                  className={`py-1.5 rounded-xl text-[10.5px] transition cursor-pointer ${
                    titleWeight === w.id
                      ? "apple-glass-active-pill text-[var(--noska-blue)] font-bold"
                      : "text-[var(--text-secondary)] hover:text-[var(--text)] font-medium"
                  }`}
                  style={{ fontWeight: Number(w.weight) }}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Family */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Font Family</span>
            <div className="grid grid-cols-3 gap-1 apple-glass-pill p-1 rounded-2xl">
              {[
                { id: "default", label: "Sans", font: "sans-serif" },
                { id: "serif", label: "Serif", font: "Georgia, serif" },
                { id: "mono", label: "Mono", font: "monospace" }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => onPagePatch({ titleFont: f.id })}
                  className={`py-1.5 rounded-xl text-[10.5px] transition cursor-pointer ${
                    titleFont === f.id
                      ? "apple-glass-active-pill text-[var(--noska-blue)] font-bold"
                      : "text-[var(--text-secondary)] hover:text-[var(--text)]"
                  }`}
                  style={{ fontFamily: f.font }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Alignment & Letter Spacing */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-[10.5px] font-semibold text-[var(--text-secondary)]">Alignment</span>
              <div className="flex items-center gap-1 apple-glass-pill p-0.5 rounded-2xl">
                <button
                  onClick={() => onPagePatch({ titleAlign: "left" })}
                  className={`flex-1 py-1.5 rounded-xl grid place-items-center transition cursor-pointer ${
                    titleAlign === "left" ? "apple-glass-active-pill text-[var(--noska-blue)]" : "text-[var(--text-secondary)]"
                  }`}
                  title="Left Align"
                >
                  <AlignLeft size={13} />
                </button>
                <button
                  onClick={() => onPagePatch({ titleAlign: "center" })}
                  className={`flex-1 py-1.5 rounded-xl grid place-items-center transition cursor-pointer ${
                    titleAlign === "center" ? "apple-glass-active-pill text-[var(--noska-blue)]" : "text-[var(--text-secondary)]"
                  }`}
                  title="Center Align"
                >
                  <AlignCenter size={13} />
                </button>
                <button
                  onClick={() => onPagePatch({ titleAlign: "right" })}
                  className={`flex-1 py-1.5 rounded-xl grid place-items-center transition cursor-pointer ${
                    titleAlign === "right" ? "apple-glass-active-pill text-[var(--noska-blue)]" : "text-[var(--text-secondary)]"
                  }`}
                  title="Right Align"
                >
                  <AlignRight size={13} />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10.5px] font-semibold text-[var(--text-secondary)]">Spacing</span>
              <div className="grid grid-cols-3 gap-0.5 apple-glass-pill p-0.5 rounded-2xl">
                {[
                  { id: "tight", label: "Tight" },
                  { id: "normal", label: "Norm" },
                  { id: "wide", label: "Wide" }
                ].map((sp) => (
                  <button
                    key={sp.id}
                    onClick={() => onPagePatch({ titleTracking: sp.id })}
                    className={`py-1.5 rounded-xl text-[9.5px] font-semibold transition cursor-pointer ${
                      titleTracking === sp.id
                        ? "apple-glass-active-pill text-[var(--noska-blue)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text)]"
                    }`}
                  >
                    {sp.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Color & Gradients */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)] flex items-center gap-1">
              <Palette size={12} />
              Color & Gradients
            </span>
            <div className="grid grid-cols-6 gap-1.5 apple-glass-pill p-1.5 rounded-2xl">
              {TITLE_GRADIENTS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => onPagePatch({ titleColor: g.id })}
                  className={`h-7 rounded-xl transition-transform hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer shadow-sm ${g.preview} ${
                    titleColor === g.id ? "ring-2 ring-[var(--noska-blue)] ring-offset-2 ring-offset-white dark:ring-offset-[#18181b]" : "opacity-80 hover:opacity-100"
                  }`}
                  title={g.label}
                />
              ))}
            </div>
          </div>

          {/* Tilt Slider */}
          <div className="flex items-center justify-between pt-1 border-t border-black/[0.08] dark:border-white/[0.08]">
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] text-[var(--text-secondary)] font-medium">Tilt: {titleRotation}°</span>
              <input
                type="range"
                min={-30}
                max={30}
                step={2}
                value={titleRotation}
                onChange={(e) => onPagePatch({ titleRotation: Number(e.target.value) })}
                className="w-24 accent-[var(--noska-blue)] cursor-pointer h-1.5 bg-black/[0.08] dark:bg-white/[0.12] rounded-lg"
              />
            </div>
            <button
              onClick={() =>
                onPagePatch({
                  titleOffsetX: 0,
                  titleOffsetY: 0,
                  titleRotation: 0,
                  titleAlign: "left"
                })
              }
              className="apple-glass-btn flex items-center gap-1 px-3 py-1 rounded-full text-[10.5px] font-semibold text-[var(--text)] cursor-pointer"
            >
              <RotateCcw size={11} />
              Reset Pos
            </button>
          </div>

          <div className="text-[10px] text-[var(--muted)] apple-glass-pill p-2.5 rounded-2xl leading-relaxed">
            💡 <b>Tip</b>: Hold the drag handle on the left to move the title freely anywhere!
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
