-- Admin UI has a "Social Links" feature flag (show social media links in footer)
-- but launch_settings was missing the column, so toggling it failed with 400.
ALTER TABLE public.launch_settings
  ADD COLUMN IF NOT EXISTS show_social_links boolean DEFAULT false;