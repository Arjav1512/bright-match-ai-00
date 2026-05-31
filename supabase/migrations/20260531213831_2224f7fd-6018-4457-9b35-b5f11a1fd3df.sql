-- Fix onboarding gate 403s: authenticated lacks SELECT on onboarding_step
-- (sensitive columns like PAN/GSTIN/HR contacts remain column-restricted).
GRANT SELECT (onboarding_step, onboarding_status, onboarding_completed_at, user_id)
  ON public.student_profiles TO authenticated;

GRANT SELECT (onboarding_step, onboarding_status, onboarding_completed_at, user_id)
  ON public.employer_profiles TO authenticated;