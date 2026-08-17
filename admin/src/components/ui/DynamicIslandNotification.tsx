import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  CheckCircle2, Info, AlertTriangle, XCircle, Shield,
  Upload, Download, Database, Sparkles, Mail, User,
  Folder, Activity, Rocket, X, Clock, ArrowRight, ChevronRight,
  Radio, Check
} from "lucide-react";
import { cn } from "@/lib/utils";

// Notification Data Types
export interface DynamicIslandNotificationItem {
  id: string;
  title: string;
  description?: string;
  type: "success" | "info" | "warning" | "error" | "security" | "progress" | "live";
  priority: 1 | 2 | 3 | 4 | 5; // 1: 2.5s, 2: 4.5s, 3: 7s, 4: Manual (Critical), 5: Live Progress
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
  activeNotif: DynamicIslandNotificationItem | null;
}

const DynamicIslandNotificationContext = createContext<DynamicIslandNotificationContextType | null>(null);

export function useIslandNotification() {
  const context = useContext(DynamicIslandNotificationContext);
  if (!context) {
    throw new Error("useIslandNotification must be used within a DynamicIslandNotificationProvider");
  }
  return context;
}

// Apple-inspired Micro sound synthesis via Web Audio API
const playSound = (type: string) => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (type === "success") {
      // Warm iOS chime: D5 (587.33Hz) -> A5 (880Hz)
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.14);
      gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } else if (type === "warning") {
      // Soft high chime
      osc.type = "sine";
      osc.frequency.setValueAtTime(659.25, ctx.currentTime);
      osc.frequency.setValueAtTime(523.25, ctx.currentTime + 0.08);
      gainNode.gain.setValueAtTime(0.07, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } else if (type === "error") {
      // Gentle warning double pulse
      osc.type = "triangle";
      osc.frequency.setValueAtTime(261.63, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(196.00, ctx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.09, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else {
      // Crisp subtle pop / tap
      osc.type = "sine";
      osc.frequency.setValueAtTime(740, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.08);
      gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    }
  } catch {
    // Fail silently if audio is blocked
  }
};

// Vibration API haptic triggers for mobile
const triggerHaptics = (type: string) => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    const isMobile = window.matchMedia("(pointer: coarse)").matches;
    if (isMobile) {
      if (type === "success") navigator.vibrate([15, 30, 15]);
      else if (type === "warning") navigator.vibrate([25, 40, 25]);
      else if (type === "error") navigator.vibrate([40, 50, 40]);
      else navigator.vibrate(15);
    }
  }
};

export function DynamicIslandNotificationProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<DynamicIslandNotificationItem[]>([]);
  const [activeNotif, setActiveNotif] = useState<DynamicIslandNotificationItem | null>(null);
  const [history, setHistory] = useState<DynamicIslandNotificationItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const activeRef = useRef<DynamicIslandNotificationItem | null>(null);

  useEffect(() => {
    activeRef.current = activeNotif;
  }, [activeNotif]);

  const notify = useCallback((input: DynamicIslandNotifyInput): string => {
    const id = input.id || Math.random().toString(36).substring(2, 9);
    const newNotif: DynamicIslandNotificationItem = {
      ...input,
      id,
      timestamp: input.timestamp || new Date()
    };

    setHistory((prev) => [newNotif, ...prev.slice(0, 24)]);

    const current = activeRef.current;
    if (current && newNotif.taskId && current.taskId === newNotif.taskId) {
      if (newNotif.type !== current.type) {
        playSound(newNotif.type);
        triggerHaptics(newNotif.type);
      }
      setActiveNotif(newNotif);
      return id;
    }

    playSound(newNotif.type);
    triggerHaptics(newNotif.type);

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

  const progress = useCallback((title: string, prog: number, progressText?: string, taskId?: string, opts?: Partial<DynamicIslandNotifyInput>) => {
    return notify({
      title,
      type: "progress",
      priority: 5,
      icon: "backup",
      progress: prog,
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

  const promise = useCallback(<T,>(
    prom: Promise<T>,
    msgs: { loading: string; success: string; error: string },
    opts?: Partial<DynamicIslandNotifyInput>
  ): Promise<T> => {
    const taskId = Math.random().toString(36).substring(2, 9);
    
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

  useEffect(() => {
    if (!activeNotif && queue.length > 0) {
      const next = queue[0];
      setQueue((prev) => prev.slice(1));
      setTimeout(() => {
        setActiveNotif(next);
      }, 120);
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
        setIsHistoryOpen,
        activeNotif
      }}
    >
      {children}
      <DynamicIslandNotification />
    </DynamicIslandNotificationContext.Provider>
  );
}

// Icon helper with authentic Apple iOS colors & styling
const NotificationIcon = ({ icon, type, size = "md" }: { icon?: string; type: string; size?: "sm" | "md" | "lg" }) => {
  const sizeClasses = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-5 w-5" : "h-4 w-4";
  const resolvedIcon = icon || type;

  switch (resolvedIcon) {
    case "success":
      return <CheckCircle2 className={cn(sizeClasses, "text-[#30D158]")} />;
    case "info":
      return <Info className={cn(sizeClasses, "text-[#0A84FF]")} />;
    case "warning":
      return <AlertTriangle className={cn(sizeClasses, "text-[#FFD60A]")} />;
    case "error":
      return <XCircle className={cn(sizeClasses, "text-[#FF453A]")} />;
    case "security":
      return <Shield className={cn(sizeClasses, "text-[#BF5AF2]")} />;
    case "upload":
      return <Upload className={cn(sizeClasses, "text-[#0A84FF]")} />;
    case "download":
      return <Download className={cn(sizeClasses, "text-[#0A84FF]")} />;
    case "backup":
      return <Database className={cn(sizeClasses, "text-[#64D2FF]")} />;
    case "ai":
      return <Sparkles className={cn(sizeClasses, "text-[#FF9F0A]")} />;
    case "email":
      return <Mail className={cn(sizeClasses, "text-[#5E5CE6]")} />;
    case "users":
      return <User className={cn(sizeClasses, "text-[#30D158]")} />;
    case "workspace":
      return <Folder className={cn(sizeClasses, "text-[#FF9F0A]")} />;
    case "analytics":
      return <Activity className={cn(sizeClasses, "text-[#FF375F]")} />;
    case "deploy":
      return <Rocket className={cn(sizeClasses, "text-[#40C8E0]")} />;
    default:
      return <Info className={cn(sizeClasses, "text-[#0A84FF]")} />;
  }
};

// Apple-style live waveform / activity visualizer for compact pill state
const IslandLiveVisualizer = ({ type }: { type: string }) => {
  if (type === "progress" || type === "live") {
    return (
      <div className="flex items-center gap-[2px] h-3 px-1">
        {[0.4, 0.9, 0.6, 1, 0.5].map((scale, i) => (
          <motion.span
            key={i}
            className="w-[2px] rounded-full bg-[#0A84FF]"
            animate={{
              height: ["4px", `${scale * 12}px`, "4px"],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.12,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    );
  }

  const dotColor =
    type === "success" ? "bg-[#30D158]" :
    type === "warning" ? "bg-[#FFD60A]" :
    type === "error" ? "bg-[#FF453A]" :
    type === "security" ? "bg-[#BF5AF2]" : "bg-[#0A84FF]";

  return (
    <div className="relative flex h-2 w-2 items-center justify-center">
      <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", dotColor)} />
      <span className={cn("relative inline-flex rounded-full h-1.5 w-1.5", dotColor)} />
    </div>
  );
};

// Dynamic Island UI Component
export function DynamicIslandNotification() {
  const { activeNotif, dismiss, history, isHistoryOpen, setIsHistoryOpen } = useIslandNotification();
  const notif = activeNotif;

  const [isExpanded, setIsExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const dismissTimerRef = useRef<number | null>(null);
  const remainingTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const getTimeoutDuration = (priority: number): number => {
    switch (priority) {
      case 1: return 2800; // Priority 1: Quick confirm
      case 2: return 4800; // Priority 2: Standard
      case 3: return 7500; // Priority 3: Notice
      case 5: return 0;    // Priority 5: Live Activity (manual completion)
      case 4:              // Priority 4: Critical (manual dismissal)
      default: return 0;
    }
  };

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

  useEffect(() => {
    if (!notif) return;
    if (hovered) {
      pauseTimer();
    } else {
      resumeTimer();
    }
  }, [hovered, notif, pauseTimer, resumeTimer]);

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

  const getTypeTheme = (type: string) => {
    switch (type) {
      case "success":
        return {
          glow: "shadow-[0_20px_60px_-10px_rgba(48,209,88,0.3),0_0_0_1px_rgba(48,209,88,0.25)]",
          badgeBg: "bg-[#30D158]/15 border-[#30D158]/30 text-[#30D158]",
          ring: "ring-emerald-500/20",
          accentText: "text-[#30D158]"
        };
      case "warning":
        return {
          glow: "shadow-[0_20px_60px_-10px_rgba(255,214,10,0.3),0_0_0_1px_rgba(255,214,10,0.25)]",
          badgeBg: "bg-[#FFD60A]/15 border-[#FFD60A]/30 text-[#FFD60A]",
          ring: "ring-amber-500/20",
          accentText: "text-[#FFD60A]"
        };
      case "error":
        return {
          glow: "shadow-[0_20px_60px_-10px_rgba(255,69,58,0.35),0_0_0_1px_rgba(255,69,58,0.3)]",
          badgeBg: "bg-[#FF453A]/15 border-[#FF453A]/30 text-[#FF453A]",
          ring: "ring-red-500/25",
          accentText: "text-[#FF453A]"
        };
      case "security":
        return {
          glow: "shadow-[0_20px_60px_-10px_rgba(191,90,242,0.3),0_0_0_1px_rgba(191,90,242,0.25)]",
          badgeBg: "bg-[#BF5AF2]/15 border-[#BF5AF2]/30 text-[#BF5AF2]",
          ring: "ring-purple-500/20",
          accentText: "text-[#BF5AF2]"
        };
      case "info":
      case "progress":
      case "live":
      default:
        return {
          glow: "shadow-[0_20px_60px_-10px_rgba(10,132,255,0.3),0_0_0_1px_rgba(10,132,255,0.25)]",
          badgeBg: "bg-[#0A84FF]/15 border-[#0A84FF]/30 text-[#0A84FF]",
          ring: "ring-blue-500/20",
          accentText: "text-[#0A84FF]"
        };
    }
  };

  const theme = getTypeTheme(notif.type);
  const hasExtraDetails = notif.description || notif.metadata || notif.actions || notif.logs || notif.progress !== undefined;

  return (
    <LayoutGroup>
      {/* Top anchor notch container */}
      <div 
        className="fixed top-2.5 left-1/2 -translate-x-1/2 z-[120] w-full max-w-[94vw] sm:max-w-[440px] flex flex-col items-center pointer-events-none"
        aria-live="assertive"
        aria-atomic="true"
      >
        <motion.div
          layoutId="apple-dynamic-island"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={() => {
            if (hasExtraDetails) {
              setIsExpanded(!isExpanded);
            }
          }}
          transition={{
            type: "spring",
            stiffness: 420,
            damping: 30,
            mass: 0.75
          }}
          className={cn(
            "pointer-events-auto relative flex flex-col bg-black/95 text-white overflow-hidden select-none",
            "backdrop-blur-3xl border border-white/[0.14]",
            "shadow-[0_24px_60px_-12px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.1),inset_0_1px_1px_rgba(255,255,255,0.25)]",
            "transition-all duration-300",
            theme.glow,
            hasExtraDetails ? "cursor-pointer" : "cursor-default",
            isExpanded
              ? "w-full rounded-[32px] p-5"
              : "min-w-[270px] max-w-[360px] h-[42px] px-3 rounded-full flex flex-row items-center justify-between"
          )}
          style={{ willChange: "transform, width, height, border-radius" }}
        >
          {/* Apple Specular Gloss Top Edge Highlight */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />

          {/* ================= COMPACT PILL STATE ================= */}
          {!isExpanded ? (
            <motion.div
              key="compact-content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.16 }}
              className="flex items-center justify-between w-full h-full gap-2.5"
            >
              {/* Left: Apple Icon Badge */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0 border", theme.badgeBg)}>
                  <NotificationIcon icon={notif.icon} type={notif.type} size="sm" />
                </div>
                
                <span className="text-[12.5px] font-semibold text-white tracking-tight truncate leading-none pt-[0.5px]">
                  {notif.title}
                </span>
              </div>

              {/* Right: Dynamic Visualizer / Live Indicator + Dismiss */}
              <div className="flex items-center gap-2 shrink-0">
                <IslandLiveVisualizer type={notif.type} />

                <button
                  onClick={handleClose}
                  className="h-5 w-5 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-all ml-0.5"
                  title="Dismiss"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            </motion.div>
          ) : (
            /* ================= EXPANDED DETAILED STATE ================= */
            <motion.div
              key="expanded-content"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04, duration: 0.2 }}
              className="w-full space-y-4 text-left"
            >
              {/* Top Header Row */}
              <div className="flex justify-between items-start gap-3">
                <div className="flex items-center gap-3.5">
                  <div className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner",
                    theme.badgeBg
                  )}>
                    <NotificationIcon icon={notif.icon} type={notif.type} size="lg" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-[13.5px] font-bold text-white tracking-tight uppercase">
                        {notif.title}
                      </h4>
                      <span className={cn(
                        "text-[9px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider",
                        theme.badgeBg
                      )}>
                        {notif.type}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-medium tracking-wide">
                      {notif.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleClose}
                  className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-all shadow-sm"
                  title="Close"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Description Body - 100% Crisp High-Contrast Typography */}
              {notif.description && (
                <div className="bg-white/[0.05] border border-white/[0.09] p-3.5 rounded-2xl shadow-inner">
                  <p className="text-[12.5px] text-zinc-100 font-normal leading-relaxed">
                    {notif.description}
                  </p>
                </div>
              )}

              {/* Progress Bar (Live Activity / AirDrop style) */}
              {notif.progress !== undefined && (
                <div className="space-y-2 bg-white/[0.04] border border-white/[0.08] p-3.5 rounded-2xl">
                  <div className="flex justify-between items-center text-[11px] font-semibold text-zinc-200">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0A84FF] animate-pulse" />
                      {notif.progressText || "Processing Live Task..."}
                    </span>
                    <span className="font-mono text-white bg-white/10 px-2 py-0.5 rounded-md text-[10px]">
                      {Math.round(notif.progress)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800/80 rounded-full overflow-hidden p-[1px] border border-white/5">
                    <motion.div
                      layout
                      className="h-full rounded-full bg-gradient-to-r from-[#0A84FF] via-[#64D2FF] to-[#5E5CE6] shadow-[0_0_12px_rgba(10,132,255,0.6)]"
                      style={{ width: `${Math.min(Math.max(notif.progress, 0), 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Metadata Key/Value Details - Apple Settings Style */}
              {notif.metadata && Object.keys(notif.metadata).length > 0 && (
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl divide-y divide-white/[0.06] overflow-hidden">
                  {Object.entries(notif.metadata).map(([key, val]) => (
                    <div key={key} className="flex justify-between items-center px-3.5 py-2 text-xs">
                      <span className="text-zinc-400 capitalize font-medium">{key}</span>
                      <span className="font-mono font-semibold text-white tracking-wide">{String(val)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Live console logs */}
              {notif.logs && notif.logs.length > 0 && (
                <div className="bg-black/60 border border-white/[0.06] p-3 rounded-2xl text-[10px] font-mono text-zinc-300 max-h-[90px] overflow-y-auto space-y-1">
                  {notif.logs.map((log, lIdx) => (
                    <div key={lIdx} className="leading-relaxed truncate flex items-center gap-1.5">
                      <span className="text-[#30D158] font-bold">&gt;</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons - Apple Frosted Capsule Design */}
              {notif.actions && notif.actions.length > 0 && (
                <div className="flex gap-2 pt-0.5">
                  {notif.actions.map((act, aIdx) => (
                    <button
                      key={aIdx}
                      onClick={(e) => {
                        e.stopPropagation();
                        act.onClick();
                      }}
                      className="flex-1 py-2 px-3 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 active:scale-[0.98] border border-white/15 text-white transition-all shadow-sm text-center"
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Footer / Auto-dismiss countdown bar & History drawer link */}
              <div className="border-t border-white/[0.08] pt-3 flex justify-between items-center text-[10px] text-zinc-400 font-medium">
                <span className="flex items-center gap-1">
                  {notif.priority === 4 ? (
                    <span className="text-zinc-400">Manual dismissal required</span>
                  ) : (
                    <span className="text-zinc-400">Tap to toggle collapse</span>
                  )}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsHistoryOpen(true);
                  }}
                  className="flex items-center gap-1 text-zinc-300 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg border border-white/10"
                >
                  <Clock className="h-3 w-3" />
                  <span>History</span>
                  <ChevronRight className="h-2.5 w-2.5" />
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* NOTIFICATION HISTORY SLIDING DRAWER SHEET (macOS / iOS Style) */}
        <AnimatePresence>
          {isHistoryOpen && (
            <>
              {/* Dimmed backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-sm pointer-events-auto"
                onClick={() => setIsHistoryOpen(false)}
              />

              {/* Sidebar drawer */}
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="fixed top-0 right-0 h-full w-[360px] max-w-[88vw] bg-[#0A0A0A] border-l border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.9)] z-[140] flex flex-col pointer-events-auto p-5 text-left"
              >
                <div className="flex justify-between items-center pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#0A84FF]" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Notification Center</h3>
                  </div>
                  <button
                    onClick={() => setIsHistoryOpen(false)}
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-zinc-300 hover:text-white transition-all"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Scroller list */}
                <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
                  {history.length === 0 ? (
                    <div className="text-center text-xs text-zinc-500 py-16">
                      No notifications recorded yet.
                    </div>
                  ) : (
                    history.map((hItem: DynamicIslandNotificationItem) => (
                      <div
                        key={hItem.id}
                        className="p-3.5 bg-white/[0.04] border border-white/[0.08] rounded-2xl space-y-2 text-xs transition-all hover:bg-white/[0.06]"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <NotificationIcon icon={hItem.icon} type={hItem.type} size="sm" />
                            <span className="font-semibold text-white tracking-wide">{hItem.title}</span>
                          </div>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {hItem.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        {hItem.description && (
                          <p className="text-zinc-300 leading-relaxed text-[11.5px] font-normal pl-6">
                            {hItem.description}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-3 border-t border-white/10 text-[10px] text-zinc-400 text-center font-medium">
                  Showing last {history.length} events
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );
}

