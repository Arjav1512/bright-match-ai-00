
-- Owner helper: cohort employer or circle creator
CREATE OR REPLACE FUNCTION public.is_group_owner(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = _group_id
      AND (
        (g.type = 'cohort' AND g.company_id = _user_id::text)
        OR (g.type = 'circle' AND EXISTS (
          SELECT 1 FROM public.peerup_circles c
          WHERE c.creator_id = _user_id
            AND g.label = COALESCE(c.topic, 'PeerUp Circle') || ' @ ' || COALESCE(c.spot_name, 'Spot')
        ))
      )
  )
$$;

-- DELETE policy: sender OR group owner
DROP POLICY IF EXISTS "Sender or owner can delete group messages" ON public.group_messages;
CREATE POLICY "Sender or owner can delete group messages"
ON public.group_messages
FOR DELETE
TO authenticated
USING (
  sender_id = auth.uid()
  OR public.is_group_owner(group_id, auth.uid())
);

-- Ensure DELETE realtime payload carries group_id (for client-side filter)
ALTER TABLE public.group_messages REPLICA IDENTITY FULL;
