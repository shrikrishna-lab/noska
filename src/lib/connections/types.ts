/**
 * External Connections, Ecosystem Connectors & Link Preview — Core Data Types
 *
 * Models ecosystem parent connectors (Google Workspace, Microsoft 365, Atlassian,
 * GitHub, Slack, Notion, etc.), child services (Gmail, Drive, Calendar, Jira,
 * Repositories, etc.), granular permissions, dynamic resource selection,
 * and AI agent capability bindings.
 */

export type EcosystemCategory =
  | "All"
  | "Recommended"
  | "Connected"
  | "Workspace"
  | "Communication"
  | "Development"
  | "Project Management"
  | "Design"
  | "Files"
  | "Data"
  | "Automation";

export type ProviderCategory =
  | "Engineering"
  | "Project Management"
  | "Communication"
  | "Design"
  | "Productivity"
  | "File Management"
  | "Analytics"
  | "Security"
  | "Collaboration";

export type ConnectionAuthMode = "oauth" | "token" | "api_key" | "github_app" | "mcp" | "custom_mcp";

export interface ProviderPermissionScope {
  key: string;
  label: string;
  description: string;
  category: "read" | "write" | "admin";
}

export interface EcosystemServiceDefinition {
  id: string; // e.g. "gmail", "drive", "calendar", "jira", "repositories"
  name: string; // e.g. "Gmail", "Google Drive", "Jira Software"
  description: string;
  icon: string;
  defaultEnabled: boolean;
  requiredScopes: string[];
  permissions: Array<{
    id: string;
    label: string;
    description: string;
    type: "read" | "write" | "admin";
  }>;
  resourceTypes: Array<{
    id: string;
    name: string;
    pluralName: string;
    icon: string;
  }>;
  toolNames: string[]; // Agent-facing tools enabled by this service (e.g. "gmail.search", "gmail.createDraft")
}

export interface EcosystemConnectorDefinition {
  id: string; // e.g. "google-workspace", "microsoft-365", "atlassian", "github"
  name: string;
  slug: string;
  /** Gateway catalog slugs this ecosystem can connect through when its own
   * slug has no catalog row (e.g. google-workspace → gmail + google-calendar). */
  gatewaySlugs?: string[];
  description: string;
  tagline: string;
  category: EcosystemCategory;
  secondaryCategories?: EcosystemCategory[];
  icon: string;
  brandColor?: string;
  authModes: ConnectionAuthMode[];
  services: EcosystemServiceDefinition[];
  defaultScopes: string[];
  websiteUrl?: string;
  docsUrl?: string;
  isRecommended?: boolean;
}

export interface ConnectionServiceState {
  serviceId: string;
  enabled: boolean;
  grantedPermissions: string[];
  status: "active" | "disabled" | "permission_required" | "error";
  updatedAt: string;
}

export interface ConnectionResourceItem {
  id: string;
  externalResourceId: string;
  serviceId: string;
  name: string;
  resourceType: string;
  selected: boolean;
  parentName?: string;
  url?: string;
  metadata?: Record<string, unknown>;
  lastSyncedAt?: string;
}

export interface EcosystemConnection {
  id: string;
  userId: string;
  providerId: string; // matches EcosystemConnectorDefinition.id
  status: "connected" | "connecting" | "syncing" | "expired" | "revoked" | "error" | "reauth_required";
  authMode: ConnectionAuthMode;
  accountEmail?: string;
  accountUsername: string;
  accountAvatarUrl?: string;
  displayName: string;
  tenantId?: string; // Tenant / Workspace ID for multi-tenant providers
  services: Record<string, ConnectionServiceState>; // serviceId -> state
  resources: ConnectionResourceItem[];
  grantedScopes: string[];
  connectedAt: string;
  updatedAt: string;
  lastVerifiedAt?: string;
  lastSyncedAt?: string;
  syncError?: string | null;
}

// ─── Legacy & Link Preview Backward Compatibility ──────────────

export interface ProviderCapabilities {
  oauth: boolean;
  token?: boolean;
  multiAccount: boolean;
  linkPreview: boolean;
  linkMention: boolean;
  search: boolean;
  actions: boolean;
  webhooks: boolean;
  syncedDatabase: boolean;
  connectedProperties?: boolean;
}

export interface IntegrationProviderDefinition {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: ProviderCategory;
  icon: string;
  brandColor?: string;
  aliases: string[];
  capabilities: ProviderCapabilities;
  authModes: ConnectionAuthMode[];
  permissions: string[];
  detailedScopes?: ProviderPermissionScope[];
  status: "live" | "available" | "coming_soon";
  websiteUrl?: string;
  docsUrl?: string;
}

export type ResourceType =
  | "pull_request"
  | "issue"
  | "commit"
  | "release"
  | "repository"
  | "file"
  | "branch"
  | "channel"
  | "message"
  | "project"
  | "document"
  | "generic";

export interface NormalizedResourceSource {
  name: string;
  icon?: string;
  url?: string;
}

export interface NormalizedResourceAuthor {
  name: string;
  username?: string;
  avatarUrl?: string;
  url?: string;
}

export interface NormalizedResourceStatus {
  key: "open" | "closed" | "merged" | "draft" | "in_progress" | "done" | "todo" | "active" | "archived" | string;
  label: string;
  color?: string;
  bg?: string;
}

export interface NormalizedResource {
  provider: string;
  providerName: string;
  providerIcon: string;
  resourceType: ResourceType;
  externalId: string;
  canonicalUrl: string;
  title: string;
  description?: string;
  source: NormalizedResourceSource;
  author?: NormalizedResourceAuthor;
  status?: NormalizedResourceStatus;
  metadata: Record<string, unknown>;
  timestamps: {
    createdAt?: string;
    updatedAt?: string;
    closedAt?: string;
    mergedAt?: string;
  };
  capabilities?: {
    canComment?: boolean;
    canChangeStatus?: boolean;
    canSync?: boolean;
  };
}

export type ResourceResolutionState =
  | "initial"
  | "loading"
  | "success"
  | "auth_required"
  | "access_denied"
  | "not_found"
  | "provider_unavailable"
  | "connection_expired"
  | "unsupported_resource"
  | "malformed_url";

export interface UrlMatchResult {
  matched: boolean;
  provider: IntegrationProviderDefinition;
  resourceType: ResourceType;
  params: Record<string, string>;
  canonicalUrl: string;
  displayHint: string;
}

export interface ConnectedAccountInfo {
  id: string;
  connectionId: string;
  providerId: string;
  accountId: string;
  accountUsername: string;
  accountEmail?: string;
  accountAvatarUrl?: string;
  label: string;
  status: "connected" | "expired" | "revoked" | "error";
  authMode: ConnectionAuthMode;
  connectedAt: string;
  lastUsedAt?: string | null;
  tokenHint?: string | null;
}

export interface ResolveResourceResult {
  state: ResourceResolutionState;
  resource?: NormalizedResource;
  errorMessage?: string;
  accessibleAccounts?: Array<{ id: string; label: string; username: string }>;
  selectedAccountId?: string;
}
