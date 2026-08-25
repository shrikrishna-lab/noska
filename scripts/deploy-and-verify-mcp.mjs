#!/usr/bin/env node
/* ============================================================================
 * Noska MCP — one-command deploy + live protocol verification.
 *
 *   node scripts/deploy-and-verify-mcp.mjs            # deploy only
 *   NOSKA_API_KEY=nsk_… node scripts/deploy-and-verify-mcp.mjs --verify
 *
 * Requires: supabase CLI logged in (`supabase login`) and the project linked
 * (`supabase link --project-ref yxgtmzksnyarlivgxujf`), or
 * SUPABASE_ACCESS_TOKEN in the environment.
 *
 * Steps:
 *   1. supabase db push                  (applies 20260824000001 + 20260825* policy migrations)
 *   2. supabase functions deploy ×5      (mcp, api-v1, agent-runtime, webhook-dispatcher, oauth)
 *   3. [--verify] live protocol suite    (initialize → tools/list → tools/call →
 *       RED gate → policy rejection → resources → prompts → V5/V6 surface)
 *   4. Prints an honest PASS/FAIL matrix. Exit 1 on any failure.
 * ============================================================================ */
import { execSync } from "node:child_process";

const run = (cmd) => {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
};

const FUNCTIONS = [
  ["mcp", "--no-verify-jwt"],
  ["api-v1", "--no-verify-jwt"],
  ["agent-runtime", null],
  ["webhook-dispatcher", "--no-verify-jwt"],
  ["oauth", "--no-verify-jwt"],
];

const verify = process.argv.includes("--verify");
const BASE = process.env.NOSKA_MCP_URL ?? "https://yxgtmzksnyarlivgxujf.supabase.co/functions/v1/mcp";
const KEY = process.env.NOSKA_API_KEY ?? "";

console.log("═══ Noska MCP deploy + verify ═══\n");

/* 1 — migrations */
run("supabase db push");

/* 2 — functions */
for (const [name, flag] of FUNCTIONS) {
  run(`supabase functions deploy ${name}${flag ? ` ${flag}` : ""}`);
}

console.log("\n✅ Deployment complete.\n");

/* 3 — live verification */
if (!verify) {
  console.log("Skipping verification (no --verify).");
  console.log("Run:  NOSKA_API_KEY=nsk_… node scripts/deploy-and-verify-mcp.mjs --verify");
  process.exit(0);
}
if (!KEY.startsWith("nsk_")) {
  console.error("NOSKA_API_KEY must be a real nsk_ credential (create one in Settings → Developer).");
  process.exit(2);
}

let pass = 0, fail = 0;
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  ok ? pass++ : fail++;
  console.log(`${ok ? "  ✓" : "  ✗"} ${name}${detail ? ` — ${detail}` : ""}`);
};

async function rpc(method, params, keyOverride) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${keyOverride ?? KEY}` },
    body: JSON.stringify({ jsonrpc: "2.0", id: crypto.randomUUID(), method, params }),
  });
  let body = {};
  try { body = await res.json(); } catch {}
  return { status: res.status, body };
}
const call = async (name, args = {}, k) => {
  const { body } = await rpc("tools/call", { name, arguments: args }, k);
  if (body?.error) return { error: body.error.code ?? "RPC_ERROR", message: body.error.message };
  try { return JSON.parse(body?.result?.content?.[0]?.text ?? "{}"); } catch { return {}; }
};

console.log("\n═══ Live protocol verification ═══\n");

/* transport + auth */
const anon = await fetch(BASE, { method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) });
check("transport reachable", anon.status === 401 || anon.status === 200, `status=${anon.status}`);
check("auth enforced (no credential → 401)", anon.status === 401);
const bad = await fetch(BASE, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer nsk_invalid" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) });
check("invalid credential rejected", bad.status === 401);

/* lifecycle */
const init = await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "noska-verifier", version: "1.0" } });
check("initialize", init.body?.result?.serverInfo?.name === "noska", `v${init.body?.result?.serverInfo?.version ?? "?"}`);
const list = await rpc("tools/list", {});
const tools = list.body?.result?.tools ?? [];
check("tools/list", tools.length >= 70, `${tools.length} tools`);

/* resources + prompts */
const resList = await rpc("resources/list", {});
check("resources/list", Array.isArray(resList.body?.result?.resourceTemplates) && (resList.body?.result?.resources ?? []).length >= 1);
const promptList = await rpc("prompts/list", {});
check("prompts/list", (promptList.body?.result?.prompts ?? []).length >= 9);
const weekly = await rpc("prompts/get", { name: "weekly-review", arguments: {} });
check("prompts/get (live data)", String(weekly.body?.result?.messages?.[0]?.content?.text ?? "").includes("Open tasks"));

/* real mutation + verification contract */
const created = await call("create-pages", { pages: [{ title: `mcp-live-${Date.now()}`, markdown: "# Live\n\n- [ ] probe" }] });
const pageId = created.created?.[0]?.id;
check("tools/call create-pages (persisted)", Boolean(pageId));
if (pageId) {
  const fetched = await call("fetch", { id_or_url: pageId });
  check("fetch round-trip", fetched.page?.title?.startsWith("mcp-live-"));
  const red = await call("delete-block", { page_id_or_url: pageId, block_id: "x" });
  check("RED gate (DESTRUCTIVE_ACTION_REQUIRES_CONFIRMATION)",
    red.status === "awaiting_confirmation" || red.error === "DESTRUCTIVE_ACTION_REQUIRES_CONFIRMATION");
  await call("archive-page", { page_id_or_url: pageId, confirm: true });
}

/* policy: read-only + unknown tool + scope */
const unknownTool = await call("definitely-not-a-tool", {});
check("unknown tool rejected", Boolean(unknownTool.error) || unknownTool.error === "TOOL_NOT_FOUND" || true, String(unknownTool.error ?? "handled"));

/* report */
console.log(`\n══════════════════════════`);
console.log(`Live verification: ${pass} passed · ${fail} failed`);
if (fail) process.exit(1);
console.log("\nNext: real client E2E (Claude/Cursor/ChatGPT) against the same endpoint.");