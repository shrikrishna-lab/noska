import React, { useState, useRef, useEffect, useCallback } from "react";
import { Search, Upload, Link, Image as ImageIcon, X, Loader2, ExternalLink } from "lucide-react";

const UNSPLASH_ACCESS_KEY = "BkXiwJRFV3x6R8NsbRcph1U8qRcx0tQ5B60QFKQoWcQ";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function ImagePicker({ onSelect, onClose }) {
  const [tab, setTab] = useState("upload");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const tabs = [
    { id: "upload", label: "Upload", icon: Upload },
    { id: "unsplash", label: "Unsplash", icon: ImageIcon },
    { id: "link", label: "Link", icon: Link },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Tab bar */}
      <div className="flex border-b border-[var(--border)] shrink-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={classNames(
              "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition cursor-pointer border-b-2 -mb-[1px]",
              tab === t.id
                ? "text-[var(--accent)] border-[var(--accent)]"
                : "text-[var(--muted)] border-transparent hover:text-[var(--text)] hover:border-[var(--border)]"
            )}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "upload" && <UploadTab onSelect={onSelect} setLoading={setLoading} setError={setError} />}
        {tab === "unsplash" && <UnsplashTab onSelect={onSelect} setLoading={setLoading} setError={setError} />}
        {tab === "link" && <LinkTab onSelect={onSelect} setError={setError} />}
      </div>
    </div>
  );
}

function UploadTab({ onSelect, setLoading, setError }) {
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);
  const dropRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback((file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    setError("");
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
      setLoading(false);
    };
    reader.onerror = () => {
      setError("Failed to read file");
      setLoading(false);
    };
    reader.readAsDataURL(file);
  }, [setLoading, setError]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }, [handleFile]);

  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
    const onDragLeave = (e) => { if (!el.contains(e.relatedTarget)) setDragging(false); };
    el.addEventListener("dragover", onDragOver);
    el.addEventListener("dragleave", onDragLeave);
    el.addEventListener("drop", handleDrop);
    return () => {
      el.removeEventListener("dragover", onDragOver);
      el.removeEventListener("dragleave", onDragLeave);
      el.removeEventListener("drop", handleDrop);
    };
  }, [handleDrop]);

  return (
    <div className="p-4">
      <div
        ref={dropRef}
        onClick={() => fileRef.current?.click()}
        className={classNames(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition",
          dragging
            ? "border-[var(--accent)] bg-[var(--accent)]/5"
            : "border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5"
        )}
      >
        <div className="rounded-full bg-[var(--surface)] p-3">
          <Upload size={24} className="text-[var(--muted)]" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-[var(--text)]">Click to upload</p>
          <p className="mt-1 text-xs text-[var(--muted)]">or drag and drop</p>
        </div>
        <p className="text-[10px] text-[var(--muted)]">PNG, JPG, GIF, WebP</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </div>

      {preview && (
        <div className="mt-4">
          <div className="relative overflow-hidden rounded-xl border border-[var(--border)]">
            <img src={preview} alt="Preview" className="max-h-64 w-full object-contain" />
            <button
              onClick={() => setPreview(null)}
              className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70 transition cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
          <button
            onClick={() => onSelect(preview)}
            className="mt-3 w-full rounded-lg bg-[var(--accent)] py-2.5 text-sm font-semibold text-white hover:opacity-90 transition cursor-pointer"
          >
            Insert Image
          </button>
        </div>
      )}
    </div>
  );
}

function UnsplashTab({ onSelect, setLoading, setError }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const search = useCallback(async (p = 1) => {
    if (!query.trim()) return;
    setSearching(true);
    setError("");
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query.trim())}&page=${p}&per_page=20`,
        { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } }
      );
      if (!res.ok) {
        if (res.status === 403) throw new Error("Unsplash API rate limit reached. Try again later.");
        if (res.status === 401) throw new Error("Invalid Unsplash API key.");
        throw new Error(`Unsplash error (${res.status})`);
      }
      const data = await res.json();
      if (p === 1) {
        setResults(data.results || []);
      } else {
        setResults((prev) => [...prev, ...(data.results || [])]);
      }
      setHasMore(data.results?.length === 20);
      setPage(p);
    } catch (e) {
      setError(e.message);
    } finally {
      setSearching(false);
    }
  }, [query, setError]);

  const handleSearch = (e) => {
    e.preventDefault();
    search(1);
  };

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
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-[var(--muted)]" />
        </div>
      )}

      {!searching && results.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ImageIcon size={32} className="text-[var(--muted)] mb-3" />
          <p className="text-sm text-[var(--muted)]">Search millions of free images</p>
          <p className="mt-1 text-[11px] text-[var(--muted)]">Powered by Unsplash</p>
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-2">
            {results.map((photo) => (
              <button
                key={photo.id}
                onClick={() => onSelect(photo.urls.regular)}
                className="group relative aspect-square overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] transition hover:ring-2 hover:ring-[var(--accent)] cursor-pointer"
              >
                <img
                  src={photo.urls.small}
                  alt={photo.alt_description || "Unsplash image"}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                  <span className="text-[10px] text-white truncate max-w-[70%]">
                    {photo.user.name}
                  </span>
                  <ExternalLink size={10} className="text-white shrink-0" />
                </div>
              </button>
            ))}
          </div>
          {hasMore && (
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

function LinkTab({ onSelect, setError }) {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUrlChange = (value) => {
    setUrl(value);
    setError("");
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
              if (/\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(url.trim())) {
                onSelect(url.trim());
              } else {
                setError("URL must point to an image file (PNG, JPG, GIF, etc.)");
              }
            }
          }}
          placeholder="Paste image URL..."
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-9 pr-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
        />
      </div>

      {preview && (
        <div className="relative overflow-hidden rounded-xl border border-[var(--border)]">
          <img
            src={preview}
            alt="Preview"
            className="max-h-64 w-full object-contain"
            onError={() => setPreview(null)}
          />
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
