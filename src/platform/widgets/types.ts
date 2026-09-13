/**
 * Noska Widget Platform — core types.
 *
 * A widget is a small, contextual, interactive surface that saves the user
 * a navigation step (see the widget philosophy in the platform spec).
 * Definitions live in `registry.tsx`; availability/rollout comes from the
 * server-side `widget_catalog` table via `catalog.ts`; per-user layout is
 * `WidgetLayout` persisted through `layoutStore.ts`.
 */
import type { ComponentType } from "react";
import type { Page } from "../../lib/supabaseService";

export type WidgetSize = "small" | "medium" | "large" | "wide";

export type WidgetCategory =
  | "productivity"
  | "gamified"
  | "ai"
  | "workspace"
  | "project"
  | "notifications"
  | "integrations"
  | "system";

export type WidgetStatus = "enabled" | "beta" | "disabled";

export type WidgetPlatform = "web" | "macos" | "windows" | "linux" | "mobile";

/** One entry of the server-side widget_catalog table, as returned by
 * get_widget_catalog() for the calling user (rollout already resolved). */
export interface WidgetCatalogEntry {
  id: string;
  name: string;
  description: string | null;
  category: WidgetCategory;
  status: WidgetStatus;
  available: boolean;
  default_enabled: boolean;
  default_size: WidgetSize;
  allowed_sizes: WidgetSize[];
  platforms: WidgetPlatform[];
  required_integration: string | null;
  min_app_version: string | null;
  default_config: Record<string, unknown> | null;
  version: string;
}

/** Declared per-widget user configuration (rendered by the config sheet). */
export interface WidgetConfigField {
  key: string;
  label: string;
  type: "toggle" | "select";
  options?: { value: string; label: string }[];
  description?: string;
}

/** Everything a widget needs to render and act. Passed down from the
 * dashboard surface (WorkspaceViews → WidgetDashboard → engine context). */
export interface WidgetRuntimeContext {
  pages: Page[];
  sharedPages: Page[];
  /** Page invites awaiting the current user (Attention widget). */
  pendingInvites: Record<string, unknown>[];
  currentUserId?: string | null;
  currentUserName?: string;
  workspaceName?: string;
  actions: {
    onSelect: (pageId: string) => void;
    onNew: (template: string) => void;
    onAI: () => void;
    onOpenChat?: (chatId: string) => void;
    onBlockPatch?: (pageId: string, blockId: string, patch: Record<string, unknown>) => void;
    onView?: (view: string) => void;
    onToast?: (message: string) => void;
  };
}

export interface WidgetProps {
  config: Record<string, unknown>;
  size: WidgetSize;
  ctx: WidgetRuntimeContext;
  /** Set by the admin "test" flow — widgets must not persist or notify. */
  simulate?: { state: "loading" | "empty" | "error" | "offline" | null };
}

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  category: WidgetCategory;
  supportedSizes: WidgetSize[];
  defaultSize: WidgetSize;
  defaultConfig?: Record<string, unknown>;
  configSchema?: WidgetConfigField[];
  enabledByDefault: boolean;
  requiredIntegration?: string;
  component: ComponentType<WidgetProps>;
}

/** A placed widget on a user's dashboard. */
export interface WidgetInstance {
  id: string;
  widgetId: string;
  size: WidgetSize;
  config?: Record<string, unknown>;
}

export interface WidgetLayout {
  version: 1;
  widgets: WidgetInstance[];
  /** Widgets the user explicitly removed — default-enabled widgets must
   * not reappear until "restore defaults". */
  removedIds?: string[];
}
