# Noska Webhooks

Outgoing webhooks deliver canonical Noska events to your endpoints as signed
HTTP POSTs with automatic retries.

## Lifecycle

```
mutation / runtime event
        │
        ▼
   noska_events  (event bus; DB triggers + capability layer + agent runtime)
        │            webhook-dispatcher (every minute, idempotent fan-out)
        ▼
noska_webhook_deliveries  ──► signed POST ──► 2xx ⇒ delivered
        ▲                            │
        └── retry w/ backoff ◄───────┘ (1m · 5m · 30m · 2h · 6h → dead)
```

## Manage endpoints

| Action | Route |
|---|---|
| Create | `POST /webhooks { url, events[], description? }` |
| List | `GET /webhooks` |
| Update | `PATCH /webhooks/:id` |
| Delete | `DELETE /webhooks/:id` |
| Test | `POST /webhooks/:id/test` |
| Rotate secret | `POST /webhooks/:id/rotate` |
| Deliveries | `GET /webhooks/:id/deliveries` |

MCP equivalents: `list-webhooks`, `create-webhook`, `update-webhook`,
`delete-webhook` (confirm:true), `rotate-webhook-secret`, `test-webhook`,
`list-webhook-deliveries`.

Rules enforced server-side:
- **https only**, no localhost/.local targets (SSRF guard)
- subscribed events validated against the event vocabulary
- signing secret shown **exactly once** at create/rotate; stored AES-GCM
  encrypted (`WEBHOOK_ENCRYPTION_KEY`) and never returned again
- after 20 consecutive failures an endpoint auto-disables

## Payload contract

```json
{
  "event_id": "uuid",
  "event_type": "task.completed",
  "timestamp": "2026-08-24T10:00:00.000Z",
  "workspace_id": "",
  "actor": "user-id",
  "entity": "task",
  "entity_id": "block-uuid",
  "data": { "page_id": "…", "text": "…" }
}
```

Headers:

| Header | Value |
|---|---|
| `X-Noska-Event-Id` | event uuid (use for dedupe/replay protection) |
| `X-Noska-Event-Type` | e.g. `task.completed` |
| `X-Noska-Timestamp` | ISO timestamp of THIS delivery attempt |
| `X-Noska-Signature` | `sha256=<hex>` of HMAC-SHA256 over `${timestamp}.${rawBody}` |
| `X-Noska-Delivery` | delivery uuid |

## Verifying signatures (Node example)

```js
import crypto from "node:crypto";

app.post("/hooks/noska", express.raw({ type: "*/*" }), (req, res) => {
  const timestamp = req.header("x-noska-timestamp");
  const signature = req.header("x-noska-signature");

  // replay guard: reject deliveries older than 5 minutes
  if (Math.abs(Date.now() - Date.parse(timestamp)) > 5 * 60_000) return res.sendStatus(400);

  const expected = "sha256=" +
    crypto.createHmac("sha256", process.env.NOSKA_WEBHOOK_SECRET)
      .update(`${timestamp}.${req.body.toString()}`)
      .digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    return res.sendStatus(401);
  }

  const event = JSON.parse(req.body.toString());
  // dedupe on event.event_id, then handle…
  res.sendStatus(200);
});
```

## Event types

`page.created page.updated page.archived page.restored`
`task.created task.updated task.completed`
`study.card.created review.due`
`agent.run.completed agent.run.failed agent.run.cancelled`
`automation.run.completed automation.run.failed`
`workspace.created workspace.archived member.added member.removed`
`template.applied test.event`

## Delivery records

Every attempt is persisted: status (`pending delivered failed dead`),
attempt number, response status, error text, next attempt time. Inspect via
the API or MCP. Retries use exponential backoff capped at ~6h; a delivery
becomes `dead` after 5 attempts.
