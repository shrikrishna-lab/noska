# Requirements Document

## Introduction

All 18 tables in the `public` schema currently carry an `Allow all` RLS policy
using `USING (true)` / `WITH CHECK (true)` for the `public` role. RLS is enabled
but every policy is a no-op, so any client holding the anon key can read, write,
and delete every user's data. This feature replaces those policies with
owner-scoped access control and makes authentication mandatory, without losing
existing legitimate data.

This document defines **requirements only**. Design MUST NOT begin until the
requirements marked 🔴 **BLOCKING DECISION** are resolved by the project owner.
The default posture throughout is conservative: deny access unless a rule
explicitly grants it.

### Verified Investigation Facts (inputs, not requirements)

- **18 base tables** exist in `public` (full inventory below).
- Existing non-null owner values are **all valid UUIDs stored as `text`** — no
  destructive `text → uuid` column conversion is required. Policies compare
  `owner_column = auth.uid()::text` (or `::uuid` where the column is already uuid).
- **Orphaned rows**: `pages` has 62 of 80 rows with NULL `user_id`; `ai_chats`
  has 13 of 13 with NULL `user_id`. `page_versions`, `page_permissions`,
  `creator_profiles` are empty; `user_profiles` has 8 rows, all valid UUIDs.
- **Ownership columns per table** (verified):
  - `user_id` (text): `pages`, `ai_chats`, `user_profiles`, `page_versions`,
    `page_permissions`, `creator_profiles`, `audit_events`, `block_locks`,
    `collaboration_sessions`
  - `owner_id` (text): `agents`; `owner_id` (uuid): `marketplace_templates`
  - `added_by_user_id` (text): `template_additions`
  - `requester_user_id` (text): `template_refunds`
  - Indirect ownership via `agent_id → agents.owner_id`: `agent_access_grants`,
    `agent_run_logs`, `agent_triggers`
  - **No ownership dimension at all**: `ai_memory`, `workspace_settings`
- **App behavior today**: guests run with `userId = null` (writes NULL-owner
  rows); `VITE_TEST_MODE=true` bypasses the auth/onboarding flow entirely.

## Glossary

- **Owner-scoped**: a row is accessible only where its owner column equals the
  authenticated user id, i.e. `owner_column = auth.uid()::text`.
- **Service-role**: writes performed by a trusted server context using the
  Supabase service key, never the browser anon key.
- **Orphaned row**: a row whose owner column is NULL, unattributable to any
  authenticated user; becomes invisible once owner-scoped RLS is live.
- **🔴 BLOCKING DECISION**: an open question that must be answered by the project
  owner before Design can proceed.
- **BEFORE / AFTER**: whether an app-side change must land before the RLS
  migration goes live (to stop new orphaned rows) or may follow after.

## Requirements

### Requirement 1: Auth Enforcement Model

**User Story:** As the product owner, I want authentication enforced at the
database layer, so that no client can read or modify data without a valid
session and no configuration flag can bypass it in production.

#### Acceptance Criteria

1. WHEN any write (INSERT/UPDATE/DELETE) is attempted on an owner-scoped table AND `auth.uid()` IS NULL THEN the database SHALL deny the operation (0 rows affected / RLS error).
2. WHEN an anonymous client issues `SELECT` on an owner-scoped table THEN the database SHALL return 0 rows.
3. WHEN reviewing the codebase THEN there SHALL be no call path that passes `userId = null` to `savePage`, `saveAIChats`, or profile writes; a guest attempting to persist SHALL be routed to login.
4. WHEN `VITE_SUPABASE_URL` equals the production project URL AND `VITE_TEST_MODE` is enabled THEN auth SHALL still be enforced (test mode has no effect), guaranteed by binding test-mode behavior to a non-production URL rather than a boolean flag alone; a build/runtime assertion SHALL fail fast if both are combined.
5. THE production build SHALL NOT include `VITE_TEST_MODE=true` (verified in `.env.example`, Vercel env vars, and a build-time check).

### Requirement 2: Per-Table Access Rules (all 18 tables)

**User Story:** As a user, I want each table's access rules defined explicitly,
so that I can only reach my own data and shared/global tables behave as intended
rather than defaulting to open or accidentally locked.

Default posture for every table: **deny unless a rule below explicitly grants
access.**

#### Acceptance Criteria

**Owner-scoped (full owner CRUD unless noted):**

1. `pages` (`user_id` text): owner may SELECT/INSERT/UPDATE/DELETE own rows. Sharing via `page_permissions` MAY extend access — until R2 item 10 is resolved, `pages` SHALL be owner-only.
2. `ai_chats` (`user_id` text): owner-only CRUD.
3. `user_profiles` (`user_id` text): a user may SELECT/INSERT/UPDATE only their own profile row. 🔴 BLOCKING DECISION: allow self-DELETE or forbid (account-deletion flow undefined).
4. `page_versions` (`user_id` text): owner may SELECT/INSERT own rows; append-only. 🔴 BLOCKING DECISION: whether owners may DELETE (prune) their own version history.
5. `creator_profiles` (`user_id` text): owner-only CRUD. 🔴 BLOCKING DECISION: marketplace likely needs public read of non-sensitive display fields.
6. `audit_events` (`user_id` text): subject user may SELECT own events; INSERT SHALL be service-role only; UPDATE/DELETE forbidden for all end users. 🔴 confirm audit rows are written from a trusted context, not the anon client.
7. `template_additions` (`added_by_user_id` text): the adder may SELECT/INSERT/UPDATE/DELETE own rows.
8. `template_refunds` (`requester_user_id` text): requester may SELECT/INSERT own rows; UPDATE (status transitions) SHALL be service-role/admin only. 🔴 confirm refund transitions are not end-user writable.
9. `agents` (`owner_id` text): owner-only CRUD.

**Sharing / multi-user tables (model must be defined):**

10. 🔴 **BLOCKING DECISION** `page_permissions` (`user_id` text): define (a) who may create a permission row (page owner only?), (b) whether a listed user gains read/write on the referenced `pages` row, (c) whether `pages` access (item 1) must reference this table. Until defined, owner-of-the-row only, no sharing granted.
11. 🔴 **BLOCKING DECISION** `collaboration_sessions` (`user_id` text): define whether access is per session participant or strictly the row's `user_id`. Conservative default until confirmed: row `user_id` owner only.
12. 🔴 **BLOCKING DECISION** `block_locks` (`user_id` text): locks must be visible to other collaborators to be respected. Define who may SELECT (all page participants vs owner) and who may INSERT/DELETE (lock holder only). Conservative default: owner only (noted as likely breaking lock visibility — must be revisited in Design).

**Indirect ownership via parent `agents`:**

13. `agent_access_grants` (`agent_id → agents.owner_id`): access allowed only where the referenced agent is owned by `auth.uid()` via `EXISTS (SELECT 1 FROM agents a WHERE a.id = agent_id AND a.owner_id = auth.uid()::text)`.
14. `agent_run_logs` (`agent_id → agents.owner_id`): agent owner may SELECT; INSERT SHALL be service-role only; UPDATE/DELETE forbidden. 🔴 confirm run logs written by a trusted context.
15. `agent_triggers` (`agent_id → agents.owner_id`): agent owner may SELECT/INSERT/UPDATE/DELETE.

**Public / global tables (model must be defined):**

16. 🔴 **BLOCKING DECISION** `marketplace_templates` (`owner_id` uuid): owner may INSERT/UPDATE/DELETE own rows. Define whether published rows (`status = 'published'`) are SELECTable by any authenticated user and/or anonymously. Default until confirmed: authenticated read of published rows only; drafts owner-only.
17. 🔴 **BLOCKING DECISION** `ai_memory` (no owner column): options — (a) add an owner column and scope per-user, (b) service-role only, (c) global shared. Default until confirmed: **service-role only, no anon/authenticated access.**
18. 🔴 **BLOCKING DECISION** `workspace_settings` (no owner column): options — (a) global read, admin/service-role write, (b) add workspace/owner scoping. Default until confirmed: authenticated read, service-role-only write.

### Requirement 3: Orphaned Data Handling

**User Story:** As the product owner, I want orphaned data resolved before
lockdown, so that no legitimate data is silently lost or rendered permanently
invisible when owner-scoped RLS goes live.

#### Acceptance Criteria

1. WHEN before ANY new RLS policy is applied THEN a full export/backup of `pages` and `ai_chats` SHALL exist AND be confirmed restorable (a test restore into a scratch table reproduces 80 pages and 13 chats exactly).
2. 🔴 **BLOCKING DECISION** THE 62 NULL-`user_id` pages and 13 NULL-`user_id` chats SHALL be either **(a) deleted** (tradeoff: permanent loss; simplest; correct if test/guest junk) OR **(b) reassigned** to a named existing account from `user_profiles` (tradeoff: preserves data but attributes possibly-unrelated rows to one user). Owner must choose (a) or (b) and, for (b), name the target `user_id`.
3. WHEN the chosen path from item 2 is executed THEN it SHALL complete and be verified **before** owner-scoped policies go live: `SELECT count(*) ... WHERE user_id IS NULL` returns 0 for both tables (delete path), or all rows carry the chosen owner (reassign path).
4. NO owner-scoped policy SHALL be applied while any NULL-owner rows remain in a table about to become owner-scoped.

### Requirement 4: Rollback Plan

**User Story:** As the operator, I want the migration to be reversible and
verified, so that if new policies lock out legitimate access I can restore
service quickly.

#### Acceptance Criteria

1. THE migration SHALL be reversible: a saved rollback migration that re-creates the prior `Allow all` policies SHALL be prepared and stored before the new policies are applied.
2. Rollback SHALL be defined concretely as: drop the new owner-scoped policies and re-apply the saved `Allow all` policies (temporary emergency use only), documented as a security regression to be re-fixed.
3. WHEN immediately after applying the new policies AND before declaring the migration complete THEN a verification pass SHALL confirm: (a) a real test account can read/write its own rows; (b) a second account cannot read/update/delete the first account's rows; (c) anonymous access returns 0 rows / is denied. Any failure SHALL trigger the rollback in item 1.

### Requirement 5: MCP / Execution Safety

**User Story:** As the operator, I want every migration reviewed and targeted at
the confirmed project, so that no destructive SQL runs unreviewed or against the
wrong database.

#### Acceptance Criteria

1. THE complete migration SQL SHALL be presented as reviewable plain text AND explicitly approved by the project owner before execution.
2. NO migration SHALL be applied through a newly read-write-enabled MCP connection without prior human review of the exact SQL. (The MCP is currently read-only via `&read_only=true`; enabling write access is itself a gated step.)
3. 🔴 THE migration SHALL state whether it runs against a staging/dev project first; if no staging project exists, that absence SHALL be recorded as an explicit accepted risk (production-first) rather than omitted.
4. 🔴 THE target production project ref SHALL be explicitly confirmed by the owner before any write. (MCP currently points at `yxgtmzksnyarlivgxujf`, unconfirmed.)

### Requirement 6: App-Side Changes Required

**User Story:** As a developer, I want the app changed to require auth and always
set an owner before the RLS lockdown, so that the app keeps working and stops
producing orphaned rows.

#### Acceptance Criteria

1. (BEFORE) WHEN an unauthenticated user opens a non-test build THEN the app SHALL show a login screen AND issue no Supabase writes.
2. (BEFORE) THE `userId = null` write path in `App.jsx` / `supabaseService.js` SHALL be removed or guarded so no write omits an owner id (verified by code inspection plus a runtime assertion rejecting null/empty owner).
3. (BEFORE) THE `VITE_TEST_MODE` + production-URL guard from Requirement 1 item 4 SHALL be enforced (test mode against production URL fails fast).
4. (BEFORE) EVERY write path SHALL set the owner column to the authenticated `auth.uid()` value so rows satisfy the new `WITH CHECK` policy (a logged-in INSERT succeeds and the persisted owner equals `auth.uid()`).
5. (AFTER) UI cleanup for features previously available to guests that now require login SHALL route to login or be removed. Non-blocking for security.
6. (AFTER) Lower-severity advisor findings SHALL be addressed: set `search_path=''` on `update_updated_at`, `release_expired_locks`, `clean_stale_sessions`, `update_updated_at_column`; move `pg_trgm` out of `public`; enable leaked-password protection. Tracked here; not blockers for the RLS lockdown.

## Blocking Decisions Summary (must be resolved before Design)

1. **R3.2** — orphaned data: delete vs reassign (and target account if reassign).
2. **R2.10 `page_permissions`** — sharing model and whether it extends `pages` access.
3. **R2.11 `collaboration_sessions`** — per-participant vs owner-only.
4. **R2.12 `block_locks`** — lock visibility for collaborators vs owner-only.
5. **R2.16 `marketplace_templates`** — public/authenticated read of published templates.
6. **R2.17 `ai_memory`** — service-role-only vs per-user vs global.
7. **R2.18 `workspace_settings`** — access/write model.
8. **R2.3 / R2.4** — self-delete of profile and version-history pruning.
9. **R2.6 / R2.8 / R2.14** — confirm audit/refund/run-log writes come from a trusted (service-role) context.
10. **R5.3 / R5.4** — staging vs production-first; confirm production project ref.
