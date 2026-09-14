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
  ShieldCheck,
  RotateCcw as RewindIcon,
  Lock,
  Plus,
  Trash2,
  Server,
  Cpu,
  HardDrive,
  Download,
  AlertCircle,
  RefreshCw,
  Flame,
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
  ModelTier,
  DEFAULT_VOICE_SETTINGS,
  playVoiceChime,
  setVoiceSettings,
} from "../../lib/voice/voice-settings";
import { RealtimeEqualizer, StreamingWordText, ActivityRing, AppleIntelligenceOrb } from "../ui/voice-input";
import { useVoiceController, globalVoiceController } from "../../lib/voice/voice-controller";
import { TauriWhisperEngine, type LocalModelStatus, type LocalCapability } from "../../lib/voice/tauri-whisper-engine";
import { isDesktop } from "../../lib/desktop/platform";
import ElevenLabsVoiceSettings from "./ElevenLabsVoiceSettings";
import WhereYourDataGoesModal from "../voice/WhereYourDataGoesModal";
import VoiceTelemetryModal from "../voice/VoiceTelemetryModal";
import { getVoiceSnippets, saveVoiceSnippets, type VoiceSnippet, DEFAULT_VOICE_SNIPPETS } from "../../lib/voice/snippet-engine";

const THEMES: { id: PillTheme; label: string; bg: string; border: string; glow: string; desc: string }[] = [
  {
    id: "apple_intelligence_orb",
    label: "Apple Intelligence Liquid Orb",
    bg: "bg-[#09090d]/98 backdrop-blur-3xl",
    border: "border-white/25",
    glow: "shadow-[0_20px_60px_rgba(0,0,0,0.95),inset_0_1.5px_2px_rgba(255,255,255,0.55),inset_0_-1.5px_2px_rgba(0,0,0,0.8)] ring-1 ring-white/15",
    desc: "Iridescent Siri liquid glass sphere with dual bottom control pods & refractive Fresnel highlight",
  },
  {
    id: "siri_glow_orb",
    label: "Siri iOS 18 Edge-Glow Ribbon",
    bg: "bg-[#050508]/98 backdrop-blur-3xl",
    border: "border-fuchsia-400/35",
    glow: "shadow-[0_0_35px_rgba(236,72,153,0.35),0_16px_50px_rgba(0,0,0,0.95),inset_0_1.5px_2px_rgba(255,255,255,0.6)] ring-1 ring-fuchsia-400/25",
    desc: "Dynamic rotating perimeter rainbow halo with spinning chromatic vortex filament",
  },
  {
    id: "vision_spatial_glass",
    label: "VisionOS Spatial Glass Orb",
    bg: "bg-white/[0.08] backdrop-blur-3xl",
    border: "border-white/40",
    glow: "shadow-[0_20px_60px_rgba(0,0,0,0.5),inset_0_2px_3px_rgba(255,255,255,0.7),inset_0_-2px_3px_rgba(255,255,255,0.15)] ring-1 ring-white/20",
    desc: "3D frosted holographic glass with ambient depth refraction and star-motes",
  },
  {
    id: "solar_ember_orb",
    label: "Solar Flare Nebula Orb",
    bg: "bg-[#140b08]/98 backdrop-blur-3xl",
    border: "border-amber-500/35",
    glow: "shadow-[0_0_35px_rgba(245,158,11,0.35),0_16px_50px_rgba(0,0,0,0.95),inset_0_1.5px_2px_rgba(255,255,255,0.55)] ring-1 ring-amber-500/25",
    desc: "Molten titanium sphere with breathing copper/gold solar flare and fiery core",
  },
  {
    id: "cyber_matrix_orb",
    label: "Cyber Azure Matrix Orb",
    bg: "bg-[#060e1c]/98 backdrop-blur-3xl",
    border: "border-sky-400/35",
    glow: "shadow-[0_0_35px_rgba(14,165,233,0.4),0_16px_50px_rgba(0,0,0,0.95),inset_0_1.5px_2px_rgba(255,255,255,0.55)] ring-1 ring-sky-400/25",
    desc: "Electric navy sphere with reactive frequency pulse rings and digital matrix",
  },
  {
    id: "dynamic_island",
    label: "Flow Pill Glossy",
    bg: "bg-[#0a0a0c]/95 backdrop-blur-2xl",
    border: "border-white/[0.18]",
    glow: "shadow-[0_16px_48px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-1px_1px_rgba(0,0,0,0.5)]",
    desc: "Flow Pill jet-black glossy capsule with specular highlight",
  },
  {
    id: "dynamic_island_pro",
    label: "Flow Pill Pro",
    bg: "bg-black/95 backdrop-blur-3xl",
    border: "border-white/20",
    glow: "shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.5)] ring-1 ring-white/10",
    desc: "Pro Flow Pill capsule with animated circular activity gauge ring",
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
  { id: "siri_aurora_ribbon", label: "Siri Aurora Iridescent Wave", desc: "Apple Intelligence chromatic fluid wave" },
  { id: "siri_ios18_glow", label: "iOS 18 Siri Perimeter Glow", desc: "Dual chromatic glowing audio bars" },
  { id: "chromatic_vortex", label: "Chromatic Spectrum Vortex", desc: "High-speed multi-hue frequency wave" },
  { id: "dynamic_dots", label: "6 Dynamic Dots", desc: "Apple Voice Memo bouncing dot array" },
  { id: "formant_13", label: "13-Bar Formant Wave", desc: "Classic responsive audio bars" },
  { id: "dense_24", label: "24-Bar Studio Spectrum", desc: "High density professional equalizer" },
  { id: "minimal_pulse", label: "3-Orb Siri Pulse", desc: "Subtle micro-orb breathing rhythm" },
];

const ACCESSORY_STYLES: { id: AccessoryStyle; label: string; desc: string }[] = [
  { id: "agent_pill", label: "Agent Mode Pill", desc: "Green/Grey toggle pill for AI agent controls" },
  { id: "activity_ring", label: "Dynamic Activity Ring", desc: "Circular animated status gauge" },
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
  { code: "auto", name: "Auto (Browser Language)" },
  { code: "en-US", name: "English (United States)" },
  { code: "en-GB", name: "English (United Kingdom)" },
  { code: "en-IN", name: "English (India)" },
  { code: "hinglish", name: "Hinglish (Hindi + English)" },
  { code: "hi-IN", name: "Hindi (हिंदी)" },
  { code: "es-ES", name: "Spanish (Español)" },
  { code: "fr-FR", name: "French (Français)" },
  { code: "de-DE", name: "German (Deutsch)" },
  { code: "ja-JP", name: "Japanese (日本語)" },
  { code: "zh-CN", name: "Mandarin (中文)" },
];

const ENGINE_OPTIONS: DropdownOption<ModelTier>[] = [
  {
    value: "auto",
    label: "Auto (Desktop: Local Whisper, Web: Cloud)",
    subtext: "Intelligently selects fastest local engine on desktop",
    badge: "Recommended",
  },
  {
    value: "always_local",
    label: "Always Local Whisper (100% Offline)",
    subtext: "Private on-device transcription with zero cloud egress",
    badge: "100% Private",
  },
  {
    value: "always_cloud",
    label: "Always Cloud Recognition",
    subtext: "Standard cloud speech-to-text API",
  },
];

interface DropdownOption<T extends string> {
  value: T;
  label: string;
  subtext?: string;
  badge?: string;
}

function CustomDropdown<T extends string>({
  value,
  onChange,
  options,
  minWidth = "320px",
}: {
  value: T;
  onChange: (val: T) => void;
  options: DropdownOption<T>[];
  minWidth?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border select-none",
          isOpen
            ? "bg-white text-[#1c1b18] border-[#1c1b18] shadow-md ring-2 ring-black/5"
            : "bg-[#ede8df] hover:bg-[#e4ded3] text-[#1c1b18] border-[#ded8cc] shadow-2xs"
        )}
      >
        <span className="truncate max-w-[240px] text-left">{selectedOption?.label}</span>
        <ChevronDown
          size={14}
          className={cn(
            "text-[#706c64] transition-transform duration-200 shrink-0",
            isOpen && "rotate-180 text-[#1c1b18]"
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            style={{ minWidth }}
            className="absolute right-0 mt-2 rounded-2xl bg-[#fbf9f5] dark:bg-[#1c1b18] border border-[#ded8cc] dark:border-white/10 shadow-[0_16px_36px_rgba(0,0,0,0.18)] p-1.5 z-50 overflow-hidden backdrop-blur-2xl"
          >
            <div className="max-h-64 overflow-y-auto space-y-1 overscroll-contain pr-0.5">
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs text-left transition cursor-pointer select-none",
                      isSelected
                        ? "bg-[#1c1b18] text-white font-bold shadow-xs"
                        : "text-[#2e2c29] hover:bg-[#ede8df] font-medium"
                    )}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span>{opt.label}</span>
                        {opt.badge && (
                          <span
                            className={cn(
                              "text-[9.5px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider",
                              isSelected
                                ? "bg-white/20 text-white"
                                : "bg-amber-100 text-amber-800"
                            )}
                          >
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.subtext && (
                        <span
                          className={cn(
                            "text-[10.5px] leading-tight mt-0.5 font-normal",
                            isSelected ? "text-white/70" : "text-[#706c64]"
                          )}
                        >
                          {opt.subtext}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-white text-black flex items-center justify-center shrink-0 ml-2 shadow-xs">
                        <Check size={10} className="stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const LANGUAGE_OPTIONS: DropdownOption<string>[] = LANGUAGES.map((l) => ({
  value: l.code,
  label: l.name,
  badge: l.code === "hinglish" ? "Fast & Smart" : undefined,
}));

export default function VoiceCustomizationSettings() {
  const { settings, update } = useVoiceSettings();
  const voiceController = useVoiceController() as any;
  const isListening = voiceController.isListening;
  const toggle = voiceController.toggle;
  const stop = voiceController.stop;
  const duration = voiceController.recordingDuration ?? voiceController.time ?? 0;

  const [localLiveTranscript, setLocalLiveTranscript] = useState("");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [previewAgentMode, setPreviewAgentMode] = useState(false);
  const [previewTranslateMode, setPreviewTranslateMode] = useState(false);
  const [snippets, setSnippets] = useState<VoiceSnippet[]>([]);
  const [newSnippetTitle, setNewSnippetTitle] = useState("");
  const [newSnippetTrigger, setNewSnippetTrigger] = useState("");
  const [newSnippetTemplate, setNewSnippetTemplate] = useState("");
  const [showAddSnippet, setShowAddSnippet] = useState(false);
  const [localModel, setLocalModel] = useState<LocalModelStatus | null>(null);
  const [installingModel, setInstallingModel] = useState(false);
  const [capability, setCapability] = useState<LocalCapability | null>(null);
  const [checkingCapability, setCheckingCapability] = useState(false);
  const [showDataAudit, setShowDataAudit] = useState(false);
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [activeSection, setActiveSection] = useState<"engine" | "visuals">("engine");

  useEffect(() => {
    setSnippets(getVoiceSnippets());
    if (isDesktop()) {
      void TauriWhisperEngine.modelStatus().then(setLocalModel).catch(() => setLocalModel(null));
      void TauriWhisperEngine.capabilityCheck().then(setCapability).catch(() => setCapability(null));
    }
  }, []);

  const handleInstallModel = async () => {
    setInstallingModel(true);
    try {
      const res = await TauriWhisperEngine.installModel();
      setLocalModel(res as any);
      const cap = await TauriWhisperEngine.capabilityCheck();
      setCapability(cap);
    } catch (e) {
      console.error(e);
    } finally {
      setInstallingModel(false);
    }
  };

  const handleCheckCapability = async () => {
    setCheckingCapability(true);
    try {
      const cap = await TauriWhisperEngine.capabilityCheck();
      setCapability(cap);
    } finally {
      setCheckingCapability(false);
    }
  };

  useEffect(() => {
    const unsub = globalVoiceController.onTranscript((txt) => {
      setLocalLiveTranscript(txt);
    });
    return unsub;
  }, []);

  const liveTranscript = voiceController.liveTranscript ?? localLiveTranscript;

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

  const mins = Math.floor(duration / 60).toString().padStart(2, "0");
  const secs = (duration % 60).toString().padStart(2, "0");
  const currentTheme = THEMES.find((t) => t.id === settings.pillTheme) || THEMES[0];

  return (
    <div className="max-w-4xl space-y-6 text-[#1c1b18] pb-16 font-sans">
      {/* Title Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-[32px] font-normal tracking-tight font-serif text-[#1c1b18]">
            Voice &amp; Dictation
          </h1>
          <p className="text-xs text-[#706c64] mt-0.5">
            Configure on-device speech models, language auto-detection, and customize the Flow Pill capsule.
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

      {/* Two Main Sections Segmented Switcher (Apple-Grade Spring Indicator) */}
      <div className="flex p-1.5 rounded-2xl bg-[#ede8df] border border-[#ded8cc] gap-1 select-none relative shadow-inner">
        <button
          type="button"
          onClick={() => setActiveSection("engine")}
          className={cn(
            "relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-colors duration-200 cursor-pointer z-10 select-none",
            activeSection === "engine" ? "text-white" : "text-[#706c64] hover:text-[#1c1b18]"
          )}
        >
          {activeSection === "engine" && (
            <motion.div
              layoutId="activeVoiceTabPill"
              transition={{ type: "spring", stiffness: 480, damping: 34 }}
              className="absolute inset-0 bg-[#1c1b18] rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.22)] z-[-1]"
            />
          )}
          <Cpu size={14} className={activeSection === "engine" ? "text-sky-300" : ""} />
          <span>Recognition &amp; Local Whisper</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("visuals")}
          className={cn(
            "relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-colors duration-200 cursor-pointer z-10 select-none",
            activeSection === "visuals" ? "text-white" : "text-[#706c64] hover:text-[#1c1b18]"
          )}
        >
          {activeSection === "visuals" && (
            <motion.div
              layoutId="activeVoiceTabPill"
              transition={{ type: "spring", stiffness: 480, damping: 34 }}
              className="absolute inset-0 bg-[#1c1b18] rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.22)] z-[-1]"
            />
          )}
          <Palette size={14} className={activeSection === "visuals" ? "text-purple-300" : ""} />
          <span>Flow Pill &amp; Appearance</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* SECTION 1: RECOGNITION & LOCAL WHISPER */}
        {activeSection === "engine" && (
          <motion.div
            key="section-engine"
            initial={{ opacity: 0, y: 8, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.995 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            <div className="rounded-2xl bg-[#f8f6f0] p-6 shadow-sm divide-y divide-[#e8e4db]">
              {/* 1. Speech Recognition Engine */}
              <div className="py-4 first:pt-0 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[#1c1b18] flex items-center gap-2">
                      <Cpu size={15} className="text-blue-600" />
                      <span>Speech Recognition Engine</span>
                    </div>
                    <div className="text-xs text-[#706c64] mt-0.5">
                      Choose between on-device Whisper inference or cloud speech recognition.
                    </div>
                  </div>

                  <div className="shrink-0">
                    <CustomDropdown
                      value={settings.modelTier || "auto"}
                      onChange={(val) => update({ modelTier: val })}
                      options={ENGINE_OPTIONS}
                      minWidth="320px"
                    />
                  </div>
                </div>

                {/* Local Whisper Model Card */}
                <div className="rounded-2xl bg-[#ede8df]/80 border border-[#ded8cc] p-4.5 space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#1c1b18] text-white flex items-center justify-center shadow-xs shrink-0">
                        <HardDrive size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#1c1b18]">On-Device Local Whisper Model</h4>
                        <p className="text-[11px] text-[#706c64] mt-0.5 leading-snug">
                          Multilingual GGML model for offline transcription &amp; Indian languages (Hindi, Hinglish).
                        </p>
                      </div>
                    </div>

                    {localModel?.installed ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300/60 px-3 py-1 rounded-full shadow-2xs shrink-0">
                        <CheckCircle2 size={12} className="text-emerald-600" />
                        <span>Ready (Offline)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-900 bg-amber-100/90 border border-amber-300/60 px-3 py-1 rounded-full shadow-2xs shrink-0">
                        <AlertCircle size={12} className="text-amber-700" />
                        <span>Not Installed</span>
                      </span>
                    )}
                  </div>

                  {localModel?.installed ? (
                    <div className="space-y-2 pt-1 border-t border-[#ded8cc]">
                      <div className="flex items-center justify-between text-[11.5px] text-[#55514b] bg-white/80 rounded-xl px-3.5 py-2.5 border border-white/60">
                        <span className="font-mono truncate max-w-[280px]" title={localModel.path}>
                          {localModel.path.split(/[\\/]/).pop() || "ggml-base.bin"}
                        </span>
                        <span className="font-semibold text-[#1c1b18]">
                          {localModel.bytes ? `${(localModel.bytes / (1024 * 1024)).toFixed(1)} MB` : "Ready"}
                        </span>
                      </div>

                      {capability && (
                        <div className="flex items-center justify-between text-[11.5px] text-[#55514b] bg-white/80 rounded-xl px-3.5 py-2.5 border border-white/60">
                          <span className="flex items-center gap-1.5">
                            <Zap size={13} className={capability.realtime ? "text-emerald-600" : "text-amber-600"} />
                            Real-time Benchmark
                          </span>
                          <span className="font-semibold text-[#1c1b18]">
                            {capability.elapsedMs ? `${capability.elapsedMs}ms` : "Real-time Ready"} · {capability.multilingual ? "Multilingual" : "English-only"}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={handleCheckCapability}
                          disabled={checkingCapability}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-[#faf8f5] text-[#4a4742] transition border border-[#ded8cc] cursor-pointer shadow-2xs"
                        >
                          <RefreshCw size={12} className={checkingCapability ? "animate-spin" : ""} />
                          <span>{checkingCapability ? "Testing…" : "Test Latency"}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-[#ded8cc] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <p className="text-xs text-[#706c64]">
                        Install <code className="font-mono text-[11px] bg-white/90 px-1.5 py-0.5 rounded border border-black/5 font-semibold text-[#1c1b18]">ggml-base.bin</code> (~140MB) for full offline dictation.
                      </p>
                      <button
                        onClick={handleInstallModel}
                        disabled={installingModel}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#1c1b18] hover:bg-black text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-60 shrink-0"
                      >
                        <Download size={14} className={installingModel ? "animate-bounce" : ""} />
                        <span>{installingModel ? "Downloading (~140MB)…" : "Install Local Model"}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Languages */}
              <div className="py-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[#1c1b18] flex items-center gap-2">
                      <Globe size={15} className="text-indigo-600" />
                      <span>Primary Spoken Language</span>
                    </div>
                    <div className="text-xs text-[#706c64] mt-0.5">
                      {LANGUAGES.find((l) => l.code === settings.language)?.name || "English (United States)"}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <CustomDropdown
                      value={settings.language || "en-US"}
                      onChange={(val) => update({ language: val })}
                      options={LANGUAGE_OPTIONS}
                      minWidth="280px"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Rewind Voice Self-Correction */}
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

              {/* 4. Smart Filler Word Cleaning */}
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

              {/* 5. Global Hotkey Shortcut */}
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

                <AnimatePresence>
                  {editingField === "shortcut" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 pt-3 border-t border-[#e8e4db] flex flex-wrap gap-2">
                        {SHORTCUT_OPTIONS.map((sc) => (
                          <button
                            key={sc}
                            onClick={() => update({ shortcut: sc })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${settings.shortcut === sc
                              ? "bg-[#1c1b18] text-white"
                              : "bg-[#ede8df] text-[#4a4742] hover:bg-[#e4ded3]"
                              }`}
                          >
                            {sc}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Voice Snippets & Vocabulary */}
            <div className="rounded-2xl bg-[#f8f6f0] p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#1c1b18] flex items-center gap-2">
                    <Tag size={15} className="text-amber-600" />
                    <span>Custom Voice Snippets &amp; Triggers</span>
                  </h3>
                  <p className="text-xs text-[#706c64] mt-0.5">
                    Expand spoken abbreviations into multi-line structured templates automatically.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddSnippet(!showAddSnippet)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#ede8df] hover:bg-[#e4ded3] text-xs font-semibold text-[#1c1b18] transition cursor-pointer border border-[#ded8cc]"
                >
                  <Plus size={13} />
                  <span>Add Snippet</span>
                </button>
              </div>

              {showAddSnippet && (
                <div className="p-4.5 rounded-2xl bg-[#ede8df]/80 border border-[#ded8cc] space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      placeholder="Snippet Title (e.g. Daily Standup)"
                      value={newSnippetTitle}
                      onChange={(e) => setNewSnippetTitle(e.target.value)}
                      className="px-3.5 py-2 rounded-xl bg-white text-xs text-[#1c1b18] outline-none border border-black/10 font-medium"
                    />
                    <input
                      placeholder="Trigger Phrases (comma-separated, e.g. standup, daily notes)"
                      value={newSnippetTrigger}
                      onChange={(e) => setNewSnippetTrigger(e.target.value)}
                      className="px-3.5 py-2 rounded-xl bg-white text-xs text-[#1c1b18] outline-none border border-black/10 font-medium"
                    />
                  </div>
                  <textarea
                    placeholder="Template replacement markdown..."
                    rows={3}
                    value={newSnippetTemplate}
                    onChange={(e) => setNewSnippetTemplate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white text-xs text-[#1c1b18] outline-none border border-black/10 font-mono"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => setShowAddSnippet(false)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#706c64] hover:text-[#1c1b18] transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (!newSnippetTitle || !newSnippetTrigger || !newSnippetTemplate) return;
                        const parsedTriggers = newSnippetTrigger
                          .split(",")
                          .map((t) => t.trim().toLowerCase())
                          .filter(Boolean);
                        const newSnip: VoiceSnippet = {
                          id: `snip-${Date.now()}`,
                          title: newSnippetTitle.trim(),
                          triggers: parsedTriggers.length > 0 ? parsedTriggers : [newSnippetTrigger.trim().toLowerCase()],
                          template: newSnippetTemplate.trim(),
                          category: "custom",
                          enabled: true,
                        };
                        const next = [...snippets, newSnip];
                        setSnippets(next);
                        saveVoiceSnippets(next);
                        setNewSnippetTitle("");
                        setNewSnippetTrigger("");
                        setNewSnippetTemplate("");
                        setShowAddSnippet(false);
                      }}
                      className="px-4 py-1.5 rounded-xl bg-[#1c1b18] hover:bg-black text-white text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      Save Snippet
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2.5">
                {snippets.map((snip) => (
                  <div key={snip.id} className="flex items-start justify-between p-3.5 rounded-xl bg-white/80 border border-black/[0.06] shadow-2xs hover:shadow-xs transition">
                    <div className="space-y-1 max-w-[85%]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[#1c1b18]">{snip.title}</span>
                        {snip.triggers && snip.triggers.length > 0 ? (
                          snip.triggers.map((trig, idx) => (
                            <span
                              key={idx}
                              className="text-[10.5px] font-mono px-2 py-0.5 rounded-md bg-amber-100/80 text-amber-900 border border-amber-300/40 font-semibold shadow-2xs"
                            >
                              "{trig}"
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-100 text-neutral-600">
                            {(snip as any).trigger ? `"${(snip as any).trigger}"` : "No trigger"}
                          </span>
                        )}
                      </div>
                      <p className="text-[11.5px] text-[#706c64] line-clamp-2 font-mono">{snip.template}</p>
                    </div>
                    <button
                      onClick={() => {
                        const next = snippets.filter((s) => s.id !== snip.id);
                        setSnippets(next);
                        saveVoiceSnippets(next);
                      }}
                      className="text-neutral-400 hover:text-red-600 p-1.5 transition rounded-lg hover:bg-red-50 cursor-pointer"
                      title="Delete snippet"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Privacy & Modals */}
            <div className="rounded-2xl bg-[#f8f6f0] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-[#1c1b18] flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span>Voice Privacy &amp; Data Transparency</span>
                </div>
                <div className="text-xs text-[#706c64] mt-0.5">
                  Review how audio is processed, encrypted, and on-device offline storage audits.
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowDataAudit(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#ede8df] hover:bg-[#e4ded3] text-xs font-semibold text-[#1c1b18] border border-[#ded8cc] transition cursor-pointer whitespace-nowrap shadow-2xs hover:shadow-xs active:scale-[0.98]"
                >
                  <ShieldCheck size={13} className="text-emerald-700" />
                  <span>Data Journey</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowTelemetry(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#ede8df] hover:bg-[#e4ded3] text-xs font-semibold text-[#1c1b18] border border-[#ded8cc] transition cursor-pointer whitespace-nowrap shadow-2xs hover:shadow-xs active:scale-[0.98]"
                >
                  <Activity size={13} className="text-purple-700" />
                  <span>Telemetry</span>
                </button>
              </div>
            </div>

            {/* ElevenLabs Advanced Settings */}
            <ElevenLabsVoiceSettings />
          </motion.div>
        )}

        {/* SECTION 2: FLOW PILL & APPEARANCE */}
        {activeSection === "visuals" && (
          <motion.div
            key="section-visuals"
            initial={{ opacity: 0, y: 8, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.995 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
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
              <div className="flex flex-col items-center justify-center py-7 bg-[#f4efe6] dark:bg-[#181b24] rounded-2xl border border-[#e8e4db] dark:border-white/10 relative overflow-hidden shadow-inner select-none">
                {/* Apple Multi-Preset Category Switcher with Spring Indicator */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 p-1 mb-5 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/10 text-xs font-semibold max-w-xl mx-auto shadow-inner relative select-none">
                  {[
                    { id: "apple_intelligence_orb" as const, label: "Liquid Aurora", icon: Sparkles, color: "text-pink-500" },
                    { id: "siri_glow_orb" as const, label: "Siri Edge-Glow", icon: AudioLines, color: "text-fuchsia-500" },
                    { id: "vision_spatial_glass" as const, label: "Vision Spatial", icon: Eye, color: "text-sky-500" },
                    { id: "solar_ember_orb" as const, label: "Solar Ember", icon: Flame, color: "text-amber-500" },
                    { id: "cyber_matrix_orb" as const, label: "Cyber Matrix", icon: Zap, color: "text-cyan-500" },
                    { id: "dynamic_island" as const, label: "Flow Pill", icon: Radio, color: "text-emerald-500" },
                  ].map((preset) => {
                    const isCur =
                      settings.pillTheme === preset.id ||
                      (preset.id === "dynamic_island" &&
                        !["apple_intelligence_orb", "siri_glow_orb", "vision_spatial_glass", "solar_ember_orb", "cyber_matrix_orb"].includes(
                          settings.pillTheme
                        ));
                    const IconComp = preset.icon;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => update({ pillTheme: preset.id })}
                        className={cn(
                          "relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-colors duration-200 cursor-pointer select-none z-10",
                          isCur
                            ? "text-[#1c1b18] dark:text-white font-bold"
                            : "text-[#706c64] dark:text-[#86868b] hover:text-[#1c1b18] dark:hover:text-white font-medium"
                        )}
                      >
                        {isCur && (
                          <motion.div
                            layoutId="activeThemePresetPill"
                            transition={{ type: "spring", stiffness: 500, damping: 35 }}
                            className="absolute inset-0 bg-white dark:bg-[#2c2c2e] rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.12)] border border-black/[0.04] dark:border-white/10 z-[-1]"
                          />
                        )}
                        <IconComp size={13} className={isCur ? preset.color : "opacity-70"} />
                        <span>{preset.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Conditional Live Preview: 5 Liquid Orb Variants vs. Flow Pill Capsule */}
                {["apple_intelligence_orb", "siri_glow_orb", "vision_spatial_glass", "solar_ember_orb", "cyber_matrix_orb"].includes(
                  settings.pillTheme
                ) ? (
                  <div className="my-1">
                    <AppleIntelligenceOrb
                      isListening={isListening}
                      size="md"
                      variant={
                        settings.pillTheme === "siri_glow_orb"
                          ? "siri_glow"
                          : settings.pillTheme === "vision_spatial_glass"
                            ? "vision_spatial"
                            : settings.pillTheme === "solar_ember_orb"
                              ? "solar_ember"
                              : settings.pillTheme === "cyber_matrix_orb"
                                ? "cyber_matrix"
                                : "aurora"
                      }
                      agentMode={previewAgentMode}
                      onToggleAgentMode={() => setPreviewAgentMode((v) => !v)}
                      onToggleTranslate={() => setPreviewTranslateMode((v) => !v)}
                      isTranslationMode={previewTranslateMode}
                      langLabel={settings.language === "auto" ? "Auto" : settings.language.slice(0, 2).toUpperCase()}
                      onToggle={() => {
                        if (isListening) {
                          globalVoiceController.stop();
                          stop();
                        } else {
                          toggle();
                        }
                      }}
                      onStop={() => {
                        globalVoiceController.stop();
                        stop();
                      }}
                      onClose={() => {
                        if (isListening) {
                          globalVoiceController.stop();
                          stop();
                        }
                      }}
                    />
                  </div>
                ) : (
                  /* Active Liquid Glass / Flow Pill 3-Piece Layout */
                  <div className="flex items-center gap-1.5 my-2">
                    {/* Standalone Left Language Island Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewTranslateMode((v) => !v);
                      }}
                      className="relative h-7 px-2 rounded-full flex items-center justify-center gap-1.5 border bg-[#09090b]/98 border-white/20 text-white/90 shadow-xl backdrop-blur-3xl shrink-0 select-none overflow-hidden cursor-pointer hover:scale-105 active:scale-95 transition-all"
                      title="Language & Translation (Click to toggle)"
                    >
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-[45%] rounded-full bg-gradient-to-b from-white/25 via-white/5 to-transparent" />
                      <ChevronUp size={10} className="stroke-[2.5] text-white/70 relative z-10" />
                      <div className="w-[1px] h-2 bg-white/20 relative z-10" />
                      <Globe size={11} className={cn("relative z-10", previewTranslateMode ? "text-amber-300" : "text-white/85")} />
                    </button>

                    {/* Main Center Capsule */}
                    <div
                      onClick={(e) => {
                        e.preventDefault();
                        if (isListening) {
                          globalVoiceController.stop();
                          stop();
                        } else {
                          toggle();
                        }
                      }}
                      className={cn(
                        "relative inline-flex items-center h-7 px-2.5 rounded-full border text-white gap-2 select-none cursor-pointer transition-all duration-300 shadow-2xl backdrop-blur-3xl overflow-hidden hover:scale-105 active:scale-95",
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
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (isListening) {
                            globalVoiceController.stop();
                            stop();
                          } else {
                            toggle();
                          }
                        }}
                        className="relative z-30 flex h-6 w-6 -ml-1 shrink-0 items-center justify-center cursor-pointer select-none group pointer-events-auto hover:scale-110 active:scale-90 transition-transform duration-150 outline-none appearance-none"
                        aria-label={isListening ? "Stop voice recording" : "Start voice recording"}
                        title={isListening ? "Stop voice recording" : "Start voice recording"}
                      >
                        <div
                          className={cn(
                            "w-3.5 h-3.5 rounded-[3px] flex items-center justify-center transition-transform",
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
                        >
                          <span className="w-1.5 h-1.5 rounded-[0.5px] bg-black/75" />
                        </div>
                      </button>

                      {/* Waveform Equalizer / Dynamic Dots */}
                      <div className="relative z-10 flex items-center">
                        <RealtimeEqualizer
                          isListening={isListening || true}
                          barColor={settings.barColor}
                          styleOverride={settings.waveformStyle}
                        />
                      </div>

                      {/* Timer Display */}
                      <div className="relative z-10 flex items-center font-mono text-[10.5px] font-bold tracking-tight select-none leading-none">
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
                    </div>

                    {/* Standalone Circular Flow Pill Agent Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewAgentMode((v) => !v);
                      }}
                      className={cn(
                        "relative w-7 h-7 rounded-full flex items-center justify-center border cursor-pointer transition-all shadow-xl backdrop-blur-3xl shrink-0 overflow-hidden hover:scale-105 active:scale-95",
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
                )}

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
                      Click capsule or liquid orb above to test dictation &amp; microphone
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Main Appearance Accordions */}
            <div className="rounded-2xl bg-[#f8f6f0] p-6 shadow-sm divide-y divide-[#e8e4db]">
              {/* 1. Capsule Theme Row */}
              <div className="py-4 first:pt-0">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-[#1c1b18]">Capsule Theme &amp; Layout</div>
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

                <AnimatePresence>
                  {editingField === "theme" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 pt-3 border-t border-[#e8e4db] grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {THEMES.map((th) => {
                          const isSelected = settings.pillTheme === th.id;
                          const isOrb = ["apple_intelligence_orb", "siri_glow_orb", "vision_spatial_glass", "solar_ember_orb", "cyber_matrix_orb"].includes(
                            th.id
                          );
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

                              <div className="w-full pt-2 border-t border-black/[0.06] flex items-center justify-center">
                                {isOrb ? (
                                  <div className="relative w-12 h-12 rounded-full overflow-hidden border border-white/40 shadow-[0_4px_16px_rgba(0,0,0,0.85),inset_0_1px_2px_rgba(255,255,255,0.75)] bg-gradient-to-b from-[#1c1c24] to-[#050508] flex items-center justify-center">
                                    <div className="pointer-events-none absolute inset-x-1 top-0.5 h-[40%] rounded-t-full bg-gradient-to-b from-white/70 via-white/10 to-transparent" />
                                    <div
                                      className={cn(
                                        "w-8 h-4 rounded-full blur-[2px] opacity-90 animate-pulse",
                                        th.id === "solar_ember_orb"
                                          ? "bg-gradient-to-r from-amber-400 via-rose-500 to-yellow-400"
                                          : th.id === "cyber_matrix_orb"
                                            ? "bg-gradient-to-r from-cyan-400 via-blue-500 to-sky-300"
                                            : th.id === "vision_spatial_glass"
                                              ? "bg-gradient-to-r from-sky-300 via-teal-200 to-purple-300"
                                              : "bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-purple-600"
                                      )}
                                    />
                                    <div className="absolute inset-x-1.5 bottom-1 flex justify-between gap-0.5">
                                      <span
                                        className={cn(
                                          "w-3.5 h-2 rounded-full border",
                                          th.id === "solar_ember_orb"
                                            ? "bg-amber-800/60 border-amber-400/40"
                                            : th.id === "cyber_matrix_orb"
                                              ? "bg-sky-900/60 border-sky-400/40"
                                              : "bg-[#0284c7]/60 border-sky-300/40"
                                        )}
                                      />
                                      <span className="w-3.5 h-2 rounded-full bg-white/90 border border-white flex items-center justify-center">
                                        <span
                                          className={cn(
                                            "w-1.5 h-0.5 rounded-full",
                                            th.id === "solar_ember_orb" ? "bg-amber-600" : "bg-rose-600"
                                          )}
                                        />
                                      </span>
                                    </div>
                                  </div>
                                ) : (
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
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 2. Waveform Visualizer Style */}
              <div className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-[#1c1b18]">Waveform &amp; Visualizer</div>
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

                <AnimatePresence>
                  {editingField === "equalizer" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 3. Action Squircle Glow Style */}
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

                <AnimatePresence>
                  {editingField === "squircle" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 4. Timer Format */}
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

                <AnimatePresence>
                  {editingField === "timer" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showDataAudit && (
        <WhereYourDataGoesModal isOpen={showDataAudit} onClose={() => setShowDataAudit(false)} />
      )}
      {showTelemetry && (
        <VoiceTelemetryModal isOpen={showTelemetry} onClose={() => setShowTelemetry(false)} />
      )}
    </div>
  );
}
