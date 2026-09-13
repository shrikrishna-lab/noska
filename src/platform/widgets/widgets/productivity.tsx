/**
 * Productivity widgets — Quick Create 2.0, My Tasks, Upcoming Tasks,
 * Recent Pages, and Sticky Note / Quick Brain Dump.
 */
import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Check,
  ChevronRight,
  Clock,
  FileText,
  Lock,
  Sparkles,
  Table2,
  Plus,
  StickyNote,
  Palette,
  CheckSquare,
  Square,
  ArrowUpRight,
  Zap,
} from "lucide-react";
import { timeAgo } from "../../../utils/helpers";
import type { Page } from "../../../lib/supabaseService";
import {
  AnimatedCount,
  WidgetEmpty,
  WidgetStat,
} from "../components/WidgetFrame";
import type { WidgetConfigField, WidgetProps } from "../types";
import {
  collectTasks,
  endOfToday,
  endOfTomorrow,
  recentPages,
  sortTasks,
  startOfToday,
  type TaskLite,
} from "../shared";

// ── 1. Quick Create 2.0 ─────────────────────────────────────────────────────

const CREATE_ACTIONS: Array<{ template: string; label: string; icon: React.ReactNode; color: string }> = [
  { template: "blank", label: "New Document", icon: <FileText size={14} />, color: "from-blue-500/20 to-indigo-500/10 text-blue-600 dark:text-blue-400" },
  { template: "prd", label: "Project Task", icon: <Check size={14} />, color: "from-emerald-500/20 to-teal-500/10 text-emerald-600 dark:text-emerald-400" },
  { template: "database", label: "New Database", icon: <Table2 size={14} />, color: "from-amber-500/20 to-yellow-500/10 text-amber-600 dark:text-amber-400" },
  { template: "ai", label: "AI Generator", icon: <Sparkles size={14} />, color: "from-purple-500/20 to-pink-500/10 text-purple-600 dark:text-purple-400" },
];

export function QuickCreateWidget({ ctx }: WidgetProps) {
  return (
    <div className="flex h-full flex-col justify-center gap-1.5 p-1 select-none">
      {CREATE_ACTIONS.map((action, i) => (
        <motion.button
          key={action.template}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() =>
            action.template === "ai"
              ? ctx.actions.onAI()
              : ctx.actions.onNew(action.template)
          }
          className="flex items-center gap-2.5 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] px-3 py-2 text-left text-[11.5px] font-semibold text-neutral-800 dark:text-neutral-200 transition-all cursor-pointer shadow-2xs"
        >
          <span className={`flex size-6 items-center justify-center rounded-lg bg-gradient-to-br ${action.color} border border-black/[0.04] dark:border-white/[0.06] shadow-2xs`}>
            {action.icon}
          </span>
          <span className="flex-1 truncate">{action.label}</span>
          <ChevronRight size={13} className="text-neutral-400 dark:text-neutral-500 opacity-60" />
        </motion.button>
      ))}
    </div>
  );
}

// ── 2. My Tasks Widget ──────────────────────────────────────────────────────

export const MY_TASKS_CONFIG_SCHEMA: WidgetConfigField[] = [
  {
    key: "showOverdue",
    label: "Show overdue tasks",
    type: "toggle",
    description: "Keep past due items visible at the top of the list.",
  },
  {
    key: "sortBy",
    label: "Sort tasks by",
    type: "select",
    options: [
      { value: "priority", label: "Priority (high first)" },
      { value: "due", label: "Due date" },
    ],
  },
];

export function MyTasksWidget({ config, size, ctx }: WidgetProps) {
  const showOverdue = config.showOverdue !== false;
  const sortBy = (config.sortBy as "priority" | "due") ?? "priority";

  const allTasks = useMemo(() => collectTasks(ctx.pages), [ctx.pages]);

  const { todayTasks, overdueTasks, doneCount } = useMemo(() => {
    const today = allTasks.filter(
      (t) => !t.completed && t.dueDate && t.dueDate >= startOfToday() && t.dueDate <= endOfToday()
    );
    const overdue = allTasks.filter((t) => !t.completed && t.dueDate && t.dueDate < startOfToday());
    const done = allTasks.filter((t) => t.completed).length;
    return {
      todayTasks: sortTasks(today, sortBy),
      overdueTasks: sortTasks(overdue, sortBy),
      doneCount: done,
    };
  }, [allTasks, sortBy]);

  const visibleTasks = useMemo(() => {
    const combined = showOverdue ? [...overdueTasks, ...todayTasks] : todayTasks;
    const limit = size === "small" ? 2 : size === "medium" ? 4 : 8;
    return combined.slice(0, limit);
  }, [showOverdue, overdueTasks, todayTasks, size]);

  const toggleTask = (task: TaskLite) => {
    ctx.actions.onBlockPatch?.(task.pageId, task.id, { completed: !task.completed });
    ctx.actions.onToast?.(task.completed ? "Task reopened" : "Task completed! 🎉");
  };

  if (visibleTasks.length === 0 && overdueTasks.length === 0) {
    return (
      <WidgetEmpty
        icon={<Check size={20} className="text-emerald-500" />}
        title="All clear for today"
        hint="No tasks due today. Add a checklist to any page or kick off a new task."
      />
    );
  }

  return (
    <div className="flex h-full flex-col justify-between p-1 select-none">
      <div className="flex items-center justify-between pb-1 text-xs">
        <span className="font-bold text-neutral-900 dark:text-white">Today's Focus</span>
        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
          {doneCount} Completed
        </span>
      </div>

      <div className="space-y-1.5 my-auto">
        {visibleTasks.map((t) => (
          <motion.div
            key={t.id}
            whileHover={{ scale: 1.01 }}
            className="flex items-center justify-between p-2 rounded-xl border border-black/[0.05] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-all cursor-pointer"
            onClick={() => toggleTask(t)}
          >
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                className={`h-4.5 w-4.5 rounded-md flex items-center justify-center border transition-all ${
                  t.completed
                    ? "bg-emerald-500 border-emerald-500 text-white shadow-2xs"
                    : "border-black/25 dark:border-white/25 bg-transparent"
                }`}
              >
                {t.completed && <Check size={11} strokeWidth={3} />}
              </button>
              <span className={`text-xs font-semibold truncate ${t.completed ? "line-through text-neutral-400" : "text-neutral-800 dark:text-neutral-200"}`}>
                {t.title}
              </span>
            </div>

            {t.priority && (
              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                t.priority === "high"
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25"
                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25"
              }`}>
                {t.priority}
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── 3. Upcoming Tasks Widget ────────────────────────────────────────────────

export function UpcomingTasksWidget({ ctx, size }: WidgetProps) {
  const allTasks = useMemo(() => collectTasks(ctx.pages), [ctx.pages]);

  const upcoming = useMemo(() => {
    return allTasks
      .filter((t) => !t.completed && t.dueDate && t.dueDate > endOfToday())
      .slice(0, size === "small" ? 2 : 4);
  }, [allTasks, size]);

  if (upcoming.length === 0) {
    return (
      <WidgetEmpty
        icon={<Calendar size={20} className="text-neutral-400" />}
        title="No upcoming tasks"
        hint="Schedule due dates on your document tasks to see your roadmap here."
      />
    );
  }

  return (
    <div className="flex h-full flex-col justify-between p-1 select-none">
      <div className="space-y-1.5 my-auto">
        {upcoming.map((t) => (
          <div
            key={t.id}
            onClick={() => ctx.actions.onSelect(t.pageId)}
            className="flex items-center justify-between p-2 rounded-xl border border-black/[0.05] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Calendar size={13} className="text-indigo-500 shrink-0" />
              <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                {t.title}
              </span>
            </div>
            {t.dueDate && (
              <span className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 shrink-0">
                {new Date(t.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 4. Recent Pages Widget ──────────────────────────────────────────────────

export function RecentPagesWidget({ ctx, size }: WidgetProps) {
  const pages = useMemo(() => recentPages(ctx.pages, size === "small" ? 3 : 5), [ctx.pages, size]);

  if (pages.length === 0) {
    return (
      <WidgetEmpty
        icon={<FileText size={20} className="text-neutral-400" />}
        title="No recent pages"
        hint="Pages you edit or open will appear here for fast one-click access."
      />
    );
  }

  return (
    <div className="flex h-full flex-col justify-between p-1 select-none">
      <div className="space-y-1.5 my-auto">
        {pages.map((p) => (
          <motion.button
            key={p.id}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => ctx.actions.onSelect(p.id)}
            className="w-full flex items-center justify-between p-2 rounded-xl border border-black/[0.05] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-all cursor-pointer text-left"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm shrink-0">{p.icon || "📄"}</span>
              <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                {p.title || "Untitled Page"}
              </span>
            </div>
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 shrink-0">
              {timeAgo(p.updated_at || p.created_at || "")}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ── 5. Sticky Note & Quick Brain Dump ────────────────────────────────────────

const NOTE_COLORS = [
  { id: "amber", name: "Honey Amber", bg: "bg-amber-100 dark:bg-amber-950/40", border: "border-amber-300 dark:border-amber-700/50", text: "text-amber-950 dark:text-amber-100" },
  { id: "emerald", name: "Matcha Mint", bg: "bg-emerald-100 dark:bg-emerald-950/40", border: "border-emerald-300 dark:border-emerald-700/50", text: "text-emerald-950 dark:text-emerald-100" },
  { id: "sky", name: "Sky Mist", bg: "bg-sky-100 dark:bg-sky-950/40", border: "border-sky-300 dark:border-sky-700/50", text: "text-sky-950 dark:text-sky-100" },
  { id: "purple", name: "Lavender Silk", bg: "bg-purple-100 dark:bg-purple-950/40", border: "border-purple-300 dark:border-purple-700/50", text: "text-purple-950 dark:text-purple-100" },
];

export function StickyNoteWidget({ ctx }: WidgetProps) {
  const [colorIndex, setColorIndex] = useState(0);
  const [noteText, setNoteText] = useState(() => {
    try {
      return localStorage.getItem("noska_quick_sticky_note") || "💡 Brain dump: Architecting new visual widgets with spring physics & ambient lighting.";
    } catch {
      return "";
    }
  });

  const currentColor = NOTE_COLORS[colorIndex % NOTE_COLORS.length];

  const handleSave = (val: string) => {
    setNoteText(val);
    try {
      localStorage.setItem("noska_quick_sticky_note", val);
    } catch {}
  };

  const handleConvertToPage = () => {
    if (!noteText.trim()) return;
    ctx.actions.onNew("blank");
    ctx.actions.onToast?.("Note converted to new page! 📝");
  };

  return (
    <div className={`flex h-full flex-col justify-between p-2.5 rounded-xl border ${currentColor.bg} ${currentColor.border} transition-colors select-none`}>
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-1.5">
          <StickyNote size={13} className="text-neutral-500 dark:text-neutral-400" />
          <span className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200">Sticky Note</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setColorIndex((c) => c + 1)}
            title="Change color"
            className="rounded p-1 hover:bg-black/10 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <Palette size={12} className="text-neutral-600 dark:text-neutral-400" />
          </button>
          <button
            type="button"
            onClick={handleConvertToPage}
            title="Convert to page"
            className="rounded p-1 hover:bg-black/10 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <ArrowUpRight size={12} className="text-neutral-600 dark:text-neutral-400" />
          </button>
        </div>
      </div>

      <textarea
        value={noteText}
        onChange={(e) => handleSave(e.target.value)}
        placeholder="Type a quick brain dump..."
        className={`w-full flex-1 bg-transparent resize-none outline-none text-xs font-medium leading-relaxed ${currentColor.text} placeholder:text-neutral-400/70 scrollbar-none`}
      />
    </div>
  );
}
