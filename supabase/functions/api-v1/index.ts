// ============================================================================
// Noska API v1 — the universal programmatic interface (Platform V5)
//
// Deploy WITHOUT Supabase JWT verification — requests authenticate with
// Noska API keys (`Authorization: Bearer nsk_…`):
//
//   supabase functions deploy api-v1 --no-verify-jwt
//
// Architecture note (V5): this file contains NO business logic. Every route
// is a thin adapter over the canonical capability layer in
// supabase/functions/_shared/capabilities/* — the SAME implementation MCP,
// the agent runtime and automations use. Adapters only translate between
// HTTP envelopes and capability results.
//
// Security model:
//   * Keys stored as SHA-256 hashes (user_api_keys table).
//   * Every capability call is owner-scoped internally — ids from request
//     input are never trusted without ownership checks (IDOR-safe).
//   * Scopes gate each route+method (least privilege).
//   * Fixed-window rate limiting per key via consume_api_rate_limit RPC,
//     surfaced through standard X-RateLimit-* headers.
//   * Structured errors: { "error": { "code", "message" } }.
//   * Idempotency-Key replay cache (24h) on POST endpoints.
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";
import {
  authenticateKey, touchKey, audit as auditEvent, PlatformError, type KeyRow,
} from "../_shared/core/runtime.ts";
import { keyHasScope as keyHasScopeOf, readOnlyBlocksMethod } from "../_shared/core/pure.ts";
import * as content from "../_shared/capabilities/content.ts";
import * as platform from "../_shared/capabilities/platform.ts";
import * as intel from "../_shared/capabilities/intelligence.ts";

/* Service client for housekeeping (rate limiting + idempotency replay). */
const svc = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

const API_VERSION = "2026-08-24";
const RATE_LIMIT_PER_MINUTE = 60;
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

/* ─── Scopes ─── */

export const SCOPES = [
  // content (V1 names preserved; learning:* accepted as alias of reviews:*)
  "pages:read",
  "pages:write",
  "databases:read",
  "databases:write",
  "tasks:read",
  "tasks:write",
  "reviews:read",
  "reviews:write",
  "search:read",
  // platform V5
  "workspaces:read",
  "workspaces:write",
  "templates:read",
  "templates:write",
  "dashboards:read",
  "dashboards:write",
  "events:read",
  // intelligence
  "agents:read",
  "agents:write",
  "agents:run",
  "automations:read",
  "automations:write",
  "automations:run",
  // delivery & integrations
  "webhooks:manage",
  "connections:manage",
  // forward-compat: MCP execution scope (no REST route uses it yet)
  "intelligence:execute",
] as const;

type Scope = (typeof SCOPES)[number];

/* ─── Errors ─── */

class ApiError extends Error {
  status: number;
  code: string;
  extra: Record<string, unknown>;
  constructor(status: number, code: string, message: string, extra: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

/** Map capability-layer errors onto the stable HTTP error contract. */
function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof PlatformError) {
    return new ApiError(err.status, err.code.toLowerCase(), err.message, err.extra);
  }
  throw err; // rethrow unknowns to the top-level handler
}

function errorResponse(err: ApiError, headers: Record<string, string>) {
  return new Response(JSON.stringify({ error: { code: err.code, message: err.message, ...err.extra } }), {
    status: err.status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

/* ─── CORS ─── */

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Idempotency-Key, baggage, traceparent, sentry-trace",
    "Access-Control-Expose-Headers": "X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Idempotency-Replayed",
    "Content-Type": "application/json",
    "X-Noska-API-Version": API_VERSION,
  };
}

function allowedOrigin(origin: string): string {
  if (!origin) return "https://app.noska.me";
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  if (/^https:\/\/([\w-]+\.)?noska\.me$/.test(origin)) return origin;
  return "https://app.noska.me";
}

function getOrigin(req: Request): string {
  return allowedOrigin(req.headers.get("origin") || req.headers.get("referer") || "");
}

/* ─── Rate limiting ─── */

async function rateLimitHeaders(key: KeyRow): Promise<Record<string, string>> {
  const windowStart = new Date(Math.floor(Date.now() / 60000) * 60000);
  const { data, error } = await svc.rpc("consume_api_rate_limit", {
    p_api_key_id: key.id,
    p_window_start: windowStart.toISOString(),
  });
  if (error) {
    // Fail open on limiter errors rather than taking the API down; log loudly.
    console.error("[api-v1] rate-limit rpc failed:", error.message);
    return {};
  }
  const count = Number(data ?? 0);
  const reset = Math.ceil(windowStart.getTime() / 1000) + 60;
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(RATE_LIMIT_PER_MINUTE),
    "X-RateLimit-Remaining": String(Math.max(0, RATE_LIMIT_PER_MINUTE - count)),
    "X-RateLimit-Reset": String(reset),
  };
  if (count > RATE_LIMIT_PER_MINUTE) {
    throw Object.assign(new ApiError(429, "rate_limited", "Rate limit exceeded. Retry after the current window resets.", {
      limit: RATE_LIMIT_PER_MINUTE,
      window: "1 minute",
      retry_after_seconds: Math.max(1, reset - Math.floor(Date.now() / 1000)),
    }), { rateHeaders: headers });
  }
  return headers;
}

/* ─── Helpers ─── */

function parseListParams(url: URL) {
  const limitRaw = parseInt(url.searchParams.get("limit") ?? "25", 10);
  const offsetRaw = parseInt(url.searchParams.get("offset") ?? "0", 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 25;
  const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;
  return { limit, offset };
}

function requireJsonBody(req: Request): Promise<Record<string, unknown>> {
  return req.json().then(
    (body) => {
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new ApiError(400, "invalid_request", "Request body must be a JSON object.");
      }
      return body as Record<string, unknown>;
    },
    () => {
      throw new ApiError(400, "invalid_request", "Request body is not valid JSON.");
    },
  );
}

function mapPage(row: Record<string, unknown>, opts: { withBlocks?: boolean } = {}) {
  const out: Record<string, unknown> = {
    object: "page",
    id: row.id,
    title: row.title,
    icon: row.icon,
    cover: row.cover,
    parent_id: row.parent_id,
    workspace_id: row.workspace_id ?? "",
    favorite: row.favorite,
    trashed: row.trashed,
    tags: row.tags ?? [],
    hidden_from_recents: row.hidden_from_recents ?? false,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  if (opts.withBlocks) out.blocks = row.blocks ?? [];
  return out;
}

/* ─── Idempotency (POST endpoints, 24h replay cache) ─── */

interface CachedIdem {
  response_status: number;
  response_body: unknown;
  created_at: string;
}

async function lookupIdempotent(key: KeyRow, idemKey: string): Promise<CachedIdem | null> {
  const { data } = await svc
    .from("api_idempotency_keys")
    .select("response_status,response_body,created_at")
    .eq("api_key_id", key.id)
    .eq("idempotency_key", idemKey)
    .maybeSingle();
  if (!data) return null;
  if (Date.now() - new Date(data.created_at).getTime() > IDEMPOTENCY_TTL_MS) return null;
  return data as CachedIdem;
}

async function storeIdempotent(key: KeyRow, idemKey: string, endpoint: string, status: number, body: unknown): Promise<void> {
  // Best-effort: a failed insert must never fail the live request.
  try {
    await svc.from("api_idempotency_keys").upsert(
      { api_key_id: key.id, idempotency_key: idemKey, endpoint, response_status: status, response_body: body },
      { onConflict: "api_key_id,idempotency_key" },
    );
  } catch {
    /* ignore */
  }
}

async function pruneHousekeeping(): Promise<void> {
  try {
    await svc.from("api_idempotency_keys").delete()
      .lt("created_at", new Date(Date.now() - IDEMPOTENCY_TTL_MS).toISOString());
    await svc.rpc("prune_api_rate_limits");
  } catch {
    /* ignore */
  }
}

/** Housekeeping is sampled (~2% of requests) so every POST doesn't pay
 * for two extra DB round-trips. Idempotency TTL is enforced on read
 * anyway (lookupIdempotent checks created_at), so deferred pruning is safe. */
function maybePruneHousekeeping(): void {
  try {
    if (Math.random() < 0.02) pruneHousekeeping();
  } catch {
    /* ignore */
  }
}

/* ─── Route handlers ─── */

type Handler = (ctx: {
  req: Request;
  url: URL;
  key: KeyRow;
  pathParts: string[];
  method: string;
}) => Promise<{ body: unknown; status?: number }>;

const routes: Array<{ method: string; pattern: RegExp; scope: Scope; handler: Handler }> = [
  // ══ Pages ══
  {
    method: "GET",
    pattern: /^pages$/,
    scope: "pages:read",
    handler: async ({ url, key }) => {
      const { limit, offset } = parseListParams(url);
      const trashed = url.searchParams.get("trashed");
      const favorite = url.searchParams.get("favorite");
      const sort = url.searchParams.get("sort") ?? "-updated_at";

      const result = await content.pages.list(key.user_id, {
        trashed: trashed === "true" ? true : trashed === "false" ? false : false,
        limit: 500,
      });
      let rows = (result.pages as Array<Record<string, unknown>>).map((p) => mapPage(p));
      if (favorite === "true") rows = rows.filter((r) => r.favorite === true);
      const desc = sort.startsWith("-");
      const col: string = desc ? sort.slice(1) : sort;
      const allowedCols = ["updated_at", "created_at", "title"];
      const sortCol = allowedCols.includes(col) ? col : "updated_at";
      rows.sort((a, b) => {
        const av = String(a[sortCol] ?? "");
        const bv = String(b[sortCol] ?? "");
        return desc ? bv.localeCompare(av) : av.localeCompare(bv);
      });
      const slice = rows.slice(offset, offset + limit);
      return {
        body: {
          data: slice,
          meta: { limit, offset, has_more: offset + limit < rows.length },
        },
      };
    },
  },
  {
    method: "POST",
    pattern: /^pages$/,
    scope: "pages:write",
    handler: async ({ req, url, key }) => {
      const body = await requireJsonBody(req);
      const created = await content.pages.create(key.user_id, body, {
        workspaceId: platform.resolveWorkspaceId(key, url.searchParams.get("workspace_id")),
      });
      return { body: { data: mapPage(created, { withBlocks: true }) }, status: 201 };
    },
  },
  {
    method: "GET",
    pattern: /^pages\/[\w-]+$/,
    scope: "pages:read",
    handler: async ({ pathParts, key }) => {
      const page = await content.pages.get(key.user_id, pathParts[1]);
      return { body: { data: mapPage(page, { withBlocks: true }) } };
    },
  },
  {
    method: "PATCH",
    pattern: /^pages\/[\w-]+$/,
    scope: "pages:write",
    handler: async ({ req, pathParts, key }) => {
      const body = await requireJsonBody(req);
      if (Object.keys(body).length === 0) {
        throw new ApiError(400, "invalid_request", "No updatable fields provided. See docs for the page schema.");
      }
      await content.pages.update(key.user_id, pathParts[1], body);
      const page = await content.pages.get(key.user_id, pathParts[1]);
      return { body: { data: mapPage(page, { withBlocks: true }) } };
    },
  },
  {
    method: "DELETE",
    pattern: /^pages\/[\w-]+$/,
    scope: "pages:write",
    handler: async ({ pathParts, key }) => {
      await content.pages.archive(key.user_id, pathParts[1]);
      return { body: { data: { id: pathParts[1], object: "page", deleted: true, trashed: true } } };
    },
  },

  // ══ Blocks ══
  {
    method: "GET",
    pattern: /^blocks$/,
    scope: "pages:read",
    handler: async ({ url, key }) => {
      const pageId = url.searchParams.get("page_id");
      if (!pageId) throw new ApiError(400, "invalid_request", "The page_id query parameter is required.");
      const page = await content.pages.get(key.user_id, pageId);
      const blocks = ((page.blocks ?? []) as Array<Record<string, unknown>>);
      const type = url.searchParams.get("type");
      const filtered = type ? blocks.filter((b) => b.type === type) : blocks;
      return { body: { data: filtered, meta: { page_id: page.id, count: filtered.length } } };
    },
  },

  // ══ Databases (database blocks embedded in pages) ══
  {
    method: "GET",
    pattern: /^databases$/,
    scope: "databases:read",
    handler: async ({ url, key }) => {
      const { databases } = await content.databases.list(key.user_id);
      const { limit, offset } = parseListParams(url);
      const mapped = (databases as Array<Record<string, unknown>>).map((d) => ({
        object: "database",
        ...d,
      }));
      const slice = mapped.slice(offset, offset + limit);
      return {
        body: { data: slice, meta: { limit, offset, total: mapped.length, has_more: offset + limit < mapped.length } },
      };
    },
  },
  {
    method: "GET",
    pattern: /^databases\/[\w-]+$/,
    scope: "databases:read",
    handler: async ({ pathParts, key }) => {
      const { database } = await content.databases.get(key.user_id, pathParts[1]);
      return { body: { data: { object: "database", ...(database as Record<string, unknown>) } } };
    },
  },

  // ══ Tasks (todo blocks, rich V5 metadata) ══
  {
    method: "GET",
    pattern: /^tasks$/,
    scope: "tasks:read",
    handler: async ({ url, key }) => {
      const doneFilter = url.searchParams.get("done");
      const pageFilter = url.searchParams.get("page_id");
      const result = await content.tasks.list(key.user_id, {
        done: doneFilter === null ? undefined : doneFilter === "true",
        pageRef: pageFilter,
        limit: 100,
      });
      const tasks = result.tasks as Array<Record<string, unknown>>;
      const { limit, offset } = parseListParams(url);
      const slice = tasks.slice(offset, offset + limit);
      return {
        body: {
          data: slice.map((t) => ({ object: "task", ...t })),
          meta: { limit, offset, total: tasks.length, has_more: offset + limit < tasks.length },
        },
      };
    },
  },
  {
    method: "POST",
    pattern: /^tasks$/,
    scope: "tasks:write",
    handler: async ({ req, key }) => {
      const body = await requireJsonBody(req);
      if (typeof body.page_id !== "string") throw new ApiError(400, "invalid_request", "page_id is required.");
      const text = typeof body.text === "string" ? body.text.trim() : "";
      if (!text) throw new ApiError(400, "invalid_request", "text is required.");
      const { task, verified } = await content.tasks.create(key.user_id, body);
      return {
        body: { data: { object: "task", ...(task as Record<string, unknown>), verified } },
        status: 201,
      };
    },
  },
  {
    method: "PATCH",
    pattern: /^tasks\/[\w-]+$/,
    scope: "tasks:write",
    handler: async ({ req, pathParts, key }) => {
      const body = await requireJsonBody(req);
      const taskId = pathParts[1];
      const { task, verified } = await content.tasks.update(key.user_id, taskId, body);
      return { body: { data: { object: "task", ...(task as Record<string, unknown>), verified } } };
    },
  },

  // ══ Reviews (spaced repetition cards; learning:* aliases accepted) ══
  {
    method: "GET",
    pattern: /^reviews$/,
    scope: "reviews:read",
    handler: async ({ url, key }) => {
      const dueOnly = url.searchParams.get("due") === "true";
      const { cards } = await content.learning.listCards(key.user_id, { dueOnly });
      const nowIso = new Date().toISOString();
      const { limit, offset } = parseListParams(url);
      const mapped = (cards as Array<Record<string, unknown>>).map((c) => ({
        object: "review_card",
        block_id: c.block_id,
        page_id: c.page_id,
        page_title: c.page_title,
        front: c.front,
        state: {
          ease_factor: (c.state as Record<string, unknown>).easeFactor,
          interval: (c.state as Record<string, unknown>).interval,
          repetition: (c.state as Record<string, unknown>).repetition,
          next_review: (c.state as Record<string, unknown>).nextReview,
          last_review: (c.state as Record<string, unknown>).lastReview,
          suspended: (c.state as Record<string, unknown>).suspended,
        },
        due: !c.next_review || (c.next_review as string) <= nowIso,
      }));
      const slice = mapped.slice(offset, offset + limit);
      return { body: { data: slice, meta: { limit, offset, total: mapped.length, has_more: offset + limit < mapped.length } } };
    },
  },
  {
    method: "POST",
    pattern: /^reviews$/,
    scope: "reviews:write",
    handler: async ({ req, key }) => {
      const body = await requireJsonBody(req);
      if (typeof body.page_id !== "string" || typeof body.block_id !== "string") {
        throw new ApiError(400, "invalid_request", "page_id and block_id are required.");
      }
      // Preserve the V1 contract: scheduling an already-active card is a no-op.
      const page = await content.pages.get(key.user_id, body.page_id);
      const existingBlock = ((page.blocks ?? []) as Array<Record<string, unknown>>)
        .find((b) => b.id === body.block_id);
      if (!existingBlock) {
        throw new ApiError(404, "not_found", `Block ${body.block_id} was not found on page ${body.page_id}.`);
      }
      const existingReview = existingBlock.review as Record<string, unknown> | undefined;
      if (existingReview && existingReview.suspended !== true) {
        return {
          body: { data: { object: "review_card", block_id: body.block_id, page_id: body.page_id, already_scheduled: true, state: existingReview } },
        };
      }
      const { scheduled_count, verified } = await content.learning.addStudyCards(
        key.user_id, body.page_id, [body.block_id],
      );
      if (scheduled_count === 0) {
        throw new ApiError(404, "not_found", `Block ${String(body.block_id)} was not found on page ${body.page_id}.`);
      }
      return {
        body: { data: { object: "review_card", block_id: body.block_id, page_id: body.page_id, verified } },
        status: 201,
      };
    },
  },
  {
    method: "POST",
    pattern: /^reviews\/rate$/,
    scope: "reviews:write",
    handler: async ({ req, key }) => {
      const body = await requireJsonBody(req);
      if (typeof body.page_id !== "string" || typeof body.block_id !== "string") {
        throw new ApiError(400, "invalid_request", "page_id and block_id are required.");
      }
      const quality = Number(body.quality);
      if (![1, 2, 3, 4, 5].includes(quality)) {
        throw new ApiError(400, "invalid_request", "quality must be one of 1 (Again), 3 (Hard), 4 (Good), 5 (Easy) — 1–5 per SM-2.");
      }
      const { state } = await content.learning.rate(key.user_id, body.page_id, String(body.block_id), quality);
      return { body: { data: { object: "review_card", block_id: body.block_id, page_id: body.page_id, state } } };
    },
  },
  {
    method: "DELETE",
    pattern: /^reviews\/[\w-]+$/,
    scope: "reviews:write",
    handler: async ({ url, pathParts, key }) => {
      const pageId = url.searchParams.get("page_id");
      if (!pageId) throw new ApiError(400, "invalid_request", "The page_id query parameter is required.");
      await content.learning.removeCard(key.user_id, pageId, pathParts[1]);
      return { body: { data: { block_id: pathParts[1], removed: true } } };
    },
  },

  // ══ Search ══
  {
    method: "POST",
    pattern: /^search$/,
    scope: "search:read",
    handler: async ({ req, key }) => {
      const body = await requireJsonBody(req);
      const q = typeof body.query === "string" ? body.query.trim() : "";
      if (!q) throw new ApiError(400, "invalid_request", "query is required.");
      return { body: await runSearch(key, q, Number(body.limit) || 25) };
    },
  },
  {
    method: "GET",
    pattern: /^search$/,
    scope: "search:read",
    handler: async ({ url, key }) => {
      const q = (url.searchParams.get("q") ?? "").trim();
      if (!q) throw new ApiError(400, "invalid_request", "The q query parameter is required.");
      return { body: await runSearch(key, q, parseInt(url.searchParams.get("limit") ?? "25", 10) || 25) };
    },
  },

  // ══ Workspaces ══
  {
    method: "GET",
    pattern: /^workspaces$/,
    scope: "workspaces:read",
    handler: async ({ key }) => ({ body: { data: await platform.workspaces.list(key.user_id) } }),
  },
  {
    method: "POST",
    pattern: /^workspaces$/,
    scope: "workspaces:write",
    handler: async ({ req, key }) => {
      const body = await requireJsonBody(req);
      return { body: { data: await platform.workspaces.create(key.user_id, body) }, status: 201 };
    },
  },
  {
    method: "GET",
    pattern: /^workspaces\/[\w-]+$/,
    scope: "workspaces:read",
    handler: async ({ pathParts, key }) =>
      ({ body: { data: await platform.workspaces.get(key.user_id, pathParts[1]) } }),
  },
  {
    method: "PATCH",
    pattern: /^workspaces\/[\w-]+$/,
    scope: "workspaces:write",
    handler: async ({ req, pathParts, key }) => {
      const body = await requireJsonBody(req);
      return { body: { data: await platform.workspaces.update(key.user_id, pathParts[1], body) } };
    },
  },
  {
    method: "DELETE",
    pattern: /^workspaces\/[\w-]+$/,
    scope: "workspaces:write",
    handler: async ({ pathParts, key }) =>
      ({ body: { data: await platform.workspaces.update(key.user_id, pathParts[1], { archived: true }) } }),
  },
  {
    method: "POST",
    pattern: /^workspaces\/[\w-]+\/switch$/,
    scope: "workspaces:write",
    handler: async ({ pathParts, key }) =>
      ({ body: { data: await platform.workspaces.switchDefault(key, pathParts[1]) } }),
  },

  // ══ Templates ══
  {
    method: "GET",
    pattern: /^templates$/,
    scope: "templates:read",
    handler: async ({ url, key }) =>
      ({ body: { data: await platform.templates.list(key.user_id, { archived: url.searchParams.get("archived") === "true" }) } }),
  },
  {
    method: "POST",
    pattern: /^templates$/,
    scope: "templates:write",
    handler: async ({ req, key }) => {
      const body = await requireJsonBody(req);
      return { body: { data: await platform.templates.create(key.user_id, body) }, status: 201 };
    },
  },
  {
    method: "GET",
    pattern: /^templates\/[\w-]+$/,
    scope: "templates:read",
    handler: async ({ pathParts, key }) =>
      ({ body: { data: await platform.templates.get(key.user_id, pathParts[1]) } }),
  },
  {
    method: "PATCH",
    pattern: /^templates\/[\w-]+$/,
    scope: "templates:write",
    handler: async ({ req, pathParts, key }) => {
      const body = await requireJsonBody(req);
      return { body: { data: await platform.templates.update(key.user_id, pathParts[1], body) } };
    },
  },
  {
    method: "DELETE",
    pattern: /^templates\/[\w-]+$/,
    scope: "templates:write",
    handler: async ({ pathParts, key }) =>
      ({ body: { data: await platform.templates.update(key.user_id, pathParts[1], { archived: true }) } }),
  },
  {
    method: "POST",
    pattern: /^templates\/[\w-]+\/instantiate$/,
    scope: "templates:write",
    handler: async ({ req, pathParts, key }) => {
      const body = await requireJsonBody(req).catch(() => ({}) as Record<string, unknown>);
      return { body: { data: await platform.templates.instantiate(key.user_id, pathParts[1], body) }, status: 201 };
    },
  },

  // ══ Dashboards ══
  {
    method: "GET",
    pattern: /^dashboards$/,
    scope: "dashboards:read",
    handler: async ({ url, key }) =>
      ({ body: { data: await platform.dashboards.list(key.user_id, { archived: url.searchParams.get("archived") === "true" }) } }),
  },
  {
    method: "POST",
    pattern: /^dashboards$/,
    scope: "dashboards:write",
    handler: async ({ req, key }) => {
      const body = await requireJsonBody(req);
      return { body: { data: await platform.dashboards.create(key.user_id, body) }, status: 201 };
    },
  },
  {
    method: "GET",
    pattern: /^dashboards\/[\w-]+$/,
    scope: "dashboards:read",
    handler: async ({ pathParts, key }) =>
      ({ body: { data: await platform.dashboards.get(key.user_id, pathParts[1]) } }),
  },
  {
    method: "PATCH",
    pattern: /^dashboards\/[\w-]+$/,
    scope: "dashboards:write",
    handler: async ({ req, pathParts, key }) => {
      const body = await requireJsonBody(req);
      return { body: { data: await platform.dashboards.update(key.user_id, pathParts[1], body) } };
    },
  },
  {
    method: "DELETE",
    pattern: /^dashboards\/[\w-]+$/,
    scope: "dashboards:write",
    handler: async ({ pathParts, key }) =>
      ({ body: { data: await platform.dashboards.update(key.user_id, pathParts[1], { archived: true }) } }),
  },

  // ══ Event bus ══
  {
    method: "GET",
    pattern: /^events$/,
    scope: "events:read",
    handler: async ({ url, key }) =>
      ({ body: { data: await platform.events.list(key.user_id, {
        type: url.searchParams.get("type") ?? undefined,
        since: url.searchParams.get("since") ?? undefined,
        limit: parseInt(url.searchParams.get("limit") ?? "50", 10) || 50,
      }) } }),
  },

  // ══ Webhooks ══
  {
    method: "GET",
    pattern: /^webhooks$/,
    scope: "webhooks:manage",
    handler: async ({ key }) => ({ body: { data: await platform.webhooks.list(key.user_id) } }),
  },
  {
    method: "POST",
    pattern: /^webhooks$/,
    scope: "webhooks:manage",
    handler: async ({ req, key }) => {
      const body = await requireJsonBody(req);
      return { body: { data: await platform.webhooks.create(key.user_id, body) }, status: 201 };
    },
  },
  {
    method: "PATCH",
    pattern: /^webhooks\/[\w-]+$/,
    scope: "webhooks:manage",
    handler: async ({ req, pathParts, key }) => {
      const body = await requireJsonBody(req);
      return { body: { data: await platform.webhooks.update(key.user_id, pathParts[1], body) } };
    },
  },
  {
    method: "DELETE",
    pattern: /^webhooks\/[\w-]+$/,
    scope: "webhooks:manage",
    handler: async ({ pathParts, key }) =>
      ({ body: { data: await platform.webhooks.delete(key.user_id, pathParts[1]) } }),
  },
  {
    method: "POST",
    pattern: /^webhooks\/[\w-]+\/test$/,
    scope: "webhooks:manage",
    handler: async ({ pathParts, key }) =>
      ({ body: { data: await platform.webhooks.test(key.user_id, pathParts[1]) } }),
  },
  {
    method: "POST",
    pattern: /^webhooks\/[\w-]+\/rotate$/,
    scope: "webhooks:manage",
    handler: async ({ pathParts, key }) =>
      ({ body: { data: await platform.webhooks.rotateSecret(key.user_id, pathParts[1]) } }),
  },
  {
    method: "GET",
    pattern: /^webhooks\/[\w-]+\/deliveries$/,
    scope: "webhooks:manage",
    handler: async ({ pathParts, url, key }) =>
      ({ body: { data: await platform.webhooks.deliveries(key.user_id, {
        endpointId: pathParts[1],
        limit: parseInt(url.searchParams.get("limit") ?? "50", 10) || 50,
      }) } }),
  },

  // ══ Connected accounts ══
  {
    method: "GET",
    pattern: /^connections$/,
    scope: "connections:manage",
    handler: async ({ key }) => ({ body: { data: await platform.connections.list(key.user_id) } }),
  },
  {
    method: "DELETE",
    pattern: /^connections\/[\w-]+$/,
    scope: "connections:manage",
    handler: async ({ pathParts, key }) =>
      ({ body: { data: await platform.connections.revoke(key.user_id, pathParts[1]) } }),
  },

  // ══ Agents ══
  {
    method: "GET",
    pattern: /^agents$/,
    scope: "agents:read",
    handler: async ({ url, key }) =>
      ({ body: { data: await intel.agents.list(key.user_id, { status: url.searchParams.get("status") ?? undefined }) } }),
  },
  {
    method: "POST",
    pattern: /^agents$/,
    scope: "agents:write",
    handler: async ({ req, key }) => {
      const body = await requireJsonBody(req);
      return { body: { data: await intel.agents.create(key, body) }, status: 201 };
    },
  },
  {
    method: "GET",
    pattern: /^agents\/[\w-]+$/,
    scope: "agents:read",
    handler: async ({ pathParts, key }) =>
      ({ body: { data: await intel.agents.get(key.user_id, pathParts[1]) } }),
  },
  {
    method: "PATCH",
    pattern: /^agents\/[\w-]+$/,
    scope: "agents:write",
    handler: async ({ req, pathParts, key }) => {
      const body = await requireJsonBody(req);
      return { body: { data: await intel.agents.update(key.user_id, pathParts[1], body) } };
    },
  },
  {
    method: "DELETE",
    pattern: /^agents\/[\w-]+$/,
    scope: "agents:write",
    handler: async ({ pathParts, key }) =>
      ({ body: { data: await intel.agents.archive(key.user_id, pathParts[1]) } }),
  },
  {
    method: "GET",
    pattern: /^agents\/[\w-]+\/runs$/,
    scope: "agents:read",
    handler: async ({ pathParts, url, key }) =>
      ({ body: { data: await intel.runs.listForSource(key.user_id, "agent", pathParts[1],
        parseInt(url.searchParams.get("limit") ?? "20", 10) || 20) } }),
  },
  {
    // Phase 7 contract: POST /agents/:id/runs
    method: "POST",
    pattern: /^agents\/[\w-]+\/runs$/,
    scope: "agents:run",
    handler: async ({ req, pathParts, key }) => {
      const body = await requireJsonBody(req).catch(() => ({}) as Record<string, unknown>);
      const result = await intel.runs.start({
        key,
        sourceKind: "agent",
        sourceId: pathParts[1],
        input: (body.input ?? body) as Record<string, unknown>,
        confirmationMode: (typeof body.confirmation_mode === "string"
          ? body.confirmation_mode as "auto" | "approval" : undefined),
        idempotencyKey: typeof body.idempotency_key === "string" ? body.idempotency_key : undefined,
      });
      return { body: { data: result.body }, status: result.httpStatus === 200 ? 202 : result.httpStatus };
    },
  },

  // ══ Agent runs ══
  {
    method: "GET",
    pattern: /^agent-runs\/[\w-]+$/,
    scope: "agents:read",
    handler: async ({ pathParts, key }) => ({ body: { data: await intel.runs.get(key.user_id, pathParts[1]) } }),
  },
  {
    method: "POST",
    pattern: /^agent-runs\/[\w-]+\/cancel$/,
    scope: "agents:run",
    handler: async ({ pathParts, key }) =>
      ({ body: { data: await intel.runs.cancel(key.user_id, pathParts[1]) } }),
  },
  {
    method: "POST",
    pattern: /^agent-runs\/[\w-]+\/retry$/,
    scope: "agents:run",
    handler: async ({ pathParts, key }) => {
      const result = await intel.runs.retry({ key, runId: pathParts[1] });
      return { body: { data: result.body }, status: result.httpStatus };
    },
  },

  // ══ Automations ══
  {
    method: "GET",
    pattern: /^automations$/,
    scope: "automations:read",
    handler: async ({ url, key }) =>
      ({ body: { data: await intel.automations.list(key.user_id, { status: url.searchParams.get("status") ?? undefined }) } }),
  },
  {
    method: "POST",
    pattern: /^automations$/,
    scope: "automations:write",
    handler: async ({ req, key }) => {
      const body = await requireJsonBody(req);
      return { body: { data: await intel.automations.create(key, body) }, status: 201 };
    },
  },
  {
    method: "GET",
    pattern: /^automations\/[\w-]+$/,
    scope: "automations:read",
    handler: async ({ pathParts, key }) =>
      ({ body: { data: await intel.automations.get(key.user_id, pathParts[1]) } }),
  },
  {
    method: "PATCH",
    pattern: /^automations\/[\w-]+$/,
    scope: "automations:write",
    handler: async ({ req, pathParts, key }) => {
      const body = await requireJsonBody(req);
      return { body: { data: await intel.automations.update(key.user_id, pathParts[1], body) } };
    },
  },
  {
    method: "DELETE",
    pattern: /^automations\/[\w-]+$/,
    scope: "automations:write",
    handler: async ({ pathParts, key }) =>
      ({ body: { data: await intel.automations.archive(key.user_id, pathParts[1]) } }),
  },
  {
    method: "GET",
    pattern: /^automations\/[\w-]+\/runs$/,
    scope: "automations:read",
    handler: async ({ pathParts, url, key }) =>
      ({ body: { data: await intel.runs.listForSource(key.user_id, "automation", pathParts[1],
        parseInt(url.searchParams.get("limit") ?? "20", 10) || 20) } }),
  },
  {
    method: "POST",
    pattern: /^automations\/[\w-]+\/runs$/,
    scope: "automations:run",
    handler: async ({ req, pathParts, key }) => {
      const body = await requireJsonBody(req).catch(() => ({}) as Record<string, unknown>);
      const result = await intel.runs.start({
        key,
        sourceKind: "automation",
        sourceId: pathParts[1],
        input: (body.input ?? body) as Record<string, unknown>,
        idempotencyKey: typeof body.idempotency_key === "string" ? body.idempotency_key : undefined,
      });
      return { body: { data: result.body }, status: result.httpStatus === 200 ? 202 : result.httpStatus };
    },
  },

  // ══ Automation runs ══
  {
    method: "GET",
    pattern: /^automation-runs\/[\w-]+$/,
    scope: "automations:read",
    handler: async ({ pathParts, key }) => ({ body: { data: await intel.runs.get(key.user_id, pathParts[1]) } }),
  },
  {
    method: "POST",
    pattern: /^automation-runs\/[\w-]+\/cancel$/,
    scope: "automations:run",
    handler: async ({ pathParts, key }) =>
      ({ body: { data: await intel.runs.cancel(key.user_id, pathParts[1]) } }),
  },
  {
    method: "POST",
    pattern: /^automation-runs\/[\w-]+\/retry$/,
    scope: "automations:run",
    handler: async ({ pathParts, key }) => {
      const result = await intel.runs.retry({ key, runId: pathParts[1] });
      return { body: { data: result.body }, status: result.httpStatus };
    },
  },
];

/* Grouped search retained for the v1 search contract (grouped buckets). */
async function runSearch(key: KeyRow, q: string, limit: number) {
  const query = q.slice(0, 200);
  const needle = query.toLowerCase();
  const cappedLimit = Math.min(Math.max(limit, 1), 50);
  const scanned = await content.pages.scan(key.user_id);
  const pageHits: Array<Record<string, unknown>> = [];
  const blockHits: Array<Record<string, unknown>> = [];
  const taskHits: Array<Record<string, unknown>> = [];
  const cardHits: Array<Record<string, unknown>> = [];

  for (const page of scanned) {
    if (page.trashed) continue;
    const titleHit = typeof page.title === "string" && page.title.toLowerCase().includes(needle);
    if (titleHit) pageHits.push(mapPage(page));
    for (const b of ((page.blocks ?? []) as Array<Record<string, unknown>>)) {
      const text = typeof b?.text === "string" ? b.text : "";
      if (text && text.toLowerCase().includes(needle)) {
        const snippetIdx = text.toLowerCase().indexOf(needle);
        const start = Math.max(0, snippetIdx - 40);
        const hit: Record<string, unknown> = {
          block_id: b.id,
          page_id: page.id,
          page_title: page.title,
          type: b.type,
          snippet: start > 0 ? "…" + text.slice(start, snippetIdx + needle.length + 60) + "…" : text.slice(0, needle.length + 100),
        };
        if (b.type === "todo" || b.type === "to_do") taskHits.push({ ...hit, checked: b.checked === true });
        else if (b.review) cardHits.push({ ...hit, next_review: (b.review as Record<string, unknown>).nextReview ?? null });
        else blockHits.push(hit);
      }
    }
  }

  return {
    data: {
      query,
      pages: pageHits.slice(0, cappedLimit),
      blocks: blockHits.slice(0, cappedLimit),
      tasks: taskHits.slice(0, cappedLimit),
      review_cards: cardHits.slice(0, cappedLimit),
    },
    meta: {
      counts: {
        pages: pageHits.length,
        blocks: blockHits.length,
        tasks: taskHits.length,
        review_cards: cardHits.length,
      },
      note: "Keyword search across your 500 most recently updated pages. Semantic retrieval is on the roadmap.",
    },
  };
}

/* ─── Request pipeline ─── */

Deno.serve(async (req: Request) => {
  const origin = getOrigin(req);
  const baseHeaders = corsHeaders(origin);

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: baseHeaders });

  const url = new URL(req.url);
  const path = url.pathname.replace(/\/api-v1\/?/, "").replace(/^\/+|\/+$/g, "");
  const method = req.method.toUpperCase();

  // Public service metadata — no auth, helps clients verify connectivity.
  if (path === "" && method === "GET") {
    return new Response(
      JSON.stringify({
        name: "Noska API",
        version: API_VERSION,
        documentation: "Workspace → API Console → Docs",
        endpoints: routes.map((r) => `${r.method} /v1/${r.pattern.source.replace(/\\\/[\w-]+\$$/, "/:id").replace(/[\^$]/g, "")}`),
        scopes: SCOPES,
      }),
      { headers: baseHeaders },
    );
  }

  try {
    const key = await authenticateKey(req);

    const match = routes.find((r) => r.method === method && r.pattern.test(path));
    if (!match) throw new ApiError(404, "not_found", `No route for ${method} /${path}.`);

    if (!keyHasScopeOf(key.scopes, match.scope)) {
      throw new ApiError(403, "insufficient_scope",
        `This endpoint requires the "${match.scope}" scope, which this key does not have.`,
        { required_scope: match.scope, key_scopes: key.scopes });
    }

    // Read-only credentials: refuse every mutating method (mirrors MCP policy).
    if (key.read_only && readOnlyBlocksMethod(method)) {
      throw new ApiError(403, "read_only_credential",
        "This API key is read-only; mutating methods are refused.",
        { required_scope: match.scope });
    }

    const rateHeaders = await rateLimitHeaders(key);
    // Usage stamp must never block the response; always record it.
    try {
      touchKey(key.id);
    } catch {
      /* ignore */
    }

    const pathParts = path.split("/");

    // Idempotent replay for POSTs carrying an Idempotency-Key.
    const idemKey = req.headers.get("Idempotency-Key")?.trim();
    if (method === "POST" && idemKey) {
      if (idemKey.length > 255) throw new ApiError(400, "invalid_request", "Idempotency-Key must be at most 255 characters.");
      maybePruneHousekeeping();
      const cached = await lookupIdempotent(key, idemKey);
      if (cached) {
        return new Response(JSON.stringify(cached.response_body), {
          status: cached.response_status,
          headers: { ...baseHeaders, ...rateHeaders, "Idempotency-Replayed": "true" },
        });
      }
      try {
        const result = await match.handler({ req, url, key, pathParts, method });
        await storeIdempotent(key, idemKey, `${method} /${path}`, result.status ?? 200, result.body);
        return new Response(JSON.stringify(result.body), {
          status: result.status ?? 200,
          headers: { ...baseHeaders, ...rateHeaders },
        });
      } catch (err) {
        throw toApiError(err);
      }
    }

    try {
      const result = await match.handler({ req, url, key, pathParts, method });
      // Best-effort audit for mutating calls; reads stay unlogged for volume.
      if (method !== "GET") {
        try {
          auditEvent({
            userId: key.user_id,
            action: `api.${method.toLowerCase()}.${path.split("/")[0] || "root"}`,
            resource: path,
            apiKeyId: key.id,
            surface: "api",
          });
        } catch {
          /* ignore */
        }
      }
      return new Response(JSON.stringify(result.body), {
        status: result.status ?? 200,
        headers: { ...baseHeaders, ...rateHeaders },
      });
    } catch (err) {
      throw toApiError(err);
    }
  } catch (err) {
    if (err instanceof ApiError) {
      const extraHeaders = (err as ApiError & { rateHeaders?: Record<string, string> }).rateHeaders ?? {};
      const headers = { ...baseHeaders, ...extraHeaders };
      if (err.status === 429 && typeof err.extra.retry_after_seconds === "number") {
        headers["Retry-After"] = String(err.extra.retry_after_seconds);
      }
      return errorResponse(err, headers);
    }
    if (err instanceof PlatformError) {
      return errorResponse(new ApiError(err.status, err.code.toLowerCase(), err.message, err.extra), baseHeaders);
    }
    console.error("[api-v1] unhandled:", err);
    return errorResponse(new ApiError(500, "internal_error", "An unexpected error occurred."), baseHeaders);
  }
});
