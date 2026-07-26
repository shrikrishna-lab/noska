-- Recreate admin_delete dropped by 20260724111012_drop_overloaded_admin_rpcs.sql
-- The previous migration dropped the overloaded admin_delete and admin_update
-- functions but never recreated them, breaking admin account deletion.

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
