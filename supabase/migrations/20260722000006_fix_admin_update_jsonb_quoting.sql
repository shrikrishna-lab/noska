CREATE OR REPLACE FUNCTION public.admin_update(
  p_session_token text,
  p_table text,
  p_id text,
  p_data jsonb,
  p_min_role text DEFAULT 'support'::text
)
 RETURNS jsonb
 LANGUAGE plpgsql
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
    'changelog_entries', 'blog_posts', 'legal_pages'
  ];
BEGIN
  v_admin_id := require_admin_role(p_session_token, p_min_role);
  IF NOT (p_table = ANY(v_allowed_tables)) THEN
    RAISE EXCEPTION 'TABLE_NOT_ALLOWED' USING ERRCODE = '42501';
  END IF;
  SELECT string_agg(
    quote_ident(key) || ' = ' || CASE WHEN value IS NULL THEN 'NULL' ELSE quote_literal(value #>> '{}') END,
    ', '
  ) INTO v_sets
  FROM jsonb_each(p_data);
  EXECUTE 'UPDATE ' || quote_ident(p_table) || ' SET ' || v_sets
    || ' WHERE id = ' || quote_literal(p_id)
    || ' RETURNING row_to_json(' || quote_ident(p_table) || ')' INTO v_result;
  RETURN v_result;
END;
$function$;
