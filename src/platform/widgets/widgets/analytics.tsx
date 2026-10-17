/**
 * Noska Widget Platform — Analytics & Personal Widgets.
 * Powered by reusable ChartPrimitive and MetricPrimitive. Every workspace
 * metric here is derived from live page data (ctx) — never fabricated.
 */
import React, { useMemo, useState } from "react";
import { CheckCircle2, Sun, Quote, Copy } from "lucide-react";
import { ChartPrimitive } from "../primitives/ChartPrimitive";
import { MetricPrimitive } from "../primitives/MetricPrimitive";
import { WidgetEmpty } from "../components/WidgetFrame";
import { collectProjects, collectTasks } from "../shared";
import type { WidgetProps } from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;
const DONUT_COLORS = ["#6366f1", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899"];

// ── 1. Workspace KPI Metric Widget ──────────────────────────────────────────

export function WorkspaceKpiWidget({ size, onExplain, ctx }: WidgetProps) {
  const tasks = useMemo(() => collectTasks(ctx.pages), [ctx.pages]);
  const done = tasks.filter((t) => t.checked).length;
  const total = tasks.length;
  const open = total - done;
  const percent = total > 0 ? (done / total) * 100 : 0;

  return (
    <MetricPrimitive
      label="Completed Tasks"
      value={done}
      secondaryValue={total}
      progressPercent={percent}
      icon={CheckCircle2}
      accentColor="#10b981"
      size={size}
      statusText={total === 0 ? "No tasks yet" : `${open} open · live from workspace`}
      onExplain={onExplain}
    />
  );
}

// ── 2. Daily Activity Chart Widget ──────────────────────────────────────────

export function TaskVelocityChartWidget({ size, ctx }: WidgetProps) {
  const data = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);
    const buckets = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      return {
        label: day.toLocaleDateString("en-US", { weekday: "short" }),
        dayStart: day.getTime(),
        value: 0,
      };
    });
    for (const page of ctx.pages) {
      if (page.trashed) continue;
      const ts = new Date(page.updatedAt).getTime();
      if (isNaN(ts)) continue;
      for (const bucket of buckets) {
        if (ts >= bucket.dayStart && ts < bucket.dayStart + DAY_MS) {
          bucket.value += 1;
          break;
        }
      }
    }
    return buckets.map(({ label, value }) => ({ label, value }));
  }, [ctx.pages]);

  const total = data.reduce((acc, d) => acc + d.value, 0);
  if (total === 0) {
    return (
      <WidgetEmpty
        title="No page activity yet"
        hint="Pages you update each day will chart here."
      />
    );
  }

  return (
    <ChartPrimitive
      title="Pages Updated Per Day"
      type="bar"
      size={size}
      accentColor="#6366f1"
      data={data}
    />
  );
}

// ── 3. Project Distribution Donut Widget ────────────────────────────────────

export function ProjectDistributionDonutWidget({ size, ctx }: WidgetProps) {
  const projects = useMemo(() => collectProjects(ctx.pages), [ctx.pages]);

  if (projects.length === 0) {
    return (
      <WidgetEmpty
        title="No project data"
        hint="Pages with database rows will chart their row distribution here."
      />
    );
  }

  return (
    <ChartPrimitive
      title="Rows by Project"
      type="donut"
      size={size}
      totalLabel="Total Rows"
      accentColor="#6366f1"
      data={projects.map((p, i) => ({
        label: p.pageTitle,
        value: p.total,
        color: DONUT_COLORS[i % DONUT_COLORS.length],
      }))}
    />
  );
}

// ── 4. Weather Widget ───────────────────────────────────────────────────────
// No weather provider is connected yet — show an honest empty state instead
// of invented conditions.

export function WeatherWidget(_props: WidgetProps) {
  return (
    <WidgetEmpty
      icon={<Sun size={18} className="text-amber-500" />}
      title="Weather isn't connected"
      hint="Connect a weather source to see live local conditions here."
    />
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
