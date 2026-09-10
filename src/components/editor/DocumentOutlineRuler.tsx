import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Block } from "../../../types/blocks";

export interface OutlineSection {
  id: string;
  title: string;
  snippet: string;
  type: string;
  depth: number; // 0 for H1, 1 for H2, 2 for H3/tasks, etc.
  width?: number; // visual bar width in pixels
}

interface DocumentOutlineRulerProps {
  blocks?: Block[];
  sections?: OutlineSection[];
  pageTitle?: string;
  containerRef?: React.RefObject<HTMLElement | null>;
  onJumpToSection?: (id: string) => void;
  className?: string;
  side?: "left" | "right";
}

export default function DocumentOutlineRuler({
  blocks,
  sections: customSections,
  pageTitle,
  containerRef,
  onJumpToSection,
  className = "",
  side = "left"
}: DocumentOutlineRulerProps) {
  const [hoveredSection, setHoveredSection] = useState<OutlineSection | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ top: number; left: number; right: number } | null>(null);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [rulerPos, setRulerPos] = useState<{ left: number; top: number; visible: boolean }>({
    left: 20,
    top: 0,
    visible: false
  });
  const rulerRef = useRef<HTMLDivElement>(null);

  // Derive outline sections from blocks if not provided custom
  const outlineSections = useMemo(() => {
    if (customSections && customSections.length > 0) return customSections;
    if (!blocks || blocks.length === 0) return [];

    const list: OutlineSection[] = [];

    // Filter meaningful non-empty blocks
    const meaningfulBlocks = blocks.filter((b) => {
      const text = (b.text || (b.properties as Record<string, unknown> | undefined)?.text || (b.properties as Record<string, unknown> | undefined)?.title || "").toString().trim();
      return text.length > 0;
    });

    if (meaningfulBlocks.length === 0) return [];

    const hasHeadings = meaningfulBlocks.some(
      (b) => b.type === "h1" || b.type === "h2" || b.type === "h3" || b.type === "h4"
    );

    if (hasHeadings) {
      meaningfulBlocks.forEach((b) => {
        const isHeading = b.type === "h1" || b.type === "h2" || b.type === "h3" || b.type === "h4";
        const isCallout = b.type === "callout";
        const isTask = b.type === "todo";
        const isQuote = b.type === "quote";
        const isCode = b.type === "code";

        if (isHeading || isCallout || isTask || isQuote || isCode) {
          const raw = (b.text || (b.properties as Record<string, unknown> | undefined)?.text || "").toString().trim();
          const title = raw.replace(/^[#*-]\s+/, "") || (isHeading ? "Heading" : b.type);
          const depth = b.type === "h1" ? 0 : b.type === "h2" ? 1 : b.type === "h3" ? 2 : 1;
          const width = b.type === "h1" ? 26 : b.type === "h2" ? 22 : b.type === "h3" ? 18 : 14;

          list.push({
            id: b.id,
            title: title.length > 40 ? title.slice(0, 40) + "..." : title,
            snippet: raw.slice(0, 160),
            type: b.type,
            depth,
            width
          });
        }
      });
    }

    // If no headings found, take samples of all paragraphs/blocks
    if (list.length < 2) {
      list.length = 0;
      meaningfulBlocks.slice(0, 32).forEach((b) => {
        const raw = (b.text || (b.properties as Record<string, unknown> | undefined)?.text || "").toString().trim();
        if (raw) {
          const firstLine = raw.split("\n")[0].slice(0, 36);
          const width = Math.min(26, Math.max(10, Math.round((raw.length / 80) * 16) + 10));
          list.push({
            id: b.id,
            title: firstLine,
            snippet: raw.slice(0, 160),
            type: b.type || "text",
            depth: 1,
            width
          });
        }
      });
    }

    if (pageTitle && pageTitle.trim() && list.length > 0) {
      list.unshift({
        id: "page-title",
        title: pageTitle.trim(),
        snippet: "Top of page",
        type: "title",
        depth: 0,
        width: 26
      });
    }

    return list;
  }, [blocks, customSections, pageTitle]);

  // Dynamically calculate ruler position based on containerRef
  useEffect(() => {
    const updatePosition = () => {
      const container = containerRef?.current;
      if (!container) {
        // Default viewport placement
        setRulerPos({
          left: side === "left" ? 260 : window.innerWidth - 32,
          top: window.innerHeight / 2,
          visible: true
        });
        return;
      }

      const rect = container.getBoundingClientRect();
      if (rect.width < 140 || rect.height < 140) {
        setRulerPos((prev) => ({ ...prev, visible: false }));
        return;
      }

      const posX = side === "left" ? rect.left + 16 : rect.right - 24;
      const posY = rect.top + rect.height / 2;

      setRulerPos({
        left: Math.max(12, posX),
        top: posY,
        visible: true
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);

    let resizeObserver: ResizeObserver | null = null;
    if (containerRef?.current && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(updatePosition);
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener("resize", updatePosition);
      resizeObserver?.disconnect();
    };
  }, [containerRef, side]);

  // Track active section on scroll
  useEffect(() => {
    const container = containerRef?.current || window;
    const handleScroll = () => {
      if (outlineSections.length === 0) return;

      const scrollElement = container === window ? document.documentElement : (container as HTMLElement);
      const containerTop = container === window ? 0 : (container as HTMLElement).getBoundingClientRect().top;

      let foundIndex = -1;
      for (let i = 0; i < outlineSections.length; i++) {
        const sec = outlineSections[i];
        const el = document.querySelector(`[data-block-id="${sec.id}"]`) ||
                   document.querySelector(`[data-message-id="${sec.id}"]`) ||
                   document.getElementById(sec.id);
        if (el) {
          const elRect = el.getBoundingClientRect();
          if (elRect.top <= containerTop + 160) {
            foundIndex = i;
          } else {
            break;
          }
        }
      }

      if (foundIndex >= 0) {
        setActiveSectionIndex(foundIndex);
      } else {
        const scrollTop = scrollElement.scrollTop;
        const scrollHeight = scrollElement.scrollHeight - scrollElement.clientHeight;
        const progress = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
        const newIndex = Math.min(
          Math.floor(progress * outlineSections.length),
          outlineSections.length - 1
        );
        setActiveSectionIndex(Math.max(0, newIndex));
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [containerRef, outlineSections]);

  if (outlineSections.length < 2) return null;

  const handleHoverRuler = (e: React.MouseEvent, section: OutlineSection) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    setHoverPosition({
      top: rect.top,
      left: rect.left,
      right: rect.right
    });
    setHoveredSection(section);
  };

  const handleLeaveRuler = () => {
    setHoveredSection(null);
  };

  const handleClickSection = (section: OutlineSection, index: number) => {
    setActiveSectionIndex(index);
    if (onJumpToSection) {
      onJumpToSection(section.id);
    } else {
      if (section.id === "page-title" && containerRef?.current) {
        containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const el = document.querySelector(`[data-block-id="${section.id}"]`) ||
                 document.querySelector(`[data-message-id="${section.id}"]`) ||
                 document.getElementById(section.id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (containerRef?.current) {
        const scrollEl = containerRef.current;
        const targetScroll = (index / outlineSections.length) * (scrollEl.scrollHeight - scrollEl.clientHeight);
        scrollEl.scrollTo({ top: targetScroll, behavior: "smooth" });
      }
    }
  };

  return (
    <>
      {/* ─── VERTICAL TICK RULER ─── */}
      <div
        ref={rulerRef}
        onMouseLeave={handleLeaveRuler}
        style={{
          position: "fixed",
          left: rulerPos.left,
          top: rulerPos.top,
          transform: "translateY(-50%)",
          opacity: rulerPos.visible ? 1 : 0
        }}
        className={`z-40 select-none flex items-center transition-all duration-200 pointer-events-auto ${className}`}
      >
        <div className="flex flex-col items-center gap-1.5 py-2.5 px-1.5 rounded-full bg-slate-200/40 dark:bg-zinc-800/40 hover:bg-slate-200/70 dark:hover:bg-zinc-800/70 backdrop-blur-md border border-slate-300/40 dark:border-zinc-700/40 shadow-xs cursor-pointer transition-all duration-200 group">
          {outlineSections.map((section, idx) => {
            const isActive = idx === activeSectionIndex;
            const barWidth = section.width || (section.depth === 0 ? 24 : section.depth === 1 ? 18 : 12);

            return (
              <div
                key={section.id}
                onClick={() => handleClickSection(section, idx)}
                onMouseEnter={(e) => handleHoverRuler(e, section)}
                className="py-0.5 px-0.5 flex items-center justify-center cursor-pointer group/bar"
              >
                <div
                  style={{ width: `${barWidth}px` }}
                  className={`transition-all duration-200 rounded-full ${
                    isActive
                      ? "h-[2.5px] bg-slate-900 dark:bg-white shadow-[0_0_8px_rgba(0,0,0,0.3)] dark:shadow-[0_0_10px_rgba(255,255,255,0.75)] scale-110"
                      : "h-[2px] bg-slate-400/60 dark:bg-zinc-500/60 group-hover/bar:bg-slate-800 dark:group-hover/bar:bg-zinc-200 group-hover/bar:scale-x-110"
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── FLOATING PREVIEW CARD (MATCHING USER SCREENSHOT) ─── */}
      <AnimatePresence>
        {hoveredSection && hoverPosition && (
          <motion.div
            initial={{ opacity: 0, x: side === "right" ? 8 : -8, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: side === "right" ? 8 : -8, scale: 0.95 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            style={{
              top: Math.max(16, Math.min(window.innerHeight - 220, hoverPosition.top - 20)),
              left: side === "right" ? undefined : hoverPosition.right + 14,
              right: side === "right" ? window.innerWidth - hoverPosition.left + 14 : undefined
            }}
            onClick={() => {
              handleClickSection(hoveredSection, outlineSections.indexOf(hoveredSection));
              setHoveredSection(null);
            }}
            className="fixed z-50 w-72 sm:w-80 p-4 rounded-2xl bg-[#1e1e22]/95 dark:bg-[#18181b]/95 backdrop-blur-2xl border border-zinc-700/60 dark:border-zinc-800 text-white shadow-[0_20px_45px_rgba(0,0,0,0.35)] cursor-pointer hover:border-zinc-500/80 transition-all pointer-events-auto select-none"
          >
            {/* Section Title / Header / Token */}
            <div className="text-[13px] font-bold text-white tracking-tight leading-snug font-mono break-all line-clamp-1">
              {hoveredSection.title || "Section"}
            </div>

            {/* Snippet Content */}
            {hoveredSection.snippet && (
              <p className="text-[12px] text-zinc-300/90 leading-relaxed mt-2 line-clamp-4 font-mono whitespace-pre-wrap break-words">
                {hoveredSection.snippet}
              </p>
            )}

            {/* Bottom Quick Hint */}
            <div className="mt-3 pt-2 border-t border-zinc-700/50 flex items-center justify-between text-[10px] text-zinc-400">
              <span className="capitalize font-sans opacity-80">{hoveredSection.type || "Section"}</span>
              <span className="text-blue-400 font-semibold font-sans">Click to jump →</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
