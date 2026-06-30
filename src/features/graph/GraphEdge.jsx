import React from "react";
import { motion } from "framer-motion";

function GraphEdgeComponent({ 
  link, 
  isActive, 
  isDimmed,
  animated = true 
}) {
  // Bezier curve calculations
  const dx = link.x2 - link.x1;
  const dy = link.y2 - link.y1;
  const cx1 = link.x1 + dx * 0.4;
  const cy1 = link.y1;
  const cx2 = link.x1 + dx * 0.6;
  const cy2 = link.y2;
  
  const pathData = `M ${link.x1} ${link.y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${link.x2} ${link.y2}`;

  // Thickness based on relationship strength
  const baseStrokeWidth = link.type === "hierarchy" ? 1.8 : 1.0;
  const activeStrokeWidth = link.type === "hierarchy" ? 3.2 : 2.0;

  // Colors & styles
  const baseColor = isActive 
    ? "var(--accent)" 
    : link.type === "hierarchy" 
      ? "var(--border-strong)" 
      : link.type === "mention"
        ? "var(--accent-light)"
        : "var(--border)";

  const beamGradient = isActive ? "active-beam-grad" : "idle-beam-grad";
  
  // Set opacity levels
  const pathOpacity = isDimmed ? 0.08 : isActive ? 0.95 : 0.45;

  return (
    <g style={{ opacity: pathOpacity }} className="transition-all duration-300">
      {/* 1. Base trace line */}
      <path
        d={pathData}
        fill="none"
        stroke={baseColor}
        strokeWidth={isActive ? activeStrokeWidth : baseStrokeWidth}
        strokeDasharray={link.type === "tag" ? "4,4" : link.type === "mention" ? "1,4" : "none"}
        className="transition-all duration-300"
      />

      {/* 2. Flowing Animated Beam overlay */}
      {animated && (
        <motion.path
          d={pathData}
          fill="none"
          stroke={`url(#${beamGradient})`}
          strokeWidth={isActive ? activeStrokeWidth + 1.0 : baseStrokeWidth + 0.8}
          strokeDasharray={link.type === "tag" ? "5, 20" : link.type === "mention" ? "2, 16" : "8, 30"}
          initial={{ strokeDashoffset: 0 }}
          animate={{ strokeDashoffset: -38 }}
          transition={{
            repeat: Infinity,
            duration: isActive ? 1.5 : 3.2,
            ease: "linear"
          }}
        />
      )}
    </g>
  );
}

export default React.memo(GraphEdgeComponent);
