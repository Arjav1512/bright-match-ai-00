
CREATE OR REPLACE FUNCTION public.notify_on_peerup_request_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _topic text;
  _spot text;
  _title text;
  _msg text;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('approved', 'declined') THEN
    RETURN NEW;
  END IF;

  SELECT topic, spot_name INTO _topic, _spot
  FROM public.peerup_circles
  WHERE id = NEW.circle_id;

  IF NEW.status = 'approved' THEN
    _title := 'Join request accepted 🎉';
    _msg := 'You were added to ' || COALESCE(_topic, 'a PeerUp circle')
         || COALESCE(' @ ' || _spot, '') || '.';
  ELSE
    _title := 'Join request declined';
    _msg := 'Your request to join ' || COALESCE(_topic, 'a PeerUp circle')
         || COALESCE(' @ ' || _spot, '') || ' was declined.';
  END IF;

  PERFORM public.create_notification(
    NEW.requester_id,
    'general'::notification_type,
    _title,
    _msg,
    '/campus'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_peerup_request_decision ON public.peerup_requests;
CREATE TRIGGER trg_notify_on_peerup_request_decision
AFTER UPDATE ON public.peerup_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_peerup_request_decision();
