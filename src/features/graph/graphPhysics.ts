/**
 * Simple Force-Directed Layout Solver for Noska Graph View
 */
export function autoArrangeLayout(pages, links, initialPositions = {}, centerX = 500, centerY = 350) {
  const visiblePages = pages.filter((p) => !p.trashed);
  const nodeCount = visiblePages.length;
  if (nodeCount === 0) return {};

  // Clone or initialize positions
  const positions = {};
  visiblePages.forEach((page, idx) => {
    if (initialPositions[page.id]) {
      positions[page.id] = { ...initialPositions[page.id] };
    } else {
      // Circle layout start
      const angle = (idx / nodeCount) * 2 * Math.PI;
      const radius = Math.min(220, nodeCount * 50 + 80);
      positions[page.id] = {
        x: centerX + radius * Math.cos(angle) - 80,
        y: centerY + radius * Math.sin(angle) - 20
      };
    }
  });

  // Parameters
  const kRepulsion = 15000;  // Repulsion coefficient
  const kAttraction = 0.04;  // Spring attraction coefficient
  const restLength = 120;   // Desired spring length
  const kGravity = 0.03;     // Pull to center coefficient
  const dampening = 0.85;   // Velocity dampening factor
  const iterations = 80;    // Sim steps

  // Velocities
  const velocities = {};
  visiblePages.forEach((page) => {
    velocities[page.id] = { x: 0, y: 0 };
  });

  for (let step = 0; step < iterations; step++) {
    // 1. Calculate repulsion forces (between all pairs of nodes)
    visiblePages.forEach((n1) => {
      visiblePages.forEach((n2) => {
        if (n1.id === n2.id) return;
        const p1 = positions[n1.id];
        const p2 = positions[n2.id];
        let dx = p1.x - p2.x;
        let dy = p1.y - p2.y;
        let distSq = dx * dx + dy * dy;
        if (distSq < 100) {
          // Prevent division by zero or extreme forces
          dx = Math.random() - 0.5;
          dy = Math.random() - 0.5;
          distSq = 100;
        }
        const dist = Math.sqrt(distSq);
        const force = kRepulsion / distSq;
        velocities[n1.id].x += (dx / dist) * force;
        velocities[n1.id].y += (dy / dist) * force;
      });
    });

    // 2. Calculate attraction forces (along link connections)
    links.forEach((link) => {
      // link object contains page ids or parentIds
      const pageId1 = link.source || link.id?.split("-")[0];
      const pageId2 = link.target || link.id?.split("-")[1];
      const p1 = positions[pageId1];
      const p2 = positions[pageId2];
      if (!p1 || !p2) return;

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) return;

      // Strength based on link type (hierarchy = strongest, mention = medium, tags = softest)
      const strength = link.type === "hierarchy" ? kAttraction * 1.5 : link.type === "mention" ? kAttraction * 1.2 : kAttraction * 0.85;
      const force = (dist - restLength) * strength;

      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      velocities[pageId1].x += fx;
      velocities[pageId1].y += fy;
      velocities[pageId2].x -= fx;
      velocities[pageId2].y -= fy;
    });

    // 3. Gravity/Center force & Update positions
    visiblePages.forEach((page) => {
      const pos = positions[page.id];
      const vel = velocities[page.id];

      // Gravity towards central coordinates
      const dxCenter = centerX - (pos.x + 80);
      const dyCenter = centerY - (pos.y + 20);
      vel.x += dxCenter * kGravity;
      vel.y += dyCenter * kGravity;

      // Apply changes & cap max speeds
      pos.x += Math.max(-25, Math.min(25, vel.x)) * dampening;
      pos.y += Math.max(-25, Math.min(25, vel.y)) * dampening;

      // Keep inside a reasonable canvas boundary
      pos.x = Math.max(50, Math.min(1800, pos.x));
      pos.y = Math.max(50, Math.min(1350, pos.y));

      // Reset step velocities accumulator
      vel.x = 0;
      vel.y = 0;
    });
  }

  return positions;
}
