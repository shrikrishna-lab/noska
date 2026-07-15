/**
 * graphLayouts.js — deterministic layout algorithms for the Graph view.
 *
 * Each layout returns { [pageId]: {x, y} } positioned so that a node's
 * top-left sits such that its center (offset +80,+20 for the 160x40 pill)
 * lands on the computed point. All layouts operate on visible pages only.
 */

const NODE_OFFSET_X = 80;
const NODE_OFFSET_Y = 20;

function visible(pages) {
  return pages.filter((p) => !p.trashed);
}

function place(centerX, centerY) {
  return { x: centerX - NODE_OFFSET_X, y: centerY - NODE_OFFSET_Y };
}

// ── Concentric circle ─────────────────────────────────────────────────────────
// Favorites in the inner ring, everything else spread on an outer ring.
export function circleLayout(pages, cx = 500, cy = 380) {
  const vis = visible(pages);
  const positions = {};
  const inner = vis.filter((p) => p.favorite);
  const outer = vis.filter((p) => !p.favorite);

  const ringFor = (list, radius) => {
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
export function gridLayout(pages, startX = 160, startY = 140) {
  const vis = visible(pages);
  const positions = {};
  const cols = Math.max(1, Math.ceil(Math.sqrt(vis.length)));
  const gapX = 210;
  const gapY = 110;
  // Sort by cluster-ish grouping: parents first, then alpha by title
  const sorted = [...vis].sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  sorted.forEach((p, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    positions[p.id] = { x: startX + col * gapX, y: startY + row * gapY };
  });
  return positions;
}

// ── Radial tree (by hierarchy depth) ────────────────────────────────────────────
// Roots at center, children fan out on rings by depth. Non-tree pages ring the edge.
export function radialLayout(pages, cx = 520, cy = 400) {
  const vis = visible(pages);
  const idSet = new Set(vis.map((p) => p.id));
  const positions = {};

  const childrenOf = {};
  const roots = [];
  vis.forEach((p) => {
    if (p.parentId && idSet.has(p.parentId)) {
      (childrenOf[p.parentId] ||= []).push(p);
    } else {
      roots.push(p);
    }
  });

  const ringGap = 190;

  // Assign angular slices recursively; returns the angular span used.
  function layoutNode(node, depth, angleStart, angleEnd) {
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
    // A single root gets the whole circle for its descendants.
    if (roots.length === 1) layoutNode(root, 0, 0, 2 * Math.PI);
    else layoutNode(root, 0, i * fullSlice, (i + 1) * fullSlice);
  });

  // Multiple roots: nudge them onto a small inner ring instead of overlapping center.
  if (roots.length > 1) {
    const innerR = 70;
    roots.forEach((root, i) => {
      const a = (i / roots.length) * 2 * Math.PI - Math.PI / 2;
      positions[root.id] = place(cx + innerR * Math.cos(a), cy + innerR * Math.sin(a));
    });
  }
  return positions;
}

// ── Timeline (by last edited / created) ─────────────────────────────────────────
// Left→right chronological columns; jittered vertically to avoid overlap.
export function timelineLayout(pages, startX = 140, startY = 120) {
  const vis = visible(pages);
  const positions = {};
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
  { id: "force", label: "Force-directed", icon: "Sparkles" },
  { id: "radial", label: "Radial tree", icon: "GitBranch" },
  { id: "circle", label: "Concentric", icon: "CircleDot" },
  { id: "grid", label: "Grid", icon: "Grid3x3" },
  { id: "timeline", label: "Timeline", icon: "CalendarClock" },
];

export function computeLayout(id, pages, cx = 500, cy = 380) {
  switch (id) {
    case "radial": return radialLayout(pages, cx, cy);
    case "circle": return circleLayout(pages, cx, cy);
    case "grid": return gridLayout(pages);
    case "timeline": return timelineLayout(pages);
    default: return null; // "force" handled by existing physics solver
  }
}

// ── Degree map (for node sizing by connection count) ─────────────────────────────
export function computeDegrees(pages: any[], links: any[]): Record<string, number> {
  const deg: Record<string, number> = {};
  visible(pages).forEach((p) => { deg[p.id] = 0; });
  links.forEach((l) => {
    // link ids look like "<a>-<b>"; also support source/target fields
    const a = l.source || l.id?.split("-")[0];
    const b = l.target || l.id?.split("-")[1];
    if (a && deg[a] != null) deg[a]++;
    if (b && deg[b] != null) deg[b]++;
  });
  return deg;
}
