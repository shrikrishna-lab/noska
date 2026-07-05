import React, { useRef, useEffect } from "react";
import { Maximize2, Minimize2, Move } from "lucide-react";
import { getPageCluster } from "./GraphLegend";

export default function GraphMiniMap({
  pages,
  nodePositions,
  pan,
  scale,
  containerWidth,
  containerHeight,
  onPanChange,
  onResetView,
  onFitGraph
}) {
  const minimapRef = useRef(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  // Map settings
  const mapWidth = 180;
  const mapHeight = 135;
  const canvasWidth = 2000;
  const canvasHeight = 1500;

  const scaleX = mapWidth / canvasWidth;
  const scaleY = mapHeight / canvasHeight;

  const visiblePages = pages.filter((p) => !p.trashed);

  // Compute viewport rectangle bounds on the minimap
  const viewX = (-pan.x / scale) * scaleX;
  const viewY = (-pan.y / scale) * scaleY;
  const viewW = (containerWidth / scale) * scaleX;
  const viewH = (containerHeight / scale) * scaleY;

  // Clamped bounds for drawing the viewport rectangle inside the minimap
  const rectLeft = Math.max(0, Math.min(mapWidth, viewX));
  const rectTop = Math.max(0, Math.min(mapHeight, viewY));
  const rectWidth = Math.max(10, Math.min(mapWidth - rectLeft, viewW));
  const rectHeight = Math.max(8, Math.min(mapHeight - rectTop, viewH));

  // Map Click navigation
  const handleMapClick = (e) => {
    if (isDragging.current) return;
    if (!minimapRef.current) return;
    
    const rect = minimapRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Center on this canvas point
    const cx = mx / scaleX;
    const cy = my / scaleY;

    const targetPanX = containerWidth / 2 - cx * scale;
    const targetPanY = containerHeight / 2 - cy * scale;

    onPanChange({ x: targetPanX, y: targetPanY });
  };

  // Viewport dragging
  const handleMouseDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...pan };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;

      // Translate map delta back to canvas space delta
      const canvasDx = (dx / scaleX) * scale;
      const canvasDy = (dy / scaleY) * scale;

      onPanChange({
        x: panStart.current.x - canvasDx,
        y: panStart.current.y - canvasDy
      });
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [scale, onPanChange, scaleX, scaleY]);

  return (
    <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2 select-none">
      {/* Figma Mini Map Viewbox */}
      <div 
        ref={minimapRef}
        onClick={handleMapClick}
        style={{ width: mapWidth, height: mapHeight }}
        className="relative border border-[var(--border-strong)] rounded-xl bg-[var(--elevated)]/90 backdrop-blur-md overflow-hidden cursor-crosshair shadow-2xl"
      >
        {/* Node dots preview */}
        {visiblePages.map((page) => {
          const pos = nodePositions[page.id] || { x: 500, y: 350 };
          const dotX = pos.x * scaleX;
          const dotY = pos.y * scaleY;
          const cluster = getPageCluster(page);

          if (dotX < 0 || dotX > mapWidth || dotY < 0 || dotY > mapHeight) return null;

          return (
            <div
              key={page.id}
              style={{
                left: dotX,
                top: dotY,
                backgroundColor: cluster.color,
              }}
              className="absolute w-1.5 h-1.5 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_2px_rgba(0,0,0,0.5)] transition-all"
            />
          );
        })}

        {/* Viewport tracking frame */}
        <div
          onMouseDown={handleMouseDown}
          style={{
            left: rectLeft,
            top: rectTop,
            width: rectWidth,
            height: rectHeight,
          }}
          className="absolute border border-[var(--accent)] bg-[var(--accent-soft)]/20 cursor-move transition-all flex items-center justify-center group"
        >
          <Move size={8} className="text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* MiniMap Controls Panel */}
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--elevated)]/90 backdrop-blur-sm text-[10px] text-[var(--secondary)] font-semibold shadow-md">
        <span>Zoom: {Math.round(scale * 100)}%</span>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={onFitGraph}
            title="Fit Map View"
            className="hover:text-[var(--text)] transition-colors p-0.5 cursor-pointer"
          >
            <Maximize2 size={10} />
          </button>
          <button 
            onClick={onResetView}
            title="Reset Pan & Zoom"
            className="hover:text-[var(--text)] transition-colors p-0.5 cursor-pointer border-l border-[var(--border)] pl-1"
          >
            <Minimize2 size={10} />
          </button>
        </div>
      </div>
    </div>
  );
}
