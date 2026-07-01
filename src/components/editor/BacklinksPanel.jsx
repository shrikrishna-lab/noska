import React, { useMemo } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";

export default function BacklinksPanel({ pageId, pages, onNavigate, onClose }) {
  const backlinks = useMemo(() => {
    const currentPage = pages.find(p => p.id === pageId);
    if (!currentPage) return [];
    const title = currentPage.title?.toLowerCase() || "";
    const results = [];
    pages.forEach((p) => {
      if (p.id === pageId) return;
      const blocks = p.blocks || [];
      const mentions = blocks.filter((b) => {
        const text = b.text || "";
        return text.toLowerCase().includes(`[[${title}]]`) || text.includes(`@${currentPage.title}`) || text.includes(`@${pageId}`);
      });
      if (mentions.length > 0) {
        results.push({ page: p, mentions });
      }
    });
    return results;
  }, [pageId, pages]);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--elevated)] shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
        <h3 className="text-xs font-semibold text-[var(--text)]">Backlinks</h3>
        <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--text)] transition cursor-pointer">
          <ArrowLeft size={14} />
        </button>
      </div>
      {backlinks.length === 0 ? (
        <div className="px-3 py-6 text-center text-[11px] text-[var(--muted)]">No pages link to this page</div>
      ) : (
        <div className="max-h-48 overflow-auto py-1">
          {backlinks.map(({ page: p, mentions }) => (
            <button
              key={p.id}
              onClick={() => onNavigate?.(p.id)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[var(--text)] hover:bg-[var(--hover)] transition cursor-pointer"
            >
              <span className="text-base shrink-0">{p.icon || "📄"}</span>
              <span className="flex-1 truncate font-medium">{p.title || "Untitled"}</span>
              <span className="shrink-0 text-[10px] text-[var(--muted)]">{mentions.length} mention{mentions.length > 1 ? "s" : ""}</span>
              <ExternalLink size={11} className="shrink-0 text-[var(--muted)]" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
