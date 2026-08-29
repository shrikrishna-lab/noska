/* ============================================================================
 * Noska Platform V5 — Canonical capability core (pure, zero-dependency).
 *
 * Every interface layer (API v1, MCP, agent runtime, automations, plugins,
 * SDK examples) imports from here. No business logic may be duplicated in
 * an interface layer.
 *
 * This module MUST stay importable by:
 *   - Deno Edge Functions (no npm/jsr imports below)
 *   - Node/vitest (no Deno globals)
 * ========================================================================== */

export type Row = Record<string, unknown>;

/* ─── Errors (one standardized model across every surface) ─── */

export class PlatformError extends Error {
  status: number;
  code: string;
  extra: Row;
  constructor(status: number, code: string, message: string, extra: Row = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export const errors = {
  authRequired: (m = "Missing or invalid API key.") =>
    new PlatformError(401, "AUTH_REQUIRED", m),
  forbidden: (m = "Key lacks the required scope.", extra: Row = {}) =>
    new PlatformError(403, "FORBIDDEN", m, extra),
  notFound: (what: string) =>
    new PlatformError(404, "NOT_FOUND", `${what} was not found in your workspace.`),
  invalidId: (field: string) =>
    new PlatformError(400, "INVALID_ID", `Could not resolve an entity id from ${field}.`),
  validation: (m: string) => new PlatformError(400, "VALIDATION_ERROR", m),
  unsupported: (m: string) => new PlatformError(501, "UNSUPPORTED_CAPABILITY", m),
  conflict: (m: string) => new PlatformError(409, "CONFLICT", m),
  internal: (m = "Unexpected server error.") =>
    new PlatformError(500, "INTERNAL_ERROR", m),
};

/* ─── Scopes ───────────────────────────────────────────────────────────────
 * Canonical vocabulary. `reviews:*` (V1..V4 name) and `learning:*` (V5 spec
 * name) are aliases; `requireScope` treats them as equivalent so existing
 * keys keep working unchanged. */

export const CANONICAL_SCOPES = [
  "pages:read",
  "pages:write",
  "databases:read",
  "databases:write",
  "tasks:read",
  "tasks:write",
  "reviews:read",
  "reviews:write",
  "search:read",
  "workspaces:read",
  "workspaces:write",
  "templates:read",
  "templates:write",
  "dashboards:read",
  "dashboards:write",
  "agents:read",
  "agents:run",
  "automations:read",
  "automations:run",
  "webhooks:manage",
  "events:read",
  "connections:manage",
  "intelligence:execute",
] as const;

export type Scope = (typeof CANONICAL_SCOPES)[number];

const SCOPE_ALIASES: Record<string, string> = {
  "learning:read": "reviews:read",
  "learning:write": "reviews:write",
};

export function normalizeScope(scope: string): string {
  return SCOPE_ALIASES[scope] ?? scope;
}

export function keyHasScope(keyScopes: string[], required: string): boolean {
  const set = new Set(keyScopes.map(normalizeScope));
  return set.has(normalizeScope(required));
}

export function requireScopeOf(keyScopes: string[], required: string): void {
  if (!keyHasScope(keyScopes, required)) {
    throw errors.forbidden(`Requires "${required}".`, { required_scope: required });
  }
}

/* ─── ID / URL resolution ─── */

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function extractId(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const s = input.trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return s.toLowerCase();
  return UUID_RE.exec(s)?.[0].toLowerCase() ?? null;
}

export function mustId(input: unknown, field: string): string {
  const id = extractId(input);
  if (!id) throw errors.invalidId(field);
  return id;
}

export function sha256Hex(input: string): Promise<string> {
  return crypto.subtle
    .digest("SHA-256", new TextEncoder().encode(input))
    .then((d) => Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join(""));
}

/* ─── Markdown ↔ native blocks ─── */

const TODO_TYPES = new Set(["todo", "to_do"]);

export function blocksToMarkdown(blocks: Array<Row>): string {
  const out: string[] = [];
  let inCode = false;
  const closeCode = () => { if (inCode) { out.push("```"); inCode = false; } };
  for (const b of blocks) {
    const type = String(b.type ?? "");
    const text = typeof b.text === "string" ? b.text : "";
    switch (type) {
      case "heading_1": closeCode(); out.push(`# ${text}`); break;
      case "heading_2": closeCode(); out.push(`## ${text}`); break;
      case "heading_3": closeCode(); out.push(`### ${text}`); break;
      case "bulleted_list_item": closeCode(); out.push(`- ${text}`); break;
      case "numbered_list_item": closeCode(); out.push(`1. ${text}`); break;
      case "todo": case "to_do": closeCode();
        out.push(`- [${(b.checked === true) || ((b.properties as Row | undefined)?.checked === true) ? "x" : " "}] ${text}`);
        break;
      case "quote": closeCode(); out.push(`> ${text}`); break;
      case "code": if (!inCode) { out.push("```"); inCode = true; } out.push(text); break;
      case "divider": closeCode(); out.push("---"); break;
      default: {
        closeCode();
        if (type === "callout") out.push(`> 💡 ${text}`);
        else if (type.startsWith("database")) {
          const rowsN = Array.isArray((b.database as Row)?.rows) ? ((b.database as Row).rows as unknown[]).length : 0;
          out.push(`> 📊 **Database:** ${text || "Untitled"} (${rowsN} rows)`);
        } else if (text.trim()) out.push(text);
      }
    }
  }
  closeCode();
  return out.join("\n\n");
}

/** Real Noska slash-command surface → stored block types (mirrors blockFor()). */
export const COMMANDS: Array<{ name: string; blockType: string; category: string; description: string; extra?: Row }> = [
  { name: "/text", blockType: "paragraph", category: "Basic blocks", description: "Plain paragraph" },
  { name: "/h1", blockType: "heading_1", category: "Basic blocks", description: "Heading 1" },
  { name: "/h2", blockType: "heading_2", category: "Basic blocks", description: "Heading 2" },
  { name: "/h3", blockType: "heading_3", category: "Basic blocks", description: "Heading 3" },
  { name: "/bullet", blockType: "bulleted_list_item", category: "Basic blocks", description: "Bulleted list item" },
  { name: "/numbered", blockType: "numbered_list_item", category: "Basic blocks", description: "Numbered list item" },
  { name: "/todo", blockType: "to_do", category: "Basic blocks", description: "Checkbox task item", extra: { checked: false } },
  { name: "/toggle", blockType: "toggle", category: "Basic blocks", description: "Collapsible toggle block" },
  { name: "/quote", blockType: "quote", category: "Basic blocks", description: "Quote block" },
  { name: "/callout", blockType: "callout", category: "Advanced", description: "Callout with icon", extra: { icon: "💡", tone: "info" } },
  { name: "/code", blockType: "code", category: "Advanced", description: "Code block", extra: { language: "plain" } },
  { name: "/divider", blockType: "divider", category: "Advanced", description: "Horizontal divider" },
];

export function commandByName(q: string) {
  const needle = q.trim().toLowerCase().replace(/^\//, "");
  return COMMANDS.find((c) => c.name.slice(1) === needle);
}

export function markdownToBlocks(md: string): Array<Row> {
  const blocks: Array<Row> = [];
  let codeBuf: string[] | null = null;
  let lang = "plain";
  const push = (type: string, text: string, extra: Row = {}) => {
    if (!text.trim() && type !== "divider") return;
    blocks.push({ id: crypto.randomUUID(), type, text, ...extra });
  };
  for (const raw of md.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (codeBuf !== null) {
      if (/^```/.test(line.trim())) { push("code", codeBuf.join("\n"), { language: lang }); codeBuf = null; }
      else codeBuf.push(raw);
      continue;
    }
    const fence = /^\s*```(\w*)/.exec(line);
    if (fence) { codeBuf = []; lang = fence[1] || "plain"; continue; }
    if (/^---+$/.test(line.trim())) { push("divider", ""); continue; }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) { push(`heading_${h[1].length}`, h[2].trim()); continue; }
    const td = /^\s*[-*]\s+\[([ xX])\]\s+(.*)$/.exec(line);
    if (td) { push("to_do", td[2].trim(), { checked: td[1].toLowerCase() === "x" }); continue; }
    const bl = /^\s*[-*]\s+(.*)$/.exec(line);
    if (bl) { push("bulleted_list_item", bl[1].trim()); continue; }
    const nm = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (nm) { push("numbered_list_item", nm[1].trim()); continue; }
    const qt = /^\s*>\s?(.*)$/.exec(line);
    if (qt) { push("quote", qt[1].trim()); continue; }
    push("paragraph", raw);
  }
  if (codeBuf) push("code", codeBuf.join("\n"), { language: lang });
  return blocks;
}

/* ─── Tasks: rich metadata normalization (backward compatible) ──────────────
 * V5 todo blocks carry optional rich fields alongside the legacy shape.
 * Unknown/legacy blocks pass through untouched; only well-typed values are
 * promoted, so nothing in existing data can be corrupted. */

export const TASK_PRIORITIES = ["urgent", "high", "medium", "low"] as const;

export interface NormalizedTaskPatch {
  priority?: string;
  assignee?: string;
  dueAt?: string;
  labels?: string[];
  recurrence?: string;
  parent_task_id?: string;
  page_id?: string;
  completedAt?: string;
  createdBy?: string;
}

function isIsoDateString(v: unknown): v is string {
  return typeof v === "string" && v.length >= 10 && !Number.isNaN(Date.parse(v));
}

/** Returns only the recognized, well-typed rich-task fields from `input`.
 * A field explicitly set to null means "clear it"; invalid types are dropped
 * so malformed input can never corrupt existing task data. */
export function normalizeTaskMeta(input: Row): NormalizedTaskPatch {
  const patch: NormalizedTaskPatch = {};
  if ((TASK_PRIORITIES as readonly string[]).includes(String(input.priority))) {
    patch.priority = String(input.priority);
  }
  if (typeof input.assignee === "string") patch.assignee = input.assignee.slice(0, 200);
  if (isIsoDateString(input.dueAt)) patch.dueAt = input.dueAt;
  if (Array.isArray(input.labels)) patch.labels = input.labels.map(String).slice(0, 25);
  if (typeof input.recurrence === "string") patch.recurrence = input.recurrence.slice(0, 100);
  if (typeof input.parent_task_id === "string") patch.parent_task_id = input.parent_task_id;
  if (typeof input.page_id === "string") patch.page_id = input.page_id;
  if (isIsoDateString(input.completedAt)) patch.completedAt = input.completedAt;
  if (typeof input.createdBy === "string") patch.createdBy = input.createdBy;
  return patch;
}

/** Fields that mean "clear this metadata" when passed as explicit null. */
export const TASK_CLEARABLE_FIELDS = ["priority", "assignee", "dueAt", "recurrence", "parent_task_id", "completedAt"] as const;

export type TaskFieldPatch = { set: NormalizedTaskPatch; clear: Array<(typeof TASK_CLEARABLE_FIELDS)[number]> };

export function normalizeTaskFieldPatch(input: Row): TaskFieldPatch {
  const set: NormalizedTaskPatch = normalizeTaskMeta(input);
  const clear: Array<(typeof TASK_CLEARABLE_FIELDS)[number]> = [];
  for (const f of TASK_CLEARABLE_FIELDS) {
    if (input[f] === null) {
      clear.push(f);
      delete (set as Row)[f];
    }
  }
  return { set, clear };
}

/** Apply a checked transition consistently (sets/clears completedAt). */
export function taskCheckedPatch(block: Row, checked: boolean): Row {
  const next: Row = { ...block, checked };
  if (checked) next.completedAt = new Date().toISOString();
  else delete next.completedAt;
  return next;
}

/* ─── Spaced repetition (SM-2, mirrors src/features/spaced/scheduler.ts) ─── */

export interface ReviewState {
  easeFactor?: number;
  interval?: number;
  repetition?: number;
  nextReview?: string;
  lastReview?: string;
  quality?: number;
  suspended?: boolean;
}

export function initialReviewState(): Row {
  const nowIso = new Date().toISOString();
  return { easeFactor: 2.5, interval: 0, repetition: 0, nextReview: nowIso, lastReview: nowIso, quality: 0 };
}

export function scheduleSM2(prev: ReviewState | undefined, quality: number): Required<Omit<ReviewState, "suspended">> {
  let easeFactor = prev?.easeFactor ?? 2.5;
  let interval = prev?.interval ?? 0;
  let repetition = prev?.repetition ?? 0;

  if (quality >= 3) {
    if (repetition === 0) interval = 1;
    else if (repetition === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetition += 1;
  } else {
    repetition = 0;
    interval = 1;
  }
  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

  const nowIso = new Date().toISOString();
  return {
    easeFactor,
    interval,
    repetition,
    nextReview: new Date(Date.now() + interval * 86_400_000).toISOString(),
    lastReview: nowIso,
    quality,
  };
}

/* ─── Event bus vocabulary ─── */

export const EVENT_TYPES = [
  "page.created", "page.updated", "page.archived", "page.restored",
  "task.created", "task.updated", "task.completed",
  "study.card.created", "review.due",
  "agent.run.completed", "agent.run.failed", "agent.run.cancelled",
  "automation.run.completed", "automation.run.failed",
  "workspace.created", "workspace.archived", "member.added", "member.removed",
  "template.applied",
  "test.event",
] as const;

export function isValidEventType(t: string): t is (typeof EVENT_TYPES)[number] {
  return (EVENT_TYPES as readonly string[]).includes(t);
}

/* ─── Webhooks: signing + payload contract ─── */

export const WEBHOOK_SIGNATURE_HEADER = "X-Noska-Signature";
export const WEBHOOK_EVENT_ID_HEADER = "X-Noska-Event-Id";
export const WEBHOOK_TIMESTAMP_HEADER = "X-Noska-Timestamp";

export function canonicalWebhookPayload(input: {
  eventId: string;
  eventType: string;
  timestamp: string;
  workspaceId: string;
  actor: string;
  entity: string;
  entityId?: string;
  data: Row;
}): string {
  return JSON.stringify({
    event_id: input.eventId,
    event_type: input.eventType,
    timestamp: input.timestamp,
    workspace_id: input.workspaceId,
    actor: input.actor,
    entity: input.entity,
    entity_id: input.entityId ?? "",
    data: input.data,
  });
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Signature covers `${timestamp}.${body}` (replay-resistant). */
export async function signWebhook(secret: string, timestamp: string, body: string): Promise<string> {
  return `sha256=${await hmacHex(secret, `${timestamp}.${body}`)}`;
}

export async function verifyWebhookSignature(
  secret: string, timestamp: string, body: string, signature: string,
  toleranceMs = 5 * 60_000,
): Promise<{ ok: boolean; reason?: string }> {
  const age = Math.abs(Date.now() - Number(timestamp));
  if (!Number.isFinite(age)) return { ok: false, reason: "bad_timestamp" };
  if (age > toleranceMs) return { ok: false, reason: "timestamp_out_of_tolerance" };
  const expected = await signWebhook(secret, timestamp, body);
  if (!timingSafeEqual(expected, signature)) return { ok: false, reason: "signature_mismatch" };
  return { ok: true };
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function generateWebhookSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Exponential backoff for webhook retries: 1m, 5m, 30m, 2h, 6h. */
export function webhookRetryDelayMs(attempt: number): number {
  const table = [60_000, 300_000, 1_800_000, 7_200_000, 21_600_000];
  return table[Math.min(Math.max(attempt - 1, 0), table.length - 1)];
}

/* ─── Templates: instantiation planner (pure part) ─── */

export interface TemplateBody {
  pages?: Array<{
    title: string;
    icon?: string;
    cover?: string;
    tags?: string[];
    markdown?: string;
    children?: TemplateBody["pages"];
  }>;
  tasks?: Array<{ title: string; dueAt?: string; priority?: string; page_title?: string }>;
  databases?: Array<{ title: string; properties?: Row[]; rows?: Row[]; views?: Row[] }>;
  dashboards?: Array<{ name: string; icon?: string; description?: string; layout?: Row; filters?: Row }>;
  agents?: Array<{ name: string; instructions?: string; icon?: string; model?: string }>;
  studyCards?: Array<{ front: string; back?: string }>;
}

/**
 * Flattens a template body into a deterministic, dependency-ordered list of
 * creation operations. Page nesting is resolved into parent references by
 * index path ("0", "0.1"), so instantiation is a simple sequential loop.
 */
export function planTemplateInstantiation(
  body: TemplateBody,
): Array<
  | { op: "create_page"; path: string; parentPath: string | null; title: string; icon?: string; cover?: string; tags?: string[]; markdown?: string }
  | { op: "create_task"; title: string; dueAt?: string; priority?: string; pageTitle?: string }
  | { op: "create_database"; title: string; properties?: Row[]; rows?: Row[]; views?: Row[] }
  | { op: "create_dashboard"; name: string; icon?: string; description?: string; layout?: Row; filters?: Row }
  | { op: "create_agent"; name: string; instructions?: string; icon?: string; model?: string }
> {
  const plan: ReturnType<typeof planTemplateInstantiation> = [];
  const walkPages = (
    pages: NonNullable<TemplateBody["pages"]>,
    parentPath: string | null,
  ) => {
    pages.forEach((p, i) => {
      const path = parentPath === null ? String(i) : `${parentPath}.${i}`;
      plan.push({
        op: "create_page", path, parentPath, title: p.title,
        icon: p.icon, cover: p.cover, tags: p.tags, markdown: p.markdown,
      });
      if (p.children?.length) walkPages(p.children, path);
    });
  };
  walkPages(Array.isArray(body.pages) ? body.pages : [], null);

  for (const t of Array.isArray(body.tasks) ? body.tasks : []) {
    plan.push({ op: "create_task", title: t.title, dueAt: t.dueAt, priority: t.priority, pageTitle: t.page_title });
  }
  for (const d of Array.isArray(body.databases) ? body.databases : []) {
    plan.push({ op: "create_database", title: d.title, properties: d.properties, rows: d.rows, views: d.views });
  }
  for (const d of Array.isArray(body.dashboards) ? body.dashboards : []) {
    plan.push({ op: "create_dashboard", name: d.name, icon: d.icon, description: d.description, layout: d.layout, filters: d.filters });
  }
  for (const a of Array.isArray(body.agents) ? body.agents : []) {
    plan.push({ op: "create_agent", name: a.name, instructions: a.instructions, icon: a.icon, model: a.model });
  }
  return plan;
}

/* ─── Plugin manifests ─── */

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  publisher?: string;
  description?: string;
  permissions: string[];
  capabilities: string[];
  events?: string[];
  commands?: Array<{ name: string; description?: string }>;
  tools?: Array<{ name: string; description?: string }>;
  automationActions?: string[];
}

const SEMVER_RE = /^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/;
const PLUGIN_ID_RE = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
const PERMISSION_RE = /^[a-z0-9]+(?:\.[a-z0-9_-]+)+$/; // e.g. github.issues.read

export function validatePluginManifest(input: unknown): { ok: true; manifest: PluginManifest } | { ok: false; errors: string[] } {
  const errs: string[] = [];
  const m = (input ?? {}) as Row;
  const id = typeof m.id === "string" ? m.id : "";
  const name = typeof m.name === "string" ? m.name.trim() : "";
  const version = typeof m.version === "string" ? m.version : "";
  const permissions = Array.isArray(m.permissions) ? m.permissions.map(String) : [];
  const capabilities = Array.isArray(m.capabilities) ? m.capabilities.map(String) : [];

  if (!PLUGIN_ID_RE.test(id)) errs.push("id must be lowercase alphanumeric/hyphen, 3-50 chars");
  if (!name || name.length > 80) errs.push("name must be 1-80 chars");
  if (!SEMVER_RE.test(version)) errs.push("version must be semver (e.g. 1.0.0)");
  if (!permissions.length) errs.push("permissions must declare at least one permission");
  for (const p of permissions) if (!PERMISSION_RE.test(p)) errs.push(`invalid permission "${p}"`);
  if (!capabilities.length) errs.push("capabilities must declare at least one capability");
  if (errs.length) return { ok: false, errors: errs };

  return {
    ok: true,
    manifest: {
      id,
      name,
      version,
      publisher: typeof m.publisher === "string" ? m.publisher : "community",
      description: typeof m.description === "string" ? m.description : "",
      permissions,
      capabilities,
      events: Array.isArray(m.events) ? m.events.map(String) : [],
      commands: Array.isArray(m.commands) ? (m.commands as Row[]) : [],
      tools: Array.isArray(m.tools) ? (m.tools as Row[]) : [],
      automationActions: Array.isArray(m.automationActions) ? m.automationActions.map(String) : [],
    },
  };
}

/** A plugin action is allowed only when its permission was explicitly granted. */
export function pluginPermissionGranted(grantedPermissions: string[], requiredPermission: string): boolean {
  const granted = new Set(grantedPermissions);
  if (granted.has(requiredPermission)) return true;
  // Wildcard support: "github.issues.*" grants "github.issues.read"
  for (const g of granted) {
    if (g.endsWith("*") && requiredPermission.startsWith(g.slice(0, -1))) return true;
  }
  return false;
}

/* ─── OAuth helpers ─── */

/** Exact-match redirect URI validation (prevents open redirects). */
export function redirectUriAllowed(allowed: string[], requested: string): boolean {
  return allowed.includes(requested);
}

export function scopeSubset(requested: string[], granted: string[]): boolean {
  const have = new Set(granted.map(normalizeScope));
  return requested.every((r) => have.has(normalizeScope(r)));
}

export const OAUTH_CODE_TTL_MS = 10 * 60_000;
export const OAUTH_ACCESS_TTL_MS = 60 * 60_000;
export const OAUTH_REFRESH_TTL_DAYS = 30;
export const OAUTH_PKCE_METHODS = ["S256"] as const;

/** PKCE S256 verifier → challenge (base64url(SHA256(verifier))). */
export async function pkceChallengeS256(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  const bytes = new Uint8Array(digest);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/* ─── Rate limiting math (shared by API/MCP surfaces) ─── */

export function currentRateWindow(nowMs = Date.now(), windowMs = 60_000): { windowStart: Date; resetEpochSec: number } {
  const windowStart = new Date(Math.floor(nowMs / windowMs) * windowMs);
  return { windowStart, resetEpochSec: Math.ceil(windowStart.getTime() / 1000) + windowMs / 1000 };
}
