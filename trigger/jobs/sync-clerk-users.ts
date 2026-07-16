import { client } from "../client";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

client.defineJob({
  id: "sync-clerk-users",
  name: "Sync Clerk Users to Supabase",
  version: "1.0.0",
  trigger: {
    type: "cron",
    cron: "0 5 * * *",
  },
  run: async () => {
    const clerkSecret = process.env.CLERK_SECRET_KEY;
    if (!clerkSecret) {
      console.log("[sync-clerk-users] no CLERK_SECRET_KEY configured, skipping");
      return;
    }

    let offset = 0;
    const limit = 500;
    let synced = 0;

    while (true) {
      const res = await fetch(
        `https://api.clerk.com/v1/users?limit=${limit}&offset=${offset}`,
        { headers: { Authorization: `Bearer ${clerkSecret}` } }
      );

      if (!res.ok) {
        console.error(`[sync-clerk-users] Clerk API error: ${res.status}`);
        break;
      }

      const users = await res.json();
      if (!Array.isArray(users) || users.length === 0) break;

      for (const user of users) {
        const email = user.email_addresses?.[0]?.email_address;
        const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username || "Unknown";

        const { error } = await supabase.from("user_profiles").upsert(
          {
            user_id: user.id,
            user_name: name,
            email: email ?? null,
            avatar_url: user.image_url ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

        if (error) console.error(`[sync-clerk-users] upsert error for ${user.id}:`, error);
        else synced++;
      }

      if (users.length < limit) break;
      offset += limit;
    }

    return { synced, note: "full sync from Clerk API" };
  },
});
