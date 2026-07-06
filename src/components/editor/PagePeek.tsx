import React, { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Clock, FileText } from "lucide-react";
import { timeAgo, plainText } from "../../utils/helpers";
import type { Page } from "../../lib/supabaseService";

interface PagePeekProps {
  page: Page | null | undefined;
  pages?: Page[];
  children: React.ReactNode;
  onNavigate?: (pageId: string, options?: { altKey?: boolean }) => void;
  onOpenFull?: (pageId: string) => void;
}

export default function PagePeek({ page, pages, children, onNavigate, onOpenFull }: PagePeekProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = useCallback(() => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      let top = rect.bottom + 4;
      let left = rect.left;
      const panelWidth = 340;
      const panelHeight = 280;
      if (left + panelWidth > window.innerWidth - 12) {
        left = window.innerWidth - panelWidth - 12;
      }
      if (top + panelHeight > window.innerHeight - 12) {
        top = rect.top - panelHeight - 4;
      }
      if (left < 12) left = 12;
      setPosition({ top, left });
      setOpen(true);
    }, 400);
  }, []);

  const handleMouseLeave = useCallback(() => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      setOpen(false);
    }, 200);
  }, []);

  useEffect(() => {
    return () => clearTimeout(hoverTimer.current);
  }, []);

  if (!page) return <>{children}</>;

  const blockCount = page.blocks?.length || 0;
  const wordCount = plainText(page).split(/\s+/).filter(Boolean).length;

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-flex cursor-pointer items-center gap-1 rounded px-0.5 -mx-0.5 hover:bg-[var(--accent)]/10 transition-colors"
      >
        {children}
      </span>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -2 }}
              transition={{ type: "spring", stiffness: 380, damping: 26 }}
              style={{ top: position.top, left: position.left, width: 340 }}
              className="fixed z-[200] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
              onMouseEnter={() => { clearTimeout(hoverTimer.current); setOpen(true); }}
              onMouseLeave={handleMouseLeave}
            >
              <div className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0 mt-0.5">{page.icon || "📄"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-[var(--text)] truncate">
                      {page.title || "Untitled"}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-[var(--muted)]">
                      <span className="flex items-center gap-1">
                        <FileText size={10} />
                        {blockCount} block{blockCount !== 1 ? "s" : ""}
                      </span>
                      <span>{wordCount} words</span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {timeAgo(page.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {page.cover && (
                  <div
                    className="h-20 rounded-lg"
                    style={{
                      background: page.cover.startsWith("linear-gradient")
                        ? page.cover
                        : `url(${page.cover}) center/cover no-repeat`
                    }}
                  />
                )}

                <div className="max-h-[120px] overflow-hidden relative">
                  <div className="space-y-0.5 text-xs text-[var(--secondary)] leading-relaxed">
                    {(page.blocks || []).slice(0, 5).map((block) => (
                      <div key={block.id} className="truncate">
                        {block.type === "h1" && <span className="font-semibold text-[var(--text)]">{block.text}</span>}
                        {block.type === "h2" && <span className="font-semibold text-[var(--text)]">{block.text}</span>}
                        {block.type === "h3" && <span className="font-semibold text-[var(--text)]">{block.text}</span>}
                        {block.type === "bullet" && <span>• {block.text}</span>}
                        {block.type === "number" && <span>1. {block.text}</span>}
                        {block.type === "quote" && <span className="italic">"{block.text}"</span>}
                        {block.type === "todo" && <span>{block.checked ? "☑" : "☐"} {block.text}</span>}
                        {block.type === "divider" && <hr className="border-[var(--border)] my-1" />}
                        {(block.type === "text" || !block.type) && <span>{block.text}</span>}
                        {block.text || <span className="text-[var(--muted)] italic">Empty</span>}
                      </div>
                    ))}
                    {(page.blocks || []).length > 5 && (
                      <div className="text-[var(--muted)] text-[10px] pt-1">
                        + {(page.blocks || []).length - 5} more blocks
                      </div>
                    )}
                  </div>
                  {(page.blocks || []).length > 3 && (
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[var(--surface)] to-transparent" />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[var(--border)] px-3 py-2 bg-[var(--surface-2)]">
                <button
                  onClick={(e) => { e.stopPropagation(); onNavigate?.(page.id, { altKey: e.altKey }); setOpen(false); }}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10 transition"
                >
                  <ExternalLink size={12} />
                  Open page
                </button>
                {onOpenFull && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onOpenFull?.(page.id); setOpen(false); }}
                    className="rounded-md px-2 py-1 text-xs text-[var(--secondary)] hover:bg-[var(--hover)] transition"
                  >
                    Open as peek
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
