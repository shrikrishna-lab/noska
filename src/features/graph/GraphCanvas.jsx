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
  const isNodeDimmed = (nodeId) => {
    // If search active: dim nodes that don't match
    if (searchQuery.trim()) {
      const page = pages.find(p => p.id === nodeId);
      return !page?.title?.toLowerCase().includes(searchQuery.toLowerCase());
    }

    // If node selected: dim nodes that aren't the selected node and are not connected to it
    if (activeId) {
      if (nodeId === activeId) return false;
      const isConnected = links.some(l => 
        l.id.includes(activeId) && l.id.includes(nodeId)
      );
      return !isConnected;
    }

    // If node hovered: dim nodes that aren't hovered and are not connected to it
    if (hoveredNodeId) {
      if (nodeId === hoveredNodeId) return false;
      const isConnected = links.some(l => 
        l.id.includes(hoveredNodeId) && l.id.includes(nodeId)
      );
      return !isConnected;
    }

    return false;
  };

  // Check if a node is highlighted
  const isNodeHighlighted = (nodeId) => {
    if (nodeId === activeId) return true;
    if (nodeId === hoveredNodeId) return true;
    
    // Highlight connected nodes to active/hovered node
    const focusId = activeId || hoveredNodeId;
    if (focusId) {
      return links.some(l => l.id.includes(focusId) && l.id.includes(nodeId));
    }

    return false;
  };

  return (
    <motion.div
      animate={{ x: pan.x, y: pan.y, scale }}
      transition={animated ? NODE_SPRING : { duration: 0 }}
      className="absolute inset-0 w-[2000px] h-[1500px] origin-top-left graph-bg z-10"
    >
      {/* 1. Animated SVG Connection Links overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <defs>
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

        {links.map((link) => {
          // Determine link activity state
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

      {/* 2. Floating Interactive Page Nodes */}
      {visiblePages.map((page) => {
        const pos = nodePositions[page.id] || { x: 500, y: 350 };
        const isActive = page.id === activeId;
        const isDimmed = isNodeDimmed(page.id);
        const isHighlighted = isNodeHighlighted(page.id);

        // Node size scale from connection count (1.0 – 1.5x) when enabled
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
