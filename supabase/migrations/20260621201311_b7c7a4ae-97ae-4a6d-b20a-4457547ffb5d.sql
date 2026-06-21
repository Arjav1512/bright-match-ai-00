-- display_name_for is only invoked from inside notification trigger functions
-- (which run as SECURITY DEFINER themselves). No client code, edge function, or
-- end user needs EXECUTE on it.
REVOKE EXECUTE ON FUNCTION public.display_name_for(uuid) FROM PUBLIC, anon, authenticated;