-- 1. Remove duplicate position-assignment trigger (identical MAX+1 logic
--    already provided by auto_assign_waitlist_position)
DROP TRIGGER IF EXISTS trg_assign_waitlist_position ON public.waitlist_entries;
DROP FUNCTION IF EXISTS public.assign_waitlist_position();

-- 2. Trigger functions must not be callable directly over PostgREST.
REVOKE EXECUTE ON FUNCTION public.auto_assign_waitlist_position() FROM anon, authenticated;
ALTER FUNCTION public.auto_assign_waitlist_position() SET search_path = public;

-- 3. Internal maintenance RPC used only by the delete-waitlist edge function
--    (service role is never affected by REVOKE).
REVOKE EXECUTE ON FUNCTION public.recalculate_waitlist_positions() FROM anon, authenticated;
ALTER FUNCTION public.recalculate_waitlist_positions() SET search_path = public;

-- 4. Admin dashboard stats RPC — admins authenticate, anon has no business here.
REVOKE EXECUTE ON FUNCTION public.get_waitlist_stats(TEXT) FROM anon;