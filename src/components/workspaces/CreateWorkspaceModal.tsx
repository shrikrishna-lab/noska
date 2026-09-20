import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sparkles,
  Plus,
  Check,
  ArrowRight,
  Layers,
  LayoutGrid,
  AlertCircle,
  Loader2,
  Building2,
  Briefcase,
  Rocket,
  Zap,
  Globe,
  Cpu,
  Palette,
  BookOpen,
  Code2,
  Terminal,
  Folder,
  Heart,
  Type,
  LucideIcon
} from "lucide-react";
import { PlanBadge } from "../billing/PlanBadge";
import { requireLimit, trackUsage } from "../../lib/billing/guards";
import { createWorkspaceRow, WorkspaceLimitError, type WorkspaceRow } from "../../features/workspaces/service";

export interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (workspace: WorkspaceRow) => void;
  onOpenBilling?: () => void;
  onToast?: (message: string) => void;
  wsLimit: number | null;
  wsUsed: number;
  wsPlanName: string;
}

interface ThemePreset {
  id: string;
  label: string;
  gradient: string;
  glowRgba: string;
  ambientClass: string;
  discBg: string;
}

const THEME_PRESETS: ThemePreset[] = [
  {
    id: "dark",
    label: "Midnight Disc",
    gradient: "from-neutral-800 via-neutral-900 to-black",
    glowRgba: "rgba(0, 0, 0, 0.45)",
    ambientClass: "from-neutral-500/10 via-neutral-500/5 to-transparent",
    discBg: "bg-[#18181b] dark:bg-black text-white"
  },
  {
    id: "emerald",
    label: "Teal Emerald",
    gradient: "from-emerald-400 via-teal-500 to-cyan-600",
    glowRgba: "rgba(16, 185, 129, 0.45)",
    ambientClass: "from-teal-500/15 via-emerald-500/5 to-transparent",
    discBg: "bg-gradient-to-tr from-emerald-500 to-teal-600 text-white"
  },
  {
    id: "amber",
    label: "Sunset Amber",
    gradient: "from-amber-400 via-orange-500 to-rose-500",
    glowRgba: "rgba(245, 158, 11, 0.45)",
    ambientClass: "from-amber-500/15 via-orange-500/5 to-transparent",
    discBg: "bg-gradient-to-tr from-amber-500 to-orange-500 text-white"
  },
  {
    id: "indigo",
    label: "Iris Indigo",
    gradient: "from-indigo-400 via-purple-500 to-indigo-700",
    glowRgba: "rgba(99, 102, 241, 0.45)",
    ambientClass: "from-indigo-500/15 via-purple-500/5 to-transparent",
    discBg: "bg-gradient-to-tr from-indigo-500 to-violet-600 text-white"
  },
  {
    id: "rose",
    label: "Rose Blossom",
    gradient: "from-pink-400 via-rose-500 to-red-500",
    glowRgba: "rgba(244, 63, 94, 0.45)",
    ambientClass: "from-rose-500/15 via-pink-500/5 to-transparent",
    discBg: "bg-gradient-to-tr from-rose-500 to-pink-600 text-white"
  },
  {
    id: "violet",
    label: "Cosmic Violet",
    gradient: "from-purple-400 via-fuchsia-500 to-indigo-600",
    glowRgba: "rgba(168, 85, 247, 0.45)",
    ambientClass: "from-purple-500/15 via-fuchsia-500/5 to-transparent",
    discBg: "bg-gradient-to-tr from-purple-500 to-fuchsia-600 text-white"
  },
  {
    id: "sky",
    label: "Pacific Sky",
    gradient: "from-sky-400 via-blue-500 to-cyan-600",
    glowRgba: "rgba(14, 165, 233, 0.45)",
    ambientClass: "from-sky-500/15 via-blue-500/5 to-transparent",
    discBg: "bg-gradient-to-tr from-sky-500 to-blue-600 text-white"
  },
];

const SYMBOL_PRESETS: Array<{ id: string; label: string; icon: LucideIcon }> = [
  { id: "letter", label: "Initial Letter / None", icon: Type },
  { id: "layoutGrid", label: "App Grid", icon: LayoutGrid },
  { id: "layers", label: "Layers", icon: Layers },
  { id: "sparkles", label: "Sparkles", icon: Sparkles },
  { id: "building", label: "Building", icon: Building2 },
  { id: "briefcase", label: "Briefcase", icon: Briefcase },
  { id: "rocket", label: "Rocket", icon: Rocket },
  { id: "zap", label: "Zap", icon: Zap },
  { id: "globe", label: "Globe", icon: Globe },
  { id: "cpu", label: "Cpu", icon: Cpu },
  { id: "palette", label: "Palette", icon: Palette },
  { id: "book", label: "Book", icon: BookOpen },
  { id: "code", label: "Code", icon: Code2 },
  { id: "terminal", label: "Terminal", icon: Terminal },
  { id: "folder", label: "Folder", icon: Folder },
  { id: "heart", label: "Heart", icon: Heart },
];

export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  onOpenBilling,
  onToast,
  wsLimit,
  wsUsed,
  wsPlanName
}) => {
  const [name, setName] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<ThemePreset>(THEME_PRESETS[0]);
  const [selectedIcon, setSelectedIcon] = useState<string>("layoutGrid");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isLimitReached = wsLimit !== null && wsUsed >= wsLimit;

  useEffect(() => {
    if (isOpen) {
      setName("");
      setError(null);
      setSelectedTheme(THEME_PRESETS[0]);
      setSelectedIcon("layoutGrid");
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a workspace name");
      inputRef.current?.focus();
      return;
    }

    if (isLimitReached) {
      setError(`Workspace limit reached for your ${wsPlanName} plan (${wsUsed}/${wsLimit}). Upgrade to create more workspaces.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const gate = await requireLimit("max_workspaces", 1);
      if (!gate.ok && !gate.transport) {
        setError(gate.message || "Workspace limit reached for your plan.");
        setLoading(false);
        return;
      }

      const row = await createWorkspaceRow(trimmed, {
        icon: selectedIcon,
        color: selectedTheme.id
      });
      await trackUsage("max_workspaces", 1, row.id);
      onToast?.(`Workspace "${row.name}" created successfully.`);
      onCreated(row);
      onClose();
    } catch (err: any) {
      if (err instanceof WorkspaceLimitError || err?.code === "WORKSPACE_LIMIT_REACHED") {
        setError(err.message || "Workspace limit reached.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to create workspace.");
      }
    } finally {
      setLoading(false);
    }
  };

  const renderIconGlyph = () => {
    if (selectedIcon === "letter") {
      const char = name.trim() ? name.trim().charAt(0).toUpperCase() : "W";
      return (
        <span className="font-bold text-[15px] tracking-tight text-white select-none">
          {char}
        </span>
      );
    }

    const symbolObj = SYMBOL_PRESETS.find(s => s.id === selectedIcon);
    if (symbolObj?.icon) {
      const IconComp = symbolObj.icon;
      return <IconComp size={17} className="stroke-[2.2] text-white" />;
    }

    return <LayoutGrid size={17} className="stroke-[2.2] text-white" />;
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 select-none">
        {/* Apple-grade Liquid Frosted Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 dark:bg-black/75 backdrop-blur-xl"
        />

        {/* Modal Window Container (Ultra-Smooth Hardware-Accelerated Spring) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{
            type: "spring",
            stiffness: 380,
            damping: 28,
            mass: 0.8
          }}
          style={{ willChange: "transform, opacity" }}
          className="relative w-full max-w-[430px] rounded-[28px] border border-black/[0.08] dark:border-white/[0.12] bg-white/95 dark:bg-[#18181b]/95 p-6 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.2),0_1px_1px_rgba(255,255,255,0.8)_inset] backdrop-blur-3xl text-neutral-900 dark:text-neutral-100 flex flex-col gap-5 overflow-hidden"
        >
          {/* Dynamic Ambient Top Aura */}
          <div
            className={`absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-36 bg-gradient-to-b ${selectedTheme.ambientClass} rounded-full blur-3xl pointer-events-none transition-opacity duration-500 ease-out`}
          />

          {/* Header */}
          <div className="flex items-start justify-between gap-3 relative">
            <div className="flex items-center gap-3.5">
              {/* Apple White Squircle Card with Dark Circular Disc (Matches requested design) */}
              <div
                className="relative h-13 w-13 rounded-[20px] bg-white dark:bg-[#222226] border border-black/[0.08] dark:border-white/[0.1] shadow-[0_4px_16px_rgba(0,0,0,0.08),inset_0_1px_1px_rgba(255,255,255,0.9)] flex items-center justify-center shrink-0 select-none transition-all duration-300"
              >
                {/* Inner Circular Lens Disc */}
                <div
                  className={`h-9.5 w-9.5 rounded-full ${selectedTheme.discBg} flex items-center justify-center shadow-md transition-all duration-300`}
                >
                  {renderIconGlyph()}
                </div>
              </div>

              <div>
                <h2 className="text-[17px] font-bold tracking-tight text-neutral-900 dark:text-white leading-tight">
                  Create Workspace
                </h2>
                <p className="text-[12px] text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium">
                  A dedicated home for your notes, tasks & docs
                </p>
              </div>
            </div>

            {/* Apple Circular Close Button */}
            <button
              onClick={onClose}
              className="h-7 w-7 rounded-full bg-black/[0.04] dark:bg-white/10 hover:bg-black/[0.08] dark:hover:bg-white/20 text-neutral-400 hover:text-neutral-800 dark:hover:text-white grid place-items-center transition duration-150 cursor-pointer outline-none shrink-0"
              title="Close (Esc)"
            >
              <X size={13} className="stroke-[2.5]" />
            </button>
          </div>

          {/* Plan Quota Widget Capsule */}
          <div className="rounded-2xl border border-black/[0.05] dark:border-white/[0.08] bg-black/[0.025] dark:bg-white/[0.03] px-3.5 py-2.5 flex items-center justify-between text-[11.5px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-2">
              <span className="text-neutral-500 dark:text-neutral-400 font-medium">Plan Quota:</span>
              <PlanBadge />
            </div>
            <div className="flex items-center gap-1.5 font-semibold">
              <span className={isLimitReached ? "text-rose-500 font-bold" : "text-neutral-700 dark:text-neutral-300"}>
                {wsLimit === null ? "Unlimited" : `${wsUsed} / ${wsLimit} used`}
              </span>
              {isLimitReached && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenBilling?.();
                  }}
                  className="ml-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5"
                >
                  Upgrade <ArrowRight size={10} />
                </button>
              )}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Name Input */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between px-0.5">
                <label className="text-[11.5px] font-bold text-neutral-700 dark:text-neutral-300 tracking-tight">
                  Workspace Name
                </label>
                <span className="text-[10.5px] text-neutral-400 font-medium tabular-nums">
                  {name.length}/80
                </span>
              </div>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value.slice(0, 80));
                    if (error) setError(null);
                  }}
                  placeholder="e.g. Acme Studio, Product Lab..."
                  disabled={loading}
                  className="w-full rounded-2xl border border-black/[0.08] dark:border-white/[0.12] bg-white dark:bg-white/[0.06] px-4 py-2.5 text-[13px] font-medium text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:border-black/30 dark:focus:border-white/30 focus:outline-none focus:ring-4 focus:ring-black/[0.04] dark:focus:ring-white/[0.06] transition shadow-[0_2px_6px_rgba(0,0,0,0.02)]"
                />
                {name && (
                  <button
                    type="button"
                    onClick={() => setName("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-neutral-200/80 dark:bg-white/20 text-neutral-600 dark:text-neutral-200 grid place-items-center hover:bg-neutral-300 dark:hover:bg-white/30 transition"
                  >
                    <X size={11} className="stroke-[2.5]" />
                  </button>
                )}
              </div>
            </div>

            {/* Color Accent Orbs */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-400 uppercase tracking-wider px-0.5">
                Color Theme
              </span>
              <div className="flex items-center gap-2 pt-0.5 px-0.5">
                {THEME_PRESETS.map((preset) => {
                  const isSelected = selectedTheme.id === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedTheme(preset)}
                      className={`relative h-7 w-7 rounded-full bg-gradient-to-tr ${preset.gradient} flex items-center justify-center text-white transition-transform duration-200 cursor-pointer outline-none hover:scale-110 active:scale-95 ${
                        isSelected
                          ? "ring-2 ring-offset-2 ring-neutral-900 dark:ring-white dark:ring-offset-neutral-900 scale-105 shadow-sm"
                          : "opacity-80 hover:opacity-100"
                      }`}
                      title={preset.label}
                    >
                      {isSelected && <Check size={12} className="stroke-[3.5]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Workspace Icon Selector (Disc Card Grid) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-400 uppercase tracking-wider">
                  Workspace Icon
                </span>
              </div>

              {/* Icon / Symbol Card Grid */}
              <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] p-2.5">
                <div className="grid grid-cols-8 gap-2">
                  {SYMBOL_PRESETS.map((item) => {
                    const IconComp = item.icon;
                    const isSelected = selectedIcon === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedIcon(item.id)}
                        className={`h-9 w-9 rounded-[13px] bg-white dark:bg-[#222226] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center transition-transform duration-150 cursor-pointer outline-none hover:scale-110 active:scale-95 shadow-xs ${
                          isSelected
                            ? "ring-2 ring-neutral-900 dark:ring-white scale-105 shadow-sm"
                            : "opacity-85 hover:opacity-100"
                        }`}
                        title={item.label}
                      >
                        <div className="h-6.5 w-6.5 rounded-full bg-neutral-900 dark:bg-black text-white flex items-center justify-center">
                          {item.id === "letter" ? (
                            <span className="text-[11px] font-bold leading-none select-none">
                              {name.trim() ? name.trim().charAt(0).toUpperCase() : "A"}
                            </span>
                          ) : IconComp ? (
                            <IconComp size={13} className="stroke-[2.2]" />
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Error Message Pill */}
            {error && (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-2.5 text-[11.5px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span className="flex-1">{error}</span>
              </div>
            )}

            {/* Actions Bar */}
            <div className="flex items-center justify-end gap-2.5 pt-2.5 border-t border-black/[0.06] dark:border-white/[0.08]">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-2xl px-4 py-2 text-[12.5px] font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/10 transition duration-150 cursor-pointer outline-none active:scale-95"
              >
                Cancel
              </button>

              {isLimitReached ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenBilling?.();
                  }}
                  className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-5 py-2.5 text-[12.5px] font-semibold shadow-[0_4px_16px_rgba(245,158,11,0.3)] transition duration-150 cursor-pointer outline-none hover:scale-105 active:scale-95"
                >
                  <Sparkles size={13} />
                  Upgrade Plan
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className={`flex items-center gap-1.5 rounded-2xl px-5 py-2.5 text-[12.5px] font-semibold transition-all duration-150 cursor-pointer outline-none ${
                    name.trim() && !loading
                      ? "bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 shadow-[0_4px_16px_rgba(0,0,0,0.18)] hover:bg-neutral-800 dark:hover:bg-neutral-100 hover:scale-102 active:scale-97"
                      : "bg-black/[0.06] dark:bg-white/[0.08] text-neutral-400 dark:text-neutral-500 cursor-not-allowed"
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Creating…</span>
                    </>
                  ) : (
                    <>
                      <Plus size={13} className="stroke-[2.5]" />
                      <span>Create Workspace</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
