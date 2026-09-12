/**
 * WidgetDashboard — the primary widget surface (Home). Renders the user's
 * layout through the engine, with the add-widget picker, per-widget
 * configuration, layout restore, and the in-app Notification Center.
 */
import React, { useMemo, useState } from "react";
import { Bell, LayoutGrid, Plus, RotateCcw } from "lucide-react";
import { WidgetEngineProvider, useWidgetEngine } from "../engine";
import { NotificationProvider, useNotifications } from "../notifications/engine";
import { NotificationCenter } from "../notifications/NotificationCenter";
import { WidgetGrid } from "./WidgetGrid";
import { WidgetPicker } from "./WidgetPicker";
import { WidgetConfigSheet } from "./WidgetConfigSheet";
import { getWidgetDefinition } from "../registry";
import type { WidgetRuntimeContext } from "../types";

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

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-[var(--text)]">Your widgets</h2>
          {!online && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
              Offline — showing synced data
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCenterOpen(true)}
            title="Notification Center"
            className="relative rounded-xl border border-[var(--border)] bg-[var(--panel)] p-2 text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--text)] transition-colors cursor-pointer"
          >
            <Bell size={15} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={resetLayout}
            title="Restore default layout"
            className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-2 text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--text)] transition-colors cursor-pointer"
          >
            <RotateCcw size={15} />
          </button>
          <button
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-[11.5px] font-bold text-white shadow-sm transition-colors hover:bg-blue-700 cursor-pointer"
          >
            <Plus size={14} /> Add widget
          </button>
        </div>
      </div>

      {/* Grid */}
      {ready ? (
        visible.length > 0 ? (
          <WidgetGrid widgets={visible} ctx={ctx} onConfigure={(instanceId, config) => setConfiguring({ instanceId, config })} />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--border)] py-14 text-center">
            <LayoutGrid size={22} className="text-[var(--muted)]" />
            <p className="text-sm font-semibold text-[var(--text)]">Your dashboard is empty</p>
            <p className="max-w-[280px] text-xs text-[var(--muted)]">
              Add widgets to see tasks, notifications and AI activity without opening five different screens.
            </p>
            <button
              onClick={() => setPickerOpen(true)}
              className="mt-1 flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-[11.5px] font-bold text-white hover:bg-blue-700 cursor-pointer"
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
              className="h-36 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
              style={{ animationDelay: `${i * 100}ms`, opacity: 1 - i * 0.15 }}
            />
          ))}
        </div>
      )}

      <WidgetPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
      {configuring && configuringDef && (
        <WidgetConfigSheet
          definition={configuringDef}
          initialConfig={configuring.config}
          onSave={(config) => configureWidget(configuring.instanceId, config)}
          onClose={() => setConfiguring(null)}
        />
      )}
      <NotificationCenter open={centerOpen} onClose={() => setCenterOpen(false)} ctx={ctx} />
    </div>
  );
}

/** Public entry — wraps everything in the engine + notification providers.
 * Props come straight from HomeDashboardRoute (WorkspaceViews). */
export function WidgetDashboard({
  pages,
  sharedPages = [],
  pendingInvites = [],
  currentUserId,
  currentUserName,
  workspaceName,
  onSelect,
  onNew,
  onAI,
  onOpenChat,
  onBlockPatch,
  onView,
  onToast,
}: {
  pages: WidgetRuntimeContext["pages"];
  sharedPages?: WidgetRuntimeContext["sharedPages"];
  pendingInvites?: Record<string, unknown>[];
  currentUserId?: string | null;
  currentUserName?: string;
  workspaceName?: string;
  onSelect: (pageId: string) => void;
  onNew: (template: string) => void;
  onAI: () => void;
  onOpenChat?: (chatId: string) => void;
  onBlockPatch?: (pageId: string, blockId: string, patch: Record<string, unknown>) => void;
  onView?: (view: string) => void;
  onToast?: (message: string) => void;
}) {
  const ctx = useMemo<WidgetRuntimeContext>(
    () => ({
      pages,
      sharedPages,
      pendingInvites,
      currentUserId,
      currentUserName,
      workspaceName,
      actions: { onSelect, onNew, onAI, onOpenChat, onBlockPatch, onView, onToast },
    }),
    [pages, sharedPages, pendingInvites, currentUserId, currentUserName, workspaceName, onSelect, onNew, onAI, onOpenChat, onBlockPatch, onView, onToast],
  );

  return (
    <WidgetEngineProvider ctx={ctx}>
      <NotificationProvider ctx={ctx}>
        <DashboardBody ctx={ctx} />
      </NotificationProvider>
    </WidgetEngineProvider>
  );
}
