/* ============================================================================
 * Noska MCP — copy-paste connection builders (pure, zero-dependency).
 *
 * Single source of truth for every "paste this into your AI client" snippet
 * in the app (Settings → Developer panel, /mcp landing, docs). No React,
 * no DOM — importable from vitest. Keys NEVER leave the browser: these
 * builders only interpolate a key the user already holds into local text.
 * ========================================================================== */

export type McpClientId =
  | "claude-desktop"
  | "claude-code"
  | "cursor"
  | "vscode"
  | "chatgpt"
  | "agents";

export interface McpClientConfig {
  id: McpClientId;
  name: string;
  steps: string[];
  copy: string;
  deeplink?: string;
}

/** A pasted value only counts as a key when it looks like one. */
export function isValidKeyInput(s: string): boolean {
  return s.startsWith("nsk_") && s.length > 10;
}

/** https://xxx.supabase.co → https://xxx.supabase.co/functions/v1/mcp */
export function mcpEndpoint(supabaseUrl: string): string {
  return `${supabaseUrl.replace(/\/$/, "")}/functions/v1/mcp`;
}

/** One-link URL for header-less clients (ChatGPT connectors, some agents). */
export function oneLinkUrl(endpoint: string, key: string): string {
  return `${endpoint}?key=${encodeURIComponent(key)}`;
}

export function b64url(s: string): string {
  return btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function b64urlDecode(s: string): string {
  const b = s.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(atob(b + "=".repeat((4 - (b.length % 4)) % 4))));
}

function authHeader(key: string | null): Record<string, string> | null {
  return key ? { Authorization: `Bearer ${key}` } : null;
}

/** Full client config: what to show, what Copy copies, optional deeplink. */
export function clientConfig(
  client: McpClientId,
  endpoint: string,
  key: string | null,
  withKeyInUrl: boolean,
): McpClientConfig {
  const url = key && withKeyInUrl ? oneLinkUrl(endpoint, key) : endpoint;
  const headers = key && !withKeyInUrl ? authHeader(key) : null;

  switch (client) {
    case "claude-desktop": {
      const copy = JSON.stringify(
        { mcpServers: { noska: headers ? { url, headers } : { url } } },
        null,
        2,
      );
      return {
        id: client,
        name: "Claude Desktop",
        steps: [
          "Open Claude Desktop → Settings → Developer → Edit Config",
          "Paste this into claude_desktop_config.json and restart Claude",
          headers ? "Your key rides in the Authorization header" : "Paste a key above for full access (recommended)",
        ],
        copy,
      };
    }
    case "claude-code": {
      const copy =
        `claude mcp add --transport http noska ${url}` +
        (headers ? ` \\\n  --header ${JSON.stringify(`Authorization: Bearer ${key}`)}` : "");
      return {
        id: client,
        name: "Claude Code",
        steps: [
          "Run this in any terminal — Claude Code registers Noska instantly",
          headers ? "Headers travel with the command; nothing is stored by us" : "Paste a key above for full access (recommended)",
        ],
        copy,
      };
    }
    case "cursor": {
      const cfg = JSON.stringify(
        { mcpServers: { noska: headers ? { url, headers } : { url } } },
        null,
        2,
      );
      return {
        id: client,
        name: "Cursor",
        steps: [
          "Click the one-click button below, or paste this into .cursor/mcp.json",
          headers ? "Your key rides in the Authorization header" : "Paste a key above for full access (recommended)",
        ],
        copy: cfg,
        deeplink: `cursor://anysphere.cursor-deeplink/mcp/install?name=Noska&config=${b64url(cfg)}`,
      };
    }
    case "vscode": {
      const cfg = JSON.stringify(
        { name: "noska", type: "http", url, ...(headers ? { headers } : {}) },
        null,
        2,
      );
      return {
        id: client,
        name: "VS Code",
        steps: [
          "VS Code 1.101+ — click the one-click button, or add this to mcp.json",
          "Works in VS Code, Insiders and VS Code-based forks",
        ],
        copy: cfg,
        deeplink: `vscode:mcp/install?${b64url(JSON.stringify({ name: "noska", type: "http", url, ...(headers ? { headers } : {}) }))}`,
      };
    }
    case "chatgpt": {
      const copy = key && withKeyInUrl ? url : `${url}?key=YOUR_NSK_KEY`;
      return {
        id: client,
        name: "ChatGPT & agents",
        steps: [
          "ChatGPT → Settings → Connectors → Create → Add custom connector",
          "Paste the one-link URL (key included) — header-less clients need it",
          "Prefer a narrowly-scoped key; rotate anytime in Settings → Developer",
        ],
        copy,
      };
    }
    case "agents": {
      const copy =
        `curl -X POST "${url}" \\\n` +
        `  -H "Authorization: Bearer ${key ?? "nsk_…"}" \\\n` +
        `  -H "Content-Type: application/json" \\\n` +
        `  -H "MCP-Protocol-Version: 2025-06-18" \\\n` +
        `  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`;
      return {
        id: client,
        name: "Custom agents",
        steps: [
          "Any runtime speaking JSON-RPC 2.0 over streamable HTTP works",
          "Send MCP-Protocol-Version + Bearer key; keep the Mcp-Session-Id response header",
          "Tools also accept the key as ?key= when headers are unavailable",
        ],
        copy,
      };
    }
  }
}

export const MCP_CLIENTS: Array<{ id: McpClientId; name: string }> = [
  { id: "claude-desktop", name: "Claude" },
  { id: "claude-code", name: "Claude Code" },
  { id: "cursor", name: "Cursor" },
  { id: "vscode", name: "VS Code" },
  { id: "chatgpt", name: "ChatGPT" },
  { id: "agents", name: "Agents" },
];
