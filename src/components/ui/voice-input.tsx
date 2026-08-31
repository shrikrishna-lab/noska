"use client";

import React, { useEffect, useRef, useState } from "react";
import { Mic, Globe, ChevronUp, ChevronDown, Sparkles, ArrowRight, Check, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "../../lib/utils";
import { useVoiceController, globalVoiceController } from "../../lib/voice/voice-controller";
import {
  useVoiceSettings,
  BarColor,
  PillTheme,
  TimerTheme,
  WaveformStyle,
  SquircleStyle,
  AccessoryStyle,
} from "../../lib/voice/voice-settings";

export interface VoiceInputProps {
  onStart?: () => void;
  onStop?: () => void;
  onTranscript?: (text: string) => void;
  onError?: (error: Error) => void;
  variant?: "pill" | "button" | "compact";
  alwaysPill?: boolean;
}

export const SUPPORTED_LANGUAGES = [
  { code: "auto", name: "Auto-Detect", flag: "⚡", short: "Auto" },
  { code: "en-US", name: "English (US)", flag: "🇺🇸", short: "EN" },
  { code: "en-GB", name: "English (UK)", flag: "🇬🇧", short: "UK" },
  { code: "es-ES", name: "Spanish", flag: "🇪🇸", short: "ES" },
  { code: "fr-FR", name: "French", flag: "🇫🇷", short: "FR" },
  { code: "de-DE", name: "German", flag: "🇩🇪", short: "DE" },
  { code: "hi-IN", name: "Hindi", flag: "🇮🇳", short: "HI" },
  { code: "ja-JP", name: "Japanese", flag: "🇯🇵", short: "JA" },
  { code: "zh-CN", name: "Chinese", flag: "🇨🇳", short: "ZH" },
  { code: "pt-BR", name: "Portuguese", flag: "🇧🇷", short: "PT" },
  { code: "it-IT", name: "Italian", flag: "🇮🇹", short: "IT" },
  { code: "ru-RU", name: "Russian", flag: "🇷🇺", short: "RU" },
  { code: "ar-SA", name: "Arabic", flag: "🇸🇦", short: "AR" },
  { code: "ko-KR", name: "Korean", flag: "🇰🇷", short: "KO" },
];

const THEME_CLASSES: Record<PillTheme, { bg: string; border: string; glow: string }> = {
  dynamic_island: {
    bg: "bg-[#09090b]/98 backdrop-blur-3xl",
    border: "border-white/[0.18]",
    glow: "shadow-[0_14px_40px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.45),inset_0_-1px_1px_rgba(0,0,0,0.6)]",
  },
  dynamic_island_pro: {
    bg: "bg-black/98 backdrop-blur-3xl",
    border: "border-white/20",
    glow: "shadow-[0_16px_48px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.5)] ring-1 ring-white/10",
  },
  apple_vision_glass: {
    bg: "bg-black/80 backdrop-blur-2xl",
    border: "border-white/25",
    glow: "shadow-[0_12px_36px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.45)]",
  },
  dark_charcoal: {
    bg: "bg-[#0a0a0c]/98 backdrop-blur-2xl",
    border: "border-white/[0.18]",
    glow: "shadow-[0_14px_40px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.4)]",
  },
  space_black: {
    bg: "bg-[#09090b]/95 backdrop-blur-2xl",
    border: "border-white/[0.18]",
    glow: "shadow-[0_14px_40px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.4)]",
  },
  deep_obsidian: {
    bg: "bg-black/95 backdrop-blur-2xl",
    border: "border-white/20",
    glow: "shadow-[0_14px_40px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.35)]",
  },
  siri_orb_aura: {
    bg: "bg-gradient-to-r from-indigo-950/95 via-purple-950/95 to-slate-950/95 backdrop-blur-2xl",
    border: "border-purple-400/40",
    glow: "shadow-[0_0_30px_rgba(168,85,247,0.35),0_10px_36px_rgba(0,0,0,0.8)]",
  },
  liquid_titanium: {
    bg: "bg-gradient-to-r from-zinc-900/95 via-neutral-800/95 to-zinc-900/95 backdrop-blur-xl",
    border: "border-zinc-500/40",
    glow: "shadow-[0_8px_28px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.25)]",
  },
  frosted_pearl: {
    bg: "bg-white/20 backdrop-blur-2xl",
    border: "border-white/40",
    glow: "shadow-[0_8px_28px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.6)]",
  },
  frosted_glass: {
    bg: "bg-white/15 backdrop-blur-2xl",
    border: "border-white/30",
    glow: "shadow-[0_8px_28px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.25)]",
  },
  cyber_azure: {
    bg: "bg-[#091124]/95 backdrop-blur-xl",
    border: "border-sky-400/40",
    glow: "shadow-[0_0_20px_rgba(14,165,233,0.35),0_8px_28px_rgba(0,0,0,0.8)]",
  },
  neon_cyber: {
    bg: "bg-[#0a0f1d]",
    border: "border-sky-500/40",
    glow: "shadow-[0_0_20px_rgba(14,165,233,0.3),0_6px_28px_rgba(0,0,0,0.8)]",
  },
  amber_ember: {
    bg: "bg-[#18110e]/95 backdrop-blur-xl",
    border: "border-amber-500/35",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.25),0_8px_28px_rgba(0,0,0,0.8)]",
  },
  minimal_stealth: {
    bg: "bg-black/90 backdrop-blur-md",
    border: "border-white/10",
    glow: "shadow-[0_4px_18px_rgba(0,0,0,0.6)]",
  },
};

const BAR_COLOR_CLASSES: Record<BarColor, string> = {
  white: "bg-white",
  cyan: "bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.5)]",
  violet: "bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.5)]",
  amber: "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]",
  emerald: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]",
  orange_flame: "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]",
  gradient: "bg-gradient-to-t from-pink-500 to-amber-300",
  rainbow: "bg-gradient-to-r from-sky-400 via-emerald-300 to-amber-300",
};

const SQUIRCLE_CLASSES: Record<SquircleStyle, string> = {
  apple_glow: "bg-white hover:bg-white shadow-[0_0_10px_rgba(255,255,255,0.9),0_0_20px_rgba(255,255,255,0.4)]",
  ruby_studio: "bg-red-500 hover:bg-red-400 shadow-[0_0_10px_rgba(239,68,68,0.85)]",
  emerald_active: "bg-emerald-400 hover:bg-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.85)]",
  titanium_frosted: "bg-zinc-200 border border-white/60 shadow-[0_0_6px_rgba(255,255,255,0.4)]",
  siri_gradient: "bg-gradient-to-tr from-pink-500 via-purple-400 to-cyan-300 shadow-[0_0_10px_rgba(168,85,247,0.7)]",
  cyber_neon: "bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.9)]",
};

/**
 * Pure Animated AI Agent Smile Face (No outer helmet ring)
 */
export function ActivityRing({
  isListening,
  agentMode = false,
}: {
  isListening: boolean;
  color?: string;
  agentMode?: boolean;
}) {
  const activeColor = agentMode ? "#10b981" : "#ffffff";
  const glowShadow = agentMode
    ? "drop-shadow(0 0 3px rgba(16,185,129,0.8))"
    : "drop-shadow(0 0 2px rgba(255,255,255,0.4))";

  return (
    <div
      className="relative w-4 h-4 flex items-center justify-center select-none"
      style={{ filter: glowShadow }}
    >
      <div className="relative flex flex-col items-center justify-center gap-[2px]">
        {/* Animated AI Glowing Eyes */}
        <div className="flex items-center gap-[3px]">
          <motion.span
            animate={
              agentMode
                ? {
                  scaleY: [1, 1, 0.15, 1, 1],
                  scaleX: [1, 1, 1.2, 1, 1],
                }
                : {
                  scaleY: [1, 1, 0.15, 1, 1],
                }
            }
            transition={{
              duration: agentMode ? 2.5 : 3.5,
              repeat: Infinity,
              repeatDelay: agentMode ? 1.2 : 2.0,
              times: [0, 0.45, 0.5, 0.55, 1],
            }}
            className={cn(
              "w-[2px] h-[2.6px] rounded-full transition-colors duration-300",
              agentMode ? "bg-emerald-400" : "bg-white/75"
            )}
          />
          <motion.span
            animate={
              agentMode
                ? {
                  scaleY: [1, 1, 0.15, 1, 1],
                  scaleX: [1, 1, 1.2, 1, 1],
                }
                : {
                  scaleY: [1, 1, 0.15, 1, 1],
                }
            }
            transition={{
              duration: agentMode ? 2.5 : 3.5,
              repeat: Infinity,
              repeatDelay: agentMode ? 1.2 : 2.0,
              times: [0, 0.45, 0.5, 0.55, 1],
            }}
            className={cn(
              "w-[2px] h-[2.6px] rounded-full transition-colors duration-300",
              agentMode ? "bg-emerald-400" : "bg-white/75"
            )}
          />
        </div>

        {/* Animated Friendly Smile Arc */}
        <svg className="w-3 h-1.5" viewBox="0 0 10 5">
          <motion.path
            d={agentMode ? "M 1 1 Q 5 4.5 9 1" : "M 1.5 1.5 Q 5 4 8.5 1.5"}
            fill="none"
            stroke={activeColor}
            strokeWidth={agentMode ? "1.4" : "1.2"}
            strokeLinecap="round"
            className="transition-colors duration-300"
            animate={
              isListening
                ? {
                  d: agentMode
                    ? ["M 1 1 Q 5 4.5 9 1", "M 1 1.8 Q 5 5.5 9 1.8", "M 1 1 Q 5 4.5 9 1"]
                    : ["M 1.5 1.5 Q 5 4 8.5 1.5", "M 1.5 2.2 Q 5 4.8 8.5 2.2", "M 1.5 1.5 Q 5 4 8.5 1.5"],
                }
                : {}
            }
            transition={{
              duration: agentMode ? 1.0 : 1.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </svg>
      </div>
    </div>
  );
}

/**
 * Compact Smooth Real-Time Equalizer Waveform & Dynamic Dots
 */
export function RealtimeEqualizer({
  isListening,
  barColor,
  styleOverride,
  className,
}: {
  isListening: boolean;
  barColor?: BarColor;
  styleOverride?: WaveformStyle;
  className?: string;
}) {
  const { settings } = useVoiceSettings();
  const activeColor = barColor || settings.barColor || "white";
  const activeStyle = styleOverride || settings.waveformStyle || "dynamic_dots";

  const barCount = activeStyle === "dense_24" ? 20 : activeStyle === "minimal_pulse" ? 3 : activeStyle === "dynamic_dots" ? 11 : 11;
  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const currentHeightsRef = useRef<number[]>(new Array(24).fill(2.5));

  useEffect(() => {
    let animId: number;

    const render = () => {
      const freqs = globalVoiceController.getLiveFrequencyBands(barCount);
      const time = performance.now() * 0.004;

      for (let i = 0; i < barCount; i++) {
        const barEl = barsRef.current[i];
        if (!barEl) continue;

        let targetH = 2.5;

        if (activeStyle === "minimal_pulse") {
          const minD = 3;
          const maxD = 10;
          const raw = freqs[i] || 0.08;
          const pulse = (Math.sin(time * 4 + i * 1.2) * 0.5 + 0.5) * 3;
          targetH = Math.max(minD, Math.min(maxD, isListening ? raw * 14 + minD : minD + pulse));
        } else if (activeStyle === "dynamic_dots") {
          const minD = 2.2;
          const maxD = 4.2;
          const raw = freqs[i] || 0.05;
          const pulse = (Math.sin(time * 5 + i * 0.8) * 0.5 + 0.5) * 1.2;
          targetH = Math.max(minD, Math.min(maxD, isListening ? raw * 3.5 + minD + pulse : minD));
        } else {
          const minH = 2.5;
          const maxH = 12;

          if (isListening) {
            const rawFreq = freqs[i] || 0.04;
            const ambient = (Math.sin(time * 4.0 + i * 0.6) * 0.5 + 0.5) * 1.5;
            const voiceH = minH + rawFreq * (maxH - minH) * 1.3 * (settings.sensitivityBoost / 2.5);
            targetH = Math.max(minH, Math.min(maxH, rawFreq > 0.08 ? voiceH : minH + ambient));
          } else {
            targetH = minH;
          }
        }

        const prev = currentHeightsRef.current[i] || 2.5;
        let next: number;
        if (targetH > prev) {
          next = prev + (targetH - prev) * 0.75;
        } else {
          next = prev + (targetH - prev) * 0.22;
        }
        currentHeightsRef.current[i] = next;

        if (activeStyle === "minimal_pulse" || activeStyle === "dynamic_dots") {
          barEl.style.width = `${next.toFixed(1)}px`;
          barEl.style.height = `${next.toFixed(1)}px`;
          if (activeStyle === "dynamic_dots") {
            barEl.style.opacity = `${Math.min(1, 0.45 + (next / 4.2) * 0.55)}`;
          }
        } else {
          barEl.style.height = `${next.toFixed(1)}px`;
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isListening, barCount, activeStyle, settings.sensitivityBoost]);

  if (activeStyle === "dynamic_dots") {
    return (
      <div className={cn("flex items-center gap-[2.5px] h-4 px-1", className)}>
        {[...Array(11)].map((_, i) => (
          <span
            key={i}
            ref={(el) => {
              barsRef.current[i] = el;
            }}
            className={cn(
              "rounded-full flex-shrink-0 transition-all",
              BAR_COLOR_CLASSES[activeColor] || "bg-white"
            )}
            style={{ width: "2.5px", height: "2.5px" }}
          />
        ))}
      </div>
    );
  }

  if (activeStyle === "minimal_pulse") {
    return (
      <div className={cn("flex items-center gap-1 h-4 px-0.5", className)}>
        {[...Array(3)].map((_, i) => (
          <span
            key={i}
            ref={(el) => {
              barsRef.current[i] = el;
            }}
            className={cn("rounded-full flex-shrink-0 transition-all duration-100", BAR_COLOR_CLASSES[activeColor] || "bg-white")}
            style={{ width: "3.5px", height: "3.5px" }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-[2px] h-4 px-0.5", className)}>
      {[...Array(barCount)].map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            barsRef.current[i] = el;
          }}
          className={cn(
            "rounded-full flex-shrink-0 transition-opacity duration-150",
            BAR_COLOR_CLASSES[activeColor] || "bg-white",
            activeStyle === "dense_24" ? "w-[1.2px]" : "w-[2px]"
          )}
          style={{ height: "2px" }}
        />
      ))}
    </div>
  );
}

function TimerDisplay({ mins, secs, timerTheme }: { mins: string; secs: string; timerTheme: TimerTheme }) {
  if (timerTheme === "cyan_gold") {
    return (
      <div className="flex items-center font-mono text-[11px] font-bold tracking-wider select-none leading-none">
        <span className="text-sky-300">{mins}</span>
        <span className="text-white/30 px-[1px]">:</span>
        <span className="text-amber-300">{secs}</span>
      </div>
    );
  }
  if (timerTheme === "monochrome") {
    return (
      <div className="flex items-center font-mono text-[11px] font-bold tracking-wider select-none leading-none text-white">
        {mins}:{secs}
      </div>
    );
  }
  if (timerTheme === "sunset") {
    return (
      <div className="flex items-center font-mono text-[11px] font-bold tracking-wider select-none leading-none">
        <span className="text-rose-400">{mins}</span>
        <span className="text-white/30 px-[1px]">:</span>
        <span className="text-orange-300">{secs}</span>
      </div>
    );
  }
  if (timerTheme === "neon_green") {
    return (
      <div className="flex items-center font-mono text-[11px] font-bold tracking-wider select-none leading-none">
        <span className="text-emerald-400">{mins}</span>
        <span className="text-white/30 px-[1px]">:</span>
        <span className="text-emerald-300">{secs}</span>
      </div>
    );
  }

  // Dual tone clean Apple font
  return (
    <div className="flex items-center font-mono text-[11.5px] font-bold tracking-wider select-none leading-none text-white/95">
      <span>{mins}</span>
      <span className="text-white/40 px-[1px]">:</span>
      <span>{secs}</span>
    </div>
  );
}

export function StreamingWordText({
  text,
  isListening,
  className,
}: {
  text: string;
  isListening?: boolean;
  className?: string;
}) {
  const words = text ? text.split(/\s+/).filter(Boolean) : [];

  return (
    <div className={cn("inline-flex items-center flex-wrap gap-1 leading-normal", className)}>
      <AnimatePresence mode="popLayout">
        {words.map((word, i) => (
          <motion.span
            key={`${i}-${word}`}
            initial={{ opacity: 0, y: 2, filter: "blur(2px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 450, damping: 25 }}
            className="inline-block"
          >
            {word}
          </motion.span>
        ))}
      </AnimatePresence>
      {isListening && (
        <motion.span
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 0.75, repeat: Infinity, ease: "easeInOut" }}
          className="inline-block w-[1.5px] h-3 bg-[var(--accent)] rounded-full ml-0.5 shadow-[0_0_6px_var(--accent)]"
        />
      )}
    </div>
  );
}

/**
 * Apple Dynamic Island Style Language Switcher & Live Translation Popover
 */
function LanguageSwitcherPopover({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { settings, update } = useVoiceSettings();
  const [activeTab, setActiveTab] = useState<"direct" | "translation">(
    settings.languageMode || "direct"
  );

  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  const selectedSource = settings.sourceLanguage || "auto";
  const selectedTarget = settings.targetLanguage || "en-US";
  const selectedDirect = settings.language || "en-US";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, y: 14, scale: 0.94, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 10, scale: 0.94, filter: "blur(8px)" }}
          transition={{ type: "spring", stiffness: 600, damping: 28, mass: 0.8 }}
          className="absolute bottom-11 left-1/2 -translate-x-1/2 z-[10000] w-[335px] rounded-[26px] bg-[#0c0d12]/95 border border-white/[0.18] shadow-[0_24px_70px_rgba(0,0,0,0.95),inset_0_1px_1.5px_rgba(255,255,255,0.4)] backdrop-blur-3xl p-4 text-white select-none pointer-events-auto overflow-hidden font-sans"
        >
          {/* Subtle Specular Top Reflection Rim */}
          <div className="pointer-events-none absolute inset-x-4 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/45 to-transparent" />

          {/* Header & Mode Switcher */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Globe size={13} className="text-sky-400" />
              <span className="text-[12.5px] font-semibold tracking-tight text-white/95">Voice Language</span>
            </div>
            <button
              onClick={onClose}
              className="w-5 h-5 rounded-full bg-white/[0.08] hover:bg-white/[0.18] flex items-center justify-center text-white/60 hover:text-white transition cursor-pointer"
            >
              <X size={10} />
            </button>
          </div>

          {/* Apple Segmented Pill Switcher */}
          <div className="flex items-center p-0.5 rounded-full bg-white/[0.08] border border-white/[0.08] mt-3 mb-3.5 relative">
            <button
              type="button"
              onClick={() => {
                setActiveTab("direct");
                update({ languageMode: "direct" });
              }}
              className={cn(
                "flex-1 py-1.5 rounded-full text-[11px] font-medium text-center transition-all cursor-pointer relative z-10",
                activeTab === "direct" ? "text-white font-semibold" : "text-white/60 hover:text-white"
              )}
            >
              {activeTab === "direct" && (
                <motion.div
                  layoutId="active-lang-tab"
                  className="absolute inset-0 rounded-full bg-white/20 shadow-sm border border-white/25 -z-10"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              Direct Dictation
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("translation");
                update({ languageMode: "translation" });
              }}
              className={cn(
                "flex-1 py-1.5 rounded-full text-[11px] font-medium text-center transition-all cursor-pointer relative z-10",
                activeTab === "translation" ? "text-white font-semibold" : "text-white/60 hover:text-white"
              )}
            >
              {activeTab === "translation" && (
                <motion.div
                  layoutId="active-lang-tab"
                  className="absolute inset-0 rounded-full bg-white/20 shadow-sm border border-white/25 -z-10"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              Live Translation
            </button>
          </div>

          {/* Mode 1: Direct Dictation */}
          {activeTab === "direct" ? (
            <div className="space-y-2">
              <p className="text-[10.5px] text-white/55 leading-tight px-0.5">
                Auto-detect speech or dictate directly in your preferred language:
              </p>

              <div className="grid grid-cols-2 gap-1.5 max-h-[190px] overflow-y-auto pr-0.5 custom-scrollbar">
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const isSelected = selectedDirect === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        update({ language: lang.code, languageMode: "direct" });
                      }}
                      className={cn(
                        "flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-[11px] transition active:scale-95 cursor-pointer text-left",
                        isSelected
                          ? "bg-sky-500/20 border-sky-400 text-sky-100 shadow-[0_0_10px_rgba(56,189,248,0.25)] font-semibold"
                          : "bg-white/[0.04] border-white/[0.08] text-white/80 hover:bg-white/[0.08] hover:text-white"
                      )}
                    >
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[12px]">{lang.flag}</span>
                        <span className="text-[11px] font-medium text-white/90 truncate">{lang.name}</span>
                      </span>
                      {isSelected && <Check size={11} className="text-sky-400 shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Mode 2: Live Translation (Speaking Language -> Text Output Language) */
            <div className="space-y-3">
              <p className="text-[10.5px] text-white/55 leading-tight px-0.5">
                Speak in any language — Noska transcribes into your target language:
              </p>

              {/* Source -> Target Display Box */}
              <div className="flex items-center justify-between gap-1 p-2 rounded-2xl bg-white/[0.05] border border-white/[0.1]">
                {/* Speaking Lang */}
                <div className="flex-1 text-center">
                  <div className="text-[9px] uppercase tracking-wider text-white/50 font-bold mb-0.5">Speaking</div>
                  <div className="text-[11px] font-bold text-amber-300 truncate">
                    {SUPPORTED_LANGUAGES.find((l) => l.code === selectedSource)?.name || "Auto-Detect"}
                  </div>
                </div>

                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <ArrowRight size={10} className="text-white/80" />
                </div>

                {/* Output Text Lang */}
                <div className="flex-1 text-center">
                  <div className="text-[9px] uppercase tracking-wider text-white/50 font-bold mb-0.5">Output Text</div>
                  <div className="text-[11px] font-bold text-emerald-300 truncate">
                    {SUPPORTED_LANGUAGES.find((l) => l.code === selectedTarget)?.name || "English (US)"}
                  </div>
                </div>
              </div>

              {/* Speaking Lang Selector */}
              <div>
                <span className="text-[10.5px] font-semibold text-white/70 block mb-1">1. Speaking Language:</span>
                <div className="flex gap-1 overflow-x-auto pb-1 custom-scrollbar">
                  {SUPPORTED_LANGUAGES.slice(0, 8).map((lang) => {
                    const isSelected = selectedSource === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => update({ sourceLanguage: lang.code, languageMode: "translation" })}
                        className={cn(
                          "px-2 py-1 rounded-lg border text-[10px] font-semibold shrink-0 transition active:scale-95 cursor-pointer",
                          isSelected
                            ? "bg-amber-500/25 border-amber-400/60 text-amber-200 shadow-xs"
                            : "bg-white/5 border-white/10 text-white/70 hover:text-white"
                        )}
                      >
                        {lang.flag} {lang.short}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Output Text Lang Selector */}
              <div>
                <span className="text-[10.5px] font-semibold text-white/70 block mb-1">2. Transcribed Text:</span>
                <div className="flex gap-1 overflow-x-auto pb-1 custom-scrollbar">
                  {SUPPORTED_LANGUAGES.filter((l) => l.code !== "auto").slice(0, 7).map((lang) => {
                    const isSelected = selectedTarget === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => update({ targetLanguage: lang.code, languageMode: "translation" })}
                        className={cn(
                          "px-2 py-1 rounded-lg border text-[10px] font-semibold shrink-0 transition active:scale-95 cursor-pointer",
                          isSelected
                            ? "bg-emerald-500/25 border-emerald-400/60 text-emerald-200 shadow-xs"
                            : "bg-white/5 border-white/10 text-white/70 hover:text-white"
                        )}
                      >
                        {lang.flag} {lang.short}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Compact Standalone Left Language Island Button (Apple Liquid Droplet Physics)
 */
function LanguageIslandButton({
  isLangOpen,
  isTranslationMode,
  langLabel,
  onClick,
}: {
  isLangOpen: boolean;
  isTranslationMode: boolean;
  langLabel: string;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <motion.button
      type="button"
      layoutId="apple-dynamic-island-lang-btn"
      initial={{ opacity: 0, scale: 0.65, x: 12, filter: "blur(6px)" }}
      animate={{ opacity: 1, scale: 1, x: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.65, x: 8, filter: "blur(6px)" }}
      whileHover={{ scale: 1.08, y: -0.5 }}
      whileTap={{ scale: 0.92, y: 0.5 }}
      transition={{
        type: "spring",
        stiffness: 450,
        damping: 24,
        mass: 0.8,
      }}
      onClick={onClick}
      className={cn(
        "relative h-7.5 px-2 rounded-full flex items-center justify-center gap-1.5 border cursor-pointer transition-colors shadow-2xl backdrop-blur-3xl shrink-0 select-none overflow-hidden group",
        isLangOpen
          ? "bg-[#18181f] border-sky-400 text-sky-200 shadow-[0_0_15px_rgba(56,189,248,0.5)] ring-1 ring-sky-400/40"
          : isTranslationMode
            ? "bg-[#09090b]/98 border-amber-400/50 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.35)]"
            : "bg-[#09090b]/98 border-white/20 text-white/90 hover:text-white shadow-[0_6px_24px_rgba(0,0,0,0.85)]"
      )}
      title={`Language & Translation: ${langLabel} (Click to change)`}
    >
      {/* Specular Liquid Top Sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[45%] rounded-full bg-gradient-to-b from-white/25 via-white/5 to-transparent" />

      {/* Upward Chevron */}
      <ChevronUp
        size={9.5}
        className={cn(
          "stroke-[2.5] transition-colors relative z-10",
          isLangOpen ? "text-sky-400" : isTranslationMode ? "text-amber-400" : "text-white/70"
        )}
      />

      {/* Glass Divider */}
      <div className="w-[1px] h-2 bg-white/20 relative z-10" />

      {/* Globe Icon with Liquid Rotation */}
      <motion.div
        animate={isTranslationMode ? { rotate: [0, 15, -15, 0] } : { scale: [1, 1.08, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="flex items-center relative z-10"
      >
        <Globe
          size={10.5}
          className={cn(
            "transition-colors",
            isTranslationMode ? "text-amber-400" : isLangOpen ? "text-sky-400" : "text-white/85"
          )}
        />
      </motion.div>
    </motion.button>
  );
}

export function VoiceInput({
  onStart,
  onStop,
  onTranscript,
  onError,
  variant = "pill",
  alwaysPill = true,
}: VoiceInputProps) {
  const { isListening, toggle, stop } = useVoiceController({ onStart, onStop, onTranscript, onError });
  const { settings } = useVoiceSettings();

  const [mins, setMins] = useState("00");
  const [secs, setSecs] = useState("00");
  const [agentMode, setAgentMode] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");
  const [isLangOpen, setIsLangOpen] = useState(false);

  useEffect(() => {
    const unsub = globalVoiceController.onTranscript((txt) => {
      setLastTranscript(txt);
      onTranscript?.(txt);
    });
    return unsub;
  }, [onTranscript]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isListening) {
      let totalSeconds = 0;
      setMins("00");
      setSecs("00");
      interval = setInterval(() => {
        totalSeconds++;
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        setMins(m < 10 ? `0${m}` : `${m}`);
        setSecs(s < 10 ? `0${s}` : `${s}`);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isListening]);

  const posClasses = {
    bottom_center: "bottom-5 left-1/2 -translate-x-1/2",
    top_center: "top-5 left-1/2 -translate-x-1/2",
    bottom_right: "bottom-5 right-5",
  }[settings.floatingPosition || "bottom_center"];

  const themeConfig = THEME_CLASSES[settings.pillTheme] || THEME_CLASSES.dynamic_island;
  const squircleClass = SQUIRCLE_CLASSES[settings.squircleStyle] || SQUIRCLE_CLASSES.apple_glow;

  // Compute Active Language Label
  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === (settings.language || "en-US"));
  const sourceLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === (settings.sourceLanguage || "auto"));
  const targetLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === (settings.targetLanguage || "en-US"));

  const isTranslationMode = settings.languageMode === "translation";
  const langLabel = isTranslationMode
    ? `${sourceLangObj?.short || "Auto"} → ${targetLangObj?.short || "EN"}`
    : currentLangObj?.short || "EN";

  return (
    <div className={cn("fixed z-[9999] pointer-events-auto select-none", posClasses)}>
      {/* Apple Dynamic Island Language & Translation Popover Modal */}
      <LanguageSwitcherPopover isOpen={isLangOpen} onClose={() => setIsLangOpen(false)} />

      <AnimatePresence mode="wait">
        {isListening && (
          /* Active Recording Dynamic Island: Fluid 3-Piece Water-Droplet Layout */
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 14 }}
            transition={{
              type: "spring",
              stiffness: 420,
              damping: 25,
              mass: 0.85,
            }}
            className="flex items-center gap-1.5"
          >
            {/* 1. Standalone Left Language Island Button */}
            <LanguageIslandButton
              isLangOpen={isLangOpen}
              isTranslationMode={isTranslationMode}
              langLabel={langLabel}
              onClick={(e) => {
                e.stopPropagation();
                setIsLangOpen((v) => !v);
              }}
            />

            {/* 2. Main Liquid Center Dynamic Island Capsule */}
            <motion.div
              key="active-dynamic-island"
              layoutId="apple-dynamic-island-capsule"
              initial={{ scale: 0.9, filter: "blur(6px)" }}
              animate={{
                scale: [0.92, 1.025, 0.99, 1],
                filter: "blur(0px)",
              }}
              exit={{ scale: 0.9, opacity: 0, filter: "blur(6px)" }}
              whileHover={{ scale: 1.025, y: -0.5 }}
              whileTap={{ scale: 0.98 }}
              transition={{
                type: "spring",
                stiffness: 450,
                damping: 24,
                mass: 0.8,
              }}
              className={cn(
                "relative flex items-center gap-2.5 h-7.5 px-2.5 rounded-full border transition-all duration-300 overflow-hidden shadow-2xl backdrop-blur-3xl",
                themeConfig.bg,
                themeConfig.border,
                themeConfig.glow
              )}
            >
              {/* Specular Liquid Gloss Top Sheen */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[48%] rounded-full bg-gradient-to-b from-white/30 via-white/10 to-transparent" />

              {/* Ambient Fluid Breathing Pulse Glow */}
              <motion.div
                animate={{
                  opacity: [0.15, 0.35, 0.15],
                  scale: [0.98, 1.02, 0.98],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-sky-500/10 via-emerald-500/15 to-purple-500/10"
              />

              {/* Left Stop Squircle with Apple Specular Glow */}
              <motion.button
                type="button"
                onClick={stop}
                whileHover={{ scale: 1.18, rotate: [0, -4, 4, 0] }}
                whileTap={{ scale: 0.85 }}
                transition={{ type: "spring", stiffness: 600, damping: 22 }}
                className={cn(
                  "w-3.5 h-3.5 rounded-[3.5px] flex-shrink-0 cursor-pointer transition-colors relative flex items-center justify-center z-10 shadow-sm",
                  squircleClass
                )}
                aria-label="Stop voice typing"
                title="Click to stop recording"
              >
                <span className="w-1.5 h-1.5 rounded-[1px] bg-black/60" />
              </motion.button>

              {/* Smooth Real-Time Waveform / Dynamic Dots Visualizer */}
              <div className="relative z-10 flex items-center">
                <RealtimeEqualizer
                  isListening={isListening}
                  barColor={settings.barColor}
                  styleOverride={settings.waveformStyle}
                />
              </div>

              {/* Digital Timer */}
              <div className="relative z-10">
                <TimerDisplay mins={mins} secs={secs} timerTheme={settings.timerTheme} />
              </div>

              {/* Live animated transcript preview (if enabled) */}
              {settings.showTranscriptPreview && lastTranscript ? (
                <div className="relative z-10 text-[11px] text-white/85 max-w-[130px] truncate border-l border-white/15 pl-2 font-medium">
                  <StreamingWordText text={lastTranscript} isListening={isListening} />
                </div>
              ) : null}
            </motion.div>

            {/* 3. Standalone Right Circular Dynamic Island Agent Button */}
            <motion.button
              type="button"
              layoutId="apple-dynamic-island-agent-btn"
              initial={{ opacity: 0, scale: 0.65, x: -12, filter: "blur(6px)" }}
              animate={{ opacity: 1, scale: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.65, x: -8, filter: "blur(6px)" }}
              whileHover={{ scale: 1.12, y: -0.5 }}
              whileTap={{ scale: 0.9, y: 0.5 }}
              transition={{
                type: "spring",
                stiffness: 450,
                damping: 24,
                mass: 0.8,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setAgentMode(!agentMode);
              }}
              className={cn(
                "relative w-7.5 h-7.5 rounded-full flex items-center justify-center border cursor-pointer transition-colors shadow-2xl backdrop-blur-3xl shrink-0 overflow-hidden group",
                agentMode
                  ? "bg-[#09090b]/98 border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.45)] ring-1 ring-emerald-400/40"
                  : "bg-[#09090b]/98 border-white/20 shadow-[0_6px_24px_rgba(0,0,0,0.85)]"
              )}
              title={agentMode ? "Agent Mode: ON (Click to toggle)" : "Agent Mode: OFF (Click to toggle)"}
            >
              {/* Specular Liquid Top Sheen */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[45%] rounded-full bg-gradient-to-b from-white/25 via-white/5 to-transparent" />

              <div className="relative z-10">
                <ActivityRing
                  isListening={isListening}
                  color={agentMode ? "#10b981" : "#f59e0b"}
                  agentMode={agentMode}
                />
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const VoiceFloatingIndicator = VoiceInput;
export const VoicePill = VoiceInput;
export default VoiceInput;
