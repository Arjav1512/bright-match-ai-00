
CREATE OR REPLACE FUNCTION public.are_connected(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.follows
    WHERE status = 'accepted'
      AND (
        (follower_id = _a AND following_id = _b)
        OR (follower_id = _b AND following_id = _a)
      )
  )
$$;

DROP POLICY IF EXISTS "Students can send messages" ON public.direct_messages;

CREATE POLICY "Students can send messages to connections"
ON public.direct_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND has_role(auth.uid(), 'student'::app_role)
  AND has_role(receiver_id, 'student'::app_role)
  AND public.are_connected(auth.uid(), receiver_id)
);
