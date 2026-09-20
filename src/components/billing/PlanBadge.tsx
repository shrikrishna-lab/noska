import { Zap } from "lucide-react";
import { usePlan } from "@/hooks/billing/useEntitlements";

const STYLES: Record<string, string> = {
  free: "bg-black/5 text-neutral-500 dark:text-neutral-400 border-black/10 dark:border-white/10",
  plus: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/20",
  pro: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/20",
  team: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  enterprise: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20",
};

const ICON_FILL: Record<string, string> = {
  plus: "fill-sky-500 dark:fill-sky-400",
  pro: "fill-purple-600 dark:fill-purple-400",
  team: "fill-emerald-600 dark:fill-emerald-400",
  enterprise: "fill-amber-600 dark:fill-amber-400",
};

export function PlanBadge({
  slug,
  name,
  size = "xs",
  className = "",
}: {
  slug?: string | null;
  name?: string | null;
  size?: "xs" | "sm";
  className?: string;
}) {
  const { plan } = usePlan();
  const key = (slug ?? plan.slug ?? "free").toLowerCase();
  const label = (name ?? plan.name ?? key).toUpperCase();
  const paid = key !== "free";
  return (
    <span
      title={`${label} plan`}
      className={`rounded-full border font-black tracking-wider items-center gap-0.5 shrink-0 inline-flex ${
        size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-2 py-0.5 text-[10px]"
      } ${STYLES[key] ?? STYLES.free} ${className}`}
    >
      {paid && <Zap size={size === "sm" ? 11 : 9.5} className={ICON_FILL[key] ?? ""} />}
      <span>{label}</span>
    </span>
  );
}
