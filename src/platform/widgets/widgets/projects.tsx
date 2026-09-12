/**
 * Project widgets — Project Progress, Milestones. Projects are derived
 * from database blocks (see collectProjects in shared.ts); widgets with
 * no project data show a meaningful empty state, never a broken one.
 */
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Flag, Target } from "lucide-react";
import { collectProjects, collectTasks, endOfToday, type ProjectLite } from "../shared";
import { AnimatedCount, WidgetEmpty, WidgetStat } from "../components/WidgetFrame";
import type { WidgetProps } from "../types";

function healthTone(percent: number): string {
  if (percent >= 80) return "bg-emerald-500";
  if (percent >= 40) return "bg-blue-500";
  return "bg-amber-500";
}

export function ProjectProgressWidget({ ctx }: WidgetProps) {
  const projects = useMemo(() => collectProjects(ctx.pages), [ctx.pages]);

  if (projects.length === 0) {
    return (
      <WidgetEmpty
        icon={<Target size={18} className="text-[var(--muted)]" />}
        title="No project databases yet"
        hint="Add a database with a checkbox or status column to a page — its progress will show up here."
      />
    );
  }

  return (
    <div className="h-full space-y-2.5 overflow-y-auto scrollbar-thin">
      {projects.map((project: ProjectLite) => (
        <button
          key={project.pageId}
          onClick={() => ctx.actions.onSelect(project.pageId)}
          className="block w-full rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-[var(--surface)] cursor-pointer"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="text-sm">{project.pageIcon}</span>
              <span className="truncate text-[11.5px] font-semibold text-[var(--text)]">
                {project.pageTitle}
              </span>
            </span>
            <span className="shrink-0 text-[10.5px] font-bold text-[var(--muted)]">
              {project.done}/{project.total}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--surface)]">
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
  const next = useMemo(() => {
    const now = Date.now();
    const todayEnd = endOfToday();
    const upcoming = collectTasks(ctx.pages)
      .filter((t) => !t.checked && t.due && new Date(t.due).getTime() > now)
      .sort((a, b) => new Date(a.due!).getTime() - new Date(b.due!).getTime());
    const soon = upcoming.find((t) => new Date(t.due!).getTime() <= todayEnd.getTime() + 7 * 86400000);
    if (soon) return soon;
    return upcoming[0] ?? null;
  }, [ctx.pages]);

  const completedCount = useMemo(
    () => collectTasks(ctx.pages).filter((t) => t.checked).length,
    [ctx.pages],
  );

  if (!next) {
    return (
      <WidgetEmpty
        icon={<Flag size={18} className="text-[var(--muted)]" />}
        title="No upcoming milestones"
        hint="Give any task a due date and the next one will surface here."
      />
    );
  }

  const dueLabel = new Date(next.due!).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const daysAway = Math.max(0, Math.ceil((new Date(next.due!).getTime() - Date.now()) / 86400000));

  return (
    <div className="flex h-full flex-col justify-center gap-2">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--accent)]">
          <Flag size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-bold text-[var(--text)]">{next.text}</p>
          <p className="truncate text-[10px] text-[var(--muted)]">
            {next.pageTitle} · {dueLabel}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-semibold text-[var(--muted)]">
          {daysAway === 0 ? "Due today" : `in ${daysAway} day${daysAway === 1 ? "" : "s"}`}
        </span>
        <button
          onClick={() => ctx.actions.onSelect(next.pageId)}
          className="flex items-center gap-0.5 text-[10.5px] font-semibold text-[var(--accent)] cursor-pointer"
        >
          Open <ChevronRight size={11} />
        </button>
      </div>
      <div className="border-t border-[var(--border)] pt-2">
        <WidgetStat label="Tasks completed" value={<AnimatedCount value={completedCount} />} tone="success" />
      </div>
    </div>
  );
}
