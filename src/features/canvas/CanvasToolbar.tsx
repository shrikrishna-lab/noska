import React from "react";
import { motion } from "framer-motion";
import {
  MousePointer2,
  Hand,
  StickyNote,
  Square,
  Circle,
  Type,
  Frame,
  Spline,
  Undo2,
  Redo2,
  Grid3x3,
  Magnet,
  Plus,
  Tag,
  Sparkles,
  Kanban,
  LayoutGrid,
  Wand2,
  Volume2,
  VolumeX,
  Maximize2,
  LayoutTemplate
} from "lucide-react";

const DRAW_TOOLS = [
  { id: "select", icon: MousePointer2, label: "Select (V)" },
  { id: "pan", icon: Hand, label: "Pan (H)" },
  { id: "sticky", icon: StickyNote, label: "Sticky Note (S)" },
  { id: "connector", icon: Spline, label: "Connector (C)" },
];

const SHAPE_TOOLS = [
  { id: "rect", icon: Square, label: "Frame (R)" },
  { id: "ellipse", icon: Circle, label: "Circle (O)" },
  { id: "text", icon: Type, label: "Text (T)" },
  { id: "frame", icon: Frame, label: "Section (F)" },
];

interface ToolButtonProps {
  active?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  badge?: React.ReactNode;
}

function ToolButton({ active, label, onClick, children, disabled, badge }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`relative group flex items-center justify-center w-7.5 h-7.5 rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed select-none shrink-0 ${
        active
          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs font-semibold"
          : "bg-transparent text-slate-600 dark:text-slate-300 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] hover:text-slate-900 dark:hover:text-white"
      }`}
    >
      {children}
      {badge && <span className="absolute -top-1 -right-1">{badge}</span>}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md bg-slate-900/90 dark:bg-black/90 text-white text-[10.5px] font-medium opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-50 backdrop-blur-md">
        {label}
      </span>
    </button>
  );
}

interface CanvasToolbarProps {
  tool: string;
  onToolChange: (toolId: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  snapEnabled: boolean;
  onToggleSnap: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  onAddCard: () => void;
  showLegend?: boolean;
  onToggleLegend?: () => void;
  viewMode?: "flow" | "kanban";
  onToggleViewMode?: (mode: "flow" | "kanban") => void;
  onAutoTidy?: () => void;
  onAutoConnect?: () => void;
  onOpenAIModal?: () => void;
  onToggleBoards?: () => void;
  boardsCount?: number;
  soundActive?: boolean;
  onToggleSound?: () => void;
  onPresentationMode?: () => void;
  onOpenTemplates?: () => void;
}

export default function CanvasToolbar({
  tool,
  onToolChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  snapEnabled,
  onToggleSnap,
  showGrid,
  onToggleGrid,
  onAddCard,
  showLegend,
  onToggleLegend,
  viewMode = "flow",
  onToggleViewMode,
  onAutoTidy,
  onAutoConnect,
  onOpenAIModal,
  onToggleBoards,
  boardsCount = 1,
  soundActive = true,
  onToggleSound,
  onPresentationMode,
  onOpenTemplates,
}: CanvasToolbarProps) {
  return (
    <motion.div
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 360, damping: 30 }}
      className="absolute top-3.5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 h-10 px-2 rounded-full bg-white/80 dark:bg-[#181920]/80 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.1] shadow-[0_12px_36px_-6px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.06)] max-w-[calc(100vw-32px)] overflow-x-auto scrollbar-none select-none whitespace-nowrap"
    >
      {/* 1. Mode Switcher (Apple Segments) */}
      {onToggleViewMode && (
        <div className="flex items-center p-0.5 rounded-full bg-black/[0.05] dark:bg-white/[0.07] shrink-0">
          <button
            onClick={() => onToggleViewMode("flow")}
            title="Freeform Flow View"
            className={`flex items-center gap-1 px-2.5 h-6.5 rounded-full text-[11.5px] font-medium transition cursor-pointer ${
              viewMode === "flow"
                ? "bg-white dark:bg-[#282a36] text-slate-900 dark:text-white shadow-xs font-semibold"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <LayoutGrid size={12} strokeWidth={2.2} />
            <span>Flow</span>
          </button>
          <button
            onClick={() => onToggleViewMode("kanban")}
            title="Kanban Columns View"
            className={`flex items-center gap-1 px-2.5 h-6.5 rounded-full text-[11.5px] font-medium transition cursor-pointer ${
              viewMode === "kanban"
                ? "bg-white dark:bg-[#282a36] text-slate-900 dark:text-white shadow-xs font-semibold"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Kanban size={12} strokeWidth={2.2} />
            <span>Kanban</span>
          </button>
        </div>
      )}

      {/* 2. Drawing & Selection Tools (Only in Flow Mode) */}
      {viewMode === "flow" && (
        <>
          <div className="w-px h-4 bg-black/[0.08] dark:bg-white/[0.1] mx-0.5 shrink-0" />
          <div className="flex items-center gap-0.5 shrink-0">
            {DRAW_TOOLS.map((t) => (
              <ToolButton key={t.id} active={tool === t.id} label={t.label} onClick={() => onToolChange(t.id)}>
                <t.icon size={14} strokeWidth={2} />
              </ToolButton>
            ))}
          </div>

          <div className="w-px h-4 bg-black/[0.08] dark:bg-white/[0.1] mx-0.5 shrink-0" />
          <div className="flex items-center gap-0.5 shrink-0">
            {SHAPE_TOOLS.map((t) => (
              <ToolButton key={t.id} active={tool === t.id} label={t.label} onClick={() => onToolChange(t.id)}>
                <t.icon size={14} strokeWidth={2} />
              </ToolButton>
            ))}
          </div>
        </>
      )}

      <div className="w-px h-4 bg-black/[0.08] dark:bg-white/[0.1] mx-0.5 shrink-0" />

      {/* 3. Primary Action: Add Note */}
      <button
        onClick={onAddCard}
        title="Add sticky note"
        className="flex items-center gap-1.5 px-3 h-7.5 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-[11.5px] font-semibold shadow-xs transition active:scale-95 cursor-pointer shrink-0"
      >
        <Plus size={13} strokeWidth={2.6} />
        <span>Note</span>
      </button>

      {/* 4. Smart Utilities (Clean Linear Ghost Buttons) */}
      {viewMode === "flow" && onAutoTidy && (
        <button
          onClick={onAutoTidy}
          title="Auto-Tidy: Topological layout flow"
          className="flex items-center gap-1.5 px-2.5 h-7.5 rounded-full text-slate-600 dark:text-slate-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-[11.5px] font-medium transition cursor-pointer shrink-0"
        >
          <Sparkles size={12.5} className="text-amber-500" />
          <span>Tidy</span>
        </button>
      )}

      {viewMode === "flow" && onAutoConnect && (
        <button
          onClick={onAutoConnect}
          title="Auto-Link: Connect related notes"
          className="flex items-center gap-1.5 px-2.5 h-7.5 rounded-full text-slate-600 dark:text-slate-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-[11.5px] font-medium transition cursor-pointer shrink-0"
        >
          <Wand2 size={12.5} className="text-emerald-500" />
          <span>Link</span>
        </button>
      )}

      {onOpenAIModal && (
        <button
          onClick={onOpenAIModal}
          title="AI Synthesis & Document Bridge"
          className="flex items-center gap-1.5 px-2.5 h-7.5 rounded-full bg-purple-500/10 dark:bg-purple-400/15 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 text-[11.5px] font-medium transition cursor-pointer shrink-0"
        >
          <Sparkles size={12.5} className="text-purple-600 dark:text-purple-400" />
          <span>AI & Sync</span>
        </button>
      )}

      <div className="w-px h-4 bg-black/[0.08] dark:bg-white/[0.1] mx-0.5 shrink-0" />

      {/* 5. Undo / Redo */}
      <div className="flex items-center gap-0.5 shrink-0">
        <ToolButton label="Undo (Ctrl+Z)" onClick={onUndo} disabled={!canUndo}>
          <Undo2 size={13.5} strokeWidth={2} />
        </ToolButton>
        <ToolButton label="Redo (Ctrl+Shift+Z)" onClick={onRedo} disabled={!canRedo}>
          <Redo2 size={13.5} strokeWidth={2} />
        </ToolButton>
      </div>

      <div className="w-px h-4 bg-black/[0.08] dark:bg-white/[0.1] mx-0.5 shrink-0" />

      {/* 6. Grid, Snap & Legend */}
      <div className="flex items-center gap-0.5 shrink-0">
        {viewMode === "flow" && (
          <>
            <ToolButton
              label={snapEnabled ? "Snap: Active" : "Snap: Off"}
              active={snapEnabled}
              onClick={onToggleSnap}
            >
              <Magnet size={13.5} strokeWidth={2} />
            </ToolButton>
            <ToolButton
              label={showGrid ? "Dot Grid: Visible" : "Dot Grid: Hidden"}
              active={showGrid}
              onClick={onToggleGrid}
            >
              <Grid3x3 size={13.5} strokeWidth={2} />
            </ToolButton>
          </>
        )}
        {onToggleLegend && (
          <ToolButton
            label="Category Legend"
            active={showLegend}
            onClick={onToggleLegend}
          >
            <Tag size={13.5} strokeWidth={2} />
          </ToolButton>
        )}
        {onToggleSound && (
          <ToolButton
            label={soundActive ? "Sound FX: On" : "Sound FX: Muted"}
            active={soundActive}
            onClick={onToggleSound}
          >
            {soundActive ? <Volume2 size={13.5} strokeWidth={2} /> : <VolumeX size={13.5} strokeWidth={2} />}
          </ToolButton>
        )}
        {onPresentationMode && (
          <ToolButton
            label="Presentation Mode (Cmd+Shift+P)"
            onClick={onPresentationMode}
          >
            <Maximize2 size={13.5} strokeWidth={2} />
          </ToolButton>
        )}
        {onOpenTemplates && (
          <ToolButton
            label="Templates & Marketplace"
            onClick={onOpenTemplates}
          >
            <LayoutTemplate size={13.5} strokeWidth={2} />
          </ToolButton>
        )}
      </div>
    </motion.div>
  );
}
