
-- 1) campus_statuses: revoke precise lat/lng from clients. Edge function uses service_role.
REVOKE SELECT (latitude, longitude) ON public.campus_statuses FROM authenticated, anon;

-- 2) follows: replace permissive SELECT with participant-or-accepted scope.
DROP POLICY IF EXISTS "Anyone can view follows" ON public.follows;
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;
DROP POLICY IF EXISTS "Public follows are viewable" ON public.follows;
DROP POLICY IF EXISTS "Authenticated can view follows" ON public.follows;
-- Drop any existing SELECT policies that used USING(true)
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='follows' AND cmd='SELECT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.follows', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "View accepted or own follow rows"
  ON public.follows FOR SELECT
  TO authenticated
  USING (
    status = 'accepted'
    OR auth.uid() = follower_id
    OR auth.uid() = following_id
  );

-- 3) skill_test_results: restrict employer SELECT to non-rejected applications.
DROP POLICY IF EXISTS "Employers can view applicant test results" ON public.skill_test_results;
CREATE POLICY "Employers can view active applicant test results"
  ON public.skill_test_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.internships i ON i.id = a.internship_id
      WHERE a.student_id = skill_test_results.student_id
        AND i.employer_id = auth.uid()
        AND a.status <> 'rejected'::public.application_status
    )
    AND public.has_role(auth.uid(), 'employer'::public.app_role)
  );
