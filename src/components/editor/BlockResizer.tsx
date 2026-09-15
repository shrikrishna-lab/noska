import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface BlockResizerProps {
  width?: number | string;
  height?: number | string;
  align?: "left" | "center" | "right" | "full";
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  isLocked?: boolean;
  onPatch: (patch: { width?: number | string; height?: number | string; align?: "left" | "center" | "right" | "full";[key: string]: any }) => void;
  onReset?: () => void;
  children: React.ReactNode;
  className?: string;
  containerStyle?: React.CSSProperties;
  enableHeightResize?: boolean;
}

export default function BlockResizer({
  width,
  height,
  align = "center",
  minWidth = 280,
  maxWidth = 2400,
  minHeight = 120,
  maxHeight = 2400,
  isLocked = false,
  onPatch,
  onReset,
  children,
  className = "",
  containerStyle,
  enableHeightResize = true
}: BlockResizerProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDimension, setResizeDimension] = useState<{ width: number; height: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const numericHeight = typeof height === "number" ? height : (typeof height === "string" && !isNaN(parseInt(height)) ? parseInt(height) : undefined);
  const effectiveWidth = resizeDimension?.width || (typeof width === "number" ? width : undefined);

  const handleResetSize = () => {
    if (isLocked) return;
    if (onReset) {
      onReset();
    } else {
      onPatch({ width: undefined, height: undefined });
    }
  };

  const handleResizeStart = (direction: "right" | "left" | "bottom" | "bottom-right" | "bottom-left") => (e: React.MouseEvent) => {
    if (isLocked) return;
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = containerRef.current?.offsetWidth || 640;
    const startH = containerRef.current?.offsetHeight || numericHeight || 360;

    let latestW = startW;
    let latestH = startH;

    document.body.style.userSelect = "none";
    document.body.style.cursor =
      direction === "bottom-right"
        ? "nwse-resize"
        : direction === "bottom-left"
        ? "nesw-resize"
        : direction === "bottom"
        ? "row-resize"
        : "col-resize";

    const onMouseMove = (ev: MouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      const deltaX = ev.clientX - startX;
      const deltaY = ev.clientY - startY;

      if (align === "center") {
        // Centered resizing: expands symmetrically outward into both left and right margins with 1:1 cursor tracking
        if (direction === "bottom-right" || direction === "right") {
          latestW = Math.max(minWidth, Math.min(maxWidth, startW + deltaX * 2));
        } else if (direction === "bottom-left" || direction === "left") {
          latestW = Math.max(minWidth, Math.min(maxWidth, startW - deltaX * 2));
        }
      } else if (direction === "bottom-right" || direction === "right") {
        latestW = Math.max(minWidth, Math.min(maxWidth, startW + deltaX));
      } else if (direction === "bottom-left" || direction === "left") {
        latestW = Math.max(minWidth, Math.min(maxWidth, startW - deltaX));
      }

      if (enableHeightResize && (direction === "bottom-right" || direction === "bottom-left" || direction === "bottom")) {
        latestH = Math.max(minHeight, Math.min(maxHeight, startH + deltaY));
      }

      setResizeDimension({ width: Math.round(latestW), height: Math.round(latestH) });
    };

    const onMouseUp = (ev: MouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      setIsResizing(false);
      setResizeDimension(null);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      window.removeEventListener("mousemove", onMouseMove, { capture: true });
      window.removeEventListener("mouseup", onMouseUp, { capture: true });

      const parentW = containerRef.current?.parentElement?.offsetWidth;
      // If dragged within 12px of parent full width, snap to full width (undefined)
      const isFull = parentW && Math.abs(latestW - parentW) <= 12;
      const finalW = isFull ? undefined : Math.round(latestW);

      onPatch({
        ...(direction !== "bottom" ? { width: typeof finalW === "number" ? finalW : undefined } : {}),
        ...(enableHeightResize && (direction === "bottom-right" || direction === "bottom-left" || direction === "bottom")
          ? { height: typeof latestH === "number" ? Math.round(latestH) : undefined }
          : {})
      });
    };

    window.addEventListener("mousemove", onMouseMove, { capture: true });
    window.addEventListener("mouseup", onMouseUp, { capture: true });
  };

  const isCentered = align === "center";
  const hasCustomWidth = Boolean(effectiveWidth || (width && typeof width === "number"));

  const layoutStyle: React.CSSProperties = {
    ...(effectiveWidth
      ? {
          width: `${effectiveWidth}px`,
          maxWidth: "min(2400px, 100vw - 48px)"
        }
      : width
      ? {
          width: typeof width === "number" ? `${width}px` : width,
          maxWidth: typeof width === "number" ? "min(2400px, 100vw - 48px)" : "100%"
        }
      : { width: "100%", maxWidth: "100%" }),
    ...(enableHeightResize && (resizeDimension?.height || numericHeight)
      ? { height: `${resizeDimension?.height || numericHeight}px` }
      : {}),
    ...(isCentered && hasCustomWidth
      ? {
          position: "relative",
          left: "50%",
          transform: "translateX(-50%)"
        }
      : isCentered
      ? {
          marginLeft: "auto",
          marginRight: "auto"
        }
      : align === "right"
      ? {
          marginLeft: "auto",
          marginRight: 0
        }
      : {
          marginLeft: 0,
          marginRight: "auto"
        }),
    transition: isResizing ? "none" : "width 0.2s ease, height 0.2s ease",
    ...containerStyle
  };

  return (
    <>
      <div
        ref={containerRef}
        className={`group/block-resizer relative transition-all ${className}`}
        style={layoutStyle}
      >
        <div className={`w-full ${enableHeightResize && (resizeDimension?.height || numericHeight) ? "h-full min-h-0 [&>*]:h-full" : ""}`}>
          {children}
        </div>

        {/* Live Dimension HUD during Resize */}
        <AnimatePresence>
          {isResizing && resizeDimension && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }}
              transition={{ type: "spring", stiffness: 500, damping: 32 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-full bg-neutral-900/90 dark:bg-[#1E2128]/95 backdrop-blur-md border border-white/20 text-white text-[11px] font-mono font-semibold shadow-2xl pointer-events-none select-none"
            >
              {resizeDimension.width}px{enableHeightResize ? ` × ${resizeDimension.height}px` : ""}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── FREE RESIZE HANDLERS (Sides, Bottom, and Curved Corners) ─── */}
        {!isLocked && (
          <>
            {/* Right Edge Width Bar */}
            <div
              onMouseDown={handleResizeStart("right")}
              onDoubleClick={handleResetSize}
              className="absolute inset-y-4 -right-2 w-4 cursor-col-resize z-30 flex items-center justify-center select-none group/edge-r"
              title="Drag to resize width (Double-click to reset)"
            >
              <div className="w-1.5 h-10 rounded-full bg-blue-500/0 group-hover/block-resizer:bg-blue-500/30 group-hover/edge-r:bg-blue-500 group-hover/edge-r:scale-110 active:bg-blue-600 transition-all duration-150" />
            </div>

            {/* Left Edge Width Bar */}
            <div
              onMouseDown={handleResizeStart("left")}
              onDoubleClick={handleResetSize}
              className="absolute inset-y-4 -left-2 w-4 cursor-col-resize z-30 flex items-center justify-center select-none group/edge-l"
              title="Drag to resize width (Double-click to reset)"
            >
              <div className="w-1.5 h-10 rounded-full bg-blue-500/0 group-hover/block-resizer:bg-blue-500/30 group-hover/edge-l:bg-blue-500 group-hover/edge-l:scale-110 active:bg-blue-600 transition-all duration-150" />
            </div>

            {/* Bottom Edge Length / Height Pill */}
            {enableHeightResize && (
              <div
                onMouseDown={handleResizeStart("bottom")}
                onDoubleClick={handleResetSize}
                className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-24 h-5 cursor-row-resize z-30 flex items-center justify-center select-none group/edge-b"
                title="Drag to resize height (length)"
              >
                <div className="h-1.5 w-12 rounded-full bg-blue-500/0 group-hover/block-resizer:bg-blue-500/30 group-hover/edge-b:bg-blue-500 group-hover/edge-b:scale-110 active:bg-blue-600 transition-all duration-150" />
              </div>
            )}

            {/* Bottom-Right Corner Curved Handle */}
            <div
              onMouseDown={handleResizeStart("bottom-right")}
              onDoubleClick={handleResetSize}
              className="absolute -bottom-1 -right-1 w-9 h-9 cursor-nwse-resize z-40 group/corner-br flex items-end justify-end p-1 select-none"
              title="Drag corner to resize width & height (Double-click to reset)"
            >
              <div className="w-5 h-5 flex items-end justify-end opacity-0 group-hover/block-resizer:opacity-100 group-hover/corner-br:scale-125 active:scale-95 transition-all duration-200 ease-out">
                <svg width="14" height="14" viewBox="0 0 14 14" className="text-blue-500 dark:text-blue-400">
                  <path d="M12 2v6.5a3.5 3.5 0 0 1-3.5 3.5H2" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* Bottom-Left Corner Curved Handle */}
            <div
              onMouseDown={handleResizeStart("bottom-left")}
              onDoubleClick={handleResetSize}
              className="absolute -bottom-1 -left-1 w-9 h-9 cursor-nesw-resize z-40 group/corner-bl flex items-end justify-start p-1 select-none"
              title="Drag corner to resize width & height (Double-click to reset)"
            >
              <div className="w-5 h-5 flex items-end justify-start opacity-0 group-hover/block-resizer:opacity-100 group-hover/corner-bl:scale-125 active:scale-95 transition-all duration-200 ease-out">
                <svg width="14" height="14" viewBox="0 0 14 14" className="text-blue-500 dark:text-blue-400">
                  <path d="M2 2v6.5a3.5 3.5 0 0 0 3.5 3.5H12" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Global Transparent Drag Shield during Active Resizing */}
      {isResizing && (
        <div
          className="fixed inset-0 z-[99999] select-none pointer-events-auto"
          style={{ cursor: document.body.style.cursor || "nwse-resize" }}
        />
      )}
    </>
  );
}
