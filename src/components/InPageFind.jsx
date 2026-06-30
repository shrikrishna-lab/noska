import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Search, ChevronUp, ChevronDown, X } from "lucide-react";

export default function InPageFind({ blocks, onClose }) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const results = [];
    (blocks || []).forEach((block, idx) => {
      const text = block.text || "";
      let pos = 0;
      while (pos < text.length) {
        const found = text.toLowerCase().indexOf(q, pos);
        if (found === -1) break;
        results.push({ blockId: block.id, blockIndex: idx, start: found, end: found + q.length });
        pos = found + 1;
      }
    });
    return results;
  }, [query, blocks]);

  const clamped = matches.length > 0 ? ((activeIndex % matches.length) + matches.length) % matches.length : 0;

  useEffect(() => {
    if (matches.length > 0) {
      const match = matches[clamped];
      const el = document.querySelector(`[data-block-id="${match.blockId}"]`);
      if (el) {
        el.scrollIntoView({ block: "center" });
        el.style.outline = "2px solid var(--accent)";
        el.style.outlineOffset = "-2px";
        el.style.borderRadius = "4px";
        setTimeout(() => {
          el.style.outline = "";
          el.style.outlineOffset = "";
          el.style.borderRadius = "";
        }, 800);
      }
    }
  }, [clamped, matches]);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onClose?.(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const navigate = useCallback((dir) => {
    if (matches.length === 0) return;
    setActiveIndex((prev) => prev + dir);
  }, [matches.length]);

  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 shadow-sm">
      <Search size={14} className="shrink-0 text-[var(--muted)]" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.shiftKey) navigate(-1);
          else if (e.key === "Enter") navigate(1);
        }}
        placeholder="Find in page..."
        className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
      />
      {matches.length > 0 && (
        <span className="shrink-0 text-[11px] text-[var(--muted)] tabular-nums">
          {clamped + 1}/{matches.length}
        </span>
      )}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={() => navigate(-1)}
          disabled={matches.length === 0}
          className="grid h-6 w-6 place-items-center rounded text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
          title="Previous match (Shift+Enter)"
        >
          <ChevronUp size={14} />
        </button>
        <button
          onClick={() => navigate(1)}
          disabled={matches.length === 0}
          className="grid h-6 w-6 place-items-center rounded text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
          title="Next match (Enter)"
        >
          <ChevronDown size={14} />
        </button>
      </div>
      <button
        onClick={onClose}
        className="grid h-6 w-6 place-items-center rounded text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition cursor-pointer"
        title="Close (Escape)"
      >
        <X size={14} />
      </button>
    </div>
  );
}
