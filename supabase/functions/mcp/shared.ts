/* Noska MCP V4 — shared infrastructure.
 * Adapter utilities over the real Noska data model. No business logic
 * duplication: every loader is owner-scoped, every mutation verifies. */
import { createClient } from "jsr:@supabase/supabase-js@2";

export const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
export const db = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

export const SITE = (Deno.env.get("SITE_URL") ?? "https://app.noska.me").replace(/\/$/, "");
export const pageUrl = (id: string) => `${SITE}/my-workspace/${id}`;

/* ─── Errors (standardised model) ─── */
export class McpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}
export const E = {
  authRequired: () => new McpError(401, "AUTH_REQUIRED", "Missing or invalid API key."),
  forbidden: (m = "Key lacks the required scope.") => new McpError(403, "FORBIDDEN", m),
  notFound: (what: string) => new McpError(404, "NOT_FOUND", `${what} was not found in your workspace.`),
  invalidId: (f: string) => new McpError(400, "INVALID_ID", `Could not resolve an entity id from ${f}.`),
  validation: (m: string) => new McpError(400, "VALIDATION_ERROR", m),
  unsupported: (m: string) => new McpError(501, "UNSUPPORTED_CAPABILITY", m),
};

/* ─── Auth ─── */
export interface KeyRow {
  id: string;
  user_id: string;
  scopes: string[];
}

async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function authenticate(req: Request): Promise<KeyRow> {
  const raw = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!raw.startsWith("nsk_")) throw E.authRequired();
  const { data } = await db.from("user_api_keys").select("*").eq("key_hash", await sha256Hex(raw)).maybeSingle();
  const k = data as (KeyRow & { revoked_at: string | null; expires_at: string | null }) | null;
  if (!k) throw new McpError(401, "AUTH_REQUIRED", "API key not recognized.");
  if (k.revoked_at) throw new McpError(401, "AUTH_REQUIRED", "This key has been revoked.");
  if (k.expires_at && new Date(k.expires_at).getTime() < Date.now()) throw new McpError(401, "AUTH_REQUIRED", "This key has expired.");
  return { id: k.id, user_id: k.user_id, scopes: Array.isArray(k.scopes) ? k.scopes : [] };
}

export function requireScope(key: KeyRow, scope: string) {
  if (!key.scopes.includes(scope)) throw E.forbidden(`Requires "${scope}".`);
  return key;
}

/* ─── Shared resolvers ─── */
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
export function extractId(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const s = input.trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return s.toLowerCase();
  return UUID_RE.exec(s)?.[0].toLowerCase() ?? null;
}
export const mustId = (input: unknown, field: string): string =>
  extractId(input) ?? (() => { throw E.invalidId(field); })();

type Row = Record<string, unknown>;

export async function loadPage(userId: string, ref: unknown): Promise<Row> {
  const id = mustId(ref, "page reference");
  const { data, error } = await db.from("pages").select("*").eq("user_id", userId).eq("id", id).maybeSingle();
  if (error || !data) throw E.notFound("Page");
  return data as Row;
}

/** Re-read after mutation and assert expected state (verification contract).
 * ownerCol: pages use "user_id"; agents/automations use "owner_id". */
export async function verify(userId: string, table: string, id: string, expect: Row, ownerCol = "user_id"): Promise<{ status: "passed" | "failed"; checks: Array<{ field: string; expected: unknown; actual: unknown; ok: boolean }>; actual?: Row }> {
  const { data } = await db.from(table).select("*").eq(ownerCol, userId).eq("id", id).maybeSingle();
  const actual = (data as Row) ?? undefined;
  const checks = Object.entries(expect).map(([field, expected]) => ({
    field,
    expected,
    actual: actual?.[field],
    ok: JSON.stringify(actual?.[field]) === JSON.stringify(expected),
  }));
  return { status: checks.every((c) => c.ok) ? "passed" : "failed", checks, actual };
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
      case "todo": case "to_do": closeCode(); out.push(`- [${b.checked ? "x" : " "}] ${text}`); break;
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
    if (!text.trim()) return;
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
    const q = /^\s*>\s?(.*)$/.exec(line);
    if (q) { push("quote", q[1].trim()); continue; }
    push("paragraph", raw);
  }
  if (codeBuf) push("code", codeBuf.join("\n"), { language: lang });
  return blocks;
}

/* ─── SM-2 initial state (mirrors src/features/spaced/scheduler.ts) ─── */
export function initialReviewState(): Row {
  const nowIso = new Date().toISOString();
  return { easeFactor: 2.5, interval: 0, repetition: 0, nextReview: nowIso, lastReview: nowIso, quality: 0 };
}
