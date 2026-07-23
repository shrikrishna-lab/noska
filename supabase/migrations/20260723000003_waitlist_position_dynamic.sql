-- Change waitlist position from sequence-based to count-based
-- so that deleting entries resets positions for new signups

CREATE OR REPLACE FUNCTION auto_assign_waitlist_position()
RETURNS trigger AS $$
BEGIN
  IF NEW.position IS NULL THEN
    NEW.position := COALESCE((SELECT MAX(position) FROM waitlist_entries), 0) + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill: reassign all positions sequentially
UPDATE waitlist_entries SET position = sub.new_pos
FROM (
  SELECT id, row_number() OVER (ORDER BY joined_at ASC, id ASC) AS new_pos
  FROM waitlist_entries
) sub
WHERE waitlist_entries.id = sub.id;
