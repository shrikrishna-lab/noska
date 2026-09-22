import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Play,
  Pause,
  Sparkles,
  ArrowRight,
  StickyNote,
  Sliders
} from "lucide-react";
import { CanvasElementData, Connector, getCardPalette, CARD_W, CARD_H } from "./canvasStore";
import type { Block } from "../../lib/supabaseService";
import { isDesktop, isMobile } from "../../platform";

export interface PresentationSlide {
  id: string;
  title?: string;
  text: string;
  kind: "sticky" | "block" | "text" | "rect";
  color?: string;
  x: number;
  y: number;
  nextNotes?: string[];
}

interface CanvasPresentationModeProps {
  isOpen: boolean;
  onClose: () => void;
  elements: Record<string, CanvasElementData>;
  connectors: Connector[];
  pageBlocks?: Block[];
  blockMeta?: Record<string, any>;
  positions?: Record<string, { x: number; y: number }>;
}

export default function CanvasPresentationMode({
  isOpen,
  onClose,
  elements,
  connectors,
  pageBlocks = [],
  blockMeta = {},
  positions = {},
}: CanvasPresentationModeProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Compile all slides from both Canvas Elements and Page Blocks
  const slides = useMemo<PresentationSlide[]>(() => {
    const list: PresentationSlide[] = [];

    // 1. Page Blocks
    pageBlocks.forEach((block) => {
      const pos = positions[block.id] || { x: 0, y: 0 };
      const customColor = blockMeta[block.id]?.color;
      const text = block.text?.trim() || "";
      list.push({
        id: block.id,
        text: text || "Untitled Note",
        kind: "block",
        color: customColor,
        x: pos.x,
        y: pos.y,
      });
    });

    // 2. Canvas Elements (sticky, rect, text)
    Object.values(elements).forEach((el) => {
      const text = el.text?.trim() || "";
      if (el.kind === "sticky" || el.kind === "rect" || el.kind === "text") {
        list.push({
          id: el.id,
          text: text || "Sticky Note",
          kind: el.kind as any,
          color: el.color,
          x: el.x,
          y: el.y,
        });
      }
    });

    // Attach connected relationships to slides
    list.forEach((slide) => {
      const outgoing = connectors
        .filter((c) => c.from === slide.id || c.from === `el-${slide.id}`)
        .map((c) => {
          const targetId = c.to.replace(/^el-/, "");
          const target = list.find((s) => s.id === targetId);
          return target ? target.text.slice(0, 30) : null;
        })
        .filter(Boolean) as string[];
      slide.nextNotes = outgoing;
    });

    // Sort by X position then Y position for natural left-to-right storytelling flow
    return list.sort((a, b) => a.x - b.x || a.y - b.y);
  }, [elements, pageBlocks, positions, blockMeta, connectors]);

  useEffect(() => {
    if (!isOpen) {
      setStepIndex(0);
      setIsPlaying(false);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === " ") {
        setStepIndex((i) => Math.min(slides.length - 1, i + 1));
      }
      if (e.key === "ArrowLeft") {
        setStepIndex((i) => Math.max(0, i - 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, slides.length, onClose]);

  // Autoplay slideshow timer
  useEffect(() => {
    if (!isPlaying || !isOpen) return;
    const timer = setInterval(() => {
      setStepIndex((i) => {
        if (i >= slides.length - 1) {
          setIsPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [isPlaying, isOpen, slides.length]);

  if (!isOpen) return null;

  const currentSlide = slides[stepIndex];
  const palette = currentSlide ? getCardPalette(currentSlide.id, currentSlide.color) : null;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 ${isDesktop() && !isMobile() ? "top-7.5" : "top-0"} z-50 bg-[#0c0d12]/95 backdrop-blur-3xl flex flex-col items-center justify-between p-6 sm:p-10 text-white select-none transition-all duration-300`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Bar */}
      <div className="w-full max-w-5xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 grid place-items-center shadow-lg">
            <Sparkles size={17} />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-slate-100 flex items-center gap-2">
              <span>Noska Presentation Spotlight</span>
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-mono text-slate-300">
                PRO
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Slide {slides.length > 0 ? stepIndex + 1 : 0} of {slides.length} • Left-to-Right Roadmap Flow
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white grid place-items-center transition cursor-pointer"
          title="Exit Presentation (Esc)"
        >
          <X size={16} />
        </button>
      </div>

      {/* Main Spotlight Card Container */}
      <div className="flex-1 flex items-center justify-center w-full max-w-3xl px-4 py-6">
        <AnimatePresence mode="wait">
          {currentSlide && palette ? (
            <motion.div
              key={currentSlide.id + stepIndex}
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -15 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="w-full rounded-3xl p-8 sm:p-10 shadow-2xl border flex flex-col justify-between min-h-[340px] max-w-xl"
              style={{
                backgroundColor: palette.bg,
                borderColor: palette.border,
                color: palette.text,
                boxShadow: `0 28px 70px -10px ${palette.shadow}, 0 0 0 1px rgba(255,255,255,0.08)`
              }}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between pb-4 border-b border-black/10">
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-black/5">
                  <span className="text-sm">{palette.emoji}</span>
                  <span>{palette.label}</span>
                </span>
                <span className="text-xs opacity-50 font-mono font-semibold">
                  #{stepIndex + 1} / {slides.length}
                </span>
              </div>

              {/* Card Body */}
              <div className="my-6 text-xl sm:text-2xl font-semibold leading-relaxed whitespace-pre-wrap">
                {currentSlide.text}
              </div>

              {/* Connected Next Steps */}
              {currentSlide.nextNotes && currentSlide.nextNotes.length > 0 && (
                <div className="mb-4 p-3 rounded-2xl bg-black/5 text-xs flex items-center gap-2 overflow-hidden">
                  <ArrowRight size={13} className="shrink-0 opacity-70" />
                  <span className="font-semibold opacity-70">Leads to:</span>
                  <span className="truncate font-medium">{currentSlide.nextNotes.join(", ")}</span>
                </div>
              )}

              {/* Card Footer */}
              <div className="pt-4 border-t border-black/10 flex items-center justify-between text-xs opacity-60">
                <span>Navigate using ◀ ▶ or Spacebar</span>
                <span>Noska Story Flow</span>
              </div>
            </motion.div>
          ) : (
            <div className="text-center p-8 rounded-3xl bg-white/5 border border-white/10 max-w-md">
              <StickyNote size={32} className="mx-auto mb-3 text-amber-400 opacity-80" />
              <h4 className="text-base font-semibold mb-1 text-slate-200">No Notes on This Board</h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Add sticky notes or blocks to your canvas to present your ideas step-by-step.
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white text-slate-900 font-semibold text-xs cursor-pointer hover:bg-slate-100"
              >
                Back to Canvas
              </button>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Timeline & Controls */}
      <div className="w-full max-w-lg flex flex-col items-center gap-4">
        {/* Step Indicators */}
        {slides.length > 1 && (
          <div className="flex items-center gap-1.5 max-w-full overflow-x-auto p-1 scrollbar-none">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setStepIndex(idx)}
                aria-label={`Jump to slide ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === stepIndex
                    ? "w-8 bg-amber-400"
                    : "w-2 bg-white/20 hover:bg-white/40"
                }`}
              />
            ))}
          </div>
        )}

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={stepIndex === 0}
            className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed grid place-items-center transition cursor-pointer"
            title="Previous (Left Arrow)"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            onClick={() => setIsPlaying((p) => !p)}
            className="px-5 h-10 rounded-full bg-white text-slate-900 font-semibold text-xs flex items-center gap-2 hover:bg-slate-100 transition active:scale-95 cursor-pointer shadow-lg"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} fill="currentColor" />}
            <span>{isPlaying ? "Pause" : "Play"}</span>
          </button>

          <button
            onClick={() => setStepIndex((i) => Math.min(slides.length - 1, i + 1))}
            disabled={stepIndex >= slides.length - 1}
            className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed grid place-items-center transition cursor-pointer"
            title="Next (Right Arrow / Space)"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
