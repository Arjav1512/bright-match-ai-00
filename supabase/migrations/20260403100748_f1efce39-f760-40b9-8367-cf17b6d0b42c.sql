
-- 1. Create security definer function for group membership checks
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id AND user_id = _user_id
  )
$$;

-- Restrict access
REVOKE EXECUTE ON FUNCTION public.is_group_member FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_group_member TO authenticated;

-- 2. Fix group_members SELECT policy
DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;
CREATE POLICY "Members can view group members"
ON public.group_members
FOR SELECT TO authenticated
USING (public.is_group_member(group_id, auth.uid()));

-- 3. Fix groups SELECT policy
DROP POLICY IF EXISTS "Members can view their groups" ON public.groups;
CREATE POLICY "Members can view their groups"
ON public.groups
FOR SELECT TO authenticated
USING (public.is_group_member(id, auth.uid()));

-- 4. Fix group_messages SELECT policy
DROP POLICY IF EXISTS "Members can read group messages" ON public.group_messages;
CREATE POLICY "Members can read group messages"
ON public.group_messages
FOR SELECT TO authenticated
USING (public.is_group_member(group_id, auth.uid()));

-- 5. Fix group_messages INSERT policy
DROP POLICY IF EXISTS "Members can send group messages" ON public.group_messages;
CREATE POLICY "Members can send group messages"
ON public.group_messages
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id AND public.is_group_member(group_id, auth.uid()));

-- 6. Fix peerup_participants SELECT policy (also has self-referencing recursion)
DROP POLICY IF EXISTS "Participants can view circle members" ON public.peerup_participants;
CREATE POLICY "Participants can view circle members"
ON public.peerup_participants
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM peerup_circles c WHERE c.id = peerup_participants.circle_id AND c.creator_id = auth.uid())
  OR auth.uid() = user_id
);
