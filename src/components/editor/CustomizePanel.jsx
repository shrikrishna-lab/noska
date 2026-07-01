import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Type, Maximize2, Palette, Image, Lock, Eye, Sparkles,
  Sun, Moon, Monitor, ChevronDown
} from "lucide-react";

const BG_COLORS = [
  { label: "Default", value: null },
  { label: "Dark navy", value: "#1a1a2e" },
  { label: "Deep blue", value: "#16213e" },
  { label: "Royal blue", value: "#0f3460" },
  { label: "Purple", value: "#533483" },
  { label: "Dark red", value: "#3d0000" },
  { label: "Forest", value: "#1b4332" },
  { label: "Charcoal", value: "#2d3436" },
  { label: "Deep violet", value: "#180a20" },
  { label: "Cream", value: "#fff3e0" },
  { label: "Pink", value: "#fce4ec" },
  { label: "Mint", value: "#e8f5e9" },
  { label: "Sky", value: "#e3f2fd" },
  { label: "Warm", value: "#fff8e1" },
  { label: "Lavender", value: "#f3e5f5" },
  { label: "Aqua", value: "#e0f2f1" },
  { label: "Peach", value: "#fbe9e7" },
];

const FONT_OPTIONS = [
  { id: "default", label: "Sans", class: "font-sans", preview: "Aa" },
  { id: "serif", label: "Serif", class: "font-serif", preview: "Aa" },
  { id: "mono", label: "Mono", class: "font-mono", preview: "Aa" },
];

export default function CustomizePanel({ open, onClose, page, onPagePatch, onToast }) {
  const [tab, setTab] = useState("style");

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, x: 320 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 320 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 z-[101] w-[320px] border-l border-[var(--border)] bg-[var(--elevated)] shadow-[var(--shadow-floating)] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
              <div className="flex items-center gap-2">
                <Palette size={15} className="text-[var(--accent)]" />
                <span className="text-sm font-semibold text-[var(--text)]">Customize page</span>
              </div>
              <button
                onClick={onClose}
                className="grid h-7 w-7 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[var(--border)] bg-[var(--surface)]">
              {[
                { id: "style", label: "Style", icon: Palette },
                { id: "cover", label: "Cover", icon: Image },
                { id: "icon", label: "Icon", icon: Sparkles },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium transition cursor-pointer border-b-2 ${
                    tab === t.id
                      ? "border-[var(--accent)] text-[var(--accent)]"
                      : "border-transparent text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  <t.icon size={13} />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {tab === "style" && (
                <div className="p-4 space-y-5">
                  {/* Typography */}
                  <section>
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <Type size={13} className="text-[var(--secondary)]" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Typography</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {FONT_OPTIONS.map((f) => {
                        const isActive = (page?.fontStyle || "default") === f.id;
                        return (
                          <button
                            key={f.id}
                            onClick={() => onPagePatch?.({ fontStyle: f.id })}
                            className={`flex flex-col items-center rounded-lg border py-2.5 px-1 cursor-pointer transition ${
                              isActive
                                ? "border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--accent)]"
                                : "border-[var(--border)] text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
                            }`}
                          >
                            <span className={`text-lg font-bold mb-0.5 ${f.class}`}>{f.preview}</span>
                            <span className="text-[9px] font-medium">{f.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {/* Page Width */}
                  <section>
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <Maximize2 size={13} className="text-[var(--secondary)]" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Page width</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2.5">
                      <span className="text-xs text-[var(--text)]">Full width</span>
                      <button
                        onClick={() => onPagePatch?.({ fullWidth: !page?.fullWidth })}
                        className={`relative h-4 w-7 rounded-full transition-colors cursor-pointer ${
                          page?.fullWidth ? "bg-[var(--accent)]" : "bg-[var(--border)]"
                        }`}
                      >
                        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${
                          page?.fullWidth ? "translate-x-3.5" : "translate-x-0.5"
                        }`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2.5 mt-1.5">
                      <span className="text-xs text-[var(--text)]">Small text</span>
                      <button
                        onClick={() => onPagePatch?.({ smallText: !page?.smallText })}
                        className={`relative h-4 w-7 rounded-full transition-colors cursor-pointer ${
                          page?.smallText ? "bg-[var(--accent)]" : "bg-[var(--border)]"
                        }`}
                      >
                        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${
                          page?.smallText ? "translate-x-3.5" : "translate-x-0.5"
                        }`} />
                      </button>
                    </div>
                  </section>

                  {/* Page Background */}
                  <section>
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <Palette size={13} className="text-[var(--secondary)]" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Page background</span>
                    </div>
                    <div className="grid grid-cols-6 gap-2">
                      {BG_COLORS.map((c) => (
                        <button
                          key={c.value ?? "default"}
                          onClick={() => onPagePatch?.({ pageBg: c.value })}
                          className={`h-8 rounded-lg border-2 transition-all cursor-pointer ${
                            (page?.pageBg ?? null) === c.value
                              ? "border-[var(--accent)] scale-110 ring-1 ring-[var(--accent)]/30"
                              : "border-[var(--border)] hover:border-[var(--border-strong)]"
                          }`}
                          style={c.value ? { background: c.value } : {
                            background: "var(--bg)",
                            borderStyle: "dashed",
                            backgroundImage: "linear-gradient(45deg, var(--border) 25%, transparent 25%, transparent 75%, var(--border) 75%), linear-gradient(45deg, var(--border) 25%, transparent 25%, transparent 75%, var(--border) 75%)",
                            backgroundSize: "6px 6px",
                            backgroundPosition: "0 0, 3px 3px"
                          }}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </section>

                  {/* Lock & Permission */}
                  <section>
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <Lock size={13} className="text-[var(--secondary)]" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Access</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2.5">
                      <span className="flex items-center gap-2 text-xs text-[var(--text)]">
                        <Lock size={13} className="text-[var(--secondary)]" />
                        Lock page
                      </span>
                      <button
                        onClick={() => onPagePatch?.({ isLocked: !page?.isLocked })}
                        className={`relative h-4 w-7 rounded-full transition-colors cursor-pointer ${
                          page?.isLocked ? "bg-[var(--accent)]" : "bg-[var(--border)]"
                        }`}
                      >
                        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${
                          page?.isLocked ? "translate-x-3.5" : "translate-x-0.5"
                        }`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2.5 mt-1.5">
                      <span className="flex items-center gap-2 text-xs text-[var(--text)]">
                        <Eye size={13} className="text-[var(--secondary)]" />
                        Read-only
                      </span>
                      <button
                        onClick={() => onPagePatch?.({ permission: page?.permission === 'view' ? 'edit' : 'view' })}
                        className={`relative h-4 w-7 rounded-full transition-colors cursor-pointer ${
                          page?.permission === 'view' ? "bg-[var(--accent)]" : "bg-[var(--border)]"
                        }`}
                      >
                        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${
                          page?.permission === 'view' ? "translate-x-3.5" : "translate-x-0.5"
                        }`} />
                      </button>
                    </div>
                  </section>
                </div>
              )}

              {tab === "cover" && (
                <div className="p-4 space-y-4">
                  <p className="text-[11px] text-[var(--muted)]">Add a cover image to the top of your page.</p>

                  {/* Cover presets */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "None", value: null, style: { background: "var(--bg)", border: "1px dashed var(--border)" } },
                      { label: "Sunset", value: "linear-gradient(135deg, #ff6b6b, #feca57)", style: { background: "linear-gradient(135deg, #ff6b6b, #feca57)" } },
                      { label: "Ocean", value: "linear-gradient(135deg, #48dbfb, #0abde3)", style: { background: "linear-gradient(135deg, #48dbfb, #0abde3)" } },
                      { label: "Forest", value: "linear-gradient(135deg, #2ecc71, #27ae60)", style: { background: "linear-gradient(135deg, #2ecc71, #27ae60)" } },
                      { label: "Lavender", value: "linear-gradient(135deg, #a29bfe, #6c5ce7)", style: { background: "linear-gradient(135deg, #a29bfe, #6c5ce7)" } },
                      { label: "Peach", value: "linear-gradient(135deg, #fd79a8, #e84393)", style: { background: "linear-gradient(135deg, #fd79a8, #e84393)" } },
                      { label: "Midnight", value: "linear-gradient(135deg, #2d3436, #636e72)", style: { background: "linear-gradient(135deg, #2d3436, #636e72)" } },
                      { label: "Aurora", value: "linear-gradient(135deg, #00b894, #00cec9, #0984e3)", style: { background: "linear-gradient(135deg, #00b894, #00cec9, #0984e3)" } },
                    ].map((cover) => (
                      <button
                        key={cover.label}
                        onClick={() => onPagePatch?.({ cover: cover.value })}
                        className={`h-16 rounded-lg border-2 transition-all cursor-pointer ${
                          page?.cover === cover.value ? "border-[var(--accent)] ring-1 ring-[var(--accent)]/30" : "border-[var(--border)] hover:border-[var(--border-strong)]"
                        }`}
                        style={cover.style}
                        title={cover.label}
                      />
                    ))}
                  </div>

                  <div className="border-t border-[var(--border)] pt-3">
                    <p className="text-[10px] text-[var(--muted)] mb-2">Or paste a cover image URL:</p>
                    <input
                      type="text"
                      value={page?.cover || ""}
                      onChange={(e) => onPagePatch?.({ cover: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                </div>
              )}

              {tab === "icon" && (
                <div className="p-4 space-y-4">
                  <p className="text-[11px] text-[var(--muted)]">Choose a page icon. Current: {page?.icon || "none"}</p>
                  <div className="grid grid-cols-8 gap-1.5">
                    {["📄", "💡", "🚀", "🎯", "⭐", "❤️", "📝", "🎨",
                      "📊", "📚", "🎵", "🎬", "🏠", "📁", "🖥️", "📱",
                      "🌍", "🔬", "💻", "🎮", "📸", "✈️", "🏖️", "🌺",
                      "🧠", "🎪", "🎭", "🏆", "📌", "🔖", "🧩", "🎲"
                    ].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => onPagePatch?.({ icon: emoji })}
                        className={`h-9 w-9 flex items-center justify-center rounded-lg border text-lg cursor-pointer transition ${
                          page?.icon === emoji
                            ? "border-[var(--accent)] bg-[var(--accent)]/5"
                            : "border-[var(--border)] hover:bg-[var(--hover)]"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-[var(--border)] pt-3">
                    <button
                      onClick={() => onPagePatch?.({ icon: null })}
                      className="text-[11px] text-[var(--muted)] hover:text-[var(--text)] transition cursor-pointer"
                    >
                      Remove icon
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[10px] text-[var(--muted)] text-center">
              Changes apply automatically
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
