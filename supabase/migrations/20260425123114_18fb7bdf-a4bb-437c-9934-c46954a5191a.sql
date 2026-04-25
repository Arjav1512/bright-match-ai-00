
-- 1. Notifications: only admins/service role can insert
DROP POLICY IF EXISTS "Users can receive notifications" ON public.notifications;

CREATE POLICY "Only admins can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. user_roles: explicit deny on client writes
CREATE POLICY "No client inserts on user_roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "No client updates on user_roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "No client deletes on user_roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (false);

-- 3. realtime.messages: scope channel subscriptions
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Allow users to subscribe to their own user-scoped channel (topic = 'user:<uid>')
CREATE POLICY "Users can subscribe to own user channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'user:' || auth.uid()::text
);

-- Allow direct message channel: topic format 'dm:<uidA>:<uidB>' where current user is one of them
CREATE POLICY "Users can subscribe to own DM channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE 'dm:%' AND (
    realtime.topic() LIKE 'dm:' || auth.uid()::text || ':%'
    OR realtime.topic() LIKE 'dm:%:' || auth.uid()::text
  )
);

-- Allow generic table-change subscriptions on direct_messages where user is sender or receiver — kept open via SELECT RLS on direct_messages itself
CREATE POLICY "Users can subscribe to direct_messages changes"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'direct_messages'
);

-- Group channels: topic format 'group:<group_id>' where user is a member
CREATE POLICY "Members can subscribe to their group channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE 'group:%'
  AND is_group_member(
    NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid,
    auth.uid()
  )
);

-- Peerup circle channels: topic format 'circle:<circle_id>' where user created or joined
CREATE POLICY "Participants can subscribe to peerup circles"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE 'circle:%'
  AND EXISTS (
    SELECT 1 FROM public.peerup_circles c
    WHERE c.id = NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid
      AND (
        c.creator_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.peerup_participants p
          WHERE p.circle_id = c.id AND p.user_id = auth.uid()
        )
      )
  )
);
