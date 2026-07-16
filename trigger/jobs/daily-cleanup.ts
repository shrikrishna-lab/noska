import { client } from "../client";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

client.defineJob({
  id: "daily-cleanup",
  name: "Daily Cleanup — expired sessions & waitlist tokens",
  version: "1.0.0",
  trigger: {
    type: "cron",
    cron: "0 3 * * *",
  },
  run: async () => {
    const now = new Date().toISOString();

    const { data: deletedSessions, error: sessionError } = await supabase
      .from("admin_sessions")
      .delete()
      .lt("expires_at", now);

    if (sessionError) console.error("[daily-cleanup] session error:", sessionError);
    console.log(`[daily-cleanup] deleted ${deletedSessions ?? 0} expired sessions`);

    const { data: deletedTokens, error: tokenError } = await supabase
      .from("waitlist_entries")
      .delete()
      .eq("status", "rejected")
      .lt("joined_at", new Date(Date.now() - 90 * 86400000).toISOString());

    if (tokenError) console.error("[daily-cleanup] token error:", tokenError);
    console.log(`[daily-cleanup] deleted ${deletedTokens ?? 0} stale waitlist entries`);

    return { deletedSessions, deletedTokens };
  },
});
