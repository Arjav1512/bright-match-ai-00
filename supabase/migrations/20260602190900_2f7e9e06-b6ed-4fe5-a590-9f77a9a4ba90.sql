
-- Add connection request status to follows
ALTER TABLE public.follows
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'accepted'
    CHECK (status IN ('pending','accepted'));

-- Allow recipient (following_id) to accept their pending requests
DROP POLICY IF EXISTS "Recipients can accept requests" ON public.follows;
CREATE POLICY "Recipients can accept requests"
  ON public.follows FOR UPDATE
  TO authenticated
  USING (auth.uid() = following_id)
  WITH CHECK (auth.uid() = following_id AND status = 'accepted');

-- Allow recipient to reject (delete) a request directed at them
DROP POLICY IF EXISTS "Recipients can reject requests" ON public.follows;
CREATE POLICY "Recipients can reject requests"
  ON public.follows FOR DELETE
  TO authenticated
  USING (auth.uid() = following_id);

-- Replace the new-follow notification to distinguish pending requests
CREATE OR REPLACE FUNCTION public.notify_user_on_new_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _follower_name text;
  _follower_role app_role;
  _label text;
  _link text;
  _msg text;
BEGIN
  SELECT COALESCE(full_name, 'Someone') INTO _follower_name
  FROM public.profiles WHERE user_id = NEW.follower_id;

  SELECT role INTO _follower_role
  FROM public.user_roles WHERE user_id = NEW.follower_id LIMIT 1;

  IF NEW.status = 'pending' THEN
    _label := 'New connection request';
    _msg := _follower_name || ' wants to connect with you.';
    _link := '/student/' || NEW.follower_id::text;
  ELSIF _follower_role = 'employer' THEN
    _label := 'New follower';
    _msg := _follower_name || ' started following you.';
    _link := '/employer/' || NEW.follower_id::text;
  ELSE
    _label := 'New connection';
    _msg := _follower_name || ' started following you.';
    _link := '/student/' || NEW.follower_id::text;
  END IF;

  PERFORM public.create_notification(
    NEW.following_id, 'general'::notification_type, _label, _msg, _link
  );
  RETURN NEW;
END;
$$;

-- Notify the requester when a pending request is accepted
CREATE OR REPLACE FUNCTION public.notify_on_follow_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _name text;
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    SELECT COALESCE(full_name, 'Someone') INTO _name
    FROM public.profiles WHERE user_id = NEW.following_id;

    PERFORM public.create_notification(
      NEW.follower_id,
      'general'::notification_type,
      'Connection request accepted',
      _name || ' accepted your connection request.',
      '/student/' || NEW.following_id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_follow_accepted ON public.follows;
CREATE TRIGGER trg_notify_on_follow_accepted
  AFTER UPDATE ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_follow_accepted();
