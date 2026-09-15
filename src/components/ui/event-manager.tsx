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
  BrainCircuit
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [activeTypeFilter, setActiveTypeFilter] = useState<"all" | "pages" | "tasks" | "reviews" | "stress">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [liveNow, setLiveNow] = useState(() => new Date());
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedDayDetails, setSelectedDayDetails] = useState<Date | null>(null);

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

  // AI Smart Rebalance / Auto-Schedule Buffer Breaks
  const handleSmartRebalance = useCallback(() => {
    // Sort events chronologically
    const sorted = [...events].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    let adjustedCount = 0;

    for (let i = 0; i < sorted.length - 1; i++) {
      const cur = sorted[i];
      const next = sorted[i + 1];
      const curEnd = new Date(cur.endTime).getTime();
      const nextStart = new Date(next.startTime).getTime();

      // If collision or zero buffer between tasks on same day
      if (curEnd >= nextStart && new Date(cur.startTime).toDateString() === new Date(next.startTime).toDateString()) {
        const duration = new Date(next.endTime).getTime() - new Date(next.startTime).getTime();
        const newNextStart = new Date(curEnd + 15 * 60000); // Add 15 min rest buffer
        const newNextEnd = new Date(newNextStart.getTime() + duration);
        next.startTime = newNextStart;
        next.endTime = newNextEnd;
        onEventUpdate?.(next.id, { startTime: newNextStart, endTime: newNextEnd });
        adjustedCount++;
      }
    }

    setEvents([...sorted]);
    showToast(`AI Rebalance: Inserted rest buffers & resolved ${adjustedCount} conflicts`);
  }, [events, onEventUpdate]);

  // "Find Free Slot" Engine: Scans currentDate from 08:00 to 20:00
  const handleFindFreeSlot = useCallback(() => {
    const targetDate = new Date(currentDate);
    const dayEvents = events.filter(e => {
      const ed = new Date(e.startTime);
      return ed.getDate() === targetDate.getDate() &&
             ed.getMonth() === targetDate.getMonth() &&
             ed.getFullYear() === targetDate.getFullYear();
    });

    let chosenHour = 9;
    for (let h = 8; h <= 19; h++) {
      const hasCollision = dayEvents.some(e => {
        const st = new Date(e.startTime).getHours();
        const en = new Date(e.endTime).getHours();
        return h >= st && h < en;
      });
      if (!hasCollision) {
        chosenHour = h;
        break;
      }
    }

    const start = new Date(targetDate);
    start.setHours(chosenHour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(chosenHour + 1, 0, 0, 0);

    setNewEvent({
      title: "Deep Focus Session",
      description: "Dedicated uninterrupted focus & study block",
      startTime: start,
      endTime: end,
      color: "blue",
      category: "Tasks",
      tags: ["Focus", "Productivity"],
      status: "confirmed",
      progress: 0,
      reminder: true,
      reminderMinutes: 10,
    });
    setIsCreating(true);
    setIsDialogOpen(true);
    showToast(`Found free 1-hour slot at ${String(chosenHour).padStart(2, "0")}:00`);
  }, [currentDate, events]);

  // Combined Filters (Type filter + Category + Search + Page Focus)
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (focusPageId && e.pageId && e.pageId !== focusPageId) return false;

      // Type Filter
      if (activeTypeFilter === "pages" && !e.isCreatedPage && e.category !== "Document") return false;
      if (activeTypeFilter === "tasks" && e.category !== "Tasks") return false;
      if (activeTypeFilter === "reviews" && e.category !== "Review") return false;
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

      {/* ── BENTO SUMMARY & INTELLIGENCE HEADER ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: User Identity & Cognitive Load / Stress Meter */}
        <div className="lg:col-span-2 rounded-[28px] border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#14151a] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.45)] relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 p-0.5 shadow-sm overflow-hidden">
                {workspaceStats?.avatarUrl ? (
                  <img src={workspaceStats.avatarUrl} alt="Avatar" className="size-full rounded-[14px] object-cover" />
                ) : (
                  <div className="size-full rounded-[14px] bg-white dark:bg-neutral-900 flex items-center justify-center font-bold text-lg text-neutral-800 dark:text-neutral-100">
                    {workspaceStats?.userInitials || "WS"}
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  {workspaceStats?.userName || "Workspace Administrator"}
                </h2>
                <p className="text-xs text-neutral-400">
                  {workspaceStats?.userEmail || "active.workspace@noska.app"}
                </p>
                <div className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-[10.5px] font-medium text-neutral-500">
                  <span>Joined: {workspaceStats?.signUpDate || "Active Workspace"}</span>
                </div>
              </div>
            </div>

            {/* Smart Schedule Tools */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSmartRebalance}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-semibold transition"
                title="Auto-insert 15m rest breaks & resolve overlapping conflicts"
              >
                <BrainCircuit size={13} />
                <span>AI Rebalance & Buffer</span>
              </button>

              <button
                type="button"
                onClick={handleFindFreeSlot}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold transition"
                title="Find next available 1-hour free gap"
              >
                <Zap size={13} />
                <span>Find Free Slot</span>
              </button>
            </div>
          </div>

          {/* 4 Real KPI Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-black/[0.06] dark:border-white/[0.08]">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-neutral-400 text-xs">
                <TrendingUp size={13} />
                <span>Completion</span>
              </div>
              <div className="text-2xl font-black tracking-tight text-neutral-900 dark:text-neutral-100">
                {summaryMetrics.completionRate}%
              </div>
              <div className="text-[10px] text-neutral-400">Task Completion Rate</div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-neutral-400 text-xs">
                <Clock size={13} className="text-emerald-500" />
                <span>Time Spent</span>
              </div>
              <div className="text-2xl font-black tracking-tight text-neutral-900 dark:text-neutral-100">
                {summaryMetrics.totalTimeSpentHours}h
              </div>
              <div className="text-[10px] text-neutral-400">Total Work & Focus</div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-neutral-400 text-xs">
                <FileText size={13} className="text-indigo-500" />
                <span>Pages Created</span>
              </div>
              <div className="text-2xl font-black tracking-tight text-neutral-900 dark:text-neutral-100">
                {summaryMetrics.totalPages}
              </div>
              <div className="text-[10px] text-neutral-400">Active Knowledge Pages</div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-neutral-400 text-xs">
                <HeartPulse size={13} className="text-rose-500" />
                <span>Stress & Load</span>
              </div>
              <div className="text-2xl font-black tracking-tight text-neutral-900 dark:text-neutral-100">
                {Number(summaryMetrics.totalTimeSpentHours) > 15 ? "Moderate" : "Optimal"}
              </div>
              <div className="text-[10px] text-neutral-400">Work-Rest Balance</div>
            </div>
          </div>
        </div>

        {/* Right: Real Workspace Milestones Card */}
        <div className="rounded-[28px] border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#14151a] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.45)] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Workspace Milestones</h3>
            <span className="text-[11px] font-semibold text-neutral-400">{summaryMetrics.total} Items</span>
          </div>

          <div className="space-y-3">
            {(workspaceMilestones.length > 0 ? workspaceMilestones : [
              {
                title: "Knowledge Base Active",
                description: `${summaryMetrics.totalPages} active documents structured`,
                badge: "Active",
                type: "knowledge"
              },
              {
                title: "Task Execution",
                description: `${summaryMetrics.completed} tasks completed across workspace`,
                badge: `${summaryMetrics.completionRate}% Done`,
                type: "tasks"
              },
              {
                title: "Study & Reviews Scheduled",
                description: `${summaryMetrics.activeReviews} spaced repetition flashcards`,
                badge: "Active",
                type: "review"
              }
            ]).map((m, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-black/[0.04] dark:border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className={`size-9 rounded-xl flex items-center justify-center ${
                    idx === 0 ? "bg-blue-500/10 text-blue-600" : idx === 1 ? "bg-emerald-500/10 text-emerald-600" : "bg-purple-500/10 text-purple-600"
                  }`}>
                    {idx === 0 ? <Award size={18} /> : idx === 1 ? <CheckCircle2 size={18} /> : <Sparkles size={18} />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100">{m.title}</div>
                    <div className="text-[10px] text-neutral-400">{m.description}</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-neutral-600 dark:text-neutral-300">
                  {m.badge}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── REAL WORKSPACE TRACKS ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">My Workspace Tracks</h3>
          <span className="text-xs text-neutral-400">{workspaceTracks.length} Active Tracks</span>
        </div>

        {workspaceTracks.length === 0 ? (
          <div className="rounded-[24px] p-6 text-center border border-dashed border-black/10 dark:border-white/10 text-neutral-400 text-xs">
            Create pages with tasks and notes to generate workspace track cards here.
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
                    className={`relative px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                      isActive
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
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold shadow-xs"
                      : "bg-black/[0.03] dark:bg-white/[0.05] text-neutral-600 dark:text-neutral-400 hover:bg-black/[0.07] dark:hover:bg-white/[0.09] border border-black/[0.05] dark:border-white/[0.08]"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

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
                            className={`rounded-2xl p-3.5 border shadow-2xs ${theme.bg} ${theme.border} flex items-center justify-between gap-4 cursor-pointer hover:shadow-md transition-all group ${
                              isConflict ? "ring-2 ring-rose-500/40" : ""
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
                                className={`p-1.5 rounded-xl transition ${
                                  event.reminder
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
                        <span className={`inline-block px-2 py-0.5 rounded-full font-semibold ${
                          load.status === "busy"
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
                          className={`border-l border-black/[0.04] dark:border-white/[0.06] p-1.5 relative transition-colors cursor-pointer hover:bg-black/[0.015] dark:hover:bg-white/[0.02] ${
                            isToday ? "bg-neutral-50/40 dark:bg-neutral-900/30" : ""
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
                                  className={`rounded-2xl p-2.5 border shadow-2xs transition-all hover:scale-[1.02] hover:shadow-md cursor-grab active:cursor-grabbing select-none group/card relative ${theme.bg} ${theme.border} ${
                                    isConflict ? "ring-2 ring-rose-500/50" : ""
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
                      className={`min-h-[105px] rounded-2xl p-2.5 border transition-all cursor-pointer hover:border-blue-400 hover:shadow-md flex flex-col justify-between ${
                        isToday
                          ? "border-neutral-900 bg-neutral-900/[0.03] dark:border-white dark:bg-white/[0.04] ring-2 ring-neutral-900/10 dark:ring-white/10"
                          : isCurrentMonth
                          ? "border-black/[0.04] dark:border-white/[0.06] bg-neutral-50/50 dark:bg-neutral-800/30"
                          : "border-transparent opacity-25 bg-transparent"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className={`size-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              isToday ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs" : "text-neutral-600 dark:text-neutral-400"
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
    </div>
  );
}
