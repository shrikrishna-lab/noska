import React, { useRef, useEffect, useState } from "react";
import { colorById } from "./canvasStore";

const HANDLES = [
  { id: "nw", x: 0, y: 0, cursor: "nwse-resize" },
  { id: "ne", x: 1, y: 0, cursor: "nesw-resize" },
  { id: "sw", x: 0, y: 1, cursor: "nesw-resize" },
  { id: "se", x: 1, y: 1, cursor: "nwse-resize" },
];

/**
 * CanvasElement — renders a single free-form element (sticky/rect/ellipse/text/frame).
 * All geometry is in canvas coordinates; the parent applies pan/scale via transform.
 */
export default function CanvasElement({
  el, selected, scale, tool,
  onPointerDownBody, onPointerDownHandle, onStartConnector,
  onChangeText, onSelect,
}) {
  const c = colorById(el.color);
  const [editing, setEditing] = useState(false);
  const taRef = useRef(null);

  useEffect(() => {
    if (editing && taRef.current) {
      taRef.current.focus();
      taRef.current.select?.();
    }
  }, [editing]);

  const isShape = el.kind === "rect" || el.kind === "ellipse";
  const isFrame = el.kind === "frame";
  const isText = el.kind === "text";
  const isSticky = el.kind === "sticky";

  const commonStyle = {
    position: "absolute",
    left: el.x,
    top: el.y,
    width: el.w,
    height: el.h,
    transform: `rotate(${el.rotation || 0}deg)`,
  };

  const bg = isText ? "transparent" : c.fill;
  const border = isText ? "none" : `1.5px solid ${c.stroke}`;
  const radius = el.kind === "ellipse" ? "50%" : isSticky ? 6 : 10;

  const startBody = (e) => {
    if (tool === "connector") {
      e.stopPropagation();
      onStartConnector?.(el.id, e);
      return;
    }
    onPointerDownBody?.(el.id, e);
  };

  return (
    <div
      data-canvas-element={el.id}
      style={commonStyle}
      onPointerDown={startBody}
      onDoubleClick={(e) => { e.stopPropagation(); if (!isFrame) setEditing(true); }}
      className="group/element select-none"
    >
      {/* Body */}
      <div
        style={{
          width: "100%",
          height: "100%",
          background: bg,
          border,
          borderRadius: radius,
          boxShadow: isSticky ? "0 4px 14px rgba(0,0,0,0.12)" : "none",
          color: c.text,
        }}
        className={`relative flex ${isFrame ? "items-start justify-start" : "items-center justify-center"} overflow-hidden transition-shadow ${
          selected ? "ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-transparent" : ""
        }`}
      >
        {/* Frame label */}
        {isFrame && (
          <div className="absolute -top-6 left-0 text-[11px] font-semibold text-[var(--secondary)] px-1.5 py-0.5 rounded bg-[var(--elevated)]/70 border border-[var(--border)]">
            {el.text || "Frame"}
          </div>
        )}

        {/* Text content / editor */}
        {!isFrame && (
          editing ? (
            <textarea
              ref={taRef}
              defaultValue={el.text}
              onBlur={(e) => { setEditing(false); onChangeText?.(el.id, e.target.value); }}
              onKeyDown={(e) => {
                if (e.key === "Escape") { e.currentTarget.blur(); }
                if (e.key === "Enter" && isText) { e.preventDefault(); e.currentTarget.blur(); }
                e.stopPropagation();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              style={{ fontSize: (el.fontSize || 15) }}
              className="w-full h-full bg-transparent outline-none resize-none text-center p-2 leading-snug"
            />
          ) : (
            <div
              style={{ fontSize: (el.fontSize || 15) }}
              className={`w-full h-full flex items-center justify-center text-center px-2 leading-snug whitespace-pre-wrap break-words ${
                !el.text ? "opacity-40 italic" : ""
              } ${isText ? "font-semibold" : ""}`}
            >
              {el.text || (isSticky ? "Double-click to edit" : "")}
            </div>
          )
        )}
      </div>

      {/* Selection handles (select tool only) */}
      {selected && tool === "select" && (
        <>
          {HANDLES.map((h) => (
            <div
              key={h.id}
              onPointerDown={(e) => { e.stopPropagation(); onPointerDownHandle?.(el.id, h.id, e); }}
              style={{
                position: "absolute",
                left: `calc(${h.x * 100}% - 5px)`,
                top: `calc(${h.y * 100}% - 5px)`,
                width: 10,
                height: 10,
                cursor: h.cursor,
              }}
              className="rounded-sm bg-white border-2 border-[var(--accent)] shadow"
            />
          ))}
          {/* connector nub */}
          <button
            onPointerDown={(e) => { e.stopPropagation(); onStartConnector?.(el.id, e); }}
            style={{ position: "absolute", right: -14, top: "50%", transform: "translateY(-50%)" }}
            title="Drag to connect"
            className="w-4 h-4 rounded-full bg-[var(--accent)] border-2 border-white shadow cursor-crosshair opacity-0 group-hover/element:opacity-100 transition-opacity"
          />
        </>
      )}
    </div>
  );
}
