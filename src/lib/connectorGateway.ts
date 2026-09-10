/**
 * Connector Gateway client — Noska as an MCP CLIENT to external platforms.
 *
 * Talks to the `connector-gateway` Edge Function, which owns every secret:
 * tokens are AES-GCM encrypted at rest and never returned to the client —
 * the client only ever sees connection metadata (status, scopes, label).
 * See supabase/functions/_shared/connectors/gateway.ts for the contract.
 *
 * Auth follows the same pattern as lib/teams.ts: Clerk session token via
 * the Supabase third-party-auth bridge.
 */

import { supabase, currentAccessToken } from "./supabase";

const GATEWAY = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connector-gateway`;

/* ─── Types (mirrors of the gateway's sanitized rows) ─────────────────── */

export interface ConnectorCatalogEntry {
  id: string;
  slug: string;
  name: string;
  description: string;
  publisher: string;
  icon_url: string | null;
  default_scopes: string[];
  /** 'oauth' and/or 'token' — which connect flows the UI should offer. */
  auth_modes: string[];
  call_rate_limit: number;
}

export interface ConnectorConnection {
  id: string;
  connector_id: string;
  status: "connected" | "expired" | "revoked";
  auth_mode: "oauth" | "token";
  server_url_override: string | null;
  label: string;
  external_account_label: string;
  granted_scopes: string[];
  token_hint: string | null;
  connected_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
  connectors: { slug: string; name: string; icon_url: string | null } | null;
}

export interface GatewayTool {
  name: string;
  description?: string;
  input_schema?: Record<string, unknown>;
  annotations?: Record<string, unknown>;
  connector_id: string;
  connector_slug: string;
  connector_name: string;
  sources?: string[];
  [key: string]: unknown;
}

/* ─── Transport ───────────────────────────────────────────────────────── */

async function authedRequest(path: string, init: RequestInit = {}): Promise<any> {
  const token = (await currentAccessToken())
    ?? (await supabase.auth.getSession().then((r) => r.data.session?.access_token));
  if (!token) throw new Error("Sign in to manage your platform connections.");
  const res = await fetch(`${GATEWAY}/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(String(data?.message ?? data?.error ?? `Request failed (${res.status})`));
  return data;
}

/* ─── API surface ─────────────────────────────────────────────────────── */

export const connectorGateway = {
  async listConnectors(): Promise<ConnectorCatalogEntry[]> {
    const data = await authedRequest("connectors");
    return (data?.connectors ?? []) as ConnectorCatalogEntry[];
  },

  async listConnections(): Promise<ConnectorConnection[]> {
    const data = await authedRequest("connections");
    return (data?.connections ?? []) as ConnectorConnection[];
  },

  /** Begin the OAuth consent flow — returns the provider's authorize URL
   * to open in the system browser. Completion lands on the gateway's
   * public /callback, which persists the connection server-side. */
  async startConnect(connectorSlug: string): Promise<{ authorize_url: string; connector: ConnectorCatalogEntry }> {
    return await authedRequest("connect", {
      method: "POST",
      body: JSON.stringify({ connector: connectorSlug }),
    });
  },

  /** Connect by pasting a token (Notion internal integration secret,
   * GitHub PAT, custom MCP server bearer token). Validated server-side
   * with a live MCP probe before anything is stored. */
  async connectManual(input: {
    connector: string;
    token: string;
    label?: string;
    serverUrl?: string;
  }): Promise<{ connection: ConnectorConnection; tool_count: number }> {
    return await authedRequest("connect/manual", {
      method: "POST",
      body: JSON.stringify({
        connector: input.connector,
        token: input.token,
        label: input.label,
        server_url: input.serverUrl,
      }),
    });
  },

  /** Live health check — reconnects to the MCP server and reports how
   * many tools it exposes; re-activates an expired connection on success. */
  async testConnection(connectionId: string): Promise<{ ok: boolean; tool_count: number }> {
    return await authedRequest("connections/test", {
      method: "POST",
      body: JSON.stringify({ connection_id: connectionId }),
    });
  },

  async disconnect(connectionId: string): Promise<void> {
    await authedRequest(`connections/${connectionId}`, { method: "DELETE" });
  },

  /** Merged tools/list across every live connection (server caches 60s;
   * pass force to bypass). A dead server degrades to `unavailable`, it
   * never fails the whole list. */
  async listTools(opts: { connectorId?: string; force?: boolean } = {}): Promise<{
    tools: GatewayTool[];
    unavailable: Array<{ connector_slug: string; error: string }>;
  }> {
    const params = new URLSearchParams();
    if (opts.connectorId) params.set("connector_id", opts.connectorId);
    if (opts.force) params.set("force", "true");
    const qs = params.toString();
    return await authedRequest(`tools${qs ? `?${qs}` : ""}`);
  },

  /** Invoke one tool on one connected platform. `tool` is the MCP tool's
   * own name on that server (NOT the prefixed agent-tool name). */
  async callTool(connectorSlug: string, tool: string, args: Record<string, unknown> = {}): Promise<{
    tool: string;
    connector: string;
    result: {
      content?: Array<{ type: string; text?: string }>;
      structuredContent?: unknown;
      isError?: boolean;
    };
    duration_ms: number;
  }> {
    return await authedRequest("tools/call", {
      method: "POST",
      body: JSON.stringify({ connector: connectorSlug, tool, arguments: args }),
    });
  },
};
