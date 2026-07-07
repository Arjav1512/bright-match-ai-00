
-- Tighten profiles SELECT: only owner, admin, or connected users can read full row (including bio).
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

CREATE POLICY "Owner admin or connected can view profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.are_connected(auth.uid(), user_id)
);

-- Revoke broad anon read; keep authenticated grants intact so RLS above governs access.
REVOKE SELECT ON public.profiles FROM anon;

-- Public-safe view exposing ONLY user_id, full_name, avatar_url. No bio.
-- Runs with view owner privileges (security_invoker = off) so it can serve
-- name/avatar for LinkUp browsing, chat previews, applicant lists, etc.
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = off) AS
SELECT user_id, full_name, avatar_url
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated, anon;
