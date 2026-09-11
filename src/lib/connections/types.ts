/**
 * External Connections & Link Preview — Core Data Types
 *
 * Models providers, capabilities, normalized external resources,
 * connection accounts, and preview lifecycle states.
 */

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

export type ConnectionAuthMode = "oauth" | "token";

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

export interface ProviderPermissionScope {
  key: string;
  label: string;
  description: string;
  category: "read" | "write" | "admin";
}

export interface IntegrationProviderDefinition {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: ProviderCategory;
  icon: string; // SVG path / identifier or brand name
  brandColor?: string;
  aliases: string[];
  capabilities: ProviderCapabilities;
  authModes: ConnectionAuthMode[];
  permissions: string[]; // Human-readable data access items, e.g. "Repositories", "Issues & Pull Requests"
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
  color?: string; // CSS color or Tailwind class indicator
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
