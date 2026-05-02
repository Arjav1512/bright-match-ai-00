-- Revoke direct EXECUTE on the new notification helper + trigger functions
-- so they cannot be called from the client. Triggers run as table owner and
-- are unaffected by EXECUTE grants on the function.
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, notification_type, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_employer_on_new_application() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_student_on_application_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_user_on_new_follow() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_user_on_direct_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_group_members_on_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_employer_on_verification() FROM PUBLIC, anon, authenticated;