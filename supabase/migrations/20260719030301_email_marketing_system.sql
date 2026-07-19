-- Email Marketing System
-- Creates tables for email templates, branding, segments, versions, history, and subscribers

-- 1. email_templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL DEFAULT '',
  category text DEFAULT 'general',
  blocks jsonb DEFAULT '[]'::jsonb,
  html_content text DEFAULT '',
  plain_text text DEFAULT '',
  variables jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.admin_users(id) ON DELETE SET NULL
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access to email_templates" ON public.email_templates
  FOR ALL USING (true) WITH CHECK (true);

-- 2. email_branding
CREATE TABLE IF NOT EXISTS public.email_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'Noska',
  support_email text DEFAULT '',
  website_url text DEFAULT '',
  footer_text text DEFAULT '',
  primary_color text DEFAULT '#2563eb',
  secondary_color text DEFAULT '#64748b',
  accent_color text DEFAULT '#f59e0b',
  logo_url text DEFAULT '',
  favicon_url text DEFAULT '',
  social_github text DEFAULT '',
  social_discord text DEFAULT '',
  social_linkedin text DEFAULT '',
  social_twitter text DEFAULT '',
  social_youtube text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.email_branding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access to email_branding" ON public.email_branding
  FOR ALL USING (true) WITH CHECK (true);

-- 3. email_segments
CREATE TABLE IF NOT EXISTS public.email_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  filters jsonb DEFAULT '[]'::jsonb,
  subscriber_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.email_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access to email_segments" ON public.email_segments
  FOR ALL USING (true) WITH CHECK (true);

-- 4. email_versions
CREATE TABLE IF NOT EXISTS public.email_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.email_templates(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  blocks jsonb DEFAULT '[]'::jsonb,
  html_content text DEFAULT '',
  plain_text text DEFAULT '',
  subject text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.admin_users(id) ON DELETE SET NULL
);

ALTER TABLE public.email_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access to email_versions" ON public.email_versions
  FOR ALL USING (true) WITH CHECK (true);

-- 5. email_history
CREATE TABLE IF NOT EXISTS public.email_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient text NOT NULL,
  subject text NOT NULL,
  template_id uuid REFERENCES public.email_templates(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
  status text DEFAULT 'sent',
  sent_at timestamptz DEFAULT now(),
  opened_at timestamptz,
  clicked_at timestamptz,
  error_message text
);

ALTER TABLE public.email_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access to email_history" ON public.email_history
  FOR ALL USING (true) WITH CHECK (true);

-- 6. newsletter_subscribers
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text DEFAULT '',
  status text DEFAULT 'active',
  source text DEFAULT 'manual',
  metadata jsonb DEFAULT '{}'::jsonb,
  subscribed_at timestamptz DEFAULT now(),
  unsubscribed_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access to newsletter_subscribers" ON public.newsletter_subscribers
  FOR ALL USING (true) WITH CHECK (true);

-- Seed default branding
INSERT INTO public.email_branding (company_name, support_email, website_url)
VALUES ('Noska', 'support@noska.dev', 'https://noska.dev')
ON CONFLICT DO NOTHING;
