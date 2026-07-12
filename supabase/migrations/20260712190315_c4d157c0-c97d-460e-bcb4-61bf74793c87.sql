REVOKE EXECUTE ON FUNCTION public.list_student_profiles_public() FROM anon;
REVOKE EXECUTE ON FUNCTION public.list_student_profiles_public() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_student_profiles_public() TO authenticated;
REVOKE SELECT ON public.student_profiles_public FROM anon;
GRANT SELECT ON public.student_profiles_public TO authenticated;