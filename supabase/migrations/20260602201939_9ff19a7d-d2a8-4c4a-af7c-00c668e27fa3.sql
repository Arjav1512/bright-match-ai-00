GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.student_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.employer_profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.student_profiles TO service_role;
GRANT ALL ON public.employer_profiles TO service_role;