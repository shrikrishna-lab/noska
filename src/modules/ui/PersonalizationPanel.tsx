import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Palette, Type, Maximize2, Minimize2, Sun, Moon, Monitor,
  Layout, Sidebar, PanelRight, PanelLeft, Sparkles, Eye, EyeOff,
} from "lucide-react";

const STORAGE_KEY = "noska_preferences";

function loadPreferences() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}

function savePreferences(prefs) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch {}
}

export const PRESETS = {
  minimal: { label: "Minimal", icon: "○", fontStyle: "sans", fullWidth: false, smallText: false, density: "compact", accent: "#6b7280" },
  "workspace-pro": { label: "Workspace Pro", icon: "◆", fontStyle: "sans", fullWidth: true, smallText: false, density: "comfortable", accent: "#6366f1" },
  "creative-studio": { label: "Creative Studio", icon: "✦", fontStyle: "serif", fullWidth: true, smallText: false, density: "spacious", accent: "#ec4899" },
  "knowledge-base": { label: "Knowledge Base", icon: "📚", fontStyle: "sans", fullWidth: false, smallText: false, density: "comfortable", accent: "#14b8a6" },
  "student-mode": { label: "Student Mode", icon: "🎓", fontStyle: "sans", fullWidth: false, smallText: false, density: "compact", accent: "#f59e0b" },
  "compact-mode": { label: "Compact Mode", icon: "⊞", fontStyle: "sans", fullWidth: true, smallText: true, density: "compact", accent: "#8b5cf6" },
  "spacious-mode": { label: "Spacious Mode", icon: "⊟", fontStyle: "sans", fullWidth: true, smallText: false, density: "spacious", accent: "#22c55e" },
  "ai-first": { label: "AI First", icon: "🤖", fontStyle: "mono", fullWidth: true, smallText: false, density: "comfortable", accent: "#a855f7" },
  editorial: { label: "Editorial", icon: "✍️", fontStyle: "serif", fullWidth: false, smallText: false, density: "spacious", accent: "#be123c" },
  "dashboard-heavy": { label: "Dashboard Heavy", icon: "📊", fontStyle: "sans", fullWidth: true, smallText: true, density: "compact", accent: "#0284c7" },
};

const FONT_STYLES = [
  { id: "sans", label: "Sans", value: "sans" },
  { id: "serif", label: "Serif", value: "serif" },
  { id: "mono", label: "Mono", value: "mono" },
];

const DENSITIES = [
  { id: "compact", label: "Compact", icon: "⊟" },
  { id: "comfortable", label: "Comfortable", icon: "⊞" },
  { id: "spacious", label: "Spacious", icon: "⊠" },
];

const ACCENTS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#f43f5e",
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e",
  "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6",
  "#0284c7", "#6b7280", "#78716c",
];

export function usePreferences() {
  const [prefs, setPrefs] = useState(loadPreferences);

  const updatePrefs = useCallback((patch) => {
    setPrefs(prev => {
      const next = { ...prev, ...patch };
      savePreferences(next);
      return next;
    });
  }, []);

  const applyPreset = useCallback((presetId) => {
    const preset = PRESETS[presetId];
    if (preset) updatePrefs(preset);
  }, [updatePrefs]);

  useEffect(() => {
    const handler = () => setPrefs(loadPreferences());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return { preferences: prefs, updatePrefs, applyPreset };
}

export default function PersonalizationPanel({ open, onClose, preferences, onUpdate, onApplyPreset }) {
  if (!open) return null;

  const activePreset = Object.entries(PRESETS).find(([id, p]) =>
    p.fontStyle === preferences.fontStyle &&
    p.fullWidth === preferences.fullWidth &&
    p.smallText === preferences.smallText &&
    p.density === preferences.density
  )?.[0];

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed top-0 right-0 bottom-0 w-[320px] bg-[var(--elevated)] border-l border-[var(--border)] shadow-[var(--shadow-floating)] z-50 overflow-y-auto scrollbar-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <span className="text-sm font-semibold text-[var(--text)]">Customize</span>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-[var(--hover)] text-[var(--muted)] transition cursor-pointer">
          <X size={15} />
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Presets */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] block mb-2">Presets</label>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(PRESETS).map(([id, preset]) => (
              <button
                key={id}
                onClick={() => onApplyPreset?.(id)}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[10px] transition cursor-pointer ${
                  activePreset === id
                    ? "bg-[var(--accent)]/10 text-[var(--accent)] ring-1 ring-[var(--accent)]"
                    : "text-[var(--secondary)] hover:bg-[var(--hover)]"
                }`}
              >
                <span>{preset.icon}</span>
                <span className="truncate">{preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Typography */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] block mb-2">Typography</label>
          <div className="flex gap-1">
            {FONT_STYLES.map(f => (
              <button
                key={f.id}
                onClick={() => onUpdate?.({ fontStyle: f.id })}
                className={`flex-1 px-3 py-2 rounded-lg text-xs transition cursor-pointer ${
                  preferences.fontStyle === f.id
                    ? "bg-[var(--accent)]/10 text-[var(--accent)] ring-1 ring-[var(--accent)]"
                    : "bg-[var(--surface)] text-[var(--secondary)] hover:bg-[var(--hover)]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Density */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] block mb-2">Density</label>
          <div className="flex gap-1">
            {DENSITIES.map(d => (
              <button
                key={d.id}
                onClick={() => onUpdate?.({ density: d.id })}
                className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs transition cursor-pointer ${
                  preferences.density === d.id
                    ? "bg-[var(--accent)]/10 text-[var(--accent)] ring-1 ring-[var(--accent)]"
                    : "bg-[var(--surface)] text-[var(--secondary)] hover:bg-[var(--hover)]"
                }`}
              >
                <span>{d.icon}</span>
                <span>{d.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Page layout */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] block mb-2">Page layout</label>
          <div className="flex gap-1">
            <button
              onClick={() => onUpdate?.({ fullWidth: false })}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs transition cursor-pointer ${
                !preferences.fullWidth
                  ? "bg-[var(--accent)]/10 text-[var(--accent)] ring-1 ring-[var(--accent)]"
                  : "bg-[var(--surface)] text-[var(--secondary)] hover:bg-[var(--hover)]"
              }`}
            >
              <Minimize2 size={12} /> Centered
            </button>
            <button
              onClick={() => onUpdate?.({ fullWidth: true })}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs transition cursor-pointer ${
                preferences.fullWidth
                  ? "bg-[var(--accent)]/10 text-[var(--accent)] ring-1 ring-[var(--accent)]"
                  : "bg-[var(--surface)] text-[var(--secondary)] hover:bg-[var(--hover)]"
              }`}
            >
              <Maximize2 size={12} /> Full
            </button>
          </div>
        </div>

        {/* Text size */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] block mb-2">Text size</label>
          <button
            onClick={() => onUpdate?.({ smallText: !preferences.smallText })}
            className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs transition cursor-pointer ${
              preferences.smallText
                ? "bg-[var(--accent)]/10 text-[var(--accent)] ring-1 ring-[var(--accent)]"
                : "bg-[var(--surface)] text-[var(--secondary)] hover:bg-[var(--hover)]"
            }`}
          >
            {preferences.smallText ? <Eye size={13} /> : <EyeOff size={13} />}
            {preferences.smallText ? "Small text (on)" : "Small text (off)"}
          </button>
        </div>

        {/* Accent color */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] block mb-2">Accent color</label>
          <div className="flex flex-wrap gap-1.5">
            {ACCENTS.map(color => (
              <button
                key={color}
                onClick={() => onUpdate?.({ accent: color })}
                className={`w-7 h-7 rounded-full transition cursor-pointer ${
                  preferences.accent === color ? "ring-2 ring-offset-2 ring-offset-[var(--elevated)] ring-[var(--accent)] scale-110" : ""
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
