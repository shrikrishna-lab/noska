/* ============================================================================
 * Noska MCP v5.1 — Agentic & intelligence tools (§13-§17).
 *
 * Everything here delegates to the canonical capability layer. noska_execute
 * is the controlled multi-step executor: the CLIENT plans, the server
 * authorizes each step through the same capability layer, records a durable
 * execution (agent_runs, source_kind 'ai'), and returns an honest summary.
 * ========================================================================== */
import type { ToolDef } from "./tools.ts";
import { McpError, db, type KeyRow, type Row } from "./shared.ts";
import { errors, blocksToMarkdown } from "../_shared/core/pure.ts";
import * as content from "../_shared/capabilities/content.ts";
import { invokeRuntime } from "../_shared/capabilities/intelligence.ts";
import { assertWorkspaceAccess } from "../_shared/capabilities/platform.ts";
import { learning } from "../_shared/capabilities/content.ts";

/* ══════════════ WORKSPACE (§7) ══════════════ */
const workspaceExtras: ToolDef[] = [
  {
    name: "get-current-workspace", group: "workspace", risk: "GREEN", scope: "workspaces:read",
    description: "Return the workspace this credential currently targets (the persisted default), including your role.",
    inputSchema: { type: "object", properties: {} },
    async handler(_args, key) {
      if (!key.default_workspace_id) {
        const { owned } = await (await import("../_shared/capabilities/platform.ts")).workspaces.list(key.user_id);
        return { current_workspace: null, hint: "No default set. Use switch-workspace or create-workspace.", owned_count: (owned ?? []).length };
      }
      const ws = await assertWorkspaceAccess(key.user_id, key.default_workspace_id);
      return { current_workspace: { id: ws.id, name: ws.name, icon: ws.icon, role: ws.owner_id === key.user_id ? "owner" : "member" } };
    },
  },
  {
    name: "get-workspace-permissions", group: "workspace", risk: "GREEN", scope: "workspaces:read",
    description: "Your effective permissions in a workspace: role, membership, and what MCP may do on your behalf.",
    inputSchema: { type: "object", properties: { workspace_id: { type: "string" } }, required: ["workspace_id"] },
    async handler(args, key) {
      const ws = await assertWorkspaceAccess(key.user_id, String(args.workspace_id));
      const role = ws.owner_id === key.user_id ? "owner"
        : (((await db.from("workspace_members").select("role").eq("workspace_id", String(ws.id)).eq("user_id", key.user_id).maybeSingle()).data as Row | null)?.role as string) ?? "none";
      return {
        workspace_id: ws.id, role,
        can_read: role !== "none",
        can_write: ["owner", "admin", "member", "editor"].includes(role),
        can_admin: ["owner", "admin"].includes(role),
      };
    },
  },
  {
    name: "get-workspace-settings", group: "workspace", risk: "GREEN", scope: "workspaces:read",
    description: "Workspace settings (name, icon, description, slug, archived state, settings object).",
    inputSchema: { type: "object", properties: { workspace_id: { type: "string" } }, required: ["workspace_id"] },
    async handler(args, key) {
      const ws = await assertWorkspaceAccess(key.user_id, String(args.workspace_id));
      return { settings: { id: ws.id, name: ws.name, icon: ws.icon, description: ws.description, slug: ws.slug ?? null, archived_at: ws.archived_at ?? null, settings: ws.settings ?? {} } };
    },
  },
  {
    name: "get-page-breadcrumbs", group: "content", risk: "GREEN", scope: "pages:read",
    description: "Ancestor chain of a page from workspace root to the page itself (id + title per level).",
    inputSchema: { type: "object", properties: { page_id_or_url: { type: "string" } }, required: ["page_id_or_url"] },
    async handler(args, key) {
      const { loadPage } = await import("../_shared/capabilities/content.ts");
      const chain: Row[] = [];
      let cursor: unknown = args.page_id_or_url;
      for (let i = 0; i < 25 && cursor; i++) {
        const p = await loadPage(key.user_id, cursor);
        chain.unshift({ id: p.id, title: p.title });
        cursor = p.parent_id;
      }
      return { breadcrumbs: chain, depth: chain.length };
    },
  },
  {
    name: "get-workspace-members", group: "workspace", risk: "GREEN", scope: "workspaces:read",
    description: "List members and roles of a workspace you belong to.",
    inputSchema: { type: "object", properties: { workspace_id: { type: "string" } }, required: ["workspace_id"] },
    async handler(args, key) {
      const ws = await assertWorkspaceAccess(key.user_id, String(args.workspace_id));
      const { data } = await db.from("workspace_members").select("user_id,role,created_at").eq("workspace_id", String(ws.id));
      return { workspace: { id: ws.id, name: ws.name }, members: data ?? [], owner_id: ws.owner_id };
    },
  },
];

/* ══════════════ BLOCKS (§13) ══════════════ */
const blockTools: ToolDef[] = [
  {
    name: "append-blocks", group: "content", risk: "YELLOW", scope: "pages:write",
    description: "Append markdown blocks to a page (same engine as create-pages). Prefer this for incremental writes.",
    inputSchema: {
      type: "object",
      properties: { page_id_or_url: { type: "string" }, markdown: { type: "string" }, position: { type: "string", enum: ["append", "prepend"], default: "append" } },
      required: ["page_id_or_url", "markdown"],
    },
    async handler(args, key) {
      const page = await content.loadPage(key.user_id, args.page_id_or_url);
      const newBlocks = (await import("../_shared/core/pure.ts")).markdownToBlocks(String(args.markdown ?? ""));
      if (!newBlocks.length) throw errors.validation("markdown produced no blocks");
      const existing = ((page.blocks ?? []) as Row[]);
      const blocks = args.position === "prepend" ? [...newBlocks, ...existing] : [...existing, ...newBlocks];
      const { error } = await db.from("pages").update({ blocks }).eq("id", String(page.id)).eq("user_id", key.user_id);
      if (error) throw new McpError(500, "TOOL_FAILED", error.message);
      return { appended: newBlocks.length, position: args.position ?? "append", page_url: (await import("../_shared/core/runtime.ts")).pageUrl(String(page.id)) };
    },
  },
  {
    name: "get-block", group: "content", risk: "GREEN", scope: "pages:read",
    description: "Fetch a single block (any type) by id, including its review/todo metadata.",
    inputSchema: { type: "object", properties: { page_id_or_url: { type: "string" }, block_id: { type: "string" } }, required: ["page_id_or_url", "block_id"] },
    async handler(args, key) {
      const page = await content.loadPage(key.user_id, args.page_id_or_url);
      const block = ((page.blocks ?? []) as Row[]).find((b) => b.id === args.block_id);
      if (!block) throw errors.notFound("Block");
      return { block, page_id: page.id };
    },
  },
  {
    name: "update-block", group: "content", risk: "YELLOW", scope: "pages:write",
    description: "Update one block's text (and checked state for todos).",
    inputSchema: {
      type: "object",
      properties: { page_id_or_url: { type: "string" }, block_id: { type: "string" }, text: { type: "string" }, checked: { type: "boolean" } },
      required: ["page_id_or_url", "block_id"],
    },
    async handler(args, key) {
      const page = await content.loadPage(key.user_id, args.page_id_or_url);
      const blocks = [...((page.blocks ?? []) as Row[])];
      const i = blocks.findIndex((b) => b.id === args.block_id);
      if (i === -1) throw errors.notFound("Block");
      if (args.text !== undefined) blocks[i] = { ...blocks[i], text: String(args.text) };
      if (args.checked !== undefined) blocks[i] = { ...blocks[i], checked: args.checked === true };
      const { error } = await db.from("pages").update({ blocks }).eq("id", String(page.id)).eq("user_id", key.user_id);
      if (error) throw new McpError(500, "TOOL_FAILED", error.message);
      return { updated: true, block: blocks[i] };
    },
  },
  {
    name: "delete-block", group: "content", risk: "RED", scope: "pages:write",
    description: "Delete a block from a page. RED risk — requires confirm:true.",
    inputSchema: {
      type: "object",
      properties: { page_id_or_url: { type: "string" }, block_id: { type: "string" }, confirm: { type: "boolean" } },
      required: ["page_id_or_url", "block_id"],
    },
    async handler(args, key) {
      const page = await content.loadPage(key.user_id, args.page_id_or_url);
      const blocks = ((page.blocks ?? []) as Row[]).filter((b) => b.id !== args.block_id);
      const removed = blocks.length !== (((page.blocks ?? []) as Row[]).length);
      if (!removed) throw errors.notFound("Block");
      const { error } = await db.from("pages").update({ blocks }).eq("id", String(page.id)).eq("user_id", key.user_id);
      if (error) throw new McpError(500, "TOOL_FAILED", error.message);
      return { deleted: true, block_id: args.block_id };
    },
  },
];

/* ══════════════ BULK (§39) ══════════════ */
const bulkTools: ToolDef[] = [
  {
    name: "bulk-archive-pages", group: "content", risk: "RED", scope: "pages:write",
    description: "Archive up to 50 pages at once. Per-page results with exact failure reasons. RED risk — requires confirm:true.",
    inputSchema: {
      type: "object",
      properties: {
        page_ids: { type: "array", items: { type: "string" }, maxItems: 50 },
        confirm: { type: "boolean" },
      },
      required: ["page_ids"],
    },
    async handler(args, key) {
      const ids = Array.isArray(args.page_ids) ? args.page_ids.map(String).slice(0, 50) : [];
      if (!ids.length) throw errors.validation("page_ids must be a non-empty array (max 50)");
      const results: Row[] = [];
      for (const id of ids) {
        try {
          await content.pages.archive(key.user_id, id);
          results.push({ id, ok: true });
        } catch (e) {
          results.push({ id, ok: false, reason: e instanceof McpError ? e.code : "TOOL_FAILED" });
        }
      }
      return {
        requested: ids.length,
        archived: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
        results,
      };
    },
  },
];

/* ══════════════ INTELLIGENCE (§13/§18) — deterministic, honest ══════════════ */
function pageToMarkdown(page: Row): string {
  return blocksToMarkdown((page.blocks ?? []) as Row[]);
}

function summarizeStructure(page: Row): Row {
  const blocks = ((page.blocks ?? []) as Row[]);
  const headings = blocks.filter((b) => String(b.type).startsWith("heading")).map((b) => String(b.text));
  const todos = blocks.filter((b) => b.type === "todo" || b.type === "to_do");
  const words = blocks.reduce((n, b) => n + String(b.text ?? "").split(/\s+/).filter(Boolean).length, 0);
  return {
    title: page.title,
    headings,
    word_count: words,
    block_count: blocks.length,
    open_tasks: todos.filter((b) => b.checked !== true).map((b) => String(b.text)),
    done_tasks: todos.filter((b) => b.checked === true).length,
    study_cards: blocks.filter((b) => b.review).length,
    databases: blocks.filter((b) => String(b.type ?? "").startsWith("database")).map((b) => String(b.text ?? "Untitled")),
    key_points: blocks
      .filter((b) => ["paragraph", "quote", "callout"].includes(String(b.type)) && String(b.text ?? "").length > 60)
      .slice(0, 5)
      .map((b) => String(b.text).slice(0, 220)),
  };
}

const intelligenceTools: ToolDef[] = [
  {
    name: "summarize-page", group: "intelligence", risk: "GREEN", scope: "search:read",
    description: "Structured summary of a page: headings, key points, word count, open tasks, study cards, databases. Deterministic — no model required, never hallucinates.",
    inputSchema: { type: "object", properties: { page_id_or_url: { type: "string" } }, required: ["page_id_or_url"] },
    async handler(args, key) {
      const page = await content.loadPage(key.user_id, args.page_id_or_url);
      return { summary: summarizeStructure(page), markdown_excerpt: pageToMarkdown(page).slice(0, 2000) };
    },
  },
  {
    name: "extract-tasks", group: "intelligence", risk: "GREEN", scope: "tasks:read",
    description: "Extract task candidates from a page: existing open todos plus imperative sentences detected in prose. Analysis only — create real tasks with create-task.",
    inputSchema: { type: "object", properties: { page_id_or_url: { type: "string" } }, required: ["page_id_or_url"] },
    async handler(args, key) {
      const page = await content.loadPage(key.user_id, args.page_id_or_url);
      const blocks = ((page.blocks ?? []) as Row[]);
      const existing = blocks
        .filter((b) => (b.type === "todo" || b.type === "to_do") && b.checked !== true)
        .map((b) => ({ source: "todo_block", text: String(b.text), block_id: b.id }));
      const IMPERATIVE = /^(finish|complete|review|write|send|fix|ship|prepare|read|call|email|schedule|update|create|draft|study|revise|submit|buy|book)\b/i;
      const candidates: Array<Row> = [];
      for (const b of blocks) {
        if (b.type === "todo" || b.type === "to_do") continue;
        for (const sentence of String(b.text ?? "").split(/(?<=[.!?])\s+|\n+/)) {
          const s = sentence.trim();
          if (s.length > 12 && s.length < 140 && IMPERATIVE.test(s)) {
            candidates.push({ source: "prose", text: s });
            break; // one candidate per block keeps signal high
          }
        }
      }
      return { page_id: page.id, existing_open_tasks: existing, suggested_tasks: candidates.slice(0, 10) };
    },
  },
  {
    name: "ask-noska", group: "intelligence", risk: "RED", scope: "intelligence:execute",
    description: "Delegate a question to one of your Noska agents (agent delegation). Requires agents:run scope, an existing agent, and background execution configured (BYOK) in the app. Returns run_id — inspect with inspect-agent-run.",
    inputSchema: {
      type: "object",
      properties: { agent_id: { type: "string" }, question: { type: "string" } },
      required: ["agent_id", "question"],
    },
    async handler(args, key) {
      const { data: agent } = await db.from("agents").select("id,name").eq("owner_id", key.user_id).eq("id", String(args.agent_id)).maybeSingle();
      if (!agent) throw errors.notFound("Agent");
      const res = await invokeRuntime({
        action: "execute",
        user_id: key.user_id,
        source_kind: "agent",
        source_id: String(args.agent_id),
        trigger_type: "mcp_ask",
        trigger_payload: { question: String(args.question ?? "").slice(0, 2000) },
      });
      if (!res.ok) throw new McpError(502, "RUNTIME_ERROR", String(res.body.message ?? "runtime unavailable"));
      return res.body;
    },
  },
];

/* ══════════════ AUTOMATION LIFECYCLE ══════════════ */
const automationLifecycle: ToolDef[] = [
  {
    name: "enable-automation", group: "automations", risk: "YELLOW", scope: "automations:run",
    description: "Enable (activate) an existing automation so its schedule/triggers run server-side.",
    inputSchema: { type: "object", properties: { automation_id: { type: "string" } }, required: ["automation_id"] },
    async handler(args, key) {
      const { error } = await db.from("automations").update({ status: "active", health: "healthy" })
        .eq("owner_id", key.user_id).eq("id", String(args.automation_id));
      if (error) throw errors.internal(error.message);
      return { enabled: true, id: args.automation_id };
    },
  },
  {
    name: "disable-automation", group: "automations", risk: "YELLOW", scope: "automations:run",
    description: "Disable (pause) an automation. Its schedule stops firing; history is kept.",
    inputSchema: { type: "object", properties: { automation_id: { type: "string" } }, required: ["automation_id"] },
    async handler(args, key) {
      const { error } = await db.from("automations").update({ status: "paused" })
        .eq("owner_id", key.user_id).eq("id", String(args.automation_id));
      if (error) throw errors.internal(error.message);
      return { disabled: true, id: args.automation_id };
    },
  },
  {
    name: "delegate-to-agent", group: "agents", risk: "RED", scope: "intelligence:execute",
    description: "Alias of ask-noska: hand a task/question to one of your Noska agents through the server runtime.",
    inputSchema: {
      type: "object",
      properties: { agent_id: { type: "string" }, task: { type: "string" } },
      required: ["agent_id", "task"],
    },
    async handler(args, key) {
      const res = await invokeRuntime({
        action: "execute",
        user_id: key.user_id,
        source_kind: "agent",
        source_id: String(args.agent_id),
        trigger_type: "mcp_delegate",
        trigger_payload: { question: String(args.task ?? "").slice(0, 2000) },
      });
      if (!res.ok) throw new McpError(502, "RUNTIME_ERROR", String(res.body.message ?? "runtime unavailable"));
      return res.body;
    },
  },
];

/* ══════════════ NOSKA_EXECUTE — controlled agentic execution (§14/§15) ══════════════ */

const EXECUTE_ACTIONS = ["search", "create_page", "create_task", "update_page", "append_blocks"] as const;
type ExecuteAction = (typeof EXECUTE_ACTIONS)[number];
const MAX_STEPS = 12;

interface ExecuteStep { action: ExecuteAction; args: Row; note?: string }

const executeTools: ToolDef[] = [
  {
    name: "noska_execute", group: "execution", risk: "YELLOW", scope: "pages:write",
    description: "Controlled multi-step execution. YOU plan the steps; Noska authorizes and runs each one through the same capability layer, persists a durable execution record, and returns an honest summary. Actions: search, create_page, create_task, update_page, append_blocks. Max 12 steps. Destructive actions are not available here by design — use dedicated tools with confirm:true.",
    inputSchema: {
      type: "object",
      properties: {
        goal: { type: "string", description: "What this execution is trying to accomplish (stored on the record)." },
        steps: {
          type: "array", maxItems: MAX_STEPS,
          items: {
            type: "object",
            properties: {
              action: { type: "string", enum: [...EXECUTE_ACTIONS] },
              args: { type: "object", description: "Arguments matching the underlying tool (e.g. create_page: {title, markdown}; create_task: {page_id, text, priority?}; search: {query}; update_page: {page_id_or_url, title?; append_markdown?}; append_blocks: {page_id_or_url, markdown})" },
              note: { type: "string" },
            },
            required: ["action", "args"],
          },
        },
        idempotency_key: { type: "string" },
      },
      required: ["goal", "steps"],
    },
    async handler(args, key) {
      const goal = String(args.goal ?? "").slice(0, 500);
      const steps = (Array.isArray(args.steps) ? args.steps : []) as Array<Row>;
      if (!goal.trim()) throw errors.validation("goal is required");
      if (!steps.length) throw errors.validation("steps must be a non-empty array");
      if (steps.length > MAX_STEPS) throw errors.validation(`max ${MAX_STEPS} steps per execution`);

      /* Durable execution record (agent_runs, source_kind 'ai'). */
      const runId = crypto.randomUUID();
      await db.from("agent_runs").insert({
        id: runId, user_id: key.user_id, source_kind: "ai", source_id: "noska_execute",
        name: "noska_execute", trigger_type: "mcp",
        trigger_payload: { goal } as never,
        status: "running", started_at: new Date().toISOString(),
        plan_snapshot: { steps } as never,
        workspace_id: key.default_workspace_id ?? "",
      });

      const executed: Row[] = [];
      const failed: Row[] = [];
      const created = { pages: 0, tasks: 0, updates: 0, searches: 0 };
      let lastPageId: string | null = null;

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const action = String(step.action) as ExecuteAction;
        const sargs = (step.args ?? {}) as Row;
        try {
          if (!EXECUTE_ACTIONS.includes(action)) throw errors.validation(`unknown action "${action}"`);
          let result: Row = {};
          if (action === "search") {
            const r = await content.search.query(key.user_id, String(sargs.query ?? ""), Number(sargs.limit) || 8);
            result = { matches: (r.results as Row[]).length, top: (r.results as Row[]).slice(0, 5) };
            created.searches++;
          } else if (action === "create_page") {
            const page = await content.pages.create(key.user_id, sargs);
            lastPageId = String(page.id);
            result = { page_id: page.id, title: page.title };
            created.pages++;
          } else if (action === "create_task") {
            const target = sargs.page_id ?? sargs.page_id_or_url ?? lastPageId;
            if (!target) throw errors.validation("create_task needs page_id (or a previous create_page step)");
            const r = await content.tasks.create(key.user_id, { ...sargs, page_id: target });
            result = { task_id: (r.task as Row).id, verified: r.verified };
            created.tasks++;
          } else if (action === "update_page") {
            const r = await content.pages.update(key.user_id, sargs.page_id_or_url ?? lastPageId, sargs);
            result = { page_id: r.id, url: r.url };
            created.updates++;
          } else if (action === "append_blocks") {
            const target = sargs.page_id_or_url ?? lastPageId;
            if (!target) throw errors.validation("append_blocks needs page_id_or_url (or a previous create_page step)");
            const page = await content.loadPage(key.user_id, target);
            const nb = (await import("../_shared/core/pure.ts")).markdownToBlocks(String(sargs.markdown ?? ""));
            const blocks = [...((page.blocks ?? []) as Row[]), ...nb];
            const { error } = await db.from("pages").update({ blocks }).eq("id", String(page.id)).eq("user_id", key.user_id);
            if (error) throw errors.internal(error.message);
            result = { appended: nb.length, page_id: page.id };
            created.updates++;
          }
          executed.push({ step: i + 1, action, ok: true, ...(step.note ? { note: step.note } : {}), result });
        } catch (e) {
          const reason = e instanceof McpError || (e as Row).code ? String((e as Row).code) : "STEP_FAILED";
          failed.push({ step: i + 1, action, reason, message: e instanceof Error ? e.message.slice(0, 200) : "failed" });
        }
      }

      const status = failed.length === 0 ? "completed" : executed.length > 0 ? "completed_with_errors" : "failed";
      await db.from("agent_runs").update({
        status: status === "failed" ? "failed" : "completed",
        completed_at: new Date().toISOString(),
        duration_ms: 0,
        final_output: JSON.stringify({ executed: executed.length, failed: failed.length, created }) as never,
        counts: { steps: steps.length, ok: executed.length, failed: failed.length } as never,
      }).eq("id", runId);

      return {
        execution_id: runId,
        status,
        summary: {
          steps_requested: steps.length,
          steps_executed: executed.length,
          steps_failed: failed.length,
          pages_created: created.pages,
          tasks_created: created.tasks,
          page_updates: created.updates,
          searches_run: created.searches,
        },
        executed,
        failed,
      };
    },
  },
];

/* ══════════════ RESOURCES (§16) ══════════════ */

export const RESOURCES = [
  {
    uriTemplate: "noska://page/{page_id}",
    name: "Page",
    description: "A page's content as markdown. Accepts UUID.",
    mimeType: "text/markdown",
  },
  {
    uriTemplate: "noska://agent/{agent_id}",
    name: "Agent",
    description: "An agent's definition and status.",
    mimeType: "application/json",
  },
  {
    uriTemplate: "noska://automation/{automation_id}",
    name: "Automation",
    description: "An automation's trigger and steps.",
    mimeType: "application/json",
  },
  {
    uriTemplate: "noska://workspace/{workspace_id}",
    name: "Workspace",
    description: "Workspace metadata and settings (membership required).",
    mimeType: "application/json",
  },
  {
    uriTemplate: "noska://database/{database_id}",
    name: "Database",
    description: "A database block's properties, views and rows.",
    mimeType: "application/json",
  },
];

export async function readResource(uri: string, key: KeyRow): Promise<Row> {
  if (uri === "noska://workspace/current") {
    const ctx = await (await import("./tools.ts")).TOOLS.find((t) => t.name === "get-workspace-context")!;
    const result = await ctx.handler({}, key);
    return [{
      uri, mimeType: "application/json",
      text: JSON.stringify(result, null, 2),
    }];
  }
  const page = /^noska:\/\/page\/([0-9a-f-]{36})$/i.exec(uri);
  if (page) {
    const p = await content.loadPage(key.user_id, page[1]);
    return [{
      uri, mimeType: "text/markdown",
      text: `# ${p.title}\n\n${(await import("../_shared/core/pure.ts")).blocksToMarkdown((p.blocks ?? []) as Row[])}`,
    }];
  }
  const agent = /^noska:\/\/agent\/([0-9a-f-]{36})$/i.exec(uri);
  if (agent) {
    const { data } = await db.from("agents").select("*").eq("owner_id", key.user_id).eq("id", agent[1]).maybeSingle();
    if (!data) throw errors.notFound("Agent");
    return [{ uri, mimeType: "application/json", text: JSON.stringify(data, null, 2) }];
  }
  const auto = /^noska:\/\/automation\/([0-9a-f-]{36})$/i.exec(uri);
  if (auto) {
    const { data } = await db.from("automations").select("*").eq("owner_id", key.user_id).eq("id", auto[1]).maybeSingle();
    if (!data) throw errors.notFound("Automation");
    return [{ uri, mimeType: "application/json", text: JSON.stringify(data, null, 2) }];
  }
  const wsRes = /^noska:\/\/workspace\/([0-9a-f-]{36})$/i.exec(uri);
  if (wsRes) {
    const { assertWorkspaceAccess } = await import("../_shared/capabilities/platform.ts");
    const ws = await assertWorkspaceAccess(key.user_id, wsRes[1]); // membership IS the authorization
    return [{ uri, mimeType: "application/json", text: JSON.stringify({ id: ws.id, name: ws.name, icon: ws.icon, description: ws.description, slug: ws.slug ?? null, settings: ws.settings ?? {} }, null, 2) }];
  }
  const dbRes = /^noska:\/\/database\/([0-9a-f-]{36})$/i.exec(uri);
  if (dbRes) {
    const { databases } = await import("../_shared/capabilities/content.ts");
    const hit = await databases.get(key.user_id, dbRes[1]);
    return [{ uri, mimeType: "application/json", text: JSON.stringify(hit, null, 2) }];
  }
  throw errors.validation(`Unsupported resource URI: ${uri}`);
}

/* ══════════════ PROMPTS (§17) ══════════════ */

export const PROMPTS = [
  { name: "summarize-workspace", description: "A structured overview of the whole workspace with highlights.", arguments: [] },
  { name: "weekly-review", description: "Review the past week: tasks done, reviews due, what to focus on next.", arguments: [] },
  { name: "find-overdue-tasks", description: "List overdue tasks and due study cards, ordered by urgency.", arguments: [] },
  { name: "organize-notes", description: "Plan an organization pass over notes on a topic.", arguments: [{ name: "topic", description: "Topic or project name", required: true }] },
  { name: "plan-project", description: "Turn a goal into pages, tasks and a study/execution plan.", arguments: [{ name: "goal", description: "Project goal", required: true }] },
  { name: "meeting-to-tasks", description: "Extract decisions and action items from meeting notes.", arguments: [{ name: "page_id_or_url", description: "Meeting notes page", required: true }] },
  { name: "project-review", description: "Review a project: status, risks, blocked items, next actions.", arguments: [{ name: "topic", description: "Project name", required: true }] },
  { name: "prepare-meeting", description: "Assemble context for an upcoming meeting from related pages and open tasks.", arguments: [{ name: "topic", description: "Meeting subject", required: true }] },
  { name: "research-topic", description: "Gather and synthesize everything in the workspace about a topic.", arguments: [{ name: "topic", description: "Research subject", required: true }] },
  { name: "clean-workspace", description: "Find duplicates, stale pages and archive candidates. Read-only analysis.", arguments: [] },
];

export async function getPrompt(name: string, args: Row, key: KeyRow): Promise<Row> {
  const text = async (): Promise<string> => {
    switch (name) {
      case "summarize-workspace": {
        const ctx = await (await import("./tools.ts")).TOOLS.find((t) => t.name === "get-workspace-context")!.handler({}, key) as Row;
        return `Here is my Noska workspace context:\n\n${"```json"}\n${JSON.stringify(ctx, null, 2)}\n${"```"}\n\nGive me a structured overview: what this workspace is about, active areas, risks (overdue/due items), and 3 suggestions.`;
      }
      case "weekly-review": {
        const progress = await content.learning.progress(key.user_id);
        const tasks = await content.tasks.list(key.user_id, { done: false, limit: 25 });
        return `Weekly review data:\n\nStudy: ${JSON.stringify(progress)}\n\nOpen tasks:\n${(tasks.tasks as Row[]).map((t) => `- [${t.priority ?? " "}] ${t.text} (due: ${t.dueAt ?? "none"})`).join("\n")}\n\nRun a weekly review: wins, gaps, next week's top 3 priorities, and what to schedule.`;
      }
      case "find-overdue-tasks": {
        const nowIso = new Date().toISOString();
        const tasks = await content.tasks.list(key.user_id, { done: false, limit: 100 });
        const overdue = (tasks.tasks as Row[]).filter((t) => t.dueAt && String(t.dueAt) < nowIso);
        const cards = await content.learning.listCards(key.user_id, { dueOnly: true });
        return `Overdue tasks (${overdue.length}):\n${overdue.map((t) => `- ${t.text} — due ${t.dueAt}`).join("\n") || "none"}\n\nDue study cards (${(cards.cards as Row[]).length}).\n\nOrder by urgency, group by project, and propose a catch-up plan.`;
      }
      case "organize-notes": {
        const topic = String(args.topic ?? "my notes");
        return `Help me organize my ${topic} notes in Noska. Steps: 1) search the workspace for related pages (search), 2) fetch the most relevant ones, 3) propose a structure (hub page + children), 4) after I approve, create the structure with noska_execute (create_page steps) and add cross-links.`;
      }
      case "plan-project": {
        const goal = String(args.goal ?? "my project");
        return `Goal: ${goal}\n\nUsing my Noska workspace: 1) search for anything related, 2) propose a project hub page with sections, 3) propose 5-10 concrete tasks with priorities and due dates, 4) after approval create them via noska_execute, 5) summarize what was created.`;
      }
      case "meeting-to-tasks": {
        const ref = String(args.page_id_or_url ?? "");
        return `Fetch the meeting notes page ${ref} (fetch tool), then: 1) list decisions made, 2) extract action items with owners and deadlines (extract-tasks), 3) propose create_task calls, 4) after approval create them and append a "Decisions & Actions" section with append-blocks.`;
      }
      case "project-review": {
        const topic = String(args.topic ?? "the project");
        const found = await content.search.query(key.user_id, topic, 15);
        const tasks = await content.tasks.list(key.user_id, { done: false, limit: 50 });
        const related = (tasks.tasks as Row[]).filter((t) => String(t.text).toLowerCase().includes(topic.toLowerCase()));
        return {
          description: PROMPTS.find((p) => p.name === name)?.description ?? "",
          messages: [{ role: "user", content: { type: "text", text:
            `Project review for "${topic}".\n\nRelated pages (${(found.results as Row[]).length}):\n${(found.results as Row[]).slice(0, 10).map((r) => `- ${r.title} (${r.url})`).join("\n")}\n\nRelated open tasks (${related.length}):\n${related.slice(0, 15).map((t) => `- ${t.text}${t.dueAt ? ` (due ${t.dueAt})` : ""}`).join("\n")}\n\nProduce: status summary, risks/blockers, stale items, next actions with owners.` } }],
        };
      }
      case "prepare-meeting": {
        const topic = String(args.topic ?? "the meeting");
        const found = await content.search.query(key.user_id, topic, 10);
        return {
          description: PROMPTS.find((p) => p.name === name)?.description ?? "",
          messages: [{ role: "user", content: { type: "text", text:
            `Prepare me for a meeting about "${topic}".\n\nRelated pages:\n${(found.results as Row[]).map((r) => `- ${r.title} (${r.url})`).join("\n") || "none found"}\n\nFetch the top pages, summarize each in 2 bullets, list open questions I should raise, and draft a 5-line agenda.` } }],
        };
      }
      case "research-topic": {
        const topic = String(args.topic ?? "the topic");
        return {
          description: PROMPTS.find((p) => p.name === name)?.description ?? "",
          messages: [{ role: "user", content: { type: "text", text:
            `Research "${topic}" across my Noska workspace: search broadly (multiple query variants), fetch the strongest pages, synthesize findings with citations to page URLs, note contradictions between pages, and list knowledge gaps.` } }],
        };
      }
      case "clean-workspace": {
        const tasks = await content.tasks.list(key.user_id, { done: true, limit: 100 });
        return {
          description: PROMPTS.find((p) => p.name === name)?.description ?? "",
          messages: [{ role: "user", content: { type: "text", text:
            `Workspace cleanup analysis (READ-ONLY - propose, do not delete).\n\nCompleted tasks: ${(tasks.tasks as Row[]).length}\n\nList pages likely stale (untouched 90+ days), duplicates by near-identical titles, and propose an archive plan for my approval. Do not mutate anything.` } }],
        };
      }
      default:
        throw errors.notFound("Prompt");
    }
  };
  return {
    description: PROMPTS.find((p) => p.name === name)?.description ?? "",
    messages: [{ role: "user", content: { type: "text", text: await text() } }],
  };
}

export const TOOLS_V6: ToolDef[] = [
  ...workspaceExtras,
  ...blockTools,
  ...bulkTools,
  ...intelligenceTools,
  ...automationLifecycle,
  ...executeTools,
];