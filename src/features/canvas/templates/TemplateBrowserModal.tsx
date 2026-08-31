import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  Sparkles,
  Users,
  User,
  Globe2,
  Bookmark,
  Star,
  Download,
  Eye,
  SlidersHorizontal,
  ArrowUpRight,
  Upload,
  Zap,
  RotateCw,
  ShieldCheck,
  Flag,
  Flame,
  Plus,
  BarChart2,
  Compass
} from "lucide-react";
import { OFFICIAL_TEMPLATES } from "./officialTemplates";
import { loadMyTemplates, loadMarketplaceTemplates } from "./templateStore";
import { NoskaTemplate, TemplateCategory, TemplateCustomizationOptions } from "./templateTypes";
import TemplateCustomizationModal from "./TemplateCustomizationModal";
import TemplateSamplePreviewModal from "./TemplateSamplePreviewModal";
import TemplateBuilderModal from "./TemplateBuilderModal";
import TemplateCreatorDashboardModal from "./TemplateCreatorDashboardModal";
import TemplateReviewModal from "./TemplateReviewModal";
import { CanvasBoardMeta } from "../canvasStore";

interface TemplateBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingBoards: CanvasBoardMeta[];
  projectName?: string;
  onApplyTemplate: (template: NoskaTemplate, options: TemplateCustomizationOptions) => void;
  onOpenPublishModal?: () => void;
}

export default function TemplateBrowserModal({
  isOpen,
  onClose,
  existingBoards,
  projectName = "My Workspace",
  onApplyTemplate,
  onOpenPublishModal,
}: TemplateBrowserModalProps) {
  // Navigation & Filter States
  const [activeMainTab, setActiveMainTab] = useState<"official" | "marketplace">("official");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "team" | "personal" | "my_templates">("all");
  const [workflowFilter, setWorkflowFilter] = useState<"all" | "automated" | "recurring" | "trending">("all");
  const [curatedCollection, setCuratedCollection] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"popular" | "trending" | "rating" | "newest">("popular");

  // Modals
  const [customizingTemplate, setCustomizingTemplate] = useState<NoskaTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<NoskaTemplate | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [creatorDashboardOpen, setCreatorDashboardOpen] = useState(false);
  const [reviewingTemplate, setReviewingTemplate] = useState<NoskaTemplate | null>(null);

  const myTemplates = useMemo(() => (isOpen ? loadMyTemplates() : []), [isOpen]);
  const marketplaceTemplates = useMemo(() => (isOpen ? loadMarketplaceTemplates() : []), [isOpen]);

  // Filtered Templates Calculation
  const filteredTemplates = useMemo<NoskaTemplate[]>(() => {
    let list: NoskaTemplate[] = [];

    if (categoryFilter === "my_templates") {
      list = myTemplates;
    } else if (activeMainTab === "official") {
      list = OFFICIAL_TEMPLATES;
      if (categoryFilter === "team") list = list.filter(t => t.category === "team");
      if (categoryFilter === "personal") list = list.filter(t => t.category === "personal");
    } else {
      list = marketplaceTemplates;
      if (categoryFilter === "team") list = list.filter(t => t.category === "team");
      if (categoryFilter === "personal") list = list.filter(t => t.category === "personal");
    }

    if (curatedCollection) {
      list = list.filter(t => t.curatedCollection === curatedCollection);
    }

    if (workflowFilter === "automated") {
      list = list.filter(t => t.workflowRules && t.workflowRules.length > 0);
    } else if (workflowFilter === "recurring") {
      list = list.filter(t => t.isRecurring);
    } else if (workflowFilter === "trending") {
      list = list.filter(t => t.isTrending || (t.rating && t.rating >= 4.9));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        t =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => {
      if (sortBy === "popular") return (b.installCount || 0) - (a.installCount || 0);
      if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
      if (sortBy === "trending") return ((b.isTrending ? 1 : 0) - (a.isTrending ? 1 : 0)) || ((b.installCount || 0) - (a.installCount || 0));
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [
    activeMainTab,
    categoryFilter,
    workflowFilter,
    curatedCollection,
    searchQuery,
    sortBy,
    marketplaceTemplates,
    myTemplates
  ]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 text-slate-900 dark:text-slate-100 select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.97, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.97, opacity: 0, y: 12 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="w-full max-w-6xl bg-white dark:bg-[#151722] rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Hero Banner */}
          <div className="p-6 pb-5 border-b border-black/5 dark:border-white/5 bg-gradient-to-r from-amber-500/5 via-peach-500/5 to-transparent flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-base font-bold shadow-xs">
                  ✨
                </span>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Template Library & Marketplace
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Battle-tested agile frameworks, roadmap flows, and executive whiteboards
              </p>
            </div>

            {/* Top Action Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setBuilderOpen(true)}
                className="h-8.5 px-3 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus size={13} />
                <span>New Template</span>
              </button>

              <button
                onClick={() => setCreatorDashboardOpen(true)}
                className="h-8.5 px-3 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
              >
                <BarChart2 size={13} />
                <span>Creator Studio</span>
              </button>

              {onOpenPublishModal && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenPublishModal();
                  }}
                  className="h-8.5 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <Upload size={13} />
                  <span>Publish Board</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="w-8.5 h-8.5 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Curated Collection Strip */}
          <div className="px-6 py-2.5 bg-slate-50/70 dark:bg-white/[0.02] border-b border-black/5 dark:border-white/5 flex items-center gap-2 overflow-x-auto scrollbar-none text-xs">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
              Curated:
            </span>
            {[
              { id: null, label: "All Collections" },
              { id: "featured", label: "🌟 Editor's Picks" },
              { id: "engineering_agile", label: "⚡ Sprint & Agile" },
              { id: "remote_teams", label: "🚀 Remote Collaboration" },
              { id: "solo_productivity", label: "🧘 Solo Deep Work" }
            ].map((col) => (
              <button
                key={col.label}
                onClick={() => setCuratedCollection(col.id)}
                className={`px-3 py-1 rounded-xl font-medium transition cursor-pointer shrink-0 ${
                  curatedCollection === col.id
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                {col.label}
              </button>
            ))}
          </div>

          {/* Segmented Navigation & Search Bar */}
          <div className="p-4 px-6 border-b border-black/5 dark:border-white/5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-[#151722]">
            {/* Primary Mode Tabs (Official vs Marketplace) */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] shrink-0">
              <button
                onClick={() => {
                  setActiveMainTab("official");
                  if (categoryFilter === "my_templates") setCategoryFilter("all");
                }}
                className={`px-3.5 h-7.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeMainTab === "official" && categoryFilter !== "my_templates"
                    ? "bg-white dark:bg-[#222533] text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Compass size={13} />
                <span>Official Library ({OFFICIAL_TEMPLATES.length})</span>
              </button>

              <button
                onClick={() => {
                  setActiveMainTab("marketplace");
                  if (categoryFilter === "my_templates") setCategoryFilter("all");
                }}
                className={`px-3.5 h-7.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeMainTab === "marketplace" && categoryFilter !== "my_templates"
                    ? "bg-white dark:bg-[#222533] text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Globe2 size={13} />
                <span>Marketplace ({marketplaceTemplates.length})</span>
              </button>

              <button
                onClick={() => setCategoryFilter("my_templates")}
                className={`px-3.5 h-7.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  categoryFilter === "my_templates"
                    ? "bg-white dark:bg-[#222533] text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Bookmark size={13} />
                <span>My Templates ({myTemplates.length})</span>
              </button>
            </div>

            {/* Category Sub-Filters & Search */}
            <div className="flex items-center gap-2 flex-1 md:max-w-md">
              {/* Category Pills */}
              {categoryFilter !== "my_templates" && (
                <div className="hidden lg:flex items-center gap-1">
                  <button
                    onClick={() => setCategoryFilter("all")}
                    className={`px-2.5 h-7.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                      categoryFilter === "all" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold" : "text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setCategoryFilter("team")}
                    className={`px-2.5 h-7.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                      categoryFilter === "team" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold" : "text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    Team
                  </button>
                  <button
                    onClick={() => setCategoryFilter("personal")}
                    className={`px-2.5 h-7.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                      categoryFilter === "personal" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold" : "text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    Personal
                  </button>
                </div>
              )}

              {/* Search Bar */}
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search templates or tags..."
                  className="w-full h-8.5 pl-8.5 pr-3 rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-[#1f222e] text-xs font-medium outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Sort Selector */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-8.5 px-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-[#1f222e] text-xs font-medium outline-none cursor-pointer"
              >
                <option value="popular">Most Popular</option>
                <option value="trending">🔥 Trending</option>
                <option value="rating">Top Rated</option>
                <option value="newest">Newest</option>
              </select>
            </div>
          </div>

          {/* Workflow Badges Filter Bar */}
          <div className="px-6 py-2 border-b border-black/5 dark:border-white/5 flex items-center gap-2 overflow-x-auto scrollbar-none text-xs">
            <span className="text-[10px] font-bold uppercase text-slate-400 mr-1">Filter:</span>
            {[
              { id: "all", label: "All Types" },
              { id: "automated", label: "⚡ Automated Rules" },
              { id: "recurring", label: "🔁 Recurring Sprints" },
              { id: "trending", label: "🔥 Top Rated (4.9+)" }
            ].map((wf) => (
              <button
                key={wf.id}
                onClick={() => setWorkflowFilter(wf.id as any)}
                className={`px-2.5 py-0.8 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                  workflowFilter === wf.id
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-2xs"
                    : "bg-black/[0.02] dark:bg-white/[0.04] text-slate-500 hover:text-slate-800"
                }`}
              >
                {wf.label}
              </button>
            ))}
          </div>

          {/* Template Grid */}
          <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 bg-slate-50/20 dark:bg-[#11131a]">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="group relative flex flex-col justify-between p-5 rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1b1e2a] hover:border-amber-500/40 hover:shadow-lg transition-all duration-200"
              >
                <div>
                  {/* Top Bar: Icon + Category Badge + Quality Signals */}
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-amber-500/10 dark:bg-amber-400/15 text-amber-600 dark:text-amber-300 flex items-center justify-center text-2xl shadow-2xs group-hover:scale-105 transition">
                      {template.icon}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {template.rating && (
                        <button
                          type="button"
                          onClick={() => setReviewingTemplate(template)}
                          className="flex items-center gap-0.5 text-xs font-bold text-amber-600 dark:text-amber-400 px-2 py-0.8 rounded-full bg-amber-500/10 hover:bg-amber-500/20 transition cursor-pointer"
                        >
                          <Star size={12} fill="currentColor" />
                          <span>{template.rating.toFixed(1)}</span>
                        </button>
                      )}

                      {template.isOfficial ? (
                        <span className="px-2.5 py-0.8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[9.5px] font-bold uppercase tracking-wider">
                          Official
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.8 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9.5px] font-bold">
                          Community
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    {template.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-3.5">
                    {template.description}
                  </p>

                  {/* Feature Badges (Automations & Recurrence) */}
                  <div className="flex flex-wrap gap-1.5 mb-3.5">
                    {template.workflowRules && template.workflowRules.length > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                        <Zap size={10} />
                        <span>{template.workflowRules.length} Automations</span>
                      </span>
                    )}
                    {template.isRecurring && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1">
                        <RotateCw size={10} />
                        <span>Recurring</span>
                      </span>
                    )}
                    {template.checklist && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                        ✓ {template.checklist.length} Checkpoints
                      </span>
                    )}
                  </div>

                  {/* Section Pillars Preview */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {template.sections.slice(0, 3).map((sec) => (
                      <span
                        key={sec.id}
                        className="text-[9.5px] px-2 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/[0.08] text-slate-600 dark:text-slate-300 font-medium truncate max-w-[120px]"
                      >
                        {sec.name}
                      </span>
                    ))}
                    {template.sections.length > 3 && (
                      <span className="text-[9.5px] px-1.5 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/[0.08] text-slate-400 font-medium">
                        +{template.sections.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-400 truncate">
                    {template.author?.name || (template.installCount ? `${template.installCount.toLocaleString()} installs` : "Noska Starter")}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setPreviewTemplate(template)}
                      className="px-2.5 h-8 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] text-xs font-semibold flex items-center gap-1 transition cursor-pointer text-slate-700 dark:text-slate-300"
                    >
                      <Eye size={12} />
                      <span>Preview</span>
                    </button>
                    <button
                      onClick={() => setCustomizingTemplate(template)}
                      className="px-3.5 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
                    >
                      <span>Use</span>
                      <ArrowUpRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredTemplates.length === 0 && (
              <div className="col-span-full text-center py-20">
                <Bookmark size={36} className="mx-auto mb-2 text-slate-400 opacity-60" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Templates Match Your Filters</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Try clearing specific search terms, switching categories, or create a brand new template.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Part 1: Read-Only Sample Board Preview Modal */}
      {previewTemplate && (
        <TemplateSamplePreviewModal
          isOpen={Boolean(previewTemplate)}
          onClose={() => setPreviewTemplate(null)}
          template={previewTemplate}
          onUseTemplate={(t) => {
            setPreviewTemplate(null);
            setCustomizingTemplate(t);
          }}
        />
      )}

      {/* Part 2: Apply-Time Customization Modal */}
      {customizingTemplate && (
        <TemplateCustomizationModal
          isOpen={Boolean(customizingTemplate)}
          onClose={() => setCustomizingTemplate(null)}
          template={customizingTemplate}
          existingBoards={existingBoards}
          projectName={projectName}
          onApply={(options) => {
            onApplyTemplate(customizingTemplate, options);
            setCustomizingTemplate(null);
            onClose();
          }}
        />
      )}

      {/* Part 3: Blank Template Builder Modal */}
      {builderOpen && (
        <TemplateBuilderModal
          isOpen={builderOpen}
          onClose={() => setBuilderOpen(false)}
          onSaved={() => {
            setCategoryFilter("my_templates");
          }}
        />
      )}

      {/* Part 6: Creator Studio & Dashboard Modal */}
      {creatorDashboardOpen && (
        <TemplateCreatorDashboardModal
          isOpen={creatorDashboardOpen}
          onClose={() => setCreatorDashboardOpen(false)}
        />
      )}

      {/* Part 6.1: Quality Signals & Verified Review Modal */}
      {reviewingTemplate && (
        <TemplateReviewModal
          isOpen={Boolean(reviewingTemplate)}
          onClose={() => setReviewingTemplate(null)}
          template={reviewingTemplate}
          onSubmitReview={(rating, comment) => {
            // Simulated local review push
          }}
        />
      )}
    </>
  );
}
