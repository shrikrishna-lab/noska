-- Expose the connector-gateway tables to the admin dashboard so the
-- Integrations page can show REAL per-connector connection stats
-- (active connections, last connected) instead of only the six
-- monitoring services. Read-only: only admin_select is extended.
--
-- user_connections contains access_token_encrypted / refresh_token_encrypted
-- / token_hint. admin_select is SECURITY DEFINER and bypasses RLS, so the
-- raw table must NOT be whitelisted (p_select='*' would hand ciphertexts to
-- the support role). Whitelist a sanitized view instead.

CREATE OR REPLACE VIEW public.user_connections_admin AS
SELECT
  id,
  user_id,
  connector_id,
  status,
  auth_mode,
  server_url_override,
  label,
  external_account_label,
  granted_scopes,
  connected_at,
  last_used_at,
  revoked_at,
  created_at
FROM public.user_connections;

CREATE OR REPLACE FUNCTION public.admin_select(p_session_token text, p_table text, p_select text DEFAULT '*'::text, p_order_col text DEFAULT NULL::text, p_order_dir text DEFAULT 'desc'::text, p_limit integer DEFAULT NULL::integer, p_eq_col text DEFAULT NULL::text, p_eq_val text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_id uuid;
  v_sql text;
  v_result jsonb;
  v_allowed_tables text[] := ARRAY[
    'info_cards',
    'admin_users', 'user_profiles', 'pages', 'audit_events', 'ai_chats',
    'feature_flags', 'waitlist_entries', 'feedback', 'support_tickets',
    'subscriptions', 'payments', 'email_campaigns', 'email_events', 'roadmap_items',
    'integrations', 'api_keys', 'notifications', 'teams', 'workspace_settings',
    'webhook_endpoints', 'webhook_deliveries', 'collaboration_sessions',
    'banned_users', 'support_messages', 'platform_settings',
    'workspaces',
    'launch_settings', 'cta_buttons', 'landing_content',
    'announcement_bar', 'seo_settings', 'social_links',
    'waitlist_settings', 'launch_audit_log',
    'demo_requests',
    'email_templates', 'email_branding', 'email_segments',
    'email_versions', 'email_history', 'newsletter_subscribers',
    'referral_codes', 'referral_rewards', 'user_referrals',
    'changelog_entries', 'blog_posts', 'legal_pages',
    'admin_broadcasts', 'roadmap_votes',
    'admin_routes',
    'user_ai_usage_stats',
    'connectors', 'user_connections_admin'
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
$function$;
