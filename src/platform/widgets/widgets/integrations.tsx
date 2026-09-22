/**
 * Integrations Hub — real per-account connections from the connector
 * gateway (not the platform-level integrations product table).
 *
 * Falls back to the authenticated `integrations` product catalog only
 * when the user has no live connections, so the widget still shows what
 * the platform supports. Never crashes: gateway failures degrade to the
 * standard error/permission chrome.
 */
import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw, Plug } from "lucide-react";
import { timeAgo } from "../../../utils/helpers";
import { WidgetError, WidgetLoading, WidgetPermissionRequired, WidgetEmpty } from "../components/WidgetFrame";
import { ListPrimitive, type ListItemData } from "../primitives/ListPrimitive";
import { fetchLiveConnections } from "../providers/gatewayData";
import { supabase } from "../../../lib/supabase";
import type { WidgetProps } from "../types";

interface IntegrationRow {
  id: string;
  name: string;
  status: string | null;
  category: string | null;
  last_sync_at: string | null;
}

type HubState =
  | { phase: "loading" }
  | { phase: "connections"; items: ListItemData[] }
  | { phase: "catalog"; items: ListItemData[] }
  | { phase: "empty" }
  | { phase: "error"; message: string }
  | { phase: "denied" };

function connectionItems(
  rows: Array<{
    id: string;
    status: string;
    connected_at: string;
    last_used_at: string | null;
    external_account_label: string;
    label: string;
    connectors: { slug: string; name: string; icon_url: string | null } | null;
  }>,
): ListItemData[] {
  return rows
    .filter((c) => c.status !== "revoked")
    .map((c) => {
      const name = c.connectors?.name || c.label || c.external_account_label || "Connection";
      const live = c.status === "connected";
      const when = c.last_used_at || c.connected_at;
      return {
        id: c.id,
        title: name,
        subtitle: [
          c.external_account_label && c.external_account_label !== name ? c.external_account_label : null,
          when ? `active ${timeAgo(when)}` : null,
        ]
          .filter(Boolean)
          .join(" • ") || (live ? "Connected" : c.status),
        status: {
          label: live ? "Live" : c.status === "expired" ? "Expired" : "Offline",
          color: live ? "#10b981" : c.status === "expired" ? "#f59e0b" : "#706c64",
        },
      } satisfies ListItemData;
    });
}

async function fetchProductCatalog(): Promise<ListItemData[]> {
  const { data, error } = await supabase
    .from("integrations")
    .select("id,name,status,category,last_sync_at")
    .order("name", { ascending: true })
    .limit(12);
  if (error) throw error;
  const rows = (data ?? []) as IntegrationRow[];
  return rows.map((row) => {
    const s = (row.status ?? "").toLowerCase();
    const live = s === "connected" || s === "active";
    return {
      id: row.id,
      title: row.name,
      subtitle: row.last_sync_at
        ? `synced ${timeAgo(row.last_sync_at)}`
        : (row.category ?? row.status ?? "idle"),
      status: {
        label: live ? "Connected" : s || "Idle",
        color: live ? "#10b981" : "#706c64",
      },
    } satisfies ListItemData;
  });
}

export function IntegrationsHubWidget({ ctx }: WidgetProps) {
  const [state, setState] = useState<HubState>({ phase: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ phase: "loading" });
    (async () => {
      try {
        const connections = await fetchLiveConnections();
        if (cancelled) return;
        const items = connectionItems(connections as never);
        if (items.length > 0) {
          setState({ phase: "connections", items });
          return;
        }
        // No live connections — show platform catalog (authenticated read).
        try {
          const catalog = await fetchProductCatalog();
          if (cancelled) return;
          if (catalog.length === 0) setState({ phase: "empty" });
          else setState({ phase: "catalog", items: catalog });
        } catch (err) {
          if (cancelled) return;
          const msg = err instanceof Error ? err.message : String(err);
          if (/permission|row-level|rls|denied/i.test(msg)) setState({ phase: "denied" });
          else setState({ phase: "empty" });
        }
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        if (/sign in|not authenticated|unauthorized|401/i.test(msg)) setState({ phase: "denied" });
        else setState({ phase: "error", message: msg.slice(0, 200) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  if (state.phase === "loading") return <WidgetLoading rows={3} />;
  if (state.phase === "denied") return <WidgetPermissionRequired integration="your account" />;
  if (state.phase === "error") return <WidgetError message={state.message} onRetry={reload} />;
  if (state.phase === "empty") {
    return (
      <WidgetEmpty
        icon={<Plug size={20} className="text-[var(--muted)]" />}
        title="No integrations connected"
        hint="Connect GitHub, Google, Slack or Notion in Settings → Integrations to light this up."
        action={
          <button
            type="button"
            onClick={() => {
              ctx.actions.onToast?.("Open Settings → Integrations to connect a platform");
              reload();
            }}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text)] hover:border-[var(--accent)] transition-colors cursor-pointer"
          >
            Refresh
          </button>
        }
      />
    );
  }

  const items = state.items;
  const title = state.phase === "connections" ? "Connected Integrations" : "Platform Integrations";

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between pb-1 mb-1 border-b border-black/[0.04] dark:border-white/[0.06]">
        <h4 className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 truncate">{title}</h4>
        <button
          type="button"
          onClick={reload}
          aria-label="Refresh integrations"
          className="p-1 rounded text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
        >
          <RefreshCw size={11} />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        <ListPrimitive items={items} emptyMessage="Nothing connected yet" />
      </div>
    </div>
  );
}
