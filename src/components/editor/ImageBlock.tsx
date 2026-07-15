import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Link, Image as ImageIcon, X, Loader2, Search, ExternalLink,
  Trash2, Download, Copy, RefreshCw, AlignLeft, AlignCenter, AlignRight,
  Maximize2, Minimize2, GripHorizontal, ChevronDown, GripVertical, LucideIcon
} from "lucide-react";
import { uploadImage, ensureImagesBucket } from "../../lib/supabaseService";
import type { ImageBlockData } from "../../../types/blocks";
import type { Page } from "../../lib/supabaseService";

const UNSPLASH_ACCESS_KEY = "BkXiwJRFV3x6R8NsbRcph1U8qRcx0tQ5B60QFKQoWcQ";
const GIPHY_API_KEY = "GlVGYHkrCfdKC7pFeOhE4b5MkM4foSKU";

interface AlignmentOption {
  id: "small" | "medium" | "large" | "full";
  label: string;
  maxW: number | null;
}

const ALIGNMENT_OPTIONS: AlignmentOption[] = [
  { id: "small", label: "Small", maxW: 180 },
  { id: "medium", label: "Medium", maxW: 320 },
  { id: "large", label: "Large", maxW: 520 },
  { id: "full", label: "Full Width", maxW: null },
];

interface NaturalSize {
  width: number;
  height: number;
}

// Shared by both tab bars below (EmptyImagePlaceholder / ImagePickerContent):
// each tab's `icon` is either a real LucideIcon (rendered with a fixed
// size) or an inline zero-arg component (the GIPHY text badge, which has
// no `size` prop to pass).
function renderTabIcon(Icon: LucideIcon | (() => React.ReactElement)): React.ReactElement {
  return typeof Icon === "function" && Icon.length === 0
    ? (Icon as () => React.ReactElement)()
    : React.createElement(Icon as LucideIcon, { size: 14 });
}

interface ImageBlockProps {
  block: ImageBlockData;
  onPatch: (patch: Partial<ImageBlockData>) => void;
  onDelete?: () => void;
  isLocked?: boolean;
  pageId?: string;
  pages?: Page[];
  onNavigate?: (pageId: string, options?: { altKey?: boolean }) => void;
  onToast?: (message: string) => void;
}

export default function ImageBlock({
  block, onPatch, onDelete, isLocked, pageId, pages, onNavigate, onToast
}: ImageBlockProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [size, setSize] = useState(block.imageSize || "large");
  const [align, setAlign] = useState(block.imageAlign || "center");
  const [resizing, setResizing] = useState<"left" | "right" | "corner" | null>(null);
  const [naturalSize, setNaturalSize] = useState<NaturalSize | null>(null);
  const [customWidth, setCustomWidth] = useState<number | null>(block.imageWidth || null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const alignment = ALIGNMENT_OPTIONS.find(a => a.id === size) || ALIGNMENT_OPTIONS[2];

  const handleResizeStart = useCallback((dir: "left" | "right" | "corner") => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing(dir);
    const startX = e.clientX;
    const startW = containerRef.current?.offsetWidth || 300;

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      let newW: number;
      if (dir === "left") newW = startW - delta;
      else if (dir === "right") newW = startW + delta;
      else newW = startW + delta; // "corner"
      newW = Math.max(100, Math.min(1200, newW));
      setCustomWidth(newW);
      if (naturalSize) {
        const ar = naturalSize.width / naturalSize.height;
        const newH = newW / ar;
        if (imgRef.current) {
          imgRef.current.style.width = `${newW}px`;
          imgRef.current.style.height = `${newH}px`;
        }
      } else if (imgRef.current) {
        imgRef.current.style.width = `${newW}px`;
      }
    };

    const onUp = () => {
      setResizing(null);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      const finalW = imgRef.current?.style.width;
      if (finalW && !finalW.includes("auto") && !finalW.includes("%")) {
        const px = parseInt(finalW);
        if (!isNaN(px) && Math.abs(px - (naturalSize?.width || px)) > 5) {
          onPatch?.({ imageWidth: px });
        }
      }
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [naturalSize]);

  const handleDoubleClick = () => {
    setCustomWidth(null);
    if (imgRef.current) {
      imgRef.current.style.width = "";
      imgRef.current.style.height = "";
    }
  };

  const currentAlignment = block.imageAlign || "center";
  const currentSize = block.imageSize || "large";
  const sizeOpt = ALIGNMENT_OPTIONS.find(a => a.id === currentSize) || ALIGNMENT_OPTIONS[2];

  const maxWidthStyle = sizeOpt.maxW ? { maxWidth: sizeOpt.maxW } : {};
  const alignClass = currentAlignment === "left" ? "mr-auto" :
    currentAlignment === "right" ? "ml-auto" : "mx-auto";

  if (isLocked) {
    return (
      <div className="my-2">
        {block.text ? (
          <div className={`relative ${alignClass}`} style={maxWidthStyle}>
            <img src={block.text} alt="" className="w-full rounded-lg" loading="lazy" />
            {block.caption && (
              <p className="mt-1 text-center text-xs text-[var(--muted)]">{block.caption}</p>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-[var(--border)] py-12 text-sm text-[var(--muted)]">
            Locked image block
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="my-2 group/image" ref={containerRef}>
      {block.text ? (
        <div className="space-y-1">
          <div className={`relative ${alignClass}`} style={{ ...maxWidthStyle, width: customWidth ? `${customWidth}px` : undefined }}>
            {/* Image */}
            <div className="relative overflow-hidden rounded-lg border border-[var(--border)]">
              <img
                ref={imgRef}
                src={block.text}
                alt={block.caption || ""}
                className="w-full"
                style={{ display: "block" }}
                loading="lazy"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
                }}
              />

              {/* Toolbar on hover */}
              <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-1 bg-gradient-to-b from-black/50 to-transparent p-2 opacity-0 transition group-hover/image:opacity-100">
                <div className="flex items-center gap-1">
                  <ToolbarButton icon={RefreshCw} size={12} tooltip="Replace" onClick={() => setPickerOpen(true)} />
                  <ToolbarButton icon={Download} size={12} tooltip="Download" onClick={() => {
                    const a = document.createElement("a");
                    a.href = block.text;
                    a.download = "image";
                    a.click();
                  }} />
                  <ToolbarButton icon={Copy} size={12} tooltip="Copy link" onClick={() => {
                    navigator.clipboard.writeText(block.text);
                    onToast?.("Image link copied");
                  }} />
                </div>
                <div className="flex items-center gap-1">
                  <ToolbarButton icon={Trash2} size={12} tooltip="Delete" onClick={onDelete} danger />
                </div>
              </div>

              {/* Resize handles */}
              <div className="absolute inset-y-0 left-0 w-1.5 cursor-col-resize opacity-0 hover:opacity-100 group-hover/image:opacity-60 transition"
                onMouseDown={handleResizeStart("left")} />
              <div className="absolute inset-y-0 right-0 w-1.5 cursor-col-resize opacity-0 hover:opacity-100 group-hover/image:opacity-60 transition"
                onMouseDown={handleResizeStart("right")} />
              <div className="absolute -bottom-1 -right-1 h-3 w-3 cursor-nwse-resize opacity-0 hover:opacity-100 group-hover/image:opacity-60 transition"
                onMouseDown={handleResizeStart("corner")}>
                <GripHorizontal size={12} className="absolute -bottom-0.5 -right-0.5 text-white drop-shadow" />
              </div>
            </div>

            {/* Alignment & Size toolbar below image */}
            <div className="flex items-center justify-center gap-1 pt-1.5 opacity-0 transition group-hover/image:opacity-100">
              {ALIGNMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => onPatch({ imageSize: opt.id, imageAlign: currentAlignment })}
                  className={`px-2 py-0.5 text-[10px] rounded transition cursor-pointer ${
                    currentSize === opt.id
                      ? "bg-[var(--accent)]/10 text-[var(--accent)] font-medium"
                      : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <div className="w-px h-3 bg-[var(--border)] mx-1" />
              {(["left", "center", "right"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => onPatch({ imageAlign: a, imageSize: currentSize })}
                  className={`p-0.5 rounded transition cursor-pointer ${
                    currentAlignment === a ? "text-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  {a === "left" ? <AlignLeft size={11} /> : a === "center" ? <AlignCenter size={11} /> : <AlignRight size={11} />}
                </button>
              ))}
              <div className="w-px h-3 bg-[var(--border)] mx-1" />
              <ToolbarButton icon={Trash2} size={10} tooltip="Delete" onClick={onDelete} danger label="Delete" />
            </div>

            {/* Resizing indicator */}
            {resizing && (
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 rounded bg-black/70 px-2 py-0.5 text-[10px] text-white">
                {customWidth || (imgRef.current?.offsetWidth || 0)}px
              </div>
            )}
          </div>

          {/* Caption */}
          <input
            value={block.caption || ""}
            onChange={(e) => onPatch({ caption: e.target.value })}
            className={`w-full bg-transparent text-center text-sm text-[var(--muted)] outline-none placeholder:text-[var(--muted)]/40 transition
              ${block.caption ? "opacity-100" : "opacity-0 group-hover/image:opacity-100 focus:opacity-100"}`}
            placeholder="Write a caption..."
          />
        </div>
      ) : (
        <EmptyImagePlaceholder onOpenPicker={() => setPickerOpen(true)} pageId={pageId} onPatch={onPatch} onToast={onToast} />
      )}

      {pickerOpen && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={(e) => { e.stopPropagation(); setPickerOpen(false); }} />
          <div className="relative z-10 w-[560px] max-h-[85vh] rounded-xl border border-[var(--border)] bg-[var(--elevated)] shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 shrink-0">
              <h3 className="text-sm font-semibold text-[var(--text)]">Pick an Image</h3>
              <button onClick={() => setPickerOpen(false)} className="rounded p-1 text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ImagePickerContent
                onSelect={(url) => {
                  onPatch({ text: url });
                  setPickerOpen(false);
                }}
                onClose={() => setPickerOpen(false)}
                pageId={pageId}
                onToast={onToast}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

interface ToolbarButtonProps {
  icon: LucideIcon;
  size?: number;
  tooltip?: string;
  onClick?: () => void;
  danger?: boolean;
  label?: string;
}

function ToolbarButton({ icon: Icon, size, tooltip, onClick, danger, label }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={`flex items-center gap-1 rounded px-1.5 py-1 text-white/80 hover:text-white transition cursor-pointer ${
        danger ? "hover:bg-[var(--danger)]/60" : "hover:bg-white/10"
      }`}
    >
      <Icon size={size || 12} />
      {label && <span className="text-[10px]">{label}</span>}
    </button>
  );
}

interface EmptyImagePlaceholderProps {
  onOpenPicker: () => void;
  pageId?: string;
  onPatch: (patch: Partial<ImageBlockData>) => void;
  onToast?: (message: string) => void;
}

function EmptyImagePlaceholder({ onOpenPicker, pageId, onPatch, onToast }: EmptyImagePlaceholderProps) {
  const [tab, setTab] = useState("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Mixed icon set: three real LucideIcons plus one inline text badge for
  // GIPHY (no matching lucide icon exists). `renderTabIcon` below handles
  // both without a per-usage type-narrowing dance.
  const tabs: Array<{ id: string; label: string; icon: LucideIcon | (() => React.ReactElement) }> = [
    { id: "upload", label: "Upload", icon: Upload },
    { id: "link", label: "Link", icon: Link },
    { id: "unsplash", label: "Unsplash", icon: ImageIcon },
    { id: "giphy", label: "GIPHY", icon: () => <span className="text-[11px] font-bold">GIPHY</span> },
  ];

  const handleFileUpload = async (file: File | null | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const interval = setInterval(() => {
        setUploadProgress((p) => Math.min(p + 15, 85));
      }, 200);
      const url = await uploadImage(file, pageId).catch(() => URL.createObjectURL(file));
      clearInterval(interval);
      setUploadProgress(100);
      setTimeout(() => onPatch({ text: url }), 300);
    } catch (e) {
      console.error("Upload failed", e);
      const blobUrl = URL.createObjectURL(file);
      onPatch({ text: blobUrl });
      setUploading(false);
    }
  };

  return (
    <div className="rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <div className="flex border-b border-[var(--border)]">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium transition cursor-pointer border-b-2 -mb-[1px] ${
              tab === t.id
                ? "text-[var(--accent)] border-[var(--accent)]"
                : "text-[var(--muted)] border-transparent hover:text-[var(--text)] hover:border-[var(--border)]"
            }`}
          >
            {renderTabIcon(t.icon)}
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === "upload" && (
          <div>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-[var(--accent)]", "bg-[var(--accent)]/5"); }}
              onDragLeave={(e) => { e.currentTarget.classList.remove("border-[var(--accent)]", "bg-[var(--accent)]/5"); }}
              onDrop={async (e) => {
                e.preventDefault();
                e.currentTarget.classList.remove("border-[var(--accent)]", "bg-[var(--accent)]/5");
                const file = e.dataTransfer.files[0];
                if (file) await handleFileUpload(file);
              }}
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-[var(--border)] p-8 transition hover:border-[var(--accent)] hover:bg-[var(--accent)]/5"
            >
              <div className="rounded-full bg-[var(--hover)] p-3">
                <Upload size={24} className="text-[var(--muted)]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-[var(--text)]">Upload an image</p>
                <p className="mt-1 text-xs text-[var(--muted)]">Click to browse, drag & drop, or paste</p>
              </div>
              <p className="text-[10px] text-[var(--muted)]">PNG, JPG, JPEG, GIF, WEBP, SVG</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => Array.from(e.target.files).forEach(handleFileUpload)}
              />
            </div>

            {uploading && (
              <div className="mt-3 rounded-lg border border-[var(--border)] p-3 bg-[var(--surface)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-[var(--text)]">Uploading...</span>
                  <span className="text-[10px] text-[var(--muted)]">{uploadProgress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--accent)] transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}
          </div>
        )}
        {tab === "link" && <LinkTab onSelect={(url) => onPatch({ text: url })} />}
        {tab === "unsplash" && <UnsplashTab onSelect={(url) => onPatch({ text: url })} onToast={onToast} />}
        {tab === "giphy" && <GiphyTab onSelect={(url) => onPatch({ text: url })} onToast={onToast} />}
      </div>
    </div>
  );
}

interface ImagePickerContentProps {
  onSelect: (url: string) => void;
  onClose: () => void;
  pageId?: string;
  onToast?: (message: string) => void;
}

function ImagePickerContent({ onSelect, onClose, pageId, onToast }: ImagePickerContentProps) {
  const [tab, setTab] = useState("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const tabs: Array<{ id: string; label: string; icon: LucideIcon | (() => React.ReactElement) }> = [
    { id: "upload", label: "Upload", icon: Upload },
    { id: "link", label: "Link", icon: Link },
    { id: "unsplash", label: "Unsplash", icon: ImageIcon },
    { id: "giphy", label: "GIPHY", icon: () => <span className="text-[11px] font-bold">GIPHY</span> },
  ];

  const handleFileUpload = async (file: File | null | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const interval = setInterval(() => {
        setUploadProgress((p) => Math.min(p + 15, 85));
      }, 200);
      const url = await uploadImage(file, pageId).catch(() => URL.createObjectURL(file));
      clearInterval(interval);
      setUploadProgress(100);
      setTimeout(() => {
        onSelect(url);
      }, 300);
    } catch (e) {
      console.error("Upload failed", e);
      const blobUrl = URL.createObjectURL(file);
      onSelect(blobUrl);
      setUploading(false);
    }
  };

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          await handleFileUpload(file);
        }
        break;
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-[var(--border)] shrink-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition cursor-pointer border-b-2 -mb-[1px] ${
              tab === t.id
                ? "text-[var(--accent)] border-[var(--accent)]"
                : "text-[var(--muted)] border-transparent hover:text-[var(--text)] hover:border-[var(--border)]"
            }`}
          >
            {renderTabIcon(t.icon)}
            {t.label}
          </button>
        ))}
      </div>

      {uploading && (
        <div className="mx-4 mt-3 rounded-lg border border-[var(--border)] p-3 bg-[var(--surface)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--text)]">Uploading...</span>
            <span className="text-[10px] text-[var(--muted)]">{uploadProgress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
            <div className="h-full rounded-full bg-[var(--accent)] transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {tab === "upload" && (
          <div className="p-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-[var(--accent)]", "bg-[var(--accent)]/5"); }}
              onDragLeave={(e) => { e.currentTarget.classList.remove("border-[var(--accent)]", "bg-[var(--accent)]/5"); }}
              onDrop={async (e) => {
                e.preventDefault();
                e.currentTarget.classList.remove("border-[var(--accent)]", "bg-[var(--accent)]/5");
                const file = e.dataTransfer.files[0];
                if (file) await handleFileUpload(file);
              }}
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[var(--border)] p-10 transition hover:border-[var(--accent)] hover:bg-[var(--accent)]/5"
            >
              <div className="rounded-full bg-[var(--surface)] p-3.5">
                <Upload size={28} className="text-[var(--muted)]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-[var(--text)]">Upload an image</p>
                <p className="mt-1 text-xs text-[var(--muted)]">Click to browse, drag & drop, or paste</p>
              </div>
              <p className="text-[10px] text-[var(--muted)]">PNG, JPG, JPEG, GIF, WEBP, SVG</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files);
                  files.forEach(handleFileUpload);
                }}
              />
            </div>
          </div>
        )}

        {tab === "link" && <LinkTab onSelect={onSelect} />}
        {tab === "unsplash" && <UnsplashTab onSelect={onSelect} onToast={onToast} />}
        {tab === "giphy" && <GiphyTab onSelect={onSelect} onToast={onToast} />}
      </div>
    </div>
  );
}

interface LinkTabProps {
  onSelect: (url: string) => void;
}

function LinkTab({ onSelect }: LinkTabProps) {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const handleUrlChange = (value: string) => {
    setUrl(value);
    if (value && /\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(value)) {
      setPreview(value);
    } else {
      setPreview(null);
    }
  };

  return (
    <div className="p-4">
      <div className="relative mb-4">
        <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input
          type="text"
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && url.trim()) {
              const clean = url.trim();
              if (!/^https?:\/\//i.test(clean)) {
                onSelect(`https://${clean}`);
              } else {
                onSelect(clean);
              }
            }
          }}
          placeholder="Paste image URL..."
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-9 pr-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
        />
      </div>

      {preview && (
        <div>
          <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <img src={preview} alt="Preview" className="max-h-64 w-full object-contain" onError={() => setPreview(null)} />
          </div>
          <button
            onClick={() => onSelect(url)}
            className="mt-3 w-full rounded-lg bg-[var(--accent)] py-2.5 text-sm font-semibold text-white hover:opacity-90 transition cursor-pointer"
          >
            Insert Image
          </button>
        </div>
      )}

      {!preview && url && (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-[var(--border)] p-8">
          <p className="text-xs text-[var(--muted)]">Enter a direct image URL to preview</p>
        </div>
      )}
    </div>
  );
}

// Loose shape covering only the fields this component actually reads from
// the Unsplash API response (id, urls.regular/small, alt_description,
// user.name) — not a full API type, which isn't needed here.
interface UnsplashPhoto {
  id: string;
  urls: { regular: string; small: string };
  alt_description?: string | null;
  user: { name: string };
}

interface UnsplashTabProps {
  onSelect: (url: string) => void;
  onToast?: (message: string) => void;
}

function UnsplashTab({ onSelect, onToast }: UnsplashTabProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UnsplashPhoto[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searching, setSearching] = useState(false);
  const [popular, setPopular] = useState<UnsplashPhoto[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    fetch(`https://api.unsplash.com/photos?per_page=12`, {
      headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` }
    })
      .then(r => r.json())
      .then(data => setPopular(data || []))
      .catch(() => {});
  }, []);

  const search = useCallback(async (p = 1) => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query.trim())}&page=${p}&per_page=20`,
        { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } }
      );
      if (!res.ok) throw new Error(`Unsplash error (${res.status})`);
      const data = await res.json();
      setResults(prev => p === 1 ? (data.results || []) : [...prev, ...(data.results || [])]);
      setHasMore(data.results?.length === 20);
      setPage(p);
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : String(e));
    } finally {
      setSearching(false);
    }
  }, [query, onToast]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); search(1); };

  const photos = query ? results : popular;

  return (
    <div className="p-4">
      <form onSubmit={handleSearch} className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Unsplash..."
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-9 pr-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
        />
      </form>

      {searching && (
        <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-[var(--muted)]" /></div>
      )}

      {!searching && photos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ImageIcon size={32} className="text-[var(--muted)] mb-3" />
          <p className="text-sm text-[var(--muted)]">Search millions of free images</p>
          <p className="mt-1 text-[11px] text-[var(--muted)]">Powered by Unsplash</p>
        </div>
      )}

      {photos.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-2">
            {photos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => onSelect(photo.urls.regular)}
                className="group relative aspect-square overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] transition hover:ring-2 hover:ring-[var(--accent)] cursor-pointer"
              >
                <img src={photo.urls.small} alt={photo.alt_description || ""} className="h-full w-full object-cover" loading="lazy" />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                  <span className="text-[10px] text-white truncate max-w-[70%]">{photo.user.name}</span>
                  <ExternalLink size={10} className="text-white shrink-0" />
                </div>
              </button>
            ))}
          </div>
          {hasMore && query && (
            <button
              onClick={() => search(page + 1)}
              disabled={searching}
              className="mt-3 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--hover)] transition disabled:opacity-50 cursor-pointer"
            >
              {searching ? "Loading..." : "Load more"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// Loose shape covering only the fields this component reads from the
// GIPHY API response.
interface GiphyGif {
  id: string;
  title?: string;
  images?: {
    original?: { url: string };
    fixed_height?: { url: string };
  };
}

interface GiphyTabProps {
  onSelect: (url: string) => void;
  onToast?: (message: string) => void;
}

function GiphyTab({ onSelect, onToast }: GiphyTabProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GiphyGif[]>([]);
  const [trending, setTrending] = useState<GiphyGif[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=12`)
      .then(r => r.json())
      .then(data => setTrending(data.data || []))
      .catch(() => {});
  }, []);

  const search = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query.trim())}&limit=20`
      );
      const data = await res.json();
      setResults(data.data || []);
    } catch (e) {
      onToast?.("GIPHY search failed");
    } finally {
      setSearching(false);
    }
  }, [query, onToast]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); search(); };

  const gifs = query ? results : trending;

  return (
    <div className="p-4">
      <form onSubmit={handleSearch} className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GIPHY..."
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-9 pr-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
        />
      </form>

      {searching && (
        <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-[var(--muted)]" /></div>
      )}

      {!searching && gifs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="text-3xl mb-3">🎯</span>
          <p className="text-sm text-[var(--muted)]">Search the best GIFs</p>
          <p className="mt-1 text-[11px] text-[var(--muted)]">Powered by GIPHY</p>
        </div>
      )}

      {gifs.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {gifs.map((gif) => (
            <button
              key={gif.id}
              onClick={() => onSelect(gif.images?.original?.url || gif.images?.fixed_height?.url)}
              className="group relative aspect-video overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] transition hover:ring-2 hover:ring-[var(--accent)] cursor-pointer"
            >
              <img
                src={gif.images?.fixed_height?.url || gif.images?.original?.url}
                alt={gif.title || "GIF"}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
