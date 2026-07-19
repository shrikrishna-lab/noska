import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  CheckCircle2, Info, AlertTriangle, XCircle, Shield,
  Upload, Download, Database, Sparkles, Mail, User,
  Folder, Activity, Rocket, X, Clock, ArrowRight, ChevronDown, ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";

// Notification Data Types
export interface DynamicIslandNotificationItem {
  id: string;
  title: string;
  description?: string;
  type: "success" | "info" | "warning" | "error" | "security" | "progress" | "live";
  priority: 1 | 2 | 3 | 4 | 5; // 1: 2-3s, 2: 4-5s, 3: 6-8s, 4: Manual, 5: Live Progress
  icon?: "success" | "info" | "warning" | "error" | "security" | "upload" | "download" | "backup" | "ai" | "email" | "users" | "workspace" | "analytics" | "deploy";
  progress?: number; // 0 to 100 for live activity progress
  progressText?: string; // Custom progress metadata, e.g., "2.1 GB / 4 GB"
  taskId?: string; // Morphs notifications under the same task inline
  timestamp: Date;
  actions?: Array<{
    label: string;
    onClick: () => void;
  }>;
  metadata?: Record<string, string | number>;
  logs?: string[];
}

export type DynamicIslandNotifyInput = Omit<DynamicIslandNotificationItem, "id" | "timestamp"> & {
  id?: string;
  timestamp?: Date;
};

interface DynamicIslandNotificationContextType {
  notify: (input: DynamicIslandNotifyInput) => string;
  success: (title: string, desc?: string, opts?: Partial<DynamicIslandNotifyInput>) => string;
  error: (title: string, desc?: string, opts?: Partial<DynamicIslandNotifyInput>) => string;
  warning: (title: string, desc?: string, opts?: Partial<DynamicIslandNotifyInput>) => string;
  info: (title: string, desc?: string, opts?: Partial<DynamicIslandNotifyInput>) => string;
  security: (title: string, desc?: string, opts?: Partial<DynamicIslandNotifyInput>) => string;
  progress: (title: string, progress: number, progressText?: string, taskId?: string, opts?: Partial<DynamicIslandNotifyInput>) => string;
  update: (id: string, updates: Partial<DynamicIslandNotifyInput>) => void;
  dismiss: (id: string) => void;
  clear: () => void;
  promise: <T>(
    promise: Promise<T>,
    msgs: { loading: string; success: string; error: string },
    opts?: Partial<DynamicIslandNotifyInput>
  ) => Promise<T>;
  history: DynamicIslandNotificationItem[];
  isHistoryOpen: boolean;
  setIsHistoryOpen: (open: boolean) => void;
}

const DynamicIslandNotificationContext = createContext<DynamicIslandNotificationContextType | null>(null);

export function useIslandNotification() {
  const context = useContext(DynamicIslandNotificationContext);
  if (!context) {
    throw new Error("useIslandNotification must be used within a DynamicIslandNotificationProvider");
  }
  return context;
}

// Micro sound synthesis using Web Audio API (no external file dependencies)
const playSound = (type: string) => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === "suspended") return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (type === "success") {
      // Gentle warm synthetic chirp
      osc.type = "sine";
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.12);
      gainNode.gain.setValueAtTime(0.06, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === "warning") {
      // Soft high-frequency chime
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.06); // G5
      gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } else if (type === "error") {
      // Low-frequency warning chime
      osc.type = "triangle";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(147, ctx.currentTime + 0.22);
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    }
  } catch (e) {
    // Fail silently if browser blocks sound
  }
};

// Vibration API haptic triggers for mobile
const triggerHaptics = (type: string) => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    const isMobile = window.matchMedia("(pointer: coarse)").matches;
    if (isMobile) {
      if (type === "success") navigator.vibrate(20);
      else if (type === "warning") navigator.vibrate(40);
      else if (type === "error") navigator.vibrate(60);
    }
  }
};

export function DynamicIslandNotificationProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<DynamicIslandNotificationItem[]>([]);
  const [activeNotif, setActiveNotif] = useState<DynamicIslandNotificationItem | null>(null);
  const [history, setHistory] = useState<DynamicIslandNotificationItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const activeRef = useRef<DynamicIslandNotificationItem | null>(null);

  // Sync ref with state to prevent stale closures in timeouts
  useEffect(() => {
    activeRef.current = activeNotif;
  }, [activeNotif]);

  // Append new notification to history and queue/morph
  const notify = useCallback((input: DynamicIslandNotifyInput): string => {
    const id = input.id || Math.random().toString(36).substring(2, 9);
    const newNotif: DynamicIslandNotificationItem = {
      ...input,
      id,
      timestamp: input.timestamp || new Date()
    };

    // Add to history (keep last 20)
    setHistory((prev) => [newNotif, ...prev.slice(0, 19)]);

    // Check if the incoming notification is an update to an active task morphing
    const current = activeRef.current;
    if (current && newNotif.taskId && current.taskId === newNotif.taskId) {
      // Haptics & sound for transition
      if (newNotif.type !== current.type) {
        playSound(newNotif.type);
        triggerHaptics(newNotif.type);
      }
      setActiveNotif(newNotif);
      return id;
    }

    // Play initial sound & haptic
    playSound(newNotif.type);
    triggerHaptics(newNotif.type);

    // If there is an active item and it has the same taskId in the queue, update queue items instead
    setQueue((prev) => {
      const matchIndex = prev.findIndex((item) => newNotif.taskId && item.taskId === newNotif.taskId);
      if (matchIndex >= 0) {
        const copy = [...prev];
        copy[matchIndex] = newNotif;
        return copy;
      }
      return [...prev, newNotif];
    });

    return id;
  }, []);

  const success = useCallback((title: string, desc?: string, opts?: Partial<DynamicIslandNotifyInput>) => {
    return notify({ title, description: desc, type: "success", priority: 1, icon: "success", ...opts });
  }, [notify]);

  const error = useCallback((title: string, desc?: string, opts?: Partial<DynamicIslandNotifyInput>) => {
    return notify({ title, description: desc, type: "error", priority: 4, icon: "error", ...opts });
  }, [notify]);

  const warning = useCallback((title: string, desc?: string, opts?: Partial<DynamicIslandNotifyInput>) => {
    return notify({ title, description: desc, type: "warning", priority: 2, icon: "warning", ...opts });
  }, [notify]);

  const info = useCallback((title: string, desc?: string, opts?: Partial<DynamicIslandNotifyInput>) => {
    return notify({ title, description: desc, type: "info", priority: 2, icon: "info", ...opts });
  }, [notify]);

  const security = useCallback((title: string, desc?: string, opts?: Partial<DynamicIslandNotifyInput>) => {
    return notify({ title, description: desc, type: "security", priority: 3, icon: "security", ...opts });
  }, [notify]);

  const progress = useCallback((title: string, progress: number, progressText?: string, taskId?: string, opts?: Partial<DynamicIslandNotifyInput>) => {
    return notify({
      title,
      type: "progress",
      priority: 5,
      icon: "backup",
      progress,
      progressText,
      taskId,
      ...opts
    });
  }, [notify]);

  const update = useCallback((id: string, updates: Partial<DynamicIslandNotifyInput>) => {
    const current = activeRef.current;
    if (current && current.id === id) {
      setActiveNotif((prev) => (prev ? { ...prev, ...updates } : null));
      return;
    }

    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }, []);

  const dismiss = useCallback((id: string) => {
    const current = activeRef.current;
    if (current && current.id === id) {
      setActiveNotif(null);
      return;
    }
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clear = useCallback(() => {
    setActiveNotif(null);
    setQueue([]);
  }, []);

  // Promise-based toast API adapter
  const promise = useCallback(<T,>(
    prom: Promise<T>,
    msgs: { loading: string; success: string; error: string },
    opts?: Partial<DynamicIslandNotifyInput>
  ): Promise<T> => {
    const taskId = Math.random().toString(36).substring(2, 9);
    
    // Trigger loading
    notify({
      title: msgs.loading,
      type: "live",
      priority: 5,
      progress: 0,
      taskId,
      ...opts
    });

    return prom
      .then((res) => {
        notify({
          title: msgs.success,
          type: "success",
          priority: 1,
          icon: "success",
          taskId,
          ...opts
        });
        return res;
      })
      .catch((err) => {
        notify({
          title: msgs.error,
          description: err instanceof Error ? err.message : "An error occurred",
          type: "error",
          priority: 4,
          icon: "error",
          taskId,
          ...opts
        });
        throw err;
      });
  }, [notify]);

  // Queue runner: pulls next item when activeNotif is null
  useEffect(() => {
    if (!activeNotif && queue.length > 0) {
      const next = queue[0];
      setQueue((prev) => prev.slice(1));
      // Give a tiny timeout buffer for exit animations to look distinct if not same task
      setTimeout(() => {
        setActiveNotif(next);
      }, 100);
    }
  }, [activeNotif, queue]);

  return (
    <DynamicIslandNotificationContext.Provider
      value={{
        notify,
        success,
        error,
        warning,
        info,
        security,
        progress,
        update,
        dismiss,
        clear,
        promise,
        history,
        isHistoryOpen,
        setIsHistoryOpen
      }}
    >
      {children}
      <DynamicIslandNotification />
    </DynamicIslandNotificationContext.Provider>
  );
}

// Icon mapper
const NotificationIcon = ({ icon, type }: { icon?: string; type: string }) => {
  const baseClasses = "h-5 w-5 shrink-0";
  
  // Custom breathing/pulsing animation classes
  let animClass = "";
  if (type === "security") animClass = "animate-pulse";
  if (type === "live" || type === "progress") animClass = "animate-spin-slow";

  const resolvedIcon = icon || type;

  switch (resolvedIcon) {
    case "success":
      return <CheckCircle2 className={cn(baseClasses, "text-emerald-450")} />;
    case "info":
      return <Info className={cn(baseClasses, "text-blue-450")} />;
    case "warning":
      return <AlertTriangle className={cn(baseClasses, "text-amber-450")} />;
    case "error":
      return <XCircle className={cn(baseClasses, "text-red-450")} />;
    case "security":
      return <Shield className={cn(baseClasses, "text-purple-450", animClass)} />;
    case "upload":
      return <Upload className={cn(baseClasses, "text-zinc-300")} />;
    case "download":
      return <Download className={cn(baseClasses, "text-zinc-300")} />;
    case "backup":
      return <Database className={cn(baseClasses, "text-sky-400")} />;
    case "ai":
      return <Sparkles className={cn(baseClasses, "text-yellow-400 animate-pulse")} />;
    case "email":
      return <Mail className={cn(baseClasses, "text-indigo-400")} />;
    case "users":
      return <User className={cn(baseClasses, "text-emerald-400")} />;
    case "workspace":
      return <Folder className={cn(baseClasses, "text-amber-400")} />;
    case "analytics":
      return <Activity className={cn(baseClasses, "text-rose-450")} />;
    case "deploy":
      return <Rocket className={cn(baseClasses, "text-teal-400 animate-bounce")} />;
    default:
      return <Info className={cn(baseClasses, "text-zinc-400")} />;
  }
};

// Dynamic Island UI Component
export function DynamicIslandNotification() {
  const { activeNotif, dismiss, history, isHistoryOpen, setIsHistoryOpen } = useIslandNotification() as any;
  const notif = activeNotif as DynamicIslandNotificationItem | null;

  const [isExpanded, setIsExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const dismissTimerRef = useRef<number | null>(null);
  const remainingTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  // Auto-dismiss timing options (Priority 1-3)
  const getTimeoutDuration = (priority: number): number => {
    switch (priority) {
      case 1: return 2500; // Priority 1: 2-3s
      case 2: return 4500; // Priority 2: 4-5s
      case 3: return 7000; // Priority 3: 6-8s
      case 5: return 0;    // Priority 5: Live Activity (handled manually when finished)
      case 4:              // Priority 4: Critical (manual dismissal)
      default: return 0;
    }
  };

  // Setup timers
  const startTimer = useCallback((duration: number) => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    if (duration <= 0) return;

    remainingTimeRef.current = duration;
    startTimeRef.current = Date.now();

    dismissTimerRef.current = window.setTimeout(() => {
      if (notif) dismiss(notif.id);
    }, duration);
  }, [notif, dismiss]);

  const pauseTimer = useCallback(() => {
    if (!dismissTimerRef.current) return;
    clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = null;

    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
  }, []);

  const resumeTimer = useCallback(() => {
    if (remainingTimeRef.current <= 0 || dismissTimerRef.current) return;
    startTimeRef.current = Date.now();
    dismissTimerRef.current = window.setTimeout(() => {
      if (notif) dismiss(notif.id);
    }, remainingTimeRef.current);
  }, [notif, dismiss]);

  // Reset expanded view and timer whenever active notification changes
  useEffect(() => {
    setIsExpanded(false);
    if (!notif) {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
      return;
    }

    const duration = getTimeoutDuration(notif.priority);
    startTimer(duration);

    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [notif, startTimer]);

  // Pause on hover
  useEffect(() => {
    if (!notif) return;
    if (hovered) {
      pauseTimer();
    } else {
      resumeTimer();
    }
  }, [hovered, notif, pauseTimer, resumeTimer]);

  // Close drawer if notification becomes null
  useEffect(() => {
    if (!notif) {
      setIsHistoryOpen(false);
    }
  }, [notif, setIsHistoryOpen]);

  if (!notif) return null;

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    dismiss(notif.id);
  };

  // Priority color tag glows
  const getAccentGlow = (type: string) => {
    switch (type) {
      case "success": return "shadow-[0_4px_20px_rgba(16,185,129,0.15)] border-emerald-500/20";
      case "warning": return "shadow-[0_4px_20px_rgba(245,158,11,0.15)] border-amber-500/20";
      case "error": return "shadow-[0_4px_20px_rgba(239,68,68,0.25)] border-red-500/20";
      case "security": return "shadow-[0_4px_20px_rgba(168,85,247,0.20)] border-purple-500/20";
      case "info":
      case "progress":
      case "live":
      default:
        return "shadow-[0_4px_20px_rgba(59,130,246,0.15)] border-blue-500/20";
    }
  };

  const hasExtraDetails = notif.description || notif.metadata || notif.actions || notif.logs || notif.progress !== undefined;

  return (
    <LayoutGroup>
      <div 
        className="fixed top-3 left-1/2 -translate-x-1/2 z-[110] w-full max-w-[92vw] sm:max-w-[420px] flex flex-col items-center pointer-events-none"
        aria-live="assertive"
        aria-atomic="true"
      >
        <motion.div
          layoutId="dynamic-island-notification"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={hasExtraDetails ? () => setIsExpanded(!isExpanded) : undefined}
          transition={{
            type: "spring",
            stiffness: 380,
            damping: 28,
            mass: 0.85
          }}
          className={cn(
            "pointer-events-auto flex flex-col bg-[#121212]/92 backdrop-blur-[30px] border text-zinc-150 overflow-hidden cursor-pointer select-none",
            "transition-shadow duration-300 ease-out",
            getAccentGlow(notif.type),
            isExpanded 
              ? "w-full rounded-[24px] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)]" 
              : "w-[300px] h-[40px] px-3.5 rounded-[999px] flex flex-row items-center justify-between shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
          )}
          style={{ willChange: "transform, width, height, border-radius" }}
        >
          {/* Subtle reflection overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.01] via-transparent to-white/[0.04] pointer-events-none" />

          {/* Micro status pulse dot (only visible in compact mode) */}
          {!isExpanded && (
            <div className="absolute right-12 top-1/2 -translate-y-1/2 flex h-2 w-2">
              <span className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                notif.type === "success" && "bg-emerald-400",
                notif.type === "warning" && "bg-amber-400",
                notif.type === "error" && "bg-red-400",
                notif.type === "security" && "bg-purple-400",
                (notif.type === "info" || notif.type === "progress" || notif.type === "live") && "bg-blue-400"
              )} />
              <span className={cn(
                "relative inline-flex rounded-full h-2 w-2",
                notif.type === "success" && "bg-emerald-500",
                notif.type === "warning" && "bg-amber-500",
                notif.type === "error" && "bg-red-500",
                notif.type === "security" && "bg-purple-500",
                (notif.type === "info" || notif.type === "progress" || notif.type === "live") && "bg-blue-500"
              )} />
            </div>
          )}

          {/* COMPACT PILL STATE */}
          {!isExpanded ? (
            <motion.div
              key="compact-content"
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(4px)" }}
              transition={{ duration: 0.18 }}
              className="flex items-center justify-between w-full h-full"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-6">
                <NotificationIcon icon={notif.icon} type={notif.type} />
                <span className="text-[11px] font-semibold text-zinc-100 truncate tracking-wide leading-none pt-[1px]">
                  {notif.title}
                </span>
              </div>
              <button
                onClick={handleClose}
                className="h-5 w-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Dismiss"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </motion.div>
          ) : (
            /* EXPANDED DETAILED STATE */
            <motion.div
              key="expanded-content"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.2 }}
              className="w-full space-y-4 text-left"
            >
              {/* Header: Title, Icon, Close */}
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-xl border",
                    notif.type === "success" && "bg-emerald-500/10 border-emerald-500/20",
                    notif.type === "warning" && "bg-amber-500/10 border-amber-500/20",
                    notif.type === "error" && "bg-red-500/10 border-red-500/20",
                    notif.type === "security" && "bg-purple-500/10 border-purple-500/20",
                    (notif.type === "info" || notif.type === "progress" || notif.type === "live") && "bg-blue-500/10 border-blue-500/20"
                  )}>
                    <NotificationIcon icon={notif.icon} type={notif.type} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                      {notif.title}
                    </h4>
                    <span className="text-[9px] text-zinc-500 font-medium">
                      {notif.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-1 rounded-lg bg-white/[0.04] border border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Description */}
              {notif.description && (
                <p className="text-xs text-zinc-350 leading-relaxed font-normal bg-white/[0.02] border border-white/[0.04] p-2.5 rounded-xl">
                  {notif.description}
                </p>
              )}

              {/* Progress Bar (Priority 5: Live Activity) */}
              {notif.progress !== undefined && (
                <div className="space-y-1.5 bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl">
                  <div className="flex justify-between text-[10px] text-zinc-400 font-semibold tracking-wide">
                    <span className="animate-pulse">{notif.progressText || "Processing Task..."}</span>
                    <span className="font-mono">{Math.round(notif.progress)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      layout
                      className="h-full bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-500"
                      style={{ width: `${notif.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Metadata Key/Value Details */}
              {notif.metadata && (
                <div className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl text-[10px] space-y-1.5 font-mono text-zinc-400">
                  {Object.entries(notif.metadata).map(([key, val]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-zinc-500 capitalize">{key}:</span>
                      <span className="font-semibold text-zinc-300">{val}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Live console logs */}
              {notif.logs && notif.logs.length > 0 && (
                <div className="bg-black/40 border border-white/[0.03] p-3 rounded-xl text-[9px] font-mono text-zinc-500 max-h-[80px] overflow-y-auto space-y-1">
                  {notif.logs.map((log, lIdx) => (
                    <div key={lIdx} className="leading-tight truncate">
                      &gt; {log}
                    </div>
                  ))}
                </div>
              )}

              {/* Action triggers */}
              {notif.actions && notif.actions.length > 0 && (
                <div className="flex gap-2">
                  {notif.actions.map((act, aIdx) => (
                    <button
                      key={aIdx}
                      onClick={(e) => {
                        e.stopPropagation();
                        act.onClick();
                      }}
                      className="flex-1 py-1.5 text-[10px] font-bold rounded-xl border border-white/10 hover:bg-white/5 text-zinc-300 hover:text-white transition-colors"
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Drawer History trigger */}
              <div className="border-t border-white/[0.06] pt-3 flex justify-between items-center text-[10px] text-zinc-500 font-semibold tracking-wide">
                <span>Auto-dismiss {notif.priority === 4 ? "disabled" : "active"}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsHistoryOpen(true);
                  }}
                  className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
                >
                  <Clock className="h-3 w-3" /> View History <ArrowRight className="h-2.5 w-2.5" />
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* NOTIFICATION HISTORY SLIDING DRAWER SHEET */}
        <AnimatePresence>
          {isHistoryOpen && (
            <>
              {/* Backing screen block */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[120] bg-black pointer-events-auto"
                onClick={() => setIsHistoryOpen(false)}
              />

              {/* Sidebar drawer containing historical list */}
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                className="fixed top-0 right-0 h-full w-[350px] max-w-[85vw] bg-[#0c0c0c] border-l border-zinc-800/80 shadow-[0_0_50px_rgba(0,0,0,0.8)] z-[130] flex flex-col pointer-events-auto p-5 text-left"
              >
                <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4.5 w-4.5 text-zinc-400" />
                    <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">System History</h3>
                  </div>
                  <button
                    onClick={() => setIsHistoryOpen(false)}
                    className="p-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-850 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Scroller list */}
                <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
                  {history.length === 0 ? (
                    <div className="text-center text-xs text-zinc-500 py-12">
                      No notifications recorded yet.
                    </div>
                  ) : (
                    history.map((hItem: DynamicIslandNotificationItem) => (
                      <div
                        key={hItem.id}
                        className="p-3 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl space-y-2 text-xs"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <NotificationIcon icon={hItem.icon} type={hItem.type} />
                            <span className="font-bold text-zinc-200 tracking-wide">{hItem.title}</span>
                          </div>
                          <span className="text-[9px] text-zinc-500 font-mono">
                            {hItem.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        {hItem.description && (
                          <p className="text-zinc-400 leading-normal text-[11px] font-normal pl-7">
                            {hItem.description}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-4 border-t border-zinc-800 text-[10px] text-zinc-500 text-center font-medium">
                  Showing last 20 administrator events
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );
}
