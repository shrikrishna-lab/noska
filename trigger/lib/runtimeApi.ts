/**
 * Noska Agent OS — Runtime API client for Trigger.dev jobs.
 * Thin authenticated bridge to the agent-runtime Edge Function.
 */

const RUNTIME_URL = `${process.env.SUPABASE_URL}/functions/v1/agent-runtime`;
const RUNTIME_SECRET = process.env.AGENT_RUNTIME_SECRET ?? "";

export interface RuntimeInvokeResult {
  status: number;
  body: Record<string, unknown>;
}

export async function invokeRuntime(payload: Record<string, unknown>): Promise<RuntimeInvokeResult> {
  if (!RUNTIME_SECRET) throw new Error("AGENT_RUNTIME_SECRET is not configured");
  const res = await fetch(RUNTIME_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-agent-runtime-secret": RUNTIME_SECRET },
    body: JSON.stringify(payload),
  });
  let body: Record<string, unknown> = {};
  try { body = await res.json(); } catch { /* non-JSON error page */ }
  return { status: res.status, body };
}
