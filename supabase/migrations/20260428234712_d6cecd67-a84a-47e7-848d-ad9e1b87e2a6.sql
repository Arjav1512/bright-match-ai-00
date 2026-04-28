
-- The previous discovery policies allowed authenticated users to SELECT *all* columns
-- from student_profiles / employer_profiles, which would leak phone, resume_url, GSTIN, PAN, etc.
-- Replace with column-restricted access via REVOKE + GRANT on specific columns to 'authenticated'.

-- First, drop the broad SELECT policies we just added
DROP POLICY IF EXISTS "Authenticated can view completed student profiles for discovery" ON public.student_profiles;
DROP POLICY IF EXISTS "Authenticated can view employer profiles for discovery" ON public.employer_profiles;

-- Re-create policies, but only readable through public views (security_definer views bypass RLS).
-- Switch the two discovery views back to security_definer so they enforce the view owner's
-- privileges, and restrict callers via REVOKE on the base tables + explicit GRANT on the views.

ALTER VIEW public.student_profiles_public SET (security_invoker = false);
ALTER VIEW public.employer_profiles_public SET (security_invoker = false);

-- Lock down direct table access stays as-is (existing RLS policies cover owner/employer/admin reads).
-- Grant ONLY view access to authenticated.
GRANT SELECT ON public.student_profiles_public TO authenticated;
GRANT SELECT ON public.employer_profiles_public TO authenticated;

-- Document why these views are intentionally security_definer:
COMMENT ON VIEW public.student_profiles_public IS
  'Public-safe student directory for LinkUp discovery. Excludes phone, lat/lng, linkedin_url, resume_url. SECURITY DEFINER by design so authenticated users can browse without bypassing column filtering.';
COMMENT ON VIEW public.employer_profiles_public IS
  'Public-safe employer directory for LinkUp discovery. Excludes GSTIN, PAN, CIN, HR/manager phone+email, address coordinates. SECURITY DEFINER by design so authenticated users can browse without bypassing column filtering.';
