import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  TrendingUp,
  Download,
  Star,
  Layers,
  Upload,
  Sparkles,
  GitBranch,
  ShieldCheck,
  DollarSign
} from "lucide-react";
import { NoskaTemplate, CreatorStats } from "./templateTypes";
import { loadMarketplaceTemplates, loadMyTemplates } from "./templateStore";

interface TemplateCreatorDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TemplateCreatorDashboardModal({
  isOpen,
  onClose
}: TemplateCreatorDashboardModalProps) {
  if (!isOpen) return null;

  const myTemplates = loadMyTemplates();
  const publishedTemplates = myTemplates.filter(t => t.isCommunity || t.visibility === "public");

  const [selectedTemplate, setSelectedTemplate] = useState<NoskaTemplate | null>(
    publishedTemplates[0] || myTemplates[0] || null
  );
  const [newVersion, setNewVersion] = useState("1.1.0");
  const [changelog, setChangelog] = useState("");
  const [versionSaved, setVersionSaved] = useState(false);

  const totalInstalls = publishedTemplates.reduce((acc, t) => acc + (t.installCount || 0), 1420);
  const avgRating = 4.9;

  const handlePushUpdate = () => {
    if (!changelog.trim() || !selectedTemplate) return;
    setVersionSaved(true);
    setTimeout(() => {
      setVersionSaved(false);
      setChangelog("");
    }, 1500);
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
        className="w-full max-w-4xl bg-white dark:bg-[#151720] rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-black/5 dark:border-white/5 bg-slate-50/60 dark:bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-300 flex items-center justify-center text-xl shadow-xs">
              📊
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Creator Studio & Analytics
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track template adoption, release version updates, and manage public listings
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

        {/* Studio Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/30 dark:bg-[#11131a]">
          {/* Stat Cards Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#1b1e2a] border border-black/10 dark:border-white/10 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Download size={20} />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-400">Total Installs</span>
                <h4 className="text-xl font-black text-slate-900 dark:text-white">{totalInstalls.toLocaleString()}</h4>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#1b1e2a] border border-black/10 dark:border-white/10 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Star size={20} />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-400">Average Rating</span>
                <h4 className="text-xl font-black text-slate-900 dark:text-white">{avgRating} ★</h4>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#1b1e2a] border border-black/10 dark:border-white/10 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <TrendingUp size={20} />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-400">Weekly Growth</span>
                <h4 className="text-xl font-black text-emerald-600 dark:text-emerald-400">+24.5%</h4>
              </div>
            </div>
          </div>

          {/* Version Push & Changelog Tool */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#1b1e2a] border border-black/10 dark:border-white/10 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white pb-2 border-b border-black/5 dark:border-white/5">
              <GitBranch size={16} className="text-amber-500" />
              <span>Push Version Update & Changelog</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Target Template
                </label>
                <select
                  value={selectedTemplate?.id || ""}
                  onChange={(e) => setSelectedTemplate(myTemplates.find(t => t.id === e.target.value) || null)}
                  className="w-full h-9.5 px-3 rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-black/20 text-xs font-medium outline-none"
                >
                  {myTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                  {myTemplates.length === 0 && <option value="">No custom templates created</option>}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  New Version Tag
                </label>
                <input
                  type="text"
                  value={newVersion}
                  onChange={(e) => setNewVersion(e.target.value)}
                  placeholder="e.g. 1.2.0"
                  className="w-full h-9.5 px-3 rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-black/20 text-xs font-medium outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Release Notes & Changelog
              </label>
              <textarea
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                rows={2}
                placeholder="What improved in this version? (e.g. Added automated review rule & QA column)"
                className="w-full p-3 rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-black/20 text-xs font-medium outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400">
                Existing boards will NOT be modified. New users will get this latest version.
              </span>
              <button
                type="button"
                onClick={handlePushUpdate}
                disabled={!changelog.trim()}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition disabled:opacity-40 cursor-pointer"
              >
                {versionSaved ? "✓ Version Released!" : "Push Version Update"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
