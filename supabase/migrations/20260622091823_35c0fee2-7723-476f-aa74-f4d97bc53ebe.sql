-- Block all client-side INSERTs on notifications. Notifications must only
-- be created by SECURITY DEFINER triggers/RPCs (create_notification) or by
-- edge functions using service_role (which bypasses RLS).
DROP POLICY IF EXISTS "Only admins can insert notifications" ON public.notifications;

CREATE POLICY "No client inserts on notifications"
ON public.notifications
FOR INSERT
TO authenticated, anon
WITH CHECK (false);