/**
 * Productivity widgets — Quick Create, My Tasks, Upcoming Tasks,
 * Recent Pages.
 */
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Check,
  ChevronRight,
  Clock,
  FileText,
  Lock,
  Sparkles,
  Table2,
} from "lucide-react";
import { timeAgo } from "../../../utils/helpers";
import type { Page } from "../../../lib/supabaseService";
import {
  AnimatedCount,
  WidgetEmpty,
  WidgetStat,
} from "../components/WidgetFrame";
import type { WidgetProps } from "../types";
import {
  collectTasks,
  endOfToday,
  endOfTomorrow,
  recentPages,
  sortTasks,
  startOfToday,
  type TaskLite,
} from "../shared";

// ── Quick Create ────────────────────────────────────────────────────────────

const CREATE_ACTIONS: Array<{ template: string; label: string; icon: React.ReactNode }> = [
  { template: "blank", label: "New page", icon: <FileText size={14} /> },
  { template: "prd", label: "New task", icon: <Check size={14} /> },
  { template: "standup", label: "New doc", icon: <FileText size={14} /> },
  { template: "database", label: "New database", icon: <Table2 size={14} /> },
  { template: "ai", label: "AI generate", icon: <Sparkles size={14} /> },
];

export function QuickCreateWidget({ ctx }: WidgetProps) {
  return (
    <div className="flex h-full flex-col justify-center gap-1.5">
      {CREATE_ACTIONS.map((action, i) => (
        <motion.button
          key={action.template}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={() =>
            action.template === "ai"
              ? ctx.actions.onAI()
              : ctx.actions.onNew(action.template)
          }
          className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left text-[11.5px] font-semibold text-[var(--text)] transition-colors hover:border-[var(--accent)] cursor-pointer"
        >
          <span className="text-[var(--accent)]">{action.icon}</span>
          {action.label}
          <ChevronRight size={12} className="ml-auto text-[var(--muted)]" />
        </motion.button>
      ))}
    </div>
  );
}

// ── My Tasks ────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  onToggle,
  onOpen,
}: {
  task: TaskLite;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const priorityColor =
    task.priority === "high"
      ? "bg-rose-500"
      : task.priority === "medium"
        ? "bg-amber-500"
        : task.priority === "low"
          ? "bg-blue-400"
          : null;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 12 }}
      className="group flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-[var(--surface)]"
    >
      <button
        onClick={onToggle}
        aria-label={task.checked ? "Mark incomplete" : "Mark complete"}
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all cursor-pointer ${
          task.checked
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-[var(--border)] hover:border-emerald-500"
        }`}
      >
        {task.checked && <Check size={10} strokeWidth={3.5} />}
      </button>
      <button onClick={onOpen} className="min-w-0 flex-1 text-left cursor-pointer">
        <p className={`truncate text-[11.5px] font-medium text-[var(--text)] ${task.checked ? "line-through opacity-50" : ""}`}>
          {task.text}
        </p>
        <p className="truncate text-[10px] text-[var(--muted)]">
          {task.pageTitle}
          {task.due && !task.checked && new Date(task.due) < new Date() && " · overdue"}
        </p>
      </button>
      {priorityColor && !task.checked && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${priorityColor}`} />}
    </motion.div>
  );
}

interface MyTasksConfig {
  showOverdue?: boolean;
  sortBy?: "priority" | "due" | "created";
}

export function MyTasksWidget({ config, size, ctx }: WidgetProps) {
  const cfg = config as MyTasksConfig;
  const tasks = useMemo(() => collectTasks(ctx.pages), [ctx.pages]);
  const now = new Date();

  const visible = useMemo(() => {
    const todayEnd = endOfToday();
    const list = tasks.filter((t) => {
      if (t.checked) return false;
      if (!t.due) return true; // undated tasks are "today's focus"
      return cfg.showOverdue !== false ? true : new Date(t.due) <= todayEnd;
    });
    const sorted = sortTasks(list);
    if (cfg.sortBy === "due") {
      return sorted.sort((a, b) => {
        const da = a.due ? new Date(a.due).getTime() : Infinity;
        const db = b.due ? new Date(b.due).getTime() : Infinity;
        return da - db;
      });
    }
    return sorted;
  }, [tasks, cfg]);

  const overdueCount = tasks.filter((t) => !t.checked && t.due && new Date(t.due) < now).length;
  const doneToday = tasks.filter(
    (t) => t.checked && new Date(t.updatedAt) >= startOfToday(),
  ).length;
  const shown = size === "small" ? 3 : size === "large" ? 8 : 5;

  const toggle = (task: TaskLite) => {
    ctx.actions.onBlockPatch?.(task.pageId, task.blockId, { checked: !task.checked });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2.5 grid grid-cols-3 gap-2">
        <WidgetStat label="Open" value={<AnimatedCount value={tasks.filter((t) => !t.checked).length} />} />
        <WidgetStat label="Overdue" value={<AnimatedCount value={overdueCount} />} tone={overdueCount > 0 ? "danger" : "default"} />
        <WidgetStat label="Done today" value={<AnimatedCount value={doneToday} />} tone="success" />
      </div>
      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto scrollbar-thin">
        {visible.length === 0 ? (
          <WidgetEmpty
            icon={<Check size={18} className="text-emerald-500" />}
            title="No tasks today"
            hint="You're all caught up. New tasks from any page will appear here."
            action={
              <button
                onClick={() => ctx.actions.onView?.("tasks")}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text)] hover:border-[var(--accent)] cursor-pointer"
              >
                Open tasks
              </button>
            }
          />
        ) : (
          visible.slice(0, shown).map((task) => (
            <TaskRow
              key={task.key}
              task={task}
              onToggle={() => toggle(task)}
              onOpen={() => ctx.actions.onSelect(task.pageId)}
            />
          ))
        )}
      </div>
      {visible.length > shown && (
        <button
          onClick={() => ctx.actions.onView?.("tasks")}
          className="mt-1.5 flex items-center justify-center gap-1 rounded-lg py-1.5 text-[10.5px] font-semibold text-[var(--accent)] hover:bg-[var(--surface)] cursor-pointer"
        >
          View all {visible.length} tasks <ChevronRight size={11} />
        </button>
      )}
    </div>
  );
}

export const MY_TASKS_CONFIG_SCHEMA = [
  { key: "showOverdue", label: "Show overdue tasks", type: "toggle" as const, description: "Include tasks past their due date" },
  {
    key: "sortBy",
    label: "Sort by",
    type: "select" as const,
    options: [
      { value: "priority", label: "Priority" },
      { value: "due", label: "Due date" },
      { value: "created", label: "Recently updated" },
    ],
  },
];

// ── Upcoming Tasks ──────────────────────────────────────────────────────────

export function UpcomingTasksWidget({ size, ctx }: WidgetProps) {
  const tasks = useMemo(() => collectTasks(ctx.pages).filter((t) => !t.checked && t.due), [ctx.pages]);
  const todayEnd = endOfToday();
  const tomorrowEnd = endOfTomorrow();

  const groups: Array<{ label: string; items: TaskLite[] }> = [
    { label: "Today", items: [] },
    { label: "Tomorrow", items: [] },
    { label: "Upcoming", items: [] },
  ];
  for (const task of sortTasks(tasks)) {
    const due = new Date(task.due!).getTime();
    if (due <= todayEnd.getTime()) groups[0].items.push(task);
    else if (due <= tomorrowEnd.getTime()) groups[1].items.push(task);
    else groups[2].items.push(task);
  }

  const total = tasks.length;
  if (total === 0) {
    return (
      <WidgetEmpty
        icon={<Calendar size={18} className="text-[var(--muted)]" />}
        title="Nothing scheduled"
        hint="Tasks with due dates will show up here, grouped by day."
      />
    );
  }

  return (
    <div className="h-full space-y-2.5 overflow-y-auto scrollbar-thin">
      {groups.map((group) =>
        group.items.length === 0 ? null : (
          <div key={group.label}>
            <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
              <Clock size={10} /> {group.label}
              <span className="font-semibold normal-case text-[var(--muted)]">· {group.items.length}</span>
            </p>
            <div className="space-y-0.5">
              {group.items.slice(0, size === "small" ? 3 : 4).map((task) => (
                <TaskRow
                  key={task.key}
                  task={task}
                  onToggle={() => ctx.actions.onBlockPatch?.(task.pageId, task.blockId, { checked: !task.checked })}
                  onOpen={() => ctx.actions.onSelect(task.pageId)}
                />
              ))}
            </div>
          </div>
        ),
      )}
    </div>
  );
}

// ── Recent Pages ────────────────────────────────────────────────────────────

export function RecentPagesWidget({ size, ctx }: WidgetProps) {
  const pages = useMemo(() => recentPages(ctx.pages, size === "small" ? 4 : 6), [ctx.pages, size]);

  if (pages.length === 0) {
    return (
      <WidgetEmpty
        icon={<FileText size={18} className="text-[var(--muted)]" />}
        title="No recent pages"
        hint="Pages you open or edit will appear here for one-click access."
      />
    );
  }

  return (
    <div className="h-full space-y-1 overflow-y-auto scrollbar-thin">
      {pages.map((page: Page) => (
        <motion.button
          key={page.id}
          layout
          whileTap={{ scale: 0.985 }}
          onClick={() => ctx.actions.onSelect(page.id)}
          className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-[var(--surface)] cursor-pointer"
        >
          <span className="text-sm">{page.icon || "📝"}</span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1">
              <span className="truncate text-[11.5px] font-semibold text-[var(--text)]">
                {page.title || "Untitled"}
              </span>
              {page.isEncrypted && <Lock size={10} className="shrink-0 text-[var(--danger)]" />}
            </span>
            <span className="text-[10px] text-[var(--muted)]">Edited {timeAgo(page.updatedAt)}</span>
          </span>
          <ChevronRight size={12} className="shrink-0 text-[var(--muted)] opacity-0 transition-opacity group-hover:opacity-100" />
        </motion.button>
      ))}
    </div>
  );
}
