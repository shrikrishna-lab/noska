import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAdminSession, handleCors, res, resError } from "./lib/auth.ts";
import { monitor } from "./services/monitor.ts";
import { clerkUsers } from "./services/users.ts";
import { posthogAnalytics } from "./services/analytics.ts";
import { sentryErrors } from "./services/errors.ts";
import { resendEmail } from "./services/email.ts";
import { vercelDeployments } from "./services/deployments.ts";

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== "POST") return resError("Method not allowed", 405);

  const allowed = await verifyAdminSession(req);
  if (!allowed) return resError("Unauthorized", 401);

  const body: { service?: string; action?: string; payload?: Record<string, unknown> } = {};
  try { Object.assign(body, await req.json()); } catch { return resError("Invalid JSON body", 400); }

  const { service, action, payload = {} } = body;
  if (!service || !action) return resError("Missing service or action", 400);

  try {
    switch (service) {
      case "monitor":
        return res(await monitor(action, payload));
      case "users":
        return res(await clerkUsers(action, payload));
      case "analytics":
        return res(await posthogAnalytics(action, payload));
      case "errors":
        return res(await sentryErrors(action, payload));
      case "email":
        return res(await resendEmail(action, payload));
      case "deployments":
        return res(await vercelDeployments(action, payload));
      default:
        return resError(`Unknown service: ${service}`, 400);
    }
  } catch (err) {
    return resError(err instanceof Error ? err.message : "Unknown error");
  }
});
