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
  Circle,
  SlidersHorizontal
} from "lucide-react";
import GraphLayoutMenu from "./GraphLayoutMenu";

interface GraphControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitGraph: () => void;
  onCenterGraph: () => void;
  onAutoArrange: () => void;
  showLabels: boolean;
  onToggleLabels: () => void;
  animated: boolean;
  onToggleAnimation: () => void;
  onExport: () => void;
  activeLayout: string;
  onApplyLayout: (layoutId: string) => void;
  sizeByConnections: boolean;
  onToggleSizeByConnections: () => void;
}

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
  activeLayout,
  onApplyLayout,
  sizeByConnections,
  onToggleSizeByConnections
}: GraphControlsProps) {
  const buttons = [
    { icon: <ZoomIn size={13.5} strokeWidth={2} />, label: "Zoom In", onClick: onZoomIn },
    { icon: <ZoomOut size={13.5} strokeWidth={2} />, label: "Zoom Out", onClick: onZoomOut },
    { icon: <Maximize size={13.5} strokeWidth={2} />, label: "Fit View", onClick: onFitGraph },
    { icon: <Crosshair size={13.5} strokeWidth={2} />, label: "Center Graph", onClick: onCenterGraph },
    { 
      icon: <Sparkles size={13.5} strokeWidth={2} className="text-amber-500" />, 
      label: "Auto Arrange (Force Physics)", 
      onClick: onAutoArrange 
    },
    { 
      icon: <Type size={13.5} strokeWidth={2} />, 
      label: showLabels ? "Hide Labels" : "Show Labels", 
      onClick: onToggleLabels, 
      active: showLabels 
    },
    { 
      icon: <Circle size={13.5} strokeWidth={2} />, 
      label: sizeByConnections ? "Uniform Node Size" : "Scale by Connections", 
      onClick: onToggleSizeByConnections, 
      active: sizeByConnections 
    },
    { 
      icon: animated ? <Pause size={13.5} strokeWidth={2} /> : <Play size={13.5} strokeWidth={2} />, 
      label: animated ? "Pause Animation" : "Play Animation", 
      onClick: onToggleAnimation, 
      active: animated 
    },
    { icon: <Download size={13.5} strokeWidth={2} />, label: "Export JSON", onClick: onExport }
  ];

  return (
    <div className="flex items-center gap-0.5 h-10 px-2 rounded-full bg-white/90 dark:bg-[#181920]/90 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.12] shadow-[0_8px_24px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.08)] select-none">
      <GraphLayoutMenu activeLayout={activeLayout} onApply={onApplyLayout} />
      <div className="w-px h-3.5 bg-black/10 dark:bg-white/10 mx-1 shrink-0" />
      {buttons.map((btn, index) => (
        <button
          key={index}
          onClick={btn.onClick}
          title={btn.label}
          aria-label={btn.label}
          className={`relative group flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150 cursor-pointer ${
            btn.active 
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs font-semibold"
              : "text-slate-600 dark:text-slate-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          {btn.icon}
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md bg-slate-900/90 dark:bg-black/90 text-white text-[10.5px] font-medium opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-50 backdrop-blur-md">
            {btn.label}
          </span>
        </button>
      ))}
    </div>
  );
}
