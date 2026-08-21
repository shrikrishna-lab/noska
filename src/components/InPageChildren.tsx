import React, { useMemo } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { motion } from "framer-motion";
import { ChevronRight, ArrowUpRight } from "lucide-react";
import { isPageEntity } from "../utils/pageTreeOps";
import type { Page } from "../lib/supabaseService";
import { PageIcon } from "./PageIcon";

interface ChildPage extends Page {
  childCount: number;
}

export interface InPageChildrenProps {
  pageId: string;
  pages: Page[];
  onNavigate?: (pageId: string, options?: { altKey?: boolean }) => void;
  // Destructured by the original .jsx but never called anywhere in its
  // body — a pre-existing dead prop (confirmed via grep of this file, no
  // call site for it exists). Preserved as-is, not wired up.
  onAddInside?: (pageId: string) => void;
}

export default function InPageChildren({ pageId, pages, onNavigate }: InPageChildrenProps) {
  const page = useMemo(() => pages.find(p => p.id === pageId), [pageId, pages]);
  const children: ChildPage[] = useMemo(() => {
    if (!page?.content) return [];
    return page.content
      .map(id => pages.find(p => p.id === id))
      .filter((p): p is Page => Boolean(p))
      .filter(p => !p.trashed)
      .map(child => ({
        ...child,
        childCount: (child.content || []).filter(cid => {
          const c = pages.find(p => p.id === cid);
          return c && !c.trashed && isPageEntity(c);
        }).length,
      }));
  }, [page, pages]);

  if (!children || children.length === 0) return null;

  return (
    <div className="mt-8 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-px bg-[var(--border)]" />
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>
      <div className="grid gap-1.5">
        {children.map((child, i) => (
          <motion.button
            key={child.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, type: "spring", stiffness: 380, damping: 28 }}
            onMouseDown={(e: ReactMouseEvent) => e.stopPropagation()}
            onClick={(e: ReactMouseEvent) => onNavigate?.(child.id, { altKey: e.altKey })}
            className="group flex items-center gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-left hover:border-[var(--accent)] hover:bg-[var(--hover)] transition-all cursor-pointer"
          >
            <span className="text-lg shrink-0 flex items-center justify-center">
              <PageIcon icon={child.icon} size={18} fallback={<span>📄</span>} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-[var(--text)] truncate">
                {child.title || "Untitled"}
              </div>
              {child.lastEditedBy && (
                <div className="text-[10px] text-[var(--muted)] mt-0.5">
                  Edited {child.updatedAt ? timeAgo(child.updatedAt) : ""}
                  {child.lastEditedBy ? ` by ${child.lastEditedBy}` : ""}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {child.childCount > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] text-[var(--muted)]">
                  <ChevronRight size={10} />
                  {child.childCount}
                </span>
              )}
              <ArrowUpRight size={14} className="text-[var(--muted)] opacity-0 group-hover:opacity-100 transition shrink-0" />
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function timeAgo(iso: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}
