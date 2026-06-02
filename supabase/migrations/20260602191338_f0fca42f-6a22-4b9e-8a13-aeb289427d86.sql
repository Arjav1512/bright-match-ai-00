
-- Force the correct initial status for follow rows regardless of client input
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
  ELSE
    NEW.status := 'accepted';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_follow_status ON public.follows;
CREATE TRIGGER trg_enforce_follow_status
BEFORE INSERT ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.enforce_follow_status();

-- Change column default to pending so any future row created without the trigger
-- (e.g. service_role bulk insert) still defaults to safest state.
ALTER TABLE public.follows ALTER COLUMN status SET DEFAULT 'pending';
