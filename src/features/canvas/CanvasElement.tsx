import React, { useRef, useEffect, useState, useMemo } from "react";
import {
  colorById,
  stickyPaletteById,
  getCardRotation,
  getCardAttachment,
  type CanvasElementData
} from "./canvasStore";
import { StickyAttachment } from "./StickyAttachment";

const HANDLES = [
  { id: "nw", x: 0, y: 0, cursor: "nwse-resize" },
  { id: "ne", x: 1, y: 0, cursor: "nesw-resize" },
  { id: "sw", x: 0, y: 1, cursor: "nesw-resize" },
  { id: "se", x: 1, y: 1, cursor: "nwse-resize" },
];

interface CanvasElementProps {
  el: CanvasElementData;
  selected: boolean;
  scale: number;
  tool: string;
  onPointerDownBody: (id: string, e: React.PointerEvent) => void;
  onPointerDownHandle: (id: string, handle: string, e: React.PointerEvent) => void;
  onStartConnector: (id: string, e: React.PointerEvent) => void;
  onChangeText: (id: string, text: string) => void;
  onSelect?: () => void;
}

/**
 * CanvasElement — renders free-form sticky notes, shapes, text, and frames
 * with warm pastel styling, washi tape / pushpins, and organic hand-placed rotations.
 */
export default function CanvasElement({
  el,
  selected,
  scale,
  tool,
  onPointerDownBody,
  onPointerDownHandle,
  onStartConnector,
  onChangeText,
  onSelect,
}: CanvasElementProps) {
  const c = colorById(el.color);
  const palette = stickyPaletteById(el.color);
  const [editing, setEditing] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

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

  const rotation = useMemo(() => {
    if (el.rotation !== undefined && el.rotation !== 0) return el.rotation;
    if (isSticky) return getCardRotation(el.id);
    return 0;
  }, [el.rotation, el.id, isSticky]);

  const attachment = useMemo(() => {
    if (!isSticky) return null;
    return getCardAttachment(el.id);
  }, [el.id, isSticky]);

  const commonStyle: React.CSSProperties = {
    position: "absolute",
    left: el.x,
    top: el.y,
    width: el.w,
    height: el.h,
    transform: `rotate(${rotation}deg)`,
  };

  const bg = isText ? "transparent" : isSticky ? palette.bg : c.fill;
  const border = isText ? "none" : isSticky ? `1.5px solid ${palette.border}` : `1.5px solid ${c.stroke}`;
  const radius = el.kind === "ellipse" ? "50%" : isSticky ? "14px" : "10px";
  const textColor = isSticky ? palette.text : c.text;

  const startBody = (e: React.PointerEvent) => {
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
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (!isFrame) setEditing(true);
      }}
      className="group/element select-none transition-transform duration-150"
    >
      {/* Washi Tape or Pushpin on Sticky Note */}
      {isSticky && attachment && (
        <StickyAttachment
          type={attachment.type}
          rotation={attachment.rotation}
          offset={attachment.offset}
          tapeBg={palette.tapeBg}
          pinColor={palette.pinColor}
        />
      )}

      {/* Body */}
      <div
        style={{
          width: "100%",
          height: "100%",
          background: bg,
          border,
          borderRadius: radius,
          boxShadow: isSticky
            ? `0 12px 30px -8px ${palette.shadow}, 0 2px 6px rgba(0,0,0,0.04)`
            : "none",
          color: textColor,
        }}
        className={`relative flex flex-col ${
          isFrame ? "items-start justify-start p-3" : "items-center justify-between p-3.5"
        } overflow-hidden transition-all duration-150 ${
          selected
            ? "ring-2 ring-slate-900 dark:ring-white ring-offset-2 ring-offset-transparent shadow-xl"
            : "hover:shadow-md"
        }`}
      >
        {/* Frame label */}
        {isFrame && (
          <div className="absolute -top-6 left-0 text-[11px] font-semibold text-[var(--secondary)] px-2 py-0.5 rounded-lg bg-[var(--elevated)]/90 border border-[var(--border)] shadow-xs">
            {el.text || "Frame"}
          </div>
        )}

        {/* Sticky Note Category Pill */}
        {isSticky && (
          <div className="w-full flex items-center justify-between pb-1.5 border-b border-black/5 dark:border-white/5 pointer-events-none select-none">
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 opacity-80">
              <span>{palette.emoji}</span>
              <span>{palette.label}</span>
            </span>
          </div>
        )}

        {/* Text content / editor */}
        {!isFrame && (
          editing ? (
            <textarea
              ref={taRef}
              defaultValue={el.text}
              onBlur={(e) => {
                setEditing(false);
                onChangeText?.(el.id, e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") e.currentTarget.blur();
                if (e.key === "Enter" && isText && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
                e.stopPropagation();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              style={{ fontSize: el.fontSize || 13.5 }}
              className="w-full flex-1 bg-transparent outline-none resize-none text-left p-1 leading-relaxed font-medium placeholder-black/30 dark:placeholder-white/30"
              placeholder={isSticky ? "Write note..." : "Type text..."}
            />
          ) : (
            <div
              style={{ fontSize: el.fontSize || 13.5 }}
              className={`w-full flex-1 flex items-start text-left p-1 leading-relaxed whitespace-pre-wrap break-words font-medium overflow-hidden ${
                !el.text ? "opacity-40 italic" : ""
              } ${isText ? "font-bold" : ""}`}
            >
              {el.text || (isSticky ? "Double-click to write note" : "")}
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
              onPointerDown={(e) => {
                e.stopPropagation();
                onPointerDownHandle?.(el.id, h.id, e);
              }}
              style={{
                position: "absolute",
                left: `calc(${h.x * 100}% - 5px)`,
                top: `calc(${h.y * 100}% - 5px)`,
                width: 10,
                height: 10,
                cursor: h.cursor,
              }}
              className="rounded-xs bg-white border-2 border-[#d97706] shadow-sm z-30"
            />
          ))}

          {/* Connector handle nub */}
          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              onStartConnector?.(el.id, e);
            }}
            style={{
              position: "absolute",
              right: -12,
              top: "50%",
              transform: "translateY(-50%)",
            }}
            title="Drag to connect"
            className="w-5 h-5 rounded-full bg-[#d97706] border-2 border-white shadow-md cursor-crosshair opacity-0 group-hover/element:opacity-100 transition-all hover:scale-125 z-30 flex items-center justify-center text-white text-[9px] font-bold"
          >
            +
          </button>
        </>
      )}
    </div>
  );
}
