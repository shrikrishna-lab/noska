import React, { useState, useRef } from "react";
import { Upload } from "lucide-react";

// `fileName` is accepted but never read in this component's body — a
// caller (renderBlockEditor.tsx's MediaUploadPlaceholder call sites, per
// the Phase-4 renderBlockEditor.tsx conversion) passes it explicitly
// as documentation for a dead prop rather than a real behavior. Keeping
// it in the props interface (optional, unused) matches that established
// dead-prop-documentation pattern instead of silently dropping it.
interface MediaUploadPlaceholderProps {
  type: "video" | "audio" | "file";
  onSelect: (url: string) => void;
  onDelete?: () => void;
  isLocked?: boolean;
  accept?: string;
  fileName?: string | boolean;
}

export default function MediaUploadPlaceholder({ type, onSelect, onDelete, isLocked, accept = "*/*", fileName }: MediaUploadPlaceholderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState("");
  const [tab, setTab] = useState<"upload" | "link">("upload");

  const handleFile = (file: File | null | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    onSelect(url);
  };

  return (
    <div className="p-6 flex flex-col items-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center text-3xl">
        {type === "video" ? "🎬" : type === "audio" ? "🎵" : "📎"}
      </div>
      <div className="flex gap-1 bg-[var(--surface)] rounded-lg border border-[var(--border)] p-0.5">
        <button
          onClick={() => setTab("upload")}
          className={`rounded-md px-3 py-1 text-xs font-medium transition cursor-pointer ${
            tab === "upload" ? "bg-[var(--accent)] text-white" : "text-[var(--secondary)] hover:text-[var(--text)]"
          }`}
        >
          Upload
        </button>
        <button
          onClick={() => setTab("link")}
          className={`rounded-md px-3 py-1 text-xs font-medium transition cursor-pointer ${
            tab === "link" ? "bg-[var(--accent)] text-white" : "text-[var(--secondary)] hover:text-[var(--text)]"
          }`}
        >
          Link
        </button>
      </div>

      {tab === "upload" ? (
        <div
          onClick={() => !isLocked && fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-[var(--border)] rounded-xl p-8 text-center cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition group"
        >
          <Upload size={24} className="mx-auto text-[var(--muted)] group-hover:text-[var(--accent)] transition mb-2" />
          <div className="text-xs text-[var(--secondary)]">
            Click to upload {type === "video" ? "a video" : type === "audio" ? "an audio file" : "a file"}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }}
            disabled={isLocked}
          />
        </div>
      ) : (
        <div className="w-full flex gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && urlInput.trim()) { onSelect(urlInput.trim()); } }}
            placeholder={`Paste ${type === "video" ? "a video" : type === "audio" ? "an audio" : "a file"} URL...`}
            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]"
            disabled={isLocked}
          />
          <button
            onClick={() => urlInput.trim() && onSelect(urlInput.trim())}
            disabled={isLocked || !urlInput.trim()}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition disabled:opacity-40"
          >
            Embed
          </button>
        </div>
      )}

      {!isLocked && (
        <button
          onClick={onDelete}
          className="text-[10px] text-[var(--muted)] hover:text-[var(--danger)] transition cursor-pointer"
        >
          Delete block
        </button>
      )}
    </div>
  );
}
