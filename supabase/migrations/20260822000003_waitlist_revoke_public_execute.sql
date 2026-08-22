-- Function EXECUTE defaults to PUBLIC on creation, so revoking only from
-- anon/authenticated leaves them callable. Revoke from PUBLIC explicitly.
REVOKE EXECUTE ON FUNCTION public.auto_assign_waitlist_position() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalculate_waitlist_positions() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_waitlist_stats(TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.recalculate_waitlist_positions() TO service_role;
