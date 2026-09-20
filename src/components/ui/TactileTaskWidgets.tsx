import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, Bell, Calendar, Check, Plus, MoreHorizontal, ChevronLeft, ChevronRight,
  Flame, Sparkles, CheckCircle2, Play, Users, MessageSquare, Edit3, ArrowRight,
  Video, Coffee, Sun, Dumbbell, BookOpen, AlertCircle, CheckSquare, Trash2,
  Smile, ShieldAlert, HeartHandshake, Eye, Sparkle, Target, Send, X, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BentoVectorIcon, BENTO_VECTOR_CATALOG, type BentoVectorType, TactileGlyph, type TactileGlyphName } from "./TactileVectorLibrary";

// ─────────────────────────────────────────────────────────────────────────────
// 1. 3D SVG ALARM CLOCK GRAPHIC (Image 1 Hero Card)
// ─────────────────────────────────────────────────────────────────────────────
export function Clock3DGraphic({ className = "w-20 h-20" }: { className?: string }) {
  return (
    <div className={cn("relative shrink-0 select-none", className)}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_12px_24px_rgba(234,156,22,0.38)]">
        {/* Soft Drop Shadow Ground */}
        <ellipse cx="50" cy="88" rx="32" ry="7" fill="rgba(0,0,0,0.12)" filter="blur(3px)" />
        
        {/* Clock Bells / Top Ears */}
        <path d="M 28 26 C 22 20 20 30 26 34 Z" fill="#eab308" stroke="#ca8a04" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M 72 26 C 78 20 80 30 74 34 Z" fill="#eab308" stroke="#ca8a04" strokeWidth="2.5" strokeLinejoin="round" />
        
        {/* Top Ring / Handle */}
        <circle cx="50" cy="18" r="8" fill="none" stroke="#d97706" strokeWidth="3" />
        
        {/* Main Clock Body with 3D Warm Orange / Yellow Gradient */}
        <defs>
          <radialGradient id="clockBevel" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="45%" stopColor="#f59e0b" />
            <stop offset="90%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#b45309" />
          </radialGradient>
          <linearGradient id="clockFace" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f8fafc" />
          </linearGradient>
        </defs>

        <circle cx="50" cy="54" r="36" fill="url(#clockBevel)" />
        
        {/* Clock Feet */}
        <path d="M 30 84 L 23 93" stroke="#b45309" strokeWidth="5" strokeLinecap="round" />
        <path d="M 70 84 L 77 93" stroke="#b45309" strokeWidth="5" strokeLinecap="round" />

        {/* White Inset Dial */}
        <circle cx="50" cy="54" r="28" fill="url(#clockFace)" stroke="#fef3c7" strokeWidth="2" />

        {/* Minute Markers */}
        <line x1="50" y1="29" x2="50" y2="33" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
        <line x1="50" y1="75" x2="50" y2="79" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
        <line x1="25" y1="54" x2="29" y2="54" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
        <line x1="71" y1="54" x2="75" y2="54" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />

        {/* Clock Hands */}
        <line x1="50" y1="54" x2="36" y2="42" stroke="#334155" strokeWidth="3.2" strokeLinecap="round" />
        <line x1="50" y1="54" x2="65" y2="36" stroke="#334155" strokeWidth="2.4" strokeLinecap="round" />
        {/* Center Pin */}
        <circle cx="50" cy="54" r="3.2" fill="#d97706" />
        <circle cx="50" cy="54" r="1.5" fill="#ffffff" />
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. 3D SVG BELL GRAPHIC (Image 2 Peach Reminder Card)
// ─────────────────────────────────────────────────────────────────────────────
export function Bell3DGraphic({ className = "w-20 h-20" }: { className?: string }) {
  return (
    <div className={cn("relative shrink-0 select-none", className)}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_12px_24px_rgba(249,115,22,0.35)]">
        {/* Vibration sound waves */}
        <path d="M 22 40 C 16 46 16 54 22 60" stroke="#84cc16" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.85" />
        <path d="M 14 34 C 6 44 6 58 14 68" stroke="#84cc16" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.6" />
        <path d="M 78 40 C 84 46 84 54 78 60" stroke="#84cc16" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.85" />
        <path d="M 86 34 C 94 44 94 58 86 68" stroke="#84cc16" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.6" />

        {/* Bell Body */}
        <defs>
          <linearGradient id="bellGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="60%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
        </defs>

        <ellipse cx="50" cy="20" rx="4" ry="4" fill="#c2410c" />
        <path
          d="M 50 22 C 38 22 34 40 30 62 C 28 67 22 70 20 72 L 80 72 C 78 70 72 67 70 62 C 66 40 62 22 50 22 Z"
          fill="url(#bellGrad)"
        />
        <rect x="20" y="70" width="60" height="6" rx="3" fill="#c2410c" />
        <circle cx="50" cy="80" r="6" fill="#7c2d12" />
        <path d="M 44 32 C 40 38 38 48 37 56" stroke="#fdba74" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. HERO LAVENDER GRID BANNER (Image 1 top card)
// ─────────────────────────────────────────────────────────────────────────────
export interface HeroProjectGridBannerProps {
  title?: string;
  remainingTime?: string;
  statusText?: string;
  onStartFocus?: () => void;
  className?: string;
}

export function HeroProjectGridBanner({
  title = "Mastering projects with management",
  remainingTime = "7h 34m",
  statusText = "Your task almost done",
  onStartFocus,
  className
}: HeroProjectGridBannerProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[32px] p-6 sm:p-7 bg-neutral-100/90 dark:bg-neutral-900/90 border border-neutral-200/80 dark:border-neutral-800 shadow-[0_12px_32px_rgba(0,0,0,0.06)]",
        className
      )}
    >
      {/* Background Grid Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.35] dark:opacity-[0.12]" 
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(120, 120, 120, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(120, 120, 120, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '28px 28px'
        }}
      />

      <div className="relative z-10 flex flex-col justify-between gap-5">
        <div className="max-w-md">
          <h2 className="text-[22px] sm:text-[26px] font-bold text-neutral-900 dark:text-neutral-100 tracking-tight leading-tight">
            {title}
          </h2>
        </div>

        <div className="flex items-center justify-between gap-4 p-4 sm:p-5 rounded-[24px] bg-[#17171a] dark:bg-[#0f0e14] text-white shadow-[0_8px_24px_rgba(0,0,0,0.22)]">
          <div className="space-y-1">
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <span>{remainingTime}</span>
              <span className="inline-block size-2 rounded-full bg-white/80 animate-pulse" />
            </div>
            <p className="text-xs text-neutral-400 font-medium">
              {statusText}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {onStartFocus && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onStartFocus}
                className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition backdrop-blur-md cursor-pointer"
              >
                <Play size={12} className="fill-white" />
                <span>Focus Block</span>
              </motion.button>
            )}
            <Clock3DGraphic className="w-16 h-16 sm:w-18 sm:h-18" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PEACH ROUTINE & REMINDER BANNER (Image 2 Peach Hero)
// ─────────────────────────────────────────────────────────────────────────────
export interface PeachReminderBannerProps {
  title?: string;
  description?: string;
  buttonLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function PeachReminderBanner({
  title = "Set the reminder",
  description = "Never miss your morning routine! Set a reminder to stay on track",
  buttonLabel = "Set Now",
  onAction,
  className
}: PeachReminderBannerProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[32px] p-6 sm:p-7 bg-[#ffe7db] dark:bg-[#2b1f1a] border border-[#fbd3bf] dark:border-[#473024] shadow-[0_12px_32px_rgba(249,115,22,0.08)] flex items-center justify-between gap-6",
        className
      )}
    >
      <div className="space-y-2.5 max-w-sm relative z-10">
        <h3 className="text-xl sm:text-[22px] font-black text-[#431407] dark:text-[#ffedd5] tracking-tight leading-snug">
          {title}
        </h3>
        <p className="text-xs sm:text-[13px] text-[#7c2d12]/85 dark:text-[#fed7aa]/80 leading-relaxed font-medium">
          {description}
        </p>

        <div className="pt-1">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={onAction}
            className="px-5 py-2.5 rounded-full bg-[#5c240c] hover:bg-[#431806] text-white text-xs sm:text-[13px] font-bold shadow-[0_6px_16px_rgba(92,36,12,0.35)] transition cursor-pointer"
          >
            {buttonLabel}
          </motion.button>
        </div>
      </div>

      <div className="relative z-10">
        <Bell3DGraphic className="w-20 h-20 sm:w-24 sm:h-24" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. TACTILE WEEK SCRUBBER & FULL MONTH HEATMAP CALENDAR (Image 1 right mockup)
// ─────────────────────────────────────────────────────────────────────────────
export interface WeekDateScrubberProps {
  currentDate?: Date;
  selectedDate?: string;
  onSelectDate?: (dateStr: string) => void;
  taskCountByDate?: Record<string, number>;
  className?: string;
}

export function WeekDateScrubber({
  currentDate = new Date(),
  selectedDate,
  onSelectDate,
  taskCountByDate = {},
  className
}: WeekDateScrubberProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState<"strip" | "matrix">("strip");
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  // Generate 7 days for the weekly strip
  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1) + weekOffset * 7;
    start.setDate(diff);

    const days = [];
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = d.toISOString().split("T")[0];
      days.push({
        name: dayNames[i],
        dayNum: d.getDate(),
        monthName: d.toLocaleDateString([], { month: "short" }),
        iso,
        isToday: new Date().toISOString().split("T")[0] === iso
      });
    }
    return days;
  }, [currentDate, weekOffset]);

  // Full Month Matrix Generator (Image 1 Right Mockup: 1..31 day heatmap)
  const monthMatrix = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sun
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    // Adjust starting offset: Mon = 0
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const cells = [];

    // Preceding empty slots
    for (let i = 0; i < startOffset; i++) {
      cells.push(null);
    }

    for (let d = 1; d <= totalDays; d++) {
      const dObj = new Date(year, month, d);
      const iso = dObj.toISOString().split("T")[0];
      cells.push({
        dayNum: d,
        iso,
        isToday: new Date().toISOString().split("T")[0] === iso,
        taskCount: taskCountByDate[iso] || 0
      });
    }
    return cells;
  }, [currentMonthDate, taskCountByDate]);

  const monthYearLabel = useMemo(() => {
    if (viewMode === "matrix") {
      return currentMonthDate.toLocaleDateString([], { month: "long", year: "numeric" });
    }
    if (weekDays.length === 0) return "";
    const first = new Date(weekDays[0].iso);
    return first.toLocaleDateString([], { month: "long", year: "numeric" });
  }, [viewMode, currentMonthDate, weekDays]);

  const activeIso = selectedDate || (weekDays.find(d => d.isToday)?.iso ?? weekDays[0]?.iso);

  return (
    <div className={cn("p-5 sm:p-6 rounded-[28px] bg-white dark:bg-[#17171a] border border-black/[0.06] dark:border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.03)] space-y-4", className)}>
      {/* Month Header with Navigation Controls & View Toggle */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            if (viewMode === "matrix") {
              setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
            } else {
              setWeekOffset(prev => prev - 1);
            }
          }}
          className="size-8 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300 transition cursor-pointer"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex items-center gap-3">
          <Calendar size={15} className="text-neutral-500" />
          <h3 className="text-sm sm:text-[15px] font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
            {monthYearLabel}
          </h3>

          {/* Toggle 7-Day vs Full Month Matrix */}
          <div className="flex items-center p-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setViewMode("strip")}
              className={cn(
                "px-2.5 py-0.5 rounded-full transition cursor-pointer",
                viewMode === "strip" ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs" : "text-neutral-500"
              )}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setViewMode("matrix")}
              className={cn(
                "px-2.5 py-0.5 rounded-full transition cursor-pointer",
                viewMode === "matrix" ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs" : "text-neutral-500"
              )}
            >
              Month
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (viewMode === "matrix") {
              setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
            } else {
              setWeekOffset(prev => prev + 1);
            }
          }}
          className="size-8 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300 transition cursor-pointer"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* VIEW 1: 7-Day Pill Ribbon */}
      {viewMode === "strip" ? (
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {weekDays.map((item) => {
            const isSelected = activeIso === item.iso;
            const hasTasks = (taskCountByDate[item.iso] || 0) > 0;

            return (
              <button
                key={item.iso}
                type="button"
                onClick={() => onSelectDate?.(item.iso)}
                className={cn(
                  "group flex flex-col items-center justify-center py-2.5 px-1 rounded-full transition-all cursor-pointer select-none",
                  isSelected
                    ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-md scale-105"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-800/80 text-neutral-600 dark:text-neutral-400"
                )}
              >
                <span className={cn(
                  "text-[11px] font-semibold uppercase tracking-wider mb-1",
                  isSelected ? "text-neutral-300 dark:text-neutral-600 font-bold" : "text-neutral-400 dark:text-neutral-500"
                )}>
                  {item.name}
                </span>

                <div className={cn(
                  "size-8 sm:size-9 rounded-full flex items-center justify-center text-xs sm:text-[13px] font-extrabold transition",
                  isSelected
                    ? "bg-white/20 dark:bg-black/10 text-white dark:text-neutral-900"
                    : item.isToday
                    ? "bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400"
                    : "text-neutral-700 dark:text-neutral-300 group-hover:bg-black/[0.04]"
                )}>
                  {item.dayNum}
                </div>

                <div className="h-1 flex items-center justify-center mt-1">
                  {hasTasks && (
                    <div className={cn(
                      "size-1 rounded-full",
                      isSelected ? "bg-amber-400" : "bg-blue-500"
                    )} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* VIEW 2: Full Month Heatmap Matrix (Image 1 Right Screen) */
        <div className="space-y-2">
          <div className="grid grid-cols-7 text-center text-[10.5px] font-bold uppercase tracking-wider text-neutral-400 pb-1">
            <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthMatrix.map((c, i) => {
              if (!c) return <div key={`empty-${i}`} className="h-8" />;
              const isSelected = activeIso === c.iso;
              const hasHeatmap = c.taskCount > 0;

              return (
                <button
                  key={c.iso}
                  type="button"
                  onClick={() => onSelectDate?.(c.iso)}
                  className={cn(
                    "h-8 sm:h-9 rounded-xl flex items-center justify-center text-xs font-bold transition cursor-pointer relative",
                    isSelected
                      ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-sm"
                      : c.isToday
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      : hasHeatmap
                      ? "bg-[#fef9c3] text-[#854d0e] dark:bg-[#382b08] dark:text-[#fef08a]"
                      : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                  )}
                >
                  <span>{c.dayNum}</span>
                  {hasHeatmap && !isSelected && (
                    <span className="absolute bottom-1 size-1 rounded-full bg-amber-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. PASTEL PROJECT CARD & SHOWCASE (Image 1 Mint & Lavender Cards)
// ─────────────────────────────────────────────────────────────────────────────
export interface ProjectCardData {
  id: string;
  title: string;
  author?: string;
  authorAvatar?: string;
  status?: "Ongoing" | "Completed" | "Pending" | "In Review";
  priority?: "High" | "Medium" | "Low" | "Urgent";
  progress?: number;
  dueDate?: string;
  commentsCount?: number;
  membersCount?: number;
  theme?: "mint" | "lavender" | "peach";
}

export function PastelProjectCard({
  project,
  onOpen,
  onEdit,
  onQuickInspect
}: {
  project: ProjectCardData;
  onOpen?: () => void;
  onEdit?: () => void;
  onQuickInspect?: () => void;
}) {
  const theme = project.theme || "mint";

  const themeStyles = {
    mint: {
      bg: "bg-[#e8f6f0] dark:bg-[#162720]",
      border: "border-[#c4ecdc] dark:border-[#214336]",
      progressFill: "bg-[#22c55e]",
      tagBg: "bg-white/80 dark:bg-[#1e382d]",
      textPrimary: "text-[#064e3b] dark:text-[#a7f3d0]",
      accentText: "text-[#059669]"
    },
    lavender: {
      bg: "bg-[#f3e8ff] dark:bg-[#251b36]",
      border: "border-[#e4ccff] dark:border-[#3e2d58]",
      progressFill: "bg-[#a855f7]",
      tagBg: "bg-white/80 dark:bg-[#34244b]",
      textPrimary: "text-[#4c1d95] dark:text-[#e9d5ff]",
      accentText: "text-[#9333ea]"
    },
    peach: {
      bg: "bg-[#fff1e6] dark:bg-[#2d1d16]",
      border: "border-[#fed7aa] dark:border-[#4d2d1e]",
      progressFill: "bg-[#f97316]",
      tagBg: "bg-white/80 dark:bg-[#3d2318]",
      textPrimary: "text-[#7c2d12] dark:text-[#ffedd5]",
      accentText: "text-[#ea580c]"
    }
  }[theme];

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      onClick={onOpen}
      className={cn(
        "p-6 rounded-[28px] border relative space-y-4 cursor-pointer shadow-xs transition-shadow hover:shadow-md",
        themeStyles.bg,
        themeStyles.border
      )}
    >
      {/* Top Header: Squircle Icon, Title & Edit Pencil */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-10 rounded-2xl bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 flex items-center justify-center text-lg shadow-2xs shrink-0">
            📁
          </div>
          <div className="min-w-0">
            <h4 className={cn("text-base font-bold truncate", themeStyles.textPrimary)}>
              {project.title}
            </h4>
            {project.author && (
              <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate block">
                Created by {project.author}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onQuickInspect && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickInspect();
              }}
              className="size-8 rounded-full bg-white/80 dark:bg-white/10 hover:bg-white text-neutral-600 dark:text-neutral-300 flex items-center justify-center transition shadow-2xs shrink-0"
              title="Inspect goals & tasks"
            >
              <Target size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.();
            }}
            className="size-8 rounded-full bg-white/80 dark:bg-white/10 hover:bg-white text-neutral-600 dark:text-neutral-300 flex items-center justify-center transition shadow-2xs shrink-0"
            title="Edit project"
          >
            <Edit3 size={13} />
          </button>
        </div>
      </div>

      {/* Badges: Status & Priority */}
      <div className="flex items-center gap-2">
        <span className={cn("px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-2xs", themeStyles.tagBg, themeStyles.textPrimary)}>
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{project.status || "Ongoing"}</span>
        </span>

        <span className={cn("px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-2xs", themeStyles.tagBg, themeStyles.accentText)}>
          <span>⚑</span>
          <span>{project.priority || "High"}</span>
        </span>
      </div>

      {/* Smooth Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-neutral-500 dark:text-neutral-400">
          <span>Progress</span>
          <span>{project.progress ?? 65}%</span>
        </div>
        <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${project.progress ?? 65}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={cn("h-full rounded-full", themeStyles.progressFill)}
          />
        </div>
      </div>

      {/* Footer: Assignee Stack, Due Date Pill & Comments */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="flex items-center -space-x-2">
          <div className="size-7 rounded-full bg-amber-400 border-2 border-white dark:border-neutral-900 flex items-center justify-center text-[10px] font-bold text-white shadow-2xs">
            🧑
          </div>
          <div className="size-7 rounded-full bg-blue-400 border-2 border-white dark:border-neutral-900 flex items-center justify-center text-[10px] font-bold text-white shadow-2xs">
            👩
          </div>
          <div className="size-7 rounded-full bg-purple-400 border-2 border-white dark:border-neutral-900 flex items-center justify-center text-[10px] font-bold text-white shadow-2xs">
            +{project.membersCount || 3}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {project.dueDate && (
            <span className="px-2.5 py-1 rounded-full bg-white/90 dark:bg-white/10 text-neutral-700 dark:text-neutral-200 text-xs font-medium flex items-center gap-1 shadow-2xs">
              <Calendar size={11} />
              <span>{project.dueDate}</span>
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full bg-white/90 dark:bg-white/10 text-neutral-700 dark:text-neutral-200 text-xs font-medium flex items-center gap-1 shadow-2xs">
            <MessageSquare size={11} />
            <span>{String(project.commentsCount || 3).padStart(2, '0')}</span>
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. PROJECT GOALS & DETAIL INSPECTOR MODAL (Image 1 Center Phone)
// ─────────────────────────────────────────────────────────────────────────────
export function ProjectGoalsInspectorModal({
  project,
  tasks,
  onToggleTask,
  onClose
}: {
  project: ProjectCardData;
  tasks: any[];
  onToggleTask?: (taskId: string) => void;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"goals" | "chat">("goals");

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[3px] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-white dark:bg-[#181926] rounded-[36px] border border-black/10 dark:border-white/10 p-6 sm:p-7 shadow-2xl space-y-5"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Lavender Hero */}
        <div className="p-5 rounded-[24px] bg-[#f3e8ff] dark:bg-[#281c3c] border border-[#e4ccff] dark:border-[#3e2d58] flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              Project Overview
            </span>
            <h3 className="text-xl font-black text-purple-950 dark:text-purple-100">
              {project.title}
            </h3>
            <p className="text-xs text-purple-700/80 dark:text-purple-300/80">
              Created by {project.author || "You"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-full bg-white/80 dark:bg-white/10 text-neutral-600 dark:text-neutral-200 flex items-center justify-center transition cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* 2-Col Stat Pills */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-black/[0.05] text-center space-y-1">
            <span className="text-[11px] font-bold text-neutral-400 uppercase">Deadline</span>
            <div className="text-sm font-extrabold text-neutral-800 dark:text-neutral-200 flex items-center justify-center gap-1.5">
              <Calendar size={13} className="text-blue-500" />
              <span>{project.dueDate || "6 August"}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-black/[0.05] text-center space-y-1">
            <span className="text-[11px] font-bold text-neutral-400 uppercase">People</span>
            <div className="flex items-center justify-center -space-x-1.5 pt-0.5">
              <div className="size-6 rounded-full bg-amber-500 text-[10px] text-white flex items-center justify-center font-bold">
                <TactileGlyph name="user" className="size-3 text-white" />
              </div>
              <div className="size-6 rounded-full bg-blue-500 text-[10px] text-white flex items-center justify-center font-bold">
                <TactileGlyph name="user" className="size-3 text-white" />
              </div>
              <div className="size-6 rounded-full bg-purple-500 text-[10px] text-white flex items-center justify-center font-bold">
                <TactileGlyph name="user" className="size-3 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Goals / Chat Segmented Control */}
        <div className="flex items-center p-1 rounded-full bg-neutral-100 dark:bg-neutral-800">
          <button
            type="button"
            onClick={() => setActiveTab("goals")}
            className={cn(
              "flex-1 py-2 rounded-full text-xs font-bold transition cursor-pointer",
              activeTab === "goals" ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs" : "text-neutral-500"
            )}
          >
            Goals
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("chat")}
            className={cn(
              "flex-1 py-2 rounded-full text-xs font-bold transition cursor-pointer",
              activeTab === "chat" ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs" : "text-neutral-500"
            )}
          >
            Chat & Notes
          </button>
        </div>

        {/* Goals Checklist */}
        {activeTab === "goals" ? (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {tasks.length === 0 ? (
              <div className="py-6 text-center text-xs text-neutral-400">
                No active sub-goals for this project.
              </div>
            ) : (
              tasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onToggleTask?.(t.id)}
                  className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-black/[0.04] cursor-pointer hover:bg-neutral-100 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "size-5 rounded-full flex items-center justify-center text-xs shrink-0",
                      t.checked ? "bg-emerald-500 text-white" : "border-2 border-neutral-300 dark:border-neutral-600"
                    )}>
                      {t.checked && <Check size={11} strokeWidth={3} />}
                    </div>
                    <span className={cn("text-xs font-bold truncate", t.checked ? "line-through text-neutral-400" : "text-neutral-800 dark:text-neutral-200")}>
                      {t.text}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 flex items-center gap-1">
                    <TactileGlyph name="zap" className="size-2.5" />
                    <span>High</span>
                  </span>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="py-6 text-center space-y-2">
            <MessageSquare size={24} className="mx-auto text-neutral-400" />
            <p className="text-xs text-neutral-500">Project conversation thread & meeting summaries</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. QUICK JOURNAL & MINDFUL REFLECTION (Image 3 Quick Journal Cards)
// ─────────────────────────────────────────────────────────────────────────────
export interface QuickJournalEntry {
  id: string;
  tag: string;
  title: string;
  prompt: string;
  glyph: TactileGlyphName;
  theme: "peach" | "lavender" | "sage";
}

export function QuickJournalSection({
  onSelectPrompt,
  className
}: {
  onSelectPrompt?: (entry: QuickJournalEntry) => void;
  className?: string;
}) {
  const cards: QuickJournalEntry[] = [
    {
      id: "j1",
      tag: "Personal",
      title: "Pause & reflect",
      prompt: "What are you most grateful for today?",
      glyph: "plant",
      theme: "peach"
    },
    {
      id: "j2",
      tag: "Focus",
      title: "Set Intentions",
      prompt: "How do you want to feel at the end of sprint?",
      glyph: "sun",
      theme: "lavender"
    },
    {
      id: "j3",
      tag: "Initiative",
      title: "Mindful Clarity",
      prompt: "What single task creates 80% of value today?",
      glyph: "sparkles",
      theme: "sage"
    }
  ];

  const themeClasses = {
    peach: "bg-[#ffe7db] dark:bg-[#34221a] border-[#fed7aa] text-[#7c2d12] dark:text-[#ffedd5]",
    lavender: "bg-[#f3e8ff] dark:bg-[#291b3b] border-[#e4ccff] text-[#4c1d95] dark:text-[#e9d5ff]",
    sage: "bg-[#e8f6f0] dark:bg-[#162720] border-[#c4ecdc] text-[#064e3b] dark:text-[#a7f3d0]"
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between px-1">
        <h3 className="text-base font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight">
          Quick Journal & Reflection
        </h3>
        <span className="text-xs font-semibold text-neutral-400">Mindful habits</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {cards.map((c) => (
          <motion.div
            key={c.id}
            whileHover={{ y: -2, scale: 1.02 }}
            onClick={() => onSelectPrompt?.(c)}
            className={cn(
              "p-4 rounded-[22px] border space-y-2 cursor-pointer shadow-2xs transition",
              themeClasses[c.theme]
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <TactileGlyph name={c.glyph} className="size-3.5" />
                <span className="text-xs font-extrabold">{c.title}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-white/80 dark:bg-black/30 text-[10px] font-bold">
                {c.tag}
              </span>
            </div>
            <p className="text-[11.5px] opacity-85 leading-snug">
              {c.prompt}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. DAILY ROUTINE TIMELINE (Image 2 Daily Routine Checklist & Customizer)
// ─────────────────────────────────────────────────────────────────────────────
export interface RoutineItem {
  id: string;
  title: string;
  icon?: string;
  vectorType?: BentoVectorType | string;
  iconBg?: string;
  iconColor?: string;
  streakDays: number;
  duration: string;
  completed: boolean;
}

export function DailyRoutineTimeline({
  routines,
  onToggleRoutine,
  onAddRoutine,
  onEditRoutine,
  onDeleteRoutine,
  className
}: {
  routines: RoutineItem[];
  onToggleRoutine?: (id: string) => void;
  onAddRoutine?: (routine: { title: string; duration: string; vectorType: BentoVectorType; streakDays: number }) => void;
  onEditRoutine?: (id: string, updated: Partial<RoutineItem>) => void;
  onDeleteRoutine?: (id: string) => void;
  className?: string;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<RoutineItem | null>(null);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("10 min");
  const [selectedVector, setSelectedVector] = useState<BentoVectorType>("water");
  const [streakDays, setStreakDays] = useState(3);

  const completedCount = routines.filter(r => r.completed).length;
  const totalCount = routines.length;

  const durationOptions = ["5 min", "10 min", "15 min", "20 min", "30 min", "45 min"];

  const handleOpenAdd = () => {
    setEditingRoutine(null);
    setTitle("");
    setDuration("10 min");
    setSelectedVector("water");
    setStreakDays(1);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: RoutineItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingRoutine(item);
    setTitle(item.title);
    setDuration(item.duration);
    setSelectedVector((item.vectorType as BentoVectorType) || "water");
    setStreakDays(item.streakDays);
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingRoutine) {
      onEditRoutine?.(editingRoutine.id, {
        title: title.trim(),
        duration,
        vectorType: selectedVector,
        streakDays
      });
    } else {
      onAddRoutine?.({
        title: title.trim(),
        duration,
        vectorType: selectedVector,
        streakDays: streakDays || 1
      });
    }

    setIsModalOpen(false);
    setEditingRoutine(null);
  };

  return (
    <div className={cn("p-6 sm:p-7 rounded-[28px] bg-white dark:bg-[#17171a] border border-black/[0.06] dark:border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.03)] space-y-5 select-none relative", className)}>
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h3 className="text-lg font-black text-neutral-900 dark:text-neutral-100 tracking-tight">
            Daily routine
          </h3>
          {totalCount > 0 && (
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
              {completedCount} / {totalCount} Done
            </span>
          )}
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={handleOpenAdd}
          className="px-3 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
        >
          <Plus size={13} strokeWidth={2.6} />
          <span>Add routine</span>
        </motion.button>
      </div>

      {/* DEDICATED ROUTINE CREATOR / EDITOR MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="p-5 rounded-[26px] bg-neutral-50 dark:bg-[#1f1f26] border-2 border-neutral-200 dark:border-neutral-700 space-y-4 shadow-xl z-50 relative"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 pb-2">
              <div className="flex items-center gap-2">
                <TactileGlyph name="sparkles" className="size-4 text-amber-500" />
                <span className="text-xs font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                  {editingRoutine ? "Edit Routine Habit" : "Create Daily Routine Habit"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingRoutine(null);
                }}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer p-1"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Routine Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Drink 500ml water, Deep meditation..."
                  className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-800 text-xs font-bold border border-neutral-200 dark:border-neutral-700 focus:outline-hidden text-neutral-900 dark:text-neutral-100"
                  autoFocus
                />
              </div>

              {/* Duration Pills */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Estimated Duration
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {durationOptions.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border",
                        duration === d
                          ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white"
                          : "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400"
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vector Icon Selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Bespoke Vector Illustration
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1.5 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  {BENTO_VECTOR_CATALOG.map((v) => (
                    <button
                      key={v.type}
                      type="button"
                      onClick={() => setSelectedVector(v.type)}
                      className={cn(
                        "p-1.5 rounded-lg flex flex-col items-center gap-0.5 transition cursor-pointer border",
                        selectedVector === v.type
                          ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20"
                          : "border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      )}
                      title={v.label}
                    >
                      <BentoVectorIcon name={v.type} className="w-6 h-6" />
                      <span className="text-[8.5px] font-bold text-neutral-600 dark:text-neutral-300 truncate w-full text-center">
                        {v.label.split(" ")[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700">
                <div>
                  {editingRoutine && onDeleteRoutine && (
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteRoutine(editingRoutine.id);
                        setIsModalOpen(false);
                        setEditingRoutine(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-950 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 size={12} />
                      <span>Delete</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingRoutine(null);
                    }}
                    className="px-3.5 py-1.5 text-xs font-bold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    {editingRoutine ? "Save Changes" : "Create Routine"}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vertical Dashed Timeline Track */}
      <div className="relative pl-6 space-y-3.5">
        <div className="absolute left-2.5 top-3 bottom-3 w-0.5 border-l-2 border-dashed border-neutral-300 dark:border-neutral-700" />

        {routines.map((item) => {
          const vectorName = item.vectorType || (
            item.title.toLowerCase().includes("water") ? "water" :
            item.title.toLowerCase().includes("meditat") ? "lotus" :
            item.title.toLowerCase().includes("stretch") ? "stretch" :
            item.title.toLowerCase().includes("coffee") ? "coffee" :
            item.title.toLowerCase().includes("journal") ? "journal" :
            item.title.toLowerCase().includes("sprint") || item.title.toLowerCase().includes("deliver") ? "work" : "sun"
          );

          return (
            <div key={item.id} className="group relative flex items-center gap-3">
              {/* Timeline Bullet Check Stamp */}
              <button
                type="button"
                onClick={() => onToggleRoutine?.(item.id)}
                className={cn(
                  "absolute -left-6 size-5 rounded-full flex items-center justify-center transition-all cursor-pointer z-10",
                  item.completed
                    ? "bg-amber-500 text-white shadow-[0_2px_8px_rgba(245,158,11,0.4)] ring-2 ring-amber-500/20"
                    : "bg-white dark:bg-neutral-800 border-2 border-neutral-300 dark:border-neutral-600 hover:border-amber-400"
                )}
              >
                {item.completed && <Check size={11} strokeWidth={3} />}
              </button>

              <motion.div
                whileHover={{ scale: 1.01 }}
                onClick={() => onToggleRoutine?.(item.id)}
                className={cn(
                  "flex-1 flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden",
                  item.completed
                    ? "bg-neutral-50/80 dark:bg-neutral-800/40 border-black/[0.04] dark:border-white/[0.04] opacity-80"
                    : "bg-neutral-50 dark:bg-neutral-800/70 border-black/[0.06] dark:border-white/[0.08] hover:border-black/10 dark:hover:border-white/20 shadow-2xs"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* High-End Vector Illustration Avatar */}
                  <div className="size-11 rounded-xl bg-white dark:bg-neutral-700/80 border border-neutral-200/80 dark:border-neutral-700 flex items-center justify-center shrink-0 shadow-2xs p-1">
                    <BentoVectorIcon name={vectorName} className="w-8 h-8" />
                  </div>

                  <div className="min-w-0">
                    <h5 className={cn(
                      "text-sm font-black truncate leading-tight",
                      item.completed ? "line-through text-neutral-400 dark:text-neutral-500" : "text-neutral-800 dark:text-neutral-100"
                    )}>
                      {item.title}
                    </h5>
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 pt-0.5">
                      <span className="text-amber-600 dark:text-amber-400">🔥</span>
                      <span>Streak {item.completed ? item.streakDays + 1 : item.streakDays} days</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Duration Pill */}
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white dark:bg-neutral-700 border border-black/[0.05] dark:border-white/[0.08] text-xs font-semibold text-neutral-500 dark:text-neutral-300">
                    <Clock size={11} />
                    <span>{item.duration}</span>
                  </div>

                  {/* Hover Edit Pencil */}
                  <button
                    type="button"
                    onClick={(e) => handleOpenEdit(item, e)}
                    className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                    title="Edit routine"
                  >
                    <Edit3 size={13} strokeWidth={2.4} />
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. WORKLOAD VELOCITY & PRIORITY PILL GAUGES (Image 3 Pill Bar Chart)
// ─────────────────────────────────────────────────────────────────────────────
export interface VelocityMetric {
  label: string;
  percentage: number;
  color: string;
  count: number;
  priorityKey: string;
}

export function WorkloadVelocityGauges({
  metrics,
  completedCount = 0,
  pendingCount = 0,
  onSelectPriority,
  className
}: {
  metrics: VelocityMetric[];
  completedCount?: number;
  pendingCount?: number;
  onSelectPriority?: (priorityKey: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("p-6 sm:p-7 rounded-[28px] bg-white dark:bg-[#17171a] border border-black/[0.06] dark:border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.03)] space-y-6 select-none", className)}>
      <div className="text-center space-y-1">
        <span className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight">
          {completedCount}
        </span>
        <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
          {completedCount > 0
            ? `${completedCount} task${completedCount > 1 ? "s" : ""} completed today • ${pendingCount} pending`
            : pendingCount > 0
            ? `${pendingCount} workspace deliverable${pendingCount > 1 ? "s" : ""} in queue`
            : "All caught up for today! 🎉"}
        </p>
      </div>

      <div className="space-y-0.5">
        <h4 className="text-sm font-extrabold text-neutral-800 dark:text-neutral-200">
          Priority Distribution
        </h4>
        <p className="text-[11px] text-neutral-400">
          Live workspace velocity and workload balance
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3 sm:gap-4 items-end h-48 sm:h-52 px-2">
        {metrics.map((m) => (
          <div
            key={m.label}
            onClick={() => onSelectPriority?.(m.priorityKey)}
            className="flex flex-col items-center gap-2 h-full justify-end group cursor-pointer"
          >
            <div className="w-full max-w-[48px] h-full rounded-full bg-neutral-100 dark:bg-neutral-800 flex flex-col justify-end p-1 relative overflow-hidden transition-all group-hover:ring-2 group-hover:ring-neutral-400/40">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(14, m.percentage)}%` }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="w-full rounded-full flex flex-col items-center justify-end pb-2.5"
                style={{ backgroundColor: m.color }}
              >
                <span className="text-[11px] font-black text-white drop-shadow-xs">
                  {m.percentage}%
                </span>
              </motion.div>
            </div>

            <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition truncate">
              {m.label}
            </span>
            <span className="text-[10px] font-bold text-neutral-400">
              {m.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. TODAY'S MEETING / SYNC WIDGET (With Dedicated Scheduling Modal & Presets)
// ─────────────────────────────────────────────────────────────────────────────

export interface TodayMeetingItem {
  id: string;
  title: string;
  time: string;
  endTime?: string;
  category?: "sync" | "deep_work" | "review" | "1on1" | "standup";
  attendees?: string[];
  link?: string;
}

export function TodayMeetingWidget({
  meetings = [],
  onJoinMeet,
  onScheduleNew,
  onDeleteMeeting,
  className
}: {
  meetings: TodayMeetingItem[];
  onJoinMeet?: (item: TodayMeetingItem) => void;
  onScheduleNew?: (item: { title: string; time: string; category?: string; link?: string }) => void;
  onDeleteMeeting?: (id: string) => void;
  className?: string;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("10:00 AM");
  const [endTime, setEndTime] = useState("10:30 AM");
  const [category, setCategory] = useState<"sync" | "deep_work" | "review" | "1on1" | "standup">("sync");
  const [meetingLink, setMeetingLink] = useState("");

  const presets = [
    { label: "Morning Standup", time: "09:30 AM", endTime: "09:45 AM", cat: "standup" as const, glyph: "standup" as const },
    { label: "Product & Arch Sync", time: "11:00 AM", endTime: "11:45 AM", cat: "sync" as const, glyph: "sync" as const },
    { label: "Deep Focus Sprint", time: "02:00 PM", endTime: "03:30 PM", cat: "deep_work" as const, glyph: "deep_work" as const },
    { label: "1-on-1 Catchup", time: "04:30 PM", endTime: "05:00 PM", cat: "1on1" as const, glyph: "one_on_one" as const },
  ];

  const handleApplyPreset = (p: typeof presets[0]) => {
    setTitle(p.label);
    setTime(p.time);
    setEndTime(p.endTime);
    setCategory(p.cat);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onScheduleNew?.({
      title: title.trim(),
      time: endTime ? `${time} - ${endTime}` : time,
      category,
      link: meetingLink.trim() || undefined
    });

    setTitle("");
    setMeetingLink("");
    setIsModalOpen(false);
  };

  return (
    <div className={cn("p-6 sm:p-7 rounded-[32px] bg-white dark:bg-[#17171a] border border-black/[0.06] dark:border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.03)] space-y-4 select-none relative", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm sm:text-base font-black text-neutral-900 dark:text-neutral-100 tracking-tight flex items-center gap-2">
            <span>Today's Schedule & Sync</span>
            {meetings.length > 0 && (
              <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                {meetings.length}
              </span>
            )}
          </h3>
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium">
            Live workspace agenda & calendar blocks
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-3 py-1 rounded-full bg-[#18181b] hover:bg-[#27272a] text-white dark:bg-[#f4f4f5] dark:hover:bg-white dark:text-[#18181b] text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
        >
          <Plus size={12} strokeWidth={2.6} />
          <span>Schedule</span>
        </motion.button>
      </div>

      {/* DEDICATED SCHEDULING MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="p-5 rounded-[26px] bg-[#fbfbfa] dark:bg-[#1f1f24] border-2 border-[#e7e5e1] dark:border-[#33333a] space-y-4 shadow-xl z-50 relative"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 pb-2.5">
              <div className="flex items-center gap-2">
                <TactileGlyph name="calendar" className="size-4.5 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                  Schedule Meeting or Time Block
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer p-1"
              >
                <X size={15} />
              </button>
            </div>

            {/* Quick 1-Click Presets */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">
                Quick Presets
              </span>
              <div className="grid grid-cols-2 gap-2">
                {presets.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 hover:border-neutral-400 text-left transition cursor-pointer"
                  >
                    <div className="size-6 rounded-lg bg-neutral-100 dark:bg-neutral-700/80 flex items-center justify-center shrink-0">
                      <TactileGlyph name={p.glyph} className="size-3.5 text-neutral-700 dark:text-neutral-300" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200 block truncate leading-tight">
                        {p.label}
                      </span>
                      <span className="text-[9.5px] font-semibold text-neutral-400 block">
                        {p.time}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3 pt-1">
              {/* Meeting Title Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Meeting Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Architecture Sync with Agnes..."
                  className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-800 text-xs font-bold border border-neutral-200 dark:border-neutral-700 focus:outline-hidden text-neutral-900 dark:text-neutral-100"
                  autoFocus
                />
              </div>

              {/* Time Range Input */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Start Time
                  </label>
                  <input
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="10:00 AM"
                    className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 text-xs font-bold border border-neutral-200 dark:border-neutral-700 focus:outline-hidden text-neutral-900 dark:text-neutral-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    End Time
                  </label>
                  <input
                    type="text"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="10:30 AM"
                    className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 text-xs font-bold border border-neutral-200 dark:border-neutral-700 focus:outline-hidden text-neutral-900 dark:text-neutral-100"
                  />
                </div>
              </div>

              {/* Category Selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Category Type
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { key: "sync", label: "Team Sync" },
                    { key: "deep_work", label: "Deep Focus" },
                    { key: "standup", label: "Standup" },
                    { key: "1on1", label: "1-on-1" },
                    { key: "review", label: "Review" },
                  ].map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setCategory(c.key as any)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition cursor-pointer border",
                        category === c.key
                          ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white"
                          : "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400"
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Room Link */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Meeting Link / Room (Optional)
                </label>
                <input
                  type="text"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://meet.google.com/xyz or Zoom room..."
                  className="w-full px-3.5 py-1.5 rounded-xl bg-white dark:bg-neutral-800 text-xs font-medium border border-neutral-200 dark:border-neutral-700 focus:outline-hidden text-neutral-900 dark:text-neutral-100"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-bold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LIST OR UPGRADED EMPTY STATE */}
      <div className="space-y-3">
        {meetings.length === 0 ? (
          <div className="p-6 text-center rounded-[24px] bg-[#fafaf9] dark:bg-[#1c1c21] border border-dashed border-[#e7e5e1] dark:border-[#333338] space-y-3.5">
            <div className="size-11 mx-auto rounded-2xl bg-[#f0ede6] dark:bg-[#282830] text-[#57534e] dark:text-[#d6d3d1] flex items-center justify-center font-bold shadow-2xs">
              <Calendar size={20} strokeWidth={2.2} />
            </div>

            <div className="space-y-1">
              <h4 className="text-xs sm:text-sm font-black text-neutral-800 dark:text-neutral-200">
                Your Schedule is Clear Today
              </h4>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 max-w-xs mx-auto leading-relaxed">
                No calls or syncs scheduled. Optimal flow window for uninterrupted deep work!
              </p>
            </div>

            {/* Quick 1-Click Action Chips on Empty State */}
            <div className="flex items-center justify-center gap-1.5 flex-wrap pt-1">
              {presets.slice(0, 3).map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    handleApplyPreset(p);
                    setIsModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 text-[10.5px] font-bold text-neutral-700 dark:text-neutral-300 transition cursor-pointer shadow-2xs flex items-center gap-1.5"
                >
                  <TactileGlyph name={p.glyph} className="size-3 text-neutral-600 dark:text-neutral-400" />
                  <span>+ {p.label.split(" ")[0]}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          meetings.map((m) => {
            const isDeepWork = m.category === "deep_work";
            const isStandup = m.category === "standup";
            const is1on1 = m.category === "1on1";

            const badgeColor = isDeepWork
              ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/25"
              : isStandup
              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25"
              : is1on1
              ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/25"
              : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25";

            return (
              <motion.div
                key={m.id}
                whileHover={{ y: -2 }}
                className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#fafaf9] dark:bg-[#1c1c21] border border-black/[0.05] dark:border-white/[0.06] shadow-2xs hover:shadow-xs transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-9 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                    <TactileGlyph name={isDeepWork ? "deep_work" : isStandup ? "standup" : is1on1 ? "one_on_one" : "sync"} className="size-4.5 text-white dark:text-neutral-900" />
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border", badgeColor)}>
                        {m.category || "Sync"}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                        <Clock size={10} />
                        <span>{m.time}</span>
                      </div>
                    </div>
                    <h5 className="text-xs sm:text-[13px] font-black text-neutral-900 dark:text-neutral-100 truncate">
                      {m.title}
                    </h5>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    onClick={() => onJoinMeet?.(m)}
                    className="px-3.5 py-1.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    <span>Join</span>
                    <ArrowRight size={11} strokeWidth={2.6} />
                  </motion.button>

                  {onDeleteMeeting && (
                    <button
                      type="button"
                      onClick={() => onDeleteMeeting(m.id)}
                      className="p-1.5 text-neutral-400 hover:text-rose-500 transition cursor-pointer"
                      title="Remove from Schedule"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. "MY TURN" BENTO TIME-BLOCKED HABIT & TASK GRID (User Reference Image)
// ─────────────────────────────────────────────────────────────────────────────
export interface BentoTimeBlockItem {
  id: string;
  title: string;
  timeSlot?: string;
  iconType: BentoVectorType | string;
  completed: boolean;
  theme?: string;
  linkedTaskId?: string;
}

export const BENTO_THEMES = [
  { id: "cream", label: "Cream Butter", bg: "bg-[#faf6e9] dark:bg-[#2c2618]" },
  { id: "white", label: "Clean White", bg: "bg-white dark:bg-[#1c1d29]" },
  { id: "mint", label: "Mint Sage", bg: "bg-[#f0fdf4] dark:bg-[#13281d]" },
  { id: "lavender", label: "Lavender", bg: "bg-[#fdf4ff] dark:bg-[#2d1b33]" },
  { id: "sky", label: "Sky Azure", bg: "bg-[#f0f9ff] dark:bg-[#182836]" },
  { id: "peach", label: "Peach Sun", bg: "bg-[#fff7ed] dark:bg-[#341d13]" },
  { id: "rose", label: "Rose Petal", bg: "bg-[#fff1f2] dark:bg-[#36151b]" },
];

export function MyTurnBentoGrid({
  userId = "default",
  workspaceTasks = [],
  onToggleItem,
  onToast,
  className
}: {
  userId?: string;
  workspaceTasks?: any[];
  onToggleItem?: (id: string, completed: boolean) => void;
  onToast?: (message: string) => void;
  className?: string;
}) {
  const storageKey = `noska_my_turn_bento_${userId}`;

  const [items, setItems] = useState<BentoTimeBlockItem[]>(() => {
    try {
      if (typeof localStorage !== "undefined") {
        const saved = localStorage.getItem(storageKey);
        if (saved) return JSON.parse(saved);
      }
    } catch {}
    return [
      { id: "b1", title: "Wake up at 9:00", iconType: "alarm", completed: true, theme: "bg-[#faf6e9] dark:bg-[#2c2618]" },
      { id: "b2", title: "Make the bed", iconType: "bed", completed: true, theme: "bg-white dark:bg-[#1c1d29]" },
      { id: "b3", title: "Take supplements", iconType: "pill", completed: false, theme: "bg-white dark:bg-[#1c1d29]" },
      { id: "b4", title: "Light stretching", iconType: "stretch", completed: false, theme: "bg-white dark:bg-[#1c1d29]" },
      { id: "b5", title: "Lunch", iconType: "lunch", completed: true, theme: "bg-[#f0f9ff] dark:bg-[#182836]" },
      { id: "b6", title: "Enjoy coffee time", iconType: "coffee", completed: true, theme: "bg-white dark:bg-[#1c1d29]" },
      { id: "b7", title: "Evening sprint sync", timeSlot: "17:00", iconType: "work", completed: false, theme: "bg-[#fdf4ff] dark:bg-[#2d1b33]" },
    ];
  });

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BentoTimeBlockItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editIcon, setEditIcon] = useState<BentoVectorType>("journal");
  const [editTheme, setEditTheme] = useState(BENTO_THEMES[0].bg);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  useEffect(() => {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(storageKey, JSON.stringify(items));
      }
    } catch {}
  }, [items, storageKey]);

  const completedCount = items.filter(i => i.completed).length;
  const totalCount = items.length;

  const currentWeekDays = useMemo(() => {
    const now = new Date();
    const currentDayOfWeek = (now.getDay() + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - currentDayOfWeek);

    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    return dayLabels.map((label, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      const isToday = d.toDateString() === now.toDateString();
      const isPast = d < now && !isToday;

      let progress: "full" | "half" | "none" = "none";
      if (isToday) {
        progress = completedCount === totalCount && totalCount > 0 ? "full" : completedCount > 0 ? "half" : "none";
      } else if (isPast) {
        progress = "full";
      }

      return {
        day: isToday ? "Today" : label,
        num: d.getDate(),
        isToday,
        progress,
        isoDate: d.toISOString().split("T")[0]
      };
    });
  }, [completedCount, totalCount]);

  const realHeaderDate = useMemo(() => {
    const now = new Date();
    return {
      dayMonth: `${now.getDate()} ${now.toLocaleDateString('en-US', { month: 'short' })}`,
      year: now.getFullYear()
    };
  }, []);

  const handleToggle = (id: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const next = !item.completed;
        if (next) onToast?.(`Completed "${item.title}"! Checked on your daily turn ✓`);
        onToggleItem?.(id, next);
        return { ...item, completed: next };
      }
      return item;
    }));
  };

  const handleOpenEdit = (item: BentoTimeBlockItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingItem(item);
    setEditTitle(item.title);
    setEditTime(item.timeSlot || "");
    setEditIcon((item.iconType as BentoVectorType) || "journal");
    setEditTheme(item.theme || BENTO_THEMES[0].bg);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;

    if (editingItem) {
      setItems(prev => prev.map(item => {
        if (item.id === editingItem.id) {
          return {
            ...item,
            title: editTitle.trim(),
            timeSlot: editTime.trim() || undefined,
            iconType: editIcon,
            theme: editTheme
          };
        }
        return item;
      }));
      onToast?.(`Updated bento block "${editTitle.trim()}" ✨`);
      setEditingItem(null);
    } else {
      const newItem: BentoTimeBlockItem = {
        id: `b-${Date.now()}`,
        title: editTitle.trim(),
        timeSlot: editTime.trim() || undefined,
        iconType: editIcon,
        completed: false,
        theme: editTheme
      };
      setItems(prev => [...prev, newItem]);
      onToast?.(`Added "${editTitle.trim()}" to My Turn bento grid!`);
      setIsPickerOpen(false);
    }
  };

  const handleDeleteCard = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    onToast?.("Bento card removed from your daily turn");
    setEditingItem(null);
  };

  const handleMoveOrder = (id: string, direction: "left" | "right") => {
    setItems(prev => {
      const index = prev.findIndex(item => item.id === id);
      if (index < 0) return prev;
      const targetIndex = direction === "left" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleImportWorkspaceTask = (task: any) => {
    if (!task) return;
    setEditTitle(task.text || task.title || "Workspace Task");
    if (task.priority === "urgent" || task.priority === "high") {
      setEditIcon("rocket");
      setEditTheme("bg-[#fff1f2] dark:bg-[#36151b]");
    } else {
      setEditIcon("work");
      setEditTheme("bg-[#f0f9ff] dark:bg-[#182836]");
    }
    onToast?.(`Imported "${task.text || task.title}" into customizer!`);
  };

  const filteredCatalog = selectedCategory === "All"
    ? BENTO_VECTOR_CATALOG
    : BENTO_VECTOR_CATALOG.filter(c => c.category === selectedCategory);

  return (
    <div className={cn("p-6 sm:p-7 rounded-[32px] bg-white dark:bg-[#151620] border border-black/[0.07] dark:border-white/[0.08] shadow-[0_12px_36px_rgba(0,0,0,0.04)] space-y-6 relative", className)}>
      {/* Top Header: Real Date Indicator & "MY TURN 📅" */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-neutral-400 block tracking-wider">
            {realHeaderDate.dayMonth} • {realHeaderDate.year}
          </span>
          <h2 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight flex items-center gap-2">
            <span>MY TURN</span>
            <TactileGlyph name="calendar" className="size-5.5 text-emerald-600 dark:text-emerald-400" />
          </h2>
        </div>

        {/* Counter: ☑ X / Y & Add Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-black text-neutral-800 dark:text-neutral-200">
            <CheckSquare size={13} className="text-emerald-500" />
            <span>{completedCount} / {totalCount}</span>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => {
              setEditingItem(null);
              setEditTitle("");
              setEditTime("");
              setEditIcon("alarm");
              setEditTheme(BENTO_THEMES[0].bg);
              setIsPickerOpen(true);
            }}
            className="px-3 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
            title="Add Bento Card from Vector Library"
          >
            <Plus size={13} strokeWidth={2.6} />
            <span>Add Block</span>
          </motion.button>
        </div>
      </div>

      {/* MODAL: BENTO CARD CUSTOMIZER / EDIT / CREATE */}
      <AnimatePresence>
        {(isPickerOpen || editingItem) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="p-5 sm:p-6 rounded-[28px] bg-neutral-50 dark:bg-[#1b1c29] border-2 border-neutral-200 dark:border-neutral-700 space-y-4 shadow-xl z-50 relative"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 pb-2.5">
              <div className="flex items-center gap-2">
                <TactileGlyph name="sparkles" className="size-4 text-amber-500" />
                <span className="text-xs font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                  {editingItem ? "Customize Bento Block" : "Create New Bento Block"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPickerOpen(false);
                  setEditingItem(null);
                }}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer p-1"
              >
                <X size={15} />
              </button>
            </div>

            {/* Optional: Fast Workspace Task Import */}
            {workspaceTasks && workspaceTasks.length > 0 && (
              <div className="p-2.5 rounded-2xl bg-white dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700 space-y-1.5">
                <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider flex items-center gap-1">
                  <TactileGlyph name="folder" className="size-2.5" />
                  <span>Quick-Link From Workspace Tasks</span>
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {workspaceTasks.slice(0, 5).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleImportWorkspaceTask(t)}
                      className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-200 truncate shrink-0 max-w-[150px] transition cursor-pointer"
                    >
                      + {t.text || t.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              {/* Title & Time inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Habit / Task Title
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="e.g. Read 20 mins, Espresso Break..."
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-800 text-xs font-bold border border-neutral-200 dark:border-neutral-700 focus:outline-hidden text-neutral-900 dark:text-neutral-100"
                    autoFocus
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Time Slot (Optional)
                  </label>
                  <input
                    type="text"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    placeholder="e.g. 09:00, 14:30..."
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-800 text-xs font-semibold border border-neutral-200 dark:border-neutral-700 focus:outline-hidden text-neutral-900 dark:text-neutral-100"
                  />
                </div>
              </div>

              {/* Theme / Background Color Palette */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Card Accent & Pastel Theme
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {BENTO_THEMES.map((th) => (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => setEditTheme(th.bg)}
                      className={cn(
                        "px-3 py-1 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5",
                        editTheme === th.bg
                          ? "border-neutral-900 dark:border-white ring-2 ring-neutral-900/10 shadow-xs"
                          : "border-neutral-200 dark:border-neutral-700 opacity-80 hover:opacity-100"
                      )}
                    >
                      <span className={cn("size-3 rounded-full border border-black/10", th.bg)} />
                      <span className="text-[11px]">{th.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Vector Icon Category Filter & 30+ Vectors Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Choose Vector Illustration (30+ in Big Library)
                  </label>
                  <div className="flex items-center gap-1">
                    {["All", "Morning", "Wellness", "Work", "Evening", "Self-Care"].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={cn(
                          "px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer",
                          selectedCategory === cat
                            ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                            : "bg-neutral-200/70 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-2 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800">
                  {filteredCatalog.map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setEditIcon(item.type)}
                      className={cn(
                        "p-2 rounded-xl flex flex-col items-center gap-1 transition cursor-pointer border",
                        editIcon === item.type
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20"
                          : "border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      )}
                      title={item.label}
                    >
                      <BentoVectorIcon name={item.type} className="w-8 h-8" />
                      <span className="text-[9px] font-bold text-neutral-600 dark:text-neutral-300 truncate w-full text-center">
                        {item.label.split(" ")[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons: Save, Delete, Move */}
              <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700">
                <div>
                  {editingItem && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCard(editingItem.id)}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-950 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 size={12} />
                      <span>Delete</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPickerOpen(false);
                      setEditingItem(null);
                    }}
                    className="px-3.5 py-1.5 text-xs font-bold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    {editingItem ? "Save Changes" : "Add to Grid"}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Week Day Progress Rings Ribbon (Real Current Week) */}
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {currentWeekDays.map((d) => (
          <div key={d.num} className="flex flex-col items-center gap-1">
            <span className={cn(
              "text-[10.5px] font-bold",
              d.isToday ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-400"
            )}>
              {d.day}
            </span>

            <div className={cn(
              "size-8 sm:size-9 rounded-full flex items-center justify-center text-xs font-black transition-all relative",
              d.isToday
                ? "bg-emerald-500 text-white ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-neutral-900 shadow-md"
                : d.progress === "full"
                ? "bg-emerald-500 text-white"
                : d.progress === "half"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-b-4 border-emerald-500"
                : "border border-neutral-200 dark:border-neutral-700 text-neutral-500"
            )}>
              {d.num}
            </div>
          </div>
        ))}
      </div>

      {/* Bento Grid Time-Blocked Cards with Hover Edit Controls & Rich Customization */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
        {items.map((item) => {
          const isDone = item.completed;
          return (
            <motion.div
              key={item.id}
              layout
              whileHover={{ y: -4, scale: 1.025 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleToggle(item.id)}
              animate={isDone ? { scale: [0.97, 1.02, 1] } : { scale: 1 }}
              transition={{ duration: 0.35 }}
              className={cn(
                "group p-4 rounded-[26px] relative flex flex-col justify-between h-36 sm:h-40 cursor-pointer transition-all duration-300 overflow-hidden select-none",
                isDone
                  ? "bg-gradient-to-br from-[#f7fbf8] via-[#f2f8f4] to-[#eaf5ee] dark:from-[#17231c] dark:via-[#141e18] dark:to-[#111914] border-2 border-emerald-500/35 dark:border-emerald-500/40 shadow-[0_12px_32px_-4px_rgba(16,185,129,0.15)]"
                  : cn("border border-black/[0.08] dark:border-white/[0.08] shadow-xs hover:shadow-md", item.theme || "bg-white dark:bg-[#1a1b28]")
              )}
            >
              {/* 1. TEXTURED BACKGROUND PATTERN OVERLAY (Appears on complete) */}
              {isDone && (
                <>
                  <div
                    className="absolute inset-0 pointer-events-none opacity-[0.25] dark:opacity-[0.12]"
                    style={{
                      backgroundImage: `radial-gradient(#059669 1px, transparent 1px)`,
                      backgroundSize: '12px 12px'
                    }}
                  />
                  <motion.div
                    initial={{ x: "-100%", opacity: 0 }}
                    animate={{ x: "200%", opacity: [0, 0.6, 0] }}
                    transition={{ duration: 0.9, ease: "easeInOut" }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 dark:via-white/20 to-transparent skew-x-12 pointer-events-none"
                  />
                </>
              )}

              {/* Hover Edit Pencil Button */}
              <button
                type="button"
                onClick={(e) => handleOpenEdit(item, e)}
                className="absolute top-2.5 right-2.5 z-30 size-7 rounded-full bg-white/90 dark:bg-black/60 hover:bg-white text-neutral-600 dark:text-neutral-300 opacity-0 group-hover:opacity-100 transition shadow-xs flex items-center justify-center cursor-pointer"
                title="Edit bento card"
              >
                <Edit3 size={12} strokeWidth={2.4} />
              </button>

              {/* Top Row: Time Slot & Status Pill */}
              <div className="flex items-center justify-between z-10 pr-6 group-hover:pr-8 transition-all">
                <div className="flex items-center gap-1.5">
                  {item.timeSlot && (
                    <span className={cn(
                      "text-[10.5px] font-extrabold px-2 py-0.5 rounded-full tracking-tight transition-colors",
                      isDone
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
                    )}>
                      {item.timeSlot}
                    </span>
                  )}
                  {isDone && (
                    <span className="text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                      ✓ Done
                    </span>
                  )}
                </div>

                {/* Top-Right Tactile 3D Rosette Check Stamp */}
                <AnimatePresence>
                  {isDone && (
                    <motion.div
                      initial={{ scale: 0, rotate: -25 }}
                      animate={{ scale: 1, rotate: -6 }}
                      exit={{ scale: 0, rotate: -25 }}
                      transition={{ type: "spring", stiffness: 500, damping: 22 }}
                    >
                      <TactileCheckmarkBadge variant="obsidian" size="sm" showSparkles={true} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Middle Title */}
              <div className="text-center my-auto z-10 px-1">
                <h4 className={cn(
                  "text-xs sm:text-[13px] font-black leading-snug transition-colors",
                  isDone
                    ? "text-emerald-950 dark:text-emerald-100"
                    : "text-neutral-900 dark:text-neutral-100"
                )}>
                  {item.title}
                </h4>
              </div>

              {/* Bottom Vector with Animated Completion Glow */}
              <div className="relative flex items-center justify-center pt-1 z-10">
                <motion.div
                  animate={isDone ? { scale: [1, 1.1, 1], y: [0, -3, 0] } : { scale: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="relative"
                >
                  <BentoVectorIcon name={item.iconType} className="w-12 h-12 sm:w-14 sm:h-14" />

                  {isDone && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 0.4, scale: 1.2 }}
                      className="absolute inset-0 -z-10 rounded-full bg-emerald-400 blur-md pointer-events-none"
                    />
                  )}
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIQUE 3D TACTILE CHECKMARK STAMP BADGE (With Texture, Graphics & Animation)
// ─────────────────────────────────────────────────────────────────────────────
export interface TactileCheckmarkBadgeProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "obsidian" | "emerald" | "clay" | "gold";
  showSparkles?: boolean;
}

export function TactileCheckmarkBadge({
  className,
  size = "md",
  variant = "obsidian",
  showSparkles = true
}: TactileCheckmarkBadgeProps) {
  const sizeMap = {
    sm: "size-7",
    md: "size-8.5 sm:size-9",
    lg: "size-10 sm:size-11"
  };

  const badgeGradients = {
    obsidian: {
      base: "from-[#3a3a42] via-[#222227] to-[#121215]",
      border: "border-[#4e4e58]",
      innerRing: "#60606b",
      shadow: "shadow-[0_10px_24px_-2px_rgba(0,0,0,0.65),inset_0_1.5px_1.5px_rgba(255,255,255,0.45),inset_0_-2.5px_1px_rgba(0,0,0,0.5)]",
      checkColor: "#ffffff",
      glow: "rgba(0,0,0,0.4)"
    },
    emerald: {
      base: "from-[#10b981] via-[#059669] to-[#047857]",
      border: "border-[#34d399]",
      innerRing: "#6ee7b7",
      shadow: "shadow-[0_10px_24px_-2px_rgba(16,185,129,0.5),inset_0_1.5px_1.5px_rgba(255,255,255,0.5),inset_0_-2.5px_1px_rgba(0,0,0,0.35)]",
      checkColor: "#ffffff",
      glow: "rgba(16,185,129,0.4)"
    },
    clay: {
      base: "from-[#fbfbfa] via-[#f2f0ec] to-[#e5e2db]",
      border: "border-[#d1cdc4]",
      innerRing: "#a8a29e",
      shadow: "shadow-[0_8px_20px_-2px_rgba(0,0,0,0.14),inset_0_2px_1.5px_rgba(255,255,255,1),inset_0_-2px_1px_rgba(0,0,0,0.15)]",
      checkColor: "#1c1917",
      glow: "rgba(0,0,0,0.1)"
    },
    gold: {
      base: "from-[#fbbf24] via-[#f59e0b] to-[#b45309]",
      border: "border-[#fde68a]",
      innerRing: "#fef3c7",
      shadow: "shadow-[0_10px_24px_-2px_rgba(245,158,11,0.5),inset_0_1.5px_1.5px_rgba(255,255,255,0.6),inset_0_-2.5px_1px_rgba(0,0,0,0.35)]",
      checkColor: "#ffffff",
      glow: "rgba(245,158,11,0.4)"
    }
  };

  const style = badgeGradients[variant];

  return (
    <div className={cn("relative flex items-center justify-center select-none", className)}>
      {/* 1. ANIMATED EXPANDING RIPPLE / SHOCKWAVE RING */}
      {showSparkles && (
        <motion.div
          initial={{ scale: 0.6, opacity: 0.9 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="absolute inset-0 rounded-[14px] border-2 border-emerald-400/60 pointer-events-none"
        />
      )}

      {/* 2. MAIN 3D TACTILE ROSETTE STAMP CONTAINER */}
      <motion.div
        initial={{ scale: 0, rotate: -28 }}
        animate={{ scale: [0, 1.15, 0.95, 1], rotate: -6 }}
        exit={{ scale: 0, rotate: -28 }}
        transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
        whileHover={{ scale: 1.12, rotate: 0 }}
        whileTap={{ scale: 0.92 }}
        className={cn(
          "relative rounded-[13px] border-[1.8px] bg-gradient-to-b flex items-center justify-center cursor-pointer transform z-20",
          sizeMap[size],
          style.base,
          style.border,
          style.shadow
        )}
      >
        {/* Subtle Specular Sheen Highlight Line */}
        <div className="absolute inset-x-1.5 top-0.5 h-1 rounded-full bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

        {/* Textured Graphic SVG with Stitched Ring + Animated Dynamic Path */}
        <svg viewBox="0 0 32 32" fill="none" className="w-full h-full p-1 drop-shadow-[0_1.5px_2.5px_rgba(0,0,0,0.45)]">
          {/* Engraved Dashed Inner Ring */}
          <circle
            cx="16"
            cy="16"
            r="12"
            stroke={style.innerRing}
            strokeWidth="1.2"
            strokeDasharray="2.5 2.5"
            opacity="0.65"
          />

          {/* Corner Stitch Dots */}
          <circle cx="8" cy="8" r="0.8" fill={style.innerRing} opacity="0.75" />
          <circle cx="24" cy="8" r="0.8" fill={style.innerRing} opacity="0.75" />
          <circle cx="8" cy="24" r="0.8" fill={style.innerRing} opacity="0.75" />
          <circle cx="24" cy="24" r="0.8" fill={style.innerRing} opacity="0.75" />

          {/* Animated Fluid Checkmark Path (draws from 0 to 1) */}
          <motion.path
            d="M9 16.5L14 21.5L23.5 10.5"
            stroke={style.checkColor}
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.35, delay: 0.08, ease: "easeOut" }}
          />
        </svg>

        {/* 3. CELEBRATORY MULTI-PARTICLE BURST */}
        {showSparkles && (
          <div className="absolute -inset-2 pointer-events-none">
            {/* Top-Right Star */}
            <motion.span
              initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
              animate={{ scale: [0, 1.3, 0], x: 6, y: -6, opacity: [0, 1, 0] }}
              transition={{ duration: 0.55, delay: 0.12 }}
              className="absolute top-0 right-0 text-[9px] font-black text-amber-300 drop-shadow-sm"
            >
              ✦
            </motion.span>
            {/* Bottom-Left Star */}
            <motion.span
              initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
              animate={{ scale: [0, 1.3, 0], x: -6, y: 6, opacity: [0, 1, 0] }}
              transition={{ duration: 0.55, delay: 0.18 }}
              className="absolute bottom-0 left-0 text-[9px] font-black text-emerald-400 drop-shadow-sm"
            >
              ✦
            </motion.span>
            {/* Top-Left Sparkle */}
            <motion.span
              initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
              animate={{ scale: [0, 1.1, 0], x: -4, y: -4, opacity: [0, 1, 0] }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="absolute top-0 left-0 text-[7px] font-bold text-sky-300"
            >
              ★
            </motion.span>
            {/* Bottom-Right Sparkle */}
            <motion.span
              initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
              animate={{ scale: [0, 1.1, 0], x: 4, y: 4, opacity: [0, 1, 0] }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="absolute bottom-0 right-0 text-[7px] font-bold text-amber-200"
            >
              ★
            </motion.span>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. NOSKA INTELLIGENCE 7-DAY INSIGHTS & RECOMMENDATIONS HUB
// ─────────────────────────────────────────────────────────────────────────────
export interface NoskaIntelligenceHubProps {
  cognitiveScore?: number;
  peakWindow?: string;
  adviceList?: string[];
  actionCards?: any[];
  dayVelocity?: { day: string; count: number; date: string }[];
  onApplyCardAction?: (card: any) => void;
  onRefreshIntelligence?: () => void;
  className?: string;
}

export function NoskaIntelligenceHub({
  cognitiveScore = 92,
  peakWindow = "10:00 AM - 12:00 PM",
  adviceList = [],
  actionCards = [],
  dayVelocity = [],
  onApplyCardAction,
  onRefreshIntelligence,
  className
}: NoskaIntelligenceHubProps) {
  return (
    <div className={cn("p-6 sm:p-7 rounded-[32px] bg-[#fdfdfc] dark:bg-[#18181b] border border-[#e8e7e4] dark:border-[#27272a] shadow-[0_12px_36px_rgba(0,0,0,0.04)] space-y-6 select-none", className)}>
      {/* Top Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-3 py-0.5 rounded-full bg-[#f4f3f0] dark:bg-[#27272a] border border-[#e7e5e4] dark:border-[#3f3f46] text-[#57534e] dark:text-[#d6d3d1] text-[10.5px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-2xs">
              <Sparkles size={11} className="text-[#78716c] dark:text-[#a8a29e]" />
              <span>Noska Task Intelligence</span>
            </span>
            <span className="text-[11px] text-[#a8a29e] dark:text-[#71717a] font-semibold">
              7-Day Real Analysis
            </span>
          </div>
          <h3 className="text-xl sm:text-[22px] font-black text-[#1c1917] dark:text-[#f5f5f4] tracking-tight leading-tight">
            Cognitive Rhythm & Proactive Advice
          </h3>
        </div>

        {/* Cognitive Velocity Score Badge */}
        <div className="flex flex-col items-center justify-center size-14 sm:size-15 rounded-2xl bg-[#f5f4f1] dark:bg-[#27272a] border border-[#e5e3de] dark:border-[#3f3f46] shadow-xs shrink-0">
          <span className="text-xl font-black text-[#1c1917] dark:text-[#f5f5f4] leading-none">
            {cognitiveScore}
          </span>
          <span className="text-[8.5px] font-bold text-[#78716c] dark:text-[#a8a29e] uppercase tracking-wider mt-0.5">
            Velocity
          </span>
        </div>
      </div>

      {/* Peak Window Badge */}
      <div className="p-4 rounded-2xl bg-[#f8f7f5] dark:bg-[#212124] border border-[#e6e4df] dark:border-[#2e2e33] shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="size-10 rounded-xl bg-[#e7e5e1] dark:bg-[#2d2d32] text-[#44403c] dark:text-[#e4e4e7] flex items-center justify-center font-bold shadow-2xs">
            <Clock size={17} strokeWidth={2.4} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#78716c] dark:text-[#a8a29e] uppercase tracking-wider block">
              Optimal Deep Work Window
            </span>
            <span className="text-sm sm:text-base font-black text-[#1c1917] dark:text-[#f5f5f4]">
              {peakWindow}
            </span>
          </div>
        </div>

        {onRefreshIntelligence && (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={onRefreshIntelligence}
            className="px-3.5 py-1.5 rounded-xl bg-[#1c1917] hover:bg-[#292524] text-white dark:bg-[#f4f4f5] dark:hover:bg-white dark:text-[#18181b] text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <span>Re-analyze</span>
            <Zap size={11} className="fill-current" />
          </motion.button>
        )}
      </div>

      {/* Proactive Action Cards Grid */}
      {actionCards.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-[#78716c] dark:text-[#a8a29e] uppercase tracking-wider">
              Proactive Recommendations
            </span>
            <span className="text-[11px] font-bold text-[#57534e] dark:text-[#d6d3d1]">
              {actionCards.length} Actions Ready
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {actionCards.slice(0, 2).map((card) => {
              const isRoutine = card.category === "routine";
              const isPriority = card.category === "priority";
              const isWellness = card.category === "wellness";

              const badgeStyle = isPriority
                ? "bg-[#fee2e2] text-[#991b1b] dark:bg-[#7f1d1d]/30 dark:text-[#fca5a5] border-[#fecaca] dark:border-[#991b1b]/40"
                : isRoutine
                ? "bg-[#fef3c7] text-[#92400e] dark:bg-[#78350f]/30 dark:text-[#fde68a] border-[#fde68a] dark:border-[#92400e]/40"
                : isWellness
                ? "bg-[#ecfdf5] text-[#065f46] dark:bg-[#064e3b]/30 dark:text-[#a7f3d0] border-[#a7f3d0] dark:border-[#065f46]/40"
                : "bg-[#f5f5f4] text-[#44403c] dark:bg-[#292524] dark:text-[#d6d3d1] border-[#e7e5e4] dark:border-[#44403c]";

              const iconEmoji = isPriority ? "🔥" : isRoutine ? "⚡" : isWellness ? "🧘" : "🧩";

              return (
                <motion.div
                  key={card.id}
                  whileHover={{ y: -2 }}
                  className="p-4.5 rounded-2xl bg-white dark:bg-[#1f1f23] border border-[#e8e6e1] dark:border-[#2e2e33] flex flex-col justify-between space-y-3 shadow-[0_4px_16px_rgba(0,0,0,0.02)]"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm shrink-0">{iconEmoji}</span>
                        <h4 className="text-xs sm:text-[13px] font-black text-[#1c1917] dark:text-[#f5f5f4] leading-snug">
                          {card.title}
                        </h4>
                      </div>
                      <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shrink-0", badgeStyle)}>
                        {card.category}
                      </span>
                    </div>

                    <p className="text-[11.5px] text-[#57534e] dark:text-[#a1a1aa] leading-relaxed">
                      {card.description}
                    </p>
                  </div>

                  {card.actionLabel && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onApplyCardAction?.(card)}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#18181b] hover:bg-[#27272a] text-white dark:bg-[#f4f4f5] dark:hover:bg-white dark:text-[#18181b] text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>{card.actionLabel}</span>
                      <ArrowRight size={12} strokeWidth={2.4} />
                    </motion.button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7-Day Velocity Rhythm Sparkline Bars */}
      {dayVelocity.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-[#f8f7f5] dark:bg-[#212124] border border-[#e7e5e0] dark:border-[#2d2d32] space-y-2">
          <div className="flex items-center justify-between text-[10.5px] font-bold text-[#78716c] dark:text-[#a8a29e] uppercase tracking-wider">
            <span>7-Day Productivity Velocity</span>
            <span className="text-[#57534e] dark:text-[#d6d3d1] lowercase font-bold">actions / day</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5 items-end h-12 pt-2">
            {dayVelocity.map((d, i) => {
              const maxCount = Math.max(...dayVelocity.map(v => v.count), 1);
              const heightPercent = Math.max(18, Math.min(100, Math.round((d.count / maxCount) * 100)));
              const isToday = i === dayVelocity.length - 1;
              return (
                <div key={d.date} className="flex flex-col items-center gap-1 h-full justify-end" title={`${d.day}: ${d.count} actions`}>
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={cn(
                      "w-full rounded-t-md transition-all",
                      isToday
                        ? "bg-[#18181b] dark:bg-[#f4f4f5] shadow-xs"
                        : "bg-[#d6d3d1] dark:bg-[#3f3f46]"
                    )}
                  />
                  <span className="text-[9px] font-bold text-[#78716c] dark:text-[#a8a29e]">
                    {d.day.split(" ")[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Advice Bullet Points */}
      {adviceList.length > 0 && (
        <div className="space-y-2.5 pt-2 border-t border-[#e8e7e4] dark:border-[#27272a]">
          {adviceList.slice(0, 3).map((advice, i) => (
            <div key={i} className="flex items-start gap-2.5 text-xs text-[#44403c] dark:text-[#d4d4d8]">
              <span className="text-[#78716c] dark:text-[#a8a29e] font-black shrink-0 mt-0.5 text-sm">◇</span>
              <span className="leading-snug">{advice}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

