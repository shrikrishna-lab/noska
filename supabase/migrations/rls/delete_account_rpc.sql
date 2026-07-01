-- =====================================================================
-- delete_account() RPC — supports R2.3 self-delete via server function.
-- Source: .kiro/specs/auth-rls-security-migration/design.md (verbatim)
-- SECURITY DEFINER so a user can delete only their OWN account and cascade
-- related rows. Runs with definer privileges but self-scopes to auth.uid().
-- audit_events rows are intentionally RETAINED for audit integrity (accepted).
-- =====================================================================
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
  -- audit_events intentionally retained (integrity); accepted decision.
END;
$$;
REVOKE ALL ON FUNCTION public.delete_account() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.delete_account() TO authenticated;
