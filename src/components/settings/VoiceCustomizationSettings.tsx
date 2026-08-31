"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Sliders,
  Check,
  ChevronDown,
  Volume2,
  Sparkles,
  Layers,
  Wand2,
  Palette,
  Play,
  RotateCcw,
  AudioLines,
  Save,
  CheckCircle2,
  Radio,
  Eye,
  Activity,
  Zap,
  Tag,
  Globe,
  ChevronUp,
  Rewind,
} from "lucide-react";
import { cn } from "../../lib/utils";
import {
  useVoiceSettings,
  PillTheme,
  BarColor,
  TimerTheme,
  WaveformStyle,
  SquircleStyle,
  FloatingPosition,
  SoundProfile,
  AccessoryStyle,
  DEFAULT_VOICE_SETTINGS,
  playVoiceChime,
  setVoiceSettings,
} from "../../lib/voice/voice-settings";
import { RealtimeEqualizer, StreamingWordText, ActivityRing } from "../ui/voice-input";
import { useVoiceController, globalVoiceController } from "../../lib/voice/voice-controller";
import ElevenLabsVoiceSettings from "./ElevenLabsVoiceSettings";
import WhereYourDataGoesModal from "../voice/WhereYourDataGoesModal";
import VoiceTelemetryModal from "../voice/VoiceTelemetryModal";
import { getVoiceSnippets, saveVoiceSnippets, type VoiceSnippet, DEFAULT_VOICE_SNIPPETS } from "../../lib/voice/snippet-engine";
import { ShieldCheck, RotateCcw as RewindIcon, Lock, Plus, Trash2, Server } from "lucide-react";

const THEMES: { id: PillTheme; label: string; bg: string; border: string; glow: string; desc: string }[] = [
  {
    id: "dynamic_island",
    label: "Dynamic Island Glossy",
    bg: "bg-[#0a0a0c]/95 backdrop-blur-2xl",
    border: "border-white/[0.18]",
    glow: "shadow-[0_16px_48px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-1px_1px_rgba(0,0,0,0.5)]",
    desc: "Apple Dynamic Island jet-black glossy capsule with specular highlight",
  },
  {
    id: "dynamic_island_pro",
    label: "Dynamic Island Pro",
    bg: "bg-black/95 backdrop-blur-3xl",
    border: "border-white/20",
    glow: "shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.5)] ring-1 ring-white/10",
    desc: "Pro capsule with animated circular activity gauge ring",
  },
  {
    id: "dark_charcoal",
    label: "Wispr Charcoal",
    bg: "bg-[#141416]/95",
    border: "border-white/15",
    glow: "shadow-[0_6px_28px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.1)]",
    desc: "Sleek matte dark capsule with glowing squircle",
  },
  {
    id: "apple_vision_glass",
    label: "Apple Vision Glass",
    bg: "bg-black/60 backdrop-blur-2xl",
    border: "border-white/25",
    glow: "shadow-[0_12px_40px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.4)]",
    desc: "VisionOS frosted translucent glass with luminous rim",
  },
  {
    id: "space_black",
    label: "Space Black Glass",
    bg: "bg-[#09090b]/90 backdrop-blur-xl",
    border: "border-white/15",
    glow: "shadow-[0_10px_36px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.15)]",
    desc: "macOS Tahoe deep obsidian glass",
  },
  {
    id: "siri_orb_aura",
    label: "Siri Hologram Aura",
    bg: "bg-gradient-to-r from-indigo-950/90 via-purple-950/90 to-slate-950/90 backdrop-blur-2xl",
    border: "border-purple-400/40",
    glow: "shadow-[0_0_35px_rgba(168,85,247,0.35),0_12px_40px_rgba(0,0,0,0.8)]",
    desc: "Deep cosmic gradient with breathing multi-color aura",
  },
  {
    id: "frosted_pearl",
    label: "Frosted Pearl",
    bg: "bg-white/15 backdrop-blur-2xl",
    border: "border-white/40",
    glow: "shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.6)]",
    desc: "Ethereal iridescent light glass",
  },
  {
    id: "cyber_azure",
    label: "Cyber Azure",
    bg: "bg-[#091124]/90 backdrop-blur-xl",
    border: "border-sky-400/40",
    glow: "shadow-[0_0_25px_rgba(14,165,233,0.35),0_8px_32px_rgba(0,0,0,0.8)]",
    desc: "Deep navy glass with electric cyan aura",
  },
  {
    id: "minimal_stealth",
    label: "Minimal Stealth",
    bg: "bg-black/90 backdrop-blur-md",
    border: "border-white/10",
    glow: "shadow-[0_4px_20px_rgba(0,0,0,0.6)]",
    desc: "Ultra-compact matte stealth capsule",
  },
];

const SHORTCUT_OPTIONS = [
  "Ctrl+Shift+Space",
  "Alt+Space",
  "Ctrl+Shift+V",
  "Ctrl+Win",
  "Alt+Shift+Space",
];

const WAVEFORM_STYLES: { id: WaveformStyle; label: string; desc: string }[] = [
  { id: "dynamic_dots", label: "12 Dynamic Dots", desc: "Apple Voice Memo bouncing dot array" },
  { id: "formant_13", label: "13-Bar Formant Wave", desc: "Classic responsive audio bars" },
  { id: "dense_24", label: "24-Bar Studio Spectrum", desc: "High density professional equalizer" },
  { id: "minimal_pulse", label: "3-Orb Siri Pulse", desc: "Subtle micro-orb breathing rhythm" },
];

const ACCESSORY_STYLES: { id: AccessoryStyle; label: string; desc: string }[] = [
  { id: "agent_pill", label: "Agent Mode Pill", desc: "Green/Grey toggle pill for AI agent controls" },
  { id: "activity_ring", label: "Dynamic Activity Ring", desc: "Circular animated status gauge (Image 3)" },
];

const SQUIRCLE_STYLES: { id: SquircleStyle; label: string }[] = [
  { id: "apple_glow", label: "Apple Pure White Glow" },
  { id: "ruby_studio", label: "Ruby Studio Red" },
  { id: "emerald_active", label: "Emerald Active Green" },
  { id: "siri_gradient", label: "Siri Multi-Color Gradient" },
  { id: "cyber_neon", label: "Cyber Neon Cyan" },
  { id: "titanium_frosted", label: "Titanium Frosted" },
];

const BAR_COLORS: { id: BarColor; label: string; bgClass: string }[] = [
  { id: "white", label: "Pure White", bgClass: "bg-white" },
  { id: "cyan", label: "Electric Cyan", bgClass: "bg-sky-400" },
  { id: "violet", label: "Neon Violet", bgClass: "bg-purple-400" },
  { id: "amber", label: "Amber Gold", bgClass: "bg-amber-400" },
  { id: "emerald", label: "Emerald Glow", bgClass: "bg-emerald-400" },
  { id: "orange_flame", label: "Orange Flame", bgClass: "bg-amber-500" },
  { id: "gradient", label: "Sunset Glow", bgClass: "bg-gradient-to-t from-pink-500 to-amber-300" },
  { id: "rainbow", label: "Prism Rainbow", bgClass: "bg-gradient-to-r from-sky-400 via-emerald-300 to-amber-300" },
];

const TIMER_THEMES: { id: TimerTheme; label: string }[] = [
  { id: "dual_tone", label: "Apple San Francisco Dual Tone" },
  { id: "cyan_gold", label: "Cyan & Gold" },
  { id: "monochrome", label: "San Francisco Mono" },
  { id: "sunset", label: "Sunset Rose" },
  { id: "neon_green", label: "Neon Green" },
];

const LANGUAGES = [
  { code: "en-US", name: "English (United States)" },
  { code: "en-GB", name: "English (United Kingdom)" },
  { code: "es-ES", name: "Spanish (Español)" },
  { code: "fr-FR", name: "French (Français)" },
  { code: "de-DE", name: "German (Deutsch)" },
  { code: "hi-IN", name: "Hindi · Hinglish (हिन्दी)" },
  { code: "ja-JP", name: "Japanese (日本語)" },
  { code: "zh-CN", name: "Chinese (Mandarin)" },
];

export default function VoiceCustomizationSettings() {
  const { settings, update } = useVoiceSettings();
  const { isListening, time, toggle, stop } = useVoiceController();
  const [liveTranscript, setLiveTranscript] = useState("");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [previewAgentMode, setPreviewAgentMode] = useState(false);
  const [showDataFlowModal, setShowDataFlowModal] = useState(false);
  const [showTelemetryModal, setShowTelemetryModal] = useState(false);
  const [snippets, setSnippets] = useState<VoiceSnippet[]>(getVoiceSnippets);
  const [newSnippetTitle, setNewSnippetTitle] = useState("");
  const [newSnippetTrigger, setNewSnippetTrigger] = useState("");
  const [newSnippetTemplate, setNewSnippetTemplate] = useState("");
  const [showAddSnippet, setShowAddSnippet] = useState(false);

  useEffect(() => {
    const unsub = globalVoiceController.onTranscript((txt) => {
      setLiveTranscript(txt);
    });
    return unsub;
  }, []);

  const handleSave = () => {
    setVoiceSettings(settings);
    playVoiceChime("start");
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleResetDefaults = () => {
    update(DEFAULT_VOICE_SETTINGS);
    setVoiceSettings(DEFAULT_VOICE_SETTINGS);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const mins = Math.floor(time / 60).toString().padStart(2, "0");
  const secs = (time % 60).toString().padStart(2, "0");
  const currentTheme = THEMES.find((t) => t.id === settings.pillTheme) || THEMES[0];

  return (
    <div className="max-w-2xl space-y-6 text-[#1c1b18] pb-16 font-sans">
      {/* Title Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-[32px] font-normal tracking-tight font-serif text-[#1c1b18]">
            Voice & Dictation
          </h1>
          <p className="text-xs text-[#706c64] mt-0.5">
            Customize Dynamic Island capsule themes, waveform visualizers, squircle buttons, and accessory indicators.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#ede8df] hover:bg-[#e4ded3] text-xs font-semibold text-[#4a4742] transition cursor-pointer"
            title="Reset to default settings"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#1c1b18] hover:bg-black text-white text-xs font-semibold shadow-sm transition cursor-pointer"
          >
            {savedSuccess ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Save size={13} />}
            <span>{savedSuccess ? "Saved" : "Save"}</span>
          </button>
        </div>
      </div>

      {/* Live Sandbox Card */}
      <div className="rounded-2xl bg-[#f8f6f0] p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs text-[#706c64]">
          <span className="font-semibold flex items-center gap-1.5">
            <Sparkles size={13} className="text-[#a8824b]" /> Live Interactive Preview
          </span>
          <span className="text-[11px] font-medium">
            {isListening ? (
              <span className="text-rose-600 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                Live Mic Recording...
              </span>
            ) : (
              "Click capsule to test real-time dictation"
            )}
          </span>
        </div>

        {/* Live Interactive Preview Box */}
        <div className="flex flex-col items-center justify-center py-8 bg-[#f4efe6] dark:bg-[#181b24] rounded-2xl border border-[#e8e4db] dark:border-white/10 relative overflow-hidden shadow-inner select-none">
          {/* Active Liquid Glass / Dynamic Island 3-Piece Layout */}
          <div className="flex items-center gap-1.5">
            {/* Standalone Left Language Island Button */}
            <div className="relative h-7.5 px-2 rounded-full flex items-center justify-center gap-1.5 border bg-[#09090b]/98 border-white/20 text-white/90 shadow-xl backdrop-blur-3xl shrink-0 select-none overflow-hidden">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[45%] rounded-full bg-gradient-to-b from-white/25 via-white/5 to-transparent" />
              <ChevronUp size={10} className="stroke-[2.5] text-white/70 relative z-10" />
              <div className="w-[1px] h-2 bg-white/20 relative z-10" />
              <Globe size={11} className="text-white/85 relative z-10" />
            </div>

            {/* Main Center Capsule */}
            <motion.div
              layout
              onClick={(e) => {
                e.preventDefault();
                if (isListening) {
                  globalVoiceController.stop();
                  stop();
                } else {
                  toggle();
                }
              }}
              whileHover={{ scale: 1.03, y: -0.5 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 450, damping: 25 }}
              className={cn(
                "relative inline-flex items-center h-7.5 px-2.5 rounded-full border text-white gap-2.5 select-none cursor-pointer transition-all duration-300 shadow-2xl backdrop-blur-3xl overflow-hidden",
                currentTheme.bg,
                currentTheme.border,
                currentTheme.glow
              )}
            >
              {/* Specular Liquid Gloss Top Sheen */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[48%] rounded-full bg-gradient-to-b from-white/30 via-white/10 to-transparent" />

              {/* Ambient Breathing Pulse Glow */}
              <motion.div
                animate={{
                  opacity: isListening ? [0.2, 0.45, 0.2] : [0.1, 0.2, 0.1],
                  scale: [0.98, 1.02, 0.98],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-sky-500/10 via-emerald-500/15 to-purple-500/10"
              />

              {/* Action Button / Squircle with Selected Glow */}
              <motion.div
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.88 }}
                className={cn(
                  "w-3.5 h-3.5 rounded-[3.5px] flex-shrink-0 cursor-pointer transition-all relative flex items-center justify-center z-10",
                  settings.squircleStyle === "ruby_studio"
                    ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.85)]"
                    : settings.squircleStyle === "emerald_active"
                    ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.85)]"
                    : settings.squircleStyle === "siri_gradient"
                    ? "bg-gradient-to-tr from-pink-500 via-purple-400 to-cyan-300 shadow-[0_0_10px_rgba(168,85,247,0.7)]"
                    : settings.squircleStyle === "cyber_neon"
                    ? "bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.9)]"
                    : settings.squircleStyle === "titanium_frosted"
                    ? "bg-zinc-200 border border-white/60 shadow-[0_0_6px_rgba(255,255,255,0.4)]"
                    : "bg-white shadow-[0_0_10px_rgba(255,255,255,0.9),0_0_20px_rgba(255,255,255,0.4)]"
                )}
                aria-label={isListening ? "Stop voice recording" : "Start voice recording"}
              >
                <span className="w-1.5 h-1.5 rounded-[1px] bg-black/60" />
              </motion.div>

              {/* Waveform Equalizer / Dynamic Dots */}
              <div className="relative z-10 flex items-center">
                <RealtimeEqualizer
                  isListening={isListening || true}
                  barColor={settings.barColor}
                  styleOverride={settings.waveformStyle}
                />
              </div>

              {/* Timer Display */}
              <div className="relative z-10 flex items-center font-mono text-[11.5px] font-bold tracking-wider select-none leading-none">
                {settings.timerTheme === "cyan_gold" && (
                  <>
                    <span className="text-sky-300">{isListening ? mins : "00"}</span>
                    <span className="text-white/30 px-[1px]">:</span>
                    <span className="text-amber-300">{isListening ? secs : "03"}</span>
                  </>
                )}
                {settings.timerTheme === "monochrome" && (
                  <span className="text-white">{isListening ? `${mins}:${secs}` : "00:03"}</span>
                )}
                {settings.timerTheme === "sunset" && (
                  <>
                    <span className="text-rose-400">{isListening ? mins : "00"}</span>
                    <span className="text-white/30 px-[1px]">:</span>
                    <span className="text-orange-300">{isListening ? secs : "03"}</span>
                  </>
                )}
                {settings.timerTheme === "neon_green" && (
                  <>
                    <span className="text-emerald-400">{isListening ? mins : "00"}</span>
                    <span className="text-white/30 px-[1px]">:</span>
                    <span className="text-emerald-300">{isListening ? secs : "03"}</span>
                  </>
                )}
                {(settings.timerTheme === "dual_tone" || !settings.timerTheme) && (
                  <span className="text-white font-mono font-bold tracking-wider">
                    {isListening ? `${mins}:${secs}` : "00:03"}
                  </span>
                )}
              </div>
            </motion.div>

            {/* Standalone Circular Dynamic Island Agent Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewAgentMode((v) => !v);
              }}
              className={cn(
                "relative w-7.5 h-7.5 rounded-full flex items-center justify-center border cursor-pointer transition-all shadow-xl backdrop-blur-3xl shrink-0 overflow-hidden",
                previewAgentMode
                  ? "bg-[#09090b]/98 border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.45)] ring-1 ring-emerald-400/40"
                  : "bg-[#09090b]/98 border-white/20 shadow-[0_6px_24px_rgba(0,0,0,0.85)]"
              )}
              title={previewAgentMode ? "Agent Mode: ON (Click to toggle)" : "Agent Mode: OFF (Click to toggle)"}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[45%] rounded-full bg-gradient-to-b from-white/25 via-white/5 to-transparent" />
              <div className="relative z-10">
                <ActivityRing
                  isListening={isListening}
                  color={previewAgentMode ? "#10b981" : "#f59e0b"}
                  agentMode={previewAgentMode}
                />
              </div>
            </button>
          </div>

          {/* Real-Time Live Transcript Preview */}
          <div className="mt-3 text-xs text-[#1c1b18] dark:text-white/80 font-medium min-h-5 max-w-md text-center px-4 flex items-center justify-center">
            {isListening ? (
              liveTranscript ? (
                <StreamingWordText text={liveTranscript} isListening={isListening} />
              ) : (
                <span className="text-rose-600 font-semibold animate-pulse">
                  Listening... speak clearly into your mic
                </span>
              )
            ) : (
              <span className="text-[#8c887f] dark:text-white/50">
                Click capsule above to test dictation & microphone
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Settings Accordion */}
      <div className="rounded-2xl bg-[#f8f6f0] p-6 shadow-sm divide-y divide-[#e8e4db]">
        {/* 1. Capsule Theme Row with Visual Mini-Pills */}
        <div className="py-4 first:pt-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-[#1c1b18]">Capsule Theme</div>
              <div className="text-xs text-[#706c64] mt-0.5">
                {currentTheme.label} · {currentTheme.desc}
              </div>
            </div>
            <button
              onClick={() => setEditingField(editingField === "theme" ? null : "theme")}
              className="px-4 py-1.5 rounded-xl bg-[#ede8df] hover:bg-[#e4ded3] text-[#1c1b18] text-xs font-semibold transition cursor-pointer"
            >
              {editingField === "theme" ? "Done" : "Change"}
            </button>
          </div>

          {editingField === "theme" && (
            <div className="mt-3 pt-3 border-t border-[#e8e4db] grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {THEMES.map((th) => {
                const isSelected = settings.pillTheme === th.id;
                return (
                  <button
                    key={th.id}
                    onClick={() => update({ pillTheme: th.id })}
                    className={cn(
                      "p-3 rounded-2xl text-left transition-all cursor-pointer border relative overflow-hidden flex flex-col justify-between gap-3 shadow-xs",
                      isSelected
                        ? "bg-[#1c1b18] text-white border-black ring-2 ring-black/10 shadow-md"
                        : "bg-[#ede8df] text-[#4a4742] hover:bg-[#e4ded3] border-black/[0.04]"
                    )}
                  >
                    {/* Header: Title + Selected Check */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-bold tracking-tight">{th.label}</div>
                        <div className={cn("text-[10.5px] mt-0.5", isSelected ? "text-white/70" : "text-[#706c64]")}>
                          {th.desc}
                        </div>
                      </div>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center shrink-0 ml-1 shadow-sm">
                          <Check size={11} className="stroke-[3]" />
                        </span>
                      )}
                    </div>

                    {/* Mini Visual Capsule Swatch */}
                    <div className="w-full pt-2 border-t border-black/[0.06] flex items-center justify-center">
                      <div
                        className={cn(
                          "h-6 px-3 rounded-full flex items-center justify-between gap-2 border text-[10px] select-none shadow-sm transition-all",
                          th.bg,
                          th.border,
                          th.glow
                        )}
                      >
                        <span className="w-2.5 h-2.5 rounded-[2px] bg-white shadow-[0_0_6px_rgba(255,255,255,0.7)]" />
                        <div className="flex gap-0.5 items-center">
                          {[...Array(6)].map((_, i) => (
                            <span key={i} className="w-1 h-1 rounded-full bg-white/80" />
                          ))}
                        </div>
                        <span className="font-mono text-[9px] font-bold text-white/90">00:03</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Waveform Visualizer Style with Animated Previews */}
        <div className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-[#1c1b18]">Waveform & Visualizer</div>
              <div className="text-xs text-[#706c64] mt-0.5">
                {WAVEFORM_STYLES.find((w) => w.id === settings.waveformStyle)?.label} · {BAR_COLORS.find((b) => b.id === settings.barColor)?.label}
              </div>
            </div>
            <button
              onClick={() => setEditingField(editingField === "equalizer" ? null : "equalizer")}
              className="px-4 py-1.5 rounded-xl bg-[#ede8df] hover:bg-[#e4ded3] text-[#1c1b18] text-xs font-semibold transition cursor-pointer"
            >
              {editingField === "equalizer" ? "Done" : "Change"}
            </button>
          </div>

          {editingField === "equalizer" && (
            <div className="mt-3 pt-3 border-t border-[#e8e4db] space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {WAVEFORM_STYLES.map((ws) => {
                  const isSelected = settings.waveformStyle === ws.id;
                  return (
                    <button
                      key={ws.id}
                      onClick={() => update({ waveformStyle: ws.id })}
                      className={cn(
                        "p-3 rounded-2xl text-left transition-all cursor-pointer border flex flex-col justify-between gap-2.5",
                        isSelected
                          ? "bg-[#1c1b18] text-white border-black shadow-md"
                          : "bg-[#ede8df] text-[#4a4742] hover:bg-[#e4ded3] border-black/[0.04]"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-xs font-bold">{ws.label}</div>
                          <div className={cn("text-[10.5px] mt-0.5", isSelected ? "text-white/70" : "text-[#706c64]")}>
                            {ws.desc}
                          </div>
                        </div>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-white text-black flex items-center justify-center shrink-0 ml-1">
                            <Check size={10} className="stroke-[3]" />
                          </span>
                        )}
                      </div>

                      {/* Mini Equalizer Live Demo */}
                      <div className="h-6 px-3 py-1 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center">
                        <RealtimeEqualizer
                          isListening={true}
                          barColor={settings.barColor}
                          styleOverride={ws.id}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Color Palette with Swatches */}
              <div className="pt-2">
                <div className="text-[11px] font-bold text-[#706c64] uppercase mb-2">Color Palette</div>
                <div className="flex flex-wrap gap-2">
                  {BAR_COLORS.map((bc) => {
                    const isSelected = settings.barColor === bc.id;
                    return (
                      <button
                        key={bc.id}
                        onClick={() => update({ barColor: bc.id })}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border",
                          isSelected
                            ? "bg-[#1c1b18] text-white border-black shadow-sm"
                            : "bg-[#ede8df] text-[#4a4742] hover:bg-[#e4ded3] border-transparent"
                        )}
                      >
                        <span className={cn("w-3 h-3 rounded-full shadow-xs shrink-0", bc.bgClass)} />
                        <span>{bc.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Action Squircle Glow Style with Visual Buttons */}
        <div className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-[#1c1b18]">Action Button / Squircle</div>
              <div className="text-xs text-[#706c64] mt-0.5">
                {SQUIRCLE_STYLES.find((s) => s.id === settings.squircleStyle)?.label || "Apple Pure White Glow"}
              </div>
            </div>
            <button
              onClick={() => setEditingField(editingField === "squircle" ? null : "squircle")}
              className="px-4 py-1.5 rounded-xl bg-[#ede8df] hover:bg-[#e4ded3] text-[#1c1b18] text-xs font-semibold transition cursor-pointer"
            >
              {editingField === "squircle" ? "Done" : "Change"}
            </button>
          </div>

          {editingField === "squircle" && (
            <div className="mt-3 pt-3 border-t border-[#e8e4db] grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {SQUIRCLE_STYLES.map((sq) => {
                const isSelected = settings.squircleStyle === sq.id;
                return (
                  <button
                    key={sq.id}
                    onClick={() => update({ squircleStyle: sq.id })}
                    className={cn(
                      "p-3 rounded-2xl text-left text-xs font-semibold transition-all cursor-pointer border flex flex-col items-center justify-center gap-2",
                      isSelected
                        ? "bg-[#1c1b18] text-white border-black shadow-md"
                        : "bg-[#ede8df] text-[#4a4742] hover:bg-[#e4ded3] border-black/[0.04]"
                    )}
                  >
                    {/* Visual Squircle Preview Button */}
                    <div className="h-8 w-14 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center">
                      <div
                        className={cn(
                          "w-4 h-4 rounded-[4px] flex items-center justify-center transition-transform",
                          sq.id === "ruby_studio"
                            ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.85)]"
                            : sq.id === "emerald_active"
                            ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.85)]"
                            : sq.id === "siri_gradient"
                            ? "bg-gradient-to-tr from-pink-500 via-purple-400 to-cyan-300 shadow-[0_0_10px_rgba(168,85,247,0.7)]"
                            : sq.id === "cyber_neon"
                            ? "bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.9)]"
                            : sq.id === "titanium_frosted"
                            ? "bg-zinc-200 border border-white/60 shadow-[0_0_6px_rgba(255,255,255,0.4)]"
                            : "bg-white shadow-[0_0_10px_rgba(255,255,255,0.9),0_0_20px_rgba(255,255,255,0.4)]"
                        )}
                      >
                        <span className="w-1.5 h-1.5 rounded-[1px] bg-black/60" />
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-center">{sq.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. Timer Format Row with Digital Timer Previews */}
        <div className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-[#1c1b18]">Digital Timer Style</div>
              <div className="text-xs text-[#706c64] mt-0.5">
                {TIMER_THEMES.find((t) => t.id === settings.timerTheme)?.label}
              </div>
            </div>
            <button
              onClick={() => setEditingField(editingField === "timer" ? null : "timer")}
              className="px-4 py-1.5 rounded-xl bg-[#ede8df] hover:bg-[#e4ded3] text-[#1c1b18] text-xs font-semibold transition cursor-pointer"
            >
              {editingField === "timer" ? "Done" : "Change"}
            </button>
          </div>

          {editingField === "timer" && (
            <div className="mt-3 pt-3 border-t border-[#e8e4db] grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {TIMER_THEMES.map((tt) => {
                const isSelected = settings.timerTheme === tt.id;
                return (
                  <button
                    key={tt.id}
                    onClick={() => update({ timerTheme: tt.id })}
                    className={cn(
                      "p-3 rounded-2xl text-left transition-all cursor-pointer border flex items-center justify-between gap-3",
                      isSelected
                        ? "bg-[#1c1b18] text-white border-black shadow-md"
                        : "bg-[#ede8df] text-[#4a4742] hover:bg-[#e4ded3] border-black/[0.04]"
                    )}
                  >
                    <div>
                      <div className="text-xs font-bold">{tt.label}</div>
                      <div className={cn("text-[10px] mt-0.5", isSelected ? "text-white/70" : "text-[#706c64]")}>
                        Live timer typography format
                      </div>
                    </div>

                    {/* Mini Digital Timer Badge */}
                    <div className="px-2.5 py-1 rounded-lg bg-black/60 border border-white/10 font-mono text-[11px] font-bold shrink-0">
                      {tt.id === "cyan_gold" && (
                        <>
                          <span className="text-sky-300">00</span>
                          <span className="text-white/30 px-[1px]">:</span>
                          <span className="text-amber-300">03</span>
                        </>
                      )}
                      {tt.id === "monochrome" && <span className="text-white">00:03</span>}
                      {tt.id === "sunset" && (
                        <>
                          <span className="text-rose-400">00</span>
                          <span className="text-white/30 px-[1px]">:</span>
                          <span className="text-orange-300">03</span>
                        </>
                      )}
                      {tt.id === "neon_green" && (
                        <>
                          <span className="text-emerald-400">00</span>
                          <span className="text-white/30 px-[1px]">:</span>
                          <span className="text-emerald-300">03</span>
                        </>
                      )}
                      {(tt.id === "dual_tone" || !tt.id) && <span className="text-white">00:03</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 6. Shortcuts Row */}
        <div className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-[#1c1b18]">Global Hotkey Shortcut</div>
              <div className="text-xs text-[#706c64] mt-0.5">
                Press <span className="font-semibold text-[#1c1b18]">{settings.shortcut}</span> anywhere to activate.
              </div>
            </div>
            <button
              onClick={() => setEditingField(editingField === "shortcut" ? null : "shortcut")}
              className="px-4 py-1.5 rounded-xl bg-[#ede8df] hover:bg-[#e4ded3] text-[#1c1b18] text-xs font-semibold transition cursor-pointer"
            >
              {editingField === "shortcut" ? "Done" : "Change"}
            </button>
          </div>

          {editingField === "shortcut" && (
            <div className="mt-3 pt-3 border-t border-[#e8e4db] flex flex-wrap gap-2">
              {SHORTCUT_OPTIONS.map((sc) => (
                <button
                  key={sc}
                  onClick={() => update({ shortcut: sc })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    settings.shortcut === sc
                      ? "bg-[#1c1b18] text-white"
                      : "bg-[#ede8df] text-[#4a4742] hover:bg-[#e4ded3]"
                  }`}
                >
                  {sc}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 7. Dictation Languages */}
        <div className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-[#1c1b18]">Primary Language</div>
              <div className="text-xs text-[#706c64] mt-0.5">
                {LANGUAGES.find((l) => l.code === settings.language)?.name || "English"}
              </div>
            </div>

            <select
              value={settings.language}
              onChange={(e) => update({ language: e.target.value })}
              className="px-3 py-1.5 rounded-xl bg-[#ede8df] hover:bg-[#e4ded3] text-[#1c1b18] text-xs font-semibold outline-none cursor-pointer border-none"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 8. Smart Filler Word Cleaning */}
        <div className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-[#1c1b18]">Auto-Remove Filler Words</div>
              <div className="text-xs text-[#706c64] mt-0.5">
                Automatically eliminates "um", "uh", "like", and repeated stuttered words.
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.smartClean}
              onChange={(e) => update({ smartClean: e.target.checked })}
              className="h-4 w-4 rounded accent-[#1c1b18] cursor-pointer"
            />
          </div>
        </div>

        {/* 9. Rewind Voice Self-Correction */}
        <div className="py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-semibold text-[#1c1b18] flex items-center gap-1.5">
                <Rewind size={14} className="text-purple-600" />
                <span>Rewind (Hands-Free Voice Self-Correction)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold">
                  Noska Signature
                </span>
              </div>
              <div className="text-xs text-[#706c64]">
                Correct yourself inline by speaking: <em>"wait, I meant 4 PM"</em> or <em>"scratch that"</em> without touching mouse or keyboard.
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.rewindEnabled !== false}
              onChange={(e) => update({ rewindEnabled: e.target.checked })}
              className="h-4 w-4 rounded accent-purple-600 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
