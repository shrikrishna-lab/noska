/* ============================================================================
 * Connector Gateway — domain logic (extensibility platform, phase 1).
 *
 * Noska acts as an MCP CLIENT to external services. Everything that can
 * touch a third-party token lives here and is surfaced ONLY through the
 * connector-gateway function (and, later, automations/marketplace):
 *
 *   - startConnect / handleCallback  — OAuth authorization-code + PKCE
 *   - listAvailableTools(userId)     — merged tools/list across connections
 *   - callTool(userId, connector, tool, args)
 *   - revokeConnection / listConnections / listConnectors
 *
 * SECURITY CONTRACT (mirrors _shared/core/runtime.ts):
 *   - tokens are AES-GCM encrypted at rest (CONNECTOR_ENCRYPTION_KEY) and
 *     are NEVER returned by any function here — only injected into the
 *     outbound MCP request's Authorization header;
 *   - every query is scoped by user_id — ids from request input are never
 *     trusted without an ownership check;
 *   - OAuth "state" carries the user identity in an encrypted, 10-minute
 *     blob so the public /callback can complete without a session.
 * ========================================================================== */

declare const Deno: {
  env: { get(key: string): string | undefined };
};

import {
  db, encryptSecret, decryptSecret, verifyPersisted, audit,
  errors, PlatformError, type Row,
} from "../core/runtime.ts";
import { currentRateWindow, pkceChallengeS256 } from "../core/pure.ts";
import { McpClient, McpTransportError, type McpCallResult } from "./mcp-client.ts";

const TOKEN_KEY_ENV = "CONNECTOR_ENCRYPTION_KEY";
const TOKEN_REFRESH_LEEWAY_MS = 90_000;
const OAUTH_STATE_TTL_MS = 10 * 60_000;
/** Short TTL cache for merged tool lists — spec allows it, and tools/list
 * over N MCP servers on every keystroke would be wasteful. */
const TOOLS_CACHE_TTL_MS = 60_000;
/** Live MCP sessions (initialize handshake) survive between tool calls. */
const CLIENT_CACHE_TTL_MS = 5 * 60_000;

type ConnectorRow = Row & {
  id: string; slug: string; name: string;
  mcp_server_url: string; oauth_config: Row; default_scopes: string[];
  tool_scope_map: Row; call_rate_limit: number;
  /** Which flows this connector supports: 'oauth' and/or 'token'. */
  auth_modes: string[] | null;
};
type ConnectionRow = Row & {
  id: string; user_id: string; connector_id: string; status: string;
  access_token_encrypted: string | null; refresh_token_encrypted: string | null;
  token_expires_at: string | null; granted_scopes: string[];
  /** 'oauth' | 'token' — how this connection was established. */
  auth_mode: string | null;
  /** Per-connection MCP server URL (Custom MCP Server, self-hosted). */
  server_url_override: string | null;
};

/* ─── In-isolate caches (per edge-runtime instance; TTL-bounded) ─── */

const toolsCache = new Map<string, { tools: Row[]; unavailable: Row[]; expires: number }>();
const resourcesCache = new Map<string, { resources: Row[]; unavailable: Row[]; expires: number }>();
const clientCache = new Map<string, { client: McpClient; token: string; expires: number }>();

function bustUserCaches(userId?: string, connectorId?: string): void {
  for (const key of toolsCache.keys()) {
    if (!userId || key === userId || key.startsWith(`${userId}:`)) toolsCache.delete(key);
  }
  for (const key of resourcesCache.keys()) {
    if (!userId || key === userId || key.startsWith(`${userId}:`)) resourcesCache.delete(key);
  }
  for (const key of clientCache.keys()) {
    if (connectorId && key.startsWith(connectorId)) clientCache.delete(key);
  }
}

/* ─── Connector loading ─── */

function safeConnector(c: Row): Row {
  return {
    id: c.id, slug: c.slug, name: c.name, description: c.description,
    publisher: c.publisher, icon_url: c.icon_url ?? null,
    default_scopes: c.default_scopes ?? [], call_rate_limit: c.call_rate_limit,
  };
}

export async function resolveConnector(idOrSlug: string): Promise<ConnectorRow> {
  const byId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
  const { data } = await db().from("connectors").select("*")
    .eq(byId ? "id" : "slug", idOrSlug).maybeSingle();
  if (!data) throw errors.notFound("Connector");
  const connector = data as ConnectorRow;
  if (!isConnectorActive(connector)) throw errors.notFound("Connector");
  return connector;
}

function isConnectorActive(c: Row): boolean {
  return c.is_active === true;
}

function authModes(connector: ConnectorRow): string[] {
  return Array.isArray(connector.auth_modes) && connector.auth_modes.length
    ? connector.auth_modes.map(String)
    : ["oauth"];
}

function supportsOAuth(connector: ConnectorRow): boolean {
  return authModes(connector).includes("oauth");
}

function supportsToken(connector: ConnectorRow): boolean {
  return authModes(connector).includes("token");
}

/* ─── OAuth client resolution ──────────────────────────────────────────
 *     Static credentials (env vars or catalog row) win. Otherwise, if
 *     the provider advertises a registration_endpoint, the gateway
 *     registers itself via OAuth dynamic client registration (RFC 7591)
 *     and persists the issued client in the connector's oauth_config so
 *     the callback and token refresh reuse the same client. This is how
 *     DCR-capable hosted MCP servers (Supabase, Linear, Cloudflare,
 *     Stripe, PostHog, Zapier, …) support "connect with login" without
 *     us pre-provisioning a client per provider. */

async function resolveOAuthClient(
  connector: ConnectorRow,
  redirectUri: string | null,
): Promise<{ clientId: string; clientSecret: string | null; cfg: Row }> {
  const cfg = (connector.oauth_config ?? {}) as Row;

  const staticId = (typeof cfg.client_id_env === "string" ? Deno.env.get(cfg.client_id_env) : undefined)
    ?? (typeof cfg.client_id === "string" ? cfg.client_id : undefined);
  const staticSecret = (typeof cfg.client_secret_env === "string" ? Deno.env.get(cfg.client_secret_env) : undefined)
    ?? (typeof cfg.client_secret === "string" ? cfg.client_secret : undefined);
  if (staticId && staticSecret) return { clientId: staticId, clientSecret: staticSecret, cfg };

  const registrationEndpoint = typeof cfg.registration_endpoint === "string" ? cfg.registration_endpoint : "";
  if (!registrationEndpoint) {
    throw errors.internal(
      `Connector "${connector.slug}" is missing OAuth client credentials — set ${String(cfg.client_id_env ?? "oauth_config.client_id")} / ${String(cfg.client_secret_env ?? "oauth_config.client_secret")}, or oauth_config.registration_endpoint for dynamic client registration.`,
    );
  }

  const storedId = typeof cfg.dcr_client_id === "string" ? cfg.dcr_client_id : "";
  const storedSecret = typeof cfg.dcr_client_secret === "string" ? cfg.dcr_client_secret : null;
  const storedRedirects = Array.isArray(cfg.dcr_redirect_uris) ? cfg.dcr_redirect_uris.map(String) : [];
  // Providers match the redirect_uri against the registered list exactly,
  // so re-register whenever the callback URL isn't covered (e.g. the
  // CONNECTOR_OAUTH_REDIRECT_BASE origin changed).
  const needsRegistration = !storedId || (redirectUri !== null && !storedRedirects.includes(redirectUri));
  if (!needsRegistration) {
    return { clientId: storedId, clientSecret: storedSecret, cfg };
  }

  const requestedAuthMethod = typeof cfg.dcr_token_auth_method === "string"
    ? cfg.dcr_token_auth_method
    : "client_secret_post";
  const body: Row = {
    client_name: `Noska Connector Gateway${redirectUri ? ` (${new URL(redirectUri).origin})` : ""}`,
    redirect_uris: redirectUri ? [redirectUri] : storedRedirects,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: requestedAuthMethod,
  };
  const scopes = (connector.default_scopes ?? []).filter(Boolean);
  if (scopes.length) body.scope = scopes.join(" ");

  let reg: Row;
  try {
    const res = await fetch(registrationEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    reg = await res.json().catch(() => ({})) as Row;
    if (!res.ok || !reg.client_id) {
      throw new Error(`status ${res.status}`);
    }
  } catch (err) {
    throw errors.internal(
      `Dynamic client registration failed for "${connector.slug}": ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const resolvedAuthMethod = typeof reg.token_endpoint_auth_method === "string"
    ? reg.token_endpoint_auth_method
    : requestedAuthMethod;
  const nextCfg: Row = {
    ...cfg,
    dcr_client_id: String(reg.client_id),
    ...(reg.client_secret ? { dcr_client_secret: String(reg.client_secret) } : {}),
    dcr_redirect_uris: redirectUri ? [redirectUri] : storedRedirects,
    dcr_token_auth_method: resolvedAuthMethod,
  };
  await db().from("connectors").update({ oauth_config: nextCfg }).eq("id", connector.id);

  return {
    clientId: String(reg.client_id),
    clientSecret: reg.client_secret ? String(reg.client_secret) : null,
    cfg: nextCfg,
  };
}

function requiredEndpoint(cfg: Row, key: string, slug: string): string {
  const value = typeof cfg[key] === "string" ? cfg[key] as string : "";
  if (!value) throw errors.internal(`Connector "${slug}" is missing oauth_config.${key}.`);
  return value;
}

/* ─── base64url helpers (encrypted state must survive a query param) ─── */

function toB64Url(s: string): string {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64Url(s: string): string {
  const b = s.replace(/-/g, "+").replace(/_/g, "/");
  return atob(b + "=".repeat((4 - (b.length % 4)) % 4));
}

/* ─── Step 1: build the provider's authorization URL ─── */

export async function startConnect(
  userId: string,
  connector: ConnectorRow,
  redirectUri: string,
): Promise<{ authorize_url: string; connector: Row }> {
  if (!supportsOAuth(connector)) {
    throw errors.validation(
      `${connector.name} does not support OAuth connect — use the token/API-key flow instead.`,
    );
  }
  const { clientId, cfg } = await resolveOAuthClient(connector, redirectUri);
  const authorizationEndpoint = requiredEndpoint(cfg, "authorization_endpoint", connector.slug);

  const verifier = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
  const state = toB64Url(await encryptSecret(JSON.stringify({
    u: userId, c: connector.id, r: redirectUri, v: verifier, iat: Date.now(),
  }), TOKEN_KEY_ENV));

  const url = new URL(authorizationEndpoint);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  const scopes = (connector.default_scopes ?? []).filter(Boolean);
  if (scopes.length) url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", await pkceChallengeS256(verifier));
  url.searchParams.set("code_challenge_method", "S256");
  for (const [k, v] of Object.entries((cfg.extra_auth_params ?? {}) as Row)) {
    if (typeof v === "string") url.searchParams.set(k, v);
  }
  return { authorize_url: url.toString(), connector: safeConnector(connector) };
}

/* ─── Step 2: public callback — identity comes from the encrypted state ─── */

export async function handleCallback(input: { code?: string; state?: string }): Promise<{ connector: Row; connection: Row }> {
  if (!input.code || !input.state) throw errors.validation("Missing code or state.");
  let payload: { u: string; c: string; r: string; v: string; iat: number };
  try {
    payload = JSON.parse(await decryptSecret(fromB64Url(input.state), TOKEN_KEY_ENV));
  } catch {
    throw errors.validation("Invalid OAuth state.");
  }
  if (!payload?.u || !payload?.c || !payload?.v || Date.now() - Number(payload.iat) > OAUTH_STATE_TTL_MS) {
    throw new PlatformError(400, "STATE_EXPIRED", "The connect attempt expired — start again.");
  }

  const { data } = await db().from("connectors").select("*").eq("id", payload.c).maybeSingle();
  if (!data) throw errors.notFound("Connector");
  const connector = data as ConnectorRow;
  // redirectUri is passed so a DCR client covering it is reused as-is.
  const { clientId, clientSecret, cfg } = await resolveOAuthClient(connector, payload.r);
  const tokenEndpoint = requiredEndpoint(cfg, "token_endpoint", connector.slug);

  const tokens = await postForm(tokenEndpoint, {
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: payload.r,
    code_verifier: payload.v,
  }, { clientId, clientSecret, cfg });
  if (!tokens.access_token) {
    throw new PlatformError(400, "OAUTH_EXCHANGE_FAILED",
      String(tokens.error_description ?? tokens.error ?? "Token exchange failed."));
  }

  const connection = await persistConnection(payload.u, connector, tokens);
  await audit({
    userId: payload.u, action: "connector.connected", resource: "connector",
    resourceId: connector.slug, surface: "oauth",
  });
  bustUserCaches(payload.u, connector.id);
  return { connector: safeConnector(connector), connection };
}

/** Best-effort connector slug from an OAuth state blob — used only to
 * build human-friendly redirect messages when the provider returns an
 * error; never for authorization decisions. */
export async function connectorSlugFromState(state?: string): Promise<string> {
  if (!state) return "unknown";
  try {
    const payload = JSON.parse(await decryptSecret(fromB64Url(state), TOKEN_KEY_ENV)) as { c?: string };
    if (!payload?.c) return "unknown";
    const { data } = await db().from("connectors").select("slug").eq("id", payload.c).maybeSingle();
    return String((data as Row | null)?.slug ?? "unknown");
  } catch {
    return "unknown";
  }
}

interface PersistExtras {
  authMode?: "oauth" | "token";
  serverUrlOverride?: string | null;
  label?: string;
}

async function persistConnection(
  userId: string,
  connector: ConnectorRow,
  tokens: Row,
  extras: PersistExtras = {},
): Promise<Row> {
  const expiresIn = Number(tokens.expires_in ?? 3600);
  const accessToken = String(tokens.access_token);
  const granted = typeof tokens.scope === "string"
    ? tokens.scope.split(/[\s,]+/).filter(Boolean)
    : (connector.default_scopes ?? []);

  // A reconnect supersedes any live connection for the same connector.
  await db().from("user_connections").update({
    status: "revoked", revoked_at: new Date().toISOString(),
    access_token_encrypted: null, refresh_token_encrypted: null, token_hint: null,
  }).eq("user_id", userId).eq("connector_id", connector.id).eq("status", "connected");

  const { data, error } = await db().from("user_connections").insert({
    user_id: userId,
    connector_id: connector.id,
    status: "connected",
    access_token_encrypted: await encryptSecret(accessToken, TOKEN_KEY_ENV),
    refresh_token_encrypted: tokens.refresh_token
      ? await encryptSecret(String(tokens.refresh_token), TOKEN_KEY_ENV)
      : null,
    token_expires_at: tokens.expires_in === undefined ? null : new Date(Date.now() + expiresIn * 1000).toISOString(),
    granted_scopes: granted,
    auth_mode: extras.authMode ?? "oauth",
    server_url_override: extras.serverUrlOverride ?? null,
    label: extras.label ?? "",
    external_account_label: labelFromIdToken(tokens.id_token),
    token_hint: accessToken.slice(-4),
    metadata: {},
  }).select("*").single();
  if (error) throw errors.internal(error.message);

  const verification = await verifyPersisted(userId, "user_connections", String((data as Row).id), { status: "connected" });
  if (verification.status !== "passed") throw errors.internal("Connection was not persisted correctly.");
  return { ...(data as Row), access_token_encrypted: undefined, refresh_token_encrypted: undefined };
}

/** Best-effort human label (email) from the OIDC id_token — decoded, not
 * verified, because it arrives directly from the token endpoint over TLS
 * and is only ever used as display metadata. */
function labelFromIdToken(idToken: unknown): string {
  if (typeof idToken !== "string" || idToken.split(".").length < 2) return "";
  try {
    const payload = JSON.parse(atob(idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.email === "string" ? payload.email : "";
  } catch {
    return "";
  }
}

/* ─── Token/API-key connect (no OAuth round trip) ────────────────────── */

export interface TokenConnectInput {
  token: string;
  label?: string;
  /** Required for the Custom MCP Server connector; overrides the
   * catalog URL for any connector when provided. */
  serverUrl?: string;
}

/** Connect by pasting a token (Notion internal integration secret,
 * GitHub PAT, arbitrary bearer token for a custom MCP server). The
 * token is validated with a live initialize + tools/list probe BEFORE
 * it is persisted, so a typo never stores a dead connection.
 *
 * The token is OPTIONAL when an explicit server URL is provided — open
 * MCP servers that need no auth can be connected by URL alone. */
export async function connectWithToken(
  userId: string,
  connector: ConnectorRow,
  input: TokenConnectInput,
): Promise<{ connector: Row; connection: Row; tool_count: number }> {
  if (!supportsToken(connector)) {
    throw errors.validation(
      `${connector.name} does not support token connect — use the OAuth flow instead.`,
    );
  }
  const token = String(input.token ?? "").trim();
  const explicitUrl = Boolean(input.serverUrl?.trim());
  if (!token && !explicitUrl) {
    throw errors.validation("token is required — unless connecting to an open MCP server by URL.");
  }
  const serverUrl = (input.serverUrl ?? "").trim() || connector.mcp_server_url;
  if (!/^https:\/\//i.test(serverUrl)) {
    throw errors.validation("A valid https:// MCP server URL is required.");
  }

  // Probe: prove the URL + token actually speak MCP before persisting.
  const probe = new McpClient({ serverUrl, accessToken: token });
  let tools: string[] = [];
  try {
    await probe.connect();
    tools = (await probe.listTools()).map((t) => String(t.name));
  } catch (err) {
    throw new PlatformError(400, "CONNECTION_PROBE_FAILED",
      `Could not reach the MCP server with this token: ${err instanceof Error ? err.message : String(err)}`);
  }

  const connection = await persistConnection(userId, connector, { access_token: token }, {
    authMode: "token",
    serverUrlOverride: input.serverUrl?.trim() ? serverUrl : null,
    label: String(input.label ?? "").slice(0, 200),
  });
  await audit({
    userId, action: "connector.connected", resource: "connector",
    resourceId: connector.slug, surface: "mcp",
  });
  bustUserCaches(userId, connector.id);
  return { connector: safeConnector(connector), connection, tool_count: tools.length };
}

/** Health check for the settings UI: reconnects to the MCP server and
 * re-activates an expired connection if the server accepts the token. */
export async function testConnection(userId: string, connectionId: string): Promise<{ ok: boolean; tool_count: number }> {
  const { data } = await db().from("user_connections").select("*")
    .eq("user_id", userId).eq("id", connectionId).maybeSingle();
  if (!data) throw errors.notFound("Connection");
  const connection = data as ConnectionRow;
  const connector = await resolveConnector(String(connection.connector_id));

  try {
    const accessToken = await ensureFreshAccessToken(userId, connector, connection);
    const client = await getConnectedClient(connector, accessToken, connection.server_url_override);
    const tools = await client.listTools();
    if (connection.status === "expired") {
      await db().from("user_connections").update({ status: "connected" })
        .eq("user_id", userId).eq("id", connection.id);
      bustUserCaches(userId, connector.id);
    }
    return { ok: true, tool_count: tools.length };
  } catch (err) {
    if (err instanceof McpTransportError && (err.status === 401 || err.status === 403)) {
      await markConnectionExpired(userId, connection);
      throw new PlatformError(401, "CONNECTION_EXPIRED", `${connector.name} rejected the access token — reconnect it.`);
    }
    throw err;
  }
}

/* ─── Token lifecycle ─── */

async function markConnectionExpired(userId: string, connection: ConnectionRow): Promise<void> {
  await db().from("user_connections").update({ status: "expired" })
    .eq("user_id", userId).eq("id", connection.id);
  bustUserCaches(userId, String(connection.connector_id));
}

/** Decrypt + (if within the leeway window) rotate the access token.
 * Throws CONNECTION_EXPIRED after a failed refresh — callers surface a
 * "reconnect" hint instead of a raw OAuth error. */
async function ensureFreshAccessToken(userId: string, connector: ConnectorRow, connection: ConnectionRow): Promise<string> {
  if (!connection.access_token_encrypted) throw errors.notFound("Active connection");
  const accessToken = await decryptSecret(connection.access_token_encrypted, TOKEN_KEY_ENV);
  const expiresAtMs = connection.token_expires_at ? Date.parse(connection.token_expires_at) : Number.MAX_SAFE_INTEGER;
  if (expiresAtMs - Date.now() > TOKEN_REFRESH_LEEWAY_MS) return accessToken;

  if (!connection.refresh_token_encrypted) {
    await markConnectionExpired(userId, connection);
    throw new PlatformError(401, "CONNECTION_EXPIRED", `Your ${connector.name} connection expired — reconnect it.`);
  }
  const { clientId, clientSecret, cfg } = await resolveOAuthClient(connector, null);
  const tokenEndpoint = requiredEndpoint(cfg, "token_endpoint", connector.slug);
  const refreshed = await postForm(tokenEndpoint, {
    grant_type: "refresh_token",
    refresh_token: await decryptSecret(connection.refresh_token_encrypted, TOKEN_KEY_ENV),
  }, { clientId, clientSecret, cfg });
  if (!refreshed.access_token) {
    await markConnectionExpired(userId, connection);
    throw new PlatformError(401, "CONNECTION_EXPIRED", `Your ${connector.name} connection expired — reconnect it.`);
  }

  const expiresIn = Number(refreshed.expires_in ?? 3600);
  await db().from("user_connections").update({
    access_token_encrypted: await encryptSecret(String(refreshed.access_token), TOKEN_KEY_ENV),
    refresh_token_encrypted: refreshed.refresh_token
      ? await encryptSecret(String(refreshed.refresh_token), TOKEN_KEY_ENV)
      : connection.refresh_token_encrypted,
    token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    ...(typeof refreshed.scope === "string" ? { granted_scopes: refreshed.scope.split(/[\s,]+/).filter(Boolean) } : {}),
  }).eq("user_id", userId).eq("id", connection.id);
  bustUserCaches(userId, connector.id);
  return String(refreshed.access_token);
}

/** OAuth token requests are form-encoded. Client authentication follows
 * the connector's declared method: `client_secret_basic` (legacy
 * oauth_config.token_auth_style), `client_secret_post` (DCR default), or
 * `none` (public dynamic clients — client_id only). */
async function postForm(
  endpoint: string,
  params: Row,
  creds: { clientId: string; clientSecret?: string | null; cfg: Row },
): Promise<Row> {
  const body = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" };
  const authMethod = typeof creds.cfg.dcr_token_auth_method === "string" && creds.cfg.dcr_token_auth_method
    ? creds.cfg.dcr_token_auth_method
    : (creds.cfg.token_auth_style === "basic" ? "client_secret_basic" : "client_secret_post");
  if (authMethod === "client_secret_basic") {
    headers["Authorization"] = `Basic ${btoa(`${creds.clientId}:${creds.clientSecret ?? ""}`)}`;
  } else {
    body.set("client_id", creds.clientId);
    if (creds.clientSecret && authMethod !== "none") body.set("client_secret", creds.clientSecret);
  }
  const res = await fetch(endpoint, { method: "POST", headers, body: body.toString() });
  const json = await res.json().catch(() => ({})) as Row;
  return res.ok ? json : { ...json, error: json.error ?? `http_${res.status}` };
}

/* ─── MCP session management ─── */

async function getConnectedClient(
  connector: ConnectorRow,
  accessToken: string,
  serverUrlOverride?: string | null,
): Promise<McpClient> {
  const serverUrl = serverUrlOverride?.trim() || connector.mcp_server_url;
  const key = `${connector.id}:${serverUrl}`;
  const cached = clientCache.get(key);
  if (cached && cached.token === accessToken && cached.expires > Date.now()) return cached.client;
  const client = new McpClient({ serverUrl, accessToken });
  await client.connect();
  clientCache.set(key, { client, token: accessToken, expires: Date.now() + CLIENT_CACHE_TTL_MS });
  return client;
}

/* ─── listAvailableTools ─── */

export interface ListToolsOptions { connectorId?: string; force?: boolean }

export async function listAvailableTools(
  userId: string,
  opts: ListToolsOptions = {},
): Promise<{ tools: Row[]; unavailable: Row[]; cached?: boolean }> {
  const cacheKey = opts.connectorId ? `${userId}:${opts.connectorId}` : userId;
  if (!opts.force) {
    const hit = toolsCache.get(cacheKey);
    if (hit && hit.expires > Date.now()) return { tools: hit.tools, unavailable: hit.unavailable, cached: true };
  }

  let query = db().from("user_connections").select(`
      id, connector_id, status, token_expires_at, access_token_encrypted, refresh_token_encrypted,
      connected_at, auth_mode, server_url_override,
      connectors!inner(id, slug, name, mcp_server_url, is_active)
    `)
    .eq("user_id", userId).eq("status", "connected");
  if (opts.connectorId) query = query.eq("connector_id", opts.connectorId);
  const { data, error } = await query;
  if (error) throw errors.internal(error.message);
  const connections = (data ?? []) as Array<ConnectionRow & { connectors: Row }>;

  const perConnection = await Promise.all(connections.map(async (connection) => {
    const connector = connection.connectors;
    if (!isConnectorActive(connector)) return { tools: [] as Row[], unavailable: [] as Row[] };
    try {
      const accessToken = await ensureFreshAccessToken(userId, connector as unknown as ConnectorRow, connection);
      const client = await getConnectedClient(connector as unknown as ConnectorRow, accessToken, connection.server_url_override);
      const tools = await client.listTools();
      return {
        tools: tools.map((t) => ({
          ...t,
          connector_id: connector.id,
          connector_slug: connector.slug,
          connector_name: connector.name,
        })),
        unavailable: [] as Row[],
      };
    } catch (err) {
      // One dead MCP server must not take down the whole tool list.
      if (err instanceof McpTransportError && (err.status === 401 || err.status === 403)) {
        await markConnectionExpired(userId, connection);
      }
      return {
        tools: [] as Row[],
        unavailable: [{
          connector_id: connector.id, connector_slug: connector.slug,
          error: err instanceof Error ? err.message : String(err),
        }],
      };
    }
  }));

  // Merge across connectors; same-named tools dedupe to the first
  // (oldest-connection) provider with the duplicates recorded in `sources`.
  const byName = new Map<string, Row>();
  for (const { tools } of perConnection) {
    for (const tool of tools) {
      const name = String(tool.name);
      const existing = byName.get(name);
      if (!existing) byName.set(name, { ...tool, sources: [tool.connector_slug] });
      else if (Array.isArray(existing.sources) && !existing.sources.includes(tool.connector_slug)) {
        existing.sources.push(tool.connector_slug);
      }
    }
  }
  const merged = [...byName.values()];
  const unavailable = perConnection.flatMap((r) => r.unavailable);

  toolsCache.set(cacheKey, { tools: merged, unavailable, expires: Date.now() + TOOLS_CACHE_TTL_MS });
  return { tools: merged, unavailable };
}

/* ─── listConnectionResources ─── */

export interface ListResourcesOptions { connectorId?: string; force?: boolean }

/** MCP resources/list across the user's live connections. Servers that
 * don't implement the resources primitive contribute nothing (the MCP
 * client maps that to an empty list), and one dead server never fails
 * the whole response — same shape as listAvailableTools. */
export async function listConnectionResources(
  userId: string,
  opts: ListResourcesOptions = {},
): Promise<{ resources: Row[]; unavailable: Row[]; cached?: boolean }> {
  const cacheKey = opts.connectorId ? `${userId}:${opts.connectorId}` : userId;
  if (!opts.force) {
    const hit = resourcesCache.get(cacheKey);
    if (hit && hit.expires > Date.now()) return { resources: hit.resources, unavailable: hit.unavailable, cached: true };
  }

  let query = db().from("user_connections").select(`
      id, connector_id, status, token_expires_at, access_token_encrypted, refresh_token_encrypted,
      connected_at, auth_mode, server_url_override,
      connectors!inner(id, slug, name, mcp_server_url, is_active)
    `)
    .eq("user_id", userId).eq("status", "connected");
  if (opts.connectorId) query = query.eq("connector_id", opts.connectorId);
  const { data, error } = await query;
  if (error) throw errors.internal(error.message);
  const connections = (data ?? []) as Array<ConnectionRow & { connectors: Row }>;

  /** Bound the payload — resource enumerations can be large. */
  const PER_CONNECTION_CAP = 200;

  const perConnection = await Promise.all(connections.map(async (connection) => {
    const connector = connection.connectors;
    if (!isConnectorActive(connector)) return { resources: [] as Row[], unavailable: [] as Row[] };
    try {
      const accessToken = await ensureFreshAccessToken(userId, connector as unknown as ConnectorRow, connection);
      const client = await getConnectedClient(connector as unknown as ConnectorRow, accessToken, connection.server_url_override);
      const items = (await client.listResources()).slice(0, PER_CONNECTION_CAP);
      return {
        resources: items.map((r) => ({
          uri: String(r.uri ?? ""),
          name: typeof r.name === "string" ? r.name : "",
          description: typeof r.description === "string" ? r.description : "",
          mime_type: typeof r.mimeType === "string" ? r.mimeType : null,
          connector_id: connector.id,
          connector_slug: connector.slug,
          connector_name: connector.name,
        })).filter((r) => r.uri),
        unavailable: [] as Row[],
      };
    } catch (err) {
      if (err instanceof McpTransportError && (err.status === 401 || err.status === 403)) {
        await markConnectionExpired(userId, connection);
      }
      return {
        resources: [] as Row[],
        unavailable: [{
          connector_id: connector.id, connector_slug: connector.slug,
          error: err instanceof Error ? err.message : String(err),
        }],
      };
    }
  }));

  const resources = perConnection.flatMap((r) => r.resources);
  const unavailable = perConnection.flatMap((r) => r.unavailable);
  resourcesCache.set(cacheKey, { resources, unavailable, expires: Date.now() + TOOLS_CACHE_TTL_MS });
  return { resources, unavailable };
}

/* ─── callTool ─── */

export async function callTool(
  userId: string,
  connectorIdOrSlug: string,
  toolName: string,
  args: Record<string, unknown> = {},
): Promise<{ tool: string; connector: string; result: McpCallResult; duration_ms: number }> {
  if (!toolName.trim()) throw errors.validation("tool is required.");
  const connector = await resolveConnector(connectorIdOrSlug);

  const { data: conn, error: connErr } = await db().from("user_connections").select("*")
    .eq("user_id", userId).eq("connector_id", connector.id).eq("status", "connected").maybeSingle();
  if (connErr) throw errors.internal(connErr.message);
  if (!conn) {
    throw new PlatformError(404, "CONNECTION_REQUIRED", `Connect ${connector.name} before calling its tools.`);
  }
  const connection = conn as ConnectionRow;

  // ── Per-user, per-connector fixed-window rate limit (atomic RPC). ──
  const { windowStart } = currentRateWindow();
  const { data: count, error: rlErr } = await db().rpc("consume_connector_rate_limit", {
    p_user_id: userId,
    p_connector_id: connector.id,
    p_window_start: windowStart.toISOString(),
  });
  if (rlErr) console.error("[connector-gateway] rate limit RPC failed:", rlErr.message); // fail-open, like api-v1
  else if (Number(count) > connector.call_rate_limit) {
    throw new PlatformError(429, "RATE_LIMITED",
      `Rate limit of ${connector.call_rate_limit} calls/minute exceeded for ${connector.name}.`,
      { limit: connector.call_rate_limit, retry_after_seconds: 60 });
  }

  // ── Scope gate: tool_scope_map names the OAuth scopes a tool needs.
  // Token/API-key connections skip it — the token's server-side ACL is
  // the boundary, and granted_scopes is empty by design. ──
  const requiredScopes = connection.auth_mode === "token"
    ? []
    : Array.isArray((connector.tool_scope_map ?? {})[toolName])
      ? ((connector.tool_scope_map ?? {})[toolName] as unknown[]).map(String)
      : [];
  const granted = new Set(connection.granted_scopes ?? []);
  const missing = requiredScopes.filter((s) => !granted.has(s));
  if (missing.length) {
    throw errors.forbidden(`${toolName} requires scopes you did not grant: ${missing.join(", ")}.`, { missing_scopes: missing });
  }

  const startedAt = Date.now();
  let result: McpCallResult;
  try {
    const accessToken = await ensureFreshAccessToken(userId, connector, connection);
    const client = await getConnectedClient(connector, accessToken, connection.server_url_override);
    result = await client.callTool(toolName, args);
  } catch (err) {
    await logToolCall(userId, connector, connection, toolName, "failure",
      err instanceof Error ? err.message : String(err), Date.now() - startedAt);
    if (err instanceof McpTransportError && (err.status === 401 || err.status === 403)) {
      await markConnectionExpired(userId, connection);
      throw new PlatformError(401, "CONNECTION_EXPIRED", `${connector.name} rejected the access token — reconnect it.`);
    }
    throw err;
  }

  const durationMs = Date.now() - startedAt;
  await logToolCall(userId, connector, connection, toolName,
    result.isError === true ? "failure" : "success",
    result.isError === true ? flattenToolError(result) : null, durationMs);

  await db().from("user_connections").update({ last_used_at: new Date().toISOString() })
    .eq("user_id", userId).eq("id", connection.id);
  if (connection.status === "expired") {
    await db().from("user_connections").update({ status: "connected" })
      .eq("user_id", userId).eq("id", connection.id);
  }
  if (Math.random() < 0.05) {
    await db().rpc("prune_connector_rate_limits").then(undefined, () => {});
  }
  return { tool: toolName, connector: connector.slug, result, duration_ms: durationMs };
}

/** Audit row for every tool call — user, connector, tool, timestamp,
 * success/failure (spec: main-DB audit trail). Never fails the call. */
async function logToolCall(
  userId: string, connector: ConnectorRow, connection: ConnectionRow,
  toolName: string, status: "success" | "failure", error: string | null, durationMs: number,
): Promise<void> {
  try {
    await db().from("connector_call_logs").insert({
      user_id: userId, connector_id: connector.id, connection_id: connection.id,
      tool_name: toolName, status, error, duration_ms: durationMs,
    });
  } catch (err) {
    console.error("[connector-gateway] audit write failed:", err);
  }
}

function flattenToolError(result: McpCallResult): string {
  const text = (result.content ?? [])
    .filter((c) => c.type === "text" && typeof c.text === "string")
    .map((c) => c.text).join("; ");
  return text.slice(0, 500) || "Tool reported an error.";
}

/* ─── Connection lifecycle ─── */

export async function revokeConnection(userId: string, connectionId: string): Promise<Row> {
  const { data } = await db().from("user_connections").select("*")
    .eq("user_id", userId).eq("id", connectionId).maybeSingle();
  if (!data) throw errors.notFound("Connection");
  const connection = data as ConnectionRow;
  const connector = await resolveConnector(String(connection.connector_id));

  // Best-effort RFC 7009 revocation at the provider; local revocation
  // below is the source of truth and must happen either way.
  if (connection.access_token_encrypted) {
    try {
      const { clientId, clientSecret, cfg } = await resolveOAuthClient(connector, null);
      const revocationEndpoint = typeof cfg.revocation_endpoint === "string" ? cfg.revocation_endpoint : "";
      if (revocationEndpoint) {
        await postForm(revocationEndpoint, {
          token: await decryptSecret(connection.access_token_encrypted, TOKEN_KEY_ENV),
        }, { clientId, clientSecret, cfg });
      }
    } catch (err) {
      console.error(`[connector-gateway] provider revocation failed (${connector.slug}):`, err);
    }
  }

  const patch = {
    status: "revoked", revoked_at: new Date().toISOString(),
    access_token_encrypted: null, refresh_token_encrypted: null, token_hint: null,
  };
  const { error } = await db().from("user_connections").update(patch)
    .eq("user_id", userId).eq("id", connectionId);
  if (error) throw errors.internal(error.message);
  await audit({ userId, action: "connector.revoked", resource: "connector", resourceId: connector.slug, surface: "oauth" });
  bustUserCaches(userId, connector.id);
  return { revoked: true, id: connectionId, verification: (await verifyPersisted(userId, "user_connections", connectionId, { status: "revoked" })).status };
}

/* ─── Listings (token columns are never selected) ─── */

export async function listConnectors(): Promise<{ connectors: Row[] }> {
  const { data, error } = await db().from("connectors").select(
    "id,slug,name,description,publisher,icon_url,default_scopes,auth_modes,call_rate_limit",
  ).eq("is_active", true).order("name");
  if (error) throw errors.internal(error.message);
  return { connectors: data ?? [] };
}

export async function listConnections(userId: string): Promise<{ connections: Row[] }> {
  const { data, error } = await db().from("user_connections").select(`
      id, connector_id, status, auth_mode, server_url_override, label,
      external_account_label, granted_scopes, token_hint,
      connected_at, last_used_at, revoked_at,
      connectors(slug, name, icon_url)
    `)
    .eq("user_id", userId).order("connected_at", { ascending: false });
  if (error) throw errors.internal(error.message);
  return { connections: data ?? [] };
}

/* ─── External Resource Resolution & Multi-Account Selection ─────────── */

import { fetchGitHubResource } from "./github-adapter.ts";

export async function resolveExternalResource(
  userId: string | null,
  rawUrl: string,
  preferredAccountId?: string,
): Promise<{
  state: string;
  resource?: any;
  errorMessage?: string;
  accessibleAccounts?: Array<{ id: string; label: string; username: string }>;
  selectedAccountId?: string;
}> {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { state: "malformed_url", errorMessage: "Missing or invalid URL." };
  }

  const trimmed = rawUrl.trim();
  const ghPrMatch = trimmed.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/i);
  const ghIssueMatch = trimmed.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/issues\/(\d+)/i);
  const ghCommitMatch = trimmed.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/commit\/([0-9a-fA-F]{7,40})/i);
  const ghReleaseMatch = trimmed.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/releases\/tag\/([^\/?#]+)/i);
  const ghBlobMatch = trimmed.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.+)/i);
  const ghRepoMatch = trimmed.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/?#]+)\/?$/i);

  if (ghPrMatch || ghIssueMatch || ghCommitMatch || ghReleaseMatch || ghBlobMatch || ghRepoMatch) {
    let resourceType: "pull_request" | "issue" | "commit" | "release" | "file" | "repository" = "repository";
    let params: Record<string, string> = {};

    if (ghPrMatch) {
      resourceType = "pull_request";
      params = { owner: ghPrMatch[1], repo: ghPrMatch[2], number: ghPrMatch[3] };
    } else if (ghIssueMatch) {
      resourceType = "issue";
      params = { owner: ghIssueMatch[1], repo: ghIssueMatch[2], number: ghIssueMatch[3] };
    } else if (ghCommitMatch) {
      resourceType = "commit";
      params = { owner: ghCommitMatch[1], repo: ghCommitMatch[2], sha: ghCommitMatch[3] };
    } else if (ghReleaseMatch) {
      resourceType = "release";
      params = { owner: ghReleaseMatch[1], repo: ghReleaseMatch[2], tag: ghReleaseMatch[3] };
    } else if (ghBlobMatch) {
      resourceType = "file";
      params = { owner: ghBlobMatch[1], repo: ghBlobMatch[2], ref: ghBlobMatch[3], path: ghBlobMatch[4].split(/[#?]/)[0] };
    } else if (ghRepoMatch) {
      resourceType = "repository";
      params = { owner: ghRepoMatch[1], repo: ghRepoMatch[2] };
    }

    // Look up user's active GitHub connections if userId provided
    let userConnections: ConnectionRow[] = [];
    if (userId) {
      const { data: conns } = await db().from("user_connections")
        .select("*, connectors!inner(slug)")
        .eq("user_id", userId)
        .eq("status", "connected")
        .eq("connectors.slug", "github");
      userConnections = (conns ?? []) as ConnectionRow[];
    }

    const accessibleAccounts: Array<{ id: string; label: string; username: string }> = userConnections.map((c) => ({
      id: String(c.id),
      label: String(c.label || c.external_account_label || "GitHub Account"),
      username: String(c.external_account_label || "GitHub"),
    }));

    // If preferred connection ID given, sort it first
    if (preferredAccountId) {
      userConnections.sort((a, b) => (a.id === preferredAccountId ? -1 : b.id === preferredAccountId ? 1 : 0));
    }

    // If user has connected accounts, iterate through them
    if (userConnections.length > 0) {
      for (const conn of userConnections) {
        let token: string | null = null;
        try {
          if (conn.access_token_encrypted) {
            token = await decryptSecret(conn.access_token_encrypted, TOKEN_KEY_ENV);
          }
        } catch {
          continue;
        }
        if (!token) continue;

        const result = await fetchGitHubResource(token, resourceType, params);
        if (result.resource) {
          return {
            state: "success",
            resource: result.resource,
            accessibleAccounts,
            selectedAccountId: conn.id,
          };
        }
      }

      // If all connected accounts failed with 404/403, try public unauthenticated
      const publicResult = await fetchGitHubResource(null, resourceType, params);
      if (publicResult.resource) {
        return {
          state: "success",
          resource: publicResult.resource,
          accessibleAccounts,
        };
      }

      return {
        state: "access_denied",
        errorMessage: "You are connected to GitHub, but this account cannot access this resource.",
        accessibleAccounts,
      };
    }

    // If no user connections, attempt public GitHub fetch
    const publicResult = await fetchGitHubResource(null, resourceType, params);
    if (publicResult.resource) {
      return {
        state: "success",
        resource: publicResult.resource,
        accessibleAccounts: [],
      };
    }

    // Public request failed (404/403/rate limit)
    if (publicResult.errorStatus === 404 || publicResult.errorStatus === 403 || publicResult.errorStatus === 401) {
      return {
        state: "auth_required",
        errorMessage: "Connect to GitHub to view this resource.",
        accessibleAccounts: [],
      };
    }

    return {
      state: "not_found",
      errorMessage: publicResult.errorMessage || "Resource not found on GitHub.",
      accessibleAccounts: [],
    };
  }

  return { state: "unsupported_resource", errorMessage: "Unsupported external resource URL." };
}

