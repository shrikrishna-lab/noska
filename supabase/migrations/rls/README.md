# RLS Security Migration — Run Order & Gates

Artifacts for the auth/RLS security migration. Spec:
`.kiro/specs/auth-rls-security-migration/`.

**Nothing here runs automatically.** Every apply is a reviewed, owner-approved
step. The Supabase MCP is read-only; enabling write access is itself gated.

## Files

| File | Phase | Purpose |
|---|---|---|
| `backup_pages_aichats.sql` | 0 | Snapshot `pages` + `ai_chats` before any change |
| `rollback_allow_all.sql` | 1 | Emergency restore of prior `Allow all` state (prepared first) |
| `forward_owner_scoped.sql` | 4 | Owner-scoped policies for all 18 tables |
| `delete_account_rpc.sql` | 4 | `delete_account()` SECURITY DEFINER function |
| `orphan_delete.sql` | 3 | Delete NULL-owner rows (after Phase 2 live) |

## Run order

0. **Backup** (`backup_pages_aichats.sql`) — confirm counts + external export.
1. **Rollback prepared** — `rollback_allow_all.sql` exists and is staged before
   any forward change.
2. **App-side changes** (code, not SQL) — deploy Phase 2, verify 24–48h.
3. **Orphan delete** (`orphan_delete.sql`) — only after Gate G1.
4. **Forward migration** (`forward_owner_scoped.sql` + `delete_account_rpc.sql`).
5. **Trusted-write relocation** — DEFERRED (interim authenticated-write policies
   stand for `audit_events`, `template_refunds`, `agent_run_logs`).
6. **Advisor cleanup** — `search_path`, `pg_trgm`, leaked-password protection.

## Gates

- **G1** — Phase 2 deployed and verified (NULL-owner count flat over 24–48h)
  before `orphan_delete.sql` runs.
- **G2** — Full staging rehearsal (backup → forward → property tests → orphan
  dry-run → rollback → re-forward) passes before ANY production apply.

## Review rule

Every apply is preceded by a plain-text SQL re-review checkpoint. Run against the
**staging** project first; production (`yxgtmzksnyarlivgxujf`) only after G2.

## Security audit note (git history rewrite)

During Wave 1 of this migration, a Supabase `service_role` key was found
hardcoded in `scripts/run-migration.mjs`, committed since the initial commit.
The key was rotated in the Supabase dashboard (the committed key is now dead),
the script was deleted, and git history was rewritten with `git filter-repo` to
purge the file from all commits before the repo's first push to any remote. This
note exists so future audits have a record of when and why history was rewritten.
No other credentials (anon key, `sbp_` tokens, other JWTs) were found in the
repository.
