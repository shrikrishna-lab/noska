/**
 * WidgetDashboard — the primary widget surface (Home). Renders the user's
 * layout through the engine, with the add-widget picker, per-widget
 * configuration, layout restore, and the in-app Notification Center.
 */
import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bell, LayoutGrid, Plus, RotateCcw, Sparkles, Flame, SlidersHorizontal, Sun, Moon } from "lucide-react";
import { WidgetEngineProvider, useWidgetEngine } from "../engine";
import { NotificationProvider, useNotifications } from "../notifications/engine";
import { NotificationCenter } from "../notifications/NotificationCenter";
import { WidgetGrid } from "./WidgetGrid";
import { WidgetPicker } from "./WidgetPicker";
import { WidgetConfigSheet } from "./WidgetConfigSheet";
import { getWidgetDefinition } from "../registry";
import type { WidgetRuntimeContext } from "../types";
import type { Page } from "../../../lib/supabaseService";

function getGreeting(name?: string): string {
  const hour = new Date().getHours();
  let timeStr = "Good morning";
  if (hour >= 12 && hour < 17) timeStr = "Good afternoon";
  else if (hour >= 17) timeStr = "Good evening";

  return name ? `${timeStr}, ${name}` : timeStr;
}

function DashboardBody({ ctx }: { ctx: WidgetRuntimeContext }) {
  const { layout, ready, online, resetLayout, configureWidget, isAvailable } = useWidgetEngine();
  const { unreadCount } = useNotifications();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [centerOpen, setCenterOpen] = useState(false);
  const [configuring, setConfiguring] = useState<{ instanceId: string; config: Record<string, unknown> } | null>(null);

  const visible = useMemo(
    () => layout.widgets.filter((w) => isAvailable(w.widgetId)),
    [layout.widgets, isAvailable],
  );
  const configuringDef = configuring ? getWidgetDefinition(layout.widgets.find((w) => w.id === configuring.instanceId)?.widgetId ?? "") : null;

  // Widgets (e.g. Notifications) can request the Notification Center.
  React.useEffect(() => {
    const open = () => setCenterOpen(true);
    window.addEventListener("noska:open-notifications", open);
    return () => window.removeEventListener("noska:open-notifications", open);
  }, []);

  const streakDays = 5; // dynamic fallback

  return (
    <div className="space-y-5 pb-8 select-none">
      {/* Noska Header & Greeting Banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-3xl border border-black/[0.06] dark:border-white/[0.08] bg-white/70 dark:bg-[#151820]/75 backdrop-blur-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.3)]"
      >
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-extrabold tracking-tight text-neutral-900 dark:text-white">
              {getGreeting(ctx.currentUserName)}
            </h1>
            <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 px-2 py-0.5 text-[10.5px] font-bold text-amber-700 dark:text-amber-300 shadow-2xs">
              <Flame size={12} className="text-amber-500" fill="currentColor" /> {streakDays}d Streak
            </span>
            {!online && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                Offline
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            Your personal hub — high-velocity productivity, AI agents & ambient focus.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setCenterOpen(true)}
            title="Notification Center"
            className="relative rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] p-2.5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-all active:scale-95 cursor-pointer shadow-2xs"
          >
            <Bell size={15} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-2xs">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={resetLayout}
            title="Restore default layout"
            className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] p-2.5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-all active:scale-95 cursor-pointer shadow-2xs"
          >
            <RotateCcw size={15} />
          </button>

          <button
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-1.5 rounded-2xl bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-neutral-900 px-4 py-2.5 text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>Add Widget</span>
          </button>
        </div>
      </motion.div>

      {/* Grid */}
      {ready ? (
        visible.length > 0 ? (
          <WidgetGrid widgets={visible} ctx={ctx} onConfigure={(instanceId, config) => setConfiguring({ instanceId, config })} />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2.5 rounded-3xl border border-dashed border-black/[0.1] dark:border-white/[0.12] bg-black/[0.01] dark:bg-white/[0.02] py-16 text-center">
            <div className="size-12 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center text-neutral-400">
              <LayoutGrid size={24} />
            </div>
            <p className="text-sm font-bold text-neutral-900 dark:text-white">Your dashboard is empty</p>
            <p className="max-w-[280px] text-xs text-neutral-400 dark:text-neutral-500">
              Add widgets to track tasks, AI agents, focus sprints, and daily habits in one place.
            </p>
            <button
              onClick={() => setPickerOpen(true)}
              className="mt-1 flex items-center gap-1.5 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-4 py-2 text-xs font-bold hover:bg-neutral-800 dark:hover:bg-neutral-100 cursor-pointer shadow-xs transition active:scale-95"
            >
              <Plus size={14} /> Add widget
            </button>
          </div>
        )
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-3xl bg-black/[0.03] dark:bg-white/[0.04]"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      )}

      {/* Overlays */}
      <WidgetPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
      <NotificationCenter open={centerOpen} onClose={() => setCenterOpen(false)} ctx={ctx} />
      {configuring && configuringDef && (
        <WidgetConfigSheet
          definition={configuringDef}
          initialConfig={configuring.config}
          onSave={(newConfig) => {
            configureWidget(configuring.instanceId, newConfig);
            setConfiguring(null);
          }}
          onClose={() => setConfiguring(null)}
        />
      )}
    </div>
  );
}

export type WidgetDashboardProps =
  | { ctx: WidgetRuntimeContext; [key: string]: unknown }
  | {
      ctx?: undefined;
      pages: Page[];
      sharedPages?: Page[];
      pendingInvites?: Record<string, unknown>[];
      currentUserId?: string;
      currentUserName?: string;
      workspaceName?: string;
      onSelect: (pageId: string) => void;
      onNew: (template: string) => void;
      onAI: () => void;
      onOpenChat?: (chatId: string) => void;
      onBlockPatch?: (pageId: string, blockId: string, patch: Record<string, unknown>) => void;
      onView?: (view: string) => void;
      onToast?: (message: string) => void;
    };

export function WidgetDashboard(props: WidgetDashboardProps) {
  const runtimeCtx: WidgetRuntimeContext = useMemo(() => {
    if ("ctx" in props && props.ctx) return props.ctx;
    const flat = props as Extract<WidgetDashboardProps, { pages: Page[] }>;
    return {
      pages: flat.pages || [],
      sharedPages: flat.sharedPages || [],
      pendingInvites: flat.pendingInvites || [],
      currentUserId: flat.currentUserId,
      currentUserName: flat.currentUserName,
      workspaceName: flat.workspaceName,
      actions: {
        onSelect: flat.onSelect,
        onNew: flat.onNew,
        onAI: flat.onAI,
        onOpenChat: flat.onOpenChat,
        onBlockPatch: flat.onBlockPatch,
        onView: flat.onView,
        onToast: flat.onToast,
      },
    };
  }, [props]);

  return (
    <WidgetEngineProvider ctx={runtimeCtx}>
      <NotificationProvider ctx={runtimeCtx}>
        <DashboardBody ctx={runtimeCtx} />
      </NotificationProvider>
    </WidgetEngineProvider>
  );
}

