// ============================================================================
// Noska Agent OS — Server-Side Agent Runtime (Edge Function)
//
// The production execution engine. Invoked by:
//   • Trigger.dev jobs (scheduler + event dispatcher)  → auth: X-Agent-Runtime-Secret
//   • The Noska app (approve / save execution key)     → auth: Clerk-supabase JWT
//
// Executes agents/automations with real LLM calls using an opt-in encrypted
// BYOK key, writes durable runs + events to agent_runs/agent_run_events,
// retrieves/writes scoped memories, enforces timeouts/retries/idempotency,
// and pauses for approval WITHOUT any browser being open.
//
// Deploy: supabase functions deploy agent-runtime
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";

const db = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const RUNTIME_SECRET = Deno.env.get("AGENT_RUNTIME_SECRET") ?? "";
const ENCRYPTION_SECRET = Deno.env.get("AGENT_ENCRYPTION_KEY") ?? "";

import {
  RESOURCE_LIMITS, redact, extractKeywords, scoreMemory, detectConflict,
  isRetryableError, backoffDelayMs,
} from "../../src/ai/runtime/serverContract.ts";
import type { RunEventType } from "../../src/ai/runtime/serverContract.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

/* ─── Auth ─────────────────────────────────────────────────────────────── */

async function requireWorkerSecret(req: Request): Promise<void> {
  if (!RUNTIME_SECRET || req.headers.get("x-agent-runtime-secret") !== RUNTIME_SECRET) {
    throw new HttpError(401, "worker_auth_failed", "Invalid runtime secret");
  }
}

async function requireUserJwt(req: Request): Promise<string> {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer /, "").trim();
  if (!token) throw new HttpError(401, "no_token", "Missing Authorization bearer token");
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user?.id) throw new HttpError(401, "invalid_token", "Invalid or expired session");
  return data.user.id;
}

class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

/* ─── Key encryption (AES-GCM, key derived from AGENT_ENCRYPTION_KEY) ──── */

async function deriveKey(): Promise<CryptoKey> {
  if (!ENCRYPTION_SECRET) throw new HttpError(500, "server_config", "AGENT_ENCRYPTION_KEY not configured");
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ENCRYPTION_SECRET));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptKey(plaintext: string): Promise<string> {
  const key = await deriveKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  const bytes = new Uint8Array(iv.length + ct.byteLength);
  bytes.set(iv); bytes.set(new Uint8Array(ct), iv.length);
  return btoa(String.fromCharCode(...bytes));
}

async function decryptKey(blob: string): Promise<string> {
  const key = await deriveKey();
  const bytes = Uint8Array.from(atob(blob), (c) => c.charCodeAt(0));
  const iv = bytes.slice(0, 12);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, bytes.slice(12));
  return new TextDecoder().decode(pt);
}

/* ─── Event writer ─────────────────────────────────────────────────────── */

let eventSeq = 0;
async function emitEvent(runId: string, userId: string, type: RunEventType, meta: Record<string, unknown> = {}, step?: string, durationMs?: number): Promise<void> {
  await db.from("agent_run_events").insert({
    run_id: runId, user_id: userId, seq: ++eventSeq,
    type, step: step ?? null, duration_ms: durationMs ?? null,
    metadata: redact(meta) as never,
  }).then(({ error }) => { if (error) console.error("[agent-runtime] event insert failed:", error.message); });
}

/* ─── Model call ───────────────────────────────────────────────────────── */

interface ModelConfig { provider: string; apiKey: string; modelClass: string }

async function callModel(cfg: ModelConfig, system: string, userPrompt: string, timeoutMs: number): Promise<{ text: string; model: string }> {
  // Real model catalogs per provider (verified against live APIs).
  const modelsByClass: Record<string, Record<string, string>> = {
    openrouter: { fast: "google/gemini-2.5-flash-preview", default: "anthropic/claude-sonnet-4-20250514", reasoning: "deepseek/deepseek-r1" },
    groq: { fast: "openai/gpt-oss-20b", default: "openai/gpt-oss-120b", reasoning: "openai/gpt-oss-120b" },
  };
  const providerBase: Record<string, string> = {
    openrouter: "https://openrouter.ai/api/v1",
    groq: "https://api.groq.com/openai/v1",
  };
  // Custom OpenAI-compatible endpoints (user-supplied base URL + model)
  const isCustom = cfg.provider === "custom";
  const base = isCustom ? String((execSettings?.custom_base_url as string) || "") : (providerBase[cfg.provider] ?? providerBase.openrouter);
  const model = isCustom
    ? String(execSettings?.custom_model || "")
    : (modelsByClass[cfg.provider]?.[cfg.modelClass] ?? modelsByClass[cfg.provider]?.default ?? modelsByClass.openrouter.default);
  if (!base || !model) throw new HttpError(400, "custom_provider_incomplete", "Custom endpoint needs a base URL and model ID in Settings");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), Math.min(timeoutMs, RESOURCE_LIMITS.modelTimeoutMs));
  const attempt = async (): Promise<{ text: string; model: string }> => {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({
        model, max_tokens: 3000, temperature: 0.4,
        messages: [{ role: "system", content: system }, { role: "user", content: userPrompt }],
      }),
    });
    if (!res.ok) {
      const bodyText = await res.text();
      throw new Error(`model_http_${res.status}: ${bodyText.slice(0, 300)}`);
    }
    const data = await res.json();
    return { text: data.choices?.[0]?.message?.content ?? "", model };
  };
  try {
    try {
      return await attempt();
    } catch (err) {
      // Free-tier TPM windows (e.g. Groq) reset each minute — one patient retry.
      if (/429|rate limit|tokens per minute/i.test(String((err as Error).message)) && !ctrl.signal.aborted) {
        await new Promise(r => setTimeout(r, 15000));
        if (ctrl.signal.aborted || Date.now() > (execCtx?.deadline ?? Infinity)) throw err;
        return await attempt();
      }
      throw err;
    }
  } finally {
    clearTimeout(timer);
  }
}
    const data = await res.json();
    return { text: data.choices?.[0]?.message?.content ?? "", model };
  } finally {
    clearTimeout(timer);
  }
}

/* ─── Tool protocol (server-side mirror of the browser tool contract) ──── */

const TOOL_RE = /<<TOOL:(\w+)>>([\s\S]*?)<</TOOL>>/g;
const MEMORY_RE = /<<MEMORY>>([\s\S]*?)<</MEMORY>>/g;

interface ToolOutcome { name: string; ok: boolean; summary: string; mutatedPageId?: string }

async function executeServerTool(
  name: string, params: Record<string, unknown>, ctx: ExecContext,
  dryRun: boolean,
): Promise<ToolOutcome> {
  const pages = db.from("pages");
  switch (name) {
    case "search_pages":
    case "list_pages": {
      let q = pages.select("id,title,icon,tags,trashed").eq("user_id", ctx.userId).eq("trashed", false).limit(30);
      const query = String(params.query || "").toLowerCase();
      if (query) q = q.ilike("title", `%${query}%`);
      const { data } = await q;
      return { name, ok: true, summary: `${(data ?? []).length} page(s): ${(data ?? []).map((p: { title: string }) => p.title).slice(0, 10).join(", ")}` };
    }
    case "get_page_content": {
      const page = await loadPage(params);
      if (!page) return { name, ok: false, summary: `page not found` };
      const text = ((page.blocks as Array<{ text?: string }>) ?? []).map((b) => b.text || "").filter(Boolean).join("\n").slice(0, 6000);
      return { name, ok: true, summary: `Content of "${page.title}":\n${text}` };
    }
    case "create_page": {
      if (dryRun) return { name, ok: true, summary: `[dry-run] would create page "${params.title}"` };
      const id = crypto.randomUUID();
      const blocks = markdownToBlocks(String(params.content || ""));
      const { error } = await pages.insert({
        id, user_id: ctx.userId, title: String(params.title || "Untitled").slice(0, 200),
        icon: String(params.icon || "📝"), parent_id: null, favorite: false, trashed: false,
        tags: parseTags(params.tags), blocks: blocks as never, lineage: [{ action: "ai-created", timestamp: new Date().toISOString(), detail: `Created by agent ${ctx.sourceName}` }] as never,
      });
      if (error) return { name, ok: false, summary: `create failed: ${error.message}` };
      ctx.mutated.add(id);
      return { name, ok: true, summary: `created page "${params.title}"`, mutatedPageId: id };
    }
    case "append_blocks": {
      const page = await loadPage(params);
      if (!page) return { name, ok: false, summary: "target page not found" };
      const newBlocks = markdownToBlocks(String(params.content || params.text || ""));
      if (newBlocks.length === 0) return { name, ok: false, summary: "no content to append" };
      if (dryRun) return { name, ok: true, summary: `[dry-run] would append ${newBlocks.length} block(s) to "${page.title}"` };
      const merged = [...((page.blocks as unknown[]) ?? []), ...newBlocks];
      const { error } = await pages.eq("id", page.id).eq("user_id", ctx.userId).update({ blocks: merged as never });
      if (error) return { name, ok: false, summary: `append failed: ${error.message}` };
      ctx.mutated.add(page.id);
      return { name, ok: true, summary: `appended ${newBlocks.length} block(s) to "${page.title}"`, mutatedPageId: page.id };
    }
    case "add_todo": {
      return executeServerTool("append_blocks", { ...params, content: `- [ ] ${String(params.text || "")}` }, ctx, dryRun);
    }
    case "rename_page": {
      const target = params.page_id ? await loadPage(params) : ctx.currentPage;
      if (!target) return { name, ok: false, summary: "target page not found" };
      if (dryRun) return { name, ok: true, summary: `[dry-run] would rename to "${params.title}"` };
      const { error } = await db.from("pages").eq("id", target.id).eq("user_id", ctx.userId).update({ title: String(params.title || "").slice(0, 200) });
      if (error) return { name, ok: false, summary: `rename failed: ${error.message}` };
      return { name, ok: true, summary: `renamed to "${params.title}"`, mutatedPageId: target.id };
    }
    case "set_page_tags": {
      const target = params.page_id ? await loadPage(params) : ctx.currentPage;
      if (!target) return { name, ok: false, summary: "target page not found" };
      if (dryRun) return { name, ok: true, summary: `[dry-run] would set tags` };
      const tags = Array.isArray(target.tags) ? [...(target.tags as unknown[]), ...parseTags(params.tags)] : parseTags(params.tags);
      const { error } = await db.from("pages").eq("id", target.id).eq("user_id", ctx.userId).update({ tags: tags as never });
      if (error) return { name, ok: false, summary: `tags failed: ${error.message}` };
      return { name, ok: true, summary: `tags updated on "${target.title}"` };
    }
    case "trash_page": {
      const page = await loadPage(params);
      if (!page) return { name, ok: false, summary: "page not found" };
      if (dryRun) return { name, ok: true, summary: `[dry-run] would trash "${page.title}"` };
      const { error } = await db.from("pages").eq("id", page.id).eq("user_id", ctx.userId).update({ trashed: true });
      if (error) return { name, ok: false, summary: `trash failed: ${error.message}` };
      return { name, ok: true, summary: `trashed "${page.title}"` };
    }
    case "send_notification": {
      if (dryRun) return { name, ok: true, summary: `[dry-run] would notify: ${params.title}` };
      const { error } = await db.from("notifications").insert({
        user_id: ctx.userId, type: "ai_agent",
        title: String(params.title || "Agent update").slice(0, 120),
        message: String(params.message || "").slice(0, 500),
        category: "agent", source: "noska-agent-os", status: "unread",
        action_url: params.action_url ? String(params.action_url).slice(0, 300) : null,
      });
      if (error) return { name, ok: false, summary: `notification failed: ${error.message}` };
      return { name, ok: true, summary: `notification sent: ${params.title}` };
    }
    case "remember": {
      // Explicit memory write from the model via tool form.
      return { name, ok: true, summary: JSON.stringify(params).slice(0, 200), }; // handled by memory pipeline after parse
    }
    default:
      return { name, ok: false, summary: `tool "${name}" is not available in background runs` };
  }
}

type PageRow = { id: string; title: string; icon: string | null; tags: unknown; blocks: unknown };

async function loadPage(params: Record<string, unknown>): Promise<PageRow | null> {
  const pid = String(params.page_id ?? "");
  if (!pid || pid === "current") return null;
  const { data } = await db.from("pages").select("id,title,icon,tags,blocks").eq("user_id", execCtx!.userId).or(`id.eq.${pid},title.ilike.${pid}`).limit(1).maybeSingle();
  return (data as unknown as PageRow) ?? null;
}

function parseTags(v: unknown): string[] {
  return typeof v === "string" ? v.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 12) : [];
}

function markdownToBlocks(md: string): Array<Record<string, unknown>> {
  const blocks: Array<Record<string, unknown>> = [];
  for (const raw of (md || "").split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    if (line === "---") { blocks.push({ id: crypto.randomUUID(), type: "divider", text: "" }); continue; }
    if (line.startsWith("### ")) blocks.push({ id: crypto.randomUUID(), type: "h3", text: line.slice(4) });
    else if (line.startsWith("## ")) blocks.push({ id: crypto.randomUUID(), type: "h2", text: line.slice(3) });
    else if (line.startsWith("# ")) blocks.push({ id: crypto.randomUUID(), type: "h1", text: line.slice(2) });
    else if (/^- \[ \] /.test(line)) blocks.push({ id: crypto.randomUUID(), type: "todo", text: line.slice(6), properties: { checked: false } });
    else if (/^- \[x\] /i.test(line)) blocks.push({ id: crypto.randomUUID(), type: "todo", text: line.slice(6), properties: { checked: true } });
    else if (line.startsWith("- ")) blocks.push({ id: crypto.randomUUID(), type: "bullet", text: line.slice(2) });
    else if (/^\d+\. /.test(line)) blocks.push({ id: crypto.randomUUID(), type: "number", text: line.replace(/^\d+\. /, "") });
    else if (line.startsWith("> ")) blocks.push({ id: crypto.randomUUID(), type: "quote", text: line.slice(2) });
    else blocks.push({ id: crypto.randomUUID(), type: "text", text: line });
  }
  return blocks.slice(0, 120);
}

/* ─── Execution context & pipeline ─────────────────────────────────────── */

interface ExecContext {
  userId: string;
  sourceKind: "agent" | "automation";
  sourceId: string;
  sourceName: string;
  instructions: string;
  triggerType: string;
  triggerPayload: Record<string, unknown>;
  permissions: Record<string, string>;
  dryRun: boolean;
  timeoutMs: number;
  deadline: number;
  currentPage: PageRow | null;
  mutated: Set<string>;
  counts: { modelCalls: number; toolCalls: number; delegations: number; memoryWrites: number };
}

let execCtx: ExecContext | null = null;
/** Per-run copy of the user's execution settings (provider routing). */
let execSettings: Record<string, unknown> | null = null;

const SYSTEM_PROMPT = `You are a Noska workspace worker executing autonomously on a server. You are NOT a chatbot.

RULES:
1. Truth comes ONLY from the Workspace Context section — never invent pages, tasks, or data.
2. Act, don't describe: emit tool blocks to do work.
3. Tool format: <<TOOL:name>>{"param":"value"}<</TOOL>>
   Available: search_pages{query}, list_pages{}, get_page_content{page_id}, create_page{title,icon?,content,tags?}, append_blocks{content,page_id?}, add_todo{text,page_id?}, rename_page{title}, set_page_tags{tags,page_id?}, trash_page{page_id}, create_flashcards{page_id,cards:"JSON array [{front,answer}]"}, send_notification{title,message}
4. To persist something worth remembering long-term, ALSO emit: <<MEMORY>>{"scope":"agent|workspace|page","content":"...","summary":"...","importance":1-4,"confidence":0-1}<</MEMORY>> (max 2 per run; only durable facts/preferences/decisions — never chatter).
5. After tools complete you'll be re-invoked with results — then write a short completion summary with NO tool blocks.
6. Never expose secrets. Never claim success without tool evidence.`;

async function retrieveMemories(ctx: ExecContext, taskKeywords: string[], runId: string): Promise<Array<Record<string, unknown>>> {
  const allowedScopes = ctx.sourceKind === "agent" ? ["agent", "workspace", "page"] : ["workspace"];
  const query = db.from("agent_memories")
    .select("id,content,summary,keywords,importance,confidence,access_count,updated_at,scope")
    .eq("user_id", ctx.userId)
    .in("scope", allowedScopes)
    .eq("status", "active")
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("importance", { ascending: false })
    .limit(60);
  if (ctx.sourceKind === "agent") query.or(`agent_id.is.null,agent_id.eq.${ctx.sourceId}`);
  const { data } = await query;
  const now = new Date();
  const scored = (data ?? [])
    .map((m) => ({ row: m, score: scoreMemory({
      keywords: (m.keywords as string[]) || [], importance: m.importance, confidence: Number(m.confidence),
      updatedAt: new Date(m.updated_at), accessCount: m.access_count ?? 0,
    }, taskKeywords, now) }))
    .sort((a, b) => b.score - a.score)
    .filter((s) => s.score > 0.5)
    .slice(0, RESOURCE_LIMITS.maxMemoriesRetrieved);

  if (scored.length > 0) {
    await db.from("agent_memories").update({ last_accessed_at: now.toISOString() }).in("id", scored.map((s) => s.row.id));
  }
  return scored.map((s) => ({ id: s.row.id, scope: s.row.scope, summary: s.row.summary || String(s.row.content).slice(0, 140), importance: s.row.importance }));
}

async function persistMemoryCandidates(
  userId: string, candidates: Array<Record<string, unknown>>, runId: string, agentId: string | null, pageId: string | null,
): Promise<number> {
  let saved = 0;
  for (const cand of candidates.slice(0, RESOURCE_LIMITS.maxMemoryWritesPerRun)) {
    const content = String(cand.content || "").trim().slice(0, 2000);
    if (content.length < 8) continue;
    const requestedScope = ["run", "agent", "page", "workspace"].includes(String(cand.scope)) ? String(cand.scope) : "agent";
    // Scope enforcement: agents may never self-escalate beyond their own scope.
    const scope = requestedScope === "workspace" && agentId ? "agent" : requestedScope;
    const keywords = extractKeywords(content);
    const { data: existingArr } = await db.from("agent_memories")
      .select("id,content,keywords").eq("user_id", userId).eq("status", "active")
      .eq(scope === "page" ? "page_id" : "user_id", scope === "page" ? (pageId ?? "") : userId)
      .limit(50);
    const conflict = detectConflict({ content, keywords }, (existingArr ?? []).map((e) => ({ id: e.id, content: e.content, keywords: (e.keywords as string[]) || [] })));
    if (conflict.conflict && conflict.relation === "contradicts" && conflict.existingId) {
      const newId = crypto.randomUUID();
      await db.from("agent_memories").update({ superseded_by: newId, status: "stale" }).eq("id", conflict.existingId!);
      await db.from("agent_memories").insert({
        id: newId, user_id: userId, agent_id: scope === "agent" ? agentId : null, page_id: scope === "page" ? pageId : null,
        scope, content, summary: String(cand.summary || content.slice(0, 140)), importance: clampImportance(cand.importance),
        confidence: clampConfidence(cand.confidence), keywords: keywords as never, status: "active", created_by_run_id: runId,
      });
      await emitEvent(userId, "", "MEMORY_CONFLICT", { superseded: conflict.existingId, relation: "contradicts" });
    } else {
      await db.from("agent_memories").insert({
        id: crypto.randomUUID(), user_id: userId, agent_id: scope === "agent" ? agentId : null, page_id: scope === "page" ? pageId : null,
        scope, content, summary: String(cand.summary || content.slice(0, 140)), importance: clampImportance(cand.importance),
        confidence: clampConfidence(cand.confidence), keywords: keywords as never, status: "active", created_by_run_id: runId,
      });
    }
    saved++;
    if (saved >= RESOURCE_LIMITS.maxMemoryWritesPerRun) break;
  }
  return saved;
}

function clampImportance(v: unknown): number {
  const n = Number(v); if (!Number.isFinite(n)) return 2;
  return Math.min(4, Math.max(1, Math.round(n)));
}
function clampConfidence(v: unknown): number {
  const n = Number(v); if (!Number.isFinite(n)) return 0.8;
  return Math.min(1, Math.max(0, n));
}

/* ─── Main executor ────────────────────────────────────────────────────── */

async function executeRun(opts: {
  userId: string; sourceKind: "agent" | "automation"; sourceId: string;
  triggerType: string; triggerPayload: Record<string, unknown>;
  idempotencyKey?: string; scheduledFor?: string | null; dryRun?: boolean;
  resumeRunId?: string; approvalGrantedFor?: string[];
}): Promise<Response> {
  const startedAt = Date.now();

  // Idempotency: duplicate invocations collapse here.
  if (opts.resumeRunId) {
    const { data: existing } = await db.from("agent_runs").select("*").eq("id", opts.resumeRunId).eq("user_id", opts.userId).maybeSingle();
    if (!existing) throw new HttpError(404, "run_not_found", "Run not found");
    if (existing.status === "completed") return json({ resumed: false, runId: existing.id, status: existing.status });
  } else if (opts.idempotencyKey) {
    const { data: dup } = await db.from("agent_runs").select("id,status").eq("idempotency_key", opts.idempotencyKey).maybeSingle();
    if (dup) return json({ deduplicated: true, runId: dup.id, status: dup.status });
  }

  // Load definition + settings.
  const table = opts.sourceKind === "automation" ? "automations" : "agents";
  const idCol = "id";
  const { data: def, error: defErr } = await db.from(table).select("*").eq(idCol, opts.sourceId).eq("owner_id", opts.userId).maybeSingle();
  if (defErr || !def) throw new HttpError(404, "definition_not_found", `${opts.sourceKind} not found`);
  const config = ((def as Record<string, unknown>).config as Record<string, unknown>) ?? {};
  const instructions = String((def as Record<string, unknown>).instructions || "");
  const name = String((def as Record<string, unknown>).name || opts.sourceKind);
  const timeoutMs = Number((def as Record<string, unknown>).timeout_ms) || RESOURCE_LIMITS.defaultTimeoutMs;

  const { data: settings } = await db.from("agent_execution_settings").select("*").eq("user_id", opts.userId).maybeSingle();
  execSettings = (settings as unknown as Record<string, unknown>) ?? null;
  const allowBackground = Boolean(settings?.allow_background);
  // Per-agent memory controls (off | run | persistent) — enforced server-side.
  const memoryMode = String((config as Record<string, unknown>).memoryMode ?? "persistent");
  let modelCfg: ModelConfig | null = null;
  if (allowBackground && settings?.encrypted_key) {
    try {
      modelCfg = { provider: settings.provider || "openrouter", apiKey: await decryptKey(settings.encrypted_key), modelClass: settings.model_class || "default" };
    } catch {
      throw new HttpError(400, "key_decrypt_failed", "Stored execution key could not be decrypted — re-save it in Settings");
    }
  }
  if (!modelCfg) {
    return finishSkipped(opts.userId, opts.sourceKind, opts.sourceId, name, "Background execution is not enabled or no execution key is saved.", opts.idempotencyKey, opts.scheduledFor);
  }

  // Create or load run row.
  const runId = opts.resumeRunId ?? crypto.randomUUID();
  if (!opts.resumeRunId) {
    await db.from("agent_runs").insert({
      id: runId, user_id: opts.userId, source_kind: opts.sourceKind, source_id: opts.sourceId,
      name, trigger_type: opts.triggerType, trigger_payload: redact(opts.triggerPayload) as never,
      status: "running", started_at: new Date().toISOString(),
      idempotency_key: opts.idempotencyKey ?? null, scheduled_for: opts.scheduledFor ?? null,
      timeout_ms: timeoutMs,
    });
    await emitEvent(runId, opts.userId, "TRIGGER_RECEIVED", { trigger: opts.triggerType });
    await emitEvent(runId, opts.userId, "RUN_STARTED", { attemptNote: "server execution" });
  } else {
    await db.from("agent_runs").update({ status: "running", pending_approval: null }).eq("id", runId);
    await emitEvent(runId, opts.userId, "APPROVAL_RESOLVED", { granted: opts.approvalGrantedFor?.length ?? 0 });
  }

  // Context: current page + recent pages (owner-scoped service reads).
  const contextStart = Date.now();
  const evt = opts.triggerPayload as { pageId?: string };
  let currentPage: PageRow | null = null;
  if (evt?.pageId) {
    const { data } = await db.from("pages").select("id,title,icon,tags,blocks").eq("id", String(evt.pageId)).eq("user_id", opts.userId).maybeSingle();
    currentPage = (data as unknown as PageRow) ?? null;
  }
  const { data: recentPages } = await db.from("pages").select("id,title,icon,trashed,blocks")
    .eq("user_id", opts.userId).eq("trashed", false).order("updated_at", { ascending: false }).limit(15);
  const contextPages = (recentPages ?? []) as Array<Record<string, unknown>>;
  await emitEvent(runId, opts.userId, "CONTEXT_LOADED", { pagesLoaded: contextPages.length, hasCurrentPage: !!currentPage }, undefined, Date.now() - contextStart);

  // Memory retrieval (skipped entirely when the agent's memory mode is off;
  // candidates are still discarded for mode "run" at write time below).
  const taskKeywords = extractKeywords(`${instructions} ${JSON.stringify(redact(opts.triggerPayload))}`);
  const memStart = Date.now();
  const memories = memoryMode === "off" ? [] : await retrieveMemories(execCtx, taskKeywords, runId);
  await emitEvent(runId, opts.userId, memories.length > 0 ? "MEMORY_FOUND" : "MEMORY_SEARCH",
    { count: memories.length, summaries: memories.map((m) => m.summary).slice(0, 5) }, undefined, Date.now() - memStart);

  // Build context.
  void execCtx;
  const ctx: ExecContext = {
    userId: opts.userId, sourceKind: opts.sourceKind, sourceId: opts.sourceId, sourceName: name,
    instructions, triggerType: opts.triggerType, triggerPayload: opts.triggerPayload,
    permissions: {}, dryRun: Boolean(opts.dryRun), timeoutMs, deadline: startedAt + timeoutMs,
    currentPage, mutated: new Set(), counts: { modelCalls: 0, toolCalls: 0, delegations: 0, memoryWrites: 0 },
  };
  execCtx = ctx;

  const contextString = [
    currentPage ? `## Current Page: ${currentPage.icon ?? ""} ${currentPage.title}\n${blocksToText(currentPage.blocks).slice(0, 4000)}` : "",
    `## Recent Pages\n${contextPages.map((p) => `- ${(p.icon as string) ?? "📄"} ${(p.title as string) ?? ""}`).join("\n")}`,
    memories.length > 0 ? `## Relevant Memories\n${memories.map((m) => `- (${m.scope}) ${m.summary}`).join("\n")}` : "",
    `## Trigger\n${opts.triggerType}${evt?.pageTitle ? ` on "${evt.pageTitle}"` : ""}`,
  ].filter(Boolean).join("\n\n");

  const fullSystem = SYSTEM_PROMPT + `\n\nYou are running as "${name}".` +
    (instructions ? `\n\nYour standing instructions:\n${instructions}` : "") +
    (opts.dryRun ? "\n\nDRY RUN MODE: mutating actions will be simulated and reported." : "");

  // Execution loop (bounded rounds; tool outcomes feed the next round).
  let finalText = "";
  let timedOut = false;
  let userPrompt = `Workspace Context:\n${contextString}\n\nTask:\n${instructions || name}`;
  const maxRounds = 6;
  for (let round = 0; round < maxRounds; round++) {
    if (Date.now() > ctx.deadline) { timedOut = true; break; }
    const roundStart = Date.now();
    await emitEvent(runId, opts.userId, "MODEL_REQUEST", { round }, undefined, undefined);
    let result: { text: string; model: string };
    try {
      result = await callModel(modelCfg!, fullSystem, userPrompt, Math.min(ctx.deadline - Date.now(), RESOURCE_LIMITS.modelTimeoutMs));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("abort") || Date.now() > ctx.deadline) { timedOut = true; break; }
      throw new Error(msg);
    }
    ctx.counts.modelCalls++;
    await emitEvent(runId, opts.userId, "MODEL_RESPONSE", { round, model: result.model, chars: result.text.length }, undefined, Date.now() - roundStart);
    const stripped = result.text.replace(TOOL_RE, "").replace(MEMORY_RE, "").trim();
    if (stripped) finalText = stripped;

    // Memory candidates — persisted only in "persistent" mode.
    const memCandidates = [...result.text.matchAll(MEMORY_RE)].map((m) => { try { return JSON.parse(m[1]); } catch { return null; } }).filter(Boolean) as Array<Record<string, unknown>>;
    if (memCandidates.length > 0 && !ctx.dryRun && memoryMode === "persistent") {
      ctx.counts.memoryWrites += await persistMemoryCandidates(opts.userId, memCandidates, runId, opts.sourceKind === "agent" ? opts.sourceId : null, evt?.pageId ?? null);
      await emitEvent(runId, opts.userId, "MEMORY_SAVED", { count: memCandidates.length });
    } else if (memCandidates.length > 0 && memoryMode !== "persistent") {
      await emitEvent(runId, opts.userId, "MEMORY_WRITE_CANDIDATE", { discarded: memCandidates.length, reason: `memory mode: ${memoryMode}` });
    }

    const calls = [...result.text.matchAll(TOOL_RE)].map((m) => { try { return { name: m[1], params: JSON.parse(m[2]) }; } catch { return null; } }).filter(Boolean) as Array<{ name: string; params: Record<string, unknown> }>;
    if (calls.length === 0) break;

    const outcomes: string[] = [];
    for (const call of calls) {
      if (Date.now() > ctx.deadline) { timedOut = true; break; }
      if (ctx.counts.toolCalls >= RESOURCE_LIMITS.maxToolCallsPerRun) {
        outcomes.push(`Tool ${call.name} skipped: per-run tool limit reached`);
        continue;
      }
      ctx.counts.toolCalls++;
      const permCategory = categorize(call.name);
      const mode = permMode(permCategory);
      if (mode === "disabled") { outcomes.push(`Tool ${call.name} refused: permission disabled`); continue; }
      if (mode === "approval" && !(opts.approvalGrantedFor ?? []).includes(call.name)) {
        // Pause: persist remaining work and wait — no browser required.
        await db.from("agent_runs").update({
          status: "waiting_approval",
          pending_approval: { toolName: call.name, params: call.params, category: permCategory } as never,
          plan_snapshot: { contextString } as never,
          vars: { finalText, nextRound: round + 1 } as never,
          next_step_index: round, updated_at: new Date().toISOString(),
        }).eq("id", runId);
        await emitEvent(runId, opts.userId, "APPROVAL_REQUESTED", { tool: call.name, reason: `${permCategory} actions need approval` });
        await notifyUser(opts.userId, "Approval required", `${name} needs approval to use ${call.name}. Open Noska → Runs to decide.`, "/commandCenter");
        return json({ pausedForApproval: true, runId });
      }
      const t0 = Date.now();
      await emitEvent(runId, opts.userId, "TOOL_REQUESTED", { tool: call.name }, call.name);
      const outcome = await executeServerTool(call.name, call.params, ctx, ctx.dryRun);
      await emitEvent(runId, opts.userId, outcome.ok ? (ctx.dryRun ? "TOOL_DRY_RUN" : "TOOL_COMPLETED") : "TOOL_FAILED",
        { tool: call.name, summary: outcome.summary }, call.name, Date.now() - t0);
      outcomes.push(`Tool ${call.name} ${outcome.ok ? "succeeded" : "failed"}. ${outcome.summary}`);
    }
    if (timedOut || outcomes.length === 0) break;
    userPrompt = `Tool execution results:\n${outcomes.join("\n")}\n\nContinue the task based on these results. If the work is complete, write a short completion summary with NO tool blocks.`;
  }

  // Completion bookkeeping.
  const completedAt = new Date();
  const status: string = timedOut ? "timed_out" : "completed";
  const errorMessage = timedOut ? "Execution exceeded its time budget and was stopped." : null;
  await db.from("agent_runs").update({
    status, completed_at: completedAt.toISOString(), duration_ms: completedAt.getTime() - startedAt,
    final_output: finalText.slice(0, 4000) || null, error_message: errorMessage, error_code: timedOut ? "timeout" : null,
    counts: ctx.counts as never, failure_streak: 0, updated_at: completedAt.toISOString(),
  }).eq("id", runId);
  await emitEvent(runId, opts.userId, timedOut ? "RUN_TIMED_OUT" : "RUN_COMPLETED", { counts: ctx.counts });

  if (opts.sourceKind === "automation" && !opts.resumeRunId) {
    const { data: autoRow } = await db.from("automations").select("run_count").eq("id", opts.sourceId).maybeSingle();
    await db.from("automations").update({
      last_run_at: completedAt.toISOString(), last_status: status, health: "healthy", failure_streak: 0,
      run_count: (autoRow?.run_count ?? 0) + 1,
    }).eq("id", opts.sourceId);
  }
  if (status === "timed_out") await notifyUser(opts.userId, "Agent timed out", `${name} exceeded its time budget.`, "/commandCenter");

  return json({ runId, status, output: finalText.slice(0, 1000), counts: ctx.counts });
}

function blocksToText(blocks: unknown): string {
  return (((blocks as Array<{ text?: string; type?: string }>) ?? []))
    .map((b) => {
      if (!b?.text) return "";
      const prefix = b.type === "h1" ? "# " : b.type === "h2" ? "## " : b.type === "bullet" ? "- " : b.type === "todo" ? "- [ ] " : "";
      return prefix + b.text;
    })
    .filter(Boolean).join("\n");
}

function categorize(tool: string): string {
  if (["search_pages", "list_pages", "get_page_content"].includes(tool)) return "read";
  if (["create_page"].includes(tool)) return "create";
  if (["append_blocks", "add_todo", "rename_page", "set_page_tags"].includes(tool)) return "update";
  if (tool === "trash_page") return "delete";
  if (tool === "send_notification") return "external";
  return "update";
}

function permMode(category: string): string {
  // Background defaults mirror FULL_AUTO_PERMISSIONS minus interactivity:
  // deletes and external effects always require approval server-side too.
  const map: Record<string, string> = { read: "auto", create: "auto", update: "auto", delete: "approval", external: "approval" };
  return map[category] ?? "approval";
}

async function finishSkipped(userId: string, kind: string, sourceId: string, name: string, reason: string, idemKey?: string | null, scheduledFor?: string | null): Promise<Response> {
  const runId = crypto.randomUUID();
  await db.from("agent_runs").insert({
    id: runId, user_id: userId, source_kind: kind === "automation" ? "automation" : "agent", source_id: sourceId,
    name, trigger_type: "schedule", status: "skipped", started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(), duration_ms: 0, error_code: "not_configured",
    error_message: reason, idempotency_key: idemKey ?? null, scheduled_for: scheduledFor ?? null,
  });
  return json({ runId, status: "skipped", reason });
}

async function notifyUser(userId: string, title: string, message: string, actionUrl?: string): Promise<void> {
  await db.from("notifications").insert({
    user_id: userId, type: "ai_agent", title: title.slice(0, 120), message: message.slice(0, 500),
    category: "agent", source: "noska-agent-os", status: "unread", action_url: actionUrl ?? null,
  });
}

/* ─── Approval resolution (user-JWT authenticated) ─────────────────────── */

async function resolveApproval(userId: string, runId: string, approved: boolean): Promise<Response> {
  const { data: run } = await db.from("agent_runs").select("*").eq("id", runId).eq("user_id", userId).maybeSingle();
  if (!run) throw new HttpError(404, "run_not_found", "Run not found");
  if (run.status !== "waiting_approval") throw new HttpError(409, "not_awaiting", `Run is ${run.status}`);

  if (!approved) {
    await db.from("agent_runs").update({
      status: "cancelled", completed_at: new Date().toISOString(),
      error_code: "rejected_by_user", error_message: "Cancelled: user declined the approval request.",
    }).eq("id", runId);
    await emitEvent(runId, userId, "APPROVAL_RESOLVED", { approved: false });
    await emitEvent(runId, userId, "RUN_CANCELLED", {});
    return json({ runId, status: "cancelled" });
  }

  await db.from("agent_runs").update({ status: "queued" }).eq("id", runId);
  await emitEvent(runId, userId, "TOOL_APPROVED", { tool: (run.pending_approval as { toolName?: string })?.toolName });
  // Re-enqueue execution with the SAME run id (resume path) via internal call.
  const snapshot = (run.plan_snapshot as { contextString?: string }) ?? {};
  void snapshot;
  const payload = run.trigger_payload as Record<string, unknown>;
  const result = await executeRun({
    userId, sourceKind: run.source_kind as "agent" | "automation", sourceId: run.source_id,
    triggerType: run.trigger_type, triggerPayload: payload ?? {},
    resumeRunId: runId, approvalGrantedFor: [(run.pending_approval as { toolName?: string })?.toolName ?? ""],
  });
  // If it pauses again for ANOTHER action, that's fine — loop continues on next approve.
  return result;
}

/* ─── Settings: opt-in encrypted key storage (user JWT) ────────────────── */

async function saveSettings(userId: string, body: Record<string, unknown>): Promise<Response> {
  const allowBackground = Boolean(body.allow_background);
  const update: Record<string, unknown> = {
    user_id: userId,
    allow_background: allowBackground,
    provider: ["openrouter", "groq", "custom"].includes(String(body.provider)) ? String(body.provider) : "groq",
    custom_base_url: body.custom_base_url ? String(body.custom_base_url).slice(0, 300) : null,
    custom_model: body.custom_model ? String(body.custom_model).slice(0, 200) : null,
    model_class: ["fast", "default", "reasoning"].includes(String(body.model_class)) ? String(body.model_class) : "default",
    timezone: String(body.timezone || "UTC").slice(0, 64),
    updated_at: new Date().toISOString(),
  };
  if (typeof body.api_key === "string" && body.api_key.length > 8) {
    update.encrypted_key = await encryptKey(body.api_key);
    update.key_hint = `…${body.api_key.slice(-4)}`;
  }
  const { error } = await db.from("agent_execution_settings").upsert(update, { onConflict: "user_id" });
  if (error) throw new HttpError(500, "save_failed", error.message);
  return json({ saved: true, keyHint: update.key_hint ?? null });
}

/* ─── Retry bookkeeping helper exported for the scheduler job ──────────── */

export function shouldScheduleRetry(errorMessage: string, attempt: number, maxRetries: number): { retry: boolean; delayMs: number } {
  if (attempt > maxRetries) return { retry: false, delayMs: 0 };
  if (!isRetryableError(errorMessage)) return { retry: false, delayMs: 0 };
  return { retry: true, delayMs: backoffDelayMs(attempt - 1) };
}

/* ─── Router ───────────────────────────────────────────────────────────── */

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "execute");

    // User-session actions (from the app):
    if (action === "status") {
      const userId = await requireUserJwt(req);
      const { data: settings } = await db.from("agent_execution_settings").select("allow_background,encrypted_key,provider,model_class,key_hint,timezone,custom_base_url,custom_model").eq("user_id", userId).maybeSingle();
      return json({
        edgeFunction: true,
        encryptionConfigured: Boolean(ENCRYPTION_SECRET),
        backgroundEnabled: Boolean(settings?.allow_background),
        keySaved: Boolean(settings?.encrypted_key),
        keyHint: settings?.key_hint ?? null,
        provider: settings?.provider ?? null,
        modelClass: settings?.model_class ?? null,
        timezone: settings?.timezone ?? "UTC",
        // Overall: only operational when everything needed is present.
        ready: Boolean(ENCRYPTION_SECRET) && Boolean(settings?.allow_background && settings?.encrypted_key),
      });
    }
    if (action === "save_settings") {
      const userId = await requireUserJwt(req);
      return await saveSettings(userId, body);
    }
    if (action === "resolve_approval") {
      const userId = await requireUserJwt(req);
      return await resolveApproval(userId, String(body.run_id), Boolean(body.approved));
    }
    if (action === "run_now") {
      // Manual server-side run triggered from the UI (uses stored key).
      const userId = await requireUserJwt(req);
      return await executeRun({
        userId, sourceKind: body.source_kind === "automation" ? "automation" : "agent",
        sourceId: String(body.source_id), triggerType: "manual", triggerPayload: {},
        idempotencyKey: body.idempotency_key ? String(body.idempotency_key) : undefined,
        dryRun: Boolean(body.dry_run),
      });
    }

    // Worker actions (Trigger.dev jobs):
    await requireWorkerSecret(req);
    if (action === "execute") {
      return await executeRun({
        userId: String(body.user_id), sourceKind: body.source_kind === "automation" ? "automation" : "agent",
        sourceId: String(body.source_id), triggerType: String(body.trigger_type || "schedule"),
        triggerPayload: (body.trigger_payload ?? {}) as Record<string, unknown>,
        idempotencyKey: body.idempotency_key ? String(body.idempotency_key) : undefined,
        scheduledFor: body.scheduled_for ?? null,
      });
    }
    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.code, message: err.message }, err.status);
    console.error("[agent-runtime] unhandled:", err);
    return json({ error: "internal", message: "Unexpected server error" }, 500);
  }
});
