-- Deterministic seed for E2E: Post → Circle
-- Creates one student user with a known UUID so tests can authenticate
-- and insert a peerup_circles row, triggering the auto-group creation.

BEGIN;

-- Fixed UUIDs make assertions deterministic across CI runs.
-- Student user
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'e2e-student@wroob.test',
  crypt('TestPass123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"E2E Student","role":"student"}'::jsonb,
  now(), now(), '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

-- handle_new_user trigger should create profile/role/student_profile,
-- but in case the trigger fires before this seed (db reset clean), ensure rows exist.
INSERT INTO public.profiles (user_id, full_name)
VALUES ('11111111-1111-1111-1111-111111111111', 'E2E Student')
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
VALUES ('11111111-1111-1111-1111-111111111111', 'student')
ON CONFLICT DO NOTHING;

INSERT INTO public.student_profiles (user_id, onboarding_status)
VALUES ('11111111-1111-1111-1111-111111111111', 'completed')
ON CONFLICT DO NOTHING;

COMMIT;
