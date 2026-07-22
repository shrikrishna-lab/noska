-- Add roadmap_votes to admin_select allowed tables so admin can view vote counts

CREATE OR REPLACE FUNCTION public.admin_select(
  p_session_token text,
  p_table text,
  p_select text DEFAULT '*',
  p_order_col text DEFAULT NULL,
  p_order_dir text DEFAULT 'desc',
  p_limit int DEFAULT NULL,
  p_eq_col text DEFAULT NULL,
  p_eq_val text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_sql text;
  v_result jsonb;
  v_allowed_tables text[] := ARRAY[
    'admin_users', 'user_profiles', 'pages', 'audit_events', 'ai_chats',
    'feature_flags', 'waitlist_entries', 'feedback', 'support_tickets',
    'subscriptions', 'payments', 'email_campaigns', 'email_events', 'roadmap_items',
    'integrations', 'api_keys', 'notifications', 'teams', 'workspace_settings',
    'webhook_endpoints', 'webhook_deliveries', 'collaboration_sessions',
    'banned_users', 'support_messages', 'platform_settings',
    'workspaces',
    'roadmap_votes',
    -- Launch/CTA/Landing/SEO tables
    'launch_settings', 'cta_buttons', 'landing_content',
    'announcement_bar', 'seo_settings', 'social_links',
    'waitlist_settings', 'launch_audit_log'
  ];
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'support');
  IF NOT (p_table = ANY(v_allowed_tables)) THEN
    RAISE EXCEPTION 'TABLE_NOT_ALLOWED' USING ERRCODE = '42501';
  END IF;
  PERFORM validate_select_columns(p_select);
  v_sql := 'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (SELECT ' || p_select || ' FROM ' || quote_ident(p_table) || ' WHERE true';
  IF p_eq_col IS NOT NULL AND p_eq_val IS NOT NULL THEN
    v_sql := v_sql || ' AND ' || quote_ident(p_eq_col) || ' = ' || quote_literal(p_eq_val);
  END IF;
  IF p_order_col IS NOT NULL THEN
    v_sql := v_sql || ' ORDER BY ' || quote_ident(p_order_col) || ' ' || CASE WHEN p_order_dir = 'asc' THEN 'ASC' ELSE 'DESC' END;
  END IF;
  IF p_limit IS NOT NULL THEN
    v_sql := v_sql || ' LIMIT ' || p_limit;
  END IF;
  v_sql := v_sql || ') t';
  EXECUTE v_sql INTO v_result;
  RETURN v_result;
END;
$$;
