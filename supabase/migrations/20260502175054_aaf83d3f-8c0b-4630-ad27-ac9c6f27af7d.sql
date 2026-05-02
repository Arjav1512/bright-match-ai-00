-- =========================================================================
-- Notifications system overhaul
-- =========================================================================
-- Goal:
--   * Keep client INSERTs locked down (only admins can insert directly)
--   * Use SECURITY DEFINER triggers to insert notifications for real events:
--       applications, application status changes, follows, direct messages,
--       group messages, employer verification.
--   * Keep existing read/update policies intact.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Helper: insert a notification, bypassing RLS via SECURITY DEFINER.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id uuid,
  _type notification_type,
  _title text,
  _message text,
  _link text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.notifications (user_id, type, title, message, link, read)
  VALUES (_user_id, _type, _title, _message, _link, false);
END;
$$;

-- -------------------------------------------------------------------------
-- 2. Application created -> notify employer
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_employer_on_new_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _employer_id uuid;
  _internship_title text;
  _student_name text;
BEGIN
  SELECT employer_id, title INTO _employer_id, _internship_title
  FROM public.internships WHERE id = NEW.internship_id;

  SELECT COALESCE(full_name, 'A student') INTO _student_name
  FROM public.profiles WHERE user_id = NEW.student_id;

  PERFORM public.create_notification(
    _employer_id,
    'general'::notification_type,
    'New application received',
    _student_name || ' applied to ' || COALESCE(_internship_title, 'your internship') || '.',
    '/applicants/' || NEW.internship_id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_employer_on_new_application ON public.applications;
CREATE TRIGGER trg_notify_employer_on_new_application
AFTER INSERT ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.notify_employer_on_new_application();

-- -------------------------------------------------------------------------
-- 3. Application status changed -> notify student
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_student_on_application_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _internship_title text;
  _company text;
  _title text;
  _msg text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  SELECT i.title, ep.company_name
  INTO _internship_title, _company
  FROM public.internships i
  LEFT JOIN public.employer_profiles ep ON ep.user_id = i.employer_id
  WHERE i.id = NEW.internship_id;

  IF NEW.status = 'accepted' THEN
    _title := 'Application accepted 🎉';
    _msg := COALESCE(_company, 'The employer') || ' accepted your application for ' || COALESCE(_internship_title, 'an internship') || '.';
  ELSIF NEW.status = 'rejected' THEN
    _title := 'Application update';
    _msg := 'Your application for ' || COALESCE(_internship_title, 'an internship') || ' was not selected this time.';
  ELSE
    _title := 'Application status updated';
    _msg := 'Your application status changed to ' || NEW.status::text || '.';
  END IF;

  PERFORM public.create_notification(
    NEW.student_id,
    'general'::notification_type,
    _title,
    _msg,
    '/my-applications'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_student_on_application_status ON public.applications;
CREATE TRIGGER trg_notify_student_on_application_status
AFTER UPDATE OF status ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.notify_student_on_application_status();

-- -------------------------------------------------------------------------
-- 4. New follower / connection -> notify followed user
-- -------------------------------------------------------------------------
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
BEGIN
  SELECT COALESCE(full_name, 'Someone') INTO _follower_name
  FROM public.profiles WHERE user_id = NEW.follower_id;

  SELECT role INTO _follower_role
  FROM public.user_roles WHERE user_id = NEW.follower_id LIMIT 1;

  IF _follower_role = 'employer' THEN
    _label := 'New follower';
    _link := '/employer/' || NEW.follower_id::text;
  ELSE
    _label := 'New connection';
    _link := '/student/' || NEW.follower_id::text;
  END IF;

  PERFORM public.create_notification(
    NEW.following_id,
    'general'::notification_type,
    _label,
    _follower_name || ' started following you.',
    _link
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_user_on_new_follow ON public.follows;
CREATE TRIGGER trg_notify_user_on_new_follow
AFTER INSERT ON public.follows
FOR EACH ROW
EXECUTE FUNCTION public.notify_user_on_new_follow();

-- -------------------------------------------------------------------------
-- 5. Direct message -> notify recipient
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_user_on_direct_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sender_name text;
  _preview text;
BEGIN
  SELECT COALESCE(full_name, 'Someone') INTO _sender_name
  FROM public.profiles WHERE user_id = NEW.sender_id;

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
$$;

DROP TRIGGER IF EXISTS trg_notify_user_on_direct_message ON public.direct_messages;
CREATE TRIGGER trg_notify_user_on_direct_message
AFTER INSERT ON public.direct_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_user_on_direct_message();

-- -------------------------------------------------------------------------
-- 6. Group message -> notify other group members
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_group_members_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _group_label text;
  _preview text;
  _member record;
BEGIN
  SELECT label INTO _group_label FROM public.groups WHERE id = NEW.group_id;

  _preview := CASE
    WHEN length(NEW.text) > 80 THEN substring(NEW.text from 1 for 80) || '…'
    ELSE NEW.text
  END;

  FOR _member IN
    SELECT user_id FROM public.group_members
    WHERE group_id = NEW.group_id AND user_id <> NEW.sender_id
  LOOP
    PERFORM public.create_notification(
      _member.user_id,
      'general'::notification_type,
      COALESCE(NEW.sender_name, 'Someone') || ' in ' || COALESCE(_group_label, 'your group'),
      _preview,
      '/groups'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_group_members_on_message ON public.group_messages;
CREATE TRIGGER trg_notify_group_members_on_message
AFTER INSERT ON public.group_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_group_members_on_message();

-- -------------------------------------------------------------------------
-- 7. Employer verified -> notify employer
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_employer_on_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_verified = true AND (OLD.is_verified IS DISTINCT FROM true) THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'general'::notification_type,
      'Your company is verified ✅',
      'Your employer profile has been verified by the Wroob team.',
      '/employer/' || NEW.user_id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_employer_on_verification ON public.employer_profiles;
CREATE TRIGGER trg_notify_employer_on_verification
AFTER UPDATE OF is_verified ON public.employer_profiles
FOR EACH ROW
EXECUTE FUNCTION public.notify_employer_on_verification();
