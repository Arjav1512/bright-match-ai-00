
ALTER TABLE public.internships
  ADD COLUMN IF NOT EXISTS removed_at timestamptz,
  ADD COLUMN IF NOT EXISTS removed_by uuid,
  ADD COLUMN IF NOT EXISTS removal_reason text,
  ADD COLUMN IF NOT EXISTS previous_status public.internship_status;

DROP POLICY IF EXISTS "Anyone can view removed internships" ON public.internships;
CREATE POLICY "Anyone can view removed internships"
  ON public.internships FOR SELECT
  TO authenticated
  USING (status = 'removed'::public.internship_status);

CREATE OR REPLACE FUNCTION public.cleanup_old_closed_internships()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _deleted integer;
BEGIN
  WITH del AS (
    DELETE FROM public.internships
    WHERE status = 'closed'
      AND closed_at IS NOT NULL
      AND closed_at < (now() - interval '30 days')
    RETURNING id
  )
  SELECT COUNT(*) INTO _deleted FROM del;
  RETURN _deleted;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_employer_on_internship_removed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _msg text;
BEGIN
  IF NEW.status = 'removed'::public.internship_status
     AND (OLD.status IS DISTINCT FROM 'removed'::public.internship_status) THEN
    _msg := 'Your internship "' || COALESCE(NEW.title, 'Untitled')
            || '" was removed by an administrator.'
            || CASE WHEN NEW.removal_reason IS NOT NULL AND NEW.removal_reason <> ''
                    THEN ' Reason: ' || NEW.removal_reason ELSE '' END;
    PERFORM public.create_notification(
      NEW.employer_id,
      'general'::notification_type,
      'Internship removed by admin',
      _msg,
      '/my-internships'
    );
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_employer_on_internship_removed ON public.internships;
CREATE TRIGGER trg_notify_employer_on_internship_removed
AFTER UPDATE OF status ON public.internships
FOR EACH ROW
EXECUTE FUNCTION public.notify_employer_on_internship_removed();
