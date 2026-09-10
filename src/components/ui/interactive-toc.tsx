import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface TOCItem {
  id: string;
  title: string;
  preview?: string;
  level?: number;
  targetId?: string;
  href?: string;
}

export interface InteractiveTOCProps {
  items: TOCItem[];
  activeId?: string;
  onSelect?: (item: TOCItem) => void;
  position?: "left" | "right";
  className?: string;
  lineColor?: string;
  activeColor?: string;
  fontSize?: number;
  showPreviewTooltip?: boolean;
}

export function InteractiveTOC({
  items,
  activeId,
  onSelect,
  position = "left",
  className = "",
  lineColor,
  activeColor,
  fontSize = 14,
  showPreviewTooltip = false,
}: InteractiveTOCProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeIndex = items.findIndex((item) => item.id === activeId);

  const handleItemClick = (item: TOCItem) => {
    if (onSelect) {
      onSelect(item);
      return;
    }
    if (item.targetId) {
      const el = document.getElementById(item.targetId) || document.querySelector(`[data-block-id="${item.targetId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div
      ref={containerRef}
      onMouseLeave={() => setHoveredIndex(null)}
      className={`relative inline-flex flex-col items-start gap-0 py-2 select-none z-30 font-mono ${className}`}
    >
      {items.map((item, index) => {
        const isHovered = hoveredIndex === index;
        const isNeighbor = hoveredIndex !== null && Math.abs(hoveredIndex - index) === 1;
        const isActive = activeIndex === index;

        // Proximity dynamic dash width (matching Framer TOC: 12px -> 18px -> 24px)
        let lineWidth = 12;
        let lineBg = lineColor || "rgb(69, 69, 69)";
        if (isHovered) {
          lineWidth = 24;
          lineBg = activeColor || "rgb(237, 237, 237)";
        } else if (isNeighbor) {
          lineWidth = 18;
          lineBg = "rgb(160, 160, 160)";
        } else if (isActive && hoveredIndex === null) {
          lineWidth = 20;
          lineBg = activeColor || "rgb(237, 237, 237)";
        }

        return (
          <div
            key={item.id}
            onMouseEnter={() => setHoveredIndex(index)}
            onClick={() => handleItemClick(item)}
            className="group relative flex items-center h-[22px] cursor-pointer gap-2"
          >
            {/* Minimal Dash Line Indicator (Matching Framer: h=3px, r=2px) */}
            <motion.div
              layout
              animate={{
                width: lineWidth,
                backgroundColor: lineBg,
              }}
              transition={{ type: "spring", stiffness: 450, damping: 30, bounce: 0.2 }}
              style={{
                height: 3,
                borderRadius: 2,
              }}
              className="shrink-0"
            />

            {/* Inline Uppercase Geist Mono Title (Exact match to Framer screenshot) */}
            <AnimatePresence>
              {isHovered && (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  transition={{ type: "spring", stiffness: 450, damping: 28, bounce: 0.2 }}
                  style={{ fontSize }}
                  className="font-mono text-neutral-900 dark:text-[rgb(237,237,237)] tracking-[-0.02em] uppercase font-normal leading-none whitespace-nowrap"
                >
                  {item.title}
                </motion.span>
              )}
            </AnimatePresence>

            {/* Optional Floating Rich Snippet Preview Card if enabled */}
            {showPreviewTooltip && isHovered && item.preview && (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 4 }}
                  transition={{ type: "spring", stiffness: 450, damping: 30 }}
                  style={{
                    left: position === "left" ? "100%" : "auto",
                    right: position === "right" ? "100%" : "auto",
                  }}
                  className="absolute top-full mt-1 z-50 min-w-[200px] max-w-[280px] rounded-xl bg-[#1c1c1f]/95 dark:bg-[#141416]/95 text-white p-3 shadow-2xl backdrop-blur-2xl border border-white/10 pointer-events-none"
                >
                  <p className="text-[11px] text-neutral-400 font-sans leading-relaxed line-clamp-3">
                    {item.preview}
                  </p>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default InteractiveTOC;
