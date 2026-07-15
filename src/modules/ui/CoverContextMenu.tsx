import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlignCenter, AlignStartVertical, AlignEndVertical,
  Maximize2, Minus, Plus, RotateCcw
} from "lucide-react";

const positions = [
  { id: "top", icon: AlignStartVertical, label: "Top" },
  { id: "center", icon: AlignCenter, label: "Center" },
  { id: "bottom", icon: AlignEndVertical, label: "Bottom" }
];

const sizes = [
  { id: "full", icon: Maximize2, label: "Full width" },
  { id: "wide", label: "Wide" },
  { id: "standard", label: "Standard" },
  { id: "small", label: "Small" }
];

const defaults = {
  coverPosition: "center",
  coverSize: "full",
  coverHeight: 160,
  coverParallax: false,
  coverBlur: 0,
  coverOverlay: false,
  coverBrightness: 100
};

export default function CoverContextMenu({ open, position, settings, onUpdate, onClose }) {
  const menuRef = useRef(null);
  const [closing, setClosing] = useState(false);

  const s = { ...defaults, ...settings };

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setClosing(true);
        setTimeout(() => { setClosing(false); onClose(); }, 150);
      }
    };
    setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") { setClosing(true); setTimeout(() => { setClosing(false); onClose(); }, 150); }
    };
    if (open) {
      setTimeout(() => document.addEventListener("keydown", handler), 0);
      return () => document.removeEventListener("keydown", handler);
    }
  }, [open, onClose]);

  const update = useCallback((key, val) => {
    onUpdate?.({ ...s, [key]: val });
  }, [s, onUpdate]);

  const resetAll = useCallback(() => {
    onUpdate?.({ ...defaults });
  }, [onUpdate]);

  const MENU_W = 256;
  const MENU_H = 410;
  const margin = 8;
  let menuX = position?.left ?? 0;
  const menuY = Math.min(Math.max(position?.top ?? 0, margin), window.innerHeight - MENU_H - margin);
  if (menuX + MENU_W > window.innerWidth - margin) {
    menuX = Math.max(margin, menuX - MENU_W);
  }
  menuX = Math.max(margin, Math.min(menuX, window.innerWidth - MENU_W - margin));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95, y: -4 }}
          animate={closing ? { opacity: 0, scale: 0.95, y: -4 } : { opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -4 }}
          transition={{ duration: 0.12 }}
          className="fixed z-[9999] w-64 rounded-xl border border-white/[0.08] bg-[#1a1a1e] shadow-2xl shadow-black/50 overflow-hidden"
          style={{ left: menuX, top: menuY }}
        >
          <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-xs font-medium text-white">Cover settings</span>
            <button
              onClick={resetAll}
              className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)] hover:text-white transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>

          <div className="p-3 space-y-3">
            {/* Position */}
            <div>
              <p className="text-[10px] font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Position</p>
              <div className="flex gap-1">
                {positions.map(p => (
                  <button
                    key={p.id}
                    onClick={() => update("coverPosition", p.id)}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                      s.coverPosition === p.id
                        ? "bg-noska-blue/20 text-noska-blue border border-noska-blue/30"
                        : "bg-white/[0.04] text-[var(--text-secondary)] hover:bg-white/[0.08] hover:text-white border border-transparent"
                    }`}
                  >
                    <p.icon className="w-3 h-3" />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Size */}
            <div>
              <p className="text-[10px] font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Size</p>
              <div className="grid grid-cols-2 gap-1">
                {sizes.map(sz => (
                  <button
                    key={sz.id}
                    onClick={() => update("coverSize", sz.id)}
                    className={`py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                      s.coverSize === sz.id
                        ? "bg-noska-blue/20 text-noska-blue border border-noska-blue/30"
                        : "bg-white/[0.04] text-[var(--text-secondary)] hover:bg-white/[0.08] hover:text-white border border-transparent"
                    }`}
                  >
                    {sz.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Height slider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">Height</p>
                <span className="text-[10px] font-mono text-[var(--text-secondary)]">{s.coverHeight}px</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => update("coverHeight", Math.max(80, s.coverHeight - 16))}
                  className="w-6 h-6 flex items-center justify-center rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-[var(--text-secondary)]"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="range"
                  min="80"
                  max="400"
                  step="8"
                  value={s.coverHeight}
                  onChange={(e) => update("coverHeight", parseInt(e.target.value))}
                  className="flex-1 h-1 appearance-none bg-white/[0.08] rounded-full cursor-pointer accent-noska-blue [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-noska-blue"
                />
                <button
                  onClick={() => update("coverHeight", Math.min(400, s.coverHeight + 16))}
                  className="w-6 h-6 flex items-center justify-center rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-[var(--text-secondary)]"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Parallax */}
            <div>
              <p className="text-[10px] font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Effects</p>
              <label className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-white/[0.03] cursor-pointer hover:bg-white/[0.06] transition-colors">
                <span className="text-xs text-white">Parallax scroll</span>
                <div
                  onClick={() => update("coverParallax", !s.coverParallax)}
                  className={`w-7 h-4 rounded-full transition-colors cursor-pointer relative ${
                    s.coverParallax ? "bg-noska-blue" : "bg-white/[0.12]"
                  }`}
                >
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${
                    s.coverParallax ? "translate-x-3.5" : "translate-x-0.5"
                  }`} />
                </div>
              </label>
              <label className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-white/[0.03] cursor-pointer hover:bg-white/[0.06] transition-colors mt-1">
                <span className="text-xs text-white">Color overlay</span>
                <div
                  onClick={() => update("coverOverlay", !s.coverOverlay)}
                  className={`w-7 h-4 rounded-full transition-colors cursor-pointer relative ${
                    s.coverOverlay ? "bg-noska-blue" : "bg-white/[0.12]"
                  }`}
                >
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${
                    s.coverOverlay ? "translate-x-3.5" : "translate-x-0.5"
                  }`} />
                </div>
              </label>

              {/* Brightness */}
              {s.coverOverlay && (
                <div className="mt-2 pl-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] text-[var(--text-secondary)]">Brightness</p>
                    <span className="text-[10px] font-mono text-[var(--text-secondary)]">{s.coverBrightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="100"
                    step="5"
                    value={s.coverBrightness}
                    onChange={(e) => update("coverBrightness", parseInt(e.target.value))}
                    className="w-full h-1 appearance-none bg-white/[0.08] rounded-full cursor-pointer accent-noska-blue [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-noska-blue"
                  />
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
