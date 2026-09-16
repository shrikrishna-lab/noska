import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, CheckCircle2, Check, Plus, Bell, MoreHorizontal, X,
  Layers, Trophy, Sparkles, Users, ArrowUpRight, TrendingUp, CreditCard,
  ArrowRight, DollarSign, Calendar, ChevronRight, CheckCheck, ShieldCheck,
  Settings, Edit3, Sliders, Flame, Zap, Target, BookOpen, Wand2, RefreshCw,
  SlidersHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── PERSISTENCE STORAGE HELPER (User-by-User & Company-by-Owner) ───────────
export function getWorkflowUserData(userId: string = "default") {
  try {
    const raw = localStorage.getItem(`noska_workflow_data_${userId}`);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

export function saveWorkflowUserData(userId: string = "default", data: any) {
  try {
    const prev = getWorkflowUserData(userId) || {};
    localStorage.setItem(`noska_workflow_data_${userId}`, JSON.stringify({ ...prev, ...data }));
  } catch { /* ignore */ }
}

export interface CompanyFinanceConfig {
  payable: {
    invoiceNo: string;
    vendorName: string;
    vendorEmail: string;
    amount: string;
    dueDate: string;
    vendorCategory?: string;
  };
  receivable: {
    clientName: string;
    clientId: string;
    amount: string;
    defaultMethod: "Bank" | "Card" | "Pay Later";
    cardNumber: string;
    cardExpiry: string;
    cardCvc: string;
  };
  payLater: {
    supplierName: string;
    supplierEmail: string;
    amount: number;
    availableTerms: (30 | 60 | 90 | 120)[];
    feeRates: Record<number, number>;
  };
  paidEarly: {
    clientName: string;
    clientId: string;
    invoiceAmount: number;
    discountRate: number;
    payoutBankName?: string;
  };
}

export const DEFAULT_COMPANY_FINANCE_CONFIG: CompanyFinanceConfig = {
  payable: {
    invoiceNo: "MI-1033",
    vendorName: "Matango Inc",
    vendorEmail: "finance@matango.io",
    amount: "$11,000.00",
    dueDate: "Jul 30, 2024",
    vendorCategory: "Software & Cloud Services",
  },
  receivable: {
    clientName: "Alice Inc",
    clientId: "AL-302",
    amount: "$11,000.00",
    defaultMethod: "Card",
    cardNumber: "•••• 9460",
    cardExpiry: "03/27",
    cardCvc: "777",
  },
  payLater: {
    supplierName: "Matango Inc",
    supplierEmail: "finance@matango.io",
    amount: 11000,
    availableTerms: [30, 60, 90],
    feeRates: { 30: 0.016, 60: 0.028, 90: 0.039, 120: 0.052 },
  },
  paidEarly: {
    clientName: "Alice Inc",
    clientId: "AL-302",
    invoiceAmount: 11000,
    discountRate: 0.009,
    payoutBankName: "Silicon Valley Bank (SVB) ••8821",
  },
};

export function getCompanyFinanceData(companyId: string = "default"): CompanyFinanceConfig {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(`noska_company_finance_${companyId}`) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        payable: { ...DEFAULT_COMPANY_FINANCE_CONFIG.payable, ...(parsed.payable || {}) },
        receivable: { ...DEFAULT_COMPANY_FINANCE_CONFIG.receivable, ...(parsed.receivable || {}) },
        payLater: { ...DEFAULT_COMPANY_FINANCE_CONFIG.payLater, ...(parsed.payLater || {}) },
        paidEarly: { ...DEFAULT_COMPANY_FINANCE_CONFIG.paidEarly, ...(parsed.paidEarly || {}) },
      };
    }
  } catch { /* ignore */ }
  return DEFAULT_COMPANY_FINANCE_CONFIG;
}

export function saveCompanyFinanceData(companyId: string = "default", config: Partial<CompanyFinanceConfig>) {
  try {
    const prev = getCompanyFinanceData(companyId);
    const updated: CompanyFinanceConfig = {
      payable: { ...prev.payable, ...(config.payable || {}) },
      receivable: { ...prev.receivable, ...(config.receivable || {}) },
      payLater: { ...prev.payLater, ...(config.payLater || {}) },
      paidEarly: { ...prev.paidEarly, ...(config.paidEarly || {}) },
    };
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(`noska_company_finance_${companyId}`, JSON.stringify(updated));
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("noska_finance_config_updated", { detail: { companyId, updated } }));
    }
    return updated;
  } catch {
    return DEFAULT_COMPANY_FINANCE_CONFIG;
  }
}


// ── 1. FLOATING MINIMALIST PILL QUICK SCOPE BAR (Image 3) ──────────────────
export interface QuickScopeFilterProps {
  activeScope?: "assignees" | "priority" | "project";
  onScopeChange?: (scope: "assignees" | "priority" | "project") => void;
  scopeCounts?: { assignees?: number; priority?: number; project?: number };
  className?: string;
}

export function QuickScopeFilter({
  activeScope = "assignees",
  onScopeChange,
  scopeCounts,
  className
}: QuickScopeFilterProps) {
  const [selected, setSelected] = useState<"assignees" | "priority" | "project">(activeScope);
  const [sliderPos, setSliderPos] = useState(selected === "assignees" ? 0 : selected === "priority" ? 50 : 100);

  useEffect(() => {
    setSelected(activeScope);
    setSliderPos(activeScope === "assignees" ? 0 : activeScope === "priority" ? 50 : 100);
  }, [activeScope]);

  const handleSelect = (scope: "assignees" | "priority" | "project") => {
    setSelected(scope);
    setSliderPos(scope === "assignees" ? 0 : scope === "priority" ? 50 : 100);
    onScopeChange?.(scope);
  };

  return (
    <div className={cn("p-3 sm:p-3.5 rounded-3xl bg-white dark:bg-[#161722] border border-black/[0.06] dark:border-white/[0.08] shadow-xs space-y-2.5 select-none", className)}>
      {/* Top Minimalist Slider Track with Frosted Handle */}
      <div className="relative h-6 px-3 rounded-full bg-neutral-100 dark:bg-neutral-800/80 border border-black/[0.04] dark:border-white/[0.05] flex items-center justify-between">
        <div className="h-1 w-full rounded-full bg-neutral-200 dark:bg-neutral-700/60 relative overflow-hidden">
          <motion.div
            className="absolute top-0 bottom-0 left-0 bg-neutral-400 dark:bg-neutral-500 rounded-full"
            animate={{ width: `${Math.max(15, sliderPos)}%` }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        </div>
        <motion.div
          animate={{ x: selected === "assignees" ? 0 : selected === "priority" ? 40 : 80 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="size-4 rounded-full bg-white shadow-md border border-black/10 dark:border-white/20 flex items-center justify-center cursor-grab active:cursor-grabbing shrink-0 ml-2"
        >
          <div className="size-1.5 rounded-full bg-neutral-400" />
        </motion.div>
      </div>

      {/* Segmented Control Bar */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-neutral-100/80 dark:bg-neutral-900/60 border border-black/[0.03] dark:border-white/[0.04]">
        {(["assignees", "priority", "project"] as const).map((key) => {
          const isActive = selected === key;
          const count = scopeCounts?.[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleSelect(key)}
              className={cn(
                "py-1.5 px-3 rounded-xl text-xs font-mono transition-all text-center capitalize cursor-pointer flex items-center justify-center gap-1.5",
                isActive
                  ? "bg-white dark:bg-[#1e202f] text-neutral-900 dark:text-white shadow-xs font-bold"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
              )}
            >
              <span>{key}</span>
              {typeof count === "number" && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-full",
                  isActive ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold" : "bg-neutral-200/60 dark:bg-neutral-800/60 text-neutral-400"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── 2. 3D STACKED TASK DISPATCHER CARD (Image 2) ───────────────────────────
export interface StackedTask {
  id: string;
  title: string;
  subtitle: string;
  assignedAgo: string;
  type: string;
  pageId?: string;
  priority?: "urgent" | "high" | "medium" | "low";
}

export interface StackedTaskDispatcherProps {
  tasks?: StackedTask[];
  userId?: string;
  onDone?: (task: StackedTask) => void;
  onRemindLater?: (task: StackedTask) => void;
  onDismiss?: (task: StackedTask) => void;
  onAddTask?: (title: string, subtitle?: string) => void;
  className?: string;
}

export function StackedTaskDispatcher({
  tasks: initialTasks,
  userId = "default",
  onDone,
  onRemindLater,
  onDismiss,
  onAddTask,
  className
}: StackedTaskDispatcherProps) {
  const defaultTasks: StackedTask[] = [
    {
      id: "task-1",
      title: "Send notes to Johnny",
      subtitle: "Executive debrief on Q3 roadmap & sprint dependencies",
      assignedAgo: "3m ago",
      type: "New Task",
      priority: "high"
    },
    {
      id: "task-2",
      title: "Review Design System tokens",
      subtitle: "Check contrast ratios and typography scale",
      assignedAgo: "15m ago",
      type: "Review",
      priority: "medium"
    },
    {
      id: "task-3",
      title: "Deploy API Gateway patch",
      subtitle: "Verify rate limiting headers & latency telemetry",
      assignedAgo: "1h ago",
      type: "DevOps",
      priority: "urgent"
    }
  ];

  const [taskList, setTaskList] = useState<StackedTask[]>(() => {
    if (initialTasks && initialTasks.length > 0) return initialTasks;
    const saved = getWorkflowUserData(userId)?.dispatcherTasks;
    return saved || defaultTasks;
  });

  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");

  useEffect(() => {
    if (initialTasks && initialTasks.length > 0) {
      setTaskList(initialTasks);
    }
  }, [initialTasks]);

  const current = taskList[0];

  const handleDone = () => {
    if (!current) return;
    onDone?.(current);
    const updated = taskList.slice(1);
    setTaskList(updated);
    saveWorkflowUserData(userId, { dispatcherTasks: updated });
  };

  const handleRemindLater = () => {
    if (!current) return;
    onRemindLater?.(current);
    const updated = [...taskList.slice(1), taskList[0]];
    setTaskList(updated);
    saveWorkflowUserData(userId, { dispatcherTasks: updated });
  };

  const handleDismiss = () => {
    if (!current) return;
    onDismiss?.(current);
    const updated = taskList.slice(1);
    setTaskList(updated);
    saveWorkflowUserData(userId, { dispatcherTasks: updated });
  };

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const created: StackedTask = {
      id: `task-custom-${Date.now()}`,
      title: newTitle.trim(),
      subtitle: newSubtitle.trim() || "Workspace action item",
      assignedAgo: "Just now",
      type: "Priority Item",
      priority: "high"
    };
    const updated = [created, ...taskList];
    setTaskList(updated);
    saveWorkflowUserData(userId, { dispatcherTasks: updated });
    onAddTask?.(newTitle.trim(), newSubtitle.trim());
    setNewTitle("");
    setNewSubtitle("");
    setIsAdding(false);
  };

  if (taskList.length === 0) {
    return (
      <div className={cn("p-6 rounded-[28px] bg-white dark:bg-[#161722] border border-black/[0.06] dark:border-white/[0.08] shadow-xs text-center space-y-3", className)}>
        <div className="size-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
          <CheckCheck size={20} />
        </div>
        <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">All dispatched tasks clear!</h3>
        <p className="text-xs text-neutral-500">Noska Intelligence has cleared your immediate action queue.</p>
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
        >
          <Plus size={14} /> <span>Dispatch New Task</span>
        </button>
      </div>
    );
  }

  return (
    <div className={cn("relative pt-3 pb-2 px-1", className)}>
      {/* 3D Stack Depth Underlayers */}
      <div className="absolute inset-x-5 top-5 h-20 rounded-[28px] bg-neutral-200/60 dark:bg-neutral-800/40 border border-black/[0.04] dark:border-white/[0.05] shadow-xs translate-y-3 scale-[0.94] pointer-events-none" />
      <div className="absolute inset-x-3 top-4 h-20 rounded-[28px] bg-neutral-100/90 dark:bg-neutral-800/70 border border-black/[0.05] dark:border-white/[0.06] shadow-xs translate-y-1.5 scale-[0.97] pointer-events-none" />

      {/* Top Interactive Main Card */}
      <motion.div
        layout
        key={current.id}
        initial={{ opacity: 0, y: -10, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9, y: 15 }}
        transition={{ type: "spring", stiffness: 450, damping: 28 }}
        className="relative p-5 rounded-[28px] bg-white dark:bg-[#161722] border border-black/[0.08] dark:border-white/[0.09] shadow-xl space-y-3.5 z-10"
      >
        {/* Top Row with Icon, Metadata, and Options */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 border border-black/[0.05] dark:border-white/[0.08] flex items-center justify-center text-neutral-700 dark:text-neutral-200 shadow-2xs">
              <FileText size={18} strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-neutral-400 block">
                  {current.type} • Assigned to You {current.assignedAgo}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  {taskList.length} in queue
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-neutral-900 dark:text-neutral-100 tracking-tight leading-tight mt-0.5">
                {current.title}
              </h3>
            </div>
          </div>

          {/* Options and Dismiss */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsAdding(prev => !prev)}
              className="size-7 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
              title="Add task to queue"
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="size-7 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-rose-500 flex items-center justify-center transition cursor-pointer"
              title="Dismiss task"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Subtitle description */}
        <p className="text-xs text-neutral-500 dark:text-neutral-400 pl-13 leading-relaxed">
          {current.subtitle}
        </p>

        {/* Add inline form if open */}
        {isAdding && (
          <form onSubmit={handleCreateNew} className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900/80 border border-black/5 dark:border-white/10 space-y-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Task name (e.g. Prep pitch deck)"
              autoFocus
              className="w-full bg-transparent text-xs font-bold outline-none text-neutral-900 dark:text-white placeholder:text-neutral-400"
            />
            <input
              type="text"
              value={newSubtitle}
              onChange={(e) => setNewSubtitle(e.target.value)}
              placeholder="Notes or brief context"
              className="w-full bg-transparent text-[11px] outline-none text-neutral-500 placeholder:text-neutral-400"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-2.5 py-1 text-xs text-neutral-500 hover:text-neutral-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold cursor-pointer shadow-xs"
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
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleRemindLater}
            className="flex-1 py-2.5 px-4 rounded-full bg-neutral-100 hover:bg-neutral-200/80 dark:bg-neutral-800 dark:hover:bg-neutral-700/80 border border-black/[0.06] dark:border-white/[0.08] text-xs font-bold text-neutral-700 dark:text-neutral-200 flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
          >
            <Bell size={13} className="text-neutral-400" />
            <span>Remind Me Later</span>
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleDone}
            className="flex-1 py-2.5 px-4 rounded-full bg-[#1db954] hover:bg-[#1aa34a] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-[0_4px_16px_rgba(29,185,84,0.35)] transition cursor-pointer"
          >
            <CheckCircle2 size={14} className="fill-white text-[#1db954]" />
            <span>Mark as Done</span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

// ── 3. "YOU'RE ALMOST THERE!" MILESTONE & GOAL STEPPER (Image 1) ───────────
export interface GoalStepperCardProps {
  title?: string;
  userId?: string;
  initialStep?: number;
  onStepClick?: (step: number) => void;
  className?: string;
}

export function GoalStepperCard({
  title = "You're almost there!",
  userId = "default",
  initialStep = 3,
  onStepClick,
  className
}: GoalStepperCardProps) {
  const savedData = getWorkflowUserData(userId)?.stepper;

  const [activeStep, setActiveStep] = useState(savedData?.activeStep ?? initialStep);
  const [cardTitle, setCardTitle] = useState(savedData?.title ?? title);
  const [targetName, setTargetName] = useState(savedData?.targetName ?? "Primary Milestone Target");
  const [isEditing, setIsEditing] = useState(false);

  const [stepLabels, setStepLabels] = useState<string[]>(
    savedData?.stepLabels ?? ["Create Project", "Add Media", "(Set Goals)", "Team", "Launch"]
  );

  const steps = useMemo(() => {
    return stepLabels.map((lbl, idx) => ({
      step: idx + 1,
      label: lbl,
      done: idx + 1 < activeStep,
      active: idx + 1 === activeStep,
      isPlus: idx === stepLabels.length - 1 && activeStep <= idx
    }));
  }, [stepLabels, activeStep]);

  const handleStep = (stepNum: number) => {
    setActiveStep(stepNum);
    saveWorkflowUserData(userId, {
      stepper: { activeStep: stepNum, title: cardTitle, targetName, stepLabels }
    });
    onStepClick?.(stepNum);
  };

  const handleSaveConfig = () => {
    saveWorkflowUserData(userId, {
      stepper: { activeStep, title: cardTitle, targetName, stepLabels }
    });
    setIsEditing(false);
  };

  // Noska Intelligence Dynamic AI Tip
  const aiTips = [
    "Sprint velocity is 28% higher in morning focus blocks.",
    "Completing 'Set Goals' unlocks automated team delegation.",
    "Use round milestone targets to protect cognitive focus.",
    "You're 1 step away from launching your sprint initiative! 🚀"
  ];
  const currentTip = aiTips[Math.min(activeStep - 1, aiTips.length - 1)] || aiTips[0];

  const [showDetails, setShowDetails] = useState(false);

  return (
    <>
      <div
        onClick={() => setShowDetails(true)}
        className={cn("p-5 sm:p-6 rounded-[28px] bg-white dark:bg-[#161722] border border-black/[0.06] dark:border-white/[0.08] shadow-xs space-y-5 select-none relative cursor-pointer group overflow-hidden", className)}
      >
        {/* Subtle Graphic Texture Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#10b9810a_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none" />

        <div className="flex items-center justify-between relative z-10">
          <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight">
            {cardTitle}
          </h2>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              <span>View Data</span>
              <ArrowUpRight size={11} />
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(prev => !prev);
              }}
              className="size-7 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 hover:text-neutral-800 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
              title="Customize milestone roadmap"
            >
              <Settings size={13} />
            </button>
          </div>
        </div>

      {/* Goal Customization Panel */}
      {isEditing && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/80 border border-black/10 dark:border-white/10 space-y-2.5 text-xs"
        >
          <div className="font-bold text-neutral-800 dark:text-neutral-200">Customize Milestone Roadmap</div>
          <input
            type="text"
            value={cardTitle}
            onChange={(e) => setCardTitle(e.target.value)}
            placeholder="Roadmap Header"
            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-black/10 dark:border-white/10 outline-none text-xs"
          />
          <input
            type="text"
            value={targetName}
            onChange={(e) => setTargetName(e.target.value)}
            placeholder="Target Goal Name"
            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-black/10 dark:border-white/10 outline-none text-xs"
          />
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleSaveConfig}
              className="px-3 py-1 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold cursor-pointer shadow-xs"
            >
              Save Changes
            </button>
          </div>
        </motion.div>
      )}

      {/* Goal Chip / Stretch Target Selector */}
      <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-black/[0.04] dark:border-white/[0.05] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-neutral-800 dark:text-neutral-200">
            Sprint & Funding goal
          </span>
          <span className="text-neutral-400">
            <Layers size={13} />
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-black/[0.05] dark:border-white/[0.06] shadow-2xs">
            <CheckCircle2 size={15} className="text-emerald-500 fill-emerald-500/15 shrink-0" />
            <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 truncate">
              {targetName}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-bold shrink-0">
            <Sparkles size={13} className="text-emerald-500" />
            <span>Stretch goals</span>
          </div>
        </div>
      </div>

      {/* 5-Step Stepped Gradient Progress Track */}
      <div className="space-y-3">
        {/* Stepped Pill Bar */}
        <div className="h-10 rounded-full bg-gradient-to-r from-[#0a2e1d] via-[#1db954] to-neutral-200 dark:to-neutral-800 p-1 flex items-center justify-between shadow-inner">
          {steps.map((item) => (
            <button
              key={item.step}
              type="button"
              onClick={() => handleStep(item.step)}
              className={cn(
                "size-8 rounded-full flex items-center justify-center font-bold text-xs transition-transform cursor-pointer shadow-xs",
                item.step <= activeStep
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
          {steps.map((s) => (
            <span
              key={s.step}
              className={cn(
                "truncate px-0.5",
                s.active ? "text-emerald-600 dark:text-emerald-400 underline font-black" : s.done ? "text-neutral-900 dark:text-white" : "text-neutral-400"
              )}
            >
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom Pro-Tip Callout Banner — Dynamic Noska Intelligence */}
      <div className="p-2.5 rounded-full bg-emerald-500/[0.07] border border-emerald-500/20 text-center flex items-center justify-center gap-1.5">
        <Sparkles size={13} className="text-emerald-500 shrink-0" />
        <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
          <strong className="font-bold">Noska AI Tip:</strong> {currentTip}
        </span>
      </div>
    </div>

      {/* Real Data & Milestone Inspection Modal */}
      <AnimatePresence>
        {showDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              className="w-full max-w-lg p-6 rounded-[32px] bg-white dark:bg-[#161722] border border-black/10 dark:border-white/10 shadow-2xl space-y-5 text-neutral-900 dark:text-neutral-100"
            >
              <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold">
                    🚀
                  </div>
                  <div>
                    <h3 className="font-bold text-base">{cardTitle} • Milestone Telemetry</h3>
                    <p className="text-xs text-neutral-400">Live sprint progress and goal metrics</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDetails(false)}
                  className="size-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-neutral-800 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-neutral-400">Roadmap Progression Breakdown</div>
                {steps.map((s) => (
                  <div
                    key={s.step}
                    className={cn(
                      "p-3 rounded-2xl border flex items-center justify-between text-xs transition",
                      s.active
                        ? "bg-emerald-500/10 border-emerald-500/30 font-bold text-emerald-800 dark:text-emerald-300 shadow-xs"
                        : s.done
                        ? "bg-neutral-50 dark:bg-neutral-900/60 border-black/5 dark:border-white/5"
                        : "bg-neutral-50/40 dark:bg-neutral-900/30 border-black/5 dark:border-white/5 opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "size-6 rounded-full flex items-center justify-center text-xs font-bold",
                        s.done ? "bg-emerald-500 text-white" : s.active ? "bg-emerald-600 text-white" : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400"
                      )}>
                        {s.done ? "✓" : s.step}
                      </div>
                      <span>{s.label}</span>
                    </div>
                    <span className="font-mono text-[11px] font-semibold">
                      {s.done ? "100% Complete" : s.active ? "In Active Focus" : "Pending Queue"}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/80 border border-black/5 dark:border-white/5 flex items-center justify-between text-xs">
                <div>
                  <span className="text-neutral-400 block text-[11px]">Estimated Sprint Completion</span>
                  <strong className="text-sm font-black text-emerald-600">Sept 22, 2026 (Ahead of schedule)</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDetails(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-bold shadow-xs cursor-pointer"
                >
                  Close & Continue
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── 4. SOCIAL HABIT & STREAK RACE LEADERBOARD (Image 5) ────────────────────
export interface SocialHabitRaceCardProps {
  userPoints?: number;
  peerPoints?: number;
  peerName?: string;
  userId?: string;
  onLogHabit?: () => void;
  className?: string;
}

export function SocialHabitRaceCard({
  userPoints = 24,
  peerPoints = 30,
  peerName = "Lisa",
  userId = "default",
  onLogHabit,
  className
}: SocialHabitRaceCardProps) {
  const savedData = getWorkflowUserData(userId)?.habitRace;

  const [points, setPoints] = useState({
    user: savedData?.userPoints ?? userPoints,
    peer: savedData?.peerPoints ?? peerPoints
  });
  const [activePeerName, setActivePeerName] = useState(savedData?.peerName ?? peerName);
  const [challengeNumber, setChallengeNumber] = useState(savedData?.challengeNumber ?? 4);
  const [isCustomizing, setIsCustomizing] = useState(false);

  const handleLog = () => {
    const updatedUser = points.user + 5;
    const updatedPeer = points.peer + (Math.random() > 0.6 ? 2 : 0);
    const newPoints = { user: updatedUser, peer: updatedPeer };
    setPoints(newPoints);
    saveWorkflowUserData(userId, {
      habitRace: { userPoints: updatedUser, peerPoints: updatedPeer, peerName: activePeerName, challengeNumber }
    });
    onLogHabit?.();
  };

  const handleSaveCustom = (newPeer: string, uPts: number, pPts: number) => {
    setActivePeerName(newPeer);
    setPoints({ user: uPts, peer: pPts });
    saveWorkflowUserData(userId, {
      habitRace: { userPoints: uPts, peerPoints: pPts, peerName: newPeer, challengeNumber }
    });
    setIsCustomizing(false);
  };

  const leadDifference = points.peer - points.user;

  return (
    <div className={cn("relative p-5 sm:p-6 rounded-[28px] bg-gradient-to-b from-[#fdf6ec] via-[#fbf2e3] to-[#f7ebda] dark:from-[#2a221b] dark:via-[#221b15] dark:to-[#1a1410] border border-amber-300/40 dark:border-amber-700/30 shadow-sm space-y-4 overflow-hidden select-none", className)}>
      {/* Yellow Washi Tape Element at Top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-gradient-to-r from-amber-300 via-amber-200 to-amber-300 dark:from-amber-400/60 dark:via-amber-300/60 dark:to-amber-400/60 backdrop-blur-md shadow-md -rotate-1 pointer-events-none border-x-2 border-dashed border-amber-400/40" />

      {/* Subtle Dot Matrix Graphic Texture Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#92400e12_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none" />

      {/* Top Header Row with Settings Icon */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] font-bold text-amber-900/60 dark:text-amber-200/60 flex items-center gap-1">
          <Flame size={12} className="text-amber-500" /> Live Teammate Race
        </span>
        <button
          type="button"
          onClick={() => setIsCustomizing(prev => !prev)}
          className="size-6 rounded-full bg-amber-900/10 dark:bg-white/10 text-amber-800 dark:text-amber-200 flex items-center justify-center hover:bg-amber-900/20 transition cursor-pointer"
          title="Customize streak challenger"
        >
          <Settings size={12} />
        </button>
      </div>

      {/* Inline Customizer */}
      {isCustomizing && (
        <div className="p-3 rounded-2xl bg-amber-100/90 dark:bg-amber-950/80 border border-amber-300/60 space-y-2 text-xs">
          <div className="font-bold text-amber-950 dark:text-amber-100">Select Challenger Teammate</div>
          <div className="flex gap-2">
            {["Lisa", "Johnny", "Elena", "Marcus"].map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => handleSaveCustom(name, points.user, points.peer)}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold cursor-pointer",
                  activePeerName === name ? "bg-amber-900 text-white" : "bg-white/70 dark:bg-black/30 text-amber-900 dark:text-amber-200"
                )}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dual Race Tracks */}
      <div className="space-y-3">
        {/* Lane 1: Peer */}
        <div className="relative h-11 rounded-full bg-white/70 dark:bg-black/25 border border-amber-900/10 dark:border-white/10 p-1 flex items-center">
          <motion.div
            initial={{ width: "30%" }}
            animate={{ width: `${Math.min(90, Math.max(25, (points.peer / (points.peer + points.user || 1)) * 100))}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-end pr-1 shadow-xs relative"
          >
            <div className="size-8 rounded-full bg-gradient-to-tr from-rose-300 to-amber-200 border-2 border-white shadow-md flex items-center justify-center text-xs font-bold text-neutral-800">
              👩‍💼
            </div>
          </motion.div>
          <span className="absolute right-4 text-[11px] font-bold text-amber-900/60 dark:text-amber-200/60">
            {leadDifference > 0 ? `${activePeerName} is ${leadDifference} pts ahead` : `${activePeerName}: ${points.peer} pts`}
          </span>
        </div>

        {/* Lane 2: User */}
        <div className="relative h-11 rounded-full bg-white/70 dark:bg-black/25 border border-amber-900/10 dark:border-white/10 p-1 flex items-center">
          <motion.div
            initial={{ width: "20%" }}
            animate={{ width: `${Math.min(90, Math.max(25, (points.user / (points.peer + points.user || 1)) * 100))}%` }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="h-full rounded-full bg-amber-200/80 dark:bg-amber-800/40 flex items-center justify-end pr-1 shadow-xs relative"
          >
            <div className="size-8 rounded-full bg-gradient-to-tr from-sky-300 to-indigo-300 border-2 border-white shadow-md flex items-center justify-center text-xs font-bold text-neutral-800">
              👨‍💻
            </div>
          </motion.div>
          <span className="absolute right-4 text-[11px] font-bold text-amber-900/60 dark:text-amber-200/60">
            {leadDifference < 0 ? `You're leading by ${Math.abs(leadDifference)} pts!` : `You: ${points.user} pts`}
          </span>
        </div>
      </div>

      {/* Motivational Caption & AI Suggestion */}
      <p className="text-xs text-amber-950/80 dark:text-amber-200/80 leading-relaxed">
        With <strong>engaging challenges</strong> and a <strong>social leaderboard</strong>, our habit tracker lets you compete with teammates, making it fun and motivating to <strong>reach your goals together</strong>.
      </p>

      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] font-bold text-amber-800/80 dark:text-amber-300 flex items-center gap-1">
          <Trophy size={13} className="text-amber-500" /> Weekly Challenge #{challengeNumber}
        </span>
        <button
          type="button"
          onClick={handleLog}
          className="px-3.5 py-1.5 rounded-full bg-amber-900/15 hover:bg-amber-900/25 dark:bg-white/15 dark:hover:bg-white/25 text-amber-950 dark:text-white text-xs font-bold transition cursor-pointer shadow-xs active:scale-95"
        >
          + Log Habit (+5)
        </button>
      </div>
    </div>
  );
}

// ── 5. TEAM ORBIT & COGNITIVE JOURNEY HUB (Image 4) ────────────────────────
export interface TeamOrbitHubProps {
  title?: string;
  reflectionText?: string;
  userId?: string;
  onTeammateClick?: (name: string) => void;
  className?: string;
}

export function TeamOrbitHub({
  title = "Team Cognitive Reflection",
  reflectionText = "I'm passionate about sharing not just the daily tasks, but the journey. We get to connect with each other, share the wins and challenges, and grow a workspace community that's as much about people as it is about momentum.",
  userId = "default",
  onTeammateClick,
  className
}: TeamOrbitHubProps) {
  const teammates = ["Alex S.", "Elena R.", "Marcus T.", "Priya K.", "Johnny M."];

  return (
    <div className={cn("relative p-6 rounded-[28px] bg-white dark:bg-[#161722] border border-black/[0.06] dark:border-white/[0.08] shadow-xs space-y-4 overflow-hidden text-center select-none", className)}>
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
            <Sparkles size={12} className="text-emerald-300" /> {title}
          </span>
          <span>Noska Realtime AI</span>
        </div>
        <p className="text-xs text-white/95 leading-relaxed">
          "{reflectionText}"
        </p>
        <div className="flex items-center justify-between text-[10.5px] font-bold text-white/75 pt-1">
          <span>Every sprint is an invitation to be part of that story ✨</span>
          <span className="text-emerald-300">#NoskaCommunity</span>
        </div>
      </div>

      {/* Orbiting Teammates Row */}
      <div className="relative z-10 flex items-center justify-center -space-x-2 pt-1">
        {teammates.map((name, i) => (
          <motion.div
            key={name}
            whileHover={{ scale: 1.25, y: -4, zIndex: 30 }}
            className={cn(
              "size-8 rounded-full border-2 border-white dark:border-neutral-900 shadow-sm flex items-center justify-center text-[10px] font-bold text-white cursor-pointer transition-transform",
              i === 0 ? "bg-emerald-500" : i === 1 ? "bg-purple-500" : i === 2 ? "bg-amber-500" : i === 3 ? "bg-rose-500" : "bg-sky-500"
            )}
            title={name}
            onClick={() => onTeammateClick?.(name)}
          >
            {name.slice(0, 1)}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
// ── 6. MATCHA PROGRESS GOALS CARD (Image 1) ─────────────────────────────────
export interface ProgressGoalsCardProps {
  initialCount?: number;
  realCount?: number;
  label?: string;
  badgeLabel?: string;
  stepBoost?: number;
  userId?: string;
  onIncrement?: (newCount: number) => void;
  className?: string;
}

export function ProgressGoalsCard({
  initialCount = 20500,
  realCount,
  label = "Steps",
  badgeLabel = "Progress goals",
  stepBoost = 5000,
  userId = "default",
  onIncrement,
  className
}: ProgressGoalsCardProps) {
  const savedData = getWorkflowUserData(userId)?.progressGoal;

  const [metricMode, setMetricMode] = useState<"steps" | "words" | "tasks" | "focus">(
    savedData?.metricMode ?? "steps"
  );
  const [targetVal, setTargetVal] = useState<number>(savedData?.targetVal ?? 25000);
  const [boostVal, setBoostVal] = useState<number>(savedData?.boostVal ?? stepBoost);
  const [count, setCount] = useState<number>(() => {
    if (typeof realCount === "number" && metricMode === "words") return realCount;
    return savedData?.count ?? initialCount;
  });
  const [boosts, setBoosts] = useState(1);
  const [isCustomizing, setIsCustomizing] = useState(false);

  useEffect(() => {
    if (typeof realCount === "number" && (metricMode === "words" || metricMode === "tasks")) {
      setCount(realCount);
    }
  }, [realCount, metricMode]);

  const activeLabel = metricMode === "words" ? "Words Written" : metricMode === "tasks" ? "Tasks Completed" : metricMode === "focus" ? "Focus Minutes" : "Steps";

  const formattedCount = count >= 1000 ? (count / 1000).toFixed(1) + "K" : count.toString();
  const formattedBoost = "+" + (boostVal >= 1000 ? (boostVal / 1000).toFixed(0) + "K" : boostVal.toString());

  const handleAdd = () => {
    const next = count + boostVal;
    setCount(next);
    setBoosts(b => b + 1);
    saveWorkflowUserData(userId, {
      progressGoal: { count: next, metricMode, targetVal, boostVal }
    });
    onIncrement?.(next);
  };

  const handleSelectMode = (mode: "steps" | "words" | "tasks" | "focus") => {
    setMetricMode(mode);
    const newCount = mode === "words" && realCount ? realCount : mode === "tasks" ? (realCount || 14) : mode === "focus" ? 180 : 20500;
    setCount(newCount);
    saveWorkflowUserData(userId, {
      progressGoal: { count: newCount, metricMode: mode, targetVal, boostVal }
    });
    setIsCustomizing(false);
  };

  const [showDetails, setShowDetails] = useState(false);

  return (
    <>
      <div
        onClick={() => setShowDetails(true)}
        className={cn("p-5 sm:p-6 rounded-[28px] bg-white dark:bg-[#161722] border border-black/[0.06] dark:border-white/[0.08] shadow-xs space-y-3 select-none relative cursor-pointer group overflow-hidden", className)}
      >
        {/* Subtle Graphic Texture Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#84cc160d_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none" />

        {/* Top Header Row with Badge & Customize Button */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold shadow-2xs">
            <TrendingUp size={12} className="text-emerald-600 dark:text-emerald-400" />
            <span>{badgeLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              <span>Inspect Info</span>
              <ArrowUpRight size={11} />
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsCustomizing(prev => !prev);
              }}
              className="size-7 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 hover:text-neutral-800 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
              title="Customize goal metric"
            >
              <Settings size={13} />
            </button>
          </div>
        </div>

      {/* Inline Goal Mode Selector */}
      {isCustomizing && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900/80 border border-black/10 dark:border-white/10 space-y-2 text-xs"
        >
          <div className="font-bold text-neutral-800 dark:text-neutral-200">Select Goal Tracking Metric</div>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: "steps", label: "👟 Daily Steps", default: 20500 },
              { id: "words", label: "📝 Real Workspace Words", default: 12400 },
              { id: "tasks", label: "✓ Tasks Completed", default: 25 },
              { id: "focus", label: "⏱️ Focus Minutes", default: 240 }
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectMode(opt.id as any)}
                className={cn(
                  "p-2 rounded-xl text-left font-bold transition cursor-pointer border",
                  metricMode === opt.id
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-300 shadow-2xs"
                    : "bg-white dark:bg-neutral-800 border-black/5 dark:border-white/5 text-neutral-600 dark:text-neutral-300"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Matcha Soft Curved Canvas */}
      <div className="relative p-5 rounded-3xl bg-gradient-to-br from-[#eaf2dc] via-[#e3edd2] to-[#d8e7c3] dark:from-[#23311f] dark:via-[#1c2819] dark:to-[#172014] border border-[#d2e3be] dark:border-[#2e4028] shadow-inner overflow-hidden min-h-[150px] flex flex-col justify-between">
        {/* Top Right Olive Green Action Button */}
        <div className="flex justify-end">
          <motion.button
            type="button"
            whileHover={{ scale: 1.12, rotate: 90 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleAdd}
            className="size-9 rounded-full bg-[#526626] hover:bg-[#43541e] text-white shadow-md flex items-center justify-center cursor-pointer transition-colors"
            title={`Add ${formattedBoost} ${activeLabel}`}
          >
            <Plus size={18} strokeWidth={2.5} />
          </motion.button>
        </div>

        {/* Bottom Metrics and Glowing Lime Progress Arc */}
        <div className="flex items-end justify-between pt-4 relative">
          <div>
            <span className="text-xs font-bold text-[#5e7734] dark:text-[#a0c56e] block mb-0.5">
              {activeLabel}
            </span>
            <motion.h3
              key={count}
              initial={{ scale: 0.92, opacity: 0.8 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-3xl sm:text-4xl font-black text-[#2f4214] dark:text-[#dcf2b6] tracking-tight leading-none"
            >
              {formattedCount}
            </motion.h3>
          </div>

          {/* Floating Pill + Lime Progress Arc Badge */}
          <div className="relative flex items-center">
            {/* Background Arc Graphic */}
            <div className="size-16 rounded-full border-4 border-[#b9d992]/40 border-t-[#8fc944] -rotate-45 shrink-0 opacity-80" />
            
            <motion.div
              key={boosts}
              initial={{ scale: 0.8, y: 5 }}
              animate={{ scale: 1, y: 0 }}
              className="absolute -left-3 top-1 px-2.5 py-1 rounded-full bg-white dark:bg-[#1f2d1b] shadow-md border border-black/5 dark:border-white/10 text-xs font-black text-[#374e18] dark:text-[#c7e997]"
            >
              {formattedBoost}
            </motion.div>
          </div>
        </div>
      </div>
    </div>

      {/* Real Data Goal Inspection Modal */}
      <AnimatePresence>
        {showDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              className="w-full max-w-lg p-6 rounded-[32px] bg-white dark:bg-[#161722] border border-black/10 dark:border-white/10 shadow-2xl space-y-5 text-neutral-900 dark:text-neutral-100"
            >
              <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-xl bg-lime-500/15 text-lime-700 dark:text-lime-400 flex items-center justify-center font-bold">
                    📊
                  </div>
                  <div>
                    <h3 className="font-bold text-base">{activeLabel} • Live Workspace Telemetry</h3>
                    <p className="text-xs text-neutral-400">Aggregated cognitive output and goal velocity</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDetails(false)}
                  className="size-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-neutral-800 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 space-y-1">
                  <span className="text-xs text-neutral-400 font-bold uppercase">Current Total</span>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {count.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-neutral-500">Live synced from workspace</span>
                </div>
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 space-y-1">
                  <span className="text-xs text-neutral-400 font-bold uppercase">Target Goal</span>
                  <div className="text-2xl font-black text-neutral-800 dark:text-neutral-200 font-mono">
                    {targetVal.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-bold">{Math.round((count / targetVal) * 100)}% achieved</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-lime-500/10 to-teal-500/10 border border-emerald-500/20 space-y-1 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                  <Sparkles size={13} />
                  <span>Noska Intelligence Insights</span>
                </div>
                <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed text-[11.5px]">
                  Your average output is <strong>+22% higher</strong> than last week. Maintain this focus rhythm for another 25 minutes to lock in today's stretch tier.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDetails(false)}
                  className="px-5 py-2.5 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-bold shadow-sm cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── 7. ACCOUNTS PAYABLE CARD (Image 2 - Top Left) ───────────────────────────
export interface AccountsPayableCardProps {
  companyId?: string;
  isOwner?: boolean;
  invoiceNo?: string;
  vendorName?: string;
  vendorEmail?: string;
  amount?: string;
  dueDate?: string;
  onPay?: () => void;
  onConfigChange?: (config: CompanyFinanceConfig["payable"]) => void;
  className?: string;
}

export function AccountsPayableCard({
  companyId = "default",
  isOwner = false,
  invoiceNo: propInvoiceNo,
  vendorName: propVendorName,
  vendorEmail: propVendorEmail,
  amount: propAmount,
  dueDate: propDueDate,
  onPay,
  onConfigChange,
  className
}: AccountsPayableCardProps) {
  const [financeConfig, setFinanceConfig] = useState<CompanyFinanceConfig>(() => getCompanyFinanceData(companyId));
  const [paid, setPaid] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);

  // Edit form state for owner
  const [editInvoiceNo, setEditInvoiceNo] = useState(financeConfig.payable.invoiceNo);
  const [editVendorName, setEditVendorName] = useState(financeConfig.payable.vendorName);
  const [editVendorEmail, setEditVendorEmail] = useState(financeConfig.payable.vendorEmail);
  const [editAmount, setEditAmount] = useState(financeConfig.payable.amount);
  const [editDueDate, setEditDueDate] = useState(financeConfig.payable.dueDate);

  useEffect(() => {
    const handleUpdate = () => {
      const cfg = getCompanyFinanceData(companyId);
      setFinanceConfig(cfg);
      setEditInvoiceNo(cfg.payable.invoiceNo);
      setEditVendorName(cfg.payable.vendorName);
      setEditVendorEmail(cfg.payable.vendorEmail);
      setEditAmount(cfg.payable.amount);
      setEditDueDate(cfg.payable.dueDate);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("noska_finance_config_updated", handleUpdate);
      return () => window.removeEventListener("noska_finance_config_updated", handleUpdate);
    }
  }, [companyId]);

  const activeInvoiceNo = propInvoiceNo || financeConfig.payable.invoiceNo;
  const activeVendorName = propVendorName || financeConfig.payable.vendorName;
  const activeVendorEmail = propVendorEmail || financeConfig.payable.vendorEmail;
  const activeAmount = propAmount || financeConfig.payable.amount;
  const activeDueDate = propDueDate || financeConfig.payable.dueDate;

  const handlePay = () => {
    setPaid(true);
    onPay?.();
  };

  const handleSaveConfig = () => {
    const updatedPayable = {
      invoiceNo: editInvoiceNo,
      vendorName: editVendorName,
      vendorEmail: editVendorEmail,
      amount: editAmount,
      dueDate: editDueDate,
    };
    const saved = saveCompanyFinanceData(companyId, { payable: updatedPayable });
    setFinanceConfig(saved);
    onConfigChange?.(updatedPayable);
    setShowCustomize(false);
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn("p-6 sm:p-7 rounded-[32px] bg-[#f8f9fa] dark:bg-[#12131a] border border-black/[0.06] dark:border-white/[0.08] shadow-xs hover:shadow-xl space-y-6 flex flex-col justify-between relative overflow-hidden group transition-all", className)}
    >
      {/* Subtle Dot Grid Background Texture */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />

      {/* Holographic Light Sheen Sweep on Hover */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent pointer-events-none" />

      <div className="flex items-start justify-between relative z-10">
        <div>
          <h3 className="text-xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight flex items-center gap-2">
            <span>Accounts payable</span>
            {isOwner && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/40">
                Owner Mode
              </span>
            )}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Manage, pay and reconcile all business bills
          </p>
        </div>

        {isOwner && (
          <motion.button
            type="button"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCustomize(true)}
            className="p-2 rounded-xl bg-white dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white shadow-xs transition cursor-pointer"
            title="Company Owner Customization — Edit bill parameters & vendor details"
          >
            <Settings size={14} />
          </motion.button>
        )}
      </div>

      {/* Layered Document Invoices Canvas */}
      <div className="relative pt-6 pb-2 px-2 flex justify-center items-center">
        {/* Layer 1: Left Lavender Invoice */}
        <div className="absolute -left-1 top-2 w-48 h-56 rounded-2xl bg-[#d5d7fd] dark:bg-[#2c2f60] border border-black/5 dark:border-white/10 shadow-sm rotate-[-8deg] opacity-75 p-3 text-[9px] font-mono text-neutral-600 dark:text-neutral-300 pointer-events-none select-none">
          <div className="font-bold">INV-23490</div>
          <div className="text-[7px] opacity-60">ACCOUNTS DEPT</div>
          <div className="mt-8 border-t border-dashed border-neutral-400/40 pt-2 text-[7.5px] opacity-70">
            AUTO-RECONCILED
          </div>
        </div>

        {/* Layer 2: White Studio Kantala Invoice */}
        <div className="absolute right-0 top-0 w-52 h-60 rounded-2xl bg-white dark:bg-[#1e202f] border border-black/10 dark:border-white/10 shadow-md rotate-[4deg] p-4 text-[9.5px] font-mono text-neutral-500 pointer-events-none select-none space-y-1">
          <div className="font-bold text-neutral-900 dark:text-white">STUDIO KANTALA</div>
          <div className="text-[8px]">INFO@KANTALA.IO</div>
          <div className="pt-2 border-t border-dashed border-neutral-200 dark:border-neutral-700">
            DUE: AUG 15
          </div>
        </div>

        {/* Main Floating Payable Card */}
        <motion.div
          whileHover={{ y: -3 }}
          className="relative z-10 w-full max-w-[280px] p-4 rounded-2xl bg-white dark:bg-[#1c1e2d] border border-black/[0.08] dark:border-white/[0.12] shadow-xl space-y-3.5 backdrop-blur-sm"
        >
          {/* Vendor Header */}
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-bold shadow-xs">
              ▲
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                {activeVendorName}
              </h4>
              <span className="text-[10px] text-neutral-400 block font-mono truncate">
                {activeVendorEmail}
              </span>
            </div>
          </div>

          {/* Key-Value Fields */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-neutral-500 dark:text-neutral-400">
              <span>Invoice no.</span>
              <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">{activeInvoiceNo}</span>
            </div>
            <div className="flex justify-between text-neutral-500 dark:text-neutral-400">
              <span>Amount</span>
              <span className="font-mono font-black text-neutral-900 dark:text-white">{activeAmount}</span>
            </div>
            <div className="flex justify-between text-neutral-500 dark:text-neutral-400">
              <span>Due date</span>
              <span className="font-mono text-neutral-700 dark:text-neutral-300">{activeDueDate}</span>
            </div>
          </div>

          {/* Action Button & Rubber Stamp */}
          <div className="flex items-center justify-between pt-1">
            {paid ? (
              <motion.div
                initial={{ scale: 0.7, opacity: 0, rotate: -15 }}
                animate={{ scale: 1, opacity: 1, rotate: -8 }}
                className="px-2.5 py-0.5 rounded border-2 border-emerald-600 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400 font-black text-[11px] uppercase tracking-wider bg-emerald-50/80 dark:bg-emerald-950/50"
              >
                ✓ PAID
              </motion.div>
            ) : (
              <span className="text-[10px] text-neutral-400 font-mono">Pending Auth</span>
            )}

            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePay}
              disabled={paid}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer",
                paid
                  ? "bg-emerald-600 text-white cursor-default"
                  : "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800"
              )}
            >
              {paid ? (
                <>
                  <Check size={12} strokeWidth={3} />
                  <span>Settled</span>
                </>
              ) : (
                <>
                  <span>Pay</span>
                  <ArrowRight size={12} />
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Owner Customization Modal */}
      <AnimatePresence>
        {showCustomize && isOwner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-[#161824] border border-black/10 dark:border-white/10 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    Customize Accounts Payable
                  </h3>
                  <p className="text-xs text-neutral-400">Owner config persisted per company workspace</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomize(false)}
                  className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Vendor Name</label>
                  <input
                    type="text"
                    value={editVendorName}
                    onChange={(e) => setEditVendorName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-black/10 dark:border-white/10 font-medium text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Vendor Email</label>
                  <input
                    type="email"
                    value={editVendorEmail}
                    onChange={(e) => setEditVendorEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-black/10 dark:border-white/10 font-mono text-neutral-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Invoice No.</label>
                    <input
                      type="text"
                      value={editInvoiceNo}
                      onChange={(e) => setEditInvoiceNo(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-black/10 dark:border-white/10 font-mono text-neutral-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Amount</label>
                    <input
                      type="text"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-black/10 dark:border-white/10 font-mono text-neutral-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Due Date</label>
                  <input
                    type="text"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-black/10 dark:border-white/10 font-mono text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomize(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="px-5 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold shadow-md cursor-pointer"
                >
                  Save Owner Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── 8. ACCOUNTS RECEIVABLE CARD (Image 2 - Top Right) ───────────────────────
export interface AccountsReceivableCardProps {
  companyId?: string;
  isOwner?: boolean;
  clientName?: string;
  clientId?: string;
  amount?: string;
  onConfigChange?: (config: CompanyFinanceConfig["receivable"]) => void;
  className?: string;
}

export function AccountsReceivableCard({
  companyId = "default",
  isOwner = false,
  clientName: propClientName,
  clientId: propClientId,
  amount: propAmount,
  onConfigChange,
  className
}: AccountsReceivableCardProps) {
  const [financeConfig, setFinanceConfig] = useState<CompanyFinanceConfig>(() => getCompanyFinanceData(companyId));
  const [method, setMethod] = useState<"Bank" | "Card" | "Pay Later">(financeConfig.receivable.defaultMethod || "Card");
  const [showCustomize, setShowCustomize] = useState(false);

  // Edit form state for owner
  const [editClientName, setEditClientName] = useState(financeConfig.receivable.clientName);
  const [editClientId, setEditClientId] = useState(financeConfig.receivable.clientId);
  const [editAmount, setEditAmount] = useState(financeConfig.receivable.amount);
  const [editCardNum, setEditCardNum] = useState(financeConfig.receivable.cardNumber);
  const [editCardExpiry, setEditCardExpiry] = useState(financeConfig.receivable.cardExpiry);
  const [editCardCvc, setEditCardCvc] = useState(financeConfig.receivable.cardCvc);

  useEffect(() => {
    const handleUpdate = () => {
      const cfg = getCompanyFinanceData(companyId);
      setFinanceConfig(cfg);
      setEditClientName(cfg.receivable.clientName);
      setEditClientId(cfg.receivable.clientId);
      setEditAmount(cfg.receivable.amount);
      setEditCardNum(cfg.receivable.cardNumber);
      setEditCardExpiry(cfg.receivable.cardExpiry);
      setEditCardCvc(cfg.receivable.cardCvc);
      setMethod(cfg.receivable.defaultMethod || "Card");
    };
    if (typeof window !== "undefined") {
      window.addEventListener("noska_finance_config_updated", handleUpdate);
      return () => window.removeEventListener("noska_finance_config_updated", handleUpdate);
    }
  }, [companyId]);

  const activeClientName = propClientName || financeConfig.receivable.clientName;
  const activeClientId = propClientId || financeConfig.receivable.clientId;
  const activeAmount = propAmount || financeConfig.receivable.amount;

  const handleSaveConfig = () => {
    const updatedReceivable = {
      clientName: editClientName,
      clientId: editClientId,
      amount: editAmount,
      defaultMethod: method,
      cardNumber: editCardNum,
      cardExpiry: editCardExpiry,
      cardCvc: editCardCvc,
    };
    const saved = saveCompanyFinanceData(companyId, { receivable: updatedReceivable });
    setFinanceConfig(saved);
    onConfigChange?.(updatedReceivable);
    setShowCustomize(false);
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn("p-6 sm:p-7 rounded-[32px] bg-[#f8f9fa] dark:bg-[#12131a] border border-black/[0.06] dark:border-white/[0.08] shadow-xs hover:shadow-xl space-y-6 flex flex-col justify-between relative overflow-hidden group transition-all", className)}
    >
      {/* Subtle Dot Grid Background Texture */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />

      {/* Holographic Light Sheen Sweep on Hover */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent pointer-events-none" />

      <div className="flex items-start justify-between relative z-10">
        <div>
          <h3 className="text-xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight flex items-center gap-2">
            <span>Accounts receivable</span>
            {isOwner && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/40">
                Owner Mode
              </span>
            )}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Send invoices, set reminders and get paid
          </p>
        </div>

        {isOwner && (
          <motion.button
            type="button"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCustomize(true)}
            className="p-2 rounded-xl bg-white dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white shadow-xs transition cursor-pointer"
            title="Company Owner Customization — Edit invoice, terms & card details"
          >
            <Settings size={14} />
          </motion.button>
        )}
      </div>

      {/* Terracotta / Orange Invoice Presentation Tray */}
      <div className="relative pt-8 pb-2 flex flex-col items-center">
        {/* Top Terracotta Sliding Invoice */}
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="w-56 h-28 -mb-12 rounded-2xl bg-gradient-to-br from-[#f29a67] to-[#e67e45] text-white p-4 shadow-lg flex flex-col justify-between select-none relative overflow-hidden"
        >
          {/* Subtle diagonal lines watermark texture */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,#fff_1px,transparent_0)] [background-size:8px_8px]" />
          <h4 className="font-serif text-lg font-bold tracking-tight relative z-10">{activeClientName}</h4>
          <div className="flex justify-between text-[10px] text-white/80 font-mono relative z-10">
            <span>INVOICE #{activeClientId}</span>
            <span>NET 30</span>
          </div>
        </motion.div>

        {/* Front Payment Method Sheet */}
        <div className="relative z-10 w-full max-w-[290px] p-4 rounded-2xl bg-white dark:bg-[#1c1e2d] border border-black/[0.08] dark:border-white/[0.12] shadow-xl space-y-3.5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="size-7 rounded-full bg-[#f29a67] text-white flex items-center justify-center text-xs font-black shrink-0 shadow-xs">
                {activeClientName.charAt(0)}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                  {activeClientName}
                </h4>
                <span className="text-[10px] text-neutral-400 font-mono block truncate">
                  {activeClientId}
                </span>
              </div>
            </div>
            <span className="text-sm font-black text-neutral-900 dark:text-white font-mono shrink-0">
              {activeAmount}
            </span>
          </div>

          {/* Segmented Selector: Bank | Card | Pay Later */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 text-[11px] font-bold">
            {(["Bank", "Card", "Pay Later"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={cn(
                  "py-1.5 rounded-lg transition text-center cursor-pointer",
                  method === m
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xs"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                )}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Saved Card Quick Details with Holographic Chip Preview */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-black/[0.04] dark:border-white/[0.05] text-[11px] font-mono text-neutral-600 dark:text-neutral-300">
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-2.5 rounded-xs bg-amber-400/80 border border-amber-500/40 shadow-xs" />
              <span>{financeConfig.receivable.cardNumber}</span>
            </div>
            <span>{financeConfig.receivable.cardExpiry}</span>
            <span>{financeConfig.receivable.cardCvc}</span>
          </div>
        </div>
      </div>

      {/* Owner Customization Modal */}
      <AnimatePresence>
        {showCustomize && isOwner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-[#161824] border border-black/10 dark:border-white/10 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    Customize Accounts Receivable
                  </h3>
                  <p className="text-xs text-neutral-400">Owner config persisted per company workspace</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomize(false)}
                  className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Client Name</label>
                  <input
                    type="text"
                    value={editClientName}
                    onChange={(e) => setEditClientName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-black/10 dark:border-white/10 font-medium text-neutral-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Client/Invoice ID</label>
                    <input
                      type="text"
                      value={editClientId}
                      onChange={(e) => setEditClientId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-black/10 dark:border-white/10 font-mono text-neutral-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Amount</label>
                    <input
                      type="text"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-black/10 dark:border-white/10 font-mono text-neutral-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Card Mask</label>
                    <input
                      type="text"
                      value={editCardNum}
                      onChange={(e) => setEditCardNum(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-black/10 dark:border-white/10 font-mono text-neutral-900 dark:text-white text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Expiry</label>
                    <input
                      type="text"
                      value={editCardExpiry}
                      onChange={(e) => setEditCardExpiry(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-black/10 dark:border-white/10 font-mono text-neutral-900 dark:text-white text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">CVC</label>
                    <input
                      type="text"
                      value={editCardCvc}
                      onChange={(e) => setEditCardCvc(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-black/10 dark:border-white/10 font-mono text-neutral-900 dark:text-white text-[11px]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomize(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="px-5 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold shadow-md cursor-pointer"
                >
                  Save Owner Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── 9. PAY LATER CARD (Image 2 - Bottom Left) ───────────────────────────────
export interface PayLaterCardProps {
  companyId?: string;
  isOwner?: boolean;
  supplierName?: string;
  amount?: number;
  onConfirm?: (terms: number) => void;
  onConfigChange?: (config: CompanyFinanceConfig["payLater"]) => void;
  className?: string;
}

export function PayLaterCard({
  companyId = "default",
  isOwner = false,
  supplierName: propSupplierName,
  amount: propAmount,
  onConfirm,
  onConfigChange,
  className
}: PayLaterCardProps) {
  const [financeConfig, setFinanceConfig] = useState<CompanyFinanceConfig>(() => getCompanyFinanceData(companyId));
  const [method, setMethod] = useState<"Bank" | "Card" | "Pay Later">("Pay Later");
  const [termDays, setTermDays] = useState<30 | 60 | 90 | 120>(30);
  const [showCustomize, setShowCustomize] = useState(false);

  // Edit form state for owner
  const [editSupplierName, setEditSupplierName] = useState(financeConfig.payLater.supplierName);
  const [editSupplierEmail, setEditSupplierEmail] = useState(financeConfig.payLater.supplierEmail);
  const [editAmount, setEditAmount] = useState(financeConfig.payLater.amount);
  const [editRate30, setEditRate30] = useState(financeConfig.payLater.feeRates[30] || 0.016);
  const [editRate60, setEditRate60] = useState(financeConfig.payLater.feeRates[60] || 0.028);
  const [editRate90, setEditRate90] = useState(financeConfig.payLater.feeRates[90] || 0.039);

  useEffect(() => {
    const handleUpdate = () => {
      const cfg = getCompanyFinanceData(companyId);
      setFinanceConfig(cfg);
      setEditSupplierName(cfg.payLater.supplierName);
      setEditSupplierEmail(cfg.payLater.supplierEmail);
      setEditAmount(cfg.payLater.amount);
      setEditRate30(cfg.payLater.feeRates[30] || 0.016);
      setEditRate60(cfg.payLater.feeRates[60] || 0.028);
      setEditRate90(cfg.payLater.feeRates[90] || 0.039);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("noska_finance_config_updated", handleUpdate);
      return () => window.removeEventListener("noska_finance_config_updated", handleUpdate);
    }
  }, [companyId]);

  const activeSupplierName = propSupplierName || financeConfig.payLater.supplierName;
  const activeAmount = typeof propAmount === "number" ? propAmount : financeConfig.payLater.amount;

  const currentRate = financeConfig.payLater.feeRates[termDays] ?? (termDays === 30 ? 0.016 : termDays === 60 ? 0.028 : 0.039);
  const feeAmount = Math.round(activeAmount * currentRate);
  const totalAmount = activeAmount + feeAmount;

  const handleTermSelect = (days: 30 | 60 | 90 | 120) => {
    setTermDays(days);
    onConfirm?.(days);
  };

  const handleSaveConfig = () => {
    const updatedPayLater = {
      supplierName: editSupplierName,
      supplierEmail: editSupplierEmail,
      amount: Number(editAmount) || 11000,
      availableTerms: [30, 60, 90] as (30 | 60 | 90 | 120)[],
      feeRates: {
        30: Number(editRate30) || 0.016,
        60: Number(editRate60) || 0.028,
        90: Number(editRate90) || 0.039,
      },
    };
    const saved = saveCompanyFinanceData(companyId, { payLater: updatedPayLater });
    setFinanceConfig(saved);
    onConfigChange?.(updatedPayLater);
    setShowCustomize(false);
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn("p-6 sm:p-7 rounded-[32px] bg-[#f8f9fa] dark:bg-[#12131a] border border-black/[0.06] dark:border-white/[0.08] shadow-xs hover:shadow-xl space-y-6 flex flex-col justify-between relative overflow-hidden group transition-all", className)}
    >
      {/* Subtle Dot Grid Background Texture */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />

      {/* Holographic Light Sheen Sweep on Hover */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent pointer-events-none" />

      <div className="flex items-start justify-between relative z-10">
        <div>
          <h3 className="text-xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight flex items-center gap-2">
            <span>Pay later</span>
            {isOwner && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40">
                Owner Mode
              </span>
            )}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Sell first, pay suppliers 30 to 90 days later
          </p>
        </div>

        {isOwner && (
          <motion.button
            type="button"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCustomize(true)}
            className="p-2 rounded-xl bg-white dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white shadow-xs transition cursor-pointer"
            title="Company Owner Customization — Edit net terms & dynamic fees"
          >
            <Settings size={14} />
          </motion.button>
        )}
      </div>

      {/* Calculation & Terms Card */}
      <div className="w-full max-w-[300px] mx-auto p-4 rounded-2xl bg-white dark:bg-[#1c1e2d] border border-black/[0.08] dark:border-white/[0.12] shadow-xl space-y-3.5 backdrop-blur-sm">
        {/* Supplier Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="size-7 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
              ▲
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                {activeSupplierName}
              </h4>
              <span className="text-[10px] text-neutral-400 font-mono block truncate">
                {financeConfig.payLater.supplierEmail}
              </span>
            </div>
          </div>
          <span className="text-sm font-black text-neutral-900 dark:text-white font-mono shrink-0">
            ${activeAmount.toLocaleString()}.00
          </span>
        </div>

        {/* Payment Method Selector */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 text-[11px] font-bold">
          {(["Bank", "Card", "Pay Later"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={cn(
                "py-1.5 rounded-lg transition text-center cursor-pointer",
                method === m
                  ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              )}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Days Pill Selector: 30 | 60 | 90 Days */}
        <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-black/[0.04] dark:border-white/[0.05] text-[11px] font-mono font-bold items-center">
          {([30, 60, 90] as const).map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => handleTermSelect(days)}
              className={cn(
                "py-1 rounded-lg transition text-center cursor-pointer",
                termDays === days
                  ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              )}
            >
              {days}
            </button>
          ))}
          <span className="text-center text-[10px] text-neutral-400 uppercase font-sans">
            Days
          </span>
        </div>

        {/* Financial Breakdown */}
        <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.08] space-y-1.5 text-xs font-mono">
          <div className="flex justify-between text-neutral-500 dark:text-neutral-400">
            <span>Fee {(currentRate * 100).toFixed(1)}%</span>
            <span>${feeAmount.toLocaleString()}.00</span>
          </div>
          <div className="flex justify-between font-black text-neutral-900 dark:text-white pt-1">
            <span>Total</span>
            <span>${totalAmount.toLocaleString()}.00</span>
          </div>
        </div>
      </div>

      {/* Owner Customization Modal */}
      <AnimatePresence>
        {showCustomize && isOwner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-[#161824] border border-black/10 dark:border-white/10 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    Customize Pay Later Terms
                  </h3>
                  <p className="text-xs text-neutral-400">Owner config persisted per company workspace</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomize(false)}
                  className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Supplier Name</label>
                  <input
                    type="text"
                    value={editSupplierName}
                    onChange={(e) => setEditSupplierName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-black/10 dark:border-white/10 font-medium text-neutral-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Supplier Email</label>
                    <input
                      type="email"
                      value={editSupplierEmail}
                      onChange={(e) => setEditSupplierEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-black/10 dark:border-white/10 font-mono text-neutral-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Base Amount ($)</label>
                    <input
                      type="number"
                      value={editAmount}
                      onChange={(e) => setEditAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-black/10 dark:border-white/10 font-mono text-neutral-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">30 Days Fee %</label>
                    <input
                      type="number"
                      step="0.001"
                      value={editRate30}
                      onChange={(e) => setEditRate30(Number(e.target.value))}
                      className="w-full px-2.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-black/10 dark:border-white/10 font-mono text-neutral-900 dark:text-white text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">60 Days Fee %</label>
                    <input
                      type="number"
                      step="0.001"
                      value={editRate60}
                      onChange={(e) => setEditRate60(Number(e.target.value))}
                      className="w-full px-2.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-black/10 dark:border-white/10 font-mono text-neutral-900 dark:text-white text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">90 Days Fee %</label>
                    <input
                      type="number"
                      step="0.001"
                      value={editRate90}
                      onChange={(e) => setEditRate90(Number(e.target.value))}
                      className="w-full px-2.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-black/10 dark:border-white/10 font-mono text-neutral-900 dark:text-white text-[11px]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomize(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="px-5 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold shadow-md cursor-pointer"
                >
                  Save Owner Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── 10. GET PAID EARLY CARD (Image 2 - Bottom Right) ────────────────────────
export interface GetPaidEarlyCardProps {
  companyId?: string;
  isOwner?: boolean;
  invoiceAmount?: number;
  discountRate?: number;
  clientName?: string;
  clientId?: string;
  onClaimEarly?: (payout: number) => void;
  onConfigChange?: (config: CompanyFinanceConfig["paidEarly"]) => void;
  className?: string;
}

export function GetPaidEarlyCard({
  companyId = "default",
  isOwner = false,
  invoiceAmount: propInvoiceAmount,
  discountRate: propDiscountRate,
  clientName: propClientName,
  clientId: propClientId,
  onClaimEarly,
  onConfigChange,
  className
}: GetPaidEarlyCardProps) {
  const [financeConfig, setFinanceConfig] = useState<CompanyFinanceConfig>(() => getCompanyFinanceData(companyId));
  const [activated, setActivated] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);

  // Edit form state for owner
  const [editClientName, setEditClientName] = useState(financeConfig.paidEarly.clientName);
  const [editClientId, setEditClientId] = useState(financeConfig.paidEarly.clientId);
  const [editInvoiceAmount, setEditInvoiceAmount] = useState(financeConfig.paidEarly.invoiceAmount);
  const [editDiscountRate, setEditDiscountRate] = useState(financeConfig.paidEarly.discountRate);
  const [editBankName, setEditBankName] = useState(financeConfig.paidEarly.payoutBankName || "Silicon Valley Bank (SVB) ••8821");

  useEffect(() => {
    const handleUpdate = () => {
      const cfg = getCompanyFinanceData(companyId);
      setFinanceConfig(cfg);
      setEditClientName(cfg.paidEarly.clientName);
      setEditClientId(cfg.paidEarly.clientId);
      setEditInvoiceAmount(cfg.paidEarly.invoiceAmount);
      setEditDiscountRate(cfg.paidEarly.discountRate);
      setEditBankName(cfg.paidEarly.payoutBankName || "Silicon Valley Bank (SVB) ••8821");
    };
    if (typeof window !== "undefined") {
      window.addEventListener("noska_finance_config_updated", handleUpdate);
      return () => window.removeEventListener("noska_finance_config_updated", handleUpdate);
    }
  }, [companyId]);

  const activeInvoiceAmount = typeof propInvoiceAmount === "number" ? propInvoiceAmount : financeConfig.paidEarly.invoiceAmount;
  const activeDiscountRate = typeof propDiscountRate === "number" ? propDiscountRate : financeConfig.paidEarly.discountRate;
  const activeClientName = propClientName || financeConfig.paidEarly.clientName;
  const activeClientId = propClientId || financeConfig.paidEarly.clientId;

  const discountAmount = Math.round(activeInvoiceAmount * activeDiscountRate);
  const payout = activeInvoiceAmount - discountAmount;

  const handleToggle = () => {
    const next = !activated;
    setActivated(next);
    if (next) onClaimEarly?.(payout);
  };

  const handleSaveConfig = () => {
    const updatedPaidEarly = {
      clientName: editClientName,
      clientId: editClientId,
      invoiceAmount: Number(editInvoiceAmount) || 11000,
      discountRate: Number(editDiscountRate) || 0.009,
      payoutBankName: editBankName,
    };
    const saved = saveCompanyFinanceData(companyId, { paidEarly: updatedPaidEarly });
    setFinanceConfig(saved);
    onConfigChange?.(updatedPaidEarly);
    setShowCustomize(false);
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn("p-6 sm:p-7 rounded-[32px] bg-[#f8f9fa] dark:bg-[#12131a] border border-black/[0.06] dark:border-white/[0.08] shadow-xs hover:shadow-xl space-y-6 flex flex-col justify-between relative overflow-hidden group transition-all", className)}
    >
      {/* Subtle Dot Grid Background Texture */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />

      {/* Holographic Light Sheen Sweep on Hover */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent pointer-events-none" />

      <div className="flex items-start justify-between relative z-10">
        <div>
          <h3 className="text-xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight flex items-center gap-2">
            <span>Get paid early</span>
            {isOwner && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40">
                Owner Mode
              </span>
            )}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Unlock revenue tied up in your invoices
          </p>
        </div>

        {isOwner && (
          <motion.button
            type="button"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCustomize(true)}
            className="p-2 rounded-xl bg-white dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white shadow-xs transition cursor-pointer"
            title="Company Owner Customization — Edit early payout rate & invoice amount"
          >
            <Settings size={14} />
          </motion.button>
        )}
      </div>

      {/* Early Payout Card */}
      <div className="w-full max-w-[300px] mx-auto p-4 rounded-2xl bg-white dark:bg-[#1c1e2d] border border-black/[0.08] dark:border-white/[0.12] shadow-xl space-y-3.5 backdrop-blur-sm">
        {/* Client Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="size-7 rounded-full bg-[#f29a67] text-white flex items-center justify-center text-xs font-black shrink-0 shadow-xs">
              {activeClientName.charAt(0)}
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                {activeClientName}
              </h4>
              <span className="text-[10px] text-neutral-400 font-mono block truncate">
                {activeClientId}
              </span>
            </div>
          </div>
          <span className="text-sm font-black text-neutral-900 dark:text-white font-mono shrink-0">
            ${activeInvoiceAmount.toLocaleString()}.00
          </span>
        </div>

        {/* Payout Metric Header */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400 font-medium">Instant Payout</span>
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>{showDetails ? "Hide" : "See details"}</span>
              <ChevronRight size={12} className={cn("transition-transform", showDetails ? "rotate-90" : "")} />
            </button>
          </div>
          <h3 className="text-2xl font-black text-neutral-900 dark:text-white font-mono tracking-tight mt-1">
            ${payout.toLocaleString()}.00
          </h3>

          {/* Expandable Details Drawer */}
          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-2.5 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/80 border border-black/5 dark:border-white/5 text-[11px] font-mono space-y-1 overflow-hidden"
              >
                <div className="flex justify-between text-neutral-500">
                  <span>Gross Invoice:</span>
                  <span>${activeInvoiceAmount.toLocaleString()}.00</span>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Early Fee ({(activeDiscountRate * 100).toFixed(1)}%):</span>
                  <span>-${discountAmount.toLocaleString()}.00</span>
                </div>
                <div className="flex justify-between text-neutral-400 pt-1 border-t border-black/5 dark:border-white/5 text-[10px]">
                  <span>Payout Destination:</span>
                  <span className="truncate max-w-[130px]">{financeConfig.paidEarly.payoutBankName}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sliding Toggle Action Button */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={handleToggle}
          className={cn(
            "w-full py-2.5 px-3 rounded-full flex items-center justify-between transition-all cursor-pointer shadow-md",
            activated
              ? "bg-[#1f5f46] text-white"
              : "bg-[#294c3e] hover:bg-[#203c31] text-white"
          )}
        >
          <div className={cn(
            "size-6 rounded-full bg-white text-emerald-800 flex items-center justify-center shadow-md transition-transform duration-300",
            activated ? "translate-x-[200px]" : "translate-x-0"
          )}>
            {activated ? <Check size={14} strokeWidth={3} /> : <div className="size-2.5 rounded-full bg-emerald-600" />}
          </div>
          <span className={cn("text-xs font-bold pr-4", activated ? "-translate-x-6" : "")}>
            {activated ? "Paid Early Processed" : "Get paid early"}
          </span>
        </motion.button>
      </div>

      {/* Owner Customization Modal */}
      <AnimatePresence>
        {showCustomize && isOwner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-[#161824] border border-black/10 dark:border-white/10 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    Customize Early Payout Settings
                  </h3>
                  <p className="text-xs text-neutral-400">Owner config persisted per company workspace</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomize(false)}
                  className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Client Name</label>
                  <input
                    type="text"
                    value={editClientName}
                    onChange={(e) => setEditClientName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-black/10 dark:border-white/10 font-medium text-neutral-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Invoice Amount ($)</label>
                    <input
                      type="number"
                      value={editInvoiceAmount}
                      onChange={(e) => setEditInvoiceAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-black/10 dark:border-white/10 font-mono text-neutral-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Discount Fee Rate</label>
                    <input
                      type="number"
                      step="0.001"
                      value={editDiscountRate}
                      onChange={(e) => setEditDiscountRate(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-black/10 dark:border-white/10 font-mono text-neutral-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Payout Bank Account</label>
                  <input
                    type="text"
                    value={editBankName}
                    onChange={(e) => setEditBankName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-black/10 dark:border-white/10 font-mono text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomize(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="px-5 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold shadow-md cursor-pointer"
                >
                  Save Owner Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── 11. COMPLETE FINANCE WORKFLOW HUB (Image 2 - 4 Cards Grid) ──────────────
export interface FinanceWorkflowHubProps {
  companyId?: string;
  companyName?: string;
  isOwner?: boolean;
  currentUserId?: string;
  onToast?: (message: string) => void;
  className?: string;
}

export function FinanceWorkflowHub({
  companyId = "default",
  companyName = "Company Workspace",
  isOwner = false,
  currentUserId,
  onToast,
  className
}: FinanceWorkflowHubProps) {
  const [financeConfig, setFinanceConfig] = useState<CompanyFinanceConfig>(() => getCompanyFinanceData(companyId));
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      setFinanceConfig(getCompanyFinanceData(companyId));
    };
    if (typeof window !== "undefined") {
      window.addEventListener("noska_finance_config_updated", handleUpdate);
      return () => window.removeEventListener("noska_finance_config_updated", handleUpdate);
    }
  }, [companyId]);

  const handleResetDefaults = () => {
    const resetConfig = saveCompanyFinanceData(companyId, DEFAULT_COMPANY_FINANCE_CONFIG);
    setFinanceConfig(resetConfig);
    setShowGlobalSettings(false);
    onToast?.("Restored organization financial default parameters");
  };

  return (
    <div className={cn("space-y-4 relative", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight flex items-center gap-2.5">
            <span>Financial Operations & Cash Flow</span>
            {isOwner && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                🏢 {companyName} Admin
              </span>
            )}
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Automated billing, reconciliation, supplier payment terms, and instant invoice payouts.
          </p>
        </div>

        {isOwner && (
          <motion.button
            type="button"
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowGlobalSettings(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-xs font-bold text-neutral-700 dark:text-neutral-200 shadow-xs hover:shadow-md transition cursor-pointer self-start sm:self-auto"
          >
            <SlidersHorizontal size={13} />
            <span>Owner Config</span>
          </motion.button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AccountsPayableCard
          companyId={companyId}
          isOwner={isOwner}
          onPay={() => onToast?.(`Invoice ${financeConfig.payable.invoiceNo} payment authorized`)}
        />
        <AccountsReceivableCard
          companyId={companyId}
          isOwner={isOwner}
        />
        <PayLaterCard
          companyId={companyId}
          isOwner={isOwner}
          onConfirm={(days) => onToast?.(`Supplier Net-${days} term activated`)}
        />
        <GetPaidEarlyCard
          companyId={companyId}
          isOwner={isOwner}
          onClaimEarly={(payout) => onToast?.(`Instant payout of $${payout.toLocaleString()}.00 initiated!`)}
        />
      </div>

      {/* Global Owner Settings Modal */}
      <AnimatePresence>
        {showGlobalSettings && isOwner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg p-6 rounded-3xl bg-white dark:bg-[#161824] border border-black/10 dark:border-white/10 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                    Organization Finance Hub Config
                  </h3>
                  <p className="text-xs text-neutral-400">Scoped to company: {companyName} (ID: {companyId})</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGlobalSettings(false)}
                  className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 space-y-2 text-xs">
                <div className="flex justify-between font-medium">
                  <span className="text-neutral-500">Accounts Payable Vendor:</span>
                  <span className="font-bold text-neutral-900 dark:text-white">{financeConfig.payable.vendorName} ({financeConfig.payable.amount})</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-neutral-500">Accounts Receivable Client:</span>
                  <span className="font-bold text-neutral-900 dark:text-white">{financeConfig.receivable.clientName} ({financeConfig.receivable.amount})</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-neutral-500">Pay Later Supplier:</span>
                  <span className="font-bold text-neutral-900 dark:text-white">{financeConfig.payLater.supplierName} (${financeConfig.payLater.amount.toLocaleString()})</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-neutral-500">Early Payout Discount:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{(financeConfig.paidEarly.discountRate * 100).toFixed(1)}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                >
                  Reset Defaults
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowGlobalSettings(false)}
                    className="px-5 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold shadow-md cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

