
-- 1. Fix resumes bucket: restrict employer reads to applicants of their own internships
DROP POLICY IF EXISTS "Employers can view applicant resumes" ON storage.objects;

CREATE POLICY "Employers can view applicant resumes"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'resumes'
  AND public.has_role(auth.uid(), 'employer'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.applications a
    JOIN public.internships i ON i.id = a.internship_id
    WHERE i.employer_id = auth.uid()
      AND (storage.foldername(name))[1] = a.student_id::text
  )
);

-- 2. Remove broad direct_messages realtime topic policy
DROP POLICY IF EXISTS "Users can subscribe to direct_messages changes" ON realtime.messages;

-- 3. Rotate hardcoded admin@test.com password to an unguessable random value
UPDATE auth.users
SET
  encrypted_password = crypt(encode(gen_random_bytes(32), 'base64'), gen_salt('bf')),
  updated_at = now()
WHERE email = 'admin@test.com';

-- 4. Lock down SECURITY DEFINER helper functions from anon/public execute
REVOKE EXECUTE ON FUNCTION public.assign_cohort_group() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_student_reputation(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) FROM PUBLIC, anon;

-- has_role is used inside RLS USING clauses; keep authenticated execute, revoke anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- set_initial_role is invoked by signed-in users completing onboarding; keep authenticated only
REVOKE EXECUTE ON FUNCTION public.set_initial_role(public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_initial_role(public.app_role) TO authenticated;
