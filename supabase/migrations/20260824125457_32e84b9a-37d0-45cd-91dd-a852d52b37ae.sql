
CREATE OR REPLACE FUNCTION public.is_group_active(_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = _group_id
      AND (
        g.type <> 'circle'
        OR (
          g.circle_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.peerup_circles c
            WHERE c.id = g.circle_id AND c.expires_at > now()
          )
        )
        -- Legacy circle groups created before circles were linked:
        -- fall back to the same 24h rule using the group's own timestamp.
        OR (g.circle_id IS NULL AND g.created_at > now() - interval '24 hours')
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_peerup_circles()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _deleted integer;
  _groups integer;
BEGIN
  WITH del AS (
    DELETE FROM public.peerup_circles
     WHERE expires_at <= now()
    RETURNING id
  )
  SELECT COUNT(*) INTO _deleted FROM del;

  WITH delg AS (
    DELETE FROM public.groups
     WHERE type = 'circle'
       AND (
         (circle_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM public.peerup_circles c WHERE c.id = groups.circle_id))
         OR (circle_id IS NULL AND created_at <= now() - interval '24 hours')
       )
    RETURNING id
  )
  SELECT COUNT(*) INTO _groups FROM delg;

  RAISE LOG '[cleanup_expired_peerup_circles] circles=% groups=% at=%', _deleted, _groups, now();
  RETURN _deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_peerup_circles() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_group_active(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_group_active(uuid) TO authenticated;
