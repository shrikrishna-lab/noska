-- Drops the stale admin_update overload that used `p_id uuid`.
-- The current admin_update uses `p_id text` (recreated in
-- 20260817000001_super_admin_features.sql). Both coexisted, making the
-- RPC ambiguous for PostgREST (PGRST203) when called with a string id.

DROP FUNCTION IF EXISTS public.admin_update(p_session_token text, p_table text, p_id uuid, p_data jsonb, p_min_role text);