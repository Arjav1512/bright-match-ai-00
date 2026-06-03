CREATE OR REPLACE FUNCTION public.apply_to_internship_atomic(p_student_id uuid, p_internship_id uuid, p_cover_letter text)
 RETURNS TABLE(success boolean, error_code text, error_message text, application_count integer, app_cap integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _internship record;
  _exists boolean;
  _new_count integer;
BEGIN
  SELECT i.id, i.status, i.app_cap AS cap, i.slots, i.application_count AS cnt
    INTO _internship
  FROM public.internships i
  WHERE i.id = p_internship_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'NOT_FOUND', 'Internship not found', 0, 0; RETURN;
  END IF;

  IF _internship.status = 'closed' THEN
    RETURN QUERY SELECT false, 'CLOSED', 'This internship is closed', _internship.cnt, _internship.cap; RETURN;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.applications a
    WHERE a.student_id = p_student_id AND a.internship_id = p_internship_id
  ) INTO _exists;

  IF _exists THEN
    RETURN QUERY SELECT false, 'DUPLICATE', 'You have already applied to this internship', _internship.cnt, _internship.cap; RETURN;
  END IF;

  IF _internship.cap IS NOT NULL AND _internship.cnt >= _internship.cap THEN
    RETURN QUERY SELECT false, 'CAPACITY_REACHED', 'This internship has reached its application cap', _internship.cnt, _internship.cap; RETURN;
  END IF;

  INSERT INTO public.applications (student_id, internship_id, cover_letter, status)
  VALUES (p_student_id, p_internship_id, p_cover_letter, 'pending');

  UPDATE public.internships
     SET application_count = COALESCE(application_count, 0) + 1
   WHERE id = p_internship_id
  RETURNING internships.application_count INTO _new_count;

  IF _internship.cap IS NOT NULL AND _new_count >= _internship.cap THEN
    UPDATE public.internships SET status = 'closed' WHERE id = p_internship_id;
  END IF;

  RETURN QUERY SELECT true, NULL::text, NULL::text, _new_count, _internship.cap;
END;
$function$;