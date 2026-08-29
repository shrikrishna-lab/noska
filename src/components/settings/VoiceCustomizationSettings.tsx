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
} from "lucide-react";
import {
  useVoiceSettings,
  PillTheme,
  BarColor,
  TimerTheme,
  WaveformStyle,
  SquircleStyle,
  FloatingPosition,
  SoundProfile,
  DEFAULT_VOICE_SETTINGS,
  playVoiceChime,
  setVoiceSettings,
} from "../../lib/voice/voice-settings";
import { RealtimeEqualizer, StreamingWordText } from "../ui/voice-input";
import { useVoiceController, globalVoiceController } from "../../lib/voice/voice-controller";
import ElevenLabsVoiceSettings from "./ElevenLabsVoiceSettings";

const THEMES: { id: PillTheme; label: string; bg: string; border: string; glow: string; desc: string }[] = [
  {
    id: "dark_charcoal",
    label: "Wispr Charcoal",
    bg: "bg-[#141416]",
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
];

const SHORTCUT_OPTIONS = [
  "Ctrl+Shift+Space",
  "Alt+Space",
  "Ctrl+Shift+V",
  "Ctrl+Win",
  "Alt+Shift+Space",
];

const WAVEFORM_STYLES: { id: WaveformStyle; label: string }[] = [
  { id: "formant_13", label: "13-Bar Formant Wave" },
  { id: "dense_24", label: "24-Bar Studio Spectrum" },
  { id: "minimal_pulse", label: "3-Orb Siri Pulse" },
];

const BAR_COLORS: { id: BarColor; label: string; bgClass: string }[] = [
  { id: "white", label: "Pure White", bgClass: "bg-white" },
  { id: "cyan", label: "Electric Cyan", bgClass: "bg-sky-400" },
  { id: "violet", label: "Neon Violet", bgClass: "bg-purple-400" },
  { id: "amber", label: "Amber Gold", bgClass: "bg-amber-400" },
  { id: "emerald", label: "Emerald Glow", bgClass: "bg-emerald-400" },
  { id: "gradient", label: "Sunset Glow", bgClass: "bg-gradient-to-t from-pink-500 to-amber-300" },
];

const TIMER_THEMES: { id: TimerTheme; label: string }[] = [
  { id: "dual_tone", label: "Dual Tone (Cyan & Amber)" },
  { id: "cyan_gold", label: "Cyan & Gold" },
  { id: "monochrome", label: "San Francisco Mono" },
  { id: "sunset", label: "Sunset Rose" },
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
      {/* Title */}
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-[32px] font-normal tracking-tight font-serif text-[#1c1b18]">
          Voice & Dictation
        </h1>

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
          <span className="text-[11px]">
            {isListening ? "Recording live..." : "Click pill to test speech recognition"}
          </span>
        </div>

        <div className="flex flex-col items-center justify-center py-7 bg-black/60 rounded-xl border border-white/10 relative overflow-hidden">
          {/* Active Liquid Glass Pill */}
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
            className={`inline-flex items-center h-11 px-4 rounded-full ${currentTheme.bg} border ${currentTheme.border} text-white ${currentTheme.glow} gap-3.5 select-none cursor-pointer transition-all hover:scale-[1.02]`}
          >
            {/* White Squircle Stop / Action Button */}
            <motion.button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isListening) {
                  globalVoiceController.stop();
                  stop();
                } else {
                  toggle();
                }
              }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.88 }}
              className="w-4 h-4 rounded-[5px] bg-[#f0f0f0] shadow-[0_0_10px_rgba(255,255,255,0.8),0_0_20px_rgba(255,255,255,0.35)] flex-shrink-0 cursor-pointer transition-all"
              aria-label={isListening ? "Stop voice recording" : "Start voice recording"}
            />

            {/* Waveform Equalizer */}
            <RealtimeEqualizer
              isListening={isListening}
              barColor={settings.barColor}
              styleOverride={settings.waveformStyle}
            />

            {/* Timer Display */}
            <div className="flex items-center font-mono text-[13px] font-semibold tracking-wider select-none leading-none">
              {settings.timerTheme === "dual_tone" && (
                <>
                  <span className="text-[#00c8ff]">{isListening ? mins : "00"}</span>
                  <span className="text-white/30 px-[1px]">:</span>
                  <span className="text-[#ff9f1c]">{isListening ? secs : "03"}</span>
                </>
              )}
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
            </div>
          </div>

          {/* Real-Time Live Transcript Preview */}
          <div className="mt-3 text-xs text-white/80 font-medium min-h-5 max-w-md text-center px-4 flex items-center justify-center">
            {isListening ? (
              liveTranscript ? (
                <StreamingWordText text={liveTranscript} isListening={isListening} />
              ) : (
                <span className="text-white/60">Microphone active... speak now</span>
              )
            ) : (
              <span className="text-white/50">Click widget to test real-time dictation</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Wispr Flow Clean Settings Card */}
      <div className="rounded-2xl bg-[#f8f6f0] p-6 shadow-sm divide-y divide-[#e8e4db]">
        {/* 1. Shortcuts Row */}
        <div className="py-4 first:pt-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-[#1c1b18]">Shortcuts</div>
              <div className="text-xs text-[#706c64] mt-0.5">
                Press <span className="font-semibold text-[#1c1b18]">{settings.shortcut}</span> anywhere to dictate.
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

        {/* 2. Capsule Theme Row */}
        <div className="py-4">
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
            <div className="mt-3 pt-3 border-t border-[#e8e4db] grid grid-cols-2 sm:grid-cols-3 gap-2">
              {THEMES.map((th) => (
                <button
                  key={th.id}
                  onClick={() => update({ pillTheme: th.id })}
                  className={`p-2.5 rounded-xl text-left text-xs font-semibold transition cursor-pointer ${
                    settings.pillTheme === th.id
                      ? "bg-[#1c1b18] text-white"
                      : "bg-[#ede8df] text-[#4a4742] hover:bg-[#e4ded3]"
                  }`}
                >
                  <div>{th.label}</div>
                  <div className="text-[10px] opacity-70 truncate mt-0.5">{th.desc}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 3. Equalizer Bars & Visualizer Row */}
        <div className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-[#1c1b18]">Waveform Equalizer</div>
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
              <div className="flex flex-wrap gap-2">
                {WAVEFORM_STYLES.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => update({ waveformStyle: ws.id })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      settings.waveformStyle === ws.id
                        ? "bg-[#1c1b18] text-white"
                        : "bg-[#ede8df] text-[#4a4742] hover:bg-[#e4ded3]"
                    }`}
                  >
                    {ws.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {BAR_COLORS.map((bc) => (
                  <button
                    key={bc.id}
                    onClick={() => update({ barColor: bc.id })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      settings.barColor === bc.id
                        ? "bg-[#1c1b18] text-white"
                        : "bg-[#ede8df] text-[#4a4742] hover:bg-[#e4ded3]"
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${bc.bgClass}`} />
                    <span>{bc.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 4. Timer Format Row */}
        <div className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-[#1c1b18]">Timer Style</div>
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
            <div className="mt-3 pt-3 border-t border-[#e8e4db] flex flex-wrap gap-2">
              {TIMER_THEMES.map((tt) => (
                <button
                  key={tt.id}
                  onClick={() => update({ timerTheme: tt.id })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    settings.timerTheme === tt.id
                      ? "bg-[#1c1b18] text-white"
                      : "bg-[#ede8df] text-[#4a4742] hover:bg-[#e4ded3]"
                  }`}
                >
                  {tt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 5. Dictation Languages Row */}
        <div className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-[#1c1b18]">Dictation Languages</div>
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

        {/* 6. Smart Filler Word Cleaning */}
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

        {/* 7. ElevenLabs Studio & Custom Voice Models Section */}
        <ElevenLabsVoiceSettings />
      </div>
    </div>
  );
}

