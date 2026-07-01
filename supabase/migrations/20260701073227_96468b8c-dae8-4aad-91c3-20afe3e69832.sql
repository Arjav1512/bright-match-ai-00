
-- 1. Column + backfill + default (24h TTL)
ALTER TABLE public.group_messages
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

UPDATE public.group_messages
   SET expires_at = created_at + interval '24 hours'
 WHERE expires_at IS NULL;

ALTER TABLE public.group_messages
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '24 hours');

ALTER TABLE public.group_messages
  ALTER COLUMN expires_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS group_messages_expires_at_idx
  ON public.group_messages (expires_at);

-- 2. Trigger enforces exact 24h from created_at regardless of client input
CREATE OR REPLACE FUNCTION public.set_group_message_expiry()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.expires_at := COALESCE(NEW.created_at, now()) + interval '24 hours';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_group_message_expiry ON public.group_messages;
CREATE TRIGGER trg_set_group_message_expiry
BEFORE INSERT ON public.group_messages
FOR EACH ROW EXECUTE FUNCTION public.set_group_message_expiry();

-- 3. Hide expired rows from clients via RLS (defense-in-depth if cleanup lags)
DROP POLICY IF EXISTS "Members can read group messages" ON public.group_messages;
CREATE POLICY "Members can read group messages"
ON public.group_messages
FOR SELECT
TO authenticated
USING (
  public.is_group_member(group_id, auth.uid())
  AND expires_at > now()
);

-- 4. Cleanup function + scheduled job (every 5 minutes)
CREATE OR REPLACE FUNCTION public.cleanup_expired_group_messages()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _deleted integer;
BEGIN
  WITH del AS (
    DELETE FROM public.group_messages
     WHERE expires_at <= now()
    RETURNING id
  )
  SELECT COUNT(*) INTO _deleted FROM del;

  RAISE LOG '[cleanup_expired_group_messages] deleted=% at=%', _deleted, now();
  RETURN _deleted;
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
DECLARE _jobid bigint;
BEGIN
  SELECT jobid INTO _jobid FROM cron.job WHERE jobname = 'cleanup-expired-group-messages';
  IF _jobid IS NOT NULL THEN
    PERFORM cron.unschedule(_jobid);
  END IF;
END $$;

SELECT cron.schedule(
  'cleanup-expired-group-messages',
  '*/5 * * * *',
  $$ SELECT public.cleanup_expired_group_messages(); $$
);
