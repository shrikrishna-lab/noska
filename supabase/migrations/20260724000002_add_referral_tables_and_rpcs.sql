-- ============================================================
-- Migration: Add referral tables to admin RPC whitelists
-- and create admin referral query RPCs with user profile joins
-- ============================================================

-- ============================================================
-- 1. Re-add referral tables to admin_select
-- ============================================================
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
    'launch_settings', 'cta_buttons', 'landing_content',
    'announcement_bar', 'seo_settings', 'social_links',
    'waitlist_settings', 'launch_audit_log',
    'demo_requests',
    'email_templates', 'email_branding', 'email_segments',
    'email_versions', 'email_history', 'newsletter_subscribers',
    'referral_codes', 'referral_rewards', 'user_referrals'
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

-- ============================================================
-- 2. Add referral_rewards to admin_update
-- ============================================================
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
    'email_templates', 'email_branding', 'email_segments',
    'email_versions', 'email_history', 'newsletter_subscribers',
    'referral_rewards',
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
      v_sql := format('UPDATE %s SET %s = %L', quote_ident(p_table), quote_ident(v_key), v_val);
    ELSE
      v_sql := v_sql || format(', %s = %L', quote_ident(v_key), v_val);
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

-- ============================================================
-- 3. Add referral_rewards to admin_delete
-- ============================================================
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
    'email_templates', 'email_branding', 'email_segments',
    'email_versions', 'email_history', 'newsletter_subscribers',
    'referral_rewards',
    'workspaces', 'teams'
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
$$;

-- ============================================================
-- 4. get_admin_referral_codes
-- Returns referral codes joined with user_profiles (email, name)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_admin_referral_codes(
  p_session_token text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_result jsonb;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'support');
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', rc.id,
    'user_id', rc.user_id,
    'email', up.email,
    'user_name', up.user_name,
    'code', rc.code,
    'total_referrals', rc.total_referrals,
    'active_referrals', rc.active_referrals,
    'rewards_earned', rc.rewards_earned,
    'ai_credits', rc.ai_credits,
    'xp', rc.xp,
    'level', rc.level,
    'created_at', rc.created_at,
    'updated_at', rc.updated_at
  ) ORDER BY rc.created_at DESC), '[]'::jsonb) INTO v_result
  FROM referral_codes rc
  LEFT JOIN user_profiles up ON up.id = rc.user_id;
  RETURN v_result;
END;
$$;

-- ============================================================
-- 5. get_admin_user_referrals
-- Returns user_referrals joined with user_profiles for
-- both referrer and referred (emails, names)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_admin_user_referrals(
  p_session_token text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_result jsonb;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'support');
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', ur.id,
    'referrer_id', ur.referrer_id,
    'referrer_email', referrer.email,
    'referrer_name', referrer.user_name,
    'referred_id', ur.referred_id,
    'referred_email', referred.email,
    'referred_name', referred.user_name,
    'referral_code_id', ur.referral_code_id,
    'status', ur.status,
    'reward_claimed', ur.reward_claimed,
    'reward_id', ur.reward_id,
    'joined_at', ur.joined_at,
    'created_at', ur.created_at
  ) ORDER BY ur.created_at DESC), '[]'::jsonb) INTO v_result
  FROM user_referrals ur
  LEFT JOIN user_profiles referrer ON referrer.id = ur.referrer_id
  LEFT JOIN user_profiles referred ON referred.id = ur.referred_id;
  RETURN v_result;
END;
$$;
