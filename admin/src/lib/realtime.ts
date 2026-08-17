import { supabase, SUPABASE_ENABLED } from "./supabase";

// ─── Shared realtime relay bus ───
//
// The admin panel connects to Supabase with the anon key, so
// postgres_changes events on RLS-protected admin tables (notifications,
// audit_events, user_profiles, ...) are filtered out and never delivered.
// The `admin_realtime_outbox` relay table exists specifically so anon
// clients CAN receive a change signal.  A SECURITY DEFINER trigger writes
// a non-sensitive row (table, event, row id, timestamp) to the relay on
// every change, and this module fans those events out to every subscriber.
//
// Only ONE realtime websocket channel is ever opened, no matter how many
// hooks subscribe — listeners are registered locally and dispatched from
// the single channel callback.

export interface RealtimeOutboxRow {
  table_name: string;
  event: "INSERT" | "UPDATE" | "DELETE";
  record_id: string | null;
  created_at: string;
}

type Listener = (row: RealtimeOutboxRow) => void;

let channel: ReturnType<NonNullable<typeof supabase>["channel"]> | null = null;
const listeners = new Set<Listener>();
let started = false;

function ensureStarted() {
  if (started) return;
  if (!SUPABASE_ENABLED || !supabase) return;
  started = true;

  channel = supabase
    .channel("admin-realtime-outbox")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "admin_realtime_outbox" },
      (payload) => {
        const row = payload.new as RealtimeOutboxRow;
        if (!row || !row.table_name) return;
        for (const listener of listeners) {
          try {
            listener(row);
          } catch {
            // never let one subscriber break the shared bus
          }
        }
      }
    )
    .subscribe();
}

/** Subscribe to outbox relay events. Returns an unsubscribe function. */
export function subscribeRealtime(listener: Listener): () => void {
  listeners.add(listener);
  ensureStarted();
  return () => {
    listeners.delete(listener);
  };
}