import React, { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Link2,
  Sparkles,
  Globe,
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
import { PageIcon } from "./PageIcon";
import { usePageIsShared } from "../features/collab/hooks";

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
  onExport?: () => void;
  onClipper?: () => void;
  onLineage?: () => void;
  onCollab?: () => void;
  onLockPage?: () => void;
  onRemoveEncryption?: (pageId: string) => void;
  onVisibilityChange?: (visibility: "private" | "team" | "company" | "public") => void;
}

const asLucideIcon = (icon: unknown) => icon as LucideIcon;

const Topbar = memo(function Topbar({
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
  onRemoveEncryption,
  onVisibilityChange
}: TopbarProps) {
  // Click-to-set page visibility: the Private/Public badge opens a picker.
  // Only the owner can change it (shared-page viewers see the state but
  // can't flip it).
  const [visOpen, setVisOpen] = useState(false);
  const visibility = page.visibility || "private";
  const isOwner = !page.sharedRole;
  // Context for the Collab pill: shared pages (owner-invited or public) get
  // live state; invitees get an access-level pill instead.
  const sharedViaPerms = usePageIsShared(page?.id ?? null);
  const pageIsShared = isOwner ? (sharedViaPerms || visibility === "public") : true;

  const VIS_OPTIONS: { value: "private" | "public"; label: string; description: string; Icon: LucideIcon }[] = [
    { value: "private", label: "Private", description: "Only you and people you invite", Icon: AnimatedLock as unknown as LucideIcon },
    { value: "public", label: "Public", description: "Anyone in this workspace can open and view it", Icon: Globe },
  ];
  const CurrentVisIcon = visibility === "public" ? Globe : (AnimatedLock as unknown as React.FC<{ size?: number }>);

  return (
    <header className="flex h-11 shrink-0 items-center gap-1 border-b border-[var(--border)] bg-[var(--bg)] px-3">
      <div className="flex min-w-0 flex-1 items-center gap-2 text-[13px] text-[var(--text-secondary)]">
        <PageIcon icon={page.icon} size={15} fallback={<span className="text-[13px] leading-none">📄</span>} />
        <span className="truncate text-[var(--text)] font-medium">{page.title || "Untitled"}</span>
        <div className="relative">
          <button
            onClick={() => isOwner && setVisOpen((v) => !v)}
            disabled={!isOwner}
            title={isOwner ? "Change page visibility" : "Only the page owner can change visibility"}
            className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] transition-colors ${
              isOwner
                ? "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] cursor-pointer"
                : "text-[var(--text-muted)] cursor-default"
            }`}
          >
            <CurrentVisIcon size={10} />
            {visibility === "public" ? "Public" : "Private"}
            {isOwner && <ChevronDown size={9} className={`transition-transform ${visOpen ? "rotate-180" : ""}`} />}
          </button>

          <AnimatePresence>
            {visOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setVisOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  className="absolute top-full left-0 mt-1.5 z-50 w-[240px] bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden"
                >
                  <div className="px-2.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                    Page visibility
                  </div>
                  <div className="p-1">
                    {VIS_OPTIONS.map(({ value, label, description, Icon }) => {
                      const active = visibility === value || (value === "private" && visibility !== "public");
                      return (
                        <button
                          key={value}
                          onClick={() => {
                            onVisibilityChange?.(value);
                            setVisOpen(false);
                          }}
                          className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[var(--hover)] transition-colors cursor-pointer text-left"
                        >
                          <Icon size={14} className="text-[var(--muted)] mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-[12px] font-medium text-[var(--text)]">{label}</div>
                            <div className="text-[10px] text-[var(--muted)] leading-tight mt-0.5">{description}</div>
                          </div>
                          {active && <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-1.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="border-t border-[var(--border)] px-2.5 py-1.5 text-[10px] text-[var(--muted)]">
                    To share with specific people, use the Share button or the Collab panel.
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
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

      {/* Workspace Collaboration — role-aware: owner shows shared/live
          state, invitees see their access level */}
      {appView === "page" && (
        <div className="mr-2">
          <WorkspaceJoinBar
            onOpenSettings={() => {}}
            pageId={page?.id ?? null}
            sharedRole={page.sharedRole}
            isPageShared={pageIsShared}
          />
        </div>
      )}

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
        label="AI"
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
});

export default Topbar;
