-- Fix SUPA_security_definer_view: flip profiles_public to security_invoker
ALTER VIEW public.profiles_public SET (security_invoker = on);

-- Add a permissive SELECT policy so name/avatar/bio resolve across users.
-- profiles only contains full_name, bio, avatar_url — all safe for display.
DROP POLICY IF EXISTS "Public profile fields viewable by authenticated" ON public.profiles;
CREATE POLICY "Public profile fields viewable by authenticated"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);