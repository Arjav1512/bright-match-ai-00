-- Promote yourwroob@gmail.com to admin if/when the auth user exists.
-- No password is stored; auth credentials remain managed by Supabase Auth.
-- Idempotent: safe to re-run.

DO $$
DECLARE
  _uid uuid;
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower('yourwroob@gmail.com');

  IF _uid IS NULL THEN
    RAISE NOTICE 'User yourwroob@gmail.com does not exist yet. They must sign up first; re-run promotion afterward.';
    RETURN;
  END IF;

  -- Ensure a general profile row exists
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (_uid, COALESCE(
    (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = _uid),
    (SELECT raw_user_meta_data->>'name'      FROM auth.users WHERE id = _uid),
    'Admin'
  ))
  ON CONFLICT (user_id) DO NOTHING;

  -- Replace any existing non-admin role with admin (one role per user in this system)
  DELETE FROM public.user_roles WHERE user_id = _uid AND role <> 'admin'::public.app_role;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'admin'::public.app_role)
  ON CONFLICT DO NOTHING;

  -- Audit trail
  INSERT INTO public.audit_log (action, admin_id, target_id, target_type, details)
  VALUES ('grant_admin', _uid, _uid, 'user', jsonb_build_object('email', 'yourwroob@gmail.com', 'source', 'migration'));
END$$;