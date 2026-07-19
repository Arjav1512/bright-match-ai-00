DROP FUNCTION IF EXISTS public.resolve_display_names(uuid[]);

CREATE FUNCTION public.resolve_display_names(_user_ids uuid[])
RETURNS TABLE(user_id uuid, display_name text, avatar_url text, is_employer boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.user_id,
    COALESCE(
      CASE WHEN public.has_role(u.user_id, 'employer'::app_role)
           THEN NULLIF(BTRIM(ep.company_name), '') END,
      NULLIF(BTRIM(p.full_name), ''),
      NULLIF(BTRIM(au.raw_user_meta_data->>'full_name'), ''),
      NULLIF(BTRIM(au.raw_user_meta_data->>'name'), ''),
      NULLIF(BTRIM(ep.company_name), ''),
      NULLIF(BTRIM(split_part(au.email, '@', 1)), ''),
      CASE WHEN public.has_role(u.user_id, 'employer'::app_role)
           THEN 'Unknown Company' ELSE 'Unknown User' END
    ) AS display_name,
    COALESCE(p.avatar_url, ep.logo_url) AS avatar_url,
    public.has_role(u.user_id, 'employer'::app_role) AS is_employer
  FROM unnest(_user_ids) AS u(user_id)
  LEFT JOIN public.profiles p ON p.user_id = u.user_id
  LEFT JOIN public.employer_profiles ep ON ep.user_id = u.user_id
  LEFT JOIN auth.users au ON au.id = u.user_id;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_display_names(uuid[]) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.display_name_for(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    CASE WHEN public.has_role(_user_id, 'employer'::app_role)
         THEN NULLIF(BTRIM((SELECT company_name FROM public.employer_profiles WHERE user_id = _user_id)), '') END,
    NULLIF(BTRIM((SELECT full_name FROM public.profiles WHERE user_id = _user_id)), ''),
    NULLIF(BTRIM((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = _user_id)), ''),
    NULLIF(BTRIM((SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = _user_id)), ''),
    NULLIF(BTRIM((SELECT company_name FROM public.employer_profiles WHERE user_id = _user_id)), ''),
    NULLIF(BTRIM(split_part((SELECT email FROM auth.users WHERE id = _user_id), '@', 1)), ''),
    CASE WHEN public.has_role(_user_id, 'employer'::app_role)
         THEN 'Unknown Company' ELSE 'Unknown User' END
  );
$$;
