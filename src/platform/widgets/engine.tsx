/**
 * Widget engine — the coordination layer every widget runs inside.
 *
 * Responsibilities:
 *  - load the server catalog (availability/rollout) and the user layout
 *  - expose layout mutations (add/remove/reorder/resize/configure)
 *  - central event wiring: one subscription to the workspace event bus
 *    (src/ai/runtime/eventBus.ts) instead of per-widget polling; widgets
 *    get fresh data via React state that already flows from App/pagesRealtime
 *  - online/offline tracking for stale-data indicators
 *  - availability resolution (catalog ∩ registry)
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { fetchWidgetCatalog } from "./catalog";
import { buildDefaultLayout, emptyLayout, normalizeLayout, withDefaults } from "./layout";
import {
  fetchServerLayout,
  queueSaveLayout,
  readLocalLayout,
  saveLayoutNow,
} from "./layoutStore";
import { trackWidgetEvent } from "./analytics";
import { WIDGET_REGISTRY, getWidgetDefinition } from "./registry";
import type {
  WidgetCatalogEntry,
  WidgetInstance,
  WidgetLayout,
  WidgetRuntimeContext,
  WidgetSize,
} from "./types";
import { subscribeWorkspaceEvents } from "../../ai/runtime/eventBus";

interface WidgetEngineValue {
  ready: boolean;
  online: boolean;
  catalog: WidgetCatalogEntry[];
  layout: WidgetLayout;
  /** True when the widget exists in this build AND the server allows it
   * for this user (enabled, rollout hit). */
  isAvailable: (widgetId: string) => boolean;
  isBeta: (widgetId: string) => boolean;
  addWidget: (widgetId: string) => void;
  removeWidget: (instanceId: string) => void;
  reorderWidgets: (fromId: string, toId: string) => void;
  resizeWidget: (instanceId: string, size: WidgetSize) => void;
  configureWidget: (instanceId: string, config: Record<string, unknown>) => void;
  resetLayout: () => void;
  trackEvent: typeof trackWidgetEvent;
}

const WidgetEngineContext = createContext<WidgetEngineValue | null>(null);

const WORKSPACE_KEY = "personal";

export function WidgetEngineProvider({
  children,
  ctx,
}: {
  children: React.ReactNode;
  ctx: WidgetRuntimeContext;
}) {
  const [catalog, setCatalog] = useState<WidgetCatalogEntry[]>([]);
  const [layout, setLayoutState] = useState<WidgetLayout>(emptyLayout());
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  // Initial load: server layout (fall back to mirror), then catalog,
  // then normalize + fill defaults.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [serverLayout, catalogEntries] = await Promise.all([
        fetchServerLayout(WORKSPACE_KEY),
        fetchWidgetCatalog(),
      ]);
      if (cancelled) return;
      const base =
        serverLayout ??
        readLocalLayout() ??
        (catalogEntries.length > 0 ? buildDefaultLayout(catalogEntries) : buildDefaultLayout([]));
      let normalized = normalizeLayout(base, WIDGET_REGISTRY, catalogEntries);
      normalized = withDefaults(normalized, catalogEntries);
      setCatalog(catalogEntries);
      setLayoutState(normalized);
      setReady(true);
      writeMirror(normalized);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const writeMirror = (next: WidgetLayout) => {
    // Imported lazily to keep this module's import graph acyclic in spirit;
    // writeLocalLayout is a trivial localStorage put.
    try {
      localStorage.setItem("noska:widget-layout:v1", JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  // Central workspace-event wiring: one bus subscription for the whole
  // platform instead of per-widget polling. Data freshness is owned by the
  // pages prop (realtime-synced upstream); this broadcasts the sync pulse
  // the Sync Status widget renders, and is the single hook point for
  // future event-driven widget reactions.
  useEffect(() => {
    return subscribeWorkspaceEvents((event) => {
      if (event.type === "page_updated" || event.type === "task_completed" || event.type === "page_created") {
        window.dispatchEvent(new CustomEvent("noska:pages-synced"));
      }
    });
  }, []);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  const setLayout = useCallback((next: WidgetLayout) => {
    setLayoutState(next);
    queueSaveLayout(next, WORKSPACE_KEY);
  }, []);

  const isAvailable = useCallback(
    (widgetId: string) => {
      const def = getWidgetDefinition(widgetId);
      if (!def) return false;
      const entry = catalog.find((c) => c.id === widgetId);
      // No catalog entry (fresh project / fetch failure): trust the build.
      if (!entry) return true;
      return entry.available && entry.status !== "disabled";
    },
    [catalog],
  );

  const isBeta = useCallback(
    (widgetId: string) => catalog.find((c) => c.id === widgetId)?.status === "beta",
    [catalog],
  );

  const addWidget = useCallback(
    (widgetId: string) => {
      const def = getWidgetDefinition(widgetId);
      if (!def || !isAvailable(widgetId)) return;
      const current = layoutRef.current;
      if (current.widgets.some((w) => w.widgetId === widgetId)) {
        ctx.actions.onToast?.(`${def.name} is already on your dashboard`);
        return;
      }
      const entry = catalog.find((c) => c.id === widgetId);
      const allowed = def.supportedSizes.length ? def.supportedSizes : (["small", "medium"] as WidgetSize[]);
      const fallback = (entry?.default_size as WidgetSize) || def.defaultSize;
      const size = allowed.includes(fallback) ? fallback : allowed[0];
      const instance: WidgetInstance = {
        id: `w-${widgetId}-${Date.now().toString(36)}`,
        widgetId,
        size,
        config: def.defaultConfig ? { ...def.defaultConfig } : undefined,
      };
      trackWidgetEvent(widgetId, "interact");
      setLayout({
        ...current,
        widgets: [...current.widgets, instance],
        removedIds: (current.removedIds ?? []).filter((id) => id !== widgetId),
      });
    },
    [catalog, ctx.actions, isAvailable, setLayout],
  );

  const removeWidget = useCallback(
    (instanceId: string) => {
      const current = layoutRef.current;
      const target = current.widgets.find((w) => w.id === instanceId);
      if (!target) return;
      setLayout({
        ...current,
        widgets: current.widgets.filter((w) => w.id !== instanceId),
        removedIds: [...new Set([...(current.removedIds ?? []), target.widgetId])],
      });
    },
    [setLayout],
  );

  const reorderWidgets = useCallback(
    (fromId: string, toId: string) => {
      const current = layoutRef.current;
      const from = current.widgets.findIndex((w) => w.id === fromId);
      const to = current.widgets.findIndex((w) => w.id === toId);
      if (from < 0 || to < 0 || from === to) return;
      const widgets = [...current.widgets];
      const [moved] = widgets.splice(from, 1);
      widgets.splice(to, 0, moved);
      setLayout({ ...current, widgets });
    },
    [setLayout],
  );

  const resizeWidget = useCallback(
    (instanceId: string, size: WidgetSize) => {
      const current = layoutRef.current;
      setLayout({
        ...current,
        widgets: current.widgets.map((w) => (w.id === instanceId ? { ...w, size } : w)),
      });
    },
    [setLayout],
  );

  const configureWidget = useCallback(
    (instanceId: string, config: Record<string, unknown>) => {
      const current = layoutRef.current;
      setLayout({
        ...current,
        widgets: current.widgets.map((w) => (w.id === instanceId ? { ...w, config } : w)),
      });
    },
    [setLayout],
  );

  const resetLayout = useCallback(() => {
    void saveLayoutNow(buildDefaultLayout(catalog), WORKSPACE_KEY);
    setLayoutState(withDefaults(normalizeLayout(emptyLayout(), WIDGET_REGISTRY, catalog), catalog));
  }, [catalog]);

  const value = useMemo<WidgetEngineValue>(
    () => ({
      ready,
      online,
      catalog,
      layout,
      isAvailable,
      isBeta,
      addWidget,
      removeWidget,
      reorderWidgets,
      resizeWidget,
      configureWidget,
      resetLayout,
      trackEvent: trackWidgetEvent,
    }),
    [ready, online, catalog, layout, isAvailable, isBeta, addWidget, removeWidget, reorderWidgets, resizeWidget, configureWidget, resetLayout],
  );

  return <WidgetEngineContext.Provider value={value}>{children}</WidgetEngineContext.Provider>;
}

export function useWidgetEngine(): WidgetEngineValue {
  const value = useContext(WidgetEngineContext);
  if (!value) {
    return {
      ready: true,
      online: true,
      catalog: [],
      layout: { version: 1, widgets: [] },
      isAvailable: () => true,
      isBeta: () => false,
      addWidget: () => {},
      removeWidget: () => {},
      reorderWidgets: () => {},
      resizeWidget: () => {},
      configureWidget: () => {},
      resetLayout: () => {},
      trackEvent: trackWidgetEvent,
    };
  }
  return value;
}

