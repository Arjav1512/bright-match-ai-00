-- 1. Drop dependents that expose score columns
DROP VIEW IF EXISTS public.student_profiles_public;
DROP FUNCTION IF EXISTS public.list_student_profiles_public();
DROP FUNCTION IF EXISTS public.get_student_profile_public(uuid);
DROP FUNCTION IF EXISTS public.get_applicant_profiles_for_employer(uuid);
DROP FUNCTION IF EXISTS public.update_student_reputation(uuid);

-- 2. Drop the score columns
ALTER TABLE public.student_profiles
  DROP COLUMN IF EXISTS reputation_score,
  DROP COLUMN IF EXISTS completed_internships,
  DROP COLUMN IF EXISTS skill_test_score,
  DROP COLUMN IF EXISTS company_feedback_score,
  DROP COLUMN IF EXISTS profile_strength_score;

-- 3. Recreate the public directory view without score fields
CREATE VIEW public.student_profiles_public
WITH (security_invoker = on) AS
SELECT
  s.id, s.user_id, s.university, s.major, s.graduation_year, s.skills,
  s.preferred_course, s.location, s.profile_role, s.experience_years,
  s.is_student, s.current_job_title, s.current_company, s.not_employed,
  s.linkedin_url, s.website_url, s.resume_url,
  s.onboarding_status, s.created_at,
  NULLIF(btrim(p.full_name), '') AS full_name,
  p.avatar_url,
  p.bio
FROM public.student_profiles s
LEFT JOIN public.profiles p ON p.user_id = s.user_id
WHERE s.onboarding_status = 'completed';

GRANT SELECT ON public.student_profiles_public TO authenticated;
GRANT SELECT ON public.student_profiles_public TO anon;
GRANT ALL ON public.student_profiles_public TO service_role;

-- 4. Recreate the directory listing RPC without score fields
CREATE OR REPLACE FUNCTION public.list_student_profiles_public()
RETURNS TABLE(
  id uuid, user_id uuid, university text, major text, graduation_year integer,
  skills text[], preferred_course text, location text, profile_role text,
  experience_years text, is_student boolean, current_job_title text,
  current_company text, not_employed boolean, linkedin_url text, website_url text,
  resume_url text, onboarding_status text, created_at timestamp with time zone,
  full_name text, avatar_url text, bio text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    s.id, s.user_id, s.university, s.major, s.graduation_year, s.skills,
    s.preferred_course, s.location, s.profile_role, s.experience_years,
    s.is_student, s.current_job_title, s.current_company, s.not_employed,
    s.linkedin_url, s.website_url, s.resume_url,
    s.onboarding_status, s.created_at,
    NULLIF(BTRIM(p.full_name), '') AS full_name,
    p.avatar_url,
    p.bio
  FROM public.student_profiles s
  LEFT JOIN public.profiles p ON p.user_id = s.user_id
  WHERE s.onboarding_status = 'completed';
$function$;

GRANT EXECUTE ON FUNCTION public.list_student_profiles_public() TO authenticated;

-- 5. Recreate the single-profile RPC without score fields (resume still gated)
CREATE OR REPLACE FUNCTION public.get_student_profile_public(_user_id uuid)
RETURNS TABLE(
  id uuid, user_id uuid, university text, major text, graduation_year integer,
  skills text[], preferred_course text, location text, profile_role text,
  experience_years text, is_student boolean, current_job_title text,
  current_company text, not_employed boolean, linkedin_url text, website_url text,
  resume_url text, onboarding_status text, created_at timestamp with time zone,
  full_name text, avatar_url text, bio text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    s.id, s.user_id, s.university, s.major, s.graduation_year, s.skills,
    s.preferred_course, s.location, s.profile_role, s.experience_years,
    s.is_student, s.current_job_title, s.current_company, s.not_employed,
    s.linkedin_url, s.website_url,
    CASE
      WHEN auth.uid() = s.user_id
        OR public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_application_relationship(auth.uid(), s.user_id)
      THEN s.resume_url
      ELSE NULL
    END AS resume_url,
    s.onboarding_status, s.created_at,
    NULLIF(BTRIM(p.full_name), '') AS full_name,
    p.avatar_url,
    p.bio
  FROM public.student_profiles s
  LEFT JOIN public.profiles p ON p.user_id = s.user_id
  WHERE s.user_id = _user_id
    AND s.onboarding_status = 'completed'
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.get_student_profile_public(uuid) TO authenticated;

-- 6. Recreate the employer applicant RPC without score fields
CREATE OR REPLACE FUNCTION public.get_applicant_profiles_for_employer(p_internship_id uuid)
RETURNS TABLE(
  user_id uuid, skills text[], university text, major text, graduation_year integer,
  resume_url text, linkedin_url text, website_url text, location text,
  preferred_course text, experience_years text, current_job_title text,
  current_company text, full_name text, avatar_url text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    sp.user_id, sp.skills, sp.university, sp.major, sp.graduation_year,
    sp.resume_url, sp.linkedin_url, sp.website_url, sp.location,
    sp.preferred_course, sp.experience_years, sp.current_job_title,
    sp.current_company,
    NULLIF(BTRIM(p.full_name), '') AS full_name,
    p.avatar_url
  FROM public.student_profiles sp
  LEFT JOIN public.profiles p ON p.user_id = sp.user_id
  WHERE EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.internships i ON i.id = a.internship_id
    WHERE a.student_id = sp.user_id
      AND i.id = p_internship_id
      AND i.employer_id = auth.uid()
  );
$function$;

GRANT EXECUTE ON FUNCTION public.get_applicant_profiles_for_employer(uuid) TO authenticated;