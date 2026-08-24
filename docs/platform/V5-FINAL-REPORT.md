# Noska Platform V5 — Final Report

Date: 2026-08-24 · Branch state: worktree on `public-clean` (full history intact on `master` @ `183c67b`)

---

## 1. Existing capabilities reused (nothing rebuilt)

| Reused as-is | Where |
|---|---|
| MCP V4 tool registry — all 47 tools, GREEN/YELLOW/RED risk gates, `confirm:true` flow | `supabase/functions/mcp/tools.ts` |
| API key auth model (`nsk_…`, SHA-256 hashed, scopes, expiry, revocation) | `user_api_keys` + `_shared/core/runtime.ts` |
| Rate limiting (`consume_api_rate_limit` RPC, X-RateLimit-* headers) | `api-v1` |
| Idempotency replay cache (`api_idempotency_keys`, 24 h TTL) | `api-v1` + MCP `idempotency_key` arg |
| Verification contract (mutation → persisted re-read → `verified`) | `_shared/core/runtime.ts → verifyPersisted` |
| SM-2 spaced repetition scheduler parity with the app | `_shared/core/pure.ts` |
| Agent OS durable runs/events/memories/execution settings + BYOK encryption | `agent_runs`, `agent_run_events`, `agent_memories`, `agent_execution_settings` |
| Server automation scheduling (timezone-aware slots, idempotent slot reservation, retry/backoff, health streaks) | `trigger/jobs/automation-scheduler.ts` → `agent-runtime` |
| Desktop auth pairing flow | untouched |
| Slash-command primitives (12 real commands) & markdown↔blocks engine | `_shared/core/pure.ts` |

## 2. New core capabilities

- **Canonical Capability Layer** — `supabase/functions/_shared/`
  - `core/pure.ts`: zero-dependency domain logic (errors, scopes incl. `learning:* ≡ reviews:*` aliases, UUID/URL resolution, markdown↔blocks, command registry, SM-2, rich-task normalization, template planner, event vocabulary, webhook signing/replay math, plugin-manifest validation + permission gate, OAuth/PKCE primitives).
  - `core/runtime.ts`: service client, shared key auth, verification helpers, canonical `emitEvent`, audit log, webhook-secret encryption (AES-GCM).
  - `capabilities/content.ts`: pages/blocks/commands/tasks(rich)/learning/databases/search.
  - `capabilities/platform.ts`: workspaces, templates (+instantiation), dashboards, events, webhooks, connected accounts, plugins, OAuth.
  - `capabilities/intelligence.ts`: agents/automations CRUD + server-run start/inspect/cancel/retry bridging to THE agent runtime.
- **Real workspaces** (members/roles/settings/slug/archive; `workspace_id` on pages/agents/automations/templates/dashboards; per-key default workspace = persisted `switch-workspace`).
- **Persistent templates** with real instantiation: nested pages→blocks, tasks, databases, dashboards, agents; per-step results; usage counter; `template.applied` event.
- **Persistent dashboards** (sections/widgets/data sources/filters/layout stored in `noska_dashboards`).
- **Rich tasks**: priority, assignee, dueAt, labels, recurrence, parent_task_id, completedAt, createdBy — additive over legacy todo blocks; explicit-null clearing; malformed input can never corrupt existing data.
- **Event bus** (`noska_events`): fed by DB triggers (`page.created/updated/archived/restored`, `task.completed`), capability emissions, and runtime completion events.
- **Webhook platform**: https-only endpoints (SSRF guard), encrypted-at-rest signing secrets, HMAC-SHA256 signatures over `${timestamp}.${body}`, idempotent fan-out (unique endpoint×event), delivery records with backoff ladder (1m·5m·30m·2h·6h→dead), auto-disable after 20 consecutive failures, test + rotate flows.
- **OAuth framework**: apps (hashed secrets), exact-match redirect allowlists, single-use 10-min codes, PKCE S256 (RFC 7636 vector tested), refresh rotation, revocation; new `oauth` Edge Function.
- **Plugin framework**: validated manifests, verified-only installation, explicit per-permission grants (wildcards supported), lifecycle `installed/enabled/disabled/revoked`, auditable `plugin_runs`, permission gate used by every future execution path.
- **Audit logging** (`developer_audit_log`) across api/mcp/agent/automation/plugin/webhook/oauth surfaces.
- **TypeScript SDK** (`sdk/typescript`) — retries w/ Retry-After, idempotency keys, async pagination, typed `NoskaError`.
- **Developer docs** in-app via the existing console contract (`src/features/api/apiContract.ts` now documents every V5 resource and scope; ApiKeysManager picks up the new scopes automatically).

## 3. API resources added (all thin adapters over the capability layer)

```
GET/POST /workspaces        GET/PATCH/DELETE /workspaces/:id     POST /workspaces/:id/switch
GET/POST /templates         GET/PATCH/DELETE /templates/:id      POST /templates/:id/instantiate
GET/POST /dashboards        GET/PATCH/DELETE /dashboards/:id
GET /events?type=&since=
GET/POST /agents            GET/PATCH/DELETE /agents/:id
POST /agents/:id/runs       GET /agents/:id/runs                 (Phase-7 contract)
GET /agent-runs/:id         POST /agent-runs/:id/cancel          POST /agent-runs/:id/retry
GET/POST /automations       GET/PATCH/DELETE /automations/:id
POST /automations/:id/runs  GET /automations/:id/runs
GET /automation-runs/:id    POST /automation-runs/:id/cancel     POST /automation-runs/:id/retry
GET/POST /webhooks          PATCH/DELETE /webhooks/:id
POST /webhooks/:id/test     POST /webhooks/:id/rotate            GET /webhooks/:id/deliveries
GET /connections            DELETE /connections/:id
```

New scopes: `workspaces:* templates:* dashboards:* events:read agents:read/write/run automations:read/write/run webhooks:manage connections:manage`.

## 4. MCP tools added (V4 surface preserved verbatim)

27 tools: `list-workspaces get-workspace create-workspace update-workspace archive-workspace switch-workspace` · `list-templates get-template create-template create-from-template update-template archive-template` · `list-dashboards get-dashboard create-dashboard update-dashboard archive-dashboard` · `run-agent inspect-agent-run cancel-agent-run retry-agent-run list-agent-runs` · `run-automation inspect-automation-run cancel-automation-run retry-automation-run list-automation-runs` · `list-webhooks create-webhook update-webhook delete-webhook rotate-webhook-secret test-webhook list-webhook-deliveries` · `list-events list-connected-accounts disconnect-connected-account update-task-metadata`.

Server version bumped `4.0.0 → 5.0.0`; error handling now maps every capability-layer error. API-key management intentionally NOT exposed via MCP.

## 5–11. Architecture summaries

- **Plugin architecture** — manifest → verified registry → install w/ explicit grants → gate (`assertPluginPermission`) → capability APIs only; every execution recorded. No direct DB access path exists for plugins.
- **Plugins implemented** — framework only. First-party providers (GitHub/GCal/Gmail/Slack/Discord/Linear) are NOT implemented; no tokens flow anywhere yet.
- **Webhook architecture** — see `docs/platform/webhooks.md`; dispatcher is a dedicated Edge Function on a 1-minute cron (Trigger.dev job included).
- **OAuth architecture** — authorization-code + PKCE + refresh rotation; consent UI page still pending (backend complete).
- **SDK status** — TypeScript foundation complete & unit-tested; Python planned.
- **Developer portal status** — API Console/docs/scopes/key manager updated natively (single contract file); dedicated Developer section navigation (Overview/Usage/Logs pages) not built yet.
- **Agent execution architecture** — unchanged single runtime (`agent-runtime`); MCP/API now trigger it server-to-server with worker secret; statuses `queued running waiting_approval waiting_retry completed failed cancelled skipped timed_out`. Without configured BYOK, runs persist honestly as `skipped` with reason.
- **Automation execution architecture** — Trigger.dev scheduler → same runtime; run ops now exposed via API+MCP.

## 12. Database migrations

`supabase/migrations/20260824000001_platform_v5_core.sql` — idempotent; workspaces v2 + membership helper, workspace_id columns (defaulted `''`, zero data migration), noska_events (+ page/task triggers), noska_templates, noska_dashboards, noska_webhook_endpoints/deliveries (encrypted secrets; unique fan-out constraint), connected_accounts, oauth_apps/codes/tokens, plugin_manifests/installations/runs, developer_audit_log, user_api_keys.default_workspace_id.

**Not yet applied** to production — requires `supabase db push` or dashboard execution by an operator.

## 13. Security changes

- Webhook secrets AES-GCM at rest; shown once; never logged; SSRF-guarded endpoints.
- Exact-match OAuth redirect allowlists; replay-proof single-use codes; PKCE S256; timing-safe signature comparison; 5-minute signature tolerance.
- Plugin privilege model: declared ≠ granted; verified-only installs; revocation wipes grants.
- All new tables owner-scoped RLS matching the V4 model; service-role filtering enforced in code.
- Workspace isolation: ownership OR membership checked before any workspace-scoped operation (`assertWorkspaceAccess`).

## 14–16. Tests / deployment

| Suite | Result |
|---|---|
| vitest (incl. 43 new platform tests: capability core, task metadata, template planner, webhook signing/replay, plugin manifests/gates, OAuth/PKCE incl. RFC vector, SDK contract) | **195 passed / 0 failed** (pre-existing 152 preserved) |
| Edge-function parse check (`scripts/check-edge-syntax.mjs`, 39 files) | **0 syntax errors** |
| App bundle build (`vite build`) | ✅ |
| Live regression suite (`scripts/noska-mcp-regression.mjs` — successor of V2/V4 suites, now version-controlled) | ready; skips without deployment env |
| Acceptance runner (`scripts/noska-v5-acceptance.mjs`, Phases 38/39/40/42) | ready; skips without deployment env |

**Deployment status:** code + migration committed to the repo only. Nothing deployed (no Supabase access token on this machine). Operator steps are in `docs/platform/README.md` (migration → secrets incl. new `WEBHOOK_ENCRYPTION_KEY` → deploy 5 functions → deploy Trigger jobs).

## 17. Unsupported / remaining items (explicitly not faked)

1. Plugin sandbox executing third-party code; first-party providers (GitHub, Google Calendar, Gmail, Slack, Discord, Linear).
2. OAuth consent UI page (backend flow complete and tested at unit level).
3. Per-surface rate-limit buckets (API/MCP currently share one per-key budget).
4. Marketplace UI beyond install-lifecycle persistence.
5. Dashboard widget rendering against live data in the web app (persistence + read APIs done).
6. Live E2E green runs of regression/acceptance suites (require deployment + test keys).

## 18. Incident note (workspace swap mid-session)

Between sessions the working tree was replaced by the trimmed `public-clean` distribution snapshot. Recovery performed from git reflog (`183c67b`): full tree restored, then every V5 delta re-applied and re-verified. Two pre-existing *uncommitted* refinements could not be fully recovered and are flagged:
- `desktop-auth/index.ts` had an uncommitted Clerk-FAPI validation change (GoTrue → Clerk `/v1/me` with email resolution). The committed GoTrue variant is restored; the FAPI diff needs re-applying by whoever authored it.
- `agent-runtime/index.ts` carried ~70 uncommitted lines vs the commit. All functional markers from that version are present in the restored file (verified probe-by-probe); any residual loss is limited to non-functional/comment-level content.

Recommendation: commit the V5 work to `master` promptly so a future snapshot cannot lose it again.
