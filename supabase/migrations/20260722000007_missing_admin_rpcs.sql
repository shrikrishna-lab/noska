-- ============================================================
-- Migration: Missing Admin RPCs
--
-- 1. delete_user_data — admin deletes a user's personal data
-- 2. restore_account — admin restores a soft-deleted account
-- 3. permanently_delete_account — admin permanently removes a deleted account
-- 4. get_waitlist_stats — aggregated waitlist statistics
-- ============================================================

-- ============================================================
-- 1. delete_user_data
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_user_data(
  p_user_id text,
  p_session_token text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_name text;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'support');
  SELECT user_name INTO v_name FROM user_profiles WHERE user_id = p_user_id LIMIT 1;
  DELETE FROM collaboration_sessions WHERE user_id = p_user_id;
  DELETE FROM block_locks WHERE user_id = p_user_id;
  DELETE FROM page_permissions WHERE user_id = p_user_id;
  DELETE FROM ai_chats WHERE user_id = p_user_id;
  UPDATE user_profiles SET email = 'deleted@user', user_name = 'Deleted User', avatar_url = NULL, deleted_at = now()
  WHERE user_id = p_user_id;
  PERFORM log_admin_action(v_admin_id, 'delete_user_data', 'user', p_user_id, v_name, NULL);
  RETURN TRUE;
END;
$$;

-- ============================================================
-- 2. restore_account
-- ============================================================
CREATE OR REPLACE FUNCTION public.restore_account(
  p_account_id text,
  p_session_token text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_name text;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'support');
  SELECT user_name INTO v_name FROM user_profiles WHERE user_id = p_account_id LIMIT 1;
  UPDATE user_profiles SET deleted_at = NULL WHERE user_id = p_account_id;
  IF FOUND THEN
    PERFORM log_admin_action(v_admin_id, 'restore_account', 'user', p_account_id, v_name, NULL);
  END IF;
  RETURN FOUND;
END;
$$;

-- ============================================================
-- 3. permanently_delete_account
-- ============================================================
CREATE OR REPLACE FUNCTION public.permanently_delete_account(
  p_account_id text,
  p_session_token text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_name text;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'admin');
  SELECT user_name INTO v_name FROM user_profiles WHERE user_id = p_account_id LIMIT 1;
  DELETE FROM user_profiles WHERE user_id = p_account_id;
  IF FOUND THEN
    DELETE FROM collaboration_sessions WHERE user_id = p_account_id;
    DELETE FROM block_locks WHERE user_id = p_account_id;
    DELETE FROM page_permissions WHERE user_id = p_account_id;
    DELETE FROM ai_chats WHERE user_id = p_account_id;
    DELETE FROM audit_events WHERE user_id = p_account_id;
    PERFORM log_admin_action(v_admin_id, 'permanently_delete_account', 'user', p_account_id, v_name, NULL);
  END IF;
  RETURN FOUND;
END;
$$;

-- ============================================================
-- 4. get_waitlist_stats
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_waitlist_stats(
  p_session_token text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_result jsonb;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'support');
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'today', COUNT(*) FILTER (WHERE joined_at >= CURRENT_DATE),
    'waiting', COUNT(*) FILTER (WHERE status IN ('waiting', 'pending')),
    'invited', COUNT(*) FILTER (WHERE status = 'invited'),
    'accepted', COUNT(*) FILTER (WHERE status = 'accepted'),
    'rejected', COUNT(*) FILTER (WHERE status = 'rejected'),
    'countries', COALESCE(
      (SELECT jsonb_object_agg(COALESCE(country, 'unknown'), cnt)
       FROM (SELECT country, COUNT(*) AS cnt FROM waitlist_entries WHERE country IS NOT NULL GROUP BY country) sub),
      '{}'::jsonb
    ),
    'top_referrers', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('name', name, 'count', referral_count))
       FROM (SELECT name, referral_count FROM waitlist_entries WHERE referral_count > 0 ORDER BY referral_count DESC LIMIT 5) sub),
      '[]'::jsonb
    )
  ) INTO v_result
  FROM waitlist_entries;
  RETURN v_result;
END;
$$;
