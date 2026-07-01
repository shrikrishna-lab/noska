import React, { useState } from "react";
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Crosshair, 
  Sparkles, 
  Type, 
  Play, 
  Pause, 
  Download, 
  Search,
  Filter,
  Tags,
  Circle
} from "lucide-react";
import GraphLayoutMenu from "./GraphLayoutMenu";

export default function GraphControls({
  onZoomIn,
  onZoomOut,
  onFitGraph,
  onCenterGraph,
  onAutoArrange,
  showLabels,
  onToggleLabels,
  animated,
  onToggleAnimation,
  onExport,
  onToggleSearch,
  linkFilters,
  onLinkFilterChange,
  tagFilter,
  onTagFilterChange,
  allTags,
  activeLayout,
  onApplyLayout,
  sizeByConnections,
  onToggleSizeByConnections
}) {
  const [showFilters, setShowFilters] = useState(false);

  const linkTypes = [
    { key: "hierarchy", label: "Parent", color: "text-blue-400" },
    { key: "tag", label: "Tag", color: "text-green-400" },
    { key: "mention", label: "Link", color: "text-orange-400" },
  ];

  const buttons = [
    { icon: <Search size={14} />, label: "Search Notes", onClick: onToggleSearch },
    { icon: <ZoomIn size={14} />, label: "Zoom In", onClick: onZoomIn },
    { icon: <ZoomOut size={14} />, label: "Zoom Out", onClick: onZoomOut },
    { icon: <Maximize size={14} />, label: "Fit View", onClick: onFitGraph },
    { icon: <Crosshair size={14} />, label: "Center View", onClick: onCenterGraph },
    { icon: <Sparkles size={14} className="text-[var(--warning)]" />, label: "Auto Arrange Layout", onClick: onAutoArrange },
    { icon: <Type size={14} />, label: showLabels ? "Hide Labels" : "Show Labels", onClick: onToggleLabels, active: showLabels },
    { icon: <Circle size={14} />, label: sizeByConnections ? "Uniform node size" : "Size by connections", onClick: onToggleSizeByConnections, active: sizeByConnections },
    { icon: animated ? <Pause size={14} /> : <Play size={14} />, label: animated ? "Pause Animation" : "Play Animation", onClick: onToggleAnimation, active: animated },
    { icon: <Filter size={14} />, label: "Toggle Filters", onClick: () => setShowFilters(!showFilters), active: showFilters },
    { icon: <Download size={14} />, label: "Export Graph", onClick: onExport }
  ];

  return (
    <>
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 rounded-xl bg-[var(--elevated)]/80 backdrop-blur-md border border-[var(--border-strong)] p-1.5 shadow-lg">
        <GraphLayoutMenu activeLayout={activeLayout} onApply={onApplyLayout} />
        <div className="w-px h-6 bg-[var(--border-strong)] mx-0.5" />
        {buttons.map((btn, index) => (
          <button
            key={index}
            onClick={btn.onClick}
            title={btn.label}
            aria-label={btn.label}
            className={`relative group flex items-center justify-center w-8 h-8 rounded-lg border transition-all cursor-pointer ${
              btn.active 
                ? "bg-[var(--accent)] border-[var(--accent)] text-white shadow-sm"
                : "bg-[var(--surface)]/50 border-[var(--border)] text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)] hover:border-[var(--secondary)]"
            }`}
          >
            {btn.icon}
            <span className="absolute bottom-full right-1/2 translate-x-1/2 mb-2 px-2 py-1 rounded bg-[var(--elevated)] border border-[var(--border)] text-[9px] text-[var(--text)] font-medium opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md z-30">
              {btn.label}
            </span>
          </button>
        ))}
      </div>

      {showFilters && (
        <div className="absolute top-16 right-4 z-20 flex flex-col gap-2 rounded-xl bg-[var(--elevated)]/80 backdrop-blur-md border border-[var(--border)] p-3 shadow-lg min-w-[180px]">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">Link Types</span>
          {linkTypes.map((lt) => (
            <label key={lt.key} className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text)] hover:text-[var(--accent)] transition-colors">
              <input
                type="checkbox"
                checked={linkFilters[lt.key]}
                onChange={(e) => onLinkFilterChange({ ...linkFilters, [lt.key]: e.target.checked })}
                className="accent-[var(--accent)]"
              />
              <span className={lt.color}>{lt.label}</span>
            </label>
          ))}
          {allTags.length > 0 && (
            <>
              <div className="border-t border-[var(--border)] my-1.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1 flex items-center gap-1">
                <Tags size={10} /> Tag Filter
              </span>
              <select
                value={tagFilter || ""}
                onChange={(e) => onTagFilterChange(e.target.value || null)}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--text)] outline-none"
              >
                <option value="">All tags</option>
                {allTags.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </>
          )}
        </div>
      )}
    </>
  );
}
