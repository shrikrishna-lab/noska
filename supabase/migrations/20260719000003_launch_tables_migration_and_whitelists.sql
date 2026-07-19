-- ============================================================
-- Migration: Launch Tables & Admin RPC Whitelists
-- 
-- 1. Creates all launch/CTA/landing/SEO tables (if not exist)
-- 2. Inserts seed data for launch_settings, cta_buttons,
--    landing_content, announcement_bar, social_links, seo_settings,
--    waitlist_settings, launch_audit_log
-- 3. Updates admin_select/admin_update/admin_insert/admin_delete
--    whitelists to include these new tables
-- ============================================================

-- ============================================================
-- 1. Launch Settings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.launch_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  launch_mode text NOT NULL DEFAULT 'waitlist',
  login_mode text NOT NULL DEFAULT 'login',
  custom_login_url text,
  launch_date timestamptz,
  countdown_enabled boolean DEFAULT false,
  auto_switch_mode text,
  auto_switch_at timestamptz,
  maintenance_title text DEFAULT 'Scheduled Maintenance',
  maintenance_message text DEFAULT 'We are performing scheduled maintenance. We will be back shortly.',
  registration_enabled boolean DEFAULT true,
  show_pricing boolean DEFAULT true,
  show_blog boolean DEFAULT true,
  show_docs boolean DEFAULT true,
  show_changelog boolean DEFAULT true,
  show_login boolean DEFAULT true,
  show_signup boolean DEFAULT true,
  show_waitlist boolean DEFAULT true,
  show_discord boolean DEFAULT true,
  show_community boolean DEFAULT true,
  page_visibility jsonb DEFAULT '{}'::jsonb,
  route_protection jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid,
  published boolean DEFAULT true
);

-- ============================================================
-- 2. CTA Buttons
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cta_buttons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  button_id text NOT NULL,
  button_text text NOT NULL,
  destination text NOT NULL,
  variant text DEFAULT 'primary',
  color text DEFAULT 'default',
  icon text,
  open_in_new_tab boolean DEFAULT false,
  visible boolean DEFAULT true,
  enabled boolean DEFAULT true,
  animation text DEFAULT 'none',
  priority int DEFAULT 0,
  confirmation_text text,
  requires_auth boolean DEFAULT false,
  launch_mode_override jsonb DEFAULT '{}'::jsonb,
  ab_variants jsonb DEFAULT '[]'::jsonb,
  ab_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

-- ============================================================
-- 3. Landing Content
-- ============================================================
CREATE TABLE IF NOT EXISTS public.landing_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL,
  title text,
  subtitle text,
  body text,
  cta_text text,
  cta_link text,
  secondary_cta_text text,
  secondary_cta_link text,
  image_url text,
  icon text,
  badge text,
  sort_order int DEFAULT 0,
  content jsonb DEFAULT '{}'::jsonb,
  active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

-- ============================================================
-- 4. Announcement Bar
-- ============================================================
CREATE TABLE IF NOT EXISTS public.announcement_bar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean DEFAULT false,
  text text,
  link_url text,
  link_text text,
  background_color text DEFAULT '#1a1a2e',
  text_color text DEFAULT '#ffffff',
  emoji text DEFAULT '🚀',
  countdown_enabled boolean DEFAULT false,
  countdown_target timestamptz,
  dismissible boolean DEFAULT true,
  sticky boolean DEFAULT false,
  animation text DEFAULT 'slide',
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

-- ============================================================
-- 5. SEO Settings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.seo_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path text NOT NULL,
  title text,
  description text,
  og_image text,
  og_title text,
  og_description text,
  twitter_card text DEFAULT 'summary_large_image',
  twitter_site text,
  keywords text,
  robots text DEFAULT 'index,follow',
  canonical_url text,
  schema_markup jsonb,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid,
  UNIQUE(page_path)
);

-- ============================================================
-- 6. Social Links
-- ============================================================
CREATE TABLE IF NOT EXISTS public.social_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  url text NOT NULL,
  label text,
  icon text,
  sort_order int DEFAULT 0,
  active boolean DEFAULT true
);

-- ============================================================
-- 7. Waitlist Settings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.waitlist_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean DEFAULT true,
  collect_name boolean DEFAULT true,
  collect_company boolean DEFAULT false,
  collect_role boolean DEFAULT false,
  collect_country boolean DEFAULT true,
  collect_referral_code boolean DEFAULT true,
  collect_phone boolean DEFAULT false,
  email_verification boolean DEFAULT false,
  double_opt_in boolean DEFAULT false,
  auto_approve boolean DEFAULT false,
  max_waitlist int DEFAULT 0,
  confirmation_title text DEFAULT 'You''re on the list!',
  confirmation_message text DEFAULT 'We''ll notify you when it''s your turn.',
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

-- ============================================================
-- 8. Launch Audit Log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.launch_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid,
  admin_name text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  field text,
  old_value jsonb,
  new_value jsonb,
  details text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 9. RLS: Allow anon to read launch tables (read-only via RPCs)
-- ============================================================
ALTER TABLE public.launch_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cta_buttons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_bar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.launch_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policies: only allow reads via anon key (frontend), writes via SECURITY DEFINER RPCs
CREATE POLICY "allow_read_launch_settings" ON public.launch_settings FOR SELECT USING (true);
CREATE POLICY "allow_read_cta_buttons" ON public.cta_buttons FOR SELECT USING (true);
CREATE POLICY "allow_read_landing_content" ON public.landing_content FOR SELECT USING (true);
CREATE POLICY "allow_read_announcement_bar" ON public.announcement_bar FOR SELECT USING (true);
CREATE POLICY "allow_read_seo_settings" ON public.seo_settings FOR SELECT USING (true);
CREATE POLICY "allow_read_social_links" ON public.social_links FOR SELECT USING (true);
CREATE POLICY "allow_read_waitlist_settings" ON public.waitlist_settings FOR SELECT USING (true);
CREATE POLICY "launch_audit_log_rpc_only" ON public.launch_audit_log FOR ALL USING (false);

-- ============================================================
-- 10. Realtime: Enable for launch tables
-- ============================================================
alter publication supabase_realtime add table if not exists public.launch_settings;
alter publication supabase_realtime add table if not exists public.cta_buttons;
alter publication supabase_realtime add table if not exists public.landing_content;
alter publication supabase_realtime add table if not exists public.announcement_bar;
alter publication supabase_realtime add table if not exists public.seo_settings;
alter publication supabase_realtime add table if not exists public.social_links;
alter publication supabase_realtime add table if not exists public.waitlist_settings;

-- ============================================================
-- 11. Seed data (only if tables are empty)
-- ============================================================
INSERT INTO public.launch_settings (launch_mode, login_mode, show_pricing, show_blog, show_docs, show_changelog, show_login, show_signup, show_waitlist, show_discord, show_community, page_visibility, route_protection, published)
SELECT 'waitlist', 'login', true, true, true, true, true, true, true, true, true,
  '{"blog":true,"pricing":true,"templates":true,"roadmap":true,"careers":true,"community":true}'::jsonb,
  '{"public":{"routes":{"/login":"/login","/signup":"/signup"},"enabled":false},"waitlist":{"routes":{"/login":"/launch","/signup":"/launch"},"enabled":true},"early_beta":{"routes":{"/login":"/login","/signup":"/signup"},"enabled":false}}'::jsonb,
  true
WHERE NOT EXISTS (SELECT 1 FROM public.launch_settings LIMIT 1);

-- CTA buttons (15 default CTAs)
INSERT INTO public.cta_buttons (button_id, button_text, destination, variant, priority, visible, enabled)
SELECT * FROM (VALUES
  ('navbar_login', 'Log in', '/login', 'ghost', 10, true, true),
  ('navbar_cta', 'Get Noska free', '/login', 'primary', 11, true, true),
  ('navbar_demo', 'Request a demo', '/enterprise', 'ghost', 9, true, true),
  ('hero_primary', 'Get started free', '/login', 'primary', 20, true, true),
  ('hero_secondary', 'See what''s inside', '/product', 'secondary', 19, true, true),
  ('footer_cta', 'Get Noska free', '/login', 'primary', 30, true, true),
  ('pricing_cta', 'View all plans', '/pricing', 'primary', 40, true, true),
  ('final_cta_primary', 'Get Noska free', '/login', 'primary', 60, true, true),
  ('final_cta_secondary', 'View all plans', '/pricing', 'secondary', 59, true, true),
  ('mobile_login', 'Log in', '/login', 'ghost', 50, true, true),
  ('mobile_cta', 'Get Noska free', '/login', 'primary', 51, true, true),
  ('launch_navbar_login', 'Log in', '/login', 'ghost', 80, true, true),
  ('launch_navbar_cta', 'Join Waitlist', '/launch', 'primary', 81, true, true),
  ('launch_hero_primary', 'Join Waitlist', '/launch', 'primary', 70, true, true),
  ('launch_hero_secondary', 'Watch Demo', '#demo', 'secondary', 69, true, true)
) AS v(button_id, button_text, destination, variant, priority, visible, enabled)
WHERE NOT EXISTS (SELECT 1 FROM public.cta_buttons LIMIT 1);

-- Landing content (7 sections)
INSERT INTO public.landing_content (section, title, subtitle, body, cta_text, cta_link, sort_order, active)
SELECT * FROM (VALUES
  ('hero', 'The smartest place to think.', 'A calmer way to think on a page', NULL, 'Get started free', '/login', 1, true),
  ('features', 'Inside the workspace', 'Every way you work, in one place.', 'Consolidate docs, structured data, and AI into a single, quiet interface.', NULL, NULL, 2, true),
  ('faq', 'Good to know before you start.', NULL, NULL, NULL, NULL, 3, true),
  ('final_cta', 'Start writing in less than a minute.', NULL, 'No credit card. No fake trial countdown. Just a workspace that is ready when you are.', 'Get Noska free', '/login', 4, true),
  ('trust_bar', 'Trusted by teams worldwide', NULL, NULL, NULL, NULL, 5, true),
  ('stats', NULL, NULL, NULL, NULL, NULL, 6, true),
  ('security', 'Your data, scoped to you.', NULL, 'Every table is protected by Postgres row-level security policies. Page encryption uses your browser native Web Crypto API.', NULL, NULL, 7, true)
) AS v(section, title, subtitle, body, cta_text, cta_link, sort_order, active)
WHERE NOT EXISTS (SELECT 1 FROM public.landing_content LIMIT 1);

-- Social links
INSERT INTO public.social_links (platform, url, label, sort_order, active)
SELECT * FROM (VALUES
  ('x', 'https://x.com/noska', '@noska', 1, true),
  ('linkedin', 'https://linkedin.com/company/noska', 'Noska', 2, true),
  ('github', 'https://github.com/noska', 'Noska', 3, true),
  ('discord', 'https://discord.gg/noska', 'Noska Community', 4, true),
  ('youtube', 'https://youtube.com/@noska', 'Noska', 5, true),
  ('email', 'mailto:hello@noska.dev', 'hello@noska.dev', 6, true)
) AS v(platform, url, label, sort_order, active)
WHERE NOT EXISTS (SELECT 1 FROM public.social_links LIMIT 1);

-- Waitlist settings
INSERT INTO public.waitlist_settings (enabled, collect_name, collect_country, collect_referral_code, confirmation_title, confirmation_message)
SELECT true, true, true, true, 'You''re on the list!', 'We''ll notify you when it''s your turn.'
WHERE NOT EXISTS (SELECT 1 FROM public.waitlist_settings LIMIT 1);

-- Announcement bar
INSERT INTO public.announcement_bar (enabled, text, background_color, text_color, emoji, dismissible, animation)
SELECT false, 'Early Beta is Live', '#1a1a2e', '#ffffff', '🚀', true, 'slide'
WHERE NOT EXISTS (SELECT 1 FROM public.announcement_bar LIMIT 1);

-- SEO settings (root page)
INSERT INTO public.seo_settings (page_path, title, description, robots)
SELECT '/', 'Noska — Your Second Brain', 'A calmer way to think on a page.', 'index,follow'
WHERE NOT EXISTS (SELECT 1 FROM public.seo_settings LIMIT 1);

-- ============================================================
-- 12. log_launch_audit function (for audit trail)
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_launch_audit(
  p_admin_id uuid DEFAULT NULL,
  p_admin_name text DEFAULT NULL,
  p_action text DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_entity_id text DEFAULT NULL,
  p_field text DEFAULT NULL,
  p_old_value jsonb DEFAULT NULL,
  p_new_value jsonb DEFAULT NULL,
  p_details text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  v_id := gen_random_uuid();
  INSERT INTO launch_audit_log (id, admin_id, admin_name, action, entity_type, entity_id, field, old_value, new_value, details)
  VALUES (v_id, p_admin_id, p_admin_name, p_action, p_entity_type, p_entity_id, p_field, p_old_value, p_new_value, p_details);
  RETURN v_id;
END;
$$;

-- ============================================================
-- 13. Update admin_select whitelist
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

-- ============================================================
-- 14. Update admin_update whitelist
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
    -- Launch/CTA/Landing/SEO tables
    'launch_settings', 'cta_buttons', 'landing_content',
    'announcement_bar', 'seo_settings', 'social_links',
    'waitlist_settings'
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
-- 15. Update admin_insert whitelist
-- ============================================================
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
    'api_keys',
    -- Launch/CTA/Landing/SEO tables
    'launch_settings', 'cta_buttons', 'landing_content',
    'announcement_bar', 'seo_settings', 'social_links',
    'waitlist_settings'
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

-- ============================================================
-- 16. Update admin_delete whitelist
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
    -- Launch/CTA/Landing/SEO tables
    'launch_settings', 'cta_buttons', 'landing_content',
    'announcement_bar', 'seo_settings', 'social_links',
    'waitlist_settings'
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
-- 17. Enable realtime for new tables
-- ============================================================
alter publication supabase_realtime add table if not exists public.launch_settings;
alter publication supabase_realtime add table if not exists public.cta_buttons;
alter publication supabase_realtime add table if not exists public.landing_content;
alter publication supabase_realtime add table if not exists public.announcement_bar;
alter publication supabase_realtime add table if not exists public.seo_settings;
alter publication supabase_realtime add table if not exists public.social_links;
alter publication supabase_realtime add table if not exists public.waitlist_settings;
