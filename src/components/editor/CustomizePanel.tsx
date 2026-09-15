import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Type, Maximize2, Palette, Image, Lock, Eye, Sparkles,
  Sun, Moon, Monitor, ChevronDown, Check, Sliders, Layers,
  Compass, Laptop, Smartphone, BookOpen, FileText, Layout
} from "lucide-react";
import type { Page } from "../../lib/supabaseService";
import { COVER_CATEGORIES, getAllCovers } from "../../registry/covers/CoverRegistry";

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

interface CustomizePanelProps {
  open: boolean;
  onClose: () => void;
  page?: Page;
  onPagePatch?: (patch: Record<string, unknown>) => void;
  onToast?: (message: string) => void;
}

export default function CustomizePanel({ open, onClose, page, onPagePatch, onToast }: CustomizePanelProps) {
  const [tab, setTab] = useState<"theme" | "typography" | "layout" | "cover" | "icon">("theme");
  const [coverCategory, setCoverCategory] = useState<string>("gradients");

  if (!open) return null;

  const currentCoverList = COVER_CATEGORIES.find((c) => c.id === coverCategory)?.covers || [];

  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-xs" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, x: 380 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 380 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="fixed right-0 top-0 bottom-0 z-[101] w-[380px] max-w-[95vw] border-l border-[var(--border)] bg-[var(--elevated)] shadow-2xl flex flex-col overflow-hidden text-[var(--text)] font-sans"
          >
            {/* Top Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border)] bg-[var(--surface)]">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-[var(--accent)]/15 flex items-center justify-center text-[var(--accent)]">
                  <Palette size={14} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[var(--text)] tracking-tight">Customize Page</h3>
                  <p className="text-[10px] text-[var(--muted)] truncate">Themes, canvas physics, typography & covers</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="grid h-7 w-7 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="grid grid-cols-5 border-b border-[var(--border)] bg-[var(--surface)] p-1 gap-1">
              {[
                { id: "theme", label: "Theme", icon: Palette },
                { id: "typography", label: "Fonts", icon: Type },
                { id: "layout", label: "Layout", icon: Layout },
                { id: "cover", label: "Cover", icon: Image },
                { id: "icon", label: "Icon", icon: Sparkles },
              ].map((t) => {
                const isSelected = tab === t.id;
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id as typeof tab)}
                    className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                      isSelected
                        ? "bg-[var(--accent)]/15 text-[var(--accent)] shadow-2xs"
                        : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]"
                    }`}
                  >
                    <Icon size={13} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
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
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
                        <Sparkles size={12} className="text-[var(--accent)]" />
                        <span>Curated Mood Themes</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      {PAGE_THEME_PRESETS.map((preset) => {
                        const isSelected = (page?.pageBg ?? "") === preset.bg;
                        return (
                          <button
                            key={preset.id}
                            onClick={() => {
                              onPagePatch?.({ pageBg: preset.bg || null });
                              onToast?.(`Applied ${preset.name} page theme`);
                            }}
                            className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-2 cursor-pointer ${
                              isSelected
                                ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30 bg-[var(--surface)] shadow-xs"
                                : "border-[var(--border)] bg-[var(--surface)]/50 hover:border-[var(--secondary)]"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div
                                className="h-4.5 w-4.5 rounded-full border border-black/10 shadow-2xs shrink-0"
                                style={{ background: preset.previewGradient }}
                              />
                              {isSelected && <Check size={12} className="text-[var(--accent)]" />}
                            </div>
                            <div>
                              <div className="text-[11px] font-bold text-[var(--text)] truncate">{preset.name}</div>
                              <div className="text-[9.5px] text-[var(--muted)] line-clamp-2 mt-0.5 leading-snug">
                                {preset.description}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {/* Ambient Canvas Mesh Glows */}
                  <section className="space-y-3 pt-2 border-t border-[var(--border)]">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
                      <Layers size={12} className="text-[var(--accent)]" />
                      <span>Ambient Glow Overlays</span>
                    </span>

                    <div className="grid grid-cols-3 gap-2">
                      {AMBIENT_CANVAS_MESH.map((mesh) => {
                        const isSelected = (page?.pageMeshBg ?? null) === mesh.value;
                        return (
                          <button
                            key={mesh.label}
                            onClick={() => {
                              onPagePatch?.({ pageMeshBg: mesh.value });
                              onToast?.(`Updated canvas ambient glow`);
                            }}
                            className={`p-2 rounded-xl border text-left transition cursor-pointer flex flex-col items-center gap-1.5 ${
                              isSelected
                                ? "border-[var(--accent)] bg-[var(--surface)] ring-1 ring-[var(--accent)]/30 shadow-2xs"
                                : "border-[var(--border)] bg-[var(--surface)]/50 hover:border-[var(--secondary)]"
                            }`}
                          >
                            <div
                              className="h-7 w-full rounded-lg border border-[var(--border)] bg-neutral-900"
                              style={{ background: mesh.preview }}
                            />
                            <span className="text-[9.5px] font-medium text-[var(--muted)] truncate w-full text-center">
                              {mesh.label}
                            </span>
                          </button>
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
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Typeface Family</span>
                    <p className="text-[10px] text-[var(--muted)] mt-0.5">Select primary reading and editing typeface</p>
                  </div>

                  <div className="space-y-2">
                    {FONT_OPTIONS.map((f) => {
                      const isSelected = (page?.fontStyle || "default") === f.id;
                      return (
                        <button
                          key={f.id}
                          onClick={() => {
                            onPagePatch?.({ fontStyle: f.id });
                            onToast?.(`Font set to ${f.label}`);
                          }}
                          className={`w-full p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? "border-[var(--accent)] bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]/30"
                              : "border-[var(--border)] bg-[var(--surface)]/50 hover:border-[var(--secondary)]"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`text-xl font-bold w-7 text-center ${f.class}`}>
                              {f.preview}
                            </span>
                            <div>
                              <div className="text-xs font-bold text-[var(--text)]">{f.label}</div>
                              <div className="text-[10px] text-[var(--muted)]">{f.desc}</div>
                            </div>
                          </div>
                          {isSelected && <Check size={14} className="text-[var(--accent)] shrink-0" />}
                        </button>
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
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Canvas Max Width</span>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "standard", label: "Standard (720px)", desc: "Optimal reading column", full: false },
                        { id: "wide", label: "Wide (960px)", desc: "Expansive multi-column", full: false },
                        { id: "full", label: "Full Canvas (100%)", desc: "Edge-to-edge canvas", full: true },
                        { id: "compact", label: "Compact (580px)", desc: "Focused note column", full: false }
                      ].map((w) => {
                        const isSelected = w.full ? page?.fullWidth : (page?.pageWidth || "standard") === w.id && !page?.fullWidth;
                        return (
                          <button
                            key={w.id}
                            onClick={() => {
                              if (w.full) {
                                onPagePatch?.({ fullWidth: true });
                              } else {
                                onPagePatch?.({ fullWidth: false, pageWidth: w.id });
                              }
                              onToast?.(`Page width: ${w.label}`);
                            }}
                            className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                              isSelected
                                ? "border-[var(--accent)] bg-[var(--surface)] ring-1 ring-[var(--accent)]/30 shadow-xs"
                                : "border-[var(--border)] bg-[var(--surface)]/50 hover:border-[var(--secondary)]"
                            }`}
                          >
                            <div className="text-xs font-bold text-[var(--text)]">{w.label}</div>
                            <div className="text-[10px] text-[var(--muted)] mt-0.5">{w.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {/* Micro Text & Spacing Toggles */}
                  <section className="space-y-2.5 pt-2 border-t border-[var(--border)]">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Reading Controls</span>

                    <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]/50">
                      <div>
                        <div className="text-xs font-semibold text-[var(--text)]">Small Text Mode</div>
                        <div className="text-[10px] text-[var(--muted)]">Compact font scale for dense documentation</div>
                      </div>
                      <button
                        onClick={() => onPagePatch?.({ smallText: !page?.smallText })}
                        className={`relative h-4.5 w-8 rounded-full transition-colors cursor-pointer ${
                          page?.smallText ? "bg-[var(--accent)]" : "bg-[var(--border)]"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-xs transition-transform ${
                            page?.smallText ? "translate-x-4" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]/50">
                      <div>
                        <div className="text-xs font-semibold text-[var(--text)]">Lock Page</div>
                        <div className="text-[10px] text-[var(--muted)]">Prevent accidental block edits or reordering</div>
                      </div>
                      <button
                        onClick={() => onPagePatch?.({ isLocked: !page?.isLocked })}
                        className={`relative h-4.5 w-8 rounded-full transition-colors cursor-pointer ${
                          page?.isLocked ? "bg-[var(--accent)]" : "bg-[var(--border)]"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-xs transition-transform ${
                            page?.isLocked ? "translate-x-4" : "translate-x-0.5"
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
                  {/* Cover Height Selector */}
                  <section className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Cover Banner Height</span>
                    <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                      {[
                        { id: 140, label: "Compact" },
                        { id: 200, label: "Standard" },
                        { id: 280, label: "Medium" },
                        { id: 380, label: "Hero" }
                      ].map((h) => {
                        const isSelected = (page?.coverHeight || 160) === h.id || ((page?.coverHeight || 160) < 170 && h.id === 140);
                        return (
                          <button
                            key={h.id}
                            onClick={() => {
                              onPagePatch?.({ coverHeight: h.id });
                              onToast?.(`Cover height: ${h.label} (${h.id}px)`);
                            }}
                            className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer text-center ${
                              isSelected
                                ? "bg-[var(--accent)] text-white shadow-xs font-bold"
                                : "text-[var(--muted)] hover:text-[var(--text)]"
                            }`}
                          >
                            {h.label}
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {/* Cover Category Selector */}
                  <section className="space-y-3 pt-2 border-t border-[var(--border)]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Cover Categories</span>
                      {page?.cover && (
                        <button
                          onClick={() => {
                            onPagePatch?.({ cover: null });
                            onToast?.("Cover removed");
                          }}
                          className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                        >
                          Remove Cover
                        </button>
                      )}
                    </div>

                    <div className="flex gap-1 overflow-x-auto scrollbar-none pb-0.5">
                      {COVER_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setCoverCategory(cat.id)}
                          className={`px-2.5 py-1 text-[10.5px] rounded-lg transition shrink-0 cursor-pointer ${
                            coverCategory === cat.id
                              ? "bg-[var(--accent)]/15 text-[var(--accent)] font-bold shadow-2xs"
                              : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]"
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto scrollbar-thin p-0.5">
                      {currentCoverList.map((c) => {
                        const isSelected = page?.cover === c.value;
                        const isImageUrl = c.value.startsWith("http") || c.value.startsWith("data:image");
                        return (
                          <button
                            key={c.id}
                            onClick={() => {
                              onPagePatch?.({ cover: c.value });
                              onToast?.(`Applied ${c.label} cover`);
                            }}
                            className={`p-1.5 rounded-xl border text-left transition cursor-pointer flex flex-col gap-1 ${
                              isSelected
                                ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30 bg-[var(--surface)]"
                                : "border-[var(--border)] bg-[var(--surface)]/50 hover:border-[var(--secondary)]"
                            }`}
                          >
                            <div
                              className="w-full h-14 rounded-lg bg-neutral-900 overflow-hidden"
                              style={isImageUrl ? { backgroundImage: `url(${c.value})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: c.value }}
                            />
                            <span className="text-[9.5px] text-[var(--muted)] truncate px-0.5">{c.label}</span>
                          </button>
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
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Choose Icon</span>
                    {page?.icon && (
                      <button
                        onClick={() => {
                          onPagePatch?.({ icon: null });
                          onToast?.("Icon removed");
                        }}
                        className="text-[10px] text-rose-500 hover:underline cursor-pointer"
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
                        <button
                          key={emoji}
                          onClick={() => {
                            onPagePatch?.({ icon: emoji });
                            onToast?.(`Icon changed to ${emoji}`);
                          }}
                          className={`h-11 flex items-center justify-center rounded-xl border text-xl cursor-pointer transition ${
                            isSelected
                              ? "border-[var(--accent)] bg-[var(--accent)]/15 ring-2 ring-[var(--accent)]/30"
                              : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--hover)]"
                          }`}
                        >
                          {emoji}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Footer */}
            <div className="border-t border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[10.5px] text-[var(--muted)] flex items-center justify-between">
              <span>Changes auto-save immediately</span>
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--hover)] border border-[var(--border)] text-[9px] font-mono">
                esc to close
              </kbd>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
