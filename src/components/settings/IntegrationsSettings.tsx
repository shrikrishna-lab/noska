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

/**
 * Settings → Integrations — connect external platforms (Notion, GitHub,
 * Slack, Gmail, Calendar, any MCP server) so Noska's AI can use their
 * tools. OAuth flows open in the system browser and are detected by
 * polling the gateway; token flows paste an API key inline. Secrets stay
 * server-side (AES-GCM encrypted) — the client only ever sees metadata.
 */
export default function IntegrationsSettings({ onToast }: { onToast?: (m: string) => void }) {
  const [connectors, setConnectors] = useState<ConnectorCatalogEntry[]>([]);
  const [connections, setConnections] = useState<ConnectorConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [tokenFormSlug, setTokenFormSlug] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [toolTick, setToolTick] = useState(0);

  const reload = useCallback(async () => {
    try {
      const [c, conns] = await Promise.all([
        connectorGateway.listConnectors(),
        connectorGateway.listConnections(),
      ]);
      setConnectors(c);
      setConnections(conns);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't load integrations");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshTools = useCallback(async () => {
    await refreshIntegrationTools(true);
    setToolTick((n) => n + 1);
  }, []);

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

  /** OAuth completion is detected by polling — the provider redirects to
   * the gateway callback (web) or a noska.me page (desktop), and the
   * connection simply appears in the user's connection list. */
  const pollForConnection = useCallback(async (slug: string, timeoutMs = 120_000): Promise<boolean> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 3_000));
      try {
        const conns = await connectorGateway.listConnections();
        if (conns.some((c) => c.connectors?.slug === slug && c.status === "connected")) return true;
      } catch { /* transient — keep polling */ }
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
      onToast?.(ok ? `${connector.name} connected — its tools are now available to Noska AI` : `Didn't detect the ${connector.name} connection — try again if you didn't finish in the browser`);
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
      onToast?.(`${connector.name} connected — ${tool_count} tool${tool_count === 1 ? "" : "s"} discovered`);
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
      onToast?.(`Connection healthy — ${tool_count} tool${tool_count === 1 ? "" : "s"} reachable`);
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "Test failed");
    } finally {
      setBusySlug(null);
    }
  }, [onToast, reload]);

  const summary = getIntegrationSummary();

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-[var(--muted)]">
        <Loader2 size={14} className="animate-spin" /> Loading integrations…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Status strip */}
      <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Plug size={15} className="text-[var(--accent)]" />
          <div>
            <p className="text-xs font-semibold text-[var(--text)]">
              {summary.connectedConnectors > 0
                ? `${summary.connectedConnectors} platform${summary.connectedConnectors === 1 ? "" : "s"} connected · ${summary.toolCount} tool${summary.toolCount === 1 ? "" : "s"} available to Noska AI`
                : "No platforms connected yet"}
            </p>
            <p className="text-[10px] text-[var(--muted)]">
              Tokens are encrypted server-side and never exposed to the app. Read-only tools run automatically; write tools follow your agent permissions.
            </p>
          </div>
        </div>
        <button
          onClick={() => { void reload().then(refreshTools); }}
          className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] transition"
          title="Refresh connections and tools"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {loadError && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{loadError} — sign in to Noska to manage platform connections.</span>
        </div>
      )}

      {/* Connector catalog */}
      <div className="grid grid-cols-1 gap-3">
        {connectors.map((connector) => {
          const conn = activeBySlug.get(connector.slug);
          const tools = toolsBySlug.get(connector.slug) ?? [];
          const isCustom = connector.slug === CUSTOM_MCP_SLUG;
          const busy = busySlug === connector.slug;
          const offersOAuth = connector.auth_modes?.includes("oauth");
          const offersToken = connector.auth_modes?.includes("token");
          const expanded = expandedSlug === connector.slug || tokenFormSlug === connector.slug;

          return (
            <div key={connector.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
                  {isCustom ? <Globe size={16} /> : <Plug size={16} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-[var(--text)]">{connector.name}</h3>
                    {conn?.status === "connected" && (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                        <CheckCircle2 size={10} /> Connected
                      </span>
                    )}
                    {conn?.status === "expired" && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                        <AlertCircle size={10} /> Expired
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--muted)]">{connector.description}</p>
                  {conn && !isCustom && (
                    <p className="mt-1 text-[10px] text-[var(--muted)]">
                      {conn.auth_mode === "token" ? "Token connection" : "OAuth connection"}
                      {conn.label ? ` · ${conn.label}` : conn.external_account_label ? ` · ${conn.external_account_label}` : ""}
                      {conn.server_url_override ? ` · ${conn.server_url_override}` : ""}
                      {conn.token_hint ? ` · ····${conn.token_hint}` : ""}
                      {tools.length > 0 ? ` · ${tools.length} tools live` : ""}
                    </p>
                  )}
                  {conn && isCustom && conn.server_url_override && (
                    <p className="mt-1 truncate text-[10px] text-[var(--muted)]">
                      {conn.server_url_override}{tools.length > 0 ? ` · ${tools.length} tools live` : ""}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {busy && <Loader2 size={14} className="animate-spin text-[var(--muted)]" />}
                  {conn ? (
                    <>
                      <button
                        onClick={() => { void test(conn); }}
                        className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--muted)] hover:text-[var(--text)] transition"
                      >
                        Test
                      </button>
                      <button
                        onClick={() => { void disconnect(conn); }}
                        className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[10px] font-semibold text-red-500/80 hover:text-red-500 transition"
                      >
                        <Trash2 size={11} /> Disconnect
                      </button>
                      {tools.length > 0 && (
                        <button
                          onClick={() => setExpandedSlug(expanded ? null : connector.slug)}
                          className="grid h-7 w-7 place-items-center rounded-lg border border-[var(--border)] text-[var(--muted)] transition"
                          title="Show tools"
                        >
                          <ChevronDown size={12} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
                        </button>
                      )}
                    </>
                  ) : offersOAuth ? (
                    <button
                      onClick={() => { void connectOAuth(connector); }}
                      disabled={busy}
                      className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-[var(--accent)]/90 disabled:opacity-50 transition"
                    >
                      <ExternalLink size={11} /> Connect
                    </button>
                  ) : null}
                  {!conn && offersToken && (
                    <button
                      onClick={() => { setTokenFormSlug(tokenFormSlug === connector.slug ? null : connector.slug); setExpandedSlug(connector.slug); }}
                      className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--muted)] hover:text-[var(--text)] transition"
                    >
                      <KeyRound size={11} /> {offersOAuth ? "Use token" : "Connect"}
                    </button>
                  )}
                </div>
              </div>

              {/* Token / custom-server form */}
              {tokenFormSlug === connector.slug && !conn && (
                <div className="mt-3 space-y-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3">
                  {isCustom && (
                    <input
                      value={serverUrl}
                      onChange={(e) => setServerUrl(e.target.value)}
                      placeholder="MCP server URL (https://…)"
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]"
                    />
                  )}
                  <input
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    type="password"
                    placeholder={isCustom ? "Bearer token (optional if the server is public)" : "API key / token"}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]"
                  />
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-1 text-[10px] text-[var(--muted)]">
                      <ShieldCheck size={10} /> Sent once over TLS, stored encrypted server-side
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => { setTokenFormSlug(null); setToken(""); setServerUrl(""); }}
                        className="rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-[var(--muted)] hover:text-[var(--text)] transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => { void connectToken(connector); }}
                        disabled={busy || !token.trim() || (isCustom && !serverUrl.trim())}
                        className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-[var(--accent)]/90 disabled:opacity-50 transition"
                      >
                        {busy ? "Verifying…" : "Connect"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Discovered tools */}
              {expanded && conn && tools.length > 0 && (
                <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    {tools.length} tools available to Noska AI
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {tools.map((def) => (
                      <span key={def.name} title={def.description} className="rounded-md bg-[var(--surface)] px-2 py-0.5 text-[10px] text-[var(--muted)] border border-[var(--border)]">
                        {def.readOnly ? "📖" : "✍️"} {def.originalName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {summary.lastError && (
        <p className="text-[10px] text-[var(--muted)]">
          Tool sync note: {summary.lastError}
        </p>
      )}

      {/* Expired connections hint */}
      {connections.some((c) => c.status === "expired") && (
        <p className="flex items-center gap-1.5 text-[10px] text-amber-600">
          <AlertCircle size={11} /> A connection expired — press Test on it to re-verify, or reconnect.
        </p>
      )}
    </div>
  );
}
