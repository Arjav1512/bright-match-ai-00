-- =============================================================================
-- FIX: CRITICAL-6 — Admin privilege escalation via signup
-- The previous handle_new_user trigger trusted the 'role' field from
-- raw_user_meta_data, which is fully user-controlled. Any caller who passes
-- role: "admin" in their signUp metadata was automatically granted admin rights.
--
-- Fix: always assign 'student' for new self-registrations.
-- Admin role assignment is a privileged operation done via assign_admin_role().
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _role app_role;
BEGIN
  -- SECURITY: Never trust the role from user metadata.
  -- Only 'student' or 'employer' are allowed at self-registration.
  -- Map metadata value to allowed set; anything else → student.
  _role := CASE
    WHEN (NEW.raw_user_meta_data->>'role') = 'employer' THEN 'employer'::app_role
    ELSE 'student'::app_role   -- default; 'admin' from metadata is silently ignored
  END;

  -- Create base profile
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (user_id) DO NOTHING;

  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT (user_id) DO NOTHING;

  -- Create role-specific profile stub
  IF _role = 'student' THEN
    INSERT INTO public.student_profiles (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  ELSIF _role = 'employer' THEN
    INSERT INTO public.employer_profiles (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================================================
-- FIX: HIGH-2 — No DELETE RLS policy (GDPR / DPDP right to erasure)
-- Users must be able to request deletion of their own data.
-- =============================================================================

-- Profiles: users can delete their own profile
CREATE POLICY "Users can delete own profile"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Student profiles: students can delete their own profile
CREATE POLICY "Students can delete own profile"
  ON public.student_profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Employer profiles: employers can delete their own profile
CREATE POLICY "Employers can delete own profile"
  ON public.employer_profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- User roles: users can delete their own role assignment (account deletion)
CREATE POLICY "Users can delete own role"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
