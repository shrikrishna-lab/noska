import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAdminSession, handleCors, res, resError } from "../monitoring-utils/auth.ts";

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const allowed = await verifyAdminSession(req);
  if (!allowed) return resError("Unauthorized", 401);

  if (req.method !== "POST") return resError("Method not allowed", 405);

  const secretKey = Deno.env.get("CLERK_SECRET_KEY");
  if (!secretKey) return resError("Clerk not configured", 503);

  const body: { path?: string; days?: string; status?: string; limit?: string } = {};
  try { Object.assign(body, await req.json()); } catch { /* ignore */ }

  const { path, days = "7", status = "active", limit = "20" } = body;
  const base = "https://api.clerk.com/v1";
  const headers = { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" };

  try {
    if (path === "user-count") {
      const r = await fetch(`${base}/users/count`, { headers });
      if (!r.ok) throw new Error(`Clerk API ${r.status}`);
      const data = await r.json();
      return res({ total: data?.total_count ?? 0 });
    }

    if (path === "sessions") {
      const [totalRes, activeRes, recentRes] = await Promise.all([
        fetch(`${base}/sessions/count?status=active`, { headers }),
        fetch(`${base}/sessions/count?status=active&last_active_at_before=${Math.floor(Date.now() / 1000)}`, { headers }),
        fetch(`${base}/sessions?status=${status}&limit=${limit}`, { headers }),
      ]);
      const totalData = totalRes.ok ? await totalRes.json() : { total_count: 0 };
      const activeData = activeRes.ok ? await activeRes.json() : { total_count: 0 };
      const recentSessions = recentRes.ok ? await recentRes.json() : [];

      return res({
        total: totalData.total_count ?? 0, active: activeData.total_count ?? 0,
        recentSessions: Array.isArray(recentSessions) ? recentSessions.map((s: Record<string, unknown>) => ({
          id: s.id, userId: s.user_id, status: s.status, lastActiveAt: s.last_active_at, clientId: s.client_id,
        })) : [],
      });
    }

    if (path === "signups") {
      const dateFrom = new Date(Date.now() - Number(days) * 86400000).toISOString().split("T")[0];
      const r = await fetch(`${base}/users?created_at_gte=${dateFrom}&limit=100&order_by=-created_at`, { headers });
      if (!r.ok) throw new Error(`Clerk API ${r.status}`);
      const data = await r.json();
      const users = Array.isArray(data) ? data : data?.data ?? [];
      return res(users.map((u: Record<string, unknown>) => ({
        id: u.id, email: (u.email_addresses as Array<Record<string, unknown>>)?.[0]?.email_address ?? "",
        createdAt: u.created_at, lastSignInAt: u.last_sign_in_at,
      })));
    }

    return resError("Unknown path", 400);
  } catch (err) {
    return resError(err instanceof Error ? err.message : "Unknown error");
  }
});
