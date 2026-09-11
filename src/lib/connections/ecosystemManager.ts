/**
 * Ecosystem Connections & Resource Lifecycle Manager
 *
 * Provides a unified, ecosystem-first management layer for all 28+ integrations.
 * Features:
 *  - Single top-level parent connection per provider (e.g. Google Workspace, Microsoft 365, Atlassian, GitHub).
 *  - Granular child service enablement/disablement (e.g. Gmail vs Drive vs Docs).
 *  - Granular resource selection (e.g. GitHub repos, Google Drives/Calendars, Slack channels).
 *  - Duplicate connection prevention based on (providerId, externalAccountId, tenantId).
 *  - Zero periodic background polling loops (strictly on-demand sync with last-known-good cache resilience).
 *  - Reactive event subscriptions for UI & AI agent tool filtering.
 */

import { connectorGateway, type ConnectorCatalogEntry } from "../connectorGateway";
import { getEcosystemConnector, getAllEcosystemConnectors, getEcosystemConnectorByGatewaySlug } from "./ecosystemRegistry";
import type {
  EcosystemConnection,
  EcosystemConnectorDefinition,
  ConnectionServiceState,
  ConnectionResourceItem,
  ConnectionAuthMode,
} from "./types";
import { openExternal } from "../desktop/links";

const STORAGE_KEY_PREFIX = "noska_ecosystem_conn_v2_";
const RESOURCE_CACHE_KEY_PREFIX = "noska_ecosystem_res_v2_";

/** Local-only connection ids (in-flight OAuth / never confirmed by the
 * gateway). They are never sent to the gateway on disconnect. */
const LOCAL_ID_PREFIXES = ["local-", "pending-"];

type EcosystemEventListener = () => void;

class EcosystemManagerClass {
  private listeners = new Set<EcosystemEventListener>();
  private cache = new Map<string, EcosystemConnection>();
  private resourceCache = new Map<string, ConnectionResourceItem[]>();
  private isLoaded = false;

  constructor() {
    this.loadFromStorage();
  }

  public subscribe(listener: EcosystemEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error("EcosystemManager listener error:", err);
      }
    }
  }

  private loadFromStorage(): void {
    try {
      if (typeof window === "undefined" || !window.localStorage) return;
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (k.startsWith(STORAGE_KEY_PREFIX)) {
          const raw = localStorage.getItem(k);
          if (raw) {
            try {
              const parsed = JSON.parse(raw) as EcosystemConnection;
              if (parsed && parsed.providerId) {
                this.cache.set(parsed.providerId, parsed);
              }
            } catch {}
          }
        } else if (k.startsWith(RESOURCE_CACHE_KEY_PREFIX)) {
          const raw = localStorage.getItem(k);
          if (raw) {
            try {
              const providerId = k.replace(RESOURCE_CACHE_KEY_PREFIX, "");
              const items = JSON.parse(raw) as ConnectionResourceItem[];
              if (Array.isArray(items)) {
                this.resourceCache.set(providerId, items);
              }
            } catch {}
          }
        }
      }
      this.isLoaded = true;
    } catch (e) {
      console.warn("Could not load ecosystem connections from localStorage:", e);
    }
  }

  private saveConnectionToStorage(conn: EcosystemConnection): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${conn.providerId}`, JSON.stringify(conn));
        if (conn.resources && conn.resources.length > 0) {
          localStorage.setItem(`${RESOURCE_CACHE_KEY_PREFIX}${conn.providerId}`, JSON.stringify(conn.resources));
        }
      }
    } catch (e) {
      console.warn("Failed to persist ecosystem connection:", e);
    }
  }

  private removeConnectionFromStorage(providerId: string): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}${providerId}`);
        localStorage.removeItem(`${RESOURCE_CACHE_KEY_PREFIX}${providerId}`);
      }
    } catch {}
  }

  /**
   * Sync active connections from the gateway and reconcile with local state.
   * A gateway failure keeps the local state untouched; a successful empty
   * response (signed in, nothing connected) clears everything except
   * in-flight local OAuth attempts.
   */
  public async refreshConnections(): Promise<EcosystemConnection[]> {
    try {
      const rawConnections = await connectorGateway.listConnections().catch(() => null);
      if (rawConnections === null) {
        // Gateway unreachable (offline / not signed in yet) — keep last-known state.
        return Array.from(this.cache.values());
      }

      const updatedMap = new Map<string, EcosystemConnection>();

      for (const raw of rawConnections) {
        if (raw.status === "revoked") continue;

        // Map the gateway catalog slug (gmail, google-calendar, …) to the
        // ecosystem definition it belongs to.
        const slug = raw.connectors?.slug || raw.connector_id || "custom-mcp";
        const def = getEcosystemConnectorByGatewaySlug(slug);
        const providerId = def ? def.id : slug;

        const existing = this.cache.get(providerId);

        // Build default services state
        const servicesState: Record<string, ConnectionServiceState> = existing?.services || {};
        if (def) {
          for (const s of def.services) {
            if (!servicesState[s.id]) {
              servicesState[s.id] = {
                serviceId: s.id,
                enabled: s.defaultEnabled,
                grantedPermissions: s.permissions.map((p) => p.id),
                status: "active",
                updatedAt: new Date().toISOString(),
              };
            }
          }
        }

        const rawAny = raw as any;
        const conn: EcosystemConnection = {
          id: raw.id,
          userId: rawAny.user_id || "local-user",
          providerId,
          status: raw.status === "connected" ? "connected" : (raw.status as any) || "connected",
          authMode: (raw.auth_mode as ConnectionAuthMode) || "oauth",
          accountEmail: raw.external_account_label?.includes("@") ? raw.external_account_label : undefined,
          accountUsername: raw.external_account_label || raw.label || "Connected Account",
          accountAvatarUrl: rawAny.metadata?.avatar_url,
          displayName: raw.label || raw.external_account_label || (def?.name ?? providerId),
          tenantId: rawAny.metadata?.tenant_id || rawAny.metadata?.workspace_id,
          services: servicesState,
          resources: this.resourceCache.get(providerId) || existing?.resources || [],
          grantedScopes: raw.granted_scopes || rawAny.metadata?.scopes || def?.defaultScopes || [],
          connectedAt: raw.connected_at || new Date().toISOString(),
          updatedAt: raw.last_used_at || new Date().toISOString(),
          lastVerifiedAt: raw.last_used_at || undefined,
          lastSyncedAt: existing?.lastSyncedAt || new Date().toISOString(),
          syncError: null,
        };

        // Prevent duplicates - prioritize active connection
        updatedMap.set(providerId, conn);
        this.saveConnectionToStorage(conn);
      }

      // Preserve in-flight local OAuth attempts ("pending-*") so the UI can
      // show a "connecting" state until the gateway confirms the connection.
      for (const [k, v] of this.cache.entries()) {
        if (v.id?.startsWith("pending-") && !updatedMap.has(k)) {
          updatedMap.set(k, v);
        }
      }

      this.cache = updatedMap;
      this.notify();
      return Array.from(this.cache.values());
    } catch (err) {
      console.warn("Could not refresh ecosystem connections:", err);
      return Array.from(this.cache.values());
    }
  }

  /* ─── Gateway catalog availability ─────────────────────────────────── */

  private catalog = new Map<string, ConnectorCatalogEntry>();
  private catalogLoaded = false;

  /** Fetch the gateway connector catalog once per session so the UI can
   * gate connect flows on what actually exists server-side. */
  public async refreshCatalog(): Promise<void> {
    if (this.catalogLoaded) return;
    try {
      const entries = await connectorGateway.listConnectors();
      this.catalog = new Map(entries.map((e) => [e.slug, e]));
      this.catalogLoaded = true;
    } catch {
      // Leave the catalog empty — connect flows fall back to def.slug.
    }
  }

  /**
   * Resolve which gateway slug an ecosystem connects through. Returns null
   * when the catalog is loaded and the ecosystem has no catalog row.
   */
  public resolveConnectSlug(def: EcosystemConnectorDefinition): string | null {
    const candidates = [def.slug, ...(def.gatewaySlugs ?? [])];
    if (this.catalogLoaded && this.catalog.size > 0) {
      for (const slug of candidates) {
        if (this.catalog.has(slug)) return slug;
      }
      return null;
    }
    // Catalog unavailable (offline / unsigned): optimistic default.
    return candidates[0];
  }

  /** True when the ecosystem maps to at least one live gateway catalog row. */
  public isProviderConnectable(providerId: string): boolean {
    const def = getEcosystemConnector(providerId);
    if (!def) return false;
    return this.resolveConnectSlug(def) !== null;
  }

  /**
   * Get all registered ecosystem connector definitions.
   */
  public getAllDefinitions(): EcosystemConnectorDefinition[] {
    return getAllEcosystemConnectors();
  }

  /**
   * Get active connection for a given ecosystem provider ID.
   */
  public getConnection(providerId: string): EcosystemConnection | undefined {
    return this.cache.get(providerId);
  }

  /**
   * Check if a specific service is enabled within an ecosystem.
   */
  public isServiceEnabled(providerId: string, serviceId: string): boolean {
    const conn = this.getConnection(providerId);
    if (!conn || conn.status !== "connected") return false;
    const s = conn.services[serviceId];
    return s ? s.enabled && s.status === "active" : false;
  }

  /**
   * Check if a resource is selected for agent access.
   */
  public isResourceSelected(providerId: string, resourceId: string): boolean {
    const conn = this.getConnection(providerId);
    if (!conn || conn.status !== "connected") return false;
    const res = conn.resources.find((r) => r.id === resourceId || r.externalResourceId === resourceId);
    return res ? res.selected : false;
  }

  /**
   * Get list of selected resources for a provider and optional service.
   */
  public getSelectedResources(providerId: string, serviceId?: string): ConnectionResourceItem[] {
    const conn = this.getConnection(providerId);
    if (!conn) return [];
    return conn.resources.filter((r) => r.selected && (!serviceId || r.serviceId === serviceId));
  }

  /**
   * Toggle a child service on or off. Only meaningful for an established
   * connection — toggling never fabricates one.
   */
  public async toggleService(providerId: string, serviceId: string, enabled: boolean): Promise<void> {
    const conn = this.getConnection(providerId);
    if (!conn) return;

    if (!conn.services[serviceId]) {
      conn.services[serviceId] = {
        serviceId,
        enabled,
        grantedPermissions: [],
        status: "active",
        updatedAt: new Date().toISOString(),
      };
    } else {
      conn.services[serviceId].enabled = enabled;
      conn.services[serviceId].updatedAt = new Date().toISOString();
    }

    conn.updatedAt = new Date().toISOString();
    this.cache.set(providerId, conn);
    this.saveConnectionToStorage(conn);
    this.notify();
  }

  /**
   * Update selection state for an individual resource item.
   */
  public updateResourceSelection(providerId: string, resourceId: string, selected: boolean): void {
    const conn = this.getConnection(providerId);
    if (!conn) return;

    conn.resources = conn.resources.map((r) => {
      if (r.id === resourceId || r.externalResourceId === resourceId) {
        return { ...r, selected };
      }
      return r;
    });

    this.resourceCache.set(providerId, conn.resources);
    this.saveConnectionToStorage(conn);
    this.notify();
  }

  /**
   * Batch select or deselect all resources for an ecosystem or service.
   */
  public selectAllResources(providerId: string, serviceId?: string, selected = true): void {
    const conn = this.getConnection(providerId);
    if (!conn) return;

    conn.resources = conn.resources.map((r) => {
      if (!serviceId || r.serviceId === serviceId) {
        return { ...r, selected };
      }
      return r;
    });

    this.resourceCache.set(providerId, conn.resources);
    this.saveConnectionToStorage(conn);
    this.notify();
  }

  /**
   * On-demand resource sync. Calls the gateway's /resources endpoint,
   * which runs MCP resources/list across every live connection and maps
   * the items belonging to this ecosystem. Previous selection state is
   * preserved per resource URI. There is no fabricated data here: servers
   * that don't implement the MCP resources primitive simply stay empty —
   * their tools remain governed by the Services toggles.
   */
  public async syncResources(providerId: string): Promise<{ resources: ConnectionResourceItem[]; discoveredCount: number }> {
    const conn = this.getConnection(providerId);
    if (!conn) return { resources: [], discoveredCount: 0 };

    conn.status = "syncing";
    this.notify();

    try {
      const { resources: rawItems, unavailable } = await connectorGateway.listResources({ force: true });
      const def = getEcosystemConnector(providerId);
      const providerItems = rawItems.filter(
        (r) => getEcosystemConnectorByGatewaySlug(r.connector_slug)?.id === providerId
      );

      // Preserve per-resource selection state across syncs.
      const previousSelection = new Map(
        conn.resources.map((r) => [r.externalResourceId, r.selected] as const)
      );

      const mapped: ConnectionResourceItem[] = providerItems.map((r, idx) => ({
        id: `${providerId}:${r.uri}`,
        externalResourceId: r.uri,
        serviceId: def?.services[0]?.id ?? "resources",
        name: r.name?.trim() || r.uri,
        resourceType: r.mime_type?.split("/").pop() || "resource",
        selected: previousSelection.get(r.uri) ?? true,
        url: r.uri.startsWith("http") ? r.uri : undefined,
        metadata: {
          description: r.description,
          connectorSlug: r.connector_slug,
          mimeType: r.mime_type ?? undefined,
          gatewayIndex: idx,
        },
        lastSyncedAt: new Date().toISOString(),
      }));

      conn.resources = mapped;
      conn.lastSyncedAt = new Date().toISOString();
      const firstUnavailable = unavailable.find(
        (u) => getEcosystemConnectorByGatewaySlug(u.connector_slug)?.id === providerId
      );
      conn.syncError = firstUnavailable ? firstUnavailable.error : null;
      conn.status = "connected";

      this.resourceCache.set(providerId, mapped);
      this.saveConnectionToStorage(conn);
      this.notify();
      return { resources: mapped, discoveredCount: mapped.length };
    } catch (err: any) {
      // Last-known-good resilience: preserve existing selections and surface the error.
      console.warn(`Resource sync failed for ${providerId}:`, err);
      conn.status = "connected";
      conn.syncError = err?.message || "Resource sync timed out.";
      this.notify();
      return { resources: conn.resources || [], discoveredCount: 0 };
    }
  }

  /**
   * Connect an ecosystem via OAuth or Manual Token. Handles duplicate
   * connection prevention by matching existing accounts.
   *
   * OAuth: marks the ecosystem "connecting" and opens the provider's
   * consent page. The gateway persists the connection on its public
   * callback; refreshConnections() reconciles it — this method never
   * fakes a "connected" state before consent.
   *
   * Token/API key: validated live server-side (MCP probe) before anything
   * is stored, so the returned connection is real or nothing is written.
   */
  public async connectEcosystem(
    providerId: string,
    authMode: ConnectionAuthMode = "oauth",
    options?: { token?: string; serverUrl?: string; label?: string }
  ): Promise<void> {
    const def = getEcosystemConnector(providerId);
    if (!def) throw new Error(`Unknown ecosystem connector: ${providerId}`);

    await this.refreshCatalog();
    const connectSlug = this.resolveConnectSlug(def);
    if (!connectSlug) {
      throw new Error(`${def.name} isn't available in your workspace's connector catalog yet.`);
    }

    if (authMode === "oauth") {
      // Show an honest in-flight state while the consent page is open.
      const pending: EcosystemConnection = {
        id: `pending-${providerId}-${Date.now()}`,
        userId: "current-user",
        providerId,
        status: "connecting",
        authMode: "oauth",
        accountUsername: "Waiting for authorization…",
        displayName: def.name,
        services: this.buildDefaultServicesState(def),
        resources: [],
        grantedScopes: def.defaultScopes,
        connectedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.cache.set(providerId, pending);
      this.notify();

      try {
        const res = await connectorGateway.startConnect(connectSlug);
        if (res?.authorize_url) {
          await openExternal(res.authorize_url);
        } else {
          throw new Error("The gateway did not return an authorization URL.");
        }
      } catch (err) {
        // Roll the pending state back so the card returns to "Connect".
        this.cache.delete(providerId);
        this.notify();
        throw err;
      }
      return;
    }

    if (authMode === "token" || authMode === "api_key") {
      if (!options?.token) throw new Error("API token / key is required.");
      if (providerId === "custom-mcp" && !options.serverUrl?.trim()) {
        throw new Error("A Server Endpoint URL (https://…) is required for a custom MCP server.");
      }

      const res = await connectorGateway.connectManual({
        connector: connectSlug,
        token: options.token,
        label: options.label,
        serverUrl: options.serverUrl,
      });

      // The gateway validated the token with a live MCP probe — persist
      // the real connection it returned.
      const raw = (res?.connection ?? {}) as any;
      const conn: EcosystemConnection = {
        id: raw.id || `conn-${providerId}-${Date.now()}`,
        userId: raw.user_id || "current-user",
        providerId,
        status: "connected",
        authMode,
        accountEmail: typeof raw.external_account_label === "string" && raw.external_account_label.includes("@")
          ? raw.external_account_label
          : undefined,
        accountUsername: raw.external_account_label || options.label || `${def.name} User`,
        displayName: options.label || raw.label || def.name,
        services: this.buildDefaultServicesState(def),
        resources: [],
        grantedScopes: raw.granted_scopes || def.defaultScopes || [],
        connectedAt: raw.connected_at || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastSyncedAt: new Date().toISOString(),
      };

      this.cache.set(providerId, conn);
      this.saveConnectionToStorage(conn);
      this.notify();
      return;
    }

    throw new Error(`Unsupported auth mode "${authMode}" for ${def.name}.`);
  }

  private buildDefaultServicesState(def: EcosystemConnectorDefinition): Record<string, ConnectionServiceState> {
    const servicesState: Record<string, ConnectionServiceState> = {};
    for (const s of def.services) {
      servicesState[s.id] = {
        serviceId: s.id,
        enabled: s.defaultEnabled,
        grantedPermissions: s.permissions.map((p) => p.id),
        status: "active",
        updatedAt: new Date().toISOString(),
      };
    }
    return servicesState;
  }

  /**
   * Disconnect an ecosystem and revoke tokens.
   */
  public async disconnectEcosystem(providerId: string): Promise<void> {
    const conn = this.getConnection(providerId);
    if (conn && conn.id && !LOCAL_ID_PREFIXES.some((p) => conn.id.startsWith(p))) {
      try {
        await connectorGateway.disconnect(conn.id);
      } catch (err) {
        console.warn(`Failed to disconnect on gateway:`, err);
      }
    }

    this.cache.delete(providerId);
    this.resourceCache.delete(providerId);
    this.removeConnectionFromStorage(providerId);
    this.notify();
  }
}

export const ecosystemManager = new EcosystemManagerClass();
