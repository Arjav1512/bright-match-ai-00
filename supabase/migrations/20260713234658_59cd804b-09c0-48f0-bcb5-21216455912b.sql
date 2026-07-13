-- Restore the public view with invoker semantics (satisfies linter)
DROP VIEW IF EXISTS public.student_profiles_public;

CREATE VIEW public.student_profiles_public
WITH (security_invoker = on) AS
SELECT
  s.id, s.user_id, s.university, s.major, s.graduation_year, s.skills,
  s.preferred_course, s.location, s.profile_role, s.experience_years,
  s.is_student, s.current_job_title, s.current_company, s.not_employed,
  s.linkedin_url, s.website_url, s.resume_url, s.reputation_score,
  s.completed_internships, s.skill_test_score, s.company_feedback_score,
  s.profile_strength_score, s.onboarding_status, s.created_at,
  NULLIF(BTRIM(p.full_name), '') AS full_name,
  p.avatar_url,
  p.bio
FROM public.student_profiles s
LEFT JOIN public.profiles p ON p.user_id = s.user_id
WHERE s.onboarding_status = 'completed';

GRANT SELECT ON public.student_profiles_public TO authenticated, anon;

-- Definer helper: single-row fetch of a student's non-sensitive fields.
-- Excludes phone_number, lat, lng. Any signed-in user may call it.
CREATE OR REPLACE FUNCTION public.get_student_profile_public(_user_id uuid)
RETURNS TABLE (
  id uuid, user_id uuid, university text, major text, graduation_year integer,
  skills text[], preferred_course text, location text, profile_role text,
  experience_years text, is_student boolean, current_job_title text,
  current_company text, not_employed boolean, linkedin_url text, website_url text,
  resume_url text, reputation_score numeric, completed_internships integer,
  skill_test_score numeric, company_feedback_score numeric,
  profile_strength_score numeric, onboarding_status text,
  created_at timestamptz, full_name text, avatar_url text, bio text
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
    s.linkedin_url, s.website_url, s.resume_url, s.reputation_score,
    s.completed_internships, s.skill_test_score, s.company_feedback_score,
    s.profile_strength_score, s.onboarding_status, s.created_at,
    NULLIF(BTRIM(p.full_name), '') AS full_name,
    p.avatar_url,
    p.bio
  FROM public.student_profiles s
  LEFT JOIN public.profiles p ON p.user_id = s.user_id
  WHERE s.user_id = _user_id
    AND s.onboarding_status = 'completed'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_student_profile_public(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_student_profile_public(uuid) TO authenticated;
