REVOKE ALL ON FUNCTION public.enforce_follow_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_follow_status() FROM anon;
REVOKE ALL ON FUNCTION public.enforce_follow_status() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_follow_status() TO service_role;