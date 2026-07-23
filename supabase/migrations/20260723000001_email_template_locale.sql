-- Add locale and translations support to email_templates
ALTER TABLE public.email_templates
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS translations jsonb DEFAULT '{}'::jsonb;
