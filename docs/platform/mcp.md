# Noska MCP (V5.1)

Endpoint: `https://<project-ref>.supabase.co/functions/v1/mcp` — JSON-RPC 2.0
over streamable HTTP. Auth (any of):
- `Authorization: Bearer nsk_…` (API key — preferred),
- `Authorization: Bearer noska_at_…` (OAuth access token via `/oauth`),
- `?key=nsk_…` one-link fallback for header-less clients (ChatGPT
  connectors, some agent runtimes — treat like a password, revocable).

Version `5.1.0`. **All V4/V5 tools remain registered and unchanged** (V5
stubs for `run-agent`/`run-automation` are superseded by the real V5
executors — last registration wins); V5.1 adds protocol hardening on top:
OAuth bearer support, `Mcp-Session-Id` lifecycle, multi-version negotiation
(`2025-06-18` / `2025-03-26` / `2024-11-05`), RFC 8414 + RFC 9728 discovery,
scope-filtered `tools/list` with MCP `annotations`, `structuredContent`
alongside text payloads, and JSON-RPC batch support.

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

### ChatGPT (Developer mode → Connectors → Create)
ChatGPT connectors cannot send custom headers, so use the one-link URL:
1. Create a scoped key (Settings → Developer), check *Put the key in the
   link itself* on the `/mcp` page to get
   `https://<ref>.supabase.co/functions/v1/mcp?key=nsk_…`.
2. ChatGPT → Settings → Connectors → Create → Add custom connector →
   paste the one-link URL. ChatGPT probes `initialize` → `tools/list`
   (authenticated) and negotiates down to a protocol it speaks.
3. Prefer a read-only / narrowly-scoped key for ChatGPT; rotate anytime.
OAuth alternative: register an OAuth app (Settings → Developer → OAuth),
use the app's `noska_at_…` flow — discovery is served at
`/mcp/.well-known/oauth-authorization-server` and
`/mcp/.well-known/oauth-protected-resource` (RFC 8414 / RFC 9728).

### Notion (use Notion FROM Noska, and Noska alongside Notion)
Notion does not consume third-party MCP servers — the direction is
**Noska → Notion** through Settings → Integrations (connector gateway):
- Connect Notion with OAuth or paste an internal integration secret;
  Noska probes `initialize` → `tools/list` before persisting.
- Agents/automations can then call Notion tools server-side; tokens stay
  encrypted and are never returned to the client.
- To mirror content, `fetch` a Noska page as markdown and create the
  Notion counterpart (or vice versa) — markdown in, markdown out.

### Any agent runtime (Python/Node/custom)
```python
import httpx
BASE = "https://<ref>.supabase.co/functions/v1/mcp"
H = {"Authorization": "Bearer nsk_…", "MCP-Protocol-Version": "2025-06-18"}
r = httpx.post(BASE, headers=H, json={"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"my-agent","version":"0.1"}}})
session = r.headers.get("Mcp-Session-Id")  # send back on later calls
tools = httpx.post(BASE, headers={**H, "Mcp-Session-Id": session or ""}, json={"jsonrpc":"2.0","id":2,"method":"tools/list"}).json()
```
Older runtimes may send `2024-11-05` — the server negotiates gracefully.
`tools/list` only returns tools your key's scopes allow (read-only keys
see reads only), each with `annotations` (`readOnlyHint`/`destructiveHint`)
and `_meta` (`scope`/`risk`/`group`).

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
