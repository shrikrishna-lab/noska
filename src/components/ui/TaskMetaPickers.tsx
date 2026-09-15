import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ChevronDown, Check, X, Flame, Zap, Circle, AlertTriangle } from "lucide-react";

export type TaskPriority = "urgent" | "high" | "medium" | "low";

interface PriorityOption {
  id: TaskPriority;
  label: string;
  badge: string;
  icon: React.ReactNode;
  bgClass: string;
  textClass: string;
  borderClass: string;
  dotClass: string;
}

const PRIORITY_OPTIONS: PriorityOption[] = [
  {
    id: "urgent",
    label: "Urgent",
    badge: "🔥 Urgent",
    icon: <Flame size={13} className="text-rose-500 fill-rose-500/20" />,
    bgClass: "bg-rose-500/10 hover:bg-rose-500/20 dark:bg-rose-500/15 dark:hover:bg-rose-500/25",
    textClass: "text-rose-600 dark:text-rose-400 font-semibold",
    borderClass: "border-rose-500/30 dark:border-rose-500/40",
    dotClass: "bg-rose-500"
  },
  {
    id: "high",
    label: "High",
    badge: "⚡ High",
    icon: <Zap size={13} className="text-amber-500 fill-amber-500/20" />,
    bgClass: "bg-amber-500/10 hover:bg-amber-500/20 dark:bg-amber-500/15 dark:hover:bg-amber-500/25",
    textClass: "text-amber-600 dark:text-amber-400 font-semibold",
    borderClass: "border-amber-500/30 dark:border-amber-500/40",
    dotClass: "bg-amber-500"
  },
  {
    id: "medium",
    label: "Medium",
    badge: "🔹 Medium",
    icon: <Circle size={10} className="text-blue-500 fill-blue-500" />,
    bgClass: "bg-blue-500/10 hover:bg-blue-500/20 dark:bg-blue-500/15 dark:hover:bg-blue-500/25",
    textClass: "text-blue-600 dark:text-blue-400 font-semibold",
    borderClass: "border-blue-500/30 dark:border-blue-500/40",
    dotClass: "bg-blue-500"
  },
  {
    id: "low",
    label: "Low",
    badge: "⚪ Low",
    icon: <Circle size={10} className="text-neutral-400 fill-neutral-400/50" />,
    bgClass: "bg-neutral-500/10 hover:bg-neutral-500/20 dark:bg-neutral-500/15 dark:hover:bg-neutral-500/25",
    textClass: "text-neutral-600 dark:text-neutral-400 font-medium",
    borderClass: "border-neutral-400/25 dark:border-neutral-500/30",
    dotClass: "bg-neutral-400"
  }
];

export function TactilePriorityPicker({
  value,
  onChange,
  className = ""
}: {
  value: TaskPriority;
  onChange: (val: TaskPriority) => void;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentOption = PRIORITY_OPTIONS.find(opt => opt.id === value) || PRIORITY_OPTIONS[2];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={`relative inline-block ${className}`} ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all border shadow-2xs cursor-pointer select-none ${currentOption.bgClass} ${currentOption.textClass} ${currentOption.borderClass}`}
      >
        <span className="flex items-center justify-center shrink-0">
          {currentOption.icon}
        </span>
        <span className="font-medium text-[12px]">{currentOption.label} Priority</span>
        <ChevronDown
          size={12}
          className={`transition-transform duration-200 opacity-70 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 4 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 top-full z-50 mt-1 w-48 rounded-2xl bg-white/95 dark:bg-[#1c1d22]/95 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.12] p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.18)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.6)]"
          >
            <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Select Priority
            </div>
            <div className="space-y-0.5">
              {PRIORITY_OPTIONS.map(opt => {
                const isSelected = opt.id === value;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onChange(opt.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all text-left cursor-pointer ${
                      isSelected
                        ? `${opt.bgClass} ${opt.textClass}`
                        : "text-neutral-700 dark:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="shrink-0">{opt.icon}</span>
                      <span className="font-medium text-[12.5px]">{opt.label} Priority</span>
                    </div>
                    {isSelected && (
                      <Check size={13} className={opt.textClass} strokeWidth={2.6} />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TactileDuePicker({
  value,
  onChange,
  placeholder = "Due date / timeline",
  className = ""
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleQuickSelect = (dateStr: string) => {
    onChange(dateStr);
    setIsOpen(false);
  };

  const getShortcutDate = (type: "today" | "tomorrow" | "friday" | "next_week") => {
    const now = new Date();
    if (type === "today") return "Today";
    if (type === "tomorrow") return "Tomorrow";
    if (type === "friday") {
      const day = now.getDay();
      const diff = (5 - day + 7) % 7 || 7;
      const nextFri = new Date(now.getTime() + diff * 86400000);
      return `Fri, ${nextFri.toLocaleDateString([], { month: "short", day: "numeric" })}`;
    }
    if (type === "next_week") {
      const nextMon = new Date(now.getTime() + 7 * 86400000);
      return `Next week (${nextMon.toLocaleDateString([], { month: "short", day: "numeric" })})`;
    }
    return "";
  };

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all border ${
          value
            ? "bg-blue-500/10 dark:bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400 font-medium"
            : "bg-black/[0.04] dark:bg-white/[0.06] border-black/[0.06] dark:border-white/[0.08] text-neutral-600 dark:text-neutral-400 hover:border-black/15 dark:hover:border-white/15"
        }`}
      >
        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          className="flex items-center gap-1.5 cursor-pointer outline-none"
        >
          <Calendar size={12} className={value ? "text-blue-500" : "text-neutral-400"} />
          <span className="text-[12px] truncate max-w-[140px]">
            {value || placeholder}
          </span>
        </button>

        {value ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors cursor-pointer"
            title="Clear due date"
          >
            <X size={11} />
          </button>
        ) : (
          <ChevronDown
            size={11}
            onClick={() => setIsOpen(prev => !prev)}
            className={`cursor-pointer text-neutral-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 4 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 top-full z-50 mt-1 w-56 rounded-2xl bg-white/95 dark:bg-[#1c1d22]/95 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.12] p-2 shadow-[0_12px_32px_rgba(0,0,0,0.18)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.6)]"
          >
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Quick Presets
            </div>
            <div className="grid grid-cols-2 gap-1 mb-2">
              <button
                type="button"
                onClick={() => handleQuickSelect(getShortcutDate("today"))}
                className="px-2.5 py-1.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] hover:bg-blue-500/15 hover:text-blue-600 dark:hover:text-blue-400 text-neutral-700 dark:text-neutral-300 text-xs font-medium text-left transition-colors cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(getShortcutDate("tomorrow"))}
                className="px-2.5 py-1.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] hover:bg-blue-500/15 hover:text-blue-600 dark:hover:text-blue-400 text-neutral-700 dark:text-neutral-300 text-xs font-medium text-left transition-colors cursor-pointer"
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(getShortcutDate("friday"))}
                className="px-2.5 py-1.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] hover:bg-blue-500/15 hover:text-blue-600 dark:hover:text-blue-400 text-neutral-700 dark:text-neutral-300 text-xs font-medium text-left transition-colors cursor-pointer"
              >
                This Friday
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(getShortcutDate("next_week"))}
                className="px-2.5 py-1.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] hover:bg-blue-500/15 hover:text-blue-600 dark:hover:text-blue-400 text-neutral-700 dark:text-neutral-300 text-xs font-medium text-left transition-colors cursor-pointer"
              >
                Next Week
              </button>
            </div>

            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 border-t border-black/[0.05] dark:border-white/[0.08] pt-1.5">
              Custom Timeline / Date
            </div>
            <div className="mt-1">
              <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="e.g. Sep 25, 3pm"
                autoFocus
                className="w-full rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] px-2.5 py-1.5 text-xs text-[var(--text)] outline-none focus:border-blue-500 placeholder:text-neutral-400"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function isTaskOverdue(task: {
  completed?: boolean;
  checked?: boolean;
  priority?: string;
  due?: string;
  text?: string;
  title?: string;
  status?: string;
}): boolean {
  const isDone = !!(task.checked || task.completed);
  if (isDone) return false;

  if (task.priority === "urgent" || task.status === "overdue") return true;

  const title = (task.text || task.title || "").toLowerCase();
  if (title.includes("urgent") || title.includes("overdue") || title.includes("asap")) return true;

  const due = (task.due || "").trim().toLowerCase();
  if (!due) return false;
  if (due.includes("yesterday") || due.includes("overdue") || due.includes("past due")) return true;

  // Check if string is a past date
  const parsed = Date.parse(task.due || "");
  if (!isNaN(parsed)) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsed < today.getTime()) {
      return true;
    }
  }

  return false;
}

