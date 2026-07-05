import React, { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { getAncestorPath } from "../utils/pageTreeOps";

export default function Breadcrumbs({ pageId, pages, onNavigate }) {
  const path = useMemo(() => getAncestorPath(pageId, pages), [pageId, pages]);

  if (!path || path.length === 0) return null;

  return (
    <nav className="flex items-center gap-0.5 text-xs text-[var(--muted)] mb-3 min-h-5 overflow-hidden" aria-label="Breadcrumbs">
      {path.map((p, i) => {
        const isLast = i === path.length - 1;
        return (
          <React.Fragment key={p.id}>
            {i > 0 && <ChevronRight size={11} className="shrink-0 text-[var(--border-strong)]" />}
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={isLast ? undefined : (e) => onNavigate?.(p.id, { altKey: e.altKey })}
              className={`truncate max-w-[140px] rounded px-1 py-0.5 transition cursor-pointer ${
                isLast
                  ? "text-[var(--text)] font-semibold cursor-default"
                  : "hover:bg-[var(--hover)] hover:text-[var(--secondary)]"
              }`}
              aria-current={isLast ? "page" : undefined}
              tabIndex={0}
              title={p.title || "Untitled"}
            >
              {p.icon || "📄"} {p.title || "Untitled"}
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
}
