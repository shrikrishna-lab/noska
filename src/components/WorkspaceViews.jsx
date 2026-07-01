import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
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
  Brain
} from "lucide-react";
import MeetingWorkspace from "../features/meeting/MeetingWorkspace";
import MarketplacePage from "../features/marketplace/MarketplacePage";
import CreatorDashboard from "../features/creator/CreatorDashboard";
import AgentWorkspace from "../features/agents/AgentWorkspace";
import { IconButton, Modal, ModalHeader, PearlButton } from "./ui";
import { plainText, timeAgo, covers, uid, blockFor } from "../utils/helpers";

export function WorkspaceView({
  view,
  pages,
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
  onDuplicate
}) {
  const tasks = pages.flatMap((page) =>
    page.blocks
      .filter((block) => block.type === "todo")
      .map((block) => ({ ...block, pageTitle: page.title, pageIcon: page.icon, pageId: page.id }))
  );
  const recent = [...pages].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 6);
  const calendarRows = [...pages].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
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
        if (block.review) {
          if (!block.review.nextReview || block.review.nextReview <= now) {
            count++;
          }
        }
      }
    }
    return count;
  }, [pages]);

  // Aggregate Workspace Activity Timeline
  const recentActivities = React.useMemo(() => {
    const list = [];
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
    return list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 4);
  }, [pages]);

  // Tag-based Suggested Connections recommendation logic
  const suggestedConnections = React.useMemo(() => {
    const connections = [];
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
  if (view === "agents") return <AgentWorkspace pages={pages} onToast={onToast} onDuplicate={onDuplicate || (() => {})} />;
  if (view === "library") return <LibraryRoute pages={pages} workspaceName={workspaceName} onSelect={onSelect} onNew={onNew} />;
  if (view === "tasks") return <TasksRoute tasks={tasks} onSelect={onSelect} onNew={onNew} onToast={onToast} />;
  if (view === "chats") return <ChatsRoute aiChats={aiChats} onAI={onAI} onOpenChat={onOpenChat} />;
  if (view === "meetings") return <MeetingsRoute onNew={onNew} />;
  if (view === "meetingNote") return <MeetingNoteRoute onNew={onNew} onAI={onAI} onToast={onToast} apiKey={apiKey} aiProvider={aiProvider} nvidiaKey={nvidiaKey} pages={pages} />;
  if (view === "inbox") return <InboxRoute onNew={onNew} onToast={onToast} />;

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric"
  });

  return (
    <section className="min-h-0 flex-1 overflow-y-auto bg-[var(--bg)] p-8 scrollbar-thin">
      <div className="mx-auto max-w-6xl">
        {/* Dynamic Premium Header */}
        <div className="mb-8 flex items-center justify-between border-b border-[var(--border)] pb-6">
          <div>
            <div className="text-[11px] font-semibold tracking-wider text-[var(--accent)] uppercase">{formattedDate}</div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text)] mt-1">Workspace Pulse</h1>
            <div className="text-sm text-[var(--secondary)] mt-1">Hello, {window.realtimeCollab?.getUser?.()?.userName || 'there'}. Welcome to your central intelligence node.</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onNew("blank")} className="rounded-md bg-[var(--surface)] border border-[var(--border-strong)] px-3 py-2 text-xs font-medium text-[var(--text)] hover:bg-[var(--hover)] transition">New page</button>
            <PearlButton
              onClick={onAI}
              label="Consult Assistant"
              icon1={<Sparkles size={13} className="text-[var(--accent)]" />}
              icon2={<Sparkles size={13} className="text-[var(--accent)] fill-[var(--accent)]" />}
              background="var(--panel)"
              textColor="var(--text)"
            />
          </div>
        </div>

        {view === "home" && (
          <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            {/* Left Pane - Main Content & Context */}
            <div className="space-y-6">
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
                        <span className="text-lg">{page.icon || "📝"}</span>
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
                            <span>{conn.p1Icon}</span>
                            <span>{conn.p1Title}</span>
                          </button>
                          <span className="text-[var(--muted)]">and</span>
                          <button onClick={() => onSelect(conn.p2Id)} className="flex items-center gap-1 font-semibold text-[var(--accent)] hover:underline truncate">
                            <span>{conn.p2Icon}</span>
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
                          <span>{act.pageIcon}</span>
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
                          <span className="block text-[9px] text-[var(--muted)] truncate mt-0.5">{task.pageIcon} {task.pageTitle}</span>
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
                            <span className="truncate">{chat.title || "AI chat"}</span>
                          </div>
                          <span className="block text-[10px] text-[var(--secondary)] truncate mt-0.5">
                            {chat.messages?.slice(-1)[0]?.text || "No messages yet"}
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
                    <div className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--text)]">{chat.title || "AI chat"}</div>
                    <div className="text-[11px] text-[var(--muted)]">{timeAgo(chat.updatedAt)}</div>
                  </div>
                  <div className="mt-1 truncate text-xs text-[var(--secondary)]">{chat.messages?.slice(-1)[0]?.text || "Continue this conversation"}</div>
                </button>
              ))}
            </div>
          </Panel>
        )}

        {view === "calendar" && (
          <Panel title="Calendar">
            <div className="grid grid-cols-7 gap-1 text-sm">
              {Array.from({ length: 35 }, (_, i) => i + 1).map((day) => (
                <div key={day} className="min-h-28 rounded-md border border-[var(--border)] bg-[var(--panel)] p-2">
                  <div className="text-xs text-[var(--muted)]">{day}</div>
                  {calendarRows.filter((p) => Number(new Date(p.updatedAt).getDate()) === day).map((p) => (
                    <button key={p.id} onClick={() => onSelect(p.id)} className="mt-1 block w-full truncate rounded bg-[var(--surface)] px-1.5 py-1 text-left text-xs text-[var(--text)] hover:bg-[var(--hover)]">{p.icon} {p.title}</button>
                  ))}
                </div>
              ))}
            </div>
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
                    <span className="block truncate text-xs text-[var(--muted)]">{task.pageIcon} {task.pageTitle}</span>
                  </span>
                </button>
              ))}
            </div>
          </Panel>
        )}

        {(view === "library" || view === "teamspace" || view === "shared") && (
          <Panel title={view === "shared" ? "Shared pages" : "Workspace library"}>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {pages.map((page) => <PageCard key={page.id} page={page} onSelect={onSelect} />)}
            </div>
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

function RouteShell({ title, subtitle, children, actions }) {
  return (
    <section className="min-h-0 flex-1 overflow-y-auto bg-[var(--sidebar)] p-8 scrollbar-thin">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-[38px] font-bold leading-tight text-[var(--text)]">{title}</h1>
            {subtitle && <div className="mt-2 text-sm text-[var(--secondary)]">{subtitle}</div>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </section>
  );
}

function LibraryRoute({ pages, workspaceName, onSelect, onNew }) {
  const [activeTab, setActiveTab] = useState("Teamspaces");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [teamspaces, setTeamspaces] = useState([
    { name: `${workspaceName} HQ`, desc: "Default workspace for private and shared pages", access: "Default", members: 1 }
  ]);

  const filteredPages = pages.filter(p => {
    if (activeTab === "Favorites" && !p.favorite) return false;
    if (activeTab === "AI Meeting Notes" && !p.title?.toLowerCase().includes("meeting") && p.icon !== "🗓️") return false;
    if (searchQuery.trim()) {
      return p.title?.toLowerCase().includes(searchQuery.toLowerCase()) || plainText(p).toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const displayPages = activeTab === "Recents"
    ? [...filteredPages].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 6)
    : filteredPages;

  return (
    <RouteShell
      title="Library"
      actions={<button onClick={async () => {
        const name = await window.noskaPrompt("Enter new teamspace name:", "", "Teamspace Name");
        if (name && name.trim()) {
          setTeamspaces([...teamspaces, { name: name.trim(), desc: "Custom teamspace for project collaboration", access: "Custom", members: 1 }]);
        }
      }} className="rounded-md bg-[var(--accent)] hover:bg-[var(--accent-deep)] px-4 py-2 text-sm font-semibold text-white transition">New teamspace</button>}
    >
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {["Teamspaces", "Recents", "Favorites", "Shared", "Private", "AI Meeting Notes"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold ${activeTab === tab ? "bg-[var(--active)] text-[var(--text)]" : "text-[var(--secondary)] hover:bg-[var(--surface)]"}`}
            >
              {tab === "Favorites" ? <Star size={16} className="fill-[var(--warning)] text-[var(--warning)]" /> : <Table2 size={16} />}
              {tab}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[var(--secondary)]">
          {searchOpen ? (
            <div className="flex items-center gap-1 border border-[var(--border-strong)] rounded bg-[var(--surface)] px-2 py-1">
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search library..."
                className="bg-transparent text-xs text-[var(--text)] outline-none w-32"
              />
              <button onClick={() => { setSearchQuery(""); setSearchOpen(false); }} className="text-xs text-[var(--muted)] hover:text-[var(--text)]">✕</button>
            </div>
          ) : (
            <button onClick={() => setSearchOpen(true)} title="Search library" className="p-2 hover:bg-[var(--hover)] rounded">
              <Search size={19} />
            </button>
          )}
        </div>
      </div>

      {activeTab === "Teamspaces" && !searchQuery && (
        <>
          <div className="grid grid-cols-[1fr_1.1fr_0.5fr_0.4fr] border-b border-[var(--border)] px-3 py-3 text-sm text-[var(--secondary)]">
            <div className="flex items-center gap-2"><Table2 size={16} />Name</div>
            <div className="flex items-center gap-2"><ListChecks size={16} />Description</div>
            <div className="flex items-center gap-2"><Home size={16} />Access</div>
            <div className="flex items-center gap-2"><MessageSquare size={16} />Members</div>
          </div>
          {teamspaces.map((t, idx) => (
            <button key={idx} onClick={() => onNew("blank")} className="grid w-full grid-cols-[1fr_1.1fr_0.5fr_0.4fr] border-b border-[var(--border)] px-3 py-4 text-left text-sm hover:bg-[var(--hover)]">
              <div className="flex items-center gap-3 font-semibold text-[var(--text)]"><ChevronRight size={15} /><span className="grid h-6 w-6 place-items-center rounded bg-[var(--surface)]">⌂</span>{t.name}</div>
              <div className="text-[var(--muted)]">{t.desc}</div>
              <div className="flex items-center gap-2 text-[var(--text)]"><span>◎</span>{t.access}</div>
              <div className="text-[var(--text)]">{t.members}</div>
            </button>
          ))}
        </>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {displayPages.map((page) => <PageCard key={page.id} page={page} onSelect={onSelect} />)}
        {displayPages.length === 0 && (
          <div className="col-span-full py-12 text-center text-sm text-[var(--muted)]">
            No pages found in this section.
          </div>
        )}
      </div>
    </RouteShell>
  );
}

function TasksRoute({ tasks, onSelect, onNew, onToast }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [hideCompleted, setHideCompleted] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [sourcesModalOpen, setSourcesModalOpen] = useState(false);
  const [sourceDocPages, setSourceDocPages] = useState(true);
  const [sourceDatabases, setSourceDatabases] = useState(true);
  const [sourceCalendars, setSourceCalendars] = useState(false);

  const filteredTasks = tasks.filter(t => {
    if (hideCompleted && t.checked) return false;
    if (searchQuery.trim() && !t.text?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <RouteShell
      title="My Tasks"
      actions={<button onClick={() => onNew("tasks")} className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">New task</button>}
    >
      <div className="mb-7 flex items-center justify-between gap-4 border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setHideCompleted(!hideCompleted)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${hideCompleted ? "bg-[var(--accent)] text-white border-[var(--accent)]" : "border-[var(--border-strong)] text-[var(--secondary)] hover:bg-[var(--hover)]"}`}
          >
            <Filter size={13} />
            {hideCompleted ? "Showing Active Tasks" : "Hide Completed Tasks"}
          </button>
          <button
            onClick={() => {
              setSourcesModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-[var(--border-strong)] text-[var(--secondary)] hover:bg-[var(--hover)] transition"
          >
            <SlidersHorizontal size={13} />
            Configure sources
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          {showSearch ? (
            <div className="flex items-center gap-1 border border-[var(--border-strong)] rounded bg-[var(--surface)] px-2 py-1">
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="bg-transparent text-xs text-[var(--text)] outline-none w-36"
              />
              <button onClick={() => { setSearchQuery(""); setShowSearch(false); }} className="text-xs text-[var(--muted)] hover:text-[var(--text)]">✕</button>
            </div>
          ) : (
            <button onClick={() => setShowSearch(true)} title="Search tasks" className="p-2 hover:bg-[var(--hover)] rounded text-[var(--secondary)]">
              <Search size={17} />
            </button>
          )}
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="grid min-h-[400px] place-items-center text-center">
          <div>
            <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-xl border border-[var(--border-strong)] text-[var(--muted)]"><CheckSquare size={34} /></div>
            <div className="text-[var(--muted)]">No tasks found. Try adding a checklist block in any document page.</div>
            <button
              onClick={() => {
                setSourcesModalOpen(true);
              }}
              className="mt-7 text-[var(--accent)] hover:underline"
            >
              Configure task sources
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-5xl divide-y divide-[var(--border)]">
          {filteredTasks.map((task) => (
            <button key={`${task.pageId}-${task.id}`} onClick={() => onSelect(task.pageId)} className="grid w-full grid-cols-[1fr_260px] items-center gap-4 py-3 text-left hover:bg-[var(--hover)] transition px-2 rounded">
              <div className="flex items-center gap-3 font-semibold text-[var(--text)]">
                <span className={`grid h-4 w-4 place-items-center rounded border border-[var(--border-strong)] ${task.checked ? "bg-[var(--accent)] border-[var(--accent)]" : ""}`}>
                  {task.checked && "✓"}
                </span>
                <span className={task.checked ? "text-[var(--muted)] line-through" : ""}>
                  {task.text || "Untitled task"}
                </span>
              </div>
              <div className="text-xs text-[var(--muted)] flex items-center gap-1.5 justify-end">
                <span>{task.pageIcon}</span>
                <span className="truncate max-w-[200px]">{task.pageTitle}</span>
              </div>
            </button>
          ))}
        </div>
      )}
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

function ChatsRoute({ aiChats, onAI, onOpenChat }) {
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
            <span className="min-w-0 flex-1 truncate font-semibold text-[var(--secondary)]">{chat.title || "AI Chat"}</span>
            <span className="text-xs text-[var(--muted)]">{timeAgo(chat.updatedAt)}</span>
          </button>
        ))}
      </div>
    </RouteShell>
  );
}

function AgentCard({ name }) {
  return (
    <div className="grid h-28 w-28 place-items-center rounded-xl bg-[var(--hover)] text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-[var(--surface)] text-3xl">◔</div>
      <div className="text-sm text-[var(--secondary)]">{name}</div>
    </div>
  );
}

function MeetingsRoute({ onNew }) {
  const [connected, setConnected] = useState(false);
  return (
    <RouteShell title="Meetings" subtitle="Upcoming">
      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <Panel title="Calendar connection">
          <div className="space-y-3 text-sm text-[var(--secondary)]">
            <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
              <div className="font-medium text-[var(--text)]">Google Calendar</div>
              <div className="mt-1 text-xs">{connected ? `Connected as ${window.realtimeCollab?.getUser?.()?.userId || 'user@email.com'}` : "Not connected to any account."}</div>
              <button
                onClick={() => setConnected(!connected)}
                className={`mt-3 rounded-md px-3 py-2 text-xs font-medium text-white ${connected ? "bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/20" : "bg-[var(--accent)]"}`}
              >
                {connected ? "Disconnect" : "Connect calendar"}
              </button>
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
    </RouteShell>
  );
}

function MeetingNoteRoute({ onNew, onAI, onToast, apiKey, aiProvider, nvidiaKey, pages }) {
  return <MeetingWorkspace onNew={onNew} onAI={onAI} onToast={onToast} apiKey={apiKey} aiProvider={aiProvider} nvidiaKey={nvidiaKey} pages={pages || []} />;
}

const INBOX_STORAGE_KEY = 'noska_inbox_reminders';

function loadInboxReminders() {
  try {
    const data = localStorage.getItem(INBOX_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveInboxReminders(reminders) {
  try { localStorage.setItem(INBOX_STORAGE_KEY, JSON.stringify(reminders)); } catch {}
}

function InboxRoute({ onNew, onToast }) {
  const [reminders, setReminders] = useState(loadInboxReminders);

  useEffect(() => {
    saveInboxReminders(reminders);
  }, [reminders]);

  const dismissReminder = (id) => {
    setReminders(prev => prev.filter(r => r.id !== id));
    saveInboxReminders(reminders.filter(r => r.id !== id));
    onToast?.("Reminder dismissed.");
  };

  const activeReminders = reminders.filter(r => !r.dismissed);

  return (
    <RouteShell title="Inbox" subtitle="Notifications & Reminders" actions={<>
      {reminders.length > 0 && (
        <button onClick={() => { setReminders([]); saveInboxReminders([]); onToast?.("All reminders cleared."); }} className="flex items-center gap-1 text-[10px] text-[var(--muted)] hover:text-[var(--text)]">
          Clear all
        </button>
      )}
    </>}>
      <div className="max-w-xl space-y-4">
        {activeReminders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-3xl mb-3 opacity-30">📥</div>
            <div className="text-sm text-[var(--muted)]">Your inbox is clear</div>
            <div className="text-[10px] text-[var(--muted)] mt-1">Notifications and reminders will appear here</div>
          </div>
        )}
        {activeReminders.map((rem) => (
          <div key={rem.id} className="border-b border-[var(--border)] pb-6 flex items-start gap-4">
            <span className="mt-1 grid h-6 w-6 place-items-center rounded-full border border-[var(--border-strong)] text-xs text-[var(--secondary)]">↻</span>
            <div className="flex-1">
              <div className="font-semibold text-[var(--text)] flex justify-between items-start">
                <span>{rem.text}</span>
                <button
                  onClick={() => dismissReminder(rem.id)}
                  className="text-xs bg-[var(--active)] px-2.5 py-1 rounded text-[var(--secondary)] hover:text-[var(--text)]"
                >
                  Dismiss
                </button>
              </div>
              <div className="mt-4 flex items-center gap-2 text-[var(--secondary)]"><CalendarDays size={17} />Due Date</div>
              <div className="mt-2 text-[var(--danger)]">{rem.date}</div>
            </div>
            <div className="text-sm text-[var(--muted)]">{rem.date ? new Date(rem.date).toLocaleDateString?.()?.slice(0, 6) || rem.date : 'No date'}</div>
          </div>
        ))}
        {reminders.filter(r => r.dismissed).length > 0 && (
          <details className="text-xs text-[var(--muted)]">
            <summary className="cursor-pointer hover:text-[var(--text)] py-1">{reminders.filter(r => r.dismissed).length} dismissed</summary>
            <div className="space-y-1 mt-1">
              {reminders.filter(r => r.dismissed).map(r => (
                <div key={r.id} className="flex items-center gap-2 text-[10px] text-[var(--muted)] line-through">
                  <span className="shrink-0">✓</span>
                  <span>{r.text}</span>
                </div>
              ))}
              <button onClick={() => { setReminders([]); saveInboxReminders([]); }} className="text-[9px] text-[var(--danger)] hover:underline">Clear dismissed</button>
            </div>
          </details>
        )}
      </div>
    </RouteShell>
  );
}

const MARKETPLACE_ITEMS = [
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

function MarketplaceRoute({ onNew, onToast }) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [modalOpen, setModalOpen] = useState(null);

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
                {window.realtimeCollab?.getUser?.()?.userName?.[0] || window.realtimeCollab?.getUser?.()?.userId?.[0] || '?'}
              </div>
              <div>
                <div className="font-bold text-sm text-[var(--text)]">{window.realtimeCollab?.getUser?.()?.userName || 'Workspace User'}</div>
                <div className="text-xs text-[var(--muted)]">{window.realtimeCollab?.getUser?.()?.userId || 'Local workspace'}</div>
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

function viewTitle(view, workspaceName) {
  return {
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
  }[view] || "Home";
}

function viewSubtitle(view) {
  return {
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
  }[view] || "";
}

function Panel({ title, children }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm transition hover:shadow-md">
      <div className="mb-4 text-sm font-bold tracking-tight text-[var(--text)]">{title}</div>
      {children}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="mb-2 rounded-md bg-[var(--surface)] p-3">
      <div className="text-xs text-[var(--secondary)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-[var(--text)]">{value}</div>
    </div>
  );
}

function PageCard({ page, onSelect }) {
  return (
    <motion.button
      whileHover={{ scale: 1.015, y: -1 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 450, damping: 25 }}
      onClick={() => onSelect(page.id)}
      className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 text-left hover:border-[var(--accent)] w-full block transition-colors duration-150"
    >
      <div className="flex items-center gap-2">
        <span>{page.icon}</span>
        <span className="truncate text-sm font-medium text-[var(--text)]">{page.title || "Untitled"}</span>
      </div>
      <div className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--secondary)]">{plainText(page).slice(0, 120) || "Empty page"}</div>
    </motion.button>
  );
}

const templateCards = [
  { id: "blank", title: "Empty page", icon: FileText, tone: "border-[var(--border)] bg-[var(--bg)]", description: "Start from a blank page." },
  { id: "database", title: "Empty database", icon: Database, tone: "border-[var(--border)] bg-[var(--bg)]", description: "Start from a database shell." },
  { id: "tasks", title: "Tasks Tracker", icon: CheckSquare, tone: "border-[var(--success)]/70 bg-[var(--success)]/15", description: "Stay organized with tasks, your way." },
  { id: "projects", title: "Projects", icon: Search, tone: "border-[var(--accent)]/70 bg-[var(--accent)]/15", description: "Manage projects start to finish." },
  { id: "docs", title: "Document Hub", icon: FileText, tone: "border-[var(--danger)]/70 bg-[var(--danger)]/15", description: "Collaborate on docs in one hub." },
  { id: "brainstorm", title: "Brainstorm Session", icon: Sparkles, tone: "border-[var(--warning)]/70 bg-[var(--warning)]/20", description: "Spark new ideas together." },
  { id: "standup", title: "Meeting Notes", icon: CalendarDays, tone: "border-[var(--warning)]/70 bg-[var(--warning)]/20", description: "Turn meetings into action." },
  { id: "goals", title: "Goals Tracker", icon: CheckSquare, tone: "border-[var(--accent)]/70 bg-[var(--accent)]/15", description: "Set team goals, achieve together." }
];

export function TemplatePicker({ onClose, onCreate }) {
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

function TemplateTile({ card, onCreate, compact }) {
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

export function AIHomeView({ onAI, onPrompt, onSettings }) {
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

export function NewPageOverlay({ page, onClose, onPagePatch, onShare, onFavorite, onMore, onAction, onToast }) {
  const titleRef = useRef(null);
  const fileInputRef = useRef(null);
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

  const handleFileImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      const title = file.name.replace(/\.[^/.]+$/, "");
      let blocks = [];
      
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
            blocks.push({ id: uid(), type: "h1", text: trimmed.slice(2) });
          } else if (trimmed.startsWith("## ")) {
            blocks.push({ id: uid(), type: "h2", text: trimmed.slice(3) });
          } else if (trimmed.startsWith("### ")) {
            blocks.push({ id: uid(), type: "h3", text: trimmed.slice(4) });
          } else if (trimmed.startsWith("- [ ]") || trimmed.startsWith("- [ ] ")) {
            blocks.push({ id: uid(), type: "todo", text: trimmed.replace(/^-\s*\[\s*\]\s*/, ""), checked: false });
          } else if (trimmed.startsWith("- [x]") || trimmed.startsWith("- [x] ")) {
            blocks.push({ id: uid(), type: "todo", text: trimmed.replace(/^-\s*\[\s*x\s*\]\s*/, ""), checked: true });
          } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            blocks.push({ id: uid(), type: "bullet", text: trimmed.slice(2) });
          } else if (trimmed.startsWith("> ")) {
            blocks.push({ id: uid(), type: "quote", text: trimmed.slice(2) });
          } else {
            blocks.push({ id: uid(), type: "text", text: trimmed });
          }
        }
      }
      
      if (blocks.length === 0) {
        blocks.push({ id: uid(), type: "text", text: "" });
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
            <span>{page.icon}</span>
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
