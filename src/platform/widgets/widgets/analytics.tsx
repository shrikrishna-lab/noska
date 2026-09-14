/**
 * Noska Widget Platform — Analytics & Personal Widgets.
 * Powered by reusable ChartPrimitive and MetricPrimitive.
 */
import React, { useState } from "react";
import { Sun, CloudRain, Quote, Calculator, TrendingUp, Layers, CheckCircle2, Copy } from "lucide-react";
import { ChartPrimitive } from "../primitives/ChartPrimitive";
import { MetricPrimitive } from "../primitives/MetricPrimitive";
import type { WidgetProps } from "../types";

// ── 1. Workspace KPI Metric Widget ──────────────────────────────────────────

export function WorkspaceKpiWidget({ size, onExplain }: WidgetProps) {
  return (
    <MetricPrimitive
      label="Completed Tasks This Week"
      value="48"
      secondaryValue="54"
      progressPercent={88.8}
      delta={{ value: "+18%", isPositive: true, periodText: "vs last week" }}
      icon={CheckCircle2}
      accentColor="#10b981"
      size={size}
      onExplain={onExplain}
    />
  );
}

// ── 2. Sprint Velocity Chart Widget ─────────────────────────────────────────

export function TaskVelocityChartWidget({ size }: WidgetProps) {
  return (
    <ChartPrimitive
      title="Daily Velocity Points"
      type="bar"
      size={size}
      accentColor="#6366f1"
      data={[
        { label: "Mon", value: 12 },
        { label: "Tue", value: 18 },
        { label: "Wed", value: 15 },
        { label: "Thu", value: 24 },
        { label: "Fri", value: 21 },
        { label: "Sat", value: 8 },
        { label: "Sun", value: 14 },
      ]}
    />
  );
}

// ── 3. Project Distribution Donut Widget ────────────────────────────────────

export function ProjectDistributionDonutWidget({ size }: WidgetProps) {
  return (
    <ChartPrimitive
      title="Work by Project"
      type="donut"
      size={size}
      totalLabel="Total Tasks"
      accentColor="#6366f1"
      data={[
        { label: "Noska Core", value: 34, color: "#6366f1" },
        { label: "Mobile App", value: 22, color: "#10b981" },
        { label: "AI Engine", value: 16, color: "#8b5cf6" },
        { label: "Marketing", value: 12, color: "#f59e0b" },
      ]}
    />
  );
}

// ── 4. Weather Widget ───────────────────────────────────────────────────────

export function WeatherWidget({ size }: WidgetProps) {
  return (
    <div className="flex h-full w-full flex-col justify-between p-3 select-none font-sans">
      <div className="flex items-center justify-between text-neutral-500">
        <span className="text-xs font-semibold">San Francisco</span>
        <span className="text-[10.5px] text-neutral-400">Partly Cloudy</span>
      </div>

      <div className="flex items-center gap-3 my-auto">
        <div className="size-11 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <Sun size={24} />
        </div>
        <div>
          <span className="text-2xl font-bold text-neutral-900 dark:text-white font-mono">68°F</span>
          <p className="text-[10px] text-neutral-400">H: 72° L: 56° • Humidity: 45%</p>
        </div>
      </div>

      <div className="text-[10px] text-neutral-400 pt-1 border-t border-black/[0.04] dark:border-white/[0.06]">
        Updated just now
      </div>
    </div>
  );
}

// ── 5. Daily Quote Widget ───────────────────────────────────────────────────

export function DailyQuoteWidget({ size, ctx }: WidgetProps) {
  const [copied, setCopied] = useState(false);
  const quote = "The secret of getting ahead is getting started. The secret of getting started is breaking complex overwhelming tasks into small manageable tasks.";
  const author = "Mark Twain";

  const handleCopy = () => {
    navigator.clipboard?.writeText(`"${quote}" — ${author}`);
    setCopied(true);
    ctx.actions.onToast?.("Quote copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-full w-full flex-col justify-between p-3 select-none font-sans group">
      <div className="flex items-center justify-between text-neutral-400 pb-1">
        <Quote size={13} className="text-amber-500" />
        <button onClick={handleCopy} className="opacity-0 group-hover:opacity-100 transition p-0.5 rounded text-neutral-400 hover:text-neutral-700">
          <Copy size={11} />
        </button>
      </div>

      <p className="text-xs text-neutral-700 dark:text-neutral-300 font-serif italic leading-relaxed my-auto line-clamp-3">
        "{quote}"
      </p>

      <div className="text-[10.5px] font-bold text-neutral-500 dark:text-neutral-400 text-right pt-1">
        — {author}
      </div>
    </div>
  );
}

// ── 6. Quick Calculator Widget ──────────────────────────────────────────────

export function QuickCalculatorWidget({ size }: WidgetProps) {
  const [display, setDisplay] = useState("0");

  const press = (char: string) => {
    if (char === "C") setDisplay("0");
    else if (char === "=") {
      try {
        const sanitized = display.replace(/[^0-9+\-*/.]/g, "");
        const res = Function(`'use strict'; return (${sanitized})`)();
        setDisplay(String(res));
      } catch {
        setDisplay("Error");
      }
    } else {
      setDisplay((prev) => (prev === "0" || prev === "Error" ? char : prev + char));
    }
  };

  return (
    <div className="flex h-full w-full flex-col justify-between p-2.5 select-none font-sans">
      <div className="bg-black/5 dark:bg-white/5 rounded-lg px-2.5 py-1 text-right font-mono font-bold text-sm text-neutral-900 dark:text-white truncate">
        {display}
      </div>

      <div className="grid grid-cols-4 gap-1 pt-1.5 flex-1">
        {["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "C", "0", "=", "+"].map((btn) => (
          <button
            key={btn}
            onClick={() => press(btn)}
            className={`rounded-md text-xs font-bold py-1 transition cursor-pointer active:scale-95 ${
              btn === "="
                ? "bg-indigo-600 text-white"
                : btn === "C"
                ? "bg-rose-500/15 text-rose-600"
                : ["/", "*", "-", "+"].includes(btn)
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                : "bg-black/5 dark:bg-white/5 hover:bg-black/10 text-neutral-800 dark:text-neutral-200"
            }`}
          >
            {btn}
          </button>
        ))}
      </div>
    </div>
  );
}
