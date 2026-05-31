-- 1. peerup_circles: restrict SELECT to students only (employers must not see spot_name/spot_location)
DROP POLICY IF EXISTS "Anyone can view active circles" ON public.peerup_circles;
CREATE POLICY "Students can view active circles"
  ON public.peerup_circles FOR SELECT TO authenticated
  USING (
    status = 'active'
    AND expires_at > now()
    AND public.has_role(auth.uid(), 'student'::public.app_role)
  );

-- 2. skill_test_results: remove student self-update; writes happen via edge function (service role)
DROP POLICY IF EXISTS "Students can update own test results" ON public.skill_test_results;

-- 3. employer_invitations: require employer role on INSERT
DROP POLICY IF EXISTS "Employers can insert invitations" ON public.employer_invitations;
CREATE POLICY "Employers can insert invitations"
  ON public.employer_invitations FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = inviter_id
    AND public.has_role(auth.uid(), 'employer'::public.app_role)
  );

-- 4. internships: require employer role on DELETE
DROP POLICY IF EXISTS "Employers can delete own internships" ON public.internships;
CREATE POLICY "Employers can delete own internships"
  ON public.internships FOR DELETE TO authenticated
  USING (
    auth.uid() = employer_id
    AND public.has_role(auth.uid(), 'employer'::public.app_role)
  );

-- 5. student_profiles: drop broad discovery policy. Discovery now goes through
--    student_profiles_public view, which is SECURITY DEFINER (no RLS) and only
--    exposes safe public columns. Owner/admin/employer-applicant policies remain.
DROP POLICY IF EXISTS "Discovery: read public columns of completed student profiles" ON public.student_profiles;

DROP VIEW IF EXISTS public.student_profiles_public;
CREATE VIEW public.student_profiles_public AS
SELECT
  id, user_id, university, major, graduation_year, skills, preferred_course,
  location, profile_role, experience_years, is_student, current_job_title,
  current_company, not_employed, onboarding_status, created_at,
  linkedin_url, website_url
FROM public.student_profiles
WHERE onboarding_status = 'completed';

GRANT SELECT ON public.student_profiles_public TO authenticated;