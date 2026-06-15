
-- 1) Tighten student_profiles: drop the broad employer SELECT policy that exposed
--    phone_number, lat, lng, geohash to employers. Replace with a safe SECURITY
--    DEFINER RPC returning only non-sensitive applicant fields.

DROP POLICY IF EXISTS "Employers can view applicant full profiles" ON public.student_profiles;

CREATE OR REPLACE FUNCTION public.get_applicant_profiles_for_employer(p_internship_id uuid)
RETURNS TABLE (
  user_id uuid,
  skills text[],
  university text,
  major text,
  graduation_year integer,
  resume_url text,
  reputation_score numeric,
  completed_internships integer,
  skill_test_score numeric,
  company_feedback_score numeric,
  profile_strength_score numeric,
  linkedin_url text,
  website_url text,
  location text,
  preferred_course text,
  experience_years text,
  current_job_title text,
  current_company text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sp.user_id, sp.skills, sp.university, sp.major, sp.graduation_year,
    sp.resume_url, sp.reputation_score, sp.completed_internships,
    sp.skill_test_score, sp.company_feedback_score, sp.profile_strength_score,
    sp.linkedin_url, sp.website_url, sp.location, sp.preferred_course,
    sp.experience_years, sp.current_job_title, sp.current_company
  FROM public.student_profiles sp
  WHERE EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.internships i ON i.id = a.internship_id
    WHERE a.student_id = sp.user_id
      AND i.id = p_internship_id
      AND i.employer_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_applicant_profiles_for_employer(uuid) TO authenticated;

-- 2) Make group_members membership management explicit: only triggers
--    (SECURITY DEFINER) may insert/delete. Add explicit deny policies for
--    authenticated clients so intent is documented and the scanner is satisfied.

CREATE POLICY "No client inserts on group_members"
ON public.group_members
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "No client deletes on group_members"
ON public.group_members
FOR DELETE
TO authenticated
USING (false);

CREATE POLICY "No client updates on group_members"
ON public.group_members
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);
