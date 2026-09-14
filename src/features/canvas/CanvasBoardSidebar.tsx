import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Copy, Trash2, Edit2, Check, X, LayoutTemplate, Layers, ChevronLeft, ChevronRight } from "lucide-react";
import { CanvasBoardMeta, BOARD_TEMPLATES } from "./canvasStore";

interface CanvasBoardSidebarProps {
  boards: CanvasBoardMeta[];
  activeBoardId: string;
  onSelectBoard: (boardId: string) => void;
  onCreateBoard: (name: string, template?: string) => void;
  onDuplicateBoard: (boardId: string) => void;
  onDeleteBoard: (boardId: string) => void;
  onRenameBoard: (boardId: string, newName: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onOpenTemplateBrowser?: () => void;
}

export default function CanvasBoardSidebar({
  boards,
  activeBoardId,
  onSelectBoard,
  onCreateBoard,
  onDuplicateBoard,
  onDeleteBoard,
  onRenameBoard,
  isOpen,
  onToggle,
  onOpenTemplateBrowser,
}: CanvasBoardSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | undefined>(undefined);

  const startRename = (board: CanvasBoardMeta) => {
    setEditingId(board.id);
    setRenameText(board.name);
  };

  const handleSaveRename = (boardId: string) => {
    if (renameText.trim()) {
      onRenameBoard(boardId, renameText.trim());
    }
    setEditingId(null);
  };

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateBoard(newBoardName.trim() || "Untitled Board", selectedTemplate);
    setNewBoardName("");
    setSelectedTemplate(undefined);
    setShowTemplateModal(false);
  };

  return (
    <>
      <AnimatePresence>
        {/* Expanded Sidebar Floating Panel */}
      {isOpen && (
        <motion.aside
          initial={{ opacity: 0, x: -16, y: 0, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          exit={{ opacity: 0, x: -12, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
          className="absolute left-4 top-15 z-40 w-72 rounded-3xl border border-black/10 dark:border-white/15 bg-white/90 dark:bg-[#14161f]/90 backdrop-blur-2xl p-4 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] flex flex-col gap-3.5"
          style={{ maxHeight: "calc(100vh - 120px)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-black/[0.06] dark:border-white/[0.08]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400/20 to-orange-500/20 border border-amber-500/25 flex items-center justify-center text-amber-500 shadow-2xs">
                <Layers size={13} strokeWidth={2.2} />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                Canvases & Boards
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                {boards.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowTemplateModal(true)}
                title="New Board from Template"
                className="h-6.5 px-2 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center gap-1 text-[11px] font-semibold hover:opacity-90 transition active:scale-95 cursor-pointer shadow-xs"
              >
                <Plus size={12} strokeWidth={2.5} />
                <span>New</span>
              </button>
              <button
                onClick={onToggle}
                className="h-6.5 w-6.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center transition cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
            </div>
          </div>

          {/* Board List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin pr-1">
            {boards.map((b) => {
              const isActive = b.id === activeBoardId;
              const isEditing = editingId === b.id;

              return (
                <div
                  key={b.id}
                  onClick={() => !isEditing && onSelectBoard(b.id)}
                  className={`group relative flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs transition cursor-pointer ${
                    isActive
                      ? "bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-900/50 font-semibold shadow-2xs"
                      : "text-slate-600 dark:text-slate-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-sm shrink-0">{b.icon || "🎨"}</span>
                    {isEditing ? (
                      <input
                        type="text"
                        autoFocus
                        value={renameText}
                        onChange={(e) => setRenameText(e.target.value)}
                        onBlur={() => handleSaveRename(b.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveRename(b.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="w-full bg-white dark:bg-black/40 rounded px-1.5 py-0.5 text-xs text-[var(--text)] outline-none ring-1 ring-amber-400"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="truncate tracking-tight">{b.name}</span>
                    )}
                  </div>

                  {/* Actions on hover */}
                  {!isEditing && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startRename(b);
                        }}
                        title="Rename"
                        className="h-5 w-5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center transition"
                      >
                        <Edit2 size={11} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateBoard(b.id);
                        }}
                        title="Duplicate"
                        className="h-5 w-5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center transition"
                      >
                        <Copy size={11} />
                      </button>
                      {boards.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete board "${b.name}"?`)) onDeleteBoard(b.id);
                          }}
                          title="Delete"
                          className="h-5 w-5 rounded text-slate-400 hover:text-red-500 flex items-center justify-center transition"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* New Board Action */}
          <button
            onClick={() => setShowTemplateModal(true)}
            className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-xl border border-dashed border-black/10 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:border-black/20 text-xs font-medium transition cursor-pointer"
          >
            <LayoutTemplate size={13} />
            <span>New from Template</span>
          </button>
        </motion.aside>
      )}
    </AnimatePresence>

    {/* New Board / Template Modal */}
    {showTemplateModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowTemplateModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-black/10 dark:border-white/15 bg-white dark:bg-[#181a22] p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-amber-500/15 text-amber-600 grid place-items-center">
                  <LayoutTemplate size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text)]">Create New Whiteboard</h3>
                  <p className="text-xs text-slate-500">Pick a template or start blank</p>
                </div>
              </div>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="h-7 w-7 rounded-full bg-black/5 dark:bg-white/5 text-slate-400 hover:text-slate-700 dark:hover:text-white grid place-items-center transition cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleCreateNew} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">Board Name</label>
                <input
                  type="text"
                  autoFocus
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  placeholder="e.g. Q3 Sprint Retro, Architecture Flow..."
                  className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] px-3.5 py-2.5 text-xs text-[var(--text)] outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-2">Select Template</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <div
                    onClick={() => setSelectedTemplate(undefined)}
                    className={`p-3 rounded-2xl border transition cursor-pointer ${
                      selectedTemplate === undefined
                        ? "bg-amber-50/80 dark:bg-amber-950/40 border-amber-500 ring-1 ring-amber-500/30"
                        : "bg-black/[0.02] dark:bg-white/[0.03] border-black/8 dark:border-white/8 hover:border-black/20"
                    }`}
                  >
                    <div className="text-base mb-1">🎨</div>
                    <div className="text-xs font-bold text-[var(--text)]">Blank Canvas</div>
                    <div className="text-[11px] text-slate-500 line-clamp-2">Start with a clean slate for freeform notes and shapes.</div>
                  </div>

                  {Object.values(BOARD_TEMPLATES).map((tmpl) => (
                    <div
                      key={tmpl.id}
                      onClick={() => setSelectedTemplate(tmpl.id)}
                      className={`p-3 rounded-2xl border transition cursor-pointer ${
                        selectedTemplate === tmpl.id
                          ? "bg-amber-50/80 dark:bg-amber-950/40 border-amber-500 ring-1 ring-amber-500/30"
                          : "bg-black/[0.02] dark:bg-white/[0.03] border-black/8 dark:border-white/8 hover:border-black/20"
                      }`}
                    >
                      <div className="text-base mb-1">{tmpl.icon}</div>
                      <div className="text-xs font-bold text-[var(--text)]">{tmpl.name}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-2">{tmpl.description}</div>
                    </div>
                  ))}
                </div>

                {onOpenTemplateBrowser && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowTemplateModal(false);
                      onOpenTemplateBrowser();
                    }}
                    className="w-full mt-2 py-2 px-3 rounded-xl border border-dashed border-amber-400/60 bg-amber-50/40 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 text-xs font-semibold hover:bg-amber-100/50 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Browse All 11+ Templates & Marketplace</span>
                    <span>→</span>
                  </button>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/5 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold shadow-md transition active:scale-95 cursor-pointer"
                >
                  Create Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
