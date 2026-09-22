-- =====================================================================
-- Connector Catalog v8 — Google/Slack env names + least-privilege scopes
--
-- Aligns the gateway rows with the server env contract (one shared
-- "Noska Auth" GCP OAuth client for all three Google connectors):
--
--   gmail            CONNECTOR_GMAIL_CLIENT_ID / _SECRET      (unchanged)
--   google-calendar  CONNECTOR_CALENDAR_CLIENT_ID / _SECRET  (renamed)
--   google-drive     CONNECTOR_DRIVE_CLIENT_ID / _SECRET     (renamed)
--   slack            CONNECTOR_SLACK_CLIENT_ID / _SECRET     (unchanged)
--
-- Scope changes (least privilege for the supported operations):
--   gmail            + gmail.send      (list/read + send)
--   google-calendar  calendar.events   (list + create; replaces the
--                                       read-only set + freebusy)
--   google-drive     drive.readonly    (unchanged: list + read)
--   slack            unchanged (user_scope already covers
--                    channels:read, chat:write, users:read + history)
--
-- Safe: user_connections is empty, so no live connection is affected.
-- Deploy: supabase db push (or db query --linked -f this file)
-- =====================================================================

update public.connectors set
  oauth_config = oauth_config || jsonb_build_object(
    'client_id_env', 'CONNECTOR_CALENDAR_CLIENT_ID',
    'client_secret_env', 'CONNECTOR_CALENDAR_CLIENT_SECRET'
  ),
  default_scopes = array['https://www.googleapis.com/auth/calendar.events'],
  updated_at = now()
where slug = 'google-calendar';

update public.connectors set
  oauth_config = oauth_config || jsonb_build_object(
    'client_id_env', 'CONNECTOR_DRIVE_CLIENT_ID',
    'client_secret_env', 'CONNECTOR_DRIVE_CLIENT_SECRET'
  ),
  updated_at = now()
where slug = 'google-drive';

update public.connectors set
  default_scopes = array[
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send'
  ],
  updated_at = now()
where slug = 'gmail';
