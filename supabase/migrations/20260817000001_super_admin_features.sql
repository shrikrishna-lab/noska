-- Super admin features: user location columns + route registry table.
-- Adds geolocation/location fields to user_profiles (for city/area-wise email
-- targeting) and an admin_routes registry so the Super Admin can view and
-- manage every route in the admin panel and the public web app.

-- ── 1. user_profiles location columns ──
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS area text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS ip_address text;

-- ── 2. admin_routes registry ──
CREATE TABLE IF NOT EXISTS public.admin_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area text NOT NULL DEFAULT 'admin',            -- 'admin' | 'web'
  path text NOT NULL,
  label text NOT NULL,
  section text,
  description text,
  enabled boolean NOT NULL DEFAULT true,
  min_role text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_routes_area ON public.admin_routes (area);
CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_routes_area_path ON public.admin_routes (area, path);

ALTER TABLE public.admin_routes ENABLE ROW LEVEL SECURITY;

-- Super admins / admins can read route registry through SECURITY DEFINER RPCs.
CREATE POLICY "admin_routes_select_all" ON public.admin_routes
  FOR SELECT USING (true);
CREATE POLICY "admin_routes_insert_sa" ON public.admin_routes
  FOR INSERT WITH CHECK (true);
CREATE POLICY "admin_routes_update_sa" ON public.admin_routes
  FOR UPDATE USING (true);
CREATE POLICY "admin_routes_delete_sa" ON public.admin_routes
  FOR DELETE USING (true);

-- ── 3. Whitelist admin_routes in the admin RPCs ──
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
    'referral_codes', 'referral_rewards', 'user_referrals',
    'changelog_entries', 'blog_posts', 'legal_pages',
    'admin_broadcasts', 'roadmap_votes',
    'admin_routes'
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
$$;

CREATE OR REPLACE FUNCTION public.admin_update(
  p_session_token text,
  p_table text,
  p_id text,
  p_data jsonb,
  p_min_role text DEFAULT 'support'::text
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
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
    'admin_routes'
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
    'workspaces', 'teams',
    'roadmap_items', 'integrations', 'webhook_deliveries',
    'audit_events', 'ai_chats', 'roadmap_votes',
    'admin_routes'
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

-- ── 4. Seed the route registry ──
INSERT INTO public.admin_routes (area, path, label, section, description, enabled, min_role) VALUES
  -- Admin routes
  ('admin', '/', 'Dashboard', 'overview', 'Main admin overview dashboard', true, NULL),
  ('admin', '/my-dashboard', 'My workspace', 'overview', 'Role-specific workspace dashboard', true, NULL),
  ('admin', '/analytics', 'Analytics', 'overview', 'Platform analytics', true, NULL),
  ('admin', '/launch-control', 'Launch Control', 'marketing', 'Launch campaign controls', true, 'marketing'),
  ('admin', '/landing-page', 'Landing Page', 'marketing', 'Landing page content', true, 'marketing'),
  ('admin', '/cta-buttons', 'CTA Buttons', 'marketing', 'Call-to-action button manager', true, 'marketing'),
  ('admin', '/announcement-bar', 'Announcement Bar', 'marketing', 'Announcement bar editor', true, 'marketing'),
  ('admin', '/waitlist-settings', 'Waitlist Settings', 'marketing', 'Waitlist configuration', true, 'marketing'),
  ('admin', '/seo-settings', 'SEO', 'marketing', 'SEO metadata settings', true, 'marketing'),
  ('admin', '/social-links', 'Social Links', 'marketing', 'Social link configuration', true, 'marketing'),
  ('admin', '/pages', 'Pages', 'content', 'Content pages', true, NULL),
  ('admin', '/files', 'Files', 'content', 'File manager', true, NULL),
  ('admin', '/templates', 'Templates', 'content', 'Content templates', true, NULL),
  ('admin', '/waitlist', 'Waitlist', 'growth', 'Waitlist management', true, NULL),
  ('admin', '/demo-requests', 'Demo Requests', 'growth', 'Demo request inbox', true, NULL),
  ('admin', '/users', 'Users', 'people', 'User management', true, NULL),
  ('admin', '/banned-users', 'Banned Users', 'people', 'Banned user management', true, 'admin'),
  ('admin', '/trash', 'Trash', 'people', 'Deleted content', true, 'admin'),
  ('admin', '/workspaces', 'Workspaces', 'people', 'Workspace management', true, NULL),
  ('admin', '/teams', 'Teams', 'people', 'Team management', true, NULL),
  ('admin', '/referrals', 'Referrals', 'growth', 'Referral program', true, NULL),
  ('admin', '/subscriptions', 'Subscriptions', 'growth', 'Subscription management', true, NULL),
  ('admin', '/payments', 'Payments', 'growth', 'Payment history', true, NULL),
  ('admin', '/ai-usage', 'AI Usage', 'platform', 'AI usage analytics', true, NULL),
  ('admin', '/models', 'Models', 'platform', 'AI model configuration', true, NULL),
  ('admin', '/feature-flags', 'Feature Flags', 'platform', 'Feature flag toggles', true, 'admin'),
  ('admin', '/email-dashboard', 'Email Dashboard', 'marketing', 'Email performance dashboard', true, 'marketing'),
  ('admin', '/email-templates', 'Email Templates', 'marketing', 'Email template library', true, 'marketing'),
  ('admin', '/email-campaigns', 'Email Campaigns', 'marketing', 'Campaign management', true, 'marketing'),
  ('admin', '/transactional-emails', 'Transactional Emails', 'marketing', 'Transactional email flows', true, 'marketing'),
  ('admin', '/audience-manager', 'Audience Manager', 'marketing', 'Email audience management', true, 'marketing'),
  ('admin', '/subscribers', 'Subscribers', 'marketing', 'Newsletter subscriber management', true, 'marketing'),
  ('admin', '/segments', 'Segments', 'marketing', 'Audience segment builder', true, 'marketing'),
  ('admin', '/scheduled-emails', 'Scheduled Emails', 'marketing', 'Scheduled campaign manager', true, 'marketing'),
  ('admin', '/email-analytics', 'Email Analytics', 'marketing', 'Email analytics', true, 'marketing'),
  ('admin', '/brand-settings', 'Brand Settings', 'marketing', 'Email brand settings', true, 'marketing'),
  ('admin', '/email-history', 'Email History', 'marketing', 'Email send history', true, 'marketing'),
  ('admin', '/notifications', 'Notifications', 'operations', 'Notification center', true, NULL),
  ('admin', '/feedback', 'Feedback', 'operations', 'User feedback', true, NULL),
  ('admin', '/support', 'Support Tickets', 'operations', 'Support ticket management', true, NULL),
  ('admin', '/audit-logs', 'Audit Logs', 'operations', 'Audit log viewer', true, 'developer'),
  ('admin', '/roadmap', 'Roadmap', 'platform', 'Product roadmap', true, NULL),
  ('admin', '/changelog', 'Changelog', 'platform', 'Changelog entries', true, NULL),
  ('admin', '/blog', 'Blog Posts', 'platform', 'Blog management', true, NULL),
  ('admin', '/legal', 'Legal Pages', 'platform', 'Legal page management', true, NULL),
  ('admin', '/broadcasts', 'Broadcasts', 'platform', 'Broadcast messages', true, NULL),
  ('admin', '/integrations', 'Integrations', 'platform', 'Integration management', true, NULL),
  ('admin', '/api-keys', 'API Keys', 'platform', 'API key management', true, 'admin'),
  ('admin', '/system-status', 'System Status', 'operations', 'System status overview', true, NULL),
  ('admin', '/system-health', 'System Health', 'operations', 'System health checks', true, 'admin'),
  ('admin', '/webhooks', 'Webhooks', 'platform', 'Webhook endpoints', true, NULL),
  ('admin', '/settings', 'Settings', 'settings', 'Platform settings', true, NULL),
  ('admin', '/monitoring/overview', 'Monitoring Overview', 'monitoring', 'Monitoring overview', true, 'admin'),
  ('admin', '/monitoring/errors', 'Monitoring Errors', 'monitoring', 'Error monitoring', true, 'admin'),
  ('admin', '/monitoring/performance', 'Monitoring Performance', 'monitoring', 'Performance monitoring', true, 'admin'),
  ('admin', '/monitoring/sessions', 'Monitoring Sessions', 'monitoring', 'Session monitoring', true, 'admin'),
  ('admin', '/monitoring/infrastructure', 'Monitoring Infrastructure', 'monitoring', 'Infrastructure monitoring', true, 'admin'),
  ('admin', '/monitoring/email-health', 'Email Health', 'monitoring', 'Email health monitoring', true, 'admin'),
  ('admin', '/monitoring/deployments', 'Monitoring Deployments', 'monitoring', 'Deployment monitoring', true, 'admin'),
  ('admin', '/monitoring/logs', 'Monitoring Logs', 'monitoring', 'Log viewer', true, 'admin'),
  ('admin', '/monitoring/integrations', 'Monitoring Integrations', 'monitoring', 'Monitoring integrations', true, 'admin'),
  ('admin', '/perf', 'Performance Dashboard', 'monitoring', 'Performance dashboard', true, 'admin'),
  ('admin', '/sentry', 'Sentry', 'monitoring', 'Sentry integration', true, 'admin'),
  ('admin', '/posthog', 'PostHog', 'monitoring', 'PostHog integration', true, 'admin'),
  ('admin', '/monitoring', 'Monitoring', 'monitoring', 'Monitoring hub', true, 'admin'),
  ('admin', '/admin-accounts', 'Administrator Accounts', 'settings', 'Admin account management', true, 'super_admin'),
  ('admin', '/routes-manager', 'Routes Manager', 'settings', 'View and manage every route in admin and the web app', true, 'super_admin'),
  -- Web (public) routes
  ('web', '/', 'Home', 'marketing', 'Marketing home page', true, NULL),
  ('web', '/pricing', 'Pricing', 'marketing', 'Pricing page', true, NULL),
  ('web', '/enterprise', 'Enterprise', 'marketing', 'Enterprise page', true, NULL),
  ('web', '/product', 'Product', 'marketing', 'Product page', true, NULL),
  ('web', '/solutions', 'Solutions', 'marketing', 'Solutions page', true, NULL),
  ('web', '/resources', 'Resources', 'marketing', 'Resources page', true, NULL),
  ('web', '/changelog', 'Changelog', 'marketing', 'Public changelog', true, NULL),
  ('web', '/blog', 'Blog', 'marketing', 'Public blog index', true, NULL),
  ('web', '/privacy', 'Privacy', 'legal', 'Privacy policy', true, NULL),
  ('web', '/terms', 'Terms', 'legal', 'Terms of service', true, NULL),
  ('web', '/policy', 'Policy', 'legal', 'Cookie policy', true, NULL),
  ('web', '/docs', 'Docs', 'marketing', 'Documentation hub', true, NULL),
  ('web', '/referrals', 'Referrals', 'growth', 'Public referral page', true, NULL),
  ('web', '/roadmap', 'Roadmap', 'marketing', 'Public roadmap', true, NULL),
  ('web', '/launch', 'Launch', 'marketing', 'Launch page', true, NULL),
  ('web', '/login', 'Login', 'auth', 'Sign in page', true, NULL),
  ('web', '/onboarding', 'Onboarding', 'auth', 'Onboarding flow', true, NULL),
  ('web', '/waitlist', 'Waitlist', 'auth', 'Waitlist signup', true, NULL),
  ('web', '/banned', 'Banned', 'auth', 'Banned account page', true, NULL),
  ('web', '/control', 'Control Center', 'auth', 'Authenticated app shell', true, NULL)
ON CONFLICT (area, path) DO NOTHING;