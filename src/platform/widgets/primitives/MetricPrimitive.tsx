/**
 * Noska Widget Platform — Reusable Metric Primitive.
 * Renders high-impact KPI values, delta comparisons, progress bars, and explainability provenance.
 */
import React from "react";
import { TrendingUp, TrendingDown, HelpCircle, Sparkles } from "lucide-react";
import type { WidgetSize } from "../types";

export interface MetricPrimitiveProps {
  label: string;
  value: string | number;
  secondaryValue?: string | number;
  delta?: {
    value: string | number;
    isPositive: boolean;
    periodText?: string;
  };
  progressPercent?: number;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  accentColor?: string;
  size?: WidgetSize;
  onExplain?: () => void;
  statusText?: string;
}

export function MetricPrimitive({
  label,
  value,
  secondaryValue,
  delta,
  progressPercent,
  icon: IconComponent,
  accentColor = "#10b981",
  size = "small",
  onExplain,
  statusText,
}: MetricPrimitiveProps) {
  const isCompact = size === "small";

  return (
    <div className="flex h-full w-full flex-col justify-between p-3 select-none font-sans">
      {/* Top row: Icon, Label, and Optional Explain Button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {IconComponent && (
            <div
              className="flex size-7 items-center justify-center rounded-lg text-white shadow-2xs shrink-0"
              style={{ backgroundColor: accentColor }}
            >
              <IconComponent size={14} />
            </div>
          )}
          <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 truncate">
            {label}
          </span>
        </div>

        {onExplain && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExplain();
            }}
            title="Explain this metric"
            className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          >
            <HelpCircle size={13} />
          </button>
        )}
      </div>

      {/* Center value display */}
      <div className="my-auto py-1">
        <div className="flex items-baseline gap-2">
          <span className={`font-bold tracking-tight text-neutral-900 dark:text-white font-mono ${isCompact ? "text-2xl" : "text-3xl"}`}>
            {value}
          </span>
          {secondaryValue !== undefined && (
            <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500">
              / {secondaryValue}
            </span>
          )}
        </div>

        {/* Progress Bar if supplied */}
        {progressPercent !== undefined && (
          <div className="mt-2 space-y-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(0, Math.min(100, progressPercent))}%`,
                  backgroundColor: accentColor,
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-neutral-400 font-medium">
              <span>Progress</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom row: Delta trend or status message */}
      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-black/[0.04] dark:border-white/[0.06]">
        {delta ? (
          <div className="flex items-center gap-1">
            <span
              className={`flex items-center gap-0.5 font-bold ${
                delta.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {delta.isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {delta.value}
            </span>
            {delta.periodText && (
              <span className="text-neutral-400 dark:text-neutral-500 text-[10px]">
                {delta.periodText}
              </span>
            )}
          </div>
        ) : statusText ? (
          <span className="text-neutral-500 dark:text-neutral-400 text-[10.5px] truncate">
            {statusText}
          </span>
        ) : (
          <span className="text-[10px] text-neutral-400">Live synced</span>
        )}
      </div>
    </div>
  );
}

export default MetricPrimitive;
