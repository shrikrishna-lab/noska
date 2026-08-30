import React, { useState, useRef, useEffect, memo } from "react";
import type { ReactNode, ComponentType } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING_PRESETS, StaggerContainer, StaggerItem } from "../features/motion/MotionSystem";
import {
  ChevronDown,
  ChevronRight,
  Brain,
  Terminal,
  Star,
  Users,
  X,
  PanelLeftClose,
  Sun,
  Moon,
  Monitor,
  Settings,
  UserRound,
  type LucideIcon
} from "lucide-react";
import {
  AnimatedSidebar,
  AnimatedBack,
  AnimatedForward,
  AnimatedCanvas,
  AnimatedPlus,
  AnimatedSearch,
  AnimatedFolder,
  AnimatedAI,
  AnimatedHistory,
  AnimatedBell,
  AnimatedVoice,
  AnimatedCheck,
  AnimatedSparkle,
  AnimatedBookmark,
  AnimatedTrash,
  AnimatedSend,
  AnimatedUpload,
  AnimatedDownload
} from "./ui/icons";
import { IconButton, FloatingMenu, useOutsideDismiss } from "./ui";
import { timeAgo, plainText, emojis } from "../utils/helpers";
import PageTree from "./PageTree";
import { selectOptionsFromEvent } from "./PageTree";
import type { PageSelectOptions } from "./PageTree";
import { PageIcon } from "./PageIcon";

import type { Page } from "../lib/supabaseService";
import TeamSwitcher from "./teams/TeamSwitcher";

// IconButton (src/components/ui/index.tsx) types its `icon` prop as
// lucide-react's `LucideIcon`, but several calls below pass this
// codebase's custom AnimatedX icon components (AnimatedBack,
// AnimatedForward, etc.) which share the same size/className prop shape
// but aren't LucideIcon instances — same mismatch already documented/cast
// for in src/components/Topbar.tsx and src/components/PageTree.tsx.
// Casting via this helper rather than widening IconButton's exported prop
// type, which is out of scope for this migration pass.
const asLucideIcon = (icon: unknown) => icon as LucideIcon;

// `icon` here is used interchangeably with real LucideIcon components
// (Star, Brain, Terminal) and this codebase's custom AnimatedX icon
// components (AnimatedFolder, AnimatedAI, etc.), plus a handful of
// call sites that pass an inline zero-prop-typed function component
// (e.g. the favorites list's `(props) => <Star {...props} .../>`) — same
// mixed-icon-set pattern documented in src/components/PageTree.tsx's
// MenuActionIcon and src/components/editor/ImageBlock.tsx's renderTabIcon.
type NavIcon = LucideIcon | ComponentType<{ size?: number; className?: string }>;

interface RealtimeCollabLike {
  getUser?: () => { userName?: string; userId?: string; userAvatar?: string } | undefined;
}

interface SidebarProps {
  open: boolean;
  pages: Page[];
  trashCount: number;
  activeId: string | null;
  workspaceName: string;
  setWorkspaceName: (name: string) => void;
  onToggle: () => void;
  onSelect: (pageId: string, options?: PageSelectOptions) => void;
  onNew: (template?: string) => void;
  onSearch: () => void;
  onTrash: () => void;
  onSettings: (tab?: string) => void;
  onProfile?: () => void;
  onAI: () => void;
  onAIFull: () => void;
  onHelp: () => void;
  onView: (view: string, options?: PageSelectOptions) => void;
  onPrev: () => void;
  onNext: () => void;
  onPatchPage: (pageId: string, patch: Partial<Page>) => void;
  onMovePage?: (pageId: string, newParentId: string | null, orderedSiblingIds: string[]) => void;
  onDuplicatePage?: (pageId: string) => void;
  onAddInside?: (pageId: string) => void;
  onRenamePage?: (pageId: string) => void;
  onRemoveFromRecents: (pageId: string) => void;
  onToggleOffline?: (pageId: string) => void;
  onCopyLink?: (pageId: string) => void;
  onTrashPage?: (pageId: string) => void;
  collapsedPages: Set<string>;
  onToggleCollapse?: (pageId: string) => void;
  onReview: () => void;
  onAPI: () => void;
  theme: string;
  onThemeChange: (theme: string) => void;
  appView: string;
  onShare?: () => void;
  onToast?: (message: string) => void;
  onLogout?: () => void;
  /** Real pending page-invite count — shown as a badge on the Inbox nav
   * item so unresponded invites are actually visible without opening it. */
  pendingInvitesCount?: number;
  /** Real signed-in identity (App.tsx's currentUsername/currentUserId,
   * sourced from the actual Supabase auth session) — used by the account
   * popover instead of the fake multi-account list that used to live here.
   * Falls back to window.realtimeCollab's cached user when absent (e.g.
   * TEST_MODE, or before the profile fetch resolves). */
  currentUsername?: string | null;
  currentUserEmail?: string | null;
  currentUserAvatar?: string | null;
}

const Sidebar = memo(function Sidebar({
  open,
  pages,
  trashCount,
  pendingInvitesCount = 0,
  activeId,
  workspaceName,
  setWorkspaceName,
  onToggle,
  onSelect,
  onNew,
  onSearch,
  onTrash,
  onSettings,
  onProfile,
  onAI,
  onAIFull,
  onHelp,
  onView,
  onPrev,
  onNext,
  onPatchPage,
  onMovePage,
  onDuplicatePage,
  onAddInside,
  onRenamePage,
  onRemoveFromRecents,
  onToggleOffline,
  onCopyLink,
  onTrashPage,
  collapsedPages,
  onToggleCollapse,
  onReview,
  onAPI,
  theme,
  onThemeChange,
  appView,
  onShare,
  onToast,
  onLogout,
  currentUsername,
  currentUserEmail,
  currentUserAvatar
}: SidebarProps) {
  const recents = [...pages]
    .filter((p) => !p.hiddenFromRecents)
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
    .slice(0, 5);

  // Real display identity, sourced from App.tsx's actual signed-in state
  // (currentUsername/currentUserEmail, backed by the real Supabase auth
  // session and user_profiles row) with a fallback to realtimeCollab's
  // cached user for TEST_MODE / pre-fetch moments.
  const collabUser = (window.realtimeCollab as RealtimeCollabLike | undefined)?.getUser?.();
  const displayName = currentUsername ? `@${currentUsername}` : (collabUser?.userName || 'Workspace User');
  const displayEmail = currentUserEmail || collabUser?.userId || 'user@workspace';
  const displayAvatar = currentUserAvatar || collabUser?.userAvatar || '👤';

  const isAvatarUrl = typeof displayAvatar === "string" && (displayAvatar.startsWith("http://") || displayAvatar.startsWith("https://") || displayAvatar.startsWith("data:") || displayAvatar.startsWith("blob:"));

  const [switcherOpen, setSwitcherOpen] = useState(false);

  // Click-outside references
  const switcherRef = useRef<HTMLButtonElement>(null);
  const userRef = useRef<HTMLButtonElement>(null);
  const switcherMenuRef = useOutsideDismiss<HTMLDivElement>(switcherOpen, () => setSwitcherOpen(false));

  // Anchor coordinate state for the account-switcher popover. Uses either
  // `top` (opened from the header button, popover grows downward) or
  // `bottom` (opened from the bottom user button, popover grows upward) —
  // real bug fix carried over from the previous version: the old
  // bottom-button handler hardcoded `top: r.top - 420`, assuming the
  // popover was always exactly 420px tall. Anchoring from `bottom` lets
  // the popover size itself naturally regardless of content length.
  const [switcherCoords, setSwitcherCoords] = useState<{ top?: number; bottom?: number; left: number }>({ top: 0, left: 0 });

  // Escape key closes the switcher popover.
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSwitcherOpen(false);
    };
    window.addEventListener("keydown", handleGlobalKeys);
    return () => window.removeEventListener("keydown", handleGlobalKeys);
  }, []);

  const themeOptions: Array<{ value: string; label: string; icon: LucideIcon }> = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor }
  ];

  return (
    <motion.aside
      initial={false}
      animate={{
        width: open ? 240 : 0,
        opacity: open ? 1 : 0
      }}
      transition={SPRING_PRESETS.soft}
      className="flex h-full shrink-0 flex-col bg-[var(--sidebar)] border-r border-[var(--border)] text-[var(--text)] overflow-hidden"
    >
      <div style={{ width: 240 }} className="flex h-full flex-col">
        
        {/* Workspace Title Header (Unified Selector) */}
        <div className="flex h-14 items-center justify-between gap-1 px-3 border-b border-[var(--border)] select-none shrink-0 bg-[var(--sidebar)]">
          <button
            ref={switcherRef}
            onClick={() => {
              if (switcherRef.current) {
                const r = switcherRef.current.getBoundingClientRect();
                setSwitcherCoords({ top: r.bottom + 6, bottom: undefined, left: r.left });
              }
              setSwitcherOpen(o => !o);
            }}
            className="flex-grow min-w-0 flex items-center gap-2.5 px-2 py-1 rounded-lg hover:bg-[var(--hover)] transition duration-150 outline-none cursor-pointer text-left focus-visible:ring-1 focus-visible:ring-[var(--noska-blue)]"
            title="Account & workspace"
          >
            {/* Framer-style Icon Box */}
            <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center p-1.5 shrink-0 shadow-[inset_0_1px_0_var(--glass-highlight)]">
              <img src="/logo.png" className="w-full h-full object-contain pointer-events-none" alt="Noska Logo" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[var(--text)] text-[13.5px] truncate leading-tight tracking-wide">{workspaceName}</div>
              <div className="text-[10px] text-[var(--text-secondary)] font-medium leading-none mt-0.5">Noska Workspace</div>
            </div>
            <ChevronDown size={11} className="text-[var(--muted)] shrink-0 ml-1" />
          </button>

          {/* Hide sidebar. */}
          <button
            onClick={onToggle}
            className="w-8 h-8 rounded-lg hover:bg-[var(--hover)] text-[var(--text-secondary)] hover:text-[var(--text)] transition duration-150 outline-none flex items-center justify-center cursor-pointer shrink-0 focus-visible:ring-1 focus-visible:ring-[var(--noska-blue)]"
            title="Hide sidebar (Ctrl+\)"
          >
            <PanelLeftClose size={15} />
          </button>
        </div>

        {/* Account switcher popover */}
        {createPortal(
          <AnimatePresence>
            {switcherOpen && (
              <motion.div
                ref={switcherMenuRef}
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                style={{ top: switcherCoords.top, bottom: switcherCoords.bottom, left: switcherCoords.left }}
                className="fixed z-[100] w-[266px] rounded-xl border border-[var(--border)] bg-[var(--surface-1)] backdrop-blur-xl p-3 shadow-2xl text-[12px] outline-none select-none flex flex-col gap-2"
              >
                {/* Signed-in account */}
                <div className="flex items-center gap-2.5 px-1">
                  <div className="h-8.5 w-8.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-sm shadow-inner select-none shrink-0 text-[var(--text)] overflow-hidden">
                    {isAvatarUrl ? (
                      <img src={displayAvatar} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <span>{displayAvatar || "👤"}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[var(--text)] truncate leading-none text-[12.5px]">{displayName}</div>
                    <div className="text-[9.5px] text-[var(--text-secondary)] truncate mt-1">{displayEmail}</div>
                  </div>
                  <button
                    onClick={async () => {
                      if (await window.noskaConfirm?.("Are you sure you want to log out?")) onLogout?.();
                      setSwitcherOpen(false);
                    }}
                    className="h-6.5 w-6.5 rounded-md hover:bg-[var(--danger)]/10 text-[var(--muted)] hover:text-[var(--danger)] grid place-items-center transition duration-150 cursor-pointer outline-none focus:ring-1 focus:ring-[var(--danger)] shrink-0"
                    title="Log out"
                  >
                    <X size={13} />
                  </button>
                </div>

                <div className="h-px bg-[var(--hover)] my-0.5" />

                {/* Profile — self-service profile editor (fully optional,
                    only reachable inside the authenticated workspace). */}
                <button
                  onClick={() => { setSwitcherOpen(false); onProfile?.(); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--hover)] transition duration-150 cursor-pointer outline-none focus:ring-1 focus:ring-[var(--noska-blue)]"
                >
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-[var(--noska-blue)] to-[var(--noska-blue-light)]/70 flex items-center justify-center text-white shadow-sm shrink-0">
                    <UserRound size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[var(--text)] text-[11.5px] leading-none">My Profile</div>
                    <div className="text-[9px] text-[var(--muted)] mt-0.5 truncate">Edit name, photo, bio & location</div>
                  </div>
                </button>

                <div className="h-px bg-[var(--hover)] my-0.5" />

                {/* Workspace — the one real, persisted workspace concept
                    in the app (App.tsx's workspaceName state /
                    user_profiles.workspace_name). Real bug fix: this used
                    to be a fake "workspace list" simulating multiple
                    workspaces that didn't exist in the data model —
                    replaced with a direct rename action on the single
                    real workspace, plus real Settings/Share shortcuts. */}
                <div className="flex items-center gap-2.5 px-1">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-[var(--noska-blue)] to-[var(--noska-blue-light)] flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0">
                    {workspaceName.charAt(0)}
                  </div>
                  <button
                    onClick={async () => {
                      const name = await window.noskaPrompt?.("Rename workspace:", workspaceName, "Workspace Name");
                      if (name && name.trim()) setWorkspaceName(name.trim());
                    }}
                    className="flex-1 min-w-0 text-left rounded-md hover:bg-[var(--hover)] px-1 py-0.5 -mx-1 transition cursor-pointer outline-none focus:ring-1 focus:ring-[var(--noska-blue)]"
                    title="Rename workspace"
                  >
                    <div className="font-bold text-[var(--text)] truncate leading-none text-[11.5px]">{workspaceName}</div>
                    <div className="text-[9px] text-[var(--muted)] truncate mt-0.5">Click to rename</div>
                  </button>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => { setSwitcherOpen(false); onSettings(); }}
                      className="h-6.5 w-6.5 rounded-md hover:bg-[var(--hover)] text-[var(--text-secondary)] hover:text-[var(--text)] grid place-items-center transition duration-150 cursor-pointer outline-none focus:ring-1 focus:ring-[var(--noska-blue)]"
                      title="Workspace settings"
                    >
                      <Settings size={13} />
                    </button>
                    <button
                      onClick={() => { setSwitcherOpen(false); onShare?.(); }}
                      className="h-6.5 w-6.5 rounded-md hover:bg-[var(--hover)] text-[var(--text-secondary)] hover:text-[var(--text)] grid place-items-center transition duration-150 cursor-pointer outline-none focus:ring-1 focus:ring-[var(--noska-blue)]"
                      title="Invite members / share"
                    >
                      <Users size={13} />
                    </button>
                  </div>
                </div>

                <div className="h-px bg-[var(--hover)] my-0.5" />

                {/* Theme — real, previously-dead props (`theme`/
                    `onThemeChange` were passed into Sidebar but never
                    read anywhere in the component). Now genuinely wired
                    to App.tsx's setThemeWithTransition. */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider">Theme</span>
                  <div className="flex items-center gap-0.5 rounded-lg bg-[var(--surface-3)] p-0.5">
                    {themeOptions.map(({ value, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => onThemeChange(value)}
                        className={`h-6 w-6 grid place-items-center rounded-md transition cursor-pointer outline-none focus:ring-1 focus:ring-[var(--noska-blue)] ${
                          theme === value ? "bg-[var(--surface-1)] text-[var(--text)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--text)]"
                        }`}
                        title={value.charAt(0).toUpperCase() + value.slice(1)}
                      >
                        <Icon size={12} />
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

        {/* Search Bar - Framer Layout */}
        <div className="px-3 pt-3 pb-2 select-none shrink-0 bg-[var(--sidebar)]">
          <button
            onClick={onSearch}
            className="flex h-[34px] w-full items-center gap-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] px-3 text-left hover:bg-[var(--hover)] hover:border-[var(--border)] transition duration-150 outline-none cursor-pointer group focus-visible:ring-1 focus-visible:ring-[var(--noska-blue)]"
          >
            <AnimatedSearch size={13} className="text-[var(--text-secondary)] group-hover:text-[var(--text)] shrink-0" />
            <span className="flex-1 text-[12.5px] text-[var(--text-secondary)] group-hover:text-[var(--text)] font-medium leading-none">Search workspace...</span>
            <kbd className="text-[9px] text-[var(--muted)] font-mono bg-[var(--surface-1)] border border-[var(--border)] px-1 py-0.5 rounded leading-none shrink-0 uppercase">Ctrl+K</kbd>
          </button>
        </div>

        {/* Scrollable Sidebar Content */}
        <div className="flex-1 overflow-y-auto pb-2 scroll-smooth overscroll-contain transition-all duration-150 scrollbar-thin scrollbar-thumb-[var(--border)] hover:scrollbar-thumb-[var(--muted)]/40 fade-edges-y">
          {/* 1. Core Workspace Links */}
          <NoskaSection title="Workspace" defaultExpanded={true}>
            <NoskaNavItem icon={AnimatedFolder} label="Home" active={appView === "home"} onClick={(e) => onView("home", selectOptionsFromEvent(e))} />
            <NoskaNavItem icon={AnimatedAI} label="AI Workspace" active={false} onClick={onAIFull} />
            <NoskaNavItem icon={AnimatedHistory} label="Calendar" active={appView === "calendar"} onClick={(e) => onView("calendar", selectOptionsFromEvent(e))} />
            <NoskaNavItem icon={AnimatedBell} label="Inbox" active={appView === "inbox"} onClick={(e) => onView("inbox", selectOptionsFromEvent(e))} badge={pendingInvitesCount} />
          </NoskaSection>

          {/* 2. Starred Favorites */}
          <NoskaSection title="Favorites" defaultExpanded={true}>
            {pages.filter(p => p.favorite && !p.trashed).length === 0 ? (
              <div className="text-[10px] text-[var(--muted)] px-3.5 py-1.5 italic">Starred pages appear here</div>
            ) : (
              pages.filter(p => p.favorite && !p.trashed).map(p => (
                <NoskaNavItem key={p.id} icon={(props) => <Star {...props} size={11} className="fill-[var(--warning)] text-[var(--warning)]" />} label={p.title || "Untitled"} onClick={(e) => onSelect(p.id, selectOptionsFromEvent(e))} active={p.id === activeId} compact={true} />
              ))
            )}
          </NoskaSection>

          {/* 3. Recently Edited */}
          <NoskaSection title="Recents" defaultExpanded={true}>
            {recents.length === 0 ? (
              <div className="text-[10px] text-[var(--muted)] px-3.5 py-1.5 italic">No recently edited pages</div>
            ) : (
              <StaggerContainer className="space-y-0.5">
                {recents.map((p) => (
                  <StaggerItem key={p.id}>
                    <RecentsPageItem
                      page={p}
                      active={p.id === activeId}
                      onSelect={onSelect}
                      onRemove={onRemoveFromRecents}
                    />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
          </NoskaSection>

          {/* 4. AI & Agents */}
          <NoskaSection title="Intelligence" defaultExpanded={false}>
            <NoskaNavItem icon={AnimatedSparkle} label="Command Center" onClick={(e) => onView("commandCenter", selectOptionsFromEvent(e))} active={appView === "commandCenter"} />
            <NoskaNavItem icon={AnimatedSparkle} label="Agents" onClick={(e) => onView("agents", selectOptionsFromEvent(e))} active={appView === "agents"} />
            <NoskaNavItem icon={AnimatedVoice} label="Automations" onClick={(e) => onView("automations", selectOptionsFromEvent(e))} active={appView === "automations"} />
            <NoskaNavItem icon={AnimatedVoice} label="AI Meeting Capture" onClick={(e) => onView("meetingNote", selectOptionsFromEvent(e))} active={appView === "meetingNote"} />
            <NoskaNavItem icon={AnimatedPlus} label="Deploy New Agent" onClick={onAI} />
          </NoskaSection>

          {/* 5. Marketplace */}
          <NoskaSection title="Marketplace" defaultExpanded={false}>
            <NoskaNavItem icon={AnimatedSparkle} label="Browse Templates" onClick={(e) => onView("marketplace", selectOptionsFromEvent(e))} active={appView === "marketplace"} />
            <NoskaNavItem icon={AnimatedUpload} label="Creator Studio" onClick={(e) => onView("creator", selectOptionsFromEvent(e))} active={appView === "creator"} />
            <NoskaNavItem icon={AnimatedBookmark} label="Agent Directory" onClick={(e) => onView("agents", selectOptionsFromEvent(e))} active={appView === "agents"} />
          </NoskaSection>

          {/* 6. Page Tree Documents */}
          <NoskaSection title="Private Documents" defaultExpanded={true}>
            <PageTree
              content={pages.filter(p => !p.parentId).map(p => p.id)}
              allBlocks={pages}
              activeId={activeId}
              collapsedPages={collapsedPages}
              onToggleCollapse={onToggleCollapse}
              onSelect={onSelect}
              onPatchPage={onPatchPage}
              onMovePage={onMovePage}
              onDuplicatePage={onDuplicatePage}
              onAddInside={onAddInside}
              onRenamePage={onRenamePage}
              onRemoveFromRecents={onRemoveFromRecents}
              onToggleOffline={onToggleOffline}
              onCopyLink={onCopyLink}
              onTrashPage={onTrashPage}
              onToast={onToast}
            />
            <NoskaNavItem icon={AnimatedPlus} label="Add new document" onClick={() => onNew("blank")} muted compact />
          </NoskaSection>

          {/* 6. Teams */}
          <NoskaSection title="Teams" defaultExpanded={true}>
            <div className="px-2 py-1">
              <TeamSwitcher workspaceName={workspaceName} onView={onView} />
            </div>
          </NoskaSection>

          {/* 7. Collaboration Space */}
          <NoskaSection title="Shared Space" defaultExpanded={false}>
            <NoskaNavItem icon={AnimatedPlus} label="Start collaboration" onClick={(e) => onView("shared", selectOptionsFromEvent(e))} active={appView === "shared"} muted compact />
          </NoskaSection>

          {/* 9. Spaced Recall & Console */}
          <NoskaSection title="Tools" defaultExpanded={false}>
            <NoskaNavItem icon={Brain} label="Spaced Repetition" onClick={onReview} />
            <NoskaNavItem icon={Terminal} label="API Console" onClick={onAPI} />
          </NoskaSection>

          {/* 10. Support & Document Actions */}
          <NoskaSection title="Support" defaultExpanded={false}>
            <NoskaNavItem icon={AnimatedBookmark} label="Help Center" onClick={onHelp} />
            <NoskaNavItem icon={AnimatedTrash} label={`Trash${trashCount ? ` (${trashCount})` : ""}`} ariaLabel="Open trash" onClick={onTrash} />
          </NoskaSection>
        </div>

        {/* Footer Area with Toolbar Navigation & Primary Button */}
        <div className="space-y-2.5 border-t border-[var(--border)] px-3 py-3.5 bg-[var(--sidebar)] shrink-0">
          
          {/* Navigation Toolbar */}
          <div className="flex items-center justify-between gap-1 select-none">
            <IconButton icon={asLucideIcon(AnimatedSidebar)} label="Toggle sidebar" tone="dark" onClick={onToggle} />
            <IconButton icon={asLucideIcon(AnimatedBack)} label="Back" tone="dark" onClick={onPrev} />
            <IconButton icon={asLucideIcon(AnimatedForward)} label="Forward" tone="dark" onClick={onNext} />
            <IconButton icon={asLucideIcon(AnimatedCanvas)} label="Tabs" tone="dark" onClick={() => onView("library")} />
            <IconButton icon={asLucideIcon(AnimatedPlus)} label="New tab" tone="dark" onClick={() => onNew("blank")} />
          </div>

          <div className="h-px bg-[var(--border)] my-1" />
          
          {/* Library and Tasks Footers */}
          <div className="flex flex-col space-y-0.5">
            <NoskaNavItem icon={AnimatedCanvas} label="Library" onClick={(e) => onView("library", selectOptionsFromEvent(e))} active={appView === "library"} compact />
            <NoskaNavItem icon={AnimatedCheck} label="My Tasks" onClick={(e) => onView("tasks", selectOptionsFromEvent(e))} active={appView === "tasks"} compact />
          </div>

          {/* Premium "New Creation" Action Button */}
          <button
            onClick={() => onNew("blank")}
            className="flex h-[32px] w-full items-center gap-1.5 rounded-lg bg-[var(--accent)] hover:opacity-90 text-white border border-[var(--border)] px-2.5 text-left text-[11.5px] hover:-translate-y-px hover:shadow-md active:scale-[0.98] transition-all duration-150 shadow-sm outline-none focus:ring-2 focus:ring-[var(--noska-blue)] cursor-pointer font-semibold"
          >
            <AnimatedPlus size={11} className="shrink-0 text-white" />
            <span className="flex-1 text-white font-medium truncate">New Creation</span>
            <kbd className="text-[8.5px] text-white font-mono bg-black/20 dark:bg-white/20 px-1.5 py-0.5 rounded leading-none shrink-0 border border-white/20 tracking-wider uppercase select-none">Ctrl+P</kbd>
          </button>
        </div>
      </div>

      {/* User Avatar & Name - Bottom of Sidebar */}
      <div className="shrink-0 border-t border-[var(--border)] px-2 py-2">
        <button
          ref={userRef}
          onClick={() => {
            if (userRef.current) {
              const r = userRef.current.getBoundingClientRect();
              setSwitcherCoords({ bottom: window.innerHeight - r.top + 6, left: r.left });
            }
            setSwitcherOpen(o => !o);
          }}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--hover)] transition text-left"
        >
          <div className="h-7 w-7 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-xs text-[var(--text)] shrink-0 overflow-hidden">
            {isAvatarUrl ? (
              <img src={displayAvatar} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span>{displayAvatar || "👤"}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-[var(--text)] truncate leading-none">{displayName}</div>
            <div className="text-[9px] text-[var(--muted)] truncate mt-0.5">{displayEmail}</div>
          </div>
          <ChevronDown size={12} className="text-[var(--muted)] shrink-0" />
        </button>
      </div>
    </motion.aside>
  );
});

interface RecentsPageItemProps {
  page: Page;
  active: boolean;
  onSelect: (pageId: string, options?: PageSelectOptions) => void;
  onRemove: (pageId: string) => void;
}

function RecentsPageItem({ page, active, onSelect, onRemove }: RecentsPageItemProps) {
  const wordCount = page.blocks ? page.blocks.reduce((acc, b) => acc + (b.text ? b.text.split(/\s+/).filter(Boolean).length : 0), 0) : 0;
  return (
    <div className={`group relative flex min-h-[26px] items-center rounded-lg transition-all duration-150 text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]`}>
      {active && (
        <motion.div
          layoutId="sidebar-active-bg"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="absolute inset-0 bg-[var(--active)] border border-[var(--border)] shadow-sm rounded-lg z-0"
        />
      )}
      <button
        onClick={(e) => onSelect(page.id, selectOptionsFromEvent(e))}
        onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); onSelect(page.id, selectOptionsFromEvent(e)); } }}
        className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-1 text-left z-10 outline-none cursor-pointer"
      >
        <PageIcon icon={page.icon} size={14} fallback={<span className="text-[12px] leading-none">📄</span>} />
        <div className="min-w-0 flex-1">
          <div className={`truncate text-[12px] ${active ? "text-[var(--text)] font-semibold" : "font-normal text-[var(--text-secondary)] group-hover:text-[var(--text)]"}`}>
            {page.title || "Untitled"}
          </div>
          <div className="text-[9px] text-[var(--muted)] truncate leading-none mt-0.5 font-normal">
            {wordCount}w · {timeAgo(page.updatedAt)}
          </div>
        </div>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(page.id);
        }}
        className="mr-1.5 grid h-5 w-5 place-items-center rounded-md opacity-0 group-hover:opacity-100 hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--danger)] z-10 transition-all outline-none cursor-pointer"
        title="Remove from recents"
      >
        <X size={10} />
      </button>
    </div>
  );
}

interface NoskaSectionProps {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
}

function NoskaSection({ title, children, defaultExpanded = true }: NoskaSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <div className="mt-4.5 first:mt-1 select-none">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3.5 py-1.5 text-left text-[11px] font-bold text-[var(--muted)] tracking-wide transition duration-150 cursor-pointer select-none group outline-none"
      >
        <span>{title}</span>
        <motion.span
          animate={{ rotate: expanded ? 0 : -90 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className="text-[var(--muted)] group-hover:text-[var(--text)] transition-colors shrink-0 ml-1 opacity-0 group-hover:opacity-100"
        >
          <ChevronDown size={10} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="overflow-hidden px-1.5 mt-0.5 space-y-0.5"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface NoskaNavItemProps {
  icon: NavIcon;
  label: ReactNode;
  subtitle?: ReactNode;
  active?: boolean;
  muted?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  ariaLabel?: string;
  compact?: boolean;
  /** Small numeric pill shown at the end of the row — used by Inbox for
   * a real pending-invite count instead of a static/no-op indicator. */
  badge?: number;
}

function NoskaNavItem({ icon: Icon, label, subtitle, active, muted, onClick, ariaLabel, compact, badge }: NoskaNavItemProps) {
  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); onClick?.(e); } }}
      onMouseUp={(e) => (e.currentTarget as HTMLButtonElement).blur()}
      className={`flex ${compact ? "min-h-[22px] text-[11px] py-0.5" : "min-h-[26px] text-[12px] py-1"} w-full items-center gap-2 rounded-lg px-2.5 text-left outline-none relative transition-all duration-150 cursor-pointer ${
        active
          ? "text-[var(--text)] font-semibold"
          : muted
          ? "text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
      }`}
    >
      {active && (
        <motion.div
          layoutId="sidebar-active-bg"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="absolute inset-0 bg-[var(--active)] border border-[var(--border)] shadow-sm rounded-lg z-0"
        />
      )}
      <Icon size={compact ? 11 : 13} className={`shrink-0 z-10 transition-colors ${active ? "text-[var(--noska-blue)]" : "text-[var(--text-secondary)]"}`} />
      <span className="min-w-0 flex-1 z-10 relative">
        <span className={`block truncate ${active ? "font-semibold" : "font-normal"}`}>{label}</span>
        {subtitle && <span className="block truncate text-[9px] text-[var(--muted)] leading-none mt-0.5">{subtitle}</span>}
      </span>
      {!!badge && badge > 0 && (
        <span className="z-10 shrink-0 grid h-4 min-w-[16px] place-items-center rounded-full bg-[var(--accent)] px-1 text-[9px] font-bold text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

interface PageRowProps {
  page: Page;
  active: boolean;
  onSelect: (pageId: string, options?: PageSelectOptions) => void;
  onPatchPage: (pageId: string, patch: Partial<Page>) => void;
  collapsed?: boolean;
  onCollapse?: () => void;
}

export function PageRow({ page, active, onSelect, onPatchPage, collapsed, onCollapse }: PageRowProps) {
  const words = plainText(page).trim().split(/\s+/).filter(Boolean).length;
  return (
    <div
      className={`group flex items-center gap-1 rounded px-1 py-1 text-sm ${active ? "bg-[var(--active)]" : "hover:bg-[var(--hover)]"}`}
    >
      <button className="grid h-5 w-5 place-items-center rounded hover:bg-[var(--hover)]" onClick={onCollapse} title="Collapse">
        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
      </button>
      <button
        className="grid h-6 w-6 place-items-center rounded hover:bg-[var(--hover)]"
        onClick={() => onPatchPage(page.id, { icon: emojis[(emojis.indexOf(page.icon) + 1) % emojis.length] })}
        title="Change icon"
      >
        <PageIcon icon={page.icon} size={14} fallback={<span className="text-[12px] leading-none">📄</span>} />
      </button>
      <button className="min-w-0 flex-1 text-left" onClick={(e) => onSelect(page.id, selectOptionsFromEvent(e))} onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); onSelect(page.id, selectOptionsFromEvent(e)); } }}>
        <div className="truncate">{page.title || "Untitled"}</div>
        <div className="truncate text-[10px] text-[var(--text)]/45">
          {words} words · {timeAgo(page.updatedAt)}
        </div>
      </button>
      <button
        className="opacity-0 transition group-hover:opacity-100"
        title="Favorite"
        onClick={() => onPatchPage(page.id, { favorite: !page.favorite })}
      >
        <Star size={14} className={page.favorite ? "fill-[var(--warning)] text-[var(--warning)]" : ""} />
      </button>
    </div>
  );
}

interface SectionTitleProps {
  icon: LucideIcon;
  text: ReactNode;
}

export function SectionTitle({ icon: Icon, text }: SectionTitleProps) {
  return (
    <div className="mt-3 flex items-center gap-2 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
      <Icon size={13} />
      {text}
    </div>
  );
}

interface SidebarActionProps {
  icon: LucideIcon;
  label: ReactNode;
  hint?: ReactNode;
  onClick?: () => void;
}

export function SidebarAction({ icon: Icon, label, hint, onClick }: SidebarActionProps) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-[var(--text-secondary)] transition hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
    >
      <Icon size={16} />
      <span className="flex-1 truncate">{label}</span>
      {hint && <span className="text-[10px] text-[var(--text-muted)]">{hint}</span>}
    </button>
  );
}

export default Sidebar;
