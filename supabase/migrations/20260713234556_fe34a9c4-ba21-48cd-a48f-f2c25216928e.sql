-- Allow other authenticated students to read non-sensitive fields of completed student profiles
-- by adding an RLS policy scoped to onboarding_status='completed'. Sensitive fields (phone,
-- lat, lng) remain hidden — the frontend uses the student_profiles_public view for peer views.

CREATE POLICY "Authenticated users can view completed student profiles"
  ON public.student_profiles
  FOR SELECT
  TO authenticated
  USING (onboarding_status = 'completed');
