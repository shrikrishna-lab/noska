import { supabase } from "./supabase";
import { mapPageFromDb } from "./supabaseService";
import type { Page } from "./supabaseService";
import type { Tables } from "../../types/supabase";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

/** Handlers invoked for remote pages-table changes belonging to `userId`.
 * Payload rows are raw DB rows; they are mapped through mapPageFromDb before
 * reaching the handlers so consumers see the same Page shape fetchPages returns. */
export interface PagesRealtimeHandlers {
  /** INSERT or UPDATE on a page owned by the user. */
  onPageUpsert: (page: Page) => void;
  /** DELETE on a page owned by the user (hard delete — trash is a soft flag). */
  onPageDelete: (pageId: string) => void;
}

/**
 * Subscribe to Supabase Realtime postgres_changes for the `pages` table,
 * filtered to the given owner. This is what keeps re-login and multi-device
 * sessions current without a manual refetch: another device's edits land here
 * moments after they commit.
 *
 * Requires the `pages` table in the `supabase_realtime` publication (see
 * supabase/migrations/20260909000001_pages_realtime.sql). Realtime respects
 * RLS, so the authenticated token only receives rows the user can read.
 *
 * Returns an unsubscribe function (idempotent).
 */
export function subscribeToPages(userId: string, handlers: PagesRealtimeHandlers): () => void {
  // Raw (snake_case) DB row shape — mapped through mapPageFromDb below.
  type PageRow = Record<string, any>;
  const channel: RealtimeChannel = supabase
    .channel(`pages:user:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "pages",
        filter: `user_id=eq.${userId}`,
      },
      (payload: RealtimePostgresChangesPayload<PageRow>) => {
        try {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            if (payload.new?.id) handlers.onPageUpsert(mapPageFromDb(payload.new as Tables<"pages">));
          } else if (payload.eventType === "DELETE") {
            // Without REPLICA IDENTITY FULL, `old` carries only the primary key —
            // which is all we need.
            if (payload.old?.id) handlers.onPageDelete(payload.old.id);
          }
        } catch (e) {
          console.warn("[pagesRealtime] failed to process change:", e);
        }
      }
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn(`[pagesRealtime] channel for user ${userId}: ${status}`);
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}
