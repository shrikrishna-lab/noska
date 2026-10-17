import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Type, Maximize2, Palette, Image, Lock, Eye, Sparkles,
  Sun, Moon, Monitor, ChevronDown, Check, Sliders, Layers,
  Compass, Laptop, Smartphone, BookOpen, FileText, Layout, Calendar
} from "lucide-react";
import type { Page } from "../../lib/supabaseService";
import { useCalendarTopbarSetting, useAutoPagesInCalendarSetting } from "../../lib/calendarSync";
import { COVER_CATEGORIES, getAllCovers } from "../../registry/covers/CoverRegistry";
import { PAGE_TEXTURE_DEFINITIONS } from "../../features/customization/pageTexture";

export interface PageThemePreset {
  id: string;
  name: string;
  category: "luxury" | "dark" | "nature" | "minimal";
  bg: string;
  textColor?: string;
  previewGradient: string;
  description: string;
}

export const PAGE_THEME_PRESETS: PageThemePreset[] = [
  {
    id: "default-studio",
    name: "System Liquid Glass",
    category: "minimal",
    bg: "",
    previewGradient: "linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)",
    description: "Dynamic adaptive surface matching your system theme mode"
  },
  {
    id: "warm-ivory",
    name: "Warm Ivory & Charcoal",
    category: "luxury",
    bg: "#FAF7F2",
    previewGradient: "linear-gradient(135deg, #fdfbf7 0%, #f4ede4 100%)",
    description: "Crafted warm cotton parchment with velvety charcoal ink"
  },
  {
    id: "obsidian-oled",
    name: "Obsidian Pitch OLED",
    category: "dark",
    bg: "#000000",
    previewGradient: "#000000",
    description: "100% True Black OLED display mode with pure contrast"
  },
  {
    id: "nordic-frost",
    name: "Nordic Glacier Frost",
    category: "luxury",
    bg: "radial-gradient(circle at 10% 20%, #0d1527 0%, #070a14 90%)",
    previewGradient: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #38bdf8 100%)",
    description: "Scandinavian fjord atmosphere with subtle glacial glow"
  },
  {
    id: "tokyo-night",
    name: "Tokyo Night Indigo",
    category: "dark",
    bg: "radial-gradient(circle at 20% 20%, #16182e 0%, #0d0e1a 100%)",
    previewGradient: "linear-gradient(135deg, #101222 0%, #1e1b4b 50%, #7aa2f7 100%)",
    description: "Atmospheric Shibuya midnight rain with neon violet hues"
  },
  {
    id: "kyoto-matcha",
    name: "Kyoto Matcha & Sage",
    category: "nature",
    bg: "radial-gradient(circle at 10% 20%, #142218 0%, #0a130d 100%)",
    previewGradient: "linear-gradient(135deg, #111a13 0%, #15803d 50%, #86efac 100%)",
    description: "Serene Japanese bamboo garden & calming mineral moss"
  },
  {
    id: "espresso-crema",
    name: "Espresso & Roasted Crema",
    category: "luxury",
    bg: "radial-gradient(circle at 15% 15%, #241610 0%, #120b08 100%)",
    previewGradient: "linear-gradient(135deg, #281c15 0%, #78350f 50%, #b45309 100%)",
    description: "Rich dark roasted coffee notes with warm caramel crema"
  },
  {
    id: "rose-quartz",
    name: "Rose Quartz Dusk",
    category: "luxury",
    bg: "radial-gradient(circle at 20% 20%, #24121a 0%, #13090e 100%)",
    previewGradient: "linear-gradient(135deg, #1f121a 0%, #9d174d 50%, #f472b6 100%)",
    description: "Gentle dusty rose quartz with serene dusk ambience"
  },
  {
    id: "sepia-manuscript",
    name: "Sepia Archive Manuscript",
    category: "nature",
    bg: "radial-gradient(circle at 10% 20%, #241c12 0%, #140f09 100%)",
    previewGradient: "linear-gradient(135deg, #1c1810 0%, #92400e 50%, #fde68a 100%)",
    description: "Historic library manuscript with antique parchment aura"
  },
  {
    id: "matrix-phosphor",
    name: "Matrix Phosphor Terminal",
    category: "dark",
    bg: "radial-gradient(circle at 15% 15%, #08170d 0%, #040905 100%)",
    previewGradient: "linear-gradient(135deg, #050805 0%, #064e3b 50%, #10b981 100%)",
    description: "Cyberpunk green terminal glow with deep obsidian pitch"
  }
];

export const AMBIENT_CANVAS_MESH: Array<{ label: string; value: string | null; preview: string }> = [
  { label: "Clean Default", value: null, preview: "bg-transparent" },
  { label: "Ambient Aura Glow", value: "radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.15) 0%, transparent 60%)", preview: "radial-gradient(circle at 50% 0%, rgba(59,130,246,0.8), transparent)" },
  { label: "Sunset Aura Glow", value: "radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.15) 0%, transparent 60%)", preview: "radial-gradient(circle at 50% 0%, rgba(245,158,11,0.8), transparent)" },
  { label: "Emerald Pine Glow", value: "radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.15) 0%, transparent 60%)", preview: "radial-gradient(circle at 50% 0%, rgba(16,185,129,0.8), transparent)" },
  { label: "Violet Dusk Glow", value: "radial-gradient(ellipse at 50% 0%, rgba(168,85,247,0.15) 0%, transparent 60%)", preview: "radial-gradient(circle at 50% 0%, rgba(168,85,247,0.8), transparent)" },
  { label: "Rose Quartz Glow", value: "radial-gradient(ellipse at 50% 0%, rgba(244,63,94,0.15) 0%, transparent 60%)", preview: "radial-gradient(circle at 50% 0%, rgba(244,63,94,0.8), transparent)" }
];

export const FONT_OPTIONS: Array<{ id: string; label: string; class: string; preview: string; desc: string }> = [
  { id: "default", label: "Sans (Inter)", class: "font-sans", preview: "Ag", desc: "Clean modern UI typeface" },
  { id: "serif", label: "Serif (Editorial)", class: "font-serif", preview: "Ag", desc: "Classic literary manuscript" },
  { id: "mono", label: "Mono (Code)", class: "font-mono", preview: "Ag", desc: "Precision technical monospace" },
  { id: "handwriting", label: "Handwriting", class: "italic font-serif", preview: "Ag", desc: "Casual organic script" },
  { id: "display", label: "Display Modern", class: "font-sans tracking-wide font-black uppercase", preview: "Ag", desc: "Bold editorial headlines" }
];

const CUSTOMIZE_TABS = [
  { id: "theme" as const, label: "Theme", icon: Palette, color: "text-indigo-500 dark:text-indigo-400" },
  { id: "typography" as const, label: "Fonts", icon: Type, color: "text-blue-500 dark:text-blue-400" },
  { id: "layout" as const, label: "Layout", icon: Layout, color: "text-emerald-500 dark:text-emerald-400" },
  { id: "cover" as const, label: "Cover", icon: Image, color: "text-amber-500 dark:text-amber-400" },
  { id: "icon" as const, label: "Icon", icon: Sparkles, color: "text-fuchsia-500 dark:text-fuchsia-400" },
];

interface CustomizePanelProps {
  open: boolean;
  onClose: () => void;
  page?: Page;
  onPagePatch?: (patch: Record<string, unknown>) => void;
  onToast?: (message: string) => void;
}

export default function CustomizePanel({ open, onClose, page, onPagePatch, onToast }: CustomizePanelProps) {
  const { enabled: calendarTopbarEnabled, toggle: toggleCalendarTopbar } = useCalendarTopbarSetting();
  const { enabled: autoPagesEnabled, toggle: toggleAutoPages } = useAutoPagesInCalendarSetting();
  const [tab, setTab] = useState<"theme" | "typography" | "layout" | "cover" | "icon">("theme");
  const [coverCategory, setCoverCategory] = useState<string>("gradients");
  const isDark = typeof document !== "undefined"
    ? document.documentElement.classList.contains("dark") || document.documentElement.getAttribute("data-theme") === "dark"
    : false;

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const currentCoverList = COVER_CATEGORIES.find((c) => c.id === coverCategory)?.covers || [];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop Scrim: COMPLETELY FREE OF BLUR so live page changes remain crystal clear */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[100] bg-black/[0.08] dark:bg-black/35 pointer-events-auto"
            onClick={onClose}
          />

          {/* Apple macOS / iPadOS Inspector Side Panel */}
          <motion.div
            initial={{ opacity: 0, x: 390 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{
              opacity: 0,
              x: 390,
              transition: { duration: 0.22, ease: [0.32, 0, 0.67, 0] }
            }}
            transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.8 }}
            style={{ willChange: "transform, opacity" }}
            className="fixed right-0 top-0 bottom-0 z-[101] w-[390px] max-w-[95vw] border-l border-black/[0.08] dark:border-white/[0.12] bg-[var(--surface-1)] shadow-[-16px_0_40px_rgba(0,0,0,0.12)] dark:shadow-[-20px_0_50px_rgba(0,0,0,0.55)] flex flex-col overflow-hidden text-[var(--text)] font-sans select-none"
          >
            {/* Top Header - Apple Studio Inspector Bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.08] bg-white/60 dark:bg-[#16171b]/60 backdrop-blur-2xl">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500/15 via-blue-500/10 to-indigo-500/5 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-[0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.6)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.12)] flex items-center justify-center">
                  <Palette size={14} strokeWidth={2.4} />
                </div>
                <div>
                  <h3 className="text-[13px] font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight leading-tight">Customize Page</h3>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-normal leading-tight mt-0.5">Themes, typography, canvas physics & covers</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.90 }}
                onClick={onClose}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-black/[0.05] dark:bg-white/[0.08] hover:bg-black/[0.1] dark:hover:bg-white/[0.15] text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-all cursor-pointer"
                title="Close (Esc)"
                aria-label="Close"
              >
                <X size={13} strokeWidth={2.4} />
              </motion.button>
            </div>

            {/* Navigation Tabs - Apple Segmented Control */}
            <div className="px-3.5 py-2.5 border-b border-black/[0.06] dark:border-white/[0.08] bg-black/[0.015] dark:bg-white/[0.02]">
              <div
                role="tablist"
                aria-label="Customize page sections"
                className="relative flex items-center w-full p-1 rounded-[12px] bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.06] select-none"
              >
                {CUSTOMIZE_TABS.map((t, idx) => {
                  const isSelected = tab === t.id;
                  const isNextSelected = idx < CUSTOMIZE_TABS.length - 1 && tab === CUSTOMIZE_TABS[idx + 1].id;
                  const showSeparator = idx < CUSTOMIZE_TABS.length - 1 && !isSelected && !isNextSelected;
                  const Icon = t.icon;
                  return (
                    <div key={t.id} className="relative flex-1 min-w-0 flex items-center">
                      <motion.button
                        role="tab"
                        aria-label={t.label}
                        aria-selected={isSelected}
                        title={t.label}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setTab(t.id)}
                        className="relative z-10 w-full h-[32px] flex items-center justify-center rounded-[9px] transition-colors duration-150 cursor-pointer select-none"
                      >
                        {isSelected && (
                          <motion.div
                            layoutId="active-customize-tab"
                            className="absolute inset-0 bg-white dark:bg-[#25272e] rounded-[9px] shadow-[0_1px_3px_rgba(0,0,0,0.1),0_0.5px_1px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,1)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.15)] ring-1 ring-black/[0.04] dark:ring-white/[0.06] -z-10"
                            transition={{ type: "spring", stiffness: 500, damping: 36, mass: 0.55 }}
                          />
                        )}
                        <Icon
                          size={15}
                          strokeWidth={isSelected ? 2.4 : 1.9}
                          className={`shrink-0 transition-all duration-200 ${
                            isSelected
                              ? `${t.color} scale-110 drop-shadow-sm`
                              : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white opacity-70 hover:opacity-100"
                          }`}
                        />
                      </motion.button>
                      {/* Apple-style Segment Divider between unselected tabs */}
                      <div
                        className={`absolute right-0 top-1/2 -translate-y-1/2 h-3.5 w-[1px] bg-black/[0.08] dark:bg-white/[0.1] rounded-full pointer-events-none transition-opacity duration-150 ${
                          showSeparator ? "opacity-100" : "opacity-0"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-6">
              {/* ═══════════════════════════════════════════════════════════
                  TAB 1: PAGE THEMES & AMBIENT MESH GLOWS
                 ═══════════════════════════════════════════════════════════ */}
              {tab === "theme" && (
                <div className="space-y-5">
                  {/* Curated Full Page Themes */}
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
                        <Sparkles size={11} className="text-[#0066FF] dark:text-[#4791FF]" />
                        <span>Curated Mood Themes</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      {PAGE_THEME_PRESETS.map((preset) => {
                        const isSelected = (page?.pageBg ?? "") === preset.bg;
                        return (
                          <motion.button
                            key={preset.id}
                            whileHover={{ scale: 1.03, y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            transition={{ type: "spring", stiffness: 450, damping: 26 }}
                            onClick={() => {
                              onPagePatch?.({ pageBg: preset.bg || null });
                              onToast?.(`Applied ${preset.name} page theme`);
                            }}
                            className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer select-none ${isSelected
                              ? "border-[#0066FF] dark:border-[#4791FF] ring-2 ring-[#0066FF]/25 dark:ring-[#4791FF]/30 bg-[var(--surface-1)] shadow-[0_4px_16px_rgba(0,102,255,0.15)]"
                              : "border-black/[0.08] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.03] hover:bg-[var(--surface-1)] hover:border-black/[0.18] dark:hover:border-white/[0.22] shadow-2xs hover:shadow-xs"
                              }`}
                          >
                            {/* Miniature Document Studio Canvas Tile */}
                            <div
                              className="relative w-full h-14 rounded-xl overflow-hidden border border-black/10 dark:border-white/12 shadow-xs flex flex-col justify-between p-2 transition-transform duration-200 group-hover:scale-[1.02]"
                              style={{ background: preset.previewGradient }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />

                              {/* Mini mock page header */}
                              <div className="flex items-center justify-between relative z-10">
                                <div className="w-8 h-1.5 rounded-full bg-black/20 dark:bg-white/30" />
                                {isSelected ? (
                                  <div className="w-4 h-4 rounded-full bg-[#0066FF] dark:bg-[#4791FF] text-white flex items-center justify-center shadow-xs">
                                    <Check size={10} strokeWidth={3} />
                                  </div>
                                ) : (
                                  <div className="w-1.5 h-1.5 rounded-full bg-black/15 dark:bg-white/20" />
                                )}
                              </div>

                              {/* Mini mock page text lines */}
                              <div className="space-y-1 relative z-10">
                                <div className="w-14 h-1 rounded-full bg-black/15 dark:bg-white/25" />
                                <div className="w-9 h-1 rounded-full bg-black/10 dark:bg-white/20" />
                              </div>
                            </div>

                            {/* Label & Description */}
                            <div className="px-0.5 pt-0.5">
                              <div className="text-[11.5px] font-bold text-neutral-900 dark:text-neutral-100 tracking-tight truncate">
                                {preset.name}
                              </div>
                              <div className="text-[9.5px] text-[var(--muted)] line-clamp-1 mt-0.5 leading-snug">
                                {preset.description}
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </section>

                  {/* Ambient Canvas Mesh Glows */}
                  <section className="space-y-3 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
                      <Layers size={11} className="text-[#0066FF] dark:text-[#4791FF]" />
                      <span>Ambient Glow Overlays</span>
                    </span>

                    <div className="grid grid-cols-3 gap-2">
                      {AMBIENT_CANVAS_MESH.map((mesh) => {
                        const isSelected = (page?.pageMeshBg ?? null) === mesh.value;
                        return (
                          <motion.button
                            key={mesh.label}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => {
                              onPagePatch?.({ pageMeshBg: mesh.value });
                              onToast?.(`Updated canvas ambient glow`);
                            }}
                            className={`p-2 rounded-xl border text-left transition cursor-pointer flex flex-col items-center gap-1.5 select-none ${isSelected
                              ? "border-[#0066FF] dark:border-[#4791FF] bg-[var(--surface-1)] ring-1 ring-[#0066FF]/30 shadow-2xs"
                              : "border-black/[0.08] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.03] hover:border-black/[0.15] dark:hover:border-white/[0.2]"
                              }`}
                          >
                            <div
                              className="h-7 w-full rounded-lg border border-black/10 dark:border-white/10 bg-neutral-900"
                              style={{ background: mesh.preview }}
                            />
                            <span className="text-[9.5px] font-semibold text-[var(--muted)] truncate w-full text-center">
                              {mesh.label}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </section>

                  {/* Page Textures & Physical Tactile Materials */}
                  <section className="space-y-3 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
                        <Sparkles size={11} className="text-[#0066FF] dark:text-[#4791FF]" />
                        <span>Page Textures & Tactile Finishes</span>
                      </span>
                      <span className="text-[9.5px] text-[var(--muted)]">Tone-matched</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      {PAGE_TEXTURE_DEFINITIONS.map((tex) => {
                        const currentTex = page?.pageTexture ?? "tone-grain";
                        const isSelected = currentTex === tex.id;
                        return (
                          <motion.button
                            key={tex.id}
                            whileHover={{ scale: 1.02, y: -1 }}
                            whileTap={{ scale: 0.97 }}
                            transition={{ type: "spring", stiffness: 450, damping: 26 }}
                            onClick={() => {
                              onPagePatch?.({ pageTexture: tex.id });
                              onToast?.(`Applied ${tex.name}`);
                            }}
                            className={`p-3 rounded-2xl border text-left transition-shadow flex flex-col justify-between gap-2.5 cursor-pointer select-none ${isSelected
                              ? "border-[#0066FF] dark:border-[#4791FF] ring-2 ring-[#0066FF]/25 dark:ring-[#4791FF]/30 bg-[var(--surface-1)] shadow-md"
                              : "border-black/[0.08] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.03] hover:bg-[var(--surface-1)] hover:border-black/[0.15] dark:hover:border-white/[0.2] shadow-2xs hover:shadow-xs"
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <div
                                className="h-5 w-8 rounded-md border border-black/10 dark:border-white/15 shadow-2xs shrink-0"
                                style={{
                                  background: isDark ? "#171A20" : "#F5F7FA",
                                  backgroundImage: tex.preview,
                                  backgroundSize: "6px 6px"
                                }}
                              />
                              {isSelected && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                                >
                                  <Check size={13} strokeWidth={2.6} className="text-[#0066FF] dark:text-[#4791FF]" />
                                </motion.div>
                              )}
                            </div>
                            <div>
                              <div className="text-[11px] font-bold text-[var(--text)] tracking-tight truncate">{tex.name}</div>
                              <div className="text-[9.5px] text-[var(--muted)] line-clamp-2 mt-0.5 leading-snug">
                                {tex.description}
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </section>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════
                  TAB 2: TYPOGRAPHY
                 ═══════════════════════════════════════════════════════════ */}
              {tab === "typography" && (
                <div className="space-y-4">
                  <div>
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--muted)]">Typeface Family</span>
                    <p className="text-[10px] text-[var(--muted)] mt-0.5">Select primary reading and editing typeface</p>
                  </div>

                  <div className="space-y-2">
                    {FONT_OPTIONS.map((f) => {
                      const isSelected = (page?.fontStyle || "default") === f.id;
                      return (
                        <motion.button
                          key={f.id}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            onPagePatch?.({ fontStyle: f.id });
                            onToast?.(`Font set to ${f.label}`);
                          }}
                          className={`w-full p-3 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between select-none ${isSelected
                            ? "border-[#0066FF] dark:border-[#4791FF] bg-[#0066FF]/10 dark:bg-[#0066FF]/15 ring-1 ring-[#0066FF]/30"
                            : "border-black/[0.08] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.03] hover:border-black/[0.15] dark:hover:border-white/[0.2]"
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`text-xl font-bold w-7 text-center ${f.class}`}>
                              {f.preview}
                            </span>
                            <div>
                              <div className="text-xs font-bold text-[var(--text)] tracking-tight">{f.label}</div>
                              <div className="text-[10px] text-[var(--muted)]">{f.desc}</div>
                            </div>
                          </div>
                          {isSelected && <Check size={14} strokeWidth={2.6} className="text-[#0066FF] dark:text-[#4791FF] shrink-0" />}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════
                  TAB 3: LAYOUT & WIDTH
                 ═══════════════════════════════════════════════════════════ */}
              {tab === "layout" && (
                <div className="space-y-5">
                  {/* Reading Canvas Width */}
                  <section className="space-y-3">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--muted)]">Canvas Max Width</span>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "standard", label: "Standard (720px)", desc: "Optimal reading column", full: false },
                        { id: "wide", label: "Wide (960px)", desc: "Expansive multi-column", full: false },
                        { id: "full", label: "Full Canvas (100%)", desc: "Edge-to-edge canvas", full: true },
                        { id: "compact", label: "Compact (580px)", desc: "Focused note column", full: false }
                      ].map((w) => {
                        const isSelected = w.full ? page?.fullWidth : (page?.pageWidth || "standard") === w.id && !page?.fullWidth;
                        return (
                          <motion.button
                            key={w.id}
                            whileHover={{ scale: 1.02, y: -1 }}
                            whileTap={{ scale: 0.97 }}
                            transition={{ type: "spring", stiffness: 450, damping: 26 }}
                            onClick={() => {
                              if (w.full) {
                                onPagePatch?.({ fullWidth: true });
                              } else {
                                onPagePatch?.({ fullWidth: false, pageWidth: w.id });
                              }
                              onToast?.(`Page width: ${w.label}`);
                            }}
                            className={`p-3 rounded-2xl border text-left transition-shadow cursor-pointer select-none ${isSelected
                              ? "border-[#0066FF] dark:border-[#4791FF] bg-[var(--surface-1)] ring-2 ring-[#0066FF]/20 shadow-xs"
                              : "border-black/[0.08] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.03] hover:bg-[var(--surface-1)] hover:border-black/[0.15] dark:hover:border-white/[0.2]"
                              }`}
                          >
                            <div className="text-xs font-bold text-[var(--text)] tracking-tight">{w.label}</div>
                            <div className="text-[10px] text-[var(--muted)] mt-0.5 leading-snug">{w.desc}</div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </section>

                  {/* Micro Text & Spacing Toggles */}
                  <section className="space-y-2.5 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--muted)]">Reading Controls</span>

                    {/* Small Text Switch */}
                    <div className="flex items-center justify-between p-3 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.03]">
                      <div>
                        <div className="text-xs font-semibold text-[var(--text)]">Small Text Mode</div>
                        <div className="text-[10px] text-[var(--muted)]">Compact font scale for dense documentation</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onPagePatch?.({ smallText: !page?.smallText })}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${page?.smallText ? "bg-[#34C759] dark:bg-[#30D158]" : "bg-black/15 dark:bg-white/20"
                          }`}
                      >
                        <motion.span
                          layout
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className={`inline-block size-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] ${page?.smallText ? "translate-x-5" : "translate-x-0"
                            }`}
                        />
                      </button>
                    </div>

                    {/* Lock Page Switch */}
                    <div className="flex items-center justify-between p-3 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.03]">
                      <div>
                        <div className="text-xs font-semibold text-[var(--text)]">Lock Page</div>
                        <div className="text-[10px] text-[var(--muted)]">Prevent accidental block edits or reordering</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onPagePatch?.({ isLocked: !page?.isLocked })}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${page?.isLocked ? "bg-[#0066FF] dark:bg-[#4791FF]" : "bg-black/15 dark:bg-white/20"
                          }`}
                      >
                        <motion.span
                          layout
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className={`inline-block size-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] ${page?.isLocked ? "translate-x-5" : "translate-x-0"
                            }`}
                        />
                      </button>
                    </div>

                    {/* Topbar Calendar Switch */}
                    <div className="flex items-center justify-between p-3 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.03]">
                      <div>
                        <div className="text-xs font-semibold text-[var(--text)] flex items-center gap-1.5">
                          <Calendar size={13} className="text-[#0066FF]" />
                          <span>Add to Calendar in Topbar</span>
                        </div>
                        <div className="text-[10px] text-[var(--muted)]">Show quick calendar sync icon in workspace topbar</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = toggleCalendarTopbar();
                          onToast?.(next ? "Calendar icon enabled in topbar" : "Calendar icon hidden from topbar");
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${calendarTopbarEnabled ? "bg-[#0066FF] dark:bg-[#4791FF]" : "bg-black/15 dark:bg-white/20"
                          }`}
                      >
                        <motion.span
                          layout
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className={`inline-block size-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] ${calendarTopbarEnabled ? "translate-x-5" : "translate-x-0"
                            }`}
                        />
                      </button>
                    </div>

                    {/* Auto-Show Pages Switch */}
                    <div className="flex items-center justify-between p-3 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.03]">
                      <div>
                        <div className="text-xs font-semibold text-[var(--text)] flex items-center gap-1.5">
                          <FileText size={13} className="text-[#34C759]" />
                          <span>Auto-Show Pages in Calendar</span>
                        </div>
                        <div className="text-[10px] text-[var(--muted)]">Automatically include newly created workspace pages in timetable</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = toggleAutoPages();
                          onToast?.(next ? "Auto-show created pages enabled" : "Auto-show created pages disabled");
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${autoPagesEnabled ? "bg-[#34C759] dark:bg-[#30D158]" : "bg-black/15 dark:bg-white/20"
                          }`}
                      >
                        <motion.span
                          layout
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className={`inline-block size-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] ${autoPagesEnabled ? "translate-x-5" : "translate-x-0"
                            }`}
                        />
                      </button>
                    </div>
                  </section>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════
                  TAB 4: COVER & HEIGHT
                 ═══════════════════════════════════════════════════════════ */}
              {tab === "cover" && (
                <div className="space-y-5">
                  {/* Cover Height Selector - Apple Segmented Control */}
                  <section className="space-y-2">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--muted)]">Cover Banner Height</span>
                    <div className="relative grid grid-cols-4 p-1 rounded-[14px] bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.06] gap-1 select-none">
                      {[
                        { id: 140, label: "Compact" },
                        { id: 200, label: "Standard" },
                        { id: 280, label: "Medium" },
                        { id: 380, label: "Hero" }
                      ].map((h) => {
                        const isSelected = (page?.coverHeight || 160) === h.id || ((page?.coverHeight || 160) < 170 && h.id === 140);
                        return (
                          <motion.button
                            key={h.id}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              onPagePatch?.({ coverHeight: h.id });
                              onToast?.(`Cover height: ${h.label} (${h.id}px)`);
                            }}
                            className={`relative z-10 py-1.5 px-1 rounded-[10px] text-[11px] font-medium transition-colors duration-150 cursor-pointer select-none text-center ${isSelected
                              ? "text-neutral-900 dark:text-white font-semibold"
                              : "text-[var(--muted)] hover:text-neutral-900 dark:hover:text-white"
                              }`}
                          >
                            {isSelected && (
                              <motion.div
                                layoutId="active-cover-height"
                                className="absolute inset-0 bg-white dark:bg-[#23252c] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.1),0_0_0_0.5px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,1)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.16)] -z-10"
                                transition={{ type: "spring", stiffness: 480, damping: 34, mass: 0.6 }}
                              />
                            )}
                            <span className="leading-none">{h.label}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </section>

                  {/* Cover Category Selector - Apple Capsule Pills */}
                  <section className="space-y-3 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--muted)]">Cover Categories</span>
                      {page?.cover && (
                        <button
                          onClick={() => {
                            onPagePatch?.({ cover: null });
                            onToast?.("Cover removed");
                          }}
                          className="text-[10.5px] text-rose-500 hover:text-rose-600 hover:underline cursor-pointer font-medium transition-colors"
                        >
                          Remove Cover
                        </button>
                      )}
                    </div>

                    <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
                      {COVER_CATEGORIES.map((cat) => {
                        const isSelected = coverCategory === cat.id;
                        const displayLabel = cat.id === "photos" ? "Photos" : cat.id === "solids" ? "Colors" : cat.label;
                        return (
                          <motion.button
                            key={cat.id}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setCoverCategory(cat.id)}
                            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all shrink-0 cursor-pointer select-none ${isSelected
                              ? "bg-[#0066FF] text-white font-semibold shadow-[0_2px_8px_rgba(0,102,255,0.3)]"
                              : "bg-black/[0.04] dark:bg-white/[0.06] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/[0.08] dark:hover:bg-white/[0.1]"
                              }`}
                          >
                            {displayLabel}
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Cinematic Squircle Cover Preview Tiles */}
                    <div className="grid grid-cols-2 gap-2.5 max-h-[250px] overflow-y-auto scrollbar-thin p-1">
                      {currentCoverList.map((c) => {
                        const isSelected = page?.cover === c.value;
                        const isImageUrl = c.value.startsWith("http") || c.value.startsWith("data:image");
                        return (
                          <motion.button
                            key={c.id}
                            whileHover={{ scale: 1.03, y: -2 }}
                            whileTap={{ scale: 0.96 }}
                            transition={{ type: "spring", stiffness: 450, damping: 26 }}
                            onClick={() => {
                              onPagePatch?.({ cover: c.value });
                              onToast?.(`Applied ${c.label} cover`);
                            }}
                            className={`group relative flex flex-col rounded-2xl overflow-hidden border transition-all cursor-pointer select-none ${isSelected
                              ? "border-[#0066FF] dark:border-[#4791FF] ring-2 ring-[#0066FF]/30 dark:ring-[#4791FF]/40 shadow-[0_4px_16px_rgba(0,102,255,0.25)]"
                              : "border-black/10 dark:border-white/10 hover:border-black/25 dark:hover:border-white/30 hover:shadow-md"
                              }`}
                          >
                            <div
                              className="w-full h-16 rounded-t-[14px] bg-neutral-900 overflow-hidden relative transition-transform duration-300 group-hover:scale-105"
                              style={isImageUrl ? { backgroundImage: `url(${c.value})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: c.value }}
                            >
                              {isSelected && (
                                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#0066FF] dark:bg-[#4791FF] text-white flex items-center justify-center shadow-md">
                                  <Check size={11} strokeWidth={3} />
                                </div>
                              )}
                            </div>
                            <div className="w-full bg-white/95 dark:bg-[#1a1b20]/95 py-1.5 px-2 text-center border-t border-black/[0.04] dark:border-white/[0.06]">
                              <span className="text-[10px] font-medium text-neutral-700 dark:text-neutral-300 truncate block w-full group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">
                                {c.label}
                              </span>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </section>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════
                  TAB 5: PAGE ICONS
                 ═══════════════════════════════════════════════════════════ */}
              {tab === "icon" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--muted)]">Choose Icon</span>
                    {page?.icon && (
                      <button
                        onClick={() => {
                          onPagePatch?.({ icon: null });
                          onToast?.("Icon removed");
                        }}
                        className="text-[10px] text-rose-500 hover:underline cursor-pointer font-medium"
                      >
                        Remove Icon
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-6 gap-2 p-1">
                    {[
                      "📝", "💡", "🚀", "🎯", "⭐", "❤️", "🎨", "📊",
                      "📚", "🎵", "🎬", "🏠", "📁", "🖥️", "📱", "🌍",
                      "🔬", "💻", "🎮", "📸", "✈️", "🏖️", "🌺", "🧠",
                      "🎪", "🎭", "🏆", "📌", "🔖", "🧩", "🎲", "💎",
                      "🔮", "⚡", "✨", "🔥", "🌿", "☕", "🪐", "🛡️"
                    ].map((emoji) => {
                      const isSelected = page?.icon === emoji;
                      return (
                        <motion.button
                          key={emoji}
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.90 }}
                          onClick={() => {
                            onPagePatch?.({ icon: emoji });
                            onToast?.(`Icon changed to ${emoji}`);
                          }}
                          className={`h-11 flex items-center justify-center rounded-2xl border text-xl cursor-pointer transition select-none ${isSelected
                            ? "border-[#0066FF] bg-[#0066FF]/15 ring-2 ring-[#0066FF]/30 scale-105"
                            : "border-black/[0.08] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/5 dark:hover:bg-white/10"
                            }`}
                        >
                          {emoji}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Footer */}
            <div className="border-t border-black/[0.06] dark:border-white/[0.08] bg-black/[0.015] dark:bg-white/[0.02] px-4 py-2.5 text-[10.5px] text-[var(--muted)] flex items-center justify-between">
              <span>Changes auto-save immediately</span>
              <kbd className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/15 text-[9px] font-mono">
                esc to close
              </kbd>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
