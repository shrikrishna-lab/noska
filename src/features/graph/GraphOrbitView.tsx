import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { compute3DOrbitPositions, computeDegrees, type Orbit3DNode } from "./graphLayouts";
import { PageIcon } from "../../components/PageIcon";
import {
  Globe,
  RotateCw,
  Play,
  Pause,
  Layers,
  Sparkles,
  ExternalLink,
  Shield,
  Activity,
  Cpu,
  Database
} from "lucide-react";

interface GraphOrbitViewProps {
  pages: any[];
  links: any[];
  activeId?: string | null;
  onSelectNode: (pageId: string) => void;
  pan: { x: number; y: number };
  scale: number;
}

export default function GraphOrbitView({
  pages,
  links,
  activeId,
  onSelectNode,
  pan,
  scale,
}: GraphOrbitViewProps) {
  const [rotationAngle, setRotationAngle] = useState(0);
  const [pitchAngle, setPitchAngle] = useState(0.32);
  const [autoRotate, setAutoRotate] = useState(true);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const visiblePages = useMemo(() => (pages || []).filter((p) => !p.trashed), [pages]);
  const degMap = useMemo(() => computeDegrees(pages, links), [pages, links]);

  // Continuous auto-orbit animation frame
  useEffect(() => {
    if (!autoRotate) return;
    let animId: number;
    const loop = () => {
      setRotationAngle((a) => (a + 0.005) % (Math.PI * 2));
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [autoRotate]);

  // 3D Projection Calculation
  const { coreNodes, ribbonNodes, allProjected } = useMemo(() => {
    return compute3DOrbitPositions(
      visiblePages,
      links,
      rotationAngle,
      pitchAngle,
      600,
      400
    );
  }, [visiblePages, links, rotationAngle, pitchAngle]);

  // Mouse drag rotation handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    setRotationAngle((a) => a + dx * 0.008);
    setPitchAngle((p) => Math.max(-0.8, Math.min(0.8, p + dy * 0.006)));
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  // Group stats for the orbital ribbon
  const totalNotesCount = visiblePages.length;

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className="absolute inset-0 overflow-hidden select-none cursor-grab active:cursor-grabbing"
    >
      {/* 3D Orbit HUD Top Bar */}
      <div className="absolute top-16 left-6 z-20 flex items-center gap-2 pointer-events-auto">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/85 dark:bg-[#181922]/85 backdrop-blur-2xl border border-black/10 dark:border-white/10 shadow-lg text-xs font-semibold text-slate-800 dark:text-slate-200">
          <Globe size={14} className="text-blue-500" />
          <span>Holographic Planetary Galaxy</span>
          <div className="w-px h-3.5 bg-black/10 dark:bg-white/10 mx-0.5" />
          <button
            onClick={() => setAutoRotate((r) => !r)}
            className="flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            {autoRotate ? <Pause size={11} /> : <Play size={11} />}
            <span>{autoRotate ? "Pause Orbit" : "Auto Spin"}</span>
          </button>
        </div>
      </div>

      {/* 3D Projected Graphic Space */}
      <motion.div
        animate={{ x: pan.x, y: pan.y, scale }}
        transition={{ duration: 0 }}
        className="absolute inset-0 w-[4000px] h-[3000px] origin-top-left pointer-events-none"
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <radialGradient id="globe-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="60%" stopColor="#6366f1" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="ribbon-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.05" />
              <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Central Knowledge Core Sphere (Image 3 globe reference) */}
          <circle cx={600} cy={400} r={140} fill="url(#globe-glow)" />
          <circle cx={600} cy={400} r={130} stroke="rgba(59, 130, 246, 0.25)" strokeWidth={1.5} fill="none" strokeDasharray="6 4" />
          
          {/* Rotating Latitude/Longitude Rings */}
          <ellipse
            cx={600}
            cy={400}
            rx={130}
            ry={130 * Math.sin(pitchAngle + 0.3)}
            stroke="rgba(99, 102, 241, 0.3)"
            strokeWidth={1.2}
            fill="none"
          />
          <ellipse
            cx={600}
            cy={400}
            rx={130 * Math.abs(Math.cos(rotationAngle))}
            ry={130}
            stroke="rgba(59, 130, 246, 0.2)"
            strokeWidth={1.2}
            fill="none"
          />

          {/* 3D Equatorial Orbital Ribbon (Image 3 reference) */}
          <ellipse
            cx={600}
            cy={400}
            rx={320}
            ry={100}
            stroke="url(#ribbon-grad)"
            strokeWidth={36}
            fill="none"
            className="opacity-70"
          />
          <ellipse
            cx={600}
            cy={400}
            rx={320}
            ry={100}
            stroke="rgba(59, 130, 246, 0.4)"
            strokeWidth={1.5}
            strokeDasharray="8 6"
            fill="none"
          />

          {/* Connecting Laser Beams between related 3D nodes */}
          {allProjected.map((node) => {
            const isHovered = node.id === hoveredNodeId || node.id === activeId;
            if (!isHovered) return null;

            return visiblePages
              .filter((p) => links.some((l) => l.id.includes(node.id) && l.id.includes(p.id)))
              .map((targetPage) => {
                const targetNode = allProjected.find((n) => n.id === targetPage.id);
                if (!targetNode) return null;

                return (
                  <line
                    key={`beam-${node.id}-${targetNode.id}`}
                    x1={node.screenX}
                    y1={node.screenY}
                    x2={targetNode.screenX}
                    y2={targetNode.screenY}
                    stroke="#60a5fa"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    className="animate-pulse"
                  />
                );
              });
          })}
        </svg>

        {/* Central Core Big Metric Header (Matching Image 3 "华东1 110") */}
        <div
          style={{ left: 600, top: 230 }}
          className="absolute -translate-x-1/2 flex flex-col items-center justify-center pointer-events-none select-none text-center"
        >
          <span className="text-[11px] font-mono uppercase tracking-widest text-blue-500/80 font-bold">
            Noska Planetary Core
          </span>
          <span className="text-4xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 font-mono">
            {totalNotesCount}
          </span>
        </div>

        {/* 3D Projected Floating Nodes */}
        {allProjected.map((node) => {
          const isSelected = node.id === activeId;
          const isHovered = node.id === hoveredNodeId;
          const deg = degMap[node.id] || 0;

          return (
            <div
              key={node.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectNode(node.id);
              }}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              style={{
                left: node.screenX,
                top: node.screenY,
                transform: `translate(-50%, -50%) scale(${node.screenScale})`,
                opacity: node.screenAlpha,
                zIndex: Math.round(node.z3d + 1000),
              }}
              className="absolute pointer-events-auto cursor-pointer transition-transform duration-75 group"
            >
              {/* Floating 3D Node Token (Matching Image 3 Cube/Badge tokens) */}
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border backdrop-blur-xl transition-all ${
                  isSelected || isHovered
                    ? "bg-blue-600 text-white border-blue-400 shadow-[0_0_24px_rgba(59,130,246,0.8)] scale-110"
                    : "bg-white/90 dark:bg-[#1c202d]/90 border-black/10 dark:border-white/15 text-slate-800 dark:text-slate-100 shadow-lg hover:border-blue-500 hover:scale-105"
                }`}
              >
                {/* 3D Mini Cube Icon */}
                <span
                  className="w-2.5 h-2.5 rounded-xs shadow-xs shrink-0"
                  style={{ backgroundColor: node.color }}
                />

                <PageIcon icon={node.page.icon} size={13} fallback={<span>📄</span>} />

                <span className="text-xs font-semibold max-w-[120px] truncate">
                  {node.page.title || "Untitled"}
                </span>

                {deg > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-black/10 dark:bg-white/10 text-slate-400">
                    {deg}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
