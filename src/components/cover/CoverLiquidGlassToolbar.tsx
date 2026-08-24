import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  SlidersHorizontal,
  Trash2,
  MoveVertical,
  Check,
  X,
  Sparkles,
  ExternalLink,
  ChevronDown
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
          /* ── Repositioning Mode Apple Liquid Glass Pill ── */
          <motion.div
            key="repositioning-bar"
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ type: "spring", stiffness: 450, damping: 30 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full pointer-events-auto backdrop-blur-2xl shadow-[0_12px_36px_rgba(0,0,0,0.55),inset_0_1px_1px_rgba(255,255,255,0.32),inset_0_-1px_1px_rgba(0,0,0,0.3)] border border-white/20"
            style={{
              background: "linear-gradient(135deg, rgba(28, 30, 38, 0.85) 0%, rgba(14, 16, 22, 0.92) 100%)",
            }}
          >
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-white/90 px-1">
              <MoveVertical size={13} className="text-white/70 animate-pulse" />
              <span>Drag image to reposition</span>
            </div>

            <div className="w-[1px] h-3.5 bg-white/20 mx-1" />

            <button
              onClick={(e) => {
                e.stopPropagation();
                onSaveReposition();
              }}
              className="flex items-center gap-1 px-3 py-1 text-[11.5px] font-semibold rounded-full bg-blue-500 hover:bg-blue-400 active:bg-blue-600 text-white shadow-md transition-all duration-150 cursor-pointer"
            >
              <Check size={12} strokeWidth={2.5} />
              <span>Save position</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancelReposition();
              }}
              className="flex items-center gap-1 px-2.5 py-1 text-[11.5px] font-medium rounded-full text-white/80 hover:text-white hover:bg-white/[0.12] active:bg-white/[0.2] transition-all duration-150 cursor-pointer"
            >
              <X size={12} />
              <span>Cancel</span>
            </button>
          </motion.div>
        ) : (
          /* ── Standard Apple Liquid Glass Cover Toolbar ── */
          <motion.div
            key="normal-toolbar"
            ref={toolbarRef}
            initial={false}
            className={`flex items-center p-1 rounded-full pointer-events-auto transition-all duration-250 ease-out backdrop-blur-2xl shadow-[0_10px_32px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.28),inset_0_-1px_1px_rgba(0,0,0,0.25)] border border-white/20 relative ${
              menuOpen
                ? "opacity-100 translate-y-0 ring-1 ring-white/30"
                : "opacity-0 translate-y-1 group-hover/banner:opacity-100 group-hover/banner:translate-y-0"
            }`}
            style={{
              background: "linear-gradient(135deg, rgba(28, 30, 38, 0.76) 0%, rgba(14, 16, 22, 0.86) 100%)",
            }}
          >
            {/* Top specular edge reflection */}
            <div className="absolute inset-x-3 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none rounded-t-full" />

            {/* Change Cover Button */}
            <button
              ref={changeBtnRef}
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
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium tracking-tight text-white/90 hover:text-white hover:bg-white/[0.14] active:bg-white/[0.22] transition-all duration-150 cursor-pointer"
              title="Change cover image"
            >
              <span>Change</span>
            </button>

            {/* Subtle Glass Divider */}
            <div className="w-[1px] h-3.5 bg-white/20 mx-0.5 pointer-events-none" />

            {/* Reposition Cover Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartReposition();
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium tracking-tight text-white/90 hover:text-white hover:bg-white/[0.14] active:bg-white/[0.22] transition-all duration-150 cursor-pointer"
              title="Reposition cover image"
            >
              <span>Reposition</span>
            </button>

            {/* Subtle Glass Divider */}
            <div className="w-[1px] h-3.5 bg-white/20 mx-0.5 pointer-events-none" />

            {/* Action / Download / Options Button */}
            <div className="relative">
              <button
                ref={optionsBtnRef}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((prev) => !prev);
                }}
                className={`h-6 w-6 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/[0.14] active:bg-white/[0.22] transition-all duration-150 cursor-pointer ${
                  menuOpen ? "bg-white/[0.18] text-white" : ""
                }`}
                title="Cover options & download"
              >
                <Download size={12.5} strokeWidth={2.2} className={downloading ? "animate-bounce" : ""} />
              </button>

              {/* Apple Liquid Glass Dropdown Menu */}
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    ref={menuRef}
                    initial={{ opacity: 0, scale: 0.94, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, y: 6 }}
                    transition={{ type: "spring", stiffness: 450, damping: 30 }}
                    className="absolute right-0 top-full mt-2 w-52 rounded-2xl p-1.5 backdrop-blur-2xl shadow-[0_16px_40px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.28)] border border-white/20 z-50 overflow-hidden"
                    style={{
                      background: "linear-gradient(135deg, rgba(26, 28, 36, 0.92) 0%, rgba(12, 14, 20, 0.96) 100%)",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="space-y-0.5">
                      {/* Download option */}
                      <button
                        onClick={handleDownloadCover}
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-[12px] font-medium text-white/90 hover:text-white hover:bg-white/[0.12] transition-colors cursor-pointer text-left"
                      >
                        <Download size={13} className="text-white/70" />
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
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-[12px] font-medium text-white/90 hover:text-white hover:bg-white/[0.12] transition-colors cursor-pointer text-left"
                      >
                        <SlidersHorizontal size={13} className="text-white/70" />
                        <span>Cover effects & height</span>
                      </button>

                      <div className="h-[1px] bg-white/[0.12] my-1" />

                      {/* Remove Cover Option */}
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onRemoveCover();
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-[12px] font-medium text-red-400 hover:text-red-300 hover:bg-red-500/[0.15] transition-colors cursor-pointer text-left"
                      >
                        <Trash2 size={13} />
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
