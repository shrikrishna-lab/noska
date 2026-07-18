-- ============================================================
-- Migration: Notifications System
-- Creates the notifications table, indexes, RLS, and search RPC
-- ============================================================

-- 1. Extend allowed tables in the admin_select, admin_update, admin_delete RPCs
-- Notifications is already in the allowed_tables list, so no change needed there.

-- ============================================================
-- 2. Create notifications table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'info',
  category TEXT,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical', 'success')),
  source TEXT,
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type TEXT,
  entity_id TEXT,
  action_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_severity ON public.notifications(severity);
CREATE INDEX IF NOT EXISTS idx_notifications_source ON public.notifications(source);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON public.notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_archived_at ON public.notifications(archived_at);

-- GIN index for full-text search on title and message
CREATE INDEX IF NOT EXISTS idx_notifications_search ON public.notifications
  USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(message, '')));

-- ============================================================
-- 4. RLS
-- ============================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RPC-only access: no direct row-level operations allowed
CREATE POLICY notifications_rpc_only
  ON public.notifications
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Grant usage to anon/authenticated via RPCs
GRANT ALL ON public.notifications TO anon;
GRANT ALL ON public.notifications TO authenticated;

-- ============================================================
-- 5. Search notifications RPC (admin only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.search_notifications(
  p_session_token text,
  p_search text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_severity text DEFAULT NULL,
  p_source text DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_page int DEFAULT 1,
  p_page_size int DEFAULT 20,
  p_sort_by text DEFAULT 'created_at',
  p_sort_dir text DEFAULT 'desc'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_sql text;
  v_count_sql text;
  v_result jsonb;
  v_offset int;
  v_total int;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'support');

  v_offset := (p_page - 1) * p_page_size;
  IF v_offset < 0 THEN v_offset := 0; END IF;
  IF p_page_size < 1 THEN p_page_size := 20; END IF;
  IF p_page_size > 100 THEN p_page_size := 100; END IF;

  -- Validate sort_by to prevent SQL injection
  IF p_sort_by NOT IN ('created_at', 'severity', 'source', 'type', 'status', 'read_at') THEN
    p_sort_by := 'created_at';
  END IF;
  IF p_sort_dir NOT IN ('asc', 'desc') THEN
    p_sort_dir := 'desc';
  END IF;

  v_sql := 'FROM notifications WHERE true';
  v_count_sql := 'SELECT count(*) FROM notifications WHERE true';

  IF p_search IS NOT NULL AND p_search != '' THEN
    v_sql := v_sql || ' AND to_tsvector(''english'', coalesce(title, '''') || '' '' || coalesce(message, '''')) @@ plainto_tsquery(''english'', ' || quote_literal(p_search) || ')';
    v_count_sql := v_count_sql || ' AND to_tsvector(''english'', coalesce(title, '''') || '' '' || coalesce(message, '''')) @@ plainto_tsquery(''english'', ' || quote_literal(p_search) || ')';
  END IF;

  IF p_status IS NOT NULL AND p_status != '' THEN
    v_sql := v_sql || ' AND status = ' || quote_literal(p_status);
    v_count_sql := v_count_sql || ' AND status = ' || quote_literal(p_status);
  END IF;

  IF p_severity IS NOT NULL AND p_severity != '' THEN
    v_sql := v_sql || ' AND severity = ' || quote_literal(p_severity);
    v_count_sql := v_count_sql || ' AND severity = ' || quote_literal(p_severity);
  END IF;

  IF p_source IS NOT NULL AND p_source != '' THEN
    v_sql := v_sql || ' AND source = ' || quote_literal(p_source);
    v_count_sql := v_count_sql || ' AND source = ' || quote_literal(p_source);
  END IF;

  IF p_type IS NOT NULL AND p_type != '' THEN
    v_sql := v_sql || ' AND type = ' || quote_literal(p_type);
    v_count_sql := v_count_sql || ' AND type = ' || quote_literal(p_type);
  END IF;

  -- Get total count
  EXECUTE v_count_sql INTO v_total;

  -- Get paginated results
  EXECUTE 'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (SELECT * ' || v_sql || ' ORDER BY ' || quote_ident(p_sort_by) || ' ' || CASE WHEN p_sort_dir = 'asc' THEN 'ASC' ELSE 'DESC' END || ' LIMIT ' || p_page_size || ' OFFSET ' || v_offset || ') t'
  INTO v_result;

  RETURN jsonb_build_object(
    'data', v_result,
    'total', v_total,
    'page', p_page,
    'page_size', p_page_size,
    'total_pages', ceil(v_total::numeric / GREATEST(p_page_size, 1))
  );
END;
$$;

-- ============================================================
-- 6. Get unread count RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(
  p_session_token text
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_count int;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'support');
  SELECT count(*) INTO v_count FROM notifications WHERE status = 'unread';
  RETURN v_count;
END;
$$;

-- ============================================================
-- 7. Enable realtime for notifications
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============================================================
-- 8. Bulk update notifications RPC (for mark-all-read, archive)
-- ============================================================
CREATE OR REPLACE FUNCTION public.bulk_update_notifications(
  p_session_token text,
  p_data jsonb,
  p_status_filter text DEFAULT NULL,
  p_severity_filter text DEFAULT NULL,
  p_source_filter text DEFAULT NULL
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_sql text;
  v_key text;
  v_val text;
  v_count int;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'support');

  v_sql := 'UPDATE notifications SET ';
  FOR v_key, v_val IN SELECT * FROM jsonb_each_text(p_data)
  LOOP
    IF v_key = 'updated_at' THEN CONTINUE; END IF;
    v_sql := v_sql || quote_ident(v_key) || ' = ' || quote_literal(v_val) || ', ';
  END LOOP;
  v_sql := v_sql || 'updated_at = now() WHERE true';

  IF p_status_filter IS NOT NULL THEN
    v_sql := v_sql || ' AND status = ' || quote_literal(p_status_filter);
  END IF;
  IF p_severity_filter IS NOT NULL THEN
    v_sql := v_sql || ' AND severity = ' || quote_literal(p_severity_filter);
  END IF;
  IF p_source_filter IS NOT NULL THEN
    v_sql := v_sql || ' AND source = ' || quote_literal(p_source_filter);
  END IF;

  EXECUTE v_sql;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================================
-- 9. Grant execute permissions
-- ============================================================
GRANT EXECUTE ON FUNCTION public.search_notifications TO anon;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count TO anon;
GRANT EXECUTE ON FUNCTION public.bulk_update_notifications TO anon;
