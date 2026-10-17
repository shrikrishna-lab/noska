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

/** Handlers for `page_permissions` rows belonging to `userId`. */
export interface PagePermissionsRealtimeHandlers {
  /**
   * A grant was created or changed for this user. The handler is expected to
   * refetch rather than trust the payload: `page_permissions.user_id` holds the
   * Clerk subject while the JWT `sub` may be the auth uuid, so matching on the
   * subscription filter alone is not reliable across both representations.
   */
  onPermissionsChanged: () => void;
}

/**
 * Subscribe to `page_permissions` INSERT/UPDATE/DELETE for the given user.
 *
 * This is what keeps the shared-page list honest in both directions:
 *   - an approval granted by an owner lands in the collaborator's list without
 *     a reload;
 *   - a revocation (owner removing a collaborator) drops the page from the
 *     revoked user's list, and because it only fires for rows belonging to
 *     `userId` it never touches the owner's own state.
 *
 * `page_permissions` is in the `supabase_realtime` publication and Realtime
 * respects RLS, so the token only receives rows it may read.
 */
export function subscribeToPagePermissions(
  userId: string,
  handlers: PagePermissionsRealtimeHandlers,
): () => void {
  type PermRow = Record<string, any>;
  const channel: RealtimeChannel = supabase
    .channel(`page_permissions:user:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "page_permissions",
        filter: `user_id=eq.${userId}`,
      },
      (_payload: RealtimePostgresChangesPayload<PermRow>) => {
        try {
          handlers.onPermissionsChanged();
        } catch (e) {
          console.warn("[pagesRealtime] failed to process permission change:", e);
        }
      },
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn(`[pagesRealtime] permissions channel for user ${userId}: ${status}`);
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}
