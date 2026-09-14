import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SCATTER_METRICS,
  computeScatterPositions,
  computeDegrees,
  type MetricType
} from "./graphLayouts";
import { PageIcon } from "../../components/PageIcon";
import {
  Sliders,
  Sparkles,
  Layers,
  ArrowRight,
  ArrowUp,
  FileText,
  Link2,
  Tag,
  ExternalLink,
  ChevronDown
} from "lucide-react";

interface GraphScatterViewProps {
  pages: any[];
  links: any[];
  activeId?: string | null;
  onSelectNode: (pageId: string) => void;
  pan: { x: number; y: number };
  scale: number;
}

export default function GraphScatterView({
  pages,
  links,
  activeId,
  onSelectNode,
  pan,
  scale,
}: GraphScatterViewProps) {
  const [xMetric, setXMetric] = useState<MetricType>("connections");
  const [yMetric, setYMetric] = useState<MetricType>("wordCount");
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const visiblePages = useMemo(() => (pages || []).filter((p) => !p.trashed), [pages]);
  const degMap = useMemo(() => computeDegrees(pages, links), [pages, links]);

  // Scatter matrix dimensions
  const GRID_CONFIG = {
    startX: 240,
    startY: 130,
    width: 820,
    height: 520
  };

  // Compute 2D scatter coordinates
  const { positions, nodeValues } = useMemo(() => {
    return computeScatterPositions(visiblePages, links, xMetric, yMetric, GRID_CONFIG);
  }, [visiblePages, links, xMetric, yMetric]);

  const xCfg = SCATTER_METRICS[xMetric];
  const yCfg = SCATTER_METRICS[yMetric];

  const focusId = hoveredNodeId || activeId;
  const focusPos = focusId ? positions[focusId] : null;

  // Connected nodes to the focal node
  const focalConnections = useMemo(() => {
    if (!focusId) return [];
    return visiblePages.filter((p) =>
      p.id !== focusId &&
      links.some((l) => l.id.includes(focusId) && l.id.includes(p.id))
    );
  }, [focusId, visiblePages, links]);

  const activePage = visiblePages.find((p) => p.id === (hoveredNodeId || activeId));

  // Center axes coordinates
  const midX = GRID_CONFIG.startX + GRID_CONFIG.width / 2;
  const midY = GRID_CONFIG.startY + GRID_CONFIG.height / 2;
  const endX = GRID_CONFIG.startX + GRID_CONFIG.width;
  const endY = GRID_CONFIG.startY + GRID_CONFIG.height;

  return (
    <div className="absolute inset-0 overflow-hidden select-none">
      {/* ── Top Left: Floating Metric Axis Switcher Pill ── */}
      <div className="absolute top-15 left-4 z-30 flex items-center gap-2 pointer-events-auto select-none">
        <div className="flex items-center gap-2 px-3 h-9 rounded-full bg-white/90 dark:bg-[#181920]/90 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.12] shadow-[0_8px_24px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.08)] text-xs font-semibold text-slate-800 dark:text-slate-100">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-2xs">
            <Sliders size={11} strokeWidth={2.4} />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 dark:text-slate-400 font-medium text-[11px]">X:</span>
            <div className="relative flex items-center">
              <select
                value={xMetric}
                onChange={(e) => setXMetric(e.target.value as MetricType)}
                className="appearance-none bg-transparent font-bold pr-4 outline-none cursor-pointer text-blue-600 dark:text-blue-400 text-[11.5px]"
              >
                {Object.values(SCATTER_METRICS).map((m) => (
                  <option key={m.id} value={m.id} className="bg-white dark:bg-[#181922] text-slate-900 dark:text-white">
                    {m.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={10} className="absolute right-0 text-blue-500 pointer-events-none opacity-70" />
            </div>
          </div>

          <div className="w-px h-3.5 bg-black/10 dark:bg-white/10 mx-1" />

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 dark:text-slate-400 font-medium text-[11px]">Y:</span>
            <div className="relative flex items-center">
              <select
                value={yMetric}
                onChange={(e) => setYMetric(e.target.value as MetricType)}
                className="appearance-none bg-transparent font-bold pr-4 outline-none cursor-pointer text-purple-600 dark:text-purple-400 text-[11.5px]"
              >
                {Object.values(SCATTER_METRICS).map((m) => (
                  <option key={m.id} value={m.id} className="bg-white dark:bg-[#181922] text-slate-900 dark:text-white">
                    {m.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={10} className="absolute right-0 text-purple-500 pointer-events-none opacity-70" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Pannable & Zoomable Scatter Matrix Canvas ── */}
      <motion.div
        animate={{ x: pan.x, y: pan.y, scale }}
        transition={{ duration: 0 }}
        className="absolute inset-0 w-[4000px] h-[3000px] origin-top-left"
      >
        {/* Quadrant Matrix Frame & Guide Grid */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <defs>
            <linearGradient id="scatter-grid-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(59,130,246,0.06)" />
              <stop offset="100%" stopColor="rgba(168,85,247,0.06)" />
            </linearGradient>
          </defs>

          {/* Background Matrix Card */}
          <rect
            x={GRID_CONFIG.startX}
            y={GRID_CONFIG.startY}
            width={GRID_CONFIG.width}
            height={GRID_CONFIG.height}
            rx={24}
            fill="url(#scatter-grid-grad)"
            stroke="rgba(100, 116, 139, 0.15)"
            strokeWidth={1}
          />

          {/* Central Quadrant Crosshairs */}
          <line
            x1={GRID_CONFIG.startX}
            y1={midY}
            x2={endX}
            y2={midY}
            stroke="rgba(100, 116, 139, 0.22)"
            strokeDasharray="6 6"
            strokeWidth={1.2}
          />
          <line
            x1={midX}
            y1={GRID_CONFIG.startY}
            x2={midX}
            y2={endY}
            stroke="rgba(100, 116, 139, 0.22)"
            strokeDasharray="6 6"
            strokeWidth={1.2}
          />

          {/* Outer Border Dashes */}
          <rect
            x={GRID_CONFIG.startX + 12}
            y={GRID_CONFIG.startY + 12}
            width={GRID_CONFIG.width - 24}
            height={GRID_CONFIG.height - 24}
            rx={16}
            fill="none"
            stroke="rgba(100, 116, 139, 0.08)"
            strokeDasharray="4 8"
          />

          {/* Focal Ray Laser Lines (delicate projections radiating to connections) */}
          {focusPos &&
            focalConnections.map((connPage) => {
              const connPos = positions[connPage.id];
              if (!connPos) return null;
              return (
                <g key={`ray-${connPage.id}`}>
                  <line
                    x1={focusPos.x}
                    y1={focusPos.y}
                    x2={connPos.x}
                    y2={connPos.y}
                    stroke="rgba(236, 72, 153, 0.5)"
                    strokeWidth={1.8}
                    strokeDasharray="4 4"
                    className="animate-pulse"
                  />
                  <circle
                    cx={connPos.x}
                    cy={connPos.y}
                    r={5}
                    fill="#ec4899"
                    opacity={0.85}
                  />
                </g>
              );
            })}
        </svg>

        {/* ── Quadrant Watermarks / Indicator Chips ── */}
        <div
          style={{ left: GRID_CONFIG.startX + 24, top: GRID_CONFIG.startY + 20 }}
          className="absolute text-[10.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5 select-none pointer-events-none"
        >
          <span>📚 Deep Reference</span>
          <span className="text-[9px] opacity-60 font-mono">({yCfg.maxLabel} • {xCfg.minLabel})</span>
        </div>

        <div
          style={{ left: endX - 24, top: GRID_CONFIG.startY + 20 }}
          className="absolute -translate-x-full text-[10.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5 select-none pointer-events-none"
        >
          <span>✨ Knowledge Pillars</span>
          <span className="text-[9px] opacity-60 font-mono">({yCfg.maxLabel} • {xCfg.maxLabel})</span>
        </div>

        <div
          style={{ left: GRID_CONFIG.startX + 24, top: endY - 28 }}
          className="absolute text-[10.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5 select-none pointer-events-none"
        >
          <span>🌱 Quick Notes</span>
          <span className="text-[9px] opacity-60 font-mono">({yCfg.minLabel} • {xCfg.minLabel})</span>
        </div>

        <div
          style={{ left: endX - 24, top: endY - 28 }}
          className="absolute -translate-x-full text-[10.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5 select-none pointer-events-none"
        >
          <span>⚡ Network Hubs</span>
          <span className="text-[9px] opacity-60 font-mono">({yCfg.minLabel} • {xCfg.maxLabel})</span>
        </div>

        {/* ── Axis Direction Indicator Banners (Clean, Zero Collision) ── */}
        {/* Horizontal X-Axis Banner along bottom */}
        <div
          style={{ left: GRID_CONFIG.startX + 20, top: endY + 14 }}
          className="absolute flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 dark:bg-blue-400/15 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-[11px] font-bold uppercase tracking-wider select-none"
        >
          <ArrowRight size={12} strokeWidth={2.4} />
          <span>{xCfg.label}</span>
          <span className="text-[9.5px] font-mono opacity-70">({xCfg.minLabel} → {xCfg.maxLabel})</span>
        </div>

        {/* Vertical Y-Axis Banner along left */}
        <div
          style={{ left: GRID_CONFIG.startX - 18, top: midY }}
          className="absolute -translate-y-1/2 -rotate-90 origin-center flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 dark:bg-purple-400/15 border border-purple-500/20 text-purple-700 dark:text-purple-300 text-[11px] font-bold uppercase tracking-wider select-none whitespace-nowrap"
        >
          <ArrowUp size={12} strokeWidth={2.4} />
          <span>{yCfg.label}</span>
          <span className="text-[9.5px] font-mono opacity-70">({yCfg.minLabel} → {yCfg.maxLabel})</span>
        </div>

        {/* ── Plotted Scatter Nodes ── */}
        {visiblePages.map((page) => {
          const pos = positions[page.id];
          if (!pos) return null;
          const isFocal = page.id === focusId;
          const isConnected = focalConnections.some((p) => p.id === page.id);
          const deg = degMap[page.id] || 0;
          const nodeRadius = Math.max(16, Math.min(30, 16 + deg * 2.2));

          return (
            <motion.div
              key={page.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectNode(page.id);
              }}
              onMouseEnter={() => setHoveredNodeId(page.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              style={{
                left: pos.x - nodeRadius,
                top: pos.y - nodeRadius,
                width: nodeRadius * 2,
                height: nodeRadius * 2,
              }}
              className={`absolute rounded-full cursor-pointer transition-all duration-200 flex items-center justify-center select-none ${
                isFocal
                  ? "bg-pink-500 text-white shadow-[0_0_28px_rgba(236,72,153,0.75)] scale-125 z-40 ring-4 ring-pink-400/30"
                  : isConnected
                  ? "bg-purple-500 text-white shadow-[0_0_18px_rgba(168,85,247,0.55)] scale-110 z-30"
                  : "bg-white/90 dark:bg-[#1e202c]/90 border border-black/[0.08] dark:border-white/[0.12] shadow-[0_4px_16px_rgba(0,0,0,0.08)] text-slate-700 dark:text-slate-200 hover:scale-115 hover:border-pink-500 z-20"
              }`}
            >
              <PageIcon icon={page.icon} size={nodeRadius > 20 ? 14 : 12} fallback={<span>•</span>} />

              {/* Node Title Label Pill */}
              <div
                className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold whitespace-nowrap pointer-events-none transition-all ${
                  isFocal || isConnected
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-lg opacity-100 scale-105"
                    : "bg-white/90 dark:bg-[#181a24]/90 border border-black/10 dark:border-white/10 text-slate-700 dark:text-slate-200 opacity-80 group-hover:opacity-100 shadow-xs"
                }`}
              >
                {page.title || "Untitled"}
              </div>
            </motion.div>
          );
        })}

        {/* ── Interactive Tooltip Inspector Card (Image 2 style) ── */}
        {activePage && focusPos && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            style={{
              left: focusPos.x + 35,
              top: focusPos.y - 60,
            }}
            className="absolute z-50 w-60 rounded-3xl border border-black/10 dark:border-white/15 bg-white/95 dark:bg-[#181924]/95 backdrop-blur-2xl p-3.5 shadow-2xl pointer-events-auto"
          >
            <div className="flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                <PageIcon icon={activePage.icon} size={14} fallback={<span>📄</span>} />
                <span className="truncate">{activePage.title || "Untitled"}</span>
              </div>
              <button
                onClick={() => onSelectNode(activePage.id)}
                className="text-blue-500 hover:text-blue-600 p-1 rounded-lg hover:bg-blue-500/10 cursor-pointer transition"
                title="Open note"
              >
                <ExternalLink size={12} />
              </button>
            </div>

            <div className="py-2 flex flex-col gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Link2 size={11} className="text-blue-500" /> Links
                </span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {degMap[activePage.id] || 0} connections
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <FileText size={11} className="text-purple-500" /> Words
                </span>
                <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                  {(activePage.blocks || []).map((b: any) => b.text || "").join(" ").split(/\s+/).filter(Boolean).length || 0} words
                </span>
              </div>

              {activePage.tags?.length > 0 && (
                <div className="flex items-center gap-1 pt-1.5 border-t border-black/[0.06] dark:border-white/[0.08] flex-wrap">
                  <Tag size={10} className="text-slate-400" />
                  {activePage.tags.slice(0, 3).map((t: string) => (
                    <span key={t} className="px-1.5 py-0.2 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-[9.5px] font-medium text-slate-600 dark:text-slate-300">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
