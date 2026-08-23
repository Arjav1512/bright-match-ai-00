REVOKE EXECUTE ON FUNCTION public.is_circle_creator(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_circle_participant(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_approved_circle_request(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_circle_creator(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_circle_participant(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_approved_circle_request(uuid, uuid) TO authenticated;