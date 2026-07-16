import { client } from "../client";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

client.defineJob({
  id: "email-queue",
  name: "Email Queue — batch campaign sends",
  version: "1.0.0",
  trigger: {
    type: "cron",
    cron: "* * * * *",
  },
  run: async () => {
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", ["resend_api_key", "from_email"]);

    const map: Record<string, string> = {};
    if (settings) for (const row of settings) map[row.key] = String(row.value ?? "");
    const apiKey = map.resend_api_key;
    const fromEmail = map.from_email || "onboarding@resend.dev";

    if (!apiKey) {
      console.log("[email-queue] no resend_api_key configured");
      return;
    }

    const batchSize = 100;

    const { data: pending } = await supabase
      .from("email_queue")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(batchSize);

    if (!pending?.length) return;

    const results = { sent: 0, failed: 0 };

    for (const item of pending) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: item.recipient,
            subject: item.subject,
            html: item.html_content,
          }),
        });

        if (res.ok) {
          await supabase.from("email_queue").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", item.id);
          results.sent++;
        } else {
          await supabase.from("email_queue").update({ status: "failed", retry_count: (item.retry_count ?? 0) + 1 }).eq("id", item.id);
          results.failed++;
        }
      } catch {
        await supabase.from("email_queue").update({ status: "failed", retry_count: (item.retry_count ?? 0) + 1 }).eq("id", item.id);
        results.failed++;
      }
    }

    return { batchSize, ...results, remaining_pending: (pending.length - results.sent - results.failed) };
  },
});
