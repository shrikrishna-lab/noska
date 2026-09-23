-- Help-desk portal, part 2: anonymous tracking + one-time email lease.
--
-- * support_lookup_ticket: exact (ticket_number, email) match returns the
--   ticket + its message thread. Same NOT_FOUND for mismatches (no oracle).
-- * support_claim_confirm_email: one-time lease for the confirmation email.
--   Atomically verifies the match and stamps confirm_email_sent_at; second
--   claim raises ALREADY_SENT (replay-proof). The support-notify edge
--   function calls this via service_role, then sends through Resend.

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS confirm_email_sent_at timestamptz;

CREATE OR REPLACE FUNCTION public.support_lookup_ticket(p_ticket_number text, p_email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_no text := upper(NULLIF(trim(p_ticket_number),''));
  v_email text := lower(NULLIF(trim(p_email),''));
  v_ticket public.support_tickets%ROWTYPE;
BEGIN
  IF v_no IS NULL OR v_no !~ '^NSK-[0-9]{6}$' THEN RAISE EXCEPTION 'INVALID_TICKET_NUMBER'; END IF;
  IF v_email IS NULL OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'INVALID_EMAIL'; END IF;
  SELECT * INTO v_ticket FROM public.support_tickets st
    WHERE st.ticket_number = v_no AND lower(st.email) = v_email;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  RETURN jsonb_build_object(
    'ticket', to_jsonb(v_ticket),
    'messages', COALESCE((
      SELECT jsonb_agg(m ORDER BY m.created_at ASC) FROM (
        SELECT sm.* FROM public.support_messages sm WHERE sm.ticket_id = v_ticket.id ORDER BY sm.created_at ASC
      ) m
    ), '[]'::jsonb)
  );
END $$;

CREATE OR REPLACE FUNCTION public.support_claim_confirm_email(p_ticket_number text, p_email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_no text := upper(NULLIF(trim(p_ticket_number),''));
  v_email text := lower(NULLIF(trim(p_email),''));
  v_ticket public.support_tickets%ROWTYPE;
BEGIN
  IF v_no IS NULL OR v_no !~ '^NSK-[0-9]{6}$' THEN RAISE EXCEPTION 'INVALID_TICKET_NUMBER'; END IF;
  IF v_email IS NULL OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'INVALID_EMAIL'; END IF;
  SELECT * INTO v_ticket FROM public.support_tickets st
    WHERE st.ticket_number = v_no AND lower(st.email) = v_email FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_ticket.confirm_email_sent_at IS NOT NULL THEN RAISE EXCEPTION 'ALREADY_SENT'; END IF;
  UPDATE public.support_tickets SET confirm_email_sent_at = NOW() WHERE id = v_ticket.id;
  RETURN jsonb_build_object(
    'id', v_ticket.id, 'ticket_number', v_ticket.ticket_number,
    'email', v_ticket.email, 'user_name', v_ticket.user_name, 'subject', v_ticket.subject);
END $$;

REVOKE ALL ON FUNCTION public.support_lookup_ticket(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.support_lookup_ticket(text,text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.support_claim_confirm_email(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.support_claim_confirm_email(text,text) TO anon, authenticated;
