import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Globe2, ShieldCheck, Tag, Sparkles, Check, ArrowRight } from "lucide-react";
import { CanvasData } from "../canvasStore";
import { sanitizeBoardForPublishing, publishToMarketplace } from "./templateStore";
import { NoskaTemplate } from "./templateTypes";

interface MarketplacePublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardData: CanvasData;
  boardName: string;
  onPublished?: (template: NoskaTemplate) => void;
}

export default function MarketplacePublishModal({
  isOpen,
  onClose,
  boardData,
  boardName,
  onPublished
}: MarketplacePublishModalProps) {
  if (!isOpen) return null;

  const [name, setName] = useState(boardName || "My Workflow Template");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"team" | "personal">("team");
  const [tagsInput, setTagsInput] = useState("Agile, Product, Engineering");
  const [authorName, setAuthorName] = useState("Community Creator");
  const [isFree, setIsFree] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"form" | "preview">("form");

  const tags = tagsInput.split(",").map(t => t.trim()).filter(Boolean);

  const previewTemplate = sanitizeBoardForPublishing(boardData, {
    name,
    description: description || "A flexible collaborative board for fast-moving teams.",
    category,
    tags,
    authorName,
    isFree
  });

  const handlePublish = () => {
    setIsSubmitting(true);
    publishToMarketplace(previewTemplate);
    setTimeout(() => {
      setIsSubmitting(false);
      onPublished?.(previewTemplate);
      onClose();
    }, 400);
  };

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
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-400/15 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shadow-xs">
              <Globe2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Publish to Template Marketplace</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Share your framework with the Noska community
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {step === "form" ? (
            <>
              {/* Privacy strip alert */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-200 flex items-start gap-2.5">
                <ShieldCheck size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Privacy Guard Active:</strong> Private board contents and credentials will be stripped. Only column structures, tags, and generic card placeholders will be published.
                </div>
              </div>

              {/* Template Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-[#20232e] text-sm font-medium focus:ring-2 focus:ring-emerald-500/50 outline-none transition"
                  placeholder="e.g. Design Sprint 2.0 Board"
                />
              </div>

              {/* Short Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full p-3 rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-[#20232e] text-xs font-medium focus:ring-2 focus:ring-emerald-500/50 outline-none transition resize-none"
                  placeholder="Describe who this template is for and how to use it..."
                />
              </div>

              {/* Category & Author */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-[#20232e] text-xs font-medium outline-none"
                  >
                    <option value="team">Team & Work</option>
                    <option value="personal">Personal & Productivity</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Author / Creator Name
                  </label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-[#20232e] text-xs font-medium outline-none"
                    placeholder="e.g. Sarah Jenkins"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-[#20232e] text-xs font-medium outline-none"
                  placeholder="Design, Agile, Sprint, Planning"
                />
              </div>
            </>
          ) : (
            /* Sanitized Preview Screen */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#20232e] border border-black/10 dark:border-white/10">
                <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
                  <div>
                    <h4 className="text-sm font-bold">{previewTemplate.name}</h4>
                    <p className="text-xs text-slate-500">{previewTemplate.description}</p>
                  </div>
                  <span className="text-xs font-mono px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-bold">
                    FREE
                  </span>
                </div>
                <div className="pt-3">
                  <span className="text-[11px] font-bold uppercase text-slate-400">Sanitized Sections ({previewTemplate.sections.length})</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {previewTemplate.sections.map(s => (
                      <span key={s.id} className="text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-black/20 border border-black/5 dark:border-white/5 font-semibold">
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
          {step === "form" ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-black/5 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep("preview")}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
              >
                <span>Review Sanitized Preview</span>
                <ArrowRight size={14} />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep("form")}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-black/5 transition cursor-pointer"
              >
                Back to Edit
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handlePublish}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md flex items-center gap-2 transition active:scale-95 cursor-pointer"
              >
                {isSubmitting ? "Publishing..." : "Confirm & Publish to Marketplace"}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
