CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
REVOKE ALL ON public.push_subscriptions FROM anon;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own push subscriptions" ON public.push_subscriptions
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can create own push subscriptions" ON public.push_subscriptions
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update own push subscriptions" ON public.push_subscriptions
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can delete own push subscriptions" ON public.push_subscriptions
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE INDEX push_subscriptions_user_id_idx ON public.push_subscriptions(user_id);
COMMENT ON TABLE public.push_subscriptions IS 'Device Web Push subscriptions, private to their owner; deleted by the existing auth-to-profile cascade.';
ALTER TABLE public.notifications
  ADD COLUMN event_kind text,
  ADD COLUMN sender_id uuid,
  ADD COLUMN push_tag text;
COMMENT ON COLUMN public.notifications.event_kind IS 'Optional producer classification; group_message is reserved for in-app-only group notifications.';
COMMENT ON COLUMN public.notifications.sender_id IS 'Optional sender identity for unread direct-message grouping; nullable and independent of existing notification rows.';
COMMENT ON COLUMN public.notifications.push_tag IS 'Optional device notification replacement tag; existing notifications keep their current behavior.';