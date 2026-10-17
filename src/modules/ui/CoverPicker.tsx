import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Upload, Image, Trash2, Check, Sparkles, Link2 } from "lucide-react";
import { COVER_CATEGORIES, getAllCovers } from "../../registry/covers/CoverRegistry";
import { optimizeImage } from "../../lib/supabaseService";

const TABS = [
  { id: "gradients", label: "Gradients" },
  { id: "photos", label: "Photos" },
  { id: "art", label: "Cyber & Art" },
  { id: "textures", label: "Textures" },
  { id: "solids", label: "Colors" },
  { id: "upload", label: "Upload" },
];

interface CoverPickerProps {
  open: boolean;
  onClose?: () => void;
  onSelect?: (cover: any) => void;
  onRemove?: () => void;
  currentCover?: string | null;
  position?: { top: number; left: number };
}

export default function CoverPicker({ open, onClose, onSelect, onRemove, currentCover, position }: CoverPickerProps) {
  const [tab, setTab] = useState("gradients");
  const [search, setSearch] = useState("");
  const [uploadError, setUploadError] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setTab("gradients");
      return;
    }
    setTimeout(() => searchRef.current?.focus(), 60);
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleSelect = useCallback((cover: any) => {
    if (typeof cover.value === "string" && /^\s*blob:/i.test(cover.value)) {
      setUploadError("Temporary image URLs cannot be saved. Upload the image instead.");
      return;
    }
    setUploadError("");
    onSelect?.(cover);
    onClose?.();
  }, [onSelect, onClose]);

  const handleUpload = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
        setUploadError("Choose an image no larger than 2 MB.");
        return;
      }
      setUploadError("");
      const optimized = await optimizeImage(file);
      const reader = new FileReader();
      reader.onload = () => {
        handleSelect({ type: "image", value: reader.result, label: "Uploaded image" });
      };
      reader.onerror = () => setUploadError("Unable to read image. Please try again.");
      reader.readAsDataURL(optimized);
    };
    input.click();
  }, [handleSelect]);

  const categoryData = tab === "upload" ? null : COVER_CATEGORIES.find((c) => c.id === tab);
  const covers = categoryData?.covers || [];

  const filteredCovers = search
    ? covers.filter((c) => c.label.toLowerCase().includes(search.toLowerCase()))
    : covers;

  if (!open) return null;

  const content = (
    <>
      {/* Light backdrop dismiss */}
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />

      {/* Floating Apple Liquid Glass Modal */}
      <motion.div
        ref={pickerRef}
        drag
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 6 }}
        transition={{ type: "spring", stiffness: 420, damping: 30 }}
        style={{
          width: 440,
          ...(position ? { position: "fixed", top: position.top, left: position.left } : {}),
        }}
        className="flex flex-col overflow-hidden rounded-[24px] border border-black/10 dark:border-white/12 bg-white/90 dark:bg-[#16171b]/92 backdrop-blur-3xl shadow-[0_24px_64px_-12px_rgba(0,0,0,0.2),0_1px_2px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.95)] dark:shadow-[0_28px_72px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.12)] z-[9999] cursor-default select-none font-sans"
      >
        {/* Header with Draggable Handle & Title */}
        <div className="px-4 pt-3.5 pb-2 cursor-grab active:cursor-grabbing border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Image size={13} strokeWidth={2.4} />
              </div>
              <div>
                <h3 className="text-[12.5px] font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">Customize Page Cover</h3>
                <p className="text-[9.5px] text-[var(--muted)]">Curated palettes, artworks & textures</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {currentCover && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { onRemove?.(); onClose?.(); }}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-[10.5px] font-medium text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 size={11} strokeWidth={2.2} />
                  <span>Remove</span>
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={onClose}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-neutral-900 dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.1] transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X size={13} strokeWidth={2.4} />
              </motion.button>
            </div>
          </div>

          {/* Apple Segmented Pill Tabs */}
          <div className="relative flex items-center gap-1 p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.06] overflow-x-auto scrollbar-none">
            {TABS.map((t) => {
              const isSelected = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`relative z-10 px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors shrink-0 cursor-pointer select-none ${
                    isSelected
                      ? "text-neutral-900 dark:text-white font-semibold"
                      : "text-[var(--muted)] hover:text-neutral-900 dark:hover:text-white"
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="active-cover-tab"
                      className="absolute inset-0 bg-white dark:bg-[#23252c] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.1),0_0_0_0.5px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.14)] -z-10"
                      transition={{ type: "spring", stiffness: 480, damping: 34 }}
                    />
                  )}
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Apple Inset Search Field (hidden on Upload tab) */}
        {tab !== "upload" && (
          <div className="px-3.5 pt-2.5 pb-1">
            <div className="relative flex items-center rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.06] px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-[#0066FF]/30 focus-within:border-[#0066FF] transition-all">
              <Search size={13} strokeWidth={2.4} className="text-[var(--muted)] shrink-0 mr-2" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search all covers..."
                className="w-full bg-transparent text-[11.5px] text-neutral-900 dark:text-white outline-none placeholder:text-[var(--muted)]"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="w-4 h-4 rounded-full flex items-center justify-center bg-black/10 dark:bg-white/20 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white shrink-0 ml-1.5 transition-colors"
                >
                  <X size={10} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-3.5 py-2.5" style={{ maxHeight: 310 }}>
          {tab === "upload" ? (
            <div className="space-y-3.5 p-1">
              <motion.button
                whileHover={{ scale: 1.01, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleUpload}
                className="w-full flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-black/12 dark:border-white/15 py-8 px-4 text-[var(--muted)] hover:border-[#0066FF] dark:hover:border-[#4791FF] hover:text-neutral-900 dark:hover:text-white transition-all cursor-pointer bg-black/[0.015] dark:bg-white/[0.02]"
              >
                <div className="w-10 h-10 rounded-2xl bg-[#0066FF]/10 dark:bg-[#4791FF]/15 text-[#0066FF] dark:text-[#4791FF] flex items-center justify-center shadow-xs">
                  <Upload size={18} strokeWidth={2.2} />
                </div>
                <div className="text-center">
                  <span className="text-[12px] font-semibold block text-neutral-900 dark:text-neutral-100">Upload cover image</span>
                  <span className="text-[10px] text-[var(--muted)] mt-0.5 block">PNG, JPG, WebP up to 2 MB (1600 × 600 recommended)</span>
                </div>
              </motion.button>

              {uploadError && (
                <p role="alert" className="text-[11px] font-medium text-rose-500 bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20">
                  {uploadError}
                </p>
              )}

              <div className="pt-1">
                <label className="text-[10.5px] font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5 flex items-center gap-1.5">
                  <Link2 size={12} className="text-[var(--muted)]" />
                  <span>Or paste image URL</span>
                </label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  onKeyDown={(e) => {
                    const target = e.target as HTMLInputElement;
                    if (e.key === "Enter" && target.value) {
                      handleSelect({ type: "image", value: target.value, label: "Custom URL" });
                    }
                  }}
                  className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.04] px-3 py-2 text-[11.5px] text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0066FF]/30 focus:border-[#0066FF] placeholder:text-[var(--muted)] transition-all"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {filteredCovers.map((cover) => {
                const isSelected = currentCover === cover.value;
                const isImageUrl = cover.value.startsWith("http") || cover.value.startsWith("data:image");
                return (
                  <motion.button
                    key={cover.id}
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 450, damping: 26 }}
                    onClick={() => handleSelect(cover)}
                    className={`group relative flex flex-col rounded-xl overflow-hidden border transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#0066FF] dark:border-[#4791FF] ring-2 ring-[#0066FF]/35 dark:ring-[#4791FF]/40 shadow-[0_4px_16px_rgba(0,102,255,0.25)]"
                        : "border-black/10 dark:border-white/10 hover:border-black/25 dark:hover:border-white/30 hover:shadow-md"
                    }`}
                  >
                    {/* Visual Preview Canvas */}
                    <div
                      className="w-full h-16 rounded-t-[10px] overflow-hidden bg-neutral-900 relative transition-transform duration-300 group-hover:scale-105"
                      style={
                        isImageUrl
                          ? { backgroundImage: `url(${cover.value})`, backgroundSize: "cover", backgroundPosition: "center" }
                          : { background: cover.value }
                      }
                    >
                      {/* Active checkmark badge */}
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#0066FF] dark:bg-[#4791FF] text-white flex items-center justify-center shadow-md">
                          <Check size={11} strokeWidth={3} />
                        </div>
                      )}
                    </div>

                    {/* Label strip */}
                    <div className="w-full bg-white/95 dark:bg-[#1a1b20]/95 py-1 px-1.5 text-center border-t border-black/[0.04] dark:border-white/[0.06]">
                      <span className="text-[10px] font-medium text-neutral-700 dark:text-neutral-300 truncate block w-full group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">
                        {cover.label}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with Apple status summary & esc badge */}
        <div className="border-t border-black/[0.06] dark:border-white/[0.08] px-4 py-2.5 flex items-center justify-between text-[10.5px] text-[var(--muted)] bg-black/[0.015] dark:bg-white/[0.02]">
          <span className="font-medium">
            {tab === "upload" ? "Upload or link directly" : `${filteredCovers.length} presets available`}
          </span>
          <kbd className="px-1.5 py-0.5 rounded-md bg-black/[0.05] dark:bg-white/[0.1] border border-black/10 dark:border-white/10 font-mono text-[9.5px]">
            esc
          </kbd>
        </div>
      </motion.div>
    </>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : content;
}
