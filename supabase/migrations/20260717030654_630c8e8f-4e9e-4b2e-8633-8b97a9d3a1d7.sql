-- 1) employer_profiles: remove permissive authenticated read.
DROP POLICY IF EXISTS "Authenticated can view employer profiles" ON public.employer_profiles;
-- Existing policies remain: owner + admin SELECT. Peer viewers use
-- list_employer_profiles_public() RPC (SECURITY DEFINER) which strips
-- sensitive columns.

-- 2) campus_statuses: restrict direct SELECT to owner + admin. Frontend
-- already reads via the campus-status edge function (service_role).
DROP POLICY IF EXISTS "Students can view active statuses" ON public.campus_statuses;

DROP POLICY IF EXISTS "Owners can view own statuses" ON public.campus_statuses;
CREATE POLICY "Owners can view own statuses"
  ON public.campus_statuses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Admins can view all statuses" ON public.campus_statuses;
CREATE POLICY "Admins can view all statuses"
  ON public.campus_statuses
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) peerup_circles: restrict direct SELECT so location is not broadcast
-- to every student. Discovery uses a SECURITY DEFINER RPC.
DROP POLICY IF EXISTS "Students can view active circles" ON public.peerup_circles;

DROP POLICY IF EXISTS "Creators can view own circles" ON public.peerup_circles;
CREATE POLICY "Creators can view own circles"
  ON public.peerup_circles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Participants can view their circles" ON public.peerup_circles;
CREATE POLICY "Participants can view their circles"
  ON public.peerup_circles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.peerup_participants pp
      WHERE pp.circle_id = peerup_circles.id
        AND pp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view all circles" ON public.peerup_circles;
CREATE POLICY "Admins can view all circles"
  ON public.peerup_circles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- RPC for discovery: returns online circles (no location gating) plus
-- offline circles within radius_km of the caller's supplied position,
-- and any circle the caller already participates in or created.
CREATE OR REPLACE FUNCTION public.list_visible_peerup_circles(
  _lat double precision,
  _lng double precision,
  _radius_km double precision DEFAULT 5
)
RETURNS SETOF public.peerup_circles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.*
  FROM public.peerup_circles c
  WHERE c.status = 'active'
    AND c.expires_at > now()
    AND (
      -- Always visible: online circles have no location to leak.
      c.mode = 'online'
      -- Caller's own circles.
      OR c.creator_id = auth.uid()
      -- Circles the caller participates in or has requested.
      OR EXISTS (
        SELECT 1 FROM public.peerup_participants pp
        WHERE pp.circle_id = c.id AND pp.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.peerup_requests pr
        WHERE pr.circle_id = c.id AND pr.requester_id = auth.uid()
      )
      -- Offline circles within radius. Uses haversine on WGS84.
      OR (
        c.mode = 'offline'
        AND _lat IS NOT NULL AND _lng IS NOT NULL
        AND c.latitude IS NOT NULL AND c.longitude IS NOT NULL
        AND (
          6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians(_lat)) * cos(radians(c.latitude))
                * cos(radians(c.longitude) - radians(_lng))
              + sin(radians(_lat)) * sin(radians(c.latitude))
            ))
          )
        ) <= _radius_km
      )
    );
$$;

REVOKE ALL ON FUNCTION public.list_visible_peerup_circles(double precision, double precision, double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_visible_peerup_circles(double precision, double precision, double precision) TO authenticated;
