"use client";

import React, { useEffect, useRef, useState } from "react";
import { Mic, Globe, ChevronUp, ChevronDown, Sparkles, ArrowRight, Check, X, AlertCircle, RefreshCw, Clock, Settings, ChevronRight, Clipboard, ClipboardPaste, Plus, ListChecks } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "../../lib/utils";
import { useVoiceController, globalVoiceController } from "../../lib/voice/voice-controller";
import { getWebVoiceReadiness } from "../../lib/voice/speech-recognition";
import { isDesktop } from "../../lib/desktop/platform";
import { AUTO_LANGUAGE, HINGLISH_LANGUAGE } from "../../lib/voice/language";
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
  { code: AUTO_LANGUAGE, name: "Auto-detect", flag: "⚡", short: "Auto" },
  { code: "en-US", name: "English", flag: "🇺🇸", short: "EN" },
  { code: HINGLISH_LANGUAGE, name: "Hinglish", flag: "🇮🇳", short: "Hinglish" },
  { code: "mr-IN", name: "Marathi (मराठी)", flag: "🇮🇳", short: "Marathi" },
  { code: "hi-IN", name: "Hindi (हिंदी)", flag: "🇮🇳", short: "Hindi" },
  { code: "en-GB", name: "English (UK)", flag: "🇬🇧", short: "UK" },
  { code: "es-ES", name: "Spanish", flag: "🇪🇸", short: "ES" },
  { code: "fr-FR", name: "French", flag: "🇫🇷", short: "FR" },
  { code: "de-DE", name: "German", flag: "🇩🇪", short: "DE" },
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
 * Apple macOS-Grade Voice Context Menu (Inspired by Reference Screenshot 1)
 */
function VoiceContextMenu({
  isOpen,
  onClose,
  onOpenSettings,
  onPasteTranscript,
  onMuteHour,
  lastTranscript,
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
  onPasteTranscript?: () => void;
  onMuteHour?: () => void;
  lastTranscript?: string;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showMicSubmenu, setShowMicSubmenu] = useState(false);
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>("auto");

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Query microphones dynamically
      if (navigator.mediaDevices?.enumerateDevices) {
        navigator.mediaDevices.enumerateDevices().then((devices) => {
          const audioInputs = devices.filter((d) => d.kind === "audioinput");
          setMicrophones(audioInputs);
        }).catch(() => {});
      }
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeMicLabel = selectedMicId === "auto"
    ? (microphones[0]?.label ? `Auto-detect (${microphones[0].label.split("(")[0].trim() || "Headset"})` : "Auto-detect (Headset)")
    : (microphones.find((m) => m.deviceId === selectedMicId)?.label || "Selected Mic");

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, y: 10, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 520, damping: 30 }}
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "SF Pro", system-ui, -apple-system-headline, sans-serif',
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
          textRendering: "optimizeLegibility",
          background: "linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(247, 248, 251, 0.94) 100%)",
          boxShadow: "0 22px 55px -10px rgba(0, 0, 0, 0.26), inset 0 1px 0.5px rgba(255, 255, 255, 0.85), inset 0 -0.5px 0.5px rgba(0, 0, 0, 0.06)",
        }}
        className="dark:!bg-[#151722]/95 fixed bottom-14 left-1/2 -translate-x-1/2 z-[10002] w-64 rounded-[18px] p-1.5 text-zinc-800 dark:text-zinc-100 border border-black/[0.09] dark:border-white/[0.14] backdrop-blur-2xl select-none"
      >
        {/* Item 1: Hide for 1 hour */}
        <button
          onClick={() => {
            onMuteHour?.();
            onClose();
          }}
          className="w-full px-3 py-1.5 rounded-[12px] text-left text-[13px] font-[450] tracking-[-0.011em] flex items-center gap-2.5 hover:bg-black/[0.06] dark:hover:bg-white/[0.12] active:bg-black/[0.09] dark:active:bg-white/[0.16] transition-colors duration-100 cursor-pointer text-zinc-800 dark:text-zinc-100"
        >
          <Clock size={15} strokeWidth={1.85} className="text-zinc-500/90 dark:text-zinc-400/90 shrink-0" />
          <span className="leading-snug">Hide for 1 hour</span>
        </button>

        {/* Item 2: Settings */}
        <button
          onClick={() => {
            onOpenSettings?.();
            onClose();
          }}
          className="w-full px-3 py-1.5 rounded-[12px] text-left text-[13px] font-[450] tracking-[-0.011em] flex items-center gap-2.5 hover:bg-black/[0.06] dark:hover:bg-white/[0.12] active:bg-black/[0.09] dark:active:bg-white/[0.16] transition-colors duration-100 cursor-pointer text-zinc-800 dark:text-zinc-100"
        >
          <Settings size={15} strokeWidth={1.85} className="text-zinc-500/90 dark:text-zinc-400/90 shrink-0" />
          <span className="leading-snug">Settings</span>
        </button>

        {/* Item 3: Microphone with Flyout Submenu */}
        <div
          className="relative"
          onMouseEnter={() => setShowMicSubmenu(true)}
          onMouseLeave={() => setShowMicSubmenu(false)}
        >
          <button
            onClick={() => setShowMicSubmenu((v) => !v)}
            className="w-full px-3 py-1.5 rounded-[12px] text-left text-[13px] font-[450] tracking-[-0.011em] flex items-center justify-between hover:bg-black/[0.06] dark:hover:bg-white/[0.12] active:bg-black/[0.09] dark:active:bg-white/[0.16] transition-colors duration-100 cursor-pointer text-zinc-800 dark:text-zinc-100"
          >
            <div className="flex items-center gap-2.5">
              <Mic size={15} strokeWidth={1.85} className="text-zinc-500/90 dark:text-zinc-400/90 shrink-0" />
              <span className="leading-snug">Microphone</span>
            </div>
            <ChevronRight size={13} strokeWidth={2} className="text-zinc-400/80 dark:text-zinc-500" />
          </button>

          {/* Cascading Submenu (Matching Reference Screenshot 1) */}
          <AnimatePresence>
            {showMicSubmenu && (
              <motion.div
                initial={{ opacity: 0, x: 8, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 6, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 520, damping: 30 }}
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "SF Pro", system-ui, -apple-system-headline, sans-serif',
                  WebkitFontSmoothing: "antialiased",
                  MozOsxFontSmoothing: "grayscale",
                  textRendering: "optimizeLegibility",
                  background: "linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(247, 248, 251, 0.94) 100%)",
                  boxShadow: "0 22px 55px -10px rgba(0, 0, 0, 0.26), inset 0 1px 0.5px rgba(255, 255, 255, 0.85), inset 0 -0.5px 0.5px rgba(0, 0, 0, 0.06)",
                }}
                className="dark:!bg-[#151722]/95 absolute bottom-0 left-full ml-1.5 w-72 rounded-[18px] p-1.5 text-zinc-800 dark:text-zinc-100 border border-black/[0.09] dark:border-white/[0.14] backdrop-blur-2xl z-50 select-none"
              >
                <div className="max-h-56 overflow-y-auto pr-0.5 space-y-0.5 custom-scrollbar">
                  {/* Auto-Detect Device */}
                  <button
                    onClick={() => {
                      setSelectedMicId("auto");
                      setShowMicSubmenu(false);
                      onClose();
                    }}
                    className="w-full px-3 py-1.5 rounded-[12px] text-left text-[12.5px] font-[450] tracking-[-0.008em] flex items-center justify-between hover:bg-black/[0.06] dark:hover:bg-white/[0.12] transition-colors duration-100 cursor-pointer"
                  >
                    <span className="truncate leading-snug">{activeMicLabel}</span>
                    {selectedMicId === "auto" && (
                      <Check size={14} strokeWidth={2.2} className="text-zinc-950 dark:text-white shrink-0 ml-2" />
                    )}
                  </button>

                  {/* Physical Devices */}
                  {microphones.map((mic, idx) => {
                    const isSelected = selectedMicId === mic.deviceId;
                    const label = mic.label || `Microphone ${idx + 1}`;
                    return (
                      <button
                        key={mic.deviceId || idx}
                        onClick={() => {
                          setSelectedMicId(mic.deviceId);
                          setShowMicSubmenu(false);
                          onClose();
                        }}
                        className="w-full px-3 py-1.5 rounded-[12px] text-left text-[12.5px] font-[450] tracking-[-0.008em] flex items-center justify-between hover:bg-black/[0.06] dark:hover:bg-white/[0.12] transition-colors duration-100 cursor-pointer"
                      >
                        <span className="truncate leading-snug">{label}</span>
                        {isSelected && (
                          <Check size={14} strokeWidth={2.2} className="text-zinc-950 dark:text-white shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Submenu Footer Divider & Status (Matching Screenshot 1) */}
                <div className="pt-2 mt-1 border-t border-black/[0.08] dark:border-white/[0.1] px-3 pb-1">
                  <div className="text-[10px] font-semibold tracking-[0.06em] text-zinc-400 dark:text-zinc-500 uppercase leading-none">
                    Mic in use:
                  </div>
                  <div className="text-[11.5px] font-[450] tracking-[-0.008em] text-zinc-700 dark:text-zinc-300 truncate mt-1">
                    {activeMicLabel}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Hairline Divider */}
        <div className="h-[0.5px] bg-black/[0.08] dark:bg-white/[0.1] my-1 mx-1" />

        {/* Item 4: Transcript history */}
        <button
          onClick={() => {
            if (lastTranscript) {
              navigator.clipboard?.writeText(lastTranscript).catch(() => {});
            }
            onClose();
          }}
          className="w-full px-3 py-1.5 rounded-[12px] text-left text-[13px] font-[450] tracking-[-0.011em] flex items-center gap-2.5 hover:bg-black/[0.06] dark:hover:bg-white/[0.12] active:bg-black/[0.09] dark:active:bg-white/[0.16] transition-colors duration-100 cursor-pointer text-zinc-800 dark:text-zinc-100"
        >
          <Clipboard size={15} strokeWidth={1.85} className="text-zinc-500/90 dark:text-zinc-400/90 shrink-0" />
          <span className="leading-snug">Transcript history</span>
        </button>

        {/* Item 5: Paste last transcript */}
        <button
          onClick={() => {
            onPasteTranscript?.();
            onClose();
          }}
          className="w-full px-3 py-1.5 rounded-[12px] text-left text-[13px] font-[450] tracking-[-0.011em] flex items-center gap-2.5 hover:bg-black/[0.06] dark:hover:bg-white/[0.12] active:bg-black/[0.09] dark:active:bg-white/[0.16] transition-colors duration-100 cursor-pointer text-zinc-800 dark:text-zinc-100"
        >
          <ClipboardPaste size={15} strokeWidth={1.85} className="text-zinc-500/90 dark:text-zinc-400/90 shrink-0" />
          <span className="leading-snug">Paste last transcript</span>
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Apple Clean Minimal Language Selector (Inspired by Reference Screenshot 2)
 */
function LanguageSwitcherPopover({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { settings, update } = useVoiceSettings();
  const [isTranslationActive, setIsTranslationActive] = useState(
    settings.languageMode === "translation"
  );
  const [showAllLanguages, setShowAllLanguages] = useState(false);
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

  if (!isOpen) return null;

  const currentLang = settings.language || "en-US";

  // Primary languages (Matching Reference Screenshot 2)
  const primaryLanguages = SUPPORTED_LANGUAGES.slice(0, showAllLanguages ? SUPPORTED_LANGUAGES.length : 6);

  return (
    <AnimatePresence>
      <motion.div
        ref={popoverRef}
        initial={{ opacity: 0, y: 10, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 520, damping: 30 }}
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "SF Pro", system-ui, -apple-system-headline, sans-serif',
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
          textRendering: "optimizeLegibility",
          background: "linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(247, 248, 251, 0.94) 100%)",
          boxShadow: "0 22px 55px -10px rgba(0, 0, 0, 0.26), inset 0 1px 0.5px rgba(255, 255, 255, 0.85), inset 0 -0.5px 0.5px rgba(0, 0, 0, 0.06)",
        }}
        className="dark:!bg-[#151722]/95 fixed bottom-14 left-1/2 -translate-x-1/2 z-[10001] w-64 rounded-[18px] p-1.5 text-zinc-800 dark:text-zinc-100 border border-black/[0.09] dark:border-white/[0.14] backdrop-blur-2xl select-none"
      >
        {/* Language Options List */}
        <div className="space-y-0.5 max-h-64 overflow-y-auto pr-0.5 custom-scrollbar">
          {primaryLanguages.map((lang) => {
            const isSelected = currentLang === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => {
                  update({ language: lang.code, languageMode: isTranslationActive ? "translation" : "direct" });
                  onClose();
                }}
                className="w-full px-3 py-1.5 rounded-[12px] text-left text-[13.5px] font-[450] tracking-[-0.012em] flex items-center justify-between hover:bg-black/[0.06] dark:hover:bg-white/[0.12] active:bg-black/[0.09] dark:active:bg-white/[0.16] transition-colors duration-100 cursor-pointer text-zinc-800 dark:text-zinc-100 group"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className="text-[13px] shrink-0 opacity-80">{lang.flag}</span>
                  <span className={`truncate leading-snug ${isSelected ? "font-[520] text-zinc-950 dark:text-white" : "font-[450]"}`}>
                    {lang.name}
                  </span>
                </div>
                {isSelected && (
                  <Check size={14} strokeWidth={2.2} className="text-zinc-950 dark:text-white shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>

        {/* Hairline Divider (Matching Screenshot 2) */}
        <div className="h-[0.5px] bg-black/[0.08] dark:bg-white/[0.1] my-1 mx-1" />

        {/* Action 1: Live Translation Toggle (Matching Screenshot 2 "Enable all") */}
        <button
          onClick={() => {
            const nextMode = isTranslationActive ? "direct" : "translation";
            setIsTranslationActive(!isTranslationActive);
            update({ languageMode: nextMode });
          }}
          className="w-full px-3 py-1.5 rounded-[12px] text-left text-[13px] font-[450] tracking-[-0.011em] flex items-center justify-between hover:bg-black/[0.06] dark:hover:bg-white/[0.12] active:bg-black/[0.09] dark:active:bg-white/[0.16] transition-colors duration-100 cursor-pointer text-zinc-800 dark:text-zinc-100"
        >
          <div className="flex items-center gap-2.5">
            <ListChecks size={15} strokeWidth={1.85} className="text-zinc-500/90 dark:text-zinc-400/90" />
            <span className="leading-snug">Live translation</span>
          </div>
          <span className={`text-[9.5px] font-semibold tracking-wide px-1.5 py-0.5 rounded-full ${
            isTranslationActive
              ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
              : "bg-black/[0.05] dark:bg-white/[0.08] text-zinc-500 dark:text-zinc-400"
          }`}>
            {isTranslationActive ? "ON" : "OFF"}
          </span>
        </button>

        {/* Action 2: Add more / Expand languages (Matching Screenshot 2 "+ Add more") */}
        <button
          onClick={() => setShowAllLanguages((v) => !v)}
          className="w-full px-3 py-1.5 rounded-[12px] text-left text-[13px] font-[450] tracking-[-0.011em] flex items-center gap-2.5 hover:bg-black/[0.06] dark:hover:bg-white/[0.12] active:bg-black/[0.09] dark:active:bg-white/[0.16] transition-colors duration-100 cursor-pointer text-zinc-800 dark:text-zinc-100"
        >
          <Plus size={15} strokeWidth={1.85} className="text-zinc-500/90 dark:text-zinc-400/90" />
          <span className="leading-snug">{showAllLanguages ? "Show fewer" : "Add more"}</span>
        </button>
      </motion.div>
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
      initial={{ opacity: 0, scale: 0.7, x: 12, filter: "blur(6px)" }}
      animate={{ opacity: 1, scale: 1, x: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.7, x: 8, filter: "blur(6px)" }}
      whileHover={{ scale: 1.08, y: -0.5 }}
      whileTap={{ scale: 0.92, y: 0.5 }}
      transition={{
        type: "spring",
        stiffness: 480,
        damping: 26,
        mass: 0.8,
      }}
      onClick={onClick}
      style={{
        background: isLangOpen
          ? "radial-gradient(120% 120% at 50% 0%, rgba(56, 189, 248, 0.35) 0%, rgba(14, 165, 233, 0.15) 60%, rgba(0, 0, 0, 0.6) 100%), #0D131C"
          : isTranslationMode
          ? "radial-gradient(120% 120% at 50% 0%, rgba(245, 158, 11, 0.35) 0%, rgba(217, 119, 6, 0.15) 60%, rgba(0, 0, 0, 0.6) 100%), #17130D"
          : "radial-gradient(120% 120% at 50% 0%, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.04) 65%, rgba(0, 0, 0, 0.5) 100%), #10121A",
        border: isLangOpen
          ? "1px solid rgba(56, 189, 248, 0.6)"
          : isTranslationMode
          ? "1px solid rgba(245, 158, 11, 0.55)"
          : "1px solid rgba(255, 255, 255, 0.18)",
        boxShadow: isLangOpen
          ? "0 16px 36px rgba(56, 189, 248, 0.35), inset 0 1.5px 1px 0 rgba(255, 255, 255, 0.4)"
          : isTranslationMode
          ? "0 16px 36px rgba(245, 158, 11, 0.35), inset 0 1.5px 1px 0 rgba(255, 255, 255, 0.4)"
          : "0 16px 36px rgba(0, 0, 0, 0.6), inset 0 1.5px 1px 0 rgba(255, 255, 255, 0.35), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.3)",
        backdropFilter: "blur(36px) saturate(190%)",
        WebkitBackdropFilter: "blur(36px) saturate(190%)",
      }}
      className="relative h-9 px-3 rounded-full flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xl shrink-0 select-none overflow-hidden group"
      title={`Language & Translation: ${langLabel} (Click to change)`}
    >
      {/* Specular Liquid Top Sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[45%] rounded-full bg-gradient-to-b from-white/30 via-white/5 to-transparent" />

      {/* Upward Chevron */}
      <ChevronUp
        size={10.5}
        className={cn(
          "stroke-[2.5] transition-colors relative z-10",
          isLangOpen ? "text-sky-300" : isTranslationMode ? "text-amber-300" : "text-white/80"
        )}
      />

      {/* Glass Divider */}
      <div className="w-[1px] h-2.5 bg-white/25 relative z-10" />

      {/* Globe Icon with Liquid Rotation */}
      <motion.div
        animate={isTranslationMode ? { rotate: [0, 15, -15, 0] } : { scale: [1, 1.08, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="flex items-center relative z-10"
      >
        <Globe
          size={12}
          className={cn(
            "transition-colors",
            isTranslationMode ? "text-amber-300" : isLangOpen ? "text-sky-300" : "text-white/90"
          )}
        />
      </motion.div>
    </motion.button>
  );
}

/**
 * Apple Stadium Alert Capsule with 5-second auto-close and visual countdown
 */
interface VoiceAlertCapsuleProps {
  voiceError: string;
  isPermissionError: boolean;
  browserGuidance: string | null;
  onRecover: () => void;
  onDismiss: () => void;
}

function VoiceAlertCapsule({
  voiceError,
  isPermissionError,
  browserGuidance,
  onRecover,
  onDismiss,
}: VoiceAlertCapsuleProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(5);

  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isHovered, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.92 }}
      transition={{
        type: "spring",
        stiffness: 480,
        damping: 28,
        mass: 0.8,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "SF Pro", system-ui, -apple-system-headline, sans-serif',
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        textRendering: "optimizeLegibility",
        background: isPermissionError
          ? "linear-gradient(180deg, rgba(255, 255, 255, 0.65) 0%, rgba(255, 255, 255, 0.25) 40%, rgba(0, 0, 0, 0.04) 100%), #FDE8D3"
          : "linear-gradient(180deg, rgba(255, 255, 255, 0.65) 0%, rgba(255, 255, 255, 0.25) 40%, rgba(0, 0, 0, 0.04) 100%), #F3C3B2",
        boxShadow: isPermissionError
          ? "0 20px 48px -8px rgba(215, 150, 110, 0.45), 0 8px 20px rgba(0, 0, 0, 0.1), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.85), inset 0 -1.5px 2px rgba(0, 0, 0, 0.08)"
          : "0 20px 48px -8px rgba(195, 105, 90, 0.48), 0 8px 20px rgba(0, 0, 0, 0.1), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.85), inset 0 -1.5px 2px rgba(0, 0, 0, 0.08)",
        border: "1px solid rgba(255, 255, 255, 0.75)",
        backdropFilter: "blur(32px) saturate(190%)",
        WebkitBackdropFilter: "blur(32px) saturate(190%)",
      }}
      className="overflow-hidden absolute bottom-12 left-1/2 z-[10001] -translate-x-1/2 rounded-full py-2.5 px-4 text-[#2D1B16] flex items-center gap-3.5 max-w-[calc(100vw-24px)] select-none pointer-events-auto shadow-2xl"
      role="alert"
    >
      {/* Ambient Glowing Status Badge */}
      <div
        className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isPermissionError
            ? "bg-amber-700/15 text-amber-900 border border-amber-700/25"
            : "bg-rose-700/15 text-rose-900 border border-rose-700/25"
        } shadow-inner`}
      >
        <AlertCircle size={15} strokeWidth={2.3} />
        <div
          className={`absolute inset-0 rounded-full ${
            isPermissionError ? "bg-amber-600/20" : "bg-rose-600/20"
          } animate-ping opacity-50`}
        />
      </div>

      {/* Title & Info Description Text with Countdown Display */}
      <div className="min-w-0 pr-1">
        <div className="flex items-center gap-2">
          <span className="text-[12.5px] font-[600] text-[#2A1713] tracking-[-0.015em] leading-tight">
            {isPermissionError
              ? "Microphone Access Needed"
              : browserGuidance
              ? "Browser Dictation Unavailable"
              : "Voice Typing Paused"}
          </span>
          {/* Subtle Countdown Indicator Pill */}
          <span className="text-[9.5px] font-[600] tracking-tight px-1.5 py-0.5 rounded-full bg-black/8 text-[#2A1713]/80 tabular-nums">
            {secondsLeft}s
          </span>
        </div>
        <p className="text-[11px] text-[#5A3A32] font-[450] tracking-[-0.006em] leading-tight mt-0.5 whitespace-nowrap">
          {browserGuidance ||
            (voiceError.includes("aborted")
              ? "Tap retry to resume speaking"
              : voiceError)}
        </p>
      </div>

      {/* Sleek Apple Glass Icon Actions */}
      <div className="flex items-center gap-1.5 shrink-0 pl-2.5 border-l border-black/10">
        {/* Retry Icon Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onRecover();
          }}
          title={isPermissionError ? "Allow microphone & retry" : "Try again"}
          className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/8 hover:bg-black/15 active:scale-95 text-[#2A1713] border border-black/10 transition-all duration-200 cursor-pointer shadow-xs hover:scale-105"
        >
          <RefreshCw size={13} strokeWidth={2.5} />
        </button>

        {/* Dismiss Icon Button with Animated Circular Countdown Ring */}
        <div className="relative flex h-8 w-8 items-center justify-center">
          <svg className="w-8 h-8 -rotate-90 pointer-events-none absolute inset-0" viewBox="0 0 32 32">
            <circle
              cx="16"
              cy="16"
              r="13"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              opacity="0.12"
              className="text-[#2A1713]"
            />
            <motion.circle
              cx="16"
              cy="16"
              r="13"
              stroke="currentColor"
              strokeWidth="1.6"
              fill="none"
              strokeDasharray="81.68"
              initial={{ strokeDashoffset: 0 }}
              animate={{ strokeDashoffset: 81.68 }}
              transition={{ duration: 5, ease: "linear" }}
              strokeLinecap="round"
              className="text-[#2A1713]/60"
            />
          </svg>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onDismiss();
            }}
            title="Dismiss"
            className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/5 hover:bg-black/12 active:scale-95 text-[#5A3A32] hover:text-[#2A1713] border border-black/8 transition-all duration-200 cursor-pointer hover:scale-105"
          >
            <X size={12} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* Smooth 5-Second Hairline Progress Bar Along the Bottom */}
      <div className="absolute bottom-0 inset-x-5 h-[1.5px] overflow-hidden rounded-full bg-black/[0.08]">
        <motion.div
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: 5, ease: "linear" }}
          style={{ originX: 0 }}
          className="h-full w-full bg-[#2A1713]/40 rounded-full"
        />
      </div>
    </motion.div>
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
  const {
    isListening,
    toggle,
    start,
    stop,
    error,
    connectionState,
    requestMicPermissionAgain,
    clearError,
    setAgentMode: setAgentModeCtrl,
    getAgentMode,
  } = useVoiceController({ onStart, onStop, onTranscript, onError }) as any;
  const { settings } = useVoiceSettings();

  const [mins, setMins] = useState("00");
  const [secs, setSecs] = useState("00");
  const [agentMode, setAgentMode] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [isErrorDismissed, setIsErrorDismissed] = useState(false);

  // When a new error occurs or mic state changes, allow the alert to show
  useEffect(() => {
    if (error || connectionState === "needs_attention") {
      setIsErrorDismissed(false);
    }
  }, [error, connectionState]);

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

  const rawVoiceError = error?.message || (connectionState === "needs_attention"
    ? "Voice typing needs your attention."
    : "");
  const voiceError = !isErrorDismissed ? rawVoiceError : "";

  const isPermissionError = /permission|microphone|not-allowed|denied/i.test(voiceError);
  const browserReadiness = !isDesktop() ? getWebVoiceReadiness() : null;
  const browserGuidance = browserReadiness && !browserReadiness.ready ? browserReadiness.message : null;

  const handleDismissError = () => {
    setIsErrorDismissed(true);
    clearError?.();
    globalVoiceController.clearError();
  };

  const recoverVoice = async () => {
    setIsErrorDismissed(true);
    clearError?.();
    globalVoiceController.clearError();
    if (isPermissionError && requestMicPermissionAgain) {
      const granted = await requestMicPermissionAgain();
      if (granted) {
        start();
        return;
      }
    }
    start();
  };

  return (
    <div
      data-voice-pill
      onContextMenu={(e) => {
        e.preventDefault();
        setIsContextMenuOpen(true);
      }}
      className={cn("fixed z-[9999] pointer-events-auto select-none", posClasses)}
    >
      {/* Apple Dynamic Island Language & Translation Popover Modal */}
      <LanguageSwitcherPopover isOpen={isLangOpen} onClose={() => setIsLangOpen(false)} />

      {/* Apple macOS-Grade Voice Context Menu (Right Click or Options) */}
      <VoiceContextMenu
        isOpen={isContextMenuOpen}
        onClose={() => setIsContextMenuOpen(false)}
        lastTranscript={lastTranscript}
        onOpenSettings={() => {
          window.dispatchEvent(new CustomEvent("noska:open-settings", { detail: { tab: "voice" } }));
        }}
        onPasteTranscript={() => {
          if (lastTranscript) {
            import("../../lib/voice/active-input").then(({ streamTextIntoActiveInput }) => {
              streamTextIntoActiveInput(lastTranscript);
            }).catch(() => {});
          }
        }}
      />

      <AnimatePresence>
        {voiceError && !isListening && (
          <VoiceAlertCapsule
            key={voiceError}
            voiceError={voiceError}
            isPermissionError={isPermissionError}
            browserGuidance={browserGuidance}
            onRecover={recoverVoice}
            onDismiss={handleDismissError}
          />
        )}
      </AnimatePresence>

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
                stiffness: 480,
                damping: 26,
                mass: 0.8,
              }}
              style={{
                background: "radial-gradient(120% 120% at 50% 0%, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.04) 65%, rgba(0, 0, 0, 0.55) 100%), #10121A",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                boxShadow: "0 20px 48px -8px rgba(0, 0, 0, 0.75), inset 0 1.5px 1px 0 rgba(255, 255, 255, 0.38), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.35)",
                backdropFilter: "blur(36px) saturate(190%)",
                WebkitBackdropFilter: "blur(36px) saturate(190%)",
              }}
              className="relative flex items-center gap-3 h-9 px-3.5 rounded-full transition-all duration-300 overflow-hidden shadow-2xl shrink-0 select-none"
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

              {/* Left Stop Squircle */}
              <motion.button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={stop}
                whileHover={{ scale: 1.18, rotate: [0, -4, 4, 0] }}
                whileTap={{ scale: 0.85 }}
                transition={{ type: "spring", stiffness: 600, damping: 22 }}
                className="w-4 h-4 rounded-[4.5px] flex-shrink-0 cursor-pointer transition-colors relative flex items-center justify-center z-10 shadow-sm bg-white hover:bg-white shadow-[0_0_12px_rgba(255,255,255,0.9),0_0_20px_rgba(255,255,255,0.4)]"
                aria-label="Stop voice typing"
                title="Click to stop recording"
              >
                <span className="w-1.5 h-1.5 rounded-[1px] bg-black/75" />
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
              <div className="relative z-10 font-mono text-[12px] font-semibold text-white tracking-wider">
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
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              layoutId="apple-dynamic-island-agent-btn"
              initial={{ opacity: 0, scale: 0.7, x: -12, filter: "blur(6px)" }}
              animate={{ opacity: 1, scale: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.7, x: -8, filter: "blur(6px)" }}
              whileHover={{ scale: 1.12, y: -0.5 }}
              whileTap={{ scale: 0.9, y: 0.5 }}
              transition={{
                type: "spring",
                stiffness: 480,
                damping: 26,
                mass: 0.8,
              }}
              onClick={(e) => {
                e.stopPropagation();
                const next = !agentMode;
                setAgentMode(next);
                setAgentModeCtrl(next);
              }}
              style={{
                background: agentMode
                  ? "radial-gradient(120% 120% at 50% 0%, rgba(16, 185, 129, 0.35) 0%, rgba(5, 150, 105, 0.15) 60%, rgba(0, 0, 0, 0.6) 100%), #0D1612"
                  : "radial-gradient(120% 120% at 50% 0%, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.04) 65%, rgba(0, 0, 0, 0.5) 100%), #10121A",
                border: agentMode ? "1px solid rgba(16, 185, 129, 0.55)" : "1px solid rgba(255, 255, 255, 0.18)",
                boxShadow: agentMode
                  ? "0 16px 36px rgba(16, 185, 129, 0.35), inset 0 1.5px 1px 0 rgba(255, 255, 255, 0.4)"
                  : "0 16px 36px rgba(0, 0, 0, 0.6), inset 0 1.5px 1px 0 rgba(255, 255, 255, 0.35), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.3)",
                backdropFilter: "blur(36px) saturate(190%)",
                WebkitBackdropFilter: "blur(36px) saturate(190%)",
              }}
              className="relative w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-colors shadow-2xl shrink-0 overflow-hidden group select-none"
              title={agentMode ? "Agent Mode: ON (Click to toggle)" : "Agent Mode: OFF (Click to toggle)"}
            >
              {/* Specular Liquid Top Sheen */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[45%] rounded-full bg-gradient-to-b from-white/30 via-white/5 to-transparent" />

              <div className="relative z-10 flex items-center justify-center">
                <ActivityRing
                  isListening={isListening}
                  color={agentMode ? "#10b981" : "#ffffff"}
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
