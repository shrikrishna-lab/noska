import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Block } from "../../../types/blocks";

export interface OutlineSection {
  id: string;
  title: string;
  snippet: string;
  type: string;
  depth: number; // 0 for H1, 1 for H2, 2 for H3/tasks, etc.
}

interface DocumentOutlineRulerProps {
  blocks?: Block[];
  sections?: OutlineSection[];
  containerRef?: React.RefObject<HTMLElement | null>;
  onJumpToSection?: (id: string) => void;
  className?: string;
}

export default function DocumentOutlineRuler({
  blocks,
  sections: customSections,
  containerRef,
  onJumpToSection,
  className = ""
}: DocumentOutlineRulerProps) {
  const [hoveredSection, setHoveredSection] = useState<OutlineSection | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ top: number; left: number } | null>(null);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const rulerRef = useRef<HTMLDivElement>(null);

  // Derive outline sections from blocks if not provided custom
  const outlineSections = useMemo(() => {
    if (customSections && customSections.length > 0) return customSections;
    if (!blocks || blocks.length === 0) return [];

    const list: OutlineSection[] = [];
    blocks.forEach((b) => {
      const isHeading = b.type === "h1" || b.type === "h2" || b.type === "h3" || b.type === "h4";
      const isCallout = b.type === "callout";
      const isTask = b.type === "todo";
      const isQuote = b.type === "quote";

      if (isHeading || isCallout || (isTask && list.length === 0)) {
        let title = b.text?.trim() || (isHeading ? "Heading" : isCallout ? "Note" : "Task");
        // Strip Markdown
        title = title.replace(/^[#*-]\s+/, "");
        
        list.push({
          id: b.id,
          title: title.length > 40 ? title.slice(0, 40) + "..." : title,
          snippet: b.text?.slice(0, 140) || "",
          type: b.type,
          depth: b.type === "h1" ? 0 : b.type === "h2" ? 1 : b.type === "h3" ? 2 : 1
        });
      }
    });

    // If no headings found, take samples of blocks
    if (list.length === 0) {
      blocks.slice(0, 10).forEach((b, i) => {
        if (b.text?.trim()) {
          const raw = b.text.trim();
          list.push({
            id: b.id,
            title: raw.slice(0, 30),
            snippet: raw.slice(0, 140),
            type: b.type || "text",
            depth: 0
          });
        }
      });
    }

    return list;
  }, [blocks, customSections]);

  // Track active section on scroll
  useEffect(() => {
    const container = containerRef?.current || window;
    const handleScroll = () => {
      if (outlineSections.length === 0) return;

      const scrollElement = container === window ? document.documentElement : (container as HTMLElement);
      const scrollTop = scrollElement.scrollTop;
      const scrollHeight = scrollElement.scrollHeight - scrollElement.clientHeight;
      const progress = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
      
      const newIndex = Math.min(
        Math.floor(progress * outlineSections.length),
        outlineSections.length - 1
      );
      setActiveSectionIndex(Math.max(0, newIndex));
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [containerRef, outlineSections]);

  if (outlineSections.length < 2) return null;

  const handleHoverRuler = (e: React.MouseEvent, section: OutlineSection, index: number) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    setHoverPosition({
      top: rect.top,
      left: rect.right + 12
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
      // Default jump: find element by block id or data-block-id
      const el = document.querySelector(`[data-block-id="${section.id}"]`) || document.getElementById(section.id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  return (
    <div
      ref={rulerRef}
      onMouseLeave={handleLeaveRuler}
      className={`fixed left-3 top-1/2 -translate-y-1/2 z-40 select-none flex items-center py-4 px-1.5 transition-opacity ${className}`}
    >
      {/* ─── VERTICAL TICK RULER ─── */}
      <div className="flex flex-col items-start gap-1.5 py-2 group cursor-pointer">
        {outlineSections.map((section, idx) => {
          const isActive = idx === activeSectionIndex;
          const isMajor = section.depth === 0;

          return (
            <div
              key={section.id}
              onClick={() => handleClickSection(section, idx)}
              onMouseEnter={(e) => handleHoverRuler(e, section, idx)}
              className="py-0.5 flex items-center cursor-pointer transition-all duration-150"
            >
              <div
                className={`transition-all duration-200 rounded-full ${
                  isActive
                    ? "w-5 h-[2.5px] bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] scale-110"
                    : isMajor
                    ? "w-3 h-[2px] bg-white/40 hover:bg-white/90 hover:w-4.5"
                    : "w-2 h-[1.5px] bg-white/20 hover:bg-white/70 hover:w-3.5"
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* ─── FLOATING PREVIEW CARD (MATCHING USER SCREENSHOT) ─── */}
      <AnimatePresence>
        {hoveredSection && hoverPosition && (
          <motion.div
            initial={{ opacity: 0, x: -6, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -6, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{
              top: hoverPosition.top - 20,
              left: hoverPosition.left
            }}
            onClick={() => {
              handleClickSection(hoveredSection, outlineSections.indexOf(hoveredSection));
              setHoveredSection(null);
            }}
            className="apple-liquid-glass fixed z-50 w-72 p-3.5 rounded-[22px] text-[var(--text)] cursor-pointer hover:scale-[1.01] transition-transform pointer-events-auto"
          >
            {/* Section Title */}
            <div className="text-[13px] font-bold text-[var(--text)] tracking-tight leading-snug">
              {hoveredSection.title || "Section"}
            </div>

            {/* Snippet Content */}
            {hoveredSection.snippet && (
              <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed mt-1.5 line-clamp-3 font-normal">
                {hoveredSection.snippet}
              </p>
            )}

            {/* Bottom Quick Hint */}
            <div className="mt-2.5 pt-1.5 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
              <span className="capitalize">{hoveredSection.type || "Section"}</span>
              <span className="text-[var(--accent)] font-semibold">Click to jump →</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
