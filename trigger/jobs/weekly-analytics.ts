import { client } from "../client";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

client.defineJob({
  id: "weekly-analytics",
  name: "Weekly Analytics Summary",
  version: "1.0.0",
  trigger: {
    type: "cron",
    cron: "0 8 * * 1",
  },
  run: async () => {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const { count: newUsers } = await supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo);

    const { count: newPages } = await supabase
      .from("pages")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo);

    const { count: aiCalls } = await supabase
      .from("audit_events")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo)
      .not("ai_model", "is", null);

    return {
      period: "weekly",
      newUsers: newUsers ?? 0,
      newPages: newPages ?? 0,
      aiCalls: aiCalls ?? 0,
      reportGeneratedAt: new Date().toISOString(),
    };
  },
});
