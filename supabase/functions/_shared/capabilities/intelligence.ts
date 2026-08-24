/* ============================================================================
 * Noska Platform V5 — Intelligence capabilities (agents & automations).
 *
 * ONE canonical implementation of agent/automation CRUD + server-run
 * operations. Both /api/v1 routes and MCP tools are thin adapters over this
 * module. Execution itself is delegated to the agent-runtime Edge Function
 * (the single planner→permissions→execution→verification engine), so there
 * is exactly one runtime and zero duplicated planners.
 * ========================================================================== */

import {
  db, errors, emitEvent, audit, verifyPersisted,
  type KeyRow, type Row,
} from "../core/runtime.ts";

/* ─── Agent runtime bridge ──────────────────────────────────────────────── */

const RUNTIME_SECRET = Deno.env.get("AGENT_RUNTIME_SECRET") ?? "";
const RUNTIME_URL = `${Deno.env.get("SUPABASE_URL") ?? ""}/functions/v1/agent-runtime`;

export interface RuntimeInvokeResult {
  ok: boolean;
  httpStatus: number;
  body: Row;
}

/** Server-to-server invocation of THE runtime (never a second planner). */
export async function invokeRuntime(payload: Row): Promise<RuntimeInvokeResult> {
  if (!RUNTIME_SECRET || !Deno.env.get("SUPABASE_URL")) {
    throw errors.unsupported(
      "Agent execution is not configured on this deployment (missing AGENT_RUNTIME_SECRET).",
    );
  }
  const res = await fetch(RUNTIME_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-agent-runtime-secret": RUNTIME_SECRET },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(300_000),
  });
  let body: Row = {};
  try { body = await res.json(); } catch { /* non-JSON error page */ }
  return { ok: res.ok && !body.error, httpStatus: res.status, body };
}

/* ─── Agents CRUD ───────────────────────────────────────────────────────── */

export const agents = {
  async list(userId: string, opts: { status?: string } = {}) {
    let q = db().from("agents").select("id,name,description,icon,model,status,type,workspace_id,updated_at")
      .eq("owner_id", userId);
    if (opts.status) q = q.eq("status", String(opts.status));
    const { data } = await q.order("updated_at", { ascending: false });
    return { agents: data ?? [] };
  },

  async get(userId: string, id: string) {
    const { data } = await db().from("agents").select("*").eq("owner_id", userId).eq("id", id).maybeSingle();
    if (!data) throw errors.notFound("Agent");
    return data as Row;
  },

  async create(key: KeyRow, input: Row) {
    const name = String(input.name ?? "").trim();
    if (!name) throw errors.validation("name is required");
    const ins: Row = {
      owner_id: key.user_id,
      name,
      type: "custom",
      status: input.status === "paused" ? "paused" : "active",
      description: input.description ?? null,
      icon: typeof input.icon === "string" ? input.icon : "🤖",
      instructions: typeof input.instructions === "string" ? input.instructions : null,
      model: ["default", "fast", "quality"].includes(String(input.model)) ? String(input.model) : "default",
      workspace_id: resolveWs(key, input),
    };
    const { data, error } = await db().from("agents").insert(ins).select("id,name,status").single();
    if (error) throw errors.internal(error.message);
    const grants = Array.isArray(input.access_grants) ? input.access_grants : [];
    if (grants.length) {
      await db().from("agents").update({ config: { access_grants: grants } }).eq("owner_id", key.user_id)
        .eq("id", (data as Row).id as string);
    }
    return verifyPersisted(key.user_id, "agents", String((data as Row).id), { name }, "owner_id")
      .then((v) => ({ agent: data, verification: v.status }));
  },

  async update(userId: string, id: string, patch: Row) {
    const allowed: Row = {};
    for (const f of ["name", "instructions", "description", "model"] as const) {
      if (typeof patch[f] === "string" && patch[f] !== undefined) allowed[f] = patch[f];
    }
    if (patch.status && ["active", "paused"].includes(String(patch.status))) allowed.status = String(patch.status);
    if (!Object.keys(allowed).length) throw errors.validation("Nothing to update.");
    const { error } = await db().from("agents").update(allowed).eq("owner_id", userId).eq("id", id);
    if (error) throw errors.internal(error.message);
    return verifyPersisted(userId, "agents", id, allowed, "owner_id");
  },

  async archive(userId: string, id: string) {
    await db().from("agents").update({ status: "paused" }).eq("owner_id", userId).eq("id", id);
    return { archived: true, id, verification: (await verifyPersisted(userId, "agents", id, { status: "paused" }, "owner_id")).status };
  },
};

function resolveWs(key: KeyRow, input: Row): string {
  return typeof input.workspace_id === "string" && input.workspace_id
    ? input.workspace_id
    : key.default_workspace_id ?? "";
}

/* ─── Automations CRUD ──────────────────────────────────────────────────── */

export const automations = {
  async list(userId: string, opts: { status?: string } = {}) {
    let q = db().from("automations")
      .select("id,name,description,icon,status,trigger_config,last_run_at,run_count,health,next_run_at,updated_at")
      .eq("owner_id", userId);
    if (opts.status) q = q.eq("status", String(opts.status));
    const { data } = await q.order("updated_at", { ascending: false });
    return { automations: data ?? [] };
  },

  async get(userId: string, id: string) {
    const { data } = await db().from("automations").select("*").eq("owner_id", userId).eq("id", id).maybeSingle();
    if (!data) throw errors.notFound("Automation");
    return data as Row;
  },

  async create(key: KeyRow, input: Row) {
    const name = String(input.name ?? "").trim();
    if (!name) throw errors.validation("name is required");
    const triggerType = ["schedule", "manual", "mention", "property_change"].includes(String(input.trigger_type))
      ? String(input.trigger_type) : "manual";
    if (triggerType === "schedule" && typeof input.schedule !== "string") {
      throw errors.validation('trigger_type "schedule" requires a schedule string (e.g. "weekly mon 09:00").');
    }
    const trigger = triggerType === "schedule"
      ? { type: "schedule", config: { schedule: String(input.schedule) } }
      : { type: triggerType, config: {} };
    const ins: Row = {
      owner_id: key.user_id,
      workspace_id: resolveWs(key, input),
      name,
      description: typeof input.description === "string" ? input.description : "",
      icon: typeof input.icon === "string" ? input.icon : "⚡",
      trigger_config: trigger,
      conditions: (input.conditions ?? { op: "and", conditions: [] }) as never,
      steps: (Array.isArray(input.steps) ? input.steps : []) as never,
      permissions: (input.permissions ?? {}) as never,
      status: input.status === "paused" ? "paused" : "active",
    };
    const { data, error } = await db().from("automations").insert(ins).select("id,name,status,trigger_config").single();
    if (error) throw errors.internal(error.message);
    return verifyPersisted(key.user_id, "automations", String((data as Row).id), { name }, "owner_id")
      .then((v) => ({ automation: data, verification: v.status }));
  },

  async update(userId: string, id: string, patch: Row) {
    const { data: cur } = await db().from("automations").select("*").eq("owner_id", userId).eq("id", id).maybeSingle();
    if (!cur) throw errors.notFound("Automation");
    const allowed: Row = {};
    for (const f of ["name", "description"] as const) {
      if (typeof patch[f] === "string" && patch[f] !== undefined) allowed[f] = patch[f];
    }
    if (patch.status && ["active", "paused"].includes(String(patch.status))) allowed.status = String(patch.status);
    if (typeof patch.schedule === "string" && patch.schedule.trim()) {
      const tc = { ...(((cur as Row).trigger_config as Row) ?? {}) };
      tc.config = { ...((tc.config as Row) ?? {}), schedule: patch.schedule.trim() };
      allowed.trigger_config = tc;
    }
    if (Array.isArray(patch.steps)) allowed.steps = patch.steps;
    if (!Object.keys(allowed).length) throw errors.validation("Nothing to update.");
    const { error } = await db().from("automations").update(allowed).eq("owner_id", userId).eq("id", id);
    if (error) throw errors.internal(error.message);
    return verifyPersisted(userId, "automations", id, allowed, "owner_id");
  },

  async archive(userId: string, id: string) {
    await db().from("automations").update({ status: "paused" }).eq("owner_id", userId).eq("id", id);
    return { archived: true, id, verification: (await verifyPersisted(userId, "automations", id, { status: "paused" }, "owner_id")).status };
  },
};

/* ─── Runs (server-authoritative execution records) ─────────────────────── */

const ACTIVE_STATUSES = ["queued", "running", "waiting_approval", "waiting_retry"];

export const runs = {
  /** Trigger a real server-side run through the agent runtime. */
  async start(opts: {
    key: KeyRow;
    sourceKind: "agent" | "automation";
    sourceId: string;
    input?: Row;
    confirmationMode?: "auto" | "approval";
    idempotencyKey?: string;
  }) {
    // Ownership gate BEFORE any execution is requested.
    const table = opts.sourceKind === "automation" ? "automations" : "agents";
    const def = await loadOwnedByOwner(table, opts.key.user_id, opts.sourceId);
    void def;

    const result = await invokeRuntime({
      action: "execute",
      user_id: opts.key.user_id,
      source_kind: opts.sourceKind,
      source_id: opts.sourceId,
      trigger_type: "api",
      trigger_payload: { ...(opts.input ?? {}), confirmation_mode: opts.confirmationMode ?? "auto" },
      idempotency_key: opts.idempotencyKey,
    });
    await audit({
      userId: opts.key.user_id,
      action: `${opts.sourceKind}.run_requested`,
      resource: opts.sourceKind,
      resourceId: opts.sourceId,
      surface: opts.sourceKind === "agent" ? "agent" : "automation",
      apiKeyId: opts.key.id,
      metadata: { run: result.body.runId ?? result.body.run_id ?? null, status: result.body.status ?? null },
    });
    return result;
  },

  async get(userId: string, runId: string) {
    const { data: run } = await db().from("agent_runs").select("*").eq("user_id", userId).eq("id", runId).maybeSingle();
    if (!run) throw errors.notFound("Agent run");
    const { data: eventsList } = await db().from("agent_run_events").select("seq,type,step,duration_ms,metadata,created_at")
      .eq("run_id", runId).order("seq");
    return { run, events: eventsList ?? [] };
  },

  async cancel(userId: string, runId: string) {
    const { data: run } = await db().from("agent_runs").select("status,source_kind,source_id").eq("user_id", userId).eq("id", runId).maybeSingle();
    if (!run) throw errors.notFound("Agent run");
    const r = run as Row;
    if (!ACTIVE_STATUSES.includes(String(r.status))) {
      throw errors.conflict(`Run is ${String(r.status)}; only ${ACTIVE_STATUSES.join("/")} runs can be cancelled.`);
    }
    const patch = {
      status: "cancelled",
      completed_at: new Date().toISOString(),
      error_code: "cancelled_by_user",
      error_message: "Cancelled via API/MCP.",
    };
    await db().from("agent_runs").update(patch).eq("user_id", userId).eq("id", runId);
    const v = await verifyPersisted(userId, "agent_runs", runId, { status: "cancelled" }, "user_id");
    await emitEvent({
      userId, type: r.source_kind === "automation" ? "automation.run.cancelled" : "agent.run.cancelled",
      entity: "run", entityId: runId, actor: userId, data: { source_id: r.source_id },
    });
    return { cancelled: true, id: runId, verified: v.status === "passed" };
  },

  /** Retry a terminal run by requesting a fresh execution of its source. */
  async retry(opts: { key: KeyRow; runId: string }) {
    const { data: run } = await db().from("agent_runs").select("source_kind,source_id,trigger_payload,status")
      .eq("user_id", opts.key.user_id).eq("id", opts.runId).maybeSingle();
    if (!run) throw errors.notFound("Agent run");
    const r = run as Row;
    if (ACTIVE_STATUSES.includes(String(r.status))) {
      throw errors.conflict(`Run is still ${String(r.status)}; retry applies to finished runs.`);
    }
    return runs.start({
      key: opts.key,
      sourceKind: r.source_kind === "automation" ? "automation" : "agent",
      sourceId: String(r.source_id),
      input: { retried_run_id: opts.runId },
      idempotencyKey: undefined,
    });
  },

  async listForSource(userId: string, sourceKind: "agent" | "automation", sourceId: string, limit = 20) {
    const { data } = await db().from("agent_runs")
      .select("id,status,trigger_type,started_at,completed_at,duration_ms,error_message")
      .eq("user_id", userId).eq("source_kind", sourceKind).eq("source_id", sourceId)
      .order("started_at", { ascending: false }).limit(Math.min(limit, 100));
    return { runs: data ?? [] };
  },
};

async function loadOwnedByOwner(table: string, ownerId: string, id: string): Promise<Row> {
  const { data } = await db().from(table).select("id,name,status").eq("owner_id", ownerId).eq("id", id).maybeSingle();
  if (!data) throw errors.notFound(table === "agents" ? "Agent" : "Automation");
  return data as Row;
}
