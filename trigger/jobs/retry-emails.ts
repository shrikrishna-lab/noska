import { client } from "../client";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

client.defineJob({
  id: "retry-emails",
  name: "Retry Failed Resend Emails",
  version: "1.0.0",
  trigger: {
    type: "cron",
    cron: "*/30 * * * *",
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
      console.log("[retry-emails] no resend_api_key configured, skipping");
      return;
    }

    const { data: emailEvents } = await supabase
      .from("email_events")
      .select("*")
      .eq("event", "failed")
      .eq("retried", false)
      .lt("created_at", new Date(Date.now() - 60000).toISOString())
      .limit(50);

    if (!emailEvents?.length) {
      console.log("[retry-emails] no failed emails to retry");
      return { retried: 0 };
    }

    let retried = 0;
    for (const event of emailEvents) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: event.recipient,
            subject: event.subject,
            html: event.html_content || "<p>Retry</p>",
          }),
        });

        await supabase.from("email_events").update({ retried: true }).eq("id", event.id);

        if (res.ok) {
          retried++;
          await supabase.from("email_events").insert({
            event: "resent",
            recipient: event.recipient,
            subject: event.subject,
            message_id: event.message_id,
            created_at: new Date().toISOString(),
          });
        }
      } catch {
        console.error(`[retry-emails] failed to retry ${event.id}`);
      }
    }

    return { retried };
  },
});
