"use client";

import React, { useEffect, useRef, useState } from "react";
import { Mic, Globe, ChevronUp, ChevronDown, Sparkles, ArrowRight, Check, X, AlertCircle, RefreshCw, Clock, Settings, ChevronRight, Clipboard, ClipboardPaste, Plus, ListChecks, Languages, Square, Bot, Activity } from "lucide-react";
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
import { SiriWave } from "./siri-wave";

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
  apple_intelligence_orb: {
    bg: "bg-[#09090d]/98 backdrop-blur-3xl",
    border: "border-white/25",
    glow: "shadow-[0_20px_60px_rgba(0,0,0,0.95),inset_0_1.5px_2px_rgba(255,255,255,0.55),inset_0_-1.5px_2px_rgba(0,0,0,0.8)] ring-1 ring-white/15",
  },
  siri_glow_orb: {
    bg: "bg-[#050508]/98 backdrop-blur-3xl",
    border: "border-fuchsia-400/35",
    glow: "shadow-[0_0_35px_rgba(236,72,153,0.35),0_16px_50px_rgba(0,0,0,0.95),inset_0_1.5px_2px_rgba(255,255,255,0.6)] ring-1 ring-fuchsia-400/25",
  },
  vision_spatial_glass: {
    bg: "bg-white/[0.08] backdrop-blur-3xl",
    border: "border-white/40",
    glow: "shadow-[0_20px_60px_rgba(0,0,0,0.5),inset_0_2px_3px_rgba(255,255,255,0.7),inset_0_-2px_3px_rgba(255,255,255,0.15)] ring-1 ring-white/20",
  },
  solar_ember_orb: {
    bg: "bg-[#140b08]/98 backdrop-blur-3xl",
    border: "border-amber-500/35",
    glow: "shadow-[0_0_35px_rgba(245,158,11,0.35),0_16px_50px_rgba(0,0,0,0.95),inset_0_1.5px_2px_rgba(255,255,255,0.55)] ring-1 ring-amber-500/25",
  },
  cyber_matrix_orb: {
    bg: "bg-[#060e1c]/98 backdrop-blur-3xl",
    border: "border-sky-400/35",
    glow: "shadow-[0_0_35px_rgba(14,165,233,0.4),0_16px_50px_rgba(0,0,0,0.95),inset_0_1.5px_2px_rgba(255,255,255,0.55)] ring-1 ring-sky-400/25",
  },
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
 * Apple Intelligence Liquid Glass Sphere / Siri Iridescent Orb
 * Real-time voice frequency reactive liquid glass visualizer with obsidian dome,
 * chromatic fluid Bezier wave flares modulated by microphone FFT bands,
 * and dual embedded control pods (Deep Navy + Glossy White with live reactive audio arcs).
 */
export function AppleIntelligenceOrb({
  isListening,
  onToggle,
  onStop,
  onClose,
  agentMode,
  onToggleAgentMode,
  onToggleTranslate,
  isTranslationMode,
  langLabel,
  variant = "aurora",
  size = "md",
  className,
}: {
  isListening: boolean;
  onToggle?: () => void;
  onStop?: () => void;
  onClose?: () => void;
  agentMode?: boolean;
  onToggleAgentMode?: () => void;
  onToggleTranslate?: () => void;
  isTranslationMode?: boolean;
  langLabel?: string;
  variant?: "aurora" | "siri_glow" | "vision_spatial" | "solar_ember" | "cyber_matrix";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const orbDimensions =
    size === "sm"
      ? "w-[84px] h-[58px] rounded-[28px]"
      : size === "lg"
        ? "w-[140px] h-[98px] rounded-[46px]"
        : "w-[110px] h-[78px] rounded-[38px]";

  // Real-time audio frequency animation references
  const podBar1Ref = useRef<HTMLSpanElement | null>(null);
  const podBar2Ref = useRef<HTMLSpanElement | null>(null);
  const podBar3Ref = useRef<HTMLSpanElement | null>(null);

  // Smooth smoothed values for physics
  const smoothedAudio = useRef({
    bass: 0.05,
    mid: 0.05,
    treble: 0.05,
    peak: 0.05,
  });

  useEffect(() => {
    let animId: number;

    const updateWave = () => {
      const freqs = globalVoiceController.getLiveFrequencyBands(16);

      // Extract frequency band energies
      let rawBass = (freqs[0] + freqs[1] + freqs[2]) / 3;
      let rawMid = (freqs[3] + freqs[4] + freqs[5] + freqs[6]) / 4;
      let rawTreble = (freqs[7] + freqs[8] + freqs[9] + freqs[10]) / 4;
      let rawPeak = Math.max(...freqs);

      if (!isListening) {
        rawBass = 0.04;
        rawMid = 0.04;
        rawTreble = 0.04;
        rawPeak = 0.04;
      }

      // Smooth interpolation for fluid liquid physics
      const s = smoothedAudio.current;
      s.bass += (rawBass - s.bass) * 0.35;
      s.mid += (rawMid - s.mid) * 0.35;
      s.treble += (rawTreble - s.treble) * 0.35;
      s.peak += (rawPeak - s.peak) * 0.4;

      // Reactive Audio Wave Arcs inside Right White Control Pod
      if (podBar1Ref.current) {
        const h1 = isListening ? Math.min(12, Math.max(4, s.bass * 16 + 4)) : 5;
        podBar1Ref.current.style.height = `${h1.toFixed(1)}px`;
      }
      if (podBar2Ref.current) {
        const h2 = isListening ? Math.min(15, Math.max(7, s.peak * 20 + 7)) : 9;
        podBar2Ref.current.style.height = `${h2.toFixed(1)}px`;
      }
      if (podBar3Ref.current) {
        const h3 = isListening ? Math.min(11, Math.max(3.5, s.treble * 15 + 3.5)) : 4.5;
        podBar3Ref.current.style.height = `${h3.toFixed(1)}px`;
      }

      animId = requestAnimationFrame(updateWave);
    };

    animId = requestAnimationFrame(updateWave);
    return () => cancelAnimationFrame(animId);
  }, [isListening]);

  // Ambient outer glow halo
  const glowGradient =
    variant === "siri_glow"
      ? "from-fuchsia-500/50 via-purple-500/40 to-sky-400/50"
      : variant === "vision_spatial"
        ? "from-sky-300/40 via-teal-300/30 to-white/40"
        : variant === "solar_ember"
          ? "from-amber-500/50 via-orange-500/40 to-rose-500/50"
          : variant === "cyber_matrix"
            ? "from-cyan-500/50 via-blue-500/40 to-indigo-500/50"
            : "from-cyan-500/45 via-fuchsia-500/40 to-sky-500/45";

  return (
    <div className={cn("relative flex flex-col items-center justify-center select-none group", className)}>
      {/* Outer Ambient Glow Reflection */}
      <motion.div
        animate={{
          scale: isListening ? [1, 1.15, 0.98, 1.12, 1] : [1, 1.05, 1],
          opacity: isListening ? [0.7, 0.95, 0.75, 0.9, 0.7] : [0.35, 0.55, 0.35],
        }}
        transition={{
          duration: isListening ? 2.2 : 4.0,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className={cn("absolute -inset-3 rounded-[38px] bg-gradient-to-tr blur-lg pointer-events-none", glowGradient)}
      />

      {/* Main 3D Liquid Glass Sphere / Dome Container */}
      <div
        className={cn(
          "relative overflow-hidden backdrop-blur-3xl transition-transform border select-none",
          variant === "vision_spatial"
            ? "border-white/50 shadow-[0_20px_48px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(255,255,255,0.25)]"
            : variant === "siri_glow"
              ? "border-fuchsia-400/45 shadow-[0_20px_48px_rgba(0,0,0,0.95),inset_0_2px_4px_rgba(255,255,255,0.85),inset_0_-2px_4px_rgba(0,0,0,0.9)] ring-1 ring-fuchsia-400/35"
              : "border-white/40 shadow-[0_20px_48px_rgba(0,0,0,0.95),inset_0_2px_4px_rgba(255,255,255,0.8),inset_0_-2px_4px_rgba(0,0,0,0.9)] ring-1 ring-white/15",
          orbDimensions
        )}
        style={{
          background:
            variant === "vision_spatial"
              ? "radial-gradient(ellipse at 50% 25%, rgba(255,255,255,0.22) 0%, rgba(230,240,255,0.1) 45%, rgba(8,12,22,0.92) 100%)"
              : variant === "solar_ember"
                ? "radial-gradient(ellipse at 50% 25%, #2a140a 0%, #150804 45%, #050201 100%)"
                : variant === "cyber_matrix"
                  ? "radial-gradient(ellipse at 50% 25%, #0c213d 0%, #06101f 45%, #01040a 100%)"
                  : "radial-gradient(ellipse at 50% 20%, #1a1a24 0%, #0d0d14 45%, #030306 100%)",
        }}
      >
        {/* Subtle Upper-Right Ambient Lens Glint */}
        <div className="pointer-events-none absolute top-1.5 right-3 w-3 h-3 rounded-full bg-blue-500/25 blur-[2px]" />

        {/* Top Liquid Lens Specular Sheen (Fresnel curvature highlight) */}
        <div className="pointer-events-none absolute inset-x-2 top-0.5 h-[36%] rounded-t-[34px] bg-gradient-to-b from-white/80 via-white/15 to-transparent blur-[0.2px] z-10" />

        {/* Middle Siri Chromatic Flare Horizon (Authentic GLSL WebGL Siri Wave) */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-x-0 top-0 bottom-[16%] flex items-center justify-center mix-blend-screen scale-105">
            <SiriWave
              variant="wave"
              renderScale={1.0}
              className="bg-transparent rounded-none pointer-events-none w-full h-full object-cover"
            />
          </div>
        </div>

        {/* 3 Circular Ergonomic Bottom Action Buttons: Translate | AI Mode | Mic / Stop */}
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-2 z-40 pointer-events-auto"
        >
          {/* 1. Left Circle: Translate / Language Glass Droplet */}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onToggleTranslate?.();
            }}
            className={cn(
              "w-5 h-5 rounded-full border backdrop-blur-2xl flex items-center justify-center shadow-inner overflow-hidden relative cursor-pointer transition-all duration-150 hover:scale-110 active:scale-90 appearance-none outline-none group/btn z-40",
              isTranslationMode
                ? "bg-sky-500/35 border-sky-400/70 shadow-[0_0_12px_rgba(56,189,248,0.5)]"
                : variant === "solar_ember"
                  ? "bg-amber-950/85 border-amber-400/40 hover:bg-amber-900/95"
                  : variant === "cyber_matrix"
                    ? "bg-[#061830]/90 border-sky-400/45 hover:bg-[#0a2345]/95"
                    : variant === "vision_spatial"
                      ? "bg-white/25 border-white/60 hover:bg-white/35"
                      : "bg-[#08223f]/90 border-sky-400/40 hover:bg-[#0c2e56]/95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]"
            )}
            title={isTranslationMode ? "Translate Mode: ON (Translating into English)" : `Language / Translate (${langLabel || "Auto"})`}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[45%] rounded-full bg-gradient-to-b from-white/30 to-transparent" />
            <Languages size={8.5} className={isTranslationMode ? "text-cyan-300 animate-pulse" : "text-sky-300 group-hover/btn:text-white"} />
          </button>

          {/* 2. Middle Circle: AI Mode Obsidian Glass Droplet */}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onToggleAgentMode?.();
            }}
            className={cn(
              "w-5 h-5 rounded-full border backdrop-blur-2xl flex items-center justify-center shadow-inner overflow-hidden relative cursor-pointer transition-all duration-150 hover:scale-110 active:scale-90 appearance-none outline-none group/btn z-40",
              agentMode
                ? "bg-emerald-950/95 border-emerald-400/70 shadow-[0_0_14px_rgba(16,185,129,0.5)]"
                : "bg-black/65 border-white/25 text-white/80 hover:bg-white/20"
            )}
            title={agentMode ? "AI Agent Mode: ON (Spoken commands execute AI actions)" : "Switch to AI Agent Mode"}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[45%] rounded-full bg-gradient-to-b from-white/25 to-transparent" />
            <Sparkles size={8.5} className={agentMode ? "text-emerald-400 fill-emerald-400/40 animate-pulse" : "text-white/75 group-hover/btn:text-white"} />
          </button>

          {/* 3. Right Circle: Glossy Ceramic White Record / Stop Button */}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (isListening) {
                try { onStop?.(); } catch { }
                try { onClose?.(); } catch { }
                try { onToggle?.(); } catch { }
                globalVoiceController.stop();
              } else {
                try { onToggle?.(); } catch { }
              }
            }}
            className="w-6 h-6 rounded-full bg-white border border-white/95 shadow-[0_3px_10px_rgba(0,0,0,0.5),0_2px_6px_rgba(255,255,255,0.4),inset_0_-1px_1.5px_rgba(0,0,0,0.12)] flex items-center justify-center cursor-pointer hover:scale-110 active:scale-90 transition-all duration-150 overflow-hidden relative group/rec appearance-none outline-none z-40"
            title={isListening ? "Stop Voice Recording" : "Start Voice Recording"}
            aria-label={isListening ? "Stop Voice Recording" : "Start Voice Recording"}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[45%] rounded-full bg-gradient-to-b from-white via-white/80 to-transparent" />

            {isListening ? (
              /* High-Visibility Red Stop Square */
              <div className="flex items-center justify-center relative z-10 text-[#ff3b30]">
                <Square size={7.5} className="fill-[#ff3b30] text-[#ff3b30] rounded-[1px] drop-shadow-[0_1px_2px_rgba(255,59,48,0.35)]" />
              </div>
            ) : (
              /* Standby / Mic State Audio Indicator */
              <div className="flex items-center gap-[1.4px] relative z-10 text-[#ff3b30] h-3 justify-center">
                <span
                  ref={podBar1Ref}
                  className="w-[1.4px] h-[3px] rounded-full bg-[#ff3b30] transition-[height] duration-75"
                />
                <span
                  ref={podBar2Ref}
                  className="w-[1.6px] h-[6.5px] rounded-full bg-[#ff3b30] transition-[height] duration-75"
                />
                <span
                  ref={podBar3Ref}
                  className="w-[1.4px] h-[3px] rounded-full bg-[#ff3b30] transition-[height] duration-75"
                />
              </div>
            )}
          </button>
        </div>
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

  const barCount = activeStyle === "dense_24" ? 12 : activeStyle === "minimal_pulse" ? 3 : 6;
  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const currentHeightsRef = useRef<number[]>(new Array(16).fill(2));

  useEffect(() => {
    let animId: number;

    const render = () => {
      const freqs = globalVoiceController.getLiveFrequencyBands(barCount);
      const time = performance.now() * 0.004;

      for (let i = 0; i < barCount; i++) {
        const barEl = barsRef.current[i];
        if (!barEl) continue;

        let targetH = 2;

        if (activeStyle === "minimal_pulse") {
          const minD = 2.5;
          const maxD = 8;
          const raw = freqs[i] || 0.08;
          const pulse = (Math.sin(time * 4 + i * 1.2) * 0.5 + 0.5) * 2.5;
          targetH = Math.max(minD, Math.min(maxD, isListening ? raw * 12 + minD : minD + pulse));
        } else if (activeStyle === "dynamic_dots") {
          const minD = 2;
          const maxD = 3.5;
          const raw = freqs[i] || 0.05;
          const pulse = (Math.sin(time * 5 + i * 0.8) * 0.5 + 0.5) * 1;
          targetH = Math.max(minD, Math.min(maxD, isListening ? raw * 3 + minD + pulse : minD));
        } else if (activeStyle === "siri_aurora_ribbon" || activeStyle === "chromatic_vortex" || activeStyle === "siri_ios18_glow") {
          const minH = 2.5;
          const maxH = 9.5;
          const raw = freqs[i] || 0.06;
          const wave = Math.sin(time * 6 + i * 0.9) * 0.5 + 0.5;
          targetH = Math.max(minH, Math.min(maxH, isListening ? raw * 11 + minH + wave * 2.5 : minH + wave));
        } else {
          const minH = 2;
          const maxH = 10;

          if (isListening) {
            const rawFreq = freqs[i] || 0.04;
            const ambient = (Math.sin(time * 4.0 + i * 0.6) * 0.5 + 0.5) * 1.2;
            const voiceH = minH + rawFreq * (maxH - minH) * 1.3 * (settings.sensitivityBoost / 2.5);
            targetH = Math.max(minH, Math.min(maxH, rawFreq > 0.08 ? voiceH : minH + ambient));
          } else {
            targetH = minH;
          }
        }

        const prev = currentHeightsRef.current[i] || 2;
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
            barEl.style.opacity = `${Math.min(1, 0.5 + (next / 3.5) * 0.5)}`;
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

  if (activeStyle === "siri_aurora_ribbon" || activeStyle === "chromatic_vortex") {
    return (
      <div className={cn("flex items-center gap-[2px] h-3.5 px-0.5", className)}>
        {[...Array(6)].map((_, i) => (
          <span
            key={i}
            ref={(el) => {
              barsRef.current[i] = el;
            }}
            className={cn(
              "rounded-full flex-shrink-0 transition-all shadow-[0_0_6px_rgba(0,240,255,0.6)]",
              i % 3 === 0
                ? "bg-gradient-to-t from-cyan-400 to-sky-200"
                : i % 3 === 1
                  ? "bg-gradient-to-t from-fuchsia-400 to-pink-200"
                  : "bg-gradient-to-t from-purple-400 to-indigo-200"
            )}
            style={{ width: "2px", height: "2.5px" }}
          />
        ))}
      </div>
    );
  }

  if (activeStyle === "siri_ios18_glow") {
    return (
      <div className={cn("flex items-center gap-[2.5px] h-3.5 px-0.5", className)}>
        {[...Array(6)].map((_, i) => (
          <span
            key={i}
            ref={(el) => {
              barsRef.current[i] = el;
            }}
            className={cn(
              "rounded-full flex-shrink-0 transition-all",
              i % 2 === 0
                ? "bg-gradient-to-t from-cyan-400 via-white to-sky-300 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                : "bg-gradient-to-t from-fuchsia-500 via-white to-purple-300 shadow-[0_0_8px_rgba(217,70,239,0.8)]"
            )}
            style={{ width: "2px", height: "2.5px" }}
          />
        ))}
      </div>
    );
  }

  if (activeStyle === "dynamic_dots") {
    return (
      <div className={cn("flex items-center gap-[2px] h-3.5 px-0.5", className)}>
        {[...Array(6)].map((_, i) => (
          <span
            key={i}
            ref={(el) => {
              barsRef.current[i] = el;
            }}
            className={cn(
              "rounded-full flex-shrink-0 transition-all",
              BAR_COLOR_CLASSES[activeColor] || "bg-white"
            )}
            style={{ width: "2px", height: "2px" }}
          />
        ))}
      </div>
    );
  }

  if (activeStyle === "minimal_pulse") {
    return (
      <div className={cn("flex items-center gap-1 h-3.5 px-0.5", className)}>
        {[...Array(3)].map((_, i) => (
          <span
            key={i}
            ref={(el) => {
              barsRef.current[i] = el;
            }}
            className={cn("rounded-full flex-shrink-0 transition-all duration-100", BAR_COLOR_CLASSES[activeColor] || "bg-white")}
            style={{ width: "3px", height: "3px" }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-[1.5px] h-3.5 px-0.5", className)}>
      {[...Array(barCount)].map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            barsRef.current[i] = el;
          }}
          className={cn(
            "rounded-full flex-shrink-0 transition-opacity duration-150",
            BAR_COLOR_CLASSES[activeColor] || "bg-white",
            activeStyle === "dense_24" ? "w-[1.2px]" : "w-[1.8px]"
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
      <div className="flex items-center font-mono text-[10.5px] font-bold tracking-tight select-none leading-none">
        <span className="text-sky-300">{mins}</span>
        <span className="text-white/30 px-[1px]">:</span>
        <span className="text-amber-300">{secs}</span>
      </div>
    );
  }
  if (timerTheme === "monochrome") {
    return (
      <div className="flex items-center font-mono text-[10.5px] font-bold tracking-tight select-none leading-none text-white">
        {mins}:{secs}
      </div>
    );
  }
  if (timerTheme === "sunset") {
    return (
      <div className="flex items-center font-mono text-[10.5px] font-bold tracking-tight select-none leading-none">
        <span className="text-rose-400">{mins}</span>
        <span className="text-white/30 px-[1px]">:</span>
        <span className="text-orange-300">{secs}</span>
      </div>
    );
  }
  if (timerTheme === "neon_green") {
    return (
      <div className="flex items-center font-mono text-[10.5px] font-bold tracking-tight select-none leading-none">
        <span className="text-emerald-400">{mins}</span>
        <span className="text-white/30 px-[1px]">:</span>
        <span className="text-emerald-300">{secs}</span>
      </div>
    );
  }

  // Dual tone clean Apple font
  return (
    <div className="flex items-center font-mono text-[10.5px] font-bold tracking-tight select-none leading-none text-white/95">
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
        }).catch(() => { });
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
              navigator.clipboard?.writeText(lastTranscript).catch(() => { });
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
 * Apple Circular Rotary Arc Dial Language Selector
 * Features a circular arc wheel with tangent rotating numbers/languages responsive to scrolling & touch gestures
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
  const popoverRef = useRef<HTMLDivElement>(null);

  // Initialize selected index based on saved settings
  const languages = SUPPORTED_LANGUAGES;
  const initialIndex = Math.max(
    0,
    languages.findIndex((l) => l.code === (settings.language || "en-US"))
  );
  const [scrollIndex, setScrollIndex] = useState(initialIndex >= 0 ? initialIndex : 1);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartIndex = useRef(0);

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

  const activeLang = languages[Math.round(scrollIndex)] || languages[0];

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY;
    setScrollIndex((prev) => {
      const next = prev + (delta > 0 ? 0.4 : -0.4);
      return Math.max(0, Math.min(languages.length - 1, next));
    });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartIndex.current = scrollIndex;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dy = e.clientY - dragStartY.current;
    const indexDelta = -dy * 0.025;
    const next = Math.max(0, Math.min(languages.length - 1, dragStartIndex.current + indexDelta));
    setScrollIndex(next);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    // Snap cleanly to nearest integer
    setScrollIndex((prev) => Math.round(prev));
  };

  const selectLanguage = (idx: number) => {
    setScrollIndex(idx);
    const target = languages[idx];
    if (target) {
      update({
        language: target.code,
        languageMode: isTranslationActive ? "translation" : "direct",
      });
    }
  };

  const applyAndClose = () => {
    const target = languages[Math.round(scrollIndex)] || languages[0];
    update({
      language: target.code,
      languageMode: isTranslationActive ? "translation" : "direct",
    });
    onClose();
  };

  // Radial Geometry parameters:
  const R = 145;
  const cx = -35;
  const cy = 95;
  const stepAngleDeg = 24;

  return (
    <AnimatePresence>
      <motion.div
        ref={popoverRef}
        initial={{
          opacity: 0,
          scale: 0.3,
          y: 20,
          filter: "blur(14px)",
          borderRadius: "36px",
        }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
          filter: "blur(0px)",
          borderRadius: "26px",
        }}
        exit={{
          opacity: 0,
          scale: 0.35,
          y: 16,
          filter: "blur(12px)",
          borderRadius: "36px",
        }}
        transition={{
          type: "spring",
          stiffness: 480,
          damping: 28,
          mass: 0.85,
        }}
        onWheel={handleWheel}
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "SF Pro", system-ui, -apple-system-headline, sans-serif',
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
          textRendering: "optimizeLegibility",
          transformOrigin: "bottom center",
        }}
        className={cn(
          "fixed bottom-14 left-1/2 -translate-x-1/2 z-[10001] w-[325px] h-[305px] rounded-[26px] p-3 text-zinc-800 dark:text-zinc-100 select-none overflow-hidden backdrop-blur-3xl border transition-all flex flex-col justify-between",
          "bg-[#faf8f5]/95 dark:bg-[#12141c]/95 border-black/[0.08] dark:border-white/[0.12]",
          "shadow-[0_24px_65px_-10px_rgba(0,0,0,0.25),0_1px_1.5px_rgba(255,255,255,0.9)_inset,0_0_0_1px_rgba(0,0,0,0.04)] dark:shadow-[0_28px_70px_-10px_rgba(0,0,0,0.8),0_1px_1.5px_rgba(255,255,255,0.18)_inset,0_0_0_1px_rgba(255,255,255,0.08)]"
        )}
      >
        {/* Top Header: Title & Hint */}
        <div className="flex items-center justify-between px-2 pt-0.5 z-20">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
            <span className="text-[11px] font-[650] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Rotary Dial
            </span>
          </div>
          <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
            Scroll or drag to rotate
          </span>
        </div>

        {/* Circular Wheel Dial Area */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="relative flex-1 w-full h-[185px] overflow-hidden cursor-grab active:cursor-grabbing select-none"
        >
          {/* Circular SVG Arc Guide Line */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            <circle
              cx={cx}
              cy={cy}
              r={R}
              fill="none"
              stroke="currentColor"
              className="text-black/[0.14] dark:text-white/[0.16]"
              strokeWidth="1.2"
              strokeDasharray="3 3"
            />
          </svg>

          {/* Tangential Items Positioned Along the Circular Arc */}
          {languages.map((lang, idx) => {
            const diff = idx - scrollIndex;
            // Only render items within visible angular arc window
            if (Math.abs(diff) > 3.2) return null;

            const angleDeg = diff * stepAngleDeg;
            const angleRad = (angleDeg * Math.PI) / 180;
            const x = cx + Math.cos(angleRad) * R;
            const y = cy + Math.sin(angleRad) * R;
            const absDiff = Math.abs(diff);
            const isCenter = absDiff < 0.45;
            const opacity = Math.max(0.15, 1 - absDiff * 0.32);
            const scale = Math.max(0.72, 1.08 - absDiff * 0.12);
            const numStr = String(idx).padStart(2, "0");

            return (
              <motion.div
                key={lang.code}
                onClick={() => selectLanguage(idx)}
                style={{
                  position: "absolute",
                  left: `${x}px`,
                  top: `${y}px`,
                  transform: `translate(0, -50%) rotate(${angleDeg * 0.75}deg) scale(${scale})`,
                  transformOrigin: "left center",
                  opacity,
                }}
                className={cn(
                  "flex items-center gap-2.5 transition-opacity duration-150 cursor-pointer pointer-events-auto",
                  isCenter ? "z-20" : "z-10"
                )}
              >
                {/* Tick Dot on Arc (Matching Image 1) */}
                <span
                  className={cn(
                    "w-2 h-2 rounded-full -ml-1 shrink-0 transition-all duration-200",
                    isCenter
                      ? "bg-zinc-950 dark:bg-white ring-4 ring-sky-500/30 scale-125 shadow-[0_0_8px_rgba(56,189,248,0.6)]"
                      : "bg-zinc-400/50 dark:bg-zinc-600/60"
                  )}
                />

                {/* Big Number Label (Matching Reference: 00, 01, 02...) */}
                <span
                  className={cn(
                    "font-mono text-2xl tracking-tighter leading-none transition-colors",
                    isCenter
                      ? "font-[850] text-[#111216] dark:text-[#f8f9fa] text-3xl"
                      : "font-[600] text-zinc-400/70 dark:text-zinc-600/70"
                  )}
                >
                  {numStr}
                </span>

                {/* Language Info Block */}
                {isCenter ? (
                  <motion.div
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col ml-1 min-w-[135px]"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px]">{lang.flag}</span>
                      <span className="text-[13.5px] font-[700] text-[#111216] dark:text-[#f8f9fa] tracking-tight leading-tight">
                        {lang.name.split(" ")[0]}
                      </span>
                      {settings.language === lang.code && (
                        <Check size={12} strokeWidth={2.6} className="text-sky-500 shrink-0 ml-auto" />
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 tracking-tight leading-tight mt-0.5 truncate max-w-[130px]">
                      {lang.code === "auto" ? "Intelligent Voice Detection" : lang.name}
                    </span>
                  </motion.div>
                ) : (
                  <span className="text-[11px] font-[550] text-zinc-400 dark:text-zinc-500 tracking-tight truncate max-w-[90px]">
                    {lang.name.split(" ")[0]}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Bottom Actions Bar */}
        <div className="pt-1.5 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-2 z-20">
          {/* Live Translation Toggle */}
          <button
            type="button"
            onClick={() => {
              const nextMode = isTranslationActive ? "direct" : "translation";
              setIsTranslationActive(!isTranslationActive);
              update({ languageMode: nextMode });
            }}
            className="px-2.5 py-1 rounded-[10px] text-[11.5px] font-[500] flex items-center gap-1.5 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors cursor-pointer text-zinc-700 dark:text-zinc-300"
          >
            <ListChecks size={13} strokeWidth={2} className="text-zinc-500" />
            <span>Translate</span>
            <span
              className={cn(
                "text-[8.5px] font-bold px-1.5 py-0.2 rounded-full",
                isTranslationActive
                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                  : "bg-black/[0.05] dark:bg-white/[0.08] text-zinc-400"
              )}
            >
              {isTranslationActive ? "ON" : "OFF"}
            </span>
          </button>

          {/* Confirm & Set Button */}
          <button
            type="button"
            onClick={applyAndClose}
            className="px-3.5 py-1 rounded-[10px] text-[11.5px] font-[600] tracking-tight bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer"
          >
            Select ({activeLang.short})
          </button>
        </div>
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
      className="relative h-7 px-2 rounded-full flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xl shrink-0 select-none overflow-hidden group"
      title={`Language & Translation: ${langLabel} (Click to change)`}
    >
      {/* Specular Liquid Top Sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[45%] rounded-full bg-gradient-to-b from-white/30 via-white/5 to-transparent" />

      {/* Upward Chevron */}
      <ChevronUp
        size={9}
        className={cn(
          "stroke-[2.5] transition-colors relative z-10",
          isLangOpen ? "text-sky-300" : isTranslationMode ? "text-amber-300" : "text-white/80"
        )}
      />

      {/* Glass Divider */}
      <div className="w-[1px] h-2 bg-white/25 relative z-10" />

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
  isListening?: boolean;
  floatingPosition?: string;
}

function VoiceAlertCapsule({
  voiceError,
  isPermissionError,
  browserGuidance,
  onRecover,
  onDismiss,
  isListening = false,
  floatingPosition = "bottom_center",
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

  const isTop = floatingPosition === "top_center";
  const positionClass = isTop
    ? (isListening ? "top-16 mt-2" : "top-5")
    : (isListening ? "bottom-16 mb-2" : "bottom-6");

  return (
    <motion.div
      initial={{ opacity: 0, y: isTop ? -16 : 16, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: isTop ? -12 : 12, scale: 0.92 }}
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
        backdropFilter: "blur(32px) saturate(190%)",
        WebkitBackdropFilter: "blur(32px) saturate(190%)",
      }}
      className={cn(
        "overflow-hidden fixed left-1/2 z-[10010] -translate-x-1/2 rounded-full py-2.5 px-4 flex items-center gap-3.5 max-w-[calc(100vw-24px)] select-none pointer-events-auto shadow-2xl border transition-all duration-300",
        isPermissionError
          ? "bg-[#FDE8D3]/95 text-[#2D1B16] border-white/80 shadow-[0_20px_48px_-8px_rgba(215,150,110,0.45)] dark:bg-[#201511]/95 dark:text-[#FDE8D3] dark:border-amber-600/40 dark:shadow-[0_20px_48px_-8px_rgba(245,158,11,0.25)]"
          : "bg-[#F3C3B2]/95 text-[#2D1B16] border-white/80 shadow-[0_20px_48px_-8px_rgba(195,105,90,0.48)] dark:bg-[#241313]/95 dark:text-[#FCE8E6] dark:border-rose-600/40 dark:shadow-[0_20px_48px_-8px_rgba(244,63,94,0.25)]",
        positionClass
      )}
      role="alert"
    >
      {/* Ambient Glowing Status Badge */}
      <div
        className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isPermissionError
            ? "bg-amber-700/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-700/25 dark:border-amber-500/30"
            : "bg-rose-700/15 text-rose-900 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-700/25 dark:border-rose-500/30"
          } shadow-inner`}
      >
        <AlertCircle size={15} strokeWidth={2.3} />
        <div
          className={`absolute inset-0 rounded-full ${isPermissionError ? "bg-amber-600/20 dark:bg-amber-400/25" : "bg-rose-600/20 dark:bg-rose-400/25"
            } animate-ping opacity-50`}
        />
      </div>

      {/* Title & Info Description Text with Countdown Display */}
      <div className="min-w-0 pr-1">
        <div className="flex items-center gap-2">
          <span className="text-[12.5px] font-[600] text-[#2A1713] dark:text-[#FDE8D3] tracking-[-0.015em] leading-tight">
            {isPermissionError
              ? "Microphone Access Needed"
              : browserGuidance
                ? "Browser Dictation Unavailable"
                : "Voice Input Alert"}
          </span>
          {/* Subtle Countdown Indicator Pill */}
          <span className="text-[9.5px] font-[600] tracking-tight px-1.5 py-0.5 rounded-full bg-black/8 dark:bg-white/12 text-[#2A1713]/80 dark:text-[#FDE8D3]/90 tabular-nums">
            {secondsLeft}s
          </span>
        </div>
        <p className="text-[11px] text-[#5A3A32] dark:text-[#D1A89D] font-[450] tracking-[-0.006em] leading-tight mt-0.5 whitespace-nowrap">
          {browserGuidance || voiceError || "Tap retry to resume speaking"}
        </p>
      </div>

      {/* Sleek Apple Glass Icon Actions */}
      <div className="flex items-center gap-1.5 shrink-0 pl-2.5 border-l border-black/10 dark:border-white/15">
        {/* Retry Icon Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onRecover();
          }}
          title={isPermissionError ? "Allow microphone & retry" : "Try again"}
          className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/8 hover:bg-black/15 dark:bg-white/10 dark:hover:bg-white/18 active:scale-95 text-[#2A1713] dark:text-[#FDE8D3] border border-black/10 dark:border-white/15 transition-all duration-200 cursor-pointer shadow-xs hover:scale-105"
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
              className="text-[#2A1713] dark:text-white"
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
              className="text-[#2A1713]/60 dark:text-white/60"
            />
          </svg>
          <button
            type="button"
            aria-label="Dismiss"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onDismiss();
            }}
            title="Dismiss"
            className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/5 hover:bg-black/12 dark:bg-white/8 dark:hover:bg-white/15 active:scale-95 text-[#5A3A32] hover:text-[#2A1713] dark:text-[#D1A89D] dark:hover:text-[#FDE8D3] border border-black/8 dark:border-white/10 transition-all duration-200 cursor-pointer hover:scale-105"
          >
            <X size={12} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* Smooth 5-Second Hairline Progress Bar Along the Bottom */}
      <div className="absolute bottom-0 inset-x-5 h-[1.5px] overflow-hidden rounded-full bg-black/[0.08] dark:bg-white/[0.1]">
        <motion.div
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: 5, ease: "linear" }}
          style={{ originX: 0 }}
          className="h-full w-full bg-[#2A1713]/40 dark:bg-white/40 rounded-full"
        />
      </div>
    </motion.div>
  );
}

/**
 * Apple macOS Glass Toast Capsule for Agent Mode Feedback (Placed cleanly ABOVE the pill)
 */
function AgentModeToastCapsule({
  agentMode,
  onDismiss,
  isListening = false,
  floatingPosition = "bottom_center",
}: {
  agentMode: boolean;
  onDismiss: () => void;
  isListening?: boolean;
  floatingPosition?: string;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 2800);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const isTop = floatingPosition === "top_center";
  const positionClass = isTop
    ? (isListening ? "top-16 mt-2" : "top-5")
    : (isListening ? "bottom-16 mb-2" : "bottom-6");

  return (
    <motion.div
      initial={{ opacity: 0, y: isTop ? -16 : 16, scale: 0.94, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: isTop ? -12 : 12, scale: 0.94, filter: "blur(6px)" }}
      transition={{
        type: "spring",
        stiffness: 480,
        damping: 28,
        mass: 0.8,
      }}
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "SF Pro", system-ui, -apple-system-headline, sans-serif',
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        textRendering: "optimizeLegibility",
      }}
      className={cn(
        "overflow-hidden fixed left-1/2 z-[10010] -translate-x-1/2 rounded-[18px] py-2.5 pl-3.5 pr-3 flex items-center justify-between gap-3.5 w-max max-w-[calc(100vw-32px)] select-none pointer-events-auto backdrop-blur-2xl shrink-0 transition-all duration-300",
        "bg-white/85 dark:bg-[#141620]/85 border border-black/[0.07] dark:border-white/[0.12]",
        "shadow-[0_20px_48px_-8px_rgba(0,0,0,0.14),0_1px_1px_0_rgba(255,255,255,0.9)_inset,0_0_0_1px_rgba(0,0,0,0.03)] dark:shadow-[0_24px_50px_-10px_rgba(0,0,0,0.65),0_1px_1px_0_rgba(255,255,255,0.15)_inset,0_0_0_1px_rgba(255,255,255,0.08)]",
        positionClass
      )}
      role="status"
    >
      {/* Decorative Soft Diagonal Ambient Stripes */}
      <div
        className="pointer-events-none absolute right-0 inset-y-0 w-[55%] rounded-r-[18px] overflow-hidden"
        style={{
          background: agentMode
            ? "repeating-linear-gradient(45deg, rgba(16, 185, 129, 0.09) 0px, rgba(16, 185, 129, 0.09) 8px, transparent 8px, transparent 16px)"
            : "repeating-linear-gradient(45deg, rgba(56, 189, 248, 0.08) 0px, rgba(56, 189, 248, 0.08) 8px, transparent 8px, transparent 16px)",
          maskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.4) 30%, rgba(0,0,0,1) 100%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.4) 30%, rgba(0,0,0,1) 100%)",
        }}
      />

      {/* Left Content Area: Diamond Icon + Stacked Title & Subtitle */}
      <div className="relative z-10 flex items-center gap-2.5 shrink-0">
        {/* Diamond Status Badge with Bevel / Glow */}
        <div className="relative flex items-center justify-center w-7 h-7 shrink-0">
          <div
            className={cn(
              "w-[18px] h-[18px] rounded-[4.5px] rotate-45 flex items-center justify-center transition-all duration-300",
              agentMode
                ? "bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 text-white shadow-[0_2px_10px_rgba(16,185,129,0.45),0_0_0_1px_rgba(255,255,255,0.35)_inset]"
                : "bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 text-white shadow-[0_2px_10px_rgba(56,189,248,0.45),0_0_0_1px_rgba(255,255,255,0.35)_inset]"
            )}
          >
            {agentMode ? (
              <Sparkles size={10} className="-rotate-45 text-white fill-white/90" />
            ) : (
              <Mic size={9.5} className="-rotate-45 text-white stroke-[2.2]" />
            )}
          </div>
        </div>

        {/* Text Content */}
        <div className="flex flex-col pr-1 whitespace-nowrap">
          <span className="text-[12.5px] font-[650] text-[#1a1917] dark:text-[#f2f2f5] tracking-[-0.015em] leading-snug whitespace-nowrap">
            {agentMode ? "Agent Mode Active" : "Standard Voice Typing"}
          </span>
          <span className="text-[11px] font-[450] text-[#6b6760] dark:text-[#9ea0aa] tracking-[-0.008em] leading-none mt-0.5 whitespace-nowrap">
            {agentMode ? "Spoken prompts execute AI actions." : "Spoken words type directly into document."}
          </span>
        </div>
      </div>

      {/* Right Apple Liquid Glass Pill Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onDismiss();
        }}
        className={cn(
          "relative z-10 ml-2.5 px-3 py-1 rounded-[10px] text-[11.5px] font-[600] tracking-[-0.01em] transition-all duration-150 cursor-pointer shrink-0 whitespace-nowrap",
          "bg-white/90 hover:bg-white text-zinc-800 dark:bg-white/10 dark:hover:bg-white/15 dark:text-zinc-100",
          "shadow-[0_1px_3px_rgba(0,0,0,0.07),0_1px_1px_rgba(255,255,255,1)_inset,0_0_0_1px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_1px_1px_rgba(255,255,255,0.12)_inset,0_0_0_1px_rgba(255,255,255,0.1)]",
          "hover:scale-[1.03] active:scale-[0.97]"
        )}
      >
        {agentMode ? "Action" : "Dismiss"}
      </button>

      {/* Inset Hairline Progress Bar */}
      <div className="absolute bottom-1 inset-x-3.5 h-[1.5px] overflow-hidden rounded-full bg-black/[0.04] dark:bg-white/[0.06]">
        <motion.div
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: 2.8, ease: "linear" }}
          style={{ originX: 0 }}
          className={cn(
            "h-full w-full rounded-full",
            agentMode
              ? "bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_0_4px_rgba(16,185,129,0.7)]"
              : "bg-gradient-to-r from-sky-400 to-blue-500 shadow-[0_0_4px_rgba(56,189,248,0.6)]"
          )}
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
  const [agentToast, setAgentToast] = useState<{ id: number; mode: boolean } | null>(null);
  const [lastTranscript, setLastTranscript] = useState("");
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [isErrorDismissed, setIsErrorDismissed] = useState(false);

  // Sync agentMode with controller
  useEffect(() => {
    if (getAgentMode) {
      setAgentMode(getAgentMode());
    }
  }, [getAgentMode]);

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

  const rawVoiceError = (() => {
    if (!error?.message && connectionState !== "needs_attention") return "";
    const msg = error?.message || "";
    if (msg.toLowerCase().includes("aborted") || msg.toLowerCase().includes("no-speech")) return "";
    return msg || (connectionState === "needs_attention" ? "Voice typing needs your attention." : "");
  })();
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

  const handleStopVoice = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    stop?.();
    globalVoiceController.stop();
  };

  const handleToggleAgentMode = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = !agentMode;
    setAgentMode(next);
    setAgentModeCtrl(next);
    setAgentToast({ id: Date.now(), mode: next });
  };

  const handleToggleTranslate = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsLangOpen((prev) => !prev);
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
            }).catch(() => { });
          }
        }}
      />

      {/* Agent Mode Floating Feedback Toast — strictly above the Flow Pill */}
      <AnimatePresence>
        {agentToast && (
          <AgentModeToastCapsule
            key={agentToast.id}
            agentMode={agentToast.mode}
            onDismiss={() => setAgentToast(null)}
            isListening={isListening}
            floatingPosition={settings.floatingPosition}
          />
        )}
      </AnimatePresence>

      {/* Voice Alert & Error Capsule — strictly above the Flow Pill */}
      <AnimatePresence>
        {voiceError && (
          <VoiceAlertCapsule
            key={voiceError}
            voiceError={voiceError}
            isPermissionError={isPermissionError}
            browserGuidance={browserGuidance}
            onRecover={recoverVoice}
            onDismiss={handleDismissError}
            isListening={isListening}
            floatingPosition={settings.floatingPosition}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {isListening && (
          ["apple_intelligence_orb", "siri_glow_orb", "vision_spatial_glass", "solar_ember_orb", "cyber_matrix_orb"].includes(settings.pillTheme) ? (
            <motion.div
              key={`active-apple-orb-${settings.pillTheme}`}
              initial={{ opacity: 0, scale: 0.8, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 14 }}
              transition={{
                type: "spring",
                stiffness: 420,
                damping: 25,
                mass: 0.85,
              }}
              className="flex items-center justify-center select-none"
            >
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
                agentMode={agentMode}
                onToggleAgentMode={handleToggleAgentMode}
                onToggleTranslate={handleToggleTranslate}
                isTranslationMode={isTranslationMode}
                langLabel={langLabel}
                onToggle={handleStopVoice}
                onStop={handleStopVoice}
                onClose={handleStopVoice}
              />
            </motion.div>
          ) : (
            /* Active Recording Dynamic Island: Fluid 3-Piece Water-Droplet Layout */
            <motion.div
              key="active-island-layout"
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
                transition={{
                  type: "spring",
                  stiffness: 480,
                  damping: 26,
                  mass: 0.8,
                }}
                style={{
                  background: agentMode
                    ? "radial-gradient(120% 120% at 50% 0%, rgba(16, 185, 129, 0.18) 0%, rgba(255, 255, 255, 0.04) 65%, rgba(0, 0, 0, 0.65) 100%), #0e1411"
                    : "radial-gradient(120% 120% at 50% 0%, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.04) 65%, rgba(0, 0, 0, 0.55) 100%), #10121A",
                  border: agentMode ? "1px solid rgba(16, 185, 129, 0.35)" : "1px solid rgba(255, 255, 255, 0.18)",
                  boxShadow: agentMode
                    ? "0 20px 48px -8px rgba(16, 185, 129, 0.35), inset 0 1.5px 1px 0 rgba(255, 255, 255, 0.38), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.35)"
                    : "0 20px 48px -8px rgba(0, 0, 0, 0.75), inset 0 1.5px 1px 0 rgba(255, 255, 255, 0.38), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.35)",
                  backdropFilter: "blur(36px) saturate(190%)",
                  WebkitBackdropFilter: "blur(36px) saturate(190%)",
                }}
                onClick={(e) => {
                  handleStopVoice(e);
                }}
                className="relative flex items-center gap-2 h-7 px-2.5 rounded-full transition-all duration-300 overflow-hidden shadow-2xl shrink-0 select-none cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                {/* Specular Liquid Gloss Top Sheen */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[48%] rounded-full bg-gradient-to-b from-white/30 via-white/10 to-transparent" />

                {/* Ambient Fluid Breathing Pulse Glow */}
                <motion.div
                  animate={{
                    opacity: agentMode ? [0.25, 0.45, 0.25] : [0.15, 0.35, 0.15],
                    scale: [0.98, 1.02, 0.98],
                  }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className={cn(
                    "pointer-events-none absolute inset-0 rounded-full",
                    agentMode
                      ? "bg-gradient-to-r from-emerald-500/20 via-teal-500/25 to-emerald-500/20"
                      : "bg-gradient-to-r from-sky-500/10 via-emerald-500/15 to-purple-500/10"
                  )}
                />

                {/* Left Stop Squircle with generous clickable hit area */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleStopVoice(e);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="relative z-30 flex h-6 w-6 -ml-1 shrink-0 items-center justify-center cursor-pointer select-none group pointer-events-auto hover:scale-110 active:scale-90 transition-transform duration-150 outline-none appearance-none"
                  aria-label="Stop voice typing"
                  title="Click to stop recording"
                >
                  <div className={cn(
                    "w-3.5 h-3.5 rounded-[3px] flex items-center justify-center transition-transform",
                    squircleClass || "bg-white group-hover:bg-white/95 shadow-[0_0_10px_rgba(255,255,255,0.95)]"
                  )}>
                    <span className="w-1.5 h-1.5 rounded-[0.5px] bg-black/90" />
                  </div>
                </button>

                {/* Smooth Real-Time Waveform / Dynamic Dots Visualizer */}
                <div className="relative z-10 flex items-center">
                  <RealtimeEqualizer
                    isListening={isListening}
                    barColor={agentMode ? "emerald" : settings.barColor}
                    styleOverride={settings.waveformStyle}
                  />
                </div>

                {/* Digital Timer */}
                <div className="relative z-10 font-mono text-[10.5px] font-semibold text-white tracking-tight">
                  <TimerDisplay mins={mins} secs={secs} timerTheme={agentMode ? "neon_green" : settings.timerTheme} />
                </div>

                {/* Live animated transcript preview (if enabled) */}
                {settings.showTranscriptPreview && lastTranscript ? (
                  <div className="relative z-10 text-[10.5px] text-white/85 max-w-[120px] truncate border-l border-white/15 pl-1.5 font-medium flex items-center gap-1">
                    {agentMode && (
                      <span className="text-[8.5px] font-bold px-1 py-0.2 rounded bg-emerald-500/30 text-emerald-300 uppercase tracking-wider shrink-0">
                        AI
                      </span>
                    )}
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
                onClick={handleToggleAgentMode}
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
                className="relative w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-colors shadow-2xl shrink-0 overflow-hidden group select-none"
                title={agentMode ? "Agent Mode: ON (Spoken commands execute AI actions)" : "Agent Mode: OFF (Click to switch to AI Agent commands)"}
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
          )
        )}
      </AnimatePresence>
    </div>
  );
}

export const VoiceFloatingIndicator = VoiceInput;
export const VoicePill = VoiceInput;
export default VoiceInput;
