import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Check, Bookmark, ArrowRight, LayoutTemplate, Users } from "lucide-react";
import { NoskaTemplate, TeamScale, TemplateCustomizationOptions } from "./templateTypes";
import { generateSmartBoardName, saveToMyTemplates } from "./templateStore";
import { CanvasBoardMeta, STICKY_PALETTES } from "../canvasStore";

interface TemplateCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: NoskaTemplate | null;
  existingBoards: CanvasBoardMeta[];
  projectName?: string;
  onApply: (options: TemplateCustomizationOptions) => void;
}

export default function TemplateCustomizationModal({
  isOpen,
  onClose,
  template,
  existingBoards,
  projectName = "My Workspace",
  onApply,
}: TemplateCustomizationModalProps) {
  if (!isOpen || !template) return null;

  const defaultName = useMemo(() => {
    return generateSmartBoardName(template, existingBoards, projectName);
  }, [template, existingBoards, projectName]);

  const [boardName, setBoardName] = useState(defaultName);
  const [scale, setScale] = useState<TeamScale>("medium");
  const [enabledSections, setEnabledSections] = useState<string[]>(() =>
    template.sections.filter((s) => !s.isOptional || s.defaultEnabled).map((s) => s.id)
  );
  const [saveCustom, setSaveCustom] = useState(false);

  const toggleSection = (sectionId: string) => {
    setEnabledSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleApplyClick = () => {
    if (saveCustom) {
      saveToMyTemplates({
        ...template,
        name: `${template.name} (Custom)`,
        defaultNamePattern: boardName
      });
    }

    onApply({
      boardName: boardName.trim() || defaultName,
      enabledSections,
      scale,
      saveToMyTemplates: saveCustom,
      projectName
    });
  };

  const activeSections = template.sections.filter((s) => enabledSections.includes(s.id));

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 text-slate-900 dark:text-slate-100 select-none"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className="w-full max-w-2xl bg-white dark:bg-[#181a22] rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 dark:bg-amber-400/15 text-amber-600 dark:text-amber-300 flex items-center justify-center text-xl shadow-xs">
              {template.icon}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Customize {template.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tailor starter columns and size before creating your board
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Field 1: Board Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Board Name
            </label>
            <input
              type="text"
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-[#20232e] text-sm font-medium focus:ring-2 focus:ring-amber-500/50 outline-none transition"
              placeholder="e.g. Sprint Retro #12 — Web App"
            />
          </div>

          {/* Field 2: Optional Section Toggles */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Columns & Sections ({activeSections.length} active)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {template.sections.map((sec) => {
                const checked = enabledSections.includes(sec.id);
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => toggleSection(sec.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left text-xs font-semibold transition cursor-pointer ${
                      checked
                        ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700/60 text-slate-900 dark:text-slate-100"
                        : "bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5 text-slate-400"
                    }`}
                  >
                    <span className="truncate pr-2">{sec.name}</span>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center transition shrink-0 ${
                        checked ? "bg-amber-500 text-white" : "border border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      {checked && <Check size={12} strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Field 3: Team Scale Hint */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Team Scale / Starter Notes
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["small", "medium", "large"] as TeamScale[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScale(s)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs transition cursor-pointer ${
                    scale === s
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs font-bold"
                      : "bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:bg-black/5"
                  }`}
                >
                  <span className="capitalize font-bold">{s}</span>
                  <span className="text-[10px] opacity-75 mt-0.5">
                    {s === "small" ? "Lean (1-4)" : s === "medium" ? "Standard (5-10)" : "Squad (10+)"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Live Mini Preview Thumbnail */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Live Board Preview
            </label>
            <div className="w-full h-32 rounded-2xl bg-[#faf7f2] dark:bg-[#121318] border border-black/10 dark:border-white/10 p-3 overflow-x-auto flex gap-3 items-center scrollbar-none">
              {activeSections.map((sec) => (
                <div
                  key={sec.id}
                  className="w-28 h-26 rounded-xl border border-black/10 dark:border-white/10 bg-white/90 dark:bg-[#1a1c24]/90 p-2 flex flex-col justify-between shrink-0 shadow-xs"
                >
                  <span className="text-[9.5px] font-bold truncate text-slate-800 dark:text-slate-200">
                    {sec.name}
                  </span>
                  <div className="space-y-1 my-auto">
                    <div className="h-4 rounded-md bg-amber-100 dark:bg-amber-950/40 border border-amber-300/40" />
                    {scale !== "small" && (
                      <div className="h-4 rounded-md bg-sky-100 dark:bg-sky-950/40 border border-sky-300/40" />
                    )}
                  </div>
                  <span className="text-[8px] text-slate-400 uppercase font-mono">Column</span>
                </div>
              ))}
            </div>
          </div>

          {/* Save to My Templates Checkbox */}
          <div className="flex items-center gap-2 pt-2 border-t border-black/5 dark:border-white/5">
            <input
              type="checkbox"
              id="saveCustom"
              checked={saveCustom}
              onChange={(e) => setSaveCustom(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
            />
            <label htmlFor="saveCustom" className="text-xs text-slate-600 dark:text-slate-300 cursor-pointer flex items-center gap-1.5">
              <Bookmark size={12} className="text-amber-500" />
              <span>Save this customization as a reusable template under <strong>My Templates</strong></span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-black/5 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApplyClick}
            className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-md flex items-center gap-2 transition active:scale-95 cursor-pointer"
          >
            <span>Create Board</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
