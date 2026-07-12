
-- Fix 1: Grant SELECT on public identity views so client queries return real names
-- (previously silently returned no rows → UI fell back to "Student")
GRANT SELECT ON public.profiles_public TO authenticated, anon;
GRANT SELECT ON public.student_profiles_public TO authenticated, anon;

-- Fix 2: Notify circle creator when a new join request is created.
CREATE OR REPLACE FUNCTION public.notify_on_peerup_request_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _topic text;
  _spot text;
  _creator uuid;
  _requester_name text;
  _title text;
  _msg text;
BEGIN
  SELECT topic, spot_name, creator_id
    INTO _topic, _spot, _creator
  FROM public.peerup_circles
  WHERE id = NEW.circle_id;

  IF _creator IS NULL OR _creator = NEW.requester_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(full_name, ''), 'A student')
    INTO _requester_name
  FROM public.profiles
  WHERE user_id = NEW.requester_id;

  _title := 'New join request';
  _msg := COALESCE(_requester_name, 'A student')
       || ' requested to join ' || COALESCE(_topic, 'your PeerUp circle')
       || COALESCE(' @ ' || _spot, '') || '.';

  PERFORM public.create_notification(
    _creator,
    'general'::notification_type,
    _title,
    _msg,
    '/campus'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_peerup_request_created ON public.peerup_requests;
CREATE TRIGGER trg_notify_on_peerup_request_created
AFTER INSERT ON public.peerup_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_peerup_request_created();
