/**
 * System widgets — Sync Status, Connection Status. Deliberately compact
 * indicators (the spec: "Do not create a large intrusive widget for this").
 */
import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, TriangleAlert, Wifi, WifiOff } from "lucide-react";
import { useWidgetEngine } from "../engine";
import type { WidgetProps } from "../types";

type SyncState = "synced" | "syncing" | "offline" | "issue";

function useSyncState(): { state: SyncState; lastChangeAt: string | null } {
  const { online } = useWidgetEngine();
  const [syncing, setSyncing] = useState(false);
  const [lastChangeAt, setLastChangeAt] = useState<string | null>(null);

  // "Syncing" mirrors actual page-mutation traffic: brief pulse after any
  // change, resolved to "Synced" shortly after. Offline overrides both.
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const handler = () => {
      setLastChangeAt(new Date().toISOString());
      setSyncing(true);
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => setSyncing(false), 2500);
    };
    window.addEventListener("noska:pages-synced", handler);
    return () => {
      window.removeEventListener("noska:pages-synced", handler);
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  const state: SyncState = !online ? "offline" : syncing ? "syncing" : "synced";
  return { state, lastChangeAt };
}

export function SyncStatusWidget({ ctx }: WidgetProps) {
  const { state } = useSyncState();

  if (state === "synced") {
    return (
      <div className="flex h-full items-center gap-2.5">
        <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
        <div>
          <p className="text-[12px] font-bold text-[var(--text)]">Synced</p>
          <p className="text-[10px] text-[var(--muted)]">Everything is up to date</p>
        </div>
      </div>
    );
  }
  if (state === "syncing") {
    return (
      <div className="flex h-full items-center gap-2.5">
        <Loader2 size={18} className="shrink-0 animate-spin text-blue-500" />
        <div>
          <p className="text-[12px] font-bold text-[var(--text)]">Syncing…</p>
          <p className="text-[10px] text-[var(--muted)]">Saving your changes</p>
        </div>
      </div>
    );
  }
  // offline / issue — offer a recovery action
  return (
    <div className="flex h-full items-center gap-2.5">
      <TriangleAlert size={18} className="shrink-0 text-amber-500" />
      <div className="min-w-0">
        <p className="text-[12px] font-bold text-[var(--text)]">Offline</p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-1 text-[10px] font-semibold text-[var(--accent)] cursor-pointer"
        >
          <RefreshCw size={10} /> Reconnect
        </button>
      </div>
    </div>
  );
}

export function ConnectionStatusWidget({ ctx }: WidgetProps) {
  const { online } = useWidgetEngine();
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!online) setWasOffline(true);
  }, [online]);

  return (
    <div className="flex h-full items-center gap-2.5">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${online ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
        {online ? <Wifi size={14} /> : <WifiOff size={14} />}
      </span>
      <div className="min-w-0">
        <p className="text-[12px] font-bold text-[var(--text)]">{online ? "Online" : "Offline"}</p>
        <p className="truncate text-[10px] text-[var(--muted)]">
          {online ? (wasOffline ? "Reconnected" : "Connected to Noska") : "Working offline — changes are queued locally"}
        </p>
      </div>
    </div>
  );
}
