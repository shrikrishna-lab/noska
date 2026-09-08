/* ============================================================================
 * Connector Gateway — minimal MCP client (JSON-RPC 2.0 over Streamable HTTP).
 *
 * Noska's own MCP server (supabase/functions/mcp) is hand-rolled JSON-RPC;
 * this is the matching client half for talking to EXTERNAL MCP servers as
 * connectors. Deliberately no SDK: the edge runtime only needs
 * initialize → tools/list → tools/call, and pulling the full npm SDK into
 * the bundle for three methods is not worth it.
 *
 * Tokens are injected per-call via the Authorization header by the caller
 * (gateway.ts) — a McpClient instance never persists or returns them.
 * ========================================================================== */

import { PlatformError } from "../core/pure.ts";

export const MCP_PROTOCOL_VERSION = "2025-06-18";

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: unknown;
  [key: string]: unknown;
}

export interface McpCallResult {
  content?: Array<{ type: string; text?: string; [key: string]: unknown }>;
  structuredContent?: unknown;
  isError?: boolean;
  [key: string]: unknown;
}

/** Transport-level failure (HTTP status, timeout, malformed response). */
export class McpTransportError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`MCP server responded ${status}`);
    this.status = status;
    this.body = body;
  }
}

/** JSON-RPC error object returned by the server (-32600, -32001, ...). */
export class McpRpcError extends Error {
  code: number;
  data: unknown;
  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.code = code;
    this.data = data;
  }
}

const SESSION_INVALID_HINTS = ["session", "not found", "expired", "uninitialized"];

export interface McpClientOptions {
  serverUrl: string;
  accessToken: string;
  timeoutMs?: number;
}

export class McpClient {
  private readonly serverUrl: string;
  private accessToken: string;
  private readonly timeoutMs: number;
  private sessionId: string | null = null;
  private nextId = 1;

  constructor(opts: McpClientOptions) {
    this.serverUrl = opts.serverUrl;
    this.accessToken = opts.accessToken;
    this.timeoutMs = opts.timeoutMs ?? 30_000;
  }

  /** initialize handshake + initialized notification (Streamable HTTP). */
  async connect(): Promise<void> {
    this.sessionId = null;
    const result = await this.rpc("initialize", {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: "noska-connector-gateway", version: "1.0.0" },
    });
    if (!result) throw new McpTransportError(502, "MCP server returned an empty initialize result");
    // The initialized notification ends the handshake; servers reply 202.
    await this.post(
      { jsonrpc: "2.0", method: "notifications/initialized" },
      this.sessionId,
      false,
    );
  }

  async listTools(): Promise<McpTool[]> {
    const result = await this.rpc("tools/list", {}) as { tools?: unknown } | null;
    return Array.isArray(result?.tools) ? result.tools as McpTool[] : [];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<McpCallResult> {
    return (await this.rpc("tools/call", { name, arguments: args ?? {} })) as McpCallResult;
  }

  /** One round trip; transparently re-initializes once if the server
   * dropped our session between calls (404/410 or a session error). */
  private async rpc(method: string, params: unknown): Promise<unknown> {
    const id = this.nextId++;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const msg = await this.post(
          { jsonrpc: "2.0", id, method, params },
          this.sessionId,
          true,
        );
        if (!msg) throw new McpTransportError(502, "MCP server returned an empty body");
        if (msg.error) throw new McpRpcError(Number(msg.error.code), String(msg.error.message), msg.error.data);
        return msg.result;
      } catch (err) {
        const retryable = err instanceof McpTransportError && (err.status === 404 || err.status === 410)
          || err instanceof McpRpcError && SESSION_INVALID_HINTS.some((h) => err.message.toLowerCase().includes(h));
        if (retryable && attempt === 0 && method !== "initialize") {
          await this.connect();
          continue;
        }
        throw err;
      }
    }
    throw new McpTransportError(502, "unreachable");
  }

  /** POST one JSON-RPC message; parses a JSON body or an SSE stream and
   * returns the response object for `id` (or null for notifications). */
  private async post(
    body: { jsonrpc: "2.0"; id?: number; method: string; params?: unknown },
    sessionId: string | null,
    expectResponse: boolean,
  ): Promise<Record<string, unknown> | null> {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), this.timeoutMs);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "Authorization": `Bearer ${this.accessToken}`,
        "MCP-Protocol-Version": MCP_PROTOCOL_VERSION,
      };
      if (sessionId) headers["Mcp-Session-Id"] = sessionId;

      const res = await fetch(this.serverUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: abort.signal,
      });
      const resSession = res.headers.get("Mcp-Session-Id");
      if (resSession) this.sessionId = resSession;
      if (!res.ok) throw new McpTransportError(res.status, (await res.text()).slice(0, 500));
      if (!expectResponse || res.status === 202 || res.headers.get("content-length") === "0") return null;

      const contentType = res.headers.get("content-type") ?? "";
      const raw = await res.text();
      if (contentType.includes("text/event-stream")) {
        return parseSseResponse(raw, typeof body.id === "number" ? body.id : null);
      }
      const json = JSON.parse(raw) as Record<string, unknown>;
      return json?.error ? json : (json as Record<string, unknown>);
    } catch (err) {
      if (err instanceof PlatformError || err instanceof McpTransportError || err instanceof McpRpcError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new McpTransportError(504, `MCP server timed out after ${this.timeoutMs}ms`);
      }
      throw new McpTransportError(502, `MCP request failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Extract the JSON-RPC response for `id` from an SSE stream body. */
function parseSseResponse(raw: string, id: number | null): Record<string, unknown> | null {
  let last: Record<string, unknown> | null = null;
  for (const event of raw.split(/\r?\n\r?\n/)) {
    const data = event.split(/\r?\n/)
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trim())
      .join("");
    if (!data) continue;
    try {
      const msg = JSON.parse(data) as Record<string, unknown>;
      last = msg;
      if (id !== null && msg.id === id) return msg;
    } catch { /* keep-alive or comment frame — ignore */ }
  }
  return last;
}
