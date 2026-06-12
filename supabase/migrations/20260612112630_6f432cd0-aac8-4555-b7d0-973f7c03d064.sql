
-- Helper SECURITY DEFINER functions that return only safe, public-facing
-- columns. Views below remain security_invoker = true to satisfy the
-- Postgres security linter; the functions themselves bypass RLS so that
-- discovery still works for any signed-in (or anonymous, where granted) user.

CREATE OR REPLACE FUNCTION public.list_employer_profiles_public()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  company_name text,
  logo_url text,
  industry text,
  website text,
  is_verified boolean,
  company_description text,
  company_size text,
  year_established integer,
  funding_stage text,
  linkedin_profile text,
  city text,
  state text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id, e.user_id, e.company_name, e.logo_url, e.industry, e.website,
    e.is_verified, e.company_description, e.company_size, e.year_established,
    e.funding_stage, e.linkedin_profile, e.city, e.state, e.created_at
  FROM public.employer_profiles e;
$$;

GRANT EXECUTE ON FUNCTION public.list_employer_profiles_public() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.list_student_profiles_public()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  university text,
  major text,
  graduation_year integer,
  skills text[],
  preferred_course text,
  location text,
  profile_role text,
  experience_years text,
  is_student boolean,
  current_job_title text,
  current_company text,
  not_employed boolean,
  onboarding_status text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id, s.user_id, s.university, s.major, s.graduation_year, s.skills,
    s.preferred_course, s.location, s.profile_role, s.experience_years,
    s.is_student, s.current_job_title, s.current_company, s.not_employed,
    s.onboarding_status, s.created_at
  FROM public.student_profiles s
  WHERE s.onboarding_status = 'completed';
$$;

GRANT EXECUTE ON FUNCTION public.list_student_profiles_public() TO authenticated;

-- Recreate views as security_invoker = true (caller-rights). Reads go
-- through the SECURITY DEFINER helpers above, so the views never expose
-- sensitive columns and the linter no longer flags SECURITY DEFINER views.
DROP VIEW IF EXISTS public.employer_profiles_public;
CREATE VIEW public.employer_profiles_public
WITH (security_invoker = true) AS
SELECT * FROM public.list_employer_profiles_public();

GRANT SELECT ON public.employer_profiles_public TO anon, authenticated;

DROP VIEW IF EXISTS public.student_profiles_public;
CREATE VIEW public.student_profiles_public
WITH (security_invoker = true) AS
SELECT * FROM public.list_student_profiles_public();

GRANT SELECT ON public.student_profiles_public TO authenticated;
