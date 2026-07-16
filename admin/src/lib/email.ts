import { supabase, getAdminToken } from "./supabase";

function invokeEmail(body: Record<string, unknown>): Promise<{ data: unknown; error: { message: string } | null }> {
  const token = getAdminToken();
  if (!token) return Promise.resolve({ data: null, error: { message: "No admin session" } });
  if (!supabase) return Promise.resolve({ data: null, error: { message: "Supabase not available" } });
  return supabase.functions.invoke("send-email", {
    body,
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ id?: string; error?: string }> {
  const { data, error } = await invokeEmail({ action: "send_single", ...options });
  if (error) return { error: error.message };
  return (data ?? { error: "No response" }) as { id?: string; error?: string };
}

export async function sendCampaign(options: {
  campaign_id: string;
  campaign_name: string;
  recipients: Array<{ email: string; name?: string }>;
  subject: string;
  html: string;
}): Promise<{ sent?: number; failed?: number; error?: string }> {
  const { data, error } = await invokeEmail({ action: "send_campaign", ...options });
  if (error) return { error: error.message };
  return (data ?? { error: "No response" }) as { sent?: number; failed?: number; error?: string };
}

export async function sendBroadcast(options: {
  broadcast_id: string;
  title: string;
  message: string;
  type: string;
  target_type: string;
  target_users?: Array<{ email: string; name?: string }> | null;
}): Promise<{ sent?: number; failed?: number; error?: string }> {
  const { data, error } = await invokeEmail({ action: "send_broadcast", ...options });
  if (error) return { error: error.message };
  return (data ?? { error: "No response" }) as { sent?: number; failed?: number; error?: string };
}

export async function sendWaitlistInvite(options: {
  waitlist_id: string;
  name: string;
  email: string;
}): Promise<{ id?: string; error?: string }> {
  const { data, error } = await invokeEmail({ action: "send_invite", ...options });
  if (error) return { error: error.message };
  return (data ?? { error: "No response" }) as { id?: string; error?: string };
}

export async function queueCampaign(options: {
  campaign_id: string;
  recipients: Array<{ email: string; name?: string }>;
  subject: string;
  html: string;
}): Promise<{ queued?: number; error?: string }> {
  if (!supabase) return { error: "Supabase not available" };
  const token = getAdminToken();
  if (!token) return { error: "No admin session" };

  const rows = options.recipients.map((r) => ({
    campaign_id: options.campaign_id,
    recipient: r.email,
    subject: options.subject,
    html_content: options.html.replace(/{{name}}/g, r.name || "Valued User").replace(/{{email}}/g, r.email),
    status: "pending",
    retry_count: 0,
    max_retries: 3,
  }));

  const { error } = await supabase.from("email_queue").insert(rows);
  if (error) return { error: error.message };

  await supabase
    .from("email_campaigns")
    .update({ status: "sending" })
    .eq("id", options.campaign_id);

  return { queued: rows.length };
}
