// ============================================================================
// Noska MCP v5.1 — production choke point.
//
// Every JSON-RPC request flows through, in order:
//   authenticate → resolve tool → POLICY → RATE LIMIT → EXECUTION BUDGET
//   → handler → VERIFY → AUDIT
//
// Policy decisions live in _shared/mcp/policy.ts — never in tools.
// Audit rows never contain secrets or full arguments.
//
// Transport: Streamable HTTP (MCP 2025-06-18, with graceful fallback to
// 2025-03-26 / 2024-11-05 for older clients — Notion-era agents, custom
// runtimes). Supports:
//   - Authorization: Bearer nsk_… (API key) AND Bearer noska_at_… (OAuth)
//   - ?key=nsk_… one-link fallback for header-less clients (ChatGPT
//     connectors, some agent runtimes) — never logged
//   - Mcp-Session-Id lifecycle (initialize → POST/GET → DELETE)
//   - GET SSE keepalive for stateful clients, DELETE session close
//   - JSON-RPC batch arrays, ping, notifications/* (202)
//   - RFC 8414 / RFC 9728 discovery for ChatGPT + Claude connectors
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { authenticate, McpError, type KeyRow } from "./shared.ts";
import { PlatformError } from "../_shared/core/pure.ts";
import { assertWorkspaceAccess } from "../_shared/capabilities/platform.ts";
import {
  authorizeTool, authorizeWorkspaceAction, PolicyError, PolicyErrors,
  type PolicyTool, type WorkspaceContext,
} from "../_shared/mcp/policy.ts";
import {
  SUPPORTED_PROTOCOLS, PROTOCOL_VERSION_DEFAULT,
  RATE_LIMIT_PER_MINUTE, EXECUTIONS_PER_HOUR, SESSION_TTL_MS,
  CORS_ALLOW_HEADERS, MAX_BATCH_SIZE,
  negotiateProtocol, annotationsFor, toolVisibleToKey,
  newSessionId, isSessionExpired, buildDiscoveryDocs, isBatchTooLarge,
  awaitingConfirmationPayload, awaitingConfirmationStructured,
  idempotencyRecordKey, isIdempotencyReplayable,
  buildToolResult, buildToolErrorResult,
} from "./protocol.ts";
import { TOOLS } from "./tools.ts";
import { TOOLS_V5 } from "./tools-v5.ts";
import { TOOLS_V6, RESOURCES, PROMPTS, readResource, getPrompt } from "./tools-v6.ts";

const PROTOCOL_VERSION = PROTOCOL_VERSION_DEFAULT;
const SERVER_NAME = "noska";
const SERVER_VERSION = "5.1.0";

/* Dedupe by name — LAST registry wins. (V4 registered run-agent /
 * run-automation as honest UNSUPPORTED stubs; V5 registers the real
 * server-side executors under the same names. Spreading naively would
 * shadow the real implementations with the stubs.) */
const _ALL = [...TOOLS, ...TOOLS_V5, ...TOOLS_V6];
const _byName = new Map<string, (typeof _ALL)[number]>();
for (const t of _ALL) _byName.set(t.name, t);
const ALL_TOOLS = [..._byName.values()];
const RATE_LIMIT_PER_MINUTE = 120;
const EXECUTIONS_PER_HOUR = 20;

/* ─── Session store (per-isolate; sessions are opaque + short-lived) ─── */
const sessions = new Map<string, { created: number; client: string; protocol: string }>();
function pruneSessions(): void {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (isSessionExpired(s.created, now)) sessions.delete(id);
  }
  if (sessions.size > 5_000) {
    const oldest = [...sessions.entries()].sort((a, b) => a[1].created - b[1].created)[0];
    if (oldest) sessions.delete(oldest[0]);
  }
}

const svc = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

function cors(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin.includes("localhost") || origin.includes("127.0.0.1") ? origin : "*",
    "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": CORS_ALLOW_HEADERS,
    "Access-Control-Expose-Headers": "Mcp-Session-Id, MCP-Protocol-Version",
    "Content-Type": "application/json",
  };
}

interface RpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}
const rpcOk = (id: RpcRequest["id"], result: unknown) => ({ jsonrpc: "2.0", id, result });
const rpcErr = (id: RpcRequest["id"], code: number | string, message: string, data?: unknown) =>
  ({ jsonrpc: "2.0", id, error: { code, message, ...(data ? { data } : {}) } });

/** Translate auth failures into the stable error contract (§34). */
function authCodeFromMessage(message: string): string {
  if (/revoked/i.test(message)) return "TOKEN_REVOKED";
  if (/expired/i.test(message)) return "TOKEN_EXPIRED";
  return "AUTH_REQUIRED";
}

/** tools/list visibility + MCP annotations now live in protocol.ts
 *  (single source of truth, covered by unit tests). */

/** Fixed-window rate limit, shared with the REST API budget. */
async function rateLimit(key: KeyRow): Promise<void> {
  const windowStart = new Date(Math.floor(Date.now() / 60000) * 60000).toISOString();
  const { data, error } = await svc.rpc("consume_api_rate_limit", {
    p_api_key_id: key.id,
    p_window_start: windowStart,
  });
  if (error) {
    console.error("[mcp] rate-limit rpc failed:", error.message);
    return; // fail open, logged
  }
  if (Number(data ?? 0) > RATE_LIMIT_PER_MINUTE) {
    const reset = Math.ceil(windowStart ? new Date(windowStart).getTime() / 1000 : 0) + 60;
    throw PolicyErrors.rateLimited(Math.max(1, reset - Math.floor(Date.now() / 1000)));
  }
}

/** Execution tools get a hard hourly budget per credential. */
async function executionBudget(key: KeyRow): Promise<void> {
  const since = new Date(Date.now() - 3_600_000).toISOString();
  const { count, error } = await svc
    .from("agent_runs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", key.user_id)
    .gte("created_at", since);
  if (error) return; // fail open, logged
  if ((count ?? 0) >= EXECUTIONS_PER_HOUR) {
    throw PolicyErrors.executionBudget(EXECUTIONS_PER_HOUR);
  }
}

/** Workspace tools validate the requested workspace and map risk→action. */
async function workspaceGuard(tool: PolicyTool, args: Record<string, unknown>): Promise<void> {
  if (tool.group !== "workspace") return;
  const wsId = typeof args.workspace_id === "string" && args.workspace_id.trim()
    ? args.workspace_id.trim()
    : null;
  if (!wsId) return; // list-style tools scope to the user
  const ws = await assertWorkspaceAccess(args.__userId as string, wsId);
  const isOwner = ws.owner_id === args.__userId;
  const { data: member } = await svc.from("workspace_members")
    .select("role").eq("workspace_id", wsId).eq("user_id", args.__userId).maybeSingle();
  const role = (isOwner ? "owner" : (member?.role as WorkspaceContext["role"]) ?? "none") as WorkspaceContext["role"];
  const action = tool.risk === "GREEN" ? "read" : "write";
  authorizeWorkspaceAction({ workspaceId: wsId, role }, action);
}

/** Append-only audit — metadata only, never secrets or full args. */
async function audit(entry: {
  key: KeyRow; tool: string; ok: boolean; code?: string;
  latencyMs: number; client: string; requestId: string;
}): Promise<void> {
  svc.from("developer_audit_log").insert({
    user_id: entry.key.user_id,
    action: `mcp.${entry.tool}`,
    resource: "tool",
    resource_id: entry.tool,
    surface: "mcp",
    api_key_id: entry.key.id.startsWith("oauth:") ? null : entry.key.id,
    request_id: entry.requestId,
    metadata: {
      ok: entry.ok,
      code: entry.code ?? null,
      latency_ms: entry.latencyMs,
      client: entry.client.slice(0, 60),
    },
  }).then(undefined, () => {});
}

/* ─── OAuth / MCP discovery (public — no auth) ───
 * ChatGPT + Claude connectors probe these before registering a remote
 * MCP server. Served from the same function so the server URL never
 * needs a second deployment. */
function discoveryResponse(req: Request, headers: Record<string, string>): Response | null {
  const url = new URL(req.url);
  const path = url.pathname;
  const origin = `${url.protocol}//${url.host}`;
  // Supabase serves this fn at /functions/v1/mcp; extra path may follow.
  const mcpBase = `${origin}/functions/v1/mcp`;
  const oauthBase = `${origin}/functions/v1/oauth`;
  const docs = buildDiscoveryDocs(mcpBase, oauthBase);

  if (path.endsWith("/.well-known/oauth-authorization-server") || path.endsWith("/.well-known/oauth-authorization-server/mcp")) {
    return new Response(JSON.stringify(docs.authorizationServer), { headers });
  }
  if (path.endsWith("/.well-known/oauth-protected-resource") || path.endsWith("/.well-known/oauth-protected-resource/mcp")) {
    return new Response(JSON.stringify(docs.protectedResource), { headers });
  }
  if (path.endsWith("/.well-known/mcp.json") || path.endsWith("/mcp.json")) {
    return new Response(JSON.stringify({
      ...docs.manifest,
      version: SERVER_VERSION,
      toolCount: ALL_TOOLS.length,
      groups: [...new Set(ALL_TOOLS.map((t) => t.group))],
    }), { headers });
  }
  return null;
}

Deno.serve(async (req: Request) => {
  const headers = cors(req.headers.get("origin") ?? "*");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });

  /* Public discovery first (ChatGPT/Claude probe without credentials). */
  const disco = discoveryResponse(req, headers);
  if (disco) return disco;

  if (req.method === "GET") {
    const sessionId = req.headers.get("Mcp-Session-Id") ?? "";
    const accept = req.headers.get("Accept") ?? "";
    // Stateful clients open a long-lived SSE stream after initialize.
    if (sessionId && sessions.has(sessionId) && accept.includes("text/event-stream")) {
      const stream = new ReadableStream({
        start(controller) {
          const enc = new TextEncoder();
          controller.enqueue(enc.encode(": noska sse open\n\n"));
          const ping = setInterval(() => {
            try { controller.enqueue(enc.encode(": ping\n\n")); } catch { /* closed */ }
          }, 25_000);
          const close = () => { clearInterval(ping); try { controller.close(); } catch { /* noop */ } };
          (req.signal as AbortSignal | undefined)?.addEventListener("abort", close);
          setTimeout(close, 50_000);
        },
      });
      return new Response(stream, {
        headers: {
          ...headers,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "Mcp-Session-Id": sessionId,
        },
      });
    }
    return new Response(JSON.stringify({
      name: SERVER_NAME, version: SERVER_VERSION, protocol: PROTOCOL_VERSION,
      protocolVersions: SUPPORTED_PROTOCOLS,
      transport: "streamable-http",
      capabilities: ALL_TOOLS.length,
      toolCount: ALL_TOOLS.length,
      groups: [...new Set(ALL_TOOLS.map((t) => t.group))],
      features: ["tools", "resources", "prompts"],
      auth: ["Authorization: Bearer nsk_…", "Authorization: Bearer noska_at_… (OAuth)", "?key=nsk_… (header-less clients)"],
      discovery: ["./.well-known/oauth-authorization-server", "./.well-known/oauth-protected-resource", "./.well-known/mcp.json"],
      usage: "JSON-RPC 2.0 POSTs here · Authorization: Bearer nsk_… (or ?key=)",
    }), { headers });
  }
  if (req.method === "DELETE") {
    const sid = req.headers.get("Mcp-Session-Id") ?? "";
    if (sid) sessions.delete(sid);
    return new Response(null, { status: 204, headers });
  }
  if (req.method !== "POST")
    return new Response(JSON.stringify(rpcErr(null, -32600, "Method not allowed")), { status: 405, headers });

  let rawBody: unknown;
  try { rawBody = await req.json(); } catch {
    return new Response(JSON.stringify(rpcErr(null, -32700, "Parse error")), { status: 400, headers });
  }
  const batch = Array.isArray(rawBody) ? rawBody as RpcRequest[] : [rawBody as RpcRequest];
  if (isBatchTooLarge(batch.length)) {
    return new Response(JSON.stringify(rpcErr(null, -32600, `Batch too large (max ${MAX_BATCH_SIZE})`)), { status: 400, headers });
  }
  // JSON-RPC notifications (no id) → 202, never authenticated.
  if (batch.length === 1 && batch[0].method?.startsWith("notifications/")) {
    return new Response(null, { status: 202, headers });
  }

  /* ── Auth: EVERY method requires a valid credential ── */
  let KEY: KeyRow;
  try {
    KEY = await authenticate(req);
  } catch (err) {
    const e = err as PlatformError;
    const code = e.code === "AUTH_REQUIRED" ? authCodeFromMessage(e.message) : e.code;
    return new Response(JSON.stringify(rpcErr((batch[0] as RpcRequest).id ?? null, code, e.message)), { status: e.status ?? 401, headers });
  }

  // Session validation: unknown session ids ask the client to re-initialize
  // (404 per the Streamable HTTP spec) rather than failing opaquely.
  const reqSession = req.headers.get("Mcp-Session-Id") ?? "";
  if (reqSession && !sessions.has(reqSession) && batch.some((m) => m.method !== "initialize")) {
    return new Response(JSON.stringify(rpcErr(batch[0].id ?? null, -32001, "Session expired — re-run initialize.")), { status: 404, headers });
  }
  pruneSessions();

  const client = (req.headers.get("user-agent") ?? "unknown").split("/")[0];
  const requestId = crypto.randomUUID();

  async function handleOne(body: RpcRequest): Promise<unknown> {
    if (body.method?.startsWith("notifications/")) return null;
    switch (body.method) {
      case "initialize": {
        const protocol = negotiateProtocol((body.params as Record<string, unknown> | undefined)?.protocolVersion);
        const sid = newSessionId();
        sessions.set(sid, { created: Date.now(), client, protocol });
        (handleOne as { _sid?: string })._sid = sid;
        return rpcOk(body.id, {
          protocolVersion: protocol,
          capabilities: {
            tools: { listChanged: false },
            resources: { subscribe: false, listChanged: false },
            prompts: { listChanged: false },
            logging: {},
            completions: {},
          },
          serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
          instructions:
            "You are operating Noska — the user's personal knowledge workspace — through its native MCP control layer. " +
            "Discover with search/get-workspace-context, read via fetch/resources, write with create-pages/append-blocks/execute-command, " +
            "manage rich tasks, spaced repetition, databases, workspaces, templates and dashboards, " +
            "execute agents and automations server-side (run-agent/run-automation with inspect/cancel/retry), " +
            "and use noska_execute for bounded multi-step goals. Every mutation is verified against persisted state; " +
            "destructive tools require confirm:true.",
        });
      }

      case "ping":
        return rpcOk(body.id, {});

      case "tools/list": {
        const params = (body.params ?? {}) as { cursor?: unknown };
        const cursor = typeof params.cursor === "string" ? params.cursor : "";
        const visible = ALL_TOOLS.filter((t) => toolVisibleToKey(KEY, t));
        // Simple opaque pagination (page size 100) for strict clients.
        const PAGE = 100;
        let start = 0;
        if (cursor) {
          const n = Number.parseInt(cursor, 10);
          if (Number.isFinite(n) && n >= 0) start = n;
        }
        const slice = visible.slice(start, start + PAGE);
        return rpcOk(body.id, {
          tools: slice.map((t) => ({
            name: t.name,
            // Keep the human-readable risk/scope prefix for older clients,
            // but ALSO expose machine-readable annotations + _meta so
            // ChatGPT/Claude/agents can gate without parsing strings.
            description: `[${t.risk}] [${t.scope}] ${t.description}`,
            inputSchema: t.inputSchema,
            annotations: annotationsFor(t.risk),
            _meta: { scope: t.scope, risk: t.risk, group: t.group },
            "x-group": t.group,
            "x-risk": t.risk,
            "x-scope": t.scope,
          })),
          ...(start + PAGE < visible.length ? { nextCursor: String(start + PAGE) } : {}),
          _meta: { total: visible.length, hidden: ALL_TOOLS.length - visible.length },
        });
      }

      /* ── MCP Resources (§16) ── */
      case "resources/list":
        return rpcOk(body.id, {
          resources: [{
            uri: "noska://workspace/current",
            name: "Current workspace context",
            description: "Compact snapshot: pages, open tasks, due reviews, agents, automations.",
            mimeType: "application/json",
          }],
          resourceTemplates: RESOURCES,
        });

      case "resources/read": {
        const uri = String(body.params?.uri ?? "");
        await rateLimit(KEY);
        const contents = await readResource(uri, KEY);
        return rpcOk(body.id, { contents });
      }

      /* ── MCP Prompts (§17) ── */
      case "prompts/list":
        return rpcOk(body.id, { prompts: PROMPTS });

      case "prompts/get": {
        const name = String(body.params?.name ?? "");
        const args = (body.params?.arguments ?? {}) as Record<string, unknown>;
        await rateLimit(KEY);
        const prompt = await getPrompt(name, args, KEY);
        return rpcOk(body.id, prompt);
      }

      case "completion/complete":
        return rpcOk(body.id, { completion: { values: [], hasMore: false } });

      case "tools/call": {
        const name = String(body.params?.name ?? "");
        const tool = ALL_TOOLS.find((t) => t.name === name);
        if (!tool) return rpcErr(body.id, -32602, `Unknown tool "${name}"`, { code: "TOOL_NOT_FOUND" });

        const args = { ...((body.params?.arguments ?? {}) as Record<string, unknown>) };
        (args as Record<string, unknown>).__userId = KEY.user_id;

        /* Confirmation gate for destructive (RED) capabilities (§12). */
        let confirm = false;
        if (tool.risk === "RED") {
          confirm = args.confirm === true;
          delete args.confirm;
          if (!confirm) {
            return rpcOk(body.id, {
              content: [{ type: "text", text: JSON.stringify(awaitingConfirmationPayload(name)) }],
              structuredContent: awaitingConfirmationStructured(name),
              isError: true,
            });
          }
        }

        const t0 = Date.now();
        try {
          /* ── POLICY (single choke point) ── */
          const policyTool: PolicyTool = {
            name: tool.name, scope: tool.scope, risk: tool.risk,
            executes: tool.group === "agents" && name.startsWith("run-")
              || tool.group === "automations" && name.startsWith("run-")
              || name === "noska_execute",
          };
          authorizeTool(KEY, policyTool);

          /* ── RATE LIMIT ── */
          await rateLimit(KEY);

          /* ── EXECUTION BUDGET ── */
          if (policyTool.executes) await executionBudget(KEY);

          /* ── WORKSPACE GUARD ── */
          await workspaceGuard(tool, args);
          delete (args as Record<string, unknown>).__userId;

          /* Idempotency replay (optional idempotency_key argument). */
          const idemKey = typeof args.idempotency_key === "string" ? args.idempotency_key.trim() : "";
          delete args.idempotency_key;

          let payload: unknown;
          if (idemKey) {
            const { data: prior } = await svc.from("api_idempotency_keys")
              .select("response_body,created_at").eq("api_key_id", KEY.id).eq("idempotency_key", idempotencyRecordKey(name, idemKey)).maybeSingle();
            if (prior?.response_body && isIdempotencyReplayable(new Date((prior as { created_at: string }).created_at).getTime(), Date.now())) {
              payload = { ...(prior.response_body as object), idempotency_replayed: true };
            }
          }

          if (payload === undefined) {
            const output = await tool.handler(args, KEY);
            payload = tool.verifyTable
              ? await attachVerification(KEY, name, args, output, tool.verifyTable)
              : output;

            if (idemKey && !KEY.id.startsWith("oauth:")) {
              await svc.from("api_idempotency_keys").upsert({
                api_key_id: KEY.id, idempotency_key: idempotencyRecordKey(name, idemKey),
                endpoint: `mcp:${name}`, response_status: 200,
                response_body: payload as never,
              }, { onConflict: "api_key_id,idempotency_key" }).then(undefined, () => {});
            }
          }

          if (!KEY.id.startsWith("oauth:")) {
            svc.from("user_api_keys").update({ last_used_at: new Date().toISOString() })
              .eq("id", KEY.id).then(undefined, () => {});
          }
          audit({ key: KEY, tool: name, ok: true, latencyMs: Date.now() - t0, client, requestId });

          // Newer clients (ChatGPT agents, Claude Code) read the
          // machine-readable structuredContent alongside the text payload.
          return rpcOk(body.id, buildToolResult(payload));
        } catch (err) {
          const code = err instanceof PolicyError ? err.code
            : err instanceof McpError || err instanceof PlatformError ? err.code : "TOOL_FAILED";
          const message = err instanceof Error ? err.message : "Tool execution failed";
          audit({ key: KEY, tool: name, ok: false, code, latencyMs: Date.now() - t0, client, requestId });
          const status = err instanceof PolicyError ? err.status : err instanceof McpError || err instanceof PlatformError ? err.status : 500;
          const result = {
            jsonrpc: "2.0", id: body.id,
            result: buildToolErrorResult(code, message, err instanceof PolicyError ? err.extra : {}),
          };
          // Preserve the pre-5.1 status contract: client errors (403 scope
          // denials, 429 budgets) keep their HTTP status so existing
          // integrations keep working; 5xx stays inside JSON-RPC 200 so
          // strict MCP clients (ChatGPT/Claude) can read the payload.
          // handleOne callers detect the marker and build the Response.
          return { __httpStatus: status >= 500 ? 200 : status, __rpc: result };
        }
      }

      default:
        return rpcErr(body.id, -32601, `Method not found: ${body.method}`);
    }
  }

  try {
    if (batch.length > 1 || (batch[0] as RpcRequest).id === undefined) {
      const out: unknown[] = [];
      let batchStatus = 200;
      for (const m of batch) {
        const r = await handleOne(m);
        if (r === null) continue;
        const marked = r as { __httpStatus?: number; __rpc?: unknown };
        if (marked && typeof marked.__httpStatus === "number" && marked.__rpc) {
          out.push(marked.__rpc);
          if (marked.__httpStatus !== 200) batchStatus = marked.__httpStatus;
        } else {
          out.push(r);
        }
      }
      // All-notifications batch → 202 with no body.
      if (!out.length) return new Response(null, { status: 202, headers });
      const sid = (handleOne as { _sid?: string })._sid;
      const h = sid ? { ...headers, "Mcp-Session-Id": sid } : headers;
      if (batchStatus === 429) h["Retry-After"] = "60";
      return new Response(JSON.stringify(out), { status: batchStatus === 200 ? 200 : batchStatus, headers: h });
    }
    const res = await handleOne(batch[0]);
    if (res === null) return new Response(null, { status: 202, headers });
    const marked = res as { __httpStatus?: number; __rpc?: unknown };
    const outSid = (handleOne as { _sid?: string })._sid;
    const h = outSid ? { ...headers, "Mcp-Session-Id": outSid } : headers;
    if (marked && typeof marked.__httpStatus === "number" && marked.__rpc) {
      if (marked.__httpStatus === 429) h["Retry-After"] = "60";
      return new Response(JSON.stringify(marked.__rpc), { status: marked.__httpStatus, headers: h });
    }
    return new Response(JSON.stringify(res), { headers: h });
  } catch (err) {
    if (err instanceof PolicyError) {
      if (err.code === "RATE_LIMITED") headers["Retry-After"] = "60";
      return new Response(JSON.stringify(rpcErr(batch[0].id, err.code, err.message, err.extra)), { status: err.status, headers });
    }
    console.error("[mcp] unhandled:", err);
    return new Response(JSON.stringify(rpcErr(batch[0].id, -32603, "Internal error")), { status: 500, headers });
  }
});

/* Post-mutation verification: re-read the row(s) and confirm persistence. */
import { db as _db } from "./shared.ts";
async function attachVerification(
  key: { user_id: string },
  _toolName: string,
  args: Record<string, unknown>,
  output: unknown,
  vt: { table: string; ownerCol: "user_id" | "owner_id" },
): Promise<unknown> {
  const out = (output ?? {}) as Record<string, unknown>;
  // Collect every id the mutation claims to have created/touched:
  // single refs (page_id_or_url / agent_id / …) plus created[] arrays
  // (create-pages returns one row per page).
  const candidates: string[] = [];
  const pushId = (v: unknown) => {
    if (typeof v !== "string") return;
    const m = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.exec(v)?.[0]?.toLowerCase();
    if (m) candidates.push(m);
  };
  pushId(args.page_id_or_url ?? args.id_or_url ?? args.agent_id ?? args.automation_id);
  const created = (out as { created?: unknown }).created;
  if (Array.isArray(created)) {
    for (const c of created.slice(0, 10)) pushId((c as Record<string, unknown>)?.id);
  }
  for (const k of ["page_id", "id", "workspace_id"] as const) pushId((out as Record<string, unknown>)[k]);
  const ws = (out as { workspace?: { id?: unknown } }).workspace;
  if (ws) pushId(ws.id);

  if (!candidates.length) return output;
  // Verify the FIRST claimed id; report how many were checked.
  const id = candidates[0];
  const { data } = await _db.from(vt.table).select("id").eq(vt.ownerCol, key.user_id).eq("id", id).maybeSingle();
  return { ...(out as object), verified: Boolean(data), verified_count: data ? candidates.length : 0 };
}
