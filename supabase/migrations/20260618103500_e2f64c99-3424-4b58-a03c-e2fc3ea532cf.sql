
-- Narrow RPC: only allows status change after verifying employer owns the internship
CREATE OR REPLACE FUNCTION public.update_application_status(
  p_application_id uuid,
  p_new_status application_status
)
RETURNS public.applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.applications;
  _owner uuid;
BEGIN
  SELECT i.employer_id INTO _owner
  FROM public.applications a
  JOIN public.internships i ON i.id = a.internship_id
  WHERE a.id = p_application_id;

  IF _owner IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF _owner <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.applications
     SET status = p_new_status
   WHERE id = p_application_id
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_application_status(uuid, application_status) TO authenticated;

-- Remove the over-permissive direct UPDATE policy on applications for employers
DROP POLICY IF EXISTS "Employers can update application status" ON public.applications;
