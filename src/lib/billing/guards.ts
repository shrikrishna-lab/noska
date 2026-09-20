// Client-side pre-checks for premium operations (§7).
// These are UX conveniences ONLY — every operation is re-verified server-side
// (billing-usage Edge Function + Postgres RLS + triggers). Never rely on these for security.
import { checkFeature, consumeUsage } from "./api";
import { billingMessage } from "./errors";

export interface GuardResult {
  ok: boolean;
  message?: string;
  upgrade_required?: boolean;
  code?: string;
  /** True when the check never reached the server (offline). Callers may fail open for UX. */
  transport?: boolean;
}

/** Pre-check a boolean feature (e.g. custom_agents, pdf_export, ai_generation). */
export async function requireFeature(feature: string): Promise<GuardResult> {
  const r = await checkFeature(feature, 1);
  if (r.ok) return { ok: true };
  if (r.transport) return { ok: false, code: "CHECK_FAILED", transport: true };
  const code = String((r as Record<string, unknown>).code ?? "FEATURE_NOT_AVAILABLE");
  return { ok: false, code, message: billingMessage(r), upgrade_required: true };
}

/** Pre-check a numeric limit (e.g. monthly_ai_credits, max_workspaces). */
export async function requireLimit(feature: string, amount = 1): Promise<GuardResult> {
  const r = await checkFeature(feature, amount);
  if (r.ok) return { ok: true };
  if (r.transport) return { ok: false, code: "CHECK_FAILED", transport: true };
  const code = String((r as Record<string, unknown>).code ?? "LIMIT_EXCEEDED");
  return { ok: false, code, message: billingMessage(r), upgrade_required: true };
}

/** Record metered consumption after a successful premium operation. */
export async function trackUsage(feature: string, amount = 1, workspace_id?: string): Promise<void> {
  try {
    await consumeUsage(feature, amount, workspace_id);
  } catch { /* usage telemetry must never break the user flow */ }
}
