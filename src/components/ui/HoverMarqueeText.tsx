import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";

interface HoverMarqueeTextProps {
  text: string;
  className?: string;
  isHovered?: boolean;
  /** If true (default), animation triggers ONLY when cursor is directly over the text */
  textHoverOnly?: boolean;
  /** Gap in pixels between the duplicate loop items */
  gap?: number;
  /** Scrolling speed in pixels per second */
  speed?: number;
}

export function HoverMarqueeText({
  text,
  className = "",
  isHovered,
  textHoverOnly = true,
  gap = 32,
  speed = 30,
}: HoverMarqueeTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflows, setOverflows] = useState(false);
  const [singleTrackWidth, setSingleTrackWidth] = useState(0);
  const [isDirectlyHovered, setIsDirectlyHovered] = useState(false);

  const measure = useCallback(() => {
    if (containerRef.current && textRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const textWidth = textRef.current.scrollWidth;
      if (textWidth > containerWidth + 2) {
        setOverflows(true);
        setSingleTrackWidth(textWidth + gap);
      } else {
        setOverflows(false);
        setSingleTrackWidth(0);
      }
    }
  }, [gap]);

  useEffect(() => {
    measure();
  }, [text, measure]);

  // Robust boundary tracking with ResizeObserver for exact edge detection
  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver(() => {
      measure();
    });

    ro.observe(containerRef.current);
    if (textRef.current) ro.observe(textRef.current);

    return () => ro.disconnect();
  }, [measure]);

  const handlePointerEnter = () => {
    setIsDirectlyHovered(true);
    measure();
  };

  const handlePointerLeave = () => {
    setIsDirectlyHovered(false);
  };

  const activeHover = textHoverOnly
    ? isDirectlyHovered
    : (isHovered ?? isDirectlyHovered);

  const shouldAnimate = activeHover && overflows && singleTrackWidth > 0;
  const duration = singleTrackWidth > 0 ? singleTrackWidth / speed : 4;

  return (
    <span
      ref={containerRef}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerMove={() => {
        if (!isDirectlyHovered) setIsDirectlyHovered(true);
      }}
      className={`relative w-full min-w-0 flex-1 overflow-hidden whitespace-nowrap block cursor-inherit select-none pointer-events-auto ${className}`}
    >
      <motion.span
        className="inline-flex flex-row flex-nowrap items-center whitespace-nowrap"
        animate={
          shouldAnimate
            ? { x: [0, -singleTrackWidth] }
            : { x: 0 }
        }
        transition={
          shouldAnimate
            ? {
                x: {
                  repeat: Infinity,
                  repeatType: "loop",
                  duration,
                  ease: "linear",
                },
              }
            : {
                x: {
                  duration: 0.2,
                  ease: "easeOut",
                },
              }
        }
      >
        <span
          ref={textRef}
          style={{ paddingRight: overflows ? `${gap}px` : undefined }}
          className={`shrink-0 ${!overflows ? "truncate" : ""}`}
        >
          {text}
        </span>

        {/* Seamless trailing duplicate copy for unbroken continuous loop */}
        {overflows && (
          <span
            style={{ paddingRight: `${gap}px` }}
            className="shrink-0"
            aria-hidden="true"
          >
            {text}
          </span>
        )}
      </motion.span>
    </span>
  );
}

export default HoverMarqueeText;
