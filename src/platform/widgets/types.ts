/**
 * Noska Widget Platform — Core Types & Contracts.
 * Defines Widget Definitions, Widget Instances, Runtime Contexts, and Capabilities.
 */
import type { ComponentType } from "react";
import type { Page } from "../../lib/supabaseService";
import type {
  FilterGroup,
  SortClause,
  GroupClause,
  AggregationClause,
  ViewVisualizationType,
  GlobalDashboardFilterState,
} from "./data/types";

export type WidgetSize = "small" | "medium" | "large" | "wide";

export type WidgetCategory =
  | "productivity"
  | "gamified"
  | "ai"
  | "workspace"
  | "project"
  | "notifications"
  | "integrations"
  | "system"
  | "analytics"
  | "automation"
  | "embed";

export type WidgetClass = "native" | "connected" | "smart_preview" | "embed";

export type WidgetStatus = "enabled" | "beta" | "disabled";

export type WidgetPlatform = "web" | "macos" | "windows" | "linux" | "mobile";

export type RefreshPolicy =
  | "realtime"
  | "1m"
  | "5m"
  | "15m"
  | "1h"
  | "daily"
  | "manual"
  | "on_open";

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

export interface WidgetConfigField {
  key: string;
  label: string;
  type: "toggle" | "select" | "text" | "number" | "color";
  options?: { value: string; label: string }[];
  description?: string;
  defaultValue?: unknown;
}

export interface WidgetActionDefinition {
  id: string;
  label: string;
  actionType: "workflow" | "webhook" | "provider_action" | "ai_prompt" | "create_record";
  requiresConfirmation?: boolean;
}

export interface WidgetRuntimeContext {
  pages: Page[];
  sharedPages: Page[];
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
    onRunAction?: (actionId: string, payload?: Record<string, unknown>) => Promise<void>;
  };
}

export interface WidgetProps {
  config: Record<string, unknown>;
  size: WidgetSize;
  ctx: WidgetRuntimeContext;
  instanceId?: string;
  globalFilters?: GlobalDashboardFilterState;
  onExplain?: () => void;
  simulate?: { state: "loading" | "empty" | "error" | "offline" | null };
}

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  category: WidgetCategory;
  widgetClass?: WidgetClass;
  version?: string;
  supportedSizes: WidgetSize[];
  defaultSize: WidgetSize;
  defaultConfig?: Record<string, unknown>;
  configSchema?: WidgetConfigField[];
  enabledByDefault: boolean;
  requiredIntegration?: string;
  capabilities?: string[];
  supportedDataSources?: string[];
  supportedActions?: WidgetActionDefinition[];
  component: ComponentType<WidgetProps>;
}

export interface WidgetInstance {
  id: string;
  widgetId: string;
  size: WidgetSize;
  config?: Record<string, unknown>;
  // Extended view & query properties
  dataSourceId?: string;
  viewId?: string;
  visualization?: ViewVisualizationType;
  filterGroups?: FilterGroup[];
  sorts?: SortClause[];
  group?: GroupClause;
  aggregations?: AggregationClause[];
  refreshPolicy?: RefreshPolicy;
  displaySettings?: {
    density?: "compact" | "normal" | "comfortable";
    accentColor?: string;
    showTitle?: boolean;
  };
  actions?: WidgetActionDefinition[];
}

export interface WidgetLayout {
  version: 1;
  widgets: WidgetInstance[];
  removedIds?: string[];
}
