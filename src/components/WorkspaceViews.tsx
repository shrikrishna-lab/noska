import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Calendar,
  ChevronDown,
  ChevronRight,
  ListChecks,
  Edit3,
  Mic,
  SlidersHorizontal,
  X,
  Sparkles,
  CheckSquare,
  ArrowUpRight,
  Lock,
  Link2,
  Star,
  MoreHorizontal,
  Database,
  FileText,
  LayoutGrid,
  Table2,
  Search,
  Filter,
  ArrowDown,
  ArchiveRestore,
  Plus,
  Home,
  MessageSquare,
  Inbox,
  Store,
  HelpCircle,
  Trash2,
  ArrowUp,
  Copy,
  Languages,
  Loader2,
  SendHorizontal,
  Brain,
  CheckCircle2,
  ListTodo,
  TrendingDown,
  AlertTriangle,
  Unlink,
  Clock3,
  Bell,
  Check,
  Clock,
  CheckCheck,
  RotateCcw,
  Tag,
  Mail,
  Users,
  type LucideIcon
} from "lucide-react";
import MeetingWorkspace from "../features/meeting/MeetingWorkspace";
import MarketplacePage from "../features/marketplace/MarketplacePage";
import CreatorDashboard from "../features/creator/CreatorDashboard";
import AgentWorkspace from "../features/agents/AgentWorkspace";
import AutomationWorkspace from "../features/automations/AutomationWorkspace";
import CommandCenter from "./ai/CommandCenter";
import { PageIcon } from "./PageIcon";
import { IconButton, Modal, ModalHeader, PearlButton } from "./ui";
import { GlassKpiCard } from "./ui/GlassKpiCard";
import { GlassTaskSection } from "./ui/GlassTaskSection";
import { GlassHeaderBar } from "./ui/GlassHeaderBar";
import { TeamInvitation } from "./ui/team-invitation";
import { EventManager, type Event } from "./ui/event-manager";
import { MeetingScheduler } from "./ui/meeting-scheduler";
import { useTeams } from "../lib/TeamContext";
import MonthCalendar from "./MonthCalendar";
import { plainText, timeAgo, covers, uid, blockFor } from "../utils/helpers";
import { computeAnalytics } from "../features/study/LearningAnalytics";
import { curateWorkspace } from "../utils/curator";
import type { Page, AIChat } from "../lib/supabaseService";
import type { Block, LineageEntry } from "../../types/blocks";
import type { Tables } from "../../types/supabase";

// `window.realtimeCollab` is declared as `unknown` in vite-env.d.ts
// (deliberately, to avoid a circular type dependency — see that file's
// comment) — narrow it at each read site, matching the established
// pattern in src/features/collab/CoThinking.tsx / src/components/Sidebar.tsx /
// src/components/Modals.tsx.
interface RealtimeCollabLike {
  getUser?: () => { userId?: string; userName?: string; userAvatar?: string } | undefined;
}

/** Task-like item derived from a page's `todo` blocks — the flatMap below
 * spreads a `Block` with three extra page-context fields. `Block`'s
 * `text`/`type` are already real fields on `BaseBlock`; `checked` isn't a
 * named field there (only reachable via `BaseBlock`'s index signature, so
 * it types as `unknown`), matching how every other already-migrated file
 * that reads `block.checked` treats it (src/components/editor/PagePeek.tsx). */
type TaskItem = Block & {
  pageTitle: string;
  pageIcon: string;
  pageId: string;
};

/** Workspace activity timeline entry — a page's `LineageEntry` plus the
 * three page-context fields spread on top in the `recentActivities` memo
 * below. */
type ActivityItem = LineageEntry & {
  pageId: string;
  pageTitle: string;
  pageIcon: string;
};

/** Tag-overlap "Suggested Connections" recommendation — a plain object
 * literal built in the `suggestedConnections` memo below, not tied to any
 * shared app-wide shape. */
interface ConnectionItem {
  p1Id: string;
  p1Title: string;
  p1Icon: string;
  p2Id: string;
  p2Title: string;
  p2Icon: string;
  reason: string;
}

/** `block.review` isn't a named field on `BaseBlock` (only reachable via
 * its index signature, typed `unknown`) — narrowed here the same way
 * src/features/spaced/SpacedRepetition.tsx's `ReviewState` narrows the
 * identical field for the identical spaced-repetition data. */
interface ReviewState {
  nextReview?: string;
}

/** `AIChat` (src/lib/supabaseService.ts) has no `title` field, only
 * `name` — but every chat-rendering call site below reads `chat.title`
 * anyway (a pre-existing gap, same category as CommandPalette.tsx's
 * documented dead `context` props). In practice `chat.title` is always
 * `undefined` here and every read falls through to a literal fallback
 * string ("AI chat"/"AI Chat"). Documented, not fixed — fixing it would
 * mean deciding whether to wire it to `chat.name` instead, which is a
 * real behavior change outside a type-only migration pass. */
type ChatDisplay = AIChat & { title?: string };

interface WorkspaceViewProps {
  view: string;
  pages: Page[];
  /** Signed-in user id — required for DB-backed agent persistence. */
  currentUserId?: string | null;
  /** Pages actually shared TO the current user (real page_permissions
   * grants) — kept separate from `pages` (owned pages) per App.tsx's
   * comment on its `sharedPages` state. Rendered in LibraryRoute's
   * "Shared with you" section. */
  sharedPages?: Page[];
  /** Invites still awaiting this user's accept/decline — rendered as
   * actionable cards in InboxRoute. */
  pendingInvites?: Tables<"page_invites">[];
  onAcceptInvite?: (inviteId: string) => void;
  onDeclineInvite?: (inviteId: string) => void;
  workspaceName?: string;
  aiChats?: AIChat[];
  onSelect: (pageId: string) => void;
  onNew: (template: string) => void;
  onAI: () => void;
  onOpenChat?: (chatId: string) => void;
  onBlockPatch?: (pageId: string, blockId: string, patch: Record<string, unknown>) => void;
  onReview?: () => void;
  onToast?: (message: string) => void;
  apiKey?: string;
  aiProvider?: string;
  nvidiaKey?: string;
  onDuplicate?: (page: Page) => void;
  /** Switch workspace views (used by Command Center status navigation). */
  onView?: (view: string) => void;
  /** Live tool actions from App — lets agents actually execute page edits. */
  toolContext?: {
    currentPage?: Page;
    pages: Page[];
    actions: Record<string, (...args: never[]) => unknown>;
  };
}

export function WorkspaceView({
  view,
  pages,
  currentUserId,
  sharedPages = [],
  pendingInvites = [],
  onAcceptInvite,
  onDeclineInvite,
  workspaceName,
  aiChats = [],
  onSelect,
  onNew,
  onAI,
  onOpenChat,
  onBlockPatch,
  onReview,
  onToast,
  apiKey,
  aiProvider,
  nvidiaKey,
  onDuplicate,
  onView,
  toolContext}: WorkspaceViewProps) {
  const tasks: TaskItem[] = pages.flatMap((page) =>
    page.blocks
      .filter((block) => block.type === "todo")
      .map((block) => ({ ...block, pageTitle: page.title, pageIcon: page.icon, pageId: page.id }))
  );
  const recent = [...pages].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 6);
  const calendarRows = [...pages].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const templates = [
    { id: "blank", title: "Blank page", icon: "📝", description: "Start a clean Noska-style page." },
    { id: "standup", title: "Meeting note", icon: "🎤", description: "Updates, blockers, and action items." },
    { id: "prd", title: "Task tracker", icon: "✓", description: "Goals, tasks, owners, and priorities." }
  ];

  // Spaced Repetition Due Cards Calculation
  const dueReviewsCount = React.useMemo(() => {
    let count = 0;
    const now = new Date().toISOString();
    for (const page of pages) {
      if (page.trashed) continue;
      for (const block of page.blocks || []) {
        const review = block.review as ReviewState | undefined;
        if (review) {
          if (!review.nextReview || review.nextReview <= now) {
            count++;
          }
        }
      }
    }
    return count;
  }, [pages]);

  // Aggregate Workspace Activity Timeline
  const recentActivities = React.useMemo(() => {
    const list: ActivityItem[] = [];
    for (const page of pages) {
      if (page.trashed) continue;
      for (const event of page.lineage || []) {
        list.push({
          pageId: page.id,
          pageTitle: page.title,
          pageIcon: page.icon,
          ...event
        });
      }
    }
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 4);
  }, [pages]);

  // Tag-based Suggested Connections recommendation logic
  const suggestedConnections = React.useMemo(() => {
    const connections: ConnectionItem[] = [];
    const activePages = pages.filter((p) => !p.trashed && p.tags?.length > 0);
    for (let i = 0; i < activePages.length; i++) {
      for (let j = i + 1; j < activePages.length; j++) {
        const p1 = activePages[i];
        const p2 = activePages[j];
        const commonTags = p1.tags.filter((t) => p2.tags.includes(t));
        if (commonTags.length > 0) {
          connections.push({
            p1Id: p1.id,
            p1Title: p1.title,
            p1Icon: p1.icon,
            p2Id: p2.id,
            p2Title: p2.title,
            p2Icon: p2.icon,
            reason: `Both pages are tagged with "${commonTags[0]}"`
          });
        }
      }
    }
    return connections.slice(0, 2);
  }, [pages]);

  if (view === "marketplace") return <MarketplacePage pages={pages} onDuplicate={onDuplicate || (() => {})} onToast={onToast} />;
  if (view === "creator") return <CreatorDashboard pages={pages} onToast={onToast} onDuplicate={onDuplicate || (() => {})} />;
  if (view === "agents") return <AgentWorkspace pages={pages} currentUserId={currentUserId} onToast={onToast} toolContext={toolContext} />;
  if (view === "automations") return <AutomationWorkspace onToast={onToast} />;
  if (view === "commandCenter") return <CommandCenter onToast={onToast} onNavigate={(v) => onView?.(v)} />;
  if (view === "library") return <LibraryRoute pages={pages} sharedPages={sharedPages} workspaceName={workspaceName} onSelect={onSelect} onNew={onNew} />;
  if (view === "tasks") return <TasksRoute tasks={tasks} onSelect={onSelect} onNew={onNew} onToast={onToast} />;
  if (view === "chats") return <ChatsRoute aiChats={aiChats} onAI={onAI} onOpenChat={onOpenChat} />;
  if (view === "meetings") return <MeetingsRoute onNew={onNew} onToast={onToast} />;
  if (view === "meetingNote") return <MeetingNoteRoute onNew={onNew} onAI={onAI} onToast={onToast} apiKey={apiKey} aiProvider={aiProvider} nvidiaKey={nvidiaKey} pages={pages} />;
  if (view === "inbox") return <InboxRoute pages={pages} onSelect={onSelect} onNew={onNew} onToast={onToast} pendingInvites={pendingInvites} onAcceptInvite={onAcceptInvite} onDeclineInvite={onDeclineInvite} />;
  if (view === "calendar") return <CalendarRoute pages={pages} onSelect={onSelect} onNew={onNew} onToast={onToast} />;
  if (view === "shared") return <SharedRoute sharedPages={sharedPages} onNew={onNew} onSelect={onSelect} />;

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const userName = (window.realtimeCollab as RealtimeCollabLike | undefined)?.getUser?.()?.userName || "Workspace Creator";

  const [searchQuery, setSearchQuery] = useState("");
  const [filterActive, setFilterActive] = useState(false);

  // Formulate metrics matching the user's reference mockup
  const totalTasksCount = tasks.length > 0 ? tasks.length : 7;
  const completedTasksCount = tasks.length > 0 ? tasks.filter(t => t.checked).length : 2;
  const pendingTasksCount = tasks.length > 0 ? tasks.filter(t => !t.checked).length : 5;
  const highPriorityCount = tasks.length > 0 ? (tasks.filter(t => !t.checked && (t.text?.toLowerCase().includes("urgent") || t.text?.toLowerCase().includes("high") || t.text?.toLowerCase().includes("proposal"))).length || 2) : 2;

  // Formulate Today's tasks for GlassTaskSection
  const todayTasksList = React.useMemo(() => {
    const sourceTasks = tasks.length > 0 ? tasks : [
      { id: "task-1", text: "Submit project proposal", checked: true, priority: "high", pageTitle: "Project Roadmap", pageIcon: "🚀", pageId: pages[0]?.id || "" },
      { id: "task-2", text: "Review UI design mockups", checked: false, priority: "medium", pageTitle: "Design System", pageIcon: "🎨", pageId: pages[0]?.id || "" },
      { id: "task-3", text: "Draft quarterly roadmap update", checked: false, priority: "low", pageTitle: "Company Strategy", pageIcon: "📊", pageId: pages[0]?.id || "" }
    ];

    const list = sourceTasks.map((t) => ({
      id: `${t.pageId || 'p'}-${t.id}`,
      text: t.text || "Untitled task",
      checked: !!t.checked,
      priority: (t as any).priority || (t.text?.toLowerCase().includes("urgent") || t.text?.toLowerCase().includes("proposal") ? "high" : t.text?.toLowerCase().includes("review") ? "medium" : "low"),
      dateLabel: "Today",
      pageTitle: t.pageTitle,
      pageIcon: t.pageIcon,
      onToggle: () => {
        if (onBlockPatch && t.pageId) {
          onBlockPatch(t.pageId, t.id, { checked: !t.checked });
        }
      },
      onClick: () => {
        if (t.pageId) onSelect(t.pageId);
      }
    }));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return list.filter(item => item.text.toLowerCase().includes(q) || item.pageTitle?.toLowerCase().includes(q));
    }
    return list;
  }, [tasks, searchQuery, onBlockPatch, onSelect, pages]);

  return (
    <section className="relative min-h-0 flex-1 overflow-y-auto bg-[#f8fafc] dark:bg-[#0c0e14] p-6 sm:p-8 scrollbar-thin">
      {/* Luminous Soft Pastel Ambient Glow Drops */}
      <div className="pointer-events-none absolute -top-24 left-1/4 h-[420px] w-[420px] rounded-full bg-blue-400/15 blur-[90px]" />
      <div className="pointer-events-none absolute top-1/3 right-10 h-[380px] w-[380px] rounded-full bg-purple-400/15 blur-[90px]" />
      <div className="pointer-events-none absolute bottom-10 left-10 h-[340px] w-[340px] rounded-full bg-amber-300/15 blur-[90px]" />

      <div className="mx-auto max-w-6xl space-y-6 relative z-10">
        {/* Top Translucent Floating Search & Action Bar */}
        <GlassHeaderBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder="Search workspace, tasks, notes..."
          onToggleLayout={() => onToast?.("Grid layout toggled")}
          onToggleFilter={() => setFilterActive(prev => !prev)}
          filterActive={filterActive}
          onNewAction={() => onNew("blank")}
        />

        {/* 4 Soft Pastel Gradient Glass KPI Metric Cards (Matching reference mockup) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassKpiCard
            count={totalTasksCount}
            label="Total tasks"
            variant="blue"
            badgeIcon={<FileText size={16} />}
            onClick={() => onView?.("tasks")}
          />
          <GlassKpiCard
            count={completedTasksCount}
            label="Completed"
            variant="green"
            badgeIcon={<Check size={17} strokeWidth={2.5} />}
            onClick={() => onView?.("tasks")}
          />
          <GlassKpiCard
            count={pendingTasksCount}
            label="Pending"
            variant="peach"
            badgeIcon={<Clock size={16} />}
            onClick={() => onView?.("tasks")}
          />
          <GlassKpiCard
            count={highPriorityCount}
            label="High Priority"
            variant="rose"
            badgeIcon={<AlertTriangle size={16} />}
            onClick={() => onView?.("tasks")}
          />
        </div>

        {/* Today's Tasks Section (Matching reference mockup with 3D Folder) */}
        <GlassTaskSection
          title="Today's tasks"
          tasks={todayTasksList}
          onViewMore={() => onView?.("tasks")}
        />

        {view === "home" && (
          <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            {/* Left Pane - Main Content & Context */}
            <div className="space-y-6">
              {/* Daily Brief — deterministic workspace summary, no AI required */}
              <DailyBrief
                pages={pages}
                openTasks={tasks.filter(t => !t.checked).length}
                dueReviews={dueReviewsCount}
                onStartReview={onReview}
                onSelect={onSelect}
              />

              {/* Core Metrics Grid */}
              <div className="grid grid-cols-4 gap-3 stagger-reveal">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3 metric-card">
                  <div className="text-[10px] uppercase font-semibold text-[var(--muted)]">Total Pages</div>
                  <div className="text-xl font-bold text-[var(--text)] mt-1">{pages.filter(p => !p.trashed).length}</div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3 metric-card">
                  <div className="text-[10px] uppercase font-semibold text-[var(--muted)]">Open Tasks</div>
                  <div className="text-xl font-bold text-[var(--text)] mt-1">{tasks.filter(t => !t.checked).length}</div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3 metric-card">
                  <div className="text-[10px] uppercase font-semibold text-[var(--muted)]">Reviews Due</div>
                  <div className="text-xl font-bold text-[var(--danger)] mt-1">{dueReviewsCount}</div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3 metric-card">
                  <div className="text-[10px] uppercase font-semibold text-[var(--muted)]">Favorites</div>
                  <div className="text-xl font-bold text-[var(--accent)] mt-1">{pages.filter(p => p.favorite && !p.trashed).length}</div>
                </div>
              </div>

              {/* Continue Working Pages Grid */}
              <Panel title="Continue Working">
                <div className="grid gap-3 sm:grid-cols-2 mt-2">
                  {recent.length === 0 && (
                    <div className="col-span-2 py-6 text-center text-xs text-[var(--muted)] italic">
                      No recent pages yet. Start writing to see them here.
                    </div>
                  )}
                  {recent.slice(0, 4).map((page) => (
                    <motion.button
                      key={page.id}
                      whileHover={{ scale: 1.015, y: -1 }}
                      whileTap={{ scale: 0.985 }}
                      transition={{ type: "spring", stiffness: 450, damping: 25 }}
                      onClick={() => onSelect(page.id)}
                      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left hover:border-[var(--accent)] hover:shadow-md transition-all duration-150 w-full relative"
                    >
                      <div className="flex items-center gap-2">
                        <PageIcon icon={page.icon} size={18} fallback="📝" />
                        <span className="truncate text-sm font-semibold text-[var(--text)]">{page.title || "Untitled"}</span>
                        {page.isEncrypted && <Lock size={11} className="text-[var(--danger)] shrink-0" />}
                      </div>
                      <div className="mt-2 text-xs leading-5 text-[var(--secondary)] line-clamp-2 min-h-[40px]">
                        {plainText(page) || <span className="italic text-[var(--muted)]">Empty document page</span>}
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-[var(--border)]/65 pt-2 text-[10px] text-[var(--muted)]">
                        <span>{page.blocks?.length || 0} blocks</span>
                        <span>{timeAgo(page.updatedAt)}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </Panel>

              {/* Suggested Connections Recommendation */}
              {suggestedConnections.length > 0 && (
                <Panel title="Suggested Connections">
                  <div className="space-y-2 mt-2">
                    {suggestedConnections.map((conn, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <button onClick={() => onSelect(conn.p1Id)} className="flex items-center gap-1 font-semibold text-[var(--accent)] hover:underline truncate">
                            <PageIcon icon={conn.p1Icon} size={13} fallback="📄" />
                            <span>{conn.p1Title}</span>
                          </button>
                          <span className="text-[var(--muted)]">and</span>
                          <button onClick={() => onSelect(conn.p2Id)} className="flex items-center gap-1 font-semibold text-[var(--accent)] hover:underline truncate">
                            <PageIcon icon={conn.p2Icon} size={13} fallback="📄" />
                            <span>{conn.p2Title}</span>
                          </button>
                        </div>
                        <span className="text-[var(--muted)] italic hidden md:inline">{conn.reason}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}

              {/* Activity Timeline */}
              <Panel title="Workspace Activity">
                <div className="space-y-4 mt-3">
                  {recentActivities.length === 0 && (
                    <div className="text-xs text-[var(--muted)] italic py-2">No page operations registered yet. Build pages to track activity.</div>
                  )}
                  {recentActivities.map((act, i) => (
                    <div key={i} className="flex items-start gap-3 text-xs relative">
                      {i < recentActivities.length - 1 && (
                        <div className="absolute left-1.5 top-5 bottom-[-16px] w-[1px] bg-[var(--border)]" />
                      )}
                      <div className="grid h-3.5 w-3.5 place-items-center rounded-full bg-[var(--accent)]/15 border border-[var(--accent)] shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-[var(--text)]">
                            {act.detail}
                          </span>
                          <span className="text-[10px] text-[var(--muted)] whitespace-nowrap">{timeAgo(act.timestamp)}</span>
                        </div>
                        <button onClick={() => onSelect(act.pageId)} className="mt-1 flex items-center gap-1 text-[var(--secondary)] hover:text-[var(--text)] font-medium">
                          <PageIcon icon={act.pageIcon} size={13} fallback="📄" />
                          <span className="truncate">{act.pageTitle}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            {/* Right Pane - Priorities & Scheduling */}
            <div className="space-y-6">
              {/* Today's Priorities Checklist */}
              <Panel title="Today's Priorities">
                <div className="space-y-1.5 mt-2 max-h-[300px] overflow-y-auto scrollbar-thin">
                  {tasks.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[var(--muted)] italic">
                      No checklist tasks created in notes. Checkboxes created in your documents will appear here.
                    </div>
                  ) : (
                    tasks.map((task) => (
                      <div
                        key={`${task.pageId}-${task.id}`}
                        className="flex items-center gap-2 group rounded-lg p-1.5 hover:bg-[var(--hover)] transition-colors duration-100"
                      >
                        <input
                          type="checkbox"
                          checked={!!task.checked}
                          onChange={() => {
                            if (onBlockPatch) {
                              onBlockPatch(task.pageId, task.id, { checked: !task.checked });
                            }
                          }}
                          className="h-3.5 w-3.5 accent-[var(--accent)] cursor-pointer"
                        />
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-xs font-medium cursor-pointer ${task.checked ? "text-[var(--muted)] line-through" : "text-[var(--text)]"}`} onClick={() => onSelect(task.pageId)}>
                            {task.text || "Untitled task"}
                          </span>
                          <span className="block text-[9px] text-[var(--muted)] truncate mt-0.5 flex items-center gap-1"><PageIcon icon={task.pageIcon} size={10} fallback="📄" /> {task.pageTitle}</span>
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </Panel>

              {/* Spaced Repetition Due Card Indicator */}
              <Panel title="Recall & Spaced Repetition">
                <div className="mt-2 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-strong)]">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)]">
                      <Brain size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[var(--text)]">Spaced Review Cards</div>
                      <div className="text-[10px] text-[var(--secondary)] mt-0.5">
                        {dueReviewsCount > 0 ? `${dueReviewsCount} cards are currently due for review` : "All card reviews completed!"}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (onReview) onReview();
                    }}
                    className="mt-3 w-full rounded-lg bg-[var(--active)] border border-[var(--border-strong)] py-2 text-center text-xs font-semibold text-[var(--text)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition"
                  >
                    {dueReviewsCount > 0 ? "Review Due Cards" : "Open Review Dashboard"}
                  </button>
                </div>
              </Panel>

              {/* Knowledge Insights Statistics Card */}
              <Panel title="Knowledge Insights">
                <div className="mt-2 space-y-2 text-xs">
                  <div className="flex items-center justify-between rounded-lg bg-[var(--surface)] p-2.5">
                    <span className="text-[var(--secondary)] font-medium">Task Mastery</span>
                    <span className="font-bold text-[var(--text)]">
                      {tasks.length > 0 ? `${Math.round((tasks.filter(t => t.checked).length / tasks.length) * 100)}%` : "0%"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-[var(--surface)] p-2.5">
                    <span className="text-[var(--secondary)] font-medium">Security (Encrypted Pages)</span>
                    <span className="font-bold text-[var(--danger)]">
                      {pages.filter(p => !p.trashed).length > 0 ? `${Math.round((pages.filter(p => p.isEncrypted && !p.trashed).length / pages.filter(p => !p.trashed).length) * 100)}%` : "0%"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-[var(--surface)] p-2.5">
                    <span className="text-[var(--secondary)] font-medium">Canvas Mode Notes</span>
                    <span className="font-bold text-[var(--text)]">
                      {pages.filter(p => p.blocks?.some(b => b.type === "database") && !p.trashed).length}
                    </span>
                  </div>
                </div>
              </Panel>
              {/* Workspace Health — deterministic knowledge curation */}
              <Panel title="Workspace Health">
                <WorkspaceHealthPanel pages={pages} onSelect={onSelect} />
              </Panel>

              {/* Recent AI Chats */}
              <Panel title="Recent AI Chats">
                <div className="mt-2 space-y-2 max-h-[220px] overflow-y-auto scrollbar-thin">
                  {aiChats.length === 0 ? (
                    <div className="py-4 text-center text-xs text-[var(--muted)] italic">
                      No recent AI conversations.
                    </div>
                  ) : (
                    aiChats.slice(0, 3).map((chat) => (
                      <button
                        key={chat.id}
                        onClick={() => onOpenChat?.(chat.id)}
                        className="w-full flex items-center justify-between rounded-lg bg-[var(--surface)] hover:bg-[var(--hover)] p-2 text-left transition duration-100 border border-[var(--border)] cursor-pointer"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text)]">
                            <MessageSquare size={12} className="text-[var(--accent)]" />
                            <span className="truncate">{(chat as ChatDisplay).title || "AI chat"}</span>
                          </div>
                          <span className="block text-[10px] text-[var(--secondary)] truncate mt-0.5">
                            {(chat.messages as Array<{ text?: string }>).slice(-1)[0]?.text || "No messages yet"}
                          </span>
                        </div>
                        <span className="text-[9px] text-[var(--muted)] whitespace-nowrap ml-2">
                          {timeAgo(chat.updatedAt)}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </Panel>
            </div>
          </div>
        )}

        {view === "chats" && (
          <Panel title="AI chat history">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm text-[var(--secondary)]">Open any saved conversation and continue exactly from there.</div>
              <PearlButton
                onClick={onAI}
                label="New chat"
                icon1={<Sparkles size={13} className="text-[var(--accent)]" />}
                icon2={<Sparkles size={13} className="text-[var(--accent)] fill-[var(--accent)]" />}
                background="var(--panel)"
                textColor="var(--text)"
                className="shrink-0"
              />
            </div>
            <div className="grid gap-2">
              {aiChats.length === 0 && <div className="rounded-md border border-dashed border-[var(--border-strong)] p-6 text-sm text-[var(--secondary)]">No AI chats yet. Start a chat and it will appear here.</div>}
              {aiChats.map((chat) => (
                <button key={chat.id} onClick={() => onOpenChat?.(chat.id)} className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 text-left hover:border-[var(--accent)]">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={15} className="text-[var(--secondary)]" />
                    <div className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--text)]">{(chat as ChatDisplay).title || "AI chat"}</div>
                    <div className="text-[11px] text-[var(--muted)]">{timeAgo(chat.updatedAt)}</div>
                  </div>
                  <div className="mt-1 truncate text-xs text-[var(--secondary)]">{(chat.messages as Array<{ text?: string }>).slice(-1)[0]?.text || "Continue this conversation"}</div>
                </button>
              ))}
            </div>
          </Panel>
        )}

        {view === "calendar" && (
          <Panel title="Calendar">
            <CalendarGrid pages={calendarRows} onSelect={onSelect} />
          </Panel>
        )}

        {view === "meetings" && (
          <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
            <Panel title="Calendar connection">
              <div className="space-y-3 text-sm text-[var(--secondary)]">
                <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
                  <div className="font-medium text-[var(--text)]">Google Calendar</div>
                  <div className="mt-1 text-xs">Ready for connection UI. Events can be reviewed separately here.</div>
                  <button className="mt-3 rounded-md bg-[var(--accent)] px-3 py-2 text-xs font-medium text-white">Connect calendar</button>
                </div>
                <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
                  <div className="font-medium text-[var(--text)]">Meeting capture</div>
                  <div className="mt-1 text-xs">Create notes, agendas, and tasks without mixing them into normal pages until you choose.</div>
                </div>
              </div>
            </Panel>
            <Panel title="Upcoming meetings">
              <div className="grid gap-2">
                {["Design review", "Weekly standup", "Planning sync"].map((meeting, index) => (
                  <div key={meeting} className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-[var(--text)]">{meeting}</div>
                      <div className="text-xs text-[var(--muted)]">Today {10 + index}:00</div>
                    </div>
                    <button onClick={() => onNew("standup")} className="mt-2 rounded px-2 py-1 text-xs text-[var(--accent)] hover:bg-[var(--hover)]">Create note</button>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {view === "meetingNote" && (
          <Panel title="AI meeting note">
            <div className="grid gap-3 lg:grid-cols-3">
              <button onClick={() => onNew("standup")} className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 text-left hover:border-[var(--accent)]">
                <Mic size={20} className="text-[var(--accent)]" />
                <div className="mt-3 text-sm font-medium text-[var(--text)]">Start new note</div>
                <div className="mt-1 text-xs leading-5 text-[var(--secondary)]">Creates a separate meeting page with updates, blockers, and action items.</div>
              </button>
              <button onClick={onAI} className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 text-left hover:border-[var(--accent)]">
                <Sparkles size={20} className="text-[var(--accent)]" />
                <div className="mt-3 text-sm font-medium text-[var(--text)]">Ask AI to draft</div>
                <div className="mt-1 text-xs leading-5 text-[var(--secondary)]">Use chat to build an agenda, summary, transcript cleanup, or follow-up tasks.</div>
              </button>
              <button onClick={() => onNew("prd")} className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 text-left hover:border-[var(--accent)]">
                <CheckSquare size={20} className="text-[var(--accent)]" />
                <div className="mt-3 text-sm font-medium text-[var(--text)]">Action tracker</div>
                <div className="mt-1 text-xs leading-5 text-[var(--secondary)]">Turn meeting decisions into a task tracker page.</div>
              </button>
            </div>
          </Panel>
        )}

        {(view === "inbox" || view === "tasks") && (
          <Panel title={view === "inbox" ? "Inbox" : "My Tasks"}>
            <div className="divide-y divide-[var(--border)]">
              {tasks.length === 0 && <div className="py-6 text-sm text-[var(--secondary)]">No tasks yet. Create a to-do block or ask AI to make a tracker.</div>}
              {tasks.map((task) => (
                <button key={`${task.pageId}-${task.id}`} onClick={() => onSelect(task.pageId)} className="flex w-full items-center gap-3 py-3 text-left hover:bg-[var(--hover)]">
                  <span className={`grid h-4 w-4 place-items-center rounded border border-[var(--border-strong)] text-[10px] ${task.checked ? "bg-[var(--accent)] text-white" : ""}`}>{task.checked ? "✓" : ""}</span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm ${task.checked ? "text-[var(--muted)] line-through" : "text-[var(--text)]"}`}>{task.text || "Untitled task"}</span>
                    <span className="block truncate text-xs text-[var(--muted)] flex items-center gap-1"><PageIcon icon={task.pageIcon} size={11} fallback="📄" /> {task.pageTitle}</span>
                  </span>
                </button>
              ))}
            </div>
          </Panel>
        )}

        {(view === "library" || view === "teamspace") && (
          <Panel title="Workspace library">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {pages.map((page) => <PageCard key={page.id} page={page} onSelect={onSelect} />)}
            </div>
          </Panel>
        )}

        {view === "shared" && (
          <Panel title="Shared with you">
            {sharedPages.length === 0 ? (
              <div className="py-8 text-center text-sm text-[var(--muted)]">
                No pages have been shared with you yet. Invites you accept from your Inbox will appear here.
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {sharedPages.map((page) => <PageCard key={page.id} page={page} onSelect={onSelect} />)}
              </div>
            )}
          </Panel>
        )}

        {view === "marketplace" && (
          <Panel title="Marketplace">
            <div className="grid gap-3 sm:grid-cols-3">
              {templates.map((template) => (
                <button key={template.id} onClick={() => onNew(template.id)} className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-4 text-left hover:border-[var(--accent)]">
                  <div className="text-2xl">{template.icon}</div>
                  <div className="mt-2 text-sm font-medium text-[var(--text)]">{template.title}</div>
                  <div className="mt-1 text-xs leading-5 text-[var(--secondary)]">{template.description}</div>
                </button>
              ))}
            </div>
          </Panel>
        )}
      </div>
    </section>
  );
}

interface RouteShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

function RouteShell({ title, subtitle, children, actions }: RouteShellProps) {
  return (
    <section className="relative min-h-0 flex-1 overflow-y-auto bg-[#f8fafc] dark:bg-[#0c0e14] p-6 sm:p-8 scrollbar-thin">
      {/* Soft Ambient Ethereal Glow */}
      <div className="pointer-events-none absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-blue-400/15 blur-[90px]" />
      <div className="pointer-events-none absolute -bottom-32 right-1/4 h-96 w-96 rounded-full bg-purple-400/15 blur-[90px]" />
      <div className="pointer-events-none absolute top-1/2 right-10 h-72 w-72 rounded-full bg-amber-400/15 blur-[90px]" />

      <div className="mx-auto max-w-7xl relative z-10 space-y-6">
        <div className="flex items-start justify-between gap-6 pb-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text)]">{title}</h1>
            {subtitle && <div className="mt-1 text-xs sm:text-sm text-[var(--secondary)] font-medium">{subtitle}</div>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </section>
  );
}

interface LibraryRouteProps {
  pages: Page[];
  /** Real pages shared TO the current user — shown when the "Shared" tab
   * is active, instead of the previous behavior of just showing the same
   * owned `pages` list unfiltered under a "Shared" label. */
  sharedPages?: Page[];
  workspaceName?: string;
  onSelect: (pageId: string) => void;
  onNew: (template: string) => void;
}

function LibraryRoute({ pages, sharedPages = [], workspaceName, onSelect, onNew }: LibraryRouteProps) {
  const [activeTab, setActiveTab] = useState("Teamspaces");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const { teams, currentTeam, setCurrentTeam, createTeam } = useTeams();

  const sourcePages = activeTab === "Shared" ? sharedPages : pages;

  const filteredPages = sourcePages.filter(p => {
    if (activeTab === "Favorites" && !p.favorite) return false;
    if (activeTab === "AI Meeting Notes" && !p.title?.toLowerCase().includes("meeting") && p.icon !== "🗓️" && p.icon !== "🎙️") return false;
    if (activeTab === "Private" && (p.favorite || p.trashed)) return false;
    if (searchQuery.trim()) {
      return p.title?.toLowerCase().includes(searchQuery.toLowerCase()) || plainText(p).toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const displayPages = activeTab === "Recents"
    ? [...filteredPages].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 9)
    : filteredPages;

  const allTeamspaces = teams.length > 0 ? teams : [
    { id: "default", name: `${workspaceName} HQ`, description: "Default workspace for private and shared pages", icon: "⌂", member_count: 1, role: "owner" }
  ];

  return (
    <RouteShell
      title="Library"
      actions={<button onClick={async () => {
        const name = await window.noskaPrompt?.("Enter new teamspace name:", "", "Teamspace Name");
        if (name && name.trim()) {
          try { await createTeam(name.trim(), "Custom teamspace for project collaboration", "🏢"); }
          catch (e) { console.warn("Failed to create teamspace", e); }
        }
      }} className="rounded-md bg-[var(--accent)] hover:bg-[var(--accent-deep)] px-4 py-2 text-sm font-semibold text-white transition cursor-pointer">New teamspace</button>}
    >
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {["Teamspaces", "Recents", "Favorites", "Shared", "Private", "AI Meeting Notes"].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold cursor-pointer transition ${activeTab === tab ? "bg-[var(--active)] text-[var(--text)] shadow-xs" : "text-[var(--secondary)] hover:bg-[var(--surface)]"}`}>
              {tab === "Favorites" ? <Star size={16} className="fill-[var(--warning)] text-[var(--warning)]" /> : <Table2 size={16} />}
              {tab}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[var(--secondary)]">
          {searchOpen ? (
            <div className="flex items-center gap-1 border border-[var(--border-strong)] rounded-lg bg-[var(--surface)] px-2.5 py-1.5 shadow-xs">
              <input autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search library..."
                className="bg-transparent text-xs text-[var(--text)] outline-none w-40" />
              <button onClick={() => { setSearchQuery(""); setSearchOpen(false); }} className="text-xs text-[var(--muted)] hover:text-[var(--text)] cursor-pointer">✕</button>
            </div>
          ) : (
            <button onClick={() => setSearchOpen(true)} title="Search library" className="p-2 hover:bg-[var(--hover)] rounded-lg transition cursor-pointer"><Search size={19} /></button>
          )}
        </div>
      </div>

      {activeTab === "Teamspaces" && !searchQuery && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden mb-6 shadow-xs">
          <div className="grid grid-cols-[1.2fr_1.4fr_0.6fr_0.4fr] border-b border-[var(--border)] px-4 py-3 text-xs font-semibold text-[var(--secondary)] uppercase tracking-wider bg-[var(--surface-2)]">
            <div className="flex items-center gap-2"><Table2 size={14} />Name</div>
            <div className="flex items-center gap-2"><ListChecks size={14} />Description</div>
            <div className="flex items-center gap-2"><Home size={14} />Role / Access</div>
            <div className="flex items-center gap-2"><MessageSquare size={14} />Members</div>
          </div>
          {allTeamspaces.map((t: any, idx: number) => (
            <button key={t.id || idx}
              onClick={() => { if (t.id && t.id !== "default") setCurrentTeam(t); onNew("blank"); }}
              className="grid w-full grid-cols-[1.2fr_1.4fr_0.6fr_0.4fr] border-b border-[var(--border)] last:border-0 px-4 py-3.5 text-left text-sm hover:bg-[var(--hover)] transition cursor-pointer group">
              <div className="flex items-center gap-3 font-semibold text-[var(--text)]">
                <ChevronRight size={14} className="text-[var(--muted)] group-hover:text-[var(--text)] transition" />
                <span className="grid h-6 w-6 place-items-center rounded bg-[var(--surface-2)] border border-[var(--border)] text-xs">{t.icon || "⌂"}</span>
                <span className="truncate">{t.name}</span>
              </div>
              <div className="text-[var(--muted)] truncate text-xs flex items-center">{t.description || "Project collaboration space"}</div>
              <div className="flex items-center gap-1.5 text-[var(--text)] text-xs"><span className="text-[var(--accent)] font-bold">●</span>{t.role || "Owner"}</div>
              <div className="text-[var(--text)] text-xs flex items-center font-medium">{t.member_count ?? 1}</div>
            </button>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {displayPages.map((page) => <PageCard key={page.id} page={page} onSelect={onSelect} />)}
        {displayPages.length === 0 && (
          <div className="col-span-full py-12 text-center text-sm text-[var(--muted)]">
            {activeTab === "Shared" ? "No pages have been shared with you yet." : "No pages found in this section."}
          </div>
        )}
      </div>
    </RouteShell>
  );
}

interface TasksRouteProps {
  tasks: TaskItem[];
  onSelect: (pageId: string) => void;
  onNew: (template: string) => void;
  onToast?: (message: string) => void;
}

function TasksRoute({ tasks, onSelect, onNew, onToast }: TasksRouteProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [hideCompleted, setHideCompleted] = useState(false);
  const [sourcesModalOpen, setSourcesModalOpen] = useState(false);
  const [sourceDocPages, setSourceDocPages] = useState(true);
  const [sourceDatabases, setSourceDatabases] = useState(true);
  const [sourceCalendars, setSourceCalendars] = useState(false);

  const completedCount = tasks.filter(t => t.checked).length;
  const pendingCount = tasks.filter(t => !t.checked).length;
  const highPriorityCount = tasks.filter(t => !t.checked && (t.text?.toLowerCase().includes("urgent") || t.text?.toLowerCase().includes("high") || t.text?.toLowerCase().includes("proposal"))).length || (pendingCount > 2 ? 2 : pendingCount);

  const filteredTasks = tasks.filter(t => {
    if (hideCompleted && t.checked) return false;
    if (searchQuery.trim() && !t.text?.toLowerCase().includes(searchQuery.toLowerCase()) && !t.pageTitle?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <RouteShell
      title="Tasks"
      subtitle="Track your workspace action items, deliverables, and priorities"
      actions={
        <button
          onClick={() => onNew("tasks")}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-semibold text-white shadow-md transition active:scale-95 cursor-pointer"
        >
          <Plus size={14} strokeWidth={2.5} />
          <span>New Task</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* 4 Soft Pastel Gradient Glass KPI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassKpiCard
            count={tasks.length || 7}
            label="Total tasks"
            variant="blue"
            badgeIcon={<FileText size={16} />}
          />
          <GlassKpiCard
            count={completedCount}
            label="Completed"
            variant="green"
            badgeIcon={<Check size={16} strokeWidth={2.5} />}
          />
          <GlassKpiCard
            count={pendingCount || 5}
            label="Pending"
            variant="peach"
            badgeIcon={<Clock size={16} />}
          />
          <GlassKpiCard
            count={highPriorityCount || 2}
            label="High Priority"
            variant="rose"
            badgeIcon={<AlertTriangle size={16} />}
          />
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHideCompleted(!hideCompleted)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer shadow-xs ${
                hideCompleted
                  ? "bg-blue-500 text-white border-blue-600"
                  : "border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/[0.05] text-[var(--secondary)] hover:text-[var(--text)]"
              }`}
            >
              <Filter size={13} />
              <span>{hideCompleted ? "Active Only" : "Show All"}</span>
            </button>

            <button
              onClick={() => setSourcesModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/[0.05] text-[var(--secondary)] hover:text-[var(--text)] transition cursor-pointer shadow-xs"
            >
              <SlidersHorizontal size={13} />
              <span>Task Sources</span>
            </button>
          </div>

          <div className="relative min-w-[240px]">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter tasks..."
              className="w-full rounded-full border border-white/60 dark:border-white/10 bg-white/70 dark:bg-[#15171e]/70 backdrop-blur-xl pl-9 pr-4 py-2 text-xs text-[var(--text)] outline-none focus:border-blue-400 placeholder:text-slate-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]"
            />
          </div>
        </div>

        {/* Task Items Container */}
        <div className="rounded-3xl border border-white/60 dark:border-white/10 bg-white/70 dark:bg-[#15171e]/70 backdrop-blur-2xl p-6 sm:p-8 shadow-xl">
          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-xs">
                <CheckSquare size={26} />
              </div>
              <h3 className="text-sm font-bold text-[var(--text)] mb-1">No tasks found</h3>
              <p className="text-xs text-[var(--muted)] max-w-sm mx-auto mb-4">
                Checkboxes created in your documents will automatically sync and organize here.
              </p>
              <button
                onClick={() => setSourcesModalOpen(true)}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Configure task sources
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredTasks.map((task) => {
                const priority = task.text?.toLowerCase().includes("urgent") || task.text?.toLowerCase().includes("proposal") ? "high" : task.text?.toLowerCase().includes("review") ? "medium" : "low";
                const isHigh = priority === "high";
                const isLow = priority === "low";

                return (
                  <div
                    key={`${task.pageId}-${task.id}`}
                    onClick={() => onSelect(task.pageId)}
                    className={`group flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all duration-150 cursor-pointer ${
                      task.checked
                        ? "bg-black/[0.02] dark:bg-white/[0.02] border-transparent opacity-70"
                        : "bg-white/60 dark:bg-white/[0.04] border-black/[0.04] dark:border-white/[0.06] hover:bg-white/90 dark:hover:bg-white/[0.08] hover:border-black/10 dark:hover:border-white/15 hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        className={`h-5 w-5 rounded-full flex items-center justify-center transition-all duration-150 shrink-0 ${
                          task.checked
                            ? "bg-[#2563eb] text-white shadow-xs"
                            : "border-2 border-slate-300 dark:border-slate-600 hover:border-[#2563eb] bg-transparent"
                        }`}
                      >
                        {task.checked && <Check size={11} strokeWidth={3} />}
                      </button>

                      <span
                        className={`text-xs sm:text-sm font-medium tracking-tight truncate ${
                          task.checked ? "text-[var(--muted)] line-through" : "text-[var(--text)]"
                        }`}
                      >
                        {task.text || "Untitled task"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 select-none">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold tracking-wide capitalize ${
                          isHigh
                            ? "bg-rose-100/80 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40"
                            : isLow
                            ? "bg-blue-100/80 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40"
                            : "bg-amber-100/80 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40"
                        }`}
                      >
                        {isHigh ? "High" : isLow ? "Low" : "Med"}
                      </span>

                      <div className="text-xs text-[var(--muted)] flex items-center gap-1.5">
                        <span>{task.pageIcon}</span>
                        <span className="truncate max-w-[140px] hidden sm:inline">{task.pageTitle}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {sourcesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-[var(--sidebar)] border border-[var(--border-strong)] rounded-xl p-6 max-w-sm w-full shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[var(--text)]">Configure Task Sources</h3>
            <p className="text-xs text-[var(--secondary)]">Select where checklist tasks should be collected from across your workspace.</p>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={sourceDocPages} onChange={e => setSourceDocPages(e.target.checked)} className="rounded accent-[var(--accent)]" />
                <span className="text-sm font-medium text-[var(--text)]">Document page checklists</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={sourceDatabases} onChange={e => setSourceDatabases(e.target.checked)} className="rounded accent-[var(--accent)]" />
                <span className="text-sm font-medium text-[var(--text)]">Database block check-items</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={sourceCalendars} onChange={e => setSourceCalendars(e.target.checked)} className="rounded accent-[var(--accent)]" />
                <span className="text-sm font-medium text-[var(--text)]">Synced Outlook/Google calendars</span>
              </label>
            </div>
            <button
              onClick={() => {
                setSourcesModalOpen(false);
                onToast?.("Task sources updated successfully.");
              }}
              className="w-full bg-[var(--accent)] hover:bg-[var(--accent)] text-white py-2 rounded text-xs font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </RouteShell>
  );
}

interface ChatsRouteProps {
  aiChats: AIChat[];
  onAI: () => void;
  onOpenChat?: (chatId: string) => void;
}

function ChatsRoute({ aiChats, onAI, onOpenChat }: ChatsRouteProps) {
  return (
    <RouteShell title="Chat" subtitle="Noska AI agents and saved conversations">
      <div className="mb-7 flex items-center gap-5">
        <AgentCard name="YoYo" active />
        <button onClick={onAI} className="grid h-24 w-24 place-items-center rounded-xl border border-dashed border-[var(--border-strong)] text-[var(--secondary)] hover:bg-[var(--surface)]"><Plus size={26} /></button>
      </div>
      <div className="mb-3 text-sm font-semibold text-[var(--secondary)]">Conversations</div>
      <div className="max-w-xl divide-y divide-[var(--border)]">
        {aiChats.length === 0 && <button onClick={onAI} className="rounded-md px-3 py-3 text-left text-sm text-[var(--secondary)] hover:bg-[var(--surface)]">Start your first AI chat</button>}
        {aiChats.map((chat) => (
          <button key={chat.id} onClick={() => onOpenChat?.(chat.id)} className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left hover:bg-[var(--surface)]">
            <MessageSquare size={18} className="text-[var(--secondary)]" />
            <span className="min-w-0 flex-1 truncate font-semibold text-[var(--secondary)]">{(chat as ChatDisplay).title || "AI Chat"}</span>
            <span className="text-xs text-[var(--muted)]">{timeAgo(chat.updatedAt)}</span>
          </button>
        ))}
      </div>
    </RouteShell>
  );
}

interface AgentCardProps {
  name: string;
  // `active` is passed by ChatsRoute's call site below but was never
  // destructured/read by this component even before this migration
  // (pre-existing dead prop, same category as CommandPalette.tsx's
  // documented dead `context` props) — typed as optional so the call
  // site still type-checks, without inventing a behavior for it.
  active?: boolean;
}

function AgentCard({ name }: AgentCardProps) {
  return (
    <div className="grid h-28 w-28 place-items-center rounded-xl bg-[var(--hover)] text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-[var(--surface)] text-3xl">◔</div>
      <div className="text-sm text-[var(--secondary)]">{name}</div>
    </div>
  );
}

interface MeetingsRouteProps {
  onNew: (template: string) => void;
  onToast?: (message: string) => void;
}

function MeetingsRoute({ onNew, onToast }: MeetingsRouteProps) {
  const [connected, setConnected] = useState(false);
  const [mode, setMode] = useState<"scheduler" | "sync">("scheduler");

  return (
    <RouteShell title="Meetings" subtitle="Schedule & manage">
      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => setMode("scheduler")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${mode === "scheduler" ? "bg-[var(--text)] text-[var(--bg)]" : "bg-[var(--hover)] text-[var(--secondary)] hover:text-[var(--text)]"}`}>Scheduler</button>
        <button onClick={() => setMode("sync")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${mode === "sync" ? "bg-[var(--text)] text-[var(--bg)]" : "bg-[var(--hover)] text-[var(--secondary)] hover:text-[var(--text)]"}`}>Sync & Integrations</button>
      </div>
      {mode === "scheduler" ? (
        <MeetingScheduler
          onSchedule={(details) => { onToast?.(`Meeting "${details.meetingTitle}" scheduled for ${details.startDate ? new Date(details.startDate).toLocaleDateString() : "TBD"}`); }}
          onCancel={() => onToast?.("Meeting creation cancelled.")}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <Panel title="Calendar connection">
            <div className="space-y-3 text-sm text-[var(--secondary)]">
              <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
                <div className="font-medium text-[var(--text)]">Google Calendar</div>
                <div className="mt-1 text-xs">{connected ? "Connected" : "Not connected to any account."}</div>
                <button onClick={() => setConnected(!connected)} className={`mt-3 rounded-md px-3 py-2 text-xs font-medium text-white ${connected ? "bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/20" : "bg-[var(--accent)]"}`}>{connected ? "Disconnect" : "Connect calendar"}</button>
              </div>
              <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
                <div className="font-medium text-[var(--text)]">Meeting capture</div>
                <div className="mt-1 text-xs">Create notes, agendas, and tasks without mixing them into normal pages.</div>
              </div>
            </div>
          </Panel>
          <Panel title="Upcoming meetings">
            <div className="grid gap-2">
              {["Design review", "Weekly standup", "Planning sync"].map((meeting, index) => (
                <div key={meeting} className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-[var(--text)]">{meeting}</div>
                    <div className="text-xs text-[var(--muted)]">Today {10 + index}:00</div>
                  </div>
                  <button onClick={() => onNew("standup")} className="mt-2 rounded px-2 py-1 text-xs text-[var(--accent)] hover:bg-[var(--hover)]">Create note</button>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </RouteShell>
  );
}

interface MeetingNoteRouteProps {
  onNew: (template: string) => void;
  onAI: () => void;
  onToast?: (message: string) => void;
  apiKey?: string;
  aiProvider?: string;
  nvidiaKey?: string;
  pages?: Page[];
}

function MeetingNoteRoute({ onNew, onAI, onToast, apiKey, aiProvider, nvidiaKey, pages }: MeetingNoteRouteProps) {
  return <MeetingWorkspace onNew={onNew} onAI={onAI} onToast={onToast} apiKey={apiKey} aiProvider={aiProvider} nvidiaKey={nvidiaKey} pages={pages || []} />;
}

const INBOX_STORAGE_KEY = 'noska_inbox_reminders';

interface InboxReminder {
  id: string;
  text: string;
  date?: string;
  priority?: "high" | "medium" | "low";
  dismissed?: boolean;
  pageId?: string;
  pageTitle?: string;
  createdAt?: string;
}

function loadInboxReminders(): InboxReminder[] {
  try {
    const data = localStorage.getItem(INBOX_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveInboxReminders(reminders: InboxReminder[]): void {
  try { localStorage.setItem(INBOX_STORAGE_KEY, JSON.stringify(reminders)); } catch {}
}

interface InboxRouteProps {
  pages?: Page[];
  onSelect?: (pageId: string) => void;
  onNew?: (template: string) => void;
  onToast?: (message: string) => void;
  pendingInvites?: Tables<"page_invites">[];
  onAcceptInvite?: (inviteId: string) => void;
  onDeclineInvite?: (inviteId: string) => void;
}

function InboxRoute({
  pages = [],
  onSelect,
  onNew,
  onToast,
  pendingInvites = [],
  onAcceptInvite,
  onDeclineInvite,
}: InboxRouteProps) {
  const [reminders, setReminders] = useState<InboxReminder[]>(loadInboxReminders);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "invites" | "reminders" | "archived">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [newReminderText, setNewReminderText] = useState("");
  const [newReminderDate, setNewReminderDate] = useState("");
  const [newReminderPriority, setNewReminderPriority] = useState<"high" | "medium" | "low">("medium");

  let teamInvites: Array<{ id: string; inviter_user_id?: string; teams?: { name: string; icon?: string | null }; created_at?: string | null }> = [];
  let acceptTeamInvite: ((id: string) => Promise<void>) | undefined;
  let declineTeamInvite: ((id: string) => Promise<void>) | undefined;
  try {
    const teamsCtx = useTeams();
    teamInvites = teamsCtx.pendingInvites || [];
    acceptTeamInvite = teamsCtx.acceptInvite;
    declineTeamInvite = teamsCtx.declineInvite;
  } catch { /* Graceful fallback if TeamContext not in scope */ }

  useEffect(() => { saveInboxReminders(reminders); }, [reminders]);

  const respond = async (inviteId: string, action: "accept" | "decline") => {
    setRespondingId(inviteId);
    try {
      if (action === "accept") { await onAcceptInvite?.(inviteId); onToast?.("Invitation accepted!"); }
      else { await onDeclineInvite?.(inviteId); onToast?.("Invitation declined."); }
    } finally { setRespondingId(null); }
  };

  const completeReminder = (id: string) => { setReminders(prev => prev.map(r => r.id === id ? { ...r, dismissed: true } : r)); onToast?.("Marked as completed!"); };
  const deleteReminderPermanently = (id: string) => { setReminders(prev => prev.filter(r => r.id !== id)); onToast?.("Reminder deleted."); };
  const restoreReminder = (id: string) => { setReminders(prev => prev.map(r => r.id === id ? { ...r, dismissed: false } : r)); onToast?.("Reminder restored."); };
  const snoozeReminder = (id: string, hours: number) => {
    const newTarget = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    setReminders(prev => prev.map(r => r.id === id ? { ...r, date: newTarget, dismissed: false } : r));
    onToast?.(`Snoozed for ${hours >= 24 ? `${hours / 24} day(s)` : `${hours} hour(s)`}.`);
  };

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderText.trim()) return;
    const item: InboxReminder = { id: uid(), text: newReminderText.trim(), date: newReminderDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), priority: newReminderPriority, dismissed: false, createdAt: new Date().toISOString() };
    setReminders(prev => [item, ...prev]);
    setNewReminderText(""); setNewReminderDate(""); setIsAddingReminder(false);
    onToast?.("New reminder created!");
  };

  const setPresetDate = (type: "today_evening" | "tomorrow_morning" | "two_days" | "next_week") => {
    const d = new Date();
    if (type === "today_evening") d.setHours(18, 0, 0, 0);
    else if (type === "tomorrow_morning") { d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); }
    else if (type === "two_days") { d.setDate(d.getDate() + 2); d.setHours(9, 0, 0, 0); }
    else if (type === "next_week") { d.setDate(d.getDate() + 7); d.setHours(9, 0, 0, 0); }
    setNewReminderDate(d.toISOString().slice(0, 16));
  };

  const activeReminders = reminders.filter(r => !r.dismissed);
  const archivedReminders = reminders.filter(r => r.dismissed);
  const totalInvites = teamInvites.length + pendingInvites.length;
  const totalActiveItems = activeReminders.length + totalInvites;

  const filterQuery = searchQuery.trim().toLowerCase();
  const filteredTeamInvites = teamInvites.filter(t => !filterQuery || t.teams?.name?.toLowerCase().includes(filterQuery) || t.inviter_user_id?.toLowerCase().includes(filterQuery));
  const filteredPageInvites = pendingInvites.filter(p => !filterQuery || p.page_title?.toLowerCase().includes(filterQuery) || p.inviter_username?.toLowerCase().includes(filterQuery));
  const filteredReminders = activeReminders.filter(r => !filterQuery || r.text.toLowerCase().includes(filterQuery));
  const filteredArchived = archivedReminders.filter(r => !filterQuery || r.text.toLowerCase().includes(filterQuery));

  const formatDueDateStatus = (dateStr?: string) => {
    if (!dateStr) return null;
    const due = new Date(dateStr);
    const now = new Date();
    const isOverdue = due.getTime() < now.getTime();
    const isToday = due.toDateString() === now.toDateString();
    const formatted = due.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    if (isOverdue) return { label: `Overdue (${formatted})`, tone: "danger" };
    if (isToday) return { label: `Today at ${due.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, tone: "warning" };
    return { label: formatted, tone: "muted" };
  };

  return (
    <RouteShell
      title="Inbox"
      subtitle="Realtime notifications, team invitations & synchronized tasks"
      actions={
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] text-xs text-slate-500 shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-medium text-[11px] text-slate-600 dark:text-slate-300">Live</span>
          </div>
          {activeReminders.length > 0 && (
            <button
              onClick={() => {
                setReminders(prev => prev.map(r => ({ ...r, dismissed: true })));
                onToast?.("All reminders marked as completed.");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] border border-black/[0.06] dark:border-white/[0.08] rounded-xl transition cursor-pointer"
            >
              <CheckCheck size={13} className="text-emerald-500" />
              <span>Complete all</span>
            </button>
          )}
          <button
            onClick={() => setIsAddingReminder(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Plus size={13} strokeWidth={2.2} />
            <span>New reminder</span>
          </button>
        </div>
      }
    >
      <div className="w-full max-w-6xl mx-auto space-y-6 pb-16">
        {/* 4 Soft Pastel Gradient Glass KPI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassKpiCard
            count={totalActiveItems}
            label="Total items"
            variant="blue"
            badgeIcon={<Bell size={16} />}
            active={activeTab === "all"}
            onClick={() => setActiveTab("all")}
          />
          <GlassKpiCard
            count={totalInvites}
            label="Invitations"
            variant="purple"
            badgeIcon={<Mail size={16} />}
            active={activeTab === "invites"}
            onClick={() => setActiveTab("invites")}
          />
          <GlassKpiCard
            count={activeReminders.length}
            label="Reminders"
            variant="peach"
            badgeIcon={<Clock size={16} />}
            active={activeTab === "reminders"}
            onClick={() => setActiveTab("reminders")}
          />
          <GlassKpiCard
            count={archivedReminders.length}
            label="Completed"
            variant="green"
            badgeIcon={<CheckCircle2 size={16} />}
            active={activeTab === "archived"}
            onClick={() => setActiveTab("archived")}
          />
        </div>

        {/* Quick Add Reminder Drawer */}
        {isAddingReminder && (
          <motion.div initial={{ opacity: 0, y: -10, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.99 }}
            className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/90 dark:bg-[#15171e]/90 backdrop-blur-xl p-5 shadow-xl">
            <form onSubmit={handleAddReminder} className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--text)]">New Reminder</span>
                </div>
                <button type="button" onClick={() => setIsAddingReminder(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 h-6 w-6 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 grid place-items-center transition cursor-pointer"><X size={13} /></button>
              </div>
              <input type="text" autoFocus value={newReminderText} onChange={(e) => setNewReminderText(e.target.value)} placeholder="What would you like to be reminded of?"
                className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20 px-3.5 py-2.5 text-xs text-[var(--text)] outline-none focus:border-slate-400 placeholder:text-slate-400 transition" />
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[11px] font-medium text-slate-400 mr-1">Presets:</span>
                {[
                  { type: "today_evening" as const, label: "Today 6 PM" },
                  { type: "tomorrow_morning" as const, label: "Tomorrow 9 AM" },
                  { type: "two_days" as const, label: "In 2 Days" },
                  { type: "next_week" as const, label: "Next Mon" },
                ].map((p) => (
                  <button key={p.type} type="button" onClick={() => setPresetDate(p.type)}
                    className="rounded-lg border border-black/8 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white hover:border-black/20 transition cursor-pointer">{p.label}</button>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-black/6 dark:border-white/6">
                <div className="flex flex-wrap items-center gap-2">
                  <input type="datetime-local" value={newReminderDate} onChange={(e) => setNewReminderDate(e.target.value)}
                    className="rounded-lg border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20 px-2.5 py-1 text-[11px] text-[var(--text)] outline-none" />
                  <div className="flex items-center gap-1 bg-black/[0.04] dark:bg-white/[0.06] p-0.5 rounded-lg">
                    {(["low", "medium", "high"] as const).map((p) => (
                      <button key={p} type="button" onClick={() => setNewReminderPriority(p)}
                        className={`rounded-md px-2 py-0.5 text-[11px] font-medium capitalize transition cursor-pointer ${newReminderPriority === p ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs" : "text-slate-400 hover:text-slate-600"}`}>{p}</button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setIsAddingReminder(false)} className="rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer">Cancel</button>
                  <button type="submit" disabled={!newReminderText.trim()} className="rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-3.5 py-1.5 text-xs font-medium text-white disabled:opacity-40 shadow-xs transition active:scale-95 cursor-pointer">Save</button>
                </div>
              </div>
            </form>
          </motion.div>
        )}

        {/* Minimalist Apple-style Segmented Control Bar & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.05] dark:border-white/[0.06] overflow-x-auto scrollbar-none">
            {[
              { id: "all" as const, label: "All Items", count: totalActiveItems },
              { id: "invites" as const, label: "Invitations", count: totalInvites },
              { id: "reminders" as const, label: "Reminders", count: activeReminders.length },
              { id: "archived" as const, label: "Completed", count: archivedReminders.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer shrink-0 ${
                  activeTab === tab.id
                    ? "bg-white dark:bg-[#1a1d26] text-slate-900 dark:text-white shadow-2xs font-semibold"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                      activeTab === tab.id
                        ? "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                        : "bg-black/[0.04] dark:bg-white/10 text-slate-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="relative min-w-[240px]">
            <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications & tasks..."
              className="w-full rounded-xl border border-black/8 dark:border-white/8 bg-white/70 dark:bg-[#15171e]/70 backdrop-blur-md pl-9 pr-7 py-1.5 text-xs text-[var(--text)] outline-none focus:border-slate-400 placeholder:text-slate-400 shadow-2xs transition"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Content Feed */}
        <div className="space-y-5">
          {/* Realtime Team Invitations */}
          {(activeTab === "all" || activeTab === "invites") && filteredTeamInvites.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--muted)] px-1">
                <span className="flex items-center gap-2"><Mail size={13} className="text-indigo-500" />Team Space Invitations ({filteredTeamInvites.length})</span>
              </div>
              <div className="grid gap-3">
                {filteredTeamInvites.map((inv) => (
                  <TeamInvitation key={inv.id} inviterName={inv.inviter_user_id || "Team Admin"} teamName={inv.teams?.name || "Workspace Team"}
                    timeAgoText={inv.created_at ? `Invited ${timeAgo(inv.created_at)}` : "Invited recently"}
                    onAccept={async () => { if (acceptTeamInvite) { await acceptTeamInvite(inv.id); onToast?.(`Joined ${inv.teams?.name || "team"}!`); } }}
                    onDecline={async () => { if (declineTeamInvite) { await declineTeamInvite(inv.id); onToast?.("Invitation declined."); } }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Page Invitations */}
          {(activeTab === "all" || activeTab === "invites") && filteredPageInvites.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--muted)] px-1">
                <span className="flex items-center gap-2"><FileText size={13} className="text-emerald-500" />Document Access Invites ({filteredPageInvites.length})</span>
              </div>
              <div className="grid gap-3">
                {filteredPageInvites.map((inv) => {
                  const isResponding = respondingId === inv.id;
                  return (
                    <motion.div key={inv.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/70 backdrop-blur-xl p-4 shadow-xs hover:border-[var(--accent)]/40 transition-all">
                      <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-sm font-bold text-indigo-500">
                        {(inv.inviter_username || "?")[0]?.toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-[var(--text)]">
                          <span className="font-bold text-[var(--text)]">@{inv.inviter_username || "Workspace Member"}</span> invited you to{" "}
                          <span className="font-semibold text-[var(--accent)]">{inv.role === "viewer" ? "view" : inv.role === "commenter" ? "comment on" : "collaborate & edit"}</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2 text-xs text-[var(--secondary)] font-medium">
                          <FileText size={13} className="text-[var(--muted)]" /><span className="truncate">{inv.page_title || "Untitled Document"}</span>
                        </div>
                        <div className="mt-3.5 flex items-center gap-2.5">
                          <button onClick={() => respond(inv.id, "accept")} disabled={isResponding}
                            className="rounded-xl bg-[var(--accent)] px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40 shadow-xs flex items-center gap-1.5 transition cursor-pointer">
                            {isResponding ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}<span>Accept Invite</span>
                          </button>
                          <button onClick={() => respond(inv.id, "decline")} disabled={isResponding}
                            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-1.5 text-xs font-semibold text-[var(--secondary)] hover:text-red-500 hover:border-red-500/30 disabled:opacity-40 flex items-center gap-1.5 transition cursor-pointer">
                            <X size={13} /><span>Decline</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab Empty: Invitations */}
          {activeTab === "invites" && filteredTeamInvites.length === 0 && filteredPageInvites.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)]/30">
              <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 text-indigo-500 grid place-items-center mb-3.5 shadow-xs"><Mail size={24} /></div>
              <h4 className="text-base font-bold text-[var(--text)]">No pending invitations</h4>
              <p className="text-xs text-[var(--secondary)] max-w-sm mt-1 leading-relaxed">When teammates invite you to pages or workspaces in real-time, they will automatically appear here.</p>
            </div>
          )}

          {/* Scheduled Reminders */}
          {(activeTab === "all" || activeTab === "reminders") && filteredReminders.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--muted)] px-1">
                <span className="flex items-center gap-2"><Clock3 size={13} className="text-amber-500" />Scheduled Reminders ({filteredReminders.length})</span>
              </div>
              <div className="rounded-3xl border border-white/60 dark:border-white/10 bg-white/70 dark:bg-[#15171e]/70 backdrop-blur-2xl p-4 sm:p-6 shadow-xl space-y-2.5">
                {filteredReminders.map((rem) => {
                  const dueInfo = formatDueDateStatus(rem.date);
                  const isHigh = rem.priority === "high";
                  const isLow = rem.priority === "low";

                  return (
                    <motion.div
                      key={rem.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      className="group flex items-start gap-3.5 rounded-2xl border border-black/[0.04] dark:border-white/[0.06] bg-white/60 dark:bg-white/[0.04] hover:bg-white/90 dark:hover:bg-white/[0.08] hover:border-black/10 dark:hover:border-white/15 p-3.5 hover:shadow-xs transition-all"
                    >
                      <button
                        onClick={() => completeReminder(rem.id)}
                        title="Mark as completed"
                        className="mt-0.5 h-5 w-5 rounded-full border-2 border-slate-300 dark:border-slate-600 hover:border-emerald-500 hover:bg-emerald-500/15 flex items-center justify-center text-transparent hover:text-emerald-500 transition active:scale-90 cursor-pointer shrink-0"
                      >
                        <Check size={11} strokeWidth={3} />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-xs sm:text-sm font-semibold text-[var(--text)] leading-relaxed">{rem.text}</p>
                          {rem.priority && (
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold tracking-wide capitalize shrink-0 ${
                                isHigh
                                  ? "bg-rose-100/80 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40"
                                  : isLow
                                  ? "bg-blue-100/80 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40"
                                  : "bg-amber-100/80 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40"
                              }`}
                            >
                              {isHigh ? "High" : isLow ? "Low" : "Med"}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                          {dueInfo && (
                            <span className={`flex items-center gap-1.5 font-medium ${dueInfo.tone === "danger" ? "text-red-500 font-semibold" : dueInfo.tone === "warning" ? "text-amber-600 font-semibold" : "text-[var(--muted)]"}`}>
                              <CalendarDays size={13} />
                              <span>{dueInfo.label}</span>
                            </span>
                          )}

                          <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition text-[11px] text-[var(--muted)]">
                            <button onClick={() => snoozeReminder(rem.id, 3)} className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer">+3 hrs</button>
                            <span>·</span>
                            <button onClick={() => snoozeReminder(rem.id, 24)} className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer">+1 day</button>
                            <span>·</span>
                            <button onClick={() => deleteReminderPermanently(rem.id)} className="hover:text-red-500 hover:underline cursor-pointer">Delete</button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab Empty: Reminders */}
          {activeTab === "reminders" && filteredReminders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)]/30">
              <div className="h-14 w-14 rounded-2xl bg-amber-500/10 text-amber-500 grid place-items-center mb-3.5 shadow-xs"><Clock3 size={24} /></div>
              <h4 className="text-base font-bold text-[var(--text)]">No active reminders</h4>
              <p className="text-xs text-[var(--secondary)] max-w-sm mt-1 leading-relaxed">Stay focused and organized by creating reminders with due dates and priority tags.</p>
              <button onClick={() => setIsAddingReminder(true)} className="mt-4 rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 shadow-sm transition active:scale-95 cursor-pointer">+ Add Reminder</button>
            </div>
          )}

          {/* Archived Items */}
          {activeTab === "archived" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--muted)] px-1">
                <span>Completed History ({filteredArchived.length})</span>
                {filteredArchived.length > 0 && (
                  <button onClick={() => { setReminders(prev => prev.filter(r => !r.dismissed)); onToast?.("Cleared completed history."); }}
                    className="text-xs text-red-500 hover:underline cursor-pointer">Clear all history</button>
                )}
              </div>
              {filteredArchived.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)]/30">
                  <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 text-emerald-500 grid place-items-center mb-3.5 shadow-xs"><CheckCircle2 size={24} /></div>
                  <h4 className="text-base font-bold text-[var(--text)]">No completed items</h4>
                  <p className="text-xs text-[var(--secondary)] max-w-sm mt-1 leading-relaxed">Completed reminders and notifications will be safely archived here for your records.</p>
                </div>
              ) : (
                <div className="grid gap-2.5">
                  {filteredArchived.map((rem) => (
                    <div key={rem.id} className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50 p-4">
                      <div className="flex items-center gap-3 min-w-0 opacity-60">
                        <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                        <span className="text-xs font-medium text-[var(--text)] line-through truncate">{rem.text}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <button onClick={() => restoreReminder(rem.id)} className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline cursor-pointer font-medium"><RotateCcw size={12} /><span>Restore</span></button>
                        <button onClick={() => deleteReminderPermanently(rem.id)} className="text-xs text-[var(--muted)] hover:text-red-500 cursor-pointer p-1"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Search Empty State */}
          {searchQuery && (filteredTeamInvites.length + filteredPageInvites.length + filteredReminders.length + (activeTab === "archived" ? filteredArchived.length : 0)) === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)]/30">
              <Search size={24} className="text-[var(--muted)] mb-2.5" />
              <h4 className="text-base font-bold text-[var(--text)]">No results found</h4>
              <p className="text-xs text-[var(--secondary)] max-w-sm mt-1">No items or notifications matching "{searchQuery}".</p>
              <button onClick={() => setSearchQuery("")} className="mt-3.5 text-xs font-semibold text-[var(--accent)] hover:underline cursor-pointer">Clear search filter</button>
            </div>
          )}

          {/* Zero-Inbox Minimalist Empty State */}
          {!searchQuery && activeTab === "all" && (filteredTeamInvites.length + filteredPageInvites.length + filteredReminders.length) === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative overflow-hidden rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white/70 dark:bg-[#15171e]/70 backdrop-blur-xl p-8 sm:p-12 text-center shadow-xs mt-2 flex flex-col items-center justify-center"
            >
              {/* Minimal Clean Glyph */}
              <div className="h-13 w-13 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 grid place-items-center mb-3.5 shadow-2xs">
                <CheckCircle2 size={24} strokeWidth={2} />
              </div>

              <h3 className="text-base sm:text-lg font-bold text-[var(--text)] tracking-tight">All caught up</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                Zero pending notifications or invitations in your workspace. You have reached Inbox Zero.
              </p>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  onClick={() => setIsAddingReminder(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-4 py-2 text-xs font-medium shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <Plus size={13} strokeWidth={2.2} />
                  <span>New reminder</span>
                </button>

                <button
                  onClick={() => onNew?.("blank")}
                  className="rounded-xl border border-black/8 dark:border-white/8 bg-black/[0.02] hover:bg-black/[0.05] dark:bg-white/[0.03] dark:hover:bg-white/[0.06] px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 transition active:scale-95 cursor-pointer"
                >
                  New document
                </button>

                <button
                  onClick={() => {
                    const sampleItems: InboxReminder[] = [
                      { id: uid(), text: "Submit Q3 project proposal & roadmap", date: new Date(Date.now() + 6 * 3600 * 1000).toISOString(), priority: "high", dismissed: false, createdAt: new Date().toISOString() },
                      { id: uid(), text: "Review UI design mockups for mobile app", date: new Date(Date.now() + 24 * 3600 * 1000).toISOString(), priority: "medium", dismissed: false, createdAt: new Date().toISOString() },
                      { id: uid(), text: "Schedule quarterly sync with design leads", date: new Date(Date.now() + 48 * 3600 * 1000).toISOString(), priority: "low", dismissed: false, createdAt: new Date().toISOString() },
                    ];
                    setReminders(sampleItems);
                    onToast?.("Sample reminders loaded!");
                  }}
                  className="rounded-xl border border-blue-200/60 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 px-3.5 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 transition active:scale-95 cursor-pointer"
                >
                  Load demo reminders
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </RouteShell>
  );
}

interface MarketplaceItem {
  name: string;
  type: "agent" | "template";
  desc: string;
  uses: string;
}

const MARKETPLACE_ITEMS: MarketplaceItem[] = [
  { name: "OKR Coach", type: "agent", desc: "Sets and tracks Objectives and Key Results across your workspace.", uses: "2.6K" },
  { name: "Course Study Coach", type: "agent", desc: "Creates study plans, flashcards, and progress tracking.", uses: "1.8K" },
  { name: "Walt: Weekly Briefing Agent", type: "agent", desc: "Summarizes your week into a structured briefing report.", uses: "3.2K" },
  { name: "Task Triager", type: "agent", desc: "Automatically categorizes and prioritizes incoming tasks.", uses: "1.1K" },
  { name: "HubSpot Sales Reporter", type: "agent", desc: "Pulls HubSpot data into structured sales reports.", uses: "924" },
  { name: "Finance Tracker", type: "template", desc: "Track income, expenses, and budgets with auto-calculations.", uses: "5.4K" },
  { name: "Budget Tracker", type: "template", desc: "Monthly budget planning with category breakdowns.", uses: "3.7K" },
  { name: "Content Machine", type: "template", desc: "Pipeline for brainstorming, drafting, and publishing content.", uses: "2.9K" },
  { name: "Intern Workspace", type: "template", desc: "Structured onboarding workspace for new team members.", uses: "1.4K" },
  { name: "The Yearly Reset", type: "template", desc: "Annual review and goal-setting framework.", uses: "2.1K" },
];

const MARKETPLACE_CATEGORIES = ["All", "AI Agents", "Templates", "Workspaces", "Planning & Standup", "Wiki & Docs"];

interface MarketplaceRouteProps {
  onNew: (template: string) => void;
  onToast?: (message: string) => void;
}

// Not currently reachable from WorkspaceView's own view-dispatch (which
// routes "marketplace" straight to the real MarketplacePage from
// src/features/marketplace/MarketplacePage.tsx instead — see the
// `if (view === "marketplace") return <MarketplacePage .../>` early
// return above), and not imported anywhere else in the app (grepped) —
// pre-existing dead/unreachable component, kept as-is (same "type in
// place, don't remove" scope boundary as the other documented quirks
// in this file).
function MarketplaceRoute({ onNew, onToast }: MarketplaceRouteProps) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [modalOpen, setModalOpen] = useState<"profile" | "purchased" | null>(null);

  const filtered = MARKETPLACE_ITEMS.filter(item => {
    if (searchQuery.trim() && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedCategory === "AI Agents" && item.type !== "agent") return false;
    if (selectedCategory === "Templates" && item.type !== "template") return false;
    if (selectedCategory === "All") return true;
    return true;
  });

  return (
    <section className="min-h-0 flex-1 overflow-y-auto bg-[var(--panel)] px-8 py-5 scrollbar-thin">
      <div className="mx-auto max-w-7xl">
        {/* Compact Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-base font-semibold text-[var(--text)]">
            <span className="grid h-5 w-5 place-items-center rounded bg-[var(--accent)] text-xs">▲</span>
            Marketplace
          </div>
          <div className="flex items-center gap-4">
            {showSearch ? (
              <div className="flex items-center gap-1 border border-[var(--border-strong)] rounded bg-[var(--surface)] px-2 py-1">
                <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." className="bg-transparent text-xs text-[var(--text)] outline-none w-24" />
                <button onClick={() => { setSearchQuery(""); setShowSearch(false); }} className="text-xs text-[var(--muted)] hover:text-[var(--text)]">✕</button>
              </div>
            ) : (
              <button onClick={() => setShowSearch(true)} className="flex items-center gap-1 text-[11px] text-[var(--secondary)] hover:text-[var(--accent)]">
                <Search size={13} />Search
              </button>
            )}
            <button onClick={() => setModalOpen("profile")} className="text-[11px] text-[var(--secondary)] hover:text-[var(--accent)]">Profile</button>
            <button onClick={() => setModalOpen("purchased")} className="text-[11px] text-[var(--secondary)] hover:text-[var(--accent)] font-semibold">Purchased</button>
          </div>
        </div>

        {/* Compact Category Chips */}
        <div className="mb-6 flex flex-wrap gap-1.5">
          {MARKETPLACE_CATEGORIES.map(chip => (
            <button key={chip} onClick={() => setSelectedCategory(chip)}
              className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                selectedCategory === chip
                  ? "border-[var(--warning)] bg-[var(--warning)]/20 text-[var(--warning)]"
                  : "border-[var(--border)] bg-[var(--panel)] text-[var(--text)] hover:bg-[var(--hover)]"
              }`}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Empty State */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-3xl mb-3 opacity-30">🏪</div>
            <div className="text-sm text-[var(--muted)]">No results found</div>
            <div className="text-[10px] text-[var(--muted)] mt-1">Try a different category or search term</div>
            <button onClick={() => { setSelectedCategory("All"); setSearchQuery(""); }} className="mt-3 text-xs text-[var(--accent)] hover:underline">Reset filters</button>
          </div>
        )}

        {/* Item Grid */}
        {filtered.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            {filtered.map((item, i) => (
              <button key={item.name} onClick={() => onToast?.(`"${item.name}" — use the New Page button to create from this template or deploy this agent.`)}
                className="overflow-hidden rounded-xl bg-[var(--surface)] border border-transparent hover:border-[var(--accent)] text-left transition-all group"
              >
                <div className="h-32 bg-[var(--surface)] flex items-center justify-center text-4xl group-hover:scale-105 transition-transform">
                  {item.type === 'agent' ? '🤖' : '📋'}
                </div>
                <div className="p-3">
                  <div className="font-bold text-[13px] text-[var(--text)]">{item.name}</div>
                  <div className="mt-1 text-[10px] text-[var(--secondary)] line-clamp-2">{item.desc}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[9px] text-[var(--muted)]">{item.uses} uses</span>
                    <span className="rounded bg-[var(--active)] px-2 py-0.5 text-[9px] font-semibold">{item.type === 'agent' ? 'Deploy' : 'Free'}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Create from template quick link */}
        <div className="text-center pb-8">
          <button onClick={() => onNew("blank")} className="text-xs text-[var(--accent)] hover:underline">
            Or create a new blank page to get started
          </button>
        </div>
      </div>

      {modalOpen === "profile" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={() => setModalOpen(null)}>
          <div className="bg-[var(--sidebar)] border border-[var(--border-strong)] rounded-xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-[var(--text)]">Marketplace Profile</h3>
              <button onClick={() => setModalOpen(null)} className="text-[var(--secondary)] hover:text-[var(--text)]">&times;</button>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-[var(--active)] flex items-center justify-center font-bold text-[var(--text)] text-sm">
                {(window.realtimeCollab as RealtimeCollabLike | undefined)?.getUser?.()?.userName?.[0] || (window.realtimeCollab as RealtimeCollabLike | undefined)?.getUser?.()?.userId?.[0] || '?'}
              </div>
              <div>
                <div className="font-bold text-sm text-[var(--text)]">{(window.realtimeCollab as RealtimeCollabLike | undefined)?.getUser?.()?.userName || 'Workspace User'}</div>
                <div className="text-xs text-[var(--muted)]">{(window.realtimeCollab as RealtimeCollabLike | undefined)?.getUser?.()?.userId || 'Local workspace'}</div>
              </div>
            </div>
            <div className="text-xs text-[var(--secondary)] leading-relaxed mb-4">
              Free tier — all marketplace items are currently free to use.
            </div>
            <button onClick={() => setModalOpen(null)} className="w-full bg-[var(--accent)] hover:bg-[var(--accent)] text-white py-1.5 rounded text-xs font-semibold">Done</button>
          </div>
        </div>
      )}
      {modalOpen === "purchased" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={() => setModalOpen(null)}>
          <div className="bg-[var(--sidebar)] border border-[var(--border-strong)] rounded-xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-[var(--text)]">Purchased</h3>
              <button onClick={() => setModalOpen(null)} className="text-[var(--secondary)] hover:text-[var(--text)]">&times;</button>
            </div>
            <div className="text-center py-6 text-[var(--secondary)]">
              <p className="text-sm">No purchases yet</p>
              <p className="text-xs text-[var(--muted)] mt-2">All standard community templates and agents are currently free.</p>
            </div>
            <button onClick={() => setModalOpen(null)} className="w-full bg-[var(--accent)] hover:bg-[var(--accent)] text-white py-1.5 rounded text-xs font-semibold">Close</button>
          </div>
        </div>
      )}
    </section>
  );
}

function viewTitle(view: string, workspaceName?: string): string {
  return ({
    home: "Home",
    calendar: "Calendar",
    inbox: "Inbox",
    library: "Library",
    tasks: "My Tasks",
    marketplace: "Marketplace",
    chats: "Chats",
    meetings: "Meetings",
    meetingNote: "AI meeting note",
    shared: "Shared",
    teamspace: workspaceName
  } as Record<string, string | undefined>)[view] || "Home";
}

function viewSubtitle(view: string): string {
  return ({
    home: "A working dashboard for pages, tasks, and AI actions.",
    calendar: "Pages organized by last edited date.",
    inbox: "Action items collected from your pages.",
    library: "Browse every page in the workspace.",
    tasks: "All to-do blocks across notes.",
    marketplace: "Create useful pages from templates.",
    chats: "Saved AI conversations you can reopen and continue.",
    meetings: "Calendar connection, upcoming meetings, and meeting-note workflows.",
    meetingNote: "Create separated AI meeting notes, agendas, and action trackers.",
    shared: "Collaboration-ready workspace pages.",
    teamspace: "Teamspace overview and page library."
  } as Record<string, string | undefined>)[view] || "";
}

interface PanelProps {
  title: string;
  children: React.ReactNode;
}

function Panel({ title, children }: PanelProps) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm transition hover:shadow-md">
      <div className="mb-4 text-sm font-bold tracking-tight text-[var(--text)]">{title}</div>
      {children}
    </div>
  );
}

interface MetricProps {
  label: string;
  value: React.ReactNode;
}

function Metric({ label, value }: MetricProps) {
  return (
    <div className="mb-2 rounded-md bg-[var(--surface)] p-3">
      <div className="text-xs text-[var(--secondary)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-[var(--text)]">{value}</div>
    </div>
  );
}

interface PageCardProps {
  page: Page;
  onSelect: (pageId: string) => void;
}

function CalendarGrid({ pages, onSelect }: { pages: Page[]; onSelect: (pageId: string) => void }) {
  return <MonthCalendar pages={pages} onSelect={onSelect} />;
}

function PageCard({ page, onSelect }: PageCardProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.015, y: -1 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 450, damping: 25 }}
      onClick={() => onSelect(page.id)}
      className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 text-left hover:border-[var(--accent)] w-full block transition-colors duration-150"
    >
      <div className="flex items-center gap-2">
        <PageIcon icon={page.icon} size={15} fallback="📄" />
        <span className="truncate text-sm font-medium text-[var(--text)]">{page.title || "Untitled"}</span>
      </div>
      <div className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--secondary)]">{plainText(page).slice(0, 120) || "Empty page"}</div>
    </motion.button>
  );
}

interface TemplateCard {
  id: string;
  title: string;
  icon: LucideIcon;
  tone: string;
  description: string;
}

const templateCards: TemplateCard[] = [
  { id: "blank", title: "Empty page", icon: FileText, tone: "border-[var(--border)] bg-[var(--bg)]", description: "Start from a blank page." },
  { id: "database", title: "Empty database", icon: Database, tone: "border-[var(--border)] bg-[var(--bg)]", description: "Start from a database shell." },
  { id: "tasks", title: "Tasks Tracker", icon: CheckSquare, tone: "border-[var(--success)]/70 bg-[var(--success)]/15", description: "Stay organized with tasks, your way." },
  { id: "projects", title: "Projects", icon: Search, tone: "border-[var(--accent)]/70 bg-[var(--accent)]/15", description: "Manage projects start to finish." },
  { id: "docs", title: "Document Hub", icon: FileText, tone: "border-[var(--danger)]/70 bg-[var(--danger)]/15", description: "Collaborate on docs in one hub." },
  { id: "brainstorm", title: "Brainstorm Session", icon: Sparkles, tone: "border-[var(--warning)]/70 bg-[var(--warning)]/20", description: "Spark new ideas together." },
  { id: "standup", title: "Meeting Notes", icon: CalendarDays, tone: "border-[var(--warning)]/70 bg-[var(--warning)]/20", description: "Turn meetings into action." },
  { id: "goals", title: "Goals Tracker", icon: CheckSquare, tone: "border-[var(--accent)]/70 bg-[var(--accent)]/15", description: "Set team goals, achieve together." }
];

interface TemplatePickerProps {
  onClose: () => void;
  onCreate: (templateId: string) => void;
}

export function TemplatePicker({ onClose, onCreate }: TemplatePickerProps) {
  const [search, setSearch] = useState("");
  const visible = templateCards.filter((card) => `${card.title} ${card.description}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-8" onMouseDown={onClose}>
      <div className="mx-auto flex h-[calc(100vh-64px)] max-w-6xl flex-col overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--bg)] shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex h-20 shrink-0 items-center gap-4 border-b border-[var(--border)] px-7">
          <IconButton icon={X} label="Close templates" onClick={onClose} />
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--secondary)]">Add to <Lock size={15} /> <span className="text-[var(--text)]">Private</span><ChevronDown size={14} /></div>
          <div className="mx-auto flex h-12 w-[372px] items-center gap-2 rounded-xl border-2 border-[var(--accent)] bg-[var(--panel)] px-3">
            <Search size={18} className="text-[var(--muted)]" />
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-0 flex-1 bg-transparent text-base text-[var(--text)] outline-none placeholder:text-[var(--muted)]" placeholder="Search" />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-10 py-8 scrollbar-thin">
          <div className="mb-10 grid grid-cols-2 gap-5">
            {visible.slice(0, 2).map((card) => <TemplateTile key={card.id} card={card} onCreate={onCreate} compact />)}
          </div>
          <div className="mb-5 text-base font-semibold text-[var(--secondary)]">Suggested</div>
          <div className="grid grid-cols-2 gap-5">
            {visible.slice(2).map((card) => <TemplateTile key={card.id} card={card} onCreate={onCreate} />)}
          </div>
          <div className="py-8 text-base font-semibold text-[var(--secondary)]">More templates</div>
        </div>
      </div>
    </div>
  );
}

interface TemplateTileProps {
  card: TemplateCard;
  onCreate: (templateId: string) => void;
  compact?: boolean;
}

function TemplateTile({ card, onCreate, compact }: TemplateTileProps) {
  const Icon = card.icon;
  return (
    <motion.button
      whileHover={{ scale: 1.015, y: -1 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 450, damping: 25 }}
      onClick={() => onCreate(card.id === "database" ? "tasks" : card.id)}
      className={`overflow-hidden rounded-xl border p-5 text-left transition hover:border-[var(--accent)] ${card.tone} w-full block`}
    >
      <Icon size={compact ? 18 : 20} className="text-[var(--secondary)]" />
      <div className="mt-5 text-lg font-semibold text-[var(--text)]">{card.title}</div>
      <div className="mt-1 text-sm text-[var(--secondary)]">{card.description}</div>
      {!compact && (
        <div className="mt-4 rounded-md bg-black/15 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text)]"><Icon size={15} />{card.title}</div>
          <div className="grid grid-cols-3 gap-3 text-[11px] text-[var(--secondary)]">
            {["Name", "Status", "Owner"].map((h) => <div key={h}>{h}</div>)}
            {Array.from({ length: 9 }, (_, i) => <div key={i} className="h-2 rounded bg-[var(--surface)]" />)}
          </div>
        </div>
      )}
    </motion.button>
  );
}

interface AIHomeViewProps {
  onAI?: () => void;
  onPrompt?: () => void;
  onSettings?: () => void;
}

export function AIHomeView({ onAI, onPrompt, onSettings }: AIHomeViewProps) {
  return (
    <section className="relative flex min-h-0 flex-1 flex-col bg-[var(--bg)]">
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center mb-4">
            <Sparkles size={24} className="text-[var(--accent)]" />
          </div>
          <h2 className="text-xl font-semibold text-[var(--text)] mb-1">Welcome to Noska AI</h2>
          <p className="text-sm text-[var(--muted)] mb-6 leading-relaxed">
            Ask anything, edit pages, generate content, analyze your workspace.
          </p>
          <button
            onClick={() => { onAI?.(); }}
            className="flex items-center gap-2 rounded-xl bg-[var(--accent)] text-white px-5 py-2.5 text-sm font-medium hover:opacity-90 transition shadow-lg"
          >
            <Sparkles size={14} />
            Open AI Workspace
          </button>
          <button
            onClick={() => onSettings?.()}
            className="mt-3 text-[11px] text-[var(--muted)] hover:text-[var(--text-secondary)] transition"
          >
            Configure API key in Settings
          </button>
        </div>
      </div>
    </section>
  );
}

interface NewPageOverlayProps {
  page: Page;
  onClose: () => void;
  onPagePatch: (patch: Partial<Page>) => void;
  onShare: () => void;
  onFavorite: () => void;
  onMore: () => void;
  onAction: (action: string) => void;
  onToast?: (message: string) => void;
}

export function NewPageOverlay({ page, onClose, onPagePatch, onShare, onFavorite, onMore, onAction, onToast }: NewPageOverlayProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const starters = [
    { id: "ai", icon: Sparkles, label: "Ask AI" },
    { id: "meeting", icon: Mic, label: "AI Meeting Notes" },
    { id: "database", icon: Database, label: "Database" },
    { id: "canvas", icon: LayoutGrid, label: "Canvas Mode" },
    { id: "graph", icon: Search, label: "Graph View" },
    { id: "project", icon: CheckSquare, label: "Project Tracker" },
    { id: "import", icon: FileText, label: "Import File" },
    { id: "templates", icon: SlidersHorizontal, label: "Templates" }
  ];

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const title = file.name.replace(/\.[^/.]+$/, "");
      let blocks: Block[] = [];
      
      if (file.name.endsWith(".json")) {
        try {
          const parsed = JSON.parse(content);
          blocks = parsed.blocks || parsed;
        } catch (err) {
          onToast?.("Invalid JSON format");
          return;
        }
      } else {
        const lines = content.split("\n");
        for (let line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith("# ")) {
            blocks.push({ id: uid(), type: "h1", text: trimmed.slice(2) } as Block);
          } else if (trimmed.startsWith("## ")) {
            blocks.push({ id: uid(), type: "h2", text: trimmed.slice(3) } as Block);
          } else if (trimmed.startsWith("### ")) {
            blocks.push({ id: uid(), type: "h3", text: trimmed.slice(4) } as Block);
          } else if (trimmed.startsWith("- [ ]") || trimmed.startsWith("- [ ] ")) {
            blocks.push({ id: uid(), type: "todo", text: trimmed.replace(/^-\s*\[\s*\]\s*/, ""), checked: false } as Block);
          } else if (trimmed.startsWith("- [x]") || trimmed.startsWith("- [x] ")) {
            blocks.push({ id: uid(), type: "todo", text: trimmed.replace(/^-\s*\[\s*x\s*\]\s*/, ""), checked: true } as Block);
          } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            blocks.push({ id: uid(), type: "bullet", text: trimmed.slice(2) } as Block);
          } else if (trimmed.startsWith("> ")) {
            blocks.push({ id: uid(), type: "quote", text: trimmed.slice(2) } as Block);
          } else {
            blocks.push({ id: uid(), type: "text", text: trimmed } as Block);
          }
        }
      }
      
      if (blocks.length === 0) {
        blocks.push({ id: uid(), type: "text", text: "" } as Block);
      }
      
      onPagePatch({ title, blocks });
      onAction("close");
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/45" onMouseDown={onClose}>
      <input
        type="file"
        ref={fileInputRef}
        accept=".md,.txt,.json"
        className="hidden"
        onChange={handleFileImport}
      />
      <div
        className="mx-auto mt-[7vh] flex h-[min(78vh,720px)] w-[min(760px,calc(100vw-48px))] flex-col overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--bg)] shadow-2xl fade-in"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex h-11 shrink-0 items-center gap-1 border-b border-[var(--border)] px-3">
          <IconButton icon={ArrowUpRight} label="Open full page" onClick={() => onAction("close")} />
          <button className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[13px] text-[var(--secondary)] hover:bg-[var(--hover)] border-0 bg-transparent outline-none">
            Add to
            <PageIcon icon={page.icon} size={14} fallback="📄" />
            <span className="max-w-[140px] truncate text-[var(--text)]">{page.title || "New page"}</span>
            <ChevronDown size={12} />
          </button>
          <div className="flex-1" />
          <button onClick={onShare} className="flex h-7 items-center gap-1 rounded-md px-2 text-[13px] text-[var(--secondary)] hover:bg-[var(--hover)] border-0 bg-transparent outline-none cursor-pointer"><Lock size={14} />Share</button>
          <IconButton icon={Link2} label="Copy link" onClick={onShare} />
          <IconButton icon={Star} label="Favorite" onClick={onFavorite} />
          <IconButton icon={MoreHorizontal} label="More" onClick={onMore} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-16 py-10 scrollbar-thin">
          <input
            ref={titleRef}
            value={page.title}
            onChange={(e) => onPagePatch({ title: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") onAction("close"); }}
            className="w-full bg-transparent text-[40px] font-bold leading-tight text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
            placeholder="New page"
          />
        </div>
        <div className="shrink-0 border-t border-[var(--border)] px-6 py-4">
          <div className="mb-3 text-xs text-[var(--muted)]">Get started with</div>
          <div className="flex flex-wrap items-center gap-2">
            {starters.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => {
                  if (id === "import") {
                    fileInputRef.current?.click();
                  } else {
                    onAction(id);
                  }
                }}
                className="flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text)] transition hover:border-[var(--border-strong)] hover:bg-[var(--hover)] cursor-pointer"
              >
                <Icon size={15} className="text-[var(--secondary)]" />
                {label}
              </button>
            ))}
            <button onClick={onMore} className="grid h-8 w-8 place-items-center rounded-full border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--secondary)] hover:bg-[var(--hover)] cursor-pointer">
              <MoreHorizontal size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --- Daily Brief ---
 * Deterministic command-center summary computed from live workspace
 * state (reviews via computeAnalytics, tasks, recent pages). No AI, no
 * fake data � every line is derived from what the user actually has. */

function DailyBrief({ pages, openTasks, dueReviews, onStartReview, onSelect }: {
  pages: Page[];
  openTasks: number;
  dueReviews: number;
  onStartReview?: () => void;
  onSelect: (pageId: string) => void;
}) {
  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Working late" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const brief = React.useMemo(() => {
    const a = computeAnalytics(pages);
    const lastEdited = [...pages]
      .filter((p) => !p.trashed)
      .sort((x, y) => new Date(y.updatedAt).getTime() - new Date(x.updatedAt).getTime())[0];
    const weakest = a.weakTopics[0];
    return { a, lastEdited, weakest };
  }, [pages]);

  const { a, lastEdited, weakest } = brief;

  return (
    <section className="rounded-xl border border-[var(--border)] bg-gradient-to-br from-[var(--panel)] to-[var(--surface)] p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-[var(--accent)]" />
          <h2 className="text-sm font-semibold text-[var(--text)]">Daily Brief</h2>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-[var(--muted)]">{greeting}</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {dueReviews > 0 ? (
          <button onClick={() => onStartReview?.()} className="flex items-center gap-3 rounded-lg bg-[var(--danger)]/[0.07] px-3 py-2.5 text-left transition-colors hover:bg-[var(--danger)]/[0.12] cursor-pointer">
            <Brain size={15} className="shrink-0 text-[var(--danger)]" />
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-[var(--text)]">{dueReviews} card{dueReviews === 1 ? "" : "s"} ready for review</div>
              <div className="truncate text-[10px] text-[var(--muted)]">{a.overdue > 0 ? `${a.overdue} overdue` : "Keep the streak alive"}{a.streakDays > 0 ? ` � ${a.streakDays}d streak` : ""}</div>
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-3 rounded-lg bg-[var(--success)]/[0.07] px-3 py-2.5">
            <CheckCircle2 size={15} className="shrink-0 text-[var(--success)]" />
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-[var(--text)]">Review queue clear</div>
              <div className="truncate text-[10px] text-[var(--muted)]">{a.totalCards} card{a.totalCards === 1 ? "" : "s"} on schedule</div>
            </div>
          </div>
        )}
        <div className="flex items-center gap-3 rounded-lg bg-[var(--surface)] px-3 py-2.5">
          <ListTodo size={15} className="shrink-0 text-[var(--accent)]" />
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-[var(--text)]">{openTasks} open task{openTasks === 1 ? "" : "s"}</div>
            <div className="truncate text-[10px] text-[var(--muted)]">across your workspace</div>
          </div>
        </div>
        {weakest && (
          <button
            onClick={() => {
              const target = pages.find((p) => !p.trashed && ((Array.isArray(p.tags) && p.tags[0] === weakest.topic) || p.title === weakest.topic));
              if (target) onSelect(target.id);
            }}
            className="flex items-center gap-3 rounded-lg bg-[var(--warning)]/[0.07] px-3 py-2.5 text-left transition-colors hover:bg-[var(--warning)]/[0.12] cursor-pointer"
          >
            <TrendingDown size={15} className="shrink-0 text-[var(--warning)]" />
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-[var(--text)]">{weakest.topic} needs attention</div>
              <div className="truncate text-[10px] text-[var(--muted)]">{weakest.struggling} struggling card{weakest.struggling === 1 ? "" : "s"}</div>
            </div>
          </button>
        )}
        {lastEdited && (
          <button onClick={() => onSelect(lastEdited.id)} className="flex items-center gap-3 rounded-lg bg-[var(--surface)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--hover)] cursor-pointer">
            <FileText size={15} className="shrink-0 text-[var(--secondary)]" />
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-[var(--text)] flex items-center gap-1.5"><PageIcon icon={lastEdited.icon} size={14} fallback="??" /> {lastEdited.title || "Untitled"}</div>
              <div className="truncate text-[10px] text-[var(--muted)]">continue where you left off - {timeAgo(lastEdited.updatedAt)}</div>
            </div>
          </button>
        )}
      </div>
    </section>
  );
}

/* --- Workspace Health (curator UI) ---
 * Renders the deterministic findings from src/utils/curator.ts. Collapsed
 * by default when clean; every finding navigates to its page. */

const HEALTH_ICONS: Record<string, typeof AlertTriangle> = {
  duplicate: Copy,
  orphan: Unlink,
  stale: Clock3,
  empty: FileText,
};

function WorkspaceHealthPanel({ pages, onSelect }: { pages: Page[]; onSelect: (pageId: string) => void }) {
  const issues = React.useMemo(() => curateWorkspace(pages), [pages]);

  if (issues.length === 0) {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-lg bg-[var(--success)]/[0.07] px-3 py-2.5">
        <CheckCircle2 size={14} className="text-[var(--success)] shrink-0" />
        <span className="text-xs font-medium text-[var(--text)]">Everything looks healthy</span>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-1.5 max-h-[260px] overflow-y-auto scrollbar-thin">
      {issues.slice(0, 8).map((issue, i) => {
        const Icon = HEALTH_ICONS[issue.kind] ?? AlertTriangle;
        return (
          <button
            key={i}
            onClick={() => issue.pageIds[0] && onSelect(issue.pageIds[0])}
            className="flex w-full items-start gap-2 rounded-lg bg-[var(--surface)] px-2.5 py-2 text-left hover:bg-[var(--hover)] transition-colors"
          >
            <Icon size={12} className={`mt-0.5 shrink-0 ${issue.kind === "stale" ? "text-[var(--warning)]" : "text-[var(--accent)]"}`} />
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium text-[var(--text)]">{issue.label}</span>
              <span className="block text-[10px] text-[var(--muted)] truncate">{issue.detail}</span>
            </span>
          </button>
        );
      })}
      {issues.length > 8 && (
        <p className="text-center text-[10px] text-[var(--muted)]">+{issues.length - 8} more findings</p>
      )}
    </div>
  );
}

// ── Calendar Route ──────────────────────────────────────────────────
interface CalendarRouteProps {
  pages: Page[];
  onSelect: (pageId: string) => void;
  onNew: (template: string) => void;
  onToast?: (message: string) => void;
}

function CalendarRoute({ pages, onSelect, onNew, onToast }: CalendarRouteProps) {
  const calendarEvents: Event[] = React.useMemo(() => {
    const pageEvents: Event[] = pages
      .filter((p) => !p.trashed)
      .map((p) => ({
        id: `page-${p.id}`,
        title: p.title || "Untitled",
        description: plainText(p).slice(0, 120),
        startTime: new Date(p.createdAt || p.updatedAt),
        endTime: new Date(p.updatedAt),
        color: "blue",
        category: "Document",
      }));
    const stored = loadCalendarEvents();
    return [...stored, ...pageEvents];
  }, [pages]);

  return (
    <RouteShell title="Calendar" subtitle="Manage events and schedule">
      <EventManager
        events={calendarEvents}
        defaultView="month"
        onEventCreate={(e) => { saveCalendarEvent(e); onToast?.(`Event "${e.title}" created`); }}
        onEventDelete={(id) => { deleteCalendarEvent(id); onToast?.("Event deleted"); }}
      />
    </RouteShell>
  );
}

const CALENDAR_STORAGE_KEY = "noska_calendar_events";

function loadCalendarEvents(): Event[] {
  try {
    const raw = localStorage.getItem(CALENDAR_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw).map((e: any) => ({
      ...e,
      startTime: new Date(e.startTime),
      endTime: new Date(e.endTime),
    }));
  } catch { return []; }
}

function saveCalendarEvent(event: Omit<Event, "id">) {
  const events = loadCalendarEvents();
  events.push({ ...event, id: Math.random().toString(36).slice(2, 11) });
  localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(events));
}

function deleteCalendarEvent(id: string) {
  const events = loadCalendarEvents().filter((e) => e.id !== id);
  localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(events));
}

// ── Shared Route ────────────────────────────────────────────────────
interface SharedRouteProps {
  sharedPages: Page[];
  onNew: (template: string) => void;
  onSelect: (pageId: string) => void;
}

function SharedRoute({ sharedPages, onNew, onSelect }: SharedRouteProps) {
  return (
    <section className="min-h-0 flex-1 overflow-y-auto bg-[var(--bg)] p-6 sm:p-8 scrollbar-thin">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Realtime Collaboration Hub Banner */}
        <div className="rounded-2xl border border-[var(--border)] bg-gradient-to-r from-[var(--surface-2)] via-[var(--surface-1)] to-[var(--surface-2)] p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 grid place-items-center text-emerald-500 text-xl shadow-xs">
              <Users size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[var(--text)]">Realtime Collaboration Hub</h3>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                </span>
              </div>
              <p className="text-xs text-[var(--muted)] mt-0.5">Multiplayer presence, live cursors, and co-editing are active across all shared documents.</p>
            </div>
          </div>
          <button onClick={() => onNew("blank")} className="rounded-xl bg-[var(--accent)] text-white px-3.5 py-2 text-xs font-semibold hover:opacity-90 active:scale-95 transition cursor-pointer shadow-xs flex items-center gap-1.5">
            <Plus size={13} /><span>New Shared Page</span>
          </button>
        </div>

        <Panel title="Shared with you">
          {sharedPages.length === 0 ? (
            <div className="py-12 text-center rounded-2xl border border-dashed border-[var(--border)] p-6 space-y-3 bg-[var(--surface-2)]/30">
              <div className="text-3xl">🤝</div>
              <div className="font-semibold text-sm text-[var(--text)]">No pages shared yet</div>
              <p className="text-xs text-[var(--muted)] max-w-sm mx-auto">When teammates share documents with you, they'll appear here in real time.</p>
              <button onClick={() => onNew("blank")} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] px-4 py-2 text-xs font-semibold hover:bg-[var(--hover)] transition cursor-pointer shadow-xs inline-flex items-center gap-1.5">
                <Plus size={12} /><span>Create collaborative document</span>
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sharedPages.map((page) => <PageCard key={page.id} page={page} onSelect={onSelect} />)}
            </div>
          )}
        </Panel>
      </div>
    </section>
  );
}
