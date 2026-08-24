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
