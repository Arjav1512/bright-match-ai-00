
-- Helper: is a group still alive? Circle-backed groups die with their circle.
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
        g.circle_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.peerup_circles c
          WHERE c.id = g.circle_id AND c.expires_at > now()
        )
      )
  )
$$;

REVOKE ALL ON FUNCTION public.is_group_active(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_group_active(uuid) TO authenticated;

-- Hide expired circle groups + their messages at the API layer immediately.
DROP POLICY IF EXISTS "Members can view their groups" ON public.groups;
CREATE POLICY "Members can view their groups"
ON public.groups FOR SELECT TO authenticated
USING (public.is_group_member(id, auth.uid()) AND public.is_group_active(id));

DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;
CREATE POLICY "Members can view group members"
ON public.group_members FOR SELECT TO authenticated
USING (public.is_group_member(group_id, auth.uid()) AND public.is_group_active(group_id));

DROP POLICY IF EXISTS "Members can read group messages" ON public.group_messages;
CREATE POLICY "Members can read group messages"
ON public.group_messages FOR SELECT TO authenticated
USING (
  public.is_group_member(group_id, auth.uid())
  AND expires_at > now()
  AND public.is_group_active(group_id)
);

DROP POLICY IF EXISTS "Members can send group messages" ON public.group_messages;
CREATE POLICY "Members can send group messages"
ON public.group_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND public.is_group_member(group_id, auth.uid())
  AND public.is_group_active(group_id)
);

-- Server-side 24h cleanup: deleting the circle cascades to its group,
-- members, messages, requests, participants and credentials.
CREATE OR REPLACE FUNCTION public.cleanup_expired_peerup_circles()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _deleted integer;
BEGIN
  WITH del AS (
    DELETE FROM public.peerup_circles
     WHERE expires_at <= now()
    RETURNING id
  )
  SELECT COUNT(*) INTO _deleted FROM del;

  -- Orphaned circle groups (circle already gone) get cleaned too.
  DELETE FROM public.groups
   WHERE type = 'circle'
     AND circle_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.peerup_circles c WHERE c.id = groups.circle_id);

  RAISE LOG '[cleanup_expired_peerup_circles] deleted=% at=%', _deleted, now();
  RETURN _deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_peerup_circles() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule('cleanup-expired-peerup-circles')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-peerup-circles');

SELECT cron.schedule(
  'cleanup-expired-peerup-circles',
  '*/5 * * * *',
  $cron$ SELECT public.cleanup_expired_peerup_circles(); $cron$
);
