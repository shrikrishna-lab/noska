import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GraphBackground from "./GraphBackground";
import GraphCanvas from "./GraphCanvas";
import GraphScatterView from "./GraphScatterView";
import GraphOrbitView from "./GraphOrbitView";
import GraphDiscoverySidebar from "./GraphDiscoverySidebar";
import GraphControls from "./GraphControls";
import GraphMiniMap from "./GraphMiniMap";
import GraphSearch from "./GraphSearch";
import GraphBreadcrumb from "./GraphBreadcrumb";
import GraphLegend, { getPageCluster } from "./GraphLegend";
import GraphInfoPanel from "./GraphInfoPanel";
import GraphLayoutMenu from "./GraphLayoutMenu";
import { autoArrangeLayout } from "./graphPhysics";
import { computeLayout, computeDegrees } from "./graphLayouts";
import { getAllRelations } from "../../utils/pageLinks";
import {
  Sparkles,
  Layers,
  Sliders,
  Globe,
  RotateCcw,
  Maximize,
  ZoomIn,
  ZoomOut,
  Crosshair
} from "lucide-react";

export type GraphViewMode = "constellation" | "scatter" | "orbit";

export default function GraphView({ pages, activeId, onSelect }) {
  const [viewMode, setViewMode] = useState<GraphViewMode>("constellation");
  const [nodePositions, setNodePositions] = useState({});
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [linkFilters, setLinkFilters] = useState({ hierarchy: true, tag: true, mention: true });
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [activeLayout, setActiveLayout] = useState("constellation");
  const [sizeByConnections, setSizeByConnections] = useState(false);
  
  const [animated, setAnimated] = useState(() => {
    try {
      return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return true;
    }
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const isDraggingBg = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Initialize and persist node positions
  useEffect(() => {
    const saved = localStorage.getItem("noska-graph-positions");
    const initialPos = saved ? JSON.parse(saved) : {};
    
    const visiblePages = pages.filter((p) => !p.trashed);
    const count = visiblePages.length;
    const centerX = 520;
    const centerY = 380;
    const radius = Math.min(240, count * 45 + 90);

    visiblePages.forEach((page, idx) => {
      if (!initialPos[page.id]) {
        const angle = (idx / Math.max(1, count)) * 2 * Math.PI - Math.PI / 2;
        initialPos[page.id] = {
          x: centerX + radius * Math.cos(angle) - 80,
          y: centerY + radius * Math.sin(angle) - 20
        };
      }
    });

    setNodePositions(initialPos);
  }, [pages]);

  // Monitor canvas container dimensions for viewport sizing
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerSize({
          width: entry.contentRect.width || 800,
          height: entry.contentRect.height || 600
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const savePositions = (newPos) => {
    setNodePositions(newPos);
    localStorage.setItem("noska-graph-positions", JSON.stringify(newPos));
  };

  // Drag Background to Pan Graph Viewport (Constellation & Scatter modes)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (viewMode === "orbit") return; // Orbit handles its own 3D rotation
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains("graph-bg")) return;
    
    isDraggingBg.current = true;
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    if (containerRef.current) containerRef.current.style.cursor = "grabbing";
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingBg.current) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    if (isDraggingBg.current) {
      isDraggingBg.current = false;
      if (containerRef.current) containerRef.current.style.cursor = "grab";
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomIntensity = 0.05;
    const delta = e.deltaY < 0 ? 1 : -1;
    const nextScale = Math.min(2.5, Math.max(0.2, scale + delta * zoomIntensity * scale));
    setScale(nextScale);
  };

  // Node Drag Handlers
  const handleNodeDrag = (pageId: string, info: any) => {
    const startPos = nodePositions[pageId] || { x: 500, y: 350 };
    const updated = {
      ...nodePositions,
      [pageId]: {
        x: startPos.x + info.delta.x / scale,
        y: startPos.y + info.delta.y / scale
      }
    };
    savePositions(updated);
  };

  // Calculate links (hierarchy, shared tags, and [[ mentions)
  const links = useMemo(() => {
    const calculatedLinks = [];
    const visiblePages = pages.filter((p) => !p.trashed);
    const visibleIds = new Set(visiblePages.map(p => p.id));
    
    visiblePages.forEach((page) => {
      // Parent-child relationships
      if (linkFilters.hierarchy && page.parentId && visibleIds.has(page.parentId)) {
        const childPos = nodePositions[page.id];
        const parentPos = nodePositions[page.parentId];
        if (childPos && parentPos) {
          calculatedLinks.push({
            id: `${page.id}-${page.parentId}`,
            source: page.parentId,
            target: page.id,
            x1: parentPos.x + 80,
            y1: parentPos.y + 20,
            x2: childPos.x + 80,
            y2: childPos.y + 20,
            type: "hierarchy"
          });
        }
      }

      // Shared tags relationships
      visiblePages.forEach((other) => {
        if (other.id === page.id) return;
        const sharedTags = page.tags?.filter((t) => other.tags?.includes(t)) || [];
        if (linkFilters.tag && sharedTags.length > 0) {
          const matchTag = !tagFilter || sharedTags.includes(tagFilter);
          if (matchTag) {
            const exists = calculatedLinks.some(
              (l) => l.id === `${page.id}-${other.id}` || l.id === `${other.id}-${page.id}`
            );
            if (!exists) {
              const pos1 = nodePositions[page.id];
              const pos2 = nodePositions[other.id];
              if (pos1 && pos2) {
                calculatedLinks.push({
                  id: `${page.id}-${other.id}`,
                  source: page.id,
                  target: other.id,
                  x1: pos1.x + 80,
                  y1: pos1.y + 20,
                  x2: pos2.x + 80,
                  y2: pos2.y + 20,
                  type: "tag"
                });
              }
            }
          }
        }
      });

      // [[ mention relationships
      if (linkFilters.mention) {
        const relations = getAllRelations(page.id, pages);
        relations.outgoing.forEach((link) => {
          if (!visibleIds.has(link.pageId)) return;
          const linkId = `${page.id}-${link.pageId}`;
          const exists = calculatedLinks.some(
            (l) => l.id === linkId || l.id === `${link.pageId}-${page.id}`
          );
          if (exists) return;
          const pos1 = nodePositions[page.id];
          const pos2 = nodePositions[link.pageId];
          if (pos1 && pos2) {
            calculatedLinks.push({
              id: linkId,
              source: page.id,
              target: link.pageId,
              x1: pos1.x + 80,
              y1: pos1.y + 20,
              x2: pos2.x + 80,
              y2: pos2.y + 20,
              type: "mention"
            });
          }
        });
      }
    });
    return calculatedLinks;
  }, [pages, nodePositions, linkFilters, tagFilter]);

  // Center camera focused on a specific selected node
  const centerOnNode = (nodeId: string) => {
    const pos = nodePositions[nodeId];
    if (!pos) return;

    const targetScale = 1.1;
    const targetPanX = containerSize.width / 2 - (pos.x + 80) * targetScale;
    const targetPanY = containerSize.height / 2 - (pos.y + 20) * targetScale;

    setPan({ x: targetPanX, y: targetPanY });
    setScale(targetScale);
    setSelectedNodeId(nodeId);
    onSelect?.(nodeId);
  };

  const handleNodeSelect = (nodeId: string) => {
    setSelectedNodeId(prev => prev === nodeId ? null : nodeId);
    onSelect?.(nodeId);
  };

  const handleCenterGraph = () => {
    setPan({ x: 0, y: 0 });
    setScale(1.0);
  };

  const handleFitGraph = () => {
    const visiblePages = pages.filter((p) => !p.trashed);
    if (visiblePages.length === 0) return;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    visiblePages.forEach((page) => {
      const pos = nodePositions[page.id] || { x: 500, y: 350 };
      if (pos.x < minX) minX = pos.x;
      if (pos.x > maxX) maxX = pos.x;
      if (pos.y < minY) minY = pos.y;
      if (pos.y > maxY) maxY = pos.y;
    });

    minX -= 100;
    maxX += 260;
    minY -= 100;
    maxY += 100;

    const graphW = maxX - minX;
    const graphH = maxY - minY;

    const fitScale = Math.max(0.35, Math.min(1.4, Math.min(containerSize.width / graphW, containerSize.height / graphH)));
    const targetCenterX = minX + graphW / 2;
    const targetCenterY = minY + graphH / 2;

    const targetPanX = containerSize.width / 2 - targetCenterX * fitScale;
    const targetPanY = containerSize.height / 2 - targetCenterY * fitScale;

    setPan({ x: targetPanX, y: targetPanY });
    setScale(fitScale);
  };

  const handleAutoArrange = () => {
    const solvedPositions = autoArrangeLayout(pages, links, nodePositions, 520, 380);
    savePositions(solvedPositions);
    setActiveLayout("force");
  };

  const handleApplyLayout = (layoutId: string) => {
    setActiveLayout(layoutId);
    if (layoutId === "force") {
      handleAutoArrange();
      return;
    }
    const cx = 520, cy = 400;
    const solved = computeLayout(layoutId, pages, links, cx, cy);
    if (solved) {
      savePositions(solved);
      setTimeout(() => handleFitGraph(), 30);
    }
  };

  const degrees = useMemo(() => computeDegrees(pages, links), [pages, links]);
  const maxDegree = useMemo(() => Math.max(1, ...Object.values(degrees)), [degrees]);

  const handleExport = () => {
    const mapExport = {
      nodes: pages.filter(p => !p.trashed).map(p => ({
        id: p.id,
        title: p.title,
        tags: p.tags,
        parentId: p.parentId
      })),
      relations: links.map(l => ({ id: l.id, type: l.type })),
      positions: nodePositions
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(mapExport, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `noska_graph_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  };

  const activePage = pages.find(p => p.id === activeId);
  const activeCluster = activePage ? getPageCluster(activePage) : null;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      className="relative flex-1 overflow-hidden select-none bg-[#faf7f2] dark:bg-[#15171f] border-t border-[var(--border)]"
      style={{ cursor: viewMode === "orbit" ? "grab" : "grab" }}
    >
      {/* Background Ambience */}
      <GraphBackground pan={pan} scale={scale} animated={animated} />

      {/* ── Unified Top Navigation Bar (Zero Overlap Flex Layout) ── */}
      <div className="absolute top-3.5 left-4 right-4 z-30 flex items-center justify-between gap-3 pointer-events-none select-none">
        {/* Left: Breadcrumbs */}
        <div className="pointer-events-auto flex items-center gap-2 shrink-0">
          <GraphBreadcrumb
            activeNodeClusterName={activeCluster?.name}
            totalNodesCount={pages.filter((p) => !p.trashed).length}
          />
        </div>

        {/* Center: Apple-style Mode Switcher Segment Pills */}
        <div className="pointer-events-auto flex items-center p-0.5 rounded-full bg-white/90 dark:bg-[#181920]/90 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.12] shadow-[0_8px_24px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.08)] select-none shrink-0">
          <button
            onClick={() => setViewMode("constellation")}
            title="Constellation Hub & Network Flow (Image 1)"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
              viewMode === "constellation"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs font-semibold"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Sparkles size={12.5} className={viewMode === "constellation" ? "text-amber-400" : "text-amber-500"} />
            <span>Constellation</span>
          </button>

          <button
            onClick={() => setViewMode("scatter")}
            title="2D Metric Scatter Matrix (Image 2)"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
              viewMode === "scatter"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs font-semibold"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Sliders size={12.5} className={viewMode === "scatter" ? "text-blue-400" : "text-blue-500"} />
            <span>Scatter Matrix</span>
          </button>

          <button
            onClick={() => setViewMode("orbit")}
            title="3D Holographic Planetary Orbit (Image 3)"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
              viewMode === "orbit"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs font-semibold"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Globe size={12.5} className={viewMode === "orbit" ? "text-emerald-400" : "text-emerald-500"} />
            <span>3D Orbit</span>
          </button>
        </div>

        {/* Right: Camera & View Controls */}
        <div className="pointer-events-auto hidden sm:flex items-center gap-2 shrink-0">
          <GraphControls
            onZoomIn={() => setScale((prev) => Math.min(2.5, prev + 0.1))}
            onZoomOut={() => setScale((prev) => Math.max(0.2, prev - 0.1))}
            onFitGraph={handleFitGraph}
            onCenterGraph={handleCenterGraph}
            onAutoArrange={handleAutoArrange}
            showLabels={showLabels}
            onToggleLabels={() => setShowLabels(!showLabels)}
            animated={animated}
            onToggleAnimation={() => setAnimated(!animated)}
            onExport={handleExport}
            activeLayout={activeLayout}
            onApplyLayout={handleApplyLayout}
            sizeByConnections={sizeByConnections}
            onToggleSizeByConnections={() => setSizeByConnections((s) => !s)}
          />
        </div>
      </div>

      {/* ── Active Visual Graph Engine ── */}
      {viewMode === "constellation" && (
        <GraphCanvas
          pages={pages}
          links={links}
          nodePositions={nodePositions}
          pan={pan}
          scale={scale}
          activeId={activeId}
          hoveredNodeId={hoveredNodeId}
          searchQuery={searchQuery}
          showLabels={showLabels}
          animated={animated}
          onNodeDrag={handleNodeDrag}
          onNodeSelect={handleNodeSelect}
          degrees={degrees}
          maxDegree={maxDegree}
          sizeByConnections={sizeByConnections}
        />
      )}

      {viewMode === "scatter" && (
        <GraphScatterView
          pages={pages}
          links={links}
          activeId={activeId}
          onSelectNode={handleNodeSelect}
          pan={pan}
          scale={scale}
        />
      )}

      {viewMode === "orbit" && (
        <GraphOrbitView
          pages={pages}
          links={links}
          activeId={activeId}
          onSelectNode={handleNodeSelect}
          pan={pan}
          scale={scale}
        />
      )}

      {/* ── Right Floating Discovery & Filter Panel (Matching Image 1) ── */}
      <GraphDiscoverySidebar
        pages={pages}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedTag={tagFilter}
        onSelectTag={setTagFilter}
        linkFilters={linkFilters}
        onLinkFilterChange={setLinkFilters}
        onSelectNode={centerOnNode}
        activeId={activeId}
        totalLinksCount={links.length}
      />

      {/* Search overlay dropdown widget */}
      <GraphSearch
        pages={pages}
        onSelectNode={centerOnNode}
        onSearchChange={setSearchQuery}
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Node Detail Info Panel */}
      {selectedNodeId && (
        <GraphInfoPanel
          page={pages.find(p => p.id === selectedNodeId)}
          nodePosition={nodePositions[selectedNodeId]}
          onClose={() => setSelectedNodeId(null)}
          onCenter={() => centerOnNode(selectedNodeId)}
        />
      )}

      {/* Bottom-right Interactive Minimap (in Constellation mode) */}
      {viewMode === "constellation" && (
        <GraphMiniMap
          pages={pages}
          nodePositions={nodePositions}
          pan={pan}
          scale={scale}
          containerWidth={containerSize.width}
          containerHeight={containerSize.height}
          onPanChange={setPan}
          onResetView={handleCenterGraph}
          onFitGraph={handleFitGraph}
        />
      )}
    </div>
  );
}
