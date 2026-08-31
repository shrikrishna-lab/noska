import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ArrowRight,
  Sparkles,
  Layers,
  Zap,
  CheckSquare,
  Users,
  ShieldCheck,
  Star,
  Download
} from "lucide-react";
import { NoskaTemplate } from "./templateTypes";
import { STICKY_PALETTES } from "../canvasStore";

interface TemplateSamplePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: NoskaTemplate | null;
  onUseTemplate: (template: NoskaTemplate) => void;
}

export default function TemplateSamplePreviewModal({
  isOpen,
  onClose,
  template,
  onUseTemplate
}: TemplateSamplePreviewModalProps) {
  const [activeTab, setActiveTab] = useState<"canvas" | "rules" | "reviews">("canvas");

  if (!isOpen || !template) return null;

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
        className="w-full max-w-5xl bg-white dark:bg-[#151720] rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-black/5 dark:border-white/5 bg-slate-50/60 dark:bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-300 flex items-center justify-center text-2xl shadow-xs">
              {template.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {template.name}
                </h3>
                {template.isOfficial ? (
                  <span className="px-2 py-0.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[9px] font-bold uppercase tracking-wider">
                    Official
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold">
                    Community
                  </span>
                )}
                {template.version && (
                  <span className="text-[10px] text-slate-400 font-mono">v{template.version}</span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                {template.description}
              </p>
            </div>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                onClose();
                onUseTemplate(template);
              }}
              className="px-5 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <span>Use This Template</span>
              <ArrowRight size={14} />
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Subheader Navigation Pills */}
        <div className="px-6 py-2.5 border-b border-black/5 dark:border-white/5 flex items-center justify-between text-xs bg-slate-50/30 dark:bg-white/[0.01]">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("canvas")}
              className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "canvas"
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Layers size={13} />
              <span>Sample Board ({template.sections.length} columns)</span>
            </button>
            {template.workflowRules && template.workflowRules.length > 0 && (
              <button
                onClick={() => setActiveTab("rules")}
                className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "rules"
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Zap size={13} />
                <span>Automations ({template.workflowRules.length})</span>
              </button>
            )}
            {template.reviews && template.reviews.length > 0 && (
              <button
                onClick={() => setActiveTab("reviews")}
                className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "reviews"
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Star size={13} />
                <span>Reviews ({template.reviews.length})</span>
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-400 hidden sm:block">
            {template.installCount?.toLocaleString() || 0} teams using this workflow
          </div>
        </div>

        {/* Preview Body */}
        <div className="flex-1 p-6 overflow-y-auto bg-[#faf7f2] dark:bg-[#11131a]">
          {activeTab === "canvas" && (
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
              {template.sections.map((sec, idx) => {
                const sectionCards = template.starterCards.filter(c => c.sectionId === sec.id);
                return (
                  <div
                    key={sec.id}
                    className="w-72 shrink-0 rounded-2xl bg-white/85 dark:bg-[#1a1d28]/85 border border-black/10 dark:border-white/10 p-3.5 shadow-sm flex flex-col gap-3"
                  >
                    {/* Section Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {sec.name}
                      </span>
                      {sec.roleHint && (
                        <span className="text-[9.5px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium">
                          👤 {sec.roleHint}
                        </span>
                      )}
                    </div>

                    {/* Section Starter Notes */}
                    <div className="space-y-2.5">
                      {sectionCards.map((card, cIdx) => (
                        <div
                          key={cIdx}
                          className="p-3 rounded-xl bg-[#fffef0] dark:bg-[#202433] border border-amber-200/60 dark:border-white/10 text-xs shadow-2xs space-y-1.5"
                          style={{
                            transform: `rotate(${((cIdx % 3) - 1) * 0.6}deg)`
                          }}
                        >
                          {card.statusTag && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold uppercase">
                              {card.statusTag}
                            </span>
                          )}
                          <p className="text-slate-800 dark:text-slate-200 leading-snug font-medium">
                            {card.text}
                          </p>
                        </div>
                      ))}

                      {sectionCards.length === 0 && (
                        <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-black/10 dark:border-white/10 rounded-xl">
                          Starter column for new notes
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "rules" && (
            <div className="max-w-2xl mx-auto space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Built-in Automation Rules (JSON Schema)
              </h4>
              {template.workflowRules?.map(rule => (
                <div
                  key={rule.id}
                  className="p-4 rounded-2xl bg-white dark:bg-[#1a1d28] border border-black/10 dark:border-white/10 shadow-xs flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                      <Zap size={16} />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">{rule.name}</h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Trigger: <code className="font-mono text-amber-600">{rule.trigger}</code> → Action: <code className="font-mono text-blue-500">{rule.action.type} ({rule.action.badgeText})</code>
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                    Active
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "reviews" && (
            <div className="max-w-2xl mx-auto space-y-3">
              {template.reviews?.map(rev => (
                <div
                  key={rev.id}
                  className="p-4 rounded-2xl bg-white dark:bg-[#1a1d28] border border-black/10 dark:border-white/10 shadow-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{rev.authorName}</span>
                      {rev.verifiedUser && (
                        <span className="text-[9.5px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 font-bold">
                          ✓ Verified Board User
                        </span>
                      )}
                    </div>
                    <div className="flex text-amber-500">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <Star key={i} size={11} fill="currentColor" />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    "{rev.comment}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
