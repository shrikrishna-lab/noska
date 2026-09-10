import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Star,
  Download,
  Check,
  Plus,
  ArrowRight,
  Sparkles,
  Layers,
  LayoutGrid,
  CheckCircle2,
  X,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  ArrowUpRight,
  User,
  Users,
  Compass,
  Zap,
  ShoppingBag,
  ExternalLink,
  Code2,
  FileText,
  Share2,
  MoreHorizontal,
  ThumbsUp,
  Globe,
  Clock,
  Tag,
  CheckSquare,
  Award,
  ChevronLeft
} from "lucide-react";
import {
  MarketplaceNavTab,
  FEATURED_CONSULTANTS,
  FEATURED_AGENTS,
  NOTION_STYLE_TEMPLATES,
  CreatorProfile,
  AIAgentItem,
  NotionStyleTemplate
} from "./Constants";
import { uid } from "../../utils/helpers";
import { useUIActions } from "../../contexts/UIContext";
import { getOfficialTemplateById } from "../canvas/templates/officialTemplates";
import { generateCanvasFromTemplate } from "../canvas/templates/templateGenerator";
import { saveCanvasData, savePositions } from "../canvas/canvasStore";

interface MarketplacePageProps {
  pages: any[];
  onDuplicate: (page: any) => void;
  onToast?: (message: string) => void;
}

export default function MarketplacePage({ pages, onDuplicate, onToast }: MarketplacePageProps) {
  const { setSettingsOpen, setSettingsInitialTab } = useUIActions();
  const [activeNavTab, setActiveNavTab] = useState<MarketplaceNavTab>("discover");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<NotionStyleTemplate | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AIAgentItem | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(() => new Set());
  const [installedCount, setInstalledCount] = useState(0);
  const [accessOpen, setAccessOpen] = useState(false);

  const handleInstallTemplate = (template: NotionStyleTemplate) => {
    const pageId = uid();

    // Create real rich document blocks from the template's realBlocks
    const blocks = template.realBlocks.map((b) => ({
      id: uid(),
      type: b.type,
      text: b.text,
      completed: b.completed ?? false
    }));

    // If template has an associated canvas board, generate and save real whiteboard canvas data
    if (template.canvasTemplateId) {
      const canvasTmpl = getOfficialTemplateById(template.canvasTemplateId);
      if (canvasTmpl) {
        const generated = generateCanvasFromTemplate(canvasTmpl, {
          boardName: template.title,
          scale: "medium"
        });
        saveCanvasData(pageId, generated.data, "main");
        savePositions(pageId, generated.positions, "main");
      }
    }

    const newPage = {
      id: pageId,
      title: template.title,
      icon: "📄",
      blocks,
      tags: [template.category],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onDuplicate(newPage);
    setPurchasedIds((prev) => new Set([...prev, template.id]));
    setInstalledCount((prev) => prev + 1);
    onToast?.(`✓ Added "${template.title}" to workspace with real structured content!`);
  };

  const handleInstallAgent = (agent: AIAgentItem) => {
    const pageId = uid();
    const blocks = [
      { id: uid(), type: "h1", text: `${agent.title} — AI Partner` },
      { id: uid(), type: "callout", text: `🤖 Mission: ${agent.description}` },
      { id: uid(), type: "divider", text: "" },
      { id: uid(), type: "h2", text: "Active Capabilities & Protocols" },
      ...agent.capabilities.map((c) => ({
        id: uid(),
        type: "checklist" as const,
        text: c,
        completed: false
      })),
      { id: uid(), type: "divider", text: "" },
      { id: uid(), type: "h2", text: "Recent Agent Action Log" },
      { id: uid(), type: "text", text: `• Initialized agent runtime in workspace by ${agent.creatorName}.` },
      { id: uid(), type: "text", text: `• Ready to parse open data and organize workflows.` }
    ];

    const newPage = {
      id: pageId,
      title: agent.title,
      icon: agent.iconSymbol || "🤖",
      blocks,
      tags: ["AI Agent", "Workflow"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onDuplicate(newPage);
    setPurchasedIds((prev) => new Set([...prev, agent.id]));
    setInstalledCount((prev) => prev + 1);
    onToast?.(`✓ AI Agent "${agent.title}" installed to workspace!`);
  };

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return NOTION_STYLE_TEMPLATES;
    const q = searchQuery.toLowerCase();
    return NOTION_STYLE_TEMPLATES.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.authorName.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const filteredAgents = useMemo(() => {
    if (!searchQuery.trim()) return FEATURED_AGENTS;
    const q = searchQuery.toLowerCase();
    return FEATURED_AGENTS.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.creatorName.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // ==========================================
  // VIEW 1: TEMPLATE / SKILL DETAIL PAGE (Matching Images 2 & 3)
  // ==========================================
  if (selectedTemplate) {
    const isInstalled = purchasedIds.has(selectedTemplate.id);
    const moreByAuthor = NOTION_STYLE_TEMPLATES.filter((t) => t.id !== selectedTemplate.id).slice(0, 3);
    const moreLikeThis = NOTION_STYLE_TEMPLATES.filter((t) => t.id !== selectedTemplate.id).slice(3, 6);

    return (
      <div className="flex flex-col h-full bg-[var(--bg)] text-[var(--text)] select-none overflow-y-auto scrollbar-thin transition-colors">
        {/* Top Header Bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-8 py-3.5 bg-[var(--bg)]/95 backdrop-blur-md border-b border-[var(--border)]">
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <button
              onClick={() => setSelectedTemplate(null)}
              className="flex items-center gap-1.5 hover:text-[var(--text)] transition font-medium cursor-pointer"
            >
              <div className="flex items-center gap-1 mr-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />
              </div>
              <span>Marketplace</span>
            </button>
            <span>/</span>
            <div className="flex items-center gap-1.5 text-[var(--text)] font-medium">
              <span className="w-5 h-5 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[10px]">
                {selectedTemplate.authorAvatar || "📄"}
              </span>
              <span>{selectedTemplate.authorName}</span>
            </div>
            <span>/</span>
            <span className="text-[var(--text)] font-semibold truncate max-w-xs">{selectedTemplate.title}</span>
          </div>

          <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
            <button
              onClick={() => onToast?.("Link copied to clipboard!")}
              className="p-1.5 rounded-lg hover:bg-[var(--hover)] hover:text-[var(--text)] transition cursor-pointer"
              title="Share"
            >
              <Share2 size={15} />
            </button>

            <button
              onClick={() => onToast?.("Profile settings & published templates")}
              className="flex items-center gap-1.5 hover:text-[var(--text)] transition cursor-pointer"
            >
              <User size={14} />
              <span>My profile</span>
            </button>

            <button
              onClick={() => onToast?.(`You have installed ${installedCount} frameworks to your workspace.`)}
              className="flex items-center gap-1.5 hover:text-[var(--text)] transition cursor-pointer"
            >
              <CheckCircle2 size={14} />
              <span>Purchased ({installedCount})</span>
            </button>
          </div>
        </div>

        {/* Template Detail Content */}
        <div className="max-w-5xl w-full mx-auto px-8 py-8 space-y-10 pb-28">
          {/* Action Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-xl shadow-xs">
                {selectedTemplate.authorAvatar || "📄"}
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-[var(--text)]">{selectedTemplate.title}</h1>
                <p className="text-xs text-[var(--text-secondary)]">by {selectedTemplate.authorName} • {selectedTemplate.ranking}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleInstallTemplate(selectedTemplate)}
                className="px-5 py-2 rounded-xl bg-[var(--noska-blue,#0066FF)] hover:opacity-90 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <Sparkles size={13} />
                <span>{isInstalled ? "Added to Workspace ✓" : "Add to Workspace"}</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--hover)] text-[var(--text)] text-xs font-semibold border border-[var(--border)] transition cursor-pointer"
              >
                Preview Structure
              </button>
            </div>
          </div>

          {/* Large Rendered Document Layout Hero Preview (Matching Noska Surface) */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] p-8 shadow-md space-y-4 select-none">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedTemplate.authorAvatar || "📄"}</span>
                <span className="text-lg font-bold text-[var(--text)]">{selectedTemplate.title}</span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-secondary)]">
                NOSKA OS v2.1
              </span>
            </div>

            {/* Rendered Live Real Blocks */}
            <div className="space-y-3 pt-2">
              {selectedTemplate.realBlocks.map((b) => (
                <div
                  key={b.id}
                  className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                    b.type === "h1"
                      ? "bg-[var(--surface-2)] border-[var(--border)] font-bold text-base text-[var(--text)]"
                      : b.type === "h2"
                      ? "bg-[var(--surface-2)] border-[var(--border)] font-semibold text-sm text-[var(--text)]"
                      : b.type === "callout"
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-300 font-medium"
                      : b.type === "checklist"
                      ? "bg-[var(--surface-2)] border-[var(--border)] flex items-center gap-2 text-[var(--text)]"
                      : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text)]"
                  }`}
                >
                  {b.type === "checklist" && <CheckSquare size={14} className="text-amber-500 shrink-0" />}
                  <span>{b.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Creator Attribution Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 py-4 border-y border-[var(--border)] text-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-[var(--surface-2)] flex items-center justify-center text-sm">
                  {selectedTemplate.authorAvatar || "📄"}
                </span>
                <div>
                  <div className="font-bold text-[var(--text)] truncate">{selectedTemplate.authorName}</div>
                  <div className="text-[11px] text-[var(--text-muted)]">{selectedTemplate.authorTemplatesCount} templates</div>
                </div>
              </div>
            </div>

            <div>
              <div className="font-bold text-[var(--text)]">{selectedTemplate.ranking}</div>
              <div className="text-[11px] text-[var(--text-muted)]">Ranking</div>
            </div>

            <div>
              <div className="font-bold text-[var(--text)] flex items-center gap-1">
                <Download size={12} /> {selectedTemplate.downloads}
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">Downloads</div>
            </div>

            <div>
              <div className="font-bold text-[var(--text)]">{selectedTemplate.versionUpdate}</div>
              <div className="text-[11px] text-[var(--text-muted)]">Version update</div>
            </div>

            <div>
              <div className="font-bold text-[var(--text)]">{selectedTemplate.languages}</div>
              <div className="text-[11px] text-[var(--text-muted)]">Languages</div>
            </div>
          </div>

          {/* About Section */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-[var(--text)]">About</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-3xl">
              {selectedTemplate.aboutDetailed}
            </p>
          </div>

          {/* Details & Categories Section */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-[var(--text)]">Details</h3>
            <div>
              <div className="text-[11px] font-bold uppercase text-[var(--text-muted)] mb-2">Categories</div>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedTemplate.categoryTags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs font-medium text-[var(--text)] flex items-center gap-1.5"
                  >
                    <Tag size={11} className="text-[var(--text-muted)]" />
                    <span>{tag}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* More by Creator Section */}
          <div className="space-y-4 pt-4 border-t border-[var(--border)]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text)]">More by {selectedTemplate.authorName}</h3>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text)] transition cursor-pointer"
              >
                Browse all
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {moreByAuthor.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTemplate(t)}
                  className="group rounded-2xl bg-[var(--surface-1)] border border-[var(--border)] hover:border-[var(--border-hover)] p-4 flex flex-col justify-between h-36 transition cursor-pointer shadow-xs"
                >
                  <div>
                    <span className="text-xl mb-1 block">{t.authorAvatar || "📄"}</span>
                    <h4 className="text-xs font-bold text-[var(--text)] truncate">{t.title}</h4>
                    <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 mt-1">{t.description}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[var(--border)]">
                    <span className="flex items-center gap-1 text-[#f59e0b] font-bold">
                      <Star size={10} fill="currentColor" /> {t.rating.toFixed(1)}
                    </span>
                    <span className="text-[10.5px] font-semibold text-[var(--text)] px-2 py-0.5 rounded bg-[var(--surface-2)]">
                      Free
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* More Like This Section */}
          <div className="space-y-4 pt-4 border-t border-[var(--border)]">
            <h3 className="text-sm font-bold text-[var(--text)]">More like this</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {moreLikeThis.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTemplate(t)}
                  className="group rounded-2xl bg-[var(--surface-1)] border border-[var(--border)] hover:border-[var(--border-hover)] p-4 flex flex-col justify-between h-36 transition cursor-pointer shadow-xs"
                >
                  <div>
                    <span className="text-xl mb-1 block">{t.authorAvatar || "📄"}</span>
                    <h4 className="text-xs font-bold text-[var(--text)] truncate">{t.title}</h4>
                    <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 mt-1">{t.description}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[var(--border)]">
                    <span className="flex items-center gap-1 text-[#f59e0b] font-bold">
                      <Star size={10} fill="currentColor" /> {t.rating.toFixed(1)}
                    </span>
                    <span className="text-[10.5px] font-semibold text-[var(--text)] px-2 py-0.5 rounded bg-[var(--surface-2)]">
                      Free
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: AI AGENT DETAIL PAGE (Matching Images 4 & 5)
  // ==========================================
  if (selectedAgent) {
    const isInstalled = purchasedIds.has(selectedAgent.id);

    return (
      <div className="flex flex-col h-full bg-[var(--bg)] text-[var(--text)] select-none overflow-y-auto scrollbar-thin transition-colors">
        {/* Top Header Bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-8 py-3.5 bg-[var(--bg)]/95 backdrop-blur-md border-b border-[var(--border)]">
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <button
              onClick={() => setSelectedAgent(null)}
              className="flex items-center gap-1.5 hover:text-[var(--text)] transition font-medium cursor-pointer"
            >
              <div className="flex items-center gap-1 mr-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />
              </div>
              <span>Marketplace</span>
            </button>
            <span>/</span>
            <span className="text-[var(--text)] font-semibold">{selectedAgent.title}</span>
          </div>

          <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
            <button
              onClick={() => onToast?.("Agent link copied!")}
              className="p-1.5 rounded-lg hover:bg-[var(--hover)] hover:text-[var(--text)] transition cursor-pointer"
              title="Share"
            >
              <Share2 size={15} />
            </button>

            <button
              onClick={() => onToast?.("Profile settings & published templates")}
              className="flex items-center gap-1.5 hover:text-[var(--text)] transition cursor-pointer"
            >
              <User size={14} />
              <span>My profile</span>
            </button>

            <button
              onClick={() => onToast?.(`You have installed ${installedCount} items.`)}
              className="flex items-center gap-1.5 hover:text-[var(--text)] transition cursor-pointer"
            >
              <CheckCircle2 size={14} />
              <span>Purchased ({installedCount})</span>
            </button>
          </div>
        </div>

        {/* Agent Detail Content */}
        <div className="max-w-5xl w-full mx-auto px-8 py-8 space-y-10 pb-28">
          {/* Hero Banner with Large Square Icon */}
          <div className="flex flex-col sm:flex-row items-start gap-7">
            <div className="w-32 h-32 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-5xl shadow-lg shrink-0">
              {selectedAgent.iconSymbol}
            </div>

            <div className="space-y-3.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">by {selectedAgent.creatorName}</span>
                <span className="px-2 py-0.5 rounded-full bg-[var(--noska-blue,#0066FF)]/15 text-[var(--noska-blue,#0066FF)] text-[10px] font-bold flex items-center gap-1">
                  <ThumbsUp size={10} /> Verified
                </span>
              </div>

              <h1 className="text-2xl font-black text-[var(--text)]">{selectedAgent.title}</h1>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xl">
                {selectedAgent.description}
              </p>

              {/* Feature List */}
              <div className="space-y-1.5 pt-1">
                {selectedAgent.featuresList.map((f, fIdx) => (
                  <div key={fIdx} className="flex items-center gap-2 text-xs text-[var(--noska-blue,#0066FF)] font-medium">
                    <span>{f.icon}</span>
                    <span>{f.text}</span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleInstallAgent(selectedAgent)}
                  className="px-6 py-2.5 rounded-xl bg-[var(--noska-blue,#0066FF)] hover:opacity-90 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>{isInstalled ? "Agent Installed ✓" : "+ Get agent"}</span>
                </button>

                <button
                  onClick={() => onToast?.("Agent options and config")}
                  className="w-9 h-9 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--hover)] text-[var(--text)] flex items-center justify-center border border-[var(--border)] transition cursor-pointer"
                >
                  <MoreHorizontal size={15} />
                </button>
              </div>

              {/* Collapsible Access Disclosures */}
              <div>
                <button
                  onClick={() => setAccessOpen((v) => !v)}
                  className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text)] transition cursor-pointer mt-2"
                >
                  <span>What can this agent access?</span>
                  <ChevronDown size={12} className={`transition-transform ${accessOpen ? "rotate-180" : ""}`} />
                </button>

                {accessOpen && (
                  <div className="mt-2 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] space-y-1.5 text-xs text-[var(--text-secondary)]">
                    {selectedAgent.accessPermissions.map((perm, pIdx) => (
                      <div key={pIdx} className="flex items-center gap-2">
                        <Check size={12} className="text-emerald-500 shrink-0" />
                        <span>{perm}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-[var(--border)] text-xs">
            <div>
              <div className="font-bold text-[var(--text)]">{selectedAgent.creatorName}</div>
              <div className="text-[11px] text-[var(--text-muted)]">{selectedAgent.creatorTemplatesCount} templates</div>
            </div>

            <div>
              <div className="font-bold text-[var(--text)] flex items-center gap-1">
                <Download size={12} /> {selectedAgent.downloads}
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">Downloads</div>
            </div>

            <div>
              <div className="font-bold text-[var(--text)]">{selectedAgent.versionUpdate}</div>
              <div className="text-[11px] text-[var(--text-muted)]">Version update</div>
            </div>

            <div>
              <div className="font-bold text-[var(--text)]">{selectedAgent.languages}</div>
              <div className="text-[11px] text-[var(--text-muted)]">Languages</div>
            </div>
          </div>

          {/* About Section */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-[var(--text)]">About</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-3xl">
              {selectedAgent.aboutDetailed}
            </p>
          </div>

          {/* Gallery Carousel */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-[var(--text)]">Gallery</h3>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] p-8 shadow-md flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-2xl">
                {selectedAgent.iconSymbol}
              </div>
              <h4 className="text-base font-bold text-[var(--text)]">{selectedAgent.title}</h4>
              <p className="text-xs text-[var(--text-secondary)] text-center max-w-md">
                Adapts to your workspace and tells you exactly what to execute next.
              </p>
              <div className="w-full max-w-md h-9 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span>Ask {selectedAgent.title}...</span>
                <span>✨</span>
              </div>
            </div>
          </div>

          {/* Details & Categories */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-[var(--text)]">Details</h3>
            <div>
              <div className="text-[11px] font-bold uppercase text-[var(--text-muted)] mb-2">Categories</div>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedAgent.categoryTags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs font-medium text-[var(--text)] flex items-center gap-1.5"
                  >
                    <Tag size={11} className="text-[var(--text-muted)]" />
                    <span>{tag}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 3: DISCOVER BROWSE HOMEPAGE (Matching Image 1 & Noska Theme)
  // ==========================================
  return (
    <div className="flex flex-col h-full bg-[var(--bg)] text-[var(--text)] select-none overflow-y-auto scrollbar-thin transition-colors">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-8 py-3.5 bg-[var(--bg)]/95 backdrop-blur-md border-b border-[var(--border)]">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />
            </div>
            <h1 className="text-[15px] font-bold text-[var(--text)] tracking-tight">Marketplace</h1>
          </div>

          <nav className="flex items-center gap-1">
            {(
              [
                { id: "discover", label: "Discover" },
                { id: "templates", label: "Templates" },
                { id: "agents", label: "Agents" },
                { id: "consultants", label: "Consultants" },
                { id: "skills", label: "Skills" },
                { id: "connections", label: "Connections" }
              ] as Array<{ id: MarketplaceNavTab; label: string }>
            ).map((tab) => {
              const isActive = activeNavTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveNavTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
                    isActive
                      ? "text-[var(--text)] font-bold bg-[var(--surface-3)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--hover)]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
          <div className="relative flex items-center">
            <Search size={14} className="text-[var(--text-muted)] mr-1.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-32 hover:w-48 focus:w-48 transition-all duration-200 bg-transparent text-xs text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none"
            />
          </div>

          <button
            onClick={() => onToast?.("Profile settings & published templates")}
            className="flex items-center gap-1.5 hover:text-[var(--text)] transition cursor-pointer"
          >
            <User size={14} />
            <span>My profile</span>
          </button>

          <button
            onClick={() => onToast?.(`You have installed ${installedCount} frameworks to your workspace.`)}
            className="flex items-center gap-1.5 hover:text-[var(--text)] transition cursor-pointer"
          >
            <CheckCircle2 size={14} />
            <span>Purchased ({installedCount})</span>
          </button>
        </div>
      </div>

      {/* Main Discover Layout */}
      <div className="max-w-6xl w-full mx-auto px-8 py-8 space-y-12 pb-28">
        {/* Section 1: Hero Featured Cards */}
        {(activeNavTab === "discover" || activeNavTab === "skills") && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2 rounded-2xl bg-gradient-to-br from-[#1e293b] to-[#0f172a] text-white border border-[#334155]/60 p-7 flex flex-col sm:flex-row justify-between items-center gap-6 overflow-hidden relative group shadow-md">
              <div className="space-y-2.5 max-w-sm z-10">
                <span className="text-[11px] font-bold text-[#38bdf8] flex items-center gap-1.5">
                  <span>🖋️</span> AI skills
                </span>
                <h2 className="text-2xl font-black text-white leading-tight tracking-tight">
                  Save yourself the prompt
                </h2>
                <p className="text-xs text-[#94a3b8] leading-relaxed">
                  AI skills that remember the instructions, standards, and formats you use again and again.
                </p>
              </div>

              <div className="w-56 h-36 relative flex items-center justify-center shrink-0">
                <div className="w-40 h-28 rounded-xl bg-[#0f172a] border border-[#334155] p-3 flex flex-col justify-between shadow-xl">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#818cf8]" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-2 w-3/4 rounded bg-[#38bdf8]/40" />
                    <div className="h-2 w-1/2 rounded bg-[#38bdf8]/20" />
                  </div>
                  <div className="text-[9px] font-mono text-[#38bdf8]">PROMPT_SAVED ✓</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--border)] p-7 flex flex-col justify-between relative overflow-hidden shadow-sm">
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-[#eab308] flex items-center gap-1.5">
                  <span>🏆</span> Top creator
                </span>
                <h3 className="text-xl font-extrabold text-[var(--text)]">Teka</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  We're a tech and systems company designing the next-gen tools for how we think, create, and organize.
                </p>
              </div>

              <div className="mt-6 flex justify-end">
                <div className="w-16 h-16 rounded-2xl bg-[var(--text)] text-[var(--bg)] flex items-center justify-center font-black text-2xl shadow-lg">
                  Ħ
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Connections — points to the real integrations hub in Settings */}
        {activeNavTab === "connections" && (
          <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--border)] p-10 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)] grid place-items-center text-xl">🔌</div>
            <h3 className="text-lg font-extrabold text-[var(--text)]">Connect your platforms</h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-sm leading-relaxed">
              Notion, GitHub, Slack, Gmail, Calendar — or any MCP server. Connected tools become available to Noska AI, agents, and automations.
            </p>
            <button
              onClick={() => { setSettingsInitialTab("Integrations"); setSettingsOpen(true); }}
              className="mt-1 rounded-xl bg-[var(--text)] text-[var(--bg)] px-4 py-2 text-xs font-bold hover:opacity-90 transition cursor-pointer"
            >
              Open Settings → Integrations
            </button>
          </div>
        )}

        {/* Section 2: Featured Consultants */}
        {(activeNavTab === "discover" || activeNavTab === "consultants") && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
                <span className="text-base">🪟</span>
                <span>Featured consultants</span>
              </h3>
              <button
                onClick={() => setActiveNavTab("consultants")}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text)] transition cursor-pointer"
              >
                Browse all
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {FEATURED_CONSULTANTS.map((c) => (
                <div
                  key={c.id}
                  className={`group rounded-2xl bg-gradient-to-b ${c.bgGradient} border border-white/10 p-5 flex flex-col justify-between h-48 hover:border-white/20 transition-all cursor-pointer shadow-md text-white`}
                  onClick={() => onToast?.(`Consultant profile: ${c.name}`)}
                >
                  <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center text-xl shadow-lg">
                    {c.avatar}
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white truncate">{c.name}</h4>
                    <div className="flex items-center justify-between text-xs text-white/80 mt-1">
                      <span className="flex items-center gap-1 font-semibold">
                        <Star size={11} fill="currentColor" className="text-[#f59e0b]" />
                        <span>{c.rating.toFixed(1)}</span>
                        <span className="text-white/60 font-normal">({c.reviewCount})</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 3: Featured Agents */}
        {(activeNavTab === "discover" || activeNavTab === "agents") && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
                <span className="text-base">✨</span>
                <span>Featured agents</span>
              </h3>
              <button
                onClick={() => setActiveNavTab("agents")}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text)] transition cursor-pointer"
              >
                Browse all
              </button>
            </div>

            <div className="space-y-2.5">
              {filteredAgents.map((a) => {
                const isInstalled = purchasedIds.has(a.id);
                return (
                  <div
                    key={a.id}
                    className="flex items-center justify-between p-4 rounded-2xl bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border)] transition cursor-pointer shadow-xs"
                    onClick={() => setSelectedAgent(a)}
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shrink-0">
                        {a.iconSymbol}
                      </div>

                      <div className="min-w-0 flex-1 pr-4">
                        <h4 className="text-sm font-bold text-[var(--text)] truncate">{a.title}</h4>
                        <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">{a.description}</p>
                        <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] mt-1">
                          <span>by {a.creatorName}</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <Download size={10} /> {a.downloads}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInstallAgent(a);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--text)] hover:text-[var(--bg)] text-xs font-semibold text-[var(--text)] border border-[var(--border)] transition active:scale-95 cursor-pointer shrink-0"
                    >
                      {isInstalled ? "Installed ✓" : "Free"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 4: Featured Templates Grid */}
        {(activeNavTab === "discover" || activeNavTab === "templates") && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
                <span className="text-base">☆</span>
                <span>Featured templates</span>
              </h3>
              <button
                onClick={() => setActiveNavTab("templates")}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text)] transition cursor-pointer"
              >
                Browse all
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTemplates.slice(0, 6).map((t) => {
                const isInstalled = purchasedIds.has(t.id);
                return (
                  <div
                    key={t.id}
                    className="group rounded-2xl bg-[var(--surface-1)] border border-[var(--border)] hover:border-[var(--border-hover)] overflow-hidden flex flex-col justify-between transition-all cursor-pointer shadow-xs"
                    onClick={() => setSelectedTemplate(t)}
                  >
                    <div className="h-44 bg-[var(--surface-2)] p-4 text-[var(--text)] flex flex-col justify-between overflow-hidden relative select-none">
                      <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                        <span className="text-[11px] font-bold truncate text-[var(--text)]">{t.title}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--surface-3)] font-mono text-[var(--text-secondary)]">
                          {t.category.toUpperCase()}
                        </span>
                      </div>

                      <div className="space-y-1.5 my-auto">
                        <div className="h-5 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] flex items-center px-2 text-[8.5px] font-semibold text-[var(--text-secondary)]">
                          🎯 {t.realBlocks[1]?.text?.slice(0, 40) || t.description.slice(0, 40)}...
                        </div>
                        <div className="flex gap-1.5">
                          <div className="h-10 flex-1 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] p-1.5 text-[7.5px] text-[var(--text-secondary)] overflow-hidden">
                            ✓ {t.realBlocks[3]?.text?.slice(0, 30) || "Action Item"}
                          </div>
                          <div className="h-10 flex-1 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] p-1.5 text-[7.5px] text-[var(--text-secondary)] overflow-hidden">
                            ✓ {t.realBlocks[4]?.text?.slice(0, 30) || "Milestone"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[8px] text-[var(--text-muted)] font-mono">
                        <span>NOSKA DOCUMENT OS</span>
                        <span>v2.1</span>
                      </div>
                    </div>

                    <div className="p-3.5 flex items-center justify-between bg-[var(--surface-1)]">
                      <div>
                        <h4 className="text-xs font-bold text-[var(--text)] truncate">{t.title}</h4>
                        <div className="flex items-center gap-1.5 text-[10.5px] text-[var(--text-secondary)] mt-0.5">
                          <Star size={10} fill="currentColor" className="text-[#f59e0b]" />
                          <span>{t.rating.toFixed(1)}</span>
                          <span>•</span>
                          <span>{t.downloads}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInstallTemplate(t);
                        }}
                        className="px-3 py-1 rounded-md bg-[var(--surface-2)] hover:bg-[var(--text)] hover:text-[var(--bg)] text-xs font-semibold text-[var(--text)] border border-[var(--border)] transition active:scale-95 cursor-pointer"
                      >
                        {isInstalled ? "Added ✓" : "Free"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 5: Mid-Page Split Banners */}
        {activeNavTab === "discover" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-2xl bg-gradient-to-br from-[#1e293b] to-[#0f172a] text-white border border-[#334155]/60 p-7 flex flex-col justify-between relative overflow-hidden shadow-md">
              <div className="space-y-2.5 max-w-xs z-10">
                <span className="text-[11px] font-bold text-[#38bdf8] flex items-center gap-1.5">
                  <span>💼</span> Work essentials
                </span>
                <h3 className="text-2xl font-black text-white leading-tight">
                  Tools that work with your team
                </h3>
                <p className="text-xs text-[#94a3b8] leading-relaxed">
                  Templates and custom agents to support the work your team does every day.
                </p>
              </div>

              <div className="mt-6 flex justify-end">
                <div className="w-32 h-20 bg-[#0f172a] rounded-xl border border-[#334155] p-2 flex items-end gap-1.5 shadow-xl">
                  <div className="w-6 h-6 rounded bg-[#38bdf8]/40" />
                  <div className="w-6 h-10 rounded bg-[#38bdf8]/60" />
                  <div className="w-6 h-14 rounded bg-[#38bdf8]" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-[#1e293b] to-[#0f172a] text-white border border-[#334155]/60 p-7 flex flex-col justify-between relative overflow-hidden shadow-md">
              <div className="space-y-2.5 max-w-xs z-10">
                <span className="text-[11px] font-bold text-[#818cf8] flex items-center gap-1.5">
                  <span>✨</span> AI Skills
                </span>
                <h3 className="text-2xl font-black text-white leading-tight">
                  Make this sound more...
                </h3>
                <p className="text-xs text-[#94a3b8] leading-relaxed">
                  AI Skills for polishing, reshaping, and reworking what you already have.
                </p>
              </div>

              <div className="mt-6 flex justify-end">
                <div className="w-32 h-20 bg-[#0f172a] rounded-xl border border-[#334155] p-2 flex items-center justify-center shadow-xl text-3xl text-[#818cf8]">
                  🛠️
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 6: Popular Templates */}
        {(activeNavTab === "discover" || activeNavTab === "templates") && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
                <span className="text-base">🗂️</span>
                <span>Popular templates</span>
              </h3>
              <button
                onClick={() => setActiveNavTab("templates")}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text)] transition cursor-pointer"
              >
                Browse all
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {filteredTemplates.slice(6, 9).map((t) => (
                <div
                  key={t.id}
                  className="group rounded-2xl bg-[var(--surface-1)] border border-[var(--border)] hover:border-[var(--border-hover)] overflow-hidden flex flex-col justify-between transition-all cursor-pointer shadow-xs"
                  onClick={() => setSelectedTemplate(t)}
                >
                  <div className="h-44 bg-[var(--surface-2)] p-4 text-[var(--text)] flex flex-col justify-between overflow-hidden relative select-none">
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                      <span className="text-[11px] font-bold truncate text-[var(--text)]">{t.title}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--surface-3)] font-mono text-[var(--text-secondary)]">
                        {t.category.toUpperCase()}
                      </span>
                    </div>

                    <div className="space-y-1.5 my-auto">
                      <div className="h-5 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] flex items-center px-2 text-[8.5px] font-semibold text-[var(--text-secondary)]">
                        📌 {t.realBlocks[1]?.text?.slice(0, 36) || t.description.slice(0, 36)}...
                      </div>
                      <div className="h-12 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] p-1.5 text-[7.5px] text-[var(--text-secondary)] leading-relaxed overflow-hidden">
                        {t.realBlocks[3]?.text || "Guidelines & Pre-requisites..."}
                      </div>
                    </div>

                    <div className="text-[8px] text-[var(--text-muted)] font-mono">
                      STANDARD OPERATING PROCEDURE
                    </div>
                  </div>

                  <div className="p-3.5 flex items-center justify-between bg-[var(--surface-1)]">
                    <h4 className="text-xs font-bold text-[var(--text)] truncate">{t.title}</h4>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInstallTemplate(t);
                      }}
                      className="px-3 py-1 rounded-md bg-[var(--surface-2)] hover:bg-[var(--text)] hover:text-[var(--bg)] text-xs font-semibold text-[var(--text)] border border-[var(--border)] transition active:scale-95 cursor-pointer"
                    >
                      Free
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
