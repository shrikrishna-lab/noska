-- Auto-assign position for existing entries that have null position
UPDATE waitlist_entries SET position = sub.new_pos
FROM (
  SELECT id, row_number() OVER (ORDER BY joined_at ASC, id ASC) AS new_pos
  FROM waitlist_entries
  WHERE position IS NULL
) sub
WHERE waitlist_entries.id = sub.id;

-- Create sequence for auto-incrementing position
CREATE SEQUENCE IF NOT EXISTS waitlist_position_seq START WITH 1;

-- Set the sequence to the current max position
SELECT setval('waitlist_position_seq', COALESCE((SELECT MAX(position) FROM waitlist_entries), 1), false);

-- Trigger function to auto-assign position on insert
CREATE OR REPLACE FUNCTION auto_assign_waitlist_position()
RETURNS trigger AS $$
BEGIN
  IF NEW.position IS NULL THEN
    NEW.position := nextval('waitlist_position_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger
DROP TRIGGER IF EXISTS trg_auto_assign_waitlist_position ON waitlist_entries;
CREATE TRIGGER trg_auto_assign_waitlist_position
  BEFORE INSERT ON waitlist_entries
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_waitlist_position();

-- Create a function to get real waitlist position for a user
CREATE OR REPLACE FUNCTION get_waitlist_position(p_email TEXT)
RETURNS TABLE(pos INTEGER, ahead INTEGER, total_pending INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.position AS pos,
    (SELECT COUNT(*)::INTEGER FROM waitlist_entries WHERE position < w.position AND status IN ('waiting', 'pending')) AS ahead,
    (SELECT COUNT(*)::INTEGER FROM waitlist_entries WHERE status IN ('waiting', 'pending')) AS total_pending
  FROM waitlist_entries w
  WHERE w.email = p_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_waitlist_position(TEXT) TO anon, authenticated;
