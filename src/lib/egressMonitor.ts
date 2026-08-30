/**
 * Client-Side Supabase Request & Egress Observability (Dev/Debug Mode)
 *
 * NOTE: This is client-side instrumentation for development/diagnostics
 * to identify request bursts, dirty save batch sizes, and active channel count.
 * It is NOT official Supabase billing telemetry.
 * Strictly avoids logging private user contents, tokens, or document data.
 */

interface EgressLogEvent {
  timestamp: string;
  type: "query" | "mutation" | "dirty_sync" | "realtime_channel" | "cache_hit";
  tableOrAction: string;
  details?: Record<string, unknown>;
}

const recentEvents: EgressLogEvent[] = [];
const MAX_EVENTS = 200;

function isDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    import.meta.env.DEV === true ||
    localStorage.getItem("noska_debug_egress") === "true"
  );
}

export const EgressMonitor = {
  logEvent(
    type: EgressLogEvent["type"],
    tableOrAction: string,
    details?: Record<string, unknown>
  ): void {
    if (!isDebugEnabled()) return;

    const event: EgressLogEvent = {
      timestamp: new Date().toISOString().substring(11, 23),
      type,
      tableOrAction,
      details,
    };

    recentEvents.unshift(event);
    if (recentEvents.length > MAX_EVENTS) {
      recentEvents.pop();
    }

    // Output formatted console message in dev
    console.debug(
      `%c[EgressMonitor] %c${type.toUpperCase()}%c ${tableOrAction}`,
      "color: #10b981; font-weight: bold;",
      "color: #3b82f6; font-weight: bold;",
      "color: inherit;",
      details || ""
    );
  },

  getRecentEvents(): readonly EgressLogEvent[] {
    return recentEvents;
  },

  clearEvents(): void {
    recentEvents.length = 0;
  },
};
