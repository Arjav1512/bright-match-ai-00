CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(p_user_id uuid, p_function_name text, p_max_requests integer, p_window_ms integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _now_ms bigint := (extract(epoch from now()) * 1000)::bigint;
  _cutoff_ms bigint := _now_ms - p_window_ms;
  _recent bigint[];
BEGIN
  INSERT INTO public.rate_limits (user_id, function_name, timestamps, updated_at)
  VALUES (p_user_id, p_function_name, ARRAY[_now_ms]::bigint[], now())
  ON CONFLICT (user_id, function_name) DO UPDATE
    SET timestamps = COALESCE((
      SELECT array_agg(t) FROM unnest(public.rate_limits.timestamps) t WHERE t > _cutoff_ms
    ), ARRAY[]::bigint[]),
        updated_at = now()
  RETURNING timestamps INTO _recent;

  IF _recent IS NULL THEN _recent := ARRAY[]::bigint[]; END IF;

  IF array_length(_recent, 1) >= p_max_requests THEN
    RETURN false;
  END IF;

  UPDATE public.rate_limits
     SET timestamps = array_append(_recent, _now_ms),
         updated_at = now()
   WHERE user_id = p_user_id AND function_name = p_function_name;

  RETURN true;
END;
$function$;