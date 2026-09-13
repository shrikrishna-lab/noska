/**
 * WidgetFrame — the shared chrome every widget renders inside: header
 * (icon, title, hover controls), size semantics, and the standard widget
 * states (loading skeleton, empty, error with retry, offline stale data,
 * permission/integration required). Widgets compose these helpers instead
 * of inventing their own, so the whole catalog feels like one design
 * system.
 */
import React from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  FileText,
  Flag,
  GripVertical,
  LayoutGrid,
  Loader2,
  Plug,
  Settings2,
  Sparkles,
  Star,
  Target,
  Trash2,
  Wifi,
  X,
  Flame,
} from "lucide-react";
import { trackWidgetEvent } from "../analytics";
import type { WidgetCategory, WidgetDefinition, WidgetInstance, WidgetRuntimeContext, WidgetSize } from "../types";

export const WIDGET_CATEGORY_ICONS: Record<WidgetCategory, React.ComponentType<{ size?: number; className?: string }>> = {
  productivity: CheckCircle2,
    gamified: Flame,
  ai: Sparkles,
  workspace: LayoutGrid,
  project: Target,
  notifications: Bell,
  integrations: Plug,
  system: Wifi,
};

/** Grid semantics on the 4-column dashboard grid. */
export const SIZE_CLASS: Record<WidgetSize, string> = {
  small: "col-span-1",
  medium: "col-span-2",
  large: "col-span-2 row-span-2",
  wide: "col-span-2 md:col-span-4",
};

export function WidgetLoading({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2.5" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-9 animate-pulse rounded-xl bg-[var(--surface)]"
          style={{ animationDelay: `${i * 120}ms`, opacity: 1 - i * 0.18 }}
        />
      ))}
    </div>
  );
}

export function WidgetEmpty({
  icon,
  title,
  hint,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-[96px] flex-col items-center justify-center gap-1.5 py-4 text-center">
      {icon && <div className="mb-0.5 text-[var(--muted)]">{icon}</div>}
      <p className="text-xs font-semibold text-[var(--text)]">{title}</p>
      {hint && <p className="max-w-[220px] text-[11px] leading-4 text-[var(--muted)]">{hint}</p>}
      {action && <div className="mt-1.5">{action}</div>}
    </div>
  );
}

export function WidgetError({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <WidgetEmpty
      icon={<AlertTriangle size={20} className="text-amber-500" />}
      title="Couldn't load this widget"
      hint={message || "Something went wrong. Your data is safe — this view just failed to render."}
      action={
        onRetry && (
          <button
            onClick={onRetry}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text)] hover:border-[var(--accent)] transition-colors cursor-pointer"
          >
            Retry
          </button>
        )
      }
    />
  );
}

export function WidgetOffline({ onRetry }: { onRetry?: () => void }) {
  return (
    <WidgetEmpty
      icon={<Wifi size={20} className="text-[var(--muted)]" />}
      title="You're offline"
      hint="Showing the last synced data. It will refresh automatically when you reconnect."
      action={
        onRetry && (
          <button
            onClick={onRetry}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text)] hover:border-[var(--accent)] transition-colors cursor-pointer"
          >
            Try again
          </button>
        )
      }
    />
  );
}

export function WidgetPermissionRequired({ integration }: { integration: string }) {
  return (
    <WidgetEmpty
      icon={<Plug size={20} className="text-[var(--muted)]" />}
      title={`Connect ${integration}`}
      hint={`This widget needs the ${integration} integration and the right permissions. It will activate automatically once connected.`}
    />
  );
}

/** Animated number — the shared "count changed" micro-interaction. */
export function AnimatedCount({ value, className }: { value: number; className?: string }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 6, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={className}
    >
      {value}
    </motion.span>
  );
}

interface WidgetErrorBoundaryState {
  error: Error | null;
  resetKey: string;
}

/** Catches a broken widget without taking down the dashboard; reports a
 * telemetry `error` event so admins see it in the Widgets monitor. */
class WidgetErrorBoundary extends React.Component<
  { widgetId: string; children: React.ReactNode },
  WidgetErrorBoundaryState
> {
  state: WidgetErrorBoundaryState = { error: null, resetKey: "" };

  static getDerivedStateFromError(error: Error): Partial<WidgetErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error): void {
    trackWidgetEvent(this.props.widgetId, "error", { errorMessage: error.message });
  }

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <WidgetError
          message={this.state.error.message}
          onRetry={() => this.setState({ error: null, resetKey: String(Date.now()) })}
        />
      );
    }
    return this.props.children;
  }
}

export function WidgetFrame({
  definition,
  instance,
  ctx,
  onRemove,
  onResize,
  onConfigure,
  dragHandleProps,
  dragging,
}: {
  definition?: WidgetDefinition;
  instance: WidgetInstance;
  ctx: WidgetRuntimeContext;
  onRemove: () => void;
  onResize?: (size: WidgetSize) => void;
  onConfigure?: (config: Record<string, unknown>) => void;
  dragHandleProps?: Record<string, unknown>;
  dragging?: boolean;
}) {
  if (!definition) {
    return (
      <div className="flex h-32 items-center justify-center rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] text-xs text-neutral-400">
        Widget unavailable
      </div>
    );
  }

  const Icon = WIDGET_CATEGORY_ICONS[definition.category] ?? FileText;
  const sizeIndex = definition.supportedSizes.indexOf(instance.size);
  const nextSize =
    definition.supportedSizes.length > 1
      ? definition.supportedSizes[(sizeIndex + 1 + definition.supportedSizes.length) % definition.supportedSizes.length]
      : null;

  return (
    <motion.section
      layout
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: 4 }}
      transition={{ type: "spring", stiffness: 450, damping: 32 }}
      className={`group relative flex flex-col overflow-hidden rounded-[22px] border border-black/[0.06] dark:border-white/[0.08] bg-white/80 dark:bg-[#151820]/80 backdrop-blur-2xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_28px_-4px_rgba(0,0,0,0.35)] transition-all duration-300 hover:shadow-[0_12px_32px_-6px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_12px_36px_-6px_rgba(0,0,0,0.5)] hover:border-black/[0.12] dark:hover:border-white/[0.16] ${
        SIZE_CLASS[instance.size]
      } ${dragging ? "opacity-60 ring-2 ring-indigo-500/50 scale-[0.98]" : ""}`}
      aria-label={definition.name}
    >
      {/* Specular glass top reflection line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 dark:via-white/20 to-transparent" />

      <header className="flex items-center gap-2.5 px-4 pb-1 pt-3.5 select-none">
        <button
          {...dragHandleProps}
          title="Drag to reorder"
          className="-ml-1.5 cursor-grab touch-none rounded-lg p-1 text-neutral-400 dark:text-neutral-500 opacity-0 transition-all hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:text-neutral-700 dark:hover:text-neutral-200 group-hover:opacity-100 active:cursor-grabbing active:scale-95"
        >
          <GripVertical size={13} />
        </button>
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-neutral-700 dark:text-neutral-300 shadow-2xs">
          <Icon size={13} />
        </span>
        <h3 className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
          {definition.name}
        </h3>
        <div className="flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {onConfigure && (
            <button
              onClick={() => onConfigure({ ...definition.defaultConfig, ...instance.config })}
              title="Configure"
              className="rounded-lg p-1 text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-all active:scale-90 cursor-pointer"
            >
              <Settings2 size={13} />
            </button>
          )}
          {nextSize && onResize && (
            <button
              onClick={() => onResize(nextSize)}
              title={`Resize to ${nextSize}`}
              className="rounded-lg p-1 text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-all active:scale-90 cursor-pointer"
            >
              <LayoutGrid size={13} />
            </button>
          )}
          <button
            onClick={onRemove}
            title="Remove widget"
            className="rounded-lg p-1 text-neutral-400 hover:bg-rose-500/15 hover:text-rose-500 transition-all active:scale-90 cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>
      </header>
      <div className="min-h-0 flex-1 px-4 pb-3.5 pt-1">
        <WidgetErrorBoundary widgetId={definition.id} key={`${instance.id}:${instance.size}`}>
          <definition.component config={instance.config ?? {}} size={instance.size} ctx={ctx} />
        </WidgetErrorBoundary>
      </div>
    </motion.section>
  );
}

/** Stat row used across widgets — small label + animated value. */
export function WidgetStat({
  label,
  value,
  tone = "default",
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "accent" | "danger" | "success";
  onClick?: () => void;
}) {
  const toneClass = {
    default: "text-[var(--text)]",
    accent: "text-[var(--accent)]",
    danger: "text-[var(--danger)]",
    success: "text-emerald-500",
  }[tone];
  const content = (
    <>
      <div className={`text-lg font-bold leading-6 ${toneClass}`}>{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</div>
    </>
  );
  if (onClick) {
    return (
      <button onClick={onClick} className="text-left transition-opacity hover:opacity-75 cursor-pointer">
        {content}
      </button>
    );
  }
  return <div>{content}</div>;
}

export { Loader2, Trash2, Star, Flag };
