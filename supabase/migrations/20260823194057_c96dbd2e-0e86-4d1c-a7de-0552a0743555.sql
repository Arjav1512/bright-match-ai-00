-- Break mutual recursion between peerup_circles and peerup_participants policies
CREATE OR REPLACE FUNCTION public.is_circle_creator(_circle_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.peerup_circles c
    WHERE c.id = _circle_id AND c.creator_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_circle_participant(_circle_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.peerup_participants p
    WHERE p.circle_id = _circle_id AND p.user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.has_approved_circle_request(_circle_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.peerup_requests r
    WHERE r.circle_id = _circle_id
      AND r.requester_id = _user_id
      AND r.status = 'approved'
  )
$$;

-- peerup_circles
DROP POLICY IF EXISTS "Participants can view their circles" ON public.peerup_circles;
CREATE POLICY "Participants can view their circles"
ON public.peerup_circles FOR SELECT TO authenticated
USING (public.is_circle_participant(id, auth.uid()));

-- peerup_participants
DROP POLICY IF EXISTS "Participants can view circle members" ON public.peerup_participants;
CREATE POLICY "Participants can view circle members"
ON public.peerup_participants FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_circle_creator(circle_id, auth.uid())
  OR public.is_circle_participant(circle_id, auth.uid())
);

DROP POLICY IF EXISTS "Participants inserted only via approved requests" ON public.peerup_participants;
CREATE POLICY "Participants inserted only via approved requests"
ON public.peerup_participants FOR INSERT TO authenticated
WITH CHECK (
  public.is_circle_creator(circle_id, auth.uid())
  OR public.has_approved_circle_request(circle_id, user_id)
);

-- allow members to leave a circle (host can remove members)
DROP POLICY IF EXISTS "Members can leave or be removed by host" ON public.peerup_participants;
CREATE POLICY "Members can leave or be removed by host"
ON public.peerup_participants FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_circle_creator(circle_id, auth.uid())
);

-- peerup_requests
DROP POLICY IF EXISTS "Circle creators can view requests" ON public.peerup_requests;
CREATE POLICY "Circle creators can view requests"
ON public.peerup_requests FOR SELECT TO authenticated
USING (public.is_circle_creator(circle_id, auth.uid()));

DROP POLICY IF EXISTS "Circle creators can update requests" ON public.peerup_requests;
CREATE POLICY "Circle creators can update requests"
ON public.peerup_requests FOR UPDATE TO authenticated
USING (public.is_circle_creator(circle_id, auth.uid()))
WITH CHECK (public.is_circle_creator(circle_id, auth.uid()));

-- peerup_circle_credentials
DROP POLICY IF EXISTS "Host manages credentials" ON public.peerup_circle_credentials;
CREATE POLICY "Host manages credentials"
ON public.peerup_circle_credentials FOR ALL TO authenticated
USING (public.is_circle_creator(circle_id, auth.uid()))
WITH CHECK (public.is_circle_creator(circle_id, auth.uid()));

DROP POLICY IF EXISTS "Approved participants can view credentials" ON public.peerup_circle_credentials;
CREATE POLICY "Approved participants can view credentials"
ON public.peerup_circle_credentials FOR SELECT TO authenticated
USING (public.is_circle_participant(circle_id, auth.uid()));