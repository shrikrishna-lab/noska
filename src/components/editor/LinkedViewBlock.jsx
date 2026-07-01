import React, { useMemo } from "react";
import { Link2, Database, ExternalLink, X } from "lucide-react";
import DatabaseBlock from "../DatabaseBlock";

/**
 * LinkedViewBlock — references an existing database elsewhere in the workspace
 * and renders it inline. No data is copied; the source database is shown live.
 *
 * block.sourcePageId / block.sourceBlockId identify the linked database.
 * Until a source is chosen, shows a picker of available databases (no fake data).
 */
export default function LinkedViewBlock({ block, onPatch, isLocked, pages = [], page, apiKey, aiProvider, onNavigate }) {
  // Discover every database block across all pages.
  const sources = useMemo(() => {
    const found = [];
    for (const p of pages) {
      if (p.trashed) continue;
      for (const b of (p.blocks || [])) {
        if (b.database && Array.isArray(b.database.properties)) {
          found.push({
            pageId: p.id,
            pageTitle: p.title || "Untitled",
            pageIcon: p.icon || "📄",
            blockId: b.id,
            label: b.text || p.title || "Untitled database",
            propCount: b.database.properties.length,
            rowCount: b.database.rows?.length || 0,
          });
        }
      }
    }
    return found;
  }, [pages]);

  const source = useMemo(() => {
    if (!block.sourceBlockId) return null;
    for (const p of pages) {
      const b = (p.blocks || []).find((x) => x.id === block.sourceBlockId);
      if (b) return { page: p, block: b };
    }
    return null;
  }, [pages, block.sourceBlockId]);

  // Picker state — no source chosen yet.
  if (!source) {
    return (
      <div className="my-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex items-center gap-2 mb-2 text-sm font-medium text-[var(--text)]">
          <Link2 size={15} className="text-[var(--accent)]" />
          Linked view of data source
        </div>
        {sources.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">
            No databases found in your workspace yet. Create a database on any page first, then link it here.
          </p>
        ) : (
          <>
            <p className="text-xs text-[var(--muted)] mb-2">Choose a database to reference (data stays in its source):</p>
            <div className="flex flex-col gap-1">
              {sources.map((s) => (
                <button
                  key={s.blockId}
                  disabled={isLocked}
                  onClick={() => onPatch({ sourcePageId: s.pageId, sourceBlockId: s.blockId })}
                  className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-left hover:border-[var(--accent)] hover:bg-[var(--hover)] transition cursor-pointer"
                >
                  <Database size={14} className="text-[var(--accent)] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-[var(--text)] truncate">{s.label}</div>
                    <div className="text-[10px] text-[var(--muted)]">
                      {s.pageIcon} {s.pageTitle} · {s.propCount} propert{s.propCount === 1 ? "y" : "ies"} · {s.rowCount} row{s.rowCount === 1 ? "" : "s"}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // A source is chosen — render it linked.
  return (
    <div className="my-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border)] bg-[var(--surface-2)]">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--secondary)] min-w-0">
          <Link2 size={12} className="text-[var(--accent)] shrink-0" />
          <span className="shrink-0">Linked:</span>
          <button
            onClick={() => onNavigate?.(source.page.id)}
            className="truncate text-[var(--accent)] hover:underline inline-flex items-center gap-1 cursor-pointer"
            title="Open source page"
          >
            {source.page.icon || "📄"} {source.block.text || source.page.title || "Untitled"}
            <ExternalLink size={10} className="shrink-0" />
          </button>
        </div>
        {!isLocked && (
          <button
            onClick={() => onPatch({ sourcePageId: null, sourceBlockId: null })}
            title="Unlink / choose a different source"
            className="p-1 rounded text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition cursor-pointer"
          >
            <X size={13} />
          </button>
        )}
      </div>
      {/* Render the linked database read-only. Editing happens at the source
          (cross-page write-back isn't wired yet — see "open source" link above). */}
      <div className="p-2">
        <DatabaseBlock
          block={source.block}
          onPatch={() => { /* read-only: edits are made on the source page */ }}
          apiKey={apiKey}
          aiProvider={aiProvider}
          page={source.page}
        />
        <div className="px-2 pb-1 pt-2 text-[10px] text-[var(--muted)] italic">
          Read-only mirror — open the source page to edit rows or properties.
        </div>
      </div>
    </div>
  );
}
