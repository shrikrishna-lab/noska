import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAdminSession, handleCors, res, resError } from "../monitoring-utils/auth.ts";

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const allowed = await verifyAdminSession(req);
  if (!allowed) return resError("Unauthorized", 401);

  if (req.method !== "POST") return resError("Method not allowed", 405);

  const token = Deno.env.get("VERCEL_TOKEN");
  const teamId = Deno.env.get("VERCEL_TEAM_ID");
  const projectId = Deno.env.get("VERCEL_PROJECT_ID");
  if (!token || !projectId) return resError("Vercel not configured", 503);

  const body: { path?: string; limit?: string } = {};
  try { Object.assign(body, await req.json()); } catch { /* ignore */ }

  const { path, limit = "20" } = body;
  const base = "https://api.vercel.com";
  const teamParam = teamId ? `?teamId=${teamId}` : "";
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  try {
    if (path === "deployments") {
      const url = `${base}/v6/deployments${teamParam ? `${teamParam}&` : "?"}projectId=${projectId}&limit=${limit}`;
      const r = await fetch(url, { headers });
      if (!r.ok) throw new Error(`Vercel API ${r.status}`);
      const data = await r.json();
      const deployments = data?.deployments ?? [];
      return res(deployments.map((d: Record<string, unknown>) => ({
        id: d.uid, name: d.name, url: d.url, state: d.state, readyState: d.readyState,
        createdAt: d.createdAt, buildingAt: d.buildingAt, readyAt: d.readyAt,
        meta: d.meta, target: d.target,
      })));
    }

    return resError("Unknown path", 400);
  } catch (err) {
    return resError(err instanceof Error ? err.message : "Unknown error");
  }
});
