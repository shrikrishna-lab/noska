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
      className={`w-[170px] h-[42px] rounded-full border px-3 flex items-center gap-2 cursor-grab active:cursor-grabbing select-none transition-all duration-200 bg-white/90 dark:bg-[#181a24]/90 backdrop-blur-2xl ${
        isActive 
          ? "ring-2 ring-blue-500/40 border-blue-500 font-bold shadow-[0_8px_24px_rgba(59,130,246,0.25)]"
          : "border-black/[0.08] dark:border-white/[0.12] shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.08)] hover:border-black/20 dark:hover:border-white/25 hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)]"
      }`}
    >
      {/* Category indicator icon squircle */}
      <div 
        className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 shadow-2xs"
        style={{ backgroundColor: `${cluster.color}18`, border: `1px solid ${cluster.color}30` }}
      >
        <PageIcon icon={page.icon} size={13} fallback={<span>📄</span>} />
      </div>
      
      {showLabels && (
        <span className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100 select-none flex-1 leading-none tracking-tight">
          {page.title || "Untitled"}
        </span>
      )}

      {/* Connection-count badge (shown when node has links) */}
      {degree > 0 && (
        <span
          className="shrink-0 min-w-[18px] h-4 px-1 rounded-full text-[9.5px] font-bold flex items-center justify-center select-none border"
          style={{ 
            backgroundColor: `${cluster.color}18`, 
            color: cluster.color,
            borderColor: `${cluster.color}35`
          }}
          title={`${degree} connection${degree === 1 ? "" : "s"}`}
        >
          {degree}
        </span>
      )}
      
      {page.favorite && (
        <Star size={11} className="fill-amber-400 text-amber-400 shrink-0 select-none" />
      )}
      
      {/* Category Colored Indicator Pulse Dot */}
      <span 
        className="w-2 h-2 rounded-full shrink-0 select-none shadow-xs" 
        style={{ backgroundColor: cluster.color }} 
      />
    </motion.div>
  );
}

// React.memo to prevent unnecessary repaints
export default React.memo(GraphNodeComponent);
