/**
 * Layout shape + normalization + the shipped default dashboard.
 *
 * Normalization is the safety net between three sources of truth: the
 * server catalog (what admins allow), the local registry (what this build
 * can render) and the persisted user layout (what they chose). A layout
 * referencing a disabled, unshipped or removed widget never breaks the
 * dashboard — it's dropped or deferred until the widget returns.
 */
import type { WidgetCatalogEntry, WidgetDefinition, WidgetInstance, WidgetLayout, WidgetSize } from "./types";

export const DEFAULT_LAYOUT_WIDGETS: Array<{ widgetId: string; size: WidgetSize }> = [
  { widgetId: "quick-create", size: "small" },
  { widgetId: "my-tasks", size: "medium" },
  { widgetId: "unread-notifications", size: "small" },
  { widgetId: "ai-activity", size: "medium" },
  { widgetId: "recent-pages", size: "medium" },
  { widgetId: "attention-required", size: "medium" },
  { widgetId: "recent-activity", size: "wide" },
  { widgetId: "sync-status", size: "small" },
];

export function emptyLayout(): WidgetLayout {
  return { version: 1, widgets: [], removedIds: [] };
}

function coerceSize(size: unknown, allowed: WidgetSize[], fallback: WidgetSize): WidgetSize {
  if (typeof size === "string" && allowed.includes(size as WidgetSize)) return size as WidgetSize;
  return allowed.includes(fallback) ? fallback : allowed[0];
}

/** Build the default layout from the catalog: every widget the admin
 * marked default_enabled and this build ships, minus what the user
 * removed. Custom catalog defaults (default_size) are honored. */
export function buildDefaultLayout(catalog: WidgetCatalogEntry[]): WidgetLayout {
  const widgets: WidgetInstance[] = [];
  for (const entry of catalog) {
    if (!entry.available || entry.status === "disabled") continue;
    if (!entry.default_enabled) continue;
    const allowed = (entry.allowed_sizes?.length ? entry.allowed_sizes : ["small", "medium"]) as WidgetSize[];
    widgets.push({
      id: `w-${entry.id}`,
      widgetId: entry.id,
      size: coerceSize(entry.default_size, allowed, "medium"),
    });
  }
  return { version: 1, widgets, removedIds: [] };
}

/** Validate + repair a persisted layout against the registry and catalog.
 * - drops entries whose widget no longer exists in this build
 * - drops disabled/unavailable widgets (they come back automatically when
 *   admins re-enable them — the instance is re-added from defaults then)
 * - fixes sizes the widget no longer supports
 * - removes duplicate instances */
export function normalizeLayout(
  raw: unknown,
  registry: Map<string, WidgetDefinition>,
  catalog: WidgetCatalogEntry[],
): WidgetLayout {
  const catalogById = new Map(catalog.map((c) => [c.id, c]));
  const layout = raw as WidgetLayout | null;
  const removed = new Set(
    Array.isArray(layout?.removedIds) ? layout!.removedIds.filter((x): x is string => typeof x === "string") : [],
  );
  const widgets: WidgetInstance[] = [];
  const seen = new Set<string>();
  for (const instance of Array.isArray(layout?.widgets) ? layout!.widgets : []) {
    if (!instance || typeof instance.widgetId !== "string") continue;
    const def = registry.get(instance.widgetId);
    const entry = catalogById.get(instance.widgetId);
    if (!def) continue; // not shipped in this build
    if (entry && (!entry.available || entry.status === "disabled")) continue;
    if (seen.has(instance.widgetId)) continue; // no duplicates
    seen.add(instance.widgetId);
    const allowed = def.supportedSizes.length ? def.supportedSizes : (["small", "medium"] as WidgetSize[]);
    widgets.push({
      id: typeof instance.id === "string" && instance.id ? instance.id : `w-${instance.widgetId}`,
      widgetId: instance.widgetId,
      size: coerceSize(instance.size, allowed, def.defaultSize),
      config: instance.config && typeof instance.config === "object" ? instance.config : undefined,
    });
  }
  return { version: 1, widgets, removedIds: [...removed] };
}

/** Ensure every default_enabled widget the user never explicitly removed
 * is present (first run, after "restore defaults", or when admins flip a
 * widget back on). Existing instances keep their position and config. */
export function withDefaults(layout: WidgetLayout, catalog: WidgetCatalogEntry[]): WidgetLayout {
  const present = new Set(layout.widgets.map((w) => w.widgetId));
  const removed = new Set(layout.removedIds ?? []);
  const missing = catalog.filter(
    (c) => c.available && c.status !== "disabled" && c.default_enabled && !present.has(c.id) && !removed.has(c.id),
  );
  if (missing.length === 0) return layout;
  const widgets = [...layout.widgets];
  for (const entry of missing) {
    const allowed = (entry.allowed_sizes?.length ? entry.allowed_sizes : ["small", "medium"]) as WidgetSize[];
    widgets.push({
      id: `w-${entry.id}`,
      widgetId: entry.id,
      size: coerceSize(entry.default_size, allowed, "medium"),
    });
  }
  return { ...layout, widgets };
}
