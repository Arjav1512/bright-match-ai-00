
CREATE OR REPLACE FUNCTION public.get_student_profile_public(_user_id uuid)
 RETURNS TABLE(id uuid, user_id uuid, university text, major text, graduation_year integer, skills text[], preferred_course text, location text, profile_role text, experience_years text, is_student boolean, current_job_title text, current_company text, not_employed boolean, linkedin_url text, website_url text, resume_url text, reputation_score numeric, completed_internships integer, skill_test_score numeric, company_feedback_score numeric, profile_strength_score numeric, onboarding_status text, created_at timestamp with time zone, full_name text, avatar_url text, bio text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    s.id, s.user_id, s.university, s.major, s.graduation_year, s.skills,
    s.preferred_course, s.location, s.profile_role, s.experience_years,
    s.is_student, s.current_job_title, s.current_company, s.not_employed,
    s.linkedin_url, s.website_url,
    -- Sensitive fields: only owner, admin, or employer with application relationship
    CASE
      WHEN auth.uid() = s.user_id
        OR public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_application_relationship(auth.uid(), s.user_id)
      THEN s.resume_url
      ELSE NULL
    END AS resume_url,
    CASE
      WHEN auth.uid() = s.user_id
        OR public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_application_relationship(auth.uid(), s.user_id)
      THEN s.reputation_score
      ELSE NULL
    END AS reputation_score,
    CASE
      WHEN auth.uid() = s.user_id
        OR public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_application_relationship(auth.uid(), s.user_id)
      THEN s.completed_internships
      ELSE NULL
    END AS completed_internships,
    CASE
      WHEN auth.uid() = s.user_id
        OR public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_application_relationship(auth.uid(), s.user_id)
      THEN s.skill_test_score
      ELSE NULL
    END AS skill_test_score,
    CASE
      WHEN auth.uid() = s.user_id
        OR public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_application_relationship(auth.uid(), s.user_id)
      THEN s.company_feedback_score
      ELSE NULL
    END AS company_feedback_score,
    CASE
      WHEN auth.uid() = s.user_id
        OR public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_application_relationship(auth.uid(), s.user_id)
      THEN s.profile_strength_score
      ELSE NULL
    END AS profile_strength_score,
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
