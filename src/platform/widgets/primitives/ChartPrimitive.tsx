/**
 * Noska Widget Platform — Reusable Chart Primitive.
 * High-performance, lightweight SVG visualization for Bar, Line, Area, Donut, and Gauge charts.
 */
import React from "react";
import type { WidgetSize } from "../types";

export type ChartType = "bar" | "line" | "area" | "donut" | "gauge";

export interface ChartDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
  color?: string;
}

export interface ChartPrimitiveProps {
  title?: string;
  type: ChartType;
  data: ChartDataPoint[];
  size?: WidgetSize;
  accentColor?: string;
  totalLabel?: string;
  onExplain?: () => void;
}

export function ChartPrimitive({
  title,
  type,
  data = [],
  size = "medium",
  accentColor = "#6366f1",
  totalLabel,
}: ChartPrimitiveProps) {
  const isSmall = size === "small";
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const totalSum = data.reduce((acc, d) => acc + d.value, 0);

  // 1. Donut Chart Renderer
  if (type === "donut") {
    const boxSize = isSmall ? 84 : 110;
    const strokeWidth = isSmall ? 10 : 14;
    const radius = boxSize / 2 - strokeWidth;
    const circumference = 2 * Math.PI * radius;

    let accumulatedAngle = 0;

    return (
      <div className="flex h-full w-full flex-col justify-between p-3 select-none font-sans">
        {title && <h4 className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 truncate mb-1">{title}</h4>}

        <div className="flex items-center justify-center gap-4 my-auto">
          <div className="relative flex items-center justify-center shrink-0" style={{ width: boxSize, height: boxSize }}>
            <svg width={boxSize} height={boxSize} className="rotate-[-90deg]">
              <circle
                cx={boxSize / 2}
                cy={boxSize / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-black/5 dark:text-white/10"
              />
              {data.map((item, idx) => {
                const fraction = totalSum > 0 ? item.value / totalSum : 0;
                const dashArray = `${fraction * circumference} ${circumference}`;
                const dashOffset = -(accumulatedAngle * circumference);
                accumulatedAngle += fraction;
                const sliceColor = item.color || (idx === 0 ? accentColor : idx === 1 ? "#10b981" : idx === 2 ? "#f59e0b" : "#ec4899");

                return (
                  <circle
                    key={item.label}
                    cx={boxSize / 2}
                    cy={boxSize / 2}
                    r={radius}
                    fill="none"
                    stroke={sliceColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={dashArray}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                );
              })}
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-sm font-bold text-neutral-900 dark:text-white font-mono">{totalSum}</span>
              {totalLabel && <span className="text-[9px] text-neutral-400 leading-none">{totalLabel}</span>}
            </div>
          </div>

          {!isSmall && (
            <div className="space-y-1 max-w-[130px] min-w-0">
              {data.slice(0, 4).map((d, idx) => {
                const itemColor = d.color || (idx === 0 ? accentColor : idx === 1 ? "#10b981" : idx === 2 ? "#f59e0b" : "#ec4899");
                return (
                  <div key={d.label} className="flex items-center justify-between gap-1.5 text-[10.5px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: itemColor }} />
                      <span className="text-neutral-600 dark:text-neutral-400 truncate">{d.label}</span>
                    </div>
                    <span className="font-bold text-neutral-800 dark:text-neutral-200 font-mono">{d.value}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. Bar Chart Renderer
  return (
    <div className="flex h-full w-full flex-col justify-between p-3 select-none font-sans">
      {title && (
        <div className="flex items-center justify-between pb-1">
          <h4 className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 truncate">{title}</h4>
          <span className="text-[10px] font-bold text-neutral-400 font-mono">Total: {totalSum}</span>
        </div>
      )}

      <div className="flex items-end gap-2 h-24 my-auto pt-2">
        {data.map((item, idx) => {
          const heightPercent = Math.max(8, (item.value / maxValue) * 100);
          const barColor = item.color || accentColor;

          return (
            <div key={item.label} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
              <div className="text-[9.5px] font-bold text-neutral-400 opacity-0 group-hover:opacity-100 transition font-mono">
                {item.value}
              </div>
              <div className="w-full bg-black/5 dark:bg-white/10 rounded-t-md overflow-hidden flex items-end" style={{ height: "100%" }}>
                <div
                  className="w-full rounded-t-md transition-all duration-500 hover:brightness-110"
                  style={{
                    height: `${heightPercent}%`,
                    backgroundColor: barColor,
                  }}
                />
              </div>
              <span className="text-[9.5px] font-medium text-neutral-400 truncate max-w-full">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ChartPrimitive;
