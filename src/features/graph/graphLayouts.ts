/**
 * graphLayouts.ts — layout algorithms & 2D/3D coordinate engines for Noska Graph View.
 *
 * Supports:
 * 1. 🌌 Constellation Hub Layout (Image 1 reference)
 * 2. 📊 2D Metric Scatter Matrix (Image 2 reference)
 * 3. 🪐 3D Holographic Orbit Galaxy (Image 3 reference)
 * 4. Classic layouts (Radial Tree, Concentric Circle, Grid, Timeline, Force)
 */

export const NODE_OFFSET_X = 80;
export const NODE_OFFSET_Y = 20;

export function visible(pages: any[]) {
  return (pages || []).filter((p) => !p.trashed);
}

export function place(centerX: number, centerY: number) {
  return { x: centerX - NODE_OFFSET_X, y: centerY - NODE_OFFSET_Y };
}

// ── Degree map ───────────────────────────────────────────────────────────────
export function computeDegrees(pages: any[], links: any[]): Record<string, number> {
  const deg: Record<string, number> = {};
  visible(pages).forEach((p) => { deg[p.id] = 0; });
  (links || []).forEach((l) => {
    const a = l.source || l.id?.split("-")[0];
    const b = l.target || l.id?.split("-")[1];
    if (a && deg[a] != null) deg[a]++;
    if (b && deg[b] != null) deg[b]++;
  });
  return deg;
}

// ── 1. Constellation Hub Layout (Image 1 reference) ──────────────────────────
// Groups pages into constellation clusters around high-connectivity hubs with sunburst radial rays
export function constellationLayout(pages: any[], links: any[], cx = 520, cy = 400) {
  const vis = visible(pages);
  const positions: Record<string, { x: number; y: number }> = {};
  if (vis.length === 0) return positions;

  const deg = computeDegrees(pages, links);
  
  // Sort pages by degree: top connected pages become cluster sun hubs
  const sorted = [...vis].sort((a, b) => (deg[b.id] || 0) - (deg[a.id] || 0));
  const numHubs = Math.min(5, Math.max(1, Math.floor(vis.length / 4)));
  const hubs = sorted.slice(0, numHubs);
  const hubIds = new Set(hubs.map(h => h.id));

  // Position hubs in a celestial ring
  const hubRadius = Math.min(320, 140 + numHubs * 35);
  const hubPositions: Record<string, { x: number; y: number }> = {};

  if (numHubs === 1) {
    hubPositions[hubs[0].id] = { x: cx, y: cy };
  } else {
    // Put primary hub at center, other hubs on ring
    hubPositions[hubs[0].id] = { x: cx, y: cy };
    hubs.slice(1).forEach((hub, i) => {
      const angle = ((i * 2 * Math.PI) / (numHubs - 1)) - Math.PI / 2;
      hubPositions[hub.id] = {
        x: cx + hubRadius * Math.cos(angle),
        y: cy + hubRadius * Math.sin(angle)
      };
    });
  }

  // Assign each non-hub page to its nearest connected hub, or distribute evenly
  const satellites: Record<string, any[]> = {};
  hubs.forEach(h => { satellites[h.id] = []; });

  sorted.slice(numHubs).forEach((page, idx) => {
    // Find if page links to any hub
    let assignedHubId = hubs[0].id;
    for (const h of hubs) {
      if (links.some(l => l.id.includes(h.id) && l.id.includes(page.id))) {
        assignedHubId = h.id;
        break;
      }
    }
    satellites[assignedHubId].push(page);
  });

  // Lay out hubs and their constellation sunburst rays
  hubs.forEach(hub => {
    const hPos = hubPositions[hub.id];
    positions[hub.id] = place(hPos.x, hPos.y);

    const satList = satellites[hub.id] || [];
    const satCount = satList.length;
    satList.forEach((sat, i) => {
      const angle = (i * 2 * Math.PI) / Math.max(1, satCount);
      const satRadius = 80 + (i % 3) * 35;
      positions[sat.id] = place(
        hPos.x + satRadius * Math.cos(angle),
        hPos.y + satRadius * Math.sin(angle)
      );
    });
  });

  return positions;
}

// ── 2. 2D Metric Scatter Matrix Layout (Image 2 reference) ───────────────────
export type MetricType = "connections" | "wordCount" | "recency" | "depth";

export interface MetricConfig {
  id: MetricType;
  label: string;
  minLabel: string;
  maxLabel: string;
}

export const SCATTER_METRICS: Record<MetricType, MetricConfig> = {
  connections: {
    id: "connections",
    label: "Connectivity (Links)",
    minLabel: "Few Links",
    maxLabel: "Highly Connected"
  },
  wordCount: {
    id: "wordCount",
    label: "Content Density (Words)",
    minLabel: "Brief Notes",
    maxLabel: "Detailed Docs"
  },
  recency: {
    id: "recency",
    label: "Last Updated (Recency)",
    minLabel: "Older",
    maxLabel: "Recently Active"
  },
  depth: {
    id: "depth",
    label: "Hierarchy Depth",
    minLabel: "Top Root",
    maxLabel: "Deep Nested"
  }
};

export function getPageMetricValue(page: any, metric: MetricType, degMap: Record<string, number>): number {
  switch (metric) {
    case "connections":
      return degMap[page.id] || 0;
    case "wordCount": {
      const text = (page.blocks || []).map((b: any) => b.text || "").join(" ");
      return text.length > 0 ? text.split(/\s+/).length : Math.max(1, (page.title || "").length * 2);
    }
    case "recency": {
      const time = new Date(page.updatedAt || page.createdAt || 0).getTime();
      return isNaN(time) ? Date.now() : time;
    }
    case "depth": {
      let depth = 0;
      let curr = page;
      while (curr?.parentId && depth < 6) {
        depth++;
        curr = null; // simple 1-step depth or hierarchy count
      }
      return depth;
    }
    default:
      return 0;
  }
}

export function computeScatterPositions(
  pages: any[],
  links: any[],
  xMetric: MetricType = "connections",
  yMetric: MetricType = "wordCount",
  bounds = { startX: 160, startY: 120, width: 880, height: 560 }
): {
  positions: Record<string, { x: number; y: number }>;
  nodeValues: Record<string, { xVal: number; yVal: number; xNorm: number; yNorm: number }>;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
} {
  const vis = visible(pages);
  const degMap = computeDegrees(pages, links);
  const positions: Record<string, { x: number; y: number }> = {};
  const nodeValues: Record<string, { xVal: number; yVal: number; xNorm: number; yNorm: number }> = {};

  if (vis.length === 0) {
    return { positions, nodeValues, xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
  }

  const rawValues = vis.map(p => ({
    id: p.id,
    x: getPageMetricValue(p, xMetric, degMap),
    y: getPageMetricValue(p, yMetric, degMap)
  }));

  const xMin = Math.min(...rawValues.map(v => v.x));
  const xMax = Math.max(...rawValues.map(v => v.x));
  const yMin = Math.min(...rawValues.map(v => v.y));
  const yMax = Math.max(...rawValues.map(v => v.y));

  const hasVariationX = xMax > xMin;
  const hasVariationY = yMax > yMin;

  rawValues.forEach(val => {
    // When min === max (e.g. 1 note or identical metric values), place in quadrant center (0.5)
    const xNorm = hasVariationX ? (val.x - xMin) / (xMax - xMin) : 0.5;
    const yNorm = hasVariationY ? (val.y - yMin) / (yMax - yMin) : 0.5;

    // Coordinate mapping: Y-axis points upward (lower screen Y)
    // Add 10% padding within grid bounds
    const innerStartX = bounds.startX + bounds.width * 0.08;
    const innerWidth = bounds.width * 0.84;
    const innerStartY = bounds.startY + bounds.height * 0.08;
    const innerHeight = bounds.height * 0.84;

    const posX = innerStartX + xNorm * innerWidth;
    const posY = innerStartY + (1 - yNorm) * innerHeight;

    positions[val.id] = place(posX, posY);
    nodeValues[val.id] = { xVal: val.x, yVal: val.y, xNorm, yNorm };
  });

  return { positions, nodeValues, xMin, xMax, yMin, yMax };
}

// ── 3. 3D Holographic Orbit Galaxy (Image 3 reference) ───────────────────────
export interface Orbit3DNode {
  id: string;
  page: any;
  x3d: number;
  y3d: number;
  z3d: number;
  radius: number;
  category: string;
  color: string;
  screenX: number;
  screenY: number;
  screenScale: number;
  screenAlpha: number;
}

export function compute3DOrbitPositions(
  pages: any[],
  links: any[],
  rotationAngle = 0,
  pitchAngle = 0.35,
  cx = 500,
  cy = 380
): {
  coreNodes: Orbit3DNode[];
  ribbonNodes: Orbit3DNode[];
  allProjected: Orbit3DNode[];
} {
  const vis = visible(pages);
  const degMap = computeDegrees(pages, links);
  const allProjected: Orbit3DNode[] = [];
  const coreNodes: Orbit3DNode[] = [];
  const ribbonNodes: Orbit3DNode[] = [];

  const fov = 650; // Perspective depth field

  // Divide into Core Sphere vs Equatorial Ribbon Nodes
  const sorted = [...vis].sort((a, b) => (degMap[b.id] || 0) - (degMap[a.id] || 0));
  const coreCount = Math.min(6, Math.max(1, Math.floor(vis.length / 3)));

  sorted.forEach((page, idx) => {
    const isCore = idx < coreCount;
    let x3d = 0, y3d = 0, z3d = 0;

    if (isCore) {
      // Golden Spiral Spherical distribution on Core Globe (radius ~ 130px)
      const r = 130;
      const phi = Math.acos(1 - (2 * (idx + 0.5)) / coreCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * idx + rotationAngle;
      x3d = r * Math.sin(phi) * Math.cos(theta);
      y3d = r * Math.cos(phi);
      z3d = r * Math.sin(phi) * Math.sin(theta);
    } else {
      // Equatorial Orbital Ring Ribbon (radius ~ 280px to 380px)
      const ringIdx = idx - coreCount;
      const ringTotal = Math.max(1, vis.length - coreCount);
      const r = 260 + (ringIdx % 2) * 60;
      const theta = (ringIdx * 2 * Math.PI) / ringTotal + rotationAngle;
      x3d = r * Math.cos(theta);
      y3d = Math.sin(theta * 2) * 20; // gentle organic wobble
      z3d = r * Math.sin(theta);
    }

    // 3D Pitch Rotation (around X-axis)
    const cosP = Math.cos(pitchAngle);
    const sinP = Math.sin(pitchAngle);
    const rotY = y3d * cosP - z3d * sinP;
    const rotZ = y3d * sinP + z3d * cosP;

    // Perspective Projection
    const scaleProj = fov / (fov + rotZ);
    const screenX = cx + x3d * scaleProj;
    const screenY = cy + rotY * scaleProj;
    const screenAlpha = Math.max(0.25, Math.min(1.0, 0.65 + (rotZ / fov) * 0.45));

    const node3d: Orbit3DNode = {
      id: page.id,
      page,
      x3d,
      y3d: rotY,
      z3d: rotZ,
      radius: isCore ? 130 : 280,
      category: page.tags?.[0] || (isCore ? "Core" : "Resource"),
      color: isCore ? "#f59e0b" : "#3b82f6",
      screenX,
      screenY,
      screenScale: scaleProj,
      screenAlpha
    };

    allProjected.push(node3d);
    if (isCore) coreNodes.push(node3d);
    else ribbonNodes.push(node3d);
  });

  // Sort by depth (z3d) so background objects render behind foreground objects
  allProjected.sort((a, b) => a.z3d - b.z3d);

  return { coreNodes, ribbonNodes, allProjected };
}

// ── Concentric circle ────────────────────────────────────────────────────────
export function circleLayout(pages: any[], cx = 500, cy = 380) {
  const vis = visible(pages);
  const positions: Record<string, { x: number; y: number }> = {};
  const inner = vis.filter((p) => p.favorite);
  const outer = vis.filter((p) => !p.favorite);

  const ringFor = (list: any[], radius: number) => {
    const n = list.length;
    list.forEach((p, i) => {
      const angle = (i / Math.max(1, n)) * 2 * Math.PI - Math.PI / 2;
      positions[p.id] = place(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
    });
  };

  const outerR = Math.min(520, 160 + outer.length * 26);
  ringFor(outer, outerR);
  ringFor(inner, Math.max(90, outerR * 0.42));
  return positions;
}

// ── Grid ──────────────────────────────────────────────────────────────────────
export function gridLayout(pages: any[], startX = 160, startY = 140) {
  const vis = visible(pages);
  const positions: Record<string, { x: number; y: number }> = {};
  const cols = Math.max(1, Math.ceil(Math.sqrt(vis.length)));
  const gapX = 210;
  const gapY = 110;
  const sorted = [...vis].sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  sorted.forEach((p, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    positions[p.id] = { x: startX + col * gapX, y: startY + row * gapY };
  });
  return positions;
}

// ── Radial tree (by hierarchy depth) ──────────────────────────────────────────
export function radialLayout(pages: any[], cx = 520, cy = 400) {
  const vis = visible(pages);
  const idSet = new Set(vis.map((p) => p.id));
  const positions: Record<string, { x: number; y: number }> = {};

  const childrenOf: Record<string, any[]> = {};
  const roots: any[] = [];
  vis.forEach((p) => {
    if (p.parentId && idSet.has(p.parentId)) {
      (childrenOf[p.parentId] ||= []).push(p);
    } else {
      roots.push(p);
    }
  });

  const ringGap = 190;

  function layoutNode(node: any, depth: number, angleStart: number, angleEnd: number) {
    const mid = (angleStart + angleEnd) / 2;
    const radius = depth * ringGap;
    if (depth === 0) {
      positions[node.id] = place(cx, cy);
    } else {
      positions[node.id] = place(cx + radius * Math.cos(mid), cy + radius * Math.sin(mid));
    }
    const kids = childrenOf[node.id] || [];
    if (!kids.length) return;
    const slice = (angleEnd - angleStart) / kids.length;
    kids.forEach((kid, i) => {
      layoutNode(kid, depth + 1, angleStart + i * slice, angleStart + (i + 1) * slice);
    });
  }

  if (roots.length === 0) return circleLayout(pages, cx, cy);

  const fullSlice = (2 * Math.PI) / roots.length;
  roots.forEach((root, i) => {
    if (roots.length === 1) layoutNode(root, 0, 0, 2 * Math.PI);
    else layoutNode(root, 0, i * fullSlice, (i + 1) * fullSlice);
  });

  if (roots.length > 1) {
    const innerR = 70;
    roots.forEach((root, i) => {
      const a = (i / roots.length) * 2 * Math.PI - Math.PI / 2;
      positions[root.id] = place(cx + innerR * Math.cos(a), cy + innerR * Math.sin(a));
    });
  }
  return positions;
}

// ── Timeline ─────────────────────────────────────────────────────────────────
export function timelineLayout(pages: any[], startX = 140, startY = 120) {
  const vis = visible(pages);
  const positions: Record<string, { x: number; y: number }> = {};
  const withTime = [...vis].sort((a, b) => {
    const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return ta - tb;
  });
  const perCol = Math.max(1, Math.ceil(withTime.length / Math.max(1, Math.ceil(withTime.length / 6))));
  const gapX = 220;
  const gapY = 96;
  withTime.forEach((p, i) => {
    const col = Math.floor(i / perCol);
    const row = i % perCol;
    positions[p.id] = { x: startX + col * gapX, y: startY + row * gapY + (col % 2) * (gapY / 2) };
  });
  return positions;
}

export const LAYOUTS = [
  { id: "constellation", label: "Constellation Hubs", icon: "Sparkles" },
  { id: "force", label: "Force-directed", icon: "Activity" },
  { id: "radial", label: "Radial tree", icon: "GitBranch" },
  { id: "circle", label: "Concentric", icon: "CircleDot" },
  { id: "grid", label: "Grid", icon: "Grid3x3" },
  { id: "timeline", label: "Timeline", icon: "CalendarClock" },
];

export function computeLayout(id: string, pages: any[], links: any[] = [], cx = 500, cy = 380) {
  switch (id) {
    case "constellation": return constellationLayout(pages, links, cx, cy);
    case "radial": return radialLayout(pages, cx, cy);
    case "circle": return circleLayout(pages, cx, cy);
    case "grid": return gridLayout(pages);
    case "timeline": return timelineLayout(pages);
    default: return null;
  }
}
