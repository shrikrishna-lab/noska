# Noska API v1

Base URL: `https://<project-ref>.supabase.co/functions/v1/api-v1`

## Authentication

```
Authorization: Bearer nsk_…
```

Create keys in-app (**Settings → Developer → API Keys**, or the API Console).
Keys are stored as SHA-256 hashes; the raw key is shown exactly once. Keys
carry scopes, an optional expiry, and a persisted default workspace.

OAuth access tokens (`noska_at_…`) authenticate with the same header on
routes whose scopes were consented.

## Conventions

| Concern | Behavior |
|---|---|
| Envelope | `{ "data": …, "meta": { limit, offset, has_more, total? } }` |
| Errors | `{ "error": { "code": "…", "message": "…" } }` with meaningful HTTP status |
| Rate limit | 60 req/min/key; `X-RateLimit-Limit/Remaining/Reset` headers, `429` + `Retry-After` when exceeded |
| Idempotency | Send `Idempotency-Key` on POSTs; identical retries replay the cached response for 24 h (`Idempotency-Replayed: true`) |
| Versioning | `X-Noska-API-Version: 2026-08-24` |

### Scopes

Content: `pages:read` `pages:write` `databases:read` `databases:write`
`tasks:read` `tasks:write` `reviews:read` `reviews:write` (alias `learning:*`)
`search:read`

Platform: `workspaces:read/write` · `templates:read/write` ·
`dashboards:read/write` · `events:read`

Intelligence: `agents:read/write/run` · `automations:read/write/run`

Delivery & integrations: `webhooks:manage` · `connections:manage`

## Resources

### Content (V1 surface — unchanged contracts)
- `GET/POST /pages`, `GET/PATCH/DELETE /pages/:id`, `GET /blocks?page_id=`
- `GET /databases`, `GET /databases/:id`
- `GET/POST /tasks`, `PATCH /tasks/:blockId` — task bodies now accept rich metadata:
  ```json
  { "priority": "high", "assignee": "lena", "dueAt": "2026-09-01T09:00:00Z",
    "labels": ["os","exam"], "recurrence": "weekly mon",
    "parent_task_id": null }
  ```
  Pass explicit `null` to clear a field. Legacy tasks keep working unchanged.
- `GET/POST /reviews`, `POST /reviews/rate`, `DELETE /reviews/:blockId?page_id=`
- `POST /search` or `GET /search?q=`

### Workspaces
```bash
curl -X POST "$API/workspaces" -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"Semester 5","icon":"🎓"}'
```
- `GET /workspaces` → `{ owned:[…], shared:[…] }`
- `GET /workspaces/:id` (includes members) · `PATCH` (update/archive) · `DELETE` (archive)
- `POST /workspaces/:id/switch` → makes it the key's default workspace

### Templates
```bash
curl -X POST "$API/templates" -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Startup project", "kind": "workspace",
    "body": {
      "pages": [{ "title": "Roadmap", "markdown": "# Roadmap\n\n- [ ] Kickoff" }],
      "tasks": [{ "title": "Incorporate", "priority": "high" }],
      "dashboards": [{ "name": "Company dashboard", "layout": { "sections": [] } }]
    }
  }'
```
- `POST /templates/:id/instantiate` creates REAL entities and returns each step:
  ```json
  { "data": {
      "template": { "id": "…", "name": "Startup project" },
      "instantiated": [
        { "op": "create_page", "title": "Roadmap", "id": "…", "url": "https://app.noska.me/my-workspace/…" },
        { "op": "create_task", "title": "Incorporate", "id": "…" },
        { "op": "create_dashboard", "name": "Company dashboard", "id": "…" }
      ],
      "failed_steps": [],
      "verified": true
  }, "status": 201 }
  ```

### Dashboards
`GET/POST /dashboards` · `GET/PATCH/DELETE /dashboards/:id`.
Layout example:
```json
{ "sections": [{
    "title": "Study",
    "widgets": [
      { "type": "task_list", "filter": { "done": false } },
      { "type": "review_queue" },
      { "type": "count", "source": "tasks" }
    ]
}] }
```
Dashboards persist **configuration** that references real Noska data sources.

### Events
`GET /events?type=task.completed&since=2026-08-24T00:00:00Z` — read the event bus.
Full type list is returned in every response (`types`).

### Agents & runs
- `GET/POST /agents` · `GET/PATCH/DELETE /agents/:id`
- **Run (Phase 7 contract):**
  ```bash
  curl -X POST "$API/agents/$AGENT_ID/runs" -H "Authorization: Bearer $KEY" \
    -H "Content-Type: application/json" \
    -d '{"input":{"focus":"overdue reviews"},"confirmation_mode":"approval","idempotency_key":"daily-run-2026-08-24"}'
  ```
  → `202 { "runId": "…", "status": "running" }`
- Statuses: `queued running waiting_approval completed failed cancelled skipped timed_out waiting_retry`
- `GET /agent-runs/:id` — durable record + full event trace
- `POST /agent-runs/:id/cancel` · `POST /agent-runs/:id/retry`

Execution requires the account's background execution to be enabled
(Settings → Agent execution). When not configured, the runtime records an
honest `skipped` run with the reason instead of pretending.

### Automations & runs
Same shape as agents: `POST /automations/:id/runs`,
`GET /automation-runs/:id`, `/cancel`, `/retry`.

### Webhooks
See [webhooks.md](./webhooks.md).

### Connected accounts
`GET /connections` · `DELETE /connections/:id` (revoke). Tokens are stored
server-side only and never returned.

## Error codes

`unauthorized · invalid_key · key_revoked · key_expired · insufficient_scope · auth_required · not_found · invalid_request · validation_error · invalid_id · conflict · rate_limited · unsupported_capability · internal_error`
