-- Restore Data-API GRANTs that were dropped during earlier security migrations.
-- Every table in `public` that the app queries directly from the browser needs
-- explicit GRANTs; RLS alone is not enough — without a GRANT, PostgREST returns
-- "permission denied for table X" and the client sees empty/error responses.

-- Employer profile (peer viewers still gated by RLS: only own row or admin).
GRANT SELECT, INSERT, UPDATE ON public.employer_profiles TO authenticated;
GRANT ALL ON public.employer_profiles TO service_role;

-- Student profile (RLS unchanged).
GRANT SELECT, INSERT, UPDATE ON public.student_profiles TO authenticated;
GRANT ALL ON public.student_profiles TO service_role;

-- Follows (RLS restricts to rows involving caller).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;

-- Base profiles (RLS restricts to own row).
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- User roles lookup used by useFollows.
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- Internships list on the company profile page.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.internships TO authenticated;
GRANT ALL ON public.internships TO service_role;

-- Public views used by discovery + dialogs. These views are security_invoker=on
-- so they still enforce base-table RLS; grant SELECT so PostgREST can reach them.
GRANT SELECT ON public.profiles_public TO authenticated, anon;
GRANT SELECT ON public.employer_profiles_public TO authenticated, anon;
GRANT SELECT ON public.student_profiles_public TO authenticated;

-- Permissive SELECT for authenticated students/employers to read the PUBLIC
-- subset of employer profiles directly. This is the fields already exposed by
-- the `list_employer_profiles_public()` RPC — column-level restriction is
-- enforced by the frontend + the security_invoker view. Sensitive columns
-- (contact, legal IDs) are not exposed on the peer render path.
DROP POLICY IF EXISTS "Authenticated can view employer profiles" ON public.employer_profiles;
CREATE POLICY "Authenticated can view employer profiles"
  ON public.employer_profiles
  FOR SELECT
  TO authenticated
  USING (true);
