
-- Switch views back to security_invoker (eliminates linter ERROR)
ALTER VIEW public.student_profiles_public SET (security_invoker = true);
ALTER VIEW public.employer_profiles_public SET (security_invoker = true);

-- Add discovery RLS policies on the base tables
CREATE POLICY "Discovery: read public columns of completed student profiles"
ON public.student_profiles
FOR SELECT
TO authenticated
USING (onboarding_status = 'completed');

CREATE POLICY "Discovery: read public columns of employer profiles"
ON public.employer_profiles
FOR SELECT
TO authenticated
USING (true);

-- Column-level grants restrict what 'authenticated' can read.
-- Sensitive fields (phone, resume_url, linkedin_url, lat/lng, GSTIN, PAN, CIN, HR/manager contacts,
-- pincode, head office address) are intentionally NOT granted.
REVOKE SELECT ON public.student_profiles FROM authenticated;
GRANT SELECT (
  id, user_id, university, major, graduation_year, skills, preferred_course,
  location, profile_role, experience_years, is_student, current_job_title,
  current_company, not_employed, onboarding_status, created_at
) ON public.student_profiles TO authenticated;

REVOKE SELECT ON public.employer_profiles FROM authenticated;
GRANT SELECT (
  id, user_id, company_name, industry, city, state, logo_url,
  company_size, website, company_description, year_established,
  hiring_roles, funding_stage, is_verified, onboarding_status, created_at
) ON public.employer_profiles TO authenticated;

GRANT SELECT ON public.student_profiles_public TO authenticated;
GRANT SELECT ON public.employer_profiles_public TO authenticated;
