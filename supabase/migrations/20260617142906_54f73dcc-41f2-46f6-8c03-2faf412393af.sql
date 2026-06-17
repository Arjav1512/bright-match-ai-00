
ALTER TABLE public.follows
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz;

-- Backfill: any existing accepted row gets accepted_at = created_at.
UPDATE public.follows
   SET accepted_at = created_at
 WHERE status = 'accepted' AND accepted_at IS NULL;

-- Replace enforce_follow_status: same role logic, plus stamp accepted_at on auto-accept.
CREATE OR REPLACE FUNCTION public.enforce_follow_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _follower_role app_role;
  _following_role app_role;
BEGIN
  SELECT role INTO _follower_role FROM public.user_roles WHERE user_id = NEW.follower_id LIMIT 1;
  SELECT role INTO _following_role FROM public.user_roles WHERE user_id = NEW.following_id LIMIT 1;

  IF _follower_role = 'student' AND _following_role = 'student' THEN
    NEW.status := 'pending';
    NEW.accepted_at := NULL;
  ELSE
    NEW.status := 'accepted';
    NEW.accepted_at := COALESCE(NEW.accepted_at, now());
  END IF;

  RETURN NEW;
END;
$$;

-- Stamp accepted_at when status transitions to accepted via update.
CREATE OR REPLACE FUNCTION public.stamp_follow_accepted_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS DISTINCT FROM 'accepted') THEN
    NEW.accepted_at := COALESCE(NEW.accepted_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_follow_accepted_at ON public.follows;
CREATE TRIGGER trg_stamp_follow_accepted_at
BEFORE UPDATE ON public.follows
FOR EACH ROW
EXECUTE FUNCTION public.stamp_follow_accepted_at();
