/**
 * WidgetsSettings — Noska Widget Center in Settings.
 * Allows users to preview live interactive widgets, toggle them across Desktop,
 * Mobile StandBy, and Floating Mini-bar surfaces, select curated Best Match presets,
 * and customize behavior in Noska's signature warm editorial aesthetic.
 */
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid,
  Sparkles,
  Flame,
  CheckCircle2,
  SlidersHorizontal,
  Eye,
  Plus,
  Trash2,
  RotateCcw,
  Smartphone,
  Monitor,
  Volume2,
  Check,
  Zap,
  TrendingUp,
  Brain,
  Star,
  Layers,
  ArrowRight,
  Clock,
  CheckSquare,
  Calendar,
  FileText,
  StickyNote,
  Target,
  Flag,
  Bell,
  MessageSquare,
  Plug,
  Wifi,
  Compass,
} from "lucide-react";
import { getAllWidgetDefinitions, getWidgetDefinition } from "../../platform/widgets/registry";
import { WidgetFrame } from "../../platform/widgets/components/WidgetFrame";
import { WidgetEngineProvider } from "../../platform/widgets/engine";
import { NotificationProvider } from "../../platform/widgets/notifications/engine";
import type { WidgetDefinition, WidgetInstance, WidgetRuntimeContext, WidgetSize } from "../../platform/widgets/types";
import type { Page } from "../../lib/supabaseService";

interface WidgetsSettingsProps {
  onToast?: (message: string) => void;
  pages?: Page[];
}

const STORAGE_KEY = "noska_widgets_layout_v1";

const BEST_MATCH_PRESETS = [
  {
    id: "focus-master",
    name: "Deep Focus & Ambient",
    badge: "Best for Flow State",
    icon: Flame,
    iconColor: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20",
    widgets: [
      { widgetId: "streak-tracker", size: "small" as WidgetSize },
      { widgetId: "focus-timer", size: "small" as WidgetSize },
      { widgetId: "ambient-soundscapes", size: "medium" as WidgetSize },
      { widgetId: "my-tasks", size: "medium" as WidgetSize },
      { widgetId: "sticky-note", size: "small" as WidgetSize },
    ],
  },
  {
    id: "high-velocity",
    name: "High Velocity Sprints",
    badge: "Best for Project Leads",
    icon: Zap,
    iconColor: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20",
    widgets: [
      { widgetId: "sprint-velocity", size: "medium" as WidgetSize },
      { widgetId: "my-tasks", size: "medium" as WidgetSize },
      { widgetId: "activity-graph", size: "small" as WidgetSize },
      { widgetId: "vitality-battery", size: "small" as WidgetSize },
      { widgetId: "quick-create", size: "small" as WidgetSize },
    ],
  },
  {
    id: "ai-copilot",
    name: "AI Neural Command",
    badge: "Best for Creators & Research",
    icon: Brain,
    iconColor: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20",
    widgets: [
      { widgetId: "ai-neural-hub", size: "medium" as WidgetSize },
      { widgetId: "sticky-note", size: "small" as WidgetSize },
      { widgetId: "recent-pages", size: "medium" as WidgetSize },
      { widgetId: "world-clock", size: "medium" as WidgetSize },
    ],
  },
  {
    id: "balanced",
    name: "All-in-One Studio",
    badge: "Curated Best Matches",
    icon: Star,
    iconColor: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20",
    widgets: [
      { widgetId: "streak-tracker", size: "small" as WidgetSize },
      { widgetId: "focus-timer", size: "small" as WidgetSize },
      { widgetId: "ai-neural-hub", size: "medium" as WidgetSize },
      { widgetId: "my-tasks", size: "medium" as WidgetSize },
      { widgetId: "ambient-soundscapes", size: "medium" as WidgetSize },
      { widgetId: "habit-matrix", size: "medium" as WidgetSize },
    ],
  },
];

const BEST_MATCH_IDS = new Set([
  "streak-tracker",
  "focus-timer",
  "ai-neural-hub",
  "my-tasks",
  "ambient-soundscapes",
  "sticky-note",
  "sprint-velocity",
  "vitality-battery",
  "world-clock",
  "habit-matrix",
]);

interface WidgetVisual {
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  iconClass: string;
}

function getWidgetVisual(widgetId: string, category: string): WidgetVisual {
  switch (widgetId) {
    case "streak-tracker":
      return { icon: Flame, iconClass: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20" };
    case "focus-timer":
      return { icon: Clock, iconClass: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20" };
    case "ai-neural-hub":
      return { icon: Brain, iconClass: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20" };
    case "my-tasks":
      return { icon: CheckSquare, iconClass: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20" };
    case "upcoming-tasks":
      return { icon: Calendar, iconClass: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20" };
    case "recent-pages":
      return { icon: FileText, iconClass: "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/20" };
    case "sticky-note":
      return { icon: StickyNote, iconClass: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20" };
    case "vitality-battery":
      return { icon: Zap, iconClass: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20" };
    case "habit-matrix":
      return { icon: CheckCircle2, iconClass: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20" };
    case "activity-graph":
      return { icon: TrendingUp, iconClass: "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20" };
    case "progress-rings":
      return { icon: Target, iconClass: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20" };
    case "sprint-velocity":
      return { icon: TrendingUp, iconClass: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20" };
    case "project-progress":
      return { icon: Target, iconClass: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20" };
    case "milestones":
      return { icon: Flag, iconClass: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20" };
    case "world-clock":
      return { icon: Compass, iconClass: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20" };
    case "ambient-soundscapes":
      return { icon: Volume2, iconClass: "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/20" };
    case "unread-notifications":
      return { icon: Bell, iconClass: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20" };
    case "mentions":
      return { icon: MessageSquare, iconClass: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20" };
    default:
      if (category === "ai") return { icon: Sparkles, iconClass: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20" };
      if (category === "integrations") return { icon: Plug, iconClass: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20" };
      if (category === "system") return { icon: Wifi, iconClass: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20" };
      return { icon: LayoutGrid, iconClass: "text-neutral-600 dark:text-neutral-400 bg-[#ede8df] dark:bg-white/10 border-[#e8e4db] dark:border-white/10" };
  }
}

export function WidgetsSettings({ onToast, pages = [] }: WidgetsSettingsProps) {
  const allDefinitions = useMemo(() => getAllWidgetDefinitions(), []);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string>("streak-tracker");
  const [previewSize, setPreviewSize] = useState<WidgetSize>("small");
  const [deviceSurface, setDeviceSurface] = useState<"desktop" | "mobile">("desktop");
  const [activeCategory, setActiveCategory] = useState<string>("best-match");
  const [searchQuery, setSearchQuery] = useState("");

  // Surface toggles state
  const [mobileStandByEnabled, setMobileStandByEnabled] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("noska_widgets_mobile_standby") || "true");
    } catch {
      return true;
    }
  });

  const [pipMiniBarEnabled, setPipMiniBarEnabled] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("noska_widgets_pip_minibar") || "true");
    } catch {
      return true;
    }
  });

  const [soundAutoFade, setSoundAutoFade] = useState(true);
  const [celebrationConfetti, setCelebrationConfetti] = useState(true);

  // Active dashboard layout from localStorage
  const [layoutWidgets, setLayoutWidgets] = useState<WidgetInstance[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.widgets)) return parsed.widgets;
      }
    } catch {}
    return [
      { id: "w-streak", widgetId: "streak-tracker", size: "small", config: {} },
      { id: "w-focus", widgetId: "focus-timer", size: "small", config: {} },
      { id: "w-ai", widgetId: "ai-neural-hub", size: "medium", config: {} },
      { id: "w-tasks", widgetId: "my-tasks", size: "medium", config: {} },
      { id: "w-sound", widgetId: "ambient-soundscapes", size: "medium", config: {} },
      { id: "w-sticky", widgetId: "sticky-note", size: "small", config: {} },
      { id: "w-velocity", widgetId: "sprint-velocity", size: "medium", config: {} },
      { id: "w-clock", widgetId: "world-clock", size: "medium", config: {} },
    ];
  });

  const activeWidgetIds = useMemo(() => new Set(layoutWidgets.map((w) => w.widgetId)), [layoutWidgets]);

  const persistLayout = (newWidgets: WidgetInstance[], msg?: string) => {
    setLayoutWidgets(newWidgets);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, widgets: newWidgets }));
      window.dispatchEvent(new Event("noska:widgets-layout-changed"));
    } catch {}
    if (msg) onToast?.(msg);
  };

  const handleToggleWidget = (widgetId: string) => {
    const exists = activeWidgetIds.has(widgetId);
    if (exists) {
      const filtered = layoutWidgets.filter((w) => w.widgetId !== widgetId);
      persistLayout(filtered, `Removed widget from dashboard`);
    } else {
      const def = getWidgetDefinition(widgetId);
      const newInstance: WidgetInstance = {
        id: `w-${widgetId}-${Date.now()}`,
        widgetId,
        size: def?.defaultSize || "small",
        config: def?.defaultConfig || {},
      };
      persistLayout([...layoutWidgets, newInstance], `Added ${def?.name || "widget"} to dashboard! 🚀`);
    }
  };

  const handleApplyPreset = (preset: (typeof BEST_MATCH_PRESETS)[0]) => {
    const newInstances: WidgetInstance[] = preset.widgets.map((p, idx) => ({
      id: `w-${p.widgetId}-${Date.now()}-${idx}`,
      widgetId: p.widgetId,
      size: p.size,
      config: getWidgetDefinition(p.widgetId)?.defaultConfig || {},
    }));
    persistLayout(newInstances, `Applied preset: ${preset.name}! ✨`);
  };

  // Mock runtime context for live preview rendering
  const previewContext: WidgetRuntimeContext = useMemo(
    () => ({
      pages: pages.length > 0 ? pages : [
        { id: "demo-p1", title: "Product Architecture & AI Roadmap", icon: "🚀", updatedAt: new Date().toISOString(), blocks: [{ id: "b1", type: "todo", text: "Finalize Noska widget platform", checked: false }] } as any,
        { id: "demo-p2", title: "Daily Habit & Sprint Reflection", icon: "✨", updatedAt: new Date(Date.now() - 3600000).toISOString(), blocks: [] } as any,
      ],
      sharedPages: [],
      pendingInvites: [],
      currentUserId: "demo-user",
      currentUserName: "Krishna",
      workspaceName: "Noska HQ",
      actions: {
        onSelect: () => onToast?.("Page opened"),
        onNew: () => onToast?.("New note created"),
        onAI: () => onToast?.("AI Neural Hub activated"),
        onOpenChat: () => onToast?.("Chat opened"),
        onBlockPatch: () => onToast?.("Task updated"),
        onView: () => {},
        onToast: (m) => onToast?.(m),
      },
    }),
    [pages, onToast]
  );

  const selectedDef = getWidgetDefinition(selectedWidgetId) || allDefinitions[0];

  // Adjust preview size when selected widget changes if unsupported
  React.useEffect(() => {
    if (selectedDef && !selectedDef.supportedSizes.includes(previewSize)) {
      setPreviewSize(selectedDef.defaultSize);
    }
  }, [selectedDef, previewSize]);

  // Filter widgets by category and search
  const filteredWidgets = useMemo(() => {
    return allDefinitions.filter((def) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = def.name.toLowerCase().includes(q);
        const matchDesc = def.description.toLowerCase().includes(q);
        const matchCat = def.category.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchCat) return false;
      }

      if (activeCategory === "best-match") {
        return BEST_MATCH_IDS.has(def.id);
      }
      if (activeCategory !== "all") {
        return def.category === activeCategory;
      }
      return true;
    });
  }, [allDefinitions, activeCategory, searchQuery]);

  return (
    <div className="w-full space-y-7 pb-16 font-sans select-none text-[#1c1b18] dark:text-white">
      {/* ── Title Header matching Noska Settings Standard ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[28px] font-normal tracking-tight font-serif text-[#1c1b18] dark:text-white">
              Widgets & Home Screen
            </h1>
            <span className="rounded-full bg-[#ede8df] dark:bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#78716c] dark:text-white/70 border border-[#e3ded4] dark:border-white/10">
              Noska Dynamic Hub
            </span>
          </div>
          <p className="text-xs text-[#706c64] dark:text-white/60 mt-1">
            Customize, reorder and preview live interactive widgets across Desktop, Mobile StandBy, and Floating Mini-Bar.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleApplyPreset(BEST_MATCH_PRESETS[3])}
            className="flex items-center gap-1.5 rounded-xl border border-[#e8e4db] dark:border-white/10 bg-[#f8f6f0] dark:bg-[#181b24] hover:bg-[#ede8df] dark:hover:bg-white/10 px-3.5 py-2 text-xs font-semibold text-[#1c1b18] dark:text-white transition cursor-pointer shadow-xs"
          >
            <RotateCcw size={13} />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* ── Curated Best Match Presets ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#1c1b18] dark:text-white">
            <Sparkles size={14} className="text-[#8c887f] dark:text-neutral-400" />
            <span>Curated Best Match Presets</span>
          </div>
          <span className="text-[11px] text-[#8c887f] dark:text-white/50">1-click instant workspace optimization</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {BEST_MATCH_PRESETS.map((preset) => {
            const Icon = preset.icon;
            return (
              <motion.div
                key={preset.id}
                whileHover={{ y: -2 }}
                className="flex flex-col justify-between p-4 rounded-2xl border border-[#e8e4db] dark:border-white/10 bg-[#f8f6f0] dark:bg-[#181b24] shadow-xs"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className={`flex size-8 items-center justify-center rounded-xl border shadow-2xs ${preset.iconColor}`}>
                      <Icon size={16} />
                    </span>
                    <span className="text-[10px] font-semibold text-[#8c887f] dark:text-white/60 bg-[#ede8df] dark:bg-white/10 px-2.5 py-0.5 rounded-full">
                      {preset.widgets.length} Widgets
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#1c1b18] dark:text-white">{preset.name}</h3>
                    <p className="text-[11px] text-[#706c64] dark:text-white/60 mt-0.5">{preset.badge}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleApplyPreset(preset)}
                  className="mt-3.5 flex items-center justify-center gap-1.5 w-full rounded-xl bg-[#1c1b18] hover:bg-black text-white dark:bg-white dark:text-[#1c1b18] dark:hover:bg-neutral-200 py-1.5 text-[11px] font-semibold transition active:scale-95 cursor-pointer shadow-xs"
                >
                  <span>Apply Preset</span>
                  <ArrowRight size={12} />
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Main Split Layout: Interactive Preview Canvas & Widget Catalog ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] xl:grid-cols-[440px_1fr] gap-6 items-start">
        {/* Left Column: Interactive Live Preview Stage */}
        <div className="space-y-4 lg:sticky lg:top-4 z-10">
          <div className="p-5 rounded-2xl border border-[#e8e4db] dark:border-white/10 bg-[#f8f6f0] dark:bg-[#181b24] shadow-xs space-y-4">
            {/* Device & Size Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#e8e4db] dark:border-white/10">
              {/* Device Tabs */}
              <div className="flex items-center gap-0.5 p-0.5 bg-[#ede8df] dark:bg-white/10 rounded-xl border border-[#e8e4db] dark:border-white/10">
                <button
                  onClick={() => setDeviceSurface("desktop")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    deviceSurface === "desktop"
                      ? "bg-white dark:bg-[#20242e] text-[#1c1b18] dark:text-white shadow-xs font-bold"
                      : "text-[#706c64] dark:text-neutral-400 hover:text-[#1c1b18] dark:hover:text-white cursor-pointer"
                  }`}
                >
                  <Monitor size={13} />
                  <span>Desktop</span>
                </button>
                <button
                  onClick={() => setDeviceSurface("mobile")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    deviceSurface === "mobile"
                      ? "bg-white dark:bg-[#20242e] text-[#1c1b18] dark:text-white shadow-xs font-bold"
                      : "text-[#706c64] dark:text-neutral-400 hover:text-[#1c1b18] dark:hover:text-white cursor-pointer"
                  }`}
                >
                  <Smartphone size={13} />
                  <span>StandBy</span>
                </button>
              </div>

              {/* Supported Size Tabs (S, M, L) */}
              {selectedDef && (
                <div className="flex items-center gap-0.5 p-0.5 bg-[#ede8df] dark:bg-white/10 rounded-xl border border-[#e8e4db] dark:border-white/10">
                  {(["small", "medium", "large"] as WidgetSize[]).map((sz) => {
                    const supported = selectedDef.supportedSizes.includes(sz);
                    const label = sz === "small" ? "S" : sz === "medium" ? "M" : "L";
                    return (
                      <button
                        key={sz}
                        disabled={!supported}
                        onClick={() => setPreviewSize(sz)}
                        title={sz === "small" ? "Small (1x1)" : sz === "medium" ? "Medium (2x1)" : "Large (2x2)"}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          previewSize === sz
                            ? "bg-[#1c1b18] dark:bg-white text-white dark:text-[#1c1b18] shadow-xs"
                            : supported
                            ? "text-[#706c64] dark:text-neutral-400 hover:text-[#1c1b18] dark:hover:text-white"
                            : "text-neutral-300 dark:text-neutral-700 cursor-not-allowed opacity-40"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Live Interactive Preview Stage */}
            <div className="relative flex flex-col items-center justify-center p-6 rounded-2xl bg-white dark:bg-[#0c0e14] border border-[#e8e4db] dark:border-white/10 min-h-[300px] overflow-hidden shadow-inner">
              {/* Soft Ambient Backdrop Light */}
              <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 size-48 rounded-full bg-amber-500/10 dark:bg-indigo-500/15 blur-3xl" />

              {/* StandBy Phone Frame Mode or Desktop Frame */}
              {selectedDef ? (
                <WidgetEngineProvider ctx={previewContext}>
                  <NotificationProvider ctx={previewContext}>
                    {deviceSurface === "mobile" ? (
                      <div className="relative w-[280px] rounded-[36px] border-4 border-[#33312c] dark:border-neutral-700 bg-black/95 p-3 shadow-2xl space-y-2">
                        <div className="flex items-center justify-between px-2 text-[10px] text-white/60 font-semibold">
                          <span>9:41</span>
                          <div className="h-2.5 w-12 rounded-full bg-neutral-800" />
                          <span>5G ● 100%</span>
                        </div>

                        <div className="w-full flex items-center justify-center py-1">
                          <WidgetFrame
                            definition={selectedDef}
                            instance={{
                              id: "preview-instance",
                              widgetId: selectedDef.id,
                              size: previewSize,
                              config: selectedDef.defaultConfig || {},
                            }}
                            ctx={previewContext}
                            onRemove={() => handleToggleWidget(selectedDef.id)}
                            onResize={(newSize) => setPreviewSize(newSize)}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="w-full max-w-[360px] flex items-center justify-center">
                        <WidgetFrame
                          definition={selectedDef}
                          instance={{
                            id: "preview-instance",
                            widgetId: selectedDef.id,
                            size: previewSize,
                            config: selectedDef.defaultConfig || {},
                          }}
                          ctx={previewContext}
                          onRemove={() => handleToggleWidget(selectedDef.id)}
                          onResize={(newSize) => setPreviewSize(newSize)}
                        />
                      </div>
                    )}
                  </NotificationProvider>
                </WidgetEngineProvider>
              ) : (
                <div className="text-xs text-[#706c64] dark:text-white/60">Select a widget to preview</div>
              )}
            </div>

            {/* Selected Widget Info & Add/Remove Action Bar */}
            {selectedDef && (
              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-[#1c1b18] dark:text-white">{selectedDef.name}</h2>
                    {BEST_MATCH_IDS.has(selectedDef.id) && (
                      <span className="flex items-center gap-1 text-[9.5px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                        <Flame size={10} fill="currentColor" /> Best Match
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#706c64] dark:text-white/60 mt-1 leading-relaxed">{selectedDef.description}</p>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => handleToggleWidget(selectedDef.id)}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition active:scale-98 cursor-pointer shadow-xs ${
                      activeWidgetIds.has(selectedDef.id)
                        ? "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100"
                        : "bg-[#1c1b18] hover:bg-black text-white dark:bg-white dark:text-[#1c1b18] dark:hover:bg-neutral-200"
                    }`}
                  >
                    {activeWidgetIds.has(selectedDef.id) ? (
                      <>
                        <Trash2 size={13} />
                        <span>Remove from Dashboard</span>
                      </>
                    ) : (
                      <>
                        <Plus size={14} />
                        <span>Add to Home Dashboard</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Full Widget Catalog */}
        <div className="space-y-4 min-w-0">
          {/* Sticky Filter Bar & Search */}
          <div className="sticky top-0 z-20 space-y-3 bg-white/95 dark:bg-[#151820]/95 backdrop-blur-xl pb-2 pt-1 border-b border-[#e8e4db] dark:border-white/10">
            <div className="flex items-center gap-1 p-0.5 bg-[#ede8df] dark:bg-white/10 rounded-xl border border-[#e8e4db] dark:border-white/10 overflow-x-auto scrollbar-none">
              {[
                { id: "best-match", label: "🔥 Best Matches" },
                { id: "all", label: "All Widgets" },
                { id: "gamified", label: "Focus & Habits" },
                { id: "productivity", label: "Productivity" },
                { id: "ai", label: "AI Neural" },
                { id: "project", label: "Projects" },
                { id: "system", label: "System & Ambient" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    activeCategory === cat.id
                      ? "bg-white dark:bg-[#20242e] text-[#1c1b18] dark:text-white shadow-xs font-bold"
                      : "text-[#706c64] dark:text-neutral-400 hover:text-[#1c1b18] dark:hover:text-white"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search widgets by title, feature, or category..."
                className="w-full rounded-xl border border-[#e8e4db] dark:border-white/10 bg-[#f8f6f0] dark:bg-white/5 px-3.5 py-2 text-xs font-medium text-[#1c1b18] dark:text-white placeholder:text-[#a09c94] outline-none focus:border-[#1c1b18] dark:focus:border-white/30 transition shadow-2xs"
              />
            </div>
          </div>

          {/* Widget Cards List */}
          <div className="space-y-3 pt-1">
            <AnimatePresence mode="popLayout">
              {filteredWidgets.map((def, idx) => {
                const isSelected = selectedWidgetId === def.id;
                const isActive = activeWidgetIds.has(def.id);
                const isBestMatch = BEST_MATCH_IDS.has(def.id);
                const visual = getWidgetVisual(def.id, def.category);
                const IconComponent = visual.icon;

                return (
                  <motion.div
                    key={def.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30, delay: idx * 0.02 }}
                    whileHover={{ y: -2 }}
                    onClick={() => setSelectedWidgetId(def.id)}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#f4efe4] dark:bg-white/10 border-[#1c1b18]/40 dark:border-white/40 shadow-sm"
                        : "bg-[#f8f6f0] dark:bg-[#181b24] border-[#e8e4db] dark:border-white/10 hover:border-[#d4cebf] dark:hover:border-white/20 hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                      <div className={`flex size-10 items-center justify-center rounded-xl border shadow-2xs shrink-0 mt-0.5 sm:mt-0 ${visual.iconClass}`}>
                        <IconComponent size={18} strokeWidth={2.2} />
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-[#1c1b18] dark:text-white">
                            {def.name}
                          </span>
                          {isBestMatch && (
                            <span className="flex items-center gap-1 text-[9.5px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30 shrink-0">
                              <Flame size={10} fill="currentColor" /> Match
                            </span>
                          )}
                          <span className="text-[10px] font-semibold text-[#8c887f] uppercase tracking-wider bg-[#ede8df] dark:bg-white/10 px-2 py-0.5 rounded-md shrink-0">
                            {def.category}
                          </span>
                        </div>
                        <p className="text-xs text-[#706c64] dark:text-white/60 leading-relaxed">
                          {def.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pt-1 sm:pt-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedWidgetId(def.id);
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-[#1c1b18] text-white dark:bg-white dark:text-[#1c1b18] border-transparent shadow-xs"
                            : "border-[#e8e4db] dark:border-white/10 text-[#706c64] dark:text-white/70 hover:text-[#1c1b18] dark:hover:text-white hover:bg-[#ede8df] dark:hover:bg-white/10"
                        }`}
                      >
                        <Eye size={13} />
                        <span>Preview</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleWidget(def.id);
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-95 ${
                          isActive
                            ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/25"
                            : "bg-[#1c1b18] hover:bg-black text-white dark:bg-white dark:text-[#1c1b18] dark:hover:bg-neutral-200"
                        }`}
                      >
                        {isActive ? (
                          <>
                            <Check size={13} strokeWidth={3} />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <Plus size={13} strokeWidth={2.5} />
                            <span>Enable</span>
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Surface Controls & Behavior Preferences matching Noska Settings Cards ── */}
      <div className="rounded-2xl border border-[#e8e4db] dark:border-white/10 bg-[#f8f6f0] dark:bg-[#181b24] p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-[#706c64] dark:text-neutral-400" />
          <h2 className="text-sm font-bold text-[#1c1b18] dark:text-white">Widget Surface Behavior & Preferences</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-[#151820] border border-[#e8e4db] dark:border-white/10 shadow-2xs">
            <div>
              <p className="text-xs font-bold text-[#1c1b18] dark:text-white">Mobile StandBy & Quick Lock Screen</p>
              <p className="text-[11px] text-[#706c64] dark:text-white/60 mt-0.5">Sync streak flame and liquid focus timer with mobile devices.</p>
            </div>
            <button
              onClick={() => {
                const val = !mobileStandByEnabled;
                setMobileStandByEnabled(val);
                localStorage.setItem("noska_widgets_mobile_standby", JSON.stringify(val));
                onToast?.(val ? "Mobile StandBy enabled" : "Mobile StandBy disabled");
              }}
              className={`w-10 h-6 rounded-full p-1 transition cursor-pointer ${mobileStandByEnabled ? "bg-emerald-500" : "bg-[#ede8df] dark:bg-neutral-700"}`}
            >
              <div className={`size-4 rounded-full bg-white transition-transform ${mobileStandByEnabled ? "translate-x-4" : "translate-x-0"}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-[#151820] border border-[#e8e4db] dark:border-white/10 shadow-2xs">
            <div>
              <p className="text-xs font-bold text-[#1c1b18] dark:text-white">Floating Mini-Bar (PiP Mode)</p>
              <p className="text-[11px] text-[#706c64] dark:text-white/60 mt-0.5">Keep active focus timer and sticky notes floating above docs.</p>
            </div>
            <button
              onClick={() => {
                const val = !pipMiniBarEnabled;
                setPipMiniBarEnabled(val);
                localStorage.setItem("noska_widgets_pip_minibar", JSON.stringify(val));
                onToast?.(val ? "Floating Mini-bar enabled" : "Floating Mini-bar disabled");
              }}
              className={`w-10 h-6 rounded-full p-1 transition cursor-pointer ${pipMiniBarEnabled ? "bg-emerald-500" : "bg-[#ede8df] dark:bg-neutral-700"}`}
            >
              <div className={`size-4 rounded-full bg-white transition-transform ${pipMiniBarEnabled ? "translate-x-4" : "translate-x-0"}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-[#151820] border border-[#e8e4db] dark:border-white/10 shadow-2xs">
            <div>
              <p className="text-xs font-bold text-[#1c1b18] dark:text-white">Ambient Soundscape Auto-Fade</p>
              <p className="text-[11px] text-[#706c64] dark:text-white/60 mt-0.5">Smoothly fade rain and forest sounds when focus sprints complete.</p>
            </div>
            <button
              onClick={() => setSoundAutoFade(!soundAutoFade)}
              className={`w-10 h-6 rounded-full p-1 transition cursor-pointer ${soundAutoFade ? "bg-emerald-500" : "bg-[#ede8df] dark:bg-neutral-700"}`}
            >
              <div className={`size-4 rounded-full bg-white transition-transform ${soundAutoFade ? "translate-x-4" : "translate-x-0"}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-[#151820] border border-[#e8e4db] dark:border-white/10 shadow-2xs">
            <div>
              <p className="text-xs font-bold text-[#1c1b18] dark:text-white">Celebration Particles & Confetti</p>
              <p className="text-[11px] text-[#706c64] dark:text-white/60 mt-0.5">Burst celebratory confetti upon streak milestones and 100% daily tasks.</p>
            </div>
            <button
              onClick={() => setCelebrationConfetti(!celebrationConfetti)}
              className={`w-10 h-6 rounded-full p-1 transition cursor-pointer ${celebrationConfetti ? "bg-emerald-500" : "bg-[#ede8df] dark:bg-neutral-700"}`}
            >
              <div className={`size-4 rounded-full bg-white transition-transform ${celebrationConfetti ? "translate-x-4" : "translate-x-0"}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WidgetsSettings;
