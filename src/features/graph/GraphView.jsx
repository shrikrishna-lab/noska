import React, { useState, useEffect, useRef, useMemo } from "react";
import GraphBackground from "./GraphBackground";
import GraphCanvas from "./GraphCanvas";
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

export default function GraphView({ pages, activeId, onSelect }) {
  const [nodePositions, setNodePositions] = useState({});
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [linkFilters, setLinkFilters] = useState({ hierarchy: true, tag: true, mention: true });
  const [tagFilter, setTagFilter] = useState(null);
  const [activeLayout, setActiveLayout] = useState("force");
  const [sizeByConnections, setSizeByConnections] = useState(false);
  
  // Respect prefers-reduced-motion setting
  const [animated, setAnimated] = useState(() => {
    try {
      return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return true;
    }
  });

  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const isDraggingBg = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Initialize and persist node positions
  useEffect(() => {
    const saved = localStorage.getItem("noska-graph-positions");
    const initialPos = saved ? JSON.parse(saved) : {};
    
    const visiblePages = pages.filter((p) => !p.trashed);
    const count = visiblePages.length;
    const centerX = 500;
    const centerY = 350;
    const radius = Math.min(220, count * 50 + 80);

    visiblePages.forEach((page, idx) => {
      if (!initialPos[page.id]) {
        const angle = (idx / count) * 2 * Math.PI;
        initialPos[page.id] = {
          x: centerX + radius * Math.cos(angle) - 80,
          y: centerY + radius * Math.sin(angle) - 20
        };
      }
    });

    setNodePositions(initialPos);
  }, [pages]);

  // Monitor canvas container dimensions for the minimap viewbox sizing
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

  // Drag Background to Pan Graph Viewport
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    // Verify target matches background canvas elements
    if (e.target !== e.currentTarget && !e.target.classList.contains("graph-bg")) return;
    
    isDraggingBg.current = true;
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    if (containerRef.current) containerRef.current.style.cursor = "grabbing";
  };

  const handleMouseMove = (e) => {
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

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomIntensity = 0.05;
    const delta = e.deltaY < 0 ? 1 : -1;
    const nextScale = Math.min(2.0, Math.max(0.25, scale + delta * zoomIntensity));
    setScale(nextScale);
  };

  // Node Drag Handlers
  const handleNodeDrag = (pageId, info) => {
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
  const centerOnNode = (nodeId) => {
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

  const handleNodeSelect = (nodeId) => {
    setSelectedNodeId(prev => prev === nodeId ? null : nodeId);
  };

  // Center Graph
  const handleCenterGraph = () => {
    setPan({ x: 0, y: 0 });
    setScale(1.0);
  };

  // Fit Graph bounds inside viewport
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
    maxX += 260; // offset width
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

  // Auto Arrange Physics calculation
  const handleAutoArrange = () => {
    const solvedPositions = autoArrangeLayout(pages, links, nodePositions, 500, 350);
    savePositions(solvedPositions);
    setActiveLayout("force");
  };

  // Apply a named layout algorithm (radial / circle / grid / timeline / force)
  const handleApplyLayout = (layoutId) => {
    setActiveLayout(layoutId);
    if (layoutId === "force") {
      handleAutoArrange();
      return;
    }
    const cx = 520, cy = 400;
    const solved = computeLayout(layoutId, pages, cx, cy);
    if (solved) {
      savePositions(solved);
      // Recenter after layout so the arrangement is visible
      setTimeout(() => handleFitGraph(), 30);
    }
  };

  // Degree map for optional connection-based node sizing
  const degrees = useMemo(() => computeDegrees(pages, links), [pages, links]);
  const maxDegree = useMemo(() => Math.max(1, ...Object.values(degrees)), [degrees]);

  // Export JSON Map
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
      className="relative flex-1 overflow-hidden select-none bg-[var(--editor)] border-t border-[var(--border)]"
      style={{ cursor: "grab" }}
    >
      {/* Composited Parallax Background layers */}
      <GraphBackground pan={pan} scale={scale} animated={animated} />

      {/* Main Canvas Viewport container */}
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
        onNodeSelect={onSelect}
        degrees={degrees}
        maxDegree={maxDegree}
        sizeByConnections={sizeByConnections}
      />

      {/* Top Left Navigation Trace */}
      <GraphBreadcrumb
        activeNodeClusterName={activeCluster?.name}
        totalNodesCount={pages.filter(p => !p.trashed).length}
      />

      {/* Top Right Floating Controls HUD */}
      <GraphControls
        onZoomIn={() => setScale(prev => Math.min(2.0, prev + 0.1))}
        onZoomOut={() => setScale(prev => Math.max(0.25, prev - 0.1))}
        onFitGraph={handleFitGraph}
        onCenterGraph={handleCenterGraph}
        onAutoArrange={handleAutoArrange}
        showLabels={showLabels}
        onToggleLabels={() => setShowLabels(!showLabels)}
        animated={animated}
        onToggleAnimation={() => setAnimated(!animated)}
        onExport={handleExport}
        onToggleSearch={() => setIsSearchOpen(!isSearchOpen)}
        onNodeSelect={handleNodeSelect}
        linkFilters={linkFilters}
        onLinkFilterChange={setLinkFilters}
        tagFilter={tagFilter}
        onTagFilterChange={setTagFilter}
        allTags={[...new Set(pages.filter(p => !p.trashed).flatMap(p => p.tags || []))]}
        activeLayout={activeLayout}
        onApplyLayout={handleApplyLayout}
        sizeByConnections={sizeByConnections}
        onToggleSizeByConnections={() => setSizeByConnections((s) => !s)}
      />

      {/* Search overlay dropdown widget */}
      <GraphSearch
        pages={pages}
        onSelectNode={centerOnNode}
        onSearchChange={setSearchQuery}
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Cluster Tags Map Legend */}
      <GraphLegend />

      {/* Node Detail Info Panel */}
      {selectedNodeId && (
        <GraphInfoPanel
          page={pages.find(p => p.id === selectedNodeId)}
          nodePosition={nodePositions[selectedNodeId]}
          onClose={() => setSelectedNodeId(null)}
          onCenter={() => centerOnNode(selectedNodeId)}
        />
      )}

      {/* Tag filter indicator */}
      {tagFilter && (
        <div className="absolute bottom-20 left-4 z-20 flex items-center gap-2 rounded-lg bg-[var(--elevated)]/80 backdrop-blur-md border border-[var(--border)] px-3 py-1.5 shadow-md">
          <span className="text-[10px] text-[var(--muted)]">Filtering:</span>
          <span className="text-[11px] font-medium text-[var(--text)]">{tagFilter}</span>
          <button
            onClick={() => setTagFilter(null)}
            className="ml-1 text-[var(--muted)] hover:text-[var(--text)] transition cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Figma styled bottom-right Interactive Minimap */}
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
    </div>
  );
}
