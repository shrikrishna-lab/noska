import React from "react";
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
  Search 
} from "lucide-react";

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
  onToggleSearch
}) {
  const buttons = [
    { icon: <Search size={14} />, label: "Search Notes", onClick: onToggleSearch },
    { icon: <ZoomIn size={14} />, label: "Zoom In", onClick: onZoomIn },
    { icon: <ZoomOut size={14} />, label: "Zoom Out", onClick: onZoomOut },
    { icon: <Maximize size={14} />, label: "Fit View", onClick: onFitGraph },
    { icon: <Crosshair size={14} />, label: "Center View", onClick: onCenterGraph },
    { icon: <Sparkles size={14} className="text-yellow-400" />, label: "Auto Arrange Layout", onClick: onAutoArrange },
    { icon: <Type size={14} />, label: showLabels ? "Hide Labels" : "Show Labels", onClick: onToggleLabels, active: showLabels },
    { icon: animated ? <Pause size={14} /> : <Play size={14} />, label: animated ? "Pause Animation" : "Play Animation", onClick: onToggleAnimation, active: animated },
    { icon: <Download size={14} />, label: "Export Graph", onClick: onExport }
  ];

  return (
    <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 rounded-xl bg-[var(--elevated)]/80 backdrop-blur-md border border-[var(--border-strong)] p-1.5 shadow-lg">
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
          
          {/* Tooltip */}
          <span className="absolute bottom-full right-1/2 translate-x-1/2 mb-2 px-2 py-1 rounded bg-[var(--elevated)] border border-[var(--border)] text-[9px] text-[var(--text)] font-medium opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md z-30">
            {btn.label}
          </span>
        </button>
      ))}
    </div>
  );
}
