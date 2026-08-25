-- Whitelist patch_notes for admin content management (role: marketing)

CREATE OR REPLACE FUNCTION public.admin_select(
  p_session_token text, p_table text, p_select text DEFAULT '*'::text,
  p_order_col text DEFAULT NULL::text, p_order_dir text DEFAULT 'desc'::text,
  p_limit integer DEFAULT NULL::integer, p_eq_col text DEFAULT NULL::text, p_eq_val text DEFAULT NULL::text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
    'launch_settings', 'cta_buttons', 'landing_content',
    'announcement_bar', 'seo_settings', 'social_links',
    'waitlist_settings', 'launch_audit_log',
    'demo_requests',
    'email_templates', 'email_branding', 'email_segments',
    'email_versions', 'email_history', 'newsletter_subscribers',
    'referral_codes', 'referral_rewards', 'user_referrals',
    'changelog_entries', 'blog_posts', 'legal_pages',
    'patch_notes',
    'admin_broadcasts', 'roadmap_votes',
    'admin_routes',
    'admin_login_attempts',
    'deleted_accounts'
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

CREATE OR REPLACE FUNCTION public.admin_insert(
  p_session_token text, p_table text, p_data jsonb, p_min_role text DEFAULT 'support'::text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_id uuid;
  v_keys text;
  v_vals text;
  v_new_id uuid;
  v_allowed_tables text[] := ARRAY[
    'feature_flags', 'webhook_endpoints', 'email_campaigns',
    'admin_users', 'subscriptions', 'support_tickets',
    'changelog_entries', 'blog_posts', 'legal_pages',
    'patch_notes',
    'api_keys', 'referral_rewards',
    'launch_settings', 'cta_buttons', 'landing_content',
    'announcement_bar', 'seo_settings', 'social_links',
    'waitlist_settings',
    'demo_requests',
    'email_templates', 'email_branding', 'email_segments',
    'email_versions', 'email_history', 'newsletter_subscribers',
    'roadmap_items', 'admin_broadcasts', 'integrations',
    'webhook_deliveries', 'audit_events', 'ai_chats', 'roadmap_votes',
    'admin_routes'
  ];
BEGIN
  v_admin_id := require_admin_role(p_session_token, p_min_role);
  IF NOT (p_table = ANY(v_allowed_tables)) THEN
    RAISE EXCEPTION 'TABLE_NOT_ALLOWED' USING ERRCODE = '42501';
  END IF;
  v_new_id := gen_random_uuid();
  SELECT string_agg(quote_ident(key), ', '),
         string_agg(CASE WHEN value IS NULL THEN 'NULL' ELSE quote_literal(value::text) END, ', ')
  INTO v_keys, v_vals
  FROM jsonb_each_text(p_data);
  EXECUTE format('INSERT INTO %s (id, %s) VALUES (%L, %s) RETURNING id',
    quote_ident(p_table), v_keys, v_new_id, v_vals) INTO v_new_id;
  IF v_new_id IS NOT NULL THEN
    PERFORM log_admin_action(v_admin_id, 'create_' || p_table, 'record', v_new_id::text, NULL,
      jsonb_build_object('data', p_data));
  END IF;
  RETURN v_new_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update(
  p_session_token text, p_table text, p_id text, p_data jsonb, p_min_role text DEFAULT 'support'::text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $function$
DECLARE
  v_admin_id UUID;
  v_sets TEXT;
  v_result JSONB;
  v_allowed_tables TEXT[] := ARRAY[
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
    'email_templates', 'email_branding', 'email_segments',
    'email_versions', 'email_history', 'newsletter_subscribers',
    'admin_broadcasts', 'referrals', 'referral_rewards', 'referral_tiers',
    'referral_codes', 'user_referrals',
    'changelog_entries', 'blog_posts', 'legal_pages',
    'patch_notes',
    'admin_routes'
  ];
BEGIN
  v_admin_id := require_admin_role(p_session_token, p_min_role);
  IF NOT (p_table = ANY(v_allowed_tables)) THEN
    RAISE EXCEPTION 'TABLE_NOT_ALLOWED' USING ERRCODE = '42501';
  END IF;
  SELECT string_agg(
    quote_ident(key) || ' = ' ||
      CASE WHEN jsonb_typeof(value) = 'null' THEN 'NULL'
           ELSE quote_literal(value #>> '{}') END,
    ', '
  ) INTO v_sets
  FROM jsonb_each(p_data);
  EXECUTE 'UPDATE ' || quote_ident(p_table) || ' SET ' || v_sets
    || ' WHERE id = ' || quote_literal(p_id)
    || ' RETURNING row_to_json(' || quote_ident(p_table) || ')' INTO v_result;
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_delete(
  p_session_token text, p_table text, p_id uuid, p_min_role text DEFAULT 'support'::text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_id uuid;
  v_allowed_tables text[] := ARRAY[
    'feature_flags', 'waitlist_entries', 'feedback', 'support_tickets',
    'webhook_endpoints', 'email_campaigns', 'notifications', 'api_keys',
    'admin_users',
    'changelog_entries', 'blog_posts', 'legal_pages',
    'patch_notes',
    'admin_broadcasts',
    'launch_settings', 'cta_buttons', 'landing_content',
    'announcement_bar', 'seo_settings', 'social_links',
    'waitlist_settings',
    'demo_requests',
    'email_templates', 'email_branding', 'email_segments',
    'email_versions', 'email_history', 'newsletter_subscribers',
    'referral_rewards',
    'workspaces', 'teams',
    'roadmap_items', 'integrations', 'webhook_deliveries',
    'audit_events', 'ai_chats', 'roadmap_votes',
    'admin_routes',
    'pages'
  ];
BEGIN
  v_admin_id := require_admin_role(p_session_token, p_min_role);
  IF NOT (p_table = ANY(v_allowed_tables)) THEN
    RAISE EXCEPTION 'TABLE_NOT_ALLOWED' USING ERRCODE = '42501';
  END IF;
  EXECUTE format('DELETE FROM %s WHERE id = %L', quote_ident(p_table), p_id);
  IF FOUND THEN
    PERFORM log_admin_action(v_admin_id, 'delete_' || p_table, 'record', p_id::text, NULL, NULL);
  END IF;
  RETURN FOUND;
END;
$function$;
