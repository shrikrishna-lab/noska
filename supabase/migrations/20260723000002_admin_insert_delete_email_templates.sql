-- Add email marketing tables to admin_insert and admin_delete whitelists

CREATE OR REPLACE FUNCTION public.admin_insert(
  p_session_token text,
  p_table text,
  p_data jsonb,
  p_min_role text DEFAULT 'support'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_keys text;
  v_vals text;
  v_new_id uuid;
  v_allowed_tables text[] := ARRAY[
    'feature_flags', 'webhook_endpoints', 'email_campaigns',
    'admin_users', 'subscriptions', 'support_tickets',
    'changelog_entries', 'blog_posts', 'legal_pages',
    'api_keys', 'referral_rewards',
    -- Launch/CTA/Landing/SEO tables
    'launch_settings', 'cta_buttons', 'landing_content',
    'announcement_bar', 'seo_settings', 'social_links',
    'waitlist_settings',
    -- Email marketing tables
    'email_templates', 'email_branding', 'email_segments',
    'email_versions', 'email_history', 'newsletter_subscribers'
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
    -- Launch/CTA/Landing/SEO tables
    'launch_settings', 'cta_buttons', 'landing_content',
    'announcement_bar', 'seo_settings', 'social_links',
    'waitlist_settings',
    -- Email marketing tables
    'email_templates', 'email_branding', 'email_segments',
    'email_versions', 'email_history', 'newsletter_subscribers'
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
