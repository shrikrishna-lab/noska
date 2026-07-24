ALTER PUBLICATION supabase_realtime ADD TABLE public.workspaces;

CREATE OR REPLACE FUNCTION public.admin_update(
  p_session_token text,
  p_table text,
  p_id uuid,
  p_data jsonb,
  p_min_role text DEFAULT 'support'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_sql text;
  v_key text;
  v_val text;
  v_allowed_tables text[] := ARRAY[
    'feature_flags', 'waitlist_entries', 'feedback', 'support_tickets',
    'webhook_endpoints', 'platform_settings', 'email_campaigns',
    'notifications', 'api_keys', 'admin_users',
    'changelog_entries', 'blog_posts', 'legal_pages',
    'admin_broadcasts',
    'launch_settings', 'cta_buttons', 'landing_content',
    'announcement_bar', 'seo_settings', 'social_links',
    'waitlist_settings',
    'demo_requests',
    'workspaces', 'teams'
  ];
BEGIN
  v_admin_id := require_admin_role(p_session_token, p_min_role);
  IF NOT (p_table = ANY(v_allowed_tables)) THEN
    RAISE EXCEPTION 'TABLE_NOT_ALLOWED' USING ERRCODE = '42501';
  END IF;
  FOR v_key, v_val IN SELECT * FROM jsonb_each_text(p_data)
  LOOP
    IF v_sql IS NULL THEN
      v_sql := format('UPDATE %I SET %I = %L', p_table, v_key, v_val);
    ELSE
      v_sql := v_sql || format(', %I = %L', v_key, v_val);
    END IF;
  END LOOP;
  IF v_sql IS NULL THEN RETURN FALSE; END IF;
  v_sql := v_sql || format(' WHERE id = %L', p_id);
  EXECUTE v_sql;
  IF FOUND THEN
    PERFORM log_admin_action(v_admin_id, 'update_' || p_table, 'record', p_id::text, NULL,
      jsonb_build_object('data', p_data));
  END IF;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete(
  p_session_token text,
  p_table text,
  p_id uuid,
  p_min_role text DEFAULT 'support'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_target_name text;
  v_allowed_tables text[] := ARRAY[
    'feature_flags', 'waitlist_entries', 'feedback', 'support_tickets',
    'webhook_endpoints', 'email_campaigns', 'notifications', 'api_keys',
    'admin_users',
    'changelog_entries', 'blog_posts', 'legal_pages',
    'admin_broadcasts',
    'launch_settings', 'cta_buttons', 'landing_content',
    'announcement_bar', 'seo_settings', 'social_links',
    'waitlist_settings',
    'demo_requests',
    'workspaces', 'teams'
  ];
BEGIN
  v_admin_id := require_admin_role(p_session_token, p_min_role);
  IF NOT (p_table = ANY(v_allowed_tables)) THEN
    RAISE EXCEPTION 'TABLE_NOT_ALLOWED' USING ERRCODE = '42501';
  END IF;
  EXECUTE format('DELETE FROM %I WHERE id = %L', p_table, p_id);
  IF FOUND THEN
    PERFORM log_admin_action(v_admin_id, 'delete_' || p_table, 'record', p_id::text, NULL, NULL);
  END IF;
  RETURN FOUND;
END;
$$;
