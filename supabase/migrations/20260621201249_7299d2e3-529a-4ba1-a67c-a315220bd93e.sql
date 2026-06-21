-- P0-1: Notification triggers must show the company name when the actor is an
-- employer (instead of falling back to "Someone" because profiles.full_name is
-- empty for employer accounts). Introduces a helper and rewrites the three
-- triggers whose actor can be an employer.

CREATE OR REPLACE FUNCTION public.display_name_for(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Returns the user-facing name: company_name for employers, full_name for
  -- everyone else. Falls back to 'Someone' only when nothing is set.
  SELECT COALESCE(
    NULLIF((SELECT ep.company_name FROM public.employer_profiles ep
            WHERE ep.user_id = _user_id
              AND public.has_role(_user_id, 'employer'::app_role)), ''),
    NULLIF((SELECT p.full_name FROM public.profiles p WHERE p.user_id = _user_id), ''),
    'Someone'
  );
$$;

-- 1) New follow / connection request
CREATE OR REPLACE FUNCTION public.notify_user_on_new_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _follower_name text;
  _follower_role app_role;
  _label text;
  _link text;
  _msg text;
BEGIN
  _follower_name := public.display_name_for(NEW.follower_id);

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
$function$;

-- 2) Follow accepted (named party is the one who accepted)
CREATE OR REPLACE FUNCTION public.notify_on_follow_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _name text;
  _role app_role;
  _link text;
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    _name := public.display_name_for(NEW.following_id);
    SELECT role INTO _role FROM public.user_roles WHERE user_id = NEW.following_id LIMIT 1;
    _link := CASE WHEN _role = 'employer'
                  THEN '/employer/' || NEW.following_id::text
                  ELSE '/student/' || NEW.following_id::text END;

    PERFORM public.create_notification(
      NEW.follower_id,
      'general'::notification_type,
      'Connection request accepted',
      _name || ' accepted your connection request.',
      _link
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- 3) New direct message
CREATE OR REPLACE FUNCTION public.notify_user_on_direct_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _sender_name text;
  _preview text;
BEGIN
  _sender_name := public.display_name_for(NEW.sender_id);

  _preview := CASE
    WHEN length(NEW.text) > 80 THEN substring(NEW.text from 1 for 80) || '…'
    ELSE NEW.text
  END;

  PERFORM public.create_notification(
    NEW.receiver_id,
    'general'::notification_type,
    'New message from ' || _sender_name,
    _preview,
    '/students'
  );

  RETURN NEW;
END;
$function$;