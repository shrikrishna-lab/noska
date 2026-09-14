import React from "react";
import { motion } from "framer-motion";
import GraphNode from "./GraphNode";
import GraphEdge from "./GraphEdge";
import { NODE_SPRING } from "./GraphAnimations";

export default function GraphCanvas({
  pages,
  links,
  nodePositions,
  pan,
  scale,
  activeId,
  hoveredNodeId,
  searchQuery,
  showLabels,
  animated,
  onNodeDrag,
  onNodeSelect,
  degrees = {},
  maxDegree = 1,
  sizeByConnections = false
}) {
  const visiblePages = pages.filter((p) => !p.trashed);

  // Check if a node is dimmed based on active select/search state
  const isNodeDimmed = (nodeId: string) => {
    if (searchQuery.trim()) {
      const page = pages.find((p) => p.id === nodeId);
      return !page?.title?.toLowerCase().includes(searchQuery.toLowerCase());
    }

    if (activeId) {
      if (nodeId === activeId) return false;
      const isConnected = links.some(
        (l) => l.id.includes(activeId) && l.id.includes(nodeId)
      );
      return !isConnected;
    }

    if (hoveredNodeId) {
      if (nodeId === hoveredNodeId) return false;
      const isConnected = links.some(
        (l) => l.id.includes(hoveredNodeId) && l.id.includes(nodeId)
      );
      return !isConnected;
    }

    return false;
  };

  // Check if a node is highlighted
  const isNodeHighlighted = (nodeId: string) => {
    if (nodeId === activeId) return true;
    if (nodeId === hoveredNodeId) return true;
    
    const focusId = activeId || hoveredNodeId;
    if (focusId) {
      return links.some((l) => l.id.includes(focusId) && l.id.includes(nodeId));
    }

    return false;
  };

  return (
    <motion.div
      animate={{ x: pan.x, y: pan.y, scale }}
      transition={animated ? NODE_SPRING : { duration: 0 }}
      className="absolute inset-0 w-[4000px] h-[3000px] origin-top-left graph-bg z-10"
    >
      {/* 1. Concentric Orbital Constellation Rings & Celestial Dust (Image 1 reference) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <defs>
          <radialGradient id="celestial-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.08)" />
            <stop offset="40%" stopColor="rgba(168, 85, 247, 0.04)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <linearGradient id="active-beam-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="var(--accent)" />
          </linearGradient>
          <linearGradient id="idle-beam-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--border-strong)" />
            <stop offset="50%" stopColor="var(--secondary)" />
            <stop offset="100%" stopColor="var(--border-strong)" />
          </linearGradient>
        </defs>

        {/* Ambient Celestial Core Glow */}
        <circle cx={520} cy={400} r={420} fill="url(#celestial-core)" />

        {/* Concentric Guide Rings */}
        <circle cx={520} cy={400} r={160} stroke="rgba(100,116,139,0.14)" strokeWidth={1} strokeDasharray="4 6" fill="none" />
        <circle cx={520} cy={400} r={320} stroke="rgba(100,116,139,0.11)" strokeWidth={1} strokeDasharray="6 8" fill="none" />
        <circle cx={520} cy={400} r={480} stroke="rgba(100,116,139,0.08)" strokeWidth={1} strokeDasharray="8 10" fill="none" />
        <circle cx={520} cy={400} r={640} stroke="rgba(100,116,139,0.05)" strokeWidth={1} strokeDasharray="10 12" fill="none" />

        {/* Outer Particle Dots along constellation ring */}
        {[...Array(32)].map((_, i) => {
          const angle = (i * 2 * Math.PI) / 32;
          const r = 480 + (i % 3) * 40;
          return (
            <circle
              key={`dust-${i}`}
              cx={520 + r * Math.cos(angle)}
              cy={400 + r * Math.sin(angle)}
              r={1.8}
              fill="rgba(148, 163, 184, 0.35)"
            />
          );
        })}

        {/* 2. Animated Connection Links overlay */}
        {links.map((link) => {
          const isActiveLink = link.id.includes(activeId || hoveredNodeId || "");
          const isDimmedLink = (activeId || hoveredNodeId) && !isActiveLink;

          return (
            <GraphEdge
              key={link.id}
              link={link}
              isActive={isActiveLink}
              isDimmed={isDimmedLink}
              animated={animated}
            />
          );
        })}
      </svg>

      {/* 3. Floating Interactive Page Nodes */}
      {visiblePages.map((page) => {
        const pos = nodePositions[page.id] || { x: 500, y: 350 };
        const isActive = page.id === activeId;
        const isDimmed = isNodeDimmed(page.id);
        const isHighlighted = isNodeHighlighted(page.id);

        const deg = degrees[page.id] || 0;
        const sizeScale = sizeByConnections ? 1 + Math.min(0.5, (deg / maxDegree) * 0.5) : 1;

        return (
          <GraphNode
            key={page.id}
            page={page}
            position={pos}
            isActive={isActive}
            isDimmed={isDimmed}
            isHighlighted={isHighlighted}
            onDrag={onNodeDrag}
            onClick={onNodeSelect}
            showLabels={showLabels}
            sizeScale={sizeScale}
            degree={deg}
          />
        );
      })}
    </motion.div>
  );
}
