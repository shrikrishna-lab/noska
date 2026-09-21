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
 * An empty accessToken means the server needs no auth (header omitted).
 * ========================================================================== */

import { PlatformError } from "../core/pure.ts";

export const MCP_PROTOCOL_VERSION = "2025-06-18";
/** Older servers (Notion-era, custom runtimes) may only speak these. */
export const MCP_PROTOCOL_FALLBACKS = ["2025-06-18", "2025-03-26", "2024-11-05"];

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

export interface McpResource {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
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
  /** Extra headers some providers require (e.g. Notion-Version for the
   *  Notion API, or custom auth schemes). Never logged. */
  extraHeaders?: Record<string, string>;
  /** Max attempts per RPC (default 2: one retry on timeout/502-504). */
  maxRetries?: number;
}

export class McpClient {
  private readonly serverUrl: string;
  private accessToken: string;
  private readonly timeoutMs: number;
  private readonly extraHeaders: Record<string, string>;
  private readonly maxRetries: number;
  private sessionId: string | null = null;
  private protocolVersion: string = MCP_PROTOCOL_VERSION;
  private nextId = 1;

  constructor(opts: McpClientOptions) {
    this.serverUrl = opts.serverUrl;
    this.accessToken = opts.accessToken;
    this.timeoutMs = opts.timeoutMs ?? 30_000;
    this.extraHeaders = opts.extraHeaders ?? {};
    this.maxRetries = Math.min(Math.max(opts.maxRetries ?? 2, 1), 4);
  }

  /** initialize handshake + initialized notification (Streamable HTTP).
   *  Negotiates downwards through known protocol versions so older
   *  servers (Notion, Linear-era, self-hosted) still connect. */
  async connect(): Promise<void> {
    this.sessionId = null;
    let lastErr: unknown = null;
    for (const v of MCP_PROTOCOL_FALLBACKS) {
      try {
        this.protocolVersion = v;
        const result = await this.rpc("initialize", {
          protocolVersion: v,
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
        return;
      } catch (err) {
        // Only fall back on version-mismatch signals; anything else fails fast.
        const msg = err instanceof Error ? err.message : String(err);
        const versionMismatch = err instanceof McpRpcError && (err.code === -32602 || /protocol|version|unsupported/i.test(msg));
        lastErr = err;
        if (!versionMismatch) throw err;
      }
    }
    throw lastErr instanceof Error ? lastErr : new McpTransportError(502, "MCP handshake failed");
  }

  /** Swap the bearer token without rebuilding the session (token refresh). */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  async listTools(): Promise<McpTool[]> {
    const result = await this.rpc("tools/list", {}) as { tools?: unknown } | null;
    return Array.isArray(result?.tools) ? result.tools as McpTool[] : [];
  }

  /** resources/list (the MCP resources primitive). Many servers only
   * implement tools — "method not found" is a normal "no resources"
   * answer here, not a transport failure. */
  async listResources(): Promise<McpResource[]> {
    try {
      const result = await this.rpc("resources/list", {}) as { resources?: unknown } | null;
      return Array.isArray(result?.resources) ? result.resources as McpResource[] : [];
    } catch (err) {
      if (err instanceof McpRpcError && (err.code === -32601 || err.code === -32602)) return [];
      if (err instanceof McpRpcError && /method.*not.*found|not.*implement/i.test(err.message)) return [];
      throw err;
    }
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
        const rpcError = msg.error as { code?: unknown; message?: unknown; data?: unknown } | null | undefined;
        if (rpcError) throw new McpRpcError(Number(rpcError.code), String(rpcError.message), rpcError.data);
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
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), this.timeoutMs);
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "Accept": "application/json, text/event-stream",
          "MCP-Protocol-Version": this.protocolVersion,
          ...this.extraHeaders,
        };
        if (this.accessToken) headers["Authorization"] = `Bearer ${this.accessToken}`;
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
        if (!raw.trim()) return null;
        if (contentType.includes("text/event-stream")) {
          return parseSseResponse(raw, typeof body.id === "number" ? body.id : null);
        }
        const json = JSON.parse(raw) as Record<string, unknown>;
        return json?.error ? json : (json as Record<string, unknown>);
      } catch (err) {
        lastErr = err;
        if (err instanceof PlatformError || err instanceof McpTransportError || err instanceof McpRpcError) {
          // Retry only transient transport failures, never RPC errors.
          const transient = err instanceof McpTransportError && (err.status >= 500 || err.status === 429);
          if (!transient || attempt === this.maxRetries - 1) throw err;
          await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
          continue;
        }
        if (err instanceof Error && err.name === "AbortError") {
          if (attempt === this.maxRetries - 1) {
            throw new McpTransportError(504, `MCP server timed out after ${this.timeoutMs}ms`);
          }
          await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
          continue;
        }
        throw new McpTransportError(502, `MCP request failed: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastErr instanceof Error ? lastErr : new McpTransportError(502, "unreachable");
  }
}

/** Extract the JSON-RPC response for `id` from an SSE stream body.
 *  Handles multi-line data: frames, comment keep-alives (: ...), and
 *  event: message / event: error prefixes used by hosted providers.
 *  Exported for unit tests (malformed-provider hardening). */
export function parseSseResponse(raw: string, id: number | null): Record<string, unknown> | null {
  let last: Record<string, unknown> | null = null;
  for (const event of raw.split(/\r?\n\r?\n/)) {
    const lines = event.split(/\r?\n/);
    // Skip comment-only keep-alive frames.
    if (lines.every((l) => !l.startsWith("data:") || !l.slice(5).trim())) continue;
    const data = lines
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trimStart())
      .join("\n");
    if (!data || data === "[DONE]") continue;
    try {
      const msg = JSON.parse(data) as Record<string, unknown>;
      last = msg;
      if (id !== null && msg.id === id) return msg;
    } catch { /* keep-alive or comment frame — ignore */ }
  }
  return last;
}
