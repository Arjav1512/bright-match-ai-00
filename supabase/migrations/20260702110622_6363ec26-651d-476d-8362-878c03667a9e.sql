-- Expand student public profile RPC/view to include LinkedIn and website URLs
-- so profile details are visible before connection requests are accepted.

DROP VIEW IF EXISTS public.student_profiles_public;
DROP FUNCTION IF EXISTS public.list_student_profiles_public();

CREATE OR REPLACE FUNCTION public.list_student_profiles_public()
 RETURNS TABLE(
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
   linkedin_url text,
   website_url text,
   onboarding_status text,
   created_at timestamp with time zone
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
    s.onboarding_status, s.created_at
  FROM public.student_profiles s
  WHERE s.onboarding_status = 'completed';
$function$;

CREATE VIEW public.student_profiles_public
WITH (security_invoker = on) AS
  SELECT
    id, user_id, university, major, graduation_year, skills, preferred_course,
    location, profile_role, experience_years, is_student, current_job_title,
    current_company, not_employed, linkedin_url, website_url,
    onboarding_status, created_at
  FROM public.list_student_profiles_public();

GRANT SELECT ON public.student_profiles_public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_student_profiles_public() TO anon, authenticated;
