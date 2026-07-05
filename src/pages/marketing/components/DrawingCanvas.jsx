import { useEffect, useRef, useState } from 'react';
import { Eraser, Pencil } from 'lucide-react';

/**
 * A tiny freehand drawing surface — mouse/touch draws a line, with a clear
 * button. Native reimplementation of the referenced Framer "DrawingCanvas"
 * component (Framer canvas-only, can't be imported into a standalone app).
 * Used on the Product page to demonstrate that pages support freeform
 * annotation, not just typed blocks.
 */
export function DrawingCanvas({ width = 320, height = 180, strokeColor = 'var(--mkt-accent-purple)' }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue('--mkt-accent-purple') || strokeColor;
  }, [width, height, strokeColor]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  };

  const start = (e) => {
    isDrawing.current = true;
    setEmpty(false);
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e) => {
    if (!isDrawing.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const end = () => {
    isDrawing.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setEmpty(true);
  };

  return (
    <div className="mkt-drawing-canvas">
      <div className="mkt-drawing-canvas-toolbar">
        <span><Pencil size={12} /> Sketch on this page</span>
        <button onClick={clear} disabled={empty} aria-label="Clear drawing">
          <Eraser size={13} />
        </button>
      </div>
      <canvas
        ref={canvasRef}
        style={{ width, height }}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      {empty && <span className="mkt-drawing-canvas-hint">Draw here with your mouse or finger</span>}
    </div>
  );
}
