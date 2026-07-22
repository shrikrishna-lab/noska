CREATE OR REPLACE FUNCTION public.admin_select(p_session_token text, p_table text, p_select text DEFAULT '*'::text, p_order_col text DEFAULT 'created_at'::text, p_order_dir text DEFAULT 'desc'::text, p_limit integer DEFAULT NULL::integer, p_eq_col text DEFAULT NULL::text, p_eq_val text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_id UUID;
  v_sql TEXT;
  v_result JSONB;
  v_allowed_tables TEXT[] := ARRAY[
    'admin_users', 'user_profiles', 'pages', 'audit_events', 'ai_chats',
    'feature_flags', 'waitlist_entries', 'feedback', 'support_tickets',
    'subscriptions', 'payments', 'email_campaigns', 'email_events', 'roadmap_items',
    'integrations', 'api_keys', 'notifications', 'teams', 'workspace_settings',
    'webhook_endpoints', 'webhook_deliveries', 'collaboration_sessions',
    'banned_users', 'support_messages', 'platform_settings',
    'launch_settings', 'cta_buttons', 'landing_content',
    'announcement_bar', 'seo_settings', 'social_links',
    'waitlist_settings', 'launch_audit_log',
    'email_templates', 'email_branding', 'email_segments',
    'email_versions', 'email_history', 'newsletter_subscribers',
    'admin_broadcasts', 'referrals', 'referral_rewards', 'referral_tiers',
    'referral_codes', 'user_referrals',
    'changelog_entries', 'blog_posts', 'legal_pages', 'webhook_deliveries', 'webhook_endpoints',
    'collaboration_sessions', 'workspaces', 'deleted_accounts',
    'roadmap_sprints', 'roadmap_releases', 'roadmap_votes'
  ];
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'support');
  IF NOT (p_table = ANY(v_allowed_tables)) THEN
    RAISE EXCEPTION 'TABLE_NOT_ALLOWED' USING ERRCODE = '42501';
  END IF;

  IF p_select ~ '[();]'
     OR p_select ~* '\\mselect\\m' OR p_select ~* '\\minsert\\m' OR p_select ~* '\\mupdate\\m'
     OR p_select ~* '\\mdelete\\m' OR p_select ~* '\\mdrop\\m' OR p_select ~* '\\malter\\m'
     OR p_select ~* '\\mcreate\\m' OR p_select ~* '\\munion\\m' OR p_select ~* '\\mexec\\M'
     OR p_select ~* '\\mexecute\\M' OR p_select ~* '\\mtruncate\\m' THEN
    RAISE EXCEPTION 'INVALID_SELECT' USING ERRCODE = '42501';
  END IF;

  v_sql := 'SELECT COALESCE(jsonb_agg(sub), ''[]''::jsonb) FROM (SELECT ' || p_select || ' FROM ' || quote_ident(p_table);
  IF p_eq_col IS NOT NULL AND p_eq_val IS NOT NULL THEN
    v_sql := v_sql || ' WHERE ' || quote_ident(p_eq_col) || ' = ' || quote_literal(p_eq_val);
  END IF;
  v_sql := v_sql || ' ORDER BY ' || quote_ident(p_order_col) || ' ' || CASE WHEN p_order_dir = 'asc' THEN 'asc' ELSE 'desc' END;
  IF p_limit IS NOT NULL THEN v_sql := v_sql || ' LIMIT ' || p_limit; END IF;
  v_sql := v_sql || ') sub';

  EXECUTE v_sql INTO v_result;
  RETURN v_result;
END;
$function$;
