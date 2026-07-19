
-- Rebuild profiles_public as a SECURITY DEFINER-style view so the safe,
-- publicly-shareable fields (full_name, avatar_url, bio) are readable by every
-- authenticated user regardless of the restrictive RLS on the base profiles
-- table. Sensitive fields on `profiles` remain protected because they are not
-- exposed by this view.
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker = off) AS
SELECT
  p.user_id,
  NULLIF(BTRIM(p.full_name), '') AS full_name,
  p.avatar_url,
  p.bio
FROM public.profiles p;

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- Canonical name resolver: company_name for employers, full_name otherwise.
-- Returns one row per requested user_id (missing users included with NULLs so
-- callers can safely LEFT JOIN / merge).
CREATE OR REPLACE FUNCTION public.resolve_display_names(_user_ids uuid[])
RETURNS TABLE(user_id uuid, display_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.user_id,
    COALESCE(
      CASE WHEN public.has_role(u.user_id, 'employer'::app_role)
           THEN NULLIF(BTRIM(ep.company_name), '')
      END,
      NULLIF(BTRIM(p.full_name), ''),
      NULLIF(BTRIM(ep.company_name), ''),
      'Unknown User'
    ) AS display_name,
    COALESCE(p.avatar_url, ep.logo_url) AS avatar_url
  FROM unnest(_user_ids) AS u(user_id)
  LEFT JOIN public.profiles p ON p.user_id = u.user_id
  LEFT JOIN public.employer_profiles ep ON ep.user_id = u.user_id;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_display_names(uuid[]) TO anon, authenticated;
