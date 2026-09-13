/**
 * Gamified Widgets — Noska Dynamic Visuals & Interactive Graphics.
 * - StreakTrackerWidget: Animated 3D flame, ember sparks, particle burst celebration, weekly shield rings
 * - FocusTimerWidget: Liquid dual-gradient progress ring, breathing aura, sprint/deep work modes
 * - ActivityGraphWidget: Glowing 7-day velocity chart with day indicators
 * - ProgressRingsWidget: 3-ring dynamic activity rings with shimmers
 * - VitalityBatteryWidget: Dynamic cognitive stamina battery with smart status moods
 * - HabitMatrixWidget: Daily micro-habit tracker with spring bounce check celebrations
 */
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Zap,
  BatteryCharging,
  Check,
  Shield,
  Coffee,
  Sun,
  Droplets,
  BookOpen,
  Code2,
  BrainCircuit,
  Target
} from "lucide-react";
import type { WidgetProps } from "../types";

const WEEK_DAYS = ["M", "T", "W", "T", "F", "S", "S"];

function readNum(key: string, fallback: number): number {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : Number(v) || fallback;
  } catch {
    return fallback;
  }
}

function writeNum(key: string, value: number): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* private mode */
  }
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode */
  }
}

// ── 1. Streak Tracker (Noska 3D Flame & Confetti) ─────────────────────────────

export function StreakTrackerWidget({ size }: WidgetProps) {
  const [streak, setStreak] = useState(() => readNum("noska_streak_days", 5));
  const [doneToday, setDoneToday] = useState(() => readNum("noska_streak_done_today", 0) === 1);
  const [showBurst, setShowBurst] = useState(false);

  const checkIn = () => {
    if (doneToday) return;
    const next = streak + 1;
    setStreak(next);
    setDoneToday(true);
    writeNum("noska_streak_days", next);
    writeNum("noska_streak_done_today", 1);
    setShowBurst(true);
    setTimeout(() => setShowBurst(false), 2400);
  };

  const dayIndex = (new Date().getDay() + 6) % 7; // Monday-first

  return (
    <div className="relative flex h-full flex-col items-center justify-between p-2 select-none">
      {/* Particle celebration burst */}
      <AnimatePresence>
        {showBurst && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden">
            {[...Array(12)].map((_, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              const x = Math.cos(angle) * (50 + (i % 3) * 20);
              const y = Math.sin(angle) * (50 + (i % 3) * 20);
              const colors = ["#F59E0B", "#EF4444", "#EC4899", "#8B5CF6", "#10B981", "#3B82F6"];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                  animate={{ opacity: 0, scale: [0, 1.4, 0.6], x, y }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="absolute h-2 w-2 rounded-full shadow-xs"
                  style={{ background: colors[i % colors.length] }}
                />
              );
            })}
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 10 }}
              animate={{ scale: [0.8, 1.15, 1], opacity: [0, 1, 0], y: -30 }}
              transition={{ duration: 1.6, ease: "easeOut" }}
              className="absolute -top-1 font-extrabold text-amber-500 text-sm tracking-tight drop-shadow-md flex items-center gap-1"
            >
              <Sparkles size={14} /> +1 Day Streak!
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Flame Hero Graphic */}
      <div className="flex flex-col items-center justify-center pt-1">
        <motion.div
          className="relative flex items-center justify-center cursor-pointer active:scale-95"
          onClick={checkIn}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
        >
          {/* Animated Background Aura */}
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500/30 via-orange-500/25 to-rose-500/20 blur-lg"
            animate={{
              scale: doneToday ? [1, 1.25, 1] : [0.95, 1.1, 0.95],
              opacity: doneToday ? [0.6, 0.9, 0.6] : [0.3, 0.6, 0.3],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* 3D Flame SVG Icon with Gradient */}
          <div className="relative flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-rose-500/10 border border-amber-500/30 shadow-xs">
            <motion.div
              animate={{
                y: [0, -2, 0],
                rotate: [0, -2, 2, 0],
              }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Flame
                className="size-7 text-amber-500 drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)]"
                fill="currentColor"
              />
            </motion.div>
          </div>
        </motion.div>

        {/* Counter & Subtext */}
        <div className="mt-2 text-center leading-none">
          <motion.div
            key={streak}
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 350, damping: 20 }}
            className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white"
          >
            {streak}{" "}
            <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Days</span>
          </motion.div>
          <p className="mt-1 text-[10.5px] font-medium text-neutral-400 dark:text-neutral-500">
            {doneToday ? "Streak protected today 🔥" : "Check in to keep fire burning"}
          </p>
        </div>
      </div>

      {/* Monday-Sunday Weekly Shields */}
      <div className="flex items-center gap-1.5 py-1">
        {WEEK_DAYS.map((d, i) => {
          const isPast = i < dayIndex;
          const isToday = i === dayIndex;
          const isCompleted = isPast || (isToday && doneToday);

          return (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <motion.div
                whileHover={{ scale: 1.15 }}
                className={`grid h-5.5 w-5.5 place-items-center rounded-full text-[9px] font-bold transition-all shadow-2xs ${
                  isCompleted
                    ? "bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-[0_2px_6px_rgba(245,158,11,0.35)]"
                    : isToday
                    ? "border-2 border-dashed border-amber-400 text-amber-500 bg-amber-500/10 animate-pulse"
                    : "bg-black/[0.04] dark:bg-white/[0.06] text-neutral-400 dark:text-neutral-500"
                }`}
              >
                {isCompleted ? <Check size={10} strokeWidth={3} /> : d}
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* Action Button */}
      {size !== "small" && (
        <button
          type="button"
          onClick={checkIn}
          disabled={doneToday}
          className={`w-full rounded-xl py-2 px-3 text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer ${
            doneToday
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 cursor-default"
              : "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/25 hover:shadow-md"
          }`}
        >
          {doneToday ? (
            <>
              <Shield size={13} className="text-emerald-500" />
              <span>Checked in today</span>
            </>
          ) : (
            <>
              <Flame size={13} />
              <span>Check in (+1 Day)</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ── 2. Liquid Focus Orb Timer ────────────────────────────────────────────────

export function FocusTimerWidget({ size }: WidgetProps) {
  const [durationMode, setDurationMode] = useState<15 | 25 | 50>(25);
  const totalSeconds = durationMode * 60;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [running, setRunning] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    setSecondsLeft(durationMode * 60);
    setRunning(false);
  }, [durationMode]);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          setCelebrate(true);
          setTimeout(() => setCelebrate(false), 3000);
          return durationMode * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [running, durationMode]);

  const progress = 1 - secondsLeft / totalSeconds;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const diameter = size === "small" ? 88 : 100;
  const strokeWidth = 6.5;
  const radius = diameter / 2 - strokeWidth;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex h-full flex-col items-center justify-between p-2 select-none">
      {/* Mode pills */}
      <div className="flex items-center gap-1 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] p-0.5 border border-black/[0.04] dark:border-white/[0.06]">
        {([15, 25, 50] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setDurationMode(m)}
            className={`rounded-lg px-2 py-0.5 text-[10px] font-bold transition-all cursor-pointer ${
              durationMode === m
                ? "bg-white dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                : "text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}
          >
            {m}m
          </button>
        ))}
      </div>

      {/* Glowing Liquid Orb Progress Ring */}
      <div className="relative flex items-center justify-center my-auto" style={{ width: diameter, height: diameter }}>
        {/* Breathing aura when running */}
        <motion.div
          className="absolute inset-2 rounded-full bg-gradient-to-tr from-indigo-500/20 via-purple-500/15 to-cyan-500/20 blur-md"
          animate={{
            scale: running ? [0.95, 1.1, 0.95] : 1,
            opacity: running ? [0.4, 0.8, 0.4] : 0.2,
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />

        <svg width={diameter} height={diameter} className="-rotate-90">
          <circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-black/[0.06] dark:text-white/[0.08]"
          />
          <motion.circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={radius}
            fill="none"
            stroke="url(#focusLiquidGrad)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset: circumference * (1 - progress) }}
            transition={{ type: "spring", stiffness: 45, damping: 18 }}
          />
          <defs>
            <linearGradient id="focusLiquidGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="50%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center Countdown & Icons */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            key={secondsLeft}
            initial={{ scale: running ? 1.05 : 1 }}
            animate={{ scale: 1 }}
            className="font-mono text-xl font-bold tracking-tight tabular-nums text-neutral-900 dark:text-white"
          >
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </motion.span>
          <span className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            {running ? "Flowing" : "Paused"}
          </span>
        </div>
      </div>

      {/* Control Actions */}
      <div className="flex items-center gap-2 w-full justify-center">
        <button
          type="button"
          onClick={() => setRunning(!running)}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-bold transition-all active:scale-95 shadow-xs cursor-pointer ${
            running
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25"
              : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20"
          }`}
        >
          {running ? <Pause size={13} /> : <Play size={13} />}
          <span>{running ? "Pause" : secondsLeft < totalSeconds ? "Resume" : "Start"}</span>
        </button>

        {(!running || secondsLeft < totalSeconds) && (
          <button
            type="button"
            onClick={() => {
              setRunning(false);
              setSecondsLeft(totalSeconds);
            }}
            title="Reset timer"
            className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
          >
            <RotateCcw size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── 3. Vitality / Cognitive Energy Battery ───────────────────────────────────

export function VitalityBatteryWidget({ size }: WidgetProps) {
  const [vitality, setVitality] = useState(() => readNum("noska_vitality_score", 88));

  // Determine mood status based on vitality level
  const statusInfo = useMemo(() => {
    if (vitality >= 80) return { label: "Supercharged", icon: Zap, color: "text-amber-500", bg: "bg-amber-500", grad: "from-amber-500 to-yellow-400" };
    if (vitality >= 50) return { label: "In the Zone", icon: Target, color: "text-emerald-500", bg: "bg-emerald-500", grad: "from-emerald-500 to-teal-400" };
    return { label: "Recharge Needed", icon: Coffee, color: "text-rose-500", bg: "bg-rose-500", grad: "from-rose-500 to-amber-500" };
  }, [vitality]);

  const StatusIcon = statusInfo.icon;

  const boostEnergy = () => {
    const next = Math.min(100, vitality + 10);
    setVitality(next);
    writeNum("noska_vitality_score", next);
  };

  return (
    <div className="flex h-full flex-col justify-between p-2 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <StatusIcon size={14} className={statusInfo.color} />
          <span className="text-xs font-bold text-neutral-900 dark:text-white">{statusInfo.label}</span>
        </div>
        <span className="text-xs font-mono font-bold text-neutral-500 dark:text-neutral-400">{vitality}%</span>
      </div>

      {/* Battery Graphic Bar */}
      <div className="my-auto py-2">
        <div className="relative h-6 w-full overflow-hidden rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.04] p-0.5">
          <motion.div
            className={`h-full rounded-lg bg-gradient-to-r ${statusInfo.grad} shadow-xs relative overflow-hidden`}
            initial={{ width: 0 }}
            animate={{ width: `${vitality}%` }}
            transition={{ type: "spring", stiffness: 60, damping: 16 }}
          >
            {/* Shimmer light animation */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
        </div>
        <p className="mt-1.5 text-[10.5px] text-neutral-400 dark:text-neutral-500 leading-tight">
          Paced by focus sprints, page edits & break rhythms.
        </p>
      </div>

      {size !== "small" && (
        <button
          type="button"
          onClick={boostEnergy}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.08] py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200 transition-all active:scale-95 cursor-pointer"
        >
          <Coffee size={12} className="text-amber-500" />
          <span>Take a Quick 5m Micro-Break</span>
        </button>
      )}
    </div>
  );
}

// ── 4. Daily Habit Matrix Widget ─────────────────────────────────────────────

interface HabitItem {
  id: string;
  name: string;
  iconName: string;
  done: boolean;
}

const DEFAULT_HABITS: HabitItem[] = [
  { id: "h1", name: "Deep Focus 25m", iconName: "brain", done: true },
  { id: "h2", name: "Write Daily Journal", iconName: "book", done: true },
  { id: "h3", name: "Hydrate & Move", iconName: "water", done: false },
  { id: "h4", name: "Review Architecture", iconName: "code", done: false },
];

export function HabitMatrixWidget({ size }: WidgetProps) {
  const [habits, setHabits] = useState<HabitItem[]>(() => readJson("noska_habit_matrix", DEFAULT_HABITS));

  const toggleHabit = (id: string) => {
    const updated = habits.map((h) => (h.id === id ? { ...h, done: !h.done } : h));
    setHabits(updated);
    writeJson("noska_habit_matrix", updated);
  };

  const completedCount = habits.filter((h) => h.done).length;

  return (
    <div className="flex h-full flex-col justify-between p-2 select-none">
      <div className="flex items-center justify-between pb-1">
        <span className="text-xs font-bold text-neutral-900 dark:text-white">Daily Habits</span>
        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-md border border-indigo-500/20">
          {completedCount}/{habits.length} Done
        </span>
      </div>

      {/* Habit items list */}
      <div className="space-y-1.5 my-auto">
        {habits.slice(0, size === "small" ? 2 : 4).map((h) => (
          <motion.div
            key={h.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => toggleHabit(h.id)}
            className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
              h.done
                ? "bg-emerald-500/[0.08] dark:bg-emerald-400/[0.08] border-emerald-500/30 text-neutral-900 dark:text-neutral-100"
                : "bg-black/[0.02] dark:bg-white/[0.03] border-black/[0.05] dark:border-white/[0.06] text-neutral-600 dark:text-neutral-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-xs ${h.done ? "text-emerald-500" : "text-neutral-400"}`}>
                {h.iconName === "brain" && <BrainCircuit size={13} />}
                {h.iconName === "book" && <BookOpen size={13} />}
                {h.iconName === "water" && <Droplets size={13} />}
                {h.iconName === "code" && <Code2 size={13} />}
              </span>
              <span className={`text-[11.5px] font-semibold truncate ${h.done ? "line-through opacity-75" : ""}`}>
                {h.name}
              </span>
            </div>

            <div
              className={`h-4.5 w-4.5 rounded-md flex items-center justify-center border transition-all ${
                h.done
                  ? "bg-emerald-500 border-emerald-500 text-white shadow-2xs"
                  : "border-black/20 dark:border-white/20 bg-transparent"
              }`}
            >
              {h.done && <Check size={11} strokeWidth={3} />}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── 5. Activity Graph Widget (7-Day Bar Charts) ──────────────────────────────

export function ActivityGraphWidget({ size }: WidgetProps) {
  const bars = useMemo(() => {
    const dayIndex = (new Date().getDay() + 6) % 7;
    return WEEK_DAYS.map((d, i) => {
      const seed = Number(new Date().toDateString().slice(8, 10)) * 7 + i;
      const base = 25 + ((seed * 37) % 60);
      return { d, value: i <= dayIndex ? base : 0, future: i > dayIndex };
    });
  }, []);
  const max = Math.max(...bars.map((b) => b.value), 40);

  return (
    <div className="flex h-full flex-col justify-between p-2 select-none">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-neutral-900 dark:text-white">7-Day Activity</span>
        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
      </div>

      <div className="flex flex-1 items-end justify-between gap-1.5 pt-3 pb-1">
        {bars.map((b, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${Math.max((b.value / max) * 100, b.future ? 4 : 10)}%` }}
              transition={{ type: "spring", stiffness: 140, damping: 18, delay: i * 0.05 }}
              className={`w-full max-w-[20px] rounded-t-lg transition-all ${
                b.future
                  ? "bg-black/[0.04] dark:bg-white/[0.06]"
                  : "bg-gradient-to-t from-indigo-500 via-purple-500 to-cyan-400 shadow-2xs"
              }`}
              style={{ minHeight: 4 }}
            />
            <span className={`text-[9.5px] font-bold ${b.future ? "text-neutral-300 dark:text-neutral-600" : "text-neutral-500 dark:text-neutral-400"}`}>
              {b.d}
            </span>
          </div>
        ))}
      </div>

      {size !== "small" && (
        <p className="text-[10px] text-neutral-400 dark:text-neutral-500 text-center">
          Touchpoints across documents, canvas & tasks
        </p>
      )}
    </div>
  );
}

// ── 6. Progress Rings Widget (Noska Activity Rings) ─────────────────────────

export function ProgressRingsWidget({ size }: WidgetProps) {
  const goals = [
    { label: "Pages", value: 0.85, color: "#8B5CF6" },
    { label: "Tasks", value: 0.65, color: "#10B981" },
    { label: "Focus", value: 0.45, color: "#F59E0B" },
  ];
  const box = size === "small" ? 96 : 108;
  const stroke = 8.5;
  const r = box / 2 - stroke;

  return (
    <div className="flex h-full flex-col items-center justify-between p-2 select-none">
      <div className="relative flex items-center justify-center my-auto" style={{ width: box, height: box }}>
        {goals.map((g, i) => {
          const rr = r - i * (stroke + 2.5);
          const c = 2 * Math.PI * rr;
          return (
            <svg key={g.label} width={box} height={box} className="absolute inset-0 -rotate-90">
              <circle
                cx={box / 2}
                cy={box / 2}
                r={rr}
                fill="none"
                stroke={g.color}
                strokeWidth={stroke}
                opacity={0.18}
              />
              <motion.circle
                cx={box / 2}
                cy={box / 2}
                r={rr}
                fill="none"
                stroke={g.color}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={c}
                initial={{ strokeDashoffset: c }}
                animate={{ strokeDashoffset: c * (1 - g.value) }}
                transition={{ type: "spring", stiffness: 45, damping: 18, delay: i * 0.15 }}
              />
            </svg>
          );
        })}
        <div className="absolute inset-0 grid place-items-center">
          <Sparkles className="h-4 w-4 text-amber-500" />
        </div>
      </div>

      {/* Legend */}
      <div className="flex w-full flex-wrap justify-center gap-x-2.5 gap-y-0.5 pt-1">
        {goals.map((g) => (
          <span key={g.label} className="flex items-center gap-1 text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: g.color }} />
            {g.label} {Math.round(g.value * 100)}%
          </span>
        ))}
      </div>
    </div>
  );
}
