import React from "react";
import { motion } from "framer-motion";
import {
  ChevronDown,
  Link2,
  Sparkles,
  type LucideIcon
} from "lucide-react";
import {
  AnimatedMenu,
  AnimatedLock,
  AnimatedBookmark,
  AnimatedSettings,
  AnimatedAI,
  AnimatedUndo,
  AnimatedRedo,
  AnimatedCanvas,
  AnimatedTheme,
  AnimatedSearch
} from "./ui/icons";
import { IconButton, PearlButton } from "./ui";
import WorkspaceJoinBar from "./collab/WorkspaceJoinBar";
import type { Page } from "../lib/supabaseService";

interface TopbarProps {
  page: Page;
  sidebarOpen: boolean;
  saveState: string;
  onSidebar: () => void;
  onShare: () => void;
  onCopyLink: () => void;
  onAI: () => void;
  onFavorite: () => void;
  onMore: () => void;
  onQuickActions?: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  dark: boolean;
  onThemeChange: (theme: string) => void;
  onReadingModeToggle: () => void;
  pageMode?: string;
  onPageModeChange?: (mode: string) => void;
  appView?: string;
  // The following are passed by src/App.tsx but not currently read here —
  // added to the destructure only to document that they're intentionally
  // unused by this component (same dead-prop pattern applied to other
  // still-.jsx components during the TypeScript migration), not a
  // behavior change.
  onExport?: () => void;
  onClipper?: () => void;
  onLineage?: () => void;
  onCollab?: () => void;
  onLockPage?: () => void;
  onRemoveEncryption?: (pageId: string) => void;
}

// IconButton (src/components/ui/index.tsx) types its `icon` prop as
// lucide-react's `LucideIcon` (a ForwardRefExoticComponent), but several
// calls below pass this codebase's custom AnimatedX icon components
// (AnimatedMenu, AnimatedBookmark, etc.) which share the same size/
// className prop shape but aren't LucideIcon instances — same mismatch
// already documented/cast for in src/components/PageTree.tsx. Casting via
// this helper rather than widening IconButton's exported prop type, which
// is out of scope for this migration pass.
const asLucideIcon = (icon: unknown) => icon as LucideIcon;

export default function Topbar({
  page,
  sidebarOpen,
  saveState,
  onSidebar,
  onShare,
  onCopyLink,
  onAI,
  onFavorite,
  onMore,
  onQuickActions,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  dark,
  onThemeChange,
  onReadingModeToggle,
  pageMode = "doc",
  onPageModeChange,
  appView = "page",
  onExport,
  onClipper,
  onLineage,
  onCollab,
  onLockPage,
  onRemoveEncryption
}: TopbarProps) {

  return (
    <header className="flex h-11 shrink-0 items-center gap-1 border-b border-[var(--border)] bg-[var(--bg)] px-3">
      {!sidebarOpen && <IconButton icon={asLucideIcon(AnimatedMenu)} label="Open sidebar" onClick={onSidebar} />}
      <div className="flex min-w-0 flex-1 items-center gap-2 text-[13px] text-[var(--text-secondary)]">
        <span>{page.icon}</span>
        <span className="truncate text-[var(--text)]">{page.title || "Untitled"}</span>
        <span className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
          <AnimatedLock size={10} />
          Private
        </span>
      </div>

      {appView === "page" && (
        <div className="flex items-center gap-0.5 rounded-lg bg-[var(--hover)] p-0.5 border border-[var(--border)] mr-3 select-none relative h-7 shrink-0">
          {["doc", "canvas", "graph"].map((mode) => {
            const label = mode === "doc" ? "Document" : mode === "canvas" ? "Canvas" : "Graph";
            const active = pageMode === mode;
            return (
              <button
                key={mode}
                onClick={() => onPageModeChange?.(mode)}
                className={`px-3 py-1 text-[11px] h-full flex items-center rounded-md relative z-10 transition-colors duration-150 outline-none ${
                  active ? "text-[var(--text)] font-semibold" : "text-[var(--text-secondary)] hover:text-[var(--text)]"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="topbar-mode-pill"
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                    className="absolute inset-0 bg-[var(--surface-2)] border border-[var(--border-hover)] rounded-md z-0 shadow-sm"
                  />
                )}
                <span className="relative z-10">{label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Workspace Collaboration — real, only when joined */}
      {appView === "page" && (
        <div className="mr-2">
          <WorkspaceJoinBar onOpenSettings={() => {}} />
        </div>
      )}

      <span className="mr-1 text-xs text-[var(--text-muted)] shrink-0">✓ {saveState}</span>
      <button
        onClick={onShare}
        className="flex h-7 items-center gap-1 rounded-md px-2 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--hover)] shrink-0"
      >
        <AnimatedLock size={14} />
        Share
        <ChevronDown size={12} />
      </button>
      <IconButton icon={Link2} label="Copy link" onClick={onCopyLink} />
      <IconButton icon={asLucideIcon(AnimatedBookmark)} label="Favorite" onClick={onFavorite} />

      <PearlButton
        onClick={onAI}
        label="New AI chat"
        icon1={<Sparkles size={13} className="text-[var(--accent)]" />}
        icon2={<Sparkles size={13} className="text-[var(--accent)] fill-[var(--accent)]" />}
        background="var(--panel)"
        textColor="var(--text)"
        className="mx-1"
      />
      <IconButton icon={asLucideIcon(AnimatedSettings)} label="Settings" onClick={onMore} />
      <IconButton icon={asLucideIcon(AnimatedUndo)} label="Undo" disabled={!canUndo} onClick={onUndo} />
      <IconButton icon={asLucideIcon(AnimatedRedo)} label="Redo" disabled={!canRedo} onClick={onRedo} />
      <IconButton icon={asLucideIcon(AnimatedCanvas)} label="Reading Mode" onClick={onReadingModeToggle} />
      <button
        onClick={() => onThemeChange(dark ? "light" : "dark")}
        className="grid h-7 w-7 place-items-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition duration-200"
        title="Toggle theme"
      >
        <AnimatedTheme size={16} active={dark} />
      </button>
    </header>
  );
}
