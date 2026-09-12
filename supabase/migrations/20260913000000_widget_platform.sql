-- ============================================================
-- Migration: Widget Platform
-- Tables: widget_layouts (user personalization), widget_catalog
-- (admin-controlled availability/rollout), widget_analytics
-- (append-only client telemetry), widget_audit_log (admin actions).
-- RPCs: user layout + catalog + telemetry, admin management RPCs
-- gated on require_admin_role (existing helper).
-- ============================================================

-- ============================================================
-- 1. widget_layouts — one layout per user per workspace key
-- ============================================================
CREATE TABLE IF NOT EXISTS public.widget_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id text NOT NULL DEFAULT 'personal',
  layout jsonb NOT NULL DEFAULT '{"widgets":[]}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, workspace_id)
);

ALTER TABLE public.widget_layouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "widget_layouts_owner_select" ON public.widget_layouts;
CREATE POLICY "widget_layouts_owner_select" ON public.widget_layouts
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "widget_layouts_owner_insert" ON public.widget_layouts;
CREATE POLICY "widget_layouts_owner_insert" ON public.widget_layouts
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "widget_layouts_owner_update" ON public.widget_layouts;
CREATE POLICY "widget_layouts_owner_update" ON public.widget_layouts
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "widget_layouts_owner_delete" ON public.widget_layouts;
CREATE POLICY "widget_layouts_owner_delete" ON public.widget_layouts
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.widget_layouts TO authenticated;

-- ============================================================
-- 2. widget_catalog — product-level widget configuration.
-- Readable by any authenticated user (availability is product
-- config, not user data); writes only through admin RPCs.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.widget_catalog (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL DEFAULT 'productivity',
  -- enabled | beta | disabled
  status text NOT NULL DEFAULT 'enabled',
  rollout_percent int NOT NULL DEFAULT 100
    CHECK (rollout_percent BETWEEN 0 AND 100),
  default_enabled boolean NOT NULL DEFAULT true,
  default_size text NOT NULL DEFAULT 'medium',
  allowed_sizes text[] NOT NULL DEFAULT ARRAY['small','medium'],
  platforms text[] NOT NULL DEFAULT ARRAY['web','macos','windows','linux'],
  required_integration text,
  min_app_version text,
  default_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  version text NOT NULL DEFAULT '1.0.0',
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.widget_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "widget_catalog_read" ON public.widget_catalog;
CREATE POLICY "widget_catalog_read" ON public.widget_catalog
  FOR SELECT TO authenticated
  USING (true);

GRANT SELECT ON public.widget_catalog TO authenticated;

-- ============================================================
-- 3. widget_analytics — append-only client telemetry.
-- Insert-only for the owner; reads only via admin RPCs.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.widget_analytics (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  widget_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  -- render | interact | error | load
  event text NOT NULL,
  platform text,
  app_version text,
  load_ms int,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.widget_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "widget_analytics_insert_own" ON public.widget_analytics;
CREATE POLICY "widget_analytics_insert_own" ON public.widget_analytics
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT INSERT ON public.widget_analytics TO authenticated;

CREATE INDEX IF NOT EXISTS widget_analytics_widget_created_idx
  ON public.widget_analytics (widget_id, created_at DESC);
CREATE INDEX IF NOT EXISTS widget_analytics_event_idx
  ON public.widget_analytics (event, created_at DESC);

-- ============================================================
-- 4. widget_audit_log — admin actions on widget config.
-- No direct policies: reads go through admin RPCs only.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.widget_audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_id uuid,
  admin_email text,
  action text NOT NULL,
  widget_id text,
  previous jsonb,
  next jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.widget_audit_log ENABLE ROW LEVEL SECURITY;
-- deny-all: no policies created on purpose.

-- ============================================================
-- 5. updated_at trigger
-- ============================================================
DROP TRIGGER IF EXISTS widget_catalog_updated_at ON public.widget_catalog;
CREATE TRIGGER widget_catalog_updated_at
  BEFORE UPDATE ON public.widget_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 6. User RPCs
-- ============================================================

-- Availability snapshot for the calling user. status='disabled' or
-- rollout miss yields available=false; the client hides those widgets.
CREATE OR REPLACE FUNCTION public.get_widget_catalog()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = 'public'
AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  FROM (
    SELECT
      c.id,
      c.name,
      c.description,
      c.category,
      CASE WHEN c.status = 'enabled' THEN 'enabled' ELSE c.status END AS status,
      c.status <> 'disabled'
        AND (c.rollout_percent >= 100
             OR abs(hashtext(auth.uid()::text)) % 100 < c.rollout_percent) AS available,
      c.default_enabled,
      c.default_size,
      to_jsonb(c.allowed_sizes) AS allowed_sizes,
      to_jsonb(c.platforms) AS platforms,
      c.required_integration,
      c.min_app_version,
      c.default_config,
      c.version
    FROM public.widget_catalog c
    ORDER BY c.category, c.name
  ) t;
$$;

GRANT EXECUTE ON FUNCTION public.get_widget_catalog() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_widget_layout(p_workspace_id text DEFAULT 'personal')
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = 'public'
AS $$
  SELECT COALESCE(
    (SELECT layout FROM public.widget_layouts
     WHERE user_id = auth.uid() AND workspace_id = p_workspace_id),
    NULL::jsonb
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_widget_layout(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.save_widget_layout(p_workspace_id text, p_layout jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public'
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.widget_layouts (user_id, workspace_id, layout)
  VALUES (auth.uid(), p_workspace_id, p_layout)
  ON CONFLICT (user_id, workspace_id)
  DO UPDATE SET layout = EXCLUDED.layout, updated_at = now();
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_widget_layout(text, jsonb) TO authenticated;

-- Batched client telemetry: p_events is a jsonb array of
-- {widget_id, event, platform, app_version, load_ms, error_message}.
CREATE OR REPLACE FUNCTION public.record_widget_events(p_events jsonb)
RETURNS int
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public'
AS $$
DECLARE
  v_count int;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.widget_analytics
    (widget_id, user_id, event, platform, app_version, load_ms, error_message)
  SELECT
    e->>'widget_id',
    auth.uid(),
    e->>'event',
    e->>'platform',
    e->>'app_version',
    NULLIF(e->>'load_ms', '')::int,
    LEFT(e->>'error_message', 500)
  FROM jsonb_array_elements(p_events) e
  WHERE e->>'widget_id' IS NOT NULL
    AND e->>'event' IN ('render','interact','error','load');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_widget_events(jsonb) TO authenticated;

-- ============================================================
-- 7. Admin RPCs (gated on require_admin_role)
-- ============================================================

-- Update one catalog row. Field-whitelisted; audits previous state.
CREATE OR REPLACE FUNCTION public.admin_widget_update(
  p_session_token text,
  p_widget_id text,
  p_data jsonb,
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
  v_previous public.widget_catalog;
  v_key text;
  v_updated public.widget_catalog;
  v_allowed text[] := ARRAY[
    'name','description','category','status','rollout_percent',
    'default_enabled','default_size','allowed_sizes','platforms',
    'required_integration','min_app_version','default_config','version'
  ];
BEGIN
  v_admin_id := require_admin_role(p_session_token, p_min_role);
  SELECT email INTO v_admin_email FROM admin_users WHERE id = v_admin_id;

  SELECT * INTO v_previous FROM public.widget_catalog WHERE id = p_widget_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'WIDGET_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.widget_catalog SET
    name = COALESCE((SELECT CASE WHEN jsonb_typeof(p_data->'name') = 'string' THEN p_data->>'name' END), name),
    description = COALESCE((SELECT CASE WHEN jsonb_typeof(p_data->'description') = 'string' THEN p_data->>'description' END), description),
    category = COALESCE((SELECT CASE WHEN jsonb_typeof(p_data->'category') = 'string' THEN p_data->>'category' END), category),
    status = COALESCE((SELECT CASE WHEN p_data->>'status' IN ('enabled','beta','disabled') THEN p_data->>'status' END), status),
    rollout_percent = COALESCE(
      (SELECT CASE WHEN jsonb_typeof(p_data->'rollout_percent') = 'number'
        THEN LEAST(100, GREATEST(0, (p_data->>'rollout_percent')::int)) END),
      rollout_percent),
    default_enabled = COALESCE((SELECT CASE WHEN jsonb_typeof(p_data->'default_enabled') = 'boolean' THEN (p_data->>'default_enabled')::boolean END), default_enabled),
    default_size = COALESCE((SELECT CASE WHEN p_data->>'default_size' IN ('small','medium','large','wide') THEN p_data->>'default_size' END), default_size),
    allowed_sizes = COALESCE(
      (SELECT CASE WHEN jsonb_typeof(p_data->'allowed_sizes') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(p_data->'allowed_sizes'))::text[] END),
      allowed_sizes),
    platforms = COALESCE(
      (SELECT CASE WHEN jsonb_typeof(p_data->'platforms') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(p_data->'platforms'))::text[] END),
      platforms),
    required_integration = CASE WHEN (p_data -> 'required_integration') IS NOT NULL
        AND jsonb_typeof(p_data->'required_integration') = 'null' THEN NULL
      ELSE COALESCE(
        (SELECT CASE WHEN jsonb_typeof(p_data->'required_integration') = 'string' THEN p_data->>'required_integration' END),
        required_integration) END,
    min_app_version = COALESCE((SELECT CASE WHEN jsonb_typeof(p_data->'min_app_version') = 'string' THEN p_data->>'min_app_version' END), min_app_version),
    default_config = COALESCE((SELECT CASE WHEN jsonb_typeof(p_data->'default_config') = 'object' THEN p_data->'default_config' END), default_config),
    version = COALESCE((SELECT CASE WHEN jsonb_typeof(p_data->'version') = 'string' THEN p_data->>'version' END), version),
    updated_by = v_admin_id
  WHERE id = p_widget_id
  RETURNING * INTO v_updated;

  INSERT INTO public.widget_audit_log
    (admin_id, admin_email, action, widget_id, previous, next)
  VALUES
    (v_admin_id, v_admin_email, 'update_widget', p_widget_id,
     to_jsonb(v_previous), to_jsonb(v_updated));

  RETURN to_jsonb(v_updated);
END;
$$;

-- Catalog + aggregate health snapshot for the Widgets overview page.
CREATE OR REPLACE FUNCTION public.admin_widget_overview(p_session_token text)
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

  SELECT jsonb_build_object(
    'catalog', COALESCE(jsonb_agg(row_to_json(c)), '[]'::jsonb),
    'totals', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'enabled', COUNT(*) FILTER (WHERE status = 'enabled'),
        'beta', COUNT(*) FILTER (WHERE status = 'beta'),
        'disabled', COUNT(*) FILTER (WHERE status = 'disabled')
      ) FROM public.widget_catalog
    ),
    'events_7d', (
      SELECT jsonb_build_object(
        'renders', COUNT(*) FILTER (WHERE event = 'render'),
        'interactions', COUNT(*) FILTER (WHERE event = 'interact'),
        'errors', COUNT(*) FILTER (WHERE event = 'error'),
        'avg_load_ms', ROUND(AVG(load_ms) FILTER (WHERE event = 'load')),
        'p95_load_ms', ROUND(percentile_cont(0.95) WITHIN GROUP (ORDER BY load_ms) FILTER (WHERE event = 'load')),
        'unique_users', COUNT(DISTINCT user_id)
      ) FROM public.widget_analytics
      WHERE created_at > now() - interval '7 days'
    ),
    'per_widget_7d', COALESCE((
      SELECT jsonb_agg(row_to_json(w))
      FROM (
        SELECT widget_id,
          COUNT(*) FILTER (WHERE event = 'render') AS renders,
          COUNT(*) FILTER (WHERE event = 'interact') AS interactions,
          COUNT(*) FILTER (WHERE event = 'error') AS errors,
          COUNT(DISTINCT user_id) AS users,
          ROUND(AVG(load_ms) FILTER (WHERE event = 'load'))::int AS avg_load_ms
        FROM public.widget_analytics
        WHERE created_at > now() - interval '7 days'
        GROUP BY widget_id
      ) w
    ), '[]'::jsonb)
  ) INTO v_result
  FROM public.widget_catalog c;

  RETURN v_result;
END;
$$;

-- Daily analytics buckets for one widget.
CREATE OR REPLACE FUNCTION public.admin_widget_analytics(
  p_session_token text,
  p_widget_id text,
  p_days int DEFAULT 14
)
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

  SELECT jsonb_build_object(
    'daily', COALESCE((
      SELECT jsonb_agg(row_to_json(d) ORDER BY d.day)
      FROM (
        SELECT
          to_char(d.day, 'YYYY-MM-DD') AS day,
          COUNT(a.id) FILTER (WHERE a.event = 'render') AS renders,
          COUNT(a.id) FILTER (WHERE a.event = 'interact') AS interactions,
          COUNT(a.id) FILTER (WHERE a.event = 'error') AS errors,
          COUNT(DISTINCT a.user_id) AS users,
          ROUND(AVG(a.load_ms) FILTER (WHERE a.event = 'load'))::int AS avg_load_ms
        FROM generate_series(
          (now() - make_interval(days => GREATEST(p_days, 1))::date), now()::date, '1 day'
        ) d(day)
        LEFT JOIN public.widget_analytics a
          ON a.widget_id = p_widget_id
          AND a.created_at >= d.day
          AND a.created_at < d.day + interval '1 day'
        GROUP BY d.day
      ) d
    ), '[]'::jsonb),
    'totals', (
      SELECT jsonb_build_object(
        'renders', COUNT(*) FILTER (WHERE event = 'render'),
        'interactions', COUNT(*) FILTER (WHERE event = 'interact'),
        'errors', COUNT(*) FILTER (WHERE event = 'error'),
        'unique_users', COUNT(DISTINCT user_id),
        'avg_load_ms', ROUND(AVG(load_ms) FILTER (WHERE event = 'load'))::int,
        'p95_load_ms', percentile_cont(0.95) WITHIN GROUP (ORDER BY load_ms) FILTER (WHERE event = 'load')
      ) FROM public.widget_analytics
      WHERE widget_id = p_widget_id
        AND created_at > now() - make_interval(days => GREATEST(p_days, 1))
    ),
    'platforms', COALESCE((
      SELECT jsonb_agg(row_to_json(p))
      FROM (
        SELECT COALESCE(platform, 'unknown') AS platform,
          COUNT(*) FILTER (WHERE event = 'render') AS renders,
          COUNT(DISTINCT user_id) AS users
        FROM public.widget_analytics
        WHERE widget_id = p_widget_id
          AND created_at > now() - make_interval(days => GREATEST(p_days, 1))
        GROUP BY 1
      ) p
    ), '[]'::jsonb),
    'adoption', (
      SELECT jsonb_build_object(
        'users_with_layout', (
          SELECT COUNT(*) FROM public.widget_layouts
          WHERE layout @> jsonb_build_object('widgets', jsonb_build_array(jsonb_build_object('id', p_widget_id)))
        )
      )
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Recent error events for one widget (message truncated at write time).
CREATE OR REPLACE FUNCTION public.admin_widget_errors(
  p_session_token text,
  p_widget_id text,
  p_limit int DEFAULT 50
)
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

  SELECT COALESCE(jsonb_agg(row_to_json(e)), '[]'::jsonb) INTO v_result
  FROM (
    SELECT
      error_message,
      COUNT(*) AS frequency,
      COUNT(DISTINCT user_id) AS affected_users,
      MIN(created_at) AS first_seen,
      MAX(created_at) AS last_seen
    FROM public.widget_analytics
    WHERE widget_id = p_widget_id AND event = 'error'
      AND created_at > now() - interval '30 days'
    GROUP BY error_message
    ORDER BY frequency DESC
    LIMIT GREATEST(LEAST(p_limit, 200), 1)
  ) e;

  RETURN v_result;
END;
$$;

-- Audit history, optionally filtered to one widget.
CREATE OR REPLACE FUNCTION public.admin_widget_audit(
  p_session_token text,
  p_widget_id text DEFAULT NULL,
  p_limit int DEFAULT 100
)
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

  SELECT COALESCE(jsonb_agg(row_to_json(a)), '[]'::jsonb) INTO v_result
  FROM (
    SELECT id, admin_email, action, widget_id, previous, next, created_at
    FROM public.widget_audit_log
    WHERE (p_widget_id IS NULL OR widget_id = p_widget_id)
    ORDER BY created_at DESC
    LIMIT GREATEST(LEAST(p_limit, 500), 1)
  ) a;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION
  public.admin_widget_update(text, text, jsonb, text),
  public.admin_widget_overview(text),
  public.admin_widget_analytics(text, text, int),
  public.admin_widget_errors(text, text, int),
  public.admin_widget_audit(text, text, int)
TO authenticated;

-- ============================================================
-- 8. Seed the initial widget catalog (ids must match the
-- frontend registry in src/platform/widgets/registry.tsx).
-- ============================================================
INSERT INTO public.widget_catalog
  (id, name, description, category, status, rollout_percent, default_enabled, default_size, allowed_sizes, platforms)
VALUES
  ('quick-create', 'Quick Create', 'Start a page, task, document, database or AI generation in one click.', 'productivity', 'enabled', 100, true, 'small', ARRAY['small','medium'], ARRAY['web','macos','windows','linux']),
  ('my-tasks', 'My Tasks', 'Tasks due today, overdue counts and quick complete.', 'productivity', 'enabled', 100, true, 'medium', ARRAY['small','medium','large'], ARRAY['web','macos','windows','linux']),
  ('upcoming-tasks', 'Upcoming Tasks', 'What is due today, tomorrow and beyond.', 'productivity', 'enabled', 100, true, 'medium', ARRAY['small','medium','large'], ARRAY['web','macos','windows','linux']),
  ('recent-pages', 'Recent Pages', 'Jump back into recently opened or edited pages.', 'productivity', 'enabled', 100, true, 'medium', ARRAY['small','medium','large'], ARRAY['web','macos','windows','linux']),
  ('favorites', 'Favorites', 'Your starred pages and documents.', 'workspace', 'enabled', 100, true, 'small', ARRAY['small','medium'], ARRAY['web','macos','windows','linux']),
  ('pinned-items', 'Pinned Items', 'Pin the resources you reach for constantly.', 'workspace', 'enabled', 100, false, 'small', ARRAY['small','medium'], ARRAY['web','macos','windows','linux']),
  ('workspace-overview', 'Workspace Overview', 'Name, pages, tasks and recent activity at a glance.', 'workspace', 'enabled', 100, true, 'medium', ARRAY['small','medium','wide'], ARRAY['web','macos','windows','linux']),
  ('recent-activity', 'Recent Activity', 'Edits, comments and task changes across the workspace.', 'workspace', 'enabled', 100, true, 'wide', ARRAY['medium','large','wide'], ARRAY['web','macos','windows','linux']),
  ('ai-activity', 'AI Activity', 'Running, completed and failed AI jobs.', 'ai', 'enabled', 100, true, 'medium', ARRAY['small','medium','large'], ARRAY['web','macos','windows','linux']),
  ('ai-quick-ask', 'AI Quick Ask', 'Compact AI prompt entry point for the workspace.', 'ai', 'enabled', 100, true, 'small', ARRAY['small','medium'], ARRAY['web','macos','windows','linux']),
  ('ai-usage', 'AI Usage', 'Requests, generations and quota for authorized users.', 'ai', 'enabled', 100, false, 'small', ARRAY['small','medium'], ARRAY['web','macos','windows','linux']),
  ('unread-notifications', 'Notifications', 'Unread notifications with quick mark-as-read.', 'notifications', 'enabled', 100, true, 'small', ARRAY['small','medium'], ARRAY['web','macos','windows','linux']),
  ('mentions', 'Mentions', 'Recent mentions of you with one-click jump.', 'notifications', 'enabled', 100, true, 'medium', ARRAY['small','medium'], ARRAY['web','macos','windows','linux']),
  ('attention-required', 'Attention Required', 'Overdue tasks, failed jobs and pending approvals that need you.', 'notifications', 'enabled', 100, true, 'medium', ARRAY['small','medium','large'], ARRAY['web','macos','windows','linux']),
  ('project-progress', 'Project Progress', 'Completion and health for your project databases.', 'project', 'enabled', 100, false, 'medium', ARRAY['small','medium','large'], ARRAY['web','macos','windows','linux']),
  ('milestones', 'Milestones', 'Next milestone, progress and due date.', 'project', 'enabled', 100, false, 'small', ARRAY['small','medium'], ARRAY['web','macos','windows','linux']),
  ('integrations-hub', 'Integrations', 'Status of your connected integrations.', 'integrations', 'enabled', 100, false, 'small', ARRAY['small','medium'], ARRAY['web','macos','windows','linux']),
  ('sync-status', 'Sync Status', 'Whether this workspace is synced, syncing or in issue.', 'system', 'enabled', 100, true, 'small', ARRAY['small'], ARRAY['web','macos','windows','linux']),
  ('connection-status', 'Connection', 'Online, offline and reconnecting indicator.', 'system', 'enabled', 100, true, 'small', ARRAY['small'], ARRAY['web','macos','windows','linux'])
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 9. Realtime for widget_layouts (layout sync across devices)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'widget_layouts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.widget_layouts;
  END IF;
END $$;
