import React from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export interface GlassKpiCardProps {
  count: number | string;
  label: string;
  variant: "blue" | "green" | "peach" | "rose" | "purple";
  badgeIcon?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

const VARIANTS = {
  blue: {
    bg: "bg-gradient-to-br from-[#60a5fa]/25 via-[#93c5fd]/15 to-[#dbeafe]/20 dark:from-[#1e3a8a]/40 dark:via-[#1e40af]/20 dark:to-transparent",
    border: "border-[#93c5fd]/60 dark:border-[#3b82f6]/30",
    textCount: "text-[#1e3a8a] dark:text-[#93c5fd]",
    textLabel: "text-[#3b82f6] dark:text-[#60a5fa]",
    badgeBg: "bg-white/80 dark:bg-white/15 text-[#2563eb] dark:text-[#93c5fd]",
    ring: "ring-[#3b82f6]/40",
    glow: "rgba(59, 130, 246, 0.15)"
  },
  green: {
    bg: "bg-gradient-to-br from-[#86efac]/25 via-[#bbf7d0]/15 to-[#dcfce7]/20 dark:from-[#14532d]/40 dark:via-[#166534]/20 dark:to-transparent",
    border: "border-[#86efac]/60 dark:border-[#22c55e]/30",
    textCount: "text-[#14532d] dark:text-[#86efac]",
    textLabel: "text-[#16a34a] dark:text-[#4ade80]",
    badgeBg: "bg-white/80 dark:bg-white/15 text-[#16a34a] dark:text-[#86efac]",
    ring: "ring-[#22c55e]/40",
    glow: "rgba(34, 197, 94, 0.15)"
  },
  peach: {
    bg: "bg-gradient-to-br from-[#fed7aa]/25 via-[#ffedd5]/15 to-[#fff7ed]/20 dark:from-[#7c2d12]/40 dark:via-[#9a3412]/20 dark:to-transparent",
    border: "border-[#fed7aa]/60 dark:border-[#f97316]/30",
    textCount: "text-[#7c2d12] dark:text-[#fed7aa]",
    textLabel: "text-[#ea580c] dark:text-[#fb923c]",
    badgeBg: "bg-white/80 dark:bg-white/15 text-[#ea580c] dark:text-[#fed7aa]",
    ring: "ring-[#f97316]/40",
    glow: "rgba(249, 115, 22, 0.15)"
  },
  rose: {
    bg: "bg-gradient-to-br from-[#fecdd3]/25 via-[#ffe4e6]/15 to-[#fff1f2]/20 dark:from-[#881337]/40 dark:via-[#9f1239]/20 dark:to-transparent",
    border: "border-[#fecdd3]/60 dark:border-[#f43f5e]/30",
    textCount: "text-[#881337] dark:text-[#fecdd3]",
    textLabel: "text-[#e11d48] dark:text-[#fb7185]",
    badgeBg: "bg-white/80 dark:bg-white/15 text-[#e11d48] dark:text-[#fecdd3]",
    ring: "ring-[#f43f5e]/40",
    glow: "rgba(244, 63, 94, 0.15)"
  },
  purple: {
    bg: "bg-gradient-to-br from-[#e9d5ff]/25 via-[#f3e8ff]/15 to-[#faf5ff]/20 dark:from-[#581c87]/40 dark:via-[#6b21a8]/20 dark:to-transparent",
    border: "border-[#d8b4fe]/60 dark:border-[#a855f7]/30",
    textCount: "text-[#581c87] dark:text-[#e9d5ff]",
    textLabel: "text-[#9333ea] dark:text-[#c084fc]",
    badgeBg: "bg-white/80 dark:bg-white/15 text-[#9333ea] dark:text-[#e9d5ff]",
    ring: "ring-[#a855f7]/40",
    glow: "rgba(168, 85, 247, 0.15)"
  }
};

export function GlassKpiCard({
  count,
  label,
  variant,
  badgeIcon,
  active,
  onClick,
  className = ""
}: GlassKpiCardProps) {
  const v = VARIANTS[variant] || VARIANTS.blue;

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 450, damping: 28 }}
      onClick={onClick}
      style={{
        boxShadow: `0 12px 28px -6px ${v.glow}, 0 4px 12px -2px rgba(0,0,0,0.03)`
      }}
      className={`relative overflow-hidden rounded-3xl border-2 p-5 sm:p-6 backdrop-blur-2xl transition-all select-none ${
        v.bg
      } ${v.border} ${
        active ? `ring-2 ${v.ring} shadow-lg scale-[1.01]` : ""
      } ${onClick ? "cursor-pointer hover:shadow-xl" : ""} ${className}`}
    >
      {/* Top subtle highlight shimmer */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/70 dark:via-white/20 to-transparent" />

      {/* Main Metric content */}
      <div className="flex flex-col justify-between h-full min-h-[90px] relative z-10">
        <div>
          <div className={`text-4xl sm:text-5xl font-black tracking-tight ${v.textCount}`}>
            {count}
          </div>
          <div className={`mt-1.5 text-xs sm:text-sm font-semibold tracking-wide ${v.textLabel}`}>
            {label}
          </div>
        </div>

        {/* Bottom-right glass badge icon */}
        {badgeIcon && (
          <div className="self-end mt-2">
            <div
              className={`h-8 w-8 rounded-xl shadow-xs border border-white/60 dark:border-white/10 backdrop-blur-md grid place-items-center ${v.badgeBg}`}
            >
              {badgeIcon}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default GlassKpiCard;
