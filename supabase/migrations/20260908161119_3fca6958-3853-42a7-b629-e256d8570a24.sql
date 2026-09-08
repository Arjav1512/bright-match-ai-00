DROP POLICY IF EXISTS "Students can subscribe to campus status channel" ON realtime.messages;
DROP POLICY IF EXISTS "Students can subscribe to peerup channel" ON realtime.messages;

CREATE POLICY "Students can subscribe to own campus status channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'campus-statuses-' || auth.uid()::text
  AND public.has_role(auth.uid(), 'student'::public.app_role)
);

CREATE POLICY "Students can subscribe to own peerup channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'peerup-' || auth.uid()::text
  AND public.has_role(auth.uid(), 'student'::public.app_role)
);