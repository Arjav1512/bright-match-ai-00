
DROP VIEW IF EXISTS public.student_profiles_public;
DROP FUNCTION IF EXISTS public.list_student_profiles_public();

CREATE FUNCTION public.list_student_profiles_public()
 RETURNS TABLE(
   id uuid, user_id uuid, university text, major text, graduation_year integer,
   skills text[], preferred_course text, location text, profile_role text,
   experience_years text, is_student boolean, current_job_title text,
   current_company text, not_employed boolean, linkedin_url text, website_url text,
   resume_url text, reputation_score numeric, completed_internships integer,
   skill_test_score numeric, company_feedback_score numeric,
   profile_strength_score numeric,
   onboarding_status text, created_at timestamp with time zone
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
    s.resume_url, s.reputation_score, s.completed_internships,
    s.skill_test_score, s.company_feedback_score, s.profile_strength_score,
    s.onboarding_status, s.created_at
  FROM public.student_profiles s
  WHERE s.onboarding_status = 'completed';
$function$;

CREATE VIEW public.student_profiles_public
WITH (security_invoker = on) AS
  SELECT * FROM public.list_student_profiles_public();

GRANT SELECT ON public.student_profiles_public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_student_profiles_public() TO anon, authenticated;

DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
WITH (security_invoker = on) AS
  SELECT user_id, full_name, avatar_url, bio
  FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;
