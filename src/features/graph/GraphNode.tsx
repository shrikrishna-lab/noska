import React, { memo } from "react";
import { motion } from "framer-motion";
import { PageIcon } from "../../components/PageIcon";
import { Star } from "lucide-react";
import { NODE_VARIANTS } from "./GraphAnimations";
import { getPageCluster } from "./GraphLegend";

function GraphNodeComponent({
  page,
  position,
  isActive,
  isDimmed,
  isHighlighted,
  onDrag,
  onClick,
  showLabels = true,
  sizeScale = 1,
  degree = 0
}) {
  const cluster = getPageCluster(page);

  // Custom styling colors based on active selection or node category tags
  const baseBorderColor = isActive 
    ? "var(--accent)" 
    : isHighlighted 
      ? cluster.color 
      : "var(--border-strong)";

  const shadowGlow = isActive
    ? `0 0 16px ${cluster.color}40`
    : isHighlighted
      ? `0 0 10px ${cluster.color}25`
      : "var(--shadow-sm)";

  const nodeOpacity = isDimmed ? 0.35 : 1.0;

  return (
    <motion.div
      variants={NODE_VARIANTS}
      initial="initial"
      animate="animate"
      whileHover="hover"
      whileTap="tap"
      drag
      dragMomentum={false}
      onDrag={(e, info) => onDrag(page.id, info)}
      onClick={(e) => {
        // Prevent click trigger during pan/drag release
        e.stopPropagation();
        onClick(page.id);
      }}
      style={{
        left: position.x,
        top: position.y,
        position: "absolute",
        borderColor: baseBorderColor,
        boxShadow: shadowGlow,
        opacity: nodeOpacity,
        zIndex: isActive ? 40 : isHighlighted ? 35 : 20,
        scale: sizeScale,
        transformOrigin: "center center",
      }}
      className={`w-[160px] h-[40px] rounded-full border px-3.5 flex items-center gap-2 cursor-grab active:cursor-grabbing select-none transition-opacity duration-200 bg-[var(--surface)]/80 backdrop-blur-md ${
        isActive 
          ? "ring-2 ring-[var(--accent)]/30 font-semibold"
          : "hover:bg-[var(--hover)]/95"
      }`}
    >
      {/* Category indicator icon */}
      <span className="text-sm shrink-0 select-none flex items-center justify-center">
        <PageIcon icon={page.icon} size={14} fallback={<span>📄</span>} />
      </span>
      
      {showLabels && (
        <span className="truncate text-xs font-medium text-[var(--text)] select-none flex-1 leading-none">
          {page.title || "Untitled"}
        </span>
      )}

      {/* Connection-count badge (shown when node has links) */}
      {degree > 0 && (
        <span
          className="shrink-0 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-semibold flex items-center justify-center select-none"
          style={{ backgroundColor: `${cluster.color}22`, color: cluster.color }}
          title={`${degree} connection${degree === 1 ? "" : "s"}`}
        >
          {degree}
        </span>
      )}
      
      {page.favorite && (
        <Star size={10} className="fill-[var(--warning)] text-[var(--warning)] shrink-0 select-none" />
      )}
      
      {/* Category Colored Indicator Dot */}
      <span 
        className="w-1.5 h-1.5 rounded-full shrink-0 select-none" 
        style={{ backgroundColor: cluster.color }} 
      />
    </motion.div>
  );
}

// React.memo to prevent unnecessary repaints
export default React.memo(GraphNodeComponent);
