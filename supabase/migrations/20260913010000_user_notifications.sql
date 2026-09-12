-- ============================================================
-- Migration: User Notifications (server-delivered)
-- Server-side notification channel so admins can send, monitor and
-- manage notifications from the admin panel, and clients receive them
-- over realtime. Read state lives in a receipt table so broadcasts can
-- be read per-user without mutating shared rows.
-- ============================================================

-- ============================================================
-- 1. user_notifications — a row per recipient.
--    user_id NULL = broadcast (visible to every authenticated user).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  -- task | mention | ai | automation | invite | broadcast | system
  category text NOT NULL DEFAULT 'broadcast',
  -- info | success | warning | critical
  severity text NOT NULL DEFAULT 'info',
  page_id uuid,
  is_test boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Users see their own notifications and broadcasts; writes happen only
-- through the admin RPCs (no INSERT/UPDATE/DELETE policies on purpose).
DROP POLICY IF EXISTS "user_notifications_select_own_or_broadcast" ON public.user_notifications;
CREATE POLICY "user_notifications_select_own_or_broadcast" ON public.user_notifications
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR user_id IS NULL);

GRANT SELECT ON public.user_notifications TO authenticated;

CREATE INDEX IF NOT EXISTS user_notifications_user_created_idx
  ON public.user_notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_notifications_broadcast_idx
  ON public.user_notifications (created_at DESC) WHERE user_id IS NULL;

-- ============================================================
-- 2. user_notification_reads — per-user read receipts.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_notification_reads (
  notification_id uuid NOT NULL REFERENCES public.user_notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, user_id)
);

ALTER TABLE public.user_notification_reads ENABLE ROW LEVEL SECURITY;

-- Insert-only for writes: marking read is idempotent (ON CONFLICT DO
-- NOTHING); receipts are not enumerable or un-readable by clients.
DROP POLICY IF EXISTS "user_notification_reads_insert_own" ON public.user_notification_reads;
CREATE POLICY "user_notification_reads_insert_own" ON public.user_notification_reads
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- SELECT policy is REQUIRED for ON CONFLICT (the arbiter-index probe must
-- be able to resolve whether the conflicting row exists) and lets users
-- read back their own receipts.
DROP POLICY IF EXISTS "user_notification_reads_select_own" ON public.user_notification_reads;
CREATE POLICY "user_notification_reads_select_own" ON public.user_notification_reads
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

GRANT INSERT, SELECT ON public.user_notification_reads TO authenticated;

-- ============================================================
-- 3. Realtime
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'user_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
  END IF;
END $$;

-- ============================================================
-- 4. Admin RPCs
-- ============================================================

-- Send a notification. p_broadcast=true targets every user (one row with
-- user_id NULL). Otherwise p_user_ids (jsonb array of auth user ids,
-- capped at 500) produces one row per recipient. Test notifications are
-- never broadcast, require explicit targets, and are force-labelled.
CREATE OR REPLACE FUNCTION public.admin_user_notification_send(
  p_session_token text,
  p_title text,
  p_body text DEFAULT '',
  p_category text DEFAULT 'broadcast',
  p_severity text DEFAULT 'info',
  p_user_ids jsonb DEFAULT NULL,
  p_broadcast boolean DEFAULT false,
  p_page_id text DEFAULT NULL,
  p_is_test boolean DEFAULT false,
  p_min_role text DEFAULT 'admin'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_admin_email text;
  v_ids jsonb;
  v_count int;
BEGIN
  v_admin_id := require_admin_role(p_session_token, p_min_role);
  SELECT email INTO v_admin_email FROM admin_users WHERE id = v_admin_id;

  IF p_title IS NULL OR btrim(p_title) = '' THEN
    RAISE EXCEPTION 'TITLE_REQUIRED' USING ERRCODE = '22023';
  END IF;
  IF p_severity NOT IN ('info','success','warning','critical') THEN
    RAISE EXCEPTION 'INVALID_SEVERITY' USING ERRCODE = '22023';
  END IF;
  IF p_category NOT IN ('task','mention','ai','automation','invite','broadcast','system') THEN
    RAISE EXCEPTION 'INVALID_CATEGORY' USING ERRCODE = '22023';
  END IF;

  IF p_is_test THEN
    IF p_broadcast OR p_user_ids IS NULL OR jsonb_typeof(p_user_ids) <> 'array'
       OR jsonb_array_length(p_user_ids) = 0 THEN
      RAISE EXCEPTION 'TEST_REQUIRES_EXPLICIT_TARGETS'
        USING HINT = 'Test notifications must target explicit user ids and cannot be broadcast.';
    END IF;
    IF LEFT(btrim(p_title), 6) <> '[TEST]' THEN
      p_title := '[TEST] ' || btrim(p_title);
    END IF;
  END IF;

  IF p_broadcast THEN
    WITH ins AS (
      INSERT INTO public.user_notifications
        (user_id, title, body, category, severity, page_id, is_test, created_by, created_by_email)
      VALUES
        (NULL, LEFT(btrim(p_title), 200), LEFT(COALESCE(p_body, ''), 1000), p_category,
         p_severity, NULLIF(p_page_id, '')::uuid, p_is_test, v_admin_id, v_admin_email)
      RETURNING id
    )
    SELECT jsonb_agg(id), 1 INTO v_ids, v_count FROM ins;
  ELSE
    WITH ins AS (
      INSERT INTO public.user_notifications
        (user_id, title, body, category, severity, page_id, is_test, created_by, created_by_email)
      SELECT
        t.value::uuid, LEFT(btrim(p_title), 200), LEFT(COALESCE(p_body, ''), 1000), p_category,
        p_severity, NULLIF(p_page_id, '')::uuid, p_is_test, v_admin_id, v_admin_email
      FROM (SELECT value FROM jsonb_array_elements_text(p_user_ids) LIMIT 500) t
      RETURNING id
    )
    SELECT COALESCE(jsonb_agg(id), '[]'::jsonb), count(*) INTO v_ids, v_count FROM ins;

    IF v_count = 0 THEN
      RAISE EXCEPTION 'NO_VALID_TARGETS' USING ERRCODE = '22023';
    END IF;
  END IF;

  PERFORM log_admin_action(
    v_admin_id,
    CASE WHEN p_is_test THEN 'test_user_notification' ELSE 'send_user_notification' END,
    'user_notification',
    (v_ids->>0),
    LEFT(btrim(p_title), 200),
    jsonb_build_object('broadcast', p_broadcast, 'severity', p_severity,
      'category', p_category, 'is_test', p_is_test,
      'targets', CASE WHEN p_broadcast THEN 'all' ELSE v_count::text END)
  );

  RETURN jsonb_build_object('ids', v_ids, 'count', v_count, 'broadcast', p_broadcast);
END;
$$;

-- Overview for the admin dashboard: KPI aggregates + recent sends with
-- delivery/read stats (broadcast rows count reader receipts).
CREATE OR REPLACE FUNCTION public.admin_user_notification_overview(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_result jsonb;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'support');

  WITH s AS (
    SELECT
      CASE WHEN n.user_id IS NULL THEN (SELECT count(*) FROM auth.users) ELSE 1 END AS recipients,
      (SELECT count(*) FROM public.user_notification_reads r WHERE r.notification_id = n.id) AS reads
    FROM public.user_notifications n
    WHERE n.created_at > now() - interval '30 days'
  )
  SELECT jsonb_build_object(
    'kpis', jsonb_build_object(
      'sent_30d', (SELECT count(*) FROM public.user_notifications WHERE created_at > now() - interval '30 days'),
      'broadcasts_30d', (SELECT count(*) FROM public.user_notifications WHERE user_id IS NULL AND created_at > now() - interval '30 days'),
      'tests_30d', (SELECT count(*) FROM public.user_notifications WHERE is_test AND created_at > now() - interval '30 days'),
      'recipients_30d', COALESCE((SELECT SUM(recipients) FROM s), 0),
      'read_rate_30d', (
        SELECT CASE WHEN COALESCE(SUM(recipients), 0) = 0 THEN NULL
               ELSE ROUND(100.0 * SUM(reads) / SUM(recipients))::int END
        FROM s
      )
    ),
    'recent', COALESCE((
      SELECT jsonb_agg(row_to_json(x) ORDER BY x.created_at DESC)
      FROM (
        SELECT n.id, n.title, n.body, n.category, n.severity, n.is_test,
          n.created_by_email, n.created_at,
          (n.user_id IS NULL) AS broadcast,
          CASE WHEN n.user_id IS NULL THEN 'All users'
               ELSE COALESCE((SELECT up.user_name FROM user_profiles up WHERE up.id = n.user_id), n.user_id::text) END AS target_label,
          (SELECT count(*) FROM public.user_notification_reads r WHERE r.notification_id = n.id) AS read_count
        FROM public.user_notifications n
        ORDER BY n.created_at DESC
        LIMIT 50
      ) x
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Delete a sent notification (also cascades its read receipts).
CREATE OR REPLACE FUNCTION public.admin_user_notification_delete(
  p_session_token text,
  p_notification_id uuid,
  p_min_role text DEFAULT 'admin'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  v_admin_id := require_admin_role(p_session_token, p_min_role);
  DELETE FROM public.user_notifications WHERE id = p_notification_id;
  IF FOUND THEN
    PERFORM log_admin_action(v_admin_id, 'delete_user_notification',
      'user_notification', p_notification_id::text, NULL, NULL);
  END IF;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION
  public.admin_user_notification_send(text, text, text, text, text, jsonb, boolean, text, boolean, text),
  public.admin_user_notification_overview(text),
  public.admin_user_notification_delete(text, uuid, text)
TO authenticated;
