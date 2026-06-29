
-- 1) campus_statuses: revoke broad access, grant column-level SELECT that excludes coordinates
REVOKE ALL ON public.campus_statuses FROM anon, authenticated, PUBLIC;
GRANT SELECT (id, student_id, content, created_at, expires_at) ON public.campus_statuses TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.campus_statuses TO authenticated;
GRANT ALL ON public.campus_statuses TO service_role;

-- 2) employer_invitations: scope policies to authenticated only (no public)
REVOKE ALL ON public.employer_invitations FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employer_invitations TO authenticated;
GRANT ALL ON public.employer_invitations TO service_role;

DROP POLICY IF EXISTS "Employers can view own invitations" ON public.employer_invitations;
CREATE POLICY "Employers can view own invitations"
  ON public.employer_invitations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = inviter_id);

DROP POLICY IF EXISTS "Employers can delete own invitations" ON public.employer_invitations;
CREATE POLICY "Employers can delete own invitations"
  ON public.employer_invitations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = inviter_id);

-- 3) skill_test_results: restrict employer access to skills relevant to the applied internship
REVOKE ALL ON public.skill_test_results FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.skill_test_results TO authenticated;
GRANT ALL ON public.skill_test_results TO service_role;

DROP POLICY IF EXISTS "Employers can view active applicant test results" ON public.skill_test_results;
CREATE POLICY "Employers can view relevant applicant test results"
  ON public.skill_test_results
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'employer'::app_role)
    AND EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.internships i ON i.id = a.internship_id
      WHERE a.student_id = skill_test_results.student_id
        AND i.employer_id = auth.uid()
        AND a.status <> 'rejected'::application_status
        AND i.skills_required IS NOT NULL
        AND skill_test_results.skill_name = ANY (i.skills_required)
    )
  );

-- 4) student_profiles: ensure anon has no access; coordinates/phone remain protected by RLS
--    (function get_applicant_profiles_for_employer already excludes lat/lng/geohash/phone_number)
REVOKE ALL ON public.student_profiles FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_profiles TO authenticated;
GRANT ALL ON public.student_profiles TO service_role;
