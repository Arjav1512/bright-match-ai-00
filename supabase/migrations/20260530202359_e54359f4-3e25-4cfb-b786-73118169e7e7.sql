
-- Rate limit: sliding window counter using timestamps array
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_user_id uuid,
  p_function_name text,
  p_max_requests integer,
  p_window_ms integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _now timestamptz := now();
  _cutoff timestamptz := _now - make_interval(secs => p_window_ms / 1000.0);
  _recent timestamptz[];
BEGIN
  INSERT INTO public.rate_limits (user_id, function_name, timestamps, updated_at)
  VALUES (p_user_id, p_function_name, ARRAY[_now], _now)
  ON CONFLICT (user_id, function_name) DO UPDATE
    SET timestamps = (
      SELECT array_agg(t) FROM unnest(public.rate_limits.timestamps) t WHERE t > _cutoff
    ),
        updated_at = _now
  RETURNING timestamps INTO _recent;

  IF _recent IS NULL THEN _recent := ARRAY[]::timestamptz[]; END IF;

  IF array_length(_recent, 1) >= p_max_requests THEN
    RETURN false;
  END IF;

  UPDATE public.rate_limits
     SET timestamps = array_append(_recent, _now),
         updated_at = _now
   WHERE user_id = p_user_id AND function_name = p_function_name;

  RETURN true;
END;
$$;

-- Ensure unique index for ON CONFLICT
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='rate_limits_user_fn_uniq'
  ) THEN
    CREATE UNIQUE INDEX rate_limits_user_fn_uniq ON public.rate_limits(user_id, function_name);
  END IF;
END $$;

-- Atomic apply function
CREATE OR REPLACE FUNCTION public.apply_to_internship_atomic(
  p_student_id uuid,
  p_internship_id uuid,
  p_cover_letter text
) RETURNS TABLE(
  success boolean,
  error_code text,
  error_message text,
  application_count integer,
  app_cap integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _internship record;
  _exists boolean;
  _new_count integer;
BEGIN
  SELECT id, status, app_cap, slots, application_count
    INTO _internship
  FROM public.internships
  WHERE id = p_internship_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'NOT_FOUND', 'Internship not found', 0, 0; RETURN;
  END IF;

  IF _internship.status = 'closed' THEN
    RETURN QUERY SELECT false, 'CLOSED', 'This internship is closed', _internship.application_count, _internship.app_cap; RETURN;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.applications
    WHERE student_id = p_student_id AND internship_id = p_internship_id
  ) INTO _exists;

  IF _exists THEN
    RETURN QUERY SELECT false, 'DUPLICATE', 'You have already applied to this internship', _internship.application_count, _internship.app_cap; RETURN;
  END IF;

  IF _internship.app_cap IS NOT NULL AND _internship.application_count >= _internship.app_cap THEN
    RETURN QUERY SELECT false, 'CAPACITY_REACHED', 'This internship has reached its application cap', _internship.application_count, _internship.app_cap; RETURN;
  END IF;

  INSERT INTO public.applications (student_id, internship_id, cover_letter, status)
  VALUES (p_student_id, p_internship_id, p_cover_letter, 'pending');

  UPDATE public.internships
     SET application_count = COALESCE(application_count, 0) + 1
   WHERE id = p_internship_id
  RETURNING application_count INTO _new_count;

  -- Auto-close if 2X rule reached
  IF _internship.app_cap IS NOT NULL AND _new_count >= _internship.app_cap THEN
    UPDATE public.internships SET status = 'closed' WHERE id = p_internship_id;
  END IF;

  RETURN QUERY SELECT true, NULL::text, NULL::text, _new_count, _internship.app_cap;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(uuid, text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_to_internship_atomic(uuid, uuid, text) TO service_role;
