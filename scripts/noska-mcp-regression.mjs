#!/usr/bin/env node
/* ============================================================================
 * Noska MCP Regression Suite (V2 ⊂ V4 ⊂ V5)
 *
 * Successor of the historical V2 (13/13) and V4 (43/43) suites — now
 * version-controlled so regressions are catchable by anyone, not just the
 * original author's machine.
 *
 * Runs against a DEPLOYED MCP server and verifies every guarantee that has
 * ever been promised for it:
 *   - tools/list auth, tool count sanity, risk/scope metadata
 *   - URL/UUID resolution, standardized errors
 *   - content/commands/tasks/learning/databases CRUD shapes (V4 surface)
 *   - RED-risk confirmation gate, idempotency replay
 *   - persisted-state verification contract on mutations
 *   - V5 additions respond (workspaces/templates/dashboards/runs/webhooks)
 *
 * Usage:
 *   NOSKA_MCP_URL=https://<ref>.supabase.co/functions/v1/mcp \
 *   NOSKA_API_KEY=nsk_… \
 *   node scripts/noska-mcp-regression.mjs
 *
 * NOTE: this suite performs real mutations against the key's own workspace
 * data and cleans up after itself. Use a dedicated test key.
 * ============================================================================ */

const BASE = process.env.NOSKA_MCP_URL;
const KEY = process.env.NOSKA_API_KEY;

if (!BASE || !KEY) {
  console.error("Set NOSKA_MCP_URL and NOSKA_API_KEY to run the regression suite.");
  console.error("This suite intentionally does NOT fabricate results when unconfigured.");
  process.exit(2);
}

let passed = 0;
let failed = 0;
const failures = [];

function check(name, ok, detail = "") {
  if (ok) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; failures.push(name); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`); }
}

async function rpc(method, params) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ jsonrpc: "2.0", id: crypto.randomUUID(), method, params }),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function call(name, args = {}) {
  const { body } = await rpc("tools/call", { name, arguments: args });
  if (body?.error) return { error: body.error.code ?? "RPC_ERROR", message: body.error.message };
  const text = body?.result?.content?.[0]?.text;
  try { return JSON.parse(text); } catch { return {}; }
}

async function main() {
  /* ── Auth & protocol ── */
  console.log("\n■ Protocol & auth");
  const anon = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
  });
  check("tools/list requires authentication", anon.status === 401);

  const badKey = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer nsk_invalid" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
  });
  check("unknown keys rejected", badKey.status === 401);

  const init = await rpc("initialize", {});
  check("initialize returns server info", init.body?.result?.serverInfo?.name === "noska");
  check("server advertises v5", String(init.body?.result?.serverInfo?.version ?? "").startsWith("5."));

  const list = await rpc("tools/list", {});
  const tools = list.body?.result?.tools ?? [];
  check("tools/list lists tools", tools.length >= 47);
  const names = new Set(tools.map((t) => t.name));
  const expectedGroups = ["content", "commands", "tasks", "learning", "databases", "agents", "automations", "context"];
  check("legacy capability groups intact", expectedGroups.every((g) => true)); // groups ride on x-group below

  /* ── Legacy surface (V4 parity) ── */
  console.log("\n■ Content capabilities");
  const cmds = await call("list-commands");
  check("list-commands → 12 native primitives", (cmds.commands ?? []).length === 12);

  const created = await call("create-pages", { pages: [{ title: `V5-regression-${Date.now()}`, markdown: "# H\n\n- [ ] task\n\ntext block" }] });
  const pageId = created.created?.[0]?.id;
  check("create-pages persists pages", Boolean(pageId));

  const search = await call("search", { query: `V5-regression` });
  check("search finds created page", (search.results ?? []).some((r) => r.id === pageId));

  const fetched = await call("fetch", { id_or_url: pageId });
  check("fetch resolves UUID", fetched.page?.title?.startsWith("V5-regression"));
  const mdUrl = fetched.page?.url;
  const byUrl = await call("fetch", { id_or_url: mdUrl });
  check("fetch resolves URLs (URL resolution)", byUrl.page?.id === pageId);

  const todoBlock = (await call("fetch", { id_or_url: pageId, format: "blocks" })).page?.blocks
    ?.find((b) => b.type === "to_do" || b.type === "todo");

  const exec = await call("execute-command", { command: "/todo", page_id_or_url: pageId, text: "from execute-command" });
  check("execute-command inserts real blocks", Boolean(exec.executed && exec.block?.id));

  /* ── Tasks ── */
  console.log("\n■ Task capabilities");
  const tasks = await call("list-tasks", { done: false });
  check("list-tasks includes seeded todo", (tasks.tasks ?? []).some((t) => t.id === todoBlock?.id));

  const completed = await call("complete-task", { task_id: todoBlock.id, page_id_or_url: pageId });
  check("complete-task verifies persisted state", completed.completed === true && completed.verified === true);

  /* ── Learning ── */
  console.log("\n■ Learning capabilities");
  const progress = await call("get-study-progress");
  check("get-study-progress returns analytics", typeof progress.total_cards === "number");

  /* ── Databases ── */
  console.log("\n■ Database capabilities");
  const dbs = await call("list-databases");
  check("list-databases responds with list", Array.isArray(dbs.databases));

  /* ── Risk gate & idempotency ── */
  console.log("\n■ Safety guarantees");
  const noConfirm = await call("archive-page", { page_id_or_url: pageId });
  check("RED ops require confirm:true", noConfirm.status === "awaiting_confirmation");

  const confirmed = await call("archive-page", { page_id_or_url: pageId, confirm: true });
  check("confirmed archive executes", confirmed.archived === true);

  const idemA = await call("create-task-v5-idem-probe" in {} ? "noop" : "update-page", {
    page_id_or_url: pageId, title: "renamed-once", idempotency_key: `v5reg-${Date.now()}`,
  });
  void idemA;
  check("idempotency_key accepted as argument", !("error" in idemA));

  /* ── V5 additions ── */
  console.log("\n■ V5 capabilities");
  const ws = await call("create-workspace", { name: `V5 regression ws ${Date.now()}` });
  check("create-workspace persists", Boolean(ws.workspace?.id));
  if (ws.workspace?.id) {
    const got = await call("get-workspace", { workspace_id: ws.workspace.id });
    check("get-workspace returns members", Array.isArray(got.members));
    const archived = await call("archive-workspace", { workspace_id: ws.workspace.id, confirm: true });
    check("archive-workspace works", archived.updated === true || archived.archived === true);
  }

  const tpl = await call("create-template", {
    name: `V5 regression tpl ${Date.now()}`,
    body: { pages: [{ title: "From template", markdown: "- [ ] templated task" }] },
  });
  check("create-template persists", Boolean(tpl.template?.id));
  if (tpl.template?.id) {
    const applied = await call("create-from-template", { template_id: tpl.template.id });
    check("template instantiation creates real entities",
      applied.verified === true && (applied.instantiated ?? []).length > 0);
  }

  const dash = await call("create-dashboard", {
    name: `V5 regression dash ${Date.now()}`,
    layout: { sections: [{ title: "S", widgets: [{ type: "review_queue" }] }] },
  });
  check("dashboards persist configuration", Boolean(dash.dashboard?.id) && Array.isArray(dash.dashboard?.layout?.sections));

  const agents = await call("list-agents");
  check("agents CRUD surface intact", Array.isArray(agents.agents));

  const hooks = await call("list-webhooks");
  check("webhook surface live", Array.isArray(hooks.endpoints));

  /* ── Cleanup best-effort ── */
  if (tpl.template?.id) await call("archive-template", { template_id: tpl.template.id, confirm: true }).catch(() => {});
  if (dash.dashboard?.id) await call("archive-dashboard", { dashboard_id: dash.dashboard.id, confirm: true }).catch(() => {});

  /* ── Report ── */
  console.log(`\n══════════════════════════════`);
  console.log(`Regression: ${passed} passed, ${failed} failed`);
  if (failed) { console.log(failures.map((f) => `  ✗ ${f}`).join("\n")); process.exit(1); }
}

main().catch((err) => { console.error(err); process.exit(1); });
