
-- Fix LinkUp: public discovery views were unreadable because they were security_invoker
-- and underlying RLS only allows users to see their own profile.
-- These views deliberately exclude sensitive PII, so safe to expose to authenticated users.

ALTER VIEW public.student_profiles_public SET (security_invoker = false);
ALTER VIEW public.employer_profiles_public SET (security_invoker = false);

GRANT SELECT ON public.student_profiles_public TO authenticated;
GRANT SELECT ON public.employer_profiles_public TO authenticated;
