-- SUGA.HEALTH — reduce externally callable SECURITY DEFINER surface.
-- Trigger functions are invoked by Postgres and do not need client RPC access.
REVOKE ALL ON FUNCTION public.enforce_notification_update_safety() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_notification_update_safety() TO service_role;

-- RLS policies need this helper for signed-in users, but anonymous RPC access is unnecessary.
REVOKE ALL ON FUNCTION public.get_current_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_role() TO authenticated, service_role;
