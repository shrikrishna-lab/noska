/**
 * Workspace widgets — Workspace Overview, Recent Activity, Favorites,
 * Pinned Items.
 */
import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, Pin, PinOff, Plus, Star } from "lucide-react";
import { timeAgo } from "../../../utils/helpers";
import type { Page } from "../../../lib/supabaseService";
import { AnimatedCount, WidgetEmpty, WidgetStat } from "../components/WidgetFrame";
import type { WidgetProps } from "../types";
import { collectActivity, favoritePages, recentPages } from "../shared";

// ── Workspace Overview ──────────────────────────────────────────────────────

export function WorkspaceOverviewWidget({ ctx }: WidgetProps) {
  const openTasks = useMemo(
    () => ctx.pages.flatMap((p) => (p.trashed ? [] : p.blocks.filter((b) => b.type === "todo"))).length,
    [ctx.pages],
  );
  const pageCount = ctx.pages.filter((p) => !p.trashed).length;
  const favorites = ctx.pages.filter((p) => p.favorite && !p.trashed).length;
  const lastActivity = ctx.pages.reduce<string | null>((latest, p) => {
    if (p.trashed) return latest;
    return !latest || new Date(p.updatedAt) > new Date(latest) ? p.updatedAt : latest;
  }, null);

  return (
    <div className="flex h-full flex-col justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-[var(--accent)]">
          <Building2 size={16} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[var(--text)]">{ctx.workspaceName || "Personal workspace"}</p>
          <p className="text-[10.5px] text-[var(--muted)]">
            {lastActivity ? `Last activity ${timeAgo(lastActivity)}` : "No activity yet"}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <WidgetStat
          label="Pages"
          value={<AnimatedCount value={pageCount} />}
          onClick={() => ctx.actions.onView?.("library")}
        />
        <WidgetStat label="Open tasks" value={<AnimatedCount value={openTasks} />} onClick={() => ctx.actions.onView?.("tasks")} />
        <WidgetStat label="Favorites" value={<AnimatedCount value={favorites} />} tone="accent" />
        <WidgetStat
          label="Shared"
          value={<AnimatedCount value={ctx.sharedPages.length} />}
          onClick={() => ctx.actions.onView?.("shared")}
        />
      </div>
    </div>
  );
}

// ── Recent Activity ─────────────────────────────────────────────────────────

const ACTION_TONE: Record<string, string> = {
  created: "text-emerald-500",
  edited: "text-blue-500",
  deleted: "text-rose-500",
  restored: "text-amber-500",
};

export function RecentActivityWidget({ size, ctx }: WidgetProps) {
  const activity = useMemo(() => collectActivity(ctx.pages, size === "wide" ? 8 : 5), [ctx.pages, size]);

  if (activity.length === 0) {
    return (
      <WidgetEmpty
        icon={<Building2 size={18} className="text-[var(--muted)]" />}
        title="No activity yet"
        hint="Edits, comments and task changes across your workspace will appear here."
      />
    );
  }

  return (
    <div className="h-full space-y-1 overflow-y-auto scrollbar-thin">
      <AnimatePresence initial={false}>
        {activity.map((item, i) => (
          <motion.button
            key={`${item.pageId}-${item.timestamp}-${i}`}
            layout
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onClick={() => ctx.actions.onSelect(item.pageId)}
            className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-[var(--surface)] cursor-pointer"
          >
            <span className={`text-sm ${ACTION_TONE[item.action] ?? "text-[var(--muted)]"}`}>●</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11.5px] text-[var(--text)]">
                <span className="font-semibold">{item.pageTitle}</span>
                <span className="text-[var(--muted)]"> — {item.action}</span>
                {item.detail && <span className="text-[var(--muted)]"> · {item.detail}</span>}
              </span>
            </span>
            <span className="shrink-0 text-[10px] text-[var(--muted)]">{timeAgo(item.timestamp)}</span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Favorites ───────────────────────────────────────────────────────────────

export function FavoritesWidget({ ctx }: WidgetProps) {
  const favorites = useMemo(() => favoritePages(ctx.pages).slice(0, 6), [ctx.pages]);

  if (favorites.length === 0) {
    return (
      <WidgetEmpty
        icon={<Star size={18} className="text-amber-400" />}
        title="No favorites yet"
        hint="Star any page to pin it here for instant access."
      />
    );
  }

  return (
    <div className="h-full space-y-1 overflow-y-auto scrollbar-thin">
      {favorites.map((page: Page) => (
        <button
          key={page.id}
          onClick={() => ctx.actions.onSelect(page.id)}
          className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-[var(--surface)] cursor-pointer"
        >
          <Star size={12} className="shrink-0 fill-amber-400 text-amber-400" />
          <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-[var(--text)]">
            {page.title || "Untitled"}
          </span>
          <span className="shrink-0 text-[10px] text-[var(--muted)]">{timeAgo(page.updatedAt)}</span>
        </button>
      ))}
    </div>
  );
}

// ── Pinned Items ────────────────────────────────────────────────────────────

const PIN_KEY = "noska:pinned-pages:v1";

function loadPins(): string[] {
  try {
    const raw = localStorage.getItem(PIN_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function PinnedItemsWidget({ ctx }: WidgetProps) {
  const [pins, setPins] = useState<string[]>(loadPins);
  const [picking, setPicking] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem(PIN_KEY, JSON.stringify(pins));
    } catch {
      /* ignore */
    }
  }, [pins]);

  const pinnedPages = useMemo(
    () =>
      pins
        .map((id) => [...ctx.pages, ...ctx.sharedPages].find((p) => p.id === id && !p.trashed))
        .filter((p): p is Page => Boolean(p))
        .slice(0, 6),
    [pins, ctx.pages, ctx.sharedPages],
  );
  const pinnable = useMemo(
    () =>
      [...ctx.pages, ...ctx.sharedPages]
        .filter((p) => !p.trashed && !pins.includes(p.id))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 8),
    [ctx.pages, ctx.sharedPages, pins],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto scrollbar-thin">
        {pinnedPages.length === 0 && (
          <WidgetEmpty
            icon={<Pin size={18} className="text-[var(--muted)]" />}
            title="Nothing pinned"
            hint="Pin the pages you reach for constantly — they stay one click away."
          />
        )}
        <AnimatePresence initial={false}>
          {pinnedPages.map((page) => (
            <motion.div
              key={page.id}
              layout
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="group flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-[var(--surface)]"
            >
              <button onClick={() => ctx.actions.onSelect(page.id)} className="min-w-0 flex-1 text-left cursor-pointer">
                <span className="flex items-center gap-1.5">
                  <span className="text-sm">{page.icon || "📝"}</span>
                  <span className="truncate text-[11.5px] font-semibold text-[var(--text)]">
                    {page.title || "Untitled"}
                  </span>
                </span>
              </button>
              <button
                onClick={() => setPins((prev) => prev.filter((id) => id !== page.id))}
                title="Unpin"
                className="rounded-md p-1 text-[var(--muted)] opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100 cursor-pointer"
              >
                <PinOff size={12} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {picking ? (
        <div className="mt-2 space-y-0.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5">
          {pinnable.length === 0 && <p className="px-2 py-1 text-[10.5px] text-[var(--muted)]">Nothing left to pin.</p>}
          {pinnable.map((page) => (
            <button
              key={page.id}
              onClick={() => {
                setPins((prev) => [...prev, page.id]);
                setPicking(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-[11px] font-medium text-[var(--text)] hover:bg-[var(--panel)] cursor-pointer"
            >
              <span>{page.icon || "📝"}</span>
              <span className="truncate">{page.title || "Untitled"}</span>
            </button>
          ))}
        </div>
      ) : (
        <button
          onClick={() => setPicking(true)}
          className="mt-1.5 flex items-center justify-center gap-1 rounded-lg py-1.5 text-[10.5px] font-semibold text-[var(--accent)] hover:bg-[var(--surface)] cursor-pointer"
        >
          <Plus size={11} /> Pin a page
        </button>
      )}
    </div>
  );
}
