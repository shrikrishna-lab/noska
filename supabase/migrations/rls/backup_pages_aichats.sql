-- =====================================================================
-- PHASE 0 — BACKUP (R3.1). Run BEFORE any policy change or deletion.
-- Source: .kiro/specs/auth-rls-security-migration/design.md (verbatim)
-- Snapshot into backup tables in a separate schema; confirm counts match.
-- NOTE: the date suffix (20260701) reflects the snapshot date; adjust per run.
-- Also export both tables to local files (CSV/JSON) so a backup exists OUTSIDE
-- the same database, and confirm a test restore reproduces counts exactly.
-- =====================================================================
CREATE SCHEMA IF NOT EXISTS migration_backup;
CREATE TABLE migration_backup.pages_20260701     AS SELECT * FROM public.pages;
CREATE TABLE migration_backup.ai_chats_20260701  AS SELECT * FROM public.ai_chats;

-- Verify: production expects 80 and 13 (staging expects seeded counts).
SELECT (SELECT count(*) FROM migration_backup.pages_20260701)    AS pages_backup,
       (SELECT count(*) FROM migration_backup.ai_chats_20260701) AS chats_backup;
