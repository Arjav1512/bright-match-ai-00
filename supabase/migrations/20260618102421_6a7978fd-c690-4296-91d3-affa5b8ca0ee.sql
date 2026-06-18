-- Lock down campus_statuses GPS coordinates:
-- 1) Revoke column-level SELECT on latitude/longitude from client roles so REST/GraphQL
--    cannot read precise coordinates of other students. Edge functions use service_role
--    and remain unaffected.
REVOKE SELECT (latitude, longitude) ON public.campus_statuses FROM authenticated;
REVOKE SELECT (latitude, longitude) ON public.campus_statuses FROM anon;

-- 2) Remove campus_statuses from the Realtime publication. Realtime CDC payloads
--    bypass column-level grants and would broadcast lat/lng to every subscribed
--    student. The campus-status edge function (/nearby) already strips coords
--    before returning rows to clients.
ALTER PUBLICATION supabase_realtime DROP TABLE public.campus_statuses;