-- =============================================================================
-- FIX: HIGH-7 — DM SELECT policy locked to students only
-- The previous policy had `AND has_role(auth.uid(), 'student')` which prevented
-- employers and admins from reading their own direct messages.
-- Fix: users can read any DM where they are sender or receiver, regardless of role.
-- =============================================================================

-- Drop the broken policy
DROP POLICY IF EXISTS "Users can view own messages" ON public.direct_messages;

-- Replace with a role-agnostic policy: any authenticated user can read their own messages
CREATE POLICY "Users can view own messages"
  ON public.direct_messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
