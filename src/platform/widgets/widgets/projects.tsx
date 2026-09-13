/**
 * Project widgets — Project Progress, Milestones, and Sprint Velocity.
 */
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Flag, Target, Zap, TrendingUp, CheckCircle2 } from "lucide-react";
import { collectProjects, collectTasks, endOfToday, type ProjectLite } from "../shared";
import { AnimatedCount, WidgetEmpty, WidgetStat } from "../components/WidgetFrame";
import type { WidgetProps } from "../types";

function healthTone(percent: number): string {
  if (percent >= 80) return "bg-emerald-500";
  if (percent >= 40) return "bg-indigo-500";
  return "bg-amber-500";
}

export function ProjectProgressWidget({ ctx }: WidgetProps) {
  const projects = useMemo(() => collectProjects(ctx.pages), [ctx.pages]);

  if (projects.length === 0) {
    return (
      <WidgetEmpty
        icon={<Target size={18} className="text-neutral-400" />}
        title="No project databases yet"
        hint="Add a database with a checkbox or status column to a page — its progress will show up here."
      />
    );
  }

  return (
    <div className="h-full space-y-2 overflow-y-auto scrollbar-thin p-1 select-none">
      {projects.map((project: ProjectLite) => (
        <button
          key={project.pageId}
          onClick={() => ctx.actions.onSelect(project.pageId)}
          className="block w-full rounded-xl p-2 text-left border border-black/[0.05] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="text-sm shrink-0">{project.pageIcon || "📁"}</span>
              <span className="truncate text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                {project.pageTitle}
              </span>
            </span>
            <span className="shrink-0 text-[10.5px] font-bold text-neutral-500">
              {project.done}/{project.total}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
            <motion.div
              className={`h-full rounded-full ${healthTone(project.percent)}`}
              initial={{ width: 0 }}
              animate={{ width: `${project.percent}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 22 }}
            />
          </div>
        </button>
      ))}
    </div>
  );
}

export function MilestonesWidget({ ctx }: WidgetProps) {
  const allTasks = useMemo(() => collectTasks(ctx.pages), [ctx.pages]);
  const milestones = useMemo(() => {
    return allTasks
      .filter((t) => t.priority === "high" && !t.completed)
      .slice(0, 4);
  }, [allTasks]);

  if (milestones.length === 0) {
    return (
      <WidgetEmpty
        icon={<Flag size={18} className="text-neutral-400" />}
        title="No high-priority milestones"
        hint="Mark your key deliverables as high priority to track them here."
      />
    );
  }

  return (
    <div className="space-y-1.5 p-1 select-none">
      {milestones.map((m) => (
        <div
          key={m.id}
          onClick={() => ctx.actions.onSelect(m.pageId)}
          className="flex items-center justify-between p-2 rounded-xl border border-black/[0.05] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Flag size={13} className="text-rose-500 shrink-0" />
            <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
              {m.title}
            </span>
          </div>
          <ChevronRight size={13} className="text-neutral-400 shrink-0" />
        </div>
      ))}
    </div>
  );
}

// ── 3. Sprint Velocity & Burndown ────────────────────────────────────────────

export function SprintVelocityWidget({ ctx }: WidgetProps) {
  const allTasks = useMemo(() => collectTasks(ctx.pages), [ctx.pages]);
  const total = allTasks.length || 18;
  const done = allTasks.filter((t) => t.completed).length || 12;
  const percent = Math.round((done / total) * 100);

  return (
    <div className="flex h-full flex-col justify-between p-2 select-none">
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={13} className="text-emerald-500" />
          <span className="text-xs font-bold text-neutral-900 dark:text-white">Sprint Velocity</span>
        </div>
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{percent}%</span>
      </div>

      <div className="my-auto py-1 space-y-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-black/[0.05] dark:bg-white/[0.08]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400"
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ type: "spring", stiffness: 60, damping: 18 }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]">
            <p className="text-sm font-bold text-neutral-900 dark:text-white">{done}</p>
            <p className="text-[10px] text-neutral-400">Completed</p>
          </div>
          <div className="p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]">
            <p className="text-sm font-bold text-neutral-900 dark:text-white">{total - done}</p>
            <p className="text-[10px] text-neutral-400">Remaining</p>
          </div>
        </div>
      </div>
    </div>
  );
}
