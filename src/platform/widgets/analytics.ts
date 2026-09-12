/**
 * Widget telemetry — batched, insert-only writes to `widget_analytics`.
 *
 * Events are queued in memory (plus a localStorage crash buffer) and
 * flushed every 30s or at 20 events via record_widget_events(). Payloads
 * carry no user content — only widget ids, event kinds, platform, timing
 * and truncated error messages.
 */
import { supabase } from "../../lib/supabase";
import type { Json } from "../../../types/supabase";
import { getPlatform } from "../../platform";

export type WidgetAnalyticsEvent = "render" | "interact" | "error" | "load";

interface QueuedEvent {
  widget_id: string;
  event: WidgetAnalyticsEvent;
  platform: string;
  app_version: string;
  load_ms?: number;
  error_message?: string;
}

const BUFFER_KEY = "noska:widget-analytics:v1";
const FLUSH_INTERVAL_MS = 30_000;
const FLUSH_AT = 20;

let queue: QueuedEvent[] = [];
let timer: ReturnType<typeof setInterval> | null = null;

function appVersion(): string {
  try {
    const internals = (window as unknown as { __TAURI_INTERNALS__?: { metadata?: { version?: string } } })
      .__TAURI_INTERNALS__;
    return internals?.metadata?.version || "unknown";
  } catch {
    return "unknown";
  }
}

function restoreBuffer(): void {
  try {
    const raw = localStorage.getItem(BUFFER_KEY);
    if (raw) queue = JSON.parse(raw).concat(queue).slice(0, 200);
  } catch {
    /* ignore */
  }
}

function persistBuffer(): void {
  try {
    if (queue.length > 0) localStorage.setItem(BUFFER_KEY, JSON.stringify(queue));
    else localStorage.removeItem(BUFFER_KEY);
  } catch {
    /* ignore */
  }
}

async function flush(): Promise<void> {
  if (queue.length === 0) return;
  const batch = queue.splice(0, 50);
  persistBuffer();
  try {
    const { error } = await supabase.rpc("record_widget_events", {
      p_events: batch as unknown as Json,
    });
    if (error) {
      // Put the batch back (bounded) so telemetry isn't silently dropped.
      queue = batch.concat(queue).slice(0, 200);
      persistBuffer();
    }
  } catch {
    queue = batch.concat(queue).slice(0, 200);
    persistBuffer();
  }
}

export function trackWidgetEvent(
  widgetId: string,
  event: WidgetAnalyticsEvent,
  extra?: { loadMs?: number; errorMessage?: string },
): void {
  if (!widgetId) return;
  queue.push({
    widget_id: widgetId,
    event,
    platform: getPlatform(),
    app_version: appVersion(),
    load_ms: extra?.loadMs,
    error_message: extra?.errorMessage ? extra.errorMessage.slice(0, 500) : undefined,
  });
  if (queue.length > 200) queue = queue.slice(-200);
  if (!timer) {
    restoreBuffer();
    timer = setInterval(() => {
      void flush();
    }, FLUSH_INTERVAL_MS);
  }
  if (queue.length >= FLUSH_AT) void flush();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    void flush();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush();
  });
}
