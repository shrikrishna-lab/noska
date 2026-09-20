import React from "react";
import { motion } from "framer-motion";
import { usePlan } from "@/hooks/billing/useEntitlements";

export interface PlanBadgeProps {
  slug?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  animated?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

interface TierConfig {
  label: string;
  badgeClass: string;
  textClass: string;
  shimmerColor: string;
  hasShimmer: boolean;
}

const TIER_CONFIGS: Record<string, TierConfig> = {
  free: {
    label: "Free",
    badgeClass: "bg-neutral-100/90 dark:bg-neutral-800/70 text-neutral-600 dark:text-neutral-300 border border-neutral-200/90 dark:border-neutral-700/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_1px_2px_rgba(0,0,0,0.25)] backdrop-blur-xs",
    textClass: "font-semibold tracking-wider text-neutral-600 dark:text-neutral-300",
    shimmerColor: "rgba(255,255,255,0.3)",
    hasShimmer: false,
  },
  starter: {
    label: "Starter",
    badgeClass: "bg-neutral-100/90 dark:bg-neutral-800/70 text-neutral-600 dark:text-neutral-300 border border-neutral-200/90 dark:border-neutral-700/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_1px_2px_rgba(0,0,0,0.25)] backdrop-blur-xs",
    textClass: "font-semibold tracking-wider text-neutral-600 dark:text-neutral-300",
    shimmerColor: "rgba(255,255,255,0.3)",
    hasShimmer: false,
  },
  plus: {
    label: "Plus",
    badgeClass: "bg-blue-500/[0.09] dark:bg-blue-500/[0.16] text-blue-700 dark:text-blue-300 border border-blue-500/25 dark:border-blue-400/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(37,99,235,0.12)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_1px_4px_rgba(0,0,0,0.35)] backdrop-blur-xs",
    textClass: "font-bold tracking-wider text-blue-700 dark:text-blue-300",
    shimmerColor: "rgba(59,130,246,0.28)",
    hasShimmer: true,
  },
  basic: {
    label: "Basic",
    badgeClass: "bg-blue-500/[0.09] dark:bg-blue-500/[0.16] text-blue-700 dark:text-blue-300 border border-blue-500/25 dark:border-blue-400/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(37,99,235,0.12)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_1px_4px_rgba(0,0,0,0.35)] backdrop-blur-xs",
    textClass: "font-bold tracking-wider text-blue-700 dark:text-blue-300",
    shimmerColor: "rgba(59,130,246,0.28)",
    hasShimmer: true,
  },
  pro: {
    label: "Pro",
    badgeClass: "bg-purple-500/[0.09] dark:bg-purple-500/[0.18] text-purple-700 dark:text-purple-300 border border-purple-500/25 dark:border-purple-400/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_4px_rgba(168,85,247,0.14)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_1px_5px_rgba(0,0,0,0.35)] backdrop-blur-xs",
    textClass: "font-bold tracking-wider text-purple-700 dark:text-purple-300",
    shimmerColor: "rgba(168,85,247,0.3)",
    hasShimmer: true,
  },
  team: {
    label: "Team",
    badgeClass: "bg-emerald-500/[0.09] dark:bg-emerald-500/[0.18] text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 dark:border-emerald-400/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_4px_rgba(16,185,129,0.14)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_1px_5px_rgba(0,0,0,0.35)] backdrop-blur-xs",
    textClass: "font-bold tracking-wider text-emerald-700 dark:text-emerald-300",
    shimmerColor: "rgba(16,185,129,0.3)",
    hasShimmer: true,
  },
  growth: {
    label: "Growth",
    badgeClass: "bg-teal-500/[0.09] dark:bg-teal-500/[0.18] text-teal-700 dark:text-teal-300 border border-teal-500/25 dark:border-teal-400/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_4px_rgba(20,184,166,0.14)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_1px_5px_rgba(0,0,0,0.35)] backdrop-blur-xs",
    textClass: "font-bold tracking-wider text-teal-700 dark:text-teal-300",
    shimmerColor: "rgba(20,184,166,0.3)",
    hasShimmer: true,
  },
  business: {
    label: "Business",
    badgeClass: "bg-emerald-500/[0.09] dark:bg-emerald-500/[0.18] text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 dark:border-emerald-400/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_4px_rgba(16,185,129,0.14)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_1px_5px_rgba(0,0,0,0.35)] backdrop-blur-xs",
    textClass: "font-bold tracking-wider text-emerald-700 dark:text-emerald-300",
    shimmerColor: "rgba(16,185,129,0.3)",
    hasShimmer: true,
  },
  enterprise: {
    label: "Enterprise",
    badgeClass: "bg-amber-500/[0.1] dark:bg-amber-500/[0.2] text-amber-800 dark:text-amber-200 border border-amber-500/30 dark:border-amber-400/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_4px_rgba(245,158,11,0.16)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_1px_6px_rgba(0,0,0,0.35)] backdrop-blur-xs",
    textClass: "font-bold tracking-wider text-amber-800 dark:text-amber-200",
    shimmerColor: "rgba(245,158,11,0.35)",
    hasShimmer: true,
  },
  ultimate: {
    label: "Ultimate",
    badgeClass: "bg-rose-500/[0.1] dark:bg-rose-500/[0.2] text-rose-700 dark:text-rose-200 border border-rose-500/30 dark:border-rose-400/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_4px_rgba(244,63,94,0.16)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_1px_6px_rgba(0,0,0,0.35)] backdrop-blur-xs",
    textClass: "font-bold tracking-wider text-rose-700 dark:text-rose-200",
    shimmerColor: "rgba(244,63,94,0.35)",
    hasShimmer: true,
  },
  founder: {
    label: "Founder",
    badgeClass: "bg-gradient-to-r from-rose-500/[0.12] via-amber-500/[0.12] to-rose-500/[0.12] dark:from-rose-500/[0.22] dark:to-amber-500/[0.22] text-rose-800 dark:text-rose-200 border border-rose-400/40 dark:border-rose-400/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_6px_rgba(244,63,94,0.18)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_1px_6px_rgba(0,0,0,0.35)] backdrop-blur-xs",
    textClass: "font-extrabold tracking-wider text-rose-800 dark:text-rose-200",
    shimmerColor: "rgba(244,63,94,0.35)",
    hasShimmer: true,
  },
};

const SIZE_MAP = {
  xs: {
    badge: "px-2 py-[2px] text-[10px] leading-none rounded-full",
  },
  sm: {
    badge: "px-2.5 py-[3px] text-[11px] leading-none rounded-full",
  },
  md: {
    badge: "px-3 py-1 text-xs leading-none rounded-full",
  },
  lg: {
    badge: "px-3.5 py-1.5 text-sm leading-none rounded-full",
  },
};

export function PlanBadge({
  slug,
  name,
  size = "xs",
  animated = true,
  className = "",
  onClick,
}: PlanBadgeProps) {
  const { plan } = usePlan();
  const rawKey = (slug ?? plan.slug ?? "free").toLowerCase().replace(/[\s_-]+/g, "");
  const config =
    TIER_CONFIGS[rawKey] ||
    TIER_CONFIGS[Object.keys(TIER_CONFIGS).find((k) => rawKey.includes(k)) || "free"] ||
    TIER_CONFIGS.free;

  const sizeCfg = SIZE_MAP[size] || SIZE_MAP.xs;
  const displayLabel = name ?? plan.name ?? config.label;

  return (
    <motion.span
      className={`relative inline-flex items-center shrink-0 select-none ${onClick ? "cursor-pointer" : ""} ${className}`}
      whileHover={animated ? { scale: 1.05, y: -0.5 } : undefined}
      whileTap={animated && onClick ? { scale: 0.96 } : undefined}
      transition={{ type: "spring", stiffness: 450, damping: 26 }}
      onClick={onClick}
      title={`${displayLabel} Plan`}
    >
      <span
        className={`relative inline-flex items-center justify-center overflow-hidden transition-all duration-150 ${sizeCfg.badge} ${config.badgeClass}`}
      >
        {/* Smooth Gentle Shimmer Sweep Ray on Paid Tiers */}
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
              duration: 3.2,
              ease: "easeInOut",
              repeatDelay: 2,
            }}
          />
        )}

        {/* Smooth Bold Uppercase Typography */}
        <span className={`relative z-10 uppercase ${config.textClass}`}>
          {displayLabel}
        </span>
      </span>
    </motion.span>
  );
}

