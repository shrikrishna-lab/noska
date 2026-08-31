/**
 * Voice & Dictation Settings System (Wispr Flow & Apple VisionOS Liquid Glass Engine)
 * Manages UI themes, visualizer styles, shortcuts, AI speech-polishing modes, and audio sensitivity.
 */

import { useState, useEffect } from "react";

export type PillTheme =
  | "dynamic_island"
  | "dynamic_island_pro"
  | "apple_vision_glass"
  | "dark_charcoal"
  | "space_black"
  | "deep_obsidian"
  | "siri_orb_aura"
  | "liquid_titanium"
  | "frosted_pearl"
  | "frosted_glass"
  | "cyber_azure"
  | "neon_cyber"
  | "amber_ember"
  | "minimal_stealth";

export type WaveformStyle = "formant_13" | "dense_24" | "minimal_pulse" | "dynamic_dots" | "audio_ribbon";
export type SquircleStyle = "apple_glow" | "ruby_studio" | "emerald_active" | "titanium_frosted" | "siri_gradient" | "cyber_neon";
export type BarColor = "white" | "cyan" | "violet" | "amber" | "emerald" | "gradient" | "rainbow" | "orange_flame";
export type TimerTheme = "dual_tone" | "cyan_gold" | "monochrome" | "sunset" | "neon_green" | "gold_ring";
export type FloatingPosition = "bottom_center" | "top_center" | "bottom_right";
export type DictationMode = "realtime" | "ai_polished" | "bullet_points" | "professional";
export type SoundProfile = "apple_chime" | "vision_pop" | "cyber_synth" | "silent";
export type ModelTier = "auto" | "always_local" | "always_cloud";
export type SyncMode = "local_only" | "encrypted_sync";
export type AccessoryStyle = "agent_pill" | "activity_ring" | "siri_orb" | "wpm_counter" | "minimal";

export interface VoiceSettings {
  // Shortcut
  shortcut: string; // e.g. "Ctrl+Shift+Space"
  activationMode: "toggle" | "push_to_talk";

  // UI Theme & Style (Apple Glass & VisionOS)
  pillTheme: PillTheme;
  waveformStyle: WaveformStyle;
  squircleStyle: SquircleStyle;
  barColor: BarColor;
  timerTheme: TimerTheme;
  accessoryStyle?: AccessoryStyle;
  floatingPosition: FloatingPosition;
  glowEffect: boolean;
  showTranscriptPreview: boolean;
  showWpm: boolean;
  showPrivacyBadge: boolean;

  // AI & Dictation Features
  smartClean: boolean; // Auto-remove "um", "uh", repeated filler words
  autoPunctuate: boolean;
  autoCapitalize: boolean;
  dictationMode: DictationMode;
  language: string;
  languageMode?: "direct" | "translation";
  sourceLanguage?: string;
  targetLanguage?: string;
  modelTier: ModelTier;
  rewindEnabled: boolean;
  fuzzySnippetsEnabled: boolean;
  syncMode: SyncMode;

  // Audio Performance & Sound Profiles
  sensitivityBoost: number; // 1.0 to 5.0
  audioCues: boolean;
  soundProfile: SoundProfile;
  noiseGate: boolean;
};

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  shortcut: "Ctrl+Shift+Space",
  activationMode: "toggle",
  pillTheme: "dynamic_island",
  waveformStyle: "dynamic_dots",
  squircleStyle: "apple_glow",
  barColor: "white",
  timerTheme: "dual_tone",
  accessoryStyle: "agent_pill",
  floatingPosition: "bottom_center",
  glowEffect: true,
  showTranscriptPreview: true,
  showWpm: false,
  showPrivacyBadge: true,
  smartClean: true,
  autoPunctuate: true,
  autoCapitalize: true,
  dictationMode: "realtime",
  language: "en-US",
  languageMode: "direct",
  sourceLanguage: "auto",
  targetLanguage: "en-US",
  modelTier: "auto",
  rewindEnabled: true,
  fuzzySnippetsEnabled: true,
  syncMode: "local_only",
  sensitivityBoost: 2.5,
  audioCues: true,
  soundProfile: "apple_chime",
  noiseGate: true,
};

const STORAGE_KEY = "noska_voice_flow_settings";
let memorySettings: VoiceSettings = { ...DEFAULT_VOICE_SETTINGS };

// Load settings initially from localStorage
if (typeof window !== "undefined") {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      memorySettings = { ...DEFAULT_VOICE_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {}
}

const listeners = new Set<(settings: VoiceSettings) => void>();

export function getVoiceSettings(): VoiceSettings {
  return { ...memorySettings };
}

export function setVoiceSettings(patch: Partial<VoiceSettings>) {
  memorySettings = { ...memorySettings, ...patch };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memorySettings));
      window.dispatchEvent(new CustomEvent("noska_voice_settings_changed", { detail: { ...memorySettings } }));
    } catch {}
  }
  const snapshot = { ...memorySettings };
  listeners.forEach((fn) => {
    try {
      fn(snapshot);
    } catch {}
  });
}

export function useVoiceSettings() {
  const [settings, setSettingsState] = useState<VoiceSettings>(getVoiceSettings);

  useEffect(() => {
    const listener = (updated: VoiceSettings) => {
      setSettingsState({ ...updated });
    };
    listeners.add(listener);

    const onCustomEvent = (e: any) => {
      if (e.detail) {
        setSettingsState({ ...e.detail });
      }
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          memorySettings = { ...DEFAULT_VOICE_SETTINGS, ...parsed };
          setSettingsState({ ...memorySettings });
        } catch {}
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("noska_voice_settings_changed", onCustomEvent);
      window.addEventListener("storage", onStorage);
    }

    return () => {
      listeners.delete(listener);
      if (typeof window !== "undefined") {
        window.removeEventListener("noska_voice_settings_changed", onCustomEvent);
        window.removeEventListener("storage", onStorage);
      }
    };
  }, []);

  const update = (patch: Partial<VoiceSettings>) => {
    setVoiceSettings(patch);
  };

  return { settings, update };
}

/** Synthesizes Apple VisionOS & studio audio chimes cued on dictation state */
export function playVoiceChime(type: "start" | "stop") {
  const settings = getVoiceSettings();
  if (!settings.audioCues || settings.soundProfile === "silent" || typeof window === "undefined") return;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (settings.soundProfile === "vision_pop") {
      // Crisp VisionOS glass droplet pop
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      const startFreq = type === "start" ? 640 : 880;
      const endFreq = type === "start" ? 920 : 440;
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.08);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.11);
    } else if (settings.soundProfile === "cyber_synth") {
      // Harmonic dual synth tone
      [580, 870].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "triangle";
        const f = type === "start" ? freq : freq * 0.75;
        osc.frequency.setValueAtTime(f, now);
        osc.frequency.exponentialRampToValueAtTime(type === "start" ? f * 1.3 : f * 0.7, now + 0.12);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.04 / (idx + 1), now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
        osc.start(now);
        osc.stop(now + 0.15);
      });
    } else {
      // Default: Apple Luxury Pure Chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      if (type === "start") {
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.11); // G5
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.07, now + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      } else {
        osc.frequency.setValueAtTime(783.99, now); // G5
        osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.09); // C5
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.05, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
      }
      osc.start(now);
      osc.stop(now + 0.17);
    }

    setTimeout(() => {
      if (ctx.state !== "closed") ctx.close().catch(() => {});
    }, 300);
  } catch {}
}

/** Clean speech transcript from filler words, auto-convert spoken punctuation, and smart-format casing (Wispr Flow style) */
export function cleanVoiceTranscript(text: string, enabled: boolean = true): string {
  if (!text) return text;
  let cleaned = text;

  if (enabled) {
    // 1. Spoken punctuation conversions (Wispr Flow style)
    cleaned = cleaned
      .replace(/\b(period|full stop)\b/gi, ".")
      .replace(/\b(comma)\b/gi, ",")
      .replace(/\b(question mark)\b/gi, "?")
      .replace(/\b(exclamation mark|exclamation point)\b/gi, "!")
      .replace(/\b(new line|next line)\b/gi, "\n")
      .replace(/\b(new paragraph)\b/gi, "\n\n")
      .replace(/\b(colon)\b/gi, ":")
      .replace(/\b(semicolon)\b/gi, ";")
      .replace(/\b(open quote|start quote)\b/gi, ' "')
      .replace(/\b(close quote|end quote)\b/gi, '" ')
      .replace(/\b(dash|hyphen)\b/gi, " — ");

    // 2. Remove filler words & conversational hesitations
    cleaned = cleaned.replace(/\b(um|uh|erm|ah|umm|uhh|you know what I mean)\b/gi, "");

    // 3. Remove immediate duplicate stutter words e.g. "the the" -> "the"
    cleaned = cleaned.replace(/\b([a-zA-Z]+)\s+\1\b/gi, "$1");

    // 4. Clean up spaces around punctuation
    cleaned = cleaned
      .replace(/\s+([.,!?:;])/g, "$1")
      .replace(/([.,!?:;])(?=[^\s\d])/g, "$1 ")
      .replace(/\s{2,}/g, " ")
      .trim();

    // 5. Smart Sentence Capitalization (Wispr Flow engine)
    cleaned = cleaned.replace(/(^\s*|[.!?\n]\s+)([a-z])/g, (_, boundary, letter) => {
      return boundary + letter.toUpperCase();
    });

    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
  }

  return cleaned;
}
