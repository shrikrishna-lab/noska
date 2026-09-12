/**
 * Shared data derivation for widgets. All user data flows from the live
 * `pages` array (already realtime-synced upstream in pagesRealtime.ts) —
 * widgets never poll the database directly for this data.
 */
import type { BaseBlock } from "../../../types/blocks";
import type { Page } from "../../lib/supabaseService";
import type { WidgetRuntimeContext } from "./types";

export interface TaskLite {
  /** `${pageId}:${blockId}` — unique across pages. */
  key: string;
  blockId: string;
  pageId: string;
  pageTitle: string;
  pageIcon: string;
  text: string;
  checked: boolean;
  /** ISO date string when the block carries one (properties.due / due /
   * spaced-repetition review date). Most todo blocks have none. */
  due?: string;
  priority?: "high" | "medium" | "low";
  updatedAt: string;
}

const PRIORITY_HINTS: Array<[RegExp, TaskLite["priority"]]> = [
  [/\b(urgent|asap|critical|high priority)\b/i, "high"],
  [/\b(review|follow ?up)\b/i, "medium"],
];

function priorityFromText(text: string): TaskLite["priority"] | undefined {
  for (const [re, p] of PRIORITY_HINTS) if (re.test(text)) return p;
  return undefined;
}

function dueFromBlock(block: BaseBlock): string | undefined {
  const props = (block.properties ?? {}) as Record<string, unknown>;
  const raw = (block as Record<string, unknown>).due ?? props.due ?? props.dueDate;
  if (typeof raw === "string" && raw) {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  const review = (block as Record<string, unknown>).review as { nextReview?: string } | undefined;
  if (review?.nextReview) {
    const d = new Date(review.nextReview);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  return undefined;
}

export function collectTasks(pages: Page[]): TaskLite[] {
  const out: TaskLite[] = [];
  for (const page of pages) {
    if (page.trashed) continue;
    for (const block of page.blocks ?? []) {
      if (block.type !== "todo") continue;
      const props = (block.properties ?? {}) as Record<string, unknown>;
      const priorityRaw = (block as Record<string, unknown>).priority ?? props.priority;
      out.push({
        key: `${page.id}:${block.id}`,
        blockId: block.id,
        pageId: page.id,
        pageTitle: page.title || "Untitled",
        pageIcon: page.icon || "📝",
        text: block.text || "Untitled task",
        checked: Boolean((block as Record<string, unknown>).checked),
        due: dueFromBlock(block),
        priority:
          priorityRaw === "high" || priorityRaw === "medium" || priorityRaw === "low"
            ? priorityRaw
            : priorityFromText(block.text || ""),
        updatedAt: page.updatedAt,
      });
    }
  }
  return out;
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfToday(): Date {
  const d = startOfToday();
  d.setDate(d.getDate() + 1);
  return d;
}

export function endOfTomorrow(): Date {
  const d = endOfToday();
  d.setDate(d.getDate() + 1);
  return d;
}

/** Priority sort: high → medium → low, then earliest due first. */
export function sortTasks(tasks: TaskLite[]): TaskLite[] {
  const rank = { high: 0, medium: 1, low: 2 } as const;
  return [...tasks].sort((a, b) => {
    const pa = a.priority ? rank[a.priority] : 3;
    const pb = b.priority ? rank[b.priority] : 3;
    if (pa !== pb) return pa - pb;
    const da = a.due ? new Date(a.due).getTime() : Infinity;
    const dbb = b.due ? new Date(b.due).getTime() : Infinity;
    return da - dbb;
  });
}

export interface ActivityLite {
  pageId: string;
  pageTitle: string;
  pageIcon: string;
  action: string;
  detail?: string;
  user?: string;
  timestamp: string;
}

interface LineageEntryLike {
  action?: string;
  detail?: string;
  user?: string;
  userName?: string;
  timestamp?: string;
}

export function collectActivity(pages: Page[], limit = 12): ActivityLite[] {
  const list: ActivityLite[] = [];
  for (const page of pages) {
    if (page.trashed) continue;
    for (const event of (page.lineage ?? []) as LineageEntryLike[]) {
      list.push({
        pageId: page.id,
        pageTitle: page.title || "Untitled",
        pageIcon: page.icon || "📝",
        action: event.action || "edited",
        detail: event.detail,
        user: event.userName || event.user,
        timestamp: event.timestamp || page.updatedAt,
      });
    }
  }
  return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
}

export interface MentionLite {
  key: string;
  pageId: string;
  pageTitle: string;
  pageIcon: string;
  from: string;
  text: string;
  at: string;
}

interface CommentLike {
  userId?: string;
  userName?: string;
  text?: string;
  createdAt?: string;
  timestamp?: string;
}

/** Mentions = comments from other users, most recent first. A page-comment
 * is the only reliable "someone pointed this at me" signal available
 * client-side today (inline person-mention blocks don't carry a target
 * user id — see MentionBlock in types/blocks.ts). */
export function collectMentions(ctx: WidgetRuntimeContext, limit = 8): MentionLite[] {
  const out: MentionLite[] = [];
  const me = ctx.currentUserId;
  for (const page of [...ctx.pages, ...ctx.sharedPages]) {
    if (page.trashed) continue;
    for (const c of (page.comments ?? []) as CommentLike[]) {
      if (!c?.text) continue;
      if (me && c.userId && c.userId === me) continue;
      out.push({
        key: `${page.id}:${c.createdAt ?? c.timestamp ?? c.text}`,
        pageId: page.id,
        pageTitle: page.title || "Untitled",
        pageIcon: page.icon || "📝",
        from: c.userName || "Someone",
        text: c.text,
        at: c.createdAt || c.timestamp || page.updatedAt,
      });
    }
  }
  return out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit);
}

export function recentPages(pages: Page[], limit = 6): Page[] {
  return pages
    .filter((p) => !p.trashed)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit);
}

export function favoritePages(pages: Page[]): Page[] {
  return pages.filter((p) => p.favorite && !p.trashed);
}

/** Projects = pages carrying database blocks (the closest thing to a
 * project tracker in the current model). Completion = share of rows whose
 * status/checkbox property reads done. Defensive: database block shapes
 * vary, anything unreadable is skipped. */
export interface ProjectLite {
  pageId: string;
  pageTitle: string;
  pageIcon: string;
  total: number;
  done: number;
  percent: number;
}

export function collectProjects(pages: Page[]): ProjectLite[] {
  const out: ProjectLite[] = [];
  for (const page of pages) {
    if (page.trashed) continue;
    for (const block of page.blocks ?? []) {
      if (block.type !== "database") continue;
      const db = (block as Record<string, unknown>).database as
        | { rows?: Array<Record<string, unknown>>; properties?: Record<string, { type?: string }> }
        | undefined;
      const rows = db?.rows;
      if (!Array.isArray(rows) || rows.length === 0) continue;
      const props = db?.properties ?? {};
      const checkboxId = Object.keys(props).find((k) => props[k]?.type === "checkbox");
      const statusId = Object.keys(props).find((k) => props[k]?.type === "status");
      let done = 0;
      for (const row of rows) {
        const cells = (row.cells ?? row) as Record<string, unknown>;
        const cb = checkboxId ? cells[checkboxId] : undefined;
        const st = statusId ? cells[statusId] : undefined;
        if (cb === true || st === "done" || st === "Done" || st === "complete") done++;
      }
      out.push({
        pageId: page.id,
        pageTitle: page.title || "Untitled",
        pageIcon: page.icon || "🚀",
        total: rows.length,
        done,
        percent: Math.round((done / rows.length) * 100),
      });
    }
  }
  return out.sort((a, b) => b.total - a.total).slice(0, 4);
}
