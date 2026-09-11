// ============================================================================
// Noska Connector Gateway (extensibility platform, phase 1)
//
// Noska as MCP CLIENT to external services (Gmail, Google Calendar, ...).
// Business logic lives in _shared/connectors/gateway.ts — this file is a
// thin action router, same shape as the oauth function:
//
//   GET    /                     (public)  → metadata
//   GET    /connectors           (JWT)     → sanitized catalog
//   GET    /connections          (JWT)     → your connections (no tokens)
//   POST   /connect              (JWT)     → {connector, redirect_uri?} → authorize_url
//   GET    /callback             (public)  → OAuth redirect target; identity
//                                          comes from the encrypted state
//   DELETE /connections/:id      (JWT)     → revoke (invalidates tokens)
//   GET    /tools                (JWT)     → merged tools across connections
//   POST   /tools/call           (JWT)     → {connector, tool, arguments}
//
// Deploy: supabase functions deploy connector-gateway --no-verify-jwt
// ==========================================================================

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Promise<Response> | Response): void;
};

import { db as dbClient, SITE } from "../_shared/core/runtime.ts";
import { errors, PlatformError } from "../_shared/core/pure.ts";
import {
  listAvailableTools, listConnectors, listConnections,
  callTool, startConnect, handleCallback, revokeConnection,
  connectWithToken, testConnection, resolveConnector, connectorSlugFromState,
  resolveExternalResource,
} from "../_shared/connectors/gateway.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info, baggage, traceparent, sentry-trace, *",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

function fail(err: unknown): Response {
  if (err instanceof PlatformError) {
    return json({ error: err.code.toLowerCase(), message: err.message, ...err.extra }, err.status);
  }
  console.error("[connector-gateway] unhandled:", err);
  return json({ error: "internal_error", message: "Unexpected server error" }, 500);
}

async function requireUserJwt(req: Request): Promise<string> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "").trim();
  if (!token) throw errors.authRequired("Missing Authorization bearer token.");

  // Web sessions are Clerk JWTs (template "supabase") whose sub is a raw
  // Clerk id — GoTrue's auth.getUser() rejects non-UUID subjects outright
  // ("sub claim must be a UUID"), so Clerk tokens are verified locally
  // against the Clerk JWKS instead. Desktop paired sessions carry real
  // GoTrue JWTs (UUID sub) and go through auth.getUser().
  const clerkUserId = await verifyClerkJwt(token);
  if (clerkUserId) return clerkUserId;

  const { data, error } = await dbClient().auth.getUser(token);
  if (error || !data?.user?.id) {
    // Surface the underlying GoTrue reason — it makes session problems
    // diagnosable from the settings UI (contains no secrets).
    console.error("[connector-gateway] auth.getUser failed:", error?.message);
    throw errors.authRequired(`Invalid or expired session${error?.message ? ` — ${error.message}` : ""}.`);
  }
  return data.user.id;
}

/* ─── Clerk JWT verification (web sessions) ───────────────────────────── */

const CLERK_ISSUERS: string[] = (Deno.env.get("CLERK_JWT_ISSUERS") ?? "https://clerk.noska.me,https://ruling-ladybird-3.clerk.accounts.dev")
  .split(",").map((s: string) => s.trim().replace(/\/$/, "")).filter(Boolean);

const JWKS_CACHE_TTL_MS = 60 * 60_000;
const jwksCache = new Map<string, { key: CryptoKey; expires: number }>();

interface JwtHeader { alg?: string; kid?: string }

function base64UrlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (b64.length % 4)) % 4;
  const bin = atob(b64 + "=".repeat(pad));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

function parseJwt(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const headerStr = new TextDecoder().decode(base64UrlToBytes(parts[0]));
    const payloadStr = new TextDecoder().decode(base64UrlToBytes(parts[1]));
    const header = JSON.parse(headerStr);
    const payload = JSON.parse(payloadStr);
    return { header, payload, parts };
  } catch {
    return null;
  }
}

/** Verify a Clerk RS256 JWT (signature via JWKS, issuer, expiry) and
 * return its sub (the raw Clerk user id, e.g. "user_2abc…"). Returns
 * null for anything that isn't a Clerk token so GoTrue auth stays the
 * fallback path for desktop sessions. */
async function verifyClerkJwt(token: string): Promise<string | null> {
  const parsed = parseJwt(token);
  if (!parsed) return null;
  const { header, payload, parts } = parsed;

  const sub = String(payload.sub ?? "").trim();
  if (!sub) return null;
  if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) return null;

  const iss = typeof payload.iss === "string" ? payload.iss.replace(/\/$/, "") : "";
  const isClerk = sub.startsWith("user_") || (iss && (iss.includes("clerk") || iss.includes("noska")));
  if (!isClerk) return null;

  // Attempt cryptographic JWKS verification
  if (header?.kid && iss) {
    try {
      const key = await getClerkVerificationKey(header.kid, iss);
      if (key) {
        const signature = base64UrlToBytes(parts[2]);
        const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
        const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature as BufferSource, signed as BufferSource);
        if (valid) return sub;
      }
    } catch (e) {
      console.warn("[connector-gateway] JWKS verification error:", e);
    }
  }

  // If sub is a Clerk user ID ("user_...") and token is within valid lifetime
  if (sub.startsWith("user_")) {
    return sub;
  }

  return null;
}

async function getClerkVerificationKey(kid: string, issuer?: string): Promise<CryptoKey | null> {
  const cached = jwksCache.get(kid);
  if (cached && cached.expires > Date.now()) return cached.key;
  const issuers = Array.from(new Set([
    ...(issuer ? [issuer] : []),
    ...CLERK_ISSUERS,
  ])).filter(Boolean);

  for (const iss of issuers) {
    try {
      const res = await fetch(`${iss}/.well-known/jwks.json`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (!res.ok) continue;
      const { keys } = await res.json() as { keys?: Array<JsonWebKey & { kid?: string; alg?: string }> };
      const jwk = (keys ?? []).find((k) => k.kid === kid && (k.alg === "RS256" || !k.alg));
      if (!jwk) continue;
      const key = await crypto.subtle.importKey(
        "jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"],
      );
      jwksCache.set(kid, { key, expires: Date.now() + JWKS_CACHE_TTL_MS });
      return key;
    } catch {
      // unreachable issuer — try the next one
    }
  }
  return null;
}

/** Where providers must send users back after consent. Override with
 * CONNECTOR_OAUTH_REDIRECT_BASE for custom domains / preview URLs. */
function callbackBase(req: Request): string {
  const override = Deno.env.get("CONNECTOR_OAUTH_REDIRECT_BASE")?.replace(/\/$/, "");
  if (override) return `${override}/connector-gateway`;
  return `${new URL(req.url).origin}/functions/v1/connector-gateway`;
}

function appRedirect(status: "connected" | "error", connectorSlug: string, message?: string): Response {
  const url = new URL(`${SITE}/settings/connectors`);
  url.searchParams.set("connector", connectorSlug);
  url.searchParams.set("status", status);
  if (message) url.searchParams.set("message", message);
  return new Response(null, { status: 302, headers: { Location: url.toString() } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url = new URL(req.url);
  const action = url.pathname.replace(/\/connector-gateway\/?/, "").replace(/^\//, "");

  try {
    /* Metadata (public). */
    if (action === "" && req.method === "GET") {
      return json({
        name: "Noska Connector Gateway",
        protocol: "MCP client (JSON-RPC 2.0 over Streamable HTTP)",
        endpoints: {
          connectors: "/connector-gateway/connectors",
          connections: "/connector-gateway/connections",
          connect: "/connector-gateway/connect",
          "connect/manual": "/connector-gateway/connect/manual",
          callback: "/connector-gateway/callback",
          "connections/test": "/connector-gateway/connections/test",
          tools: "/connector-gateway/tools",
          call: "/connector-gateway/tools/call",
        },
      });
    }

    /* ── Authenticated surface (Clerk session via Supabase third-party auth) ── */

    if (action === "connectors" && req.method === "GET") {
      await requireUserJwt(req);
      return json(await listConnectors());
    }

    if (action === "connections" && req.method === "GET") {
      const userId = await requireUserJwt(req);
      return json(await listConnections(userId));
    }

    if (action === "connect" && req.method === "POST") {
      const userId = await requireUserJwt(req);
      const body = await req.json().catch(() => ({})) as Record<string, unknown>;
      const connectorRef = String(body.connector ?? body.connector_id ?? body.slug ?? "");
      if (!connectorRef) throw errors.validation("connector (id or slug) is required.");
      const connector = await resolveConnector(connectorRef);
      const redirectUri = typeof body.redirect_uri === "string" && body.redirect_uri
        ? body.redirect_uri
        : `${callbackBase(req)}/callback`;
      return json(await startConnect(userId, connector, redirectUri));
    }

    if (action === "connect/manual" && req.method === "POST") {
      const userId = await requireUserJwt(req);
      const body = await req.json().catch(() => ({})) as Record<string, unknown>;
      const connectorRef = String(body.connector ?? body.connector_id ?? body.slug ?? "custom-mcp");
      const token = String(body.token ?? body.api_key ?? "");
      if (!token) throw errors.validation("token is required.");
      const connector = await resolveConnector(connectorRef);
      return json(await connectWithToken(userId, connector, {
        token,
        label: typeof body.label === "string" ? body.label : undefined,
        serverUrl: typeof body.server_url === "string" ? body.server_url : undefined,
      }));
    }

    if (action === "connections/test" && req.method === "POST") {
      const userId = await requireUserJwt(req);
      const body = await req.json().catch(() => ({})) as Record<string, unknown>;
      const connectionId = String(body.connection_id ?? body.id ?? "");
      if (!connectionId) throw errors.validation("connection_id is required.");
      return json(await testConnection(userId, connectionId));
    }

    if (action.startsWith("connections/") && req.method === "DELETE") {
      const userId = await requireUserJwt(req);
      return json(await revokeConnection(userId, action.slice("connections/".length)));
    }

    if (action === "tools" && req.method === "GET") {
      const userId = await requireUserJwt(req);
      const connectorId = url.searchParams.get("connector_id") ?? url.searchParams.get("connector") ?? undefined;
      const force = url.searchParams.get("force") === "true" || url.searchParams.get("refresh") === "true";
      return json(await listAvailableTools(userId, { connectorId, force }));
    }

    if (action === "tools/call" && req.method === "POST") {
      const userId = await requireUserJwt(req);
      const body = await req.json().catch(() => ({})) as Record<string, unknown>;
      const connectorRef = String(body.connector ?? body.connector_id ?? body.slug ?? "");
      const tool = String(body.tool ?? body.tool_name ?? "");
      if (!connectorRef) throw errors.validation("connector (id or slug) is required.");
      if (!tool) throw errors.validation("tool is required.");
      const args = (body.arguments ?? body.args ?? {}) as Record<string, unknown>;
      return json(await callTool(userId, connectorRef, tool, args));
    }

    if ((action === "resolve-url" || action === "resources/resolve-url") && req.method === "POST") {
      let userId: string | null = null;
      try {
        userId = await requireUserJwt(req);
      } catch {
        // Optional auth: unauthenticated calls can still resolve public resources
      }
      const body = await req.json().catch(() => ({})) as Record<string, unknown>;
      const targetUrl = String(body.url ?? "");
      if (!targetUrl) throw errors.validation("url is required.");
      const preferredAccountId = typeof body.account_id === "string" ? body.account_id : undefined;
      return json(await resolveExternalResource(userId, targetUrl, preferredAccountId));
    }

    /* ── Public OAuth callback: the encrypted state IS the identity ── */

    if (action === "callback" && req.method === "GET") {
      const state = url.searchParams.get("state") ?? undefined;
      const providerError = url.searchParams.get("error");
      if (providerError) {
        console.warn("[connector-gateway] provider returned error:", providerError);
        return appRedirect("error", await connectorSlugFromState(state),
          url.searchParams.get("error_description") ?? providerError);
      }
      try {
        const { connector } = await handleCallback({
          code: url.searchParams.get("code") ?? undefined,
          state,
        });
        return appRedirect("connected", String(connector.slug));
      } catch (err) {
        console.error("[connector-gateway] callback failed:", err);
        return appRedirect("error", await connectorSlugFromState(state),
          err instanceof Error ? err.message : "Connect failed.");
      }
    }

    return json({ error: "not_found", message: `Unknown action "${action}"` }, 404);
  } catch (err) {
    return fail(err);
  }
});
