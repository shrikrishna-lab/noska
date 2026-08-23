// ============================================================================
// Noska MCP v4 — full native control layer over the real Noska platform.
//
// Deploy: supabase functions deploy mcp --no-verify-jwt
// Auth:    Authorization: Bearer nsk_… (user_api_keys, SHA-256 hashed)
// Design:  thin server over tools.ts capability registry. Mutations are
//          verified against persisted state; RED-risk ops require
//          confirm:true; optional idempotency_key prevents duplicate
//          mutations via the api_idempotency_keys table.
// ============================================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { authenticate, requireScope, McpError, type KeyRow, db } from "./shared.ts";
import { TOOLS } from "./tools.ts";

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_NAME = "noska";
const SERVER_VERSION = "4.0.0";

function cors(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin.includes("localhost") || origin.includes("127.0.0.1") ? origin : "*",
    "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id, baggage, traceparent, sentry-trace",
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
const rpcErr = (id: RpcRequest["id"], code: number | string, message: string) =>
  ({ jsonrpc: "2.0", id, error: { code, message } });

Deno.serve(async (req: Request) => {
  const headers = cors(req.headers.get("origin") ?? "*");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method === "GET") {
    return new Response(JSON.stringify({
      name: SERVER_NAME, version: SERVER_VERSION, protocol: PROTOCOL_VERSION,
      transport: "streamable-http",
      capabilities: TOOLS.length,
      groups: [...new Set(TOOLS.map((t) => t.group))],
      usage: 'JSON-RPC 2.0 POSTs here · Authorization: Bearer nsk_…',
    }), { headers });
  }
  if (req.method === "DELETE") return new Response(null, { status: 204, headers });
  if (req.method !== "POST")
    return new Response(JSON.stringify(rpcErr(null, -32600, "Method not allowed")), { status: 405, headers });

  let body: RpcRequest;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify(rpcErr(null, -32700, "Parse error")), { status: 400, headers });
  }
  if (body.method?.startsWith("notifications/")) return new Response(null, { status: 202, headers });

  /* ── Auth: EVERY JSON-RPC method requires a valid key ── */
  let KEY: KeyRow;
  try { KEY = await authenticate(req); } catch (err) {
    const e = err as McpError;
    return new Response(JSON.stringify(rpcErr(body.id ?? null, e.code ?? "AUTH_REQUIRED", e.message)), { status: e.status ?? 401, headers });
  }

  try {
    switch (body.method) {
      case "initialize":
        return new Response(JSON.stringify(rpcOk(body.id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
          instructions:
            "You are operating Noska — the user's personal knowledge workspace — through its native MCP control layer. Workflow: search/get-workspace-context to discover, fetch for markdown content (URL or UUID), create-pages/update-page/execute-command to write native blocks, list-tasks/create-task/update-task for todos, list-reviews/add-study-card/create-study-plan for spaced repetition, databases tools for collections/views, agent+automation CRUD for the Noska intelligence platform, verify after mutations. Every mutation returns ids/urls you can chain.",
        })), { headers });

      case "ping":
        return new Response(JSON.stringify(rpcOk(body.id, {})), { headers });

      case "tools/list":
        return new Response(JSON.stringify(rpcOk(body.id, {
          tools: TOOLS.map((t) => ({
            name: t.name,
            description: `[${t.risk}] [${t.scope}] ${t.description}`,
            inputSchema: t.inputSchema,
            "x-group": t.group,
            "x-risk": t.risk,
          })),
        })), { headers });

      case "tools/call": {
        const name = String(body.params?.name ?? "");
        const tool = TOOLS.find((t) => t.name === name);
        if (!tool) return new Response(JSON.stringify(rpcErr(body.id, -32602, `Unknown tool "${name}"`)), { headers });

        const args = { ...((body.params?.arguments ?? {}) as Record<string, unknown>) };

        /* Confirmation gate for destructive (RED) capabilities. */
        let confirm = false;
        if (tool.risk === "RED") {
          confirm = args.confirm === true;
          delete args.confirm;
          if (!confirm) {
            return new Response(JSON.stringify(rpcOk(body.id, {
              content: [{ type: "text", text: JSON.stringify({
                status: "awaiting_confirmation",
                tool: name,
                risk: "RED",
                how_to_proceed: "Re-call this tool with confirm:true in arguments once the user approves.",
              }) }],
              isError: true,
            })), { headers });
          }
        }

        requireScope(KEY, tool.scope);

        /* Idempotency replay (optional idempotency_key argument). */
        const idemKey = typeof args.idempotency_key === "string" ? args.idempotency_key.trim() : "";
        delete args.idempotency_key;

        try {
          const keyRow: KeyRow = KEY;
          if (idemKey) {
            const { data: prior } = await db.from("api_idempotency_keys")
              .select("response_body,created_at").eq("api_key_id", keyRow.id).eq("idempotency_key", `${name}:${idemKey}`).maybeSingle();
            if (prior?.response_body && Date.now() - new Date((prior as { created_at: string }).created_at).getTime() < 86400000) {
              return new Response(JSON.stringify(rpcOk(body.id, {
                content: [{ type: "text", text: JSON.stringify({ ...(prior.response_body as object), idempotency_replayed: true }) }],
              })), { headers });
            }
          }

          const output = await tool.handler(args, keyRow);
          const payload = tool.verifyTable
            ? await attachVerification(keyRow, name, args, output, tool.verifyTable)
            : output;

          if (idemKey) {
            await db.from("api_idempotency_keys").upsert({
              api_key_id: keyRow.id, idempotency_key: `${name}:${idemKey}`,
              endpoint: `mcp:${name}`, response_status: 200,
              response_body: payload as never,
            }, { onConflict: "api_key_id,idempotency_key" }).then(undefined, () => {});
          }

          db.from("user_api_keys").update({ last_used_at: new Date().toISOString() })
            .eq("id", keyRow.id).then(undefined, () => {});

          return new Response(JSON.stringify(rpcOk(body.id, {
            content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
          })), { headers });
        } catch (err) {
          if (err instanceof McpError) {
            return new Response(JSON.stringify(rpcOk(body.id, {
              content: [{ type: "text", text: JSON.stringify({ error: err.code, message: err.message }) }],
              isError: true,
            })), { headers });
          }
          throw err;
        }
      }

      default:
        return new Response(JSON.stringify(rpcErr(body.id, -32601, `Method not found: ${body.method}`)), { headers });
    }
  } catch (err) {
    console.error("[mcp] unhandled:", err);
    return new Response(JSON.stringify(rpcErr(body.id, -32603, "Internal error")), { status: 500, headers });
  }
});


/* Post-mutation verification: re-read the row and confirm it persisted. */
import { db as _db } from "./shared.ts";
async function attachVerification(
  key: { user_id: string },
  _toolName: string,
  args: Record<string, unknown>,
  output: unknown,
  vt: { table: string; ownerCol: "user_id" | "owner_id" },
): Promise<unknown> {
  const ref = args.page_id_or_url ?? args.id_or_url ?? args.agent_id ?? args.automation_id;
  const id = typeof ref === "string" ? (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.exec(ref)?.[0]?.toLowerCase() ?? null) : null;
  if (!id) return output;
  const { data } = await _db.from(vt.table).select("*").eq(vt.ownerCol, key.user_id).eq("id", id).maybeSingle();
  return { ...(output as object), verified: Boolean(data) };
}
