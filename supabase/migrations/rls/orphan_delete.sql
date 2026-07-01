-- =====================================================================
-- PHASE 3 — DELETE NULL-owner rows (R3.2 / R3.3 / R3.4).
-- Source: .kiro/specs/auth-rls-security-migration/design.md (verbatim)
-- PRECONDITIONS (must both hold before running):
--   1. Phase 0 backup completed and confirmed restorable.
--   2. Phase 2 app changes are LIVE (Gate G1 / Task 5 passed) so no new
--      NULL-owner rows are being created.
-- Run AFTER Phase 2, BEFORE Phase 4 lockdown.
-- =====================================================================
BEGIN;
-- Pre-counts (production expects 62 and 13)
SELECT count(*) AS null_pages_before FROM public.pages    WHERE user_id IS NULL;
SELECT count(*) AS null_chats_before FROM public.ai_chats WHERE user_id IS NULL;

DELETE FROM public.pages    WHERE user_id IS NULL;
DELETE FROM public.ai_chats WHERE user_id IS NULL;

-- Post-counts (expect 0 / 0; production pages total -> 18, chats total -> 0)
SELECT count(*) FILTER (WHERE user_id IS NULL) AS null_pages, count(*) AS total_pages FROM public.pages;
SELECT count(*) FILTER (WHERE user_id IS NULL) AS null_chats, count(*) AS total_chats FROM public.ai_chats;
COMMIT;
