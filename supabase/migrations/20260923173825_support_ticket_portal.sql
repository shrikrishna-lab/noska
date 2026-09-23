-- Noska Help Desk — user ticket portal (dashboard + marketing form) + admin realtime
--
-- * Extends support_tickets with portal columns (ticket_number, description,
--   platform, user_agent, user_id) so inserts from the app actually succeed.
-- * Cascades support_messages on ticket delete; auto-maintains replies/last_update.
-- * Relays support_messages changes through admin_realtime_outbox (live admin chat).
-- * Four SECURITY DEFINER RPCs with in-body auth checks (Clerk/GoTrue JWT claims):
--     support_create_ticket  (anon + authenticated, validated + rate-limited)
--     support_my_tickets     (owner-only via JWT sub / verified email claim)
--     support_ticket_messages(owner-only thread read)
--     support_reply          (owner-only reply, reopens resolved/pending)
-- Tables stay rpc-only for anon/authenticated roles (see *_rpc_only policies).

-- ─── 1. Portal columns ───────────────────────────────────────────────────────
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS ticket_number text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS platform text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS user_id text;

CREATE UNIQUE INDEX IF NOT EXISTS support_tickets_ticket_number_key
  ON public.support_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS support_tickets_user_id_idx
  ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS support_tickets_email_idx
  ON public.support_tickets(email);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx
  ON public.support_tickets(status);

-- ─── 2. Cascade messages on ticket delete ────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_messages_ticket_id_fkey') THEN
    ALTER TABLE public.support_messages
      ADD CONSTRAINT support_messages_ticket_id_fkey
      FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── 3. Auto-maintain replies + last_update ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.support_bump_ticket_on_message()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.support_tickets
  SET replies = COALESCE(replies, 0) + 1, last_update = NOW()
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_support_messages_bump ON public.support_messages;
CREATE TRIGGER trg_support_messages_bump AFTER INSERT ON public.support_messages
FOR EACH ROW EXECUTE FUNCTION public.support_bump_ticket_on_message();

-- ─── 4. Realtime relay for admin live chat ───────────────────────────────────
DROP TRIGGER IF EXISTS trg_admin_rt_messages ON public.support_messages;
CREATE TRIGGER trg_admin_rt_messages AFTER INSERT OR UPDATE OR DELETE ON public.support_messages
FOR EACH ROW EXECUTE FUNCTION admin_realtime_notify();

-- ─── 5. User portal RPCs ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.support_create_ticket(
  p_subject text, p_description text, p_category text DEFAULT 'bug',
  p_priority text DEFAULT 'medium', p_email text DEFAULT NULL,
  p_name text DEFAULT NULL, p_platform text DEFAULT NULL, p_user_agent text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sub text := NULLIF(auth.jwt()->>'sub','');
  v_email text := lower(NULLIF(trim(p_email),''));
  v_name text := NULLIF(trim(p_name),'');
  v_subject text := NULLIF(trim(p_subject),'');
  v_desc text := NULLIF(trim(p_description),'');
  v_cat text := lower(NULLIF(trim(p_category),''));
  v_pri text := lower(NULLIF(trim(p_priority),''));
  v_ticket_no text; v_ticket_id uuid; v_tries int := 0;
BEGIN
  IF v_subject IS NULL OR char_length(v_subject) < 4 THEN RAISE EXCEPTION 'SUBJECT_TOO_SHORT'; END IF;
  IF char_length(v_subject) > 200 THEN RAISE EXCEPTION 'SUBJECT_TOO_LONG'; END IF;
  IF v_desc IS NULL OR char_length(v_desc) < 10 THEN RAISE EXCEPTION 'DESCRIPTION_TOO_SHORT'; END IF;
  IF char_length(v_desc) > 8000 THEN RAISE EXCEPTION 'DESCRIPTION_TOO_LONG'; END IF;
  IF v_email IS NULL OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'INVALID_EMAIL'; END IF;
  IF v_name IS NOT NULL AND char_length(v_name) > 120 THEN RAISE EXCEPTION 'NAME_TOO_LONG'; END IF;
  -- Normalize portal categories onto the table CHECK constraint values.
  v_cat := CASE v_cat
    WHEN 'bug' THEN 'technical' WHEN 'integration' THEN 'technical'
    WHEN 'enterprise' THEN 'account' WHEN 'billing' THEN 'billing'
    WHEN 'technical' THEN 'technical' WHEN 'account' THEN 'account'
    WHEN 'feature' THEN 'feature' ELSE 'other' END;
  IF v_pri IS NULL OR v_pri NOT IN ('low','medium','high','urgent') THEN v_pri := 'medium'; END IF;
  IF (SELECT count(*) FROM public.support_tickets WHERE email = v_email AND created_at > NOW() - interval '24 hours') >= 10 THEN
    RAISE EXCEPTION 'RATE_LIMITED';
  END IF;
  LOOP
    v_ticket_no := 'NSK-' || lpad((floor(random()*900000)+100000)::int::text, 6, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.support_tickets WHERE ticket_number = v_ticket_no);
    v_tries := v_tries + 1;
    IF v_tries > 20 THEN RAISE EXCEPTION 'NUMBER_COLLISION'; END IF;
  END LOOP;
  INSERT INTO public.support_tickets(ticket_number, subject, description, user_name, email, category, priority, status, platform, user_agent, user_id)
  VALUES (v_ticket_no, v_subject, v_desc, COALESCE(v_name, split_part(v_email,'@',1)), v_email, v_cat, v_pri, 'open', NULLIF(trim(p_platform),''), NULLIF(trim(p_user_agent),''), v_sub)
  RETURNING id INTO v_ticket_id;
  INSERT INTO public.support_messages(ticket_id, sender_type, sender_name, message)
  VALUES (v_ticket_id, 'user', COALESCE(v_name, split_part(v_email,'@',1)), v_desc);
  RETURN jsonb_build_object('id', v_ticket_id, 'ticket_number', v_ticket_no);
END $$;

CREATE OR REPLACE FUNCTION public.support_my_tickets()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sub text := NULLIF(auth.jwt()->>'sub','');
  v_email text := lower(NULLIF(auth.jwt()->>'email',''));
BEGIN
  IF v_sub IS NULL AND v_email IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(row ORDER BY row.last_update DESC) FROM (
      SELECT st.*,
        (SELECT max(sm.created_at) FROM public.support_messages sm WHERE sm.ticket_id = st.id AND sm.sender_type = 'admin') AS last_admin_reply_at
      FROM public.support_tickets st
      WHERE (v_sub IS NOT NULL AND st.user_id = v_sub)
         OR (v_email IS NOT NULL AND st.user_id IS NULL AND lower(st.email) = v_email)
    ) row
  ), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.support_ticket_messages(p_ticket_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sub text := NULLIF(auth.jwt()->>'sub','');
  v_email text := lower(NULLIF(auth.jwt()->>'email',''));
BEGIN
  IF v_sub IS NULL AND v_email IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.support_tickets st
    WHERE st.id = p_ticket_id
      AND ((v_sub IS NOT NULL AND st.user_id = v_sub)
        OR (v_email IS NOT NULL AND st.user_id IS NULL AND lower(st.email) = v_email))) THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(m ORDER BY m.created_at ASC) FROM (
      SELECT sm.* FROM public.support_messages sm WHERE sm.ticket_id = p_ticket_id ORDER BY sm.created_at ASC
    ) m
  ), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.support_reply(p_ticket_id uuid, p_message text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sub text := NULLIF(auth.jwt()->>'sub','');
  v_email text := lower(NULLIF(auth.jwt()->>'email',''));
  v_msg text := NULLIF(trim(p_message),'');
  v_ticket public.support_tickets%ROWTYPE; v_row jsonb;
BEGIN
  IF v_sub IS NULL AND v_email IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF v_msg IS NULL THEN RAISE EXCEPTION 'MESSAGE_EMPTY'; END IF;
  IF char_length(v_msg) > 4000 THEN RAISE EXCEPTION 'MESSAGE_TOO_LONG'; END IF;
  SELECT * INTO v_ticket FROM public.support_tickets st WHERE st.id = p_ticket_id
    AND ((v_sub IS NOT NULL AND st.user_id = v_sub)
      OR (v_email IS NOT NULL AND st.user_id IS NULL AND lower(st.email) = v_email));
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_ticket.status = 'closed' THEN RAISE EXCEPTION 'TICKET_CLOSED'; END IF;
  INSERT INTO public.support_messages AS sm(ticket_id, sender_type, sender_name, message)
  VALUES (p_ticket_id, 'user', v_ticket.user_name, v_msg)
  RETURNING to_jsonb(sm) INTO v_row;
  -- NOTE: the INSERT target must be aliased (AS sm); schema-qualified
  -- to_jsonb(public.support_messages) does not resolve in RETURNING.
  IF v_ticket.status = 'resolved' THEN
    UPDATE public.support_tickets SET status = 'open' WHERE id = p_ticket_id;
  ELSIF v_ticket.status = 'pending' THEN
    UPDATE public.support_tickets SET status = 'in_progress' WHERE id = p_ticket_id;
  END IF;
  RETURN v_row;
END $$;

REVOKE ALL ON FUNCTION public.support_create_ticket(text,text,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.support_create_ticket(text,text,text,text,text,text,text,text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.support_my_tickets() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.support_my_tickets() TO anon, authenticated;
REVOKE ALL ON FUNCTION public.support_ticket_messages(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.support_ticket_messages(uuid) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.support_reply(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.support_reply(uuid,text) TO anon, authenticated;
