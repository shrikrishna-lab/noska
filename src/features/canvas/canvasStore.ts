// canvasStore.js — persistence + helpers for the enhanced Canvas whiteboard.
//
// Two localStorage keys per page keep backwards compatibility:
//   noska-canvas-pos-<pageId>   → { [blockId]: {x,y} }  (block card positions, legacy)
//   noska-canvas-data-<pageId>  → { version, elements, connectors, blockMeta }  (new)

export const CANVAS_VERSION = 2;

export const CARD_W = 320;
export const CARD_H = 170;
export const GRID = 24;

export const ELEMENT_KINDS = ["sticky", "rect", "ellipse", "text", "frame"];

// Notion-flavored palette usable for sticky notes, shapes and card accents.
export const CANVAS_COLORS = [
  { id: "default", label: "Default", fill: "var(--surface)", stroke: "var(--border-strong)", text: "var(--text)" },
  { id: "gray", label: "Gray", fill: "#8b8b8b22", stroke: "#8b8b8b", text: "var(--text)" },
  { id: "yellow", label: "Yellow", fill: "#fde68a55", stroke: "#f59e0b", text: "#7c5b09" },
  { id: "orange", label: "Orange", fill: "#fed7aa66", stroke: "#f97316", text: "#7c3a09" },
  { id: "green", label: "Green", fill: "#bbf7d066", stroke: "#22c55e", text: "#14532d" },
  { id: "blue", label: "Blue", fill: "#bfdbfe66", stroke: "#3b82f6", text: "#1e3a8a" },
  { id: "purple", label: "Purple", fill: "#e9d5ff66", stroke: "#a855f7", text: "#581c87" },
  { id: "pink", label: "Pink", fill: "#fbcfe866", stroke: "#ec4899", text: "#831843" },
  { id: "red", label: "Red", fill: "#fecaca66", stroke: "#ef4444", text: "#7f1d1d" },
];

export function colorById(id: string) {
  return CANVAS_COLORS.find((c) => c.id === id) || CANVAS_COLORS[0];
}

export function uid(prefix = "el") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function snap(value: number, enabled: boolean, grid = GRID) {
  if (!enabled) return value;
  return Math.round(value / grid) * grid;
}

// ── Positions (legacy key) ────────────────────────────────────────────────
export function loadPositions(pageId: string): Record<string, { x: number; y: number }> {
  try {
    return JSON.parse(localStorage.getItem(`noska-canvas-pos-${pageId}`) || "{}");
  } catch {
    return {};
  }
}

export function savePositions(pageId: string, positions: Record<string, { x: number; y: number }>) {
  try {
    localStorage.setItem(`noska-canvas-pos-${pageId}`, JSON.stringify(positions));
  } catch {
    /* ignore quota */
  }
}

export interface CanvasElementData {
  id: string;
  kind: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  color: string;
  text?: string;
  fontSize?: number;
}

export interface Connector {
  id: string;
  from: string;
  to: string;
  color?: string;
}

export interface CanvasData {
  version: number;
  elements: Record<string, CanvasElementData>;
  connectors: Connector[];
  blockMeta: Record<string, unknown>;
}

// ── Canvas data (elements / connectors / block meta) ──────────────────────
export function emptyData(): CanvasData {
  return { version: CANVAS_VERSION, elements: {}, connectors: [], blockMeta: {} };
}

export function loadCanvasData(pageId: string): CanvasData {
  try {
    const raw = JSON.parse(localStorage.getItem(`noska-canvas-data-${pageId}`) || "null");
    if (!raw || typeof raw !== "object") return emptyData();
    return {
      version: CANVAS_VERSION,
      elements: raw.elements || {},
      connectors: Array.isArray(raw.connectors) ? raw.connectors : [],
      blockMeta: raw.blockMeta || {},
    };
  } catch {
    return emptyData();
  }
}

export function saveCanvasData(pageId: string, data: CanvasData) {
  try {
    localStorage.setItem(`noska-canvas-data-${pageId}`, JSON.stringify(data));
  } catch {
    /* ignore quota */
  }
}

// Default geometry for a freshly created element of a given kind.
export function makeElement(kind: string, x: number, y: number): CanvasElementData {
  const base = { id: uid(kind), kind, x, y, rotation: 0, color: "default" };
  switch (kind) {
    case "sticky":
      return { ...base, w: 200, h: 200, text: "", color: "yellow", fontSize: 15 };
    case "rect":
      return { ...base, w: 220, h: 140, text: "" };
    case "ellipse":
      return { ...base, w: 180, h: 180, text: "" };
    case "text":
      return { ...base, w: 240, h: 44, text: "Text", fontSize: 20, color: "default" };
    case "frame":
      return { ...base, w: 520, h: 360, text: "Frame", color: "gray" };
    default:
      return { ...base, w: 200, h: 140, text: "" };
  }
}

export interface CanvasRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface CanvasItem {
  type: string;
  id?: string;
  el?: { x: number; y: number; w: number; h: number };
}

// Bounding box of an item (block card or element) in canvas coordinates.
export function itemRect(item: CanvasItem, positions: Record<string, { x: number; y: number }>): CanvasRect {
  if (item.type === "block") {
    const p = positions[item.id!] || { x: 0, y: 0 };
    return { x: p.x, y: p.y, w: CARD_W, h: CARD_H };
  }
  const el = item.el!;
  return { x: el.x, y: el.y, w: el.w, h: el.h };
}

export function rectCenter(r: CanvasRect) {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

// Anchor point on rect edge toward a target point (for tidy connector ends).
export function edgeAnchor(rect: CanvasRect, toward: { x: number; y: number }) {
  const c = rectCenter(rect);
  const dx = toward.x - c.x;
  const dy = toward.y - c.y;
  if (dx === 0 && dy === 0) return c;
  const halfW = rect.w / 2;
  const halfH = rect.h / 2;
  const scale = 1 / Math.max(Math.abs(dx) / halfW, Math.abs(dy) / halfH);
  return { x: c.x + dx * scale, y: c.y + dy * scale };
}
