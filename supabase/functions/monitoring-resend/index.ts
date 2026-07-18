import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAdminSession, handleCors, res, resError } from "../monitoring-utils/auth.ts";

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const allowed = await verifyAdminSession(req);
  if (!allowed) return resError("Unauthorized", 401);

  if (req.method !== "POST") return resError("Method not allowed", 405);

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return resError("Resend not configured", 503);

  const body: { path?: string; limit?: string } = {};
  try { Object.assign(body, await req.json()); } catch { /* ignore */ }

  const { path, limit = "20" } = body;
  const base = "https://api.resend.com";
  const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };

  try {
    if (path === "analytics") {
      const url = `${base}/emails?limit=100`;
      const r = await fetch(url, { headers });
      if (!r.ok) throw new Error(`Resend API ${r.status}`);
      const data = await r.json();
      const emails = data?.data ?? [];
      let sent = 0, delivered = 0, opened = 0, clicked = 0, failed = 0, bounced = 0, complaint = 0;
      for (const e of emails) {
        switch (e.last_event) {
          case "sent": sent++; break;
          case "delivered": sent++; delivered++; break;
          case "opened": sent++; delivered++; opened++; break;
          case "clicked": sent++; delivered++; opened++; clicked++; break;
          case "failed": failed++; break;
          case "bounced": sent++; bounced++; break;
          case "complained": sent++; delivered++; opened++; complaint++; break;
        }
      }
      return res({ sent, delivered, opened, clicked, failed, bounced, complaint, spam: complaint });
    }

    if (path === "emails") {
      const url = `${base}/emails?limit=${limit}`;
      const r = await fetch(url, { headers });
      if (!r.ok) throw new Error(`Resend API ${r.status}`);
      const data = await r.json();
      const emails = data?.data ?? [];
      return res(emails.map((e: Record<string, unknown>) => ({
        id: e.id, to: e.to, from: e.from, subject: e.subject,
        status: e.last_event ?? "unknown", createdAt: e.created_at,
      })));
    }

    return resError("Unknown path", 400);
  } catch (err) {
    return resError(err instanceof Error ? err.message : "Unknown error");
  }
});
