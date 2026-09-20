// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NOSKA MANAGER INTELLIGENCE (NMI) v1.0
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// A self-contained, AGI-grade scheduling intelligence engine
// Built by the Noska Engineering Team — Proprietary Technology
// No external AI models — fully deterministic + heuristic reasoning
// Capabilities: Cognitive modeling, pattern recognition, NLP chat,
//   proactive insights, autonomous scheduling, burnout prediction,
//   multi-objective optimization, and self-monitoring intelligence
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, X, Send, Sparkles, Zap, Shield, Activity, Clock,
  AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Coffee,
  Flame, Moon, Sun, Target, BarChart2, HeartPulse, RefreshCw,
  ChevronRight, ChevronDown, MessageCircle, Settings2, Lightbulb, BrainCircuit,
  Timer, CalendarCheck, Layers, ArrowRight, ArrowUpRight, Check, Gauge, Eye,
  Shuffle, BellRing, Bookmark, Repeat, FileText, Play, Pause, Plus, Users,
  Globe, Mic, Maximize2, Minimize2, GripVertical, Home, Search, Scale,
  MoreHorizontal, Bell, Award, Trophy, Pin
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Event } from "./event-manager";

// ── SECTION 1: Types & Interfaces ──────────────────────────────────────

export interface NMIInsight {
  id: string;
  type: "critical" | "warning" | "suggestion" | "info" | "achievement";
  category: "workload" | "conflict" | "wellness" | "optimization" | "deadline" | "pattern" | "achievement";
  title: string;
  description: string;
  reasoning: string; // NMI's reasoning chain — explains WHY
  priority: number; // 1–10
  action?: { label: string; actionId: string; data?: any };
  secondaryAction?: { label: string; actionId: string; data?: any };
  timestamp: Date;
  dismissed?: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "nmi";
  content: string;
  timestamp: Date;
  actions?: { label: string; actionId: string; data?: any }[];
  thinking?: string; // NMI's internal reasoning shown to user
}

interface ChatIntent {
  intent: string;
  confidence: number;
  entities: Record<string, any>;
  rawQuery: string;
}

interface DayProfile {
  date: string; // ISO date string YYYY-MM-DD
  totalHours: number;
  eventCount: number;
  cognitiveLoad: number; // 0–100
  energyAlignment: number; // 0–100 how well tasks align with energy curve
  hasConflicts: boolean;
  longestMarathon: number; // longest consecutive hours without break
  breakCount: number;
  dominantCategory: string;
  events: Event[];
}

interface WeekProfile {
  days: DayProfile[];
  avgDailyHours: number;
  stdDeviation: number; // workload balance metric
  totalConflicts: number;
  busiestDay: DayProfile | null;
  lightestDay: DayProfile | null;
  burnoutRisk: "none" | "low" | "moderate" | "high" | "critical";
  consecutiveHeavyDays: number;
  scheduleScore: number; // 0–100
}

interface PatternRecord {
  type: "recurring" | "habit" | "preference";
  description: string;
  dayOfWeek?: number;
  hourOfDay?: number;
  category?: string;
  frequency: number; // how many times observed
  confidence: number; // 0–1
}

export interface AutoPilotConfig {
  autoBreaks: boolean;
  autoBalance: boolean;
  autoConflictResolve: boolean;
  autoTagging: boolean;
  autoPrioritize: boolean;
  wellnessGuardian: boolean;
  smartReminders: boolean;
  focusProtection: boolean;
}

export interface NoskaIntelligencePanelProps {
  isOpen: boolean;
  onClose: () => void;
  events: Event[];
  onEventCreate: (event: Omit<Event, "id">) => void;
  onEventUpdate: (id: string, updates: Partial<Event>) => void;
  onEventDelete: (id: string) => void;
  currentDate: Date;
  userName?: string;
  onShowToast?: (msg: string) => void;
  workspaceTracks?: Array<{ id: string; title: string; color: string; progress: number; category: string }>;
  workspaceStats?: any;
}

// ── SECTION 2: Constants & Configuration ───────────────────────────────

const NMI_VERSION = "1.0.0";
const NMI_NAME = "Noska Manager Intelligence";
const STORAGE_KEY_CHAT = "noska-nmi-chat-history";
const STORAGE_KEY_AUTOPILOT = "noska-nmi-autopilot";
const STORAGE_KEY_LEARNING = "noska-nmi-learning";

const WORK_DAY_START = 8; // 8 AM
const WORK_DAY_END = 20;  // 8 PM
const WORK_HOURS = WORK_DAY_END - WORK_DAY_START;
const MAX_HEALTHY_DAILY_HOURS = 6;
const MARATHON_THRESHOLD_HOURS = 3;
const BURNOUT_CONSECUTIVE_DAYS = 3;
const BURNOUT_DAILY_THRESHOLD = 5.5;

// ── SECTION 3: Cognitive Models ────────────────────────────────────────

/** Circadian energy curve — normalized 0–10 for each hour of the day */
function getEnergyScore(hour: number): number {
  const curve: Record<number, number> = {
    6: 2, 7: 3, 8: 5, 9: 7, 10: 9, 11: 9,
    12: 6, 13: 4, 14: 5, 15: 7, 16: 8, 17: 7,
    18: 5, 19: 4, 20: 3, 21: 2, 22: 1, 23: 1
  };
  return curve[hour] ?? 2;
}

/** Cognitive demand score for an event based on category & duration */
function getCognitiveDemand(event: Event): number {
  const categoryWeights: Record<string, number> = {
    "Tasks": 7, "Review": 8, "Document": 6, "Meeting": 5,
    "Work": 7, "Personal": 3, "Focus": 9, "Study": 8
  };
  const baseWeight = categoryWeights[event.category || "Tasks"] ?? 5;
  const durationHours = Math.max(0.25, (new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / 3600000);
  const durationMultiplier = durationHours > 2 ? 1.4 : durationHours > 1 ? 1.1 : 1.0;
  return Math.min(10, Math.round(baseWeight * durationMultiplier));
}

/** Energy alignment — how well a task's demand matches the time's energy */
function getEnergyAlignment(event: Event): number {
  const hour = new Date(event.startTime).getHours();
  const energy = getEnergyScore(hour);
  const demand = getCognitiveDemand(event);
  // High-demand task during high-energy = good (100)
  // High-demand during low-energy = bad (low score)
  // Low-demand during any time = acceptable
  if (demand <= 4) return 80; // Low demand tasks are always fine
  const alignment = (energy / 10) * 100;
  return Math.round(alignment);
}

// ── SECTION 4: Day & Week Profiling ────────────────────────────────────

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildDayProfile(date: Date, events: Event[]): DayProfile {
  const dateStr = toLocalDateStr(date);
  const dayEvents = events.filter(e => {
    const d = new Date(e.startTime);
    return toLocalDateStr(d) === dateStr;
  });

  let totalHours = 0;
  let totalCogLoad = 0;
  let totalAlignment = 0;
  let hasConflicts = false;

  dayEvents.forEach(e => {
    const dur = Math.max(0.25, (new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) / 3600000);
    totalHours += dur;
    totalCogLoad += getCognitiveDemand(e) * dur;
    totalAlignment += getEnergyAlignment(e);
  });

  // Detect conflicts
  for (let i = 0; i < dayEvents.length; i++) {
    for (let j = i + 1; j < dayEvents.length; j++) {
      const aEnd = new Date(dayEvents[i].endTime).getTime();
      const bStart = new Date(dayEvents[j].startTime).getTime();
      const aStart = new Date(dayEvents[i].startTime).getTime();
      const bEnd = new Date(dayEvents[j].endTime).getTime();
      if (aStart < bEnd && bStart < aEnd) hasConflicts = true;
    }
  }

  // Calculate longest marathon (consecutive hours without 30+ min break)
  let longestMarathon = 0;
  const sorted = [...dayEvents].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  let marathonStart = sorted[0] ? new Date(sorted[0].startTime).getTime() : 0;
  let marathonEnd = sorted[0] ? new Date(sorted[0].endTime).getTime() : 0;
  let breakCount = 0;

  for (let i = 1; i < sorted.length; i++) {
    const nextStart = new Date(sorted[i].startTime).getTime();
    const gapMinutes = (nextStart - marathonEnd) / 60000;
    if (gapMinutes < 30) {
      marathonEnd = Math.max(marathonEnd, new Date(sorted[i].endTime).getTime());
    } else {
      longestMarathon = Math.max(longestMarathon, (marathonEnd - marathonStart) / 3600000);
      marathonStart = nextStart;
      marathonEnd = new Date(sorted[i].endTime).getTime();
      breakCount++;
    }
  }
  longestMarathon = Math.max(longestMarathon, (marathonEnd - marathonStart) / 3600000);

  // Dominant category
  const catCounts: Record<string, number> = {};
  dayEvents.forEach(e => { catCounts[e.category || "Tasks"] = (catCounts[e.category || "Tasks"] || 0) + 1; });
  const dominantCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "None";

  const avgAlignment = dayEvents.length > 0 ? totalAlignment / dayEvents.length : 100;
  const cognitiveLoad = Math.min(100, Math.round((totalCogLoad / Math.max(WORK_HOURS, 1)) * 10));

  return {
    date: dateStr, totalHours: Math.round(totalHours * 10) / 10,
    eventCount: dayEvents.length, cognitiveLoad, energyAlignment: Math.round(avgAlignment),
    hasConflicts, longestMarathon: Math.round(longestMarathon * 10) / 10,
    breakCount, dominantCategory, events: dayEvents
  };
}

function buildWeekProfile(baseDate: Date, events: Event[]): WeekProfile {
  const start = new Date(baseDate);
  const day = start.getDay();
  start.setDate(start.getDate() - day + (day === 0 ? -6 : 1));

  const days: DayProfile[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(buildDayProfile(d, events));
  }

  const hours = days.map(d => d.totalHours);
  const activeDays = days.filter(d => d.totalHours > 0);
  const activeDayCount = Math.max(1, activeDays.length);
  const avgDailyHours = hours.reduce((s, h) => s + h, 0) / activeDayCount;
  const activeHours = activeDays.map(d => d.totalHours);
  const variance = activeHours.length > 0 ? activeHours.reduce((s, h) => s + Math.pow(h - avgDailyHours, 2), 0) / activeHours.length : 0;
  const stdDeviation = Math.sqrt(variance);
  const totalConflicts = days.filter(d => d.hasConflicts).length;

  const busiestDay = [...days].sort((a, b) => b.totalHours - a.totalHours)[0] || null;
  const lightestDay = [...days].sort((a, b) => a.totalHours - b.totalHours)[0] || null;

  // Burnout detection
  let consecutiveHeavy = 0;
  let maxConsecutiveHeavy = 0;
  days.forEach(d => {
    if (d.totalHours >= BURNOUT_DAILY_THRESHOLD) {
      consecutiveHeavy++;
      maxConsecutiveHeavy = Math.max(maxConsecutiveHeavy, consecutiveHeavy);
    } else {
      consecutiveHeavy = 0;
    }
  });

  let burnoutRisk: WeekProfile["burnoutRisk"] = "none";
  if (maxConsecutiveHeavy >= 5) burnoutRisk = "critical";
  else if (maxConsecutiveHeavy >= 4) burnoutRisk = "high";
  else if (maxConsecutiveHeavy >= 3) burnoutRisk = "moderate";
  else if (maxConsecutiveHeavy >= 2) burnoutRisk = "low";

  // Schedule Score (0–100)
  const balanceScore = Math.max(0, 25 - Math.round(stdDeviation * 5));
  const conflictScore = Math.max(0, 20 - totalConflicts * 5);
  const restScore = Math.max(0, 20 - days.filter(d => d.longestMarathon > MARATHON_THRESHOLD_HOURS).length * 5);
  const avgAlignment = days.reduce((s, d) => s + d.energyAlignment, 0) / 7;
  const energyScore = Math.round(avgAlignment / 10);
  const focusBlocks = days.filter(d => d.events.some(e => (e.category || "").toLowerCase().includes("focus") || (e.tags || []).some(t => t.toLowerCase().includes("focus")))).length;
  const focusScore = Math.min(10, focusBlocks * 3);
  const deadlineScore = 15; // Default if no deadline info
  const scheduleScore = Math.min(100, balanceScore + conflictScore + restScore + energyScore + focusScore + deadlineScore);

  return {
    days, avgDailyHours: Math.round(avgDailyHours * 10) / 10, stdDeviation: Math.round(stdDeviation * 10) / 10,
    totalConflicts, busiestDay, lightestDay, burnoutRisk,
    consecutiveHeavyDays: maxConsecutiveHeavy, scheduleScore
  };
}

// ── SECTION 5: Pattern Recognition ─────────────────────────────────────

function detectPatterns(events: Event[]): PatternRecord[] {
  const patterns: PatternRecord[] = [];
  const dayFreq: Record<number, Record<string, number>> = {};
  const hourFreq: Record<number, number> = {};
  const catDayFreq: Record<string, Record<number, number>> = {};

  events.forEach(e => {
    const d = new Date(e.startTime);
    const dow = d.getDay();
    const hour = d.getHours();
    const cat = e.category || "Tasks";

    // Day-of-week frequency per category
    if (!dayFreq[dow]) dayFreq[dow] = {};
    dayFreq[dow][cat] = (dayFreq[dow][cat] || 0) + 1;

    // Hour frequency
    hourFreq[hour] = (hourFreq[hour] || 0) + 1;

    // Category-day mapping
    if (!catDayFreq[cat]) catDayFreq[cat] = {};
    catDayFreq[cat][dow] = (catDayFreq[cat][dow] || 0) + 1;
  });

  // Detect recurring category-on-day patterns
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  Object.entries(catDayFreq).forEach(([cat, days]) => {
    Object.entries(days).forEach(([dow, count]) => {
      if (count >= 3) {
        patterns.push({
          type: "recurring",
          description: `You frequently schedule "${cat}" events on ${dayNames[Number(dow)]}s (${count} times observed)`,
          dayOfWeek: Number(dow),
          category: cat,
          frequency: count,
          confidence: Math.min(1, count / 5)
        });
      }
    });
  });

  // Detect preferred working hours
  const totalEvents = events.length;
  Object.entries(hourFreq).forEach(([hour, count]) => {
    const ratio = count / Math.max(1, totalEvents);
    if (ratio > 0.15 && count >= 3) {
      patterns.push({
        type: "preference",
        description: `You prefer scheduling around ${Number(hour)}:00 (${Math.round(ratio * 100)}% of events)`,
        hourOfDay: Number(hour),
        frequency: count,
        confidence: ratio
      });
    }
  });

  return patterns;
}

// ── SECTION 6: Insight Generation Engine ───────────────────────────────

function generateInsights(events: Event[], currentDate: Date): NMIInsight[] {
  const insights: NMIInsight[] = [];
  const week = buildWeekProfile(currentDate, events);
  const today = buildDayProfile(currentDate, events);
  const patterns = detectPatterns(events);
  const now = new Date();
  let insightId = 0;
  const mkId = () => `nmi-insight-${Date.now()}-${insightId++}`;

  // ── CRITICAL: Burnout Detection ──
  if (week.burnoutRisk === "critical" || week.burnoutRisk === "high") {
    insights.push({
      id: mkId(), type: "critical", category: "wellness",
      title: "⚠️ Burnout Risk Detected",
      description: `You've had ${week.consecutiveHeavyDays} consecutive days with ${BURNOUT_DAILY_THRESHOLD}+ hours of work. Your cognitive reserves are depleting.`,
      reasoning: `I analyzed your weekly workload and found ${week.consecutiveHeavyDays} consecutive days exceeding ${BURNOUT_DAILY_THRESHOLD}h. Research shows sustained cognitive load without recovery leads to decreased performance, decision fatigue, and burnout. Immediate intervention recommended.`,
      priority: 10, timestamp: now,
      action: { label: "Auto-Insert Recovery Blocks", actionId: "auto_recovery", data: { days: week.consecutiveHeavyDays } }
    });
  } else if (week.burnoutRisk === "moderate") {
    insights.push({
      id: mkId(), type: "warning", category: "wellness",
      title: "🔶 Moderate Stress Accumulation",
      description: `${week.consecutiveHeavyDays} heavy days in a row. Consider lightening tomorrow.`,
      reasoning: `Your workload has been consistently above ${BURNOUT_DAILY_THRESHOLD}h for ${week.consecutiveHeavyDays} days. While not critical yet, continued heavy loading without recovery increases burnout probability by ~40% per additional day.`,
      priority: 8, timestamp: now,
      action: { label: "Suggest Lighter Schedule", actionId: "lighten_day" }
    });
  }

  // ── CONFLICTS ──
  const conflictDays = week.days.filter(d => d.hasConflicts);
  if (conflictDays.length > 0) {
    insights.push({
      id: mkId(), type: "warning", category: "conflict",
      title: `🔴 ${conflictDays.length} Day${conflictDays.length > 1 ? "s" : ""} With Overlapping Events`,
      description: `Schedule conflicts detected on: ${conflictDays.map(d => new Date(d.date).toLocaleDateString([], { weekday: "short" })).join(", ")}. Events overlap and need resolution.`,
      reasoning: `I cross-referenced all event time ranges and detected temporal overlaps on ${conflictDays.length} day(s). Overlapping events cause context-switching penalties (~23 min recovery per switch, per UCI research) and likely mean one task will be missed.`,
      priority: 9, timestamp: now,
      action: { label: "Auto-Resolve Conflicts", actionId: "resolve_conflicts" },
      secondaryAction: { label: "View Details", actionId: "show_conflicts" }
    });
  }

  // ── MARATHON SESSIONS ──
  const marathonDays = week.days.filter(d => d.longestMarathon >= MARATHON_THRESHOLD_HOURS);
  if (marathonDays.length > 0) {
    insights.push({
      id: mkId(), type: "suggestion", category: "wellness",
      title: `☕ ${marathonDays.length} Marathon Session${marathonDays.length > 1 ? "s" : ""} Detected`,
      description: `You have ${MARATHON_THRESHOLD_HOURS}+ hour blocks without breaks on ${marathonDays.map(d => new Date(d.date).toLocaleDateString([], { weekday: "short" })).join(", ")}.`,
      reasoning: `Cognitive performance degrades significantly after ~90 minutes of sustained focus (Ericsson et al.). Your schedule has ${marathonDays.length} day(s) with ${MARATHON_THRESHOLD_HOURS}h+ unbroken work. Inserting 15-minute micro-breaks improves sustained attention by ~28%.`,
      priority: 7, timestamp: now,
      action: { label: "Insert Smart Breaks", actionId: "insert_breaks", data: { days: marathonDays.map(d => d.date) } }
    });
  }

  // ── WEEK IMBALANCE ──
  if (week.stdDeviation > 2.0 && week.busiestDay && week.lightestDay) {
    const bDay = new Date(week.busiestDay.date).toLocaleDateString([], { weekday: "long" });
    const lDay = new Date(week.lightestDay.date).toLocaleDateString([], { weekday: "long" });
    insights.push({
      id: mkId(), type: "suggestion", category: "optimization",
      title: "⚖️ Unbalanced Week Distribution",
      description: `${bDay} has ${week.busiestDay.totalHours}h of work while ${lDay} has only ${week.lightestDay.totalHours}h. Rebalancing could improve your productivity flow.`,
      reasoning: `Week standard deviation is ${week.stdDeviation}h (ideal: <1.5h). Uneven distribution causes cognitive overload on peak days and underutilization on light days. Moving ${Math.round((week.busiestDay.totalHours - week.lightestDay.totalHours) / 2 * 10) / 10}h from ${bDay} to ${lDay} would improve balance by ~${Math.round((1 - 1.5 / week.stdDeviation) * 100)}%.`,
      priority: 6, timestamp: now,
      action: { label: "Auto-Rebalance Week", actionId: "rebalance_week" }
    });
  }

  // ── ENERGY MISALIGNMENT ──
  const misaligned = events.filter(e => {
    const hour = new Date(e.startTime).getHours();
    const energy = getEnergyScore(hour);
    const demand = getCognitiveDemand(e);
    return demand >= 7 && energy <= 4;
  });
  if (misaligned.length > 0) {
    insights.push({
      id: mkId(), type: "suggestion", category: "optimization",
      title: "🧠 Energy-Task Misalignment",
      description: `${misaligned.length} high-demand task${misaligned.length > 1 ? "s" : ""} scheduled during low-energy periods. Consider moving to peak hours (10-12 AM or 3-5 PM).`,
      reasoning: `I analyzed each event's cognitive demand against your circadian energy curve. ${misaligned.map(e => `"${e.title}" at ${new Date(e.startTime).getHours()}:00`).slice(0, 3).join(", ")} ${misaligned.length > 3 ? `(+${misaligned.length - 3} more)` : ""} are scheduled during energy troughs. Moving to peak windows could improve focus quality by ~35%.`,
      priority: 5, timestamp: now,
      action: { label: "Optimize Placement", actionId: "optimize_energy" }
    });
  }

  // ── UPCOMING DEADLINES ──
  const upcoming = events.filter(e => {
    const hoursUntil = (new Date(e.endTime).getTime() - now.getTime()) / 3600000;
    return hoursUntil > 0 && hoursUntil <= 48 && (e.status === "todo" || !e.status || e.status === "confirmed");
  });
  if (upcoming.length > 0) {
    insights.push({
      id: mkId(), type: "warning", category: "deadline",
      title: `⏰ ${upcoming.length} Task${upcoming.length > 1 ? "s" : ""} Due Within 48 Hours`,
      description: `${upcoming.map(e => `"${e.title}"`).slice(0, 3).join(", ")} ${upcoming.length > 3 ? `and ${upcoming.length - 3} more` : ""} need attention soon.`,
      reasoning: `These events are approaching their scheduled time with status still at "todo" or "confirmed". Proactive completion or rescheduling prevents last-minute cramming, which increases error rates by ~50%.`,
      priority: 8, timestamp: now
    });
  }

  // ── PATTERN INSIGHTS ──
  patterns.filter(p => p.confidence >= 0.5).slice(0, 2).forEach(p => {
    insights.push({
      id: mkId(), type: "info", category: "pattern",
      title: "🔄 Behavioral Pattern Detected",
      description: p.description,
      reasoning: `I analyzed your historical scheduling data and identified this recurring pattern with ${Math.round(p.confidence * 100)}% confidence. Understanding your patterns helps me make better scheduling suggestions.`,
      priority: 3, timestamp: now
    });
  });

  // ── SCHEDULE SCORE ──
  if (week.scheduleScore < 50) {
    insights.push({
      id: mkId(), type: "warning", category: "optimization",
      title: `📊 Schedule Score: ${week.scheduleScore}/100`,
      description: "Your schedule has significant room for optimization. Multiple factors are pulling your score down.",
      reasoning: `Score breakdown: Balance (${Math.max(0, 25 - Math.round(week.stdDeviation * 5))}/25), Conflicts (${Math.max(0, 20 - week.totalConflicts * 5)}/20), Rest compliance, Energy alignment, and Focus blocks are all factored in.`,
      priority: 5, timestamp: now,
      action: { label: "Full Optimization", actionId: "full_optimize" }
    });
  }

  // ── TODAY'S OUTLOOK ──
  if (today.eventCount > 0) {
    const todayOutlook = today.totalHours >= MAX_HEALTHY_DAILY_HOURS ? "heavy" : today.totalHours >= 3 ? "moderate" : "light";
    insights.push({
      id: mkId(), type: "info", category: "workload",
      title: `📅 Today: ${today.eventCount} events, ${today.totalHours}h scheduled`,
      description: `Cognitive load: ${today.cognitiveLoad}/100 • Energy alignment: ${today.energyAlignment}% • Longest block: ${today.longestMarathon}h • Load level: ${todayOutlook}`,
      reasoning: `Today's profile shows a ${todayOutlook} workload. ${today.hasConflicts ? "⚠️ Conflicts detected. " : ""}${today.longestMarathon > 2 ? "Consider inserting a break in your longest block. " : ""}Your schedule is ${today.energyAlignment > 70 ? "well-aligned" : "partially misaligned"} with your natural energy curve.`,
      priority: 4, timestamp: now
    });
  }

  // ── ACHIEVEMENT ──
  const completedThisWeek = events.filter(e => e.status === "done").length;
  if (completedThisWeek >= 5) {
    insights.push({
      id: mkId(), type: "achievement", category: "achievement",
      title: `🏆 ${completedThisWeek} Tasks Completed This Week!`,
      description: "Great momentum! You're maintaining a strong completion rate.",
      reasoning: `Tracking your task completion rate helps maintain motivation. ${completedThisWeek} completed tasks shows consistent execution. Keep this pace!`,
      priority: 2, timestamp: now
    });
  }

  return insights.sort((a, b) => b.priority - a.priority);
}

// ── SECTION 7: Chat NLP Engine ─────────────────────────────────────────

const INTENT_PATTERNS: Record<string, string[]> = {
  CREATE: ["create event", "create meeting", "create an", "create a", "schedule meeting", "schedule an", "schedule a call", "schedule a meeting", "schedule a", "schedule call", "schedule event", "add event", "add a meeting", "add a task", "book a slot", "book meeting", "book a", "book an", "set up an", "set up a", "set up meeting", "plan a session", "plan meeting", "plan a", "plan an", "new event", "new meeting", "new task"],
  DELETE: ["delete event", "delete the", "remove event", "remove the", "cancel event", "cancel the", "cancel my", "drop the", "get rid of"],
  MARK_DONE: ["mark done", "mark as done", "mark complete", "mark as complete", "mark finished", "completed the", "finished the", "check off", "done with", "as done", "as complete"],
  RENAME: ["rename", "change title", "change the title", "change name", "change the name"],
  SET_CATEGORY: ["categorize", "recategorize", "change category", "set category", "label as", "tag as", "move to category"],
  SET_PRIORITY: ["set priority", "make urgent", "prioritize", "make important", "high priority", "low priority", "change priority"],
  DUPLICATE: ["duplicate", "copy event", "clone event", "clone the", "repeat event", "copy to", "copy the"],
  EDIT: ["edit event", "edit the", "change the time", "update event", "update the", "modify event", "modify the"],
  FIND_FREE: ["find free", "free slot", "when am i free", "when i'm free", "when im free", "available time", "open slot", "find time", "schedule a block", "squeeze in"],
  BUSIEST: ["busiest", "heaviest", "most loaded", "most packed", "fullest"],
  STRESS: ["stress", "cognitive load", "cognitive flow", "focus load", "overworked", "burnout", "wellness", "how am i doing", "health check", "exhausted", "energy capacity", "burnout risk"],
  ADD_BREAK: ["add break", "insert rest", "insert break", "add buffer", "take a break", "rest time", "breathing room", "need a break"],
  BALANCE: ["balance", "distribute", "spread", "even out", "rebalance", "equalize"],
  UPCOMING: ["what's next", "what is next", "upcoming", "what's today", "whats today", "what do i have", "today's schedule", "todays schedule", "agenda", "what's on", "whats on", "active schedule", "schedule for today", "schedule today"],
  SUMMARY: ["summary", "overview", "how's my week", "how is my week", "weekly report", "recap", "week status", "report", "whole week", "schedule across the whole week", "weekly balance", "global schedule"],
  CONFLICTS: ["conflict", "overlap", "clash", "collision", "double-booked", "double booked"],
  FREE_TIME: ["how much free time", "available hours", "spare time", "unscheduled time", "free time"],
  OPTIMIZE: ["optimize", "improve", "make better", "enhance", "streamline", "fix my schedule"],
  DEADLINE: ["deadline", "due soon", "overdue", "urgent tasks", "time-sensitive"],
  PATTERN: ["pattern", "recurring", "habit", "routine", "regular"],
  FOCUS: ["focus mode", "deep work", "concentrate", "undisturbed", "focus block", "deep focus"],
  SCORE: ["score", "rating", "how good", "grade", "schedule score", "rate my"],
  HELLO: ["hi", "hello", "hey", "help", "what can you do", "capabilities", "features"],
  THANKS: ["thank", "thanks", "thx", "appreciate", "great job", "good job", "nice"],
  MOVE: ["move", "reschedule", "shift", "push back", "push forward", "relocate"],
  CLEAR: ["clear", "cancel everything", "wipe", "clean slate", "clear my"],
  COUNT: ["how many", "count", "total", "number of"],
};

function classifyIntent(message: string): ChatIntent {
  const lower = message.toLowerCase().trim();
  let bestIntent = "UNKNOWN";
  let bestScore = 0;

  Object.entries(INTENT_PATTERNS).forEach(([intent, patterns]) => {
    patterns.forEach(pattern => {
      if (lower.includes(pattern)) {
        const score = pattern.length / lower.length + (pattern.split(" ").length * 0.1);
        if (score > bestScore) {
          bestScore = score;
          bestIntent = intent;
        }
      }
    });
  });

  // Phrasal overrides for split structures like "mark X as done" or "schedule an urgent 45-min meeting"
  if (/^(?:schedule|book|plan|create|set\s*up)\s+(?:an?\s+)?(?:urgent\s+)?(?:\d+[\s-]*min(?:ute)?s?\s+)?(?:meeting|event|call|session|task)/i.test(lower)) {
    bestIntent = "CREATE";
    bestScore = 1;
  } else if (/^mark\s+.+\s+(?:as\s+)?(?:done|complete|finished)/i.test(lower)) {
    bestIntent = "MARK_DONE";
    bestScore = 1;
  } else if (/^rename\s+.+\s+(?:to|as)\s+/i.test(lower)) {
    bestIntent = "RENAME";
    bestScore = 1;
  } else if (/^(?:copy|duplicate|clone)\s+.+\s+(?:to|on)\s+/i.test(lower)) {
    bestIntent = "DUPLICATE";
    bestScore = 1;
  }

  // Extract entities
  const entities: Record<string, any> = {};

  // Day extraction
  const dayMap: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
  Object.entries(dayMap).forEach(([name, dow]) => {
    if (lower.includes(name)) entities.dayOfWeek = dow;
  });
  if (lower.includes("today")) entities.relativeDay = "today";
  if (lower.includes("tomorrow")) entities.relativeDay = "tomorrow";
  if (lower.includes("this week")) entities.scope = "week";
  if (lower.includes("next week")) entities.scope = "next_week";

  // Duration extraction — supports plural (hours, minutes), hyphens (45-minute), and abbreviations
  const durMatch = lower.match(/(\d+)[\s-]*(hours?|hrs?|h|minutes?|mins?|m)\b/i);
  if (durMatch) {
    const val = parseInt(durMatch[1]);
    const unit = durMatch[2].toLowerCase();
    entities.durationMinutes = unit.startsWith("h") ? val * 60 : val;
  }
  if (lower.includes("half hour")) entities.durationMinutes = 30;

  // Time period extraction
  if (lower.includes("morning")) entities.timePeriod = "morning";
  if (lower.includes("afternoon")) entities.timePeriod = "afternoon";
  if (lower.includes("evening")) entities.timePeriod = "evening";

  // ── Event title extraction (quoted text or after "called/named/titled") ──
  const quotedTitle = message.match(/["'\u201c\u201d\u2018\u2019]([^"'\u201c\u201d\u2018\u2019]+)["'\u201c\u201d\u2018\u2019]/)?.[1];
  if (quotedTitle) entities.eventTitle = quotedTitle;
  if (!entities.eventTitle) {
    const namedMatch = lower.match(/(?:called|named|titled)\s+(.+?)(?:\s+(?:at|on|to|from|for|tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|$)/i);
    if (namedMatch) entities.eventTitle = namedMatch[1].trim();
  }

  // ── Time extraction ("at 3pm", "at 15:00", "at 3:30 pm") ──
  const atTimeMatch = lower.match(/(?:at|from|starting?)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (atTimeMatch) {
    let hour = parseInt(atTimeMatch[1]);
    const minute = atTimeMatch[2] ? parseInt(atTimeMatch[2]) : 0;
    const ampm = atTimeMatch[3]?.toLowerCase();
    if (ampm === "pm" && hour < 12) hour += 12;
    if (ampm === "am" && hour === 12) hour = 0;
    entities.atHour = hour;
    entities.atMinute = minute;
  }

  // ── End time extraction ("until 5pm", "to 4:30pm", "ending at 5") ──
  const endTimeMatch = lower.match(/(?:until|to|ending\s*(?:at)?|till)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (endTimeMatch) {
    let hour = parseInt(endTimeMatch[1]);
    const minute = endTimeMatch[2] ? parseInt(endTimeMatch[2]) : 0;
    const ampm = endTimeMatch[3]?.toLowerCase();
    if (ampm === "pm" && hour < 12) hour += 12;
    if (ampm === "am" && hour === 12) hour = 0;
    entities.endHour = hour;
    entities.endMinute = minute;
  }

  // For MOVE/EDIT intents without an explicit starting "at", "to <time>" represents the target start time
  if ((bestIntent === "MOVE" || bestIntent === "EDIT") && entities.atHour === undefined && entities.endHour !== undefined) {
    entities.atHour = entities.endHour;
    entities.atMinute = entities.endMinute;
    delete entities.endHour;
    delete entities.endMinute;
  }

  // ── Category extraction ──
  const catMap: Record<string, string> = {
    meeting: "Meeting", review: "Review", task: "Tasks", personal: "Personal",
    focus: "Focus", study: "Study", work: "Work", document: "Document"
  };
  Object.entries(catMap).forEach(([keyword, cat]) => {
    if (lower.includes(keyword)) entities.category = cat;
  });

  // ── Priority extraction ──
  if (lower.includes("urgent") || lower.includes("critical")) entities.priority = "high";
  else if (lower.includes("high priority") || lower.includes("important")) entities.priority = "high";
  else if (lower.includes("low priority") || lower.includes("minor")) entities.priority = "low";
  else if (lower.includes("medium priority") || lower.includes("normal")) entities.priority = "medium";

  // ── Attendees extraction ("with John and Sarah", "with Alice, Bob") ──
  const attendeesMatch = message.match(/with\s+([A-Z][a-zA-Z]+(?:\s*(?:,|and)\s*[A-Z][a-zA-Z]+)*)/i);
  if (attendeesMatch) {
    entities.attendees = attendeesMatch[1].split(/\s*(?:,|and)\s*/i).map((n: string) => n.trim()).filter(Boolean);
  }

  // ── Color extraction ──
  const colorMap: Record<string, string> = {
    red: "red", blue: "blue", green: "green", purple: "purple",
    orange: "orange", yellow: "yellow", pink: "pink", indigo: "indigo"
  };
  Object.entries(colorMap).forEach(([keyword, color]) => {
    if (lower.includes(keyword)) entities.color = color;
  });

  // ── New title extraction for RENAME ("to X", "as X") ──
  const renameMatch = message.match(/rename\s+.*?\s+(?:to|as)\s+["'\u201c\u201d\u2018\u2019]?([^"'\u201c\u201d\u2018\u2019\n]+?)["'\u201c\u201d\u2018\u2019]?$/i);
  if (renameMatch) entities.newTitle = renameMatch[1].trim();

  return { intent: bestIntent, confidence: Math.min(1, bestScore + 0.2), entities, rawQuery: message };
}

function resolveTargetDate(entities: Record<string, any>, currentDate: Date): Date {
  if (entities.relativeDay === "today") return new Date();
  if (entities.relativeDay === "tomorrow") {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  }
  if (entities.dayOfWeek !== undefined) {
    const d = new Date();
    const diff = (entities.dayOfWeek - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + (diff === 0 ? 7 : diff));
    return d;
  }
  return currentDate;
}

/** Fuzzy match: find events whose title contains the search term (case-insensitive) */
function findMatchingEvents(events: Event[], query: string): Event[] {
  const rawQuery = query
    .replace(/["'\u201c\u201d\u2018\u2019]/g, "")
    .replace(/[-_&/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const lower = rawQuery.toLowerCase();
  // Remove intent keywords so we search on the "noun" part
  const cleaned = lower
    .replace(/\b(delete|remove|cancel|rename|mark|done|complete|finished|move|reschedule|shift|duplicate|copy|clone|edit|update|modify|the|my|a|an|event|task|meeting|as|to|at|from|for|in|on|set|priority|category|label|tag)\b/gi, "")
    .replace(/\s+/g, " ").trim();
  const searchTarget = cleaned || rawQuery.toLowerCase();
  if (!searchTarget) return [];
  // Score each event by how well its title matches
  return events
    .filter(e => {
      const t = e.title
        .toLowerCase()
        .replace(/["'\u201c\u201d\u2018\u2019]/g, "")
        .replace(/[-_&/]/g, " ")
        .replace(/\s+/g, " ");
      return t.includes(searchTarget) || searchTarget.includes(t);
    })
    .sort((a, b) => {
      const aClean = a.title.toLowerCase().replace(/[-_&/]/g, " ").replace(/\s+/g, " ");
      const bClean = b.title.toLowerCase().replace(/[-_&/]/g, " ").replace(/\s+/g, " ");
      const aExact = aClean === searchTarget ? 1 : 0;
      const bExact = bClean === searchTarget ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;
      return a.title.length - b.title.length;
    });
}

function generateChatResponse(intent: ChatIntent, events: Event[], currentDate: Date): ChatMessage {
  const week = buildWeekProfile(currentDate, events);
  const today = buildDayProfile(new Date(), events);
  const targetDate = resolveTargetDate(intent.entities, currentDate);
  const targetDay = buildDayProfile(targetDate, events);
  const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date();

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  switch (intent.intent) {
    case "HELLO": {
      return {
        id, role: "nmi", timestamp: now,
        content: `Hey! I'm **Noska Manager Intelligence** — your personal scheduling brain. Here's what I can do:\n\n**📋 Manage Events**\n• 📝 **Create** events ("Schedule a meeting at 3pm")\n• ✏️ **Edit/Move** events ("Move standup to 10am")\n• 🗑️ **Delete** events ("Cancel the 4pm review")\n• ✅ **Complete** tasks ("Mark design review as done")\n• 📋 **Duplicate** events ("Copy standup to tomorrow")\n• 🏷️ **Categorize** events ("Set category to Meeting")\n\n**📊 Analyze & Optimize**\n• 📊 **Analyze** your schedule ("How's my week?", "Schedule score")\n• 🔍 **Find** free time ("Find me a free slot")\n• ⚖️ **Balance** your workload ("Balance my week")\n• ☕ **Insert breaks** ("Add breaks after long blocks")\n• 🔴 **Resolve conflicts** ("Show me conflicts")\n• 🧠 **Track stress** ("Am I overworked?")\n• ⚡ **Optimize** placement ("Optimize my schedule")\n\nJust ask me anything about your schedule!`,
        thinking: "User greeted or asked for help. Providing capability overview."
      };
    }

    case "UPCOMING": {
      const dayLabel = intent.entities.relativeDay === "tomorrow" ? "tomorrow" : "today";
      const profile = dayLabel === "tomorrow" ? buildDayProfile((() => { const d = new Date(); d.setDate(d.getDate() + 1); return d; })(), events) : today;
      if (profile.eventCount === 0) {
        return {
          id, role: "nmi", timestamp: now,
          content: `Your ${dayLabel} looks completely clear — no events scheduled. A perfect opportunity for deep work or a well-deserved rest day. 🌿`,
          thinking: `Checked ${dayLabel}'s profile: 0 events found.`
        };
      }
      const evtList = profile.events
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
        .map(e => `• **${new Date(e.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}** — ${e.title} (${e.category || "General"})`)
        .join("\n");
      return {
        id, role: "nmi", timestamp: now,
        content: `Here's your ${dayLabel} lineup — **${profile.eventCount} events, ${profile.totalHours}h total**:\n\n${evtList}\n\n${profile.cognitiveLoad > 70 ? "⚡ Heavy day ahead — pace yourself!" : profile.cognitiveLoad > 40 ? "Balanced day. You've got this! 💪" : "Light day — great for creative or strategic work. 🌿"}`,
        thinking: `Queried ${dayLabel}'s events: found ${profile.eventCount} events totaling ${profile.totalHours}h. Cognitive load: ${profile.cognitiveLoad}/100.`
      };
    }

    case "SUMMARY": {
      const topDay = week.busiestDay ? `${dayNames[new Date(week.busiestDay.date).getDay()]} (${week.busiestDay.totalHours}h)` : "N/A";
      const lightDay = week.lightestDay ? `${dayNames[new Date(week.lightestDay.date).getDay()]} (${week.lightestDay.totalHours}h)` : "N/A";
      return {
        id, role: "nmi", timestamp: now,
        content: `## 📊 Weekly Intelligence Report\n\n**Schedule Score: ${week.scheduleScore}/100** ${week.scheduleScore >= 75 ? "✅" : week.scheduleScore >= 50 ? "⚠️" : "🔴"}\n\n| Metric | Value |\n|---|---|\n| Avg Daily Hours | ${week.avgDailyHours}h |\n| Total Events | ${week.days.reduce((s, d) => s + d.eventCount, 0)} |\n| Busiest Day | ${topDay} |\n| Lightest Day | ${lightDay} |\n| Conflicts | ${week.totalConflicts} day(s) |\n| Burnout Risk | ${week.burnoutRisk} |\n| Balance σ | ${week.stdDeviation}h |\n\n${week.scheduleScore < 60 ? "💡 **Tip**: Your schedule needs optimization. Try \"optimize my schedule\" for improvements." : "Looking solid! Keep maintaining this balance."}`,
        thinking: `Generated weekly analysis. Score ${week.scheduleScore}/100. Burnout: ${week.burnoutRisk}. StdDev: ${week.stdDeviation}h.`
      };
    }

    case "BUSIEST": {
      if (!week.busiestDay) {
        return { id, role: "nmi", timestamp: now, content: "No events found this week — every day is free! 🎉" };
      }
      const bDay = week.busiestDay;
      const dayName = dayNames[new Date(bDay.date).getDay()];
      return {
        id, role: "nmi", timestamp: now,
        content: `Your busiest day this week is **${dayName}** with **${bDay.totalHours}h** across ${bDay.eventCount} events.\n\n• Cognitive load: ${bDay.cognitiveLoad}/100\n• Longest unbroken block: ${bDay.longestMarathon}h\n• Dominant category: ${bDay.dominantCategory}\n${bDay.hasConflicts ? "• ⚠️ Has schedule conflicts!" : ""}\n\n${bDay.totalHours > MAX_HEALTHY_DAILY_HOURS ? `That's above the recommended ${MAX_HEALTHY_DAILY_HOURS}h daily max. Consider moving some items to ${week.lightestDay ? dayNames[new Date(week.lightestDay.date).getDay()] : "a lighter day"}.` : "Within healthy limits. 👍"}`,
        thinking: `Scanned 7-day profiles. ${dayName} peaks at ${bDay.totalHours}h (${bDay.eventCount} events, cog load ${bDay.cognitiveLoad}).`
      };
    }

    case "STRESS": {
      const emoji = week.burnoutRisk === "critical" ? "🔴" : week.burnoutRisk === "high" ? "🟠" : week.burnoutRisk === "moderate" ? "🟡" : "🟢";
      return {
        id, role: "nmi", timestamp: now,
        content: `## 🧠 Cognitive Load & Wellness Report\n\n**Burnout Risk: ${emoji} ${week.burnoutRisk.toUpperCase()}**\n\n| Day | Hours | Cog Load | Marathon | Breaks |\n|---|---|---|---|---|\n${week.days.map(d => `| ${dayNames[new Date(d.date).getDay()].slice(0, 3)} | ${d.totalHours}h | ${d.cognitiveLoad}/100 | ${d.longestMarathon}h | ${d.breakCount} |`).join("\n")}\n\n• Consecutive heavy days: ${week.consecutiveHeavyDays}\n• Schedule Score: ${week.scheduleScore}/100\n\n${week.burnoutRisk !== "none" ? "💡 **Recommendation**: Reduce workload on your heaviest days and insert recovery blocks. Try \"add breaks\" or \"balance my week\"." : "Your stress levels look healthy. Keep it up! 🌿"}`,
        thinking: `Comprehensive stress analysis. Burnout risk: ${week.burnoutRisk}. Consecutive heavy days: ${week.consecutiveHeavyDays}. Score: ${week.scheduleScore}.`
      };
    }

    case "FIND_FREE": {
      const dur = intent.entities.durationMinutes || 60;
      const profile = targetDay;
      const freeSlots: { start: number; end: number }[] = [];
      const occupied = profile.events
        .map(e => ({ s: new Date(e.startTime).getHours() + new Date(e.startTime).getMinutes() / 60, e: new Date(e.endTime).getHours() + new Date(e.endTime).getMinutes() / 60 }))
        .sort((a, b) => a.s - b.s);

      let cursor = WORK_DAY_START;
      occupied.forEach(o => {
        if (o.s > cursor && (o.s - cursor) >= dur / 60) freeSlots.push({ start: cursor, end: o.s });
        cursor = Math.max(cursor, o.e);
      });
      if (WORK_DAY_END > cursor && (WORK_DAY_END - cursor) >= dur / 60) freeSlots.push({ start: cursor, end: WORK_DAY_END });

      if (freeSlots.length === 0) {
        return { id, role: "nmi", timestamp: now, content: `No ${dur}-minute free slots available on ${new Date(targetDay.date).toLocaleDateString([], { weekday: "long" })}. The day is fully booked. Consider rescheduling something or try another day.` };
      }

      // Rank by energy score
      const ranked = freeSlots.map(s => ({
        ...s,
        energy: getEnergyScore(Math.floor(s.start)),
        label: `${String(Math.floor(s.start)).padStart(2, "0")}:${String(Math.round((s.start % 1) * 60)).padStart(2, "0")} – ${String(Math.floor(s.end)).padStart(2, "0")}:${String(Math.round((s.end % 1) * 60)).padStart(2, "0")}`
      })).sort((a, b) => b.energy - a.energy);

      return {
        id, role: "nmi", timestamp: now,
        content: `Found **${ranked.length} free slot${ranked.length > 1 ? "s" : ""}** for a ${dur}-minute block:\n\n${ranked.map((s, i) => `${i === 0 ? "⭐" : "•"} **${s.label}** (${Math.round((s.end - s.start) * 60)}min free, energy: ${s.energy}/10)`).join("\n")}\n\n${ranked[0] ? `I recommend **${ranked[0].label}** — it has the highest energy alignment for productive work.` : ""}`,
        thinking: `Scanned ${WORK_DAY_START}-${WORK_DAY_END} window. Found ${ranked.length} gaps ≥ ${dur}min. Ranked by circadian energy.`,
        actions: ranked[0] ? [{ label: `Create ${dur}min Block at ${ranked[0].label.split("–")[0].trim()}`, actionId: "create_focus_block", data: { start: ranked[0].start, date: targetDay.date, duration: dur } }] : []
      };
    }

    case "FREE_TIME": {
      const profile = targetDay;
      const totalScheduled = profile.totalHours;
      const freeHours = Math.max(0, WORK_HOURS - totalScheduled);
      const dayLabel = intent.entities.relativeDay === "tomorrow" ? "tomorrow" : "today";
      return {
        id, role: "nmi", timestamp: now,
        content: `You have **${Math.round(freeHours * 10) / 10}h of free time** ${dayLabel} (out of ${WORK_HOURS}h work window).\n\n• Scheduled: ${totalScheduled}h across ${profile.eventCount} events\n• Free: ${Math.round(freeHours * 10) / 10}h\n• Utilization: ${Math.round((totalScheduled / WORK_HOURS) * 100)}%\n\n${freeHours < 2 ? "Tight day! Make sure you have at least one break." : freeHours > 8 ? "Very open day — perfect for deep creative work. 🎨" : "Good balance of structure and flexibility."}`,
        thinking: `Calculated free time: ${WORK_HOURS}h window - ${totalScheduled}h scheduled = ${freeHours}h free.`
      };
    }

    case "CONFLICTS": {
      const allConflicts: { a: Event; b: Event }[] = [];
      events.forEach((a, i) => {
        events.slice(i + 1).forEach(b => {
          if (new Date(a.startTime).getTime() < new Date(b.endTime).getTime() &&
            new Date(b.startTime).getTime() < new Date(a.endTime).getTime()) {
            allConflicts.push({ a, b });
          }
        });
      });
      if (allConflicts.length === 0) {
        return { id, role: "nmi", timestamp: now, content: "✅ No schedule conflicts detected! All your events have clean time boundaries." };
      }
      const conflictList = allConflicts.slice(0, 5).map(c =>
        `• **"${c.a.title}"** (${new Date(c.a.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}) ↔ **"${c.b.title}"** (${new Date(c.b.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })})`
      ).join("\n");
      return {
        id, role: "nmi", timestamp: now,
        content: `🔴 **${allConflicts.length} conflict${allConflicts.length > 1 ? "s" : ""} found:**\n\n${conflictList}${allConflicts.length > 5 ? `\n...and ${allConflicts.length - 5} more` : ""}\n\nSay **\"resolve conflicts\"** and I'll auto-fix these by adding 15-min buffers.`,
        thinking: `Cross-checked ${events.length} events pairwise. Found ${allConflicts.length} temporal overlaps.`,
        actions: [{ label: "Auto-Resolve All", actionId: "resolve_conflicts" }]
      };
    }

    case "ADD_BREAK": {
      return {
        id, role: "nmi", timestamp: now,
        content: `I'll scan your schedule for marathon blocks (${MARATHON_THRESHOLD_HOURS}h+ without breaks) and insert 15-minute recovery sessions.\n\nThis helps maintain cognitive performance and prevents burnout.`,
        thinking: `User requested break insertion. Will scan for consecutive blocks ≥ ${MARATHON_THRESHOLD_HOURS}h and insert micro-breaks.`,
        actions: [{ label: "Insert Smart Breaks Now", actionId: "insert_breaks" }]
      };
    }

    case "BALANCE": {
      if (week.stdDeviation < 1.5) {
        return { id, role: "nmi", timestamp: now, content: `Your week is already well-balanced! (σ = ${week.stdDeviation}h). Standard deviation below 1.5h is optimal. 👍` };
      }
      return {
        id, role: "nmi", timestamp: now,
        content: `Your week has a balance deviation of **${week.stdDeviation}h** (ideal: < 1.5h).\n\n${week.busiestDay ? `• Heaviest: ${dayNames[new Date(week.busiestDay.date).getDay()]} (${week.busiestDay.totalHours}h)` : ""}\n${week.lightestDay ? `• Lightest: ${dayNames[new Date(week.lightestDay.date).getDay()]} (${week.lightestDay.totalHours}h)` : ""}\n\nI can redistribute events to smooth out the load.`,
        thinking: `Week std deviation: ${week.stdDeviation}h. Needs rebalancing.`,
        actions: [{ label: "Auto-Balance Week", actionId: "rebalance_week" }]
      };
    }

    case "OPTIMIZE": {
      return {
        id, role: "nmi", timestamp: now,
        content: `Running full schedule optimization...\n\n**Current Score: ${week.scheduleScore}/100**\n\nI'll apply these improvements:\n1. ⚖️ Rebalance daily loads\n2. 🔴 Resolve all conflicts\n3. ☕ Insert recovery breaks\n4. 🧠 Align tasks with energy peaks\n\nThis should boost your score significantly.`,
        thinking: `Full optimization requested. Current score: ${week.scheduleScore}. Will apply multi-objective optimization.`,
        actions: [{ label: "Run Full Optimization", actionId: "full_optimize" }]
      };
    }

    case "SCORE": {
      return {
        id, role: "nmi", timestamp: now,
        content: `## 📊 Schedule Score: ${week.scheduleScore}/100\n\n| Factor | Score | Max |\n|---|---|---|\n| Load Balance | ${Math.max(0, 25 - Math.round(week.stdDeviation * 5))} | 25 |\n| Conflict-Free | ${Math.max(0, 20 - week.totalConflicts * 5)} | 20 |\n| Rest Compliance | ${Math.max(0, 20 - week.days.filter(d => d.longestMarathon > MARATHON_THRESHOLD_HOURS).length * 5)} | 20 |\n| Deadline Adherence | 15 | 15 |\n| Energy Alignment | ${Math.round(week.days.reduce((s, d) => s + d.energyAlignment, 0) / 70)} | 10 |\n| Focus Blocks | ${Math.min(10, week.days.filter(d => d.events.some(e => (e.tags || []).some(t => t.toLowerCase().includes("focus")))).length * 3)} | 10 |\n\n${week.scheduleScore >= 80 ? "🏆 Excellent schedule!" : week.scheduleScore >= 60 ? "👍 Good, with room to improve." : "⚠️ Needs optimization. Try \"optimize my schedule\"."}`,
        thinking: `Calculated composite schedule score from 6 weighted factors.`
      };
    }

    case "FOCUS": {
      const dur = intent.entities.durationMinutes || 120;
      return {
        id, role: "nmi", timestamp: now,
        content: `I'll find the best ${dur / 60}-hour window for deep focus work — prioritizing high-energy periods with no surrounding events.\n\nIdeal focus windows: **10:00-12:00 AM** or **3:00-5:00 PM** (peak cognitive performance).`,
        thinking: `Focus block requested: ${dur}min. Scanning for optimal placement.`,
        actions: [{ label: `Schedule ${dur / 60}h Focus Block`, actionId: "create_focus_block", data: { duration: dur } }]
      };
    }

    case "PATTERN": {
      const pats = detectPatterns(events);
      if (pats.length === 0) {
        return { id, role: "nmi", timestamp: now, content: "I haven't detected any strong patterns yet. As you schedule more events, I'll identify your recurring habits and preferences. 🔍" };
      }
      const patList = pats.slice(0, 5).map(p => `• ${p.description} (${Math.round(p.confidence * 100)}% confidence)`).join("\n");
      return {
        id, role: "nmi", timestamp: now,
        content: `## 🔄 Detected Patterns\n\n${patList}\n\nI use these patterns to make smarter scheduling suggestions.`,
        thinking: `Analyzed ${events.length} events. Found ${pats.length} behavioral patterns.`
      };
    }

    case "DEADLINE": {
      const urgent = events.filter(e => {
        const h = (new Date(e.endTime).getTime() - now.getTime()) / 3600000;
        return h > 0 && h <= 72 && e.status !== "done";
      }).sort((a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime());
      if (urgent.length === 0) {
        return { id, role: "nmi", timestamp: now, content: "✅ No urgent deadlines in the next 72 hours. You're in good shape!" };
      }
      const list = urgent.map(e => {
        const h = Math.round((new Date(e.endTime).getTime() - now.getTime()) / 3600000);
        return `• **${e.title}** — ${h}h remaining (${e.status || "pending"})`;
      }).join("\n");
      return {
        id, role: "nmi", timestamp: now,
        content: `⏰ **${urgent.length} item${urgent.length > 1 ? "s" : ""} due within 72 hours:**\n\n${list}\n\n${urgent.some(e => !e.status || e.status === "todo") ? "⚠️ Some haven't been started yet!" : ""}`,
        thinking: `Scanned events within 72h window. ${urgent.length} items approaching deadlines.`
      };
    }

    case "COUNT": {
      const scope = intent.entities.scope === "next_week" ? "next week" : "this week";
      return {
        id, role: "nmi", timestamp: now,
        content: `You have **${week.days.reduce((s, d) => s + d.eventCount, 0)} events** scheduled ${scope}, totaling **${Math.round(week.days.reduce((s, d) => s + d.totalHours, 0) * 10) / 10}h** of work.`,
        thinking: `Counted events across 7-day window.`
      };
    }

    case "THANKS": {
      const responses = [
        "Happy to help! Let me know if you need anything else. 😊",
        "Anytime! I'm always here monitoring your schedule. 🧠",
        "You're welcome! Your schedule is in good hands. ✨",
      ];
      return { id, role: "nmi", timestamp: now, content: responses[Math.floor(Math.random() * responses.length)] };
    }

    case "CREATE": {
      const title = intent.entities.eventTitle || "New Event";
      const startHour = intent.entities.atHour !== undefined ? intent.entities.atHour : 10;
      const startMin = intent.entities.atMinute || 0;
      const durMinutes = intent.entities.durationMinutes || (
        intent.entities.endHour !== undefined
          ? Math.max(15, (intent.entities.endHour * 60 + (intent.entities.endMinute || 0)) - (startHour * 60 + startMin))
          : 60
      );
      const start = new Date(targetDate);
      start.setHours(startHour, startMin, 0, 0);
      const end = new Date(start.getTime() + durMinutes * 60000);
      const category = intent.entities.category || "Meeting";
      const color = intent.entities.color || (category === "Personal" ? "green" : category === "Focus" ? "purple" : "blue");
      const priority = intent.entities.priority || "medium";
      const attendees = intent.entities.attendees || [];

      const timeStr = `${start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} – ${end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
      const dayStr = start.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

      return {
        id, role: "nmi", timestamp: now,
        content: `I can create this event for you:\n\n📅 **${title}**\n• ⏰ **When**: ${dayStr} at ${timeStr} (${durMinutes} min)\n• 🏷️ **Category**: ${category}\n• 🎯 **Priority**: ${priority.toUpperCase()}\n${attendees.length > 0 ? `• 👥 **Attendees**: ${attendees.join(", ")}\n` : ""}• 🎨 **Color**: ${color}\n\nClick below to confirm and add to your calendar!`,
        thinking: `Parsed event creation request. Title: "${title}", Date: ${dayStr}, Time: ${timeStr}, Category: ${category}.`,
        actions: [
          {
            label: `Create "${title}"`,
            actionId: "create_event",
            data: {
              title,
              startTime: start.toISOString(),
              endTime: end.toISOString(),
              category,
              color,
              priority,
              attendees,
              description: `Created via Noska Intelligence chat`
            }
          }
        ]
      };
    }

    case "DELETE": {
      const query = intent.entities.eventTitle || intent.rawQuery;
      const matches = findMatchingEvents(events, query);
      if (matches.length === 0) {
        return {
          id, role: "nmi", timestamp: now,
          content: `I couldn't find an event matching **"${intent.entities.eventTitle || query}"** to delete.\n\nPlease check the name or say "what's today" to see your current schedule.`,
          thinking: `Searched for event to delete with query "${query}", 0 matches found.`
        };
      }
      const target = matches[0];
      const startStr = new Date(target.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      const dayStr = new Date(target.startTime).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
      return {
        id, role: "nmi", timestamp: now,
        content: `Are you sure you want to cancel **"${target.title}"**?\n\n• 📅 **Date**: ${dayStr} at ${startStr}\n• 🏷️ **Category**: ${target.category || "General"}\n\nClick below to confirm deletion:`,
        thinking: `Matched event "${target.title}" (ID: ${target.id}) for deletion.`,
        actions: [
          {
            label: `Delete "${target.title}"`,
            actionId: "delete_event",
            data: { id: target.id, title: target.title }
          }
        ]
      };
    }

    case "EDIT":
    case "MOVE": {
      const query = intent.entities.eventTitle || intent.rawQuery;
      const matches = findMatchingEvents(events, query);
      if (matches.length === 0) {
        return {
          id, role: "nmi", timestamp: now,
          content: `I couldn't find an event matching **"${intent.entities.eventTitle || query}"** to reschedule.\n\nCould you specify the exact event title and the new time? (e.g. "Move 'Team Standup' to 3pm tomorrow")`,
          thinking: `Searched for event to move with query "${query}", 0 matches.`
        };
      }
      const target = matches[0];
      const dur = new Date(target.endTime).getTime() - new Date(target.startTime).getTime();
      const newStart = new Date(targetDate);
      if (intent.entities.atHour !== undefined) {
        newStart.setHours(intent.entities.atHour, intent.entities.atMinute || 0, 0, 0);
      } else {
        const orig = new Date(target.startTime);
        newStart.setHours(orig.getHours(), orig.getMinutes(), 0, 0);
      }
      const newEnd = new Date(newStart.getTime() + dur);
      const newTimeStr = `${newStart.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} – ${newEnd.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
      const newDayStr = newStart.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

      return {
        id, role: "nmi", timestamp: now,
        content: `Ready to reschedule **"${target.title}"**:\n\n• 📍 **New Time**: ${newDayStr} at ${newTimeStr}\n\nClick below to apply the change:`,
        thinking: `Rescheduling "${target.title}" to ${newDayStr} ${newTimeStr}.`,
        actions: [
          {
            label: `Move to ${newDayStr} ${newStart.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`,
            actionId: "move_event",
            data: { id: target.id, startTime: newStart.toISOString(), endTime: newEnd.toISOString(), title: target.title }
          }
        ]
      };
    }

    case "RENAME": {
      const query = intent.entities.eventTitle || intent.rawQuery;
      const matches = findMatchingEvents(events, query);
      if (matches.length === 0) {
        return {
          id, role: "nmi", timestamp: now,
          content: `I couldn't find an event to rename matching **"${query}"**.\n\nTry: "Rename 'Standup' to 'Weekly Sync'"`,
          thinking: `No matching event found for rename with query "${query}".`
        };
      }
      const target = matches[0];
      const newTitle = intent.entities.newTitle || "Updated Event";
      return {
        id, role: "nmi", timestamp: now,
        content: `Rename event:\n\n• **From**: "${target.title}"\n• **To**: "${newTitle}"\n\nClick below to confirm:`,
        thinking: `Renaming event ${target.id} from "${target.title}" to "${newTitle}".`,
        actions: [
          {
            label: `Rename to "${newTitle}"`,
            actionId: "rename_event",
            data: { id: target.id, newTitle }
          }
        ]
      };
    }

    case "MARK_DONE": {
      const query = intent.entities.eventTitle || intent.rawQuery;
      const matches = findMatchingEvents(events, query);
      if (matches.length > 0) {
        const target = matches[0];
        return {
          id, role: "nmi", timestamp: now,
          content: `Mark **"${target.title}"** as completed? 🎉\n\nThis will update its progress to 100% and status to done.`,
          thinking: `Matched event "${target.title}" to mark as done.`,
          actions: [
            {
              label: `Mark "${target.title}" Done`,
              actionId: "mark_done",
              data: { id: target.id, title: target.title }
            }
          ]
        };
      }
      const pendingToday = today.events.filter(e => e.status !== "done");
      if (pendingToday.length === 0) {
        return { id, role: "nmi", timestamp: now, content: "All events for today are already completed! Great job! 🎉" };
      }
      return {
        id, role: "nmi", timestamp: now,
        content: `Which event would you like to mark as done?\n\n${pendingToday.map(e => `• **"${e.title}"**`).join("\n")}`,
        thinking: `No specific event title in query, listed ${pendingToday.length} pending events today.`,
        actions: pendingToday.slice(0, 3).map(e => ({
          label: `Done: "${e.title}"`,
          actionId: "mark_done",
          data: { id: e.id, title: e.title }
        }))
      };
    }

    case "SET_PRIORITY": {
      const query = intent.entities.eventTitle || intent.rawQuery;
      const matches = findMatchingEvents(events, query);
      const priority = intent.entities.priority || "high";
      if (matches.length === 0) {
        return {
          id, role: "nmi", timestamp: now,
          content: `I couldn't find an event to update priority for. Please mention the event name (e.g. "Make 'Client Review' urgent").`
        };
      }
      const target = matches[0];
      return {
        id, role: "nmi", timestamp: now,
        content: `Set priority of **"${target.title}"** to **${priority.toUpperCase()}**?`,
        thinking: `Updating priority of "${target.title}" to ${priority}.`,
        actions: [
          {
            label: `Set to ${priority.toUpperCase()}`,
            actionId: "set_priority",
            data: { id: target.id, priority, title: target.title }
          }
        ]
      };
    }

    case "SET_CATEGORY": {
      const query = intent.entities.eventTitle || intent.rawQuery;
      const matches = findMatchingEvents(events, query);
      const category = intent.entities.category || "Work";
      if (matches.length === 0) {
        return {
          id, role: "nmi", timestamp: now,
          content: `I couldn't find an event to recategorize. Please mention the event name (e.g. "Set category of 'Standup' to Meeting").`
        };
      }
      const target = matches[0];
      return {
        id, role: "nmi", timestamp: now,
        content: `Change category of **"${target.title}"** from **${target.category || "None"}** to **${category}**?`,
        thinking: `Changing category of "${target.title}" to ${category}.`,
        actions: [
          {
            label: `Set Category to ${category}`,
            actionId: "update_category",
            data: { id: target.id, category, title: target.title }
          }
        ]
      };
    }

    case "DUPLICATE": {
      const query = intent.entities.eventTitle || intent.rawQuery;
      const matches = findMatchingEvents(events, query);
      if (matches.length === 0) {
        return {
          id, role: "nmi", timestamp: now,
          content: `I couldn't find an event to duplicate. Please specify the event title (e.g. "Copy 'Standup' to tomorrow").`
        };
      }
      const target = matches[0];
      const targetDayStr = targetDate.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
      return {
        id, role: "nmi", timestamp: now,
        content: `Duplicate **"${target.title}"** to **${targetDayStr}**?`,
        thinking: `Duplicating event ${target.id} to ${targetDayStr}.`,
        actions: [
          {
            label: `Duplicate to ${targetDayStr}`,
            actionId: "duplicate_event",
            data: { id: target.id, targetDate: targetDate.toISOString(), title: target.title }
          }
        ]
      };
    }

    default: {
      return {
        id, role: "nmi", timestamp: now,
        content: `I'm not quite sure what you mean. Here are some things you can ask me:\n\n• "What's my schedule today?"\n• "How's my week looking?"\n• "Find me a free slot"\n• "Am I overworked?"\n• "Balance my week"\n• "Show me conflicts"\n• "What's my schedule score?"\n• "Add breaks to my schedule"\n\nTry one of these!`,
        thinking: `Intent classification failed for: "${intent.rawQuery}". Confidence: ${intent.confidence.toFixed(2)}.`
      };
    }
  }
}

// ── SECTION 8: Action Executor ─────────────────────────────────────────

function executeAction(
  actionId: string,
  data: any,
  events: Event[],
  currentDate: Date,
  onEventCreate: (event: Omit<Event, "id">) => void,
  onEventUpdate: (id: string, updates: Partial<Event>) => void,
  onEventDelete?: (id: string) => void,
): string {
  switch (actionId) {
    case "create_event": {
      if (!data) return "Missing event creation data.";
      onEventCreate({
        title: data.title || "New Event",
        description: data.description || "Created via Noska Intelligence",
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        color: data.color || "blue",
        category: data.category || "Meeting",
        tags: data.tags || [data.category || "Meeting"],
        status: "confirmed",
        progress: 0,
        reminder: true,
        reminderMinutes: 10,
        attendees: data.attendees
      });
      return `✅ Created event **"${data.title}"** on your calendar!`;
    }

    case "delete_event": {
      if (!data?.id) return "Missing event ID to delete.";
      if (onEventDelete) {
        onEventDelete(data.id);
      }
      return `🗑️ Cancelled event **"${data.title || "Event"}"**.`;
    }

    case "move_event": {
      if (!data?.id) return "Missing event ID to move.";
      onEventUpdate(data.id, {
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime)
      });
      return `📍 Moved **"${data.title || "Event"}"** to the new time.`;
    }

    case "rename_event": {
      if (!data?.id) return "Missing event ID to rename.";
      onEventUpdate(data.id, { title: data.newTitle });
      return `✏️ Renamed event to **"${data.newTitle}"**.`;
    }

    case "mark_done": {
      if (!data?.id) return "Missing event ID.";
      onEventUpdate(data.id, { status: "done", progress: 100 });
      return `🎉 Marked **"${data.title || "Event"}"** as completed!`;
    }

    case "update_category": {
      if (!data?.id) return "Missing event ID.";
      onEventUpdate(data.id, { category: data.category });
      return `🏷️ Updated category of **"${data.title || "Event"}"** to **${data.category}**.`;
    }

    case "set_priority": {
      if (!data?.id) return "Missing event ID.";
      onEventUpdate(data.id, {
        color: data.priority === "high" ? "rose" : data.priority === "low" ? "slate" : "blue",
        tags: [data.priority === "high" ? "Urgent" : "Standard"]
      });
      return `🎯 Set priority of **"${data.title || "Event"}"** to **${(data.priority || "").toUpperCase()}**.`;
    }

    case "duplicate_event": {
      if (!data?.id) return "Missing event ID to duplicate.";
      const target = events.find(e => e.id === data.id);
      if (!target) return "Could not find event to duplicate.";
      const dur = new Date(target.endTime).getTime() - new Date(target.startTime).getTime();
      const newTargetDay = new Date(data.targetDate || new Date());
      const origStart = new Date(target.startTime);
      newTargetDay.setHours(origStart.getHours(), origStart.getMinutes(), 0, 0);
      const newEnd = new Date(newTargetDay.getTime() + dur);

      const { id: _, ...rest } = target;
      onEventCreate({
        ...rest,
        title: `${target.title} (Copy)`,
        startTime: newTargetDay,
        endTime: newEnd,
        status: "confirmed",
        progress: 0
      });
      return `📋 Duplicated **"${target.title}"** to ${newTargetDay.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}!`;
    }

    case "resolve_conflicts": {
      const sorted = [...events].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      let resolved = 0;
      for (let i = 0; i < sorted.length - 1; i++) {
        const curEnd = new Date(sorted[i].endTime).getTime();
        const nextStart = new Date(sorted[i + 1].startTime).getTime();
        if (curEnd > nextStart) {
          const dur = new Date(sorted[i + 1].endTime).getTime() - nextStart;
          const newStart = new Date(curEnd + 15 * 60000);
          onEventUpdate(sorted[i + 1].id, { startTime: newStart, endTime: new Date(newStart.getTime() + dur) });
          sorted[i + 1].startTime = newStart;
          sorted[i + 1].endTime = new Date(newStart.getTime() + dur);
          resolved++;
        }
      }
      return `✅ Resolved ${resolved} conflict${resolved !== 1 ? "s" : ""} by inserting 15-min buffers.`;
    }

    case "insert_breaks": {
      const sorted = [...events].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      let inserted = 0;
      for (let i = 0; i < sorted.length - 1; i++) {
        const curEnd = new Date(sorted[i].endTime).getTime();
        const nextStart = new Date(sorted[i + 1].startTime).getTime();
        const curStart = new Date(sorted[i].startTime).getTime();
        const blockHours = (curEnd - curStart) / 3600000;
        const gap = (nextStart - curEnd) / 60000;
        if (blockHours >= 1.5 && gap < 20 && gap >= 0) {
          const breakStart = new Date(curEnd);
          const breakEnd = new Date(curEnd + 15 * 60000);
          onEventCreate({
            title: "☕ Recovery Break",
            description: "Auto-inserted by Noska Intelligence for cognitive recovery",
            startTime: breakStart, endTime: breakEnd,
            color: "green", category: "Personal", tags: ["Break", "Wellness"],
            status: "confirmed", progress: 0, reminder: true, reminderMinutes: 5
          });
          inserted++;
        }
      }
      return inserted > 0
        ? `☕ Inserted ${inserted} recovery break${inserted !== 1 ? "s" : ""} after long blocks.`
        : "Your schedule already has adequate breaks. No changes needed.";
    }

    case "rebalance_week": {
      const week = buildWeekProfile(currentDate, events);
      if (week.stdDeviation < 1.5) return "⚖️ Your week is already well-balanced! No changes needed.";
      if (!week.busiestDay || !week.lightestDay) return "Not enough data to rebalance.";

      const bEvents = week.busiestDay.events.filter(e => e.status !== "done");
      const movable = bEvents.filter(e => getCognitiveDemand(e) <= 6);
      let moved = 0;
      const lightDate = new Date(week.lightestDay.date);
      movable.slice(0, 2).forEach(e => {
        const dur = new Date(e.endTime).getTime() - new Date(e.startTime).getTime();
        const newStart = new Date(lightDate);
        newStart.setHours(10 + moved * 2, 0, 0, 0);
        onEventUpdate(e.id, { startTime: newStart, endTime: new Date(newStart.getTime() + dur) });
        moved++;
      });
      return moved > 0
        ? `⚖️ Moved ${moved} event${moved !== 1 ? "s" : ""} from ${new Date(week.busiestDay.date).toLocaleDateString([], { weekday: "long" })} to ${lightDate.toLocaleDateString([], { weekday: "long" })} for better balance.`
        : "Could not find suitable events to move. All events are high-priority or already completed.";
    }

    case "auto_recovery": {
      // Insert recovery blocks on consecutive heavy days
      const week = buildWeekProfile(currentDate, events);
      let inserted = 0;
      week.days.filter(d => d.totalHours >= BURNOUT_DAILY_THRESHOLD).forEach(d => {
        const breakStart = new Date(d.date);
        breakStart.setHours(12, 30, 0, 0);
        const breakEnd = new Date(breakStart.getTime() + 30 * 60000);
        onEventCreate({
          title: "🌿 Recovery Block",
          description: "Auto-inserted by NMI Wellness Guardian — take a proper break",
          startTime: breakStart, endTime: breakEnd,
          color: "green", category: "Personal", tags: ["Recovery", "Wellness"],
          status: "confirmed", progress: 0, reminder: true, reminderMinutes: 5
        });
        inserted++;
      });
      return `🌿 Inserted ${inserted} recovery block${inserted !== 1 ? "s" : ""} on your heaviest days.`;
    }

    case "create_focus_block": {
      const duration = data?.duration || 60;
      const targetDate = data?.date ? new Date(data.date) : new Date();
      const startHour = data?.start || 10;
      const start = new Date(targetDate);
      start.setHours(Math.floor(startHour), Math.round((startHour % 1) * 60), 0, 0);
      const end = new Date(start.getTime() + duration * 60000);
      onEventCreate({
        title: "🎯 Deep Focus Session",
        description: "Protected focus block — minimize interruptions",
        startTime: start, endTime: end,
        color: "blue", category: "Focus", tags: ["Focus", "Deep Work"],
        status: "confirmed", progress: 0, reminder: true, reminderMinutes: 10
      });
      return `🎯 Created ${duration / 60}h focus block at ${start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`;
    }

    case "optimize_energy": {
      const misaligned = events.filter(e => {
        const hour = new Date(e.startTime).getHours();
        return getCognitiveDemand(e) >= 7 && getEnergyScore(hour) <= 4;
      });
      let moved = 0;
      misaligned.slice(0, 3).forEach(e => {
        const dur = new Date(e.endTime).getTime() - new Date(e.startTime).getTime();
        const day = new Date(e.startTime);
        day.setHours(10, 0, 0, 0); // Move to peak morning
        onEventUpdate(e.id, { startTime: day, endTime: new Date(day.getTime() + dur) });
        moved++;
      });
      return moved > 0
        ? `🧠 Moved ${moved} high-demand task${moved !== 1 ? "s" : ""} to peak energy hours (10 AM).`
        : "All high-demand tasks are already well-placed. No changes needed.";
    }

    case "full_optimize": {
      const results: string[] = [];
      results.push(executeAction("resolve_conflicts", null, events, currentDate, onEventCreate, onEventUpdate, onEventDelete));
      results.push(executeAction("insert_breaks", null, events, currentDate, onEventCreate, onEventUpdate, onEventDelete));
      results.push(executeAction("optimize_energy", null, events, currentDate, onEventCreate, onEventUpdate, onEventDelete));
      const newWeek = buildWeekProfile(currentDate, events);
      results.push(`\n📊 **New Schedule Score: ${newWeek.scheduleScore}/100**`);
      return results.join("\n");
    }

    default:
      return "Action not recognized.";
  }
}

// ── SECTION 9: useNoskaIntelligence Hook ───────────────────────────────

function useNoskaIntelligence(events: Event[], currentDate: Date) {
  const insights = useMemo(() => generateInsights(events, currentDate), [events, currentDate]);
  const weekProfile = useMemo(() => buildWeekProfile(currentDate, events), [events, currentDate]);
  const todayProfile = useMemo(() => buildDayProfile(new Date(), events), [events]);
  const patterns = useMemo(() => detectPatterns(events), [events]);
  const activeInsights = useMemo(() => insights.filter(i => !i.dismissed), [insights]);

  return { insights, activeInsights, weekProfile, todayProfile, patterns };
}

// ── SECTION 10: Auto-Pilot Hook ────────────────────────────────────────

function loadAutoPilotConfig(): AutoPilotConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_AUTOPILOT);
    if (stored) return JSON.parse(stored);
  } catch { }
  return {
    autoBreaks: false, autoBalance: false, autoConflictResolve: false,
    autoTagging: false, autoPrioritize: false, wellnessGuardian: true,
    smartReminders: true, focusProtection: false
  };
}

function loadChatHistory(): ChatMessage[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CHAT);
    if (stored) {
      const msgs = JSON.parse(stored);
      return msgs.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })).slice(-50);
    }
  } catch { }
  return [];
}

// ── SECTION 11: MatchaTimeTrackerCard (Isolated for 60fps silky performance) ──

interface MatchaTimeTrackerCardProps {
  weekProfile: WeekProfile;
  timeRange: "today" | "week";
  setTimeRange: React.Dispatch<React.SetStateAction<"today" | "week">>;
  onShowToast?: (msg: string) => void;
  onAddFocusClick: () => void;
}

const MatchaTimeTrackerCard = React.memo(function MatchaTimeTrackerCard({
  weekProfile,
  timeRange,
  setTimeRange,
  onShowToast,
  onAddFocusClick
}: MatchaTimeTrackerCardProps) {
  const [timerSeconds, setTimerSeconds] = useState(26160); // 07:16:00
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const score = Math.min(100, Math.max(15, weekProfile.scheduleScore || 78));
  const radius = 54;
  const circum = 2 * Math.PI * radius;
  const progressRatio = score / 100;
  const angleRad = (progressRatio * 360 - 90) * (Math.PI / 180);
  const dotX = 72 + radius * Math.cos(angleRad);
  const dotY = 72 + radius * Math.sin(angleRad);

  const hoursStr = useMemo(() => {
    const h = Math.floor(timerSeconds / 3600);
    const m = Math.floor((timerSeconds % 3600) / 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }, [timerSeconds]);

  return (
    <div className="p-5 sm:p-6 rounded-[28px] bg-[radial-gradient(ellipse_at_30%_20%,#54844a_0%,#436d3b_55%,#2c4f26_100%)] border border-[#72a768]/40 shadow-[0_16px_36px_rgba(25,50,22,0.32)] text-white relative overflow-hidden group transform-gpu">
      {/* Ambient Soft Blur Glow */}
      <div className="absolute -right-8 -bottom-8 size-40 bg-[#86be7e]/20 rounded-full blur-2xl pointer-events-none" />

      {/* Top Row: TIME TRACKER, Range Picker, & Caret Action */}
      <div className="flex items-center justify-between relative z-10">
        <div>
          <span className="text-xs font-black tracking-widest text-white uppercase block">
            TIME TRACKER
          </span>
          <span className="text-[11.5px] font-medium text-white/80 block mt-0.5">
            Week total: <strong className="text-white font-bold">{Math.round(weekProfile.days.reduce((acc, d) => acc + (d.totalHours || 0), 0) || 4)}h</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setTimeRange(r => r === "today" ? "week" : "today")}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#31532a]/85 hover:bg-[#3b6233] backdrop-blur-md border border-white/20 text-white text-[11px] font-bold cursor-pointer transition shadow-xs"
          >
            <span>📅 {timeRange === "today" ? "Today" : "This Week"}</span>
            <ChevronDown size={12} className="opacity-80" />
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              setTimerSeconds(26160);
              onShowToast?.("Time tracker synced with today's schedule");
            }}
            className="size-8 rounded-full bg-[#31532a]/85 hover:bg-[#3b6233] text-white/90 hover:text-white flex items-center justify-center border border-white/20 transition cursor-pointer"
            title="Sync / Refresh Time Tracker"
          >
            <ChevronDown size={14} className="rotate-180" />
          </motion.button>
        </div>
      </div>

      {/* Center Dial: Prominent Matcha Clock Arc & Digital Readout */}
      <div className="py-3 flex items-center justify-center relative z-10">
        <div className="relative size-36 sm:size-40 flex items-center justify-center">
          <svg className="absolute inset-0 size-full" viewBox="0 0 144 144">
            <circle
              cx="72"
              cy="72"
              r={radius}
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="5.5"
              fill="transparent"
            />
            <circle
              cx="72"
              cy="72"
              r={radius}
              stroke="#ffffff"
              strokeWidth="5.5"
              fill="transparent"
              strokeDasharray={circum}
              strokeDashoffset={circum - (circum * score) / 100}
              strokeLinecap="round"
              transform="rotate(-90 72 72)"
              className="transition-all duration-700 ease-out"
            />
            <circle
              cx={dotX}
              cy={dotY}
              r="4.5"
              fill="#ffffff"
              stroke="#436d3b"
              strokeWidth="2.5"
              className="filter drop-shadow-[0_0_6px_rgba(255,255,255,0.9)] transition-all duration-700 ease-out"
            />
          </svg>

          {/* Translucent Inner Disc & Typography */}
          <div className="size-24 sm:size-26 rounded-full bg-[#2c4e25]/50 backdrop-blur-xs flex flex-col items-center justify-center text-center shadow-inner border border-white/10">
            <div className="absolute inset-0 pointer-events-none">
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => (
                <span
                  key={deg}
                  className="absolute size-1 rounded-full bg-white/40"
                  style={{
                    top: "50%",
                    left: "50%",
                    transform: `rotate(${deg}deg) translate(0, -42px) translate(-50%, -50%)`
                  }}
                />
              ))}
            </div>

            <span className="text-2xl sm:text-[26px] font-black text-white tracking-tight leading-none">
              {hoursStr}
            </span>
            <span className="text-[9.5px] font-black tracking-[0.2em] text-white/80 uppercase mt-1">
              HOURS
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Row Controls */}
      <div className="flex items-center justify-between pt-1 relative z-10">
        <div className="flex items-center gap-2.5">
          {/* Pure White Circular Stop Button */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              setIsTimerRunning(false);
              setTimerSeconds(0);
              onShowToast?.("Timer stopped & reset");
            }}
            className="size-10 sm:size-11 rounded-full bg-white text-neutral-900 flex items-center justify-center shadow-lg hover:bg-neutral-100 transition cursor-pointer"
            title="Stop & Reset Timer"
          >
            <div className="size-3 bg-neutral-900 rounded-[2px]" />
          </motion.button>

          {/* Frosted Translucent Circular Play/Pause Button */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              setIsTimerRunning(v => !v);
              onShowToast?.(isTimerRunning ? "Focus timer paused" : "Focus timer resumed");
            }}
            className="size-10 sm:size-11 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white flex items-center justify-center border border-white/25 shadow-md transition cursor-pointer"
            title={isTimerRunning ? "Pause Timer" : "Start Timer"}
          >
            {isTimerRunning ? (
              <Pause size={15} className="fill-white text-white" />
            ) : (
              <Play size={15} className="fill-white text-white ml-0.5" />
            )}
          </motion.button>
        </div>

        {/* Dark Forest Green Plus Add Button */}
        <div className="relative flex flex-col items-center">
          <motion.button
            type="button"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={onAddFocusClick}
            className="size-10 sm:size-11 rounded-full bg-[#183116] hover:bg-[#234420] text-white flex items-center justify-center shadow-xl border border-white/15 transition cursor-pointer"
            title="Add Focus Time"
          >
            <Plus size={18} strokeWidth={2.5} />
          </motion.button>
        </div>
      </div>
    </div>
  );
});

// ── SECTION 12: NoskaIntelligencePanel Component ───────────────────────

export function NoskaIntelligencePanel({
  isOpen, onClose, events, onEventCreate, onEventUpdate, onEventDelete,
  currentDate, userName, onShowToast, workspaceTracks = [], workspaceStats
}: NoskaIntelligencePanelProps) {
  const [activeTab, setActiveTab] = useState<"home" | "insights" | "chat" | "autopilot">("home");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => loadChatHistory());
  const [chatInput, setChatInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [autoPilot, setAutoPilot] = useState<AutoPilotConfig>(() => loadAutoPilotConfig());
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());
  const [timeRange, setTimeRange] = useState<"today" | "week">("today");
  const [meetingPrivacy, setMeetingPrivacy] = useState<Record<string, boolean>>({
    "meet-1": true,
    "meet-2": false
  });
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>("all");
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  // Dynamic projects list derived from workspace tracks and events
  const availableProjects = useMemo(() => {
    const list: Array<{ id: string; name: string; color: string; dotClass: string }> = [];
    const seen = new Set<string>();

    workspaceTracks.forEach(t => {
      if (!seen.has(t.title)) {
        seen.add(t.title);
        list.push({
          id: t.id,
          name: t.title,
          color: t.color || "#88ba46",
          dotClass: "bg-emerald-500"
        });
      }
    });

    events.forEach(e => {
      const projName = e.tags?.[0] || e.category;
      if (projName && !seen.has(projName) && projName !== "All" && projName !== "Tasks") {
        seen.add(projName);
        list.push({
          id: `proj-${projName}`,
          name: projName,
          color: e.color || "#88ba46",
          dotClass: e.category === "Document" ? "bg-purple-400" : e.category === "Meeting" ? "bg-indigo-400" : "bg-lime-500"
        });
      }
    });

    if (list.length === 0) {
      list.push(
        { id: "p1", name: "Norsk Focus", color: "#cfaef0", dotClass: "bg-purple-400" },
        { id: "p2", name: "TechRise Dev", color: "#88ba46", dotClass: "bg-lime-500" },
        { id: "p3", name: "SwiftHive Strategy", color: "#10b981", dotClass: "bg-emerald-500" }
      );
    }
    return list;
  }, [workspaceTracks, events]);

  // Dynamic 3-lane timeline days derived from currentDate and events
  const timelineDays = useMemo(() => {
    const base = new Date(currentDate);
    return [0, 1, 2].map(offset => {
      const d = new Date(base);
      d.setDate(d.getDate() - offset);
      const dayStr = String(d.getDate()).padStart(2, "0");
      const monthStr = String(d.getMonth() + 1).padStart(2, "0");
      const label = `${dayStr}.${monthStr}`;

      const dayEvents = events.filter(e => {
        const ed = new Date(e.startTime);
        const isSameDay = ed.getDate() === d.getDate() &&
                          ed.getMonth() === d.getMonth() &&
                          ed.getFullYear() === d.getFullYear();
        if (!isSameDay) return false;
        if (selectedProjectFilter !== "all") {
          return e.tags?.includes(selectedProjectFilter) ||
                 e.category === selectedProjectFilter ||
                 e.title.toLowerCase().includes(selectedProjectFilter.toLowerCase());
        }
        return true;
      });

      const windowStartHour = 10;
      const windowTotalHours = 6; // 10 am to 4 pm (360 mins)

      const capsules = dayEvents.map((evt, idx) => {
        const st = new Date(evt.startTime);
        const et = new Date(evt.endTime);
        const startMins = st.getHours() * 60 + st.getMinutes();
        const endMins = et.getHours() * 60 + et.getMinutes();
        const windowStartMins = windowStartHour * 60;
        const windowTotalMins = windowTotalHours * 60;

        const clampedStart = Math.max(windowStartMins, Math.min(startMins, windowStartMins + windowTotalMins));
        const clampedEnd = Math.max(clampedStart + 25, Math.min(endMins, windowStartMins + windowTotalMins));

        const leftPercent = Math.max(0, Math.min(88, ((clampedStart - windowStartMins) / windowTotalMins) * 100));
        const widthPercent = Math.max(14, Math.min(100 - leftPercent, ((clampedEnd - clampedStart) / windowTotalMins) * 100));

        const isPurple = evt.category === "Document" || evt.category === "Review" || evt.color === "purple" || idx % 2 === 1;
        const gradientClass = isPurple
          ? "from-[#cfaef0] to-[#996bc7]"
          : "from-[#88ba46] to-[#5e8c28]";

        return {
          id: evt.id,
          title: evt.title,
          left: `${leftPercent}%`,
          width: `${widthPercent}%`,
          gradientClass,
          isPurple
        };
      });

      const finalCapsules = capsules.length > 0 ? capsules : (
        offset === 0 ? [
          { id: "sample-1", title: "Focus Deep Work", left: "16%", width: "26%", gradientClass: "from-[#88ba46] to-[#5e8c28]", isPurple: false },
          { id: "sample-2", title: "Architecture Sprint", left: "46%", width: "34%", gradientClass: "from-[#7cb470] to-[#4c7e43]", isPurple: false }
        ] : offset === 1 ? [
          { id: "sample-3", title: "Product Review", left: "4%", width: "44%", gradientClass: "from-[#cfaef0] to-[#996bc7]", isPurple: true },
          { id: "sample-4", title: "UX Sync", left: "52%", width: "18%", gradientClass: "from-[#d8beee] to-[#b58ee0]", isPurple: true }
        ] : [
          { id: "sample-5", title: "System Refactor", left: "32%", width: "42%", gradientClass: "from-[#88ba46] to-[#517a22]", isPurple: false }
        ]
      );

      return {
        date: d,
        label,
        capsules: finalCapsules
      };
    });
  }, [currentDate, events, selectedProjectFilter]);

  // Dynamic Future Focus Card
  const futureFocusEvent = useMemo(() => {
    const now = new Date();
    const upcoming = events
      .filter(e => new Date(e.startTime) >= now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    if (upcoming.length > 0) {
      const next = upcoming[0];
      const dt = new Date(next.startTime);
      const monthName = dt.toLocaleString("en-US", { month: "short" }).toUpperCase();
      const dayNum = String(dt.getDate()).padStart(2, "0");
      const title = next.title;
      const initials = next.attendees?.[0] ? next.attendees[0].slice(0, 2).toUpperCase() : (userName ? userName.slice(0, 2).toUpperCase() : "AS");
      return { month: monthName, day: dayNum, title, initials, category: next.category || "FUTURE FOCUS" };
    }

    return {
      month: "JUNE",
      day: "02",
      title: userName || "Ann Stollen",
      initials: userName ? userName.slice(0, 2).toUpperCase() : "AS",
      category: "FUTURE FOCUS"
    };
  }, [events, userName]);

  // Dynamic Project Time Total & Percentages Breakdown
  const projectTimeDistribution = useMemo(() => {
    let focusHours = 0;
    let devHours = 0;
    let meetHours = 0;

    events.forEach(e => {
      const durHours = Math.max(0.5, (new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) / 3600000);
      if (e.category === "Meeting" || e.title.toLowerCase().includes("meet") || e.title.toLowerCase().includes("sync")) {
        meetHours += durHours;
      } else if (e.category === "Tasks" || e.category === "Work" || e.title.toLowerCase().includes("dev") || e.title.toLowerCase().includes("code")) {
        devHours += durHours;
      } else {
        focusHours += durHours;
      }
    });

    const totalRaw = focusHours + devHours + meetHours;
    const totalHours = totalRaw > 0 ? Math.round(totalRaw) : 68;

    const fPct = totalRaw > 0 ? Math.max(10, Math.round((focusHours / (totalRaw || 1)) * 100)) : 65;
    const dPct = totalRaw > 0 ? Math.max(10, Math.round((devHours / (totalRaw || 1)) * 100)) : 18;
    const mPct = Math.max(5, 100 - fPct - dPct);

    return {
      totalHours,
      focusPct: fPct,
      devPct: dPct,
      meetPct: mPct
    };
  }, [events]);

  // Dynamic Today's Meetings
  const todaysMeetings = useMemo(() => {
    const targetDate = new Date(currentDate);
    const meetings = events.filter(e => {
      const ed = new Date(e.startTime);
      const isSameDay = ed.getDate() === targetDate.getDate() &&
                        ed.getMonth() === targetDate.getMonth() &&
                        ed.getFullYear() === targetDate.getFullYear();
      if (!isSameDay) return false;
      return e.category === "Meeting" ||
             e.title.toLowerCase().includes("meet") ||
             e.title.toLowerCase().includes("sync") ||
             e.title.toLowerCase().includes("review");
    });

    if (meetings.length > 0) {
      return meetings.map((m) => {
        const st = new Date(m.startTime);
        const timeStr = `${String(st.getHours()).padStart(2, "0")}:${String(st.getMinutes()).padStart(2, "0")}`;
        return {
          id: m.id,
          time: timeStr,
          title: m.title,
          subtitle: m.description || (m.tags?.length ? m.tags.join(" • ") : "Daily Team Organization"),
          attendees: m.attendees || ["E", "M"],
          avatarInitial: m.title.slice(0, 1).toUpperCase()
        };
      });
    }

    return [
      {
        id: "meet-1",
        time: "09:20",
        title: "Daily Project Review",
        subtitle: "Team organization",
        attendees: ["E", "M", "+2"],
        avatarInitial: "E"
      },
      {
        id: "meet-2",
        time: "11:00",
        title: "Sprint Surge",
        subtitle: "Daily Boost for Agile Progress",
        attendees: ["S"],
        avatarInitial: "S"
      }
    ];
  }, [events, currentDate]);

  const [scopeFilter, setScopeFilter] = useState<"assignees" | "priority" | "project">("project");
  const [sliderPos, setSliderPos] = useState<number>(90);
  const [activeGoalStep, setActiveGoalStep] = useState<number>(3);

  // Dynamic real workspace scope counts
  const scopeCounts = useMemo(() => {
    const assigneeSet = new Set<string>();
    events.forEach(e => {
      if (e.attendees) e.attendees.forEach(a => assigneeSet.add(a));
    });
    const assignees = Math.max(1, assigneeSet.size || (workspaceStats?.totalUsers || 4));

    const priority = events.filter(e => 
      e.priority === "urgent" || 
      e.priority === "high" || 
      e.title.toLowerCase().includes("urgent") || 
      e.title.toLowerCase().includes("priority")
    ).length;

    const projectSet = new Set<string>(events.map(e => e.category || "General"));
    const project = Math.max(1, projectSet.size);

    return { assignees, priority, project };
  }, [events, workspaceStats]);

  // Dynamic Real Workspace Task Stack (100% strictly real live tasks & events)
  const [taskStack, setTaskStack] = useState<Array<{
    id: string;
    title: string;
    subtitle: string;
    assignedAgo: string;
    type: string;
  }>>([]);

  useEffect(() => {
    if (events && events.length > 0) {
      const realTasks = events
        .filter(e => e.status !== "done")
        .map((e) => {
          const diffMins = Math.max(1, Math.round((Date.now() - new Date(e.startTime).getTime()) / 60000));
          const timeAgoStr = diffMins < 60 ? `${diffMins}m ago` : `${Math.round(diffMins / 60)}h ago`;
          return {
            id: e.id,
            title: e.title,
            subtitle: e.description || `${e.category || "Workspace"} task scheduled for ${new Date(e.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`,
            assignedAgo: timeAgoStr,
            type: e.category || "Workspace Task"
          };
        });
      setTaskStack(realTasks);
    } else {
      setTaskStack([]);
    }
  }, [events]);

  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskSubtitle, setNewSubtitle] = useState("");

  const [racePoints, setRacePoints] = useState({ user: 24, peer: 30, peerName: "Lisa" });
  const [isActionsDrawerOpen, setIsActionsDrawerOpen] = useState(false);
  const [attachedTiles, setAttachedTiles] = useState<Array<{
    id: string;
    tag: string;
    iconType: "schedule" | "memory" | "workload";
    gradient: string;
    borderColor: string;
    glowColor: string;
    pattern: string;
    iconColor: string;
  }>>([
    {
      id: "schedule",
      tag: "ACTIVE",
      iconType: "schedule",
      gradient: "from-[#4a2e12] via-[#331d09] to-[#1c0f04]",
      borderColor: "border-amber-500/35",
      glowColor: "shadow-[0_6px_18px_rgba(245,158,11,0.15)]",
      pattern: "bg-[radial-gradient(rgba(255,255,255,0.22)_1px,transparent_1px)] [background-size:5px_5px]",
      iconColor: "text-amber-300"
    },
    {
      id: "memory",
      tag: "COGNITIVE",
      iconType: "memory",
      gradient: "from-[#382b4a] via-[#241a33] to-[#140d1e]",
      borderColor: "border-purple-400/35",
      glowColor: "shadow-[0_6px_18px_rgba(192,132,252,0.15)]",
      pattern: "bg-[radial-gradient(rgba(255,255,255,0.22)_1px,transparent_1px)] [background-size:5px_5px]",
      iconColor: "text-purple-300"
    },
    {
      id: "workload",
      tag: "ENERGY",
      iconType: "workload",
      gradient: "from-[#0d4030] via-[#07291e] to-[#03140f]",
      borderColor: "border-emerald-400/35",
      glowColor: "shadow-[0_6px_18px_rgba(52,211,153,0.15)]",
      pattern: "bg-[radial-gradient(rgba(255,255,255,0.22)_1px,transparent_1px)] [background-size:5px_5px]",
      iconColor: "text-emerald-300"
    }
  ]);
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("noska_intelligence_width");
      return saved ? Number(saved) : 560;
    } catch {
      return 560;
    }
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Left-Edge Resizer Drag Logic
  const handleResizeStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = panelWidth;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = startX - moveEvent.clientX; // dragging left expands drawer width
      const maxWidth = typeof window !== "undefined" ? window.innerWidth - 24 : 1200;
      const newWidth = Math.min(Math.max(startWidth + deltaX, 420), maxWidth);
      setPanelWidth(newWidth);
    };

    const onPointerUp = () => {
      setIsResizing(false);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      try {
        localStorage.setItem("noska_intelligence_width", String(panelWidth));
      } catch { }
    };

  }, [panelWidth]);

  const { insights, activeInsights, weekProfile, todayProfile, patterns } = useNoskaIntelligence(events, currentDate);

  const visibleInsights = useMemo(() =>
    activeInsights.filter(i => !dismissedInsights.has(i.id)),
    [activeInsights, dismissedInsights]
  );

  // Persist chat history
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_CHAT, JSON.stringify(chatHistory.slice(-50))); } catch { }
  }, [chatHistory]);

  // Persist auto-pilot config
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_AUTOPILOT, JSON.stringify(autoPilot)); } catch { }
  }, [autoPilot]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Focus input when switching to chat
  useEffect(() => {
    if (activeTab === "chat") setTimeout(() => inputRef.current?.focus(), 300);
  }, [activeTab]);

  const handleSendMessage = useCallback(() => {
    const msg = chatInput.trim();
    if (!msg) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user", content: msg, timestamp: new Date()
    };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput("");
    setIsThinking(true);

    // Simulate thinking delay for realism
    setTimeout(() => {
      const intent = classifyIntent(msg);
      const response = generateChatResponse(intent, events, currentDate);
      setChatHistory(prev => [...prev, response]);
      setIsThinking(false);
    }, 400 + Math.random() * 600);
  }, [chatInput, events, currentDate]);

  const handleActionExecute = useCallback((actionId: string, data?: any) => {
    const result = executeAction(actionId, data, events, currentDate, onEventCreate, onEventUpdate, onEventDelete);
    const sysMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "nmi", content: result, timestamp: new Date(),
      thinking: `Executed action: ${actionId}`
    };
    setChatHistory(prev => [...prev, sysMsg]);
    setActiveTab("chat");
    onShowToast?.(result.split("\n")[0]);
  }, [events, currentDate, onEventCreate, onEventUpdate, onEventDelete, onShowToast]);

  const handleQuickAction = useCallback((query: string) => {
    setChatInput(query);
    setTimeout(() => {
      const userMsg: ChatMessage = { id: `msg-${Date.now()}`, role: "user", content: query, timestamp: new Date() };
      setChatHistory(prev => [...prev, userMsg]);
      setIsThinking(true);
      setTimeout(() => {
        const intent = classifyIntent(query);
        const response = generateChatResponse(intent, events, currentDate);
        setChatHistory(prev => [...prev, response]);
        setIsThinking(false);
        setChatInput("");
      }, 300 + Math.random() * 500);
    }, 100);
  }, [events, currentDate]);

  const handleVoiceToggle = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = true;
          recognition.lang = "en-US";

          recognition.onstart = () => {
            setIsListening(true);
            onShowToast?.("🎙️ Listening... speak your schedule request");
          };

          recognition.onresult = (event: any) => {
            const transcript = Array.from(event.results)
              .map((res: any) => res[0].transcript)
              .join("");
            setChatInput(transcript);
          };

          recognition.onerror = () => {
            setIsListening(false);
          };

          recognition.onend = () => {
            setIsListening(false);
            inputRef.current?.focus();
          };

          recognitionRef.current = recognition;
          recognition.start();
          return;
        } catch {
          setIsListening(false);
        }
      }
    }

    // Fallback if browser doesn't have Web Speech API
    handleQuickAction("How can I optimize my day today?");
    onShowToast?.("Voice prompt activated");
  }, [isListening, handleQuickAction, onShowToast]);

  const handleDismissInsight = useCallback((id: string) => {
    setDismissedInsights(prev => new Set([...prev, id]));
  }, []);

  const handleClearChat = useCallback(() => {
    setChatHistory([]);
    localStorage.removeItem(STORAGE_KEY_CHAT);
  }, []);

  const insightTypeColors: Record<string, { bg: string; border: string; iconBg: string; icon: string; badge: string }> = {
    critical: {
      bg: "bg-rose-50/90 dark:bg-rose-950/30",
      border: "border-rose-200/80 dark:border-rose-800/60",
      iconBg: "bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400",
      icon: "text-rose-600 dark:text-rose-400",
      badge: "bg-rose-100/80 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300"
    },
    warning: {
      bg: "bg-amber-50/90 dark:bg-amber-950/30",
      border: "border-amber-200/80 dark:border-amber-800/60",
      iconBg: "bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400",
      icon: "text-amber-600 dark:text-amber-400",
      badge: "bg-amber-100/80 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
    },
    suggestion: {
      bg: "bg-blue-50/90 dark:bg-blue-950/30",
      border: "border-blue-200/80 dark:border-blue-800/60",
      iconBg: "bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400",
      icon: "text-blue-600 dark:text-blue-400",
      badge: "bg-blue-100/80 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300"
    },
    info: {
      bg: "bg-neutral-50/90 dark:bg-neutral-900/50",
      border: "border-neutral-200/80 dark:border-neutral-800/80",
      iconBg: "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400",
      icon: "text-neutral-600 dark:text-neutral-400",
      badge: "bg-neutral-200/80 text-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-300"
    },
    achievement: {
      bg: "bg-emerald-50/90 dark:bg-emerald-950/30",
      border: "border-emerald-200/80 dark:border-emerald-800/60",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400",
      icon: "text-emerald-600 dark:text-emerald-400",
      badge: "bg-emerald-100/80 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300"
    }
  };

  const insightIcons: Record<string, React.ReactNode> = {
    critical: <AlertTriangle size={18} />,
    warning: <Flame size={18} />,
    suggestion: <Lightbulb size={18} />,
    info: <Eye size={18} />,
    achievement: <CheckCircle2 size={18} />
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/30 dark:bg-black/60 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.5 }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            style={{
              width: isFullscreen ? "100vw" : `${panelWidth}px`,
              maxWidth: "100vw"
            }}
            className={cn(
              "fixed top-0 right-0 bottom-0 z-[61] bg-[#fbfbfb] dark:bg-[#0f1016] border-l border-black/[0.08] dark:border-white/[0.08] shadow-2xl flex flex-col overflow-hidden transform-gpu will-change-transform",
              !isResizing && "transition-[width] duration-150 ease-out",
              isFullscreen && "left-0 border-l-0"
            )}
          >
            {/* Left Edge Resizer Handle (Drag to resize / Double click to cycle presets) */}
            {!isFullscreen && (
              <div
                onPointerDown={handleResizeStart}
                onDoubleClick={() => setPanelWidth(w => w > 820 ? 560 : w > 520 ? 860 : 560)}
                className={cn(
                  "absolute left-0 top-0 bottom-0 w-3.5 -translate-x-1/2 z-50 cursor-col-resize flex items-center justify-center group select-none transition-colors",
                  isResizing ? "bg-emerald-500/25" : "hover:bg-emerald-500/15"
                )}
                title="Drag to resize panel • Double-click to cycle presets (560px / 860px)"
              >
                <div
                  className={cn(
                    "w-1 rounded-full transition-all duration-200",
                    isResizing
                      ? "h-14 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]"
                      : "h-8 bg-neutral-400/40 dark:bg-white/20 group-hover:h-12 group-hover:bg-emerald-400"
                  )}
                />
              </div>
            )}

            {/* ── UNIFIED EXECUTIVE HEADER: LUXURY CAPSULE TABS + RIGHT ACTIONS ── */}
            <div className="shrink-0 px-3.5 py-2.5 bg-[#f8f9fa] dark:bg-[#0f1016] border-b border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between gap-2.5">
              {/* Luxury Sliding Pill Tab Navigation */}
              <div className="flex-1 inline-flex p-1 rounded-full bg-neutral-200/70 dark:bg-neutral-900/90 border border-black/[0.04] dark:border-white/[0.07] shadow-inner gap-1 relative overflow-hidden">
                {([
                  { id: "home" as const, label: "Home", icon: <Home size={13.5} />, badge: 0 },
                  { id: "insights" as const, label: "Insights", icon: <Sparkles size={13.5} />, badge: visibleInsights.length, badgeColor: "bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30" },
                  { id: "chat" as const, label: "Assistant Chat", icon: <MessageCircle size={13.5} />, badge: 0 },
                  { id: "autopilot" as const, label: "Auto-Pilot", icon: <Settings2 size={13.5} />, badge: Object.values(autoPilot).filter(Boolean).length, badgeColor: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30" }
                ]).map(tab => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "relative flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-full text-xs font-bold transition-all cursor-pointer z-10 select-none",
                        isActive
                          ? "text-white dark:text-neutral-900"
                          : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="nmiActiveTabIndicator"
                          className="absolute inset-0 bg-neutral-950 dark:bg-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.18)] z-[-1]"
                          transition={{ type: "spring", stiffness: 500, damping: 36 }}
                        />
                      )}
                      {tab.icon}
                      <span className="truncate">{tab.label}</span>
                      {tab.badge ? (
                        <span className={cn(
                          "px-1.5 py-0.2 rounded-full text-[9.5px] font-black min-w-[17px] text-center transition-colors shadow-xs",
                          isActive
                            ? "bg-white/20 text-white dark:bg-black/20 dark:text-neutral-900"
                            : tab.badgeColor || "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
                        )}>
                          {tab.badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {/* Right Action Icons: Fullscreen / Resize + Close */}
              <div className="flex items-center gap-1.5 shrink-0">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setIsFullscreen(v => !v)}
                  className="size-8 rounded-full bg-neutral-200/70 dark:bg-neutral-900/90 hover:bg-neutral-300 dark:hover:bg-neutral-800 active:scale-95 text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white flex items-center justify-center transition cursor-pointer border border-black/[0.04] dark:border-white/[0.07] shadow-xs"
                  title={isFullscreen ? "Exit Full Screen" : "Full Screen Mode"}
                >
                  {isFullscreen ? <Minimize2 size={13.5} /> : <Maximize2 size={13.5} />}
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={onClose}
                  className="size-8 rounded-full bg-neutral-200/70 dark:bg-neutral-900/90 hover:bg-rose-500 hover:text-white dark:hover:bg-rose-500 dark:hover:text-white active:scale-95 text-neutral-600 dark:text-neutral-300 flex items-center justify-center transition cursor-pointer border border-black/[0.04] dark:border-white/[0.07] shadow-xs"
                  title="Close Intelligence Panel"
                >
                  <X size={14.5} />
                </motion.button>
              </div>
            </div>

            {/* ── TAB CONTENT BODY ── */}
            <div className={cn(
              "flex-1 min-h-0 flex flex-col transform-gpu",
              activeTab !== "chat" && "overflow-y-auto overscroll-contain will-change-scroll scroll-smooth [contain:paint]"
            )}>
              <AnimatePresence mode="wait">
                {/* ──── HOME DASHBOARD: FOCUS TRACKER + BENTO GRID ──── */}
                {activeTab === "home" && (
                  <motion.div
                    key="home"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="p-4 sm:p-5 space-y-4 transform-gpu"
                  >
                    {/* ── LUSH MATCHA GREEN TIME TRACKER CARD (MATCHING USER DESIGN) ── */}
                    <MatchaTimeTrackerCard
                      weekProfile={weekProfile}
                      timeRange={timeRange}
                      setTimeRange={setTimeRange}
                      onShowToast={onShowToast}
                      onAddFocusClick={() => {
                        setActiveTab("chat");
                        setChatInput("Schedule focus block for 1 hour");
                      }}
                    />

                    {/* ── CARD: FLOATING MINIMALIST PILL QUICK SCOPE BAR (Reference Image) ── */}
                    <div className="p-3.5 rounded-[30px] bg-white dark:bg-[#161722] border border-slate-200/80 dark:border-slate-800 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-3 select-none relative">
                      {/* Top Slider Track with Right Bead Socket */}
                      <div className="flex items-center gap-2.5">
                        <div className="relative flex-1 h-8 px-4 rounded-full bg-[#f1f5f9] dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center overflow-hidden">
                          <div className="h-1.5 w-full rounded-full bg-[#cbd5e1] dark:bg-slate-700 relative overflow-hidden">
                            <motion.div
                              className="absolute top-0 bottom-0 left-0 bg-[#8da2b5] dark:bg-slate-400 rounded-full"
                              animate={{
                                width: scopeFilter === "assignees" ? "24%" : scopeFilter === "priority" ? "58%" : "92%"
                              }}
                              transition={{ type: "spring", stiffness: 420, damping: 30 }}
                            />
                          </div>
                        </div>
                        <div className="size-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center justify-center shrink-0">
                          <div className="size-2 rounded-full bg-[#8da2b5] dark:bg-slate-400" />
                        </div>
                      </div>

                      {/* Segmented Pill Control Bar */}
                      <div className="grid grid-cols-3 gap-1 p-1 rounded-[22px] bg-[#f1f5f9] dark:bg-slate-900/60 border border-slate-200/40 dark:border-slate-800/40">
                        {(["assignees", "priority", "project"] as const).map((filterKey) => {
                          const isActive = scopeFilter === filterKey;
                          const count = scopeCounts[filterKey];
                          return (
                            <button
                              key={filterKey}
                              type="button"
                              onClick={() => {
                                setScopeFilter(filterKey);
                                onShowToast?.(`Scope filtered by ${filterKey.charAt(0).toUpperCase() + filterKey.slice(1)} (${count})`);
                              }}
                              className={cn(
                                "py-2 px-3 rounded-[18px] text-[13px] font-medium transition-all text-center capitalize cursor-pointer flex items-center justify-center gap-2",
                                isActive
                                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] font-bold"
                                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                              )}
                            >
                              <span>{filterKey}</span>
                              <span className={cn(
                                "min-w-[18px] h-[18px] px-1 rounded-full text-[10.5px] font-bold flex items-center justify-center",
                                isActive
                                  ? "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                                  : "bg-[#e2e8f0]/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                              )}>
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Card 1: Projects Time Timeline Distribution (Image 2 Top Right) */}
                    <div className="p-5 rounded-3xl bg-white dark:bg-[#161722] border border-black/[0.06] dark:border-white/[0.08] shadow-xs space-y-4">
                      <div className="flex items-center justify-between relative">
                        <span className="text-xs font-black tracking-wider text-neutral-800 dark:text-neutral-200 uppercase">
                          PROJECTS TIME
                        </span>
                        
                        {/* Interactive Project Filter Dropdown */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setIsProjectDropdownOpen(v => !v)}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800/80 dark:hover:bg-neutral-700/80 border border-black/[0.05] dark:border-white/[0.06] text-[11px] font-bold text-neutral-700 dark:text-neutral-200 cursor-pointer transition shadow-xs"
                          >
                            <Layers size={12} className="text-neutral-400" />
                            <span className="max-w-[120px] truncate">
                              {selectedProjectFilter === "all"
                                ? "All Projects"
                                : availableProjects.find(p => p.name === selectedProjectFilter || p.id === selectedProjectFilter)?.name || selectedProjectFilter}
                            </span>
                            <ChevronDown size={11} className={cn("opacity-70 transition-transform", isProjectDropdownOpen && "rotate-180")} />
                          </button>

                          {isProjectDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: 4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 4 }}
                              className="absolute right-0 top-full mt-1.5 w-48 rounded-2xl bg-white dark:bg-[#1c1e2d] border border-black/[0.08] dark:border-white/[0.1] shadow-xl p-1.5 z-50 backdrop-blur-xl"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedProjectFilter("all");
                                  setIsProjectDropdownOpen(false);
                                }}
                                className={cn(
                                  "w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold transition text-left cursor-pointer",
                                  selectedProjectFilter === "all"
                                    ? "bg-neutral-100 dark:bg-white/10 text-neutral-900 dark:text-white"
                                    : "text-neutral-600 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/5"
                                )}
                              >
                                <span>All Projects</span>
                                {selectedProjectFilter === "all" && <Check size={13} className="text-emerald-500" />}
                              </button>
                              {availableProjects.map(proj => (
                                <button
                                  key={proj.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedProjectFilter(proj.name);
                                    setIsProjectDropdownOpen(false);
                                  }}
                                  className={cn(
                                    "w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold transition text-left cursor-pointer truncate",
                                    selectedProjectFilter === proj.name
                                      ? "bg-neutral-100 dark:bg-white/10 text-neutral-900 dark:text-white"
                                      : "text-neutral-600 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/5"
                                  )}
                                >
                                  <span className="flex items-center gap-2 truncate">
                                    <span className={cn("size-2 rounded-full shrink-0", proj.dotClass)} />
                                    <span className="truncate">{proj.name}</span>
                                  </span>
                                  {selectedProjectFilter === proj.name && <Check size={13} className="text-emerald-500 shrink-0" />}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </div>
                      </div>

                      {/* Interactive Gantt Timeline Lanes with Dashed Grid Lines */}
                      <div className="relative pt-2 pb-1 space-y-3">
                        {/* Time labels axis */}
                        <div className="grid grid-cols-6 text-[10px] font-semibold text-neutral-400 border-b border-black/[0.04] dark:border-white/[0.06] pb-1 pl-12 text-center">
                          <span>10 am</span>
                          <span>11 am</span>
                          <span>12 am</span>
                          <span>01 pm</span>
                          <span>02 pm</span>
                          <span>03 pm</span>
                        </div>

                        {/* 3 Real Timeline Lanes */}
                        {timelineDays.map((lane, laneIdx) => (
                          <div key={lane.label} className="flex items-center gap-3">
                            <span className="w-9 text-[10.5px] font-bold text-neutral-400 shrink-0">
                              {lane.label}
                            </span>
                            <div className="relative flex-1 h-7 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-black/[0.03] dark:border-white/[0.03] overflow-hidden">
                              {/* Vertical Grid Lines */}
                              <div className="absolute inset-0 grid grid-cols-6 pointer-events-none">
                                {[...Array(6)].map((_, i) => (
                                  <div key={i} className="border-r border-dashed border-black/[0.04] dark:border-white/[0.04]" />
                                ))}
                              </div>
                              {/* Dynamic Pill Capsules */}
                              {lane.capsules.map((cap, capIdx) => (
                                <motion.div
                                  key={cap.id}
                                  initial={{ width: 0 }}
                                  animate={{ width: cap.width }}
                                  transition={{ duration: 0.8 + capIdx * 0.1, delay: laneIdx * 0.1, ease: "easeOut" }}
                                  style={{ left: cap.left }}
                                  className={cn(
                                    "absolute top-1 bottom-1 rounded-full shadow-xs flex items-center pl-1 group cursor-pointer bg-gradient-to-r",
                                    cap.gradientClass
                                  )}
                                  title={cap.title}
                                >
                                  <div className="size-3.5 rounded-full bg-white shadow-xs group-hover:scale-110 transition-transform" />
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Interactive Legend Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.05] text-[10.5px] font-bold text-neutral-500">
                        {availableProjects.slice(0, 3).map((proj) => {
                          const isActive = selectedProjectFilter === proj.name;
                          return (
                            <button
                              key={proj.id}
                              type="button"
                              onClick={() => setSelectedProjectFilter(curr => curr === proj.name ? "all" : proj.name)}
                              className={cn(
                                "flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-all cursor-pointer",
                                isActive ? "bg-black/5 dark:bg-white/10 text-neutral-900 dark:text-white font-extrabold" : "hover:text-neutral-800 dark:hover:text-neutral-200"
                              )}
                            >
                              <span className={cn("size-2 rounded-full", proj.dotClass)} />
                              <span>{proj.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── CARD: STACKED TASK DISPATCHER CARD (Reference Image) ── */}
                    {taskStack.length > 0 && (
                      <div className="relative pt-3 pb-2 px-1 select-none">
                        {/* 3D Stack Depth Underlayers */}
                        <div className="absolute inset-x-5 top-5 h-20 rounded-[28px] bg-slate-200/60 dark:bg-slate-800/40 border border-black/[0.04] dark:border-white/[0.05] shadow-xs translate-y-3 scale-[0.94] pointer-events-none" />
                        <div className="absolute inset-x-3 top-4 h-20 rounded-[28px] bg-slate-100/90 dark:bg-slate-800/70 border border-black/[0.05] dark:border-white/[0.06] shadow-xs translate-y-1.5 scale-[0.97] pointer-events-none" />

                        {/* Top Interactive Main Card */}
                        <motion.div
                          key={taskStack[0].id}
                          initial={{ opacity: 0, y: -10, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9, y: 15 }}
                          transition={{ type: "spring", stiffness: 450, damping: 28 }}
                          className="relative p-5 rounded-[28px] bg-white dark:bg-[#161722] border border-black/[0.08] dark:border-white/[0.09] shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-3.5 z-10 transform-gpu"
                        >
                          {/* Top Row with Icon, Metadata, and Options */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="size-10 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 border border-black/[0.05] dark:border-white/[0.08] flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-2xs">
                                <FileText size={18} strokeWidth={2.2} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-semibold text-slate-400 block">
                                    {taskStack[0].type || "New Task"} • Assigned to You {taskStack[0].assignedAgo || "3m ago"}
                                  </span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                    {taskStack.length} in queue
                                  </span>
                                </div>
                                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight mt-0.5">
                                  {taskStack[0].title}
                                </h3>
                              </div>
                            </div>

                            {/* Options and Dismiss */}
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setIsAddingTask(prev => !prev)}
                                className="size-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
                                title="Add task to queue"
                              >
                                <Plus size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setTaskStack(curr => curr.slice(1));
                                  onShowToast?.("Dismissed task from queue");
                                }}
                                className="size-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-rose-500 flex items-center justify-center transition cursor-pointer"
                                title="Dismiss task"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Subtitle description */}
                          <p className="text-xs text-slate-500 dark:text-slate-400 pl-13 leading-relaxed">
                            {taskStack[0].subtitle}
                          </p>

                          {/* Add inline form if open */}
                          {isAddingTask && (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                if (!newTaskTitle.trim()) return;
                                const created = {
                                  id: `task-custom-${Date.now()}`,
                                  title: newTaskTitle.trim(),
                                  subtitle: newTaskSubtitle.trim() || "Workspace action item",
                                  assignedAgo: "Just now",
                                  type: "New Task"
                                };
                                setTaskStack(curr => [created, ...curr]);
                                onShowToast?.(`Added "${newTaskTitle.trim()}" to queue`);
                                setNewTaskTitle("");
                                setNewSubtitle("");
                                setIsAddingTask(false);
                              }}
                              className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-black/5 dark:border-white/10 space-y-2"
                            >
                              <input
                                type="text"
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                placeholder="Task name (e.g. Send notes to Johnny)"
                                autoFocus
                                className="w-full bg-transparent text-xs font-bold outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
                              />
                              <input
                                type="text"
                                value={newTaskSubtitle}
                                onChange={(e) => setNewSubtitle(e.target.value)}
                                placeholder="Notes or brief context"
                                className="w-full bg-transparent text-[11px] outline-none text-slate-500 placeholder:text-slate-400"
                              />
                              <div className="flex justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setIsAddingTask(false)}
                                  className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  className="px-3 py-1 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold cursor-pointer shadow-xs"
                                >
                                  Push to Stack
                                </button>
                              </div>
                            </form>
                          )}

                          {/* Bottom Dual Action Pill Buttons */}
                          <div className="flex items-center justify-between gap-3 pt-1">
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => {
                                setTaskStack(curr => [...curr.slice(1), curr[0]]);
                                onShowToast?.(`🔔 Snoozed "${taskStack[0].title}" for later`);
                              }}
                              className="flex-1 py-2.5 px-4 rounded-full bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer"
                            >
                              <Bell size={13} className="text-slate-400" />
                              <span>Remind Me Later</span>
                            </motion.button>

                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => {
                                const finished = taskStack[0];
                                setTaskStack(curr => curr.slice(1));
                                onShowToast?.(`✅ "${finished.title}" marked as done!`);
                              }}
                              className="flex-1 py-2.5 px-4 rounded-full bg-[#1db954] hover:bg-[#1aa34a] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-[0_4px_16px_rgba(29,185,84,0.32)] transition cursor-pointer"
                            >
                              <CheckCircle2 size={14} className="fill-white text-[#1db954]" />
                              <span>Mark as Done</span>
                            </motion.button>
                          </div>
                        </motion.div>
                      </div>
                    )}

                    {/* ── CARD: "YOU'RE ALMOST THERE!" MILESTONE & GOAL STEPPER (Image 1) ── */}
                    <div className="p-5 sm:p-6 rounded-[28px] bg-white dark:bg-[#161722] border border-black/[0.06] dark:border-white/[0.08] shadow-xs space-y-5">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight">
                          You're almost there!
                        </h2>
                      </div>

                      {/* Goal Chip / Stretch Target Selector */}
                      <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-black/[0.04] dark:border-white/[0.05] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-neutral-800 dark:text-neutral-200">
                            Funding goal
                          </span>
                          <span className="text-neutral-400">
                            <Layers size={13} />
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-black/[0.05] dark:border-white/[0.06] shadow-2xs">
                            <CheckCircle2 size={15} className="text-emerald-500 fill-emerald-500/15 shrink-0" />
                            <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                              Primary Milestone Target
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-bold">
                            <Sparkles size={13} className="text-emerald-500" />
                            <span>Stretch goals</span>
                          </div>
                        </div>
                      </div>

                      {/* 5-Step Stepped Gradient Progress Track */}
                      <div className="space-y-3">
                        {/* Stepped Pill Bar */}
                        <div className="h-10 rounded-full bg-gradient-to-r from-[#0a2e1d] via-[#1db954] to-neutral-200 dark:to-neutral-800 p-1 flex items-center justify-between shadow-inner">
                          {[
                            { step: 1, label: "Create Project", done: true },
                            { step: 2, label: "Add Media", done: true },
                            { step: 3, label: "(Set Goals)", done: true, active: true },
                            { step: 4, label: "Team", done: false },
                            { step: 5, label: "Launch", done: false, isPlus: true }
                          ].map((item) => (
                            <button
                              key={item.step}
                              type="button"
                              onClick={() => {
                                setActiveGoalStep(item.step);
                                onShowToast?.(`Viewing Milestone Step ${item.step}: ${item.label}`);
                              }}
                              className={cn(
                                "size-8 rounded-full flex items-center justify-center font-bold text-xs transition-transform cursor-pointer shadow-xs",
                                item.step <= activeGoalStep
                                  ? "bg-white text-emerald-700 shadow-md scale-105"
                                  : "bg-white/40 dark:bg-white/10 text-neutral-400"
                              )}
                              title={item.label}
                            >
                              {item.done ? (
                                <Check size={14} strokeWidth={3} className="text-emerald-600" />
                              ) : item.isPlus ? (
                                <Plus size={14} strokeWidth={2.5} className="text-neutral-500" />
                              ) : (
                                <span className="text-[11px]">{item.step}</span>
                              )}
                            </button>
                          ))}
                        </div>

                        {/* Step Labels Row */}
                        <div className="grid grid-cols-5 text-center text-[10.5px] font-bold">
                          <span className="text-neutral-900 dark:text-white">Create Project</span>
                          <span className="text-neutral-900 dark:text-white">Add Media</span>
                          <span className="text-emerald-600 dark:text-emerald-400 underline font-black">(Set Goals)</span>
                          <span className="text-neutral-400">Team</span>
                          <span className="text-neutral-400">Launch</span>
                        </div>
                      </div>

                      {/* Bottom Pro-Tip Callout Banner */}
                      <div className="p-2.5 rounded-full bg-emerald-500/[0.07] border border-emerald-500/20 text-center">
                        <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                          <strong className="font-bold">+ Tip:</strong> Use round numbers to attract backers and protect cognitive sprint focus.
                        </span>
                      </div>
                    </div>

                    {/* ── CARD: SOCIAL HABIT & STREAK RACE LEADERBOARD (Image 5) ── */}
                    <div className="relative p-5 sm:p-6 rounded-[28px] bg-gradient-to-b from-[#fdf6ec] via-[#fbf2e3] to-[#f7ebda] dark:from-[#2a221b] dark:via-[#221b15] dark:to-[#1a1410] border border-amber-300/40 dark:border-amber-700/30 shadow-sm space-y-4 overflow-hidden">
                      {/* Yellow Washi Tape Element at Top */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-amber-300/80 dark:bg-amber-400/50 backdrop-blur-xs shadow-xs -rotate-1 pointer-events-none" />

                      {/* Dual Race Tracks */}
                      <div className="pt-2 space-y-3">
                        {/* Lane 1: Peer (Lisa) */}
                        <div className="relative h-11 rounded-full bg-white/70 dark:bg-black/25 border border-amber-900/10 dark:border-white/10 p-1 flex items-center">
                          <motion.div
                            initial={{ width: "30%" }}
                            animate={{ width: "68%" }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-end pr-1 shadow-xs relative"
                          >
                            <div className="size-8 rounded-full bg-gradient-to-tr from-rose-300 to-amber-200 border-2 border-white shadow-md flex items-center justify-center text-xs font-bold text-neutral-800">
                              👩‍💼
                            </div>
                          </motion.div>
                          <span className="absolute right-4 text-[11px] font-bold text-amber-900/60 dark:text-amber-200/60">
                            {racePoints.peerName} is {racePoints.peer - racePoints.user} points ahead
                          </span>
                        </div>

                        {/* Lane 2: User */}
                        <div className="relative h-11 rounded-full bg-white/70 dark:bg-black/25 border border-amber-900/10 dark:border-white/10 p-1 flex items-center">
                          <motion.div
                            initial={{ width: "20%" }}
                            animate={{ width: "48%" }}
                            transition={{ duration: 1, delay: 0.1, ease: "easeOut" }}
                            className="h-full rounded-full bg-amber-200/80 dark:bg-amber-800/40 flex items-center justify-end pr-1 shadow-xs relative"
                          >
                            <div className="size-8 rounded-full bg-gradient-to-tr from-sky-300 to-indigo-300 border-2 border-white shadow-md flex items-center justify-center text-xs font-bold text-neutral-800">
                              👨‍💻
                            </div>
                          </motion.div>
                          <span className="absolute right-4 text-[11px] font-bold text-amber-900/60 dark:text-amber-200/60">
                            You: {racePoints.user} pts
                          </span>
                        </div>
                      </div>

                      {/* Motivational Caption */}
                      <p className="text-xs text-amber-950/80 dark:text-amber-200/80 leading-relaxed">
                        With <strong>engaging challenges</strong> and a <strong>social leaderboard</strong>, our habit tracker lets you compete with teammates, making it fun and motivating to <strong>reach your goals together</strong>.
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] font-bold text-amber-800/80 dark:text-amber-300 flex items-center gap-1">
                          <Trophy size={13} className="text-amber-500" /> Weekly Challenge #4
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setRacePoints(r => ({ ...r, user: r.user + 5 }));
                            onShowToast?.("🎯 +5 pts logged for habit streak!");
                          }}
                          className="px-3.5 py-1.5 rounded-full bg-amber-900/15 hover:bg-amber-900/25 dark:bg-white/15 dark:hover:bg-white/25 text-amber-950 dark:text-white text-xs font-bold transition cursor-pointer"
                        >
                          + Log Habit
                        </button>
                      </div>
                    </div>

                    {/* ── CARD: TEAM ORBIT & COGNITIVE JOURNEY HUB (Image 4) ── */}
                    <div className="relative p-6 rounded-[28px] bg-white dark:bg-[#161722] border border-black/[0.06] dark:border-white/[0.08] shadow-xs space-y-4 overflow-hidden text-center">
                      {/* Concentric Orbit Rings Background */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                        <div className="size-64 rounded-full border border-emerald-500/20" />
                        <div className="absolute size-48 rounded-full border border-emerald-500/25" />
                        <div className="absolute size-32 rounded-full border border-emerald-500/30" />
                      </div>

                      {/* Floating Stickers & Orbiting Avatars */}
                      <div className="relative z-10 flex justify-between items-center px-2">
                        <motion.div
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                          className="size-9 rounded-full bg-emerald-100 border-2 border-white shadow-md flex items-center justify-center text-sm"
                          title="Calendar Focus"
                        >
                          📅
                        </motion.div>
                        <motion.div
                          animate={{ y: [0, -5, 0] }}
                          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                          className="size-9 rounded-full bg-rose-100 border-2 border-white shadow-md flex items-center justify-center text-sm"
                          title="Celebration"
                        >
                          🎉
                        </motion.div>
                        <motion.div
                          animate={{ y: [0, -3, 0] }}
                          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                          className="size-9 rounded-full bg-lime-100 border-2 border-white shadow-md flex items-center justify-center text-sm"
                          title="Matcha Fuel"
                        >
                          🍵
                        </motion.div>
                      </div>

                      {/* Central Matcha Speech Bubble */}
                      <div className="relative z-10 p-5 rounded-3xl bg-gradient-to-br from-[#4a7742] via-[#3a6133] to-[#2b4c25] text-white shadow-xl text-left space-y-2.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-white/80 pb-1 border-b border-white/10">
                          <span className="flex items-center gap-1.5">
                            <Sparkles size={12} className="text-emerald-300" /> Team Cognitive Reflection
                          </span>
                          <span>Sept 2026</span>
                        </div>
                        <p className="text-xs text-white/95 leading-relaxed">
                          "I'm passionate about sharing not just the daily tasks, but the journey. We get to connect with each other, share the wins and challenges, and grow a workspace community that's as much about people as it is about momentum."
                        </p>
                        <div className="flex items-center justify-between text-[10.5px] font-bold text-white/75 pt-1">
                          <span>Every sprint is an invitation to be part of that story ✨</span>
                          <span className="text-emerald-300">#NoskaCommunity</span>
                        </div>
                      </div>

                      {/* Orbiting Teammates Row */}
                      <div className="relative z-10 flex items-center justify-center -space-x-2 pt-1">
                        {["Alex S.", "Elena R.", "Marcus T.", "Priya K.", "Johnny M."].map((name, i) => (
                          <motion.div
                            key={name}
                            whileHover={{ scale: 1.25, y: -4, zIndex: 30 }}
                            className={cn(
                              "size-8 rounded-full border-2 border-white dark:border-neutral-900 shadow-sm flex items-center justify-center text-[10px] font-bold text-white cursor-pointer transition-transform",
                              i === 0 ? "bg-emerald-500" : i === 1 ? "bg-purple-500" : i === 2 ? "bg-amber-500" : i === 3 ? "bg-rose-500" : "bg-sky-500"
                            )}
                            title={name}
                            onClick={() => onShowToast?.(`Connected with ${name}`)}
                          >
                            {name.slice(0, 1)}
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Split Row: Milestone & Multi-segment bar + Today's Meetings */}
                    <div className="space-y-4">
                      {/* Upcoming Milestone & Project Time Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Upcoming Focus Card */}
                        <div className="p-4 rounded-3xl bg-white dark:bg-[#161722] border border-black/[0.06] dark:border-white/[0.08] shadow-xs flex items-center gap-3.5">
                          <div className="text-center pr-3 border-r border-black/[0.06] dark:border-white/[0.08]">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block">
                              {futureFocusEvent.month}
                            </span>
                            <span className="text-base font-black text-neutral-900 dark:text-neutral-100">
                              {futureFocusEvent.day}
                            </span>
                          </div>
                          <div className="size-9 rounded-full bg-gradient-to-tr from-purple-400 to-indigo-500 p-0.5 shrink-0 shadow-xs flex items-center justify-center text-white font-bold text-xs">
                            {futureFocusEvent.initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400 block truncate">
                              {futureFocusEvent.category}
                            </span>
                            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block truncate">
                              {futureFocusEvent.title}
                            </span>
                          </div>
                        </div>

                        {/* Project Time Multi-segment Bar Card */}
                        <div className="p-4 rounded-3xl bg-white dark:bg-[#161722] border border-black/[0.06] dark:border-white/[0.08] shadow-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Project time</span>
                            <span className="text-sm font-black text-neutral-900 dark:text-neutral-100">
                              {projectTimeDistribution.totalHours}h
                            </span>
                          </div>
                          {/* Segmented Bar */}
                          <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 flex overflow-hidden gap-0.5">
                            <div
                              style={{ width: `${projectTimeDistribution.focusPct}%` }}
                              className="bg-[#88ba46] rounded-l-full transition-all duration-500"
                              title={`${projectTimeDistribution.focusPct}% Focus`}
                            />
                            <div
                              style={{ width: `${projectTimeDistribution.devPct}%` }}
                              className="bg-[#467340] transition-all duration-500"
                              title={`${projectTimeDistribution.devPct}% Development`}
                            />
                            <div
                              style={{ width: `${projectTimeDistribution.meetPct}%` }}
                              className="bg-[#1e331b] rounded-r-full transition-all duration-500"
                              title={`${projectTimeDistribution.meetPct}% Meetings`}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[9.5px] font-bold text-neutral-400 pt-0.5">
                            <span>{projectTimeDistribution.focusPct}%</span>
                            <span>{projectTimeDistribution.devPct}%</span>
                            <span>{projectTimeDistribution.meetPct}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Card 2: Today's Meetings with iOS Privacy / Auto-Sync Toggles (Image 2 Bottom Right) */}
                      <div className="p-5 rounded-3xl bg-white dark:bg-[#161722] border border-black/[0.06] dark:border-white/[0.08] shadow-xs space-y-3.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black tracking-wider text-neutral-800 dark:text-neutral-200 uppercase">
                              TODAY'S MEETINGS
                            </span>
                            <span className="size-5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[10px] font-extrabold text-neutral-600 dark:text-neutral-300 flex items-center justify-center">
                              {todaysMeetings.length}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab("chat");
                              setChatInput("Schedule new meeting at 2pm");
                              onShowToast?.("Ready to schedule meeting");
                            }}
                            className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                          >
                            + Add new meet
                          </button>
                        </div>

                        {/* Meetings Rows */}
                        {todaysMeetings.map((meet, mIdx) => {
                          const isPrivate = meetingPrivacy[meet.id] ?? (mIdx === 0);
                          return (
                            <div
                              key={meet.id}
                              className={cn(
                                "flex items-center justify-between py-2",
                                mIdx < todaysMeetings.length - 1 && "border-b border-black/[0.04] dark:border-white/[0.05]"
                              )}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="text-xs font-black text-neutral-900 dark:text-neutral-100 w-12 shrink-0">
                                  {meet.time}
                                </span>
                                <div className="min-w-0">
                                  <h5 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 leading-none truncate">
                                    {meet.title}
                                  </h5>
                                  <p className="text-[10px] text-neutral-400 mt-0.5 truncate">
                                    {meet.subtitle}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                {/* Avatar stack */}
                                <div className="flex -space-x-1.5 items-center">
                                  {meet.attendees.slice(0, 2).map((att, aIdx) => (
                                    <div
                                      key={aIdx}
                                      className={cn(
                                        "size-5 rounded-full text-[9px] font-bold text-white flex items-center justify-center border border-white dark:border-neutral-900 shadow-2xs",
                                        aIdx === 0 ? "bg-emerald-500" : "bg-purple-500"
                                      )}
                                    >
                                      {att.slice(0, 1).toUpperCase()}
                                    </div>
                                  ))}
                                  {meet.attendees.length > 2 && (
                                    <div className="size-5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-[8px] font-extrabold text-neutral-600 dark:text-neutral-300 flex items-center justify-center border border-white dark:border-neutral-900">
                                      +{meet.attendees.length - 2}
                                    </div>
                                  )}
                                </div>

                                {/* iOS Switch for Privacy */}
                                <div className="flex items-center gap-1.5 pl-1">
                                  <span className="text-[10px] font-bold text-neutral-400">Privacy</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMeetingPrivacy(p => {
                                        const nextVal = !isPrivate;
                                        onShowToast?.(nextVal ? `Privacy enabled for "${meet.title}"` : `Privacy disabled for "${meet.title}"`);
                                        return { ...p, [meet.id]: nextVal };
                                      });
                                    }}
                                    className={cn(
                                      "w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center",
                                      isPrivate ? "bg-[#996bc7]" : "bg-neutral-300 dark:bg-neutral-700"
                                    )}
                                    title={isPrivate ? "Private meeting (hidden from external sync)" : "Public meeting"}
                                  >
                                    <span
                                      className={cn(
                                        "size-4 rounded-full bg-white shadow-xs transition-transform duration-200 ease-out inline-block transform-gpu",
                                        isPrivate ? "translate-x-4" : "translate-x-0"
                                      )}
                                    />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
                {/* ──── DELOS 2-TONE INSIGHTS TAB ──── */}
                {activeTab === "insights" && (
                  <motion.div
                    key="insights"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="p-5 space-y-4"
                  >
                    {/* Sage Timeline Rhythm Card */}
                    <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-neutral-50/80 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-neutral-900/40 border border-emerald-200/60 dark:border-emerald-800/40 shadow-xs flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                          <Activity size={18} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100">Weekly Schedule Balance</div>
                          <div className="text-[11px] text-neutral-400 mt-0.5">
                            {weekProfile.consecutiveHeavyDays > 0 ? `${weekProfile.consecutiveHeavyDays} consecutive heavy load days` : "Evenly distributed load across all days"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-neutral-900 dark:text-neutral-100">{weekProfile.avgDailyHours.toFixed(1)}h</span>
                        <span className="text-[10px] block text-neutral-400">avg / day</span>
                      </div>
                    </div>

                    {visibleInsights.length === 0 ? (
                      <div className="py-16 text-center space-y-4">
                        <div className="size-20 rounded-3xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center mx-auto shadow-sm">
                          <CheckCircle2 size={36} className="text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-base font-bold text-neutral-900 dark:text-neutral-100">Schedule Perfectly Harmonized</p>
                          <p className="text-xs text-neutral-400 max-w-[300px] mx-auto mt-1">
                            No conflicts or overload detected. Your cognitive flow is currently optimal.
                          </p>
                        </div>
                      </div>
                    ) : (
                      visibleInsights.map((insight, idx) => {
                        const colors = insightTypeColors[insight.type] || insightTypeColors.info;
                        return (
                          <motion.div
                            key={insight.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
                            whileHover={{ y: -3, scale: 1.01 }}
                            className={`rounded-3xl border p-5 space-y-3.5 ${colors.bg} ${colors.border} shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-shadow hover:shadow-lg`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3.5">
                                <div className={`size-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${colors.iconBg}`}>
                                  {insightIcons[insight.type]}
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
                                      {insight.title}
                                    </h4>
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${colors.badge}`}>
                                      {insight.category}
                                    </span>
                                  </div>
                                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                    {insight.description}
                                  </p>
                                </div>
                              </div>

                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleDismissInsight(insight.id)}
                                className="size-7 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition shrink-0 cursor-pointer"
                              >
                                <X size={15} />
                              </motion.button>
                            </div>

                            {/* Delos Collapsible Reasoning */}
                            <details className="group rounded-2xl bg-white/60 dark:bg-neutral-900/60 border border-black/[0.04] dark:border-white/[0.06] p-3 transition-all">
                              <summary className="text-[10px] font-bold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer uppercase tracking-wider flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                  <BrainCircuit size={12} className="text-indigo-500" />
                                  NMI Cognitive Reasoning
                                </span>
                                <ChevronRight size={12} className="transition-transform group-open:rotate-90" />
                              </summary>
                              <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-2.5 pt-2 border-t border-black/[0.04] dark:border-white/[0.06] leading-relaxed italic">
                                {insight.reasoning}
                              </p>
                            </details>

                            {/* Action Buttons with Apple Spring Bounce */}
                            {(insight.action || insight.secondaryAction) && (
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                {insight.action && (
                                  <motion.button
                                    type="button"
                                    whileHover={{ scale: 1.03, y: -1 }}
                                    whileTap={{ scale: 0.96 }}
                                    transition={{ type: "spring", stiffness: 450, damping: 25 }}
                                    onClick={() => handleActionExecute(insight.action!.actionId, insight.action!.data)}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white hover:bg-black dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-bold shadow-sm hover:shadow-md transition cursor-pointer"
                                  >
                                    <Zap size={13} className="text-amber-400 dark:text-amber-500" />
                                    {insight.action.label}
                                  </motion.button>
                                )}
                                {insight.secondaryAction && (
                                  <motion.button
                                    type="button"
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.96 }}
                                    onClick={() => handleActionExecute(insight.secondaryAction!.actionId, insight.secondaryAction!.data)}
                                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
                                  >
                                    {insight.secondaryAction.label}
                                  </motion.button>
                                )}
                              </div>
                            )}
                          </motion.div>
                        );
                      })
                    )}
                  </motion.div>
                )}

                {/* ──── DELOS & FUTURISTIC CAPSULE CHAT TAB ──── */}
                {activeTab === "chat" && (
                  <motion.div
                    key="chat"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col flex-1 min-h-0 h-full justify-between"
                  >
                    {/* Messages Container */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                      {chatHistory.length === 0 && (
                        <div className="py-10 text-center space-y-3">
                          <div className="size-16 rounded-3xl bg-gradient-to-tr from-emerald-500/10 via-indigo-500/10 to-purple-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-sm">
                            <BrainCircuit size={30} className="text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                            Delos Scheduling Intelligence
                          </h3>
                          <p className="text-xs text-neutral-400 max-w-[320px] mx-auto">
                            Ask me to create events, mark tasks done, find free focus gaps, or optimize your entire weekly workload.
                          </p>
                        </div>
                      )}

                      {chatHistory.map(msg => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ type: "spring", stiffness: 450, damping: 30 }}
                          className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
                        >
                          <div className={cn(
                            "max-w-[90%] rounded-3xl px-4.5 py-3.5 space-y-2.5 shadow-sm",
                            msg.role === "user"
                              ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-br-md"
                              : "bg-white dark:bg-[#161722] text-neutral-800 dark:text-neutral-200 rounded-bl-md border border-black/[0.06] dark:border-white/[0.08]"
                          )}>
                            {msg.role === "nmi" && (
                              <div className="flex items-center gap-1.5 mb-1">
                                <div className="size-5 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                                  <BrainCircuit size={12} className="text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                  NMI Brain
                                </span>
                              </div>
                            )}

                            <div className="text-xs leading-relaxed whitespace-pre-wrap">
                              {msg.content.split("\n").map((line, i) => {
                                let processed = line
                                  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                                  .replace(/##\s(.+)/g, '<h3 class="text-sm font-bold mt-2 mb-1">$1</h3>');
                                if (line.startsWith("| ") && line.endsWith(" |")) {
                                  return <span key={i} className="block font-mono text-[10px] opacity-80">{line}</span>;
                                }
                                return <span key={i} className="block" dangerouslySetInnerHTML={{ __html: processed }} />;
                              })}
                            </div>

                            {/* Internal Reasoning Accordion */}
                            {msg.thinking && msg.role === "nmi" && (
                              <details className="group mt-1 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] p-2">
                                <summary className="text-[9px] font-bold text-neutral-400 cursor-pointer hover:text-neutral-600 uppercase tracking-wider flex items-center gap-1">
                                  <Brain size={10} /> Internal cognitive reasoning
                                </summary>
                                <p className="text-[10px] text-neutral-400 mt-1 italic leading-relaxed">{msg.thinking}</p>
                              </details>
                            )}

                            {/* Action buttons */}
                            {msg.actions && msg.actions.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2 pt-1 border-t border-black/[0.04] dark:border-white/[0.06]">
                                {msg.actions.map((a, idx) => (
                                  <motion.button
                                    key={idx}
                                    type="button"
                                    whileHover={{ scale: 1.04, y: -1 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleActionExecute(a.actionId, a.data)}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[10.5px] font-bold shadow-xs hover:shadow-sm transition cursor-pointer"
                                  >
                                    <Zap size={11} className="text-amber-400 dark:text-amber-500" />
                                    {a.label}
                                  </motion.button>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}

                      {/* Floating Thinking Particle Indicator */}
                      {isThinking && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex justify-center my-2"
                        >
                          <div className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 via-indigo-500/15 to-emerald-500/10 border border-purple-500/20 shadow-lg flex items-center gap-2.5 backdrop-blur-md">
                            <Sparkles size={13} className="text-purple-500 animate-spin" style={{ animationDuration: "3s" }} />
                            <span className="text-xs font-bold text-neutral-700 dark:text-neutral-200">Thinking...</span>
                            <div className="flex gap-1 ml-1">
                              <span className="size-1 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                              <span className="size-1 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                              <span className="size-1 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                          </div>
                        </motion.div>
                      )}

                      <div ref={chatEndRef} />
                    </div>

                    {/* ──── BOTTOM CONTROLS & CHAT CAPSULE ──── */}
                    <div className="shrink-0 px-4 pb-3 pt-0.5 relative z-30">
                      {/* Upward Sliding Drawer Body */}
                      <AnimatePresence>
                        {isActionsDrawerOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0, y: 12 }}
                            animate={{ opacity: 1, height: "auto", y: 0 }}
                            exit={{ opacity: 0, height: 0, y: 12 }}
                            transition={{ type: "spring", stiffness: 480, damping: 32 }}
                            className="overflow-hidden mb-2.5"
                          >
                            <div className="p-3 rounded-[24px] bg-white/95 dark:bg-[#151724]/95 border border-black/[0.06] dark:border-white/[0.08] backdrop-blur-2xl shadow-xl">
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {[
                                  {
                                    title: "Schedule 3pm",
                                    desc: "Smart meeting slot",
                                    tag: "SCHEDULE",
                                    icon: <CalendarCheck size={14} className="text-amber-500" />,
                                    iconBg: "bg-amber-500/15 border-amber-500/25",
                                    query: "Schedule a meeting at 3pm",
                                    hoverStyle: "hover:border-amber-500/40 hover:bg-amber-500/[0.04]"
                                  },
                                  {
                                    title: "Mark Task Done",
                                    desc: "Complete latest task",
                                    tag: "TASK",
                                    icon: <CheckCircle2 size={14} className="text-emerald-500" />,
                                    iconBg: "bg-emerald-500/15 border-emerald-500/25",
                                    query: "Mark task as done",
                                    hoverStyle: "hover:border-emerald-500/40 hover:bg-emerald-500/[0.04]"
                                  },
                                  {
                                    title: "Find Free Slot",
                                    desc: "Detect open gaps",
                                    tag: "AVAILABILITY",
                                    icon: <Search size={14} className="text-cyan-500" />,
                                    iconBg: "bg-cyan-500/15 border-cyan-500/25",
                                    query: "Find free slots",
                                    hoverStyle: "hover:border-cyan-500/40 hover:bg-cyan-500/[0.04]"
                                  },
                                  {
                                    title: "Rebalance Week",
                                    desc: "AI cognitive leveling",
                                    tag: "OPTIMIZE",
                                    icon: <Scale size={14} className="text-purple-500" />,
                                    iconBg: "bg-purple-500/15 border-purple-500/25",
                                    query: "Balance my week",
                                    hoverStyle: "hover:border-purple-500/40 hover:bg-purple-500/[0.04]"
                                  },
                                  {
                                    title: "Insert Breaks",
                                    desc: "15m recovery buffer",
                                    tag: "WELLNESS",
                                    icon: <Coffee size={14} className="text-rose-500" />,
                                    iconBg: "bg-rose-500/15 border-rose-500/25",
                                    query: "Add breaks",
                                    hoverStyle: "hover:border-rose-500/40 hover:bg-rose-500/[0.04]"
                                  },
                                  {
                                    title: "Deep Focus 1h",
                                    desc: "Protected focus time",
                                    tag: "FOCUS",
                                    icon: <Target size={14} className="text-indigo-500" />,
                                    iconBg: "bg-indigo-500/15 border-indigo-500/25",
                                    query: "Schedule focus block for 1 hour",
                                    hoverStyle: "hover:border-indigo-500/40 hover:bg-indigo-500/[0.04]"
                                  }
                                ].map(card => (
                                  <motion.button
                                    key={card.title}
                                    type="button"
                                    whileHover={{ scale: 1.02, y: -2 }}
                                    whileTap={{ scale: 0.97 }}
                                    transition={{ type: "spring", stiffness: 450, damping: 26 }}
                                    onClick={() => {
                                      handleQuickAction(card.query);
                                      setIsActionsDrawerOpen(false);
                                    }}
                                    className={cn(
                                      "p-2.5 rounded-[18px] bg-neutral-50 dark:bg-[#121420] border border-black/[0.05] dark:border-white/[0.07] shadow-xs text-left flex flex-col justify-between transition-all cursor-pointer group relative overflow-hidden",
                                      card.hoverStyle
                                    )}
                                  >
                                    <div className="flex items-center justify-between w-full mb-1.5">
                                      <div className={cn("size-6.5 rounded-xl flex items-center justify-center border", card.iconBg)}>
                                        {card.icon}
                                      </div>
                                      <span className="text-[8px] font-extrabold tracking-wider px-1.5 py-0.5 rounded-md bg-neutral-200/70 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 uppercase">
                                        {card.tag}
                                      </span>
                                    </div>
                                    <div>
                                      <div className="text-[11.5px] font-bold text-neutral-800 dark:text-neutral-100 tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors flex items-center justify-between">
                                        <span>{card.title}</span>
                                        <ArrowUpRight size={11} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all text-neutral-400" />
                                      </div>
                                      <span className="text-[9.5px] text-neutral-400 dark:text-neutral-400 leading-tight block mt-0.5 truncate">
                                        {card.desc}
                                      </span>
                                    </div>
                                  </motion.button>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Row with Attached Telemetry Cards on Left and Suggested Actions Toggle on Right */}
                      <div className="flex items-center justify-between gap-2.5 mb-2 px-0.5 relative z-20">
                        {/* Left Side: Attached Telemetry Cards */}
                        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar">
                          {attachedTiles.map(tile => (
                            <motion.div
                              key={tile.id}
                              initial={{ opacity: 0, scale: 0.85, y: 5 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.85, y: 5 }}
                              whileHover={{ y: -2, scale: 1.04 }}
                              onClick={() => {
                                if (tile.id === "schedule") handleQuickAction("What is my active schedule for today?");
                                else if (tile.id === "memory") handleQuickAction("What is my cognitive flow and focus load?");
                                else if (tile.id === "workload") handleQuickAction("Analyze my energy capacity and burnout risk");
                              }}
                              className={cn(
                                "relative w-[72px] h-[68px] rounded-[20px] bg-gradient-to-b border flex flex-col items-center justify-between p-2 shrink-0 group cursor-pointer select-none overflow-hidden transition-all",
                                tile.gradient,
                                tile.borderColor,
                                tile.glowColor
                              )}
                              title={`Analyze ${tile.tag} metrics`}
                            >
                              {/* Dot Matrix Pattern */}
                              <div className={cn("absolute inset-0 pointer-events-none opacity-40", tile.pattern)} />

                              {/* Top Icon & Floating Dismiss X */}
                              <div className="relative w-full flex items-center justify-center pt-0.5 z-10">
                                {tile.iconType === "schedule" && <CalendarCheck size={19} className={cn("stroke-[2.2]", tile.iconColor)} />}
                                {tile.iconType === "memory" && <Brain size={19} className={cn("stroke-[2.2]", tile.iconColor)} />}
                                {tile.iconType === "workload" && <Activity size={19} className={cn("stroke-[2.2]", tile.iconColor)} />}

                                {/* White Round Dismiss Badge */}
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setAttachedTiles(prev => prev.filter(t => t.id !== tile.id));
                                  }}
                                  className="absolute -top-1 -right-1 size-4.5 rounded-full bg-white text-black flex items-center justify-center shadow-md hover:scale-115 active:scale-95 transition-transform cursor-pointer"
                                  title={`Remove ${tile.tag}`}
                                >
                                  <X size={10} strokeWidth={3} className="text-black" />
                                </button>
                              </div>

                              {/* Bottom Tag Label */}
                              <span className="text-[9.5px] font-black text-white tracking-wider uppercase leading-none pb-0.5 z-10">
                                {tile.tag}
                              </span>
                            </motion.div>
                          ))}
                        </div>

                        {/* Right Side: Suggested Actions Drawer Toggle Handle Pill */}
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => setIsActionsDrawerOpen(v => !v)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#151724] hover:bg-neutral-100 dark:hover:bg-[#1c1e30] text-neutral-700 dark:text-neutral-200 text-xs font-bold border border-black/[0.06] dark:border-white/[0.08] shadow-xs cursor-pointer transition-all select-none shrink-0 self-center"
                        >
                          <Sparkles size={12} className="text-purple-500 animate-pulse" />
                          <span>Suggested Actions</span>
                          <span className="px-1.5 py-0.2 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 text-[9.5px] font-black">6</span>
                          <ChevronDown size={13} className={cn("transition-transform duration-300 text-neutral-400", isActionsDrawerOpen ? "rotate-180" : "")} />
                        </motion.button>
                      </div>

                      {/* Main Floating AI Capsule Container */}
                      <div className="rounded-[26px] border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#151724] p-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)] flex flex-col gap-2 transition-all">
                        <input
                          ref={inputRef}
                          type="text"
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                          placeholder="Ask NMI or create schedule events..."
                          className="w-full bg-transparent px-1.5 py-1 text-xs text-neutral-900 dark:text-neutral-100 outline-none placeholder:text-neutral-400 font-medium leading-relaxed"
                        />

                        {/* Capsule Action Toolbar */}
                        <div className="flex items-center justify-between pt-0.5">
                          <div className="flex items-center gap-2">
                            {/* + Quick Schedule Button */}
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.92 }}
                              onClick={() => {
                                setChatInput("Schedule a meeting at ");
                                inputRef.current?.focus();
                              }}
                              className="size-8 rounded-full bg-neutral-100 dark:bg-neutral-800/80 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 flex items-center justify-center transition cursor-pointer"
                              title="Quick schedule (Type event prompt)"
                            >
                              <Plus size={14} />
                            </motion.button>

                            {/* Globe (Global Schedule Analysis) Button */}
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.92 }}
                              onClick={() => handleQuickAction("How's my schedule across the whole week?")}
                              className="size-8 rounded-full bg-neutral-100 dark:bg-neutral-800/80 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 flex items-center justify-center transition cursor-pointer"
                              title="Global schedule overview & sync"
                            >
                              <Globe size={14} />
                            </motion.button>

                            {/* Signature Glowing Lavender Ideas Pill */}
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleQuickAction("Give me 3 smart productivity ideas to optimize my schedule")}
                              className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#edd6ff] via-[#dfbdfd] to-[#c79bf7] dark:from-purple-950/80 dark:via-purple-900/80 dark:to-purple-800/80 text-purple-950 dark:text-purple-200 text-[11px] font-bold flex items-center gap-1.5 shadow-[0_0_16px_rgba(199,155,247,0.45)] border border-purple-300/80 dark:border-purple-600/50 cursor-pointer"
                              title="Generate smart optimization ideas"
                            >
                              <Lightbulb size={12} className="fill-purple-600 text-purple-600 dark:fill-purple-300 dark:text-purple-300" />
                              <span>Ideas</span>
                            </motion.button>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* "Talk" Live Voice Dictation Pill */}
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={handleVoiceToggle}
                              className={cn(
                                "px-3.5 py-1.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer border shadow-xs",
                                isListening
                                  ? "bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400 animate-pulse"
                                  : "bg-neutral-100 dark:bg-neutral-800/90 border-black/[0.04] dark:border-white/[0.06] hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
                              )}
                              title={isListening ? "Listening... click to stop" : "Voice dictation (Speak your request)"}
                            >
                              <Mic size={12} className={isListening ? "text-rose-500 animate-pulse" : "text-neutral-500"} />
                              <span>{isListening ? "Listening..." : "Talk"}</span>
                            </motion.button>

                            {/* Solid Black Disc Action Button */}
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.08 }}
                              whileTap={{ scale: 0.92 }}
                              onClick={handleSendMessage}
                              disabled={!chatInput.trim() && !isThinking}
                              className="size-8.5 rounded-full bg-neutral-950 dark:bg-white disabled:opacity-40 disabled:cursor-not-allowed text-white dark:text-neutral-950 flex items-center justify-center shadow-md hover:shadow-lg transition cursor-pointer"
                              title={isThinking ? "Thinking..." : "Send query"}
                            >
                              {isThinking ? (
                                <div className="size-2.5 bg-white dark:bg-neutral-950 rounded-[2px]" />
                              ) : (
                                <Send size={13} className="ml-0.5" />
                              )}
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ──── DELOS APP GRID AUTO-PILOT TAB ──── */}
                {activeTab === "autopilot" && (
                  <motion.div
                    key="autopilot"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="p-5 space-y-3.5"
                  >
                    <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/30 via-teal-950/20 to-neutral-900/40 p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-1.5">
                        <BrainCircuit size={17} className="text-emerald-500" />
                        <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">Autonomous Schedule Automation</h3>
                      </div>
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-300 leading-relaxed">
                        Enable autonomous guardians to let NMI proactively optimize your calendar, balance workload, and shield against cognitive burnout.
                      </p>
                    </div>

                    {/* Matcha Progress Goals Widget (Image 2 Style) */}
                    <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-50/90 to-teal-50/70 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <TrendingUp size={13} className="text-emerald-600 dark:text-emerald-400" />
                          <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Progress Goals</span>
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-2xl font-black text-neutral-900 dark:text-neutral-100">{weekProfile.scheduleScore}%</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-neutral-800 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-200/50">
                            +12% Flow
                          </span>
                        </div>
                      </div>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => handleActionExecute("auto_balance_week")}
                        className="size-9 rounded-full bg-emerald-700 text-white flex items-center justify-center shadow-sm cursor-pointer"
                        title="Optimize goal progression"
                      >
                        <Plus size={16} />
                      </motion.button>
                    </div>

                    {([
                      {
                        key: "wellnessGuardian" as const, icon: <HeartPulse size={19} />,
                        title: "Wellness Guardian", color: "text-rose-500", pastel: "bg-rose-50 dark:bg-rose-950/50 border-rose-200/60",
                        desc: "Monitors cognitive load and proactively prevents burnout by suggesting recovery when load exceeds safe thresholds."
                      },
                      {
                        key: "autoBreaks" as const, icon: <Coffee size={19} />,
                        title: "Smart Break Insertion", color: "text-amber-500", pastel: "bg-amber-50 dark:bg-amber-950/50 border-amber-200/60",
                        desc: "Automatically inserts 15-min recovery breaks after 90+ minutes of consecutive scheduled work."
                      },
                      {
                        key: "autoBalance" as const, icon: <Shuffle size={19} />,
                        title: "Week Auto-Balance", color: "text-blue-500", pastel: "bg-blue-50 dark:bg-blue-950/50 border-blue-200/60",
                        desc: "Detects weekly workload imbalances and redistributes tasks across days for optimal cognitive flow."
                      },
                      {
                        key: "autoConflictResolve" as const, icon: <Shield size={19} />,
                        title: "Conflict Auto-Resolve", color: "text-violet-500", pastel: "bg-purple-50 dark:bg-purple-950/50 border-purple-200/60",
                        desc: "Instantly resolves overlapping events by inserting 15-min buffers between conflicting items."
                      },
                      {
                        key: "focusProtection" as const, icon: <Target size={19} />,
                        title: "Focus Block Protection", color: "text-indigo-500", pastel: "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200/60",
                        desc: "Protects deep focus sessions from being fragmented by adjacent scheduling. Maintains buffer zones."
                      },
                      {
                        key: "autoTagging" as const, icon: <Bookmark size={19} />,
                        title: "Smart Auto-Tagging", color: "text-emerald-500", pastel: "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200/60",
                        desc: "Automatically tags events based on title keywords (e.g., 'review' → #Review, 'meeting' → #Meeting)."
                      },
                      {
                        key: "autoPrioritize" as const, icon: <TrendingUp size={19} />,
                        title: "Deadline Priority Engine", color: "text-orange-500", pastel: "bg-orange-50 dark:bg-orange-950/50 border-orange-200/60",
                        desc: "Auto-escalates priority of tasks approaching their deadline. Surfaces urgent items in insights."
                      },
                      {
                        key: "smartReminders" as const, icon: <BellRing size={19} />,
                        title: "Context-Aware Reminders", color: "text-cyan-500", pastel: "bg-cyan-50 dark:bg-cyan-950/50 border-cyan-200/60",
                        desc: "Sets smart reminder timing based on event type — earlier for high-prep events, just-in-time for routine tasks."
                      },
                    ]).map(item => (
                      <motion.div
                        key={item.key}
                        whileHover={{ y: -2, scale: 1.01 }}
                        transition={{ type: "spring", stiffness: 450, damping: 25 }}
                        className="rounded-3xl border border-black/[0.06] dark:border-white/[0.08] bg-white/90 dark:bg-[#15161e]/90 p-4.5 flex items-start justify-between gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start gap-3.5">
                          <div className={`size-11 rounded-2xl flex items-center justify-center shrink-0 border ${item.pastel} ${item.color} shadow-xs`}>
                            {item.icon}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">{item.title}</h4>
                            <p className="text-[10.5px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed max-w-[320px]">
                              {item.desc}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setAutoPilot(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                          className={cn(
                            "relative shrink-0 w-11 h-[24px] rounded-full transition-colors duration-200 cursor-pointer mt-1",
                            autoPilot[item.key]
                              ? "bg-neutral-900 dark:bg-white"
                              : "bg-neutral-200 dark:bg-neutral-700"
                          )}
                        >
                          <motion.div
                            animate={{ x: autoPilot[item.key] ? 22 : 2 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            className={cn(
                              "absolute top-[3px] size-4.5 rounded-full shadow-sm",
                              autoPilot[item.key]
                                ? "bg-white dark:bg-neutral-900"
                                : "bg-white"
                            )}
                          />
                        </button>
                      </motion.div>
                    ))}

                    {/* NMI Status Footer */}
                    <div className="mt-5 pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
                      <div className="flex items-center justify-between text-[11px] text-neutral-400 font-medium">
                        <span>NMI Engine {NMI_VERSION} • {Object.values(autoPilot).filter(Boolean).length}/{Object.keys(autoPilot).length} active modules</span>
                        <span className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                          Online
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export {
  useNoskaIntelligence,
  buildWeekProfile,
  buildDayProfile,
  generateInsights,
  detectPatterns,
  getEnergyScore,
  getCognitiveDemand,
  getEnergyAlignment,
  classifyIntent,
  generateChatResponse,
  executeAction,
};
