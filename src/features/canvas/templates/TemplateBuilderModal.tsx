import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  Zap,
  CheckSquare,
  Layers,
  ArrowRight,
  Bookmark,
  Globe2
} from "lucide-react";
import { NoskaTemplate, TemplateSectionConfig, TemplateStarterCard, WorkflowRule } from "./templateTypes";
import { saveToMyTemplates } from "./templateStore";
import { uid } from "../canvasStore";

interface TemplateBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (template: NoskaTemplate) => void;
}

export default function TemplateBuilderModal({
  isOpen,
  onClose,
  onSaved
}: TemplateBuilderModalProps) {
  if (!isOpen) return null;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("✨");
  const [category, setCategory] = useState<"team" | "personal">("team");
  const [tagsInput, setTagsInput] = useState("Custom, Agile, Workflow");
  const [visibility, setVisibility] = useState<"private" | "workspace" | "public">("private");

  const [sections, setSections] = useState<TemplateSectionConfig[]>([
    { id: "col_1", name: "📌 Ideas & Input", color: "yellow", defaultEnabled: true, roleHint: "Everyone" },
    { id: "col_2", name: "⚡ In Progress", color: "blue", defaultEnabled: true, roleHint: "Assignee" },
    { id: "col_3", name: "✅ Complete", color: "green", defaultEnabled: true, roleHint: "Lead / QA" }
  ]);

  const [starterCards, setStarterCards] = useState<TemplateStarterCard[]>([
    { sectionId: "col_1", text: "Starter idea note", color: "yellow", scaleTier: "all" },
    { sectionId: "col_2", text: "Key task in build", color: "blue", scaleTier: "all" }
  ]);

  const [checklistItems, setChecklistItems] = useState<string[]>([
    "Review requirements",
    "Finalize design specs"
  ]);

  const addSection = () => {
    const id = `col_${sections.length + 1}`;
    setSections([...sections, { id, name: `Section ${sections.length + 1}`, color: "peach", defaultEnabled: true }]);
  };

  const removeSection = (id: string) => {
    if (sections.length <= 1) return;
    setSections(sections.filter(s => s.id !== id));
    setStarterCards(starterCards.filter(c => c.sectionId !== id));
  };

  const updateSection = (id: string, updates: Partial<TemplateSectionConfig>) => {
    setSections(sections.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const addCard = (sectionId: string) => {
    setStarterCards([...starterCards, { sectionId, text: "New example card", scaleTier: "all" }]);
  };

  const removeCard = (idx: number) => {
    setStarterCards(starterCards.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    if (!name.trim()) return;

    const newTemplate: NoskaTemplate = {
      id: `custom_${uid("tmpl")}`,
      name: name.trim(),
      description: description.trim() || "Custom user template",
      icon: icon || "✨",
      category,
      tags: tagsInput.split(",").map(t => t.trim()).filter(Boolean),
      isOfficial: false,
      isCommunity: visibility === "public",
      visibility,
      defaultNamePattern: `${name.trim()} — {{project}} — {{date}}`,
      sections,
      starterCards,
      checklist: checklistItems.map((label, idx) => ({ id: `chk_${idx + 1}`, label, completed: false })),
      workflowRules: [
        {
          id: `rule_done_${uid()}`,
          name: "Mark Complete on Finish",
          trigger: "card_moved_to_section",
          condition: { sectionId: sections[sections.length - 1]?.id },
          action: { type: "update_status", badgeText: "Done", badgeColor: "#10b981" }
        }
      ],
      createdAt: new Date().toISOString()
    };

    saveToMyTemplates(newTemplate);
    onSaved(newTemplate);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 text-slate-900 dark:text-slate-100 select-none"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 15 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className="w-full max-w-4xl bg-white dark:bg-[#151720] rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-black/5 dark:border-white/5 bg-slate-50/60 dark:bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-300 flex items-center justify-center text-xl shadow-xs">
              🛠️
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Create New Template
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Design custom columns, starter notes, and automated workflow triggers
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

        {/* Builder Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/30 dark:bg-[#11131a]">
          {/* Metadata Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Template Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Design Sprint 2.0 or Client Onboarding"
                className="w-full h-10 px-3.5 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1f222e] text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Icon & Category
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  className="w-12 h-10 text-center rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1f222e] text-lg font-medium outline-none"
                />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="flex-1 h-10 px-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1f222e] text-xs font-medium outline-none"
                >
                  <option value="team">Team & Work</option>
                  <option value="personal">Personal</option>
                </select>
              </div>
            </div>
          </div>

          {/* Description & Visibility */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short summary of what this workflow is for..."
                className="w-full h-10 px-3.5 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1f222e] text-xs font-medium outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Visibility
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as any)}
                className="w-full h-10 px-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1f222e] text-xs font-medium outline-none"
              >
                <option value="private">Private (Only Me)</option>
                <option value="workspace">Workspace Team</option>
                <option value="public">Public Marketplace</option>
              </select>
            </div>
          </div>

          {/* Columns & Sections Builder */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Columns & Sections ({sections.length})
              </label>
              <button
                type="button"
                onClick={addSection}
                className="px-3 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-300 hover:bg-amber-500/20 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <Plus size={12} />
                <span>Add Column</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {sections.map((sec, idx) => (
                <div
                  key={sec.id}
                  className="p-3.5 rounded-2xl bg-white dark:bg-[#1f222e] border border-black/10 dark:border-white/10 shadow-xs space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Column {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeSection(sec.id)}
                      className="text-slate-400 hover:text-red-500 transition cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={sec.name}
                    onChange={(e) => updateSection(sec.id, { name: e.target.value })}
                    className="w-full h-8 px-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-black/20 text-xs font-bold outline-none"
                  />

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={sec.roleHint || ""}
                      onChange={(e) => updateSection(sec.id, { roleHint: e.target.value })}
                      placeholder="Role Hint (e.g. Lead)"
                      className="w-full h-7 px-2 rounded-lg border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-black/20 text-[11px] outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-black/5 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!name.trim()}
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-md flex items-center gap-2 transition active:scale-95 disabled:opacity-40 cursor-pointer"
          >
            <Bookmark size={14} />
            <span>Save Template</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
