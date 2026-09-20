import React from "react";
import { motion } from "framer-motion";

export type PlanTier =
  | "free"
  | "starter"
  | "plus"
  | "basic"
  | "pro"
  | "team"
  | "growth"
  | "business"
  | "enterprise"
  | "ultimate"
  | "founder"
  | "vip"
  | "lifetime";

export interface PlanBadgeProps {
  plan?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  animated?: boolean;
  showDot?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

interface TierConfig {
  label: string;
  wrapperClass: string;
  badgeClass: string;
  textClass: string;
  shimmerColor: string;
  dotColor: string;
  hasShimmer: boolean;
}

const TIER_CONFIGS: Record<string, TierConfig> = {
  free: {
    label: "Free",
    wrapperClass: "relative inline-flex items-center",
    badgeClass: "bg-zinc-100/80 text-zinc-600 border border-zinc-200/70 shadow-2xs backdrop-blur-xs",
    textClass: "font-semibold tracking-wide text-zinc-600",
    shimmerColor: "rgba(255,255,255,0.4)",
    dotColor: "bg-zinc-400",
    hasShimmer: false,
  },
  starter: {
    label: "Starter",
    wrapperClass: "relative inline-flex items-center",
    badgeClass: "bg-zinc-100/80 text-zinc-600 border border-zinc-200/70 shadow-2xs backdrop-blur-xs",
    textClass: "font-semibold tracking-wide text-zinc-600",
    shimmerColor: "rgba(255,255,255,0.4)",
    dotColor: "bg-zinc-400",
    hasShimmer: false,
  },
  plus: {
    label: "Plus",
    wrapperClass: "relative inline-flex items-center group/badge",
    badgeClass:
      "bg-sky-50/90 text-sky-700 border border-sky-200/70 shadow-2xs backdrop-blur-xs",
    textClass: "font-semibold tracking-wide text-sky-700",
    shimmerColor: "rgba(255,255,255,0.5)",
    dotColor: "bg-sky-400",
    hasShimmer: true,
  },
  basic: {
    label: "Basic",
    wrapperClass: "relative inline-flex items-center group/badge",
    badgeClass:
      "bg-sky-50/90 text-sky-700 border border-sky-200/70 shadow-2xs backdrop-blur-xs",
    textClass: "font-semibold tracking-wide text-sky-700",
    shimmerColor: "rgba(255,255,255,0.5)",
    dotColor: "bg-sky-400",
    hasShimmer: true,
  },
  pro: {
    label: "Pro",
    wrapperClass: "relative inline-flex items-center group/badge",
    badgeClass:
      "bg-purple-50/90 text-purple-700 border border-purple-200/70 shadow-2xs backdrop-blur-xs",
    textClass: "font-semibold tracking-wide text-purple-700",
    shimmerColor: "rgba(255,255,255,0.55)",
    dotColor: "bg-purple-400",
    hasShimmer: true,
  },
  team: {
    label: "Team",
    wrapperClass: "relative inline-flex items-center group/badge",
    badgeClass:
      "bg-emerald-50/90 text-emerald-700 border border-emerald-200/70 shadow-2xs backdrop-blur-xs",
    textClass: "font-semibold tracking-wide text-emerald-700",
    shimmerColor: "rgba(255,255,255,0.5)",
    dotColor: "bg-emerald-400",
    hasShimmer: true,
  },
  growth: {
    label: "Growth",
    wrapperClass: "relative inline-flex items-center group/badge",
    badgeClass:
      "bg-teal-50/90 text-teal-700 border border-teal-200/70 shadow-2xs backdrop-blur-xs",
    textClass: "font-semibold tracking-wide text-teal-700",
    shimmerColor: "rgba(255,255,255,0.5)",
    dotColor: "bg-teal-400",
    hasShimmer: true,
  },
  business: {
    label: "Business",
    wrapperClass: "relative inline-flex items-center group/badge",
    badgeClass:
      "bg-emerald-50/90 text-emerald-700 border border-emerald-200/70 shadow-2xs backdrop-blur-xs",
    textClass: "font-semibold tracking-wide text-emerald-700",
    shimmerColor: "rgba(255,255,255,0.5)",
    dotColor: "bg-emerald-400",
    hasShimmer: true,
  },
  enterprise: {
    label: "Enterprise",
    wrapperClass: "relative inline-flex items-center group/badge",
    badgeClass:
      "bg-amber-50/90 text-amber-800 border border-amber-200/70 shadow-2xs backdrop-blur-xs",
    textClass: "font-semibold tracking-wide text-amber-800",
    shimmerColor: "rgba(255,255,255,0.55)",
    dotColor: "bg-amber-400",
    hasShimmer: true,
  },
  ultimate: {
    label: "Ultimate",
    wrapperClass: "relative inline-flex items-center group/badge",
    badgeClass:
      "bg-rose-50/90 text-rose-800 border border-rose-200/70 shadow-2xs backdrop-blur-xs",
    textClass: "font-semibold tracking-wide text-rose-800",
    shimmerColor: "rgba(255,255,255,0.55)",
    dotColor: "bg-rose-400",
    hasShimmer: true,
  },
  founder: {
    label: "Founder",
    wrapperClass: "relative inline-flex items-center group/badge",
    badgeClass:
      "bg-rose-50/90 text-rose-800 border border-rose-200/70 shadow-2xs backdrop-blur-xs",
    textClass: "font-semibold tracking-wide text-rose-800",
    shimmerColor: "rgba(255,255,255,0.55)",
    dotColor: "bg-rose-400",
    hasShimmer: true,
  },
  vip: {
    label: "VIP",
    wrapperClass: "relative inline-flex items-center group/badge",
    badgeClass:
      "bg-rose-50/90 text-rose-800 border border-rose-200/70 shadow-2xs backdrop-blur-xs",
    textClass: "font-semibold tracking-wide text-rose-800",
    shimmerColor: "rgba(255,255,255,0.55)",
    dotColor: "bg-rose-400",
    hasShimmer: true,
  },
  lifetime: {
    label: "Lifetime",
    wrapperClass: "relative inline-flex items-center group/badge",
    badgeClass:
      "bg-indigo-50/90 text-indigo-700 border border-indigo-200/70 shadow-2xs backdrop-blur-xs",
    textClass: "font-semibold tracking-wide text-indigo-700",
    shimmerColor: "rgba(255,255,255,0.55)",
    dotColor: "bg-indigo-400",
    hasShimmer: true,
  },
};

const SIZE_MAP = {
  xs: {
    badge: "px-2 py-0.5 text-[10px] gap-1.5 rounded-full",
    dot: "h-1.5 w-1.5",
  },
  sm: {
    badge: "px-2.5 py-0.5 text-[11px] gap-1.5 rounded-full",
    dot: "h-1.5 w-1.5",
  },
  md: {
    badge: "px-3 py-1 text-xs gap-1.5 rounded-full",
    dot: "h-2 w-2",
  },
  lg: {
    badge: "px-3.5 py-1.5 text-sm gap-2 rounded-full",
    dot: "h-2.5 w-2.5",
  },
};

export function PlanBadge({
  plan = "free",
  name,
  size = "xs",
  animated = true,
  showDot = true,
  className = "",
  onClick,
}: PlanBadgeProps) {
  const normalizedKey = (plan ?? "free").toLowerCase().replace(/[\s_-]+/g, "");
  const config =
    TIER_CONFIGS[normalizedKey] ||
    TIER_CONFIGS[Object.keys(TIER_CONFIGS).find((k) => normalizedKey.includes(k)) || "free"] ||
    TIER_CONFIGS.free;

  const sizeCfg = SIZE_MAP[size] || SIZE_MAP.xs;
  const displayLabel = name || config.label;
  const isPaid = normalizedKey !== "free" && normalizedKey !== "starter";

  return (
    <motion.span
      className={`${config.wrapperClass} shrink-0 select-none ${onClick ? "cursor-pointer" : ""} ${className}`}
      whileHover={animated ? { scale: 1.04, y: -0.5 } : undefined}
      whileTap={animated && onClick ? { scale: 0.97 } : undefined}
      transition={{ type: "spring", stiffness: 450, damping: 26 }}
      onClick={onClick}
      title={`${displayLabel} Plan`}
    >
      <span
        className={`relative inline-flex items-center overflow-hidden transition-all duration-200 ${sizeCfg.badge} ${config.badgeClass}`}
      >
        {/* Smooth Gentle Shimmer Sweep Ray */}
        {config.hasShimmer && animated && (
          <motion.span
            className="absolute inset-0 -translate-x-full pointer-events-none z-10"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${config.shimmerColor} 50%, transparent 100%)`,
              width: "140%",
            }}
            animate={{ translateX: ["-100%", "200%"] }}
            transition={{
              repeat: Infinity,
              duration: 2.8,
              ease: "easeInOut",
              repeatDelay: 1.5,
            }}
          />
        )}

        {/* Soft Gentle Indicator Dot for Paid Tiers */}
        {showDot && isPaid && (
          <span className="relative flex items-center justify-center shrink-0">
            {animated && (
              <span
                className={`absolute inline-flex h-full w-full rounded-full ${config.dotColor} opacity-40 animate-ping`}
              />
            )}
            <span className={`relative inline-flex rounded-full ${sizeCfg.dot} ${config.dotColor}`} />
          </span>
        )}

        {/* Smooth Typography */}
        <span className={`relative z-10 ${config.textClass}`}>
          {displayLabel}
        </span>
      </span>
    </motion.span>
  );
}
