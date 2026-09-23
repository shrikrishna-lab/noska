-- Help-desk performance pass.
--
-- * Thread-read index (ticket_id, created_at) + partial index for the
--   last-admin-reply lookup inside support_my_tickets().
-- * support_open_count(): single-integer RPC for the dashboard More-menu
--   badge, so the 60s poll no longer pulls full ticket rows.

CREATE INDEX IF NOT EXISTS support_messages_ticket_created_idx
  ON public.support_messages(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS support_messages_admin_replies_idx
  ON public.support_messages(ticket_id, created_at DESC) WHERE sender_type = 'admin';

CREATE OR REPLACE FUNCTION public.support_open_count()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sub text := NULLIF(auth.jwt()->>'sub','');
  v_email text := lower(NULLIF(auth.jwt()->>'email',''));
BEGIN
  IF v_sub IS NULL AND v_email IS NULL THEN RETURN 0; END IF;
  RETURN (SELECT count(*)::integer FROM public.support_tickets st
    WHERE st.status IN ('open','in_progress','pending')
      AND ((v_sub IS NOT NULL AND st.user_id = v_sub)
        OR (v_email IS NOT NULL AND st.user_id IS NULL AND lower(st.email) = v_email)));
END $$;

REVOKE ALL ON FUNCTION public.support_open_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.support_open_count() TO anon, authenticated;
