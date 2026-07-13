-- Revert prior broad SELECT that leaked phone_number
DROP POLICY IF EXISTS "Authenticated users can view completed student profiles" ON public.student_profiles;

-- Recreate the public view with SECURITY DEFINER semantics so peers can read it
-- without the base-table RLS blocking them. The view excludes phone_number, lat, lng.
DROP VIEW IF EXISTS public.student_profiles_public;

CREATE VIEW public.student_profiles_public
WITH (security_invoker = off) AS
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
