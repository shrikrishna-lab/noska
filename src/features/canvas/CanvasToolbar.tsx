import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  LayoutTemplate,
  CheckSquare,
  Server,
  Users,
  ChevronDown,
  Layers,
  Award,
  Shapes
} from "lucide-react";

const DRAW_TOOLS = [
  { id: "select", icon: MousePointer2, label: "Select (V)" },
  { id: "pan", icon: Hand, label: "Pan (H)" },
  { id: "sticky", icon: StickyNote, label: "Sticky Note (S)" },
  { id: "connector", icon: Spline, label: "Connector (C)" },
];

const SHAPES_LIST = [
  { id: "rect", icon: Square, label: "Rectangle Frame" },
  { id: "ellipse", icon: Circle, label: "Circle Shape" },
  { id: "text", icon: Type, label: "Text Label" },
  { id: "frame", icon: Frame, label: "Section Frame" },
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
  onAddWorkflow?: () => void;
  onAddInfra?: () => void;
  onAddRole?: () => void;
  onAddClientBadge?: () => void;
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
  onAddWorkflow,
  onAddInfra,
  onAddRole,
  onAddClientBadge,
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
  const [nodesMenuOpen, setNodesMenuOpen] = useState(false);
  const [shapesMenuOpen, setShapesMenuOpen] = useState(false);

  const isShapeActive = ["rect", "ellipse", "text", "frame"].includes(tool);

  return (
    <motion.div
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 360, damping: 30 }}
      className="relative flex items-center gap-1.5 h-10 px-2 rounded-full bg-white/85 dark:bg-[#181920]/85 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.1] shadow-[0_12px_36px_-6px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.06)] overflow-x-auto scrollbar-none select-none whitespace-nowrap"
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

      {/* 2. Drawing Tools */}
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

          {/* Compact Shapes Menu */}
          <div className="relative shrink-0">
            <button
              onClick={() => {
                setShapesMenuOpen((prev) => !prev);
                setNodesMenuOpen(false);
              }}
              title="Shapes & Sections"
              className={`flex items-center gap-1 px-2 h-7.5 rounded-lg transition-all text-xs font-medium cursor-pointer ${
                isShapeActive
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs font-semibold"
                  : "bg-black/[0.04] dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 hover:bg-black/[0.08]"
              }`}
            >
              <Shapes size={13} />
              <ChevronDown size={10} className="opacity-60" />
            </button>

            <AnimatePresence>
              {shapesMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.96 }}
                  className="absolute left-0 top-full mt-2 w-44 rounded-2xl border border-black/10 dark:border-white/12 bg-white/95 dark:bg-[#181a24]/95 backdrop-blur-2xl shadow-2xl p-1.5 z-50 flex flex-col gap-0.5"
                >
                  {SHAPES_LIST.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        onToolChange(s.id);
                        setShapesMenuOpen(false);
                      }}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left transition text-xs font-medium cursor-pointer ${
                        tool === s.id
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                          : "hover:bg-black/[0.05] dark:hover:bg-white/[0.06] text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      <s.icon size={13} />
                      <span>{s.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
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

      {/* 4. Executive Nodes Menu */}
      <div className="relative shrink-0">
        <button
          onClick={() => {
            setNodesMenuOpen((prev) => !prev);
            setShapesMenuOpen(false);
          }}
          title="Add Executive Canvas Nodes"
          className="flex items-center gap-1 px-2.5 h-7.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 text-[11.5px] font-medium transition cursor-pointer"
        >
          <Layers size={12.5} className="text-blue-500" />
          <span>Nodes</span>
          <ChevronDown size={11} className="opacity-60" />
        </button>

        <AnimatePresence>
          {nodesMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.96 }}
              className="absolute left-0 top-full mt-2 w-52 rounded-2xl border border-black/10 dark:border-white/12 bg-white/95 dark:bg-[#181a24]/95 backdrop-blur-2xl shadow-2xl p-1.5 z-50 flex flex-col gap-1"
            >
              {onAddWorkflow && (
                <button
                  onClick={() => {
                    onAddWorkflow();
                    setNodesMenuOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-blue-500/10 text-slate-800 dark:text-slate-200 text-left transition text-xs font-medium cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <CheckSquare size={13} />
                  </div>
                  <div>
                    <div className="font-semibold text-[11.5px]">Workflow Tasks</div>
                    <div className="text-[9.5px] text-slate-400">To-Do overview & progress</div>
                  </div>
                </button>
              )}

              {onAddInfra && (
                <button
                  onClick={() => {
                    onAddInfra();
                    setNodesMenuOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-amber-500/10 text-slate-800 dark:text-slate-200 text-left transition text-xs font-medium cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Server size={13} />
                  </div>
                  <div>
                    <div className="font-semibold text-[11.5px]">Cloud Infrastructure</div>
                    <div className="text-[9.5px] text-slate-400">Region, metrics & health</div>
                  </div>
                </button>
              )}

              {onAddRole && (
                <button
                  onClick={() => {
                    onAddRole();
                    setNodesMenuOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-purple-500/10 text-slate-800 dark:text-slate-200 text-left transition text-xs font-medium cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Users size={13} />
                  </div>
                  <div>
                    <div className="font-semibold text-[11.5px]">Role & Team Card</div>
                    <div className="text-[9.5px] text-slate-400">Owner & tech stack chips</div>
                  </div>
                </button>
              )}

              {onAddClientBadge && (
                <button
                  onClick={() => {
                    onAddClientBadge();
                    setNodesMenuOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-emerald-500/10 text-slate-800 dark:text-slate-200 text-left transition text-xs font-medium cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Award size={13} />
                  </div>
                  <div>
                    <div className="font-semibold text-[11.5px]">Client Badge</div>
                    <div className="text-[9.5px] text-slate-400">Header milestone capsule</div>
                  </div>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 5. Smart Utilities */}
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

      {/* 6. Undo / Redo */}
      <div className="flex items-center gap-0.5 shrink-0">
        <ToolButton label="Undo (Ctrl+Z)" onClick={onUndo} disabled={!canUndo}>
          <Undo2 size={13.5} strokeWidth={2} />
        </ToolButton>
        <ToolButton label="Redo (Ctrl+Shift+Z)" onClick={onRedo} disabled={!canRedo}>
          <Redo2 size={13.5} strokeWidth={2} />
        </ToolButton>
      </div>

      <div className="w-px h-4 bg-black/[0.08] dark:bg-white/[0.1] mx-0.5 shrink-0" />

      {/* 7. Grid, Snap & Utilities */}
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
