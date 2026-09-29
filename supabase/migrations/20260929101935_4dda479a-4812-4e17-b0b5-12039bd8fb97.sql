DROP POLICY IF EXISTS "Signed-in users can view skills" ON public.skills;
DROP POLICY IF EXISTS "Authenticated users can view skills" ON public.skills;
CREATE POLICY "Users with an account role can view skills"
ON public.skills FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'student')
  OR public.has_role(auth.uid(), 'employer')
  OR public.has_role(auth.uid(), 'admin')
);