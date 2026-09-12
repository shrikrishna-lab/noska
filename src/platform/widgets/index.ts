/**
 * Noska Widget Platform — public surface.
 *
 * Everything a surface needs: the dashboard (drop into any page), the
 * engine context (for custom widget hosts), and the registry (for
 * declaring new widgets).
 */
export { WidgetDashboard } from "./components/WidgetDashboard";
export { WidgetEngineProvider, useWidgetEngine } from "./engine";
export { NotificationProvider, useNotifications } from "./notifications/engine";
export { NotificationCenter } from "./notifications/NotificationCenter";
export { WIDGET_REGISTRY, getWidgetDefinition, getAllWidgetDefinitions, WIDGET_CATEGORIES } from "./registry";
export { trackWidgetEvent } from "./analytics";
export { fetchWidgetCatalog, clearWidgetCatalogCache } from "./catalog";
export type {
  WidgetSize,
  WidgetCategory,
  WidgetStatus,
  WidgetDefinition,
  WidgetInstance,
  WidgetLayout,
  WidgetCatalogEntry,
  WidgetConfigField,
  WidgetProps,
  WidgetRuntimeContext,
} from "./types";
