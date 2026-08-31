// canvasStore.js — persistence + helpers for the enhanced Canvas whiteboard.
//
// Two localStorage keys per page keep backwards compatibility:
//   noska-canvas-pos-<pageId>   → { [blockId]: {x,y} }  (block card positions, legacy)
//   noska-canvas-data-<pageId>  → { version, elements, connectors, blockMeta }  (new)

export const CANVAS_VERSION = 2;

export const CARD_W = 310;
export const CARD_H = 190;
export const GRID = 24;

export const ELEMENT_KINDS = ["sticky", "rect", "ellipse", "text", "frame"];

// Executive studio palette tailored for office, product teams, and professional strategy boards
export const STICKY_PALETTES = [
  {
    id: "yellow",
    label: "Decision",
    emoji: "⚡",
    bg: "#fefce8",
    bgDark: "#262312",
    border: "#fef08a",
    borderDark: "#4a421b",
    text: "#854d0e",
    textDark: "#fef08a",
    shadow: "rgba(202, 138, 4, 0.12)",
    tapeBg: "rgba(254, 240, 138, 0.65)",
    pinColor: "#ca8a04"
  },
  {
    id: "blue",
    label: "Action Item",
    emoji: "🎯",
    bg: "#f0f9ff",
    bgDark: "#0c1f33",
    border: "#bae6fd",
    borderDark: "#18426b",
    text: "#0369a1",
    textDark: "#7dd3fc",
    shadow: "rgba(2, 132, 199, 0.12)",
    tapeBg: "rgba(186, 230, 253, 0.65)",
    pinColor: "#0284c7"
  },
  {
    id: "green",
    label: "Shipped",
    emoji: "✨",
    bg: "#f0fdf4",
    bgDark: "#0d2818",
    border: "#bbf7d0",
    borderDark: "#1a5330",
    text: "#15803d",
    textDark: "#86efac",
    shadow: "rgba(22, 163, 74, 0.12)",
    tapeBg: "rgba(187, 247, 208, 0.65)",
    pinColor: "#16a34a"
  },
  {
    id: "pink",
    label: "Blocker / Risk",
    emoji: "🚨",
    bg: "#fff1f2",
    bgDark: "#2d0e17",
    border: "#fecdd3",
    borderDark: "#5c182b",
    text: "#be123c",
    textDark: "#fda4af",
    shadow: "rgba(225, 29, 72, 0.12)",
    tapeBg: "rgba(254, 205, 211, 0.65)",
    pinColor: "#e11d48"
  },
  {
    id: "purple",
    label: "Milestone",
    emoji: "🏆",
    bg: "#faf5ff",
    bgDark: "#220e36",
    border: "#e9d5ff",
    borderDark: "#4c1c7a",
    text: "#7e22ce",
    textDark: "#d8b4fe",
    shadow: "rgba(147, 51, 234, 0.12)",
    tapeBg: "rgba(233, 213, 255, 0.65)",
    pinColor: "#9333ea"
  },
  {
    id: "peach",
    label: "Note",
    emoji: "📋",
    bg: "#f8fafc",
    bgDark: "#151922",
    border: "#e2e8f0",
    borderDark: "#2d3748",
    text: "#334155",
    textDark: "#cbd5e1",
    shadow: "rgba(100, 116, 139, 0.12)",
    tapeBg: "rgba(226, 232, 240, 0.65)",
    pinColor: "#64748b"
  }
];

export const CANVAS_COLORS = STICKY_PALETTES.map((p) => ({
  id: p.id,
  label: `${p.emoji} ${p.label}`,
  fill: p.bg,
  stroke: p.border,
  text: p.text,
  pinColor: p.pinColor,
  tapeBg: p.tapeBg
}));

export function colorById(id: string) {
  return CANVAS_COLORS.find((c) => c.id === id) || CANVAS_COLORS[0];
}

export function stickyPaletteById(id: string) {
  return STICKY_PALETTES.find((p) => p.id === id) || STICKY_PALETTES[0];
}

// Compute deterministic subtle organic tilt (-0.8deg to +0.8deg) for executive polish
export function getCardRotation(id: string): number {
  if (!id) return 0;
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const normalized = (Math.abs(hash) % 16) / 10 - 0.8; // range [-0.8, +0.8]
  return Math.round(normalized * 10) / 10;
}

// Deterministic executive palette assigned by item ID or custom color
export function getCardPalette(id: string, customColor?: string) {
  if (customColor) {
    const found = STICKY_PALETTES.find((p) => p.id === customColor);
    if (found) return found;
  }
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % STICKY_PALETTES.length;
  return STICKY_PALETTES[index];
}

// Deterministic decoration: alternate between washi tape and pushpin graphics
export function getCardAttachment(id: string): { type: "tape" | "pin"; rotation: number; offset: number } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const isTape = Math.abs(hash) % 2 === 0;
  const rotation = ((Math.abs(hash >> 3) % 12) - 6); // -6deg to +5deg
  const offset = ((Math.abs(hash >> 5) % 30) - 15); // -15px to +15px horizontal offset from center
  return {
    type: isTape ? "tape" : "pin",
    rotation,
    offset
  };
}

export function uid(prefix = "el") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function snap(value: number, enabled: boolean, grid = GRID) {
  if (!enabled) return value;
  return Math.round(value / grid) * grid;
}

export type ConnectorType = "leads_to" | "depends_on" | "blocks" | "related_to";

export interface ConnectorTypeConfig {
  id: ConnectorType;
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  colorDark: string;
  markerId: string;
  badgeBg: string;
}

export const CONNECTOR_TYPES: Record<ConnectorType, ConnectorTypeConfig> = {
  leads_to: {
    id: "leads_to",
    label: "Leads to",
    shortLabel: "Leads to",
    icon: "➔",
    color: "#059669",
    colorDark: "#10b981",
    markerId: "cv-arrow-leads-to",
    badgeBg: "rgba(16, 185, 129, 0.12)"
  },
  depends_on: {
    id: "depends_on",
    label: "Depends on",
    shortLabel: "Depends",
    icon: "⚡",
    color: "#d97706",
    colorDark: "#f59e0b",
    markerId: "cv-arrow-depends-on",
    badgeBg: "rgba(245, 158, 11, 0.12)"
  },
  blocks: {
    id: "blocks",
    label: "Blocks",
    shortLabel: "Blocks",
    icon: "🚫",
    color: "#e11d48",
    colorDark: "#f43f5e",
    markerId: "cv-arrow-blocks",
    badgeBg: "rgba(244, 63, 94, 0.12)"
  },
  related_to: {
    id: "related_to",
    label: "Related to",
    shortLabel: "Related",
    icon: "🔗",
    color: "#0284c7",
    colorDark: "#38bdf8",
    markerId: "cv-arrow-related-to",
    badgeBg: "rgba(14, 165, 233, 0.12)"
  }
};

export function getConnectorTypeConfig(type?: string): ConnectorTypeConfig {
  if (type && type in CONNECTOR_TYPES) {
    return CONNECTOR_TYPES[type as ConnectorType];
  }
  return CONNECTOR_TYPES.leads_to;
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
  type?: ConnectorType;
  label?: string;
  color?: string;
}

export interface CanvasBoardMeta {
  id: string;
  name: string;
  icon: string;
  template?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CanvasData {
  version: number;
  elements: Record<string, CanvasElementData>;
  connectors: Connector[];
  blockMeta: Record<string, unknown>;
}

// ── Multi-Board Persistence ───────────────────────────────────────────────

export function getBoardStorageKey(pageId: string, boardId?: string) {
  if (!boardId || boardId === "default" || boardId === "main") {
    return `noska-canvas-data-${pageId}`;
  }
  return `noska-canvas-data-${pageId}-${boardId}`;
}

export function getBoardPositionsKey(pageId: string, boardId?: string) {
  if (!boardId || boardId === "default" || boardId === "main") {
    return `noska-canvas-pos-${pageId}`;
  }
  return `noska-canvas-pos-${pageId}-${boardId}`;
}

export function loadBoardList(pageId: string): CanvasBoardMeta[] {
  try {
    const raw = JSON.parse(localStorage.getItem(`noska-canvas-boards-${pageId}`) || "null");
    if (Array.isArray(raw) && raw.length > 0) return raw;
  } catch {
    /* ignore */
  }
  return [
    {
      id: "main",
      name: "Main Canvas",
      icon: "🎨",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
}

export function saveBoardList(pageId: string, boards: CanvasBoardMeta[]) {
  try {
    localStorage.setItem(`noska-canvas-boards-${pageId}`, JSON.stringify(boards));
  } catch {
    /* ignore quota */
  }
}

export function createBoard(pageId: string, name: string, template?: string): CanvasBoardMeta {
  const boards = loadBoardList(pageId);
  const id = uid("board");
  const newBoard: CanvasBoardMeta = {
    id,
    name: name.trim() || "Untitled Board",
    icon: template === "sprint_retro" ? "🔄" : template === "product_roadmap" ? "🚀" : template === "brainstorm_matrix" ? "💡" : template === "okr_tree" ? "🎯" : "🎨",
    template,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  boards.push(newBoard);
  saveBoardList(pageId, boards);

  // Initialize board template data if requested
  if (template && template in BOARD_TEMPLATES) {
    const initialData = generateTemplateData(template);
    saveCanvasData(pageId, initialData, id);
  }

  return newBoard;
}

export function deleteBoard(pageId: string, boardId: string): CanvasBoardMeta[] {
  const boards = loadBoardList(pageId).filter(b => b.id !== boardId);
  const finalBoards = boards.length > 0 ? boards : [
    { id: "main", name: "Main Canvas", icon: "🎨", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ];
  saveBoardList(pageId, finalBoards);
  try {
    localStorage.removeItem(getBoardStorageKey(pageId, boardId));
    localStorage.removeItem(getBoardPositionsKey(pageId, boardId));
  } catch {
    /* ignore */
  }
  return finalBoards;
}

export function duplicateBoard(pageId: string, boardId: string): CanvasBoardMeta {
  const boards = loadBoardList(pageId);
  const source = boards.find(b => b.id === boardId) || boards[0];
  const newId = uid("board");
  const newBoard: CanvasBoardMeta = {
    id: newId,
    name: `${source.name} (Copy)`,
    icon: source.icon,
    template: source.template,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const sourceData = loadCanvasData(pageId, boardId);
  saveCanvasData(pageId, sourceData, newId);

  const sourcePositions = loadPositions(pageId, boardId);
  savePositions(pageId, sourcePositions, newId);

  boards.push(newBoard);
  saveBoardList(pageId, boards);
  return newBoard;
}

// ── Positions ─────────────────────────────────────────────────────────────
export function loadPositions(pageId: string, boardId?: string): Record<string, { x: number; y: number }> {
  try {
    return JSON.parse(localStorage.getItem(getBoardPositionsKey(pageId, boardId)) || "{}");
  } catch {
    return {};
  }
}

export function savePositions(pageId: string, positions: Record<string, { x: number; y: number }>, boardId?: string) {
  try {
    localStorage.setItem(getBoardPositionsKey(pageId, boardId), JSON.stringify(positions));
  } catch {
    /* ignore quota */
  }
}

// ── Canvas data (elements / connectors / block meta) ──────────────────────
export function emptyData(): CanvasData {
  return { version: CANVAS_VERSION, elements: {}, connectors: [], blockMeta: {} };
}

export function loadCanvasData(pageId: string, boardId?: string): CanvasData {
  try {
    const raw = JSON.parse(localStorage.getItem(getBoardStorageKey(pageId, boardId)) || "null");
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

export function saveCanvasData(pageId: string, data: CanvasData, boardId?: string) {
  try {
    localStorage.setItem(getBoardStorageKey(pageId, boardId), JSON.stringify(data));
  } catch {
    /* ignore quota */
  }
}

// ── 1-Click Board Templates ───────────────────────────────────────────────

export const BOARD_TEMPLATES: Record<string, { id: string; name: string; description: string; icon: string }> = {
  sprint_retro: {
    id: "sprint_retro",
    name: "Sprint Retrospective",
    description: "What went well, what could be improved, and clear action items",
    icon: "🔄"
  },
  product_roadmap: {
    id: "product_roadmap",
    name: "Product Roadmap",
    description: "Sequential release stages from Discovery to Launch with dependency connectors",
    icon: "🚀"
  },
  brainstorm_matrix: {
    id: "brainstorm_matrix",
    name: "Effort vs. Impact Matrix",
    description: "Quadrant framework to prioritize high-impact quick wins",
    icon: "💡"
  },
  okr_tree: {
    id: "okr_tree",
    name: "Company OKR Tree",
    description: "Top-level annual objectives connected to measurable quarterly key results",
    icon: "🎯"
  }
};

export function generateTemplateData(templateId: string): CanvasData {
  const elements: Record<string, CanvasElementData> = {};
  const connectors: Connector[] = [];

  if (templateId === "sprint_retro") {
    // 3 Columns: Went Well (Green), Needs Improvement (Pink), Action Items (Blue)
    const col1 = uid("el");
    const col2 = uid("el");
    const col3 = uid("el");

    elements[col1] = { id: col1, kind: "frame", x: 60, y: 60, w: 320, h: 560, rotation: 0, color: "green", text: "🌟 What Went Well" };
    elements[col2] = { id: col2, kind: "frame", x: 420, y: 60, w: 320, h: 560, rotation: 0, color: "pink", text: "❓ What Could Be Improved" };
    elements[col3] = { id: col3, kind: "frame", x: 780, y: 60, w: 320, h: 560, rotation: 0, color: "blue", text: "✅ Action Items" };

    const s1 = uid("el");
    const s2 = uid("el");
    const s3 = uid("el");
    const s4 = uid("el");

    elements[s1] = { id: s1, kind: "sticky", x: 90, y: 140, w: 260, h: 160, rotation: -1.5, color: "green", text: "Fast turnaround on the authentication rewrite! 🚀" };
    elements[s2] = { id: s2, kind: "sticky", x: 90, y: 340, w: 260, h: 160, rotation: 1.2, color: "green", text: "Great team alignment during async standups." };
    elements[s3] = { id: s3, kind: "sticky", x: 450, y: 140, w: 260, h: 160, rotation: 2.1, color: "pink", text: "Unclear API specs delayed mobile QA testing." };
    elements[s4] = { id: s4, kind: "sticky", x: 810, y: 140, w: 260, h: 160, rotation: -1.8, color: "blue", text: "Enforce OpenAPI spec review before sprint start." };

    connectors.push({ id: uid("conn"), from: s3, to: s4, type: "leads_to", label: "Resolves" });
  } else if (templateId === "product_roadmap") {
    // Q1 Discovery → Q2 Build → Q3 Launch Flow
    const n1 = uid("el");
    const n2 = uid("el");
    const n3 = uid("el");
    const n4 = uid("el");

    elements[n1] = { id: n1, kind: "sticky", x: 80, y: 180, w: 250, h: 170, rotation: -1.4, color: "yellow", text: "1. User Research & Needs Discovery" };
    elements[n2] = { id: n2, kind: "sticky", x: 400, y: 180, w: 250, h: 170, rotation: 1.8, color: "blue", text: "2. Realtime Sync & Offline Storage Engine" };
    elements[n3] = { id: n3, kind: "sticky", x: 720, y: 180, w: 250, h: 170, rotation: -2.1, color: "peach", text: "3. Enterprise Security & Audit Logs" };
    elements[n4] = { id: n4, kind: "sticky", x: 1040, y: 180, w: 250, h: 170, rotation: 1.2, color: "green", text: "4. Public Launch & Marketplace" };

    connectors.push({ id: uid("conn"), from: n1, to: n2, type: "leads_to", label: "Leads to" });
    connectors.push({ id: uid("conn"), from: n2, to: n3, type: "depends_on", label: "Depends on" });
    connectors.push({ id: uid("conn"), from: n3, to: n4, type: "leads_to", label: "Unlocks" });
  } else if (templateId === "brainstorm_matrix") {
    // 2x2 Matrix: High Impact / Low Effort
    const f1 = uid("el");
    const f2 = uid("el");
    elements[f1] = { id: f1, kind: "frame", x: 80, y: 80, w: 480, h: 360, rotation: 0, color: "green", text: "⚡ Quick Wins (High Impact, Low Effort)" };
    elements[f2] = { id: f2, kind: "frame", x: 600, y: 80, w: 480, h: 360, rotation: 0, color: "purple", text: "💎 Strategic Bets (High Impact, High Effort)" };

    const s1 = uid("el");
    const s2 = uid("el");
    elements[s1] = { id: s1, kind: "sticky", x: 120, y: 160, w: 220, h: 150, rotation: -1.2, color: "yellow", text: "Keyboard shortcuts for lightning-fast note creation." };
    elements[s2] = { id: s2, kind: "sticky", x: 640, y: 160, w: 220, h: 150, rotation: 1.5, color: "purple", text: "Whole-board AI reasoning and diagram generator." };
  } else if (templateId === "okr_tree") {
    const obj = uid("el");
    const kr1 = uid("el");
    const kr2 = uid("el");

    elements[obj] = { id: obj, kind: "sticky", x: 440, y: 80, w: 280, h: 160, rotation: 0, color: "purple", text: "🎯 Objective: Become the #1 collaborative workspace for creators" };
    elements[kr1] = { id: kr1, kind: "sticky", x: 240, y: 320, w: 250, h: 150, rotation: -1.6, color: "blue", text: "KR 1: Reach 100k active monthly canvases" };
    elements[kr2] = { id: kr2, kind: "sticky", x: 640, y: 320, w: 250, h: 150, rotation: 1.9, color: "green", text: "KR 2: Maintain 99.99% realtime sync uptime" };

    connectors.push({ id: uid("conn"), from: obj, to: kr1, type: "leads_to", label: "Measurable by" });
    connectors.push({ id: uid("conn"), from: obj, to: kr2, type: "leads_to", label: "Measurable by" });
  }

  return {
    version: CANVAS_VERSION,
    elements,
    connectors,
    blockMeta: {}
  };
}

// ── Auto-Tidy Engine (Topological DAG Layout) ─────────────────────────────

export function autoTidyCanvas(
  elements: Record<string, CanvasElementData>,
  connectors: Connector[],
  positions: Record<string, { x: number; y: number }>
): { elements: Record<string, CanvasElementData>; positions: Record<string, { x: number; y: number }> } {
  const newElements: Record<string, CanvasElementData> = { ...elements };
  const newPositions: Record<string, { x: number; y: number }> = { ...positions };

  const allItemIds = [
    ...Object.keys(elements).filter(id => elements[id].kind !== "frame"),
    ...Object.keys(positions)
  ];
  if (allItemIds.length === 0) return { elements: newElements, positions: newPositions };

  // Build in-degree and adjacency map
  const inDegree: Record<string, number> = {};
  const adj: Record<string, string[]> = {};

  for (const id of allItemIds) {
    inDegree[id] = 0;
    adj[id] = [];
  }

  for (const conn of connectors) {
    if (inDegree[conn.to] !== undefined && adj[conn.from]) {
      inDegree[conn.to] = (inDegree[conn.to] || 0) + 1;
      adj[conn.from].push(conn.to);
    }
  }

  // Assign topological rank layers
  const rank: Record<string, number> = {};
  const queue: string[] = allItemIds.filter(id => (inDegree[id] || 0) === 0);

  for (const id of queue) {
    rank[id] = 0;
  }

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const currRank = rank[curr] || 0;
    for (const next of adj[curr] || []) {
      rank[next] = Math.max(rank[next] || 0, currRank + 1);
      inDegree[next]--;
      if (inDegree[next] === 0) {
        queue.push(next);
      }
    }
  }

  // Group items by rank layer
  const layers: Record<number, string[]> = {};
  for (const id of allItemIds) {
    const r = rank[id] ?? 0;
    if (!layers[r]) layers[r] = [];
    layers[r].push(id);
  }

  // Layout horizontally (Left to Right flow) with organic vertical offsets
  const startX = 100;
  const startY = 120;
  const colSpacing = 340;
  const rowSpacing = 240;

  Object.keys(layers).forEach(layerKey => {
    const r = Number(layerKey);
    const itemIdsInLayer = layers[r];
    itemIdsInLayer.forEach((id, rowIdx) => {
      const x = startX + r * colSpacing;
      const y = startY + rowIdx * rowSpacing;

      if (newElements[id]) {
        newElements[id] = {
          ...newElements[id],
          x,
          y
        };
      }
      if (newPositions[id]) {
        newPositions[id] = { x, y };
      }
    });
  });

  return { elements: newElements, positions: newPositions };
}

// ── Smart Connector Auto-Suggest Helper ───────────────────────────────────

export function autoSuggestConnections(
  elements: Record<string, CanvasElementData>,
  existingConnectors: Connector[]
): Connector[] {
  const suggestions: Connector[] = [];
  const existingPairs = new Set(existingConnectors.map(c => `${c.from}->${c.to}`));

  const noteList = Object.values(elements).filter(e => e.kind === "sticky");

  // Pair Question notes (pink) with Done (green) or Idea (yellow) notes in proximity
  for (const q of noteList.filter(e => e.color === "pink")) {
    const nearby = noteList.filter(e => (e.color === "green" || e.color === "yellow") && e.id !== q.id);
    for (const target of nearby) {
      const pairKey = `${q.id}->${target.id}`;
      if (!existingPairs.has(pairKey)) {
        suggestions.push({
          id: uid("conn"),
          from: q.id,
          to: target.id,
          type: "leads_to",
          label: "Resolves"
        });
        existingPairs.add(pairKey);
        if (suggestions.length >= 3) break;
      }
    }
  }

  // Pair sequential tasks (blue notes)
  const taskNotes = noteList.filter(e => e.color === "blue");
  for (let i = 0; i < taskNotes.length - 1; i++) {
    const pairKey = `${taskNotes[i].id}->${taskNotes[i+1].id}`;
    if (!existingPairs.has(pairKey)) {
      suggestions.push({
        id: uid("conn"),
        from: taskNotes[i].id,
        to: taskNotes[i+1].id,
        type: "depends_on",
        label: "Next task"
      });
      existingPairs.add(pairKey);
      if (suggestions.length >= 4) break;
    }
  }

  return suggestions;
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
