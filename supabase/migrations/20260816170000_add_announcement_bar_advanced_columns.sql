-- Add advanced styling/behavior columns to announcement_bar that the admin UI
-- already edits but the table was missing. Fixes save failing with 400 (column
-- does not exist) and the controlled/uncontrolled Switch warning.
ALTER TABLE public.announcement_bar
  ADD COLUMN IF NOT EXISTS position text DEFAULT 'top',
  ADD COLUMN IF NOT EXISTS bg_style text DEFAULT 'solid',
  ADD COLUMN IF NOT EXISTS gradient_start text,
  ADD COLUMN IF NOT EXISTS gradient_end text,
  ADD COLUMN IF NOT EXISTS font_size text DEFAULT 'md',
  ADD COLUMN IF NOT EXISTS border_style text DEFAULT 'bottom',
  ADD COLUMN IF NOT EXISTS page_target text DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS auto_dismiss_seconds int,
  ADD COLUMN IF NOT EXISTS start_at timestamptz,
  ADD COLUMN IF NOT EXISTS end_at timestamptz,
  ADD COLUMN IF NOT EXISTS secondary_link_url text,
  ADD COLUMN IF NOT EXISTS secondary_link_text text,
  ADD COLUMN IF NOT EXISTS show_close_button boolean DEFAULT true;