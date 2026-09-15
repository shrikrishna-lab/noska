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
  Play,
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
  const [activeTab, setActiveTab] = useState<'upcoming' | 'overdue' | 'completed'>('upcoming');
  const allTasks = useMemo(() => collectTasks(ctx.pages), [ctx.pages]);

  const { upcomingTasks, overdueTasks, completedTasks } = useMemo(() => {
    const upcoming = allTasks.filter(
      (t) => !t.checked && (!t.due || new Date(t.due) >= startOfToday())
    );
    const overdue = allTasks.filter(
      (t) => !t.checked && t.due && new Date(t.due) < startOfToday()
    );
    const done = allTasks.filter((t) => t.checked);
    return {
      upcomingTasks: sortTasks(upcoming),
      overdueTasks: sortTasks(overdue),
      completedTasks: done,
    };
  }, [allTasks]);

  const currentList = useMemo(() => {
    const list = 
      activeTab === 'completed'
        ? completedTasks
        : activeTab === 'overdue'
        ? overdueTasks
        : upcomingTasks;
    const limit = size === "small" ? 3 : size === "medium" ? 5 : 8;
    return list.slice(0, limit);
  }, [activeTab, upcomingTasks, overdueTasks, completedTasks, size]);

  const toggleTask = (task: TaskLite) => {
    ctx.actions.onBlockPatch?.(task.pageId, task.blockId, { checked: !task.checked });
    ctx.actions.onToast?.(task.checked ? "Task reopened" : "Task completed! 🎉");
  };

  return (
    <div className="flex h-full flex-col justify-between p-1 select-none font-sans">
      {/* Tab Switcher with Sliding Black Pill Indicator */}
      <div className="flex items-center gap-4 border-b border-black/[0.06] dark:border-white/[0.08] pb-1.5 mb-2 relative">
        {(['upcoming', 'overdue', 'completed'] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`text-[12px] transition-colors relative pb-1 font-medium cursor-pointer ${
                isActive
                  ? 'font-bold text-neutral-900 dark:text-neutral-100'
                  : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
            >
              <span>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
              {isActive && (
                <motion.div
                  layoutId="my-tasks-tab-pill-indicator"
                  className="absolute bottom-[-1.5px] left-1/2 -translate-x-1/2 w-4 h-1 rounded-full bg-neutral-900 dark:bg-neutral-100"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto space-y-1 my-auto">
        <AnimatePresence mode="popLayout" initial={false}>
          {currentList.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-4 text-center text-[11.5px] text-neutral-400"
            >
              No {activeTab} tasks found
            </motion.div>
          ) : (
            currentList.map((t, idx) => {
              const isChecked = t.checked;
              const isOverdue = !isChecked && t.due && new Date(t.due) < startOfToday();
              const badgeTheme = isChecked 
                ? 'purple' 
                : isOverdue 
                ? 'rose' 
                : idx % 2 === 0 
                ? 'green' 
                : 'amber';

              return (
                <motion.div
                  key={t.key}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="flex items-center gap-2.5 py-1.5 px-1 border-b border-dashed border-black/[0.06] dark:border-white/[0.07] last:border-b-0 cursor-pointer group"
                  onClick={() => toggleTask(t)}
                >
                  {/* Glowing Tactile Circular Badge */}
                  <div className="shrink-0">
                    {badgeTheme === 'purple' && (
                      <div className="size-6 rounded-full flex items-center justify-center bg-purple-100 dark:bg-purple-950/70 border border-purple-500/30 text-purple-600 dark:text-purple-400 shadow-[0_2px_8px_rgba(139,92,246,0.3)]">
                        <Check size={11} strokeWidth={3} />
                      </div>
                    )}
                    {badgeTheme === 'green' && (
                      <div className="size-6 rounded-full flex items-center justify-center bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-[0_2px_8px_rgba(16,185,129,0.25)]">
                        <Check size={10} strokeWidth={2.6} />
                      </div>
                    )}
                    {badgeTheme === 'amber' && (
                      <div className="size-6 rounded-full flex items-center justify-center bg-amber-100 dark:bg-amber-950/70 border border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-[0_2px_8px_rgba(245,158,11,0.25)]">
                        <Play size={9} strokeWidth={2.6} className="ml-0.5 fill-amber-600/30" />
                      </div>
                    )}
                    {badgeTheme === 'rose' && (
                      <div className="size-6 rounded-full flex items-center justify-center bg-rose-100 dark:bg-rose-950/70 border border-rose-500/30 text-rose-600 dark:text-rose-400 shadow-[0_2px_8px_rgba(244,63,94,0.25)]">
                        <Clock size={10} strokeWidth={2.6} />
                      </div>
                    )}
                  </div>

                  {/* Task Title */}
                  <div className="flex-1 min-w-0 flex items-center">
                    <span className={`text-[12px] font-medium truncate inline-block ${
                      isChecked 
                        ? 'text-purple-600 dark:text-purple-400 line-through decoration-2 decoration-purple-500/80 dark:decoration-purple-400/80' 
                        : 'text-neutral-800 dark:text-neutral-200'
                    }`}>
                      {t.text}
                    </span>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── 3. Upcoming Tasks Widget ────────────────────────────────────────────────

export function UpcomingTasksWidget({ ctx, size }: WidgetProps) {
  const allTasks = useMemo(() => collectTasks(ctx.pages), [ctx.pages]);

  const upcoming = useMemo(() => {
    return allTasks
      .filter((t) => !t.checked && t.due && new Date(t.due) > endOfToday())
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
            key={t.key}
            onClick={() => ctx.actions.onSelect(t.pageId)}
            className="flex items-center justify-between p-2 rounded-xl border border-black/[0.05] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Calendar size={13} className="text-indigo-500 shrink-0" />
              <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                {t.text}
              </span>
            </div>
            {t.due && (
              <span className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 shrink-0">
                {new Date(t.due).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
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
              {timeAgo(p.updatedAt || p.createdAt || "")}
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
