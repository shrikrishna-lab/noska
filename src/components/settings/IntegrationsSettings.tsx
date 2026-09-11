import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plug,
  RefreshCw,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  KeyRound,
  Globe,
  ChevronDown,
  ShieldCheck,
  Search,
  X,
  Sparkles,
  Terminal,
  Check,
  Zap,
  SlidersHorizontal,
  Lock,
  ArrowUpRight,
} from "lucide-react";
import { connectorGateway, type ConnectorCatalogEntry, type ConnectorConnection } from "../../lib/connectorGateway";
import {
  refreshIntegrationTools,
  getIntegrationToolDefinitions,
  getIntegrationSummary,
  subscribeIntegrationTools,
} from "../../ai/integrationTools";
import { openExternal } from "../../lib/desktop/links";

const CUSTOM_MCP_SLUG = "custom-mcp";

// ── Authentic Brand Logos ───────────────────────────────────────
function ProviderLogo({ slug, name }: { slug: string; name?: string }) {
  const s = slug.toLowerCase();

  if (s.includes("github")) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#18181b] text-white shadow-xs">
        <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
        </svg>
      </div>
    );
  }

  if (s.includes("notion")) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white border border-[#e8e4db] shadow-xs text-[#1c1b18]">
        <span className="font-serif text-lg font-black leading-none">N</span>
      </div>
    );
  }

  if (s.includes("gmail") || s.includes("mail")) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#ea4335]/10 border border-[#ea4335]/20 text-[#ea4335] shadow-xs">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      </div>
    );
  }

  if (s.includes("calendar")) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#4285f4]/10 border border-[#4285f4]/20 text-[#4285f4] shadow-xs">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M3 10h18" />
          <path d="M8 14h.01" />
          <path d="M12 14h.01" />
          <path d="M16 14h.01" />
          <path d="M8 18h.01" />
          <path d="M12 18h.01" />
        </svg>
      </div>
    );
  }

  if (s.includes("slack")) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#4a154b]/10 border border-[#4a154b]/20 text-[#4a154b] shadow-xs">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
        </svg>
      </div>
    );
  }

  if (s.includes("linear")) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#5e6ad2]/10 border border-[#5e6ad2]/20 text-[#5e6ad2] shadow-xs">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.5 12a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0zm9.5-6.5a6.5 6.5 0 1 0 6.5 6.5A6.5 6.5 0 0 0 12 5.5z" />
        </svg>
      </div>
    );
  }

  if (s.includes("figma")) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#f24e1e]/10 border border-[#f24e1e]/20 text-[#f24e1e] shadow-xs">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 2h4a4 4 0 0 1 4 4 4 4 0 0 1-4 4H8V2zm0 8h4a4 4 0 0 1 4 4 4 4 0 0 1-4 4H8v-8zm0 8h4a4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4zm0-16H4a4 4 0 0 0-4 4 4 4 0 0 0 4 4h4V2zm0 8H4a4 4 0 0 0-4 4 4 4 0 0 0 4 4h4v-8z" />
        </svg>
      </div>
    );
  }

  if (s === CUSTOM_MCP_SLUG || s.includes("custom") || s.includes("mcp")) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#0ea5e9]/10 border border-[#0ea5e9]/20 text-[#0284c7] shadow-xs">
        <Terminal size={18} />
      </div>
    );
  }

  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#ede8df] text-[#1c1b18] font-bold text-xs shadow-xs border border-[#e8e4db]">
      {name ? name.slice(0, 2).toUpperCase() : <Plug size={16} />}
    </div>
  );
}

const DEFAULT_CONNECTORS: ConnectorCatalogEntry[] = [
  {
    id: "github",
    slug: "github",
    name: "GitHub",
    description: "List repos, read and create issues/PRs, and search code through GitHub's hosted MCP server.",
    publisher: "github",
    icon_url: null,
    default_scopes: ["repo", "read:org"],
    auth_modes: ["oauth", "token"],
    call_rate_limit: 60,
  },
  {
    id: "notion",
    slug: "notion",
    name: "Notion",
    description: "Search, read and create Notion pages and databases through Notion's official hosted MCP server.",
    publisher: "notion",
    icon_url: null,
    default_scopes: ["read:page:all", "read:database:all", "insert:content", "update:content"],
    auth_modes: ["oauth", "token"],
    call_rate_limit: 60,
  },
  {
    id: "gmail",
    slug: "gmail",
    name: "Gmail",
    description: "Search and read emails through Google's official Gmail MCP server (developer preview).",
    publisher: "google",
    icon_url: null,
    default_scopes: [],
    auth_modes: ["oauth"],
    call_rate_limit: 60,
  },
  {
    id: "google-calendar",
    slug: "google-calendar",
    name: "Google Calendar",
    description: "List calendars, check free/busy schedules, and read upcoming events.",
    publisher: "google",
    icon_url: null,
    default_scopes: [],
    auth_modes: ["oauth"],
    call_rate_limit: 60,
  },
  {
    id: "slack",
    slug: "slack",
    name: "Slack",
    description: "Read channels and send notifications via Slack's official MCP server.",
    publisher: "slack",
    icon_url: null,
    default_scopes: [],
    auth_modes: ["oauth"],
    call_rate_limit: 60,
  },
  {
    id: "custom-mcp",
    slug: "custom-mcp",
    name: "Custom MCP Server",
    description: "Connect any Streamable-HTTP MCP server by URL (Linear, Drive, self-hosted servers, or custom endpoints).",
    publisher: "noska",
    icon_url: null,
    default_scopes: [],
    auth_modes: ["token"],
    call_rate_limit: 120,
  },
];

/**
 * Settings → Integrations — redesigned with Noska's warm, premium paper aesthetic.
 * Connects external platforms (Notion, GitHub, Slack, Gmail, Calendar, MCP servers)
 * so Noska's AI, agent automations, and link previews can seamlessly utilize them.
 */
export default function IntegrationsSettings({ onToast }: { onToast?: (m: string) => void }) {
  const [connectors, setConnectors] = useState<ConnectorCatalogEntry[]>(DEFAULT_CONNECTORS);
  const [connections, setConnections] = useState<ConnectorConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [tokenFormSlug, setTokenFormSlug] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [toolTick, setToolTick] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<"all" | "connected" | "available">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [c, conns] = await Promise.all([
        connectorGateway.listConnectors().catch(() => []),
        connectorGateway.listConnections().catch(() => []),
      ]);
      if (c && c.length > 0) {
        setConnectors(c);
      }
      setConnections(conns ?? []);
      setLoadError(null);
    } catch (err) {
      // Retain default connectors
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshTools = useCallback(async () => {
    await refreshIntegrationTools(true);
    setToolTick((n) => n + 1);
  }, []);

  const handleRefreshAll = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await Promise.all([reload(), refreshTools()]);
      onToast?.("Refreshed connections and live tools");
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "Failed to refresh");
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  }, [isRefreshing, reload, refreshTools, onToast]);

  useEffect(() => {
    void reload().then(refreshTools);
    return subscribeIntegrationTools(() => setToolTick((n) => n + 1));
  }, [reload, refreshTools]);

  const activeBySlug = useMemo(() => {
    const map = new Map<string, ConnectorConnection>();
    for (const conn of connections) {
      if (conn.status === "revoked") continue;
      map.set(conn.connectors?.slug ?? "", conn);
    }
    return map;
  }, [connections]);

  const toolsBySlug = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getIntegrationToolDefinitions>>();
    for (const def of getIntegrationToolDefinitions()) {
      const list = map.get(def.connectorSlug) ?? [];
      list.push(def);
      map.set(def.connectorSlug, list);
    }
    return map;
  }, [toolTick]);

  const pollForConnection = useCallback(async (slug: string, timeoutMs = 120_000): Promise<boolean> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 3_000));
      try {
        const conns = await connectorGateway.listConnections();
        if (conns.some((c) => c.connectors?.slug === slug && c.status === "connected")) return true;
      } catch { /* transient */ }
    }
    return false;
  }, []);

  const connectOAuth = useCallback(async (connector: ConnectorCatalogEntry) => {
    setBusySlug(connector.slug);
    try {
      const { authorize_url } = await connectorGateway.startConnect(connector.slug);
      openExternal(authorize_url);
      onToast?.(`Finish connecting ${connector.name} in your browser…`);
      const ok = await pollForConnection(connector.slug);
      await reload();
      await refreshTools();
      onToast?.(ok ? `${connector.name} connected — tools live for Noska AI` : `Didn't detect ${connector.name} authorization`);
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "Connect failed");
    } finally {
      setBusySlug(null);
    }
  }, [onToast, pollForConnection, reload, refreshTools]);

  const connectToken = useCallback(async (connector: ConnectorCatalogEntry) => {
    setBusySlug(connector.slug);
    try {
      const { tool_count } = await connectorGateway.connectManual({
        connector: connector.slug,
        token: token.trim(),
        serverUrl: connector.slug === CUSTOM_MCP_SLUG ? serverUrl.trim() : undefined,
      });
      setTokenFormSlug(null);
      setToken("");
      setServerUrl("");
      await reload();
      await refreshTools();
      onToast?.(`${connector.name} connected (${tool_count} live tool${tool_count === 1 ? "" : "s"})`);
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "Connect failed");
    } finally {
      setBusySlug(null);
    }
  }, [onToast, reload, refreshTools, serverUrl, token]);

  const disconnect = useCallback(async (conn: ConnectorConnection) => {
    const name = conn.connectors?.name ?? "Connection";
    setBusySlug(conn.connectors?.slug ?? null);
    try {
      await connectorGateway.disconnect(conn.id);
      await reload();
      await refreshTools();
      onToast?.(`${name} disconnected`);
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "Disconnect failed");
    } finally {
      setBusySlug(null);
    }
  }, [onToast, reload, refreshTools]);

  const test = useCallback(async (conn: ConnectorConnection) => {
    setBusySlug(conn.connectors?.slug ?? null);
    try {
      const { tool_count } = await connectorGateway.testConnection(conn.id);
      await reload();
      onToast?.(`Healthy: ${tool_count} tool${tool_count === 1 ? "" : "s"} operational`);
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "Test failed");
    } finally {
      setBusySlug(null);
    }
  }, [onToast, reload]);

  const summary = getIntegrationSummary();

  const filteredConnectors = useMemo(() => {
    return connectors.filter((connector) => {
      const conn = activeBySlug.get(connector.slug);
      const isConnected = conn?.status === "connected";

      if (filterCategory === "connected" && !isConnected) return false;
      if (filterCategory === "available" && isConnected) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        connector.name.toLowerCase().includes(q) ||
        connector.slug.toLowerCase().includes(q) ||
        connector.description.toLowerCase().includes(q)
      );
    });
  }, [connectors, activeBySlug, filterCategory, searchQuery]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-xs text-[#706c64]">
        <Loader2 size={20} className="animate-spin text-[#1c1b18]" />
        <span>Loading integrations & tools…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-xs max-w-2xl pb-12">
      {/* ── Top Status Strip Banner ────────────────────────────── */}
      <div className="rounded-2xl bg-[#f8f6f0] dark:bg-[#181b24] border border-[#e8e4db] dark:border-white/10 p-4 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck size={17} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#1c1b18] dark:text-white">
                {summary.connectedConnectors > 0
                  ? `${summary.connectedConnectors} Platform${summary.connectedConnectors === 1 ? "" : "s"} Connected`
                  : "No platforms connected yet"}
              </span>
              {summary.connectedConnectors > 0 ? (
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200/80 dark:border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {summary.toolCount} Live Tool{summary.toolCount === 1 ? "" : "s"}
                </span>
              ) : (
                <span className="rounded-full bg-[#ede8df] dark:bg-white/10 px-2 py-0.5 text-[10px] font-medium text-[#706c64] dark:text-white/60">
                  AES-256 Encrypted
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#706c64] dark:text-white/60 leading-normal mt-0.5">
              Credentials are encrypted with AES-256. Tools run safely in isolated sandboxes.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefreshAll}
          disabled={isRefreshing}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white dark:bg-white/5 border border-[#e8e4db] dark:border-white/10 text-[#706c64] hover:text-[#1c1b18] dark:text-white/60 dark:hover:text-white hover:bg-[#ede8df] dark:hover:bg-white/10 transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-60"
          title="Refresh connections and tools"
        >
          <RefreshCw size={13} className={isRefreshing ? "animate-spin text-[#1c1b18] dark:text-white" : ""} />
        </button>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-300/80 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
          <AlertCircle size={15} className="shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {/* ── Search & Filter Controls ─────────────────────────── */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8c887f] dark:text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search integrations, tools, or MCP servers..."
            className="w-full pl-9 pr-8 py-2.5 bg-[#f4efe6] dark:bg-[#181b24] border border-[#e8e4db] dark:border-white/10 rounded-2xl text-xs text-[#1c1b18] dark:text-white placeholder-[#8c887f] dark:placeholder-white/40 focus:outline-none focus:border-[#1c1b18]/40 dark:focus:border-white/25 focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 transition-all shadow-inner font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8c887f] hover:text-[#1c1b18] dark:text-white/40 dark:hover:text-white transition cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
          {[
            { id: "all", label: "All Integrations" },
            { id: "connected", label: `Connected (${summary.connectedConnectors})` },
            { id: "available", label: "Ready to Connect" },
          ].map((pill) => {
            const active = filterCategory === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setFilterCategory(pill.id as any)}
                className={`px-3 py-1 rounded-xl transition cursor-pointer font-medium ${
                  active
                    ? "bg-[#1c1b18] text-white shadow-xs dark:bg-white dark:text-[#1c1b18]"
                    : "bg-white dark:bg-white/5 border border-[#e8e4db] dark:border-white/10 text-[#706c64] dark:text-white/70 hover:bg-[#ede8df] dark:hover:bg-white/10"
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Integrations Catalog Cards ──────────────────────── */}
      <div className="space-y-3">
        {filteredConnectors.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#e8e4db] dark:border-white/10 p-8 text-center space-y-2">
            <p className="text-xs font-semibold text-[#1c1b18] dark:text-white">
              {searchQuery
                ? `No integrations found matching "${searchQuery}"`
                : filterCategory === "connected"
                ? "No platforms connected yet"
                : "No platforms available"}
            </p>
            <p className="text-[11px] text-[#706c64] dark:text-white/60">
              {searchQuery
                ? "Try searching for another service name, tool, or capability."
                : filterCategory === "connected"
                ? "Switch to 'Ready to Connect' or 'All' to link your accounts."
                : "All available platforms are currently connected."}
            </p>
            {(searchQuery || filterCategory !== "all") && (
              <button
                type="button"
                onClick={() => { setSearchQuery(""); setFilterCategory("all"); }}
                className="mt-2 text-xs font-semibold text-[#1c1b18] dark:text-white underline hover:opacity-80 cursor-pointer"
              >
                Reset filters
              </button>
            )}
          </div>
        ) : (
          filteredConnectors.map((connector) => {
            const conn = activeBySlug.get(connector.slug);
            const tools = toolsBySlug.get(connector.slug) ?? [];
            const isCustom = connector.slug === CUSTOM_MCP_SLUG;
            const busy = busySlug === connector.slug;
            const offersOAuth = connector.auth_modes?.includes("oauth");
            const offersToken = connector.auth_modes?.includes("token");
            const isConnected = conn?.status === "connected";
            const isExpired = conn?.status === "expired";
            const expanded = expandedSlug === connector.slug || tokenFormSlug === connector.slug;

            return (
              <div
                key={connector.id}
                className="rounded-2xl bg-[#f8f6f0] dark:bg-[#181b24] border border-[#e8e4db] dark:border-white/10 p-5 shadow-sm transition-all hover:border-[#d6d0c4] dark:hover:border-white/20"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Brand Icon + Info */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <ProviderLogo slug={connector.slug} name={connector.name} />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-[#1c1b18] dark:text-white">{connector.name}</h3>

                        {isConnected && (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200/80 dark:border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 size={11} /> Connected
                          </span>
                        )}

                        {isExpired && (
                          <span className="flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                            <AlertCircle size={11} /> Expired
                          </span>
                        )}

                        {isCustom && (
                          <span className="rounded-md bg-sky-50 dark:bg-sky-500/15 border border-sky-200 dark:border-sky-500/30 px-1.5 py-0.2 text-[9px] font-semibold text-sky-700 dark:text-sky-300">
                            Streamable MCP
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-[11px] leading-relaxed text-[#706c64] dark:text-white/60">
                        {connector.description}
                      </p>

                      {/* Connection details when active */}
                      {conn && (
                        <div className="mt-2 flex items-center gap-2 flex-wrap text-[10px] text-[#8c887f] dark:text-white/50 font-medium">
                          <span className="rounded-md bg-white dark:bg-white/5 border border-[#e8e4db] dark:border-white/10 px-2 py-0.5">
                            {conn.auth_mode === "token" ? "API Token" : "OAuth Session"}
                          </span>
                          {conn.label && <span>· {conn.label}</span>}
                          {conn.external_account_label && <span>· {conn.external_account_label}</span>}
                          {conn.token_hint && <span>· ····{conn.token_hint}</span>}
                          {tools.length > 0 && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              · {tools.length} live tool{tools.length === 1 ? "" : "s"}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex shrink-0 items-center gap-2">
                    {busy && <Loader2 size={15} className="animate-spin text-[#706c64] dark:text-white/60" />}

                    {conn ? (
                      <>
                        <button
                          type="button"
                          onClick={() => { void test(conn); }}
                          disabled={busy}
                          className="rounded-xl bg-white dark:bg-white/5 border border-[#e8e4db] dark:border-white/10 px-3 py-1.5 text-xs font-semibold text-[#1c1b18] dark:text-white hover:bg-[#ede8df] dark:hover:bg-white/10 transition cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          Test
                        </button>
                        <button
                          type="button"
                          onClick={() => { void disconnect(conn); }}
                          disabled={busy}
                          className="flex items-center gap-1 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/25 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          <Trash2 size={12} /> Disconnect
                        </button>
                        {tools.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpandedSlug(expanded ? null : connector.slug)}
                            className={`grid h-8 w-8 place-items-center rounded-xl border border-[#e8e4db] dark:border-white/10 bg-white dark:bg-white/5 text-[#706c64] hover:text-[#1c1b18] dark:text-white/60 dark:hover:text-white transition cursor-pointer ${
                              expanded ? "bg-[#ede8df] text-[#1c1b18]" : ""
                            }`}
                            title={expanded ? "Hide tools" : "Show tools"}
                          >
                            <ChevronDown size={14} className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        {offersToken && offersOAuth && (
                          <button
                            type="button"
                            onClick={() => {
                              setTokenFormSlug(tokenFormSlug === connector.slug ? null : connector.slug);
                              setExpandedSlug(connector.slug);
                            }}
                            className={`grid h-8 w-8 place-items-center rounded-xl bg-white dark:bg-white/5 border border-[#e8e4db] dark:border-white/10 text-[#706c64] hover:text-[#1c1b18] dark:text-white/70 dark:hover:text-white hover:bg-[#ede8df] dark:hover:bg-white/10 transition cursor-pointer shadow-xs active:scale-95 ${
                              tokenFormSlug === connector.slug ? "bg-[#ede8df] text-[#1c1b18] dark:bg-white/15" : ""
                            }`}
                            title="Use Token"
                          >
                            <KeyRound size={13} />
                          </button>
                        )}

                        {offersOAuth && (
                          <button
                            type="button"
                            onClick={() => { void connectOAuth(connector); }}
                            disabled={busy}
                            className="flex items-center gap-1.5 rounded-xl bg-[#1c1b18] dark:bg-white px-4 py-2 text-xs font-semibold text-white dark:text-[#1c1b18] hover:bg-black dark:hover:bg-white/90 shadow-xs transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
                          >
                            <ExternalLink size={12} /> Connect
                          </button>
                        )}

                        {offersToken && !offersOAuth && (
                          <button
                            type="button"
                            onClick={() => {
                              setTokenFormSlug(tokenFormSlug === connector.slug ? null : connector.slug);
                              setExpandedSlug(connector.slug);
                            }}
                            className="flex items-center gap-1.5 rounded-xl bg-[#1c1b18] dark:bg-white px-4 py-2 text-xs font-semibold text-white dark:text-[#1c1b18] hover:bg-black dark:hover:bg-white/90 shadow-xs transition active:scale-[0.98] cursor-pointer"
                          >
                            <KeyRound size={12} /> Connect
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* ── Token / Custom Server Form Drawer ────────────── */}
                {tokenFormSlug === connector.slug && !conn && (
                  <div className="mt-4 space-y-3 rounded-xl border border-[#e8e4db] dark:border-white/10 bg-white dark:bg-[#12141a] p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1c1b18] dark:text-white flex items-center gap-1.5">
                        <KeyRound size={13} className="text-[#a8824b]" />
                        {isCustom ? "Configure Custom MCP Server" : `Connect ${connector.name} via API Token`}
                      </span>
                      <button
                        type="button"
                        onClick={() => { setTokenFormSlug(null); setToken(""); setServerUrl(""); }}
                        className="text-[#8c887f] hover:text-[#1c1b18] dark:text-white/40 dark:hover:text-white transition cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {isCustom && (
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold text-[#706c64] dark:text-white/60">
                          Server Endpoint URL
                        </label>
                        <input
                          value={serverUrl}
                          onChange={(e) => setServerUrl(e.target.value)}
                          placeholder="https://mcp.your-domain.com/v1"
                          className="w-full rounded-xl border border-[#e8e4db] dark:border-white/10 bg-[#f8f6f0] dark:bg-[#181b24] px-3.5 py-2 text-xs font-mono text-[#1c1b18] dark:text-white placeholder-[#a09c94] outline-none focus:border-[#1c1b18] dark:focus:border-white/40 transition"
                        />
                      </div>
                    )}

                    <div>
                      <label className="mb-1 block text-[10px] font-semibold text-[#706c64] dark:text-white/60">
                        {isCustom ? "Bearer Token (Optional if server is public)" : "API Key / Personal Access Token"}
                      </label>
                      <input
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        type="password"
                        placeholder={isCustom ? "Bearer mcp_sec_..." : "ghp_... / secret_..."}
                        className="w-full rounded-xl border border-[#e8e4db] dark:border-white/10 bg-[#f8f6f0] dark:bg-[#181b24] px-3.5 py-2 text-xs font-mono text-[#1c1b18] dark:text-white placeholder-[#a09c94] outline-none focus:border-[#1c1b18] dark:focus:border-white/40 transition"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <p className="flex items-center gap-1.5 text-[10px] text-[#8c887f] dark:text-white/50">
                        <Lock size={11} className="text-emerald-600 dark:text-emerald-400" />
                        Stored with AES-256 server-side encryption
                      </p>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => { setTokenFormSlug(null); setToken(""); setServerUrl(""); }}
                          className="rounded-xl px-3 py-1.5 text-xs font-semibold text-[#706c64] hover:text-[#1c1b18] dark:text-white/60 dark:hover:text-white transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => { void connectToken(connector); }}
                          disabled={busy || !token.trim() || (isCustom && !serverUrl.trim())}
                          className="flex items-center gap-1.5 rounded-xl bg-[#1c1b18] dark:bg-white px-4 py-1.5 text-xs font-semibold text-white dark:text-[#1c1b18] hover:bg-black dark:hover:bg-white/90 shadow-xs transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
                        >
                          {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                          <span>{busy ? "Verifying..." : "Save & Connect"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Discovered Live Tools Drawer ─────────────────── */}
                {expanded && conn && tools.length > 0 && (
                  <div className="mt-4 rounded-xl border border-[#e8e4db] dark:border-white/10 bg-white dark:bg-[#12141a] p-4 shadow-xs">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[11px] font-bold text-[#1c1b18] dark:text-white flex items-center gap-1.5">
                        <Zap size={13} className="text-[#a8824b]" />
                        {tools.length} Operational Tool{tools.length === 1 ? "" : "s"} Exposed to Noska AI
                      </span>
                      <span className="text-[10px] text-[#8c887f] dark:text-white/50">
                        Auto-registered in agent context
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {tools.map((def) => (
                        <span
                          key={def.name}
                          title={def.description}
                          className="flex items-center gap-1.5 rounded-lg bg-[#f8f6f0] dark:bg-[#181b24] border border-[#e8e4db] dark:border-white/10 px-2.5 py-1 text-[11px] text-[#1c1b18] dark:text-white font-medium shadow-2xs"
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${def.readOnly ? "bg-sky-500" : "bg-emerald-500"}`} />
                          <span className="font-mono text-[10.5px]">{def.originalName}</span>
                          <span className="text-[9px] text-[#8c887f] dark:text-white/40 uppercase">
                            {def.readOnly ? "read" : "action"}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
