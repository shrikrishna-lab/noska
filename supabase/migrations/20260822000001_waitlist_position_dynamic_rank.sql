-- Queue position must reflect the ACTIVE queue only (waiting/pending),
-- ranked by join order — not the raw stored position, which keeps growing
-- as approved/rejected/banned rows accumulate.
CREATE OR REPLACE FUNCTION get_waitlist_position(p_email TEXT)
RETURNS TABLE(pos INTEGER, ahead INTEGER, total_pending INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH active AS (
    SELECT w.id, w.email,
           ROW_NUMBER() OVER (ORDER BY w.joined_at ASC, w.id ASC) AS rn
    FROM waitlist_entries w
    WHERE w.status IN ('waiting', 'pending')
  )
  SELECT
    a.rn::INTEGER,
    GREATEST(a.rn - 1, 0)::INTEGER,
    (SELECT COUNT(*)::INTEGER FROM waitlist_entries WHERE status IN ('waiting', 'pending'))
  FROM active a
  WHERE lower(a.email) = lower(p_email);
END;
$$;

GRANT EXECUTE ON FUNCTION get_waitlist_position(TEXT) TO anon, authenticated;
