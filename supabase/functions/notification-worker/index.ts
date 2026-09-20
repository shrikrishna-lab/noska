import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { allowedPushEndpoint, authorizedWorker } from "../_shared/notifications/security.ts";

interface Delivery {
  id: string;
  user_id: string;
  notification_id: string;
  subscription_id: string | null;
  channel: "push" | "broadcast";
  claim_token: string;
}

Deno.serve(async (request: Request) => {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!await authorizedWorker(request, key)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
  const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const subject = Deno.env.get("VAPID_SUBJECT");
  const pushReady = Boolean(publicKey && privateKey && subject);
  try {
    if (pushReady) webpush.setVapidDetails(subject!, publicKey!, privateKey!);
    const reminders = await db.rpc("notification_process_reminders", { p_limit: 100 });
    if (reminders.error) throw new Error("REMINDER_PROCESSING_FAILED");
    const claims = await db.rpc("notification_claim_deliveries", { p_limit: 30 });
    if (claims.error) throw new Error("DELIVERY_CLAIM_FAILED");
    let sent = 0;
    let deferred = 0;
    const deliveries = claims.data as Delivery[];
    for (let offset = 0; offset < deliveries.length; offset += 5) {
      await Promise.all(deliveries.slice(offset, offset + 5).map(async (delivery) => {
        const finish = async (success: boolean, error: string | null = null, permanent = false) => {
          const result = await db.rpc("notification_finish_delivery", {
            p_id: delivery.id,
            p_claim_token: delivery.claim_token,
            p_success: success,
            p_error: error,
            p_permanent: permanent,
          });
          if (result.error) throw new Error("DELIVERY_ACK_FAILED");
          if (success && result.data) sent++;
          else deferred++;
        };
        try {
          if (delivery.channel === "broadcast") {
            const result = await db.rpc("notification_broadcast_delivery", {
              p_id: delivery.id, p_claim_token: delivery.claim_token,
            });
            if (result.error) throw new Error("BROADCAST_FAILED");
            if (result.data) sent++;
            return;
          }
          if (!pushReady) {
            await finish(false, "VAPID_NOT_CONFIGURED");
            return;
          }
          const [subscription, notification] = await Promise.all([
            db.from("push_subscriptions").select("endpoint,p256dh,auth,disabled_at,expiration_time")
              .eq("id", delivery.subscription_id!).eq("user_id", delivery.user_id).maybeSingle(),
            db.from("notifications").select("id,is_read,is_archived,priority")
              .eq("id", delivery.notification_id).eq("user_id", delivery.user_id).maybeSingle(),
          ]);
          if (subscription.error || notification.error) throw new Error("DELIVERY_LOOKUP_FAILED");
          const sub = subscription.data;
          const n = notification.data;
          if (!sub || !n || sub.disabled_at || n.is_read || n.is_archived ||
            (sub.expiration_time && Date.parse(sub.expiration_time) <= Date.now())) {
            await finish(false, "NO_LONGER_ELIGIBLE", true);
            return;
          }
          if (!allowedPushEndpoint(sub.endpoint)) {
            await finish(false, "UNSUPPORTED_PUSH_ENDPOINT", true);
            return;
          }
          await webpush.sendNotification({
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          }, JSON.stringify({
            notification_id: n.id,
            title: "Noska",
            body: "You have a new notification.",
            url: "/my-workspace",
            tag: n.id,
          }), {
            TTL: 3600,
            urgency: n.priority === "urgent" || n.priority === "high" ? "high" : "normal",
            timeout: 10000,
          });
          await finish(true);
        } catch (error) {
          const status = typeof error === "object" && error !== null && "statusCode" in error
            ? Number(error.statusCode) : 0;
          if ((status === 404 || status === 410) && delivery.subscription_id) {
            await db.from("push_subscriptions").update({ disabled_at: new Date().toISOString() })
              .eq("id", delivery.subscription_id).eq("user_id", delivery.user_id);
          }
          await finish(false, status ? `PUSH_HTTP_${status}` : "DELIVERY_FAILED", status === 404 || status === 410);
        }
      }));
    }
    return Response.json({ reminders: reminders.data, claimed: deliveries.length, sent, deferred, push_configured: pushReady });
  } catch {
    return Response.json({ error: "Notification worker failed; unacknowledged leases will retry" }, { status: 500 });
  }
});
