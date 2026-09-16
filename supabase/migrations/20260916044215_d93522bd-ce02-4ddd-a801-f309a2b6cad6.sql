REVOKE ALL ON FUNCTION public.delete_user_account_data(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account_data(uuid) TO service_role;