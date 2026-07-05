import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Star, Clock, Upload, Grid3x3, Heart, Sparkles } from "lucide-react";
import {
  EMOJI_BY_CATEGORY, EMOJI_ICONS, getRecentIcons, getFavoriteIcons,
  addRecentIcon, toggleFavoriteIcon, isFavoriteIcon, subscribe,
  searchEmojis, getEmojiDescription, LUCIDE_ICON_NAMES, ICON_MAP,
} from "../../registry/icons/IconRegistry";

const TABS = [
  { id: "emoji", label: "Emoji", icon: "😊" },
  { id: "icons", label: "Icons", icon: "✦" },
  { id: "recent", label: "Recent", icon: "⏰" },
  { id: "favorites", label: "Favorites", icon: "★" },
  { id: "upload", label: "Upload", icon: "📁" },
];

export default function IconPicker({ open, onClose, onSelect, currentIcon, position }) {
  const [tab, setTab] = useState("emoji");
  const [search, setSearch] = useState("");
  const [emojiCategory, setEmojiCategory] = useState("emoji");
  const [recentIcons, setRecentIcons] = useState(getRecentIcons());
  const [favoriteIcons, setFavoriteIcons] = useState(getFavoriteIcons());
  const [previewEmoji, setPreviewEmoji] = useState(null);
  const pickerRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setTab("emoji");
      setPreviewEmoji(null);
      return;
    }
    setTimeout(() => searchRef.current?.focus(), 50);
    const handler = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    const unsub = subscribe(() => {
      setRecentIcons(getRecentIcons());
      setFavoriteIcons(getFavoriteIcons());
    });
    return unsub;
  }, []);

  const handleSelect = useCallback((icon) => {
    addRecentIcon(icon);
    onSelect?.(icon);
    onClose?.();
  }, [onSelect, onClose]);

  const handleUpload = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,.svg";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        addRecentIcon(url);
        onSelect?.(url);
        onClose?.();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [onSelect, onClose]);

  const emojiResults = useMemo(() => {
    if (!search) {
      const cat = EMOJI_BY_CATEGORY.find(c => c.id === emojiCategory);
      return cat?.icons || EMOJI_ICONS;
    }
    return searchEmojis(search);
  }, [search, emojiCategory]);

  const filteredLucide = useMemo(() => {
    if (!search) return LUCIDE_ICON_NAMES.slice(0, 100);
    const q = search.toLowerCase();
    return LUCIDE_ICON_NAMES.filter(n => n.toLowerCase().includes(q)).slice(0, 200);
  }, [search]);

  const favoriteKeys = useMemo(() => new Set(favoriteIcons), [favoriteIcons]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[139]" onClick={onClose} />
      <motion.div
      ref={pickerRef}
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 4 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      style={{
        width: 340,
        ...(position ? { position: "fixed", top: position.top, left: position.left } : {}),
      }}
      className="flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--elevated)] shadow-[var(--shadow-floating)] z-[140]"
    >
      {/* Search */}
      <div className="relative border-b border-[var(--border)]">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search icons..."
          className="w-full bg-transparent px-8 py-2.5 text-xs text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)]">
            <X size={13} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] bg-[var(--surface)] overflow-x-auto scrollbar-none">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSearch(""); }}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-[10px] font-medium whitespace-nowrap transition-all cursor-pointer ${
              tab === t.id
                ? "text-[var(--accent)] border-b-2 border-[var(--accent)] bg-[var(--accent)]/8 shadow-[inset_0_1px_0_var(--accent)/5]"
                : "text-[var(--muted)] hover:text-[var(--secondary)] hover:bg-[var(--hover)]"
            }`}
          >
            <span className="text-xs">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-none" style={{ maxHeight: 300 }}>
        {tab === "emoji" && (
          <>
            {/* Category sub-tabs */}
            {!search && (
              <div className="flex gap-1 p-2 border-b border-[var(--border)] overflow-x-auto scrollbar-none">
                {EMOJI_BY_CATEGORY.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setEmojiCategory(cat.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-md whitespace-nowrap transition-all cursor-pointer ${
                      emojiCategory === cat.id
                        ? "bg-[var(--accent)]/10 text-[var(--accent)] font-medium shadow-sm"
                        : "text-[var(--muted)] hover:text-[var(--secondary)] hover:bg-[var(--hover)]"
                    }`}
                  >
                    <span className="text-xs">{cat.icons?.[0] || "📋"}</span>
                    {cat.label}
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-8 gap-1 p-2">
              {emojiResults.map((emoji, i) => (
                <motion.button
                  key={`${emoji}-${i}`}
                  onClick={() => handleSelect(emoji)}
                  onMouseEnter={() => setPreviewEmoji(emoji)}
                  onMouseLeave={() => setPreviewEmoji(null)}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  className={`flex items-center justify-center h-9 w-9 rounded-lg text-lg transition-colors cursor-pointer ${
                    currentIcon === emoji ? "bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]" : "hover:bg-[var(--hover)]"
                  }`}
                  title={getEmojiDescription(emoji) || emoji}
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          </>
        )}

        {tab === "icons" && (
          <div className="grid grid-cols-6 gap-1 p-2">
            {filteredLucide.map(name => (
              <button
                key={name}
                onClick={() => handleSelect(name)}
                className={`flex items-center justify-center h-9 w-full rounded-lg text-[var(--text)] transition cursor-pointer ${
                  currentIcon === name ? "bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]" : "hover:bg-[var(--hover)]"
                }`}
                title={name}
              >
                <span className="text-[11px] font-medium truncate px-1">{name}</span>
              </button>
            ))}
          </div>
        )}

        {tab === "recent" && (
          <div className="p-2">
            {recentIcons.length === 0 ? (
              <div className="py-8 text-center text-[10px] text-[var(--muted)]">No recent icons</div>
            ) : (
              <div className="grid grid-cols-8 gap-1">
                {recentIcons.map((icon, i) => (
                  <button
                    key={`${icon}-${i}`}
                    onClick={() => handleSelect(icon)}
                    className="flex items-center justify-center h-9 rounded-lg text-lg hover:bg-[var(--hover)] transition cursor-pointer"
                  >
                    {icon.length <= 2 ? icon : <span className="text-[10px] truncate">{icon}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "favorites" && (
          <div className="p-2">
            {favoriteIcons.length === 0 ? (
              <div className="py-8 text-center text-[10px] text-[var(--muted)]">No favorite icons. Click the star on an icon to save it.</div>
            ) : (
              <div className="grid grid-cols-8 gap-1">
                {favoriteIcons.map((icon, i) => (
                  <button
                    key={`${icon}-${i}`}
                    onClick={() => handleSelect(icon)}
                    className="flex items-center justify-center h-9 rounded-lg text-lg hover:bg-[var(--hover)] transition cursor-pointer"
                  >
                    {icon.length <= 2 ? icon : <span className="text-[10px] truncate">{icon}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "upload" && (
          <div className="p-4">
            <button
              onClick={handleUpload}
              className="w-full flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] py-8 text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition cursor-pointer"
            >
              <Upload size={24} />
              <span className="text-xs font-medium">Upload an image or SVG</span>
              <span className="text-[10px]">PNG, JPG, GIF, SVG supported</span>
            </button>
          </div>
        )}
      </div>

      {/* Preview bar */}
      <AnimatePresence>
        {previewEmoji && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-[var(--border)] bg-[var(--surface)] overflow-hidden"
          >
            <div className="flex items-center gap-3 px-3 py-2">
              <span className="text-2xl">{previewEmoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium text-[var(--text)] truncate">
                  {getEmojiDescription(previewEmoji) || previewEmoji}
                </div>
                <div className="text-[9px] text-[var(--muted)]">Click to insert</div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); toggleFavoriteIcon(previewEmoji); }}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  isFavoriteIcon(previewEmoji) ? "text-[var(--warning)]" : "text-[var(--muted)] hover:text-[var(--secondary)]"
                }`}
              >
                <Star size={13} fill={isFavoriteIcon(previewEmoji) ? "currentColor" : "none"} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="border-t border-[var(--border)] bg-[var(--surface)] px-3 py-2 flex items-center justify-between text-[10px] text-[var(--muted)]">
        <span>{tab === "emoji" ? `${emojiResults.length} emojis` : tab === "icons" ? `${filteredLucide.length} icons` : ""}</span>
        <kbd className="px-1 rounded bg-[var(--hover)] border border-[var(--border)] font-mono">esc</kbd>
      </div>
    </motion.div>
    </>
  );
}
