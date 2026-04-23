-- Reset admin@test.com password to the documented test credential and confirm email.
UPDATE auth.users
SET
  encrypted_password = crypt('Test1234!', gen_salt('bf')),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  updated_at = now()
WHERE email = 'admin@test.com';

-- Make sure the admin role is assigned
DO $$
DECLARE _uid uuid;
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE email = 'admin@test.com';
  IF _uid IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = _uid AND role <> 'admin'::public.app_role;
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin'::public.app_role)
    ON CONFLICT DO NOTHING;
    INSERT INTO public.profiles (user_id, full_name) VALUES (_uid, 'Admin User')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END$$;