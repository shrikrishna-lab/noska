import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus, ArrowRight, FileText } from "lucide-react";

export interface TaskItemProps {
  id: string;
  text: string;
  checked?: boolean;
  priority?: "high" | "medium" | "low" | string;
  dateLabel?: string;
  pageTitle?: string;
  pageIcon?: string;
  onToggle?: () => void;
  onClick?: () => void;
}

interface GlassTaskSectionProps {
  title?: string;
  tasks: TaskItemProps[];
  onViewMore?: () => void;
  onToggleTask?: (taskId: string) => void;
  onSelectTask?: (taskId: string) => void;
  onAddTask?: () => void;
  className?: string;
}

export function GlassTaskSection({
  title = "Today's tasks",
  tasks = [],
  onViewMore,
  onToggleTask,
  onSelectTask,
  onAddTask,
  className = ""
}: GlassTaskSectionProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/60 dark:border-white/10 bg-white/70 dark:bg-[#15171e]/70 backdrop-blur-2xl p-6 sm:p-8 shadow-xl ${className}`}
      style={{
        boxShadow: "0 20px 40px -15px rgba(0,0,0,0.05), inset 0 1px 1px rgba(255,255,255,0.7)"
      }}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between pb-5 mb-5 border-b border-black/[0.06] dark:border-white/[0.06]">
        <h2 className="text-base sm:text-lg font-bold tracking-tight text-[var(--text)]">
          {title}
        </h2>
        {onViewMore && (
          <button
            onClick={onViewMore}
            className="flex items-center gap-1 px-3 py-1 rounded-full border border-black/10 dark:border-white/15 bg-white/60 dark:bg-white/10 hover:bg-white/90 text-xs font-semibold text-[var(--text)] transition cursor-pointer shadow-2xs hover:scale-105"
          >
            <span>View more</span>
          </button>
        )}
      </div>

      {/* Main Content Layout: 3D Folder on Left, Tasks on Right */}
      <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6 items-center">
        {/* 3D Glass Folder Graphic */}
        <div className="hidden md:flex flex-col items-center justify-center relative p-4">
          <div className="relative w-36 h-28 flex items-center justify-center">
            {/* Ambient folder glow */}
            <div className="absolute inset-0 rounded-2xl bg-blue-500/20 blur-xl pointer-events-none" />

            {/* Floating Paper 2 (back) */}
            <div className="absolute -top-3 right-5 w-20 h-22 rounded-xl bg-white/90 dark:bg-slate-200 shadow-md border border-black/5 rotate-[8deg] p-2 space-y-1.5 opacity-90">
              <div className="h-1.5 w-8 bg-blue-400/40 rounded-full" />
              <div className="h-1 w-14 bg-slate-300 rounded-full" />
              <div className="h-1 w-10 bg-slate-300 rounded-full" />
            </div>

            {/* Floating Paper 1 (middle) */}
            <div className="absolute -top-2 left-6 w-22 h-24 rounded-xl bg-white dark:bg-slate-100 shadow-lg border border-black/5 -rotate-[4deg] p-2.5 space-y-2">
              <div className="h-2 w-10 bg-blue-500/60 rounded-full" />
              <div className="h-1.5 w-16 bg-slate-300 rounded-full" />
              <div className="h-1.5 w-12 bg-slate-300 rounded-full" />
              <div className="h-1.5 w-14 bg-slate-300 rounded-full" />
            </div>

            {/* Translucent Front Folder Pocket */}
            <div
              className="absolute bottom-0 inset-x-0 h-20 rounded-2xl bg-gradient-to-tr from-[#2563eb] via-[#3b82f6] to-[#60a5fa] shadow-xl border border-white/40 backdrop-blur-md flex items-end p-3 overflow-hidden"
              style={{
                boxShadow: "0 10px 25px -5px rgba(37, 99, 235, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.5)"
              }}
            >
              {/* Folder tab notch & highlights */}
              <div className="absolute top-0 right-0 w-16 h-4 bg-white/20 rounded-bl-xl backdrop-blur-sm" />
              <div className="w-full h-1.5 bg-white/30 rounded-full blur-[0.5px]" />
            </div>
          </div>
        </div>

        {/* Task Item List */}
        <div className="space-y-2.5">
          {tasks.length === 0 ? (
            <div className="py-6 text-center text-xs text-[var(--muted)] italic">
              No tasks scheduled for today. Create a to-do block in any page to track action items here.
            </div>
          ) : (
            tasks.slice(0, 5).map((task) => {
              const priority = (task.priority || "medium").toLowerCase();
              const isHigh = priority === "high";
              const isLow = priority === "low";

              return (
                <div
                  key={task.id}
                  onClick={task.onClick}
                  className={`group flex items-center justify-between gap-3 p-2.5 rounded-2xl border transition-all duration-150 cursor-pointer ${
                    task.checked
                      ? "bg-black/[0.02] dark:bg-white/[0.02] border-transparent opacity-75"
                      : "bg-white/50 dark:bg-white/[0.04] border-black/[0.04] dark:border-white/[0.06] hover:bg-white/80 dark:hover:bg-white/[0.08] hover:border-black/10 dark:hover:border-white/15 hover:shadow-xs"
                  }`}
                >
                  {/* Left Checkbox & Text */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Rounded Circular Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        task.onToggle?.();
                      }}
                      className={`h-5 w-5 rounded-full flex items-center justify-center transition-all duration-150 shrink-0 cursor-pointer ${
                        task.checked
                          ? "bg-[#2563eb] text-white shadow-xs"
                          : "border-2 border-slate-300 dark:border-slate-600 hover:border-[#2563eb] bg-transparent"
                      }`}
                    >
                      {task.checked && <Check size={11} strokeWidth={3} />}
                    </button>

                    {/* Task Title */}
                    <span
                      className={`text-xs sm:text-sm font-medium tracking-tight truncate ${
                        task.checked
                          ? "text-[var(--muted)] line-through"
                          : "text-[var(--text)]"
                      }`}
                    >
                      {task.text || "Untitled task"}
                    </span>
                  </div>

                  {/* Right Tags: Priority & Date */}
                  <div className="flex items-center gap-2 shrink-0 select-none">
                    {/* Priority Badge */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold tracking-wide capitalize ${
                        isHigh
                          ? "bg-rose-100/80 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40"
                          : isLow
                          ? "bg-blue-100/80 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40"
                          : "bg-amber-100/80 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40"
                      }`}
                    >
                      {isHigh ? "High" : isLow ? "Low" : "Med"}
                    </span>

                    {/* Date Tag */}
                    <span className="text-[11px] font-medium text-[var(--muted)] min-w-[36px] text-right">
                      {task.dateLabel || "Today"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default GlassTaskSection;
