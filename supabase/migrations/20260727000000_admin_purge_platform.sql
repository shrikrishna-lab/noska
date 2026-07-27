-- ============================================================
-- Migration: Admin Purge Platform — delete ALL data
-- Requires super_admin role. Deletes every row from every table
-- in FK-safe order, then logs and returns a result.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_purge_platform(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'super_admin');

  PERFORM log_admin_action(v_admin_id, 'purge_platform', 'system', 'all', 'Platform purge initiated — deleting ALL data', NULL);

  -- Collaboration / real-time
  DELETE FROM collaboration_sessions;
  DELETE FROM block_locks;
  DELETE FROM page_permissions;
  DELETE FROM page_versions;

  -- Page audit & AI data (child of pages)
  DELETE FROM audit_events;
  DELETE FROM ai_chats;
  DELETE FROM ai_memory;

  -- Core content
  DELETE FROM pages;

  -- User-facing data
  DELETE FROM user_profiles;
  DELETE FROM banned_users;
  DELETE FROM deleted_accounts;
  DELETE FROM user_invite_codes;
  DELETE FROM approved_emails;

  -- Email marketing
  DELETE FROM email_history;
  DELETE FROM email_versions;
  DELETE FROM email_segments;
  DELETE FROM email_branding;
  DELETE FROM email_templates;
  DELETE FROM email_campaigns;
  DELETE FROM email_events;
  DELETE FROM newsletter_subscribers;

  -- Support
  DELETE FROM support_messages;
  DELETE FROM support_tickets;

  -- Feedback
  DELETE FROM feedback;

  -- Waitlist
  DELETE FROM waitlist_entries;
  DELETE FROM waitlist_settings;

  -- Billing
  DELETE FROM subscriptions;
  DELETE FROM payments;

  -- Referrals
  DELETE FROM user_referrals;
  DELETE FROM referral_rewards;
  DELETE FROM referral_codes;

  -- Content management
  DELETE FROM changelog_entries;
  DELETE FROM blog_posts;
  DELETE FROM legal_pages;
  DELETE FROM admin_broadcasts;

  -- Feature flags
  DELETE FROM feature_flags;

  -- Integrations / webhooks / API keys
  DELETE FROM webhook_deliveries;
  DELETE FROM webhook_endpoints;
  DELETE FROM api_keys;
  DELETE FROM integrations;

  -- Roadmap
  DELETE FROM roadmap_votes;
  DELETE FROM roadmap_items;

  -- Notifications
  DELETE FROM notifications;

  -- Workspaces / teams
  DELETE FROM teams;
  DELETE FROM workspaces;
  DELETE FROM workspace_settings;

  -- Launch / marketing
  DELETE FROM launch_audit_log;
  DELETE FROM demo_requests;
  DELETE FROM social_links;
  DELETE FROM seo_settings;
  DELETE FROM announcement_bar;
  DELETE FROM landing_content;
  DELETE FROM cta_buttons;
  DELETE FROM launch_settings;

  -- Platform settings
  DELETE FROM platform_settings;

  -- Admin data (last — sessions depend on admin_users FK)
  DELETE FROM admin_login_attempts;
  DELETE FROM admin_sessions;
  DELETE FROM admin_audit_log;
  DELETE FROM admin_users;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'All platform data has been permanently deleted.'
  );
END;
$$;

-- Grant execute to anon so the admin panel can call it via PostgREST
GRANT EXECUTE ON FUNCTION public.admin_purge_platform(text) TO anon;
