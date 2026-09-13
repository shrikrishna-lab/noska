import React, { useState, useRef, useEffect, memo, useMemo } from "react";
import type { ReactNode, ComponentType } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
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
  Building2,
  BookOpen,
  Sparkles,
  PlusCircle,
  MessageSquare,
  RotateCw,
  MoreVertical,
  Cpu,
  Atom,
  Eye,
  Home,
  Inbox,
  Lock,
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
  AnimatedDownload,
  AnimatedMeetingScheduler,
  AnimatedJournal,
  AnimatedLibrary
} from "./ui/icons";
import { IconButton, FloatingMenu, useOutsideDismiss } from "./ui";
import { timeAgo, plainText, emojis } from "../utils/helpers";
import PageTree from "./PageTree";
import { selectOptionsFromEvent } from "./PageTree";
import type { PageSelectOptions } from "./PageTree";
import { PageIcon } from "./PageIcon";
import { HoverMarqueeText } from "./ui/HoverMarqueeText";

import type { Page } from "../lib/supabaseService";
import TeamSwitcher from "./teams/TeamSwitcher";
import { CompanySwitcher } from "./company/CompanySwitcher";
import { JoinCompanyModal } from "./company/JoinCompanyModal";
import { useCompany } from "../contexts/CompanyContext";
import { UserSidebarInfoCard } from "./ui/UserSidebarInfoCard";
import {
  useSidebarCustomization,
  SidebarSectionKey,
  getTextureOverlayStyle
} from "../features/customization/sidebarCustomization";

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

// Custom pixel-accurate Skills Delta Icon (Image 1 & 2)
function SkillsDeltaIcon({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="5.5" r="2.2" />
      <circle cx="6.5" cy="17" r="2.2" />
      <circle cx="17.5" cy="17" r="2.2" />
      <path d="M10.8 7.5L7.8 15" />
      <path d="M13.2 7.5L16.2 15" />
      <path d="M9 17h6" />
    </svg>
  );
}

// Custom pixel-accurate Amber Clover Icon for Bud 101 (Image 1)
function BudCloverIcon({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 7.5a2.2 2.2 0 0 0-2.2-2.2 2.2 2.2 0 0 0-2.2 2.2c0 1.8 2.2 4 4.4 4s4.4-2.2 4.4-4a2.2 2.2 0 0 0-2.2-2.2 2.2 2.2 0 0 0-2.2 2.2z" />
      <path d="M7.5 12a2.2 2.2 0 0 0-2.2-2.2 2.2 2.2 0 0 0 2.2-2.2c1.8 0 4 2.2 4 4.4s-2.2 4.4-4 4.4A2.2 2.2 0 0 0 5.3 14.2 2.2 2.2 0 0 0 7.5 12z" />
      <path d="M12 16.5a2.2 2.2 0 0 0 2.2 2.2 2.2 2.2 0 0 0 2.2-2.2c0-1.8-2.2-4-4.4-4s-4.4 2.2-4.4 4a2.2 2.2 0 0 0 2.2 2.2 2.2 2.2 0 0 0 2.2-2.2z" />
      <path d="M16.5 12a2.2 2.2 0 0 0 2.2 2.2 2.2 2.2 0 0 0-2.2 2.2c-1.8 0-4-2.2-4-4.4s2.2-4.4 4-4.4a2.2 2.2 0 0 0 2.2-2.2 2.2 2.2 0 0 0-2.2-2.2z" />
    </svg>
  );
}

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
  const navigate = useNavigate();
  const { currentCompany } = useCompany()
  const [showJoinCompanyModal, setShowJoinCompanyModal] = useState(false)
  const recents = useMemo(() => [...pages]
    .filter((p) => !p.hiddenFromRecents && !p.trashed)
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
    .slice(0, 5),
    [pages]);

  const rootPageIds = useMemo(() => pages.filter(p => !p.parentId).map(p => p.id), [pages]);

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
  const [hoveredQuickTab, setHoveredQuickTab] = useState<string | null>(null);

  const quickNavItems = useMemo(() => [
    {
      id: "home",
      label: "Home",
      icon: AnimatedFolder,
      active: appView === "home",
      onClick: (e: React.MouseEvent) => onView("home", selectOptionsFromEvent(e))
    },
    {
      id: "chats",
      label: "AI Space",
      icon: AnimatedAI,
      active: appView === "chats",
      onClick: onAIFull
    },
    {
      id: "meetings",
      label: "Meetings",
      icon: AnimatedMeetingScheduler,
      active: appView === "meetings" || appView === "meetingNote",
      onClick: (e: React.MouseEvent) => onView("meetings", selectOptionsFromEvent(e))
    },
    {
      id: "library",
      label: "Library",
      icon: AnimatedLibrary,
      active: appView === "library",
      onClick: (e: React.MouseEvent) => onView("library", selectOptionsFromEvent(e))
    },
    {
      id: "inbox",
      label: "Inbox",
      icon: AnimatedBell,
      active: appView === "inbox",
      onClick: (e: React.MouseEvent) => onView("inbox", selectOptionsFromEvent(e)),
      badge: pendingInvitesCount
    }
  ], [appView, onView, onAIFull, pendingInvitesCount]);

  const { config: customConfig } = useSidebarCustomization();

  const filteredQuickNavItems = useMemo(() => {
    return quickNavItems.filter((item) => {
      if (item.id === "home" && customConfig.quickTabs?.home === false) return false;
      if (item.id === "chats" && customConfig.quickTabs?.aiSpace === false) return false;
      if (item.id === "meetings" && customConfig.quickTabs?.meetings === false) return false;
      if (item.id === "library" && customConfig.quickTabs?.library === false) return false;
      if (item.id === "inbox" && customConfig.quickTabs?.inbox === false) return false;
      return true;
    });
  }, [quickNavItems, customConfig.quickTabs]);

  // Dynamic radius classes
  const radiusOuterClass = useMemo(() => {
    switch (customConfig.radius) {
      case "sharp": return "rounded-[4px]";
      case "subtle": return "rounded-[14px]";
      case "squircle": return "rounded-[22px]";
      case "apple-curved":
      default: return "rounded-[30px]";
    }
  }, [customConfig.radius]);

  const radiusInnerClass = useMemo(() => {
    switch (customConfig.radius) {
      case "sharp": return "rounded-[2px]";
      case "subtle": return "rounded-[12px]";
      case "squircle": return "rounded-[20px]";
      case "apple-curved":
      default: return "rounded-[28px]";
    }
  }, [customConfig.radius]);

  // Dynamic blur classes
  const blurClass = useMemo(() => {
    switch (customConfig.blur) {
      case "none": return "backdrop-blur-none";
      case "soft": return "backdrop-blur-md backdrop-saturate-[150%]";
      case "ultra": return "backdrop-blur-[64px] backdrop-saturate-[220%]";
      case "deep":
      default: return "backdrop-blur-[32px] backdrop-saturate-[195%]";
    }
  }, [customConfig.blur]);

  // New Creation button color class
  const newCreationBtnStyles = useMemo(() => {
    switch (customConfig.newCreationColor) {
      case "rose-clay":
        return "bg-gradient-to-r from-[#dfa0a7] via-[#cf8e94] to-[#ba7e84] text-neutral-900 dark:text-white border-[#ba7e84]/50 shadow-[0_2px_8px_rgba(186,126,132,0.3)]";
      case "sage-olive":
        return "bg-gradient-to-r from-[#9bb8a0] via-[#8ba990] to-[#7a9a80] text-neutral-900 dark:text-white border-[#7a9a80]/50 shadow-[0_2px_8px_rgba(122,154,128,0.3)]";
      case "nordic-slate":
        return "bg-gradient-to-r from-[#8ba8be] via-[#7b99af] to-[#6b8ba4] text-white border-[#6b8ba4]/50 shadow-[0_2px_8px_rgba(107,139,164,0.3)]";
      case "cyber-cyan":
        return "bg-gradient-to-r from-sky-400 via-cyan-500 to-blue-500 text-white border-cyan-400/40 shadow-[0_2px_8px_rgba(6,182,212,0.35)]";
      case "purple-radiant":
        return "bg-gradient-to-r from-purple-400 via-violet-400 to-indigo-500 text-white border-purple-400/40 shadow-[0_2px_8px_rgba(168,85,247,0.35)]";
      case "monochrome":
        return "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-black/20 dark:border-white/20 shadow-[0_2px_8px_rgba(0,0,0,0.2)]";
      case "amber-gold":
      default:
        return "bg-gradient-to-r from-[#E6CA9E] via-[#DFC293] to-[#D5B584] dark:from-[#A8824D] dark:to-[#8F6A35] text-neutral-900 dark:text-white border-[#D5B584]/50 dark:border-[#8F6A35]/50 shadow-[0_2px_8px_rgba(213,181,132,0.3)]";
    }
  }, [customConfig.newCreationColor]);

  // Click-outside references
  const switcherRef = useRef<HTMLButtonElement>(null);
  const userRef = useRef<HTMLButtonElement>(null);
  const switcherMenuRef = useOutsideDismiss<HTMLDivElement>(switcherOpen, () => setSwitcherOpen(false));

  // Anchor coordinate state for the account-switcher popover.
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

  // Section renderer helper with granular item-level visibility
  const renderSection = (secKey: SidebarSectionKey) => {
    switch (secKey) {
      case "workspace":
        return (
          <div key="workspace">
            <NoskaSection title="Workspace" defaultExpanded={true}>
              {customConfig.itemVisibility?.dailyJournal !== false && (
                <NoskaNavItem
                  icon={AnimatedJournal}
                  label="Daily Journal"
                  active={appView === "daily" || appView === "journal"}
                  onClick={(e) => onView("daily", selectOptionsFromEvent(e))}
                />
              )}
              {customConfig.itemVisibility?.myTasks !== false && (
                <NoskaNavItem
                  icon={AnimatedCheck}
                  label="My Tasks"
                  active={appView === "tasks"}
                  onClick={(e) => onView("tasks", selectOptionsFromEvent(e))}
                />
              )}
              {customConfig.itemVisibility?.calendar !== false && (
                <NoskaNavItem
                  icon={AnimatedHistory}
                  label="Calendar"
                  active={appView === "calendar"}
                  onClick={(e) => onView("calendar", selectOptionsFromEvent(e))}
                />
              )}
            </NoskaSection>
          </div>
        );
      case "company":
        return (
          <div key="company">
            <NoskaSection title="Company" defaultExpanded={true}>
              {customConfig.itemVisibility?.companySwitcher !== false && (
                <div className="px-1 py-0.5">
                  <CompanySwitcher onView={onView} />
                </div>
              )}
              {customConfig.itemVisibility?.companyHome !== false && (
                !currentCompany ? (
                  <NoskaNavItem
                    icon={Lock}
                    label="Company Home"
                    badge="Locked"
                    onClick={() => {
                      onToast?.("Please be part of at least one company to access Company Home.");
                      setShowJoinCompanyModal(true);
                    }}
                  />
                ) : (
                  <NoskaNavItem
                    icon={Building2}
                    label="Company Home"
                    active={appView === "companyHome" || appView === "companySettings"}
                    onClick={(e) => onView("companyHome", selectOptionsFromEvent(e))}
                  />
                )
              )}
            </NoskaSection>
          </div>
        );
      case "favorites":
        return (
          <div key="favorites">
            <NoskaSection title="Favorites" defaultExpanded={true}>
              {pages.filter(p => p.favorite && !p.trashed).length === 0 ? (
                <div className="text-[11px] text-neutral-400 px-3 py-1 italic">Starred pages appear here</div>
              ) : (
                pages.filter(p => p.favorite && !p.trashed).map(p => (
                  <NoskaNavItem
                    key={p.id}
                    icon={(props) => <Star {...props} size={13} className="fill-amber-400 text-amber-400" />}
                    label={p.title || "Untitled"}
                    onClick={(e) => onSelect(p.id, selectOptionsFromEvent(e))}
                    active={p.id === activeId}
                  />
                ))
              )}
            </NoskaSection>
          </div>
        );
      case "recents":
        return (
          <div key="recents">
            <NoskaSection title="Recents" defaultExpanded={true}>
              {recents.length === 0 ? (
                <div className="text-[11px] text-neutral-400 px-3 py-1 italic">No recently edited pages</div>
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
          </div>
        );
      case "privateDocs":
        return (
          <div key="privateDocs">
            <NoskaSection title="Private Documents" defaultExpanded={true}>
              <PageTree
                content={rootPageIds}
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
              <NoskaNavItem icon={AnimatedPlus} label="Add new document" onClick={() => onNew("blank")} muted />
            </NoskaSection>
          </div>
        );
      case "teams":
        return (
          <div key="teams">
            <NoskaSection title="Teams" defaultExpanded={true}>
              {customConfig.itemVisibility?.teamSwitcher !== false && (
                <div className="px-1 py-0.5">
                  <TeamSwitcher workspaceName={workspaceName} onView={onView} />
                </div>
              )}
            </NoskaSection>
          </div>
        );
      case "sharedSpace":
        return (
          <div key="sharedSpace">
            <NoskaSection title="Shared Space" defaultExpanded={true}>
              {customConfig.itemVisibility?.collabHub !== false && (
                <NoskaNavItem
                  icon={Users}
                  label="Collaboration Hub"
                  active={appView === "shared"}
                  onClick={(e) => onView("shared", selectOptionsFromEvent(e))}
                />
              )}
              <NoskaNavItem
                icon={AnimatedPlus}
                label="Start collaboration"
                onClick={() => {
                  if (onShare) onShare();
                  else onView("shared");
                }}
                muted
              />
            </NoskaSection>
          </div>
        );
      case "intelligence":
        return (
          <div key="intelligence">
            <NoskaSection title="Intelligence" defaultExpanded={true}>
              {customConfig.itemVisibility?.commandCenter !== false && (
                <NoskaNavItem
                  icon={Sparkles}
                  label="Command Center"
                  active={appView === "commandCenter"}
                  onClick={(e) => onView("commandCenter", selectOptionsFromEvent(e))}
                />
              )}
              {customConfig.itemVisibility?.agents !== false && (
                <NoskaNavItem
                  icon={Sparkles}
                  label="Agents"
                  active={appView === "agents"}
                  onClick={(e) => onView("agents", selectOptionsFromEvent(e))}
                />
              )}
              {customConfig.itemVisibility?.automations !== false && (
                <NoskaNavItem
                  icon={AnimatedVoice}
                  label="Automations"
                  active={appView === "automations"}
                  onClick={(e) => onView("automations", selectOptionsFromEvent(e))}
                />
              )}
              {customConfig.itemVisibility?.aiMeetingCapture !== false && (
                <NoskaNavItem
                  icon={AnimatedVoice}
                  label="AI Meeting Capture"
                  active={appView === "meetingNote"}
                  onClick={(e) => onView("meetingNote", selectOptionsFromEvent(e))}
                />
              )}
              <NoskaNavItem
                icon={AnimatedPlus}
                label="Deploy New Agent"
                onClick={(e) => onView("agents", selectOptionsFromEvent(e))}
                muted
              />
            </NoskaSection>
          </div>
        );
      case "marketplace":
        return (
          <div key="marketplace">
            <NoskaSection title="Marketplace" defaultExpanded={true}>
              {customConfig.itemVisibility?.templates !== false && (
                <NoskaNavItem
                  icon={Sparkles}
                  label="Browse Templates"
                  active={appView === "marketplace"}
                  onClick={(e) => onView("marketplace", selectOptionsFromEvent(e))}
                />
              )}
              {customConfig.itemVisibility?.creatorStudio !== false && (
                <NoskaNavItem
                  icon={AnimatedUpload}
                  label="Creator Studio"
                  active={appView === "creator"}
                  onClick={(e) => onView("creator", selectOptionsFromEvent(e))}
                />
              )}
              {customConfig.itemVisibility?.agentDirectory !== false && (
                <NoskaNavItem
                  icon={AnimatedBookmark}
                  label="Agent Directory"
                  onClick={(e) => onView("marketplace", selectOptionsFromEvent(e))}
                />
              )}
            </NoskaSection>
          </div>
        );
      case "tools":
        return (
          <div key="tools">
            <NoskaSection title="Tools" defaultExpanded={true}>
              {customConfig.itemVisibility?.spacedRepetition !== false && (
                <NoskaNavItem icon={Brain} label="Spaced Repetition" onClick={onReview} />
              )}
              {customConfig.itemVisibility?.apiConsole !== false && (
                <NoskaNavItem icon={Terminal} label="API Console" onClick={onAPI} />
              )}
            </NoskaSection>
          </div>
        );
      case "support":
        return (
          <div key="support">
            <NoskaSection title="Support" defaultExpanded={true}>
              {customConfig.itemVisibility?.helpCenter !== false && (
                <NoskaNavItem icon={AnimatedBookmark} label="Help Center" onClick={onHelp} />
              )}
              {customConfig.itemVisibility?.trash !== false && (
                <NoskaNavItem icon={AnimatedTrash} label={`Trash${trashCount ? ` (${trashCount})` : ""}`} ariaLabel="Open trash" onClick={onTrash} />
              )}
            </NoskaSection>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.aside
      initial={false}
      animate={{
        width: open ? 260 : 58,
        opacity: 1
      }}
      transition={SPRING_PRESETS.soft}
      className="relative flex h-full shrink-0 flex-col overflow-visible select-none z-30 p-2 pointer-events-auto font-sans"
    >
      {/* Outer Specular Precision Shell */}
      <div
        className={`relative flex h-full w-full flex-col ${radiusOuterClass} ${customConfig.specularBezel !== false
            ? "p-[2px] bg-gradient-to-br from-white/95 via-[#E6EAF5]/80 via-30% to-white/95 dark:from-white/20 dark:via-white/5 dark:to-white/15 shadow-[0_2px_6px_-1px_rgba(18,18,26,0.04),0_10px_24px_-4px_rgba(18,18,26,0.06),0_24px_48px_-8px_rgba(18,18,26,0.08)] dark:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.4),0_12px_36px_-6px_rgba(0,0,0,0.5)]"
            : "p-[1px] border shadow-lg"
          } transition-all duration-200`}
        style={{
          boxShadow: customConfig.glowEffect ? `0 0 30px ${customConfig.accentColor}28` : undefined
        }}
      >

        {/* Inner Liquid Glass Body with Dynamic Theme Background & Texture Overlay */}
        <div
          className={`relative flex h-full w-full flex-col justify-between ${radiusInnerClass} ${blurClass} shadow-[inset_0px_1.5px_2px_0px_rgba(255,255,255,0.95),inset_0px_-1px_1.5px_0px_rgba(0,0,0,0.05)] dark:shadow-[inset_0px_1px_1.5px_0px_rgba(255,255,255,0.12),inset_0px_-1px_1.5px_0px_rgba(0,0,0,0.4)] text-[var(--text)] overflow-hidden transition-all duration-200 ${open ? "p-3" : "p-2 items-center"
            }`}
          style={{
            background: (theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches))
              ? (customConfig.customBgDark || "linear-gradient(135deg, rgba(24, 25, 30, 0.94), rgba(19, 20, 24, 0.98))")
              : (customConfig.customBgLight || "linear-gradient(135deg, rgba(246, 246, 250, 0.94), rgba(255, 255, 255, 0.98))")
          }}
        >
          {/* Genuine Physical Texture Overlay Layer */}
          <div
            className="absolute inset-0 pointer-events-none rounded-[inherit] z-0"
            style={getTextureOverlayStyle(customConfig.texture)}
          />
          {/* =========================================================================
            STATE 1: COLLAPSED MODE (Apple-Style Floating Pill Dock)
           ========================================================================= */}
          {!open ? (
            <div className="flex h-full w-full flex-col items-center justify-between py-2">
              {/* Top: Sidebar Expand Toggle Button */}
              <div className="flex flex-col items-center w-full">
                <button
                  onClick={onToggle}
                  className="flex h-8.5 w-8.5 items-center justify-center rounded-xl text-[#4B5563] dark:text-[#9CA3AF] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[#111827] dark:hover:text-white transition duration-150 cursor-pointer outline-none"
                  title="Expand sidebar (Ctrl+\)"
                >
                  <PanelLeftClose size={18} className="rotate-180" />
                </button>

                {/* Collapsed Vertical Nav Icons */}
                <div className="flex flex-col items-center gap-3 w-full mt-4">
                  {/* 1. New Creation */}
                  {customConfig.showNewCreationButton !== false && (
                    <button
                      onClick={() => onNew("blank")}
                      className="flex h-8.5 w-8.5 items-center justify-center rounded-xl text-[#4B5563] dark:text-[#9CA3AF] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[#111827] dark:hover:text-white transition duration-150 cursor-pointer outline-none"
                      title="New creation (Ctrl+P)"
                    >
                      <PlusCircle size={18} />
                    </button>
                  )}

                  {/* 2. Search */}
                  {customConfig.showSearch !== false && (
                    <button
                      onClick={onSearch}
                      className="flex h-8.5 w-8.5 items-center justify-center rounded-xl text-[#4B5563] dark:text-[#9CA3AF] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[#111827] dark:hover:text-white transition duration-150 cursor-pointer outline-none"
                      title="Search workspace (Ctrl+K)"
                    >
                      <AnimatedSearch size={17} />
                    </button>
                  )}

                  {/* 3. Home */}
                  {customConfig.quickTabs?.home !== false && (
                    <button
                      onClick={(e) => onView("home", selectOptionsFromEvent(e))}
                      className={`flex h-8.5 w-8.5 items-center justify-center rounded-xl transition duration-150 cursor-pointer outline-none ${appView === "home"
                        ? "bg-white dark:bg-white/15 text-[#111827] dark:text-white shadow-xs font-semibold"
                        : "text-[#4B5563] dark:text-[#9CA3AF] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[#111827] dark:hover:text-white"
                        }`}
                      title="Home"
                    >
                      <AnimatedFolder size={17} />
                    </button>
                  )}

                  {/* 4. AI Workspace */}
                  {customConfig.quickTabs?.aiSpace !== false && (
                    <button
                      onClick={onAIFull}
                      className={`flex h-8.5 w-8.5 items-center justify-center rounded-xl transition duration-150 cursor-pointer outline-none ${appView === "chats"
                        ? "bg-white dark:bg-white/15 text-[#111827] dark:text-white shadow-xs font-semibold"
                        : "text-[#4B5563] dark:text-[#9CA3AF] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[#111827] dark:hover:text-white"
                        }`}
                      title="AI Workspace"
                    >
                      <AnimatedAI size={17} />
                    </button>
                  )}

                  {/* 5. Meetings */}
                  {customConfig.quickTabs?.meetings !== false && (
                    <button
                      onClick={(e) => onView("meetings", selectOptionsFromEvent(e))}
                      className={`flex h-8.5 w-8.5 items-center justify-center rounded-xl transition duration-150 cursor-pointer outline-none ${appView === "meetings" || appView === "meetingNote"
                        ? "bg-white dark:bg-white/15 text-[#111827] dark:text-white shadow-xs font-semibold"
                        : "text-[#4B5563] dark:text-[#9CA3AF] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[#111827] dark:hover:text-white"
                        }`}
                      title="Meetings"
                    >
                      <AnimatedMeetingScheduler size={17} />
                    </button>
                  )}

                  {/* 6. Library */}
                  {customConfig.quickTabs?.library !== false && (
                    <button
                      onClick={(e) => onView("library", selectOptionsFromEvent(e))}
                      className={`flex h-8.5 w-8.5 items-center justify-center rounded-xl transition duration-150 cursor-pointer outline-none ${appView === "library"
                        ? "bg-white dark:bg-white/15 text-[#111827] dark:text-white shadow-xs font-semibold"
                        : "text-[#4B5563] dark:text-[#9CA3AF] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[#111827] dark:hover:text-white"
                        }`}
                      title="Library"
                    >
                      <AnimatedLibrary size={17} />
                    </button>
                  )}

                  {/* 7. Inbox */}
                  {customConfig.quickTabs?.inbox !== false && (
                    <button
                      onClick={(e) => onView("inbox", selectOptionsFromEvent(e))}
                      className={`relative flex h-8.5 w-8.5 items-center justify-center rounded-xl transition duration-150 cursor-pointer outline-none ${appView === "inbox"
                        ? "bg-white dark:bg-white/15 text-[#111827] dark:text-white shadow-xs font-semibold"
                        : "text-[#4B5563] dark:text-[#9CA3AF] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[#111827] dark:hover:text-white"
                        }`}
                      title="Inbox"
                    >
                      <AnimatedBell size={17} />
                      {pendingInvitesCount > 0 && (
                        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-black" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Bottom: User Avatar Popover trigger */}
              <button
                ref={userRef}
                onClick={() => {
                  if (userRef.current) {
                    const r = userRef.current.getBoundingClientRect();
                    setSwitcherCoords({ bottom: window.innerHeight - r.top + 6, left: r.left });
                  }
                  setSwitcherOpen(o => !o);
                }}
                className="group relative flex h-8.5 w-8.5 items-center justify-center rounded-full hover:scale-105 transition cursor-pointer outline-none"
                title={`${displayName} (${displayEmail})`}
              >
                <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-amber-500 via-orange-400 to-amber-300 shadow-xs ring-1 ring-white/80 dark:ring-black/40 flex items-center justify-center text-[10px] text-white font-bold overflow-hidden">
                  {isAvatarUrl ? (
                    <img src={displayAvatar} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span>{displayAvatar || "👤"}</span>
                  )}
                </div>
              </button>
            </div>
          ) : (
            /* =========================================================================
                STATE 2: EXPANDED MODE (Exact Layout Styled with Apple Liquid Glass & Customizations)
               ========================================================================= */
            <div className="flex h-full w-full flex-col justify-between overflow-hidden">

              {/* Top Workspace Header (Row 1) */}
              <div className="flex items-center justify-between pb-3 pt-0.5 px-0.5 shrink-0 select-none">
                {/* Workspace Badge + Name + Subtitle + Chevron */}
                <button
                  ref={switcherRef}
                  onClick={() => {
                    if (switcherRef.current) {
                      const r = switcherRef.current.getBoundingClientRect();
                      setSwitcherCoords({ top: r.bottom + 6, bottom: undefined, left: r.left });
                    }
                    setSwitcherOpen(o => !o);
                  }}
                  className="group flex items-center gap-2.5 outline-none cursor-pointer min-w-0 flex-1 text-left p-1 -m-1 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition"
                  title={`${workspaceName} • Account & Workspace Settings`}
                >
                  {/* Rounded Squircle Workspace Icon Badge */}
                  <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-white via-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 border border-black/10 dark:border-white/10 shadow-[0_2px_6px_rgba(0,0,0,0.05)] flex items-center justify-center shrink-0">
                    <div className="h-5 w-5 rounded-lg bg-neutral-900 dark:bg-white flex items-center justify-center text-white dark:text-neutral-900 shadow-2xs">
                      <AnimatedCanvas size={12} className="text-white dark:text-neutral-900" />
                    </div>
                  </div>

                  {/* Workspace Title & Subtitle */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-neutral-900 dark:text-white truncate leading-tight tracking-tight">
                        {displayName?.replace(/^@/, '') || workspaceName}
                      </span>
                      <ChevronDown size={11} className="text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-200 transition shrink-0" />
                    </div>
                    <div className="text-[10.5px] font-normal text-neutral-500 dark:text-neutral-400 truncate leading-tight mt-0.5">
                      {workspaceName}
                    </div>
                  </div>
                </button>

                {/* Top Right Sidebar Collapse Toggle Button */}
                <button
                  onClick={onToggle}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-[#4B5563] dark:text-[#9CA3AF] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[#111827] dark:hover:text-white transition duration-150 cursor-pointer outline-none shrink-0 ml-1"
                  title="Collapse sidebar (Ctrl+\)"
                >
                  <PanelLeftClose size={15} />
                </button>
              </div>

              {/* Quick Navigation Capsule Row (Apple-grade fluid spring sliding capsule) */}
              {customConfig.showQuickNav !== false && filteredQuickNavItems.length > 0 && (
                <div className="px-0.5 pb-2.5">
                  <LayoutGroup id="quickCapsuleNav">
                    <div className="relative flex items-center justify-between p-1 w-full rounded-full bg-black/[0.04] dark:bg-[#16171C]/90 border border-black/[0.06] dark:border-white/[0.08] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_4px_12px_rgba(0,0,0,0.35)] backdrop-blur-2xl select-none">
                      {filteredQuickNavItems.map((item) => {
                        const isHovered = hoveredQuickTab === item.id;
                        const isExpanded = hoveredQuickTab ? isHovered : item.active;
                        const IconComponent = item.icon;

                        const itemColors: Record<string, { activeText: string; activeIcon: string; hoverIcon: string }> = {
                          home: {
                            activeText: "text-sky-600 dark:text-sky-400 font-semibold",
                            activeIcon: "text-sky-600 dark:text-sky-400",
                            hoverIcon: "hover:text-sky-600 dark:hover:text-sky-400"
                          },
                          chats: {
                            activeText: "text-violet-600 dark:text-violet-400 font-semibold",
                            activeIcon: "text-violet-600 dark:text-violet-400",
                            hoverIcon: "hover:text-violet-600 dark:hover:text-violet-400"
                          },
                          meetings: {
                            activeText: "text-emerald-600 dark:text-emerald-400 font-semibold",
                            activeIcon: "text-emerald-600 dark:text-emerald-400",
                            hoverIcon: "hover:text-emerald-600 dark:hover:text-emerald-400"
                          },
                          library: {
                            activeText: "text-amber-600 dark:text-amber-400 font-semibold",
                            activeIcon: "text-amber-600 dark:text-amber-400",
                            hoverIcon: "hover:text-amber-600 dark:hover:text-amber-400"
                          },
                          inbox: {
                            activeText: "text-rose-600 dark:text-rose-400 font-semibold",
                            activeIcon: "text-rose-600 dark:text-rose-400",
                            hoverIcon: "hover:text-rose-600 dark:hover:text-rose-400"
                          }
                        };

                        const themeColors = itemColors[item.id] || {
                          activeText: "text-neutral-900 dark:text-white font-semibold",
                          activeIcon: "text-neutral-900 dark:text-white",
                          hoverIcon: "hover:text-neutral-900 dark:hover:text-white"
                        };

                        return (
                          <motion.button
                            key={item.id}
                            type="button"
                            layout
                            whileTap={{ scale: 0.9 }}
                            onMouseEnter={() => setHoveredQuickTab(item.id)}
                            onMouseLeave={() => setHoveredQuickTab(null)}
                            onClick={item.onClick}
                            transition={{ type: "spring", stiffness: 460, damping: 30, mass: 0.6 }}
                            className={`group relative flex items-center justify-center h-7 rounded-full cursor-pointer outline-none select-none transition-colors duration-150 z-10 ${isExpanded ? "flex-[1.6] px-2.5" : "flex-1 min-w-[28px]"
                              } ${item.active
                                ? themeColors.activeText
                                : isHovered
                                  ? `text-neutral-900 dark:text-white ${themeColors.hoverIcon}`
                                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                              }`}
                            title={item.label}
                          >
                            {/* Apple-style floating active pill */}
                            {item.active && (
                              <motion.div
                                layoutId="quickNavActiveCapsule"
                                className="absolute inset-0 rounded-full bg-white dark:bg-[#282930] border border-black/[0.06] dark:border-white/[0.12] shadow-[0_2px_6px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.12)] -z-10"
                                transition={{ type: "spring", stiffness: 460, damping: 30, mass: 0.6 }}
                              />
                            )}

                            {/* Hover ghost backdrop for non-active items */}
                            {!item.active && isHovered && (
                              <motion.div
                                layoutId="quickNavHoverGhost"
                                className="absolute inset-0 rounded-full bg-black/[0.05] dark:bg-white/[0.08] -z-10"
                                transition={{ type: "spring", stiffness: 460, damping: 30, mass: 0.6 }}
                              />
                            )}

                            <motion.div
                              whileHover={{ scale: 1.15, y: -0.5 }}
                              transition={{ type: "spring", stiffness: 500, damping: 25 }}
                              className={`relative flex items-center justify-center shrink-0 ${item.active ? themeColors.activeIcon : ""
                                }`}
                            >
                              <IconComponent size={14} className="shrink-0" />
                              {Boolean(item.badge) && !isExpanded && (
                                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 ring-1 ring-white dark:ring-[#16171C]" />
                                </span>
                              )}
                            </motion.div>

                            {/* Fluid Animated Label Reveal */}
                            <AnimatePresence mode="popLayout" initial={false}>
                              {isExpanded && (
                                <motion.span
                                  key="label"
                                  initial={{ opacity: 0, scale: 0.9, x: -3 }}
                                  animate={{ opacity: 1, scale: 1, x: 0 }}
                                  exit={{ opacity: 0, scale: 0.9, x: -3 }}
                                  transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                                  className="whitespace-nowrap text-[11px] font-medium tracking-tight leading-none ml-1.5 flex items-center gap-1 select-none truncate"
                                >
                                  <span className="truncate">{item.label}</span>
                                  {Boolean(item.badge) && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0 shadow-xs" />
                                  )}
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </motion.button>
                        );
                      })}
                    </div>
                  </LayoutGroup>
                </div>
              )}

              {/* Row 2: Search Workspace Input Capsule */}
              {customConfig.showSearch !== false && (
                <div className="pb-2.5 px-0.5 shrink-0">
                  <button
                    onClick={onSearch}
                    className="group flex w-full items-center justify-between gap-2 rounded-lg bg-white/70 dark:bg-neutral-900/60 border border-black/[0.06] dark:border-white/[0.08] px-2.5 py-1.5 text-left text-[12px] text-neutral-500 dark:text-neutral-400 shadow-2xs hover:bg-white/90 dark:hover:bg-neutral-900/90 hover:border-black/15 dark:hover:border-white/15 transition cursor-pointer outline-none"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <AnimatedSearch size={13.5} className="text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-200 shrink-0" />
                      <span className="truncate">Search workspace...</span>
                    </div>
                    <kbd className="rounded border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-semibold text-neutral-400 tracking-wider">
                      CTRL+K
                    </kbd>
                  </button>
                </div>
              )}

              {/* Scrollable Center Nav Sections with Apple Liquid Fade Effect */}
              <div className="relative flex-1 min-h-0 overflow-hidden flex flex-col">
                {/* Top Apple Liquid Gradient Fade Mask */}
                <div className="pointer-events-none absolute top-0 left-0 right-0 h-4 z-20 bg-gradient-to-b from-[#F6F6FA] via-[#F6F6FA]/70 to-transparent dark:from-[#18191E] dark:via-[#18191E]/70 dark:to-transparent" />

                <div className="flex-1 overflow-y-auto pr-0.5 space-y-3 pt-1.5 pb-3 scrollbar-thin scrollbar-thumb-black/10 dark:scrollbar-thumb-white/10 hover:scrollbar-thumb-black/20">
                  {/* Dynamic sections rendered according to user-configured order and visibility */}
                  {customConfig.sectionOrder.map((secKey) => {
                    if (customConfig.sectionVisibility && customConfig.sectionVisibility[secKey] === false) {
                      return null;
                    }
                    return renderSection(secKey);
                  })}

                  {/* User Sidebar Info Card */}
                  {customConfig.showUserInfoCard !== false && (
                    <UserSidebarInfoCard className="px-0.5 my-2" />
                  )}
                </div>

                {/* Bottom Apple Liquid Gradient Fade Mask */}
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4 z-20 bg-gradient-to-t from-[#F2F3F8] via-[#F2F3F8]/70 to-transparent dark:from-[#1A1B21] dark:via-[#1A1B21]/70 dark:to-transparent" />
              </div>

              {/* Bottom Section (Clean Minimal Layout with New Creation Button & More) */}
              <div className="pt-2 pb-1 space-y-1.5 shrink-0 select-none">

                {/* Premium Golden-Sand / Custom Accent "New Creation" Button */}
                {customConfig.showNewCreationButton !== false && (
                  <div className="px-0.5">
                    <button
                      onClick={() => onNew("blank")}
                      className={`group relative flex h-[34px] w-full items-center justify-between rounded-xl px-2.5 border hover:brightness-105 active:scale-[0.98] transition-all duration-150 cursor-pointer outline-none ${newCreationBtnStyles}`}
                    >
                      <div className="flex items-center gap-2">
                        <AnimatedPlus size={14} className="font-bold" />
                        <span className="text-[12.5px] font-semibold tracking-tight">
                          New Creation
                        </span>
                      </div>
                      <kbd className="rounded bg-black/10 dark:bg-black/25 px-1.5 py-0.5 text-[9px] font-bold tracking-wider">
                        CTRL+P
                      </kbd>
                    </button>
                  </div>
                )}

                {/* Bottom Clean "⋮ More" Button */}
                {customConfig.showMoreButton !== false && (
                  <button
                    ref={userRef}
                    onClick={() => {
                      if (userRef.current) {
                        const r = userRef.current.getBoundingClientRect();
                        setSwitcherCoords({ bottom: window.innerHeight - r.top + 6, left: r.left });
                      }
                      setSwitcherOpen(o => !o);
                    }}
                    className="flex w-full min-h-[28px] h-[28px] items-center gap-2 rounded-lg px-2 hover:bg-black/5 dark:hover:bg-white/10 transition text-left cursor-pointer outline-none group text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
                    title="Account & More Options"
                  >
                    <MoreVertical size={13} className="text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-200 transition shrink-0" />
                    <span className="text-[11.5px] font-medium leading-tight">
                      More
                    </span>
                  </button>
                )}
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Account Switcher Popover */}
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
              className="fixed z-[100] w-[266px] rounded-2xl border border-white/80 dark:border-white/10 bg-white/85 dark:bg-neutral-900/85 backdrop-blur-2xl p-3 shadow-2xl text-[12px] outline-none select-none flex flex-col gap-2"
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

              <div className="h-px bg-black/[0.06] dark:bg-white/[0.08] my-0.5" />

              {/* Profile */}
              <button
                onClick={() => { setSwitcherOpen(false); onProfile?.(); }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-black/5 dark:hover:bg-white/10 transition duration-150 cursor-pointer outline-none"
              >
                <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-sm shrink-0">
                  <UserRound size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-neutral-800 dark:text-neutral-200 text-[11.5px] leading-none">My Profile</div>
                  <div className="text-[9px] text-neutral-400 mt-0.5 truncate">Edit name, photo, bio & location</div>
                </div>
              </button>

              <div className="h-px bg-black/[0.06] dark:bg-white/[0.08] my-0.5" />

              {/* Workspace Rename */}
              <div className="flex items-center gap-2.5 px-1">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0">
                  {workspaceName.charAt(0)}
                </div>
                <button
                  onClick={async () => {
                    const name = await window.noskaPrompt?.("Rename workspace:", workspaceName, "Workspace Name");
                    if (name && name.trim()) setWorkspaceName(name.trim());
                  }}
                  className="flex-1 min-w-0 text-left rounded-md hover:bg-black/5 dark:hover:bg-white/10 px-1 py-0.5 -mx-1 transition cursor-pointer outline-none"
                  title="Rename workspace"
                >
                  <div className="font-bold text-neutral-800 dark:text-neutral-200 truncate leading-none text-[11.5px]">{workspaceName}</div>
                  <div className="text-[9px] text-neutral-400 truncate mt-0.5">Click to rename</div>
                </button>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => { setSwitcherOpen(false); onSettings(); }}
                    className="h-6.5 w-6.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-neutral-500 hover:text-neutral-900 dark:hover:text-white grid place-items-center transition duration-150 cursor-pointer outline-none"
                    title="Workspace settings"
                  >
                    <Settings size={13} />
                  </button>
                  <button
                    onClick={() => { setSwitcherOpen(false); onShare?.(); }}
                    className="h-6.5 w-6.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-neutral-500 hover:text-neutral-900 dark:hover:text-white grid place-items-center transition duration-150 cursor-pointer outline-none"
                    title="Invite members / share"
                  >
                    <Users size={13} />
                  </button>
                </div>
              </div>

              <div className="h-px bg-black/[0.06] dark:bg-white/[0.08] my-0.5" />

              {/* Theme Switcher */}
              <div className="flex items-center justify-between px-1">
                <span className="text-[10.5px] font-semibold text-neutral-400 uppercase tracking-wider">Theme</span>
                <div className="flex items-center gap-0.5 rounded-lg bg-black/5 dark:bg-white/10 p-0.5">
                  {themeOptions.map(({ value, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => onThemeChange(value)}
                      className={`h-6 w-6 grid place-items-center rounded-md transition cursor-pointer outline-none ${theme === value ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs font-bold" : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
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

      {showJoinCompanyModal && (
        <JoinCompanyModal
          onClose={() => setShowJoinCompanyModal(false)}
          onJoined={() => onView("companyHome")}
        />
      )}
    </motion.aside>
  );
});

interface RecentsPageItemProps {
  page: Page;
  active: boolean;
  onSelect: (pageId: string, options?: PageSelectOptions) => void;
  onRemove: (pageId: string) => void;
}

function RecentsPageItemBase({ page, active, onSelect, onRemove }: RecentsPageItemProps) {
  const wordCount = page.blocks ? page.blocks.reduce((acc, b) => acc + (b.text ? b.text.split(/\s+/).filter(Boolean).length : 0), 0) : 0;
  return (
    <motion.div
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 450, damping: 32 }}
      className={`group relative flex min-h-[26px] h-[26px] items-center rounded-lg transition-all duration-150 ${active
        ? "bg-black/[0.055] dark:bg-white/[0.08] text-neutral-900 dark:text-white border border-black/[0.03] dark:border-white/[0.06] shadow-2xs"
        : "text-neutral-700 dark:text-neutral-300 hover:bg-black/[0.035] dark:hover:bg-white/[0.05] hover:text-neutral-900 dark:hover:text-white"
        }`}
    >
      <button
        onClick={(e) => onSelect(page.id, selectOptionsFromEvent(e))}
        onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); onSelect(page.id, selectOptionsFromEvent(e)); } }}
        className="flex min-w-0 flex-1 items-center gap-2 px-2 text-left z-10 outline-none cursor-pointer"
      >
        <PageIcon icon={page.icon} size={13.5} fallback={<span className="text-[11.5px] leading-none">📄</span>} />
        <div className="min-w-0 flex-1 pr-1">
          <HoverMarqueeText
            text={page.title || "Untitled"}
            className={`text-[11.5px] leading-tight ${active ? "text-neutral-900 dark:text-white font-medium" : "font-normal text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white"}`}
          />
          <div className="text-[9px] text-neutral-400 dark:text-neutral-500 truncate leading-none mt-0.5 font-normal">
            {wordCount}w · {timeAgo(page.updatedAt)}
          </div>
        </div>
      </button>
      <div className="mr-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(page.id, { sidePeek: true });
          }}
          className="grid h-4.5 w-4.5 place-items-center rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-all outline-none cursor-pointer"
          title="Side peek"
        >
          <Eye size={11} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(page.id);
          }}
          className="grid h-4.5 w-4.5 place-items-center rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-neutral-400 hover:text-red-500 transition-all outline-none cursor-pointer"
          title="Remove from recents"
        >
          <X size={10} />
        </button>
      </div>
    </motion.div>
  );
}
const RecentsPageItem = React.memo(RecentsPageItemBase);

interface NoskaSectionProps {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
}

function NoskaSection({ title, children, defaultExpanded = true }: NoskaSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <div className="select-none">
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between px-2 py-0.5 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 select-none cursor-pointer rounded-md hover:bg-black/[0.025] dark:hover:bg-white/[0.03] transition-colors group/header"
      >
        <span className="tracking-tight">{title}</span>
        <div
          className="text-neutral-400 group-hover/header:text-neutral-600 dark:group-hover/header:text-neutral-200 transition-colors p-0.5 -mr-0.5 rounded"
          title={expanded ? `Collapse ${title}` : `Expand ${title}`}
        >
          <motion.span
            animate={{ rotate: expanded ? 0 : -90 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="block"
          >
            <ChevronDown size={10.5} />
          </motion.span>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.8 }}
            className="overflow-hidden space-y-0.5 mt-0.5"
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
  /** Small numeric pill or text badge shown at the end of the row */
  badge?: number | string;
}

function NoskaNavItem({ icon: Icon, label, subtitle, active, muted, onClick, ariaLabel, compact, badge }: NoskaNavItemProps) {
  return (
    <motion.button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 450, damping: 32 }}
      onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); onClick?.(e); } }}
      onMouseUp={(e) => (e.currentTarget as HTMLButtonElement).blur()}
      className={`flex ${compact ? "min-h-[23px] h-[23px] text-[10.5px] py-0.5" : "min-h-[26px] h-[26px] text-[11.5px] py-0.5"} w-full items-center gap-2 rounded-lg px-2 text-left outline-none relative transition-colors duration-150 cursor-pointer select-none ${active
        ? "text-neutral-900 dark:text-white font-medium bg-black/[0.055] dark:bg-white/[0.08] border border-black/[0.03] dark:border-white/[0.06] shadow-2xs"
        : muted
          ? "text-neutral-400 dark:text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
          : "text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-black/[0.035] dark:hover:bg-white/[0.05]"
        }`}
    >
      <Icon size={compact ? 12 : 13.5} className={`shrink-0 z-10 transition-colors duration-150 ${active ? "text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400"}`} />
      <span className="min-w-0 flex-1 z-10 relative">
        <span className={`block truncate ${active ? "font-medium" : "font-normal"}`}>{label}</span>
        {subtitle && <span className="block truncate text-[9.5px] text-neutral-400 dark:text-neutral-500 leading-none mt-0.5">{subtitle}</span>}
      </span>
      {badge !== undefined && badge !== null && (
        typeof badge === "number" ? (
          badge > 0 && (
            <span className="z-10 shrink-0 grid h-3.5 min-w-[14px] place-items-center rounded-full bg-amber-500 px-1 text-[8px] font-bold text-white">
              {badge > 9 ? "9+" : badge}
            </span>
          )
        ) : (
          <span className="z-10 shrink-0 grid h-3.5 min-w-[14px] place-items-center rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-1 text-[8px] font-bold tracking-wider uppercase">
            {badge}
          </span>
        )
      )}
    </motion.button>
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
