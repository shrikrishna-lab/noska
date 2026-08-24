# Noska Platform V5 — Developer & Integrations Platform

V5 evolves Noska into a programmable, AI-native, extensible platform on top of
ONE canonical capability layer.

```
                         NOSKA
                           │
            ┌──────────────┴──────────────┐
            │                             │
   CORE CAPABILITY LAYER         INTELLIGENCE LAYER
   supabase/functions/_shared    agent-runtime Edge Function
   ├─ core/pure.ts               ├─ planner → context → tools
   │  (zero-dep domain logic)    ├─ permission gate (auto/approval)
   │  core/runtime.ts            ├─ execution → verification
   │  (auth, verify, events)     └─ durable runs + event trace
   └─ capabilities/
      content.ts · platform.ts · intelligence.ts
            │                             │
            └──────────────┬──────────────┘
                           │
                 DEVELOPER PLATFORM
        ┌──────────┬─────────┼──────────┬─────────┐
      API v1       MCP      Plugins   Webhooks     SDK
  api-v1 fn     mcp fn    registry   dispatcher  @noska/sdk
```

**The one rule:** every interface is a thin adapter over `_shared/capabilities/*`.
There is exactly one `createTask`, one `createPage`, one `runAgent` — used by
the Web UI data path, API, MCP, agents and automations alike.

## Surfaces

| Surface | Role | Entry |
|---|---|---|
| API v1 | universal programmatic interface | `supabase/functions/api-v1` |
| MCP | AI-native interface (Claude, Cursor…) | `supabase/functions/mcp` |
| Plugins | extension/integration mechanism | registry tables + capability gate |
| Webhooks | event delivery to external systems | `webhook-dispatcher` fn |
| SDK | developer convenience layer | `sdk/typescript` |
| Agent Runtime | intelligent execution | `agent-runtime` fn |
| Automation Engine | scheduled/event-driven execution | Trigger.dev → runtime |

## What's implemented in V5 (honest matrix)

**Core**
- ✅ Canonical capability layer (`_shared/core`, `_shared/capabilities`) — API v1 and all new MCP tools delegate to it; legacy MCP tools consume the shared primitives via the compat shim.
- ✅ Real workspaces: members/roles/settings/archive/slug; `workspace_id` on pages/agents/automations/templates/dashboards; persisted key-level default workspace (`switch-workspace`).
- ✅ Persistent templates incl. real instantiation (pages with blocks, child pages, tasks, databases, dashboards, agents) with per-step results.
- ✅ Persistent dashboards (sections/widgets/data sources/filters/layout) — configuration storage + read surfaces.
- ✅ Rich task metadata: priority, assignee, dueAt, labels, recurrence, parent_task_id, completedAt, createdBy — backward compatible over existing todo blocks.
- ✅ Server-authoritative agent execution via the fixed `agent-runtime`; runs inspectable/cancellable/retriable from API & MCP.
- ✅ Server-side automation execution (Trigger.dev scheduler → runtime) now exposed through run/cancel/retry/inspect tools & routes.
- ✅ Event bus (`noska_events`) fed by DB triggers + capability emissions + runtime completion.
- ✅ Outgoing webhooks: https-only endpoints, encrypted-at-rest signing secrets, HMAC-SHA256 signed deliveries, retries w/ backoff, auto-disable after 20 consecutive failures, test + rotate flows.
- ✅ OAuth framework: apps, exact-match redirect allowlists, authorization codes (10-min TTL, single-use), PKCE S256, refresh rotation, revocation.
- ✅ Plugin framework: validated manifests, verified-registry gating, explicit per-permission grants, installation lifecycle, auditable plugin runs, connected accounts.
- ✅ Audit log (`developer_audit_log`) for API/MCP/plugin/webhook/oauth events.
- ✅ Rate limiting (per key, fixed window) on API v1; idempotency replay cache shared by API and MCP.
- ✅ TypeScript SDK foundation with retries, idempotency keys, pagination, typed errors.

**Not yet implemented (do not assume otherwise)**
- ❌ Plugin sandbox that executes third-party code — the registry/gate/audit exist; external provider tool execution ships per-plugin once credentials are safe.
- ❌ First-party providers (GitHub/Google/Slack/Discord/Linear) — connected-account framework ready, no tokens flow yet.
- ❌ OAuth consent UI page in the web app (backend flow complete).
- ❌ Per-surface rate-limit buckets (API/MCP share a per-key budget today).
- ❌ Marketplace UI states beyond install lifecycle persistence.

## Deployment order

1. Apply migration: `supabase/migrations/20260824000001_platform_v5_core.sql`
2. Set secrets: `WEBHOOK_ENCRYPTION_KEY` (32+ chars), ensure `AGENT_RUNTIME_SECRET` exists.
3. Deploy functions:
   ```
   supabase functions deploy api-v1 --no-verify-jwt
   supabase functions deploy mcp --no-verify-jwt
   supabase functions deploy agent-runtime
   supabase functions deploy webhook-dispatcher --no-verify-jwt
   supabase functions deploy oauth --no-verify-jwt
   ```
4. Deploy Trigger.dev jobs (`npx trigger deploy`) — includes the new webhook dispatcher cron.

## Testing

- `npm test` — 195 vitest tests including the new `src/platform/__tests__` suites (capability core, task metadata, templates, webhook signing, plugin manifests, OAuth/PKCE, SDK contract).
- `node scripts/check-edge-syntax.mjs supabase/functions` — parse-checks every edge function.
- `node scripts/noska-mcp-regression.mjs` — live regression suite (successor of V2/V4) against a deployed server.
- `node scripts/noska-v5-acceptance.mjs --webhook` — Phase 38–42 acceptance flows against a deployed environment.

Both live suites skip honestly when environment variables are not configured.
