-- ============================================================
-- Migration: Admin realtime relay (outbox) table
--
-- The admin panel connects to Supabase with the anon key, so
-- postgres_changes events for admin-only tables (notifications,
-- audit_events, user_profiles, ...) are filtered out by RLS and
-- NEVER delivered.  This migration adds a dedicated relay table
-- that anon clients CAN subscribe to, plus SECURITY DEFINER
-- triggers that log every change on the tables the dashboard and
-- monitoring pages care about.  The relay stores only non-sensitive
-- metadata (table, event, row id, timestamp) — never row content.
-- ============================================================

-- 1. Relay table
CREATE TABLE IF NOT EXISTS public.admin_realtime_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  event text NOT NULL,                 -- INSERT | UPDATE | DELETE
  record_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_realtime_outbox_created
  ON public.admin_realtime_outbox (created_at DESC);

-- 2. RLS: anon can SELECT (required for realtime delivery to the
--    anon-key admin client) but can never write.
ALTER TABLE public.admin_realtime_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_realtime_outbox_select_all
  ON public.admin_realtime_outbox
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY admin_realtime_outbox_no_write
  ON public.admin_realtime_outbox
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

GRANT SELECT ON public.admin_realtime_outbox TO anon, authenticated;

-- 3. Trigger function: SECURITY DEFINER so it can write to the relay
--    regardless of the calling role/RLS.  Stores only ids.
CREATE OR REPLACE FUNCTION public.admin_realtime_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_record_id text;
  v_random double precision;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_record_id := COALESCE(OLD.id::text, '');
  ELSE
    v_record_id := COALESCE(NEW.id::text, '');
  END IF;

  INSERT INTO public.admin_realtime_outbox (table_name, event, record_id)
  VALUES (TG_TABLE_NAME, TG_OP, v_record_id);

  -- Probabilistic prune so the relay never grows unbounded.
  v_random := random();
  IF v_random < 0.02 THEN
    DELETE FROM public.admin_realtime_outbox
    WHERE created_at < now() - interval '1 hour';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. Attach triggers to every table the admin dashboard / monitoring
--    pages display.  Each row change publishes a relay event so the
--    admin client can invalidate its react-query cache in realtime.

DROP TRIGGER IF EXISTS trg_admin_rt_notifications ON public.notifications;
CREATE TRIGGER trg_admin_rt_notifications
  AFTER INSERT OR UPDATE OR DELETE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.admin_realtime_notify();

DROP TRIGGER IF EXISTS trg_admin_rt_audit_events ON public.audit_events;
CREATE TRIGGER trg_admin_rt_audit_events
  AFTER INSERT OR UPDATE OR DELETE ON public.audit_events
  FOR EACH ROW EXECUTE FUNCTION public.admin_realtime_notify();

DROP TRIGGER IF EXISTS trg_admin_rt_user_profiles ON public.user_profiles;
CREATE TRIGGER trg_admin_rt_user_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.admin_realtime_notify();

DROP TRIGGER IF EXISTS trg_admin_rt_pages ON public.pages;
CREATE TRIGGER trg_admin_rt_pages
  AFTER INSERT OR UPDATE OR DELETE ON public.pages
  FOR EACH ROW EXECUTE FUNCTION public.admin_realtime_notify();

DROP TRIGGER IF EXISTS trg_admin_rt_page_versions ON public.page_versions;
CREATE TRIGGER trg_admin_rt_page_versions
  AFTER INSERT OR UPDATE OR DELETE ON public.page_versions
  FOR EACH ROW EXECUTE FUNCTION public.admin_realtime_notify();

DROP TRIGGER IF EXISTS trg_admin_rt_workspaces ON public.workspaces;
CREATE TRIGGER trg_admin_rt_workspaces
  AFTER INSERT OR UPDATE OR DELETE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.admin_realtime_notify();

DROP TRIGGER IF EXISTS trg_admin_rt_waitlist ON public.waitlist_entries;
CREATE TRIGGER trg_admin_rt_waitlist
  AFTER INSERT OR UPDATE OR DELETE ON public.waitlist_entries
  FOR EACH ROW EXECUTE FUNCTION public.admin_realtime_notify();

DROP TRIGGER IF EXISTS trg_admin_rt_campaigns ON public.email_campaigns;
CREATE TRIGGER trg_admin_rt_campaigns
  AFTER INSERT OR UPDATE OR DELETE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.admin_realtime_notify();

DROP TRIGGER IF EXISTS trg_admin_rt_feedback ON public.feedback;
CREATE TRIGGER trg_admin_rt_feedback
  AFTER INSERT OR UPDATE OR DELETE ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.admin_realtime_notify();

DROP TRIGGER IF EXISTS trg_admin_rt_tickets ON public.support_tickets;
CREATE TRIGGER trg_admin_rt_tickets
  AFTER INSERT OR UPDATE OR DELETE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.admin_realtime_notify();

DROP TRIGGER IF EXISTS trg_admin_rt_flags ON public.feature_flags;
CREATE TRIGGER trg_admin_rt_flags
  AFTER INSERT OR UPDATE OR DELETE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.admin_realtime_notify();

DROP TRIGGER IF EXISTS trg_admin_rt_broadcasts ON public.admin_broadcasts;
CREATE TRIGGER trg_admin_rt_broadcasts
  AFTER INSERT OR UPDATE OR DELETE ON public.admin_broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.admin_realtime_notify();

DROP TRIGGER IF EXISTS trg_admin_rt_webhook_deliveries ON public.webhook_deliveries;
CREATE TRIGGER trg_admin_rt_webhook_deliveries
  AFTER INSERT OR UPDATE OR DELETE ON public.webhook_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.admin_realtime_notify();

DROP TRIGGER IF EXISTS trg_admin_rt_banned_users ON public.banned_users;
CREATE TRIGGER trg_admin_rt_banned_users
  AFTER INSERT OR UPDATE OR DELETE ON public.banned_users
  FOR EACH ROW EXECUTE FUNCTION public.admin_realtime_notify();

DROP TRIGGER IF EXISTS trg_admin_rt_collab ON public.collaboration_sessions;
CREATE TRIGGER trg_admin_rt_collab
  AFTER INSERT OR UPDATE OR DELETE ON public.collaboration_sessions
  FOR EACH ROW EXECUTE FUNCTION public.admin_realtime_notify();

DROP TRIGGER IF EXISTS trg_admin_rt_ai_chats ON public.ai_chats;
CREATE TRIGGER trg_admin_rt_ai_chats
  AFTER INSERT OR UPDATE OR DELETE ON public.ai_chats
  FOR EACH ROW EXECUTE FUNCTION public.admin_realtime_notify();

DROP TRIGGER IF EXISTS trg_admin_rt_subscriptions ON public.subscriptions;
CREATE TRIGGER trg_admin_rt_subscriptions
  AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.admin_realtime_notify();

DROP TRIGGER IF EXISTS trg_admin_rt_payments ON public.payments;
CREATE TRIGGER trg_admin_rt_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.admin_realtime_notify();

-- 5. Enable realtime for the relay table (the only table anon may
--    actually receive events for).
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_realtime_outbox;