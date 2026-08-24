
-- Both views are security_invoker = on, so the underlying tables' RLS still
-- decides which rows are visible. Without a GRANT, every authenticated read
-- failed with a permission error, which surfaced as "Unknown User".
GRANT SELECT ON public.student_profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO authenticated;
