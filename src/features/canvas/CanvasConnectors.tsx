import React from "react";
import { edgeAnchor, rectCenter } from "./canvasStore";

/**
 * CanvasConnectors — SVG overlay drawing curved arrows between items.
 * Endpoints resolve to the edge of each item's bounding rect so lines stay tidy.
 *
 * Props:
 *   connectors  — [{ id, from, to, color? }]  (from/to = item keys)
 *   getRect     — (key) => {x,y,w,h} | null
 *   draft       — optional { fromKey, x, y } while dragging a new connector
 *   selectedId  — currently selected connector id
 *   onSelect    — (id) => void
 */
export default function CanvasConnectors({ connectors, getRect, draft, selectedId, onSelect }) {
  const paths = [];

  for (const conn of connectors) {
    const a = getRect(conn.from);
    const b = getRect(conn.to);
    if (!a || !b) continue;
    const ca = rectCenter(a);
    const cb = rectCenter(b);
    const p1 = edgeAnchor(a, cb);
    const p2 = edgeAnchor(b, ca);
    paths.push({ id: conn.id, p1, p2, color: conn.color });
  }

  let draftPath = null;
  if (draft) {
    const a = getRect(draft.fromKey);
    if (a) {
      const target = { x: draft.x, y: draft.y };
      const p1 = edgeAnchor(a, target);
      draftPath = { p1, p2: target };
    }
  }

  const curve = (p1, p2) => {
    const mx = (p1.x + p2.x) / 2;
    return `M ${p1.x} ${p1.y} C ${mx} ${p1.y}, ${mx} ${p2.y}, ${p2.x} ${p2.y}`;
  };

  return (
    <svg
      className="absolute inset-0 overflow-visible pointer-events-none"
      style={{ width: 1, height: 1 }}
    >
      <defs>
        <marker id="cv-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" />
        </marker>
        <marker id="cv-arrow-muted" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--secondary)" />
        </marker>
      </defs>

      {paths.map((p) => {
        const isSel = p.id === selectedId;
        return (
          <g key={p.id}>
            {/* fat invisible hit area */}
            <path
              d={curve(p.p1, p.p2)}
              stroke="transparent"
              strokeWidth={14}
              fill="none"
              style={{ pointerEvents: "stroke", cursor: "pointer" }}
              onPointerDown={(e) => { e.stopPropagation(); onSelect?.(p.id); }}
            />
            <path
              d={curve(p.p1, p.p2)}
              stroke={isSel ? "var(--accent)" : "var(--secondary)"}
              strokeWidth={isSel ? 2.5 : 1.8}
              fill="none"
              markerEnd={`url(#${isSel ? "cv-arrow" : "cv-arrow-muted"})`}
              opacity={isSel ? 1 : 0.75}
            />
          </g>
        );
      })}

      {draftPath && (
        <path
          d={curve(draftPath.p1, draftPath.p2)}
          stroke="var(--accent)"
          strokeWidth={2}
          strokeDasharray="6 5"
          fill="none"
          markerEnd="url(#cv-arrow)"
        />
      )}
    </svg>
  );
}
