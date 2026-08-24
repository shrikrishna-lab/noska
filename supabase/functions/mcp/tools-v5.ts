/* ============================================================================
 * Noska MCP V5 — New-capability tool registry.
 *
 * Every tool here is a thin adapter over the canonical capability layer
 * (/_shared/capabilities/*): the same functions the REST API and the agent
 * runtime call. No business logic lives in this file.
 *
 * Legacy tools (content/tasks/learning/databases/agents-CRUD/automations-CRUD/
 * context/system) remain registered from tools.ts — nothing was removed.
 * ========================================================================== */
import type { ToolDef } from "./tools.ts";
import { McpError, db, type KeyRow, type Row } from "./shared.ts";
import {
  workspaces as wsCap,
  templates as tplCap,
  dashboards as dashCap,
  webhooks as hookCap,
  events as evtCap,
  connections as connCap,
} from "../_shared/capabilities/platform.ts";
import {
  agents as agentCap,
  automations as autoCap,
  runs as runCap,
} from "../_shared/capabilities/intelligence.ts";
import { tasks as taskCap } from "../_shared/capabilities/content.ts";

const str = (v: unknown) => (typeof v === "string" ? v : undefined);

/* ══════════════ WORKSPACE ══════════════ */
const workspaceTools: ToolDef[] = [
  {
    name: "list-workspaces", group: "workspace", risk: "GREEN", scope: "workspaces:read",
    description: "List your workspaces — owned and shared memberships.",
    inputSchema: { type: "object", properties: {} },
    async handler(_args, key) { return wsCap.list(key.user_id); },
  },
  {
    name: "get-workspace", group: "workspace", risk: "GREEN", scope: "workspaces:read",
    description: "Inspect one workspace including members and settings. Accepts UUID or URL.",
    inputSchema: { type: "object", properties: { workspace_id: { type: "string" } }, required: ["workspace_id"] },
    async handler(args, key) { return wsCap.get(key.user_id, String(args.workspace_id)); },
  },
  {
    name: "create-workspace", group: "workspace", risk: "YELLOW", scope: "workspaces:write",
    description: 'Create a real persisted workspace, e.g. a "Semester 5" study workspace. You become its owner.',
    inputSchema: {
      type: "object",
      properties: { name: { type: "string" }, slug: { type: "string" }, icon: { type: "string" }, description: { type: "string" }, settings: { type: "object" } },
      required: ["name"],
    },
    async handler(args, key) { return { workspace: await wsCap.create(key.user_id, args) }; },
  },
  {
    name: "update-workspace", group: "workspace", risk: "YELLOW", scope: "workspaces:write",
    description: "Update name/description/icon/settings or archive/unarchive (archived: true|false).",
    inputSchema: {
      type: "object",
      properties: {
        workspace_id: { type: "string" }, name: { type: "string" }, description: { type: "string" },
        icon: { type: "string" }, archived: { type: "boolean" }, settings: { type: "object" },
      },
      required: ["workspace_id"],
    },
    async handler(args, key) { return wsCap.update(key.user_id, String(args.workspace_id), args); },
  },
  {
    name: "archive-workspace", group: "workspace", risk: "RED", scope: "workspaces:write",
    description: "Archive a workspace (reversible). RED risk — requires confirm:true.",
    inputSchema: { type: "object", properties: { workspace_id: { type: "string" }, confirm: { type: "boolean" } }, required: ["workspace_id"] },
    async handler(args, key) { return wsCap.update(key.user_id, String(args.workspace_id), { archived: true }); },
  },
  {
    name: "switch-workspace", group: "workspace", risk: "YELLOW", scope: "workspaces:write",
    description: "Make a workspace the default scope for this API key. Subsequent calls that accept workspace_id will use it when omitted.",
    inputSchema: { type: "object", properties: { workspace_id: { type: "string" } }, required: ["workspace_id"] },
    async handler(args, key) { return wsCap.switchDefault(key, String(args.workspace_id)); },
  },
];

/* ══════════════ TEMPLATES ══════════════ */
const templateTools: ToolDef[] = [
  {
    name: "list-templates", group: "templates", risk: "GREEN", scope: "templates:read",
    description: "List persistent templates (archived=false by default).",
    inputSchema: { type: "object", properties: { include_archived: { type: "boolean" } } },
    async handler(args, key) {
      return tplCap.list(key.user_id, { archived: args.include_archived === true });
    },
  },
  {
    name: "get-template", group: "templates", risk: "GREEN", scope: "templates:read",
    description: "Inspect a template's full body (pages/tasks/databases/dashboards/agents definitions).",
    inputSchema: { type: "object", properties: { template_id: { type: "string" } }, required: ["template_id"] },
    async handler(args, key) { return { template: await tplCap.get(key.user_id, String(args.template_id)) }; },
  },
  {
    name: "create-template", group: "templates", risk: "YELLOW", scope: "templates:write",
    description: "Persist a reusable template. body.pages support nesting via children; markdown becomes real blocks on instantiation.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" }, description: { type: "string" }, icon: { type: "string" },
        kind: { type: "string", enum: ["page", "workspace", "custom"] },
        workspace_id: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        body: {
          type: "object",
          description: "{ pages:[{title,icon,markdown,tags,children}], tasks:[{title,dueAt,priority}], databases:[{title,properties,rows}], dashboards:[{name,layout}], agents:[{name,instructions}] }",
        },
      },
      required: ["name", "body"],
    },
    async handler(args, key) { return { template: await tplCap.create(key.user_id, args) }; },
  },
  {
    name: "create-from-template", group: "templates", risk: "YELLOW", scope: "templates:write",
    description: "Instantiate REAL entities from a template: pages with blocks, child pages, tasks, databases, dashboards, agents — every step persisted and reported per-op.",
    inputSchema: {
      type: "object",
      properties: { template_id: { type: "string" }, workspace_id: { type: "string" } },
      required: ["template_id"],
    },
    async handler(args, key) { return tplCap.instantiate(key.user_id, String(args.template_id), args); },
  },
  {
    name: "update-template", group: "templates", risk: "YELLOW", scope: "templates:write",
    description: "Update template metadata or body.",
    inputSchema: {
      type: "object",
      properties: { template_id: { type: "string" }, name: { type: "string" }, description: { type: "string" }, icon: { type: "string" }, body: { type: "object" } },
      required: ["template_id"],
    },
    async handler(args, key) {
      const { template_id, ...patch } = args;
      return tplCap.update(key.user_id, String(template_id), patch);
    },
  },
  {
    name: "archive-template", group: "templates", risk: "RED", scope: "templates:write",
    description: "Archive a template (hidden from lists; restorable via update-template archived:false). RED risk — requires confirm:true.",
    inputSchema: { type: "object", properties: { template_id: { type: "string" }, confirm: { type: "boolean" } }, required: ["template_id"] },
    async handler(args, key) { return tplCap.update(key.user_id, String(args.template_id), { archived: true }); },
  },
];

/* ══════════════ DASHBOARDS ══════════════ */
const dashboardTools: ToolDef[] = [
  {
    name: "list-dashboards", group: "dashboards", risk: "GREEN", scope: "dashboards:read",
    description: "List persistent dashboards.",
    inputSchema: { type: "object", properties: { include_archived: { type: "boolean" } } },
    async handler(args, key) {
      return dashCap.list(key.user_id, { archived: args.include_archived === true });
    },
  },
  {
    name: "get-dashboard", group: "dashboards", risk: "GREEN", scope: "dashboards:read",
    description: "Fetch one dashboard's layout: sections, widgets, data sources, filters, linked views.",
    inputSchema: { type: "object", properties: { dashboard_id: { type: "string" } }, required: ["dashboard_id"] },
    async handler(args, key) { return { dashboard: await dashCap.get(key.user_id, String(args.dashboard_id)) }; },
  },
  {
    name: "create-dashboard", group: "dashboards", risk: "YELLOW", scope: "dashboards:write",
    description: 'Create a persistent dashboard whose widgets reference real Noska data, e.g. {"sections":[{"title":"Study","widgets":[{"type":"task_list","filter":{"done":false}},{"type":"review_queue"},{"type":"count","source":"tasks"}]}]}',
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" }, description: { type: "string" }, icon: { type: "string" },
        workspace_id: { type: "string" },
        layout: { type: "object", description: '{ sections: [{ title?, widgets: [{ type, source?, filter?, sort?, view_id? }] }] }' },
        filters: { type: "object" },
      },
      required: ["name"],
    },
    async handler(args, key) { return { dashboard: await dashCap.create(key.user_id, args) }; },
  },
  {
    name: "update-dashboard", group: "dashboards", risk: "YELLOW", scope: "dashboards:write",
    description: "Update dashboard layout/filters/metadata.",
    inputSchema: {
      type: "object",
      properties: {
        dashboard_id: { type: "string" }, name: { type: "string" }, description: { type: "string" },
        icon: { type: "string" }, layout: { type: "object" }, filters: { type: "object" },
      },
      required: ["dashboard_id"],
    },
    async handler(args, key) {
      const { dashboard_id, ...patch } = args;
      return dashCap.update(key.user_id, String(dashboard_id), patch);
    },
  },
  {
    name: "archive-dashboard", group: "dashboards", risk: "RED", scope: "dashboards:write",
    description: "Archive a dashboard (reversible via update-dashboard archived:false). RED risk — requires confirm:true.",
    inputSchema: { type: "object", properties: { dashboard_id: { type: "string" }, confirm: { type: "boolean" } }, required: ["dashboard_id"] },
    async handler(args, key) { return dashCap.update(key.user_id, String(args.dashboard_id), { archived: true }); },
  },
];

/* ══════════════ AGENT EXECUTION ══════════════ */
function runtimeResultToToolOutput(res: { httpStatus: number; body: Row }): Row {
  if (!res.ok) {
    const code = str(res.body.error) ?? `runtime_http_${res.httpStatus}`;
    throw new McpError(502, "RUNTIME_ERROR", String(res.body.message ?? code));
  }
  return res.body;
}

const agentRunTools: ToolDef[] = [
  {
    name: "run-agent", group: "agents", risk: "RED", scope: "agents:run",
    description: "Trigger a SERVER-SIDE agent run through the Noska Agent Runtime (planner → permissions → execution → verification). Returns run_id + status. Runs execute without any browser open; if background execution is not enabled for the account the run is recorded as skipped with the reason.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string" },
        input: { type: "object", description: "Optional payload passed to the run (e.g. instruction focus)" },
        confirmation_mode: { type: "string", enum: ["auto", "approval"], description: "approval pauses RED actions until approved in-app" },
        idempotency_key: { type: "string" },
      },
      required: ["agent_id"],
    },
    async handler(args, key) {
      return runtimeResultToToolOutput(await runCap.start({
        key, sourceKind: "agent", sourceId: String(args.agent_id),
        input: (args.input ?? {}) as Row,
        confirmationMode: (str(args.confirmation_mode) as "auto" | "approval" | undefined) ?? "auto",
        idempotencyKey: str(args.idempotency_key),
      }));
    },
  },
  {
    name: "inspect-agent-run", group: "agents", risk: "GREEN", scope: "agents:read",
    description: "Fetch an agent run record plus its full execution event trace (tool calls, model rounds, verification).",
    inputSchema: { type: "object", properties: { run_id: { type: "string" } }, required: ["run_id"] },
    async handler(args, key) { return runCap.get(key.user_id, String(args.run_id)); },
  },
  {
    name: "cancel-agent-run", group: "agents", risk: "RED", scope: "agents:run",
    description: "Cancel a queued/waiting/approval-gated agent run. RED risk — requires confirm:true.",
    inputSchema: { type: "object", properties: { run_id: { type: "string" }, confirm: { type: "boolean" } }, required: ["run_id"] },
    async handler(args, key) { return runCap.cancel(key.user_id, String(args.run_id)); },
  },
  {
    name: "retry-agent-run", group: "agents", risk: "RED", scope: "agents:run",
    description: "Retry a finished agent run by requesting a fresh server-side execution of the same agent. RED risk — requires confirm:true.",
    inputSchema: { type: "object", properties: { run_id: { type: "string" }, confirm: { type: "boolean" } }, required: ["run_id"] },
    async handler(args, key) { return runtimeResultToToolOutput(await runCap.retry({ key, runId: String(args.run_id) })); },
  },
  {
    name: "list-agent-runs", group: "agents", risk: "GREEN", scope: "agents:read",
    description: "List recent runs of one agent (newest first).",
    inputSchema: { type: "object", properties: { agent_id: { type: "string" }, limit: { type: "integer" } }, required: ["agent_id"] },
    async handler(args, key) {
      return runCap.listForSource(key.user_id, "agent", String(args.agent_id), Number(args.limit) || 20);
    },
  },
];

/* ══════════════ AUTOMATION EXECUTION ══════════════ */
const automationRunTools: ToolDef[] = [
  {
    name: "run-automation", group: "automations", risk: "RED", scope: "automations:run",
    description: "Trigger a SERVER-SIDE automation run (trigger → conditions → agent/action → permission gate → execution → verified run record). No browser involved.",
    inputSchema: {
      type: "object",
      properties: {
        automation_id: { type: "string" },
        input: { type: "object" },
        idempotency_key: { type: "string" },
      },
      required: ["automation_id"],
    },
    async handler(args, key) {
      return runtimeResultToToolOutput(await runCap.start({
        key, sourceKind: "automation", sourceId: String(args.automation_id),
        input: (args.input ?? {}) as Row,
        idempotencyKey: str(args.idempotency_key),
      }));
    },
  },
  {
    name: "inspect-automation-run", group: "automations", risk: "GREEN", scope: "automations:read",
    description: "Fetch an automation run record plus its execution event trace.",
    inputSchema: { type: "object", properties: { run_id: { type: "string" } }, required: ["run_id"] },
    async handler(args, key) { return runCap.get(key.user_id, String(args.run_id)); },
  },
  {
    name: "cancel-automation-run", group: "automations", risk: "RED", scope: "automations:run",
    description: "Cancel a queued/waiting automation run. RED risk — requires confirm:true.",
    inputSchema: { type: "object", properties: { run_id: { type: "string" }, confirm: { type: "boolean" } }, required: ["run_id"] },
    async handler(args, key) { return runCap.cancel(key.user_id, String(args.run_id)); },
  },
  {
    name: "retry-automation-run", group: "automations", risk: "RED", scope: "automations:run",
    description: "Retry a finished automation run (fresh server-side execution). RED risk — requires confirm:true.",
    inputSchema: { type: "object", properties: { run_id: { type: "string" }, confirm: { type: "boolean" } }, required: ["run_id"] },
    async handler(args, key) { return runtimeResultToToolOutput(await runCap.retry({ key, runId: String(args.run_id) })); },
  },
  {
    name: "list-automation-runs", group: "automations", risk: "GREEN", scope: "automations:read",
    description: "List recent runs of one automation.",
    inputSchema: { type: "object", properties: { automation_id: { type: "string" }, limit: { type: "integer" } }, required: ["automation_id"] },
    async handler(args, key) {
      return runCap.listForSource(key.user_id, "automation", String(args.automation_id), Number(args.limit) || 20);
    },
  },
];

/* ══════════════ WEBHOOKS ══════════════ */
const webhookTools: ToolDef[] = [
  {
    name: "list-webhooks", group: "webhooks", risk: "GREEN", scope: "webhooks:manage",
    description: "List your outgoing webhook endpoints (signing secrets are never returned).",
    inputSchema: { type: "object", properties: {} },
    async handler(_args, key) { return hookCap.list(key.user_id); },
  },
  {
    name: "create-webhook", group: "webhooks", risk: "YELLOW", scope: "webhooks:manage",
    description: 'Register an https endpoint to receive signed events, e.g. events:["task.completed"]. The signing secret is shown ONCE in the response.',
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string" }, events: { type: "array", items: { type: "string" } },
        description: { type: "string" }, workspace_id: { type: "string" },
      },
      required: ["url", "events"],
    },
    async handler(args, key) { return hookCap.create(key.user_id, args); },
  },
  {
    name: "update-webhook", group: "webhooks", risk: "YELLOW", scope: "webhooks:manage",
    description: "Update url/events/description or status(active|disabled|revoked).",
    inputSchema: {
      type: "object",
      properties: { webhook_id: { type: "string" }, url: { type: "string" }, events: { type: "array", items: { type: "string" } }, status: { type: "string", enum: ["active", "disabled", "revoked"] } },
      required: ["webhook_id"],
    },
    async handler(args, key) {
      const { webhook_id, ...patch } = args;
      return hookCap.update(key.user_id, String(webhook_id), patch);
    },
  },
  {
    name: "delete-webhook", group: "webhooks", risk: "RED", scope: "webhooks:manage",
    description: "Permanently remove a webhook endpoint and its delivery records. RED risk — requires confirm:true.",
    inputSchema: { type: "object", properties: { webhook_id: { type: "string" }, confirm: { type: "boolean" } }, required: ["webhook_id"] },
    async handler(args, key) {
      const { error } = await db.from("noska_webhook_endpoints").delete()
        .eq("user_id", key.user_id).eq("id", String(args.webhook_id));
      if (error) throw new McpError(500, "TOOL_FAILED", error.message);
      return { deleted: true, id: args.webhook_id };
    },
  },
  {
    name: "rotate-webhook-secret", group: "webhooks", risk: "YELLOW", scope: "webhooks:manage",
    description: "Rotate an endpoint's signing secret (new secret shown once; old signatures stop validating immediately).",
    inputSchema: { type: "object", properties: { webhook_id: { type: "string" } }, required: ["webhook_id"] },
    async handler(args, key) { return hookCap.rotateSecret(key.user_id, String(args.webhook_id)); },
  },
  {
    name: "test-webhook", group: "webhooks", risk: "GREEN", scope: "webhooks:manage",
    description: "Send a signed test.event delivery to the endpoint right now and report the outcome.",
    inputSchema: { type: "object", properties: { webhook_id: { type: "string" } }, required: ["webhook_id"] },
    async handler(args, key) { return hookCap.test(key.user_id, String(args.webhook_id)); },
  },
  {
    name: "list-webhook-deliveries", group: "webhooks", risk: "GREEN", scope: "webhooks:manage",
    description: "Recent deliveries across endpoints: status, attempts, response codes, errors.",
    inputSchema: { type: "object", properties: { webhook_id: { type: "string" }, limit: { type: "integer" } } },
    async handler(args, key) {
      return hookCap.deliveries(key.user_id, { endpointId: str(args.webhook_id), limit: Number(args.limit) || 50 });
    },
  },
];

/* ══════════════ EVENTS / CONNECTIONS / RICH TASKS ══════════════ */
const platformExtrasTools: ToolDef[] = [
  {
    name: "list-events", group: "events", risk: "GREEN", scope: "events:read",
    description: "Read the Noska event bus: page.created, task.completed, agent.run.completed, workspace.created … filter by type/since.",
    inputSchema: { type: "object", properties: { type: { type: "string" }, since: { type: "string" }, limit: { type: "integer" } } },
    async handler(args, key) {
      return evtCap.list(key.user_id, {
        type: str(args.type), since: str(args.since), limit: Number(args.limit) || 50,
      });
    },
  },
  {
    name: "list-connected-accounts", group: "connections", risk: "GREEN", scope: "connections:manage",
    description: "List external accounts connected to Noska (provider, scopes, status). Tokens stay server-side and are never returned.",
    inputSchema: { type: "object", properties: {} },
    async handler(_args, key) { return connCap.list(key.user_id); },
  },
  {
    name: "disconnect-connected-account", group: "connections", risk: "RED", scope: "connections:manage",
    description: "Revoke a connected account (tokens destroyed server-side). RED risk — requires confirm:true.",
    inputSchema: { type: "object", properties: { connection_id: { type: "string" }, confirm: { type: "boolean" } }, required: ["connection_id"] },
    async handler(args, key) { return connCap.revoke(key.user_id, String(args.connection_id)); },
  },
  {
    name: "update-task-metadata", group: "tasks", risk: "YELLOW", scope: "tasks:write",
    description: "Set rich task metadata on any todo block: priority(urgent|high|medium|low), assignee, dueAt(ISO), labels[], recurrence, parent_task_id — pass null to clear a field. Works on legacy tasks too.",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { type: "string" },
        priority: { type: "string", enum: ["urgent", "high", "medium", "low"] },
        assignee: { type: "string" },
        dueAt: { type: "string" },
        labels: { type: "array", items: { type: "string" } },
        recurrence: { type: "string" },
        parent_task_id: { type: "string" },
      },
      required: ["task_id"],
    },
    async handler(args, key) {
      const { task_id, ...meta } = args;
      return taskCap.update(key.user_id, String(task_id), meta);
    },
  },
];

export const TOOLS_V5: ToolDef[] = [
  ...workspaceTools,
  ...templateTools,
  ...dashboardTools,
  ...agentRunTools,
  ...automationRunTools,
  ...webhookTools,
  ...platformExtrasTools,
];
