"use client";

import React, { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
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
} from "../../lib/voice/voice-settings";

export interface VoiceInputProps {
  onStart?: () => void;
  onStop?: () => void;
  onTranscript?: (text: string) => void;
  onError?: (error: Error) => void;
  variant?: "pill" | "button" | "compact";
  alwaysPill?: boolean;
}

const THEME_CLASSES: Record<PillTheme, { bg: string; border: string; glow: string }> = {
  apple_vision_glass: {
    bg: "bg-black/60 backdrop-blur-2xl",
    border: "border-white/25",
    glow: "shadow-[0_12px_40px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-1px_1px_rgba(0,0,0,0.3)]",
  },
  dark_charcoal: {
    bg: "bg-[#141416]",
    border: "border-white/15",
    glow: "shadow-[0_6px_28px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.1)]",
  },
  space_black: {
    bg: "bg-[#09090b]/90 backdrop-blur-xl",
    border: "border-white/15",
    glow: "shadow-[0_10px_36px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.15)]",
  },
  deep_obsidian: {
    bg: "bg-[#09090b]",
    border: "border-white/20",
    glow: "shadow-[0_8px_32px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.08)]",
  },
  liquid_titanium: {
    bg: "bg-gradient-to-r from-zinc-900/90 via-neutral-800/90 to-zinc-900/90 backdrop-blur-xl",
    border: "border-zinc-500/40",
    glow: "shadow-[0_8px_30px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.25)]",
  },
  frosted_pearl: {
    bg: "bg-white/15 backdrop-blur-2xl",
    border: "border-white/40",
    glow: "shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.6)]",
  },
  frosted_glass: {
    bg: "bg-white/10 backdrop-blur-2xl",
    border: "border-white/30",
    glow: "shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.25)]",
  },
  cyber_azure: {
    bg: "bg-[#091124]/90 backdrop-blur-xl",
    border: "border-sky-400/40",
    glow: "shadow-[0_0_25px_rgba(14,165,233,0.35),0_8px_32px_rgba(0,0,0,0.8)]",
  },
  neon_cyber: {
    bg: "bg-[#0a0f1d]",
    border: "border-sky-500/40",
    glow: "shadow-[0_0_25px_rgba(14,165,233,0.3),0_6px_28px_rgba(0,0,0,0.8)]",
  },
  amber_ember: {
    bg: "bg-[#18110e]/90 backdrop-blur-xl",
    border: "border-amber-500/35",
    glow: "shadow-[0_0_25px_rgba(245,158,11,0.25),0_8px_32px_rgba(0,0,0,0.8)]",
  },
};

const BAR_COLOR_CLASSES: Record<BarColor, string> = {
  white: "bg-white",
  cyan: "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]",
  violet: "bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.5)]",
  amber: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]",
  emerald: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]",
  gradient: "bg-gradient-to-t from-pink-500 to-amber-300",
  rainbow: "bg-gradient-to-r from-sky-400 via-emerald-300 to-amber-300",
};

const SQUIRCLE_CLASSES: Record<SquircleStyle, string> = {
  apple_glow: "bg-[#f0f0f0] hover:bg-white shadow-[0_0_10px_rgba(255,255,255,0.8),0_0_20px_rgba(255,255,255,0.35)]",
  ruby_studio: "bg-red-500 hover:bg-red-400 shadow-[0_0_12px_rgba(239,68,68,0.85),0_0_24px_rgba(239,68,68,0.4)]",
  emerald_active: "bg-emerald-400 hover:bg-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.85),0_0_24px_rgba(52,211,153,0.4)]",
  titanium_frosted: "bg-zinc-200 border border-white/60 shadow-[0_0_8px_rgba(255,255,255,0.4)]",
};

/**
 * High-performance 60fps Real-Time Voice Waveform Visualizer
 * Supports 13-Bar Formant, 24-Bar High-Res, and 3-Orb Pulse styles.
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
  const activeStyle = styleOverride || settings.waveformStyle || "formant_13";

  const barCount = activeStyle === "dense_24" ? 24 : activeStyle === "minimal_pulse" ? 3 : 13;
  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const currentHeightsRef = useRef<number[]>(new Array(24).fill(3));

  useEffect(() => {
    let animId: number;

    const render = () => {
      const freqs = globalVoiceController.getLiveFrequencyBands(barCount);
      const time = performance.now() * 0.004;

      for (let i = 0; i < barCount; i++) {
        const barEl = barsRef.current[i];
        if (!barEl) continue;

        let targetH = 3;

        if (activeStyle === "minimal_pulse") {
          const minD = 4;
          const maxD = 14;
          const raw = freqs[i] || 0.08;
          const pulse = (Math.sin(time * 4 + i * 1.2) * 0.5 + 0.5) * 4;
          targetH = Math.max(minD, Math.min(maxD, isListening ? raw * 18 + minD : minD + pulse));
        } else {
          const minH = 2.5;
          const maxH = 16;

          if (isListening) {
            const rawFreq = freqs[i] || 0.04;
            const ambient = (Math.sin(time * 4.0 + i * 0.6) * 0.5 + 0.5) * 2.0;
            const voiceH = minH + rawFreq * (maxH - minH) * 1.4 * (settings.sensitivityBoost / 2.5);
            targetH = Math.max(minH, Math.min(maxH, rawFreq > 0.08 ? voiceH : minH + ambient));
          } else {
            targetH = minH;
          }
        }

        const prev = currentHeightsRef.current[i] || 2.5;
        let next: number;
        if (targetH > prev) {
          next = prev + (targetH - prev) * 0.75; // Snappy voice attack
        } else {
          next = prev + (targetH - prev) * 0.22; // Natural vocal decay
        }
        currentHeightsRef.current[i] = next;

        if (activeStyle === "minimal_pulse") {
          barEl.style.width = `${next.toFixed(1)}px`;
          barEl.style.height = `${next.toFixed(1)}px`;
        } else {
          barEl.style.height = `${next.toFixed(1)}px`;
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isListening, barCount, activeStyle, settings.sensitivityBoost]);

  if (activeStyle === "minimal_pulse") {
    return (
      <div className={cn("flex items-center gap-1.5 h-5 px-1", className)}>
        {[...Array(3)].map((_, i) => (
          <span
            key={i}
            ref={(el) => {
              barsRef.current[i] = el;
            }}
            className={cn("rounded-full flex-shrink-0 transition-all duration-100", BAR_COLOR_CLASSES[activeColor] || "bg-white")}
            style={{ width: "4px", height: "4px" }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-[2.5px] h-5 px-1", className)}>
      {[...Array(barCount)].map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            barsRef.current[i] = el;
          }}
          className={cn(
            "rounded-full flex-shrink-0 transition-opacity duration-150",
            BAR_COLOR_CLASSES[activeColor] || "bg-white",
            activeStyle === "dense_24" ? "w-[1.5px]" : "w-[2.5px]"
          )}
          style={{ height: "2.5px" }}
        />
      ))}
    </div>
  );
}

function TimerDisplay({ mins, secs, timerTheme }: { mins: string; secs: string; timerTheme: TimerTheme }) {
  if (timerTheme === "cyan_gold") {
    return (
      <div className="flex items-center font-mono text-[13px] font-semibold tracking-wider select-none leading-none">
        <span className="text-sky-300">{mins}</span>
        <span className="text-white/30 px-[1px]">:</span>
        <span className="text-amber-300">{secs}</span>
      </div>
    );
  }
  if (timerTheme === "monochrome") {
    return (
      <div className="flex items-center font-mono text-[13px] font-semibold tracking-wider select-none leading-none text-white">
        {mins}:{secs}
      </div>
    );
  }
  if (timerTheme === "sunset") {
    return (
      <div className="flex items-center font-mono text-[13px] font-semibold tracking-wider select-none leading-none">
        <span className="text-rose-400">{mins}</span>
        <span className="text-white/30 px-[1px]">:</span>
        <span className="text-orange-300">{secs}</span>
      </div>
    );
  }
  if (timerTheme === "neon_green") {
    return (
      <div className="flex items-center font-mono text-[13px] font-semibold tracking-wider select-none leading-none">
        <span className="text-emerald-400">{mins}</span>
        <span className="text-white/30 px-[1px]">:</span>
        <span className="text-emerald-300">{secs}</span>
      </div>
    );
  }

  // Default: dual_tone
  return (
    <div className="flex items-center font-mono text-[13px] font-semibold tracking-wider select-none leading-none">
      <span className="text-[#00c8ff]">{mins}</span>
      <span className="text-white/30 px-[1px]">:</span>
      <span className="text-[#ff9f1c]">{secs}</span>
    </div>
  );
}

/**
 * Animated real-time word-by-word streaming text renderer with typewriter glow cursor
 */
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
            initial={{ opacity: 0, y: 3, filter: "blur(3px)" }}
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
          className="inline-block w-[2px] h-3.5 bg-[var(--accent)] rounded-full ml-0.5 shadow-[0_0_8px_var(--accent)]"
        />
      )}
    </div>
  );
}

/**
 * VoiceInput Component
 * Renders a sleek Apple VisionOS / Wispr Flow voice pill with:
 * - Liquid glass backdrop blur & specular highlights
 * - Real-time responsive white vertical equalizer waveform in the center
 * - Electric cyan & amber styled monospace digital timer on the right
 */
export function VoiceInput({
  className,
  onStart,
  onStop,
  onTranscript,
  onError,
  variant = "button",
  alwaysPill = false,
  ...props
}: React.ComponentProps<"div"> & VoiceInputProps) {
  const { isListening, time, toggle, stop } = useVoiceController({
    onStart,
    onStop,
    onTranscript,
    onError,
  });
  const { settings } = useVoiceSettings();

  const mins = Math.floor(time / 60).toString().padStart(2, "0");
  const secs = (time % 60).toString().padStart(2, "0");

  const themeConfig = THEME_CLASSES[settings.pillTheme] || THEME_CLASSES.apple_vision_glass;
  const squircleClass = SQUIRCLE_CLASSES[settings.squircleStyle] || SQUIRCLE_CLASSES.apple_glow;

  const onClickHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isListening) {
      globalVoiceController.stop();
      stop();
    } else {
      toggle();
    }
  };

  const handleStop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    globalVoiceController.stop();
    stop();
  };

  return (
    <div className={cn("flex items-center justify-center select-none", className)} {...props}>
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 450, damping: 30 }}
        onClick={onClickHandler}
        role="button"
        aria-label={isListening ? "Stop voice recording" : "Start voice recording"}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (isListening) {
              globalVoiceController.stop();
              stop();
            } else {
              toggle();
            }
          }
        }}
        className={cn(
          "relative flex items-center justify-center cursor-pointer transition-all duration-200 outline-none",
          isListening || alwaysPill
            ? cn("h-10 px-3.5 rounded-full border text-white gap-3.5", themeConfig.bg, themeConfig.border, themeConfig.glow)
            : "h-8 w-8 rounded-full bg-[var(--surface-1)] border border-[var(--border)] hover:border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text)] hover:scale-105 shadow-sm"
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isListening || alwaysPill ? (
            <motion.div
              key="recording-pill"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-3.5"
            >
              {/* Left Squircle Action / Stop Button */}
              <motion.button
                type="button"
                onClick={handleStop}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.88 }}
                className={cn("w-4 h-4 rounded-[5px] flex-shrink-0 cursor-pointer transition-all duration-150", squircleClass)}
                aria-label="Stop recording"
              />

              {/* Center Real-Time Audio Equalizer Waveform */}
              <RealtimeEqualizer
                isListening={isListening}
                barColor={settings.barColor}
                styleOverride={settings.waveformStyle}
              />

              {/* Right Digital Monospace Dual-Tone Timer */}
              <TimerDisplay mins={mins} secs={secs} timerTheme={settings.timerTheme} />
            </motion.div>
          ) : (
            <motion.div
              key="idle-mic"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-center"
            >
              <Mic className="w-4 h-4" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/**
 * Standalone VoicePill widget matching the exact reference UI.
 */
export function VoicePill({
  isRecording = false,
  timeInSeconds = 2,
  onToggle,
  className,
}: {
  isRecording?: boolean;
  timeInSeconds?: number;
  onToggle?: () => void;
  className?: string;
}) {
  const { settings } = useVoiceSettings();
  const mins = Math.floor(timeInSeconds / 60).toString().padStart(2, "0");
  const secs = (timeInSeconds % 60).toString().padStart(2, "0");
  const themeConfig = THEME_CLASSES[settings.pillTheme] || THEME_CLASSES.apple_vision_glass;
  const squircleClass = SQUIRCLE_CLASSES[settings.squircleStyle] || SQUIRCLE_CLASSES.apple_glow;

  return (
    <div
      onClick={onToggle}
      className={cn(
        "inline-flex items-center h-10 px-4 rounded-full border text-white gap-3.5 select-none cursor-pointer hover:scale-[1.02] transition-all duration-200",
        themeConfig.bg,
        themeConfig.border,
        themeConfig.glow,
        className
      )}
    >
      {/* Left Glowing Squircle */}
      <motion.div
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.88 }}
        className={cn("w-4 h-4 rounded-[5px] flex-shrink-0", squircleClass)}
      />

      {/* Center Waveform Equalizer */}
      <RealtimeEqualizer
        isListening={isRecording}
        barColor={settings.barColor}
        styleOverride={settings.waveformStyle}
      />

      {/* Right Digital Monospace Dual-Tone Timer */}
      <TimerDisplay mins={mins} secs={secs} timerTheme={settings.timerTheme} />
    </div>
  );
}

/**
 * Floating Voice Typing HUD shown across the entire workspace whenever voice dictation is active.
 */
export function VoiceFloatingIndicator() {
  const { isListening, time, stop } = useVoiceController();
  const { settings } = useVoiceSettings();
  const [lastTranscript, setLastTranscript] = useState<string>("");

  useEffect(() => {
    const unsub = globalVoiceController.onTranscript((text) => {
      setLastTranscript(text);
    });
    return unsub;
  }, []);

  const mins = Math.floor(time / 60).toString().padStart(2, "0");
  const secs = (time % 60).toString().padStart(2, "0");
  const themeConfig = THEME_CLASSES[settings.pillTheme] || THEME_CLASSES.apple_vision_glass;
  const squircleClass = SQUIRCLE_CLASSES[settings.squircleStyle] || SQUIRCLE_CLASSES.apple_glow;

  const positionClass =
    settings.floatingPosition === "top_center"
      ? "top-7 left-1/2 -translate-x-1/2"
      : settings.floatingPosition === "bottom_right"
      ? "bottom-7 right-7"
      : "bottom-7 left-1/2 -translate-x-1/2";

  const handleFloatingStop = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    globalVoiceController.stop();
    stop();
  };

  return (
    <AnimatePresence>
      {isListening && (
        <motion.div
          key="voice-floating-indicator-capsule"
          initial={{ opacity: 0, y: 30, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9, transition: { duration: 0.15 } }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
          onClick={handleFloatingStop}
          role="button"
          tabIndex={0}
          aria-label="Stop voice typing"
          className={cn(
            "fixed z-[9999] flex items-center gap-3.5 px-4 py-2.5 rounded-full border text-white select-none pointer-events-auto cursor-pointer transition-transform hover:scale-[1.02]",
            positionClass,
            themeConfig.bg,
            themeConfig.border,
            themeConfig.glow
          )}
        >
          {/* Left Squircle Stop Button */}
          <motion.button
            type="button"
            onClick={handleFloatingStop}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.88 }}
            className={cn("w-4 h-4 rounded-[5px] flex-shrink-0 cursor-pointer transition-colors", squircleClass)}
            aria-label="Stop voice typing"
          />

          {/* Real-Time Equalizer Waveform */}
          <RealtimeEqualizer
            isListening={isListening}
            barColor={settings.barColor}
            styleOverride={settings.waveformStyle}
          />

          {/* Digital Dual-tone Timer */}
          <TimerDisplay mins={mins} secs={secs} timerTheme={settings.timerTheme} />

          {/* Live animated word-by-word transcript text */}
          {settings.showTranscriptPreview && lastTranscript ? (
            <div className="text-xs text-white/85 max-w-[240px] truncate border-l border-white/15 pl-3 font-medium">
              <StreamingWordText text={lastTranscript} isListening={isListening} />
            </div>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default VoiceInput;
