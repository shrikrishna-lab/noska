/**
 * Integration tool registry — turns connected platforms (MCP servers via
 * the connector gateway) into first-class agent tools.
 *
 * Noska's AI invokes tools through a text protocol (`<<TOOL:name>>{...}`),
 * so every connected MCP tool is registered here under a sanitized
 * canonical name (`<connector>__<tool>`, word characters only — the parser
 * regex requires it) with its JSON-schema arguments flattened into the
 * `{type, desc, required}` definition shape the prompt builder renders.
 *
 * Execution round-trips through the connector-gateway Edge Function, so
 * tokens never reach the renderer. The registry refreshes lazily (60s
 * throttle) and is pushed eagerly by the Integrations settings surface
 * whenever a connection is added or removed.
 */

import { connectorGateway, type GatewayTool } from "../lib/connectorGateway";
import { ecosystemManager } from "../lib/connections/ecosystemManager";
import { getEcosystemConnectorByGatewaySlug } from "../lib/connections/ecosystemRegistry";

export interface IntegrationToolDefinition {
  /** Canonical agent-facing name, e.g. `github__create_issue`. */
  name: string;
  description: string;
  params: Record<string, { type: string; desc: string; required?: boolean }>;
  connectorSlug: string;
  connectorName: string;
  /** The tool's own name on the MCP server (used for tools/call). */
  originalName: string;
  /** MCP readOnlyHint → 'read' permission category; otherwise 'external'. */
  readOnly: boolean;
}

export interface IntegrationSummary {
  connectedConnectors: number;
  toolCount: number;
  unavailable: Array<{ connector_slug: string; error: string }>;
  lastError: string | null;
  refreshedAt: number | null;
}

const REFRESH_THROTTLE_MS = 60_000;
/** System-prompt budget guard: cap how many tools one platform may add. */
const TOOLS_PER_CONNECTOR_CAP = 25;
const MAX_PARAMS_RENDERED = 14;

let registry = new Map<string, IntegrationToolDefinition>();
let connectedConnectorSlugs: string[] = [];
let unavailable: Array<{ connector_slug: string; error: string }> = [];
let lastError: string | null = null;
let refreshedAt: number | null = null;
let lastRefreshStartedAt = 0;
let inFlight: Promise<void> | null = null;

const listeners = new Set<() => void>();

function notify(): void {
  for (const fn of listeners) {
    try { fn(); } catch { /* listener errors must not break the registry */ }
  }
}

/* ─── Name + schema mapping ───────────────────────────────────────────── */

function sanitizePart(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "tool";
}

/** `<connector>__<tool>` — must satisfy /^\w+$/ (the tool-call parser's
 * regex only matches word characters). */
export function canonicalToolName(connectorSlug: string, mcpToolName: string): string {
  return `${sanitizePart(connectorSlug)}__${sanitizePart(mcpToolName)}`;
}

export function integrationCategoryForTool(name: string): "read" | "external" | null {
  const def = registry.get(String(name));
  if (!def) return null;
  return def.readOnly ? "read" : "external";
}

function flattenSchemaParams(schema: unknown): IntegrationToolDefinition["params"] {
  const params: IntegrationToolDefinition["params"] = {};
  if (!schema || typeof schema !== "object") return params;
  const s = schema as { properties?: Record<string, any>; required?: unknown };
  if (!s.properties || typeof s.properties !== "object") return params;
  const required = Array.isArray(s.required) ? s.required.map(String) : [];
  for (const [key, raw] of Object.entries(s.properties).slice(0, MAX_PARAMS_RENDERED)) {
    const prop = (raw ?? {}) as { type?: string; description?: string };
    const type = typeof prop.type === "string" ? prop.type : "any";
    let desc = typeof prop.description === "string" && prop.description.trim()
      ? prop.description.trim().slice(0, 160)
      : `${key} value`;
    if (type === "object" || type === "array") desc += " (provide as JSON)";
    params[key] = { type, desc, required: required.includes(key) || undefined };
  }
  return params;
}

function toDefinition(tool: GatewayTool): IntegrationToolDefinition | null {
  const originalName = String(tool.name ?? "").trim();
  const slug = String(tool.connector_slug ?? "").trim();
  if (!originalName || !slug) return null;
  const annotations = (tool.annotations ?? {}) as { readOnlyHint?: unknown };
  return {
    name: canonicalToolName(slug, originalName),
    description: `${String(tool.description ?? "").trim().slice(0, 300) || "External platform tool"} [via ${String(tool.connector_name ?? slug)}]`,
    params: flattenSchemaParams(tool.input_schema),
    connectorSlug: slug,
    connectorName: String(tool.connector_name ?? slug),
    originalName,
    readOnly: annotations.readOnlyHint === true,
  };
}

/* ─── Refresh ─────────────────────────────────────────────────────────── */

/** Fetch merged tools across all live connections. Throttled to one
 * network call per minute unless `force` (used by the settings UI after
 * connect/disconnect). Never throws — failures surface via summary. */
export async function refreshIntegrationTools(force = false): Promise<void> {
  const now = Date.now();
  if (!force && refreshedAt !== null && now - lastRefreshStartedAt < REFRESH_THROTTLE_MS) return;
  if (inFlight) return inFlight;
  lastRefreshStartedAt = now;
  inFlight = (async () => {
    try {
      const { tools: merged, unavailable: dead } = await connectorGateway.listTools();
      const next = new Map<string, IntegrationToolDefinition>();
      const perConnector = new Map<string, number>();
      for (const tool of merged) {
        const slug = String(tool.connector_slug ?? "");
        const seen = perConnector.get(slug) ?? 0;
        if (seen >= TOOLS_PER_CONNECTOR_CAP) continue;
        const def = toDefinition(tool);
        if (!def || next.has(def.name)) continue;
        next.set(def.name, def);
        perConnector.set(slug, seen + 1);
      }
      registry = next;
      connectedConnectorSlugs = [...new Set(merged.map((t) => String(t.connector_slug ?? "")).filter(Boolean))];
      unavailable = dead ?? [];
      lastError = null;
      refreshedAt = now;
      notify();
    } catch (err) {
      // Not signed in, gateway unreachable, or no connections — keep the
      // previous registry so a transient failure never removes tools.
      lastError = err instanceof Error ? err.message : String(err);
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

// Subscribe to ecosystem changes so AI agent tool definitions stay in sync
ecosystemManager.subscribe(() => {
  notify();
});

/* ─── Service-enablement gating ──────────────────────────────────────── */

/**
 * Find which child service of an ecosystem an MCP tool belongs to, using
 * word-boundary matching on the tool's own name. Substring matching is too
 * loose here — e.g. a service id "docs" would otherwise swallow a tool
 * named "search_documents".
 */
function matchServiceForTool(
  eco: NonNullable<ReturnType<typeof getEcosystemConnectorByGatewaySlug>>,
  toolName: string,
): { id: string } | undefined {
  const name = toolName.toLowerCase();
  return eco.services.find((s) => {
    const id = s.id.toLowerCase();
    if (name === id || name.startsWith(`${id}_`) || name.endsWith(`_${id}`) || name.includes(`_${id}_`)) {
      return true;
    }
    // Registered agent tool names look like "<slug>.<verb>" — match on the
    // verb part so "gmail.search" gates tools literally named "search".
    return s.toolNames.some((tn) => tn.toLowerCase().split(".").pop() === name);
  });
}

/* ─── Accessors ───────────────────────────────────────────────────────── */

export function getIntegrationToolDefinitions(): IntegrationToolDefinition[] {
  const all = [...registry.values()];
  return all.filter((tool) => {
    const eco = getEcosystemConnectorByGatewaySlug(tool.connectorSlug);
    if (!eco) return true; // Custom MCP or unmatched, allow if connected

    const matchingService = matchServiceForTool(eco, tool.originalName);
    if (matchingService) {
      // If service is explicitly disabled by the user, omit from agent tool definitions
      return ecosystemManager.isServiceEnabled(eco.id, matchingService.id);
    }

    return true;
  });
}

export function getIntegrationTool(name: string): IntegrationToolDefinition | undefined {
  const def = registry.get(String(name));
  if (!def) return undefined;

  // Verify service is enabled
  const eco = getEcosystemConnectorByGatewaySlug(def.connectorSlug);
  if (eco) {
    const matchingService = matchServiceForTool(eco, def.originalName);
    if (matchingService && !ecosystemManager.isServiceEnabled(eco.id, matchingService.id)) {
      return undefined;
    }
  }
  return def;
}

export function getIntegrationSummary(): IntegrationSummary {
  return {
    connectedConnectors: connectedConnectorSlugs.length,
    toolCount: registry.size,
    unavailable: [...unavailable],
    lastError,
    refreshedAt,
  };
}

export function isConnectedConnector(slug: string): boolean {
  return connectedConnectorSlugs.includes(slug);
}

export function subscribeIntegrationTools(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* ─── Execution ───────────────────────────────────────────────────────── */

/** Serialize an MCP tool result into the plain-text form the agent loop
 * feeds back into the transcript. Throws on isError results. */
export async function executeIntegrationTool(name: string, params: Record<string, unknown>): Promise<string> {
  const def = registry.get(String(name));
  if (!def) throw new Error(`Unknown integration tool: "${name}"`);
  const response = await connectorGateway.callTool(def.connectorSlug, def.originalName, params ?? {});
  const result = response?.result ?? {};
  const text = (result.content ?? [])
    .filter((c) => c.type === "text" && typeof c.text === "string")
    .map((c) => c.text as string)
    .join("\n");
  if (result.isError === true) {
    throw new Error(text || `The ${def.connectorName} tool "${def.originalName}" reported an error.`);
  }
  if (text) return text;
  if (result.structuredContent !== undefined && result.structuredContent !== null) {
    try { return JSON.stringify(result.structuredContent, null, 2); } catch { return String(result.structuredContent); }
  }
  return `Done — ${def.connectorName} reported success.`;
}

/** Validate required args against the mapped definition (mirrors the
 * static validateParams in ai/tools.ts). */
export function validateIntegrationToolParams(name: string, params: Record<string, unknown>): void {
  const def = registry.get(String(name));
  if (!def) throw new Error(`Unknown integration tool: "${name}"`);
  for (const [key, spec] of Object.entries(def.params)) {
    if (spec.required && (params?.[key] === undefined || params?.[key] === null || params?.[key] === "")) {
      throw new Error(`Missing required parameter "${key}" for tool "${name}"`);
    }
  }
}
