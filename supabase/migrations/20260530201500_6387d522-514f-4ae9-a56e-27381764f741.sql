
-- Restore wiped grants on employer_profiles and student_profiles.
-- Column-level SELECT grants enforce sensitive-column protection per @security-memory.
-- INSERT/UPDATE/DELETE are gated by RLS (own row or admin).

-- service_role bypasses RLS — must have full access for edge functions / admin code.
GRANT ALL ON public.employer_profiles TO service_role;
GRANT ALL ON public.student_profiles TO service_role;

-- Restore public-column SELECT for authenticated (non-sensitive cols only).
GRANT SELECT (
  id, user_id, company_name, industry, city, state, logo_url,
  company_size, website, company_description, year_established,
  hiring_roles, funding_stage, is_verified, onboarding_status, created_at,
  linkedin_profile
) ON public.employer_profiles TO authenticated;

GRANT SELECT (
  id, user_id, university, major, graduation_year, skills, preferred_course,
  location, profile_role, experience_years, is_student, current_job_title,
  current_company, not_employed, onboarding_status, created_at
) ON public.student_profiles TO authenticated;

GRANT SELECT (linkedin_url, website_url) ON public.student_profiles TO authenticated, anon;
GRANT SELECT (linkedin_profile) ON public.employer_profiles TO anon;

-- Owners need to insert/update their own rows; admins update via RLS too.
GRANT INSERT, UPDATE, DELETE ON public.employer_profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.student_profiles TO authenticated;

-- Admin verification panel needs sensitive cols (gstin, pan_number, cin).
-- SECURITY DEFINER RPC avoids granting these to all authenticated users.
CREATE OR REPLACE FUNCTION public.admin_list_employers_for_verification()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  company_name text,
  gstin text,
  pan_number text,
  linkedin_profile text,
  cin text,
  is_verified boolean,
  industry text,
  city text,
  onboarding_status text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, e.user_id, e.company_name, e.gstin, e.pan_number,
         e.linkedin_profile, e.cin, e.is_verified, e.industry, e.city,
         e.onboarding_status, e.created_at
  FROM public.employer_profiles e
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
  ORDER BY e.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.admin_list_employers_for_verification() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_employers_for_verification() TO authenticated;
