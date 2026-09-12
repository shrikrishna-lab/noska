/**
 * Notification widgets — Unread Notifications, Mentions, Attention Required.
 */
import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AtSign, Bell, ChevronRight, MessageSquare, TriangleAlert, UserPlus } from "lucide-react";
import { timeAgo } from "../../../utils/helpers";
import { fetchAutomations, type NoskaAutomation } from "../../../features/automations/automationStore";
import { AnimatedCount, WidgetEmpty, WidgetStat } from "../components/WidgetFrame";
import { useNotifications } from "../notifications/engine";
import type { WidgetProps } from "../types";
import { collectMentions, collectTasks, type TaskLite } from "../shared";

// ── Unread Notifications ────────────────────────────────────────────────────

export function UnreadNotificationsWidget({ ctx }: WidgetProps) {
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const latest = notifications.filter((n) => !n.read).slice(0, 3);

  return (
    <div className="flex h-full flex-col justify-center gap-3">
      <button
        onClick={() => window.dispatchEvent(new CustomEvent("noska:open-notifications"))}
        className="text-left cursor-pointer"
      >
        <div className="flex items-baseline gap-2">
          <AnimatedCount value={unreadCount} className="text-3xl font-bold text-[var(--text)]" />
          <span className="text-[11px] font-semibold text-[var(--muted)]">unread</span>
        </div>
        <p className="mt-0.5 flex items-center gap-1 text-[10.5px] font-semibold text-[var(--accent)]">
          Open Notification Center <ChevronRight size={11} />
        </p>
      </button>
      {latest.length > 0 && (
        <div className="space-y-1">
          <AnimatePresence initial={false}>
            {latest.map((n) => (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="truncate rounded-lg bg-[var(--surface)] px-2.5 py-1.5"
              >
                <p className="truncate text-[10.5px] font-semibold text-[var(--text)]">{n.title}</p>
                <p className="truncate text-[10px] text-[var(--muted)]">{n.body}</p>
              </motion.div>
            ))}
          </AnimatePresence>
          <button
            onClick={markAllRead}
            className="w-full rounded-lg py-1 text-[10px] font-semibold text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
          >
            Mark all read
          </button>
        </div>
      )}
      {unreadCount === 0 && (
        <button
          onClick={() => ctx.actions.onView?.("inbox")}
          className="text-[10px] font-semibold text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
        >
          You're all caught up
        </button>
      )}
    </div>
  );
}

// ── Mentions ────────────────────────────────────────────────────────────────

export function MentionsWidget({ ctx }: WidgetProps) {
  const mentions = useMemo(() => collectMentions(ctx), [ctx]);

  if (mentions.length === 0) {
    return (
      <WidgetEmpty
        icon={<AtSign size={18} className="text-[var(--muted)]" />}
        title="No mentions yet"
        hint="When teammates comment on your shared pages, they'll appear here."
      />
    );
  }

  return (
    <div className="h-full space-y-1 overflow-y-auto scrollbar-thin">
      <AnimatePresence initial={false}>
        {mentions.slice(0, 5).map((m) => (
          <motion.button
            key={m.key}
            layout
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onClick={() => ctx.actions.onSelect(m.pageId)}
            className="flex w-full items-start gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-[var(--surface)] cursor-pointer"
          >
            <MessageSquare size={13} className="mt-0.5 shrink-0 text-[var(--accent)]" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11.5px] text-[var(--text)]">
                <span className="font-semibold">{m.from}</span>
                <span className="text-[var(--muted)]"> on </span>
                <span className="font-semibold">{m.pageTitle}</span>
              </span>
              <span className="line-clamp-2 text-[10.5px] leading-4 text-[var(--secondary)]">{m.text}</span>
            </span>
            <span className="shrink-0 text-[10px] text-[var(--muted)]">{timeAgo(m.at)}</span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Attention Required ──────────────────────────────────────────────────────

interface AttentionItem {
  key: string;
  icon: React.ReactNode;
  title: string;
  detail: string;
  pageId?: string;
}

export function AttentionRequiredWidget({ size, ctx }: WidgetProps) {
  const [failing, setFailing] = useState<NoskaAutomation[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchAutomations()
      .then((all) => {
        if (!cancelled) {
          setFailing((all as NoskaAutomation[]).filter((a) => a.status === "active" && (a.health === "failing" || a.failureStreak > 0)));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const items = useMemo<AttentionItem[]>(() => {
    const now = Date.now();
    const list: AttentionItem[] = [];
    for (const task of collectTasks(ctx.pages)) {
      if (task.checked || !task.due) continue;
      if (new Date(task.due).getTime() >= now) continue;
      list.push({
        key: `overdue:${task.key}`,
        icon: <TriangleAlert size={13} className="mt-0.5 shrink-0 text-rose-500" />,
        title: `Overdue: ${task.text}`,
        detail: task.pageTitle,
        pageId: task.pageId,
      });
    }
    for (const invite of ctx.pendingInvites) {
      list.push({
        key: `invite:${String(invite.id ?? Math.random())}`,
        icon: <UserPlus size={13} className="mt-0.5 shrink-0 text-blue-500" />,
        title: "Pending page invite",
        detail: String(invite.page_title ?? invite.pageTitle ?? "A page wants your attention"),
      });
    }
    for (const automation of failing) {
      list.push({
        key: `automation:${automation.id}`,
        icon: <TriangleAlert size={13} className="mt-0.5 shrink-0 text-amber-500" />,
        title: `Automation failing: ${automation.name}`,
        detail: `${automation.failureStreak} consecutive failure${automation.failureStreak === 1 ? "" : "s"}`,
      });
    }
    return list;
  }, [ctx.pages, ctx.pendingInvites, failing]);

  if (items.length === 0) {
    return (
      <WidgetEmpty
        icon={<Bell size={18} className="text-emerald-500" />}
        title="Nothing needs you"
        hint="Overdue tasks, failed automations and pending approvals land here the moment they appear."
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2">
        <WidgetStat
          label="Items need action"
          value={<AnimatedCount value={items.length} />}
          tone="danger"
        />
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto scrollbar-thin">
        <AnimatePresence initial={false}>
          {items.slice(0, size === "small" ? 3 : 5).map((item) => (
            <motion.button
              key={item.key}
              layout
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onClick={() => item.pageId && ctx.actions.onSelect(item.pageId)}
              className="flex w-full items-start gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-[var(--surface)] cursor-pointer"
            >
              {item.icon}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11.5px] font-semibold text-[var(--text)]">{item.title}</span>
                <span className="block truncate text-[10px] text-[var(--muted)]">{item.detail}</span>
              </span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
