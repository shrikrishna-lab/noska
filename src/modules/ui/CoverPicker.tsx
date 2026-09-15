import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Upload, Image, Trash2 } from "lucide-react";
import { COVER_CATEGORIES, getAllCovers } from "../../registry/covers/CoverRegistry";

const TABS = [
  { id: "gradients", label: "Gradients" },
  { id: "photos", label: "Photos" },
  { id: "art", label: "Cyber & Art" },
  { id: "textures", label: "Textures" },
  { id: "solids", label: "Colors" },
  { id: "upload", label: "Upload" },
];

export default function CoverPicker({ open, onClose, onSelect, onRemove, currentCover, position }) {
  const [tab, setTab] = useState("gradients");
  const [search, setSearch] = useState("");
  const pickerRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!open) { setSearch(""); setTab("gradients"); return; }
    setTimeout(() => searchRef.current?.focus(), 50);
    const handler = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleSelect = useCallback((cover) => {
    onSelect?.(cover);
    onClose?.();
  }, [onSelect, onClose]);

  const handleUpload = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        onSelect?.({ type: "image", value: ev.target.result, label: "Uploaded image" });
        onClose?.();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [onSelect, onClose]);

  const currentTab = TABS.find(t => t.id === tab);
  const categoryData = tab === "upload" ? null : COVER_CATEGORIES.find(c => c.id === tab);
  const covers = categoryData?.covers || [];

  const filteredCovers = search
    ? covers.filter(c => c.label.toLowerCase().includes(search.toLowerCase()))
    : covers;

  if (!open) return null;

  const content = (
    <>
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />
      <motion.div
        ref={pickerRef}
        drag
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 4 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        style={{
          width: 420,
          ...(position ? { position: "fixed", top: position.top, left: position.left } : {}),
        }}
        className="flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--elevated)] shadow-[var(--shadow-floating)] z-[9999] cursor-default"
      >
      {/* Header - draggable handle */}
      <div className="px-3.5 py-2.5 border-b border-[var(--border)] cursor-grab active:cursor-grabbing bg-[var(--surface)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[var(--text)] flex items-center gap-1.5">
            <Image size={13} className="text-[var(--accent)]" />
            <span>Customize Page Cover</span>
          </span>
          {currentCover && (
            <button
              onClick={() => { onRemove?.(); onClose?.(); }}
              className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 transition cursor-pointer"
            >
              <Trash2 size={11} /> Remove cover
            </button>
          )}
        </div>
        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-none pb-0.5">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-2.5 py-1 text-[10.5px] rounded-lg transition shrink-0 cursor-pointer ${
                tab === t.id
                  ? "bg-[var(--accent)]/15 text-[var(--accent)] font-semibold shadow-2xs"
                  : "text-[var(--muted)] hover:text-[var(--secondary)] hover:bg-[var(--hover)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative border-b border-[var(--border)]">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search all covers..."
          className="w-full bg-transparent px-8 py-2 text-xs text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)]">
            <X size={13} />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin" style={{ maxHeight: 310 }}>
        {tab === "upload" ? (
          <div className="p-4 space-y-3">
            <button
              onClick={handleUpload}
              className="w-full flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] py-8 text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition cursor-pointer bg-[var(--surface)]/50"
            >
              <Upload size={24} />
              <span className="text-xs font-medium">Upload cover image from computer</span>
              <span className="text-[10px]">Recommended: 1600x600 · PNG, JPG, WebP</span>
            </button>
            <div className="pt-1">
              <label className="text-[10px] text-[var(--muted)] block mb-1.5 font-medium">Or paste an image URL:</label>
              <input
                type="text"
                placeholder="https://images.unsplash.com/photo-..."
                onKeyDown={(e) => {
                  const target = e.target as HTMLInputElement;
                  if (e.key === "Enter" && target.value) {
                    handleSelect({ type: "image", value: target.value, label: "Custom URL" });
                  }
                }}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--muted)]"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 p-3">
            {filteredCovers.map((cover) => {
              const isSelected = currentCover === cover.value;
              const isImageUrl = cover.value.startsWith("http") || cover.value.startsWith("data:image");
              return (
                <button
                  key={cover.id}
                  onClick={() => handleSelect(cover)}
                  className={`group relative flex flex-col items-center gap-1 rounded-xl overflow-hidden border transition cursor-pointer ${
                    isSelected
                      ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/40 shadow-sm"
                      : "border-[var(--border)] hover:border-[var(--secondary)] hover:shadow-xs"
                  }`}
                >
                  <div
                    className="w-full h-16 rounded-lg overflow-hidden bg-neutral-900 relative"
                    style={isImageUrl ? { backgroundImage: `url(${cover.value})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: cover.value }}
                  />
                  <span className="text-[9.5px] text-[var(--muted)] pb-1 px-1.5 truncate w-full text-center group-hover:text-[var(--text)] transition">
                    {cover.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[var(--border)] bg-[var(--surface)] px-3 py-2 flex items-center justify-between text-[10px] text-[var(--muted)]">
        <span>{tab === "upload" ? "Upload or link" : `${covers.length} presets`}</span>
        <kbd className="px-1 rounded bg-[var(--hover)] border border-[var(--border)] font-mono">esc</kbd>
      </div>
    </motion.div>
    </>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : content;
}
