GRANT SELECT, INSERT, UPDATE ON public.student_profiles TO authenticated;
GRANT ALL ON public.student_profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS reputation_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_internships integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS skill_test_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS company_feedback_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profile_strength_score numeric NOT NULL DEFAULT 0;