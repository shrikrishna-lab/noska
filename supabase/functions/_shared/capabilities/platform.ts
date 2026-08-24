/* ============================================================================
 * Noska Platform V5 — Platform capabilities.
 *
 * ONE canonical implementation for: workspaces, templates, dashboards,
 * webhooks, the event bus surface, connected accounts, plugins and OAuth.
 * API v1 routes and MCP tools are thin adapters over these functions —
 * neither contains business logic of its own.
 * ========================================================================== */

import {
  db, errors, pageUrl, emitEvent, audit,
  verifyPersisted,
  encryptSecret, decryptSecret,
  type KeyRow, type Row,
} from "../core/runtime.ts";
import {
  markdownToBlocks,
  planTemplateInstantiation, canonicalWebhookPayload, signWebhook,
  generateWebhookSecret, webhookRetryDelayMs,
  validatePluginManifest, pluginPermissionGranted,
  redirectUriAllowed, scopeSubset, pkceChallengeS256,
  isValidEventType, OAUTH_CODE_TTL_MS, OAUTH_ACCESS_TTL_MS,
  EVENT_TYPES,
} from "../core/pure.ts";

/* ─── Workspaces ────────────────────────────────────────────────────────── */

export async function assertWorkspaceAccess(userId: string, workspaceId: string): Promise<Row> {
  const { data } = await db().from("workspaces").select("*").eq("id", workspaceId).maybeSingle();
  const ws = data as Row | null;
  if (!ws) throw errors.notFound("Workspace");
  if (ws.owner_id !== userId) {
    const { data: member } = await db().from("workspace_members")
      .select("role").eq("workspace_id", workspaceId).eq("user_id", userId).maybeSingle();
    if (!member) throw errors.forbidden("You do not have access to this workspace.");
  }
  return ws;
}

export function resolveWorkspaceId(key: KeyRow, requested: unknown): string {
  if (typeof requested === "string" && requested.trim()) return requested.trim();
  return key.default_workspace_id ?? "";
}

export const workspaces = {
  async list(userId: string) {
    const [{ data: owned }, { data: memberships }] = await Promise.all([
      db().from("workspaces").select("*").eq("owner_id", userId).order("created_at"),
      db().from("workspace_members").select("workspace_id,role").eq("user_id", userId),
    ]);
    const memberIds = new Set((memberships ?? []).map((m) => m.workspace_id as string));
    let memberWorkspaces: Row[] = [];
    if (memberIds.size) {
      const { data } = await db().from("workspaces").select("*").in("id", [...memberIds]);
      memberWorkspaces = (data ?? []) as Row[];
    }
    return { owned: owned ?? [], shared: memberWorkspaces };
  },

  async get(userId: string, id: string) {
    const ws = await assertWorkspaceAccess(userId, id);
    const { data: members } = await db().from("workspace_members").select("user_id,role,created_at").eq("workspace_id", id);
    return { ...ws, members: members ?? [] };
  },

  async create(userId: string, input: Row) {
    const name = String(input.name ?? "").trim();
    if (!name) throw errors.validation("name is required");
    const slug = typeof input.slug === "string" && input.slug.trim()
      ? input.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 60)
      : null;
    if (slug) {
      const { data: existing } = await db().from("workspaces").select("id").eq("slug", slug).maybeSingle();
      if (existing) throw errors.conflict(`Workspace slug "${slug}" is already taken.`);
    }
    const ins: Row = {
      name,
      owner_id: userId,
      description: String(input.description ?? ""),
      icon: String(input.icon ?? "🗂️"),
      settings: (input.settings ?? {}) as Row,
      created_by: userId,
    };
    if (slug) ins.slug = slug;
    const { data, error } = await db().from("workspaces").insert(ins).select("*").single();
    if (error) throw errors.internal(error.message);
    const ws = data as Row;
    await db().from("workspace_members").insert({ workspace_id: ws.id as string, user_id: userId, role: "owner", added_by: userId });
    await emitEvent({
      userId, workspaceId: String(ws.id), type: "workspace.created",
      entity: "workspace", entityId: String(ws.id), actor: userId, data: { name },
    });
    return ws;
  },

  async update(userId: string, id: string, patch: Row) {
    await assertWorkspaceAccess(userId, id);
    const allowed: Row = {};
    for (const f of ["name", "description", "icon"] as const) {
      if (typeof patch[f] === "string") allowed[f] = patch[f];
    }
    if (patch.settings && typeof patch.settings === "object") allowed.settings = patch.settings;
    if (patch.archived === true) allowed.archived_at = new Date().toISOString();
    if (patch.archived === false) allowed.archived_at = null;
    if (!Object.keys(allowed).length) throw errors.validation("Nothing to update.");
    const { error } = await db().from("workspaces").update(allowed).eq("id", id);
    if (error) throw errors.internal(error.message);
    const v = await verifyPersisted(userId, "workspaces", id, allowed, "owner_id");
    return { updated: true, verification: v.status };
  },

  async switchDefault(key: KeyRow, workspaceId: string) {
    await assertWorkspaceAccess(key.user_id, workspaceId);
    const { error } = await db().from("user_api_keys")
      .update({ default_workspace_id: workspaceId }).eq("id", key.id);
    if (error) throw errors.internal(error.message);
    return { switched_to: workspaceId };
  },
};

/* ─── Templates ─────────────────────────────────────────────────────────── */

export function cleanTemplateBody(body: unknown): Row {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw errors.validation("body must be an object");
  return body as Row;
}

export const templates = {
  async list(userId: string, opts: { archived?: boolean } = {}) {
    let q = db().from("noska_templates").select("*").eq("user_id", userId);
    q = q.eq("archived", opts.archived ?? false);
    const { data } = await q.order("updated_at", { ascending: false });
    return { templates: data ?? [] };
  },

  async get(userId: string, id: string) {
    return loadOwnedV5("noska_templates", userId, id, "Template");
  },

  async create(userId: string, input: Row) {
    const name = String(input.name ?? "").trim();
    if (!name) throw errors.validation("name is required");
    const ins: Row = {
      user_id: userId,
      workspace_id: String(input.workspace_id ?? ""),
      name,
      description: String(input.description ?? ""),
      icon: String(input.icon ?? "📄"),
      kind: ["page", "workspace", "custom"].includes(String(input.kind)) ? String(input.kind) : "custom",
      body: cleanTemplateBody(input.body),
      tags: Array.isArray(input.tags) ? input.tags : [],
    };
    const { data, error } = await db().from("noska_templates").insert(ins).select("*").single();
    if (error) throw errors.internal(error.message);
    return data;
  },

  async update(userId: string, id: string, patch: Row) {
    const allowed: Row = {};
    for (const f of ["name", "description", "icon", "kind"] as const) {
      if (typeof patch[f] === "string") allowed[f] = patch[f];
    }
    if (patch.body !== undefined) allowed.body = cleanTemplateBody(patch.body);
    if (Array.isArray(patch.tags)) allowed.tags = patch.tags;
    if (typeof patch.archived === "boolean") allowed.archived = patch.archived;
    if (!Object.keys(allowed).length) throw errors.validation("Nothing to update.");
    const { error } = await db().from("noska_templates").update(allowed)
      .eq("user_id", userId).eq("id", id);
    if (error) throw errors.internal(error.message);
    return verifyPersisted(userId, "noska_templates", id, allowed);
  },

  /** Instantiate real persisted entities from a template body. */
  async instantiate(userId: string, id: string, options: Row = {}) {
    const tpl = await templates.get(userId, id);
    const body = (tpl.body ?? {}) as Row;
    const workspaceId = String(options.workspace_id ?? tpl.workspace_id ?? "");
    if (workspaceId) await assertWorkspaceAccess(userId, workspaceId);

    const plan = planTemplateInstantiation(body);
    const created: Row[] = [];
    const pageByPath = new Map<string, string>();
    const pageTitleToId = new Map<string, string>();
    let failed = 0;

    for (const step of plan) {
      try {
        if (step.op === "create_page") {
          const parentId = step.parentPath ? pageByPath.get(step.parentPath) ?? null : null;
          const ins: Row = {
            user_id: userId,
            title: step.title,
            blocks: typeof step.markdown === "string" ? markdownToBlocks(step.markdown) : [],
          };
          if (step.icon) ins.icon = step.icon;
          if (step.cover) ins.cover = step.cover;
          if (Array.isArray(step.tags)) ins.tags = step.tags;
          if (parentId) ins.parent_id = parentId;
          if (workspaceId) ins.workspace_id = workspaceId;
          const { data, error } = await db().from("pages").insert(ins).select("id,title").single();
          if (error) throw new Error(error.message);
          const page = data as Row;
          pageByPath.set(step.path, String(page.id));
          pageTitleToId.set(step.title, String(page.id));
          created.push({ op: step.op, title: step.title, id: page.id, url: pageUrl(String(page.id)) });
        } else if (step.op === "create_task") {
          const targetPageId = step.pageTitle ? pageTitleToId.get(step.pageTitle) : null;
          let pageId = targetPageId;
          if (!pageId) {
            // Fall back to the most recently updated non-trashed page.
            const { data: p } = await db().from("pages").select("id").eq("user_id", userId).eq("trashed", false)
              .order("updated_at", { ascending: false }).limit(1).maybeSingle();
            if (!p) throw new Error("no page available to hold tasks");
            pageId = String((p as Row).id);
          }
          const block: Row = {
            id: crypto.randomUUID(), type: "to_do", text: step.title, checked: false,
            createdAt: new Date().toISOString(),
          };
          if (step.dueAt) block.dueAt = step.dueAt;
          if (step.priority && ["urgent", "high", "medium", "low"].includes(step.priority)) block.priority = step.priority;
          const { data: page } = await db().from("pages").select("blocks").eq("user_id", userId).eq("id", pageId).maybeSingle();
          if (!page) throw new Error("task target page vanished");
          const blocks = [...(((page as Row).blocks ?? []) as Array<Row>), block];
          const { error } = await db().from("pages").update({ blocks }).eq("user_id", userId).eq("id", pageId);
          if (error) throw new Error(error.message);
          created.push({ op: step.op, title: step.title, id: block.id, page_id: pageId });
        } else if (step.op === "create_database") {
          // Databases are stored as database blocks inside a page.
          let pageId = pageTitleToId.get("__template_root__") ?? null;
          if (!pageId) {
            const firstPage = plan.find((s): s is Extract<typeof s, { op: "create_page" }> => s.op === "create_page");
            pageId = firstPage ? pageByPath.get(firstPage.path) ?? null : null;
          }
          if (!pageId) throw new Error("no page available to host database");
          const { data: page } = await db().from("pages").select("blocks").eq("user_id", userId).eq("id", pageId).maybeSingle();
          if (!page) throw new Error("database host page vanished");
          const block: Row = {
            id: crypto.randomUUID(), type: "database_table", text: step.title,
            database: { properties: step.properties ?? [], rows: step.rows ?? [], views: step.views ?? [] },
          };
          const blocks = [...(((page as Row).blocks ?? []) as Array<Row>), block];
          const { error } = await db().from("pages").update({ blocks }).eq("user_id", userId).eq("id", pageId);
          if (error) throw new Error(error.message);
          created.push({ op: step.op, title: step.title, id: block.id });
        } else if (step.op === "create_dashboard") {
          const ins: Row = {
            user_id: userId, workspace_id: workspaceId,
            name: step.name, icon: step.icon ?? "📊", description: step.description ?? "",
            layout: step.layout && typeof step.layout === "object" ? step.layout : { sections: [] },
            filters: step.filters && typeof step.filters === "object" ? step.filters : {},
          };
          const { data, error } = await db().from("noska_dashboards").insert(ins).select("id,name").single();
          if (error) throw new Error(error.message);
          created.push({ op: step.op, name: step.name, id: (data as Row).id });
        } else if (step.op === "create_agent") {
          const ins: Row = {
            id: crypto.randomUUID(), owner_id: userId, name: step.name,
            type: "custom", status: "active", instructions: step.instructions ?? null,
            icon: step.icon ?? "🤖", model: step.model ?? "default",
            workspace_id: workspaceId,
          };
          const { data, error } = await db().from("agents").insert(ins).select("id,name").single();
          if (error) throw new Error(error.message);
          created.push({ op: step.op, name: step.name, id: (data as Row).id });
        }
      } catch (err) {
        failed++;
        created.push({ op: step.op, title: (step as Row).title ?? "", error: err instanceof Error ? err.message : "failed" });
      }
    }

    await db().from("noska_templates").update({ usage_count: Number(tpl.usage_count ?? 0) + 1 })
      .eq("user_id", userId).eq("id", id);

    const verified = failed === 0;
    await emitEvent({
      userId, workspaceId, type: "template.applied", entity: "template", entityId: id,
      actor: userId, data: { steps: created.length, failed },
    });
    return {
      template: { id: tpl.id, name: tpl.name },
      instantiated: created.filter((c) => !c.error),
      failed_steps: created.filter((c) => c.error),
      verified,
    };
  },
};

async function loadOwnedV5(table: string, userId: string, id: string, label: string): Promise<Row> {
  const { data, error } = await db().from(table).select("*").eq("user_id", userId).eq("id", id).maybeSingle();
  if (error || !data) throw errors.notFound(label);
  return data as Row;
}

/* ─── Dashboards ────────────────────────────────────────────────────────── */

export const dashboards = {
  async list(userId: string, opts: { archived?: boolean } = {}) {
    const { data } = await db().from("noska_dashboards").select("*").eq("user_id", userId)
      .eq("archived", opts.archived ?? false).order("updated_at", { ascending: false });
    return { dashboards: data ?? [] };
  },

  async get(userId: string, id: string) {
    return loadOwnedV5("noska_dashboards", userId, id, "Dashboard");
  },

  async create(userId: string, input: Row) {
    const name = String(input.name ?? "").trim();
    if (!name) throw errors.validation("name is required");
    const layout = input.layout && typeof input.layout === "object" ? input.layout : { sections: [] };
    const ins: Row = {
      user_id: userId,
      workspace_id: String(input.workspace_id ?? ""),
      name,
      description: String(input.description ?? ""),
      icon: String(input.icon ?? "📊"),
      layout,
      filters: (input.filters ?? {}) as Row,
    };
    const { data, error } = await db().from("noska_dashboards").insert(ins).select("*").single();
    if (error) throw errors.internal(error.message);
    return data;
  },

  async update(userId: string, id: string, patch: Row) {
    const allowed: Row = {};
    for (const f of ["name", "description", "icon"] as const) {
      if (typeof patch[f] === "string") allowed[f] = patch[f];
    }
    if (patch.layout && typeof patch.layout === "object") allowed.layout = patch.layout;
    if (patch.filters && typeof patch.filters === "object") allowed.filters = patch.filters;
    if (typeof patch.archived === "boolean") allowed.archived = patch.archived;
    if (!Object.keys(allowed).length) throw errors.validation("Nothing to update.");
    const { error } = await db().from("noska_dashboards").update(allowed)
      .eq("user_id", userId).eq("id", id);
    if (error) throw errors.internal(error.message);
    return verifyPersisted(userId, "noska_dashboards", id, allowed);
  },
};

/* ─── Event bus (read surface) ──────────────────────────────────────────── */

export const events = {
  async list(userId: string, opts: { type?: string; limit?: number; since?: string } = {}) {
    if (opts.type && !isValidEventType(opts.type)) {
      throw errors.validation(`Unknown event type "${opts.type}". Valid: ${EVENT_TYPES.join(", ")}`);
    }
    let q = db().from("noska_events").select("*").eq("user_id", userId);
    if (opts.type) q = q.eq("type", opts.type);
    if (opts.since) q = q.gte("created_at", opts.since);
    const { data } = await q.order("created_at", { ascending: false }).limit(Math.min(opts.limit ?? 50, 200));
    return { events: data ?? [], types: EVENT_TYPES };
  },
};

/* ─── Webhooks ──────────────────────────────────────────────────────────── */

function assertHttpsUrl(raw: string): string {
  let url: URL;
  try { url = new URL(raw); } catch { throw errors.validation("url must be a valid absolute URL"); }
  if (url.protocol !== "https:") throw errors.validation("webhook url must use https");
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname.endsWith(".local")) {
    throw errors.validation("webhook url must not target localhost");
  }
  return url.toString();
}

export const webhooks = {
  async list(userId: string) {
    const { data } = await db().from("noska_webhook_endpoints").select("*")
      .eq("user_id", userId).order("created_at", { ascending: false });
    return { endpoints: (data ?? []).map(({ secret_encrypted: _s, ...rest }: Row) => rest) };
  },

  /** Returns the signing secret EXACTLY once — it is never retrievable again. */
  async create(userId: string, input: Row) {
    const url = assertHttpsUrl(String(input.url ?? ""));
    const subscribed = Array.isArray(input.events) ? input.events.map(String) : [];
    if (!subscribed.length) throw errors.validation("events must list at least one event type");
    for (const t of subscribed) {
      if (!isValidEventType(t)) throw errors.validation(`Unknown event type "${t}".`);
    }
    const rawSecret = generateWebhookSecret();
    const ins: Row = {
      user_id: userId,
      workspace_id: String(input.workspace_id ?? ""),
      url,
      description: String(input.description ?? ""),
      events: subscribed,
      secret_encrypted: await encryptSecret(rawSecret),
      secret_hint: `whsec_…${rawSecret.slice(-4)}`,
      status: "active",
    };
    const { data, error } = await db().from("noska_webhook_endpoints").insert(ins).select("*").single();
    if (error) throw errors.internal(error.message);
    const row = data as Row;
    delete (row as Row).secret_encrypted;
    await audit({ userId, action: "webhook.created", resource: "webhook", resourceId: String(row.id), surface: "webhook" });
    return { endpoint: row, signing_secret: `whsec_${rawSecret}` };
  },

  async update(userId: string, id: string, patch: Row) {
    const allowed: Row = {};
    if (typeof patch.url === "string") allowed.url = assertHttpsUrl(patch.url);
    if (typeof patch.description === "string") allowed.description = patch.description;
    if (Array.isArray(patch.events)) {
      for (const t of patch.events.map(String)) {
        if (!isValidEventType(t)) throw errors.validation(`Unknown event type "${t}".`);
      }
      allowed.events = patch.events;
    }
    if (patch.status && ["active", "disabled", "revoked"].includes(String(patch.status))) {
      allowed.status = String(patch.status);
    }
    if (!Object.keys(allowed).length) throw errors.validation("Nothing to update.");
    allowed.updated_at = new Date().toISOString();
    const { error } = await db().from("noska_webhook_endpoints").update(allowed)
      .eq("user_id", userId).eq("id", id);
    if (error) throw errors.internal(error.message);
    return verifyPersisted(userId, "noska_webhook_endpoints", id, allowed);
  },

  /** New signing secret, shown once. */
  async rotateSecret(userId: string, id: string) {
    await loadOwnedV5("noska_webhook_endpoints", userId, id, "Webhook endpoint");
    const rawSecret = generateWebhookSecret();
    const { error } = await db().from("noska_webhook_endpoints").update({
      secret_encrypted: await encryptSecret(rawSecret),
      secret_hint: `whsec_…${rawSecret.slice(-4)}`,
      failure_count: 0,
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId).eq("id", id);
    if (error) throw errors.internal(error.message);
    return { rotated: true, signing_secret: `whsec_${rawSecret}` };
  },

  /** Immediately POST a signed test event and record the delivery outcome. */
  async test(userId: string, id: string) {
    const endpoint = await loadOwnedV5("noska_webhook_endpoints", userId, id, "Webhook endpoint");
    const rawSecret = await decryptSecret(String(endpoint.secret_encrypted));
    const eventId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const body = canonicalWebhookPayload({
      eventId,
      eventType: "test.event",
      timestamp,
      workspaceId: String(endpoint.workspace_id ?? ""),
      actor: userId,
      entity: "webhook",
      entityId: id,
      data: { message: "Noska webhook test delivery" },
    });
    const signature = await signWebhook(rawSecret, timestamp, body);
    const started = Date.now();
    let responseStatus: number | null = null;
    let errText: string | null = null;
    try {
      const res = await fetch(String(endpoint.url), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Noska-Event-Id": eventId,
          "X-Noska-Event-Type": "test.event",
          "X-Noska-Timestamp": timestamp,
          "X-Noska-Signature": signature,
          "X-Noska-Delivery": "test",
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      responseStatus = res.status;
      if (!res.ok) errText = `endpoint responded ${res.status}`;
    } catch (e) {
      errText = e instanceof Error ? e.message : "delivery failed";
    }
    const ok = responseStatus !== null && responseStatus >= 200 && responseStatus < 300;
    await db().from("noska_webhook_deliveries").insert({
      endpoint_id: id, event_id: eventId, event_type: "test.event",
      payload: JSON.parse(body) as never,
      attempt: 1, max_attempts: 1,
      status: ok ? "delivered" : "failed",
      response_status: responseStatus, error: errText,
      delivered_at: ok ? new Date().toISOString() : null,
    });
    await audit({ userId, action: "webhook.tested", resource: "webhook", resourceId: id, surface: "webhook" });
    return {
      tested: true, delivered: ok, event_id: eventId,
      response_status: responseStatus, error: errText, duration_ms: Date.now() - started,
    };
  },

  async delete(userId: string, id: string) {
    await loadOwnedV5("noska_webhook_endpoints", userId, id, "Webhook endpoint");
    const { error } = await db().from("noska_webhook_endpoints").delete()
      .eq("user_id", userId).eq("id", id);
    if (error) throw errors.internal(error.message);
    await audit({ userId, action: "webhook.deleted", resource: "webhook", resourceId: id, surface: "webhook" });
    return { deleted: true, id };
  },

  async deliveries(userId: string, opts: { endpointId?: string; limit?: number } = {}) {
    let q = db().from("noska_webhook_deliveries").select("*")
      .in("endpoint_id",
        (await db().from("noska_webhook_endpoints").select("id").eq("user_id", userId)).data?.map((r) => r.id as string) ?? ["00000000-0000-0000-0000-000000000000"])
      .order("created_at", { ascending: false });
    if (opts.endpointId) q = q.eq("endpoint_id", opts.endpointId);
    const { data } = await q.limit(Math.min(opts.limit ?? 50, 200));
    return { deliveries: data ?? [] };
  },
};

export { webhookRetryDelayMs };

/* ─── Connected accounts ────────────────────────────────────────────────── */

export const connections = {
  async list(userId: string) {
    const { data } = await db().from("connected_accounts").select(
      "id,provider,account_label,scopes,status,token_hint,connected_at,last_used_at,revoked_at",
    ).eq("user_id", userId).order("connected_at", { ascending: false });
    return { connections: data ?? [] };
  },

  async revoke(userId: string, id: string) {
    const acc = await loadOwnedV5("connected_accounts", userId, id, "Connected account");
    void acc;
    const patch = { status: "revoked", revoked_at: new Date().toISOString(), encrypted_token: null, token_hint: null };
    const { error } = await db().from("connected_accounts").update(patch)
      .eq("user_id", userId).eq("id", id);
    if (error) throw errors.internal(error.message);
    return { revoked: true, id, verification: (await verifyPersisted(userId, "connected_accounts", id, { status: "revoked" })).status };
  },

  async remove(userId: string, id: string) {
    const acc = await loadOwnedV5("connected_accounts", userId, id, "Connected account");
    void acc;
    const { error } = await db().from("connected_accounts").delete().eq("user_id", userId).eq("id", id);
    if (error) throw errors.internal(error.message);
    return { removed: true, id };
  },
};

/* ─── Plugins ───────────────────────────────────────────────────────────── */

export const plugins = {
  async listRegistry(userId: string) {
    void userId; // registry is global; installs are per-user below
    const { data } = await db().from("plugin_manifests").select("*").eq("status", "verified");
    return { plugins: data ?? [] };
  },

  async registerManifest(manifestInput: unknown, publisher: string) {
    const res = validatePluginManifest(manifestInput);
    if (!res.ok) throw errors.validation(`Invalid manifest: ${res.errors.join("; ")}`);
    const m = res.manifest;
    const ins = {
      id: m.id, publisher, name: m.name, version: m.version, description: m.description ?? "",
      manifest: m as never, permissions: m.permissions as never, capabilities: m.capabilities as never,
      status: "pending",
    };
    const { data, error } = await db().from("plugin_manifests").upsert(ins, { onConflict: "id" }).select("*").single();
    if (error) throw errors.internal(error.message);
    return data;
  },

  async install(userId: string, pluginId: string, grantedPermissions?: string[]) {
    const { data: manifest } = await db().from("plugin_manifests").select("*").eq("id", pluginId).maybeSingle();
    if (!manifest) throw errors.notFound("Plugin");
    if ((manifest as Row).status !== "verified") {
      throw errors.forbidden(`Plugin "${pluginId}" is not verified for installation.`);
    }
    const declared = ((manifest as Row).permissions ?? []) as string[];
    const grants = grantedPermissions && grantedPermissions.length
      ? grantedPermissions.filter((g) => declared.includes(g))
      : declared; // default: grant exactly what was declared, nothing more
    if (grants.length === 0) throw errors.validation("No valid permissions were granted.");
    const { data, error } = await db().from("plugin_installations")
      .upsert({
        user_id: userId, plugin_id: pluginId, state: "installed",
        granted_permissions: grants as never,
      }, { onConflict: "user_id,plugin_id" })
      .select("*").single();
    if (error) throw errors.internal(error.message);
    await audit({ userId, action: "plugin.installed", resource: "plugin", resourceId: pluginId, surface: "plugin", metadata: { grants } });
    return data;
  },

  async setState(userId: string, installationId: string, state: "enabled" | "disabled" | "revoked") {
    const patch: Row = { state, updated_at: new Date().toISOString() };
    if (state === "revoked") patch.granted_permissions = [];
    const { error } = await db().from("plugin_installations").update(patch)
      .eq("user_id", userId).eq("id", installationId);
    if (error) throw errors.internal(error.message);
    await audit({ userId, action: `plugin.${state}`, resource: "installation", resourceId: installationId, surface: "plugin" });
    return { state, verification: (await verifyPersisted(userId, "plugin_installations", installationId, patch)).status };
  },

  async listInstallations(userId: string) {
    const { data } = await db().from("plugin_installations").select("*")
      .eq("user_id", userId).order("installed_at", { ascending: false });
    return { installations: data ?? [] };
  },

  /** Permission gate every plugin execution MUST pass through. */
  assertPluginPermission(installation: Row, requiredPermission: string): void {
    if (installation.state !== "enabled") {
      throw errors.forbidden(`Plugin installation is ${String(installation.state)}; enable it first.`);
    }
    const granted = ((installation.granted_permissions ?? []) as string[]);
    if (!pluginPermissionGranted(granted, requiredPermission)) {
      throw errors.forbidden(`Permission "${requiredPermission}" was not granted to this plugin.`, {
        required_permission: requiredPermission,
      });
    }
  },

  beginRun: async (userId: string, pluginId: string, installationId: string | null, trigger: string, tool: string, requestId?: string) => {
    const { data, error } = await db().from("plugin_runs").insert({
      user_id: userId, plugin_id: pluginId, installation_id: installationId,
      trigger, tool, status: "running", request_id: requestId ?? null,
    }).select("id").single();
    if (error) throw errors.internal(error.message);
    return (data as Row).id as string;
  },

  finishRun: async (userId: string, runId: string, status: "completed" | "failed" | "denied", detail: Row = {}) => {
    await db().from("plugin_runs").update({
      status, detail: detail as never, finished_at: new Date().toISOString(),
    }).eq("user_id", userId).eq("id", runId).then(undefined, () => {});
  },
};

/* ─── OAuth application framework ───────────────────────────────────────── */

function randomToken(bytes = 32): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, "0")).join("");
}

export const oauth = {
  async createApp(userId: string, input: Row) {
    const name = String(input.name ?? "").trim();
    if (!name) throw errors.validation("name is required");
    const uris = Array.isArray(input.redirect_uris) ? input.redirect_uris.map(String) : [];
    if (!uris.length) throw errors.validation("redirect_uris must list at least one https URI");
    for (const u of uris) assertHttpsUrl(u);
    const scopes = Array.isArray(input.scopes) ? input.scopes.map(String) : ["pages:read"];
    const clientSecret = `noska_os_${randomToken(24)}`;
    const ins: Row = {
      user_id: userId,
      name,
      client_id: `noska_c_${randomToken(12)}`,
      client_secret_hash: await sha256Hex(clientSecret),
      client_secret_hint: `…${clientSecret.slice(-4)}`,
      redirect_uris: uris as never,
      scopes: scopes as never,
      homepage_url: typeof input.homepage_url === "string" ? input.homepage_url : "",
      logo_url: typeof input.logo_url === "string" ? input.logo_url : "",
    };
    const { data, error } = await db().from("oauth_apps").insert(ins).select("*").single();
    if (error) throw errors.internal(error.message);
    const app = data as Row;
    delete app.client_secret_hash;
    await audit({ userId, action: "oauth.app_created", resource: "oauth_app", resourceId: String(app.id), surface: "oauth" });
    return { app, client_secret: clientSecret };
  },

  async listApps(userId: string) {
    const { data } = await db().from("oauth_apps").select(
      "id,name,client_id,client_secret_hint,redirect_uris,scopes,homepage_url,status,created_at,revoked_at",
    ).eq("user_id", userId).order("created_at", { ascending: false });
    return { apps: data ?? [] };
  },

  async revokeApp(userId: string, id: string) {
    const patch = { status: "disabled", revoked_at: new Date().toISOString() };
    const { error } = await db().from("oauth_apps").update(patch).eq("user_id", userId).eq("id", id);
    if (error) throw errors.internal(error.message);
    await db().from("oauth_tokens").update({ revoked_at: new Date().toISOString() }).eq("app_id", id);
    return { revoked: true };
  },

  /**
   * Authorization-code flow step 1 (called by the consent UI after login).
   * Validates redirect URI exactly against the allowlist and scopes against
   * the app registration; returns a one-time code bound to app+user+redirect.
   */
  async buildAuthorization(appLookup: Row, userId: string, redirectUri: string, scopes: string[], codeChallenge?: string, codeChallengeMethod?: string) {
    if ((appLookup.status ?? "active") !== "active") throw errors.forbidden("This OAuth app is disabled.");
    if (!redirectUriAllowed(((appLookup.redirect_uris ?? []) as string[]), redirectUri)) {
      throw errors.forbidden("redirect_uri is not in the app's allowlist.", { code: "INVALID_REDIRECT_URI" });
    }
    const registered = ((appLookup.scopes ?? []) as string[]);
    if (!scopeSubset(scopes, registered)) {
      throw errors.forbidden("Requested scopes exceed the app registration.", { code: "INVALID_SCOPE" });
    }
    if (codeChallenge && !(["S256"] as readonly string[]).includes(String(codeChallengeMethod))) {
      throw errors.validation("code_challenge_method must be S256");
    }
    const code = randomToken(32);
    await db().from("oauth_authorization_codes").insert({
      code_hash: await sha256Hex(code),
      app_id: String(appLookup.id),
      user_id: userId,
      redirect_uri: redirectUri,
      scopes: scopes as never,
      code_challenge: codeChallenge ?? null,
      code_challenge_method: codeChallengeMethod ?? null,
      expires_at: new Date(Date.now() + OAUTH_CODE_TTL_MS).toISOString(),
    });
    return { code, expires_in: OAUTH_CODE_TTL_MS / 1000 };
  },

  /** Authorization-code flow step 2: exchange code (+ optional PKCE) for tokens. */
  async exchangeCode(input: { clientId: string; code: string; redirectUri: string; clientSecret?: string; codeVerifier?: string }) {
    const { data: app } = await db().from("oauth_apps").select("*").eq("client_id", input.clientId).maybeSingle();
    if (!app) throw errors.authRequired("Unknown client_id.");
    const appRow = app as Row;
    if (input.clientSecret) {
      const hash = await sha256Hex(input.clientSecret);
      if (hash !== appRow.client_secret_hash) throw errors.authRequired("Invalid client credentials.");
    }
    const codeHash = await sha256Hex(input.code);
    const { data: codeRow } = await db().from("oauth_authorization_codes").select("*").eq("code_hash", codeHash).maybeSingle();
    if (!codeRow) throw errors.authRequired("Invalid authorization code.");
    const c = codeRow as Row;
    if (c.used_at) throw errors.authRequired("Authorization code already used (replay rejected).");
    if (new Date(String(c.expires_at)).getTime() < Date.now()) throw errors.authRequired("Authorization code expired.");
    if (c.redirect_uri !== input.redirectUri) throw errors.forbidden("redirect_uri mismatch.");

    if (c.code_challenge) {
      if (!input.codeVerifier) throw errors.validation("PKCE code_verifier is required.");
      const challenge = await pkceChallengeS256(input.codeVerifier);
      if (challenge !== c.code_challenge) throw errors.authRequired("PKCE verification failed.");
    }

    await db().from("oauth_authorization_codes").update({ used_at: new Date().toISOString() }).eq("code_hash", codeHash);

    const accessToken = `noska_at_${randomToken(24)}`;
    const refreshToken = `noska_rt_${randomToken(24)}`;
    await db().from("oauth_tokens").insert({
      app_id: String(c.app_id),
      user_id: String(c.user_id),
      access_token_hash: await sha256Hex(accessToken),
      refresh_token_hash: await sha256Hex(refreshToken),
      scopes: c.scopes as never,
      expires_at: new Date(Date.now() + OAUTH_ACCESS_TTL_MS).toISOString(),
    });
    await audit({ userId: String(c.user_id), action: "oauth.token_issued", resource: "oauth_app", resourceId: String(c.app_id), surface: "oauth" });
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_in: OAUTH_ACCESS_TTL_MS / 1000,
      scope: ((c.scopes ?? []) as string[]).join(" "),
    };
  },

  /** Resolve an OAuth bearer token (noska_at_…) to a scoped principal. */
  async authenticateOAuthToken(req: Request): Promise<KeyRow & { via: "oauth" }> {
    const raw = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!raw.startsWith("noska_at_")) throw errors.authRequired();
    const { data } = await db().from("oauth_tokens").select("*").eq("access_token_hash", await sha256Hex(raw)).maybeSingle();
    const t = data as Row | null;
    if (!t || t.revoked_at) throw errors.authRequired("OAuth token not recognized.");
    if (new Date(String(t.expires_at)).getTime() < Date.now()) throw errors.authRequired("OAuth token expired.");
    db().from("oauth_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", t.id as string).then(undefined, () => {});
    return {
      id: `oauth:${t.app_id}`, user_id: String(t.user_id),
      scopes: ((t.scopes ?? []) as string[]), default_workspace_id: "", via: "oauth",
    };
  },

  async refresh(refreshToken: string) {
    const { data } = await db().from("oauth_tokens").select("*").eq("refresh_token_hash", await sha256Hex(refreshToken)).maybeSingle();
    const t = data as Row | null;
    if (!t || t.revoked_at) throw errors.authRequired("Refresh token not recognized.");
    const accessToken = `noska_at_${randomToken(24)}`;
    const newRefresh = `noska_rt_${randomToken(24)}`;
    await db().from("oauth_tokens").update({
      access_token_hash: await sha256Hex(accessToken),
      refresh_token_hash: await sha256Hex(newRefresh),
      expires_at: new Date(Date.now() + OAUTH_ACCESS_TTL_MS).toISOString(),
    }).eq("id", t.id as string);
    return {
      access_token: accessToken, refresh_token: newRefresh, token_type: "Bearer",
      expires_in: OAUTH_ACCESS_TTL_MS / 1000,
    };
  },

  async revokeTokens(userId: string, appId: string) {
    await db().from("oauth_tokens").update({ revoked_at: new Date().toISOString() })
      .eq("user_id", userId).eq("app_id", appId);
    return { revoked: true };
  },
};
