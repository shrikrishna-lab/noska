import React, { useMemo } from "react";
import { Lock, Star, Sparkles, MessageSquare, Mic, CheckSquare, Inbox } from "lucide-react";
import type { Page } from "../../lib/supabaseService";
import { PageIcon } from "../PageIcon";
import { plainText, timeAgo } from "../../utils/helpers";
import MonthCalendar from "../MonthCalendar";

interface ViewPreviewProps {
  view: string;
  pages: Page[];
  sharedPages?: Page[];
  pendingInvites?: Array<{ id: string; inviter_username?: string | null; role?: string | null; page_title?: string | null }>;
  aiChats?: Array<{ id: string; name?: string | null; updatedAt?: string | null }>;
}

type TaskRow = { id: string; text?: string; checked?: unknown; pageTitle: string; pageIcon: string; pageId: string };

const TODAY = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

export default function ViewPreview({ view, pages, sharedPages = [], pendingInvites = [], aiChats = [] }: ViewPreviewProps) {
  const activePages = pages.filter((p) => !p.trashed);

  const tasks: TaskRow[] = useMemo(
    () =>
      activePages.flatMap((page) =>
        (page.blocks || [])
          .filter((b) => b.type === "todo")
          .map((b) => ({
            id: b.id,
            text: typeof b.text === "string" ? b.text : "",
            checked: (b as unknown as { checked?: unknown }).checked,
            pageTitle: page.title,
            pageIcon: page.icon,
            pageId: page.id
          }))
      ),
    [activePages]
  );

  const recent = useMemo(
    () => [...activePages].sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()).slice(0, 6),
    [activePages]
  );

  const calendarRows = useMemo(
    () => [...activePages].sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()),
    [activePages]
  );

  const dueReviews = useMemo(() => {
    let count = 0;
    const now = new Date().toISOString();
    for (const page of activePages) {
      for (const block of page.blocks || []) {
        const review = (block as unknown as { review?: { nextReview?: string } }).review;
        if (review && (!review.nextReview || review.nextReview <= now)) count++;
      }
    }
    return count;
  }, [activePages]);

  const openTasks = tasks.filter((t) => !t.checked).length;

  const renderBlockStats = (page: Page) => (
    <div className="mt-2 flex items-center justify-between border-t border-[var(--border)]/65 pt-1.5 text-[9.5px] text-[var(--muted)]">
      <span>{page.blocks?.length || 0} blocks</span>
      <span>{timeAgo(page.updatedAt)}</span>
    </div>
  );

  if (view === "calendar") {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3">
        <div className="mb-2.5 text-[12px] font-bold tracking-tight text-[var(--text)]">Calendar</div>
        <MonthCalendar pages={calendarRows} compact />
      </div>
    );
  }

  if (view === "tasks") {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-[12px] font-bold tracking-tight text-[var(--text)]">My Tasks</div>
          <div className="text-[10px] text-[var(--muted)]">
            {openTasks} open · {tasks.length - openTasks} done
          </div>
        </div>
        {tasks.length === 0 ? (
          <div className="rounded-md border border-dashed border-[var(--border)] p-4 text-center text-[10.5px] text-[var(--muted)]">
            No checklist tasks created in notes. Checkboxes in your documents will appear here.
          </div>
        ) : (
          <div className="space-y-1">
            {tasks.map((t) => (
              <div key={`${t.pageId}-${t.id}`} className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-[var(--hover)]">
                <input type="checkbox" readOnly checked={!!t.checked} className="pointer-events-none" />
                <span className={`min-w-0 flex-1 truncate text-[11.5px] ${t.checked ? "text-[var(--muted)] line-through" : "text-[var(--text)]"}`}>
                  {t.text || "Untitled task"}
                </span>
                <span className="shrink-0 flex items-center gap-1 text-[10px] text-[var(--muted)]">
                  <PageIcon icon={t.pageIcon} size={10} fallback="📄" />
                  <span className="max-w-[80px] truncate">{t.pageTitle}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (view === "library") {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-[12px] font-bold tracking-tight text-[var(--text)]">Library</div>
          <div className="text-[10px] text-[var(--muted)]">{activePages.length} pages</div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {recent.map((page) => (
            <div key={page.id} className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 text-left">
              <div className="flex items-center gap-1.5">
                <PageIcon icon={page.icon} size={13} fallback="📄" />
                <span className="truncate text-[11.5px] font-medium text-[var(--text)]">{page.title || "Untitled"}</span>
              </div>
              <div className="mt-1 line-clamp-1 text-[10px] leading-4 text-[var(--secondary)]">
                {plainText(page).slice(0, 60) || "Empty page"}
              </div>
              {renderBlockStats(page)}
            </div>
          ))}
          {recent.length === 0 && (
            <div className="col-span-2 rounded-md border border-dashed border-[var(--border)] p-4 text-center text-[10.5px] text-[var(--muted)]">
              No pages found in this section.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === "inbox") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Inbox size={12} className="text-[var(--accent)]" />
          <div className="text-[12px] font-bold tracking-tight text-[var(--text)]">Inbox</div>
        </div>
        {pendingInvites.length > 0 ? (
          <div className="space-y-1.5">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] p-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--accent)]/10 text-[10px] font-bold text-[var(--accent)]">
                  {(inv.inviter_username || "?")[0]?.toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11px] text-[var(--text)]">
                    <span className="font-semibold">@{inv.inviter_username || "someone"}</span> invited you
                  </div>
                  <div className="truncate text-[10px] text-[var(--muted)]">{inv.page_title || "Untitled"}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-[var(--border)] p-4 text-center text-[10.5px] text-[var(--muted)]">
            You're all caught up.
          </div>
        )}
      </div>
    );
  }

  if (view === "home") {
    return (
      <div className="space-y-2.5">
        <div className="text-[10px] font-semibold tracking-wider text-[var(--accent)] uppercase">{TODAY}</div>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: "Pages", value: activePages.length, cls: "text-[var(--text)]" },
            { label: "Tasks", value: openTasks, cls: "text-[var(--text)]" },
            { label: "Reviews", value: dueReviews, cls: "text-[var(--danger)]" },
            { label: "Stars", value: activePages.filter((p) => p.favorite).length, cls: "text-[var(--accent)]" }
          ].map((m) => (
            <div key={m.label} className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-2">
              <div className="text-[9px] uppercase font-semibold text-[var(--muted)]">{m.label}</div>
              <div className={`mt-0.5 text-lg font-bold ${m.cls}`}>{m.value}</div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-2.5">
          <div className="mb-1.5 text-[11px] font-bold tracking-tight text-[var(--text)]">Continue Working</div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {recent.slice(0, 4).map((page) => (
              <div key={page.id} className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px]">{page.icon || "📝"}</span>
                  <span className="truncate text-[11px] font-semibold text-[var(--text)]">{page.title || "Untitled"}</span>
                  {page.isEncrypted && <Lock size={9} className="text-[var(--danger)] shrink-0" />}
                </div>
                <div className="mt-1 line-clamp-1 text-[10px] leading-4 text-[var(--secondary)]">
                  {plainText(page) || <span className="italic text-[var(--muted)]">Empty document page</span>}
                </div>
                {renderBlockStats(page)}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-2.5">
          <div className="mb-1.5 text-[11px] font-bold tracking-tight text-[var(--text)]">Today's Priorities</div>
          {tasks.length === 0 ? (
            <div className="text-center text-[10px] italic text-[var(--muted)]">No checklist tasks created yet.</div>
          ) : (
            <div className="max-h-[110px] space-y-1 overflow-y-auto scrollbar-thin">
              {tasks.map((t) => (
                <div key={`${t.pageId}-${t.id}`} className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-[var(--hover)]">
                  <input type="checkbox" readOnly checked={!!t.checked} className="pointer-events-none" />
                  <span className={`min-w-0 flex-1 truncate text-[11px] ${t.checked ? "text-[var(--muted)] line-through" : "text-[var(--text)]"}`}>
                    {t.text || "Untitled task"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === "chats") {
    return (
      <div className="space-y-2">
        <div className="text-[12px] font-bold tracking-tight text-[var(--text)]">Chats</div>
        {aiChats.length === 0 ? (
          <div className="rounded-md border border-dashed border-[var(--border)] p-4 text-center text-[10.5px] text-[var(--muted)]">
            No AI chats yet. Start a chat and it will appear here.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">
            {aiChats.slice(0, 8).map((chat) => (
              <div key={chat.id} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-[var(--surface)]">
                <MessageSquare size={13} className="text-[var(--secondary)]" />
                <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-[var(--secondary)]">
                  {(chat as unknown as { title?: string }).title || chat.name || "AI Chat"}
                </span>
                <span className="text-[10px] text-[var(--muted)]">{timeAgo(chat.updatedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (view === "meetings") {
    return (
      <div className="space-y-2">
        <div className="text-[12px] font-bold tracking-tight text-[var(--text)]">Upcoming Meetings</div>
        <div className="space-y-1.5">
          {["Design review", "Weekly standup", "Planning sync"].map((meeting, index) => (
            <div key={meeting} className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface)] p-2">
              <div className="text-[11.5px] font-medium text-[var(--text)]">{meeting}</div>
              <div className="text-[10px] text-[var(--muted)]">Today {10 + index}:00</div>
            </div>
          ))}
        </div>
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-2">
          <div className="text-[11px] font-medium text-[var(--text)]">Google Calendar</div>
          <div className="mt-0.5 text-[10px] text-[var(--secondary)]">Connect to review events here.</div>
        </div>
      </div>
    );
  }

  if (view === "meetingNote") {
    return (
      <div className="space-y-2">
        <div className="text-[12px] font-bold tracking-tight text-[var(--text)]">AI Meeting Capture</div>
        <div className="grid gap-1.5">
          {[
            { icon: <Mic size={15} className="text-[var(--accent)]" />, title: "Start new note", desc: "Updates, blockers, and action items." },
            { icon: <Sparkles size={15} className="text-[var(--accent)]" />, title: "Ask AI to draft", desc: "Build an agenda, summary, or follow-ups." },
            { icon: <CheckSquare size={15} className="text-[var(--accent)]" />, title: "Action tracker", desc: "Turn decisions into a task tracker." }
          ].map((c) => (
            <div key={c.title} className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-2.5">
              <div className="flex items-center gap-2">
                {c.icon}
                <div className="text-[11.5px] font-medium text-[var(--text)]">{c.title}</div>
              </div>
              <div className="mt-0.5 pl-[23px] text-[10px] leading-4 text-[var(--secondary)]">{c.desc}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (view === "shared") {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-[12px] font-bold tracking-tight text-[var(--text)]">Shared with you</div>
          <div className="text-[10px] text-[var(--muted)]">{sharedPages.length} pages</div>
        </div>
        {sharedPages.length === 0 ? (
          <div className="rounded-md border border-dashed border-[var(--border)] p-4 text-center text-[10.5px] text-[var(--muted)]">
            No pages have been shared with you yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {sharedPages.slice(0, 6).map((page) => (
              <div key={page.id} className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 text-left">
                <div className="flex items-center gap-1.5">
                  <PageIcon icon={page.icon} size={13} fallback="📄" />
                  <span className="truncate text-[11.5px] font-medium text-[var(--text)]">{page.title || "Untitled"}</span>
                </div>
                <div className="mt-1 line-clamp-1 text-[10px] leading-4 text-[var(--secondary)]">
                  {plainText(page).slice(0, 60) || "Empty page"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Fallback for feature dashboards (marketplace, creator, agents, teamspace)
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Star size={12} className="text-[var(--accent)]" />
        <div className="text-[12px] font-bold tracking-tight text-[var(--text)]">Workspace Pulse</div>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Pages", value: activePages.length, cls: "text-[var(--text)]" },
          { label: "Tasks", value: openTasks, cls: "text-[var(--text)]" },
          { label: "Reviews", value: dueReviews, cls: "text-[var(--danger)]" },
          { label: "Stars", value: activePages.filter((p) => p.favorite).length, cls: "text-[var(--accent)]" }
        ].map((m) => (
          <div key={m.label} className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-2">
            <div className="text-[9px] uppercase font-semibold text-[var(--muted)]">{m.label}</div>
            <div className={`mt-0.5 text-lg font-bold ${m.cls}`}>{m.value}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-2.5">
        <div className="mb-1.5 text-[11px] font-bold tracking-tight text-[var(--text)]">Recent Pages</div>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {recent.slice(0, 4).map((page) => (
            <div key={page.id} className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px]">{page.icon || "📝"}</span>
                <span className="truncate text-[11px] font-semibold text-[var(--text)]">{page.title || "Untitled"}</span>
              </div>
              {renderBlockStats(page)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}