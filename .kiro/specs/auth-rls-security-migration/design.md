# Design Document

## Overview

This design converts every `public` table from an effectively-open `Allow all`
RLS policy to owner-scoped access control, and makes Supabase Auth mandatory. It
covers: a client-write audit (finding below), the exact policy-by-policy SQL, a
rollback migration prepared **before** the forward migration, orphaned-data
deletion with backup, a staging-rehearsal plan (no staging project exists yet),
post-apply verification queries, and the app-side changes that must land before
the migration goes live.

**Nothing in this document is executed.** The MCP connection is read-only. All
SQL is presented as plain text for owner review. No forward migration runs until
the owner explicitly approves the SQL in-thread and confirms the production
project ref after a successful staging rehearsal.

Decisions applied from the approved requirements:

| Table / topic | Decision |
|---|---|
| Orphaned rows | DELETE 62 NULL `pages` + 13 NULL `ai_chats` (backup first) |
| `page_permissions` | owner-only, no sharing extension to `pages` (v1) |
| `collaboration_sessions` | owner-only (row `user_id`) |
| `block_locks` | owner-only (⚠️ breaks lock visibility — revisit for collab) |
| `marketplace_templates` | authenticated SELECT where `status='published'`; drafts owner-only |
| `ai_memory` | service-role only |
| `workspace_settings` | authenticated read, service-role write |
| `user_profiles` DELETE | via server-side cascading function, not raw client DELETE |
| `page_versions` DELETE | forbidden for all end users (append-only) |
| Staging | create a free second Supabase project and rehearse there first |

## Finding: Client-Side Writes to Trusted Tables (blocks R2.6 / R2.8 / R2.14)

Investigation of the codebase confirms three tables the requirements want to be
service-role-only are currently written **from the browser anon client**:

1. `audit_events` — `src/lib/auditEngine.js:51`
   `supabase.from('audit_events').insert(batch)`
2. `template_refunds` — `src/lib/supabaseService.js:384`
   `.from("template_refunds").insert({...})`
3. `agent_run_logs` — `src/lib/supabaseService.js:524` (`saveAgentRunLog`)
   `.from("agent_run_logs").upsert({...})`

**Implication.** If we apply "INSERT = service-role only" to these tables while
the client still writes them, audit logging, refund creation, and run-log
persistence break. This is a separate pre-existing bug (client writing trusted
data). It must be resolved **before** these three tables are locked down.

**Design resolution — phased.** To avoid coupling a security lockdown to a
feature rewrite, these three tables move in a **later phase** (Phase 5) than the
core user tables (Phase 4). In Phase 5 each write is relocated to a trusted
context (Supabase Edge Function / server using the service key) or, where a table
is not yet used in production, its client writer is removed. Until Phase 5, these
three tables keep a temporary authenticated-write policy (not `Allow all`, not
service-only) so nothing breaks, and the interim state is documented as a known
gap. The owner may alternatively choose to defer Phase 5 and accept the interim
authenticated-write policy — flagged as a decision in "Open Items" below.

## Architecture

### Identity model

- Authentication is Supabase Auth. The authenticated principal is `auth.uid()`
  (a uuid). Existing owner columns are `text` holding valid UUID strings, so
  policies compare `owner_col = (auth.uid())::text`. `marketplace_templates.owner_id`
  is already `uuid`, compared directly to `auth.uid()`.
- No `text → uuid` column migration is performed (non-destructive, per R1 facts).
- The anon role retains **zero** access to owner-scoped tables. All end-user
  access flows through the authenticated role.
- Service-role bypasses RLS by default in Postgres (the service key is
  `BYPASSRLS`), so "service-role only" tables simply have **no policy granting
  the authenticated/anon roles** — the client cannot touch them, the server can.

### Policy naming convention

Each new policy is named `<table>_<action>_own` (e.g. `pages_select_own`). This
makes the rollback (drop by name) and verification deterministic.

### Table classification

| Class | Tables | Model |
|---|---|---|
| A. Owner CRUD | `pages`, `ai_chats`, `template_additions`, `agents` | owner may SELECT/INSERT/UPDATE/DELETE own |
| B. Owner CRUD, no delete | `user_profiles` (delete via RPC), `page_versions` (no delete at all) | see per-table |
| C. Indirect owner (via agents) | `agent_access_grants`, `agent_triggers` | owner of parent agent CRUD |
| D. Trusted-write (Phase 5) | `audit_events`, `template_refunds`, `agent_run_logs` | owner/subject SELECT; write service-role only |
| E. Public-read | `marketplace_templates` | auth SELECT where published; owner CRUD drafts |
| F. Read-only to clients | `workspace_settings` | auth SELECT; service-role write |
| G. No client access | `ai_memory` | no policy for anon/authenticated (service-role only) |
| H. Owner-only (collab TODO) | `page_permissions`, `collaboration_sessions`, `block_locks` | owner (row `user_id`) CRUD |

> ⚠️ **Class H caveat (`block_locks`).** Owner-only RLS means collaborator B
> cannot read collaborator A's lock rows, so real-time lock visibility is broken.
> This is acceptable only because collaboration is not yet shipped. **Must be
> revisited** (participant-scoped policy) before real-time collab launches.

## Migration Phasing

Phases run in order; each is independently reversible.

- **Phase 0 — Backup** (R3.1): export `pages` + `ai_chats`; confirm restorable.
- **Phase 1 — Rollback prepared** (R4.1): write and store the rollback migration
  *before* any forward change.
- **Phase 2 — App-side BEFORE changes** (R6.1–R6.4): ship auth gating, remove the
  null-owner write path, add the test-mode/production guard, ensure every write
  sets the owner. Deploy and confirm no new NULL-owner rows appear.
- **Phase 3 — Orphaned data delete** (R3.2/R3.3/R3.4): delete NULL-owner rows so
  no legitimate row becomes invisible after lockdown.
- **Phase 4 — Core RLS lockdown**: replace `Allow all` with owner-scoped policies
  for classes A, B, C, E, F, G, H.
- **Phase 5 — Trusted-write relocation** (class D): move `audit_events`,
  `template_refunds`, `agent_run_logs` writes server-side, then apply
  service-role-only write policies.
- **Phase 6 — Advisor cleanup** (R6.6): `search_path`, `pg_trgm`, leaked-password.

Staging rehearsal (below) runs the full sequence on a throwaway project first.

## Forward Migration SQL (for review — DO NOT EXECUTE)

Presented as one reviewable script. Every table first drops its existing
`Allow all` policy, then creates scoped policies. RLS is already enabled on all
tables; `ENABLE ROW LEVEL SECURITY` is repeated as a safety no-op.

```sql
-- =====================================================================
-- FORWARD MIGRATION: owner-scoped RLS  (Phase 4 + Phase 5 policy shapes)
-- Review only. Nothing runs until explicitly approved + staged.
-- =====================================================================
BEGIN;

-- ---------- Class A: owner CRUD ----------
-- pages
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on pages" ON public.pages;
CREATE POLICY pages_select_own ON public.pages
  FOR SELECT TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY pages_insert_own ON public.pages
  FOR INSERT TO authenticated WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY pages_update_own ON public.pages
  FOR UPDATE TO authenticated
  USING (user_id = (auth.uid())::text)
  WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY pages_delete_own ON public.pages
  FOR DELETE TO authenticated USING (user_id = (auth.uid())::text);

-- ai_chats
ALTER TABLE public.ai_chats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on ai_chats" ON public.ai_chats;
CREATE POLICY ai_chats_select_own ON public.ai_chats
  FOR SELECT TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY ai_chats_insert_own ON public.ai_chats
  FOR INSERT TO authenticated WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY ai_chats_update_own ON public.ai_chats
  FOR UPDATE TO authenticated
  USING (user_id = (auth.uid())::text)
  WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY ai_chats_delete_own ON public.ai_chats
  FOR DELETE TO authenticated USING (user_id = (auth.uid())::text);

-- template_additions (owner col: added_by_user_id)
ALTER TABLE public.template_additions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on template_additions" ON public.template_additions;
CREATE POLICY template_additions_select_own ON public.template_additions
  FOR SELECT TO authenticated USING (added_by_user_id = (auth.uid())::text);
CREATE POLICY template_additions_insert_own ON public.template_additions
  FOR INSERT TO authenticated WITH CHECK (added_by_user_id = (auth.uid())::text);
CREATE POLICY template_additions_update_own ON public.template_additions
  FOR UPDATE TO authenticated
  USING (added_by_user_id = (auth.uid())::text)
  WITH CHECK (added_by_user_id = (auth.uid())::text);
CREATE POLICY template_additions_delete_own ON public.template_additions
  FOR DELETE TO authenticated USING (added_by_user_id = (auth.uid())::text);

-- agents (owner col: owner_id text)
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on agents" ON public.agents;
CREATE POLICY agents_select_own ON public.agents
  FOR SELECT TO authenticated USING (owner_id = (auth.uid())::text);
CREATE POLICY agents_insert_own ON public.agents
  FOR INSERT TO authenticated WITH CHECK (owner_id = (auth.uid())::text);
CREATE POLICY agents_update_own ON public.agents
  FOR UPDATE TO authenticated
  USING (owner_id = (auth.uid())::text)
  WITH CHECK (owner_id = (auth.uid())::text);
CREATE POLICY agents_delete_own ON public.agents
  FOR DELETE TO authenticated USING (owner_id = (auth.uid())::text);

-- ---------- Class B: owner CRUD with delete constraints ----------
-- user_profiles: self SELECT/INSERT/UPDATE; NO client DELETE (delete via RPC)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations for now" ON public.user_profiles;
CREATE POLICY user_profiles_select_own ON public.user_profiles
  FOR SELECT TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY user_profiles_insert_own ON public.user_profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY user_profiles_update_own ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (user_id = (auth.uid())::text)
  WITH CHECK (user_id = (auth.uid())::text);
-- (no DELETE policy: client cannot delete; see delete_account() RPC below)

-- page_versions: owner SELECT/INSERT only; append-only, no UPDATE/DELETE
ALTER TABLE public.page_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on page_versions" ON public.page_versions;
CREATE POLICY page_versions_select_own ON public.page_versions
  FOR SELECT TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY page_versions_insert_own ON public.page_versions
  FOR INSERT TO authenticated WITH CHECK (user_id = (auth.uid())::text);
-- (no UPDATE, no DELETE policies: immutable to end users)

-- ---------- Class C: indirect ownership via agents.owner_id ----------
ALTER TABLE public.agent_access_grants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on agent_access_grants" ON public.agent_access_grants;
CREATE POLICY agent_access_grants_all_own ON public.agent_access_grants
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agents a
                 WHERE a.id = agent_access_grants.agent_id
                   AND a.owner_id = (auth.uid())::text))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agents a
                 WHERE a.id = agent_access_grants.agent_id
                   AND a.owner_id = (auth.uid())::text));

ALTER TABLE public.agent_triggers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on agent_triggers" ON public.agent_triggers;
CREATE POLICY agent_triggers_all_own ON public.agent_triggers
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agents a
                 WHERE a.id = agent_triggers.agent_id
                   AND a.owner_id = (auth.uid())::text))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agents a
                 WHERE a.id = agent_triggers.agent_id
                   AND a.owner_id = (auth.uid())::text));

-- ---------- Class E: public-read published, owner CRUD drafts ----------
ALTER TABLE public.marketplace_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on marketplace_templates" ON public.marketplace_templates;
-- Authenticated users may read PUBLISHED rows...
CREATE POLICY marketplace_templates_select_published ON public.marketplace_templates
  FOR SELECT TO authenticated USING (status = 'published');
-- ...and owners may always read their own (including drafts).
CREATE POLICY marketplace_templates_select_own ON public.marketplace_templates
  FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY marketplace_templates_insert_own ON public.marketplace_templates
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY marketplace_templates_update_own ON public.marketplace_templates
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY marketplace_templates_delete_own ON public.marketplace_templates
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- ---------- Class F: authenticated read, service-role write ----------
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on workspace_settings" ON public.workspace_settings;
CREATE POLICY workspace_settings_select_auth ON public.workspace_settings
  FOR SELECT TO authenticated USING (true);
-- (no INSERT/UPDATE/DELETE policy: writes only via service-role, which bypasses RLS)

-- ---------- Class G: no client access (service-role only) ----------
ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on ai_memory" ON public.ai_memory;
-- (no policies at all: anon + authenticated have zero access; service-role bypasses)

-- ---------- Class H: owner-only (collaboration revisit TODO) ----------
-- page_permissions
ALTER TABLE public.page_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on page_permissions" ON public.page_permissions;
CREATE POLICY page_permissions_all_own ON public.page_permissions
  FOR ALL TO authenticated
  USING (user_id = (auth.uid())::text)
  WITH CHECK (user_id = (auth.uid())::text);

-- collaboration_sessions
ALTER TABLE public.collaboration_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on collaboration_sessions" ON public.collaboration_sessions;
CREATE POLICY collaboration_sessions_all_own ON public.collaboration_sessions
  FOR ALL TO authenticated
  USING (user_id = (auth.uid())::text)
  WITH CHECK (user_id = (auth.uid())::text);

-- block_locks  (⚠️ owner-only breaks cross-user lock visibility; revisit for collab)
ALTER TABLE public.block_locks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on block_locks" ON public.block_locks;
CREATE POLICY block_locks_all_own ON public.block_locks
  FOR ALL TO authenticated
  USING (user_id = (auth.uid())::text)
  WITH CHECK (user_id = (auth.uid())::text);

-- ---------- Class D: trusted-write tables ----------
-- INTERIM (until Phase 5 relocates writes server-side): owner/subject may read;
-- authenticated may write own rows so current client code keeps working.
-- FINAL (Phase 5): drop the *_write_interim policies; writes then only via
-- service-role (no policy needed for the server).
--
-- audit_events (subject: user_id)
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on audit_events" ON public.audit_events;
CREATE POLICY audit_events_select_own ON public.audit_events
  FOR SELECT TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY audit_events_insert_interim ON public.audit_events
  FOR INSERT TO authenticated WITH CHECK (user_id = (auth.uid())::text);
-- (no UPDATE/DELETE: audit integrity)

-- template_refunds (requester: requester_user_id)
ALTER TABLE public.template_refunds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on template_refunds" ON public.template_refunds;
CREATE POLICY template_refunds_select_own ON public.template_refunds
  FOR SELECT TO authenticated USING (requester_user_id = (auth.uid())::text);
CREATE POLICY template_refunds_insert_interim ON public.template_refunds
  FOR INSERT TO authenticated WITH CHECK (requester_user_id = (auth.uid())::text);
-- (no UPDATE/DELETE from client: status transitions are service-role only)

-- agent_run_logs (owner via parent agent)
ALTER TABLE public.agent_run_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on agent_run_logs" ON public.agent_run_logs;
CREATE POLICY agent_run_logs_select_own ON public.agent_run_logs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agents a
                 WHERE a.id = agent_run_logs.agent_id
                   AND a.owner_id = (auth.uid())::text));
CREATE POLICY agent_run_logs_write_interim ON public.agent_run_logs
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.agents a
                 WHERE a.id = agent_run_logs.agent_id
                   AND a.owner_id = (auth.uid())::text));

COMMIT;
```

### Account-deletion RPC (supports R2.3 self-delete via server function)

```sql
-- SECURITY DEFINER function so a user can delete only their OWN account and
-- cascade related rows. Runs with definer privileges but self-scopes to auth.uid().
CREATE OR REPLACE FUNCTION public.delete_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE uid_text text := (auth.uid())::text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  DELETE FROM public.pages            WHERE user_id = uid_text;
  DELETE FROM public.ai_chats         WHERE user_id = uid_text;
  DELETE FROM public.page_versions    WHERE user_id = uid_text;
  DELETE FROM public.page_permissions WHERE user_id = uid_text;
  DELETE FROM public.creator_profiles WHERE user_id = uid_text;
  DELETE FROM public.user_profiles    WHERE user_id = uid_text;
  -- audit_events intentionally retained (integrity); adjust if policy requires.
END;
$$;
REVOKE ALL ON FUNCTION public.delete_account() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.delete_account() TO authenticated;
```

> Note: `creator_profiles` keeps the same owner-CRUD shape as class A (its policy
> block is identical to `pages`, on `user_id`); included in staging script.
> Public-read of creator display fields (R2.5 open item) is **not** enabled in
> v1 pending owner confirmation.

## Rollback Migration (R4.1 — prepared BEFORE forward migration)

Stored as a separate file and validated in staging before the forward migration
is applied to production. Emergency use only; restores the prior (insecure)
state and is itself a security regression to be re-fixed.

```sql
-- =====================================================================
-- ROLLBACK: restore prior "Allow all" behavior. EMERGENCY USE ONLY.
-- =====================================================================
BEGIN;

-- Drop every policy created by the forward migration, then restore Allow all.
-- (Names are deterministic per the naming convention.)

-- Class A
DROP POLICY IF EXISTS pages_select_own ON public.pages;
DROP POLICY IF EXISTS pages_insert_own ON public.pages;
DROP POLICY IF EXISTS pages_update_own ON public.pages;
DROP POLICY IF EXISTS pages_delete_own ON public.pages;
CREATE POLICY "Allow all on pages" ON public.pages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS ai_chats_select_own ON public.ai_chats;
DROP POLICY IF EXISTS ai_chats_insert_own ON public.ai_chats;
DROP POLICY IF EXISTS ai_chats_update_own ON public.ai_chats;
DROP POLICY IF EXISTS ai_chats_delete_own ON public.ai_chats;
CREATE POLICY "Allow all on ai_chats" ON public.ai_chats FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS template_additions_select_own ON public.template_additions;
DROP POLICY IF EXISTS template_additions_insert_own ON public.template_additions;
DROP POLICY IF EXISTS template_additions_update_own ON public.template_additions;
DROP POLICY IF EXISTS template_additions_delete_own ON public.template_additions;
CREATE POLICY "Allow all on template_additions" ON public.template_additions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS agents_select_own ON public.agents;
DROP POLICY IF EXISTS agents_insert_own ON public.agents;
DROP POLICY IF EXISTS agents_update_own ON public.agents;
DROP POLICY IF EXISTS agents_delete_own ON public.agents;
CREATE POLICY "Allow all on agents" ON public.agents FOR ALL USING (true) WITH CHECK (true);

-- Class B
DROP POLICY IF EXISTS user_profiles_select_own ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_insert_own ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_update_own ON public.user_profiles;
CREATE POLICY "Allow all operations for now" ON public.user_profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS page_versions_select_own ON public.page_versions;
DROP POLICY IF EXISTS page_versions_insert_own ON public.page_versions;
CREATE POLICY "Allow all on page_versions" ON public.page_versions FOR ALL USING (true) WITH CHECK (true);

-- Class C
DROP POLICY IF EXISTS agent_access_grants_all_own ON public.agent_access_grants;
CREATE POLICY "Allow all on agent_access_grants" ON public.agent_access_grants FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS agent_triggers_all_own ON public.agent_triggers;
CREATE POLICY "Allow all on agent_triggers" ON public.agent_triggers FOR ALL USING (true) WITH CHECK (true);

-- Class E
DROP POLICY IF EXISTS marketplace_templates_select_published ON public.marketplace_templates;
DROP POLICY IF EXISTS marketplace_templates_select_own ON public.marketplace_templates;
DROP POLICY IF EXISTS marketplace_templates_insert_own ON public.marketplace_templates;
DROP POLICY IF EXISTS marketplace_templates_update_own ON public.marketplace_templates;
DROP POLICY IF EXISTS marketplace_templates_delete_own ON public.marketplace_templates;
CREATE POLICY "Allow all on marketplace_templates" ON public.marketplace_templates FOR ALL USING (true) WITH CHECK (true);

-- Class F / G
DROP POLICY IF EXISTS workspace_settings_select_auth ON public.workspace_settings;
CREATE POLICY "Allow all on workspace_settings" ON public.workspace_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on ai_memory" ON public.ai_memory FOR ALL USING (true) WITH CHECK (true);

-- Class H
DROP POLICY IF EXISTS page_permissions_all_own ON public.page_permissions;
CREATE POLICY "Allow all on page_permissions" ON public.page_permissions FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS collaboration_sessions_all_own ON public.collaboration_sessions;
CREATE POLICY "Allow all on collaboration_sessions" ON public.collaboration_sessions FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS block_locks_all_own ON public.block_locks;
CREATE POLICY "Allow all on block_locks" ON public.block_locks FOR ALL USING (true) WITH CHECK (true);

-- Class D
DROP POLICY IF EXISTS audit_events_select_own ON public.audit_events;
DROP POLICY IF EXISTS audit_events_insert_interim ON public.audit_events;
CREATE POLICY "Allow all on audit_events" ON public.audit_events FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS template_refunds_select_own ON public.template_refunds;
DROP POLICY IF EXISTS template_refunds_insert_interim ON public.template_refunds;
CREATE POLICY "Allow all on template_refunds" ON public.template_refunds FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS agent_run_logs_select_own ON public.agent_run_logs;
DROP POLICY IF EXISTS agent_run_logs_write_interim ON public.agent_run_logs;
CREATE POLICY "Allow all on agent_run_logs" ON public.agent_run_logs FOR ALL USING (true) WITH CHECK (true);

COMMIT;
```

## Orphaned Data Handling (Phase 0 + Phase 3)

### Phase 0 — Backup (R3.1)

```sql
-- Snapshot into backup tables in a separate schema; confirm counts match.
CREATE SCHEMA IF NOT EXISTS migration_backup;
CREATE TABLE migration_backup.pages_20260701     AS SELECT * FROM public.pages;
CREATE TABLE migration_backup.ai_chats_20260701  AS SELECT * FROM public.ai_chats;
-- Verify: expect 80 and 13.
SELECT (SELECT count(*) FROM migration_backup.pages_20260701)    AS pages_backup,   -- 80
       (SELECT count(*) FROM migration_backup.ai_chats_20260701) AS chats_backup;   -- 13
```

Additionally export both tables to local files (CSV/JSON via the dashboard or
`copy`) so a backup exists outside the same database. Confirm a test restore
into a scratch table reproduces 80 / 13 exactly before proceeding.

### Phase 3 — Delete NULL-owner rows (R3.2/R3.3/R3.4)

```sql
BEGIN;
-- Pre-counts (expect 62 and 13)
SELECT count(*) FROM public.pages    WHERE user_id IS NULL;
SELECT count(*) FROM public.ai_chats WHERE user_id IS NULL;

DELETE FROM public.pages    WHERE user_id IS NULL;
DELETE FROM public.ai_chats WHERE user_id IS NULL;

-- Post-counts (expect 0 and 0; pages total now 18, chats total now 0)
SELECT count(*) FILTER (WHERE user_id IS NULL) AS null_pages, count(*) AS total_pages FROM public.pages;
SELECT count(*) FILTER (WHERE user_id IS NULL) AS null_chats, count(*) AS total_chats FROM public.ai_chats;
COMMIT;
```

Run **after** Phase 2 app changes are live (so no new NULL rows are created) and
**before** Phase 4 lockdown.

## Staging Rehearsal Plan (R5.3 — no staging project exists yet)

Because there is no staging project, we create a free throwaway Supabase project,
rehearse the entire sequence, then only afterward confirm and touch production.

Steps for the owner to perform (dashboard actions):

1. Go to https://supabase.com/dashboard → **New project**. Free tier is fine.
   Name it e.g. `noska-staging`. Choose a region and a strong DB password.
2. Once provisioned, open **Project Settings → General** and copy the
   **Reference ID** (the staging project ref).
3. In **Project Settings → API**, copy the **Project URL** and the **anon** key.
4. Recreate the schema in staging so the rehearsal is representative:
   - If SQL migration files exist in the repo, run them against staging; else use
     the dashboard SQL editor to run a schema dump taken from production
     (structure only, no data) plus a small set of seed rows and at least two
     test auth users (create via **Authentication → Users → Add user**).
5. Provide me the staging project ref. I will (only when you approve) run, in
   order, against **staging**: backup script → forward migration → verification
   queries → rollback → re-forward, confirming each step behaves.
6. After staging passes all verification checks, **confirm production ref
   `yxgtmzksnyarlivgxujf`** (R5.4) and we schedule the production run.

If you decide to skip staging, that is a production-first migration and must be
recorded as an explicitly accepted risk (R5.3) — not recommended for a
security-critical, data-deleting change.

## Post-Apply Verification (R4.3)

Run immediately after Phase 4, before declaring complete. Uses two real test
accounts, User A (`:uid_a`) and User B (`:uid_b`).

```sql
-- (a) OWN ACCESS — as User A's JWT: expect own rows only, writes succeed.
SELECT count(*) FROM public.pages;                         -- only A's pages
INSERT INTO public.pages (id, user_id, title) VALUES (gen_random_uuid()::text, :uid_a, 'verify'); -- succeeds
UPDATE public.pages SET title='verify2' WHERE user_id = :uid_a; -- affects only A

-- (b) CROSS-ACCOUNT BLOCK — as User A, target B's row: expect 0 rows / denied.
SELECT count(*) FROM public.pages WHERE user_id = :uid_b;   -- expect 0
UPDATE public.pages SET title='hacked' WHERE user_id = :uid_b; -- expect 0 rows affected
DELETE FROM public.pages WHERE user_id = :uid_b;               -- expect 0 rows affected

-- (c) ANONYMOUS — with no JWT (anon role): expect 0 rows / denied on every table.
SELECT count(*) FROM public.pages;          -- expect 0
SELECT count(*) FROM public.ai_chats;       -- expect 0
SELECT count(*) FROM public.user_profiles;  -- expect 0
-- marketplace published read as authenticated:
SELECT count(*) FROM public.marketplace_templates WHERE status='published'; -- visible to any auth user
```

Programmatic equivalent (run via the JS client with each account's session) is
preferred so it exercises the real anon/authenticated key path, and is captured
as an automated test in tasks.

Any failed expectation triggers the rollback migration immediately.

## App-Side Changes (Phase 2, R6 BEFORE)

### R6.2 — remove the `userId = null` write path

- `src/lib/supabaseService.js`: `savePage`, `savePages`, `saveAIChats`,
  `saveAIChat` currently write `user_id` only `if (userId)`. Change to **require**
  a non-empty `userId`; throw early if missing:

```js
function requireOwner(userId) {
  if (!userId) throw new Error('[supabase] refusing write without authenticated user');
  return userId;
}
// e.g. in savePage:
export async function savePage(page, userId) {
  requireOwner(userId);
  const dbPage = mapPageToDb(page);
  dbPage.user_id = userId;
  // ...
}
```

- `src/App.jsx`: the `if (!userId)` guest branch (loads/writes localStorage with
  no session) must no longer persist to Supabase. Guests are routed to login
  (R6.1). LocalStorage-only usage may remain for a purely-local experience, but
  it must never call the Supabase write functions.

### R6.3 — `VITE_TEST_MODE` + production-URL guard (R1.4)

Add a single guard module imported at app startup and in `supabase.js`:

```js
// src/lib/envGuard.js
const PROD_SUPABASE_URL = 'https://yxgtmzksnyarlivgxujf.supabase.co'; // confirmed prod ref
const url = import.meta.env.VITE_SUPABASE_URL;
const testMode = import.meta.env.VITE_TEST_MODE === 'true';
export const IS_PROD_PROJECT = url === PROD_SUPABASE_URL;
if (testMode && IS_PROD_PROJECT) {
  throw new Error('VITE_TEST_MODE must never target the production Supabase project.');
}
export const TEST_MODE = testMode && !IS_PROD_PROJECT; // test mode is ignored against prod
```

`App.jsx` uses `TEST_MODE` (from the guard) instead of reading
`import.meta.env.VITE_TEST_MODE` directly, so test mode is structurally
impossible against production.

### R6.4 — every write sets owner to `auth.uid()`

- On session load in `App.jsx`, thread `session.user.id` through to all write
  callers (already partly done for the authenticated branch). Verify each write
  path (`savePage`, `saveAIChats`, `upsertUserProfile`, `saveAgent`, etc.) passes
  the authenticated id, and the persisted row's owner equals `auth.uid()`.

### Ordering

R6.1–R6.4 ship and deploy in **Phase 2**, before Phase 3 deletion and Phase 4
lockdown, so the app stops producing NULL-owner rows first.

## Components and Interfaces

The migration touches three layers:

- **Database policies (SQL)** — the forward migration, rollback migration,
  `delete_account()` RPC, backup script, and deletion script above are the
  primary artifacts. Interface: applied via reviewed SQL (dashboard SQL editor or
  approved read-write MCP), never silently.
- **App data layer (`src/lib/supabaseService.js`)** — `savePage`, `savePages`,
  `saveAIChats`, `saveAIChat`, `upsertUserProfile`, `saveAgent`,
  `saveAgentRunLog`, refund insert. New `requireOwner(userId)` guard added to
  every write; each write sets the owner column to the authenticated id.
- **App bootstrap (`src/App.jsx`, `src/lib/supabase.js`, new
  `src/lib/envGuard.js`)** — login gating, removal of the null-owner guest write
  path, and the `VITE_TEST_MODE` + production-URL guard (`TEST_MODE` export).

Trusted-write relocation (Phase 5) introduces a server context (Supabase Edge
Function or server using the service key) for `audit_events`, `template_refunds`,
and `agent_run_logs`; its interface is a server endpoint the client calls instead
of writing those tables directly.

## Data Models

No column types change. Ownership columns and their comparison expressions:

| Table | Owner column | Type | Policy comparison |
|---|---|---|---|
| pages, ai_chats, user_profiles, page_versions, page_permissions, creator_profiles, audit_events, block_locks, collaboration_sessions | `user_id` | text | `user_id = (auth.uid())::text` |
| agents | `owner_id` | text | `owner_id = (auth.uid())::text` |
| marketplace_templates | `owner_id` | uuid | `owner_id = auth.uid()` |
| template_additions | `added_by_user_id` | text | `added_by_user_id = (auth.uid())::text` |
| template_refunds | `requester_user_id` | text | `requester_user_id = (auth.uid())::text` |
| agent_access_grants, agent_run_logs, agent_triggers | `agent_id` → `agents.owner_id` | uuid FK | `EXISTS (... agents.owner_id = (auth.uid())::text)` |
| ai_memory, workspace_settings | none | — | no owner scoping (service-role / auth-read) |

Backup schema `migration_backup` holds dated snapshots of `pages` and `ai_chats`.

## Error Handling

- **App write without owner**: `requireOwner()` throws before any network call,
  surfaced to the user as a "please sign in" state rather than a silent failure.
- **RLS denial at DB**: writes return 0 affected rows / a Postgres RLS error;
  the data layer treats 0-row writes on an expected-owned row as an error and
  logs it (helps detect a misconfigured session).
- **Test-mode misconfiguration**: `envGuard.js` throws at startup if test mode is
  combined with the production URL — fail fast, no degraded/insecure boot.
- **Migration failure**: each SQL phase runs in a transaction (`BEGIN/COMMIT`);
  a failed statement rolls back that phase. A phase that succeeds but fails
  verification triggers the prepared rollback migration.
- **Backup verification failure**: if backup counts ≠ 80/13, abort before any
  deletion or policy change.

## Testing Strategy

- **Staging rehearsal (primary gate)**: run backup → forward → verification →
  rollback → re-forward against a throwaway project; all checks must pass before
  production.
- **Property-based tests** (below) exercise owner isolation, anon denial, and
  round-trip using two real test-account sessions via the JS client (real
  anon/authenticated key path), not service-role.
- **App unit tests**: `requireOwner` rejects null/empty; `envGuard` throws on
  prod+test-mode and yields `TEST_MODE=true` otherwise.
- **Post-apply verification** (R4.3) is run manually/scripted immediately after
  the production forward migration, before sign-off.

## Correctness Properties

These become property-based / integration tests in tasks:

### Property 1: Owner isolation
For any two distinct users A, B and any owner-scoped table, A's authenticated
session can never SELECT/UPDATE/DELETE a row owned by B. (Randomize which table
and which operation.)

**Validates: Requirements 1.1, 1.2, 2.1, 2.2**

### Property 2: Anonymous denial
For any owner-scoped table, an anon session returns 0 rows on SELECT and 0
affected rows on write.

**Validates: Requirements 1.1, 1.2**

### Property 3: Owner round-trip
Any row a user INSERTs with their own id is retrievable by that same user and by
no one else.

**Validates: Requirements 2.1, 2.2, 6.4**

### Property 4: Published visibility
For `marketplace_templates`, a row is visible to an arbitrary authenticated user
iff `status='published'` OR the row is owned by that user.

**Validates: Requirements 2.16**

### Property 5: Append-only versions
No authenticated session can UPDATE or DELETE any `page_versions` row.

**Validates: Requirements 2.4**

### Property 6: No null-owner writes in app
`savePage` / `saveAIChats` reject a null/empty owner (app-layer unit test).

**Validates: Requirements 1.3, 6.2**

### Property 7: Test-mode guard
Constructing the env guard with the production URL and test mode enabled throws;
with a non-prod URL it yields `TEST_MODE=true`.

**Validates: Requirements 1.4, 6.3**

### Property 8: Rollback restores
After forward + rollback in staging, effective access matches pre-migration
`Allow all` behavior.

**Validates: Requirements 4.1, 4.2**

## Open Items Carried Into Tasks / Owner Confirmation

1. **Phase 5 timing** — relocate `audit_events` / `template_refunds` /
   `agent_run_logs` writes server-side now, or accept the interim
   authenticated-write policy temporarily? (Affects whether client refund-status
   updates exist — current code only INSERTs refunds/logs, no client status
   UPDATE was found, which matches the "service-role status transitions" intent.)
2. **`creator_profiles` public read** (R2.5) — enable public read of display
   fields for the marketplace, or keep owner-only for v1? Default: owner-only.
3. **Staging project ref** — to be supplied by owner (R5.3).
4. **Production ref confirmation** — `yxgtmzksnyarlivgxujf` to be confirmed only
   after staging passes (R5.4).
```
