import React from "react";
import PageIcon from "@/components/PageIcon";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import type { PagePreviewModel } from "./types";
import { getPageTextureOverlayStyle } from "../../customization/pageTexture";
import {
  FileText,
  FolderKanban,
  CheckSquare,
  Square,
  Database,
  Folder,
  Crown,
  Sparkles,
  Clock,
  ArrowRight,
  Code2,
  Lightbulb,
  Heading1,
  CornerDownLeft
} from "lucide-react";

interface PagePreviewCardProps {
  preview: PagePreviewModel;
  anchorPosition: { top: number; left: number; right: number; height: number };
  side?: "left" | "right";
  pageTexture?: string | null;
  pageBg?: string | null;
  onSelectPage?: (pageId: string) => void;
  onJumpToBlock?: (blockId: string) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const PagePreviewCard = React.memo(function PagePreviewCard({
  preview,
  anchorPosition,
  side = "left",
  pageTexture,
  pageBg,
  onSelectPage,
  onJumpToBlock,
  onMouseEnter,
  onMouseLeave
}: PagePreviewCardProps) {
  const {
    title,
    type,
    previewType,
    description,
    snippet,
    commandTag,
    metadata,
    highlights,
    children,
    stats,
    isContentSection,
    blockId
  } = preview;

  // Determine if active page or theme is dark
  const isDarkCanvas = Boolean(
    (typeof document !== "undefined" && document.documentElement.classList.contains("dark")) ||
    (pageBg && (
      pageBg.includes("#0") ||
      pageBg.includes("#1") ||
      pageBg.includes("#2") ||
      pageBg.includes("rgb(0") ||
      pageBg.includes("rgb(1") ||
      pageBg.includes("rgb(2") ||
      pageBg.includes("black") ||
      pageBg.includes("#1818") ||
      pageBg.includes("#1212")
    ))
  );

  // Generate tone-matched texture overlay style from page texture
  const textureOverlayStyle = getPageTextureOverlayStyle(pageTexture || "tone-grain", isDarkCanvas, pageBg);

  // Render type-specific badge & icon
  const renderHeaderBadge = () => {
    switch (type) {
      case "heading":
        return (
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-mono font-medium border ${
            isDarkCanvas
              ? "bg-[#E0AC3F]/15 text-[#F0CE8A] border-[#E0AC3F]/35"
              : "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30"
          }`}>
            <Heading1 size={12} />
            <span>{commandTag || "/h1"} · Heading</span>
          </span>
        );
      case "code":
        return (
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-mono font-medium border ${
            isDarkCanvas
              ? "bg-[#E0AC3F]/15 text-[#F0CE8A] border-[#E0AC3F]/35"
              : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
          }`}>
            <Code2 size={12} />
            <span>{metadata?.lang ? `/code · ${metadata.lang}` : "/code"}</span>
          </span>
        );
      case "callout":
        return (
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-mono font-medium border ${
            isDarkCanvas
              ? "bg-[#E0AC3F]/15 text-[#F0CE8A] border-[#E0AC3F]/35"
              : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
          }`}>
            <Lightbulb size={12} />
            <span>/callout · Note</span>
          </span>
        );
      case "task":
        return (
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-mono font-medium border ${
            isDarkCanvas
              ? "bg-[#E0AC3F]/15 text-[#F0CE8A] border-[#E0AC3F]/35"
              : "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30"
          }`}>
            <CheckSquare size={12} />
            <span>/todo · Task</span>
          </span>
        );
      case "database":
        return (
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-mono font-medium border ${
            isDarkCanvas
              ? "bg-[#E0AC3F]/15 text-[#F0CE8A] border-[#E0AC3F]/35"
              : "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30"
          }`}>
            <Database size={12} />
            <span>/database · View</span>
          </span>
        );
      case "ai":
        return (
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-mono font-medium border ${
            isDarkCanvas
              ? "bg-[#E0AC3F]/15 text-[#F0CE8A] border-[#E0AC3F]/35"
              : "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/30"
          }`}>
            <Sparkles size={12} />
            <span>/ai · Assistant</span>
          </span>
        );
      case "project":
        return (
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-mono font-medium border ${
            isDarkCanvas
              ? "bg-[#E0AC3F]/15 text-[#F0CE8A] border-[#E0AC3F]/35"
              : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
          }`}>
            <FolderKanban size={12} />
            <span>Project</span>
          </span>
        );
      case "folder":
        return (
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-mono font-medium border ${
            isDarkCanvas
              ? "bg-[#E0AC3F]/15 text-[#F0CE8A] border-[#E0AC3F]/35"
              : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30"
          }`}>
            <Folder size={12} />
            <span>Folder</span>
          </span>
        );
      default:
        return (
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-mono font-medium border ${
            isDarkCanvas
              ? "bg-[#E0AC3F]/15 text-[#F0CE8A] border-[#E0AC3F]/35"
              : "bg-black/[0.05] dark:bg-white/10 text-[var(--text)] border-black/[0.08] dark:border-white/15"
          }`}>
            <FileText size={12} className={isDarkCanvas ? "text-[#E0AC3F]" : "text-[var(--muted)]"} />
            <span>Document</span>
          </span>
        );
    }
  };

  // Exact vertical alignment beside the hovered line
  const cardCenterY = anchorPosition.top + anchorPosition.height / 2;
  const clampedTop = Math.max(120, Math.min(window.innerHeight - 120, cardCenterY));

  const handleClick = () => {
    if (isContentSection && blockId) {
      if (onJumpToBlock) onJumpToBlock(blockId);
      else {
        const el = document.querySelector(`[data-block-id="${blockId}"]`) || document.getElementById(blockId);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else {
      if (onSelectPage && preview.pageId) {
        onSelectPage(preview.pageId);
      }
    }
  };

  const cardContent = (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, x: side === "right" ? 8 : -8 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.94, x: side === "right" ? 8 : -8 }}
      transition={{ type: "spring", stiffness: 460, damping: 28, mass: 0.7 }}
      style={{
        position: "fixed",
        top: clampedTop,
        left: side === "right" ? undefined : Math.round(anchorPosition.right + 10),
        right: side === "right" ? Math.round(window.innerWidth - anchorPosition.left + 10) : undefined,
        transform: "translateY(-50%)",
        transformOrigin: side === "right" ? "right center" : "left center",
        zIndex: 9999,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={handleClick}
      className="flex items-center pointer-events-auto select-none font-sans"
    >
      {/* ─── HORIZONTAL CONNECTING BRIDGE (Connecting Ruler to Card) ─── */}
      {side === "left" && (
        <div className="flex items-center shrink-0 -mr-[1px] z-20 pointer-events-none">
          <div className={`w-2.5 h-[2px] ${
            isDarkCanvas
              ? "bg-gradient-to-r from-amber-500 to-[#E0AC3F]"
              : "bg-gradient-to-r from-blue-500 to-indigo-500"
          }`} />
          <div className={`w-1.5 h-1.5 rounded-full -ml-0.5 ${
            isDarkCanvas
              ? "bg-[#F0CE8A] ring-2 ring-[#E0AC3F]/50"
              : "bg-indigo-400 ring-2 ring-indigo-500/40"
          }`} />
        </div>
      )}

      {/* ─── MAIN PREVIEW CARD CONTAINER ─── */}
      <div
        className={`relative w-76 sm:w-80 p-3.5 rounded-2xl backdrop-blur-3xl cursor-pointer transition-all overflow-hidden ${
          isDarkCanvas
            ? "bg-[#131418]/96 border border-[#E0AC3F]/35 text-white shadow-[0_22px_55px_rgba(0,0,0,0.7),0_0_24px_rgba(224,172,63,0.18),inset_0_1px_0_rgba(240,206,138,0.22)] hover:border-[#E0AC3F]/60"
            : "bg-white/85 dark:bg-[#18191E]/90 border border-black/10 dark:border-white/12 text-[#1C1C1E] dark:text-white shadow-[0_20px_50px_rgba(0,0,0,0.12),0_0_1px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] hover:border-black/20 dark:hover:border-white/25"
        }`}
        style={!isDarkCanvas && pageBg ? { backgroundColor: `${pageBg}e6` } : undefined}
      >
        {/* Tone-matched Texture Layer */}
        {textureOverlayStyle && (
          <div
            className={`absolute inset-0 pointer-events-none rounded-2xl ${
              isDarkCanvas ? "opacity-35 mix-blend-overlay" : "opacity-65 mix-blend-multiply"
            }`}
            style={textureOverlayStyle}
          />
        )}

        {/* 1. Header: Entity Type Badge + Parent Page Badge + Child / Item Counter */}
        <div className={`relative z-10 flex items-center justify-between gap-2 pb-2.5 border-b ${
          isDarkCanvas ? "border-[#E0AC3F]/20" : "border-black/[0.08] dark:border-white/10"
        }`}>
          <div className="flex items-center flex-wrap gap-1.5">
            {renderHeaderBadge()}

            {/* Prominent Parent Page Badge with Crown Icon */}
            {preview.isParentPage && !isContentSection && (
              <span 
                className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-[10px] border shadow-xs ${
                  isDarkCanvas
                    ? "bg-[#E0AC3F]/15 text-[#F0CE8A] border-[#E0AC3F]/40"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                }`}
                title="Parent Page"
              >
                <Crown size={12} className={isDarkCanvas ? "text-[#E0AC3F] fill-[#E0AC3F]/25 shrink-0" : "text-amber-500 fill-amber-500/25 shrink-0"} />
              </span>
            )}

            {/* Parent Page Breadcrumb link for sub-pages or in-page blocks */}
            {preview.parentPageTitle && (
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-sans font-medium border ${
                isDarkCanvas
                  ? "bg-[#E0AC3F]/10 text-[#F0CE8A] border-[#E0AC3F]/30"
                  : "bg-black/[0.05] dark:bg-white/[0.07] text-[var(--muted)] border-black/[0.08] dark:border-white/12"
              }`}>
                <Crown size={10} className={isDarkCanvas ? "text-[#E0AC3F] shrink-0" : "text-amber-500 shrink-0"} />
                <span className={`truncate max-w-[110px] font-medium ${isDarkCanvas ? "text-[#F0CE8A]" : "text-[var(--text)]"}`}>{preview.parentPageTitle}</span>
              </span>
            )}
          </div>

          <span className={`text-[10px] font-mono shrink-0 ${
            isDarkCanvas ? "text-[#F0CE8A]/80 font-semibold" : "text-[var(--muted)]"
          }`}>
            {isContentSection ? "In-Page Block" : stats?.childCount ? `${stats.childCount} sub-pages` : "Workspace Page"}
          </span>
        </div>

        {/* 2. Title, Status & Clean Content Brief */}
        <div className="relative z-10 mt-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`text-[13px] font-semibold tracking-tight leading-snug ${
              isDarkCanvas ? "text-white" : "text-[var(--text)]"
            }`}>
              {title}
            </h4>
            {metadata?.status && (
              <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-medium font-mono ${
                metadata.status === "Completed"
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : metadata.status === "In Progress"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                  : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
              }`}>
                {metadata.status}
              </span>
            )}
          </div>

          {/* Clean paragraph excerpt / brief directly below title */}
          {(() => {
            const raw = (description || snippet)?.trim();
            const isDup = raw?.toLowerCase() === title?.trim().toLowerCase();
            if (!raw || isDup || previewType === "code" || previewType === "callout" || previewType === "database" || previewType === "ai") {
              return null;
            }
            return (
              <p className={`mt-1.5 text-[11.5px] font-sans leading-relaxed line-clamp-4 break-words whitespace-pre-line ${
                isDarkCanvas ? "text-neutral-300" : "text-neutral-600 dark:text-neutral-300"
              }`}>
                {raw}
              </p>
            );
          })()}

          {/* Progress Bar (if available) */}
          {metadata?.progress !== undefined && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-[var(--muted)] mb-1">
                <span>Progress</span>
                <span>{metadata.progress}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                  style={{ width: `${metadata.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 3. Dynamic Specialized Blocks (if not standard text) */}
        <div className="relative z-10 mt-2">
          {/* IN-PAGE CODE BLOCK PREVIEW */}
          {previewType === "code" && (
            <div className="p-2 rounded-xl bg-black/60 border border-white/8 text-[11px] font-mono text-emerald-300 overflow-hidden line-clamp-4 leading-relaxed">
              <code>{snippet || description}</code>
            </div>
          )}

          {/* IN-PAGE CALLOUT PREVIEW */}
          {previewType === "callout" && (
            <div className="flex items-start gap-2.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[11.5px] leading-relaxed">
              <Lightbulb size={15} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="line-clamp-3 text-neutral-200">{snippet || description}</p>
            </div>
          )}

          {/* IN-PAGE / ROOT TASK PREVIEW */}
          {previewType === "task" && (
            <div className="space-y-2">
              {snippet && (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.04] border border-white/8 text-[12px] text-neutral-200">
                  {metadata?.status === "Completed" ? (
                    <CheckSquare size={14} className="text-emerald-400 shrink-0" />
                  ) : (
                    <Square size={14} className="text-neutral-400 shrink-0" />
                  )}
                  <span className={`truncate ${metadata?.status === "Completed" ? "line-through text-neutral-400" : ""}`}>
                    {snippet}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* SUB-PAGES / CHILD NODES LIST (Compact preview) */}
          {children && children.length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-black/[0.06] dark:border-white/8">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)] block mb-1.5">
                Sub-pages ({children.length})
              </span>
              <div className="space-y-1">
                {children.slice(0, 3).map((child) => (
                  <div
                    key={child.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectPage) onSelectPage(child.id);
                    }}
                    className={`flex items-center justify-between gap-2 px-2 py-1 rounded-lg text-[11px] transition-colors cursor-pointer group/child ${
                      isDarkCanvas
                        ? "bg-white/[0.04] hover:bg-[#E0AC3F]/15 hover:text-[#F0CE8A]"
                        : "bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <PageIcon icon={child.icon} size={11} fallback="📄" />
                      <span className="truncate">{child.title || "Untitled"}</span>
                    </div>
                    <ArrowRight size={11} className="text-[var(--muted)] group-hover/child:translate-x-0.5 shrink-0 transition-transform" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 4. Footer: Last updated & jump hint */}
        <div className={`relative z-10 mt-3 pt-2 flex items-center justify-between text-[9.5px] font-mono border-t ${
          isDarkCanvas
            ? "border-[#E0AC3F]/20 text-[#F0CE8A]/75"
            : "border-black/[0.08] dark:border-white/8 text-[var(--muted)]"
        }`}>
          <span className="flex items-center gap-1">
            <Clock size={10} className={isDarkCanvas ? "text-[#E0AC3F]/70" : "text-[var(--muted)]"} />
            <span>{metadata?.lastUpdated || "Live section"}</span>
          </span>
          <span className={`flex items-center gap-1 ${isDarkCanvas ? "text-[#F0CE8A]" : "text-[var(--muted)]"}`}>
            <span>{isContentSection ? "Jump ↵" : "Open ↵"}</span>
            <CornerDownLeft size={9} />
          </span>
        </div>
      </div>

      {/* Right side connecting bridge if ruler is on right */}
      {side === "right" && (
        <div className="flex items-center shrink-0 -ml-[1px] z-20 pointer-events-none">
          <div className={`w-1.5 h-1.5 rounded-full -mr-0.5 ${
            isDarkCanvas
              ? "bg-[#F0CE8A] ring-2 ring-[#E0AC3F]/50"
              : "bg-indigo-400 ring-2 ring-indigo-500/40"
          }`} />
          <div className={`w-2.5 h-[2px] ${
            isDarkCanvas
              ? "bg-gradient-to-r from-[#E0AC3F] to-amber-500"
              : "bg-gradient-to-r from-indigo-500 to-blue-500"
          }`} />
        </div>
      )}
    </motion.div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(cardContent, document.body);
});
