CREATE OR REPLACE FUNCTION public.admin_user_lifecycle(p_session_token text, p_timezone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now timestamptz := statement_timestamp();
  v_today date;
  v_result jsonb;
BEGIN
  PERFORM public.require_admin_role(p_session_token, 'support');

  IF p_timezone IS NULL OR length(p_timezone) > 100
    OR NOT (p_timezone = 'UTC' OR p_timezone ~ '^[A-Za-z_]+/[A-Za-z0-9_+/-]+$')
    OR p_timezone LIKE 'posix/%' OR p_timezone LIKE 'right/%'
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name = p_timezone)
  THEN
    RAISE EXCEPTION 'INVALID_TIMEZONE: expected an IANA timezone name or UTC' USING ERRCODE = '22023';
  END IF;

  v_today := (v_now AT TIME ZONE p_timezone)::date;

  WITH waitlist_counts AS (
    SELECT count(*) AS total,
      count(*) FILTER (WHERE status IN ('approved', 'invited', 'accepted')) AS approved,
      count(*) FILTER (WHERE status = 'rejected') AS rejected,
      count(*) FILTER (WHERE status = 'invited') AS invited,
      count(*) FILTER (WHERE status = 'accepted') AS accepted,
      count(*) FILTER (WHERE status IN ('waiting', 'pending')) AS pending
    FROM public.waitlist_entries
  ), profile_counts AS (
    SELECT count(*) AS accounts,
      count(*) FILTER (WHERE onboarding_complete IS TRUE) AS onboarding_complete
    FROM public.user_profiles
  ), page_counts AS (
    SELECT count(DISTINCT user_id) AS first_page_users
    FROM public.pages
    WHERE user_id IS NOT NULL AND user_id <> ''
  ), activity_days AS (
    SELECT user_id, (created_at AT TIME ZONE p_timezone)::date AS active_day
    FROM public.audit_events
    WHERE user_id IS NOT NULL AND user_id <> '' AND created_at IS NOT NULL
  ), activity_users AS (
    SELECT user_id, count(DISTINCT active_day) AS days,
      bool_or(active_day = v_today) AS active_today,
      max(active_day)::timestamp AT TIME ZONE p_timezone AS last_day
    FROM activity_days
    GROUP BY user_id
  ), activity_counts AS (
    SELECT count(*) FILTER (WHERE a.active_today) AS dau,
      count(*) FILTER (WHERE a.last_day >= v_now - interval '168 hours') AS active7d,
      count(*) FILTER (WHERE a.last_day >= v_now - interval '720 hours') AS active30d,
      count(*) FILTER (WHERE a.days >= 2 AND a.last_day >= v_now - interval '720 hours') AS returning30d,
      count(*) FILTER (WHERE p.created_at < v_now - interval '720 hours'
        AND a.last_day < v_now - interval '720 hours') AS not_returning
    FROM activity_users a
    LEFT JOIN public.user_profiles p ON p.user_id = a.user_id
  )
  SELECT jsonb_build_object(
    'totalWaitlist', w.total, 'approved', w.approved, 'rejected', w.rejected,
    'invited', w.invited, 'accepted', w.accepted, 'pending', w.pending,
    'accounts', p.accounts, 'onboardingComplete', p.onboarding_complete,
    'firstPageUsers', g.first_page_users, 'dau', a.dau, 'active7d', a.active7d,
    'active30d', a.active30d, 'returning30d', a.returning30d, 'notReturning', a.not_returning
  ) INTO v_result
  FROM waitlist_counts w CROSS JOIN profile_counts p CROSS JOIN page_counts g CROSS JOIN activity_counts a;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_user_lifecycle(text, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_user_lifecycle(text, text) TO anon;
