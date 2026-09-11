/**
 * External Connections Service
 *
 * Coordinates authentication flows (OAuth, API Tokens), multi-account
 * management, account switching, and connection health status checks.
 */

import { connectorGateway, type ConnectorCatalogEntry, type ConnectorConnection } from "../connectorGateway";
import { IntegrationRegistry } from "./registry";
import type { ConnectedAccountInfo, IntegrationProviderDefinition } from "./types";
import { openExternal } from "../desktop/links";

export class ConnectionsService {
  private static connectionListeners = new Set<() => void>();

  static subscribe(fn: () => void): () => void {
    this.connectionListeners.add(fn);
    return () => this.connectionListeners.delete(fn);
  }

  private static notify(): void {
    for (const fn of this.connectionListeners) {
      try { fn(); } catch {}
    }
  }

  /**
   * List all connected accounts grouped by provider.
   */
  static async listConnectedAccounts(): Promise<ConnectedAccountInfo[]> {
    try {
      const connections = await connectorGateway.listConnections();
      return connections.map((c) => ({
        id: c.id,
        connectionId: c.id,
        providerId: c.connectors?.slug || "custom-mcp",
        accountId: c.external_account_label || c.id,
        accountUsername: c.external_account_label || "Connected Account",
        label: c.label || c.external_account_label || "Personal Account",
        status: c.status,
        authMode: c.auth_mode,
        connectedAt: c.connected_at,
        lastUsedAt: c.last_used_at,
        tokenHint: c.token_hint,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get connected accounts for a specific provider (e.g. 'github').
   */
  static async getAccountsForProvider(providerId: string): Promise<ConnectedAccountInfo[]> {
    const all = await this.listConnectedAccounts();
    return all.filter((a) => a.providerId.toLowerCase() === providerId.toLowerCase() && a.status !== "revoked");
  }

  /**
   * Start OAuth connect flow for a provider. Opens browser window.
   */
  static async startOAuthConnect(providerId: string): Promise<void> {
    const provider = IntegrationRegistry.get(providerId);
    if (!provider || !provider.capabilities.oauth) {
      throw new Error(`Provider "${providerId}" does not support OAuth connect.`);
    }

    const res = await connectorGateway.startConnect(provider.slug);
    if (res.authorize_url) {
      await openExternal(res.authorize_url);
    }
    this.notify();
  }

  /**
   * Connect with a token/API key / PAT (e.g. GitHub PAT, Notion internal secret).
   */
  static async connectManualToken(input: {
    providerId: string;
    token: string;
    label?: string;
    serverUrl?: string;
  }): Promise<{ connectionId: string }> {
    const res = await connectorGateway.connectManual({
      connector: input.providerId,
      token: input.token,
      label: input.label,
      serverUrl: input.serverUrl,
    });
    this.notify();
    return { connectionId: res.connection.id };
  }

  /**
   * Disconnect/revoke an account.
   */
  static async disconnectAccount(connectionId: string): Promise<void> {
    await connectorGateway.disconnect(connectionId);
    this.notify();
  }

  /**
   * Health check / re-test a connection.
   */
  static async testAccountConnection(connectionId: string): Promise<{ ok: boolean }> {
    const res = await connectorGateway.testConnection(connectionId);
    return { ok: res.ok };
  }
}
