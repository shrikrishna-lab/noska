# @noska/sdk (TypeScript)

Location: [`sdk/typescript`](../../sdk/typescript). Zero dependencies, Node 18+
and modern browsers. Wraps `/api/v1`.

```ts
import { Noska } from "@noska/sdk";

const noska = new Noska({
  apiKey: process.env.NOSKA_API_KEY!,
  baseUrl: "https://<project-ref>.supabase.co/functions/v1/api-v1",
});
```

## Features
- **Typed resources** — pages, tasks, reviews, search, workspaces, templates,
  dashboards, events, agents (+runs), automations (+runs), webhooks, connections
- **Retries** — automatic on 429/5xx with exponential backoff; honors `Retry-After`
- **Idempotency** — pass `idempotencyKey` on writes → sent as `Idempotency-Key`
- **Pagination** — `for await (const page of noska.paginate("/pages")) { … }`
- **Errors** — `NoskaError` with `status`, `code`, `extra`, `rateLimit`

## Examples

```ts
// pages
const page = await noska.pages.create({ title: "Meeting notes", icon: "📝" });
const blocks = await noska.pages.listBlocks(page.data.id!, "todo");

// rich tasks
await noska.tasks.create({ page_id: page.data.id as string, text: "Ship V5",
  priority: "high", dueAt: "2026-09-01T09:00:00Z" }, "idem-42");

// workspaces + templates
const ws = await noska.workspaces.create({ name: "Semester 5", icon: "🎓" });
const applied = await noska.templates.instantiate(templateId, { workspace_id: ws.data.id });
if (!applied.data.verified) console.error(applied.data.failed_steps);

// server-side agent execution
const run = await noska.agents.run(agentId, {
  input: { focus: "overdue reviews" },
  confirmation_mode: "approval",
  idempotency_key: `daily-${new Date().toISOString().slice(0, 10)}`,
});
const record = await noska.agentRuns.get(run.data.runId!);
console.log(record.data.run.status, record.data.events.length, "events");

// webhooks
const hook = await noska.webhooks.create({
  url: "https://example.com/hooks/noska",
  events: ["task.completed", "agent.run.completed"],
});
console.log("store this now:", hook.data.signing_secret); // shown once

// event bus
for await (const ev of noska.paginate<{ id: string; type: string }>("/events",
  { query: { type: "task.completed" }, pageSize: 50 })) {
  console.log(ev.id, ev.type);
}
```

## Error handling

```ts
try {
  await noska.tasks.create({ page_id: p, text: "x" });
} catch (e) {
  if (e instanceof NoskaError && e.code === "insufficient_scope") {
    // key lacks tasks:write — least privilege in action
  }
}
```

A Python SDK is planned after the TypeScript surface stabilizes.
