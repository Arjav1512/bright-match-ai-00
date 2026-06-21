DROP POLICY IF EXISTS "Anyone can view removed internships" ON public.internships;

REVOKE SELECT (centroid_lat, centroid_lng) ON public.groups FROM authenticated;
REVOKE SELECT (centroid_lat, centroid_lng) ON public.groups FROM anon;