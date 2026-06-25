
-- Restrict Realtime channel subscriptions for notifications, campus statuses,
-- status replies, peerup circles/requests/participants.
--
-- The frontend uses these channel names:
--   notif-badge-<uid>, notif-page-<uid>  → personal notifications
--   campus-statuses-realtime              → campus_statuses + status_replies fan-out
--   peerup-realtime                       → peerup_circles/requests/participants fan-out
--
-- realtime.messages RLS gates which topics an authenticated client may
-- subscribe to. We add SELECT policies scoped per-user / per-role.

DROP POLICY IF EXISTS "Users can subscribe to their own notification channels" ON realtime.messages;
CREATE POLICY "Users can subscribe to their own notification channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (
    realtime.topic() = 'notif-badge-' || auth.uid()::text
    OR realtime.topic() = 'notif-page-' || auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Students can subscribe to campus status channel" ON realtime.messages;
CREATE POLICY "Students can subscribe to campus status channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'campus-statuses-realtime'
  AND public.has_role(auth.uid(), 'student'::public.app_role)
);

DROP POLICY IF EXISTS "Students can subscribe to peerup channel" ON realtime.messages;
CREATE POLICY "Students can subscribe to peerup channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'peerup-realtime'
  AND public.has_role(auth.uid(), 'student'::public.app_role)
);
