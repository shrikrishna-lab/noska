// GET /referrals — my code, stats, tier progress, reward catalog.
// POST /referrals { action: "apply", code } — link an invite code.
// Authenticated users only (verify_jwt on); all writes are service-role.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { cors, json, requireBillingUser, toErrorBody, rateLimit, HttpError } from "../_shared/billing/helpers.ts";
import { getReferralSummary, applyReferralCode } from "../_shared/billing/referrals.ts";

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  try {
    const user = await requireBillingUser(req);
    if (!rateLimit("referrals:" + user.sub, 20)) {
      return json(req, 429, { code: "RATE_LIMITED", message: "Too many requests. Try again shortly." });
    }
    if (req.method === "GET") {
      return json(req, 200, await getReferralSummary(user.sub));
    }
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (String((body as Record<string, unknown>).action ?? "") === "apply") {
        return json(req, 200, await applyReferralCode(user.sub, (body as Record<string, unknown>).code));
      }
      throw HttpError(400, "INVALID_REQUEST", "Unknown action.");
    }
    return json(req, 405, { code: "METHOD_NOT_ALLOWED" });
  } catch (e) {
    const { status, body } = toErrorBody(e);
    return json(req, status, body);
  }
});
