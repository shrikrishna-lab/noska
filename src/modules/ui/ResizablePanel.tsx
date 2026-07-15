import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";

const RESIZE_HANDLE_SIZE = 4;

export default function ResizablePanel({
  children, direction = "horizontal", defaultSize = 300, minSize = 180, maxSize = 800,
  className = "", onResize, storageKey, style,
}) {
  const [size, setSize] = useState(() => {
    if (storageKey) {
      try { return parseInt(localStorage.getItem(storageKey)) || defaultSize; } catch {}
    }
    return defaultSize;
  });
  const [isResizing, setIsResizing] = useState(false);
  const startPos = useRef(0);
  const startSize = useRef(size);

  useEffect(() => {
    if (storageKey) {
      try { localStorage.setItem(storageKey, String(size)); } catch {}
    }
  }, [size, storageKey]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    startPos.current = direction === "horizontal" ? e.clientX : e.clientY;
    startSize.current = size;
    document.body.style.cursor = direction === "horizontal" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
  }, [direction, size]);

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e) => {
      const delta = direction === "horizontal"
        ? e.clientX - startPos.current
        : e.clientY - startPos.current;
      setSize(Math.max(minSize, Math.min(maxSize, startSize.current + delta)));
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, direction, minSize, maxSize]);

  useEffect(() => { onResize?.(size); }, [size, onResize]);

  const panelStyle = direction === "horizontal"
    ? { width: size, minWidth: minSize, maxWidth: maxSize }
    : { height: size, minHeight: minSize, maxHeight: maxSize };

  return (
    <div style={{ ...panelStyle, position: "relative", ...style }} className={className}>
      {children}
      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`absolute z-10 transition-colors ${
          direction === "horizontal"
            ? "right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[var(--accent)]/20"
            : "bottom-0 left-0 right-0 h-1 cursor-row-resize hover:bg-[var(--accent)]/20"
        } ${isResizing ? `bg-[var(--accent)]/30` : ""}`}
        style={
          direction === "horizontal"
            ? { right: -RESIZE_HANDLE_SIZE / 2, width: RESIZE_HANDLE_SIZE }
            : { bottom: -RESIZE_HANDLE_SIZE / 2, height: RESIZE_HANDLE_SIZE }
        }
      />
    </div>
  );
}
