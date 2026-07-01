CREATE OR REPLACE FUNCTION public.admin_get_employer_detail(p_employer_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _row public.employer_profiles;
  _email text;
  _total int := 0;
  _active int := 0;
  _closed int := 0;
  _applicants int := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO _row FROM public.employer_profiles WHERE id = p_employer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employer not found';
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = _row.user_id;

  -- Wrapped in a sub-block so any error (e.g. enum mismatch) never breaks
  -- the entire drawer. Stats default to 0 and profile still renders.
  BEGIN
    SELECT COUNT(*) INTO _total FROM public.internships WHERE employer_id = _row.user_id;
    SELECT COUNT(*) INTO _active FROM public.internships
      WHERE employer_id = _row.user_id AND status = 'published'::public.internship_status;
    SELECT COUNT(*) INTO _closed FROM public.internships
      WHERE employer_id = _row.user_id AND status = 'closed'::public.internship_status;
    SELECT COUNT(*) INTO _applicants
      FROM public.applications a
      JOIN public.internships i ON i.id = a.internship_id
      WHERE i.employer_id = _row.user_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[admin_get_employer_detail] stats failed for %: %', p_employer_id, SQLERRM;
  END;

  RETURN jsonb_build_object(
    'profile', to_jsonb(_row),
    'email', _email,
    'stats', jsonb_build_object(
      'total_internships', _total,
      'active_internships', _active,
      'closed_internships', _closed,
      'total_applicants', _applicants
    )
  );
END;
$function$;