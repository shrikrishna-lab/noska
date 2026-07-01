import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Search, ChevronUp, ChevronDown, X, Replace } from "lucide-react";

export default function InPageFind({ blocks, onClose, onReplace }) {
  const [query, setQuery] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [showReplace, setShowReplace] = useState(false);
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

  const handleReplace = useCallback(() => {
    if (matches.length === 0 || !query.trim()) return;
    const match = matches[clamped];
    onReplace?.(match.blockId, match.start, match.end, replaceText);
    const q = query.toLowerCase();
    const block = blocks.find(b => b.id === match.blockId);
    if (block) {
      const text = block.text || "";
      let pos = replaceText.length > 0 ? match.start + replaceText.length : match.start;
      let nextFound = text.toLowerCase().indexOf(q, pos);
      if (nextFound === -1) nextFound = text.toLowerCase().indexOf(q, 0);
      if (nextFound >= 0) {
        const newIdx = matches.findIndex(m => m.blockId === match.blockId && m.start === nextFound);
        if (newIdx >= 0) setActiveIndex(newIdx);
      }
    }
  }, [matches, clamped, replaceText, query, blocks, onReplace]);

  const handleReplaceAll = useCallback(() => {
    if (!query.trim() || !onReplace) return;
    const q = query.toLowerCase();
    (blocks || []).forEach((block) => {
      const text = block.text || "";
      let pos = 0;
      while (pos < text.length) {
        const found = text.toLowerCase().indexOf(q, pos);
        if (found === -1) break;
        onReplace(block.id, found, found + q.length, replaceText);
        pos = found + replaceText.length;
      }
    });
  }, [query, replaceText, blocks, onReplace]);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 shadow-sm">
      <div className="flex items-center gap-2">
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
          onClick={() => setShowReplace(!showReplace)}
          className={`grid h-6 w-6 place-items-center rounded transition cursor-pointer ${showReplace ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]"}`}
          title="Replace"
        >
          <Replace size={14} />
        </button>
        <button
          onClick={onClose}
          className="grid h-6 w-6 place-items-center rounded text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition cursor-pointer"
          title="Close (Escape)"
        >
          <X size={14} />
        </button>
      </div>
      {showReplace && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[var(--border)]">
          <input
            type="text"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleReplace(); }}
            placeholder="Replace with..."
            className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
          />
          <button
            onClick={handleReplace}
            disabled={matches.length === 0}
            className="shrink-0 rounded px-2 py-1 text-[11px] font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10 transition disabled:opacity-30 cursor-pointer"
          >
            Replace
          </button>
          <button
            onClick={handleReplaceAll}
            disabled={matches.length === 0}
            className="shrink-0 rounded px-2 py-1 text-[11px] font-medium text-[var(--muted)] hover:bg-[var(--hover)] transition disabled:opacity-30 cursor-pointer"
          >
            Replace all
          </button>
        </div>
      )}
    </div>
  );
}
