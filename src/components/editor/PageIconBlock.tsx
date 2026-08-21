import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smile,
  Sliders,
  RotateCcw,
  Trash2,
  Shuffle,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Upload,
  Search,
  X,
  Layers,
  Sparkles,
  Plus,
  FolderPlus,
  Tag
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { Page } from "../../lib/supabaseService";
import { emojis } from "../../utils/helpers";
import {
  EMOJI_BY_CATEGORY,
  EMOJI_ICONS,
  searchEmojis,
  LUCIDE_ICON_NAMES,
  getImportedIcons,
  addImportedIcon,
  removeImportedIcon,
  getImportedCategories,
  type ImportedIcon
} from "../../registry/icons/IconRegistry";

interface PageIconBlockProps {
  page: Page;
  isEditable: boolean;
  onPagePatch: (patch: Partial<Page>) => void;
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
  hasCover?: boolean;
}

export default function PageIconBlock({
  page,
  isEditable,
  onPagePatch,
  open,
  onClose,
  onOpen,
  hasCover = false
}: PageIconBlockProps) {
  const [activeTab, setActiveTab] = useState<"icons" | "style">("icons");
  const [iconMode, setIconMode] = useState<"emojis" | "notion_icons" | "imported">("emojis");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [importedCategoryDraft, setImportedCategoryDraft] = useState("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importedIcons, setImportedIcons] = useState<ImportedIcon[]>(getImportedIcons());
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const iconRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Refresh imported icons on open or change
  useEffect(() => {
    setImportedIcons(getImportedIcons());
  }, [open]);

  // Long-press detection for free drag
  const [canDrag, setCanDrag] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isDraggingRef = useRef(false);

  // Position calculation for popover
  const updateCoords = useCallback(() => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      const popoverWidth = 350;
      let left = rect.left;
      if (left + popoverWidth > window.innerWidth - 16) {
        left = Math.max(16, window.innerWidth - popoverWidth - 16);
      }
      setCoords({
        top: rect.bottom + 8,
        left
      });
    }
  }, []);

  useEffect(() => {
    if (open) {
      updateCoords();
      window.addEventListener("scroll", updateCoords, true);
      window.addEventListener("resize", updateCoords);
      return () => {
        window.removeEventListener("scroll", updateCoords, true);
        window.removeEventListener("resize", updateCoords);
      };
    }
  }, [open, updateCoords]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handleDown = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        iconRef.current &&
        !iconRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleDown);
    return () => document.removeEventListener("mousedown", handleDown);
  }, [open, onClose]);

  // Defaults
  const iconSize = page.iconSize ?? (hasCover ? 80 : 72);
  const iconPadding = page.iconPadding ?? (hasCover ? 8 : 4);
  const iconAlign = page.iconAlign ?? (hasCover ? "overlap" : "left");
  const iconOffsetX = page.iconOffsetX ?? 0;
  const iconOffsetY = page.iconOffsetY ?? 0;
  const iconRotation = page.iconRotation ?? 0;
  const iconBg = page.iconBg ?? "transparent";
  const iconRadius = page.iconBorderRadius ?? 20;

  const isUrl =
    typeof page.icon === "string" &&
    (page.icon.startsWith("http://") ||
      page.icon.startsWith("https://") ||
      page.icon.startsWith("data:") ||
      page.icon.startsWith("blob:"));

  const isLucideIcon =
    typeof page.icon === "string" &&
    !isUrl &&
    page.icon.startsWith("lucide:") &&
    page.icon.replace("lucide:", "") in LucideIcons;

  const lucideIconName = isLucideIcon ? (page.icon as string).replace("lucide:", "") : null;
  const SelectedLucideComp = lucideIconName ? (LucideIcons as any)[lucideIconName] : null;

  // Filtered Emojis
  const filteredEmojis = useMemo(() => {
    if (searchQuery.trim()) {
      return searchEmojis(searchQuery.trim());
    }
    if (selectedCategory === "all") {
      return EMOJI_ICONS;
    }
    const cat = EMOJI_BY_CATEGORY.find((c) => c.id === selectedCategory);
    return cat ? cat.icons : EMOJI_ICONS;
  }, [searchQuery, selectedCategory]);

  // Filtered Lucide Icons
  const filteredLucideIcons = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return LUCIDE_ICON_NAMES.slice(0, 120);
    return LUCIDE_ICON_NAMES.filter((name) => name.toLowerCase().includes(q)).slice(0, 150);
  }, [searchQuery]);

  // Filtered Imported Icons
  const importedCategories = useMemo(() => getImportedCategories(), [importedIcons]);
  const filteredImportedIcons = useMemo(() => {
    let list = importedIcons;
    if (selectedCategory !== "all") {
      list = list.filter((i) => i.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((i) => (i.name || "").toLowerCase().includes(q) || (i.category || "").toLowerCase().includes(q));
    }
    return list;
  }, [importedIcons, selectedCategory, searchQuery]);

  const handleRandomize = () => {
    const random = EMOJI_ICONS[Math.floor(Math.random() * EMOJI_ICONS.length)];
    onPagePatch({ icon: random });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const catName = importedCategoryDraft.trim() || "Custom";

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        const newIcon = addImportedIcon({
          url,
          name: file.name.replace(/\.[^/.]+$/, ""),
          category: catName
        });
        setImportedIcons(getImportedIcons());
        onPagePatch({ icon: url });
      };
      reader.readAsDataURL(file);
    });

    setImportedCategoryDraft("");
    setShowImportDialog(false);
  };

  // Alignment container styling
  let containerAlignClass = "justify-start";
  let overlapMarginStyle: React.CSSProperties = {};

  if (iconAlign === "center") {
    containerAlignClass = "justify-center";
  } else if (iconAlign === "right") {
    containerAlignClass = "justify-end";
  } else if (iconAlign === "overlap" || (hasCover && iconAlign !== "center" && iconAlign !== "right")) {
    containerAlignClass = "justify-start";
    overlapMarginStyle = {
      marginTop: `-${Math.round((iconSize + iconPadding * 2) * 0.52)}px`,
      marginBottom: "8px",
      zIndex: 20
    };
  }

  // Box background styling classes
  let boxStyleClass = "";
  if (iconBg === "card") {
    boxStyleClass = "bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.12] shadow-[0_12px_32px_rgba(0,0,0,0.14)] dark:shadow-[0_16px_36px_rgba(0,0,0,0.45)]";
  } else if (iconBg === "glass") {
    boxStyleClass = "bg-white/80 dark:bg-[#202022]/80 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-lg";
  } else if (iconBg === "circle") {
    boxStyleClass = "bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.12] shadow-md rounded-full";
  } else if (iconBg === "glow") {
    boxStyleClass = "bg-white dark:bg-[#1c1c1e] border-2 border-[var(--noska-blue)] shadow-[0_0_24px_rgba(56,189,248,0.35)]";
  } else {
    // Transparent default
    boxStyleClass = "hover:bg-[var(--hover)]/60";
  }

  // Pointer event handlers for Long Press vs Click
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isEditable || page.isLocked) return;
    isDraggingRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      setCanDrag(true);
      isDraggingRef.current = true;
    }, 280);
  };

  const handlePointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (!isDraggingRef.current) {
      onOpen();
    }
    setCanDrag(false);
  };

  const handlePointerCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setCanDrag(false);
  };

  if (!page.icon) return null;

  return (
    <div
      className={`relative flex w-full select-none ${containerAlignClass}`}
      style={overlapMarginStyle}
    >
      <motion.div
        ref={iconRef}
        drag={canDrag}
        dragMomentum={false}
        onDragStart={() => {
          isDraggingRef.current = true;
        }}
        onDragEnd={(_e, info) => {
          const nextX = Math.round(iconOffsetX + info.offset.x);
          const nextY = Math.round(iconOffsetY + info.offset.y);
          onPagePatch({ iconOffsetX: nextX, iconOffsetY: nextY });
          setCanDrag(false);
          updateCoords();
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{
          x: iconOffsetX,
          y: iconOffsetY,
          rotate: iconRotation,
          padding: `${iconPadding}px`,
          borderRadius: iconBg === "circle" ? "9999px" : `${iconRadius}px`,
          width: `${iconSize + iconPadding * 2}px`,
          height: `${iconSize + iconPadding * 2}px`
        }}
        className={`group/icon relative flex items-center justify-center cursor-pointer transition-shadow ${boxStyleClass} ${
          canDrag ? "cursor-grabbing ring-2 ring-[var(--noska-blue)] shadow-2xl scale-105" : "cursor-pointer"
        }`}
        title="Click to customize • Hold & Drag to move freely"
      >
        {isUrl ? (
          <img
            src={page.icon}
            alt="Page Icon"
            className="w-full h-full object-cover pointer-events-none"
            style={{
              borderRadius:
                iconBg === "circle"
                  ? "9999px"
                  : `${Math.max(0, iconRadius - Math.round(iconPadding / 2))}px`
            }}
          />
        ) : isLucideIcon && SelectedLucideComp ? (
          <SelectedLucideComp
            size={Math.round(iconSize * 0.65)}
            className="text-[var(--text)] transition-transform"
          />
        ) : (
          <span
            className="leading-none select-none flex items-center justify-center transition-transform"
            style={{ fontSize: `${iconSize * 0.72}px` }}
          >
            {page.icon}
          </span>
        )}

        {/* Subtle indicator */}
        {isEditable && !page.isLocked && (
          <div className="absolute -top-2 -right-2 opacity-0 group-hover/icon:opacity-100 transition-opacity bg-black/80 text-white rounded-full p-1 shadow-md">
            <Sliders size={11} />
          </div>
        )}
      </motion.div>

      {/* Interactive Customization Popover */}
      {open &&
        createPortal(
          <AnimatePresence>
            <motion.div
              ref={popoverRef}
              drag
              dragMomentum={false}
              initial={{ opacity: 0, scale: 0.95, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -6 }}
              transition={{ type: "spring", stiffness: 450, damping: 30 }}
              style={{
                position: "fixed",
                top: coords.top,
                left: coords.left,
                zIndex: 9999
              }}
              className="apple-liquid-glass w-[360px] rounded-[30px] p-4 text-[12px] text-[var(--text)] select-none flex flex-col gap-3.5 cursor-default"
            >
              {/* Header with Navigation Tabs - draggable handle */}
              <div className="flex items-center justify-between border-b border-black/[0.08] dark:border-white/[0.08] pb-2.5 cursor-grab active:cursor-grabbing">
                <div className="flex items-center gap-1 apple-glass-pill p-1 rounded-2xl">
                  <button
                    onClick={() => setActiveTab("icons")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition cursor-pointer ${
                      activeTab === "icons"
                        ? "apple-glass-active-pill text-[var(--noska-blue)] font-bold"
                        : "text-[var(--text-secondary)] hover:text-[var(--text)]"
                    }`}
                  >
                    <Smile size={12} />
                    Icons & Emojis
                  </button>
                  <button
                    onClick={() => setActiveTab("style")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition cursor-pointer ${
                      activeTab === "style"
                        ? "apple-glass-active-pill text-[var(--noska-blue)] font-bold"
                        : "text-[var(--text-secondary)] hover:text-[var(--text)]"
                    }`}
                  >
                    <Sliders size={12} />
                    Customize
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handleRandomize}
                    className="apple-glass-btn h-7 w-7 rounded-full text-[var(--text-secondary)] hover:text-[var(--text)] grid place-items-center cursor-pointer"
                    title="Random icon"
                  >
                    <Shuffle size={13} />
                  </button>
                  <button
                    onClick={() => {
                      onPagePatch({ icon: "" });
                      onClose();
                    }}
                    className="apple-glass-btn h-7 w-7 rounded-full hover:bg-[var(--danger)]/20 text-[var(--text-secondary)] hover:text-[var(--danger)] grid place-items-center cursor-pointer"
                    title="Remove icon"
                  >
                    <Trash2 size={13} />
                  </button>
                  <button
                    onClick={onClose}
                    className="apple-glass-btn h-7 w-7 rounded-full text-[var(--text-secondary)] hover:text-[var(--text)] grid place-items-center cursor-pointer"
                    title="Close"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>

              {/* Tab 1: Emoji, Lucide & Imported Icons */}
              {activeTab === "icons" && (
                <div className="flex flex-col gap-2.5">
                  {/* Mode switcher: Emojis, Icons, Imported */}
                  <div className="flex items-center justify-between gap-1 apple-glass-pill p-1 rounded-2xl">
                    <button
                      onClick={() => { setIconMode("emojis"); setSelectedCategory("all"); }}
                      className={`flex-1 py-1.5 rounded-xl text-[10.5px] font-semibold transition cursor-pointer ${
                        iconMode === "emojis" ? "apple-glass-active-pill text-[var(--noska-blue)] font-bold" : "text-[var(--text-secondary)] hover:text-[var(--text)]"
                      }`}
                    >
                      Emojis
                    </button>
                    <button
                      onClick={() => { setIconMode("notion_icons"); setSelectedCategory("all"); }}
                      className={`flex-1 py-1.5 rounded-xl text-[10.5px] font-semibold transition cursor-pointer ${
                        iconMode === "notion_icons" ? "apple-glass-active-pill text-[var(--noska-blue)] font-bold" : "text-[var(--text-secondary)] hover:text-[var(--text)]"
                      }`}
                    >
                      Icons
                    </button>
                    <button
                      onClick={() => { setIconMode("imported"); setSelectedCategory("all"); }}
                      className={`flex-1 py-1.5 rounded-xl text-[10.5px] font-semibold transition cursor-pointer flex items-center justify-center gap-1 ${
                        iconMode === "imported" ? "apple-glass-active-pill text-[var(--noska-blue)] font-bold" : "text-[var(--text-secondary)] hover:text-[var(--text)]"
                      }`}
                    >
                      <span>Imported</span>
                      {importedIcons.length > 0 && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[var(--noska-blue)]/20 text-[var(--noska-blue)] font-bold">
                          {importedIcons.length}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Search Bar & Import Action */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search
                        size={12}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                      />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`Search ${iconMode === "emojis" ? "emojis..." : iconMode === "notion_icons" ? "icons..." : "imported icons..."}`}
                        className="w-full pl-7 pr-2.5 py-1.5 rounded-xl apple-glass-pill text-[12px] text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--noska-blue)] transition"
                      />
                    </div>
                    <button
                      onClick={() => setShowImportDialog((v) => !v)}
                      className="apple-glass-btn flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] text-[var(--text)] font-semibold cursor-pointer"
                      title="Import custom SVG/PNG icon with auto category"
                    >
                      <Upload size={12} />
                      <span>Import</span>
                    </button>
                  </div>

                  {/* Quick Import Modal Drawer */}
                  {showImportDialog && (
                    <div className="p-2.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--noska-blue)]/40 flex flex-col gap-2 shadow-md">
                      <div className="flex items-center justify-between text-[11px] font-bold text-[var(--noska-blue)]">
                        <div className="flex items-center gap-1">
                          <FolderPlus size={13} />
                          <span>Import Custom Icon(s)</span>
                        </div>
                        <button onClick={() => setShowImportDialog(false)} className="text-[var(--muted)] hover:text-[var(--text)]">
                          <X size={12} />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={importedCategoryDraft}
                        onChange={(e) => setImportedCategoryDraft(e.target.value)}
                        placeholder="Category Name (e.g. Logos, Badges, Team)..."
                        className="w-full px-2.5 py-1.5 rounded-xl bg-[var(--surface-1)] border border-[var(--border)] text-[11.5px] outline-none"
                      />
                      <label className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[var(--noska-blue)] hover:bg-[var(--noska-blue)]/90 text-white font-bold text-[11px] cursor-pointer shadow-sm active:scale-95 transition">
                        <Upload size={12} />
                        <span>Select SVG / PNG Files</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*,.svg"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                      </label>
                    </div>
                  )}

                  {/* Category Pills */}
                  {iconMode === "emojis" && (
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[10.5px]">
                      {[
                        { id: "all", label: "All" },
                        { id: "objects", label: "Objects" },
                        { id: "nature", label: "Nature" },
                        { id: "food", label: "Food" },
                        { id: "activity", label: "Activity" },
                        { id: "travel", label: "Travel" },
                        { id: "symbols", label: "Symbols" }
                      ].map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedCategory(c.id)}
                          className={`px-2.5 py-1 rounded-xl shrink-0 font-medium transition cursor-pointer ${
                            selectedCategory === c.id
                              ? "bg-[var(--noska-blue)] text-white font-bold shadow-md"
                              : "apple-glass-pill text-[var(--text-secondary)] hover:text-[var(--text)]"
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {iconMode === "imported" && importedCategories.length > 0 && (
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[10.5px]">
                      <button
                        onClick={() => setSelectedCategory("all")}
                        className={`px-2.5 py-1 rounded-xl shrink-0 font-medium transition cursor-pointer ${
                          selectedCategory === "all"
                            ? "bg-[var(--noska-blue)] text-white font-bold shadow-md"
                            : "apple-glass-pill text-[var(--text-secondary)] hover:text-[var(--text)]"
                        }`}
                      >
                        All Categories
                      </button>
                      {importedCategories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-2.5 py-1 rounded-xl shrink-0 font-medium transition cursor-pointer ${
                            selectedCategory === cat
                              ? "bg-[var(--noska-blue)] text-white font-bold shadow-md"
                              : "apple-glass-pill text-[var(--text-secondary)] hover:text-[var(--text)]"
                          }`}
                        >
                          📁 {cat}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Grid Container */}
                  <div className="grid grid-cols-7 gap-1.5 max-h-[195px] overflow-y-auto p-2 rounded-2xl apple-glass-pill">
                    {iconMode === "emojis" &&
                      filteredEmojis.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            onPagePatch({ icon: emoji });
                            onClose();
                          }}
                          className={`h-9 w-9 rounded-xl flex items-center justify-center text-lg hover:bg-black/[0.06] dark:hover:bg-white/[0.1] hover:scale-115 active:scale-95 transition cursor-pointer ${
                            page.icon === emoji ? "apple-glass-active-pill ring-2 ring-[var(--noska-blue)]" : ""
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}

                    {iconMode === "notion_icons" &&
                      filteredLucideIcons.map((iconName) => {
                        const IconComp = (LucideIcons as any)[iconName];
                        if (!IconComp) return null;
                        const iconKey = `lucide:${iconName}`;
                        const isSelected = page.icon === iconKey;
                        return (
                          <button
                            key={iconName}
                            onClick={() => {
                              onPagePatch({ icon: iconKey });
                              onClose();
                            }}
                            className={`h-9 w-9 rounded-xl flex items-center justify-center text-[var(--text)] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] hover:scale-115 active:scale-95 transition cursor-pointer ${
                              isSelected ? "apple-glass-active-pill ring-2 ring-[var(--noska-blue)] text-[var(--noska-blue)]" : ""
                            }`}
                            title={iconName}
                          >
                            <IconComp size={18} />
                          </button>
                        );
                      })}

                    {iconMode === "imported" &&
                      filteredImportedIcons.map((item) => {
                        const isSelected = page.icon === item.url;
                        return (
                          <div key={item.id} className="relative group/imp">
                            <button
                              onClick={() => {
                                onPagePatch({ icon: item.url });
                                onClose();
                              }}
                              className={`h-9 w-9 rounded-xl flex items-center justify-center p-1 hover:bg-black/[0.06] dark:hover:bg-white/[0.1] hover:scale-115 active:scale-95 transition cursor-pointer ${
                                isSelected ? "apple-glass-active-pill ring-2 ring-[var(--noska-blue)]" : ""
                              }`}
                              title={item.name}
                            >
                              <img
                                src={item.url}
                                alt={item.name}
                                className="w-full h-full object-contain"
                              />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeImportedIcon(item.id);
                              }}
                              className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-red-500 text-white opacity-0 group-hover/imp:opacity-100 transition-opacity grid place-items-center cursor-pointer shadow"
                              title="Delete imported icon"
                            >
                              <X size={8} />
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Tab 2: Style, Size, Alignment & Free Movement */}
              {activeTab === "style" && (
                <div className="flex flex-col gap-3">
                  {/* Container Box Style */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Background Style</span>
                    <div className="grid grid-cols-5 gap-1 apple-glass-pill p-1 rounded-2xl">
                      {[
                        { id: "transparent", label: "None" },
                        { id: "card", label: "Card" },
                        { id: "glass", label: "Glass" },
                        { id: "circle", label: "Circle" },
                        { id: "glow", label: "Glow" }
                      ].map((style) => (
                        <button
                          key={style.id}
                          onClick={() => onPagePatch({ iconBg: style.id })}
                          className={`py-1.5 rounded-xl text-[10px] font-semibold transition cursor-pointer ${
                            iconBg === style.id
                              ? "apple-glass-active-pill text-[var(--noska-blue)] font-bold"
                              : "text-[var(--text-secondary)] hover:text-[var(--text)]"
                          }`}
                        >
                          {style.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Size Slider & Presets */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-secondary)]">
                      <span>Icon Size</span>
                      <span className="font-mono text-[10.5px] text-[var(--noska-blue)] font-bold">{iconSize}px</span>
                    </div>
                    <input
                      type="range"
                      min={36}
                      max={140}
                      step={4}
                      value={iconSize}
                      onChange={(e) => onPagePatch({ iconSize: Number(e.target.value) })}
                      className="w-full accent-[var(--noska-blue)] cursor-pointer h-1.5 bg-black/[0.08] dark:bg-white/[0.12] rounded-lg"
                    />
                    <div className="grid grid-cols-4 gap-1 mt-0.5">
                      {[
                        { label: "S", size: 48 },
                        { label: "M", size: 72 },
                        { label: "L", size: 92 },
                        { label: "XL", size: 120 }
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => onPagePatch({ iconSize: preset.size })}
                          className={`py-1.5 rounded-xl text-[10px] font-semibold border transition cursor-pointer ${
                            iconSize === preset.size
                              ? "bg-[var(--noska-blue)] text-white border-[var(--noska-blue)] shadow-sm"
                              : "apple-glass-pill text-[var(--text-secondary)] hover:text-[var(--text)]"
                          }`}
                        >
                          {preset.label} ({preset.size}px)
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Alignment Presets */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Alignment</span>
                    <div className="grid grid-cols-4 gap-1 apple-glass-pill p-1 rounded-2xl">
                      {[
                        { id: "overlap", label: "Overlap", icon: Layers },
                        { id: "left", label: "Left", icon: AlignLeft },
                        { id: "center", label: "Center", icon: AlignCenter },
                        { id: "right", label: "Right", icon: AlignRight }
                      ].map(({ id, label, icon: Icon }) => (
                        <button
                          key={id}
                          onClick={() => onPagePatch({ iconAlign: id })}
                          className={`flex items-center justify-center gap-1 py-1.5 rounded-xl text-[10px] font-semibold transition cursor-pointer ${
                            iconAlign === id
                              ? "apple-glass-active-pill text-[var(--noska-blue)] font-bold"
                              : "text-[var(--text-secondary)] hover:text-[var(--text)]"
                          }`}
                        >
                          <Icon size={12} />
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Padding & Corner Radius */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[10.5px] font-semibold text-[var(--text-secondary)]">
                        <span>Padding</span>
                        <span className="font-mono text-[10px] text-[var(--noska-blue)]">{iconPadding}px</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={36}
                        step={2}
                        value={iconPadding}
                        onChange={(e) => onPagePatch({ iconPadding: Number(e.target.value) })}
                        className="w-full accent-[var(--noska-blue)] cursor-pointer h-1.5 bg-black/[0.08] dark:bg-white/[0.12] rounded-lg"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[10.5px] font-semibold text-[var(--text-secondary)]">
                        <span>Radius</span>
                        <span className="font-mono text-[10px] text-[var(--noska-blue)]">{iconRadius}px</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={40}
                        step={2}
                        value={iconRadius}
                        onChange={(e) => onPagePatch({ iconBorderRadius: Number(e.target.value) })}
                        className="w-full accent-[var(--noska-blue)] cursor-pointer h-1.5 bg-black/[0.08] dark:bg-white/[0.12] rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Tilt & Reset */}
                  <div className="flex items-center justify-between pt-1 border-t border-black/[0.08] dark:border-white/[0.08]">
                    <div className="flex items-center gap-2">
                      <span className="text-[10.5px] text-[var(--text-secondary)] font-medium">Tilt: {iconRotation}°</span>
                      <input
                        type="range"
                        min={-30}
                        max={30}
                        step={3}
                        value={iconRotation}
                        onChange={(e) => onPagePatch({ iconRotation: Number(e.target.value) })}
                        className="w-20 accent-[var(--noska-blue)] cursor-pointer h-1.5 bg-black/[0.08] dark:bg-white/[0.12] rounded-lg"
                      />
                    </div>
                    <button
                      onClick={() =>
                        onPagePatch({
                          iconOffsetX: 0,
                          iconOffsetY: 0,
                          iconRotation: 0,
                          iconAlign: hasCover ? "overlap" : "left",
                          iconBg: "transparent"
                        })
                      }
                      className="apple-glass-btn flex items-center gap-1 px-3 py-1 rounded-full text-[10.5px] font-semibold text-[var(--text)] cursor-pointer"
                    >
                      <RotateCcw size={11} />
                      Reset
                    </button>
                  </div>

                  <div className="text-[10px] text-[var(--muted)] apple-glass-pill p-2.5 rounded-2xl leading-relaxed">
                    💡 <b>Tip</b>: Hold & drag the emoji directly to move it anywhere freely!
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
