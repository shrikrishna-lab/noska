import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { FileText, Clock, Hash } from "lucide-react";
import { timeAgo } from "../../utils/helpers";
import { getBlockTitle } from "../../utils/blockModel";
import type { Page } from "../../lib/supabaseService";
import { PageIcon } from "../PageIcon";
import PageBlocksPreview from "./PageBlocksPreview";
import ViewPreview from "./ViewPreview";

interface TabHoverPreviewProps {
  tab: { type: "page" | "view"; targetId: string };
  icon: string;
  title: string;
  breadcrumb?: string;
  page: Page | null;
  pages?: Page[];
  sharedPages?: Page[];
  pendingInvites?: Array<{ id: string; inviter_username?: string | null; role?: string | null; page_title?: string | null }>;
  aiChats?: Array<{ id: string; name?: string | null; updatedAt?: string | null }>;
  anchor: { left: number; top: number; bottom: number; right: number };
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  panelRef?: React.RefObject<HTMLDivElement | null>;
}

export default function TabHoverPreview({
  tab,
  icon,
  title,
  breadcrumb,
  page,
  pages = [],
  sharedPages = [],
  pendingInvites = [],
  aiChats = [],
  anchor,
  onMouseEnter,
  onMouseLeave,
  panelRef
}: TabHoverPreviewProps) {
  const W = 360;
  const H = 400;

  const pos = useMemo(() => {
    let top = anchor.bottom + 6;
    let left = anchor.left;
    if (left + W > window.innerWidth - 10) left = window.innerWidth - W - 10;
    if (left < 10) left = 10;
    if (top + H > window.innerHeight - 10) top = Math.max(10, anchor.top - H - 6);
    return { top, left };
  }, [anchor]);

  const blockCount = page?.blocks?.length || 0;
  const wordCount = (page?.blocks || []).filter((b) => (getBlockTitle(b as never) || b.text || "").trim()).length;

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, scale: 0.96, y: -2 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -2 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      style={{ top: pos.top, left: pos.left, width: W, height: H }}
      className="fixed z-[80] flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Cover strip */}
      {page?.cover && (
        <div
          className="h-12 w-full shrink-0 border-b border-[var(--border)]"
          style={{
            ...(page.cover.includes("gradient(") || page.cover.startsWith("#") || page.cover.startsWith("rgb") || page.cover.startsWith("hsl")
              ? { background: page.cover }
              : { backgroundImage: `url(${page.cover})`, backgroundPosition: "center", backgroundSize: "cover", backgroundRepeat: "no-repeat" })
          }}
        />
      )}

      <div className="p-3 space-y-2.5 flex flex-col min-h-0">
        {/* Header */}
        <div className="flex items-start gap-2.5 shrink-0">
          <span className="shrink-0 flex items-center justify-center text-[20px] leading-none mt-0.5">
            <PageIcon icon={icon} size={20} fallback={<span>📄</span>} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-[var(--text)]">{title}</div>
            {breadcrumb && breadcrumb !== title && (
              <div className="mt-0.5 truncate text-[10.5px] text-[var(--muted)]">{breadcrumb}</div>
            )}
          </div>
        </div>

        {/* Meta */}
        {page && (
          <div className="flex items-center gap-3 text-[10px] text-[var(--muted)] shrink-0">
            <span className="flex items-center gap-1">
              <FileText size={10} />
              {blockCount} block{blockCount !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              <Hash size={10} />
              {wordCount} blocks with text
            </span>
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {timeAgo(page.updatedAt)}
            </span>
          </div>
        )}

        {/* Real content — faithful, scrollable */}
        {page ? (
          <div className="relative min-h-0 flex-1 overflow-y-auto scrollbar-thin">
            <PageBlocksPreview page={page} />
          </div>
        ) : tab.type === "view" ? (
          <div className="relative min-h-0 flex-1 overflow-y-auto scrollbar-thin rounded-md border border-[var(--border)] bg-[var(--surface-2)]/40 p-2.5">
            <ViewPreview
              view={tab.targetId}
              pages={pages}
              sharedPages={sharedPages}
              pendingInvites={pendingInvites}
              aiChats={aiChats}
            />
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-[var(--border)] py-6 text-center">
            <span className="text-[16px]">{icon}</span>
            <span className="text-[11px] text-[var(--text-secondary)]">{title}</span>
            <span className="text-[10px] text-[var(--muted)]">Workspace section</span>
          </div>
        )}
      </div>

      </motion.div>
  );
}