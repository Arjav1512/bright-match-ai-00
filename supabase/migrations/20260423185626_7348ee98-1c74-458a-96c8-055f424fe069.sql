-- ============================================================
-- SEC-1: Employer profile PII protection
-- ============================================================

-- Public-safe view (security_invoker so RLS of caller applies)
CREATE OR REPLACE VIEW public.employer_profiles_public
WITH (security_invoker = true) AS
SELECT
  id,
  user_id,
  company_name,
  logo_url,
  industry,
  website,
  is_verified,
  company_description,
  company_size,
  year_established,
  funding_stage,
  linkedin_profile,
  city,
  state,
  created_at
FROM public.employer_profiles;

GRANT SELECT ON public.employer_profiles_public TO anon, authenticated;

-- Drop the over-permissive policy on the base table
DROP POLICY IF EXISTS "Anyone can view employer profiles" ON public.employer_profiles;

-- Owner can read their own full profile
CREATE POLICY "Employer can read own profile"
ON public.employer_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can read full profiles
CREATE POLICY "Admins can read employer profiles"
ON public.employer_profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- SEC-2: Student profile PII protection
-- ============================================================

CREATE OR REPLACE VIEW public.student_profiles_public
WITH (security_invoker = true) AS
SELECT
  id,
  user_id,
  university,
  major,
  graduation_year,
  skills,
  preferred_course,
  location,                  -- general location text only (not lat/lng)
  profile_role,
  experience_years,
  is_student,
  current_job_title,
  current_company,
  not_employed,
  onboarding_status,
  created_at
FROM public.student_profiles;

GRANT SELECT ON public.student_profiles_public TO authenticated;

-- Drop blanket cross-user SELECT policies
DROP POLICY IF EXISTS "Employers can view student profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Students can view other student profiles" ON public.student_profiles;

-- Employer can read full profile ONLY of students who applied to one of their internships
CREATE POLICY "Employers can view applicant full profiles"
ON public.student_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.applications a
    JOIN public.internships i ON i.id = a.internship_id
    WHERE a.student_id = student_profiles.user_id
      AND i.employer_id = auth.uid()
  )
);
-- Note: existing "Students can view own profile" and "Admins can view student profiles"
-- and "Students can insert/update own profile" remain unchanged.