import React, { useRef, useEffect, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import {
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  RotateCcw,
  Palette,
  X,
  Sparkles,
  Check
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
  { id: "default", label: "Obsidian", style: "none", preview: "bg-[var(--text)]" },
  { id: "ocean", label: "Ocean", style: "linear-gradient(135deg, #38bdf8 0%, #3b82f6 100%)", preview: "bg-gradient-to-r from-sky-400 to-blue-500" },
  { id: "emerald", label: "Emerald", style: "linear-gradient(135deg, #34d399 0%, #10b981 100%)", preview: "bg-gradient-to-r from-emerald-400 to-teal-500" },
  { id: "sunset", label: "Sunset", style: "linear-gradient(135deg, #f59e0b 0%, #f43f5e 100%)", preview: "bg-gradient-to-r from-amber-400 to-rose-500" },
  { id: "violet", label: "Violet", style: "linear-gradient(135deg, #a855f7 0%, #6366f1 100%)", preview: "bg-gradient-to-r from-purple-400 to-indigo-500" },
  { id: "gold", label: "Gold", style: "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)", preview: "bg-gradient-to-r from-amber-300 to-yellow-600" },
  { id: "titanium", label: "Titanium", style: "linear-gradient(135deg, #94a3b8 0%, #475569 100%)", preview: "bg-gradient-to-r from-slate-400 to-slate-600" },
  { id: "prism", label: "Prism", style: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #3b82f6 100%)", preview: "bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500" }
];

const FONT_SIZES = [
  { label: "S", size: 28 },
  { label: "M", size: 36 },
  { label: "L", size: 40 },
  { label: "XL", size: 52 }
];

const FONT_WEIGHTS = [
  { id: "normal", label: "Regular", weight: 400 },
  { id: "semibold", label: "Medium", weight: 600 },
  { id: "bold", label: "Bold", weight: 700 },
  { id: "extrabold", label: "Heavy", weight: 800 }
];

const FONT_FAMILIES = [
  { id: "default", label: "Sans", subtitle: "SF Pro", font: "Inter, ui-sans-serif, system-ui, sans-serif" },
  { id: "serif", label: "Serif", subtitle: "New York", font: "Georgia, Cambria, serif" },
  { id: "mono", label: "Mono", subtitle: "SF Mono", font: "JetBrains Mono, ui-monospace, monospace" }
];

const TRACKING_OPTIONS = [
  { id: "tight", label: "Tight" },
  { id: "normal", label: "Norm" },
  { id: "wide", label: "Wide" }
];

interface AppleSliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (val: number) => void;
}

function AppleSlider({ min, max, step = 1, value, onChange }: AppleSliderProps) {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const rafId = useRef<number | null>(null);

  const updateFromPointer = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const pos = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const rawVal = min + pos * (max - min);
      const steppedVal = Math.round(rawVal / step) * step;
      const clamped = Math.min(max, Math.max(min, steppedVal));
      onChange(clamped);
    },
    [min, max, step, onChange]
  );

  const handlePointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    const clientX = e.clientX;
    rafId.current = requestAnimationFrame(() => {
      updateFromPointer(clientX);
    });
  };

  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  const transitionStyle = isDragging
    ? "none"
    : "all 0.32s cubic-bezier(0.16, 1, 0.3, 1)";

  return (
    <div
      ref={trackRef}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setIsDragging(true);
        handlePointer(e);
      }}
      onPointerMove={(e) => {
        if (e.buttons === 1) handlePointer(e);
      }}
      onPointerUp={() => setIsDragging(false)}
      onPointerCancel={() => setIsDragging(false)}
      className="group relative h-4 flex items-center cursor-pointer select-none touch-none w-full"
    >
      <div className="h-1.5 w-full rounded-full bg-black/[0.08] dark:bg-white/[0.12] overflow-hidden relative">
        <div
          className="h-full bg-gradient-to-r from-[#0066FF] to-[#4791FF] rounded-full will-change-[width]"
          style={{
            width: `${percentage}%`,
            transition: transitionStyle
          }}
        />
      </div>

      <motion.div
        animate={{
          scale: isDragging ? 1.25 : 1
        }}
        transition={{ type: "spring", stiffness: 450, damping: 25 }}
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.25),0_0_0_1px_rgba(0,0,0,0.06)] pointer-events-none flex items-center justify-center will-change-[left,transform]"
        style={{
          left: `${percentage}%`,
          transition: isDragging
            ? "transform 0.15s ease"
            : `left 0.32s cubic-bezier(0.16, 1, 0.3, 1), transform 0.15s ease`
        }}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-[#0066FF]" />
      </motion.div>
    </div>
  );
}

export default function PageTitleCustomizer({
  page,
  isEditable,
  onPagePatch,
  open,
  onClose,
  anchorRef
}: PageTitleCustomizerProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [resetRotate, setResetRotate] = useState(0);

  const updatePosition = useCallback(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const popoverW = 310;
      let left = rect.right - popoverW;
      if (left < 16) left = 16;
      if (left + popoverW > window.innerWidth - 16) {
        left = Math.max(16, window.innerWidth - popoverW - 16);
      }
      setCoords({
        top: rect.bottom + 6,
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

  const [localTitleSize, setLocalTitleSize] = useState(page.titleSize ?? 40);
  const [localTitleWeight, setLocalTitleWeight] = useState(page.titleWeight ?? "extrabold");
  const [localTitleFont, setLocalTitleFont] = useState(page.titleFont ?? "default");
  const [localTitleAlign, setLocalTitleAlign] = useState(page.titleAlign ?? "left");
  const [localTitleColor, setLocalTitleColor] = useState(page.titleColor ?? "default");
  const [localTitleTracking, setLocalTitleTracking] = useState(page.titleTracking ?? "tight");
  const [localTitleRotation, setLocalTitleRotation] = useState(page.titleRotation ?? 0);

  useEffect(() => {
    setLocalTitleSize(page.titleSize ?? 40);
    setLocalTitleWeight(page.titleWeight ?? "extrabold");
    setLocalTitleFont(page.titleFont ?? "default");
    setLocalTitleAlign(page.titleAlign ?? "left");
    setLocalTitleColor(page.titleColor ?? "default");
    setLocalTitleTracking(page.titleTracking ?? "tight");
    setLocalTitleRotation(page.titleRotation ?? 0);
  }, [
    page.titleSize,
    page.titleWeight,
    page.titleFont,
    page.titleAlign,
    page.titleColor,
    page.titleTracking,
    page.titleRotation
  ]);

  const titleSize = localTitleSize;
  const titleWeight = localTitleWeight;
  const titleFont = localTitleFont;
  const titleAlign = localTitleAlign;
  const titleColor = localTitleColor;
  const titleTracking = localTitleTracking;
  const titleRotation = localTitleRotation;

  const patchTitle = useCallback((patch: Partial<Page>) => {
    if (patch.titleSize !== undefined) setLocalTitleSize(patch.titleSize);
    if (patch.titleWeight !== undefined) setLocalTitleWeight(patch.titleWeight);
    if (patch.titleFont !== undefined) setLocalTitleFont(patch.titleFont);
    if (patch.titleAlign !== undefined) setLocalTitleAlign(patch.titleAlign);
    if (patch.titleColor !== undefined) setLocalTitleColor(patch.titleColor);
    if (patch.titleTracking !== undefined) setLocalTitleTracking(patch.titleTracking);
    if (patch.titleRotation !== undefined) setLocalTitleRotation(patch.titleRotation);
    onPagePatch(patch);
  }, [onPagePatch]);

  if (!isEditable) return null;

  const handleReset = () => {
    setResetRotate((r) => r - 360);
    patchTitle({
      titleSize: 40,
      titleWeight: "extrabold",
      titleFont: "default",
      titleAlign: "left",
      titleColor: "default",
      titleTracking: "tight",
      titleOffsetX: 0,
      titleOffsetY: 0,
      titleRotation: 0
    });
  };

  const SEGMENT_SPRING = {
    type: "spring" as const,
    stiffness: 270,
    damping: 28,
    mass: 0.75
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="apple-title-customizer-popover"
          ref={popoverRef}
          drag
          dragControls={dragControls}
          dragListener={false}
          dragMomentum={false}
          dragElastic={0.06}
          initial={{ opacity: 0, scale: 0.94, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{
            opacity: 0,
            scale: 0.95,
            y: -6,
            transition: { duration: 0.16, ease: [0.32, 0, 0.67, 0] }
          }}
          transition={{ type: "spring", stiffness: 420, damping: 28, mass: 0.75 }}
          style={{
            position: "fixed",
            top: coords.top,
            left: coords.left,
            zIndex: 9999,
            width: 310,
            transformOrigin: "top right",
            willChange: "transform, opacity"
          }}
          className="apple-liquid-glass flex flex-col overflow-hidden rounded-[24px] p-3 text-[11.5px] text-[var(--text)] select-none border border-black/10 dark:border-white/15 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.4)] dark:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.14)] gap-2.5 max-h-[min(580px,calc(100vh-24px))] scrollbar-none overflow-y-auto"
        >
          {/* ─── Apple Header Bar & Capsule Grab Handle ─── */}
          <div
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).closest("button, input")) return;
              dragControls.start(e);
            }}
            className="flex flex-col border-b border-black/[0.06] dark:border-white/[0.08] pb-2 cursor-grab active:cursor-grabbing select-none"
            title="Drag to reposition"
          >
            {/* Apple Dynamic Grab Pill */}
            <motion.div
              whileHover={{ scale: 1.12, opacity: 0.8 }}
              className="w-8 h-1 rounded-full bg-black/20 dark:bg-white/25 mx-auto mb-1 transition-colors cursor-grab active:cursor-grabbing"
              title="Drag to reposition"
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-[12px] tracking-tight">
                <div className="w-5 h-5 rounded-md bg-[#0066FF]/10 text-[#0066FF] dark:bg-[#0066FF]/20 dark:text-[#4791FF] grid place-items-center">
                  <Type size={12} strokeWidth={2.6} />
                </div>
                <span>Customize Title</span>
              </div>

              <div className="flex items-center gap-1">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={handleReset}
                  className="h-5.5 px-2 rounded-full text-[10px] font-medium text-[var(--muted)] hover:text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Reset all"
                >
                  <motion.div animate={{ rotate: resetRotate }} transition={{ type: "spring", stiffness: 350, damping: 20 }}>
                    <RotateCcw size={10} strokeWidth={2.4} />
                  </motion.div>
                  <span>Reset</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.90 }}
                  onClick={onClose}
                  className="w-5.5 h-5.5 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X size={12} strokeWidth={2.6} />
                </motion.button>
              </div>
            </div>
          </div>

          {/* ─── Apple Live Title Preview Capsule ─── */}
          <div className="relative rounded-xl px-2.5 py-1.5 bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.05] dark:border-white/[0.08] flex items-center justify-between gap-2 overflow-hidden shadow-2xs">
            <div className="flex-1 min-w-0">
              <div
                style={{
                  fontSize: `${Math.min(18, Math.max(12.5, titleSize * 0.42))}px`,
                  fontWeight: titleWeight === "normal" ? 400 : titleWeight === "semibold" ? 600 : titleWeight === "bold" ? 700 : 800,
                  fontFamily: titleFont === "serif" ? "Georgia, Cambria, serif" : titleFont === "mono" ? "JetBrains Mono, monospace" : "inherit",
                  textAlign: (titleAlign as any) || "left",
                  letterSpacing: titleTracking === "tighter" ? "-0.04em" : titleTracking === "tight" ? "-0.025em" : titleTracking === "wide" ? "0.05em" : "-0.015em",
                  transform: `rotate(${titleRotation || 0}deg)`,
                  transformOrigin: "center left",
                  transition: "font-size 0.24s cubic-bezier(0.16, 1, 0.3, 1), font-weight 0.2s ease, font-family 0.2s ease, letter-spacing 0.2s ease, transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), color 0.2s ease",
                  ...(titleColor && titleColor !== "default"
                    ? {
                        backgroundImage: TITLE_GRADIENTS.find((g) => g.id === titleColor)?.style || "none",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent"
                      }
                    : { color: "var(--text)" })
                }}
                className="leading-tight truncate select-none py-0.5"
              >
                {page.title || "Untitled Document"}
              </div>
            </div>
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/[0.08] text-[#0066FF] dark:text-[#4791FF] font-bold shrink-0">
              {titleSize}px
            </span>
          </div>

          {/* ─── Controls Body (Compact) ─── */}
          <div className="flex flex-col gap-2.5">
            {/* 1. Font Family Segmented Bar */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-[var(--muted)] px-0.5">
                <span>Typeface</span>
                <span className="font-mono text-[9px] text-[var(--muted)] capitalize">
                  {FONT_FAMILIES.find((f) => f.id === titleFont)?.subtitle}
                </span>
              </div>
              <div className="relative p-0.5 rounded-[12px] bg-[#767680]/12 dark:bg-[#767680]/24 border border-black/[0.04] dark:border-white/[0.06] grid grid-cols-3 gap-0.5">
                {FONT_FAMILIES.map((f) => {
                  const isActive = titleFont === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => patchTitle({ titleFont: f.id })}
                      className={`relative z-10 py-1.5 rounded-[9px] text-[10.5px] transition-colors duration-250 cursor-pointer select-none text-center ${
                        isActive
                          ? "text-[#1C1C1E] dark:text-white font-bold"
                          : "text-[#8E8E93] hover:text-[var(--text)] font-medium"
                      }`}
                      style={{ fontFamily: f.font }}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="active-title-font"
                          className="absolute inset-0 bg-white dark:bg-[#2C2C2E] rounded-[9px] border border-black/[0.04] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.12),0_0_1px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.95)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.15)] -z-10"
                          transition={SEGMENT_SPRING}
                        />
                      )}
                      <span>{f.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Font Weight Segmented Bar */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--muted)] px-0.5">
                Weight
              </span>
              <div className="relative p-0.5 rounded-[12px] bg-[#767680]/12 dark:bg-[#767680]/24 border border-black/[0.04] dark:border-white/[0.06] grid grid-cols-4 gap-0.5">
                {FONT_WEIGHTS.map((w) => {
                  const isActive = titleWeight === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => patchTitle({ titleWeight: w.id })}
                      className={`relative z-10 py-1.5 rounded-[9px] text-[10px] transition-colors duration-250 cursor-pointer select-none text-center ${
                        isActive
                          ? "text-[#1C1C1E] dark:text-white font-bold"
                          : "text-[#8E8E93] hover:text-[var(--text)] font-medium"
                      }`}
                      style={{ fontWeight: w.weight }}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="active-title-weight"
                          className="absolute inset-0 bg-white dark:bg-[#2C2C2E] rounded-[9px] border border-black/[0.04] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.12),0_0_1px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.95)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.15)] -z-10"
                          transition={SEGMENT_SPRING}
                        />
                      )}
                      <span>{w.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Scale Slider & Size Pills */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-[var(--muted)] px-0.5">
                <span>Scale</span>
                <span className="font-mono text-[9px] text-[#0066FF] dark:text-[#4791FF] font-semibold">
                  {titleSize}px
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <AppleSlider
                    min={24}
                    max={64}
                    step={2}
                    value={titleSize}
                    onChange={(val) => patchTitle({ titleSize: val })}
                  />
                </div>

                {/* 4 Fast Size Pills */}
                <div className="relative p-0.5 rounded-[12px] bg-[#767680]/12 dark:bg-[#767680]/24 border border-black/[0.04] dark:border-white/[0.06] grid grid-cols-4 gap-0.5 shrink-0">
                  {FONT_SIZES.map((preset) => {
                    const isActive = titleSize === preset.size;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => patchTitle({ titleSize: preset.size })}
                        className={`relative z-10 px-2 py-1 rounded-[8px] text-[9.5px] transition-colors duration-250 cursor-pointer select-none text-center ${
                          isActive
                            ? "text-[#1C1C1E] dark:text-white font-bold"
                            : "text-[#8E8E93] hover:text-[var(--text)] font-semibold"
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="active-title-size"
                            className="absolute inset-0 bg-white dark:bg-[#2C2C2E] rounded-[8px] border border-black/[0.04] dark:border-white/[0.08] shadow-[0_2px_6px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.95)] dark:shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)] -z-10"
                            transition={SEGMENT_SPRING}
                          />
                        )}
                        <span>{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 4. Alignment & Tracking (Side by Side) */}
            <div className="grid grid-cols-2 gap-1.5">
              {/* Alignment */}
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--muted)] px-0.5">
                  Align
                </span>
                <div className="relative p-0.5 rounded-[12px] bg-[#767680]/12 dark:bg-[#767680]/24 border border-black/[0.04] dark:border-white/[0.06] grid grid-cols-3 gap-0.5">
                  {[
                    { id: "left", icon: AlignLeft, label: "Left" },
                    { id: "center", icon: AlignCenter, label: "Center" },
                    { id: "right", icon: AlignRight, label: "Right" }
                  ].map((al) => {
                    const isActive = titleAlign === al.id;
                    const Icon = al.icon;
                    return (
                      <button
                        key={al.id}
                        type="button"
                        onClick={() => patchTitle({ titleAlign: al.id as any })}
                        className={`relative z-10 py-1.5 rounded-[8px] flex items-center justify-center cursor-pointer transition-colors duration-250 select-none ${
                          isActive
                            ? "text-[#1C1C1E] dark:text-white font-semibold"
                            : "text-[#8E8E93] hover:text-[var(--text)]"
                        }`}
                        title={al.label}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="active-title-align"
                            className="absolute inset-0 bg-white dark:bg-[#2C2C2E] rounded-[8px] border border-black/[0.04] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.95)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.4)] -z-10"
                            transition={SEGMENT_SPRING}
                          />
                        )}
                        <Icon size={12} strokeWidth={2.4} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tracking */}
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--muted)] px-0.5">
                  Spacing
                </span>
                <div className="relative p-0.5 rounded-[12px] bg-[#767680]/12 dark:bg-[#767680]/24 border border-black/[0.04] dark:border-white/[0.06] grid grid-cols-3 gap-0.5">
                  {TRACKING_OPTIONS.map((sp) => {
                    const isActive = titleTracking === sp.id;
                    return (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() => patchTitle({ titleTracking: sp.id })}
                        className={`relative z-10 py-1.5 rounded-[8px] text-[9.5px] transition-colors duration-250 cursor-pointer select-none text-center ${
                          isActive
                            ? "text-[#1C1C1E] dark:text-white font-bold"
                            : "text-[#8E8E93] hover:text-[var(--text)] font-semibold"
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="active-title-tracking"
                            className="absolute inset-0 bg-white dark:bg-[#2C2C2E] rounded-[8px] border border-black/[0.04] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.95)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.4)] -z-10"
                            transition={SEGMENT_SPRING}
                          />
                        )}
                        <span>{sp.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 5. Tactile Color Beads (8 in a Single Row with Gliding Active Ring) */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1">
                  <Palette size={10} className="text-[#0066FF]" />
                  <span>Finish</span>
                </span>
                <span className="text-[9px] text-[var(--muted)] capitalize">
                  {TITLE_GRADIENTS.find((g) => g.id === titleColor)?.label || "Default"}
                </span>
              </div>

              <div className="grid grid-cols-8 gap-1.5 p-1 place-items-center">
                {TITLE_GRADIENTS.map((g) => {
                  const isSelected = titleColor === g.id;
                  const isDefault = g.id === "default";
                  return (
                    <div key={g.id} className="relative flex items-center justify-center">
                      {/* Gliding Active Selection Ring */}
                      {isSelected && (
                        <motion.div
                          layoutId="active-title-color-ring"
                          className="absolute -inset-1 rounded-full border-2 border-[#0066FF] dark:border-white shadow-xs pointer-events-none"
                          transition={SEGMENT_SPRING}
                        />
                      )}

                      <motion.button
                        whileHover={{ scale: 1.15, y: -1 }}
                        whileTap={{ scale: 0.88 }}
                        transition={{ type: "spring", stiffness: 450, damping: 25 }}
                        onClick={() => patchTitle({ titleColor: g.id })}
                        className={`group relative h-6 w-6 rounded-full flex items-center justify-center cursor-pointer shadow-2xs transition-transform ${
                          isSelected ? "scale-105" : "opacity-85 hover:opacity-100"
                        }`}
                        style={{
                          background: isDefault
                            ? "radial-gradient(circle at 30% 30%, rgba(200,200,200,0.2) 0%, rgba(20,20,20,0.85) 100%)"
                            : g.style
                        }}
                        title={g.label}
                      >
                        <div className="absolute inset-0 rounded-full border border-white/25 pointer-events-none" />

                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 600, damping: 26 }}
                          >
                            <Check
                              size={11}
                              strokeWidth={3}
                              className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                            />
                          </motion.div>
                        )}
                      </motion.button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 6. Tilt & Reset Position (Compact Row) */}
            <div className="flex items-center justify-between pt-1.5 border-t border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex items-center gap-1.5 flex-1 pr-2">
                <span className="text-[9.5px] text-[var(--muted)] font-medium shrink-0">
                  Tilt: <b className="font-mono text-[var(--text)]">{titleRotation}°</b>
                </span>
                <div className="w-16">
                  <AppleSlider
                    min={-30}
                    max={30}
                    step={2}
                    value={titleRotation}
                    onChange={(val) => patchTitle({ titleRotation: val })}
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                onClick={() =>
                  patchTitle({
                    titleOffsetX: 0,
                    titleOffsetY: 0,
                    titleRotation: 0,
                    titleAlign: "left"
                  })
                }
                className="h-5.5 px-2 rounded-full text-[9.5px] font-semibold text-[var(--muted)] hover:text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                title="Reset offset, tilt & alignment"
              >
                <RotateCcw size={9} strokeWidth={2.4} />
                <span>Reset Pos</span>
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
