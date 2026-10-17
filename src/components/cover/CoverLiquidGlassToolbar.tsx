import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Loader2,
  SlidersHorizontal,
  Trash2,
  MoveVertical,
  Check,
  X
} from "lucide-react";

interface CoverLiquidGlassToolbarProps {
  page: any;
  isEditable: boolean;
  isRepositioning: boolean;
  onStartReposition: () => void;
  onSaveReposition: () => void;
  onCancelReposition: () => void;
  onOpenPicker: (pos: { top: number; left: number }) => void;
  onOpenSettings: (pos: { left: number; top: number }) => void;
  onRemoveCover: () => void;
}

const CAPSULE_BG_IMG =
  "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 100%)";
const CAPSULE_BG_TINT = "rgba(13, 15, 22, 0.18)";
const CAPSULE_SHADOW =
  "0 10px 30px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.18), inset 0 1px 0.5px rgba(255,255,255,0.35), inset 0 -1px 0.5px rgba(0,0,0,0.15)";
const THUMB_BG_IMG =
  "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.015) 100%)";
const THUMB_BG_TINT = "rgba(8, 10, 16, 0.42)";
const THUMB_SHADOW =
  "inset 0 1px 0.5px rgba(255,255,255,0.14), inset 0 -1px 0.5px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.22)";
const MENU_BG_IMG =
  "linear-gradient(180deg, rgba(36, 38, 47, 0.88) 0%, rgba(14, 15, 21, 0.94) 100%)";
const MENU_SHADOW =
  "0 2px 6px rgba(0,0,0,0.35), 0 16px 40px rgba(0,0,0,0.55), 0 32px 80px -24px rgba(0,0,0,0.6), inset 0 1px 0.5px rgba(255,255,255,0.28)";

const SPRING = { type: "spring" as const, stiffness: 520, damping: 38, mass: 0.7 };
const SPRING_SOFT = { type: "spring" as const, stiffness: 420, damping: 30 };
const SPRING_MENU = { type: "spring" as const, stiffness: 480, damping: 34, mass: 0.8 };

function GlassThumb({ layoutId = "cover-toolbar-thumb" }: { layoutId?: string }) {
  return (
    <motion.span
      layoutId={layoutId}
      transition={SPRING}
      className="absolute inset-0 rounded-full border border-white/[0.1] pointer-events-none"
      style={{
        backgroundColor: THUMB_BG_TINT,
        backgroundImage: THUMB_BG_IMG,
        boxShadow: THUMB_SHADOW,
      }}
    />
  );
}

export default function CoverLiquidGlassToolbar({
  page,
  isEditable,
  isRepositioning,
  onStartReposition,
  onSaveReposition,
  onCancelReposition,
  onOpenPicker,
  onOpenSettings,
  onRemoveCover,
}: CoverLiquidGlassToolbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const changeBtnRef = useRef<HTMLButtonElement>(null);
  const optionsBtnRef = useRef<HTMLButtonElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        optionsBtnRef.current &&
        !optionsBtnRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [menuOpen]);

  // Handle Cover Image / Gradient Download
  const handleDownloadCover = useCallback(async () => {
    if (!page?.cover) return;
    setDownloading(true);
    setMenuOpen(false);

    try {
      const cover = page.cover;
      if (cover.startsWith("http") || cover.startsWith("data:image")) {
        // Direct image download
        const res = await fetch(cover);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const ext = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
        a.download = `${page.title || "cover"}-cover.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (cover.startsWith("linear-gradient") || cover.startsWith("radial-gradient")) {
        // Render CSS gradient to high-res canvas and download
        const canvas = document.createElement("canvas");
        canvas.width = 1920;
        canvas.height = 480;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Render SVG with foreignObject containing gradient
          const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="1920" height="480">
              <foreignObject width="100%" height="100%">
                <div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;background:${cover.replace(/"/g, "'")};"></div>
              </foreignObject>
            </svg>
          `;
          const img = new window.Image();
          const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
          const url = URL.createObjectURL(svgBlob);
          img.onload = () => {
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            const a = document.createElement("a");
            a.download = `${page.title || "gradient"}-cover.png`;
            a.href = canvas.toDataURL("image/png");
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          };
          img.src = url;
        }
      }
    } catch (err) {
      console.error("Failed to download cover image:", err);
    } finally {
      setTimeout(() => setDownloading(false), 600);
    }
  }, [page?.cover, page?.title]);

  if (!isEditable) return null;

  return (
    <div className="absolute top-3.5 right-6 z-30 select-none pointer-events-none group-hover/banner:pointer-events-auto">
      <AnimatePresence mode="wait">
        {isRepositioning ? (
          /* ── Repositioning Mode Glass Pill ── */
          <motion.div
            key="repositioning-bar"
            role="toolbar"
            aria-label="Reposition cover"
            initial={{ opacity: 0, scale: 0.94, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -6 }}
            transition={SPRING}
            className="relative flex items-center gap-0.5 p-[1.5px] pl-1 rounded-full pointer-events-auto border border-white/[0.18] backdrop-blur-2xl backdrop-saturate-150"
            style={{
              backgroundColor: CAPSULE_BG_TINT,
              backgroundImage: CAPSULE_BG_IMG,
              boxShadow: CAPSULE_SHADOW,
            }}
          >
            <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent pointer-events-none" />

            <div className="flex items-center gap-1.5 pl-2 pr-1 text-[10.5px] font-medium tracking-[-0.01em] text-white">
              <MoveVertical size={11} className="text-white/70 animate-pulse" />
              <span>Drag to reposition</span>
            </div>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={(e) => {
                e.stopPropagation();
                onSaveReposition();
              }}
              className="flex h-[22px] items-center gap-1 px-2 rounded-full bg-[#0A84FF] text-[10.5px] font-semibold tracking-[-0.01em] text-white shadow-[0_2px_12px_rgba(10,132,255,0.45),inset_0_1px_0_rgba(255,255,255,0.25)] hover:bg-[#2E96FF] active:bg-[#0874E0] transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              <Check size={10.5} strokeWidth={2.6} />
              <span>Save</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={(e) => {
                e.stopPropagation();
                onCancelReposition();
              }}
              className="flex h-[22px] items-center gap-1 px-1.5 rounded-full text-[10.5px] font-medium tracking-[-0.01em] text-white/80 hover:text-white hover:bg-white/[0.16] active:bg-white/[0.22] transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              <X size={10.5} strokeWidth={2.4} />
              <span>Cancel</span>
            </motion.button>
          </motion.div>
        ) : (
          /* ── Segmented Liquid Glass Cover Toolbar ── */
          <motion.div
            key="normal-toolbar"
            ref={toolbarRef}
            role="toolbar"
            aria-label="Cover actions"
            onMouseLeave={() => setHoveredItem(null)}
            initial={false}
            className={`flex items-center p-[1.5px] rounded-full pointer-events-auto border border-white/[0.18] backdrop-blur-2xl backdrop-saturate-150 relative transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] ${
              menuOpen
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 translate-y-1.5 scale-[0.97] group-hover/banner:opacity-100 group-hover/banner:translate-y-0 group-hover/banner:scale-100"
            }`}
            style={{
              backgroundColor: CAPSULE_BG_TINT,
              backgroundImage: CAPSULE_BG_IMG,
              boxShadow: CAPSULE_SHADOW,
            }}
          >
            <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent pointer-events-none" />

            <button
              ref={changeBtnRef}
              onMouseEnter={() => setHoveredItem("change")}
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                const pickerW = 360;
                let left = rect.right - pickerW;
                if (left + pickerW > window.innerWidth - 16) {
                  left = Math.max(16, window.innerWidth - pickerW - 16);
                }
                if (left < 16) left = 16;
                onOpenPicker({ top: rect.bottom + 8, left });
              }}
              className={`relative flex h-[22px] items-center px-2 rounded-full text-[10px] font-medium tracking-[-0.01em] transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                hoveredItem === "change" ? "text-white" : "text-white/70 hover:text-white"
              }`}
              title="Change cover image"
            >
              {hoveredItem === "change" && <GlassThumb />}
              <span className="relative">Change</span>
            </button>

            <button
              onMouseEnter={() => setHoveredItem("reposition")}
              onClick={(e) => {
                e.stopPropagation();
                onStartReposition();
              }}
              className={`relative flex h-[22px] items-center px-2 rounded-full text-[10px] font-medium tracking-[-0.01em] transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                hoveredItem === "reposition" ? "text-white" : "text-white/70 hover:text-white"
              }`}
              title="Reposition cover image"
            >
              {hoveredItem === "reposition" && <GlassThumb />}
              <span className="relative">Reposition</span>
            </button>

            {/* Action / Download / Options Button */}
            <div className="relative">
              <button
                ref={optionsBtnRef}
                onMouseEnter={() => setHoveredItem("options")}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((prev) => !prev);
                }}
                className={`relative grid h-[22px] w-[22px] place-items-center rounded-full transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                  menuOpen || hoveredItem === "options" ? "text-white" : "text-white/70 hover:text-white"
                }`}
                title="Cover options & download"
              >
                {hoveredItem === "options" && !menuOpen && <GlassThumb />}
                {menuOpen && (
                  <span
                    className="absolute inset-0 rounded-full border border-white/[0.1] pointer-events-none"
                    style={{
                      backgroundColor: THUMB_BG_TINT,
                      backgroundImage: THUMB_BG_IMG,
                      boxShadow: THUMB_SHADOW,
                    }}
                  />
                )}
                <motion.span
                  key={downloading ? "downloading" : "idle"}
                  initial={{ opacity: 0, scale: 0.5, rotate: downloading ? -90 : 90 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={SPRING_SOFT}
                  className="relative grid place-items-center"
                >
                  {downloading ? (
                    <Loader2 size={11} strokeWidth={2.4} className="animate-spin" />
                  ) : (
                    <Download size={11} strokeWidth={2.2} />
                  )}
                </motion.span>
              </button>

              {/* Liquid Glass Dropdown Menu */}
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    ref={menuRef}
                    initial={{ opacity: 0, scale: 0.96, y: -6, filter: "blur(6px)" }}
                    animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 0.98, y: -4, filter: "blur(4px)" }}
                    transition={SPRING_MENU}
                    style={{
                      backgroundImage: MENU_BG_IMG,
                      boxShadow: MENU_SHADOW,
                      transformOrigin: "top right",
                    }}
                    className="absolute right-0 top-full mt-1.5 w-48 rounded-2xl p-1.5 border border-white/[0.14] backdrop-blur-2xl backdrop-saturate-150 z-50 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
                    <div className="space-y-0.5">
                      {/* Download option */}
                      <button
                        onClick={handleDownloadCover}
                        className="group/mi w-full h-7 flex items-center gap-2.5 px-2.5 rounded-[10px] text-[11px] font-medium tracking-[-0.01em] text-white/85 hover:text-white hover:bg-white/[0.1] active:bg-white/[0.16] transition-colors duration-150 cursor-pointer text-left"
                      >
                        <Download size={12} strokeWidth={2.2} className="text-white/55 group-hover/mi:text-white/85 transition-colors duration-150" />
                        <span>Download image</span>
                      </button>

                      {/* Customize effects option */}
                      <button
                        onClick={(e) => {
                          setMenuOpen(false);
                          const rect = optionsBtnRef.current?.getBoundingClientRect();
                          if (rect) {
                            onOpenSettings({
                              left: Math.max(16, rect.right - 260),
                              top: rect.bottom + 6,
                            });
                          }
                        }}
                        className="group/mi w-full h-7 flex items-center gap-2.5 px-2.5 rounded-[10px] text-[11px] font-medium tracking-[-0.01em] text-white/85 hover:text-white hover:bg-white/[0.1] active:bg-white/[0.16] transition-colors duration-150 cursor-pointer text-left"
                      >
                        <SlidersHorizontal size={12} strokeWidth={2.2} className="text-white/55 group-hover/mi:text-white/85 transition-colors duration-150" />
                        <span>Cover effects & height</span>
                      </button>

                      <div className="h-px bg-white/[0.08] mx-1.5 my-1" />

                      {/* Remove Cover Option */}
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onRemoveCover();
                        }}
                        className="group/mi w-full h-7 flex items-center gap-2.5 px-2.5 rounded-[10px] text-[11px] font-medium tracking-[-0.01em] text-[#FF6961] hover:text-[#FF8A84] hover:bg-[#FF453A]/[0.14] active:bg-[#FF453A]/[0.2] transition-colors duration-150 cursor-pointer text-left"
                      >
                        <Trash2 size={12} strokeWidth={2.2} />
                        <span>Remove cover</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
