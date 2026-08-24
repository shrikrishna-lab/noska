# Noska Agent OS — Deployment Runbook

Server-side execution requires three one-time infra steps after merging this code.

## 1. Database (done automatically)
Migration `20260823000003_agent_os_foundation` is already applied to the project.
It creates `agent_runs`, `agent_run_events`, `agent_memories`,
`agent_execution_settings`, `agent_event_queue` (all owner-scoped RLS),
adds scheduling columns to `automations`, and installs the pg triggers that
turn page mutations into server-side events.

## 2. Secrets

Set these via the Supabase dashboard (Edge Functions → Secrets) and Trigger.dev:

| Secret | Where | Purpose |
|---|---|---|
| `AGENT_ENCRYPTION_KEY` | Supabase secrets | AES-GCM master key; encrypts users' opt-in BYOK keys at rest. Generate once, never rotate casually. |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Trigger.dev env | Already required by existing jobs. |
| `TRIGGER_API_KEY` / `TRIGGER_API_URL` | Existing | Already configured for current jobs. |

```bash
# generate a strong encryption key
openssl rand -base64 32
```

## 3. Deploy the Edge Function

```bash
supabase functions deploy agent-runtime
```

The function imports shared logic from `src/ai/runtime/serverContract.ts`
(relative import — bundled by the CLI).

## 4. Deploy the Trigger.dev jobs

```bash
npx trigger-cli deploy
```

Two new cron jobs ship alongside the existing ones:
- `automation-scheduler` (every minute) — due-slot evaluation, atomic slot
  reservation via idempotency keys, retry processing with exponential backoff,
  next-run advancement in the user's timezone
- `agent-event-dispatcher` (every minute) — drains `agent_event_queue`
  (populated by pg triggers on `pages`) into event-triggered agents/automations

## 5. User enablement

Users opt in per account: **Agents → Agent Settings → Background execution**.
They paste their provider API key once; it is encrypted server-side (only the
last 4 chars are ever displayed back). Without this, scheduled runs are
recorded as `skipped` with reason `not_configured` — honest no-ops, never fakes.

## Verification checklist

- [ ] Insert a test page → row appears in `agent_event_queue`
- [ ] Create an automation (schedule, active) with background enabled → wait
      for its slot → `agent_runs` row transitions queued→running→completed
- [ ] Close browser before slot time → run still executes
- [ ] Same slot twice → second insert blocked by unique `idempotency_key`
- [ ] Delete/external tools in a run → status becomes `waiting_approval`;
      approve from Command Center → run resumes to completion
- [ ] Break the stored key → runs fail fast as non-retryable with clear message
