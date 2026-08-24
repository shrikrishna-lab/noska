// ============================================================================
// Noska API v1 — real public API backed by API keys (P1 Developer Platform)
//
// Deploy WITHOUT Supabase JWT verification — requests authenticate with
// Noska API keys (`Authorization: Bearer nsk_…`), not Supabase JWTs:
//
//   supabase functions deploy api-v1 --no-verify-jwt
//
// Security model:
//   * Keys stored as SHA-256 hashes (user_api_keys table, see
//     supabase/migrations/20260823000001_api_keys_and_rate_limits.sql).
//   * Every data query is scoped to the key owner: `.eq("user_id", …)` —
//     the service-role client bypasses RLS, so owner scoping here is
//     mandatory and never trusted from request input.
//   * Scopes gate each route+method (pages:read, pages:write, …).
//   * Fixed-window rate limiting per key via consume_api_rate_limit RPC,
//     surfaced through standard X-RateLimit-* response headers.
//   * Structured errors: { "error": { "code", "message" } }.
//   * Idempotency-Key replay cache (24h) on POST endpoints.
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const db = createClient(supabaseUrl, serviceKey);

const API_VERSION = "2026-08-23";
const RATE_LIMIT_PER_MINUTE = 60;
const MAX_SCAN_PAGES = 500; // bound for workspace-wide scans (tasks/reviews/search/databases)
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

/* ─── Scopes ─── */

const SCOPES = [
  "pages:read",
  "pages:write",
  "databases:read",
  "databases:write",
  "tasks:read",
  "tasks:write",
  "reviews:read",
  "reviews:write",
  "search:read",
] as const;

type Scope = (typeof SCOPES)[number];

interface ApiKeyRow {
  id: string;
  user_id: string;
  name: string;
  prefix: string;
  scopes: string[];
  expires_at: string | null;
  revoked_at: string | null;
}

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

function errorResponse(err: ApiError, headers: Record<string, string>) {
  return new Response(JSON.stringify({ error: { code: err.code, message: err.message, ...err.extra } }), {
    status: err.status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

/* ─── CORS (mirrors teams-api; Sentry/PostHog headers must pass preflight) ─── */

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


function allowedOrigin(origin) {
  if (!origin) return "https://app.noska.me";
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  if (/^https:\/\/([\w-]+\.)?noska\.me$/.test(origin)) return origin;
  return "https://app.noska.me";
}

function getOrigin(req: Request): string {
  return allowedOrigin(req.headers.get("origin") || req.headers.get("referer") || "");
}

/* ─── Rate limiting ─── */

async function rateLimitHeaders(key: ApiKeyRow): Promise<Record<string, string>> {
  const windowStart = new Date(Math.floor(Date.now() / 60000) * 60000);
  const { data, error } = await db.rpc("consume_api_rate_limit", {
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

/* ─── Key authentication ─── */

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function authenticateKey(req: Request): Promise<ApiKeyRow> {
  const auth = req.headers.get("Authorization") ?? "";
  const raw = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!raw || !raw.startsWith("nsk_")) {
    throw new ApiError(401, "unauthorized", "Missing or malformed API key. Pass it as: Authorization: Bearer nsk_…");
  }
  const hash = await sha256Hex(raw);
  const { data, error } = await db.from("user_api_keys").select("*").eq("key_hash", hash).maybeSingle();
  if (error || !data) throw new ApiError(401, "invalid_key", "API key not recognized.");
  const key = data as ApiKeyRow;
  if (key.revoked_at) throw new ApiError(401, "key_revoked", "This API key has been revoked.");
  if (key.expires_at && new Date(key.expires_at).getTime() < Date.now()) {
    throw new ApiError(401, "key_expired", "This API key has expired.");
  }
  return key;
}

function requireScope(key: ApiKeyRow, scope: Scope): void {
  const scopes = Array.isArray(key.scopes) ? key.scopes : [];
  if (!scopes.includes(scope)) {
    throw new ApiError(403, "insufficient_scope", `This endpoint requires the "${scope}" scope, which this key does not have.`, {
      required_scope: scope,
      key_scopes: scopes,
    });
  }
}

/* ─── Helpers ─── */

function parseListParams(url: URL) {
  const limitRaw = parseInt(url.searchParams.get("limit") ?? "25", 10);
  const offsetRaw = parseInt(url.searchParams.get("offset") ?? "0", 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 25;
  const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;
  return { limit, offset };
}

function requireJsonBody(req: Request): Record<string, unknown> {
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

function plainBlockText(block: unknown): string {
  if (!block || typeof block !== "object") return "";
  const b = block as Record<string, unknown>;
  if (typeof b.text === "string") return b.text;
  return "";
}

function mapPage(row: Record<string, unknown>, opts: { withBlocks?: boolean } = {}) {
  const out: Record<string, unknown> = {
    object: "page",
    id: row.id,
    title: row.title,
    icon: row.icon,
    cover: row.cover,
    parent_id: row.parent_id,
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

function mapTask(page: Record<string, unknown>, raw: Record<string, unknown>) {
  return {
    object: "task",
    id: raw.id,
    page_id: page.id,
    page_title: page.title,
    text: typeof raw.text === "string" ? raw.text : "",
    checked: raw.checked === true,
    created_at: typeof raw.createdAt === "string" ? raw.createdAt : page.created_at,
  };
}

/** Fetch the caller's pages for workspace-wide scans (bounded). */
async function scanPages(userId: string, columns = "id,title,icon,trashed,tags,created_at,updated_at,blocks") {
  const { data, error } = await db
    .from("pages")
    .select(columns)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(MAX_SCAN_PAGES);
  if (error) throw new ApiError(500, "internal_error", "Failed to read workspace data.");
  return (data ?? []) as Array<Record<string, unknown>>;
}

/* ─── Spaced repetition (mirrors src/features/spaced/scheduler.ts — SM-2) ─── */

interface ReviewState {
  easeFactor?: number;
  interval?: number;
  repetition?: number;
  nextReview?: string;
  lastReview?: string;
  quality?: number;
  suspended?: boolean;
}

function scheduleSM2(prev: ReviewState | undefined, quality: number): Required<Omit<ReviewState, "suspended">> {
  let easeFactor = prev?.easeFactor ?? 2.5;
  let interval = prev?.interval ?? 0;
  let repetition = prev?.repetition ?? 0;

  if (quality >= 3) {
    if (repetition === 0) interval = 1;
    else if (repetition === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetition += 1;
  } else {
    repetition = 0;
    interval = 1;
  }
  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

  const nowIso = new Date().toISOString();
  return {
    easeFactor,
    interval,
    repetition,
    nextReview: new Date(Date.now() + interval * 86_400_000).toISOString(),
    lastReview: nowIso,
    quality,
  };
}

/* ─── Read-modify-write over a page's blocks jsonb array ─── */

async function loadOwnedPage(userId: string, pageId: string) {
  const { data, error } = await db
    .from("pages")
    .select("id,user_id,title,icon,cover,parent_id,favorite,trashed,tags,blocks,created_at,updated_at")
    .eq("user_id", userId)
    .eq("id", pageId)
    .maybeSingle();
  if (error) throw new ApiError(500, "internal_error", "Failed to read page.");
  if (!data) throw new ApiError(404, "not_found", `Page ${pageId} was not found.`);
  return data as Record<string, unknown>;
}

function findBlockIndex(blocks: Array<Record<string, unknown>>, blockId: string): number {
  return blocks.findIndex((b) => b && typeof b === "object" && (b as Record<string, unknown>).id === blockId);
}

/* ─── Idempotency (POST endpoints, 24h replay cache) ─── */

interface CachedIdem {
  response_status: number;
  response_body: unknown;
  created_at: string;
}

async function lookupIdempotent(key: ApiKeyRow, idemKey: string): Promise<CachedIdem | null> {
  const { data } = await db
    .from("api_idempotency_keys")
    .select("response_status,response_body,created_at")
    .eq("api_key_id", key.id)
    .eq("idempotency_key", idemKey)
    .maybeSingle();
  if (!data) return null;
  if (Date.now() - new Date(data.created_at).getTime() > IDEMPOTENCY_TTL_MS) return null;
  return data as CachedIdem;
}

async function storeIdempotent(key: ApiKeyRow, idemKey: string, endpoint: string, status: number, body: unknown): Promise<void> {
  // Best-effort: a failed insert must never fail the live request.
  try {
    await db.from("api_idempotency_keys").upsert(
      { api_key_id: key.id, idempotency_key: idemKey, endpoint, response_status: status, response_body: body },
      { onConflict: "api_key_id,idempotency_key" },
    );
  } catch {
    /* ignore */
  }
}

let lastPrune = 0;
async function pruneIdempotency(): Promise<void> {
  // At most once every 10 minutes across isolates is best-effort anyway.
  if (Date.now() - lastPrune < 10 * 60 * 1000) return;
  lastPrune = Date.now();
  try {
    await db.from("api_idempotency_keys").delete().lt("created_at", new Date(Date.now() - IDEMPOTENCY_TTL_MS).toISOString());
    await db.rpc("prune_api_rate_limits");
  } catch {
    /* ignore */
  }
}

/* ─── Route handlers ─── */

type Handler = (ctx: {
  req: Request;
  url: URL;
  key: ApiKeyRow;
  pathParts: string[];
  method: string;
}) => Promise<{ body: unknown; status?: number }>;

const routes: Array<{ method: string; pattern: RegExp; scope: Scope; handler: Handler }> = [
  // ── Pages ──
  {
    method: "GET",
    pattern: /^pages$/,
    scope: "pages:read",
    handler: async ({ url, key }) => {
      const { limit, offset } = parseListParams(url);
      const trashed = url.searchParams.get("trashed");
      const favorite = url.searchParams.get("favorite");
      const sort = url.searchParams.get("sort") ?? "-updated_at";

      let query = db.from("pages").select("id,title,icon,cover,parent_id,favorite,trashed,tags,hidden_from_recents,created_at,updated_at").eq("user_id", key.user_id);
      if (trashed === "true" || trashed === "false") query = query.eq("trashed", trashed === "true");
      if (favorite === "true") query = query.eq("favorite", true);
      const desc = sort.startsWith("-");
      const col = desc ? sort.slice(1) : sort;
      const allowedCols = ["updated_at", "created_at", "title"];
      query = query.order(allowedCols.includes(col) ? col : "updated_at", { ascending: !desc });

      const { data, error } = await query.range(offset, offset + limit); // limit+1 sentinel
      if (error) throw new ApiError(500, "internal_error", "Failed to list pages.");
      const rows = data ?? [];
      const hasMore = rows.length > limit;
      return {
        body: {
          data: rows.slice(0, limit).map((r) => mapPage(r)),
          meta: { limit, offset, has_more: hasMore },
        },
      };
    },
  },
  {
    method: "POST",
    pattern: /^pages$/,
    scope: "pages:write",
    handler: async ({ req, key }) => {
      const body = await requireJsonBody(req);
      const insert: Record<string, unknown> = { user_id: key.user_id };
      if (body.title !== undefined) insert.title = String(body.title);
      if (body.icon !== undefined) insert.icon = String(body.icon);
      if (body.cover !== undefined) insert.cover = String(body.cover);
      if (body.parent_id !== undefined) {
        // Parent must belong to the same owner (IDOR guard).
        if (typeof body.parent_id !== "string") throw new ApiError(400, "invalid_request", "parent_id must be a string.");
        await loadOwnedPage(key.user_id, body.parent_id);
        insert.parent_id = body.parent_id;
      }
      if (body.tags !== undefined) {
        if (!Array.isArray(body.tags)) throw new ApiError(400, "invalid_request", "tags must be an array.");
        insert.tags = body.tags;
      }
      if (body.blocks !== undefined) {
        if (!Array.isArray(body.blocks)) throw new ApiError(400, "invalid_request", "blocks must be an array of block objects.");
        insert.blocks = body.blocks;
      }
      const { data, error } = await db.from("pages").insert(insert).select("*").single();
      if (error) throw new ApiError(500, "internal_error", "Failed to create page: " + error.message);
      return { body: { data: mapPage(data, { withBlocks: true }) }, status: 201 };
    },
  },
  {
    method: "GET",
    pattern: /^pages\/[\w-]+$/,
    scope: "pages:read",
    handler: async ({ pathParts, key }) => {
      const page = await loadOwnedPage(key.user_id, pathParts[1]);
      return { body: { data: mapPage(page, { withBlocks: true }) } };
    },
  },
  {
    method: "PATCH",
    pattern: /^pages\/[\w-]+$/,
    scope: "pages:write",
    handler: async ({ req, pathParts, key }) => {
      const page = await loadOwnedPage(key.user_id, pathParts[1]);
      const body = await requireJsonBody(req);
      const patch: Record<string, unknown> = {};
      for (const field of ["title", "icon", "cover"] as const) {
        if (body[field] !== undefined) patch[field] = String(body[field]);
      }
      if (body.parent_id !== undefined) {
        if (body.parent_id === null) patch.parent_id = null;
        else {
          if (typeof body.parent_id !== "string") throw new ApiError(400, "invalid_request", "parent_id must be a string or null.");
          await loadOwnedPage(key.user_id, body.parent_id);
          patch.parent_id = body.parent_id;
        }
      }
      if (body.tags !== undefined) {
        if (!Array.isArray(body.tags)) throw new ApiError(400, "invalid_request", "tags must be an array.");
        patch.tags = body.tags;
      }
      if (body.favorite !== undefined) patch.favorite = body.favorite === true;
      if (body.trashed !== undefined) patch.trashed = body.trashed === true;
      if (body.blocks !== undefined) {
        if (!Array.isArray(body.blocks)) throw new ApiError(400, "invalid_request", "blocks must be an array.");
        patch.blocks = body.blocks;
      }
      if (Object.keys(patch).length === 0) {
        throw new ApiError(400, "invalid_request", "No updatable fields provided. See docs for the page schema.");
      }
      const { data, error } = await db.from("pages").update(patch).eq("id", page.id as string).eq("user_id", key.user_id).select("*").single();
      if (error) throw new ApiError(500, "internal_error", "Failed to update page.");
      return { body: { data: mapPage(data, { withBlocks: true }) } };
    },
  },
  {
    method: "DELETE",
    pattern: /^pages\/[\w-]+$/,
    scope: "pages:write",
    handler: async ({ pathParts, key }) => {
      const page = await loadOwnedPage(key.user_id, pathParts[1]);
      const { error } = await db.from("pages").update({ trashed: true }).eq("id", page.id as string).eq("user_id", key.user_id);
      if (error) throw new ApiError(500, "internal_error", "Failed to trash page.");
      return { body: { data: { id: page.id, object: "page", deleted: true, trashed: true } } };
    },
  },

  // ── Blocks ──
  {
    method: "GET",
    pattern: /^blocks$/,
    scope: "pages:read",
    handler: async ({ url, key }) => {
      const pageId = url.searchParams.get("page_id");
      if (!pageId) throw new ApiError(400, "invalid_request", "The page_id query parameter is required.");
      const page = await loadOwnedPage(key.user_id, pageId);
      const blocks = (page.blocks ?? []) as Array<Record<string, unknown>>;
      const type = url.searchParams.get("type");
      const filtered = type ? blocks.filter((b) => b.type === type) : blocks;
      return { body: { data: filtered, meta: { page_id: page.id, count: filtered.length } } };
    },
  },

  // ── Databases (database blocks embedded in pages) ──
  {
    method: "GET",
    pattern: /^databases$/,
    scope: "databases:read",
    handler: async ({ url, key }) => {
      const pages = await scanPages(key.user_id, "id,title,icon,trashed,updated_at,blocks");
      const databases: Array<Record<string, unknown>> = [];
      for (const page of pages) {
        if (page.trashed) continue;
        for (const b of ((page.blocks ?? []) as Array<Record<string, unknown>>)) {
          const type = typeof b?.type === "string" ? b.type : "";
          if (!type.startsWith("database")) continue;
          const schema = (b.database ?? {}) as { properties?: unknown[]; rows?: unknown[] };
          databases.push({
            object: "database",
            id: b.id,
            page_id: page.id,
            page_title: page.title,
            title: typeof b.text === "string" ? b.text : "",
            type,
            property_count: Array.isArray(schema.properties) ? schema.properties.length : 0,
            row_count: Array.isArray(schema.rows) ? schema.rows.length : 0,
          });
        }
      }
      const { limit, offset } = parseListParams(url);
      const slice = databases.slice(offset, offset + limit);
      return {
        body: { data: slice, meta: { limit, offset, total: databases.length, has_more: offset + limit < databases.length } },
      };
    },
  },
  {
    method: "GET",
    pattern: /^databases\/[\w-]+$/,
    scope: "databases:read",
    handler: async ({ pathParts, key }) => {
      const blockId = pathParts[1];
      const pages = await scanPages(key.user_id, "id,title,blocks");
      for (const page of pages) {
        for (const b of ((page.blocks ?? []) as Array<Record<string, unknown>>)) {
          if (b.id !== blockId) continue;
          if (!(typeof b.type === "string" && b.type.startsWith("database"))) {
            throw new ApiError(404, "not_found", `Block ${blockId} exists but is not a database.`);
          }
          const schema = (b.database ?? {}) as Record<string, unknown>;
          return {
            body: {
              data: {
                object: "database",
                id: blockId,
                page_id: page.id,
                page_title: page.title,
                title: typeof b.text === "string" ? b.text : "",
                type: b.type,
                properties: schema.properties ?? [],
                views: schema.views ?? [],
                rows: schema.rows ?? [],
              },
            },
          };
        }
      }
      throw new ApiError(404, "not_found", `Database ${blockId} was not found.`);
    },
  },

  // ── Tasks (todo blocks) ──
  {
    method: "GET",
    pattern: /^tasks$/,
    scope: "tasks:read",
    handler: async ({ url, key }) => {
      const pages = await scanPages(key.user_id);
      const doneFilter = url.searchParams.get("done");
      const pageFilter = url.searchParams.get("page_id");
      const tasks: Array<Record<string, unknown>> = [];
      for (const page of pages) {
        if (pageFilter && page.id !== pageFilter) continue;
        if (page.trashed) continue;
        for (const b of ((page.blocks ?? []) as Array<Record<string, unknown>>)) {
          if (b.type !== "todo") continue;
          if (doneFilter !== null && (b.checked === true) !== (doneFilter === "true")) continue;
          tasks.push(mapTask(page, b));
        }
      }
      const { limit, offset } = parseListParams(url);
      const slice = tasks.slice(offset, offset + limit);
      return { body: { data: slice, meta: { limit, offset, total: tasks.length, has_more: offset + limit < tasks.length } } };
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
      const page = await loadOwnedPage(key.user_id, body.page_id);
      const block = {
        id: crypto.randomUUID(),
        type: "todo",
        text,
        checked: false,
        createdAt: new Date().toISOString(),
      };
      const blocks = [...((page.blocks ?? []) as Array<Record<string, unknown>>), block];
      const { error } = await db.from("pages").update({ blocks }).eq("id", page.id as string).eq("user_id", key.user_id);
      if (error) throw new ApiError(500, "internal_error", "Failed to create task.");
      return { body: { data: mapTask(page, block) }, status: 201 };
    },
  },
  {
    method: "PATCH",
    pattern: /^tasks\/[\w-]+$/,
    scope: "tasks:write",
    handler: async ({ req, url, pathParts, key }) => {
      const body = await requireJsonBody(req);
      const pageId = url.searchParams.get("page_id");
      if (!pageId) throw new ApiError(400, "invalid_request", "The page_id query parameter is required.");
      const page = await loadOwnedPage(key.user_id, pageId);
      const blocks = [...((page.blocks ?? []) as Array<Record<string, unknown>>)];
      const idx = findBlockIndex(blocks, pathParts[1]);
      if (idx === -1 || blocks[idx].type !== "todo") throw new ApiError(404, "not_found", `Task ${pathParts[1]} was not found on page ${pageId}.`);
      const patch: Record<string, unknown> = {};
      if (body.text !== undefined) patch.text = String(body.text);
      if (body.checked !== undefined) patch.checked = body.checked === true;
      blocks[idx] = { ...blocks[idx], ...patch };
      const { error } = await db.from("pages").update({ blocks }).eq("id", page.id as string).eq("user_id", key.user_id);
      if (error) throw new ApiError(500, "internal_error", "Failed to update task.");
      return { body: { data: mapTask(page, blocks[idx]) } };
    },
  },

  // ── Reviews (spaced repetition cards) ──
  {
    method: "GET",
    pattern: /^reviews$/,
    scope: "reviews:read",
    handler: async ({ url, key }) => {
      const pages = await scanPages(key.user_id);
      const dueOnly = url.searchParams.get("due") === "true";
      const nowIso = new Date().toISOString();
      const reviews: Array<Record<string, unknown>> = [];
      for (const page of pages) {
        if (page.trashed) continue;
        for (const b of ((page.blocks ?? []) as Array<Record<string, unknown>>)) {
          const review = b.review as ReviewState | undefined;
          if (!review || review.suspended) continue;
          if (dueOnly && review.nextReview && review.nextReview > nowIso) continue;
          reviews.push({
            object: "review_card",
            block_id: b.id,
            page_id: page.id,
            page_title: page.title,
            front: plainBlockText(b),
            state: {
              ease_factor: review.easeFactor ?? 2.5,
              interval: review.interval ?? 0,
              repetition: review.repetition ?? 0,
              next_review: review.nextReview ?? null,
              last_review: review.lastReview ?? null,
              suspended: review.suspended === true,
            },
            due: !review.nextReview || review.nextReview <= nowIso,
          });
        }
      }
      const { limit, offset } = parseListParams(url);
      const slice = reviews.slice(offset, offset + limit);
      return { body: { data: slice, meta: { limit, offset, total: reviews.length, has_more: offset + limit < reviews.length } } };
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
      const page = await loadOwnedPage(key.user_id, body.page_id);
      const blocks = [...((page.blocks ?? []) as Array<Record<string, unknown>>)];
      const idx = findBlockIndex(blocks, body.block_id);
      if (idx === -1) throw new ApiError(404, "not_found", `Block ${body.block_id} was not found on page ${body.page_id}.`);
      const existing = blocks[idx].review as ReviewState | undefined;
      if (existing && !existing.suspended) {
        return { body: { data: { object: "review_card", block_id: body.block_id, page_id: body.page_id, already_scheduled: true, state: existing } } };
      }
      const initial = scheduleSM2(existing, 0);
      initial.interval = 0;
      initial.repetition = 0;
      initial.nextReview = new Date().toISOString(); // due immediately
      blocks[idx] = { ...blocks[idx], review: initial };
      const { error } = await db.from("pages").update({ blocks }).eq("id", page.id as string).eq("user_id", key.user_id);
      if (error) throw new ApiError(500, "internal_error", "Failed to schedule review.");
      return { body: { data: { object: "review_card", block_id: body.block_id, page_id: body.page_id, state: initial } }, status: 201 };
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
      const page = await loadOwnedPage(key.user_id, body.page_id);
      const blocks = [...((page.blocks ?? []) as Array<Record<string, unknown>>)];
      const idx = findBlockIndex(blocks, body.block_id);
      if (idx === -1) throw new ApiError(404, "not_found", `Block ${body.block_id} was not found on page ${body.page_id}.`);
      const next = scheduleSM2(blocks[idx].review as ReviewState | undefined, quality);
      blocks[idx] = { ...blocks[idx], review: next };
      const { error } = await db.from("pages").update({ blocks }).eq("id", page.id as string).eq("user_id", key.user_id);
      if (error) throw new ApiError(500, "internal_error", "Failed to record review.");
      return { body: { data: { object: "review_card", block_id: body.block_id, page_id: body.page_id, state: next } } };
    },
  },
  {
    method: "DELETE",
    pattern: /^reviews\/[\w-]+$/,
    scope: "reviews:write",
    handler: async ({ url, pathParts, key }) => {
      const pageId = url.searchParams.get("page_id");
      if (!pageId) throw new ApiError(400, "invalid_request", "The page_id query parameter is required.");
      const page = await loadOwnedPage(key.user_id, pageId);
      const blocks = [...((page.blocks ?? []) as Array<Record<string, unknown>>)];
      const idx = findBlockIndex(blocks, pathParts[1]);
      if (idx === -1 || !blocks[idx].review) throw new ApiError(404, "not_found", `Review card ${pathParts[1]} was not found on page ${pageId}.`);
      delete blocks[idx].review;
      const { error } = await db.from("pages").update({ blocks }).eq("id", page.id as string).eq("user_id", key.user_id);
      if (error) throw new ApiError(500, "internal_error", "Failed to remove review card.");
      return { body: { data: { block_id: pathParts[1], removed: true } } };
    },
  },

  // ── Search ──
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
];

async function runSearch(key: ApiKeyRow, q: string, limit: number) {
  const needle = q.toLowerCase();
  const cappedLimit = Math.min(Math.max(limit, 1), 50);
  const pages = await scanPages(key.user_id);
  const pageHits: Array<Record<string, unknown>> = [];
  const blockHits: Array<Record<string, unknown>> = [];
  const taskHits: Array<Record<string, unknown>> = [];
  const cardHits: Array<Record<string, unknown>> = [];

  for (const page of pages) {
    if (page.trashed) continue;
    const titleHit = typeof page.title === "string" && page.title.toLowerCase().includes(needle);
    if (titleHit) {
      pageHits.push(mapPage(page));
    }
    for (const b of ((page.blocks ?? []) as Array<Record<string, unknown>>)) {
      const text = plainBlockText(b);
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
        if (b.type === "todo") taskHits.push({ ...hit, checked: b.checked === true });
        else if (b.review) {
          const r = b.review as ReviewState;
          cardHits.push({ ...hit, next_review: r.nextReview ?? null });
        } else blockHits.push(hit);
      }
    }
  }

  const results = {
    query: q,
    pages: pageHits.slice(0, cappedLimit),
    blocks: blockHits.slice(0, cappedLimit),
    tasks: taskHits.slice(0, cappedLimit),
    review_cards: cardHits.slice(0, cappedLimit),
  };
  return {
    data: results,
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

    requireScope(key, match.scope);
    const rateHeaders = await rateLimitHeaders(key);
    if (Object.keys(rateHeaders).length > 0) {
      // Fire-and-forget last_used_at (never blocks the response path).
      db.from("user_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id).then(undefined, () => {});
    }

    const pathParts = path.split("/");

    // Idempotent replay for POSTs carrying an Idempotency-Key.
    const idemKey = req.headers.get("Idempotency-Key")?.trim();
    if (method === "POST" && idemKey) {
      if (idemKey.length > 255) throw new ApiError(400, "invalid_request", "Idempotency-Key must be at most 255 characters.");
      pruneIdempotency();
      const cached = await lookupIdempotent(key, idemKey);
      if (cached) {
        return new Response(JSON.stringify(cached.response_body), {
          status: cached.response_status,
          headers: { ...baseHeaders, ...rateHeaders, "Idempotency-Replayed": "true" },
        });
      }
      const result = await match.handler({ req, url, key, pathParts, method });
      // Awaited: the isolate can freeze right after the response returns,
      // and a lost replay entry defeats the whole contract.
      await storeIdempotent(key, idemKey, `${method} /${path}`, result.status ?? 200, result.body);
      return new Response(JSON.stringify(result.body), {
        status: result.status ?? 200,
        headers: { ...baseHeaders, ...rateHeaders },
      });
    }

    const result = await match.handler({ req, url, key, pathParts, method });

    return new Response(JSON.stringify(result.body), {
      status: result.status ?? 200,
      headers: { ...baseHeaders, ...rateHeaders },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      const extraHeaders = (err as ApiError & { rateHeaders?: Record<string, string> }).rateHeaders ?? {};
      const headers = { ...baseHeaders, ...extraHeaders };
      if (err.status === 429 && typeof err.extra.retry_after_seconds === "number") {
        headers["Retry-After"] = String(err.extra.retry_after_seconds);
      }
      return errorResponse(err, headers);
    }
    console.error("[api-v1] unhandled:", err);
    return errorResponse(new ApiError(500, "internal_error", "An unexpected error occurred."), baseHeaders);
  }
});
