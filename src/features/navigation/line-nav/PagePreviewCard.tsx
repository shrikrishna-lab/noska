import React from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import type { PagePreviewModel } from "./types";
import {
  FileText,
  FolderKanban,
  CheckSquare,
  Square,
  Database,
  Folder,
  Layers,
  FolderTree,
  Crown,
  Sparkles,
  Clock,
  ArrowRight,
  Code2,
  Lightbulb,
  Heading1,
  Heading2,
  Heading3,
  CornerDownLeft
} from "lucide-react";

interface PagePreviewCardProps {
  preview: PagePreviewModel;
  anchorPosition: { top: number; left: number; right: number; height: number };
  side?: "left" | "right";
  onSelectPage?: (pageId: string) => void;
  onJumpToBlock?: (blockId: string) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const PagePreviewCard = React.memo(function PagePreviewCard({
  preview,
  anchorPosition,
  side = "left",
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

  // Render type-specific badge & icon
  const renderHeaderBadge = () => {
    switch (type) {
      case "heading":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-mono font-medium bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <Heading1 size={12} />
            <span>{commandTag || "/h1"} · Heading</span>
          </span>
        );
      case "code":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Code2 size={12} />
            <span>{metadata?.lang ? `/code · ${metadata.lang}` : "/code"}</span>
          </span>
        );
      case "callout":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-mono font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Lightbulb size={12} />
            <span>/callout · Note</span>
          </span>
        );
      case "task":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-mono font-medium bg-orange-500/15 text-orange-400 border border-orange-500/30">
            <CheckSquare size={12} />
            <span>/todo · Task</span>
          </span>
        );
      case "database":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-mono font-medium bg-teal-500/15 text-teal-400 border border-teal-500/30">
            <Database size={12} />
            <span>/database · View</span>
          </span>
        );
      case "ai":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-mono font-medium bg-fuchsia-500/15 text-fuchsia-400 border border-fuchsia-500/30">
            <Sparkles size={12} />
            <span>/ai · Assistant</span>
          </span>
        );
      case "project":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-mono font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <FolderKanban size={12} />
            <span>Project</span>
          </span>
        );
      case "folder":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-mono font-medium bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            <Folder size={12} />
            <span>Folder</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-mono font-medium bg-white/10 text-neutral-300 border border-white/15">
            <FileText size={12} />
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
      onSelectPage?.(preview.pageId);
    }
  };

  const cardContent = (
    <motion.div
      initial={{ opacity: 0, scale: 0.91, x: side === "right" ? 14 : -14, filter: "blur(8px)" }}
      animate={{ opacity: 1, scale: 1, x: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.94, x: side === "right" ? 10 : -10, filter: "blur(6px)" }}
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
          <div className="w-2.5 h-[2px] bg-gradient-to-r from-indigo-500 to-indigo-400" />
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 ring-2 ring-indigo-500/40 -ml-0.5" />
        </div>
      )}

      {/* ─── MAIN PREVIEW CARD CONTAINER ─── */}
      <div className="w-76 sm:w-80 p-3.5 rounded-2xl bg-[#131316]/96 dark:bg-[#0c0c0e]/96 backdrop-blur-3xl border border-white/12 dark:border-white/10 text-white shadow-[0_22px_55px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.06)] cursor-pointer hover:border-white/25 transition-all">
        
        {/* 1. Header: Entity Type Badge + Parent Page Badge + Child / Item Counter */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/8">
          <div className="flex items-center flex-wrap gap-1.5">
            {renderHeaderBadge()}

            {/* Prominent Parent Page Badge with Pagadi Crown Icon */}
            {preview.isParentPage && !isContentSection && (
              <span 
                className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm"
                title="Parent Page"
              >
                <Crown size={12} className="text-amber-400 fill-amber-400/25 shrink-0" />
              </span>
            )}

            {/* Parent Page Breadcrumb link for sub-pages or in-page blocks */}
            {preview.parentPageTitle && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-sans font-medium bg-white/[0.07] text-neutral-300 border border-white/12">
                <Crown size={10} className="text-amber-400/90 shrink-0" />
                <span className="truncate max-w-[110px] text-white font-medium">{preview.parentPageTitle}</span>
              </span>
            )}
          </div>

          <span className="text-[10px] font-mono text-neutral-400 shrink-0">
            {isContentSection ? "In-Page Block" : stats?.childCount ? `${stats.childCount} sub-pages` : "Workspace Page"}
          </span>
        </div>

        {/* 2. Title, Status & Clean Content Brief */}
        <div className="mt-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-[13px] font-semibold text-white tracking-tight leading-snug">
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
              <p className="mt-1.5 text-[11.5px] text-neutral-400 font-sans leading-relaxed line-clamp-4 break-words whitespace-pre-line">
                {raw}
              </p>
            );
          })()}

          {/* Progress Bar (if available) */}
          {metadata?.progress !== undefined && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 mb-1">
                <span>Progress</span>
                <span>{metadata.progress}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                  style={{ width: `${metadata.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 3. Dynamic Specialized Blocks (if not standard text) */}
        <div className="mt-2">
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
                  <span className="line-clamp-2">{snippet}</span>
                </div>
              )}
              {highlights && highlights.length > 0 && !isContentSection && (
                <div className="p-2 rounded-xl bg-black/40 border border-white/6 space-y-1">
                  {highlights.map((h, i) => (
                    <div key={i} className="text-[11px] font-mono text-neutral-300 truncate">{h}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DATABASE PREVIEW */}
          {previewType === "database" && (
            <div className="space-y-1.5">
              <div className="grid grid-cols-3 gap-1 p-1.5 rounded-xl bg-black/50 border border-white/6 text-[10px] text-neutral-400 font-mono">
                <div className="border-b border-white/10 pb-1 font-semibold text-neutral-300">Name</div>
                <div className="border-b border-white/10 pb-1 font-semibold text-neutral-300">Status</div>
                <div className="border-b border-white/10 pb-1 font-semibold text-neutral-300">Tags</div>
                <div className="truncate text-neutral-300">Milestone Alpha</div>
                <div className="truncate text-emerald-400">Done</div>
                <div className="truncate text-indigo-400">Dev</div>
                <div className="truncate text-neutral-300">Q3 Planning</div>
                <div className="truncate text-amber-400">Active</div>
                <div className="truncate text-teal-400">Core</div>
              </div>
            </div>
          )}

          {/* AI WORKSPACE PREVIEW */}
          {previewType === "ai" && (
            <div className="p-2.5 rounded-xl bg-gradient-to-r from-purple-500/15 via-fuchsia-500/10 to-transparent border border-purple-500/30">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-fuchsia-400 mb-1">
                <Sparkles size={13} />
                <span>AI Prompt / Generation</span>
              </div>
              <p className="text-[11.5px] text-neutral-300 leading-relaxed line-clamp-3 font-sans">
                {snippet || description}
              </p>
            </div>
          )}

          {/* ─── PARENT PREVIEW: ALL CHILD SUB-PAGES LIST ─── */}
          {children && children.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-white/8 space-y-1.5">
              <div className="flex items-center justify-between text-[10.5px] font-mono text-neutral-400">
                <span className="flex items-center gap-1.5 font-semibold text-neutral-300">
                  <FolderTree size={12} className="text-indigo-400 shrink-0" />
                  <span>Sub-Pages ({children.length})</span>
                </span>
                <span className="text-[9.5px] text-neutral-500">Click to open</span>
              </div>

              <div className="max-h-44 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                {children.map((child) => (
                  <div
                    key={child.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPage?.(child.id);
                    }}
                    className="group/child flex items-center justify-between text-[11.5px] text-neutral-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-indigo-500/20 hover:border-indigo-500/35 border border-transparent transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[12px] shrink-0 opacity-80">{child.icon || "📄"}</span>
                      <span className="truncate font-medium text-neutral-200 group-hover/child:text-white">
                        {child.title || "Untitled Sub-page"}
                      </span>
                    </div>
                    <ArrowRight size={11} className="text-neutral-500 group-hover/child:text-indigo-400 group-hover/child:translate-x-0.5 shrink-0 transition-transform" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 4. Footer: Last updated & jump hint */}
        <div className="mt-3 pt-2 flex items-center justify-between text-[9.5px] font-mono text-neutral-400/80 border-t border-white/6">
          <span className="flex items-center gap-1">
            <Clock size={10} className="text-neutral-500" />
            <span>{metadata?.lastUpdated || "Live section"}</span>
          </span>
          <span className="flex items-center gap-1 text-neutral-400">
            <span>{isContentSection ? "Jump ↵" : "Open ↵"}</span>
            <CornerDownLeft size={9} />
          </span>
        </div>
      </div>

      {/* Right side connecting bridge if ruler is on right */}
      {side === "right" && (
        <div className="flex items-center shrink-0 -ml-[1px] z-20 pointer-events-none">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 ring-2 ring-indigo-500/40 -mr-0.5" />
          <div className="w-2.5 h-[2px] bg-gradient-to-r from-indigo-400 to-indigo-500" />
        </div>
      )}
    </motion.div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(cardContent, document.body);
});
