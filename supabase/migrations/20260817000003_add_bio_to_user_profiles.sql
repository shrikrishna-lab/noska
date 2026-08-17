-- Add a short user-written bio to user_profiles so users can personalize
-- their profile card (shown in the web app's Profile view).
-- The admin RPCs (admin_select/admin_insert/admin_update) iterate over JSON
-- keys dynamically, so a new column needs no whitelist changes.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS bio text;

COMMENT ON COLUMN public.user_profiles.bio IS 'Short user-written bio shown on their profile card.';