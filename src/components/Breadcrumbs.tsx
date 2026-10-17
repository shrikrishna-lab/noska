import React, { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { getAncestorPath } from "../utils/pageTreeOps";
import { PageIcon } from "./PageIcon";

interface BreadcrumbsProps {
  pageId: string;
  pages: any[];
  onNavigate?: (pageId: string, opts?: { altKey?: boolean }) => void;
  className?: string;
}

export default function Breadcrumbs({ pageId, pages, onNavigate, className = "" }: BreadcrumbsProps) {
  const path = useMemo(() => getAncestorPath(pageId, pages), [pageId, pages]);

  if (!path || path.length <= 1) return null;

  return (
    <nav
      className={`flex items-center gap-0.5 text-[11px] text-[var(--muted)] select-none min-w-0 overflow-hidden ${className}`}
      aria-label="Breadcrumbs"
    >
      {path.map((p, i) => {
        const isLast = i === path.length - 1;
        return (
          <React.Fragment key={p.id}>
            {i > 0 && (
              <ChevronRight
                size={10}
                strokeWidth={2.4}
                className="shrink-0 text-black/25 dark:text-white/30"
              />
            )}
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={isLast ? undefined : (e) => onNavigate?.(p.id, { altKey: e.altKey })}
              className={`inline-flex items-center gap-1 truncate max-w-[120px] rounded-[6px] px-1.5 py-0.5 transition-all text-[11px] font-medium ${isLast
                  ? "text-[var(--text)] font-semibold cursor-default bg-black/[0.03] dark:bg-white/[0.05]"
                  : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 cursor-pointer"
                }`}
              aria-current={isLast ? "page" : undefined}
              tabIndex={isLast ? -1 : 0}
              title={p.title || "Untitled"}
            >
              <span className="shrink-0 flex items-center justify-center">
                <PageIcon icon={p.icon} size={11.5} fallback={<span className="text-[11px] leading-none">📄</span>} />
              </span>
              <span className="truncate">{p.title || "Untitled"}</span>
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
}
