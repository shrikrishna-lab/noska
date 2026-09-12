/**
 * Integrations Hub — shows only integrations the account has connected.
 * Read is best-effort: the integrations table is admin-managed product
 * config, so any failure degrades to the permission state (never an error
 * crash). No external service is polled from here.
 */
import React, { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { timeAgo } from "../../../utils/helpers";
import { WidgetError, WidgetLoading, WidgetPermissionRequired } from "../components/WidgetFrame";
import type { WidgetProps } from "../types";

interface IntegrationRow {
  id: string;
  name: string;
  status: string | null;
  category: string | null;
  last_sync_at: string | null;
}

export function IntegrationsHubWidget({ ctx }: WidgetProps) {
  const [rows, setRows] = useState<IntegrationRow[] | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error" | "denied">("loading");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    supabase
      .from("integrations")
      .select("id,name,status,category,last_sync_at")
      .limit(8)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setState("denied");
          return;
        }
        setRows((data ?? []) as IntegrationRow[]);
        setState("ready");
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (state === "denied") return <WidgetPermissionRequired integration="integrations" />;
  if (state === "error") return <WidgetError onRetry={() => setReloadKey((k) => k + 1)} />;
  if (state === "loading") return <WidgetLoading rows={2} />;
  if (!rows || rows.length === 0) {
    return (
      <WidgetPermissionRequired integration="integrations" />
    );
  }

  return (
    <div className="h-full space-y-1 overflow-y-auto scrollbar-thin">
      {rows.map((row) => {
        const connected = (row.status ?? "").toLowerCase() === "connected" || (row.status ?? "").toLowerCase() === "active";
        return (
          <div key={row.id} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
            <span className={`h-2 w-2 shrink-0 rounded-full ${connected ? "bg-emerald-500" : "bg-[var(--border)]"}`} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11.5px] font-semibold text-[var(--text)]">{row.name}</span>
              <span className="text-[10px] text-[var(--muted)]">
                {row.last_sync_at ? `synced ${timeAgo(row.last_sync_at)}` : (row.category ?? row.status ?? "idle")}
              </span>
            </span>
            {!connected && <RefreshCw size={11} className="shrink-0 text-[var(--muted)]" />}
          </div>
        );
      })}
    </div>
  );
}
