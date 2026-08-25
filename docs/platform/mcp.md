# Noska MCP (V5)

Endpoint: `https://<project-ref>.supabase.co/functions/v1/mcp` — JSON-RPC 2.0
over streamable HTTP. Auth: `Authorization: Bearer nsk_…`.

Version `5.0.0`. **All V4 tools remain registered and unchanged**; V5 adds the
new server capabilities on top.

## Tool map

### Legacy surface (V4, preserved)
| Group | Tools |
|---|---|
| content | search · fetch · create-pages · update-page · archive-page · restore-page · duplicate-page · move-page · list-pages · list-child-pages · get-parent-page · get-page-tree |
| commands | list-commands · search-commands · get-command · execute-command |
| tasks | list-tasks · create-task · update-task · complete-task · reopen-task · bulk-update-tasks |
| learning | list-reviews · add-study-card · reschedule-review · get-study-progress · create-study-plan |
| databases | list-databases · get-database · query-database · create-row · update-row · create-view |
| agents | list-agents · get-agent · create-agent · update-agent · archive-agent |
| automations | list-automations · create-automation · update-automation · archive-automation |
| context/system | get-workspace-context · get-current-context · verify |

### New in V5
| Group | Tools | Scope |
|---|---|---|
| workspace | list-workspaces · get-workspace · create-workspace · update-workspace · archive-workspace · switch-workspace | workspaces:read/write |
| templates | list-templates · get-template · create-template · create-from-template · update-template · archive-template | templates:read/write |
| dashboards | list-dashboards · get-dashboard · create-dashboard · update-dashboard · archive-dashboard | dashboards:read/write |
| agents (execution) | run-agent · inspect-agent-run · cancel-agent-run · retry-agent-run · list-agent-runs | agents:run / agents:read |
| automations (execution) | run-automation · inspect-automation-run · cancel-automation-run · retry-automation-run · list-automation-runs | automations:run / automations:read |
| webhooks | list-webhooks · create-webhook · update-webhook · delete-webhook · rotate-webhook-secret · test-webhook · list-webhook-deliveries | webhooks:manage |
| events | list-events | events:read |
| connections | list-connected-accounts · disconnect-connected-account | connections:manage |
| tasks (rich) | update-task-metadata (priority/assignee/dueAt/labels/recurrence/parent) | tasks:write |

> API-key management is intentionally NOT exposed through MCP. Create keys in
> the app (Settings → Developer); raw secrets are never re-displayable.

## Guarantees carried over from V4
- Every JSON-RPC method requires a valid key (`tools/list` included)
- GREEN/YELLOW/RED risk gates; RED ops require `confirm:true`
- Owner-scoped queries everywhere (IDOR-safe), URL/UUID resolution
- Mutations verified against persisted state (`verified: true/false`)
- Optional `idempotency_key` argument replays cached responses for 24 h
- Standardized errors `{ error, message }`

## Connecting clients

### Claude Desktop / Claude Code (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "noska": {
      "url": "https://<project-ref>.supabase.co/functions/v1/mcp",
      "headers": { "Authorization": "Bearer nsk_your_key" }
    }
  }
}
```
Or with `claude mcp add`:
```bash
claude mcp add --transport http noska https://<project-ref>.supabase.co/functions/v1/mcp \
  --header "Authorization: Bearer nsk_your_key"
```

### Cursor (`.cursor/mcp.json`)
```json
{
  "mcpServers": {
    "noska": {
      "url": "https://<project-ref>.supabase.co/functions/v1/mcp",
      "headers": { "Authorization": "Bearer nsk_your_key" }
    }
  }
}
```

## Example session (Phase 40 acceptance)

> "Search my distributed systems notes, create a study card, create a review
> task for tomorrow, and tell me what I should study first."

The model chains: `search` → `fetch` → `add-study-card` → `create-task` →
`get-study-progress`, every mutation returning ids + verification.

> "Run my Study Guardian agent."

→ `run-agent` → server-side Agent Runtime (planner → permission gate → tools
→ verification) → `inspect-agent-run` for the full trace.

## One-link connection (header-less clients)

The endpoint also accepts the key as a URL parameter for clients that cannot
send custom headers (ChatGPT connectors, some agent runtimes):

```
https://<ref>.supabase.co/functions/v1/mcp?key=nsk_…
```

Prefer the Authorization header wherever possible; treat `?key=` links like
passwords (revocable in Settings → Developer).

## One-click installs

- **Cursor** — `cursor://anysphere.cursor-deeplink/mcp/install?name=Noska&config=<base64url json>`
- **VS Code** — `vscode:mcp/install?<base64url json>`
- **Claude Code** — `claude mcp add --transport http noska <url> --header "Authorization: Bearer nsk_…"`
- **Any stdio client** — `npx -y mcp-remote <url>`

The /mcp page builds all of these personalized to your key, entirely client-side.

---

## Production policy layer (v5.1)

Every `tools/call` passes one authorization choke point
(`_shared/mcp/policy.ts`) before any handler runs:

```
authenticate → resolve tool → POLICY → RATE LIMIT → EXECUTION BUDGET
→ handler → VERIFY → AUDIT
```

**Credential controls** (set when creating a key, Settings → Developer):

| Control | Behavior |
|---|---|
| Scopes | Gate tool families (`learning:* ≡ reviews:*`) |
| **Read-only** | Refuses every mutating tool; read/search/list still work |
| **Tool allowlist** | Comma-separated tool names; empty = all scope-permitted tools |

**Workspace roles** are respected for workspace-scoped tools:
`viewer → read only`, `member → read+write`, `admin/owner → administration`.
Non-members are denied (`WORKSPACE_ACCESS_DENIED`) — a workspace id supplied
by an AI client is never trusted without membership.

**Rate limits**: 120 req/min/credential (shared with the REST API budget,
`RATE_LIMITED` + `retry_after_seconds`). Execution tools (`run-agent`,
`run-automation`, `noska_execute`) additionally cap at **20 executions/hour**
(`EXECUTION_LIMIT`).

**Audit**: every tool call writes `developer_audit_log` — tool, ok/fail,
error code, latency, client user-agent, request id. Never secrets, never
full arguments.

**Structured errors** (§ contract): `AUTH_REQUIRED · TOKEN_EXPIRED ·
TOKEN_REVOKED · WORKSPACE_NOT_FOUND · WORKSPACE_ACCESS_DENIED ·
INSUFFICIENT_SCOPE · READ_ONLY_CREDENTIAL · TOOL_NOT_ALLOWED · ROLE_FORBIDDEN
· RATE_LIMITED · EXECUTION_LIMIT · DESTRUCTIVE_ACTION_REQUIRES_CONFIRMATION ·
VALIDATION_ERROR · NOT_FOUND · TOOL_FAILED`

## Resources & Prompts (MCP protocol)

- `resources/list` → `noska://workspace/current` + templates
  `noska://page/{id}` (markdown), `noska://agent/{id}`, `noska://automation/{id}`
- `resources/read?uri=…` → owner-scoped content, same policy as tools
- `prompts/list` → `summarize-workspace`, `weekly-review`,
  `find-overdue-tasks`, `organize-notes`, `plan-project`, `meeting-to-tasks`
- `prompts/get` → assembled messages; workspace/weekly/overdue prompts embed
  **live data** (open tasks, due study cards, workspace snapshot)

## Agentic tools

- **`noska_execute`** — you plan, Noska executes. Up to 12 declared steps
  (`search · create_page · create_task · update_page · append_blocks`),
  each authorized through the capability layer, persisted as a durable
  execution record (`agent_runs`, source `ai`), returning an honest summary:
  `{ execution_id, status, summary:{steps_executed, pages_created,
  tasks_created, …}, executed[], failed[] }`. Destructive actions are
  unavailable by design — use dedicated tools with `confirm:true`.
- **`ask-noska`** — agent delegation: route a question to one of your agents
  through the server runtime (needs `intelligence:execute` scope + BYOK
  configured). Returns `run_id` → `inspect-agent-run`.
- **`summarize-page` / `extract-tasks`** — deterministic intelligence:
  structured summaries and task-candidate detection. No model, no
  hallucination; creation stays an explicit `create-task` call.

## New tools in v5.1

`get-current-workspace · get-workspace-members · append-blocks · get-block ·
update-block · delete-block · bulk-archive-pages · summarize-page ·
extract-tasks · ask-noska · noska_execute`

## Honest limitations

- OAuth-style MCP authorization (client discovery + token exchange) is not
  wired yet — keys + `?key=` links are the connection paths today. The OAuth
  app framework exists for the REST API.
- `semantic_search` / `hybrid_search` are not exposed (no embedding
  infrastructure); keyword `search` is the honest surface.
- The canonical endpoint is the Supabase function URL; a `mcp.noska.dev`
  alias needs a DNS/proxy change outside this repo.
- Per-client connection registry UI (connected-clients list) is pending;
  per-credential restrictions already cover the underlying control.

---

## Canonical production host

```
https://mcp.noska.me/mcp
```

Routing layer: Vercel proxies `/mcp`, `/.well-known/oauth-*` and `/oauth/*`
to the Supabase MCP/OAuth functions (see `vercel.json` rewrites). To go live:

1. DNS: `CNAME mcp.noska.me -> cname.vercel-dns.com`
2. Vercel dashboard → add domain `mcp.noska.me` to the project (TLS is automatic)
3. Verify: `curl https://mcp.noska.me/mcp` → MCP metadata JSON

The Supabase endpoint remains valid for backward compatibility.

## OAuth for MCP (authorization spec)

Standards-shaped flow using the existing Noska identity:

```
client → GET /.well-known/oauth-protected-resource   (resource metadata)
       → GET /.well-known/oauth-authorization-server (server metadata)
       → POST /oauth/register                        (RFC 7591 dynamic registration)
       → GET  /oauth/authorize?…code_challenge…      (Noska login + consent)
       → POST /oauth/token                           (code + PKCE → tokens)
       → Bearer noska_at_… on /mcp
```

- Dynamic registration accepts `https`, RFC 8252 loopback and custom-scheme
  redirects; defaults to least-privilege scopes (`pages:read search:read`).
- Tokens are the existing `oauth_tokens` lifecycle: PKCE S256, single-use
  10-min codes, refresh rotation, revocation.
- **Consent screen**: the authorize endpoint requires a Noska session; the
  browser consent UI (workspace + scope picker) is the remaining build.
  Until it ships, key-based connection is the complete path.

## Verification status (honest matrix)

| Check | Status |
|---|---|
| Protocol: initialize / tools/list / tools/call / resources / prompts | ✅ implemented, unit-tested — **live verification pending deploy** |
| Policy engine / scopes / roles / read-only / allowlists | ✅ shipped + tested |
| Rate limits + execution budgets + audit | ✅ shipped |
| OAuth metadata, DCR, token lifecycle, bearer auth on MCP | ✅ shipped |
| OAuth consent UI | ⏳ pending |
| mcp.noska.me DNS + TLS | ⏳ pending (routing prepared in vercel.json) |
| ChatGPT / Claude / Cursor / OpenCode live E2E | ⏳ pending deploy |
| Files tools | ❌ not exposed (no storage surface yet) |
| semantic/hybrid search | ❌ feature-gated (no embeddings) |
