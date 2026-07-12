
DROP POLICY IF EXISTS "System can insert participants" ON public.peerup_participants;

CREATE POLICY "Participants inserted only via approved requests"
ON public.peerup_participants
FOR INSERT
TO authenticated
WITH CHECK (
  -- Circle creator can add participants (used by approval flow)
  EXISTS (
    SELECT 1 FROM public.peerup_circles c
    WHERE c.id = peerup_participants.circle_id
      AND c.creator_id = auth.uid()
  )
  OR
  -- A user may only be inserted if they have an approved request for this circle
  EXISTS (
    SELECT 1 FROM public.peerup_requests r
    WHERE r.circle_id = peerup_participants.circle_id
      AND r.requester_id = peerup_participants.user_id
      AND r.status = 'approved'
  )
);
