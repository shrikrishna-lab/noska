-- Lockdown for dormant tables flagged with RLS disabled.
--
-- Verified 2026-09-23: NO application code (main app, admin app, edge
-- functions, RPCs) reads or writes these tables. They are a seeded reference
-- catalog (permissions, 34 rows) and empty import-staging tables.
--
-- * permissions: public read-only catalog. anon/authenticated keep SELECT;
--   all writes revoked from client roles (service_role / DEFINER code unaffected).
-- * member_imports / member_import_errors: owner-only access for authenticated
--   (uploaded_by = JWT sub, string-compared like the ai_chats policies —
--   never auth.uid(), whose uuid cast breaks on Clerk-style subs).
--   Nothing for anon. Staging rows stay private to the uploader.

-- ─── permissions: read-only catalog ──────────────────────────────────────────
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS permissions_read_catalog ON public.permissions;
CREATE POLICY permissions_read_catalog ON public.permissions
  FOR SELECT TO anon, authenticated USING (true);

REVOKE ALL ON public.permissions FROM anon, authenticated;
GRANT SELECT ON public.permissions TO anon, authenticated;

-- ─── member_imports: owner-only ──────────────────────────────────────────────
ALTER TABLE public.member_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS member_imports_owner_all ON public.member_imports;
CREATE POLICY member_imports_owner_all ON public.member_imports
  FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'sub') = uploaded_by)
  WITH CHECK ((auth.jwt() ->> 'sub') = uploaded_by);

REVOKE ALL ON public.member_imports FROM anon;

-- ─── member_import_errors: owner-only via parent import ──────────────────────
ALTER TABLE public.member_import_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS member_import_errors_owner_all ON public.member_import_errors;
CREATE POLICY member_import_errors_owner_all ON public.member_import_errors
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.member_imports mi
    WHERE mi.id = member_import_errors.import_id
      AND (auth.jwt() ->> 'sub') = mi.uploaded_by
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.member_imports mi
    WHERE mi.id = member_import_errors.import_id
      AND (auth.jwt() ->> 'sub') = mi.uploaded_by
  ));

REVOKE ALL ON public.member_import_errors FROM anon;
