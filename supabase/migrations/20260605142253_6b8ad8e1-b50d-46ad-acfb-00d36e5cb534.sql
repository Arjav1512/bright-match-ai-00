
-- 1) Restrict employer_profiles discovery to safe columns via security-definer view
ALTER VIEW public.employer_profiles_public SET (security_invoker = false);
GRANT SELECT ON public.employer_profiles_public TO authenticated, anon;
DROP POLICY IF EXISTS "Discovery: read public columns of employer profiles" ON public.employer_profiles;

-- 2) Add employer role check to internships UPDATE policy
DROP POLICY IF EXISTS "Employers can update own internships" ON public.internships;
CREATE POLICY "Employers can update own internships"
ON public.internships
FOR UPDATE
TO authenticated
USING (auth.uid() = employer_id AND public.has_role(auth.uid(), 'employer'::app_role))
WITH CHECK (auth.uid() = employer_id AND public.has_role(auth.uid(), 'employer'::app_role));

-- 3) Prevent students from self-reporting skill test results. Only the
-- skill-tests edge function (service_role) may insert.
DROP POLICY IF EXISTS "Students can insert own test results" ON public.skill_test_results;

-- 4) Hide legacy resume_url on applications from clients. The applicant
-- relationship still controls storage access via signed URLs.
REVOKE SELECT (resume_url) ON public.applications FROM authenticated, anon;
