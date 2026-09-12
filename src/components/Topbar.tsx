import React, { memo, useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  ChevronDown,
  Link2,
  Sparkles,
  Globe,
  FileText,
  LayoutGrid,
  Network,
  Bookmark,
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
import { OptionPicker } from "./ui/quick-option-picker";
import { TbLockFilled } from "react-icons/tb";
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
  onToast?: (msg: string) => void;
}

const asLucideIcon = (icon: unknown) => icon as LucideIcon;

const SPRING_TRANSITION = {
  type: "spring" as const,
  stiffness: 460,
  damping: 32,
  mass: 0.8,
};

const PAGE_MODES = [
  { id: "doc", label: "Document", icon: FileText },
  { id: "canvas", label: "Canvas", icon: LayoutGrid },
  { id: "graph", label: "Graph", icon: Network },
] as const;

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
  onVisibilityChange,
  onToast,
}: TopbarProps) {
  const [visOpen, setVisOpen] = useState(false);
  const [hoveredMode, setHoveredMode] = useState<string | null>(null);
  const visibility = page.visibility || "private";
  const isOwner = !page.sharedRole;
  const sharedViaPerms = usePageIsShared(page?.id ?? null);
  const pageIsShared = isOwner ? (sharedViaPerms || visibility === "public") : true;
  const isPrivate = visibility === "private" && isOwner && !sharedViaPerms;

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
        <OptionPicker
          options={[
            { id: "private", label: "Private", icon: TbLockFilled },
            { id: "public", label: "Public", icon: Globe },
          ]}
          value={visibility === "public" ? "public" : "private"}
          onChange={(newVal) => onVisibilityChange?.(newVal as "private" | "public")}
          disabled={!isOwner}
          size="xs"
          dropdownPlacement="bottom"
        />
      </div>

      <LayoutGroup id="topbar-mode-collab-group">
        {appView === "page" && (
          <motion.div
            layout
            transition={SPRING_TRANSITION}
            className="flex items-center gap-2 mr-3"
          >
            {/* Apple-grade Segmented Mode Switcher */}
            <motion.div
              layout
              transition={SPRING_TRANSITION}
              className="flex items-center gap-0.5 rounded-xl bg-[var(--surface-2)]/60 dark:bg-white/[0.04] p-0.5 border border-black/[0.06] dark:border-white/[0.08] select-none relative h-7 shrink-0 shadow-2xs backdrop-blur-xs"
            >
              {PAGE_MODES.map(({ id, label, icon: Icon }) => {
                const active = pageMode === id;
                return (
                  <motion.button
                    key={id}
                    layout
                    transition={SPRING_TRANSITION}
                    onClick={() => onPageModeChange?.(id)}
                    onMouseEnter={() => setHoveredMode(id)}
                    onMouseLeave={() => setHoveredMode(null)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    className={`relative px-2.5 py-1 text-[11.5px] h-full flex items-center gap-1.5 rounded-lg select-none transition-colors duration-150 outline-none cursor-pointer ${
                      active
                        ? "text-[var(--text)] font-semibold"
                        : "text-[var(--text-secondary)] hover:text-[var(--text)]"
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="topbar-mode-pill"
                        transition={SPRING_TRANSITION}
                        className="absolute inset-0 bg-white dark:bg-[#282724] border border-black/[0.06] dark:border-white/10 rounded-lg z-0 shadow-xs"
                      />
                    )}
                    {!active && hoveredMode === id && (
                      <motion.div
                        layoutId="topbar-mode-hover"
                        transition={SPRING_TRANSITION}
                        className="absolute inset-0 bg-black/[0.04] dark:bg-white/[0.06] rounded-lg z-0"
                      />
                    )}
                    <Icon size={12} className={`relative z-10 shrink-0 transition-opacity duration-150 ${active ? "opacity-90" : "opacity-55"}`} />
                    <span className="relative z-10 tracking-tight">{label}</span>
                  </motion.button>
                );
              })}
            </motion.div>

            {/* Workspace Collaboration Pill */}
            <motion.div
              layout
              transition={SPRING_TRANSITION}
            >
              <WorkspaceJoinBar
                onOpenSettings={() => {}}
                pageId={page?.id ?? null}
                sharedRole={page.sharedRole}
                isPageShared={pageIsShared}
                isPrivate={isPrivate}
                onToast={onToast}
              />
            </motion.div>
          </motion.div>
        )}
      </LayoutGroup>



      <motion.button
        type="button"
        onClick={onShare}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.95 }}
        transition={SPRING_TRANSITION}
        className="flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--hover)] border border-transparent hover:border-[var(--border)] transition-colors shrink-0 cursor-pointer shadow-2xs select-none"
      >
        <AnimatedLock size={13} />
        <span>Share</span>
        <ChevronDown size={11} className="opacity-60" />
      </motion.button>

      <motion.button
        type="button"
        onClick={onCopyLink}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.88 }}
        transition={SPRING_TRANSITION}
        className={`grid h-7 w-7 place-items-center rounded-md transition-colors duration-150 cursor-pointer select-none ${
          visibility === "public"
            ? "text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
            : "text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
        }`}
        title={visibility === "public" ? "Copy public link" : "Copy link (Page is Private)"}
        aria-label={visibility === "public" ? "Copy public link" : "Copy link (Page is Private)"}
      >
        <Link2 size={15} />
      </motion.button>

      <motion.button
        type="button"
        onClick={onFavorite}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.88 }}
        className={`relative grid h-7 w-7 place-items-center rounded-md transition-colors duration-150 cursor-pointer select-none ${
          page.favorite
            ? "text-amber-500 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-400/10 hover:bg-amber-500/15"
            : "text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
        }`}
        title={page.favorite ? "Favorited · Click to remove" : "Add to favorites"}
        aria-label={page.favorite ? "Remove from favorites" : "Add to favorites"}
      >
        <AnimatePresence mode="wait" initial={false}>
          {page.favorite ? (
            <motion.div
              key="favorited"
              initial={{ scale: 0.4, rotate: -20, opacity: 0 }}
              animate={{
                scale: [0.4, 1.35, 0.92, 1.06, 1],
                rotate: [-20, 8, -4, 2, 0],
                opacity: 1,
              }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative flex items-center justify-center"
            >
              <Bookmark
                size={16}
                className="fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400 drop-shadow-[0_2px_8px_rgba(245,158,11,0.45)]"
              />
              <motion.span
                initial={{ scale: 0.2, opacity: 0.8 }}
                animate={{ scale: 2.2, opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="absolute inset-0 rounded-full bg-amber-400/35 pointer-events-none"
              />
            </motion.div>
          ) : (
            <motion.div
              key="unfavorited"
              initial={{ scale: 0.75, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.75, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="flex items-center justify-center"
            >
              <Bookmark size={16} strokeWidth={2} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

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
      <motion.button
        type="button"
        onClick={() => onThemeChange(dark ? "light" : "dark")}
        whileHover={{ scale: 1.1, rotate: 15 }}
        whileTap={{ scale: 0.88, rotate: -25 }}
        transition={SPRING_TRANSITION}
        className="grid h-7 w-7 place-items-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition-colors cursor-pointer select-none"
        title="Toggle theme"
      >
        <AnimatedTheme size={16} active={dark} />
      </motion.button>
    </header>
  );
});


export default Topbar;
