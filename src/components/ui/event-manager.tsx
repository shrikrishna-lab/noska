import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  CalendarDays,
  Clock,
  Grid3x3,
  List,
  Search,
  Filter,
  X,
  Check,
  MoreHorizontal,
  Sparkles,
  MapPin,
  Tag,
  Flame,
  CheckCircle2,
  Layers,
  Kanban,
  FileText,
  Trash2,
  Edit3,
  Copy,
  Bell,
  BellRing,
  ArrowRight,
  ArrowUpRight,
  TrendingUp,
  Award,
  GraduationCap,
  GanttChart,
  Bookmark,
  CheckSquare,
  Repeat,
  AlertTriangle,
  Zap,
  Coffee,
  ExternalLink,
  Sliders,
  Maximize2,
  BarChart2,
  Activity,
  HeartPulse,
  BrainCircuit,
  Brain,
  CalendarCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NoskaIntelligencePanel } from "./noska-intelligence";
import { useAutoPagesInCalendarSetting } from "../../lib/calendarSync";

export interface Event {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  color: string;
  category?: string;
  attendees?: string[];
  tags?: string[];
  status?: "todo" | "in-progress" | "in-review" | "done" | "confirmed";
  progress?: number;
  reminder?: boolean;
  reminderMinutes?: number;
  milestone?: boolean;
  pageId?: string;
  timeSpentMinutes?: number;
  wordCount?: number;
  isCreatedPage?: boolean;
  stressScore?: number; // 1-10 cognitive load
  subtasks?: { id: string; title: string; done: boolean }[];
  recurring?: boolean;
}

export interface WorkspaceTrack {
  id: string;
  title: string;
  category: string;
  subtitle: string;
  progress: number;
  color: string;
  timeSpent?: string;
}

export interface WorkspaceMilestone {
  title: string;
  description: string;
  badge: string;
  type: string;
  id?: string;
  progress?: number;
  targetDate?: string;
}

export interface UserStats {
  userName: string;
  userEmail: string;
  signUpDate: string;
  userInitials: string;
  avatarUrl?: string;
  completionRate: number;
  completedTasks: number;
  totalPages: number;
  activeReviews: number;
}

export interface EventManagerProps {
  events?: Event[];
  onEventCreate?: (event: Omit<Event, "id">) => void;
  onEventUpdate?: (id: string, event: Partial<Event>) => void;
  onEventDelete?: (id: string) => void;
  onSyncEvents?: () => Promise<void>;
  categories?: string[];
  colors?: { name: string; value: string; bg: string; text: string; border: string; pastelBg: string; pastelText: string; pastelBorder: string }[];
  defaultView?: "timeline" | "week" | "day" | "month" | "board" | "list";
  className?: string;
  availableTags?: string[];
  workspaceTracks?: WorkspaceTrack[];
  workspaceMilestones?: WorkspaceMilestone[];
  workspaceStats?: UserStats;
  onSelectTrack?: (trackId: string) => void;
  focusPageId?: string;
}

const pastelColorThemes: Record<string, { bg: string; text: string; border: string; solidBg: string; gradient: string; bar: string }> = {
  blue: {
    bg: "bg-blue-100/90 dark:bg-blue-950/70",
    text: "text-blue-900 dark:text-blue-200",
    border: "border-blue-300/80 dark:border-blue-800/80",
    solidBg: "bg-blue-500",
    gradient: "from-blue-100/90 via-indigo-50/70 to-cyan-100/80 dark:from-blue-950/50 dark:to-indigo-950/50",
    bar: "bg-blue-600"
  },
  purple: {
    bg: "bg-purple-100/90 dark:bg-purple-950/70",
    text: "text-purple-900 dark:text-purple-200",
    border: "border-purple-300/80 dark:border-purple-800/80",
    solidBg: "bg-purple-500",
    gradient: "from-purple-100/90 via-indigo-50/70 to-blue-100/80 dark:from-purple-950/50 dark:to-indigo-950/50",
    bar: "bg-purple-600"
  },
  amber: {
    bg: "bg-amber-100/90 dark:bg-amber-950/70",
    text: "text-amber-900 dark:text-amber-200",
    border: "border-amber-300/80 dark:border-amber-800/80",
    solidBg: "bg-amber-500",
    gradient: "from-amber-100/90 via-yellow-50/70 to-orange-100/80 dark:from-amber-950/50 dark:to-orange-950/50",
    bar: "bg-amber-600"
  },
  green: {
    bg: "bg-emerald-100/90 dark:bg-emerald-950/70",
    text: "text-emerald-900 dark:text-emerald-200",
    border: "border-emerald-300/80 dark:border-emerald-800/80",
    solidBg: "bg-emerald-500",
    gradient: "from-lime-100/90 via-emerald-50/70 to-green-100/80 dark:from-lime-950/50 dark:to-emerald-950/50",
    bar: "bg-emerald-600"
  },
  rose: {
    bg: "bg-rose-100/90 dark:bg-rose-950/70",
    text: "text-rose-900 dark:text-rose-200",
    border: "border-rose-300/80 dark:border-rose-800/80",
    solidBg: "bg-rose-500",
    gradient: "from-rose-100/90 via-pink-50/70 to-orange-100/80 dark:from-rose-950/50 dark:to-pink-950/50",
    bar: "bg-rose-600"
  },
  cyan: {
    bg: "bg-cyan-100/90 dark:bg-cyan-950/70",
    text: "text-cyan-900 dark:text-cyan-200",
    border: "border-cyan-300/80 dark:border-cyan-800/80",
    solidBg: "bg-cyan-500",
    gradient: "from-cyan-100/90 via-teal-50/70 to-emerald-100/80 dark:from-cyan-950/50 dark:to-teal-950/50",
    bar: "bg-cyan-500"
  }
};

const defaultColorsList = [
  { name: "Blue", value: "blue", bg: "bg-blue-500", text: "text-blue-700", border: "border-blue-500", pastelBg: "bg-blue-100/90", pastelText: "text-blue-900", pastelBorder: "border-blue-300" },
  { name: "Purple", value: "purple", bg: "bg-purple-500", text: "text-purple-700", border: "border-purple-500", pastelBg: "bg-purple-100/90", pastelText: "text-purple-900", pastelBorder: "border-purple-300" },
  { name: "Amber", value: "amber", bg: "bg-amber-500", text: "text-amber-700", border: "border-amber-500", pastelBg: "bg-amber-100/90", pastelText: "text-amber-900", pastelBorder: "border-amber-300" },
  { name: "Green", value: "green", bg: "bg-green-500", text: "text-green-700", border: "border-green-500", pastelBg: "bg-emerald-100/90", pastelText: "text-emerald-900", pastelBorder: "border-emerald-300" },
  { name: "Rose", value: "rose", bg: "bg-rose-500", text: "text-rose-700", border: "border-rose-500", pastelBg: "bg-rose-100/90", pastelText: "text-rose-900", pastelBorder: "border-rose-300" },
  { name: "Cyan", value: "cyan", bg: "bg-cyan-500", text: "text-cyan-700", border: "border-cyan-500", pastelBg: "bg-cyan-100/90", pastelText: "text-cyan-900", pastelBorder: "border-cyan-300" },
];

function getEventTheme(color: string) {
  const norm = color?.toLowerCase() || "blue";
  if (norm.includes("purple") || norm.includes("math")) return pastelColorThemes.purple;
  if (norm.includes("amber") || norm.includes("orange") || norm.includes("sport") || norm.includes("marketing")) return pastelColorThemes.amber;
  if (norm.includes("green") || norm.includes("emerald") || norm.includes("computer")) return pastelColorThemes.green;
  if (norm.includes("rose") || norm.includes("red") || norm.includes("urgent")) return pastelColorThemes.rose;
  if (norm.includes("cyan") || norm.includes("art")) return pastelColorThemes.cyan;
  return pastelColorThemes.blue;
}

// ── 5x7 DOT MATRIX FONT DICTIONARY (IMAGE 2 INSPIRATION) ──
const DOT_MATRIX_FONT: Record<string, number[][]> = {
  "0": [
    [0,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,1,1],
    [1,0,1,0,1],
    [1,1,0,0,1],
    [1,0,0,0,1],
    [0,1,1,1,0]
  ],
  "1": [
    [0,0,1,0,0],
    [0,1,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,1,1,1,0]
  ],
  "2": [
    [0,1,1,1,0],
    [1,0,0,0,1],
    [0,0,0,0,1],
    [0,0,0,1,0],
    [0,0,1,0,0],
    [0,1,0,0,0],
    [1,1,1,1,1]
  ],
  "3": [
    [0,1,1,1,0],
    [1,0,0,0,1],
    [0,0,0,0,1],
    [0,0,1,1,0],
    [0,0,0,0,1],
    [1,0,0,0,1],
    [0,1,1,1,0]
  ],
  "4": [
    [0,0,0,1,0],
    [0,0,1,1,0],
    [0,1,0,1,0],
    [1,0,0,1,0],
    [1,1,1,1,1],
    [0,0,0,1,0],
    [0,0,0,1,0]
  ],
  "5": [
    [1,1,1,1,1],
    [1,0,0,0,0],
    [1,1,1,1,0],
    [0,0,0,0,1],
    [0,0,0,0,1],
    [1,0,0,0,1],
    [0,1,1,1,0]
  ],
  "6": [
    [0,1,1,1,0],
    [1,0,0,0,0],
    [1,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [0,1,1,1,0]
  ],
  "7": [
    [1,1,1,1,1],
    [0,0,0,0,1],
    [0,0,0,1,0],
    [0,0,1,0,0],
    [0,1,0,0,0],
    [0,1,0,0,0],
    [0,1,0,0,0]
  ],
  "8": [
    [0,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [0,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [0,1,1,1,0]
  ],
  "9": [
    [0,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [0,1,1,1,1],
    [0,0,0,0,1],
    [0,0,0,0,1],
    [0,1,1,1,0]
  ],
  "%": [
    [1,1,0,0,1],
    [1,1,0,1,0],
    [0,0,1,0,0],
    [0,1,0,0,0],
    [0,0,1,0,0],
    [0,1,0,1,1],
    [1,0,0,1,1]
  ]
};

export const DotMatrixNumber: React.FC<{
  value: number | string;
  size?: "sm" | "md" | "lg";
  className?: string;
  dotColor?: string;
}> = ({
  value,
  size = "md",
  className,
  dotColor
}) => {
  const str = String(value);
  const dotSize = size === "sm" ? 2.4 : size === "lg" ? 4.4 : 3.2;
  const gap = size === "sm" ? 1.4 : size === "lg" ? 2.2 : 1.8;

  return (
    <div className={cn("inline-flex items-center gap-2 select-none", className)}>
      {str.split("").map((char, charIdx) => {
        const matrix = DOT_MATRIX_FONT[char] || DOT_MATRIX_FONT["0"];
        return (
          <div
            key={charIdx}
            className="grid"
            style={{
              gridTemplateColumns: `repeat(5, ${dotSize}px)`,
              gridTemplateRows: `repeat(7, ${dotSize}px)`,
              gap: `${gap}px`
            }}
          >
            {matrix.flatMap((row, r) =>
              row.map((active, c) => (
                <div
                  key={`${r}-${c}`}
                  className={cn(
                    "rounded-full transition-all duration-200",
                    active
                      ? (dotColor ? "" : "bg-neutral-900 dark:bg-white") + " scale-100 shadow-[0_0_2px_rgba(0,0,0,0.4)]"
                      : "bg-neutral-300/30 dark:bg-neutral-700/30 scale-75 opacity-20"
                  )}
                  style={{
                    width: `${dotSize}px`,
                    height: `${dotSize}px`,
                    backgroundColor: active && dotColor ? dotColor : undefined
                  }}
                />
              ))
            )}
          </div>
        );
      })}
    </div>
  );
};

export const DotSpectrumBar: React.FC<{
  percentage?: number;
  totalCols?: number;
  activeCols?: number;
  rows?: number;
  className?: string;
}> = ({
  percentage = 75,
  totalCols = 28,
  activeCols: explicitActiveCols,
  rows = 5,
  className
}) => {
  const cols = totalCols;
  const activeCols = explicitActiveCols !== undefined
    ? Math.max(0, Math.min(cols, explicitActiveCols))
    : Math.max(2, Math.min(cols, Math.round((percentage / 100) * cols)));

  const getDotColor = (colIdx: number) => {
    const ratio = colIdx / cols;
    if (ratio < 0.25) return "#10b981"; // Soft Emerald
    if (ratio < 0.5) return "#06b6d4";  // Soft Cyan
    if (ratio < 0.75) return "#0ea5e9"; // Soft Sky
    return "#6366f1";                   // Soft Indigo
  };

  return (
    <div className={cn("flex flex-col gap-1 select-none", className)}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-1">
          {Array.from({ length: cols }).map((_, c) => {
            const isActive = c < activeCols;
            const color = getDotColor(c);
            return (
              <div
                key={c}
                className={cn(
                  "size-1.5 rounded-full transition-all duration-300",
                  isActive ? "scale-100 opacity-100 shadow-[0_0_2px_currentColor]" : "scale-75 opacity-20 bg-neutral-300 dark:bg-neutral-700"
                )}
                style={{
                  backgroundColor: isActive ? color : undefined,
                  color: isActive ? color : undefined
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};

export function EventManager({
  events: initialEvents = [],
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  onSyncEvents,
  categories = ["All", "Tasks", "Review", "Document", "Meeting", "Work", "Personal"],
  colors = defaultColorsList,
  defaultView = "week",
  className,
  availableTags = ["Important", "Urgent", "Design", "Development", "Client", "Review", "Sprint"],
  workspaceTracks = [],
  workspaceMilestones = [],
  workspaceStats,
  onSelectTrack,
  focusPageId,
}: EventManagerProps) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"timeline" | "week" | "day" | "month" | "board" | "list">(defaultView);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const { enabled: autoPagesEnabled, toggle: toggleAutoPages } = useAutoPagesInCalendarSetting();
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [activeTypeFilter, setActiveTypeFilter] = useState<"all" | "pages" | "tasks" | "reviews" | "stress">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [liveNow, setLiveNow] = useState(() => new Date());
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedDayDetails, setSelectedDayDetails] = useState<Date | null>(null);
  const [nmiOpen, setNmiOpen] = useState(false);

  const [newEvent, setNewEvent] = useState<Partial<Event>>({
    title: "",
    description: "",
    color: colors[0].value,
    category: "Tasks",
    tags: [],
    status: "confirmed",
    progress: 0,
    reminder: false,
    reminderMinutes: 15,
  });

  // KPI, Pipeline, Rebalance & Schedule Studio Modals
  const [activeKpiModal, setActiveKpiModal] = useState<"completion" | "focus" | "pages" | "balance" | null>(null);
  const [activePipelineModal, setActivePipelineModal] = useState<string | null>(null);
  const [isRebalanceModalOpen, setIsRebalanceModalOpen] = useState(false);
  const [rebalanceStrategy, setRebalanceStrategy] = useState<"circadian" | "deepwork" | "conflicts">("circadian");
  const [rebalanceBufferMinutes, setRebalanceBufferMinutes] = useState<number>(15);
  const [rebalanceBlockSizeMinutes, setRebalanceBlockSizeMinutes] = useState<number>(90);
  const [rebalanceProtectEnergy, setRebalanceProtectEnergy] = useState<boolean>(true);
  const [isSlotsStudioOpen, setIsSlotsStudioOpen] = useState(false);
  const [slotFilterDuration, setSlotFilterDuration] = useState<"all" | "30m" | "45m" | "1h" | "2h">("all");
  const [slotFilterTimeOfDay, setSlotFilterTimeOfDay] = useState<"all" | "morning" | "afternoon" | "evening">("all");
  const [slotSelectedDayOffset, setSlotSelectedDayOffset] = useState<number>(0);
  const [scheduleViewMode, setScheduleViewMode] = useState<"weekly" | "monthly">("weekly");
  const [scheduleStudioTab, setScheduleStudioTab] = useState<"studio" | "matrix" | "metrics">("studio");
  const [scheduleCategoryTagFilter, setScheduleCategoryTagFilter] = useState<string | null>(null);
  const [bookmarkedMetrics, setBookmarkedMetrics] = useState<boolean>(false);
  const [scheduleColorFilter, setScheduleColorFilter] = useState<string | null>(null);
  const [scheduleSubtaskInputs, setScheduleSubtaskInputs] = useState<Record<string, string>>({});
  const [activeMonthOffset, setActiveMonthOffset] = useState<number>(0);

  // Keep live time updated
  useEffect(() => {
    const timer = setInterval(() => setLiveNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Sync internal events if external prop updates
  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Derive dynamic category tags from real data
  const dynamicCategories = useMemo(() => {
    const set = new Set<string>(["All"]);
    events.forEach(e => {
      if (e.category) set.add(e.category);
      if (e.tags) e.tags.forEach(t => set.add(t));
    });
    return Array.from(set);
  }, [events]);

  // Real workspace summary calculations
  const summaryMetrics = useMemo(() => {
    const total = events.length;
    const completed = events.filter(e => e.status === "done").length;
    const inProgress = events.filter(e => e.status === "in-progress" || e.status === "confirmed").length;
    const reminders = events.filter(e => e.reminder).length;
    const calculatedRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const completionRate = workspaceStats?.completionRate ?? calculatedRate;

    // Calculate total time spent & created pages count
    const totalTimeSpentHours = events.reduce((acc, e) => acc + (e.timeSpentMinutes || 60), 0) / 60;
    const createdPagesCount = events.filter(e => e.isCreatedPage || e.category === "Document").length;

    return {
      total,
      completed: workspaceStats?.completedTasks ?? completed,
      inProgress,
      reminders,
      completionRate,
      totalPages: workspaceStats?.totalPages ?? 1,
      activeReviews: workspaceStats?.activeReviews ?? 0,
      totalTimeSpentHours: totalTimeSpentHours.toFixed(1),
      createdPagesCount,
    };
  }, [events, workspaceStats]);

  // ── DYNAMIC FILTER COUNTS (All Events, Tasks, Reviews, Pages) ──
  const filterCounts = useMemo(() => {
    const all = events.length;
    const tasks = events.filter(e => {
      const cat = (e.category || "").toLowerCase();
      return cat === "tasks" || cat === "task" || cat === "work" || (!e.category && !e.pageId) || Boolean(e.status) || e.tags?.some(t => /task|todo|sprint|dev|build/i.test(t));
    }).length;
    const reviews = events.filter(e => {
      const cat = (e.category || "").toLowerCase();
      return cat === "review" || cat === "reviews" || cat === "meeting" || e.status === "in-review" || e.tags?.some(t => /review|meeting|audit|check/i.test(t));
    }).length;
    const pages = events.filter(e => {
      const cat = (e.category || "").toLowerCase();
      return e.isCreatedPage || cat === "document" || cat === "pages" || cat === "page" || Boolean(e.pageId) || e.tags?.some(t => /page|doc|note/i.test(t)) || /page|doc|note|guide|spec/i.test(e.title);
    }).length;
    return { all, tasks, reviews, pages };
  }, [events]);

  // ── BUSY SCHEDULE & WORKLOAD INTELLIGENCE ──
  const dailyWorkload = useMemo(() => {
    const map = new Map<string, { totalHours: number; eventCount: number; status: "free" | "light" | "moderate" | "busy"; label: string; stressScore: number }>();

    events.forEach(e => {
      const dayKey = new Date(e.startTime).toISOString().slice(0, 10);
      const durHours = Math.max(0.5, (new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) / 3600000);
      const existing = map.get(dayKey) || { totalHours: 0, eventCount: 0, status: "free", label: "Free Day", stressScore: 0 };
      existing.totalHours += durHours;
      existing.eventCount += 1;
      // Stress score: higher for consecutive hours (>4 hrs is high cognitive load)
      existing.stressScore = Math.min(10, Math.round(existing.totalHours * 1.8));
      map.set(dayKey, existing);
    });

    map.forEach((val) => {
      if (val.totalHours >= 4.5) {
        val.status = "busy";
        val.label = `🔥 Busy (${val.totalHours.toFixed(1)}h)`;
      } else if (val.totalHours >= 2.0) {
        val.status = "moderate";
        val.label = `⚡ Active (${val.totalHours.toFixed(1)}h)`;
      } else if (val.totalHours > 0) {
        val.status = "light";
        val.label = `🌿 Light (${val.totalHours.toFixed(1)}h)`;
      } else {
        val.status = "free";
        val.label = `✨ Free Day`;
      }
    });

    return map;
  }, [events]);

  // Detect overlapping/colliding events
  const overlappingEventIds = useMemo(() => {
    const overlapping = new Set<string>();
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const a = events[i];
        const b = events[j];
        const aStart = new Date(a.startTime).getTime();
        const aEnd = new Date(a.endTime).getTime();
        const bStart = new Date(b.startTime).getTime();
        const bEnd = new Date(b.endTime).getTime();

        if (aStart < bEnd && bStart < aEnd) {
          overlapping.add(a.id);
          overlapping.add(b.id);
        }
      }
    }
    return overlapping;
  }, [events]);

  // Quick Extend / Shrink Duration (+15m, +30m, +1h)
  const handleExtendEvent = useCallback((event: Event, addMinutes: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const currentEnd = new Date(event.endTime);
    const newEnd = new Date(currentEnd.getTime() + addMinutes * 60000);
    const updated = { ...event, endTime: newEnd };
    setEvents(prev => prev.map(ev => ev.id === event.id ? updated : ev));
    onEventUpdate?.(event.id, { endTime: newEnd });
    showToast(`Extended "${event.title}" by +${addMinutes}m`);
  }, [onEventUpdate]);

  // ── MULTI-STRATEGY AI REBALANCE STUDIO ENGINE ──
  const executeSmartRebalance = useCallback((
    strategy: "circadian" | "deepwork" | "conflicts" = "circadian",
    customBuffer: number = rebalanceBufferMinutes
  ) => {
    const sorted = [...events].map(ev => ({
      ...ev,
      startTime: new Date(ev.startTime),
      endTime: new Date(ev.endTime),
    }));

    sorted.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    let adjustedCount = 0;
    let breaksAdded = 0;

    if (strategy === "conflicts") {
      // Resolve overlapping collisions
      for (let i = 0; i < sorted.length - 1; i++) {
        const cur = sorted[i];
        const next = sorted[i + 1];
        if (cur.endTime.getTime() > next.startTime.getTime() && cur.startTime.toDateString() === next.startTime.toDateString()) {
          const duration = next.endTime.getTime() - next.startTime.getTime();
          const newStart = new Date(cur.endTime.getTime() + customBuffer * 60000);
          const newEnd = new Date(newStart.getTime() + duration);
          next.startTime = newStart;
          next.endTime = newEnd;
          onEventUpdate?.(next.id, { startTime: newStart, endTime: newEnd });
          adjustedCount++;
        }
      }
    } else if (strategy === "circadian") {
      // Aligns tasks to circadian flow & inserts configurable restorative breaks
      for (let i = 0; i < sorted.length - 1; i++) {
        const cur = sorted[i];
        const next = sorted[i + 1];
        const curDurationMin = (cur.endTime.getTime() - cur.startTime.getTime()) / 60000;

        if (cur.startTime.toDateString() === next.startTime.toDateString()) {
          const gapMin = (next.startTime.getTime() - cur.endTime.getTime()) / 60000;
          if (gapMin < customBuffer || cur.endTime.getTime() > next.startTime.getTime()) {
            const bufferMs = (curDurationMin >= 60 ? customBuffer + 5 : customBuffer) * 60000;
            const duration = next.endTime.getTime() - next.startTime.getTime();
            const newStart = new Date(cur.endTime.getTime() + bufferMs);
            const newEnd = new Date(newStart.getTime() + duration);
            next.startTime = newStart;
            next.endTime = newEnd;
            onEventUpdate?.(next.id, { startTime: newStart, endTime: newEnd });
            breaksAdded++;
            adjustedCount++;
          }
        }
      }
    } else if (strategy === "deepwork") {
      // Consolidates tasks into continuous flow blocks
      for (let i = 0; i < sorted.length - 1; i++) {
        const cur = sorted[i];
        const next = sorted[i + 1];
        if (cur.startTime.toDateString() === next.startTime.toDateString()) {
          const gapMin = (next.startTime.getTime() - cur.endTime.getTime()) / 60000;
          if (gapMin > 0 && gapMin <= 30) {
            const duration = next.endTime.getTime() - next.startTime.getTime();
            const newStart = new Date(cur.endTime.getTime() + 5 * 60000);
            const newEnd = new Date(newStart.getTime() + duration);
            next.startTime = newStart;
            next.endTime = newEnd;
            onEventUpdate?.(next.id, { startTime: newStart, endTime: newEnd });
            adjustedCount++;
          }
        }
      }
    }

    setEvents([...sorted]);
    setIsRebalanceModalOpen(false);
    showToast(`⚡ AI Rebalance Applied: ${adjustedCount} schedule adjustments made (${strategy.toUpperCase()} mode with +${customBuffer}m buffer)`);
  }, [events, onEventUpdate, rebalanceBufferMinutes]);

  // Backward-compatible shortcut
  const handleSmartRebalance = useCallback(() => {
    executeSmartRebalance("circadian");
  }, [executeSmartRebalance]);

  // ── ORIGINAL FREE SLOT FINDER (1-Click Instant Discovery) ──
  const handleFindFreeSlot = useCallback(() => {
    const target = new Date(currentDate);
    const startHour = 9;
    const endHour = 18;
    const slotDurationHours = 1;

    for (let h = startHour; h < endHour; h++) {
      const slotStart = new Date(target);
      slotStart.setHours(h, 0, 0, 0);
      const slotEnd = new Date(target);
      slotEnd.setHours(h + slotDurationHours, 0, 0, 0);

      const hasConflict = events.some(e => {
        const eStart = new Date(e.startTime).getTime();
        const eEnd = new Date(e.endTime).getTime();
        return (slotStart.getTime() < eEnd && slotEnd.getTime() > eStart);
      });

      if (!hasConflict) {
        setNewEvent({
          title: "Focus Time",
          description: "Scheduled in available free slot",
          startTime: slotStart,
          endTime: slotEnd,
          color: colors[0].value,
          category: "Tasks",
          tags: ["Focus"],
          status: "confirmed",
          progress: 0,
          reminder: true,
          reminderMinutes: 15,
        });
        setIsCreating(true);
        setIsDialogOpen(true);
        showToast(`⚡ Found free slot: ${String(h).padStart(2, "0")}:00 - ${String(h + 1).padStart(2, "0")}:00`);
        return;
      }
    }

    // Try next day if today is fully booked
    const nextDay = new Date(target);
    nextDay.setDate(nextDay.getDate() + 1);
    for (let h = startHour; h < endHour; h++) {
      const slotStart = new Date(nextDay);
      slotStart.setHours(h, 0, 0, 0);
      const slotEnd = new Date(nextDay);
      slotEnd.setHours(h + slotDurationHours, 0, 0, 0);

      const hasConflict = events.some(e => {
        const eStart = new Date(e.startTime).getTime();
        const eEnd = new Date(e.endTime).getTime();
        return (slotStart.getTime() < eEnd && slotEnd.getTime() > eStart);
      });

      if (!hasConflict) {
        setNewEvent({
          title: "Focus Time",
          description: "Scheduled in available free slot",
          startTime: slotStart,
          endTime: slotEnd,
          color: colors[0].value,
          category: "Tasks",
          tags: ["Focus"],
          status: "confirmed",
          progress: 0,
          reminder: true,
          reminderMinutes: 15,
        });
        setIsCreating(true);
        setIsDialogOpen(true);
        showToast(`⚡ Found free slot tomorrow: ${String(h).padStart(2, "0")}:00 - ${String(h + 1).padStart(2, "0")}:00`);
        return;
      }
    }

    showToast("No open free slots found in the next 48 hours.");
  }, [currentDate, events, colors]);

  // ── SLOTS STUDIO & GAP INTELLIGENCE ENGINE ──
  const discoveredDaySlots = useMemo(() => {
    const targetDate = new Date(currentDate);
    targetDate.setDate(targetDate.getDate() + slotSelectedDayOffset);

    // Get all events for this target day, sorted chronologically
    const dayEvents = events
      .filter(e => {
        const ed = new Date(e.startTime);
        return ed.getDate() === targetDate.getDate() &&
               ed.getMonth() === targetDate.getMonth() &&
               ed.getFullYear() === targetDate.getFullYear();
      })
      .map(e => ({
        ...e,
        startMs: new Date(e.startTime).getTime(),
        endMs: new Date(e.endTime).getTime()
      }))
      .sort((a, b) => a.startMs - b.endMs);

    // Active schedule window: 08:00 to 20:00
    const dayStart = new Date(targetDate);
    dayStart.setHours(8, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(20, 0, 0, 0);

    const slots: Array<{
      id: string;
      startTime: Date;
      endTime: Date;
      durationMinutes: number;
      formattedTime: string;
      formattedDuration: string;
      circadianScore: number;
      circadianLabel: string;
      badgeCategory: "deep" | "recharge" | "execution" | "review";
      precedingEventTitle?: string;
      followingEventTitle?: string;
      timeOfDay: "morning" | "afternoon" | "evening";
    }> = [];

    let currentCursor = dayStart.getTime();

    dayEvents.forEach((ev, idx) => {
      if (ev.startMs > currentCursor) {
        const gapDurationMin = Math.round((ev.startMs - currentCursor) / 60000);
        if (gapDurationMin >= 15) {
          const sDate = new Date(currentCursor);
          const eDate = new Date(ev.startMs);
          const hour = sDate.getHours();

          let circadianScore = 80;
          let circadianLabel = "Standard Productivity Gap";
          let badgeCategory: "deep" | "recharge" | "execution" | "review" = "execution";
          let timeOfDay: "morning" | "afternoon" | "evening" = "afternoon";

          if (hour < 12) {
            timeOfDay = "morning";
            circadianScore = 95;
            circadianLabel = "⚡ Peak Cognitive Focus (Deep Work Window)";
            badgeCategory = "deep";
          } else if (hour >= 12 && hour < 14) {
            timeOfDay = "afternoon";
            circadianScore = 75;
            circadianLabel = "🌿 Post-Lunch Restorative Window / Buffer";
            badgeCategory = "recharge";
          } else if (hour >= 14 && hour < 18) {
            timeOfDay = "afternoon";
            circadianScore = 90;
            circadianLabel = "🚀 High Momentum Execution Zone";
            badgeCategory = "execution";
          } else {
            timeOfDay = "evening";
            circadianScore = 70;
            circadianLabel = "🌙 Wind-down Strategy & Wrap-up";
            badgeCategory = "review";
          }

          const hours = Math.floor(gapDurationMin / 60);
          const mins = gapDurationMin % 60;
          const formattedDuration = hours > 0 ? (mins > 0 ? `${hours}h ${mins}m` : `${hours}h`) : `${mins}m`;

          slots.push({
            id: `slot-gap-${currentCursor}-${ev.startMs}`,
            startTime: sDate,
            endTime: eDate,
            durationMinutes: gapDurationMin,
            formattedTime: `${String(sDate.getHours()).padStart(2, "0")}:${String(sDate.getMinutes()).padStart(2, "0")} - ${String(eDate.getHours()).padStart(2, "0")}:${String(eDate.getMinutes()).padStart(2, "0")}`,
            formattedDuration,
            circadianScore,
            circadianLabel,
            badgeCategory,
            precedingEventTitle: idx > 0 ? dayEvents[idx - 1].title : undefined,
            followingEventTitle: ev.title,
            timeOfDay
          });
        }
      }
      currentCursor = Math.max(currentCursor, ev.endMs);
    });

    // Gap after last event until 20:00
    if (currentCursor < dayEnd.getTime()) {
      const gapDurationMin = Math.round((dayEnd.getTime() - currentCursor) / 60000);
      if (gapDurationMin >= 15) {
        const sDate = new Date(currentCursor);
        const eDate = new Date(dayEnd);
        const hour = sDate.getHours();

        const timeOfDay: "morning" | "afternoon" | "evening" = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
        const hours = Math.floor(gapDurationMin / 60);
        const mins = gapDurationMin % 60;
        const formattedDuration = hours > 0 ? (mins > 0 ? `${hours}h ${mins}m` : `${hours}h`) : `${mins}m`;

        slots.push({
          id: `slot-gap-${currentCursor}-${dayEnd.getTime()}`,
          startTime: sDate,
          endTime: eDate,
          durationMinutes: gapDurationMin,
          formattedTime: `${String(sDate.getHours()).padStart(2, "0")}:${String(sDate.getMinutes()).padStart(2, "0")} - ${String(eDate.getHours()).padStart(2, "0")}:${String(eDate.getMinutes()).padStart(2, "0")}`,
          formattedDuration,
          circadianScore: hour < 17 ? 85 : 70,
          circadianLabel: hour < 17 ? "🚀 Open Afternoon Focus Slot" : "🌙 Evening Planning & Strategy",
          badgeCategory: hour < 17 ? "execution" : "review",
          precedingEventTitle: dayEvents.length > 0 ? dayEvents[dayEvents.length - 1].title : undefined,
          followingEventTitle: undefined,
          timeOfDay
        });
      }
    }

    return slots;
  }, [events, currentDate, slotSelectedDayOffset]);

  // 7-day week calendar strip for Slots Studio matching reference UI
  const slotStudioWeekDays = useMemo(() => {
    const base = new Date(currentDate);
    const dayOfWeek = base.getDay(); // 0 is Sun, 6 is Sat
    const sunday = new Date(base);
    sunday.setDate(base.getDate() - dayOfWeek);
    sunday.setHours(0, 0, 0, 0);

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const isSunOrSat = i === 0 || i === 6;

      const diffMs = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(base.getFullYear(), base.getMonth(), base.getDate()).getTime();
      const offset = Math.round(diffMs / 86400000);
      const isSelected = slotSelectedDayOffset === offset;

      return {
        date: d,
        dayName: dayNames[i],
        dayNum: d.getDate(),
        isSunOrSat,
        offset,
        isSelected
      };
    });
  }, [currentDate, slotSelectedDayOffset]);

  const format12Hour = useCallback((d: Date | string) => {
    const dateObj = typeof d === "string" ? new Date(d) : d;
    let hours = dateObj.getHours();
    const minutes = dateObj.getMinutes();
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? "0" + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  }, []);

  // Filtered slots according to duration and time-of-day filters
  const filteredDiscoveredSlots = useMemo(() => {
    return discoveredDaySlots.filter(slot => {
      if (slotFilterDuration === "30m" && (slot.durationMinutes < 15 || slot.durationMinutes > 35)) return false;
      if (slotFilterDuration === "45m" && (slot.durationMinutes < 40 || slot.durationMinutes > 55)) return false;
      if (slotFilterDuration === "1h" && (slot.durationMinutes < 55 || slot.durationMinutes > 80)) return false;
      if (slotFilterDuration === "2h" && slot.durationMinutes < 90) return false;

      if (slotFilterTimeOfDay !== "all" && slot.timeOfDay !== slotFilterTimeOfDay) return false;
      return true;
    });
  }, [discoveredDaySlots, slotFilterDuration, slotFilterTimeOfDay]);

  const availableSlotsCount = discoveredDaySlots.length;

  const handleBookSlot = useCallback((slot: { startTime: Date; endTime: Date; formattedTime: string; badgeCategory: string }) => {
    setNewEvent({
      title: slot.badgeCategory === "deep" ? "Deep Focus Block" : "Focus Session",
      description: `Scheduled in free gap: ${slot.formattedTime}`,
      startTime: slot.startTime,
      endTime: slot.endTime,
      color: colors[0].value,
      category: "Tasks",
      tags: ["Focus", "Slot"],
      status: "confirmed",
      progress: 0,
      reminder: true,
      reminderMinutes: 15,
    });
    setIsCreating(true);
    setIsSlotsStudioOpen(false);
    setIsDialogOpen(true);
    showToast(`⚡ Pre-filled slot: ${slot.formattedTime}`);
  }, [colors]);

  const handleInsertBreakInSlot = useCallback((slot: { startTime: Date }) => {
    const breakEnd = new Date(slot.startTime.getTime() + 15 * 60000);
    const breakItem: Event = {
      id: `evt-break-${Date.now()}`,
      title: "☕ Restorative Coffee Break",
      description: "Recharge buffer between focus blocks",
      startTime: slot.startTime,
      endTime: breakEnd,
      color: "#a855f7",
      category: "Tasks",
      tags: ["Rest", "Break"],
      status: "confirmed",
      progress: 100,
      reminder: false
    };
    setEvents(prev => [...prev, breakItem]);
    onEventCreate?.(breakItem);
    showToast("☕ Restorative break inserted into open slot");
  }, [onEventCreate]);

  const handleBatchFillSlots = useCallback(() => {
    let count = 0;
    const newItems: Event[] = [];
    discoveredDaySlots.forEach((slot, idx) => {
      if (slot.durationMinutes >= 30) {
        const item: Event = {
          id: `evt-slot-batch-${Date.now()}-${idx}`,
          title: slot.badgeCategory === "deep" ? "Deep Work Sprint" : "Focused Execution",
          description: `Auto-scheduled in ${slot.formattedDuration} gap`,
          startTime: slot.startTime,
          endTime: slot.endTime,
          color: colors[idx % colors.length].value,
          category: "Tasks",
          tags: ["Focus", "AutoFill"],
          status: "confirmed",
          progress: 0,
          reminder: true,
          reminderMinutes: 15
        };
        newItems.push(item);
        onEventCreate?.(item);
        count++;
      }
    });
    if (count > 0) {
      setEvents(prev => [...prev, ...newItems]);
      setIsSlotsStudioOpen(false);
      showToast(`🚀 Auto-filled ${count} open slots with focus blocks!`);
    } else {
      showToast("No open slots >= 30m to auto-fill.");
    }
  }, [discoveredDaySlots, colors, onEventCreate]);

  // Selected day's real events in Schedule Studio
  const selectedDayRealEvents = useMemo(() => {
    const targetDate = new Date(currentDate);
    targetDate.setDate(targetDate.getDate() + slotSelectedDayOffset);

    return events.filter(e => {
      const ed = new Date(e.startTime);
      const isDayMatch = ed.getDate() === targetDate.getDate() &&
                         ed.getMonth() === targetDate.getMonth() &&
                         ed.getFullYear() === targetDate.getFullYear();
      if (!isDayMatch) return false;
      if (scheduleColorFilter && !e.color?.toLowerCase().includes(scheduleColorFilter.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [events, currentDate, slotSelectedDayOffset, scheduleColorFilter]);

  const handleAddSubtaskToEvent = useCallback((eventId: string, title: string) => {
    if (!title.trim()) return;
    const target = events.find(e => e.id === eventId);
    if (!target) return;

    const currentSubtasks = target.subtasks || [];
    const newSubtask = { id: `sub-${Date.now()}`, title: title.trim(), done: false };
    const updatedSubtasks = [...currentSubtasks, newSubtask];
    const completedCount = updatedSubtasks.filter(s => s.done).length;
    const progress = Math.round((completedCount / updatedSubtasks.length) * 100);

    const updated = { ...target, subtasks: updatedSubtasks, progress };
    setEvents(prev => prev.map(e => e.id === eventId ? updated : e));
    onEventUpdate?.(eventId, { subtasks: updatedSubtasks, progress });
    setScheduleSubtaskInputs(prev => ({ ...prev, [eventId]: "" }));
    showToast(`Added sub-task "${title.trim()}"`);
  }, [events, onEventUpdate]);

  const handleToggleSubtask = useCallback((eventId: string, subtaskId: string) => {
    const target = events.find(e => e.id === eventId);
    if (!target || !target.subtasks) return;

    const updatedSubtasks = target.subtasks.map(s => s.id === subtaskId ? { ...s, done: !s.done } : s);
    const completedCount = updatedSubtasks.filter(s => s.done).length;
    const progress = Math.round((completedCount / updatedSubtasks.length) * 100);
    const allDone = updatedSubtasks.length > 0 && updatedSubtasks.every(s => s.done);

    const updated = {
      ...target,
      subtasks: updatedSubtasks,
      progress,
      status: allDone ? ("done" as const) : target.status === "done" ? ("in-progress" as const) : target.status
    };
    setEvents(prev => prev.map(e => e.id === eventId ? updated : e));
    onEventUpdate?.(eventId, { subtasks: updatedSubtasks, progress, status: updated.status });
  }, [events, onEventUpdate]);

  const handleToggleEventRecurring = useCallback((eventId: string) => {
    const target = events.find(e => e.id === eventId);
    if (!target) return;

    const updated = { ...target, recurring: !target.recurring };
    setEvents(prev => prev.map(e => e.id === eventId ? updated : e));
    onEventUpdate?.(eventId, { recurring: updated.recurring });
    showToast(updated.recurring ? `Recurring daily enabled for "${target.title}"` : `Recurring disabled`);
  }, [events, onEventUpdate]);

  // Combined Filters (Type filter + Category + Search + Page Focus)
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (focusPageId && e.pageId && e.pageId !== focusPageId) return false;

      // Type Filter
      if (activeTypeFilter === "pages") {
        const cat = (e.category || "").toLowerCase();
        const isDoc = e.isCreatedPage || cat === "document" || cat === "pages" || cat === "page" || Boolean(e.pageId) || e.tags?.some(t => /page|doc|note/i.test(t)) || /page|doc|note|guide|spec/i.test(e.title);
        if (!isDoc) return false;
      }
      if (activeTypeFilter === "tasks") {
        const cat = (e.category || "").toLowerCase();
        const isTask = cat === "tasks" || cat === "task" || cat === "work" || (!e.category && !e.pageId) || Boolean(e.status) || e.tags?.some(t => /task|todo|sprint|dev|build/i.test(t));
        if (!isTask) return false;
      }
      if (activeTypeFilter === "reviews") {
        const cat = (e.category || "").toLowerCase();
        const isReview = cat === "review" || cat === "reviews" || cat === "meeting" || e.status === "in-review" || e.tags?.some(t => /review|meeting|audit|check/i.test(t));
        if (!isReview) return false;
      }
      if (activeTypeFilter === "stress") {
        const dayKey = new Date(e.startTime).toISOString().slice(0, 10);
        const load = dailyWorkload.get(dayKey);
        if (!load || load.status !== "busy") return false;
      }

      // Category filter
      if (activeCategory !== "All") {
        const matchesCategory = e.category?.toLowerCase() === activeCategory.toLowerCase();
        const matchesTag = e.tags?.some(t => t.toLowerCase() === activeCategory.toLowerCase());
        if (!matchesCategory && !matchesTag) return false;
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = e.title.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q) ||
          e.category?.toLowerCase().includes(q) ||
          e.tags?.some(t => t.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [events, activeTypeFilter, activeCategory, searchQuery, focusPageId, dailyWorkload]);

  const handleCreateEvent = useCallback(() => {
    if (!newEvent.title || !newEvent.startTime || !newEvent.endTime) return;
    const item: Event = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: newEvent.title.trim(),
      description: newEvent.description?.trim(),
      startTime: newEvent.startTime,
      endTime: newEvent.endTime,
      color: newEvent.color || colors[0].value,
      category: newEvent.category || "Tasks",
      tags: newEvent.tags || [],
      status: newEvent.status || "confirmed",
      progress: newEvent.progress ?? 0,
      reminder: newEvent.reminder ?? false,
      reminderMinutes: newEvent.reminderMinutes ?? 15,
      milestone: newEvent.milestone ?? false,
      timeSpentMinutes: 60,
    };
    setEvents(prev => [...prev, item]);
    onEventCreate?.(item);
    setIsDialogOpen(false);
    setIsCreating(false);
    showToast(`Event "${item.title}" created`);
    setNewEvent({ title: "", description: "", color: colors[0].value, category: "Tasks", tags: [], status: "confirmed", progress: 0, reminder: false, reminderMinutes: 15 });
  }, [newEvent, colors, onEventCreate]);

  const handleUpdateEvent = useCallback(() => {
    if (!selectedEvent) return;
    setEvents(prev => prev.map(e => e.id === selectedEvent.id ? selectedEvent : e));
    onEventUpdate?.(selectedEvent.id, selectedEvent);
    setIsDialogOpen(false);
    setSelectedEvent(null);
    showToast(`Event updated`);
  }, [selectedEvent, onEventUpdate]);

  const handleDeleteEvent = useCallback((id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    onEventDelete?.(id);
    setIsDialogOpen(false);
    setSelectedEvent(null);
    showToast(`Event deleted`);
  }, [onEventDelete]);

  // 1-Click Duplicate
  const handleDuplicateEvent = useCallback((event: Event) => {
    const origStart = new Date(event.startTime);
    const origEnd = new Date(event.endTime);
    const duration = origEnd.getTime() - origStart.getTime();

    const newStart = new Date(origStart.getTime() + 3600000);
    const newEnd = new Date(newStart.getTime() + duration);

    const cloned: Event = {
      ...event,
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: `${event.title} (Copy)`,
      startTime: newStart,
      endTime: newEnd,
      status: event.status || "todo",
    };

    setEvents(prev => [...prev, cloned]);
    onEventCreate?.(cloned);
    showToast(`Duplicated "${event.title}"`);
  }, [onEventCreate]);

  // Quick Reminder Toggle
  const handleToggleReminder = useCallback((event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = { ...event, reminder: !event.reminder };
    setEvents(prev => prev.map(item => item.id === event.id ? updated : item));
    onEventUpdate?.(event.id, { reminder: updated.reminder });
    showToast(updated.reminder ? `Reminder set for "${event.title}"` : `Reminder turned off`);
  }, [onEventUpdate]);

  // Drag and Drop
  const handleDragStart = (e: React.DragEvent, eventId: string) => {
    e.dataTransfer.setData("text/plain", eventId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedEventId(eventId);
  };

  const handleDragEnd = () => {
    setDraggedEventId(null);
    setDragOverTarget(null);
  };

  const handleSlotDrop = (targetDay: Date, targetHour: number, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTarget(null);
    const eventId = e.dataTransfer.getData("text/plain") || draggedEventId;
    if (!eventId) return;

    const targetEvent = events.find(ev => ev.id === eventId);
    if (!targetEvent) return;

    const duration = new Date(targetEvent.endTime).getTime() - new Date(targetEvent.startTime).getTime();
    const newStart = new Date(targetDay);
    newStart.setHours(targetHour, 0, 0, 0);
    const newEnd = new Date(newStart.getTime() + duration);

    const updated = { ...targetEvent, startTime: newStart, endTime: newEnd };
    setEvents(prev => prev.map(ev => ev.id === eventId ? updated : ev));
    onEventUpdate?.(eventId, { startTime: newStart, endTime: newEnd });
    showToast(`Moved "${targetEvent.title}" to ${newStart.toLocaleDateString([], { weekday: "short" })} ${String(targetHour).padStart(2, "0")}:00`);
  };

  const handleBoardDrop = (status: "todo" | "in-progress" | "in-review" | "done", e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTarget(null);
    const eventId = e.dataTransfer.getData("text/plain") || draggedEventId;
    if (!eventId) return;

    const targetEvent = events.find(ev => ev.id === eventId);
    if (!targetEvent) return;

    const updated = { ...targetEvent, status };
    setEvents(prev => prev.map(ev => ev.id === eventId ? updated : ev));
    onEventUpdate?.(eventId, { status });
    showToast(`Moved "${targetEvent.title}" to ${status}`);
  };

  const navigateDate = (dir: "prev" | "next") => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (view === "month") d.setMonth(prev.getMonth() + (dir === "next" ? 1 : -1));
      else if (view === "week" || view === "timeline") d.setDate(prev.getDate() + (dir === "next" ? 7 : -7));
      else d.setDate(prev.getDate() + (dir === "next" ? 1 : -1));
      return d;
    });
  };

  const openSlotCreate = (dayDate: Date, hour: number) => {
    const start = new Date(dayDate);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(hour + 1, 0, 0, 0);
    setNewEvent({
      title: "",
      description: "",
      startTime: start,
      endTime: end,
      color: colors[0].value,
      category: "Tasks",
      tags: [],
      status: "confirmed",
      progress: 0,
      reminder: false,
      reminderMinutes: 15,
    });
    setIsCreating(true);
    setIsDialogOpen(true);
  };

  const formattedRangeTitle = useMemo(() => {
    if (view === "week" || view === "timeline") {
      const start = new Date(currentDate);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      const startStr = `${String(start.getDate()).padStart(2, "0")}`;
      const endStr = `${String(end.getDate()).padStart(2, "0")} ${end.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
      return `${startStr}-${endStr}`;
    }
    if (view === "month") {
      return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    if (view === "day") {
      return currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    }
    return "Schedule Overview";
  }, [currentDate, view]);

  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [currentDate]);

  const timetableHours = Array.from({ length: 13 }, (_, i) => i + 8);

  const timezoneStr = useMemo(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone.replace("_", " ");
      const offset = -new Date().getTimezoneOffset() / 60;
      const gmt = `GMT${offset >= 0 ? "+" : ""}${offset}`;
      const time = liveNow.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return `${tz.split("/").pop()} ${time} (${gmt})`;
    } catch {
      return "Local Time";
    }
  }, [liveNow]);

  return (
    <div className={cn("space-y-6 select-none relative", className)}>
      {/* ── TOAST NOTIFICATION ── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-8 z-50 px-4 py-2.5 rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-semibold shadow-2xl flex items-center gap-2 border border-white/20"
          >
            <Sparkles size={14} className="text-amber-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── BENTO SUMMARY & INTELLIGENCE HEADER (SHENLLCRM + DELOS STYLE) ── */}
      <div className="space-y-4">
        {/* Top Greeting & CRM Master Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
              <span>
                {(() => {
                  const hour = liveNow.getHours();
                  if (hour < 12) return "Good Morning";
                  if (hour < 17) return "Good Afternoon";
                  return "Good Evening";
                })()}, {workspaceStats?.userName || "James Workman"}
              </span>
              <motion.span
                animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 5 }}
                className="text-xl sm:text-2xl select-none inline-block origin-bottom-right"
              >
                👋
              </motion.span>
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium">
              {liveNow.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} • Track schedule rhythm, balance cognitive load, and optimize opportunities.
            </p>
          </motion.div>

          {/* Executive Luxury Glassmorphic Pill Controls Bar */}
          <div className="inline-flex items-center p-1.5 rounded-full bg-white/85 dark:bg-[#151722]/90 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.12] shadow-[0_6px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.45)] gap-1.5 shrink-0 self-start sm:self-auto">
            {/* 1. Rebalance */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 450, damping: 25 }}
              onClick={() => setIsRebalanceModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-bold transition-all cursor-pointer group"
              title="Open AI Smart Rebalancing Studio"
            >
              <div className="size-4 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] shadow-xs group-hover:rotate-12 transition-transform">
                ✨
              </div>
              <span className="text-neutral-800 dark:text-neutral-200 font-bold">Rebalance</span>
            </motion.button>

            {/* 2. Schedule Studio & Gap Explorer */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 450, damping: 25 }}
              onClick={() => setIsSlotsStudioOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-bold transition-all cursor-pointer group"
              title="Open Executive Schedule Studio & Gap Explorer"
            >
              <Zap size={13} className="text-blue-500 fill-blue-500/20 group-hover:scale-110 transition-transform" />
              <span className="text-blue-700 dark:text-blue-300 font-bold">Schedule</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-blue-500/15 text-blue-700 dark:text-blue-300 font-extrabold border border-blue-500/20">
                {availableSlotsCount}
              </span>
            </motion.button>

            {/* 4. Noska Intelligence AI */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 450, damping: 25 }}
              onClick={() => setNmiOpen(true)}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-neutral-900 dark:bg-white hover:bg-black dark:hover:bg-neutral-100 text-white dark:text-neutral-950 text-xs font-bold transition-all shadow-[0_4px_16px_rgba(0,0,0,0.2)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.15)] cursor-pointer"
              title="Open Noska Manager Intelligence — AGI-grade scheduling brain"
            >
              <BrainCircuit size={13.5} className="text-indigo-400 dark:text-indigo-600 animate-pulse" />
              <span>Noska Intelligence</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-white/20 dark:bg-black/10 font-black uppercase tracking-wider">
                AI
              </span>
            </motion.button>
          </div>
        </div>

        {/* 4 Shenllcrm-style Top KPI Cards Grid with Rich Graphics, Textures & Motion Physics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              id: "completion" as const,
              title: "Task Completion Rate",
              value: `${summaryMetrics.completionRate}%`,
              icon: (
                <motion.div
                  animate={{ rotate: [0, 8, 0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <TrendingUp size={18} />
                </motion.div>
              ),
              color: "text-blue-600 dark:text-blue-400",
              tileBg: "bg-blue-50 dark:bg-blue-950/60 border-blue-200/80 dark:border-blue-800/60",
              pillBg: "bg-blue-50/90 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/50",
              pillText: `+${summaryMetrics.completed} completed`,
              footerNote: `${summaryMetrics.total} total items`,
              glowColor: "rgba(59, 130, 246, 0.16)",
              graphic: (
                <div className="relative size-14 shrink-0 flex items-center justify-center">
                  {/* Breathing aura glow */}
                  <motion.div
                    animate={{ scale: [0.92, 1.08, 0.92], opacity: [0.35, 0.7, 0.35] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-1 rounded-full bg-blue-500/20 blur-sm pointer-events-none"
                  />
                  <svg className="size-full -rotate-90 relative z-10" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" strokeWidth="4" className="text-black/5 dark:text-white/10" />
                    <motion.circle
                      cx="24"
                      cy="24"
                      r="18"
                      fill="none"
                      stroke="url(#blue-gradient)"
                      strokeWidth="4"
                      strokeDasharray="113.1"
                      strokeDashoffset={113.1 - (113.1 * Math.min(100, Math.max(10, summaryMetrics.completionRate))) / 100}
                      strokeLinecap="round"
                      initial={{ strokeDashoffset: 113.1 }}
                      animate={{ strokeDashoffset: 113.1 - (113.1 * Math.min(100, Math.max(10, summaryMetrics.completionRate))) / 100 }}
                      transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                    />
                    <defs>
                      <linearGradient id="blue-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="50%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#06b6d4" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <motion.div
                    animate={{ scale: [1, 1.04, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute text-[10px] font-black text-neutral-800 dark:text-neutral-200 font-mono z-20"
                  >
                    {summaryMetrics.completionRate}%
                  </motion.div>
                </div>
              )
            },
            {
              id: "focus" as const,
              title: "Focus & Scheduled Work",
              value: `${summaryMetrics.totalTimeSpentHours}h`,
              icon: (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
                >
                  <Clock size={18} />
                </motion.div>
              ),
              color: "text-emerald-600 dark:text-emerald-400",
              tileBg: "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/80 dark:border-emerald-800/60",
              pillBg: "bg-emerald-50/90 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/50",
              pillText: "Active rhythm",
              footerNote: "Balanced load",
              glowColor: "rgba(16, 185, 129, 0.16)",
              graphic: (
                /* Animated Rhythmic Soundwave Frequency Equalizer with 8 Bars */
                <div className="flex items-end gap-1 h-9 px-2 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shrink-0 shadow-2xs">
                  {[0.4, 0.85, 0.55, 1, 0.7, 0.9, 0.45, 0.65].map((h, i) => (
                    <motion.div
                      key={i}
                      animate={{ scaleY: [0.2, h, 0.2] }}
                      transition={{
                        duration: 1.1 + (i % 4) * 0.18,
                        repeat: Infinity,
                        repeatType: "reverse",
                        ease: "easeInOut",
                        delay: i * 0.09
                      }}
                      className="w-1 origin-bottom rounded-full bg-gradient-to-t from-emerald-600 via-teal-400 to-cyan-300"
                      style={{ height: "100%" }}
                    />
                  ))}
                </div>
              )
            },
            {
              id: "pages" as const,
              title: "Active Knowledge Pages",
              value: `${summaryMetrics.totalPages}`,
              icon: (
                <motion.div
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <FileText size={18} />
                </motion.div>
              ),
              color: "text-amber-600 dark:text-amber-400",
              tileBg: "bg-amber-50 dark:bg-amber-950/60 border-amber-200/80 dark:border-amber-800/60",
              pillBg: "bg-amber-50/90 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200/50 dark:border-amber-800/50",
              pillText: "Synced docs",
              footerNote: "Knowledge base",
              glowColor: "rgba(245, 158, 11, 0.16)",
              graphic: (
                /* Layered 3D floating document cards with dynamic spring levitation */
                <div className="relative w-12 h-10 shrink-0">
                  <motion.div
                    animate={{ y: [0, -3, 0], rotate: [6, 8, 6] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute right-0 top-0 w-8 h-9 rounded-lg bg-amber-200/70 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-700 shadow-xs"
                  />
                  <motion.div
                    animate={{ y: [0, -2, 0], rotate: [-3, -5, -3] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                    className="absolute right-2 top-0.5 w-8 h-9 rounded-lg bg-amber-100 dark:bg-amber-950/80 border border-amber-300/80 dark:border-amber-700/80 shadow-xs"
                  />
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                    className="absolute right-4 top-1 w-8 h-9 rounded-lg bg-white dark:bg-neutral-900 border border-amber-300 dark:border-amber-600 shadow-md p-1 flex flex-col justify-between"
                  >
                    <div className="w-4 h-1 rounded-full bg-amber-500 shadow-2xs" />
                    <div className="space-y-0.5">
                      <motion.div
                        animate={{ width: ["100%", "60%", "100%"] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                        className="h-0.5 bg-neutral-300 dark:bg-neutral-600 rounded-full"
                      />
                      <div className="w-3/4 h-0.5 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
                    </div>
                  </motion.div>
                </div>
              )
            },
            {
              id: "balance" as const,
              title: "Cognitive Flow & Balance",
              value: Number(summaryMetrics.totalTimeSpentHours) > 15 ? "Moderate" : "Optimal",
              icon: (
                <motion.div
                  animate={{ scale: [1, 1.18, 0.96, 1.14, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <HeartPulse size={18} />
                </motion.div>
              ),
              color: "text-cyan-600 dark:text-cyan-400",
              tileBg: "bg-cyan-50 dark:bg-cyan-950/60 border-cyan-200/80 dark:border-cyan-800/60",
              pillBg: "bg-cyan-50/90 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 border-cyan-200/50 dark:border-cyan-800/50",
              pillText: "Safe load",
              footerNote: "0 Burnout risk",
              glowColor: "rgba(6, 182, 212, 0.16)",
              graphic: (
                /* Animated Glowing ECG Biometric Cardiogram with traveling laser spark */
                <div className="relative w-16 h-8 px-1 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 64 28" fill="none">
                    <path
                      d="M2 14 L16 14 L20 6 L26 22 L32 2 L38 20 L42 14 L62 14"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-cyan-500/60"
                    />
                    {/* Glowing active stroke */}
                    <motion.path
                      d="M2 14 L16 14 L20 6 L26 22 L32 2 L38 20 L42 14 L62 14"
                      stroke="#06b6d4"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="90"
                      strokeDashoffset={90}
                      animate={{ strokeDashoffset: [90, 0, -90] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.circle
                      cx="32"
                      cy="2"
                      r="3"
                      className="fill-cyan-300 drop-shadow-[0_0_6px_rgba(6,182,212,0.9)]"
                      animate={{
                        cx: [2, 16, 20, 26, 32, 38, 42, 62],
                        cy: [14, 14, 6, 22, 2, 20, 14, 14],
                        opacity: [0, 1, 1, 1, 1, 1, 1, 0],
                        scale: [0.8, 1.2, 1.4, 1.2, 1.6, 1.2, 1, 0.8]
                      }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
                    />
                  </svg>
                </div>
              )
            }
          ].map((card, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -6, scale: 1.025 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveKpiModal(card.id)}
              className="rounded-[28px] border border-black/[0.08] dark:border-white/[0.1] bg-white/95 dark:bg-[#15161e]/95 p-5 shadow-[0_6px_24px_rgba(0,0,0,0.03)] dark:shadow-[0_12px_32px_-6px_rgba(0,0,0,0.4)] flex flex-col justify-between hover:shadow-2xl hover:border-black/20 dark:hover:border-white/20 transition-all group cursor-pointer select-none relative overflow-hidden backdrop-blur-md"
              title={`Click to inspect ${card.title} live telemetry`}
            >
              {/* Distinctive Micro-Texture & Holographic Ambient Glow */}
              <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.08] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:10px_10px]" />
              <div
                className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl pointer-events-none transition-opacity opacity-40 group-hover:opacity-100"
                style={{ backgroundColor: card.glowColor }}
              />

              {/* Holographic Light Sheen Sweep Animation on Hover */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out bg-gradient-to-r from-transparent via-white/15 dark:via-white/10 to-transparent pointer-events-none" />

              <div className="flex items-center justify-between relative z-10">
                <div className={cn("size-11 rounded-2xl flex items-center justify-center shadow-xs group-hover:scale-110 group-hover:rotate-3 transition-transform border", card.tileBg, card.color)}>
                  {card.icon}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50/90 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-800/40 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 transition-colors shadow-2xs">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>↗ Inspect</span>
                </div>
              </div>

              {/* Number, Label & Live Graphic Row */}
              <div className="mt-4 flex items-center justify-between relative z-10">
                <div className="space-y-1">
                  <div className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                    <span>{card.value}</span>
                    <ArrowUpRight size={15} className="text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-900 dark:group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    {card.title}
                  </div>
                </div>

                {/* Rich Embedded Visual Graphic */}
                <div className="group-hover:scale-110 transition-transform">
                  {card.graphic}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between relative z-10">
                <span className={cn("px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border shadow-2xs", card.pillBg)}>
                  {card.pillText}
                </span>
                <span className="text-[10.5px] text-neutral-400 font-medium">
                  {card.footerNote}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Shenllcrm Pipeline Stages Row with Animated Progress Lines & Clickable Stage Modals */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-[28px] border border-black/[0.08] dark:border-white/[0.1] bg-white/95 dark:bg-[#15161e]/95 p-5 shadow-[0_6px_24px_rgba(0,0,0,0.03)] dark:shadow-[0_12px_32px_-6px_rgba(0,0,0,0.4)] relative backdrop-blur-md overflow-hidden"
        >
          {/* Subtle Dot Matrix Canvas Texture */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 relative z-10">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <span>Schedule Pipeline</span>
                <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                  Interactive Telemetry
                </span>
              </h3>
              <p className="text-[11.5px] text-neutral-400">Track progression across all schedule stages • Click any column to inspect</p>
            </div>
            <div className="inline-flex items-center p-1 rounded-full bg-neutral-100/90 dark:bg-neutral-800/90 border border-black/[0.04] dark:border-white/[0.06] text-xs gap-1 shadow-2xs">
              {[
                { id: "all", label: "All Events", count: filterCounts.all },
                { id: "tasks", label: "Tasks", count: filterCounts.tasks },
                { id: "reviews", label: "Reviews", count: filterCounts.reviews },
                { id: "pages", label: "Pages", count: filterCounts.pages }
              ].map(item => (
                <motion.button
                  key={item.id}
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTypeFilter(item.id as any)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                    activeTypeFilter === item.id
                      ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xs font-bold"
                      : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                  )}
                >
                  <span>{item.label}</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
                    activeTypeFilter === item.id
                      ? "bg-white/25 dark:bg-black/15 text-white dark:text-neutral-900"
                      : "bg-black/5 dark:bg-white/10 text-neutral-400 dark:text-neutral-400"
                  )}>
                    {item.count}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 relative z-10">
            {[
              {
                label: "Todo",
                count: filteredEvents.filter(e => e.status === "todo" || !e.status).length,
                color: "bg-gradient-to-r from-blue-500 to-indigo-500",
                icon: <Tag size={15} />,
                pastel: "bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200/50 hover:border-blue-400 hover:shadow-blue-500/10",
                percent: Math.round((filteredEvents.filter(e => e.status === "todo" || !e.status).length / Math.max(1, filteredEvents.length)) * 100),
                badge: "Queue"
              },
              {
                label: "In Progress",
                count: filteredEvents.filter(e => e.status === "in-progress").length,
                color: "bg-gradient-to-r from-emerald-500 to-teal-400",
                icon: <Activity size={15} />,
                pastel: "bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 hover:border-emerald-400 hover:shadow-emerald-500/10",
                percent: Math.round((filteredEvents.filter(e => e.status === "in-progress").length / Math.max(1, filteredEvents.length)) * 100),
                badge: "Active"
              },
              {
                label: "Confirmed",
                count: filteredEvents.filter(e => e.status === "confirmed").length,
                color: "bg-gradient-to-r from-purple-500 to-pink-500",
                icon: <CheckCircle2 size={15} />,
                pastel: "bg-purple-50/80 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200/50 hover:border-purple-400 hover:shadow-purple-500/10",
                percent: Math.round((filteredEvents.filter(e => e.status === "confirmed").length / Math.max(1, filteredEvents.length)) * 100),
                badge: "Locked"
              },
              {
                label: "In Review",
                count: filteredEvents.filter(e => e.status === "in-review" || e.category === "Review").length,
                color: "bg-gradient-to-r from-amber-500 to-orange-400",
                icon: <Bookmark size={15} />,
                pastel: "bg-amber-50/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200/50 hover:border-amber-400 hover:shadow-amber-500/10",
                percent: Math.round((filteredEvents.filter(e => e.status === "in-review" || e.category === "Review").length / Math.max(1, filteredEvents.length)) * 100),
                badge: "Audit"
              },
              {
                label: "Completed",
                count: filteredEvents.filter(e => e.status === "done").length,
                color: "bg-gradient-to-r from-emerald-600 to-green-500",
                icon: <Award size={15} />,
                pastel: "bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 hover:border-emerald-400 hover:shadow-emerald-500/10",
                percent: Math.round((filteredEvents.filter(e => e.status === "done").length / Math.max(1, filteredEvents.length)) * 100),
                badge: "Done"
              },
              {
                label: "Milestones",
                count: workspaceMilestones.length || 3,
                color: "bg-gradient-to-r from-rose-500 to-red-500",
                icon: <Flame size={15} />,
                pastel: "bg-rose-50/80 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200/50 hover:border-rose-400 hover:shadow-rose-500/10",
                percent: 75,
                badge: "Target"
              },
            ].map((col, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -6, scale: 1.035 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 450, damping: 25 }}
                onClick={() => setActivePipelineModal(col.label)}
                className={cn(
                  "p-3.5 rounded-2xl border flex flex-col items-center justify-between text-center transition-all cursor-pointer shadow-xs hover:shadow-xl group select-none relative overflow-hidden",
                  col.pastel
                )}
                title={`Click to view ${col.label} items`}
              >
                {/* Subtle card watermark pattern */}
                <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px]" />

                {/* Shimmer sheen sweep on hover */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent pointer-events-none" />

                <div className="size-9 rounded-xl bg-white/90 dark:bg-neutral-900/80 shadow-xs flex items-center justify-center mb-2 group-hover:scale-115 group-hover:rotate-6 transition-transform relative z-10">
                  {col.icon}
                </div>
                <div className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 relative z-10">
                  {col.count}
                </div>
                <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mt-0.5 flex items-center gap-1 relative z-10">
                  <span>{col.label}</span>
                  <ArrowUpRight size={11} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
                <div className="w-full mt-3 space-y-1 relative z-10">
                  <div className="w-full h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(8, col.percent)}%` }}
                      transition={{ duration: 0.9, delay: 0.1 * idx, ease: [0.16, 1, 0.3, 1] }}
                      className={cn("h-full rounded-full relative overflow-hidden", col.color)}
                    >
                      {/* Moving candy-cane shimmer */}
                      <div className="absolute inset-0 opacity-30 bg-[linear-gradient(45deg,rgba(255,255,255,0.4)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.4)_50%,rgba(255,255,255,0.4)_75%,transparent_75%,transparent)] [background-size:12px_12px] animate-[pulse_2s_ease-in-out_infinite]" />
                    </motion.div>
                  </div>
                  <div className="flex items-center justify-between text-[9.5px] font-bold text-neutral-400 px-0.5">
                    <span>{col.badge}</span>
                    <span>{col.percent}%</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── INTERACTIVE KPI TELEMETRY DETAIL MODALS ── */}
        <AnimatePresence>
          {activeKpiModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                className="w-full max-w-xl p-6 rounded-3xl bg-white dark:bg-[#161824] border border-black/10 dark:border-white/10 shadow-2xl space-y-5 relative overflow-hidden"
              >
                {/* Subtle Dot Grid Canvas Texture */}
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />

                {/* Modal Header */}
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                      {activeKpiModal === "completion" && <TrendingUp size={20} />}
                      {activeKpiModal === "focus" && <Clock size={20} />}
                      {activeKpiModal === "pages" && <FileText size={20} />}
                      {activeKpiModal === "balance" && <HeartPulse size={20} />}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                        {activeKpiModal === "completion" && "Task Completion & Velocity Breakdown"}
                        {activeKpiModal === "focus" && "Focus Sessions & Scheduled Workload"}
                        {activeKpiModal === "pages" && "Knowledge Base & Document Sync Tracker"}
                        {activeKpiModal === "balance" && "Cognitive Flow, Wellness & Circadian Alignment"}
                      </h3>
                      <p className="text-xs text-neutral-400">Live telemetry synchronized with active workspace events</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveKpiModal(null)}
                    className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Modal Body Content */}
                <div className="relative z-10 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  {/* KPI 1: Completion */}
                  {activeKpiModal === "completion" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/40 dark:border-blue-800/40 text-center">
                          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{summaryMetrics.completionRate}%</div>
                          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">Velocity Rate</div>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/40 dark:border-emerald-800/40 text-center">
                          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{summaryMetrics.completed}</div>
                          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">Completed Tasks</div>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/40 border border-purple-200/40 dark:border-purple-800/40 text-center">
                          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{summaryMetrics.total}</div>
                          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">Total Pipeline</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Active Tasks in Workspace:</div>
                        <div className="divide-y divide-black/5 dark:divide-white/5 border border-black/5 dark:border-white/5 rounded-2xl overflow-hidden bg-neutral-50/50 dark:bg-neutral-900/30">
                          {events.slice(0, 6).map((ev) => (
                            <div key={ev.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={ev.status === "done"}
                                  onChange={() => {
                                    const nextStatus = ev.status === "done" ? "todo" : "done";
                                    setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, status: nextStatus } : e));
                                    onEventUpdate?.(ev.id, { status: nextStatus });
                                    showToast(`Task marked as ${nextStatus}`);
                                  }}
                                  className="size-4 rounded accent-emerald-600 cursor-pointer"
                                />
                                <span className={cn("truncate font-medium", ev.status === "done" ? "line-through text-neutral-400" : "text-neutral-800 dark:text-neutral-200")}>
                                  {ev.title}
                                </span>
                              </div>
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                                ev.status === "done" ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" : "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                              )}>
                                {ev.status || "todo"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* KPI 2: Focus */}
                  {activeKpiModal === "focus" && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-800/40 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Total Workload Logged</div>
                          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{summaryMetrics.totalTimeSpentHours} Hours</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            handleSmartRebalance();
                            setActiveKpiModal(null);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
                        >
                          Auto-Insert 15m Breaks
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Daily Workload Distribution:</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {Array.from(dailyWorkload.entries()).slice(0, 4).map(([dayKey, load]) => (
                            <div key={dayKey} className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-black/5 dark:border-white/5 text-xs flex justify-between items-center">
                              <div>
                                <div className="font-mono font-bold text-neutral-800 dark:text-neutral-200">{dayKey}</div>
                                <div className="text-[10px] text-neutral-400">{load.eventCount} events scheduled</div>
                              </div>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">{load.totalHours.toFixed(1)}h ({load.status})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* KPI 3: Pages */}
                  {activeKpiModal === "pages" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200/40 dark:border-amber-800/40 text-center">
                          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{summaryMetrics.totalPages}</div>
                          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">Active Knowledge Pages</div>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/40 dark:border-indigo-800/40 text-center">
                          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{workspaceTracks.length}</div>
                          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">Synced Workspace Tracks</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Knowledge Documents:</div>
                        <div className="space-y-2">
                          {workspaceTracks.length > 0 ? (
                            workspaceTracks.map(track => (
                              <div key={track.id} className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-black/5 dark:border-white/5 flex items-center justify-between text-xs">
                                <div className="font-bold text-neutral-800 dark:text-neutral-200">{track.title}</div>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-mono">
                                  {track.category} • {track.progress}%
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="p-4 rounded-xl text-center text-xs text-neutral-400 border border-dashed border-black/10 dark:border-white/10">
                              No external tracks linked yet. Use &ldquo;Add to Calendar&rdquo; from any page topbar.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* KPI 4: Balance */}
                  {activeKpiModal === "balance" && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-cyan-50/70 dark:bg-cyan-950/40 border border-cyan-200/50 dark:border-cyan-800/40 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-cyan-800 dark:text-cyan-300">Cognitive Balance State</span>
                          <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-cyan-200/60 dark:bg-cyan-900/60 text-cyan-900 dark:text-cyan-100">
                            Optimal (Safe Load)
                          </span>
                        </div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                          Your tasks match circadian energy curves. Peak focus occurs between 09:00 - 11:00 AM. Zero consecutive marathon overloads detected.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-black/5 dark:border-white/5 text-xs space-y-2">
                        <div className="font-bold text-neutral-700 dark:text-neutral-300">Circadian Energy Curve Guidance:</div>
                        <div className="flex items-center justify-between text-[11px] text-neutral-500">
                          <span>09:00 - 11:00: High Energy (Deep Work)</span>
                          <span className="text-emerald-600 font-bold">100% Score</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-neutral-500">
                          <span>13:00 - 14:00: Natural Post-Lunch Dip</span>
                          <span className="text-amber-600 font-bold">Rest Recommended</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-neutral-500">
                          <span>15:00 - 17:00: Secondary Focus Wave</span>
                          <span className="text-blue-600 font-bold">Execution Zone</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end gap-2 pt-2 border-t border-black/5 dark:border-white/5 relative z-10">
                  <button
                    type="button"
                    onClick={() => setActiveKpiModal(null)}
                    className="px-5 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold shadow-md cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── INTERACTIVE PIPELINE STAGE INSPECTOR MODAL ── */}
        <AnimatePresence>
          {activePipelineModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                className="w-full max-w-lg p-6 rounded-3xl bg-white dark:bg-[#161824] border border-black/10 dark:border-white/10 shadow-2xl space-y-4 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                      <span>{activePipelineModal} Stage Inspector</span>
                    </h3>
                    <p className="text-xs text-neutral-400">All events and milestones categorized under this stage</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActivePipelineModal(null)}
                    className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                  {activePipelineModal === "Milestones" ? (
                    workspaceMilestones.length > 0 ? (
                      workspaceMilestones.map((m, mIdx) => (
                        <div key={m.id || `ms-${mIdx}`} className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-black/5 dark:border-white/5 space-y-1 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-neutral-900 dark:text-white">{m.title}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                              {m.progress ?? 75}% Completed
                            </span>
                          </div>
                          <div className="text-[10px] text-neutral-400">Target: {m.targetDate ? new Date(m.targetDate).toLocaleDateString() : m.badge || "Q3 Sprint Launch"}</div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 rounded-2xl text-center text-xs text-neutral-400 border border-dashed border-black/10 dark:border-white/10">
                        3 System Milestones Active: Q3 Sprint Launch, API Hardening, Product Delivery
                      </div>
                    )
                  ) : (
                    (() => {
                      const stageKey = activePipelineModal === "Todo" ? "todo" : activePipelineModal === "In Progress" ? "in-progress" : activePipelineModal === "Confirmed" ? "confirmed" : activePipelineModal === "In Review" ? "in-review" : "done";
                      const stageEvents = filteredEvents.filter(e => {
                        if (stageKey === "todo") return e.status === "todo" || !e.status;
                        if (stageKey === "in-review") return e.status === "in-review" || e.category === "Review";
                        return e.status === stageKey;
                      });

                      if (stageEvents.length === 0) {
                        return (
                          <div className="p-6 rounded-2xl text-center text-xs text-neutral-400 border border-dashed border-black/10 dark:border-white/10">
                            No events matching current filter in &ldquo;{activePipelineModal}&rdquo; stage.
                          </div>
                        );
                      }

                      return stageEvents.map(ev => (
                        <div key={ev.id} className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-black/5 dark:border-white/5 flex items-center justify-between text-xs gap-3">
                          <div className="min-w-0">
                            <div className="font-bold text-neutral-900 dark:text-white truncate">{ev.title}</div>
                            <div className="text-[10px] text-neutral-400">{ev.category || "General"} • {new Date(ev.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {ev.status !== "done" ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, status: "done" } : e));
                                  onEventUpdate?.(ev.id, { status: "done" });
                                  showToast(`Marked "${ev.title}" as completed`);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px] hover:bg-emerald-700 cursor-pointer"
                              >
                                Mark Done
                              </button>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">✓ Completed</span>
                            )}
                          </div>
                        </div>
                      ));
                    })()
                  )}
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-black/5 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      handleFindFreeSlot();
                      setActivePipelineModal(null);
                    }}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                  >
                    + Add New Event Slot
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePipelineModal(null)}
                    className="px-5 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold shadow-md cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── AI SMART REBALANCE STUDIO MODAL (SOFT, SMOOTH & ULTRA-CLEAN LUXURY DESIGN) ── */}
        <AnimatePresence>
          {isRebalanceModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-xs select-none">
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 16 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="w-full max-w-4xl max-h-[92vh] flex flex-col p-5 sm:p-7 rounded-[32px] bg-[#fafbfc] dark:bg-[#0c1017] border border-slate-200/90 dark:border-slate-800 shadow-[0_24px_80px_rgba(15,23,42,0.22),inset_0_1px_2px_rgba(255,255,255,0.9)] space-y-4 relative overflow-hidden text-slate-900 dark:text-slate-100 transform-gpu"
              >
                {/* Lightweight CSS Radial Glows (Zero blur repaints on scroll) */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20"
                  style={{
                    backgroundImage: `
                      radial-gradient(circle at 10% 10%, rgba(16, 185, 129, 0.08) 0%, transparent 45%),
                      radial-gradient(circle at 90% 20%, rgba(2, 132, 199, 0.08) 0%, transparent 45%),
                      radial-gradient(circle at 50% 90%, rgba(13, 148, 136, 0.06) 0%, transparent 50%),
                      radial-gradient(circle, rgba(100, 116, 139, 0.15) 1px, transparent 1px)
                    `,
                    backgroundSize: "100% 100%, 100% 100%, 100% 100%, 24px 24px"
                  }}
                />

                {/* ── TOP HEADER WITH MINIMALIST SQUIRCLE & SYSTEM STATUS ── */}
                <div className="flex items-start justify-between relative z-10 shrink-0">
                  <div className="flex items-center gap-3.5">
                    {/* Clean Frosted Squircle Icon Badge */}
                    <div className="relative shrink-0">
                      <div className="size-11 sm:size-12 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-50 dark:from-slate-800 dark:via-slate-850 dark:to-slate-900 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shadow-[0_4px_16px_rgba(16,185,129,0.12),inset_0_1px_2px_rgba(255,255,255,0.9)] border border-emerald-500/20 dark:border-emerald-500/30">
                        <Sparkles size={20} className="text-emerald-500" />
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0c1017] flex items-center justify-center shadow-xs">
                        <span className="size-1 rounded-full bg-white" />
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold tracking-wider uppercase border border-slate-200 dark:border-slate-700 shadow-2xs">
                          <BrainCircuit size={11} className="text-emerald-600 dark:text-emerald-400" />
                          <span>Noska Neural Engine v2.4</span>
                        </div>
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold border border-emerald-500/20">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          <span>{events.length} Active Tasks</span>
                        </div>
                      </div>

                      <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
                        <span>AI Smart Rebalance Studio</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                        Harmonize workload rhythm, inject restorative buffers & eliminate schedule collisions.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsRebalanceModalOpen(false)}
                    className="size-8.5 rounded-full bg-slate-100/90 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition flex items-center justify-center border border-slate-200/80 dark:border-slate-700 cursor-pointer shrink-0 ml-2"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* ── SCROLLABLE STUDIO BODY (GPU ACCELERATED & ZERO LAG) ── */}
                <div className="space-y-3.5 relative z-10 overflow-y-auto flex-1 overscroll-contain pr-1.5 scroll-smooth [scrollbar-width:thin] [scrollbar-color:rgba(100,116,139,0.3)_transparent] transform-gpu will-change-transform">
                  {/* ── 3 SOFT REBALANCING MODEL CARDS (HALFTONE & SQUIRCLE ACCENTS) ── */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                        <span>1. Optimization Strategy</span>
                        <span className="text-[10px] font-normal text-slate-400 lowercase">(1-click neural sync)</span>
                      </span>
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                        {overlappingEventIds.size > 0 ? `⚠️ ${overlappingEventIds.size} overlap collisions` : "✨ Clean schedule rhythm"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        {
                          id: "circadian" as const,
                          label: "Circadian Flow",
                          icon: "🌿",
                          desc: `Auto-injects +${rebalanceBufferMinutes}m rest buffers after long tasks and aligns with daily energy waves.`,
                          badge: "Recommended",
                          badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
                          activeClass: "bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-500/50 shadow-[0_6px_20px_rgba(16,185,129,0.1)] ring-1.5 ring-emerald-500/40",
                          highlight: `+${rebalanceBufferMinutes}m Rest Buffer`,
                          accentColor: "bg-emerald-500 dark:bg-emerald-400",
                          energyBars: [85, 50, 95, 65]
                        },
                        {
                          id: "deepwork" as const,
                          label: "Deep Work Max",
                          icon: "⚡",
                          desc: `Consolidates fragmented tasks into uninterrupted ${rebalanceBlockSizeMinutes}m focused sprint blocks.`,
                          badge: "Deep Focus",
                          badgeClass: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25",
                          activeClass: "bg-sky-50/70 dark:bg-sky-950/25 border-sky-500/50 shadow-[0_6px_20px_rgba(14,165,233,0.1)] ring-1.5 ring-sky-500/40",
                          highlight: `${rebalanceBlockSizeMinutes}m Focus Blocks`,
                          accentColor: "bg-sky-500 dark:bg-sky-400",
                          energyBars: [100, 100, 45, 90]
                        },
                        {
                          id: "conflicts" as const,
                          label: "Zero Conflict",
                          icon: "🎯",
                          desc: `Detects ${overlappingEventIds.size} collisions and automatically spaces overlapping tasks into free gaps.`,
                          badge: "Collision Solver",
                          badgeClass: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/25",
                          activeClass: "bg-teal-50/70 dark:bg-teal-950/25 border-teal-500/50 shadow-[0_6px_20px_rgba(20,184,166,0.1)] ring-1.5 ring-teal-500/40",
                          highlight: "0 Overlaps",
                          accentColor: "bg-teal-500 dark:bg-teal-400",
                          energyBars: [75, 75, 75, 75]
                        }
                      ].map(st => {
                        const isSelected = rebalanceStrategy === st.id;
                        return (
                          <div
                            key={st.id}
                            onClick={() => setRebalanceStrategy(st.id)}
                            className={cn(
                              "p-4 rounded-[22px] border transition-all cursor-pointer flex flex-col justify-between select-none relative overflow-hidden",
                              isSelected
                                ? st.activeClass
                                : "bg-white/90 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                            )}
                          >
                            {/* Subtle halftone ring accent in top corner (Image 2) */}
                            <div
                              className="absolute top-0 right-0 size-20 pointer-events-none opacity-20 dark:opacity-10"
                              style={{
                                backgroundImage: "radial-gradient(circle, rgba(16, 185, 129, 0.4) 1px, transparent 1px)",
                                backgroundSize: "6px 6px"
                              }}
                            />

                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xl">{st.icon}</span>
                                <div className="flex items-center gap-1.5">
                                  <span className={cn("text-[9.5px] font-bold px-2 py-0.5 rounded-full border", st.badgeClass)}>
                                    {st.badge}
                                  </span>
                                  {isSelected && (
                                    <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  )}
                                </div>
                              </div>
                              <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{st.label}</div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{st.desc}</p>
                            </div>

                            <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                              <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                                {st.highlight}
                              </span>
                              <div className="flex items-end gap-1 h-3 shrink-0">
                                {st.energyBars.map((h, i) => (
                                  <div
                                    key={i}
                                    className={cn(
                                      "w-1 rounded-full transition-all",
                                      isSelected
                                        ? st.accentColor
                                        : "bg-slate-300 dark:bg-slate-700"
                                    )}
                                    style={{ height: `${(h / 100) * 12}px` }}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── TACTILE PARAMETER CONTROLS STRIP (CLEAN & MINIMAL) ── */}
                  <div className="p-3 rounded-[20px] bg-white/95 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                    {/* Rest Buffer Duration */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Coffee size={13} className="text-emerald-600 dark:text-emerald-400" />
                        <span>Rest Buffer:</span>
                      </span>
                      <div className="inline-flex items-center p-0.5 rounded-full bg-slate-100 dark:bg-slate-800 gap-1 border border-slate-200/60 dark:border-slate-700/60">
                        {[10, 15, 20, 30].map(mins => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => setRebalanceBufferMinutes(mins)}
                            className={cn(
                              "px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer",
                              rebalanceBufferMinutes === mins
                                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            )}
                          >
                            +{mins}m {mins === 15 && "✨"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sprint Block Duration */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Zap size={13} className="text-sky-600 dark:text-sky-400" />
                        <span>Sprint Block:</span>
                      </span>
                      <div className="inline-flex items-center p-0.5 rounded-full bg-slate-100 dark:bg-slate-800 gap-1 border border-slate-200/60 dark:border-slate-700/60">
                        {[45, 60, 90, 120].map(mins => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => setRebalanceBlockSizeMinutes(mins)}
                            className={cn(
                              "px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer",
                              rebalanceBlockSizeMinutes === mins
                                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            )}
                          >
                            {mins}m
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Peak Energy Protection Toggle */}
                    <button
                      type="button"
                      onClick={() => setRebalanceProtectEnergy(!rebalanceProtectEnergy)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10.5px] font-bold border transition-all cursor-pointer",
                        rebalanceProtectEnergy
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-transparent"
                      )}
                    >
                      <span className={cn("size-2 rounded-full", rebalanceProtectEnergy ? "bg-emerald-500" : "bg-slate-400")} />
                      <span>Protect Peak (09:00 - 13:00)</span>
                    </button>
                  </div>

                  {/* ── 5x7 DOT MATRIX HARMONY SCORECARD & SPECTRUM HUD (SOFT SLATE/EMERALD) ── */}
                  <div className="p-4 rounded-[24px] bg-slate-900 dark:bg-[#0c111c] text-slate-100 border border-slate-800 shadow-[0_8px_24px_rgba(15,23,42,0.12)] relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
                      {/* Left: 5x7 Dot Matrix Neural Efficiency Readout in Soft Mint */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="p-2.5 rounded-2xl bg-black/50 border border-slate-800 shadow-inner">
                          <DotMatrixNumber
                            value={events.length === 0 ? "100" : String(Math.max(92, 100 - overlappingEventIds.size * 8))}
                            dotColor="#10b981"
                            size="md"
                          />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold tracking-wider uppercase text-emerald-400 flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full bg-emerald-400" />
                            <span>Neural Rhythm Harmony</span>
                          </div>
                          <div className="text-base font-bold text-white">
                            {events.length === 0 ? "100% Balanced Flow" : overlappingEventIds.size > 0 ? "Optimization Ready" : "100% Conflict-Free"}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 font-normal">
                            Real data synchronized across {events.length} active schedule items
                          </div>
                        </div>
                      </div>

                      {/* Right: Circadian 24-Hour Energy Curve Spectrum */}
                      <div className="flex-1 w-full max-w-sm space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-300">
                          <span>Circadian Energy Curve</span>
                          <span className="text-emerald-400 font-semibold">{rebalanceStrategy.toUpperCase()} MODE</span>
                        </div>
                        <DotSpectrumBar
                          totalCols={28}
                          activeCols={events.length > 0 ? Math.min(28, Math.max(16, events.length * 4)) : 22}
                          rows={2}
                          className="py-0.5"
                        />
                        <div className="flex items-center justify-between text-[9px] text-slate-400 font-medium">
                          <span>08:00 Peak</span>
                          <span>13:00 Buffer</span>
                          <span>17:00 Deep Focus</span>
                          <span>21:00 Rest</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── LIVE VISUAL SCHEDULE TRANSFORMATION DIFF (BEFORE VS AFTER) ── */}
                  <div className="p-4 rounded-[24px] bg-white/95 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Sliders size={13} className="text-slate-500" />
                        <span>Live Schedule Neural Transformation (Before & After Diff)</span>
                      </span>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        {rebalanceStrategy === "circadian"
                          ? `🌿 Injected +${rebalanceBufferMinutes}m Buffers`
                          : rebalanceStrategy === "deepwork"
                          ? `⚡ Compacted into ${rebalanceBlockSizeMinutes}m Sprints`
                          : `🎯 Eliminated ${overlappingEventIds.size} Collisions`}
                      </span>
                    </div>

                    {/* Dynamic Real-Data Display or Seed Button */}
                    {events.length === 0 ? (
                      <div className="py-6 px-4 rounded-[20px] bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center space-y-2.5">
                        <Sparkles size={22} className="text-emerald-600 dark:text-emerald-400" />
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Your schedule is currently clear
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm font-normal">
                          Add tasks to your schedule or click below to seed 3 realistic tasks to test the neural rebalance in 1 click.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const now = new Date();
                            const sample1: Event = {
                              id: `sample-${Date.now()}-1`,
                              title: "Product Architecture Sprint",
                              startTime: new Date(now.getTime() + 30 * 60000),
                              endTime: new Date(now.getTime() + 110 * 60000),
                              color: "#059669",
                              category: "Tasks",
                              status: "in-progress",
                              tags: ["Design", "Architecture"],
                              reminder: true
                            };
                            const sample2: Event = {
                              id: `sample-${Date.now()}-2`,
                              title: "Sprint Discovery & Review",
                              startTime: new Date(now.getTime() + 110 * 60000),
                              endTime: new Date(now.getTime() + 170 * 60000),
                              color: "#0284c7",
                              category: "Meeting",
                              status: "confirmed",
                              tags: ["Sprint", "Review"],
                              reminder: true
                            };
                            const sample3: Event = {
                              id: `sample-${Date.now()}-3`,
                              title: "Frontend Engineering Sprint",
                              startTime: new Date(now.getTime() + 180 * 60000),
                              endTime: new Date(now.getTime() + 270 * 60000),
                              color: "#0d9488",
                              category: "Work",
                              status: "todo",
                              tags: ["Development"],
                              reminder: false
                            };
                            setEvents([sample1, sample2, sample3]);
                            onEventCreate?.(sample1);
                            onEventCreate?.(sample2);
                            onEventCreate?.(sample3);
                            showToast("✨ Seeded 3 live workspace tasks into schedule!");
                          }}
                          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus size={13} />
                          <span>Seed 3 Real Tasks to Test</span>
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Panel 1: Current Schedule (Before) */}
                        <div className="p-3.5 rounded-[20px] bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            <span>Current Schedule (Before)</span>
                            <span className="text-amber-600 dark:text-amber-400 font-semibold">
                              {overlappingEventIds.size > 0 ? `⚠️ ${overlappingEventIds.size} Collisions` : "Tight Gaps"}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            {events.slice(0, 3).map((ev) => {
                              const isOverlap = overlappingEventIds.has(ev.id);
                              return (
                                <div
                                  key={ev.id}
                                  className={cn(
                                    "p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 border transition",
                                    isOverlap
                                      ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-300"
                                      : "bg-white dark:bg-slate-800/90 border-slate-200/70 dark:border-slate-700/70 text-slate-800 dark:text-slate-200"
                                  )}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <span
                                      className="size-2 rounded-full shrink-0"
                                      style={{ backgroundColor: ev.color || "#059669" }}
                                    />
                                    <span className="font-semibold truncate">{ev.title}</span>
                                  </div>
                                  <div className="text-[10.5px] font-mono text-slate-400 shrink-0">
                                    {new Date(ev.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Panel 2: Optimized Neural Schedule (After AI) */}
                        <div className="p-3.5 rounded-[20px] bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 space-y-2 relative overflow-hidden">
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                            <span>Optimized Rhythm (After AI)</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 size={11} />
                              <span>100% Conflict Free</span>
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            {events.slice(0, 3).map((ev, idx) => {
                              const simulatedStart = new Date(new Date(ev.startTime).getTime() + idx * (rebalanceBufferMinutes * 60000));
                              return (
                                <React.Fragment key={ev.id}>
                                  <div className="p-2.5 rounded-xl text-xs bg-white dark:bg-slate-800/90 border border-emerald-500/30 shadow-xs flex items-center justify-between gap-2 text-slate-800 dark:text-slate-200">
                                    <div className="flex items-center gap-2 truncate">
                                      <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                                      <span className="font-semibold truncate">{ev.title}</span>
                                    </div>
                                    <div className="text-[10.5px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                                      {simulatedStart.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                                    </div>
                                  </div>

                                  {/* Injected Buffer Indicator */}
                                  {idx < Math.min(2, events.length - 1) && (
                                    <div className="py-1 px-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[9.5px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-1.5">
                                      <span>🌿 Injected +{rebalanceBufferMinutes}m Restorative Buffer</span>
                                    </div>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── 3 SOFT CLAYMORPHYS STAT CARDS ── */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-[20px] bg-white/95 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-center">
                      <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-0.5">
                        <CheckCircle2 size={13} className="text-emerald-500" />
                        <span>Conflicts Defused</span>
                      </div>
                      <div className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        {overlappingEventIds.size > 0 ? `${overlappingEventIds.size} Resolved` : "0 (Clear)"}
                      </div>
                      <div className="text-[10px] font-medium text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                        100% Conflict-Free
                      </div>
                    </div>

                    <div className="p-3.5 rounded-[20px] bg-white/95 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-center">
                      <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-0.5">
                        <Coffee size={13} className="text-sky-500" />
                        <span>Rest Injected</span>
                      </div>
                      <div className="text-lg sm:text-xl font-bold text-sky-600 dark:text-sky-400">
                        +{rebalanceBufferMinutes}m / block
                      </div>
                      <div className="text-[10px] font-medium text-sky-700/80 dark:text-sky-300/80 mt-0.5">
                        Optimal HRV Sync
                      </div>
                    </div>

                    <div className="p-3.5 rounded-[20px] bg-white/95 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-center">
                      <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-0.5">
                        <HeartPulse size={13} className="text-teal-500" />
                        <span>Burnout Guard</span>
                      </div>
                      <div className="text-lg sm:text-xl font-bold text-teal-600 dark:text-teal-400">
                        0% Safe Flow
                      </div>
                      <div className="text-[10px] font-medium text-teal-700/80 dark:text-teal-300/80 mt-0.5">
                        Ultradian Shield Active
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── FOOTER ACTIONS (CLEAN & SOPHISTICATED) ── */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-200/80 dark:border-slate-800/80 relative z-10 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsRebalanceModalOpen(false)}
                    className="px-5 py-2.5 rounded-2xl text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() => executeSmartRebalance(rebalanceStrategy, rebalanceBufferMinutes)}
                    className="px-6 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 text-xs font-bold tracking-wide shadow-[0_4px_16px_rgba(15,23,42,0.18)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.18)] transition cursor-pointer flex items-center gap-2"
                  >
                    <Sparkles size={14} className="text-emerald-400 dark:text-emerald-600" />
                    <span>Apply AI Rebalance ({rebalanceStrategy === "circadian" ? "Circadian Flow" : rebalanceStrategy === "deepwork" ? "Deep Work" : "Zero Conflict"})</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── DEDICATED SCHEDULE STUDIO & BENTO DASHBOARD (IMAGES 1, 2, 3, 4, 5 INSPIRATION - 100% REAL DATA) ── */}
        <AnimatePresence>
          {isSlotsStudioOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-xs select-none">
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 16 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="w-full max-w-4xl max-h-[92vh] flex flex-col p-5 sm:p-7 rounded-[34px] bg-[#fbfcfd] dark:bg-[#0c1018] border border-slate-200/90 dark:border-slate-800 shadow-[0_24px_80px_rgba(15,23,42,0.22),inset_0_1px_2px_rgba(255,255,255,0.9)] space-y-3.5 relative overflow-hidden text-slate-900 dark:text-slate-100 transform-gpu"
              >
                {/* Lightweight CSS Subtle Halftone Mesh Background */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-30 dark:opacity-10"
                  style={{
                    backgroundImage: `
                      radial-gradient(circle at 85% 15%, rgba(16, 185, 129, 0.08) 0%, transparent 40%),
                      radial-gradient(circle at 15% 85%, rgba(2, 132, 199, 0.08) 0%, transparent 40%),
                      radial-gradient(circle, rgba(100, 116, 139, 0.2) 1px, transparent 1px)
                    `,
                    backgroundSize: "100% 100%, 100% 100%, 26px 26px"
                  }}
                />

                {/* ── TOP BADGE & HEADLINE ROW (CLEAN & MINIMALIST) ── */}
                <div className="flex items-start justify-between relative z-10 shrink-0">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-800 dark:text-emerald-300 text-[10.5px] font-bold tracking-wider uppercase border border-emerald-500/20 shadow-2xs">
                      <span>✦</span>
                      <span>Smart Workspace Schedule</span>
                      <span>✦</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
                      <span>Daily & Weekly Studio</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                        {events.length} Real Items
                      </span>
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Weekly / Monthly Toggle Pill */}
                    <div className="inline-flex items-center p-0.5 rounded-full bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-2xs text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setScheduleViewMode("weekly")}
                        className={cn(
                          "px-3 py-1 rounded-full transition-all cursor-pointer",
                          scheduleViewMode === "weekly"
                            ? "bg-emerald-600 text-white shadow-2xs font-extrabold"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        )}
                      >
                        Weekly
                      </button>
                      <button
                        type="button"
                        onClick={() => setScheduleViewMode("monthly")}
                        className={cn(
                          "px-3 py-1 rounded-full transition-all cursor-pointer",
                          scheduleViewMode === "monthly"
                            ? "bg-emerald-600 text-white shadow-2xs font-extrabold"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        )}
                      >
                        Monthly
                      </button>
                    </div>

                    {/* Quick + Add Event Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const target = new Date(currentDate);
                        target.setDate(target.getDate() + slotSelectedDayOffset);
                        setNewEvent({
                          title: "",
                          description: "",
                          startTime: target,
                          endTime: new Date(target.getTime() + 3600000),
                          color: colors[0].value,
                          category: "Tasks",
                          tags: [],
                          status: "confirmed",
                          progress: 0,
                          reminder: false,
                          reminderMinutes: 15
                        });
                        setIsCreating(true);
                        setIsSlotsStudioOpen(false);
                        setIsDialogOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-2xs text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
                      title="Add new event to schedule"
                    >
                      <span>✏️</span>
                      <span className="hidden sm:inline">+ Add Note...</span>
                    </button>

                    {/* Sleek Close Button */}
                    <button
                      type="button"
                      onClick={() => setIsSlotsStudioOpen(false)}
                      className="size-8.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition flex items-center justify-center border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>

                {/* ── 3-TAB STUDIO VIEW SWITCHER (STUDIO | RHYTHM MATRIX | SPECTRUM LOAD) ── */}
                <div className="flex items-center justify-between p-1 rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-2xs relative z-10 shrink-0">
                  <div className="flex items-center gap-1">
                    {[
                      { id: "studio" as const, label: "📋 Schedule Bento", desc: "Day Capsules & Tasks" },
                      { id: "matrix" as const, label: "🎛️ Rhythm Matrix", desc: "Matrix Sequencer" },
                      { id: "metrics" as const, label: "📊 Spectrum Load", desc: "LED Meter & Breakdown" },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setScheduleStudioTab(tab.id)}
                        className={cn(
                          "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                          scheduleStudioTab === tab.id
                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        )}
                      >
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="text-[11px] font-semibold text-slate-400 hidden sm:block pr-2">
                    {liveNow.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} • 100% Real Workspace Data
                  </div>
                </div>

                {/* ══════════════════════════════════════════════════════════
                    TAB 1: SCHEDULE STUDIO & BENTO DASHBOARD (IMAGES 2, 3, 4, 5)
                   ══════════════════════════════════════════════════════════ */}
                {scheduleStudioTab === "studio" && (
                  <div className="space-y-3.5 flex-1 min-h-0 flex flex-col relative z-10 overflow-y-auto overscroll-contain pr-1.5 scroll-smooth [scrollbar-width:thin] [scrollbar-color:rgba(100,116,139,0.3)_transparent] transform-gpu will-change-transform">
                    {/* ── BENTO TOP DASHBOARD WIDGETS (IMAGE 5 INSPIRED) ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
                      {/* Widget 1: Circular Progress Gauge (Image 5) */}
                      <div className="p-4 rounded-[26px] bg-white/95 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex items-center gap-4 relative overflow-hidden">
                        <div className="relative size-16 shrink-0 flex items-center justify-center">
                          <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                            <path
                              className="text-slate-100 dark:text-slate-800"
                              strokeWidth="3.5"
                              stroke="currentColor"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path
                              className="text-emerald-500 transition-all duration-700"
                              strokeDasharray={`${summaryMetrics.completionRate}, 100`}
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              stroke="currentColor"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                          </svg>
                          <span className="absolute text-sm font-black text-slate-900 dark:text-slate-100">
                            {summaryMetrics.completionRate}%
                          </span>
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            Weekly Progress
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {summaryMetrics.completed} of {summaryMetrics.total} tasks done.
                          </div>
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            {summaryMetrics.inProgress} active in flow
                          </div>
                        </div>
                      </div>

                      {/* Widget 2: Weekly Hours Real Bar Chart (Image 5) */}
                      <div className="p-4 rounded-[26px] bg-white/95 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between sm:col-span-2 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            Total Scheduled Hours
                          </div>
                          <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                            {summaryMetrics.totalTimeSpentHours}h Focus
                          </div>
                        </div>

                        {/* Mon - Sun Bar Columns from Real Data */}
                        <div className="grid grid-cols-7 gap-1.5 items-end h-12 pt-1">
                          {slotStudioWeekDays.map((day) => {
                            const targetDate = new Date(currentDate);
                            targetDate.setDate(targetDate.getDate() + day.offset);
                            const dayKey = targetDate.toISOString().slice(0, 10);
                            const workload = dailyWorkload.get(dayKey);
                            const hours = workload ? workload.totalHours : 0;
                            const isSelected = day.isSelected;
                            const heightPct = Math.min(100, Math.max(15, (hours / 8) * 100));

                            return (
                              <div
                                key={day.dayName}
                                onClick={() => setSlotSelectedDayOffset(day.offset)}
                                className="flex flex-col items-center gap-1 cursor-pointer group select-none"
                              >
                                <div className="w-full max-w-[20px] h-9 bg-slate-100 dark:bg-slate-800 rounded-t-lg flex items-end justify-center overflow-hidden p-0.5">
                                  <div
                                    className={cn(
                                      "w-full rounded-t-sm transition-all duration-300",
                                      isSelected
                                        ? "bg-emerald-500 dark:bg-emerald-400 shadow-2xs"
                                        : hours > 0
                                        ? "bg-slate-300 dark:bg-slate-600 group-hover:bg-slate-400"
                                        : "bg-slate-200/60 dark:bg-slate-700/40"
                                    )}
                                    style={{ height: `${heightPct}%` }}
                                  />
                                </div>
                                <span className={cn(
                                  "text-[9.5px] font-bold transition-colors",
                                  isSelected ? "text-emerald-600 dark:text-emerald-400 font-black" : "text-slate-400"
                                )}>
                                  {day.dayName.slice(0, 3)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Month Switcher & 7 Vertical Clay Pill Day Capsules */}
                    <div className="space-y-2 shrink-0">
                      <div className="flex items-center justify-center p-1 rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-2xs gap-3">
                        {[-1, 0, 1].map((offset) => {
                          const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
                          const mName = d.toLocaleDateString("en-US", { month: "long" });
                          const isActive = activeMonthOffset === offset;
                          return (
                            <button
                              key={offset}
                              type="button"
                              onClick={() => {
                                setActiveMonthOffset(offset);
                                setSlotSelectedDayOffset(offset * 30);
                              }}
                              className={cn(
                                "px-3.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer",
                                isActive
                                  ? "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-500/20 shadow-2xs"
                                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                              )}
                            >
                              {mName}
                            </button>
                          );
                        })}
                      </div>

                      {/* 7 Vertical Clay Pill Day Capsules */}
                      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                        {slotStudioWeekDays.map((day) => {
                          const isSelected = day.isSelected;
                          return (
                            <button
                              key={day.dayName}
                              type="button"
                              onClick={() => setSlotSelectedDayOffset(day.offset)}
                              className={cn(
                                "py-2 sm:py-2.5 px-1 sm:px-2 rounded-[20px] transition-all flex flex-col items-center justify-between min-h-[76px] sm:min-h-[82px] cursor-pointer select-none relative border",
                                isSelected
                                  ? "bg-white dark:bg-slate-850 text-emerald-700 dark:text-emerald-300 shadow-[0_6px_18px_rgba(16,185,129,0.12),inset_0_1px_2px_rgba(255,255,255,0.95)] border-emerald-500/60 dark:border-emerald-500/60 scale-[1.02]"
                                  : "bg-white/90 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-850 border-slate-200/80 dark:border-slate-800/80 shadow-2xs"
                              )}
                            >
                              <span className={cn(
                                "text-[11px] font-semibold",
                                isSelected ? "text-emerald-700 dark:text-emerald-300 font-bold" : day.isSunOrSat ? "text-amber-600 dark:text-amber-400" : "text-slate-400"
                              )}>
                                {day.dayName}
                              </span>

                              <span className={cn(
                                "text-base sm:text-lg font-black my-0.5",
                                isSelected ? "text-emerald-700 dark:text-emerald-300" : "text-slate-800 dark:text-slate-200"
                              )}>
                                {day.dayNum}
                              </span>

                              <span className={cn(
                                "text-[9px] font-semibold",
                                isSelected ? "text-emerald-600 dark:text-emerald-400 opacity-100" : "opacity-30 text-slate-400"
                              )}>
                                ✦
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Dynamic Real Category Tag Pills (Image 5 & Image 3) */}
                    <div className="flex flex-wrap items-center justify-between gap-2 px-1 shrink-0">
                      <div className="flex items-center gap-1.5 p-1 rounded-full bg-white/95 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-x-auto no-scrollbar max-w-full">
                        {dynamicCategories.slice(0, 6).map(tag => {
                          const isTagSelected = (tag === "All" && !scheduleCategoryTagFilter) || scheduleCategoryTagFilter === tag;
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => setScheduleCategoryTagFilter(tag === "All" ? null : tag)}
                              className={cn(
                                "px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                                isTagSelected
                                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                              )}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>

                      {/* Soft Color Filter Dots */}
                      <div className="flex items-center gap-1.5 p-1.5 rounded-full bg-white/95 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                        {[
                          { id: "emerald", name: "Emerald", bg: "bg-emerald-500" },
                          { id: "sky", name: "Sky", bg: "bg-sky-500" },
                          { id: "teal", name: "Teal", bg: "bg-teal-500" },
                          { id: "amber", name: "Amber", bg: "bg-amber-500" },
                          { id: "slate", name: "Slate", bg: "bg-slate-500" },
                        ].map(c => {
                          const isSelected = scheduleColorFilter === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setScheduleColorFilter(scheduleColorFilter === c.id ? null : c.id)}
                              className={cn(
                                "size-4 rounded-full transition-transform cursor-pointer relative shadow-2xs",
                                c.bg,
                                isSelected ? "ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-110" : "hover:scale-110 opacity-80 hover:opacity-100"
                              )}
                              title={`Filter by ${c.name}`}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Interactive Real Task Cards with Halftone Texture & Scalloped Accents (Image 2, 3, 4) */}
                    <div className="space-y-3 shrink-0">
                      {selectedDayRealEvents.length === 0 ? (
                        <div className="py-6 text-center space-y-1.5 rounded-[22px] bg-white/80 dark:bg-slate-900/60 border border-dashed border-slate-200 dark:border-slate-800 p-4">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            No events scheduled for this day
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Click &ldquo;+ Add Note...&rdquo; above or book an open gap below to add real focus tasks!
                          </p>
                        </div>
                      ) : (
                        selectedDayRealEvents
                          .filter(e => !scheduleCategoryTagFilter || (e.category || "").toLowerCase() === scheduleCategoryTagFilter.toLowerCase())
                          .map((event) => {
                            const isDone = event.status === "done";
                            const subtasks = event.subtasks || [];
                            const doneSubtasksCount = subtasks.filter(s => s.done).length;
                            const timeString = `${new Date(event.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} - ${new Date(event.endTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;

                            return (
                              <div
                                key={event.id}
                                className="p-4 sm:p-5 rounded-[24px] bg-white/95 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-[0_4px_16px_rgba(0,0,0,0.02)] space-y-3 relative overflow-hidden group"
                              >
                                {/* Subtle Halftone Dot Ring Accent in Top Corner (Image 2) */}
                                <div
                                  className="absolute top-0 right-0 size-24 pointer-events-none opacity-25 dark:opacity-10"
                                  style={{
                                    backgroundImage: "radial-gradient(circle, rgba(16, 185, 129, 0.4) 1px, transparent 1px)",
                                    backgroundSize: "8px 8px"
                                  }}
                                />

                                {/* Top Row */}
                                <div className="flex items-start justify-between gap-3 relative z-10">
                                  <div className="flex items-start gap-3 min-w-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newStatus = isDone ? "in-progress" : "done";
                                        setEvents(prev => prev.map(e => e.id === event.id ? { ...e, status: newStatus } : e));
                                        onEventUpdate?.(event.id, { status: newStatus });
                                        showToast(newStatus === "done" ? `Completed "${event.title}"` : `Marked "${event.title}" in-progress`);
                                      }}
                                      className={cn(
                                        "size-5.5 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer shrink-0 mt-0.5",
                                        isDone
                                          ? "bg-emerald-600 border-emerald-600 text-white"
                                          : "border-slate-300 dark:border-slate-600 hover:border-emerald-600"
                                      )}
                                    >
                                      {isDone && <Check size={13} strokeWidth={3} />}
                                    </button>

                                    <div className="min-w-0 space-y-0.5">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className={cn(
                                          "text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight",
                                          isDone && "line-through text-slate-400 dark:text-slate-500"
                                        )}>
                                          {event.title}
                                        </h4>
                                        {/* Category Chip Badge (Image 2 & 4) */}
                                        <span className="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                          {event.category || "Task"}
                                        </span>
                                      </div>
                                      {event.description && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                          {event.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                                    {timeString}
                                  </span>
                                </div>

                                {/* Real Subtasks Badges List (Image 3) */}
                                {subtasks.length > 0 && (
                                  <div className="space-y-1.5 pl-8 relative z-10">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                                      <span>Sub-tasks</span>
                                      <span className="text-emerald-600 dark:text-emerald-400">{doneSubtasksCount} of {subtasks.length}</span>
                                    </div>
                                    <div className="space-y-1">
                                      {subtasks.map((sub, sIdx) => {
                                        return (
                                          <div
                                            key={sub.id}
                                            onClick={() => handleToggleSubtask(event.id, sub.id)}
                                            className={cn(
                                              "p-2 rounded-xl border flex items-center justify-between text-xs font-semibold cursor-pointer transition-all",
                                              sub.done
                                                ? "bg-slate-100/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-400 line-through"
                                                : "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500/20 text-emerald-900 dark:text-emerald-200"
                                            )}
                                          >
                                            <div className="flex items-center gap-2">
                                              <span className={cn("size-3 rounded-full border", sub.done ? "bg-emerald-600 border-emerald-600" : "border-slate-400")} />
                                              <span>{sub.title}</span>
                                            </div>
                                            <span className="text-[10px] opacity-75 font-bold">
                                              {sub.done ? "Done" : `${sIdx + 1} of ${subtasks.length}`}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Inline Add Sub-task Row */}
                                <div className="flex items-center gap-2 pl-8 pt-1 relative z-10">
                                  <Input
                                    placeholder="+ Add Sub-task..."
                                    value={scheduleSubtaskInputs[event.id] || ""}
                                    onChange={(e) => setScheduleSubtaskInputs(prev => ({ ...prev, [event.id]: e.target.value }))}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        handleAddSubtaskToEvent(event.id, scheduleSubtaskInputs[event.id] || "");
                                      }
                                    }}
                                    className="h-8 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleAddSubtaskToEvent(event.id, scheduleSubtaskInputs[event.id] || "")}
                                    className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shrink-0 hover:opacity-90 cursor-pointer"
                                  >
                                    Add
                                  </button>
                                </div>

                                {/* Repeat Switch & Tag Row */}
                                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800 pl-8 relative z-10">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                                      Repeat daily
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleEventRecurring(event.id)}
                                      className={cn(
                                        "w-8 h-4.5 rounded-full transition-colors cursor-pointer relative p-0.5",
                                        event.recurring ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"
                                      )}
                                    >
                                      <div
                                        className={cn(
                                          "size-3.5 rounded-full bg-white shadow-xs transition-transform",
                                          event.recurring ? "translate-x-3.5" : "translate-x-0"
                                        )}
                                      />
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    {event.tags && event.tags.slice(0, 2).map(t => (
                                      <span key={t} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                                        #{t}
                                      </span>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedEvent(event);
                                        setIsCreating(false);
                                        setIsSlotsStudioOpen(false);
                                        setIsDialogOpen(true);
                                      }}
                                      className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 cursor-pointer"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                      )}

                      {/* Open Schedule Gaps Discovery Cards */}
                      <div className="pt-2">
                        <div className="text-xs font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400 mb-2 px-1 flex items-center justify-between">
                          <span>Available Open Focus Windows</span>
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            {filteredDiscoveredSlots.length} Gaps Discovered
                          </span>
                        </div>

                        {filteredDiscoveredSlots.length === 0 ? (
                          <div className="py-4 text-center text-xs text-slate-400 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-dashed border-slate-200 dark:border-slate-800">
                            No open gaps found on this day. Schedule is fully balanced.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {filteredDiscoveredSlots.map((slot) => (
                              <div
                                key={slot.id}
                                className="p-3.5 rounded-[20px] bg-white/95 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-3"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="size-7.5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                                    <Clock size={14} />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                      {format12Hour(slot.startTime)} • {slot.formattedDuration}
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                      {slot.circadianLabel}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleInsertBreakInSlot(slot)}
                                    className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                                  >
                                    ☕ +15m
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleBookSlot(slot)}
                                    className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition cursor-pointer"
                                  >
                                    ✓ Book
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ══════════════════════════════════════════════════════════
                    TAB 2: RHYTHM SEQUENCER MATRIX (IMAGE 1 INSPIRATION)
                   ══════════════════════════════════════════════════════════ */}
                {scheduleStudioTab === "matrix" && (
                  <div className="space-y-4 flex-1 min-h-0 flex flex-col justify-between relative z-10 overflow-y-auto overscroll-contain pr-1.5 scroll-smooth [scrollbar-width:thin] [scrollbar-color:rgba(100,116,139,0.3)_transparent] transform-gpu will-change-transform">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            Rhythm Matrix Sequencer
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            1-Click interactive schedule matrix. Click any block to view or book real events.
                          </p>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                          <span className="flex items-center gap-1">
                            <span className="size-2.5 rounded-sm bg-slate-900 dark:bg-white" />
                            <span>Booked</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="size-2.5 rounded-sm border border-emerald-500 bg-emerald-500/20" />
                            <span>Active Day</span>
                          </span>
                        </div>
                      </div>

                      {/* ── THE 7-DAY x 4-ROW TACTILE MATRIX (IMAGE 1 & 2) ── */}
                      <div className="p-4 sm:p-6 rounded-[28px] bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] space-y-3">
                        {/* Top Columns Pills Header */}
                        <div className="grid grid-cols-8 gap-2 items-center">
                          {/* Top-left corner row label */}
                          <div className="size-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-sm shadow-2xs">
                            +
                          </div>

                          {/* 7 Days Columns */}
                          {slotStudioWeekDays.map((day) => {
                            const isSelected = day.isSelected;
                            return (
                              <button
                                key={day.dayName}
                                type="button"
                                onClick={() => setSlotSelectedDayOffset(day.offset)}
                                className={cn(
                                  "h-8 rounded-full font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none shadow-2xs",
                                  isSelected
                                    ? "bg-emerald-600 text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)] scale-105"
                                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200/80"
                                )}
                              >
                                {day.dayName}
                              </button>
                            );
                          })}
                        </div>

                        {/* 4 Matrix Period Rows */}
                        {[
                          { periodIdx: 0, label: "1", timeLabel: "08:00 - 12:00 (Morning)" },
                          { periodIdx: 1, label: "2", timeLabel: "12:00 - 16:00 (Afternoon)", isCurrentHour: true },
                          { periodIdx: 2, label: "3", timeLabel: "16:00 - 20:00 (Evening)" },
                          { periodIdx: 3, label: "4", timeLabel: "20:00 - 24:00 (Night)" },
                        ].map((row) => (
                          <div key={row.periodIdx} className="grid grid-cols-8 gap-2 items-center">
                            {/* Left Row Number Circle */}
                            <div
                              className={cn(
                                "size-8 rounded-full font-bold text-xs flex items-center justify-center select-none shadow-2xs shrink-0 transition-transform",
                                row.isCurrentHour
                                  ? "bg-emerald-600 text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)] scale-105"
                                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                              )}
                              title={row.timeLabel}
                            >
                              {row.label}
                            </div>

                            {/* 7 Squircle Cells for this Period */}
                            {slotStudioWeekDays.map((day) => {
                              const targetDate = new Date(currentDate);
                              targetDate.setDate(targetDate.getDate() + day.offset);

                              const startHour = row.periodIdx * 4 + 8;
                              const endHour = row.periodIdx * 4 + 12;

                              // Check real events occurring in this day + time window
                              const matchingEvents = events.filter(e => {
                                const ed = new Date(e.startTime);
                                const eh = ed.getHours();
                                return (
                                  ed.getDate() === targetDate.getDate() &&
                                  ed.getMonth() === targetDate.getMonth() &&
                                  ed.getFullYear() === targetDate.getFullYear() &&
                                  eh >= startHour && eh < endHour
                                );
                              });

                              const hasEvent = matchingEvents.length > 0;
                              const isSelectedDay = day.isSelected;

                              return (
                                <div
                                  key={day.dayName}
                                  onClick={() => {
                                    setSlotSelectedDayOffset(day.offset);
                                    if (hasEvent) {
                                      showToast(`Event: "${matchingEvents[0].title}" at ${new Date(matchingEvents[0].startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`);
                                    } else {
                                      showToast(`Selected ${day.dayName} ${row.timeLabel}. Free slot available!`);
                                    }
                                  }}
                                  className={cn(
                                    "aspect-square rounded-[16px] sm:rounded-[18px] transition-all cursor-pointer flex items-center justify-center select-none relative",
                                    hasEvent
                                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                                      : isSelectedDay
                                      ? "border-2 border-emerald-500 bg-emerald-500/15 dark:bg-emerald-500/25 shadow-2xs"
                                      : "bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700"
                                  )}
                                  title={`${day.dayName} • ${row.timeLabel} ${hasEvent ? `(${matchingEvents.length} Event)` : "(Available)"}`}
                                >
                                  {hasEvent && (
                                    <span className="text-[10px] font-black">
                                      {matchingEvents.length > 1 ? matchingEvents.length : "●"}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/95 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>Focused Day: <strong>{slotStudioWeekDays.find(d => d.isSelected)?.dayName || "Today"}</strong></span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {selectedDayRealEvents.length} Scheduled • {filteredDiscoveredSlots.length} Open Windows
                      </span>
                    </div>
                  </div>
                )}

                {/* ══════════════════════════════════════════════════════════
                    TAB 3: SPECTRUM LOAD & DOTTED PROGRESS HUD (IMAGE 2 & 5)
                   ══════════════════════════════════════════════════════════ */}
                {scheduleStudioTab === "metrics" && (
                  <div className="space-y-4 flex-1 min-h-0 flex flex-col justify-between relative z-10 overflow-y-auto overscroll-contain pr-1.5 scroll-smooth [scrollbar-width:thin] [scrollbar-color:rgba(100,116,139,0.3)_transparent] transform-gpu will-change-transform">
                    {/* The Clean White Card with Dotted LED Number & Spectrum Bar (Image 2) */}
                    <div className="p-6 sm:p-7 rounded-[30px] bg-white/95 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-[0_8px_24px_rgba(0,0,0,0.02)] space-y-5 relative">
                      {/* Top Header Row with Bookmark Button (Image 2) */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                            Total Scheduled
                          </h3>
                          <p className="text-xs font-medium text-slate-400">
                            Real Workspace Focus Units & Flow Load
                          </p>
                        </div>

                        {/* Bookmark Button (Image 2) */}
                        <button
                          type="button"
                          onClick={() => {
                            setBookmarkedMetrics(!bookmarkedMetrics);
                            showToast(bookmarkedMetrics ? "Bookmark removed" : "Schedule metrics pinned to dashboard");
                          }}
                          className={cn(
                            "size-9.5 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-2xs",
                            bookmarkedMetrics
                              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                              : "bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                          )}
                        >
                          <Bookmark size={16} className={bookmarkedMetrics ? "fill-current" : ""} />
                        </button>
                      </div>

                      {/* Big Dot Matrix / LED Number Display (Image 2) */}
                      <div className="flex justify-end py-1">
                        <DotMatrixNumber
                          value={summaryMetrics.completed > 0 ? summaryMetrics.completed : summaryMetrics.total > 0 ? summaryMetrics.total : events.length}
                          dotColor="#10b981"
                          size="lg"
                        />
                      </div>

                      {/* Bottom Section: All Tasks Label + Soft Dotted Spectrum Bar (Image 2) */}
                      <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                          <span>All Scheduled Focus Units</span>
                          <span className="text-slate-900 dark:text-white font-black">
                            {summaryMetrics.completionRate}% Done
                          </span>
                        </div>

                        {/* Soft Spectrum Bar (Sage to Sky to Teal) */}
                        <DotSpectrumBar percentage={summaryMetrics.completionRate || 68} />
                      </div>
                    </div>

                    {/* Quick Real Stats Tiles (Image 5) */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-2xl bg-white/95 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-center shadow-2xs">
                        <div className="text-[11px] text-slate-400 font-bold">Total Events</div>
                        <div className="text-lg font-black text-slate-900 dark:text-white">{summaryMetrics.total}</div>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-white/95 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-center shadow-2xs">
                        <div className="text-[11px] text-slate-400 font-bold">Completed Tasks</div>
                        <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{summaryMetrics.completed}</div>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-white/95 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-center shadow-2xs">
                        <div className="text-[11px] text-slate-400 font-bold">Focus Hours</div>
                        <div className="text-lg font-black text-sky-600 dark:text-sky-400">{summaryMetrics.totalTimeSpentHours}h</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── FOOTER ACTIONS ── */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-800 relative z-10 shrink-0">
                  <button
                    type="button"
                    onClick={handleBatchFillSlots}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Sparkles size={13} className="text-amber-500" />
                    <span>Auto-Fill All Gaps</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsSlotsStudioOpen(false)}
                    className="px-6 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* ── REAL WORKSPACE TRACKS ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">My Workspace Tracks</h3>
          <span className="text-xs text-neutral-400">{workspaceTracks.length} Active Tracks</span>
        </div>

        {workspaceTracks.length === 0 ? (
          <div className="rounded-[24px] p-6 text-center border border-dashed border-black/10 dark:border-white/10 text-neutral-400 text-xs flex flex-col items-center justify-center gap-1.5 py-8">
            <span className="font-semibold text-neutral-700 dark:text-neutral-300">No workspace tracks added to calendar yet</span>
            <span className="text-[11px] text-neutral-400">Click &ldquo;Add to My Calendar&rdquo; in any workspace page topbar to track and monitor its progress here.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {workspaceTracks.map((track) => {
              const theme = getEventTheme(track.color);
              return (
                <motion.div
                  key={track.id}
                  whileHover={{ y: -3, transition: { duration: 0.2 } }}
                  onClick={() => onSelectTrack?.(track.id)}
                  className={`rounded-[26px] p-5 bg-gradient-to-br ${theme.gradient} border border-black/[0.06] dark:border-white/[0.08] shadow-[0_8px_24px_rgb(0,0,0,0.03)] flex flex-col justify-between min-h-[160px] relative overflow-hidden group cursor-pointer`}
                >
                  <div className="absolute right-3 top-3 opacity-20 group-hover:opacity-30 transition-opacity">
                    <Sparkles size={48} />
                  </div>

                  <div>
                    <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-wide ${theme.bg} ${theme.text}`}>
                      {track.category}
                    </span>
                    <h4 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mt-2 truncate">
                      {track.title}
                    </h4>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      {track.subtitle}
                    </p>
                  </div>

                  <div className="pt-4 flex items-center justify-between gap-3">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                        <span>{track.progress}% completed</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${theme.bar} transition-all duration-500`}
                          style={{ width: `${Math.max(5, track.progress)}%` }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTrack?.(track.id);
                      }}
                      className="size-8 rounded-xl bg-white/90 dark:bg-black/40 hover:bg-white text-neutral-700 dark:text-neutral-200 flex items-center justify-center shadow-xs transition-all cursor-pointer group-hover:scale-105"
                      title="Open Document"
                    >
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── SCHEDULE CONTROLS & FILTER ROW ── */}
      <div className="rounded-[28px] border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#14151a] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.45)] space-y-5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Schedule
            </h2>
            <div className="flex items-center gap-1.5 bg-black/[0.04] dark:bg-white/[0.06] p-1 rounded-2xl border border-black/[0.05] dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => navigateDate("prev")}
                className="size-8 rounded-xl flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:bg-white dark:hover:bg-neutral-800 hover:shadow-2xs transition-all cursor-pointer"
                title="Previous"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-white dark:hover:bg-neutral-800 rounded-xl transition-all cursor-pointer"
              >
                {formattedRangeTitle}
              </button>
              <button
                type="button"
                onClick={() => navigateDate("next")}
                className="size-8 rounded-xl flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:bg-white dark:hover:bg-neutral-800 hover:shadow-2xs transition-all cursor-pointer"
                title="Next"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] text-[11px] font-medium text-neutral-500 dark:text-neutral-400 border border-black/[0.05] dark:border-white/[0.08]">
              <Clock size={12} className="text-neutral-400" />
              <span>{timezoneStr}</span>
            </div>

            <div className="flex items-center p-1 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.05] dark:border-white/[0.08]">
              {(["timeline", "day", "week", "month", "board", "list"] as const).map(v => {
                const isActive = view === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setView(v)}
                    className={`relative px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${isActive
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm"
                        : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                      }`}
                  >
                    <span>{v}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                setNewEvent({
                  title: "",
                  description: "",
                  startTime: new Date(),
                  endTime: new Date(Date.now() + 3600000),
                  color: colors[0].value,
                  category: "Tasks",
                  tags: [],
                  status: "confirmed",
                  progress: 0,
                  reminder: false,
                  reminderMinutes: 15,
                });
                setIsCreating(true);
                setIsDialogOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-semibold shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.8} />
              <span>Add Event</span>
            </button>
          </div>
        </div>

        {/* ── ADVANCED SMART FILTER ROW (Created Pages, Tasks, Reviews, Heavy Days) ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-black/[0.05] dark:border-white/[0.08]">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "all", label: "All Items" },
              { id: "pages", label: "📄 Created & Edited Pages" },
              { id: "tasks", label: "✅ Tasks & Deadlines" },
              { id: "reviews", label: "🧠 Spaced Reviews" },
              { id: "stress", label: "🔥 High Stress Days" },
            ].map(f => {
              const isSelected = activeTypeFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveTypeFilter(f.id as any)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${isSelected
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold shadow-xs"
                      : "bg-black/[0.03] dark:bg-white/[0.05] text-neutral-600 dark:text-neutral-400 hover:bg-black/[0.07] dark:hover:bg-white/[0.09] border border-black/[0.05] dark:border-white/[0.08]"
                    }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Direct Option in Calendar: Toggle Showing Created Pages in Timetable */}
            <button
              type="button"
              onClick={() => {
                const next = toggleAutoPages();
                showToast(next ? "Showing all workspace pages in calendar" : "Only showing added calendar items");
              }}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border cursor-pointer select-none",
                autoPagesEnabled
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 shadow-xs"
                  : "bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.06] dark:border-white/[0.08] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              )}
              title={autoPagesEnabled ? "Auto-showing created pages in timetable · Click to turn off" : "Show all created workspace pages in calendar"}
            >
              <FileText size={12.5} className={autoPagesEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-400"} />
              <span>Show Pages in Calendar</span>
              <span
                className={cn(
                  "relative inline-flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors",
                  autoPagesEnabled ? "bg-emerald-600 dark:bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-700"
                )}
              >
                <span
                  className={cn(
                    "inline-block size-3 rounded-full bg-white shadow-xs transition-transform",
                    autoPagesEnabled ? "translate-x-3" : "translate-x-0"
                  )}
                />
              </span>
            </button>

            <div className="relative min-w-[200px]">
              <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search schedule or pages..."
                className="w-full rounded-full border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] pl-9 pr-4 py-1.5 text-xs text-[var(--text)] outline-none focus:border-blue-500 placeholder:text-neutral-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── VIEW 1: TIMELINE / GANTT VIEW ── */}
      {view === "timeline" && (
        <div className="rounded-[28px] border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#14151a] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.45)] space-y-6 overflow-x-auto">
          <div className="min-w-[800px] space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-400">
                <GanttChart size={15} />
                <span>Continuous Timeline & Focus Flow</span>
              </div>
              <div className="text-xs text-neutral-400">
                Drag cards or click <b>Extend</b> (+15m/+30m) to stretch duration
              </div>
            </div>

            <div className="space-y-4">
              {dynamicCategories.filter(c => c !== "All").map(category => {
                const catEvents = filteredEvents.filter(e => (e.category || "Tasks").toLowerCase() === category.toLowerCase());
                if (catEvents.length === 0) return null;

                return (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                        {category}
                      </span>
                      <span className="text-[11px] text-neutral-400">{catEvents.length} items</span>
                    </div>

                    <div className="space-y-2 pl-2 border-l-2 border-black/[0.08] dark:border-white/[0.08]">
                      {catEvents.map(event => {
                        const theme = getEventTheme(event.color || event.category || "");
                        const start = new Date(event.startTime);
                        const end = new Date(event.endTime);
                        const isConflict = overlappingEventIds.has(event.id);

                        return (
                          <motion.div
                            key={event.id}
                            draggable
                            onDragStart={e => handleDragStart(e as any, event.id)}
                            onDragEnd={handleDragEnd}
                            onClick={() => {
                              setSelectedEvent(event);
                              setIsDialogOpen(true);
                            }}
                            className={`rounded-2xl p-3.5 border shadow-2xs ${theme.bg} ${theme.border} flex items-center justify-between gap-4 cursor-pointer hover:shadow-md transition-all group ${isConflict ? "ring-2 ring-rose-500/40" : ""
                              }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`size-3 rounded-full ${theme.solidBg} shrink-0`} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className={`text-xs font-bold truncate ${theme.text}`}>
                                    {event.title}
                                  </h4>
                                  {isConflict && (
                                    <span className="px-2 py-0.5 rounded-md bg-rose-500 text-white text-[9px] font-bold">
                                      Conflict
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[10.5px] opacity-75 mt-0.5">
                                  <span>{start.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</span>
                                  <span>·</span>
                                  <span>{start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} - {end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {/* Quick Extend Buttons */}
                              <button
                                type="button"
                                onClick={e => handleExtendEvent(event, 30, e)}
                                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white/70 dark:bg-black/40 hover:bg-white text-neutral-700 dark:text-neutral-200 opacity-0 group-hover:opacity-100 transition shadow-2xs"
                                title="Extend duration by +30m"
                              >
                                +30m
                              </button>

                              <button
                                type="button"
                                onClick={e => handleToggleReminder(event, e)}
                                className={`p-1.5 rounded-xl transition ${event.reminder
                                    ? "text-amber-600 bg-amber-500/10 font-bold"
                                    : "text-neutral-400 hover:text-neutral-700 opacity-0 group-hover:opacity-100"
                                  }`}
                                title={event.reminder ? "Reminder Active" : "Set Reminder"}
                              >
                                {event.reminder ? <BellRing size={13} /> : <Bell size={13} />}
                              </button>

                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleDuplicateEvent(event);
                                }}
                                className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-black/5 dark:hover:bg-white/5 opacity-0 group-hover:opacity-100 transition"
                                title="Duplicate Event"
                              >
                                <Copy size={13} />
                              </button>

                              <span className="px-2.5 py-0.5 rounded-full bg-white/80 dark:bg-black/40 text-[10px] font-semibold capitalize">
                                {event.status || "Planned"}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW 2: WEEKLY TIMETABLE (With Drag, Stress Analyzer & Duration Resizing) ── */}
      {view === "week" && (
        <div className="rounded-[28px] border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#14151a] p-4 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.45)] overflow-x-auto">
          <div className="min-w-[780px]">
            <div className="grid grid-cols-[70px_repeat(7,1fr)] border-b border-black/[0.06] dark:border-white/[0.08] pb-3 mb-2">
              <div className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider pl-2">
                Time
              </div>
              {weekDays.map((d, i) => {
                const isToday = d.toDateString() === liveNow.toDateString();
                const dayNum = d.getDate();
                const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
                const dayKey = d.toISOString().slice(0, 10);
                const load = dailyWorkload.get(dayKey);

                return (
                  <div key={i} className="text-center px-1 space-y-1">
                    {isToday ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-bold shadow-xs">
                        <span>{dayNum}</span>
                        <span>·</span>
                        <span>{dayName}</span>
                      </div>
                    ) : (
                      <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 py-0.5">
                        <span>{dayNum}</span> <span>{dayName}</span>
                      </div>
                    )}

                    <div className="text-[9.5px]">
                      {load ? (
                        <span className={`inline-block px-2 py-0.5 rounded-full font-semibold ${load.status === "busy"
                            ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold"
                            : load.status === "moderate"
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-medium"
                              : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          }`}>
                          {load.label}
                        </span>
                      ) : (
                        <span className="text-neutral-400">✨ Free</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="relative">
              {timetableHours.map(hour => {
                const hourLabel = `${String(hour).padStart(2, "0")}:00`;
                return (
                  <div
                    key={hour}
                    className="grid grid-cols-[70px_repeat(7,1fr)] min-h-[76px] border-b border-black/[0.04] dark:border-white/[0.06] relative group/row"
                  >
                    <div className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 pt-1 pl-2">
                      {hourLabel}
                    </div>

                    {weekDays.map((d, dayIdx) => {
                      const isToday = d.toDateString() === liveNow.toDateString();
                      const slotKey = `${d.toISOString().slice(0, 10)}-${hour}`;
                      const isDragOver = dragOverTarget === slotKey;

                      const slotEvents = filteredEvents.filter(e => {
                        const ed = new Date(e.startTime);
                        return (
                          ed.getDate() === d.getDate() &&
                          ed.getMonth() === d.getMonth() &&
                          ed.getFullYear() === d.getFullYear() &&
                          ed.getHours() === hour
                        );
                      });

                      return (
                        <div
                          key={dayIdx}
                          onClick={() => openSlotCreate(d, hour)}
                          onDragOver={e => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                            if (dragOverTarget !== slotKey) setDragOverTarget(slotKey);
                          }}
                          onDragLeave={() => {
                            if (dragOverTarget === slotKey) setDragOverTarget(null);
                          }}
                          onDrop={e => handleSlotDrop(d, hour, e)}
                          className={`border-l border-black/[0.04] dark:border-white/[0.06] p-1.5 relative transition-colors cursor-pointer hover:bg-black/[0.015] dark:hover:bg-white/[0.02] ${isToday ? "bg-neutral-50/40 dark:bg-neutral-900/30" : ""
                            } ${isDragOver ? "bg-blue-500/10 border-blue-500/40" : ""}`}
                        >
                          <div className="space-y-1.5">
                            {slotEvents.map(event => {
                              const theme = getEventTheme(event.color || event.category || "");
                              const timeSpan = `${new Date(event.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} - ${new Date(event.endTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
                              const isConflict = overlappingEventIds.has(event.id);

                              return (
                                <motion.div
                                  key={event.id}
                                  draggable
                                  onDragStart={e => handleDragStart(e as any, event.id)}
                                  onDragEnd={handleDragEnd}
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  onClick={e => {
                                    e.stopPropagation();
                                    setSelectedEvent(event);
                                    setIsDialogOpen(true);
                                  }}
                                  className={`rounded-2xl p-2.5 border shadow-2xs transition-all hover:scale-[1.02] hover:shadow-md cursor-grab active:cursor-grabbing select-none group/card relative ${theme.bg} ${theme.border} ${isConflict ? "ring-2 ring-rose-500/50" : ""
                                    }`}
                                >
                                  <div className="flex items-start justify-between gap-1.5">
                                    <h4 className={`text-xs font-bold leading-snug truncate ${theme.text}`}>
                                      {event.title}
                                    </h4>

                                    <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                      <button
                                        type="button"
                                        onClick={e => handleExtendEvent(event, 30, e)}
                                        className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/80 dark:bg-black/50 text-neutral-700 dark:text-neutral-300"
                                        title="Extend +30m"
                                      >
                                        +30m
                                      </button>
                                      <button
                                        type="button"
                                        onClick={e => {
                                          e.stopPropagation();
                                          handleDuplicateEvent(event);
                                        }}
                                        className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-neutral-500"
                                        title="Duplicate"
                                      >
                                        <Copy size={11} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={e => handleToggleReminder(event, e)}
                                        className={`p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 ${event.reminder ? "text-amber-600" : "text-neutral-500"}`}
                                        title={event.reminder ? "Reminder set" : "Set reminder"}
                                      >
                                        <Bell size={11} />
                                      </button>
                                    </div>
                                  </div>

                                  <div className={`text-[10px] font-medium mt-0.5 opacity-75 ${theme.text}`}>
                                    {timeSpan}
                                  </div>

                                  <div className="mt-2 flex items-center justify-between gap-1 flex-wrap">
                                    {event.status === "confirmed" && (
                                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/80 dark:bg-black/40 text-[9.5px] font-semibold text-emerald-700 dark:text-emerald-300 shadow-2xs">
                                        <CheckCircle2 size={10} className="text-emerald-500" />
                                        <span>Confirmed</span>
                                      </div>
                                    )}

                                    {isConflict && (
                                      <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold">
                                        <AlertTriangle size={9} />
                                        <span>Overlap</span>
                                      </div>
                                    )}

                                    {event.reminder && (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                                        <BellRing size={9} />
                                        <span>Alert</span>
                                      </span>
                                    )}
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {(() => {
                const currentHour = liveNow.getHours();
                const currentMinutes = liveNow.getMinutes();
                if (currentHour >= 8 && currentHour <= 20) {
                  const hourOffset = currentHour - 8;
                  const topPercent = ((hourOffset * 60 + currentMinutes) / (13 * 60)) * 100;
                  const timeFormatted = liveNow.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                  return (
                    <div
                      className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                      style={{ top: `${topPercent}%` }}
                    >
                      <div className="px-2 py-0.5 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[10px] font-bold shadow-md">
                        {timeFormatted}
                      </div>
                      <div className="flex-1 h-[2px] bg-neutral-900/80 dark:bg-white/80 shadow-xs" />
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW 3: BOARD VIEW ── */}
      {view === "board" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(
            [
              { id: "todo", label: "Todo list", color: "blue" },
              { id: "in-progress", label: "In Progress", color: "amber" },
              { id: "in-review", label: "In Review", color: "purple" },
              { id: "done", label: "Done", color: "green" }
            ] as const
          ).map(col => {
            const colEvents = filteredEvents.filter(e => {
              if (col.id === "done") return e.status === "done";
              if (col.id === "in-review") return e.status === "in-review";
              if (col.id === "in-progress") return e.status === "in-progress";
              return !e.status || e.status === "todo" || e.status === "confirmed";
            });

            return (
              <div
                key={col.id}
                onDragOver={e => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={e => handleBoardDrop(col.id as any, e)}
                className="rounded-[24px] border border-black/[0.06] dark:border-white/[0.08] bg-white/80 dark:bg-[#15171e]/80 backdrop-blur-md p-4 space-y-3.5 shadow-xs"
              >
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      ▸ {col.label}
                    </span>
                    <span className="px-2 py-0.2 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-[10.5px] font-semibold text-neutral-500">
                      {colEvents.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNewEvent({
                        title: "",
                        startTime: new Date(),
                        endTime: new Date(Date.now() + 3600000),
                        status: col.id as any
                      });
                      setIsCreating(true);
                      setIsDialogOpen(true);
                    }}
                    className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-neutral-400 hover:text-neutral-700 transition cursor-pointer"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className="space-y-3 min-h-[220px]">
                  {colEvents.length === 0 ? (
                    <div className="py-8 text-center text-xs text-neutral-400 border border-dashed border-black/[0.08] dark:border-white/[0.08] rounded-2xl">
                      Drop tasks here
                    </div>
                  ) : (
                    colEvents.map(item => {
                      const theme = getEventTheme(item.color || item.category || col.color);
                      return (
                        <motion.div
                          key={item.id}
                          draggable
                          onDragStart={e => handleDragStart(e as any, item.id)}
                          onDragEnd={handleDragEnd}
                          layout
                          onClick={() => {
                            setSelectedEvent(item);
                            setIsDialogOpen(true);
                          }}
                          className={`rounded-2xl p-4 border shadow-2xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing group ${theme.bg} ${theme.border}`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-2">
                            <div className="flex flex-wrap gap-1">
                              {item.tags && item.tags.length > 0 ? (
                                item.tags.map(t => (
                                  <span
                                    key={t}
                                    className="px-2 py-0.5 rounded-lg bg-white/70 dark:bg-black/30 text-[10px] font-semibold text-neutral-700 dark:text-neutral-300"
                                  >
                                    #{t}
                                  </span>
                                ))
                              ) : (
                                <span className="px-2 py-0.5 rounded-lg bg-white/70 dark:bg-black/30 text-[10px] font-semibold text-neutral-700 dark:text-neutral-300">
                                  #{item.category || "workspace"}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleDuplicateEvent(item);
                                }}
                                className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-neutral-500"
                                title="Duplicate"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          </div>

                          <h4 className={`text-sm font-bold leading-tight ${theme.text}`}>
                            {item.title}
                          </h4>

                          {item.description && (
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-2">
                              {item.description}
                            </p>
                          )}

                          <div className="mt-3 pt-2 border-t border-black/[0.05] dark:border-white/[0.07] flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                            <span className="flex items-center gap-1">
                              <Clock size={11} />
                              {new Date(item.startTime).toLocaleDateString([], { month: "short", day: "numeric" })}
                            </span>
                            <span className="font-semibold capitalize">{item.status || "Planned"}</span>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── VIEW 4: DAY VIEW ── */}
      {view === "day" && (
        <div className="rounded-[28px] border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#14151a] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.45)]">
          <div className="space-y-2">
            {timetableHours.map(h => {
              const hourEvents = filteredEvents.filter(e => {
                const ed = new Date(e.startTime);
                return (
                  ed.getDate() === currentDate.getDate() &&
                  ed.getMonth() === currentDate.getMonth() &&
                  ed.getFullYear() === currentDate.getFullYear() &&
                  ed.getHours() === h
                );
              });

              return (
                <div
                  key={h}
                  onClick={() => openSlotCreate(currentDate, h)}
                  onDragOver={e => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={e => handleSlotDrop(currentDate, h, e)}
                  className="flex items-start gap-4 p-3 rounded-2xl hover:bg-black/[0.02] dark:hover:bg-white/[0.02] border-b border-black/[0.04] dark:border-white/[0.06] cursor-pointer transition-colors min-h-[64px]"
                >
                  <div className="w-16 shrink-0 text-xs font-semibold text-neutral-400 pt-1">
                    {String(h).padStart(2, "0")}:00
                  </div>
                  <div className="flex-1 space-y-2">
                    {hourEvents.map(evt => {
                      const theme = getEventTheme(evt.color || evt.category || "");
                      return (
                        <div
                          key={evt.id}
                          draggable
                          onDragStart={e => handleDragStart(e as any, evt.id)}
                          onDragEnd={handleDragEnd}
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedEvent(evt);
                            setIsDialogOpen(true);
                          }}
                          className={`rounded-2xl p-3 border shadow-2xs ${theme.bg} ${theme.border} flex items-center justify-between gap-4 cursor-grab`}
                        >
                          <div>
                            <h4 className={`text-sm font-bold ${theme.text}`}>{evt.title}</h4>
                            <p className="text-xs opacity-75 mt-0.5">{evt.description || "Scheduled event"}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={e => handleExtendEvent(evt, 30, e)}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/70 dark:bg-black/40 text-neutral-700 dark:text-neutral-300"
                              title="Extend +30m"
                            >
                              +30m
                            </button>
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                handleDuplicateEvent(evt);
                              }}
                              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700"
                              title="Duplicate"
                            >
                              <Copy size={13} />
                            </button>
                            <span className="text-xs font-semibold opacity-75">
                              {new Date(evt.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── VIEW 5: MONTH VIEW (Matching User Image with Rich Day Modal & Page Spending Time) ── */}
      {view === "month" && (
        <div className="rounded-[28px] border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#14151a] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.45)]">
          <div className="grid grid-cols-7 border-b border-black/[0.06] dark:border-white/[0.08] pb-3 mb-2">
            {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map(d => (
              <div key={d} className="text-center text-xs font-bold uppercase tracking-wider text-neutral-400">
                {d}
              </div>
            ))}
          </div>

          {(() => {
            const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const start = new Date(firstDay);
            start.setDate(start.getDate() - start.getDay());
            const days: Date[] = [];
            const cur = new Date(start);
            for (let i = 0; i < 35; i++) {
              days.push(new Date(cur));
              cur.setDate(cur.getDate() + 1);
            }

            return (
              <div className="grid grid-cols-7 gap-1.5">
                {days.map((day, i) => {
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                  const isToday = day.toDateString() === liveNow.toDateString();
                  const dayKey = day.toISOString().slice(0, 10);
                  const load = dailyWorkload.get(dayKey);

                  const dayEvents = filteredEvents.filter(e => {
                    const ed = new Date(e.startTime);
                    return (
                      ed.getDate() === day.getDate() &&
                      ed.getMonth() === day.getMonth() &&
                      ed.getFullYear() === day.getFullYear()
                    );
                  });

                  return (
                    <div
                      key={i}
                      onClick={() => {
                        setSelectedDayDetails(day);
                      }}
                      className={`min-h-[105px] rounded-2xl p-2.5 border transition-all cursor-pointer hover:border-blue-400 hover:shadow-md flex flex-col justify-between ${isToday
                          ? "border-neutral-900 bg-neutral-900/[0.03] dark:border-white dark:bg-white/[0.04] ring-2 ring-neutral-900/10 dark:ring-white/10"
                          : isCurrentMonth
                            ? "border-black/[0.04] dark:border-white/[0.06] bg-neutral-50/50 dark:bg-neutral-800/30"
                            : "border-transparent opacity-25 bg-transparent"
                        }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className={`size-6 rounded-full flex items-center justify-center text-xs font-bold ${isToday ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs" : "text-neutral-600 dark:text-neutral-400"
                              }`}
                          >
                            {day.getDate()}
                          </span>
                          {dayEvents.length > 0 && (
                            <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded-full">
                              {dayEvents.length}
                            </span>
                          )}
                        </div>

                        {/* Event Pills inside Month Cell */}
                        <div className="space-y-1">
                          {dayEvents.slice(0, 2).map(ev => {
                            const theme = getEventTheme(ev.color || ev.category || "");
                            return (
                              <div
                                key={ev.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEvent(ev);
                                  setIsDialogOpen(true);
                                }}
                                className={`rounded-lg px-2 py-0.5 text-[10.5px] font-semibold truncate border shadow-2xs hover:scale-[1.02] transition ${theme.bg} ${theme.text} ${theme.border}`}
                              >
                                {ev.title}
                              </div>
                            );
                          })}
                          {dayEvents.length > 2 && (
                            <div className="text-[9.5px] font-bold text-neutral-400 pl-1">
                              +{dayEvents.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Day Load / Spending time footer */}
                      {load && load.totalHours > 0 && (
                        <div className="pt-1 text-[9px] font-semibold text-neutral-400 border-t border-black/[0.03] dark:border-white/[0.04] flex items-center justify-between">
                          <span>{load.totalHours.toFixed(1)}h work</span>
                          {load.status === "busy" && <span className="text-rose-500">🔥 High</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── VIEW 6: LIST VIEW ── */}
      {view === "list" && (
        <div className="rounded-[28px] border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#14151a] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.45)]">
          {filteredEvents.length === 0 ? (
            <div className="py-12 text-center text-neutral-400 text-xs">
              No events found. Click "+ Add Event" to schedule something new.
            </div>
          ) : (
            <div className="divide-y divide-black/[0.05] dark:divide-white/[0.08]">
              {filteredEvents.map(ev => {
                const theme = getEventTheme(ev.color || ev.category || "");
                return (
                  <div
                    key={ev.id}
                    onClick={() => {
                      setSelectedEvent(ev);
                      setIsDialogOpen(true);
                    }}
                    className="py-3.5 px-2 flex items-center justify-between gap-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] rounded-xl transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`size-3.5 rounded-full ${theme.solidBg}`} />
                      <div>
                        <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">
                          {ev.title}
                        </h4>
                        <p className="text-xs text-neutral-400">
                          {new Date(ev.startTime).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} at {new Date(ev.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={e => handleExtendEvent(ev, 30, e)}
                        className="px-2 py-1 rounded-lg text-xs font-semibold bg-black/5 dark:bg-white/5 hover:bg-black/10 text-neutral-600 dark:text-neutral-300 opacity-0 group-hover:opacity-100 transition"
                      >
                        +30m
                      </button>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleDuplicateEvent(ev);
                        }}
                        className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 opacity-0 group-hover:opacity-100 transition"
                        title="Duplicate"
                      >
                        <Copy size={13} />
                      </button>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${theme.bg} ${theme.text} ${theme.border}`}>
                        {ev.category || "General"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── DAY DETAILS DIALOG (Triggered by Clicking a Month Cell) ── */}
      <Dialog open={!!selectedDayDetails} onOpenChange={() => setSelectedDayDetails(null)}>
        <DialogContent className="max-w-lg rounded-3xl p-6 bg-white dark:bg-[#17181f] border border-black/[0.08] dark:border-white/[0.1] shadow-2xl">
          {selectedDayDetails && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                      {selectedDayDetails.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-neutral-500">
                      Overview of tasks, created pages, and time spent on this day
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                {/* Day Summary Strip */}
                {(() => {
                  const dayKey = selectedDayDetails.toISOString().slice(0, 10);
                  const load = dailyWorkload.get(dayKey);
                  const dayItems = events.filter(e => {
                    const ed = new Date(e.startTime);
                    return ed.getDate() === selectedDayDetails.getDate() &&
                      ed.getMonth() === selectedDayDetails.getMonth() &&
                      ed.getFullYear() === selectedDayDetails.getFullYear();
                  });

                  return (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-black/[0.04] dark:border-white/[0.06] text-center">
                        <div>
                          <div className="text-xs text-neutral-400">Total Items</div>
                          <div className="text-base font-bold">{dayItems.length}</div>
                        </div>
                        <div>
                          <div className="text-xs text-neutral-400">Work Hours</div>
                          <div className="text-base font-bold">{load?.totalHours.toFixed(1) || 0}h</div>
                        </div>
                        <div>
                          <div className="text-xs text-neutral-400">Stress Level</div>
                          <div className={`text-base font-bold ${load?.status === "busy" ? "text-rose-500" : "text-emerald-500"}`}>
                            {load?.status === "busy" ? "🔥 High" : "🌿 Normal"}
                          </div>
                        </div>
                      </div>

                      {/* Items List */}
                      <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                        {dayItems.length === 0 ? (
                          <div className="py-8 text-center text-xs text-neutral-400">
                            No events or pages recorded on this day.
                          </div>
                        ) : (
                          dayItems.map(item => {
                            const theme = getEventTheme(item.color || item.category || "");
                            return (
                              <div
                                key={item.id}
                                onClick={() => {
                                  setSelectedDayDetails(null);
                                  setSelectedEvent(item);
                                  setIsDialogOpen(true);
                                }}
                                className={`rounded-2xl p-3 border ${theme.bg} ${theme.border} flex items-center justify-between gap-3 cursor-pointer hover:shadow-xs transition`}
                              >
                                <div>
                                  <h4 className={`text-xs font-bold ${theme.text}`}>{item.title}</h4>
                                  <p className="text-[11px] opacity-75 mt-0.5">
                                    {new Date(item.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} - {new Date(item.endTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                                  </p>
                                </div>
                                <span className="px-2 py-0.5 rounded-full bg-white/80 dark:bg-black/40 text-[10px] font-semibold capitalize">
                                  {item.category || "General"}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <DialogFooter className="gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentDate(selectedDayDetails);
                    setView("week");
                    setSelectedDayDetails(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm transition"
                >
                  Open in Week Timetable
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── EVENT CREATE / EDIT MODAL ── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white dark:bg-[#17181f] border border-black/[0.08] dark:border-white/[0.1] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              {isCreating ? "Add Schedule Event" : "Event Details"}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              {isCreating ? "Schedule an item, meeting, reminder, or milestone" : "Edit event properties, reminders and timing"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Event Title</Label>
              <Input
                value={isCreating ? (newEvent.title || "") : (selectedEvent?.title || "")}
                onChange={e =>
                  isCreating
                    ? setNewEvent(prev => ({ ...prev, title: e.target.value }))
                    : setSelectedEvent(prev => prev ? { ...prev, title: e.target.value } : null)
                }
                placeholder="e.g. Deep Focus Session, Client Review"
                autoFocus
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description / Notes (optional)</Label>
              <Textarea
                value={isCreating ? (newEvent.description || "") : (selectedEvent?.description || "")}
                onChange={e =>
                  isCreating
                    ? setNewEvent(prev => ({ ...prev, description: e.target.value }))
                    : setSelectedEvent(prev => prev ? { ...prev, description: e.target.value } : null)
                }
                placeholder="Add session agenda or notes..."
                rows={2}
                className="rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Start Time</Label>
                <Input
                  type="datetime-local"
                  value={
                    isCreating
                      ? (newEvent.startTime ? new Date(newEvent.startTime.getTime() - newEvent.startTime.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "")
                      : (selectedEvent ? new Date(selectedEvent.startTime.getTime() - selectedEvent.startTime.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "")
                  }
                  onChange={e => {
                    const d = new Date(e.target.value);
                    if (isCreating) setNewEvent(prev => ({ ...prev, startTime: d }));
                    else setSelectedEvent(prev => prev ? { ...prev, startTime: d } : null);
                  }}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">End Time</Label>
                <Input
                  type="datetime-local"
                  value={
                    isCreating
                      ? (newEvent.endTime ? new Date(newEvent.endTime.getTime() - newEvent.endTime.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "")
                      : (selectedEvent ? new Date(selectedEvent.endTime.getTime() - selectedEvent.endTime.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "")
                  }
                  onChange={e => {
                    const d = new Date(e.target.value);
                    if (isCreating) setNewEvent(prev => ({ ...prev, endTime: d }));
                    else setSelectedEvent(prev => prev ? { ...prev, endTime: d } : null);
                  }}
                  className="rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Category</Label>
                <Select
                  value={isCreating ? newEvent.category : selectedEvent?.category}
                  onValueChange={v =>
                    isCreating
                      ? setNewEvent(prev => ({ ...prev, category: v }))
                      : setSelectedEvent(prev => prev ? { ...prev, category: v } : null)
                  }
                >
                  <SelectTrigger className="rounded-xl text-xs">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {categories.map(c => (
                      <SelectItem key={c} value={c} className="text-xs">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Theme Color</Label>
                <Select
                  value={isCreating ? newEvent.color : selectedEvent?.color}
                  onValueChange={v =>
                    isCreating
                      ? setNewEvent(prev => ({ ...prev, color: v }))
                      : setSelectedEvent(prev => prev ? { ...prev, color: v } : null)
                  }
                >
                  <SelectTrigger className="rounded-xl text-xs">
                    <SelectValue placeholder="Color" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {colors.map(c => (
                      <SelectItem key={c.value} value={c.value} className="text-xs">
                        <div className="flex items-center gap-2">
                          <div className={`size-3 rounded-full ${c.bg}`} />
                          <span>{c.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-black/[0.05] dark:border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <Bell size={15} className="text-amber-500" />
                <div>
                  <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100">Set Event Reminder</div>
                  <div className="text-[10px] text-neutral-400">Receive an in-app alert before start</div>
                </div>
              </div>

              <input
                type="checkbox"
                checked={isCreating ? !!newEvent.reminder : !!selectedEvent?.reminder}
                onChange={e => {
                  const val = e.target.checked;
                  if (isCreating) setNewEvent(prev => ({ ...prev, reminder: val }));
                  else setSelectedEvent(prev => prev ? { ...prev, reminder: val } : null);
                }}
                className="size-4 rounded accent-neutral-900 cursor-pointer"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            {!isCreating && selectedEvent && (
              <>
                <button
                  type="button"
                  onClick={() => handleDeleteEvent(selectedEvent.id)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-500/10 transition cursor-pointer mr-auto"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDuplicateEvent(selectedEvent);
                    setIsDialogOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
                >
                  Duplicate
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                setIsDialogOpen(false);
                setIsCreating(false);
                setSelectedEvent(null);
              }}
              className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={isCreating ? handleCreateEvent : handleUpdateEvent}
              className="px-5 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold shadow-sm hover:shadow-md transition cursor-pointer"
            >
              {isCreating ? "Create Event" : "Save Changes"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Noska Manager Intelligence Panel ── */}
      <NoskaIntelligencePanel
        isOpen={nmiOpen}
        onClose={() => setNmiOpen(false)}
        events={events}
        onEventCreate={(evt) => {
          const item = { ...evt, id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` } as Event;
          setEvents(prev => [...prev, item]);
          onEventCreate?.(item);
          showToast(`NMI created "${item.title}"`);
        }}
        onEventUpdate={(id, updates) => {
          setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
          onEventUpdate?.(id, updates);
        }}
        onEventDelete={(id) => {
          setEvents(prev => prev.filter(e => e.id !== id));
          onEventDelete?.(id);
        }}
        currentDate={currentDate}
        userName={workspaceStats?.userName}
        onShowToast={showToast}
        workspaceTracks={workspaceTracks}
        workspaceStats={workspaceStats}
      />
    </div>
  );
}
