
-- Revert views to security_invoker (safer pattern, satisfies linter)
ALTER VIEW public.student_profiles_public SET (security_invoker = true);
ALTER VIEW public.employer_profiles_public SET (security_invoker = true);

-- Add RLS policies on underlying tables so authenticated users can read public-safe rows.
-- The public views already exclude sensitive PII columns (phone, lat/lng, linkedin, resume, GSTIN, PAN, CIN, HR/manager contacts).
-- Row-level visibility for browsing is granted here; column-level safety is enforced by the views.

CREATE POLICY "Authenticated can view completed student profiles for discovery"
ON public.student_profiles
FOR SELECT
TO authenticated
USING (onboarding_status = 'completed');

CREATE POLICY "Authenticated can view employer profiles for discovery"
ON public.employer_profiles
FOR SELECT
TO authenticated
USING (true);

-- Grants on views (idempotent)
GRANT SELECT ON public.student_profiles_public TO authenticated;
GRANT SELECT ON public.employer_profiles_public TO authenticated;
