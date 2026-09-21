/* ============================================================================
 * Noska MCP — pure protocol helpers (zero-dependency).
 *
 * Everything here is deterministic string/object logic with NO Deno APIs
 * (beyond `crypto.randomUUID`, present in Deno AND Node 19+), NO npm/jsr
 * imports, and NO I/O — so it is importable from:
 *   - Deno edge functions (the MCP server, tools, shared auth)
 *   - Node/vitest (the toughest real-world test suites)
 *
 * Rule: if you add branching logic to index.ts that CAN live here, it MUST
 * live here — untested protocol code is how ChatGPT/Claude/agent
 * integrations break in production.
 * ========================================================================== */

import { keyHasScope, toolIsRead } from "../_shared/mcp/policy.ts";
import type { PolicyKey } from "../_shared/mcp/policy.ts";

export type Row = Record<string, unknown>;

/* ─── Protocol versions ───
 * Newest first. Older clients (Notion-era agents, custom runtimes stuck on
 * 2024-11-05) negotiate down gracefully instead of failing the handshake. */

export const SUPPORTED_PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"] as const;
export const PROTOCOL_VERSION_DEFAULT = SUPPORTED_PROTOCOLS[0];

export function negotiateProtocol(requested: unknown): string {
  const r = typeof requested === "string" ? requested.trim() : "";
  if ((SUPPORTED_PROTOCOLS as readonly string[]).includes(r)) return r;
  return PROTOCOL_VERSION_DEFAULT;
}

/* ─── Budgets & limits (single source of truth) ─── */

export const RATE_LIMIT_PER_MINUTE = 120;
export const EXECUTIONS_PER_HOUR = 20;
export const MAX_BATCH_SIZE = 50;
export const MAX_QUERY_LEN = 200;
export const IDEMPOTENCY_WINDOW_MS = 86_400_000; // 24 h
export const SESSION_TTL_MS = 24 * 3_600_000; // 24 h

export function isBatchTooLarge(n: number): boolean {
  return n > MAX_BATCH_SIZE;
}

/* ─── Tool annotations (read by Claude Code / ChatGPT agents natively) ─── */

export function annotationsFor(risk: string): Record<string, boolean> {
  if (risk === "RED") {
    return { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false };
  }
  if (risk === "YELLOW") {
    return { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false };
  }
  return { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false };
}

/* ─── tools/list visibility (mirrors enforcement, non-throwing) ───
 * Clients only see tools they can actually call: a read-only ChatGPT key
 * sees reads only, a narrow agent key sees its allowlist. */

export interface VisibleTool {
  name: string;
  scope: string;
}

export function toolVisibleToKey(
  key: Pick<PolicyKey, "scopes"> & { read_only?: boolean; allowed_tools?: string[] },
  t: VisibleTool,
): boolean {
  if (!keyHasScope(key.scopes ?? [], t.scope)) return false;
  const allowed = key.allowed_tools ?? [];
  if (allowed.length > 0 && !allowed.includes(t.name)) return false;
  if (key.read_only && !toolIsRead(t.scope)) return false;
  return true;
}

/* ─── Auth classification (header vs one-link query, pure) ───
 * Precedence: Authorization: Bearer nsk_… > Bearer noska_at_… (OAuth) >
 * ?key= / ?api_key= (header-less clients). The header ALWAYS wins over the
 * query string so a leaked link cannot override a real credential. */

export type AuthKind = "apikey" | "oauth" | "query" | "none";

export function classifyAuth(
  authorizationHeader: string | null | undefined,
  queryKey: string | null | undefined,
): { kind: AuthKind; raw: string } {
  const bearer = (authorizationHeader ?? "").replace(/^Bearer\s+/i, "").trim();
  if (bearer.startsWith("nsk_")) return { kind: "apikey", raw: bearer };
  if (bearer.startsWith("noska_at_")) return { kind: "oauth", raw: bearer };
  const q = (queryKey ?? "").trim();
  if (q.startsWith("nsk_")) return { kind: "query", raw: q };
  return { kind: "none", raw: "" };
}

/* ─── Task block types ───
 * The markdown engine stores todos as "to_do" (Notion-style); legacy rows
 * and the API use "todo". EVERY matcher must accept both — matching only
 * one silently drops tasks created through the other surface. */

export function isTaskBlockType(t: unknown): boolean {
  return t === "todo" || t === "to_do";
}

/* ─── Search validation ─── */

export function validateSearchQuery(query: unknown): { ok: true; q: string } | { ok: false; message: string } {
  const q = String(query ?? "").trim().toLowerCase();
  if (!q) return { ok: false, message: "query is required" };
  if (q.length > MAX_QUERY_LEN) return { ok: false, message: "query too long (max 200 chars)" };
  return { ok: true, q };
}

/** Clamp a client-supplied limit into [1, max] with a default. */
export function clampLimit(raw: unknown, def: number, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return def;
  return Math.min(Math.max(Math.floor(n), 1), max);
}

/* ─── noska_execute validation (bounded agentic execution) ───
 * The CLIENT plans; the server only ever runs these five non-destructive
 * actions, at most MAX_EXECUTE_STEPS per call. Destructive work stays
 * behind dedicated RED tools with human confirm:true. */

export const EXECUTE_ACTIONS = ["search", "create_page", "create_task", "update_page", "append_blocks"] as const;
export type ExecuteAction = (typeof EXECUTE_ACTIONS)[number];
export const MAX_EXECUTE_STEPS = 12;

export interface ExecuteStep {
  action: string;
  args: Row;
  note?: string;
}

export function validateExecuteInput(
  goal: unknown,
  steps: unknown,
): { ok: true; goal: string; steps: ExecuteStep[] } | { ok: false; message: string } {
  const g = String(goal ?? "").slice(0, 500);
  if (!g.trim()) return { ok: false, message: "goal is required" };
  if (!Array.isArray(steps) || !steps.length) return { ok: false, message: "steps must be a non-empty array" };
  if (steps.length > MAX_EXECUTE_STEPS) return { ok: false, message: `max ${MAX_EXECUTE_STEPS} steps per execution` };
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i] as Row;
    const action = String((s as Row)?.action ?? "");
    if (!(EXECUTE_ACTIONS as readonly string[]).includes(action)) {
      return { ok: false, message: `step ${i + 1}: unknown action "${action}"` };
    }
    if (typeof (s as Row)?.args !== "object" || (s as Row)?.args === null) {
      return { ok: false, message: `step ${i + 1}: args must be an object` };
    }
  }
  return { ok: true, goal: g, steps: steps as ExecuteStep[] };
}

/* ─── RED confirmation gate ───
 * Destructive tools never run on faith: first call returns
 * awaiting_confirmation, the human approves, the client re-calls with
 * confirm:true. Both payload shapes (text + structuredContent) share these
 * builders so agents can parse either. */

export function awaitingConfirmationPayload(tool: string): Row {
  return {
    status: "awaiting_confirmation",
    error: "DESTRUCTIVE_ACTION_REQUIRES_CONFIRMATION",
    tool,
    risk: "RED",
    how_to_proceed: "Re-call this tool with confirm:true in arguments once the user approves.",
  };
}

export function awaitingConfirmationStructured(tool: string): Row {
  return { status: "awaiting_confirmation", tool, risk: "RED" };
}

/** RED tools require an explicit second call with confirm:true. */
export function redGateAllows(risk: string, confirmArg: unknown): boolean {
  if (risk !== "RED") return true;
  return confirmArg === true;
}

/* ─── Idempotency ─── */

export function idempotencyRecordKey(tool: string, key: string): string {
  return `${tool}:${key}`;
}

export function isIdempotencyReplayable(createdAtMs: number, nowMs: number): boolean {
  if (!Number.isFinite(createdAtMs) || !Number.isFinite(nowMs)) return false;
  const age = nowMs - createdAtMs;
  return age >= 0 && age < IDEMPOTENCY_WINDOW_MS;
}

/* ─── Sessions (Streamable HTTP lifecycle) ─── */

export const SESSION_ID_PREFIX = "noska_";
const SESSION_ID_RE = /^noska_[0-9a-f]{24}$/;

export function newSessionId(): string {
  return `${SESSION_ID_PREFIX}${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

export function isSessionIdFormat(s: unknown): boolean {
  return typeof s === "string" && SESSION_ID_RE.test(s);
}

export function isSessionExpired(createdMs: number, nowMs: number): boolean {
  if (!Number.isFinite(createdMs) || !Number.isFinite(nowMs)) return true;
  return nowMs - createdMs > SESSION_TTL_MS;
}

/* ─── MCP resources: URI routing ─── */

export type ResourceRef =
  | { kind: "workspace-current" }
  | { kind: "page"; id: string }
  | { kind: "agent"; id: string }
  | { kind: "automation"; id: string };

const UUID_TAIL = "([0-9a-f-]{36})";

export function parseResourceUri(uri: unknown): ResourceRef | null {
  if (typeof uri !== "string") return null;
  if (uri === "noska://workspace/current") return { kind: "workspace-current" };
  let m = new RegExp(`^noska://page/${UUID_TAIL}$`, "i").exec(uri);
  if (m) return { kind: "page", id: m[1].toLowerCase() };
  m = new RegExp(`^noska://agent/${UUID_TAIL}$`, "i").exec(uri);
  if (m) return { kind: "agent", id: m[1].toLowerCase() };
  m = new RegExp(`^noska://automation/${UUID_TAIL}$`, "i").exec(uri);
  if (m) return { kind: "automation", id: m[1].toLowerCase() };
  return null;
}

/* ─── Discovery documents (ChatGPT / Claude connector probes) ───
 * Pure builders: no secrets in, no secrets out — safe to unit-test that
 * they never embed a credential. */

export const CORS_ALLOW_HEADERS =
  "Content-Type, Authorization, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID, baggage, traceparent, sentry-trace";

export const DISCOVERY_SCOPES = [
  "pages:read", "pages:write", "tasks:read", "tasks:write",
  "reviews:read", "reviews:write", "search:read", "databases:read",
  "databases:write", "workspaces:read", "workspaces:write",
  "templates:read", "templates:write", "dashboards:read", "dashboards:write",
  "agents:read", "agents:run", "automations:read", "automations:run",
  "webhooks:manage", "events:read", "connections:manage", "intelligence:execute",
];

export function buildDiscoveryDocs(mcpBase: string, oauthBase: string): {
  authorizationServer: Row;
  protectedResource: Row;
  manifest: Row;
} {
  return {
    authorizationServer: {
      issuer: oauthBase,
      authorization_endpoint: `${oauthBase}/authorize`,
      token_endpoint: `${oauthBase}/token`,
      registration_endpoint: `${oauthBase}/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic", "none"],
    },
    protectedResource: {
      resource: mcpBase,
      authorization_servers: [oauthBase],
      bearer_methods_supported: ["header"],
      scopes_supported: [...DISCOVERY_SCOPES],
    },
    manifest: {
      name: "noska",
      protocolVersions: [...SUPPORTED_PROTOCOLS],
      transport: "streamable-http",
      endpoint: mcpBase,
      capabilities: { tools: {}, resources: {}, prompts: {} },
      auth: {
        type: "oauth+apikey",
        oauth: { authorization_endpoint: `${oauthBase}/authorize`, token_endpoint: `${oauthBase}/token` },
        apiKey: { header: "Authorization: Bearer nsk_…", query: "?key=nsk_… (header-less clients only)" },
      },
    },
  };
}

/* ─── Result envelopes (what ChatGPT / Claude / agents actually parse) ───
 * Every tools/call success carries BOTH human-readable text and
 * machine-readable structuredContent; every failure carries isError:true.
 * Builders keep the two in sync — a drift here breaks agent runtimes. */

export function buildToolResult(payload: unknown): Row {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
  };
}

export function buildToolErrorPayload(code: string, message: string, extra: Row = {}): Row {
  return { error: code, message, ...extra };
}

export function buildToolErrorResult(code: string, message: string, extra: Row = {}): Row {
  const structured = buildToolErrorPayload(code, message, extra);
  return {
    content: [{ type: "text", text: JSON.stringify(structured) }],
    structuredContent: structured,
    isError: true,
  };
}
