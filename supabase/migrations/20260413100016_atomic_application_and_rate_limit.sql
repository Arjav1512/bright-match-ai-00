-- =============================================================================
-- FIX: CRITICAL-4 — Non-atomic application cap (race condition)
-- All cap logic is now a single SERIALIZABLE transaction with row-level locking.
-- Concurrent requests are serialized at the DB level; the cap cannot be exceeded.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.apply_to_internship_atomic(
  p_student_id   UUID,
  p_internship_id UUID,
  p_cover_letter  TEXT DEFAULT NULL
)
RETURNS TABLE (
  success         BOOLEAN,
  error_code      TEXT,
  error_message   TEXT,
  application_count INT,
  app_cap         INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_internship internships%ROWTYPE;
  v_new_count  INT;
BEGIN
  -- Lock the internship row for the duration of this transaction.
  -- All concurrent callers for the same internship serialize here.
  SELECT * INTO v_internship
  FROM internships
  WHERE id = p_internship_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'NOT_FOUND'::TEXT, 'Internship not found'::TEXT, 0, 0;
    RETURN;
  END IF;

  IF v_internship.status = 'closed' THEN
    RETURN QUERY SELECT FALSE, 'CLOSED'::TEXT,
      'This internship is no longer accepting applications'::TEXT,
      v_internship.application_count, v_internship.app_cap;
    RETURN;
  END IF;

  -- 2X Rule: enforce at DB level, not in application code
  IF v_internship.application_count >= v_internship.app_cap THEN
    RETURN QUERY SELECT FALSE, 'CAPACITY_REACHED'::TEXT,
      format('Applications are full (%s/%s).',
             v_internship.application_count, v_internship.app_cap)::TEXT,
      v_internship.application_count, v_internship.app_cap;
    RETURN;
  END IF;

  -- Duplicate application check
  IF EXISTS (
    SELECT 1 FROM applications
    WHERE student_id = p_student_id AND internship_id = p_internship_id
  ) THEN
    RETURN QUERY SELECT FALSE, 'DUPLICATE'::TEXT,
      'You have already applied to this internship.'::TEXT,
      v_internship.application_count, v_internship.app_cap;
    RETURN;
  END IF;

  -- Insert application (unique constraint handles any residual race)
  INSERT INTO applications (student_id, internship_id, cover_letter)
  VALUES (p_student_id, p_internship_id, p_cover_letter);

  -- Atomically increment counter (within the same locked transaction)
  v_new_count := v_internship.application_count + 1;

  UPDATE internships
  SET
    application_count = v_new_count,
    status = CASE WHEN v_new_count >= v_internship.app_cap THEN 'closed'::internship_status ELSE status END
  WHERE id = p_internship_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT, NULL::TEXT, v_new_count, v_internship.app_cap;
END;
$$;

-- =============================================================================
-- FIX: HIGH-4 — TOCTOU race condition in rate limiting
-- Replaces the read-check-write pattern with a single atomic DB function
-- that uses FOR UPDATE row locking, serializing concurrent requests per user.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_user_id       UUID,
  p_function_name TEXT,
  p_max_requests  INT,
  p_window_ms     BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now         BIGINT;
  v_window_start BIGINT;
  v_existing    BIGINT[];
  v_recent      BIGINT[];
  v_updated     BIGINT[];
BEGIN
  v_now          := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
  v_window_start := v_now - p_window_ms;

  -- Lock the row so concurrent calls for the same user+function serialize here
  SELECT timestamps INTO v_existing
  FROM rate_limits
  WHERE user_id = p_user_id AND function_name = p_function_name
  FOR UPDATE;

  -- Filter timestamps to window; treat missing row as empty
  IF v_existing IS NULL THEN
    v_recent := ARRAY[]::BIGINT[];
  ELSE
    SELECT COALESCE(ARRAY_AGG(ts ORDER BY ts), ARRAY[]::BIGINT[])
    INTO v_recent
    FROM UNNEST(v_existing) ts
    WHERE ts > v_window_start;
  END IF;

  -- Enforce limit
  IF array_length(v_recent, 1) >= p_max_requests THEN
    RETURN FALSE;
  END IF;

  -- Append current timestamp and keep at most 200 entries
  v_updated := v_recent || ARRAY[v_now];
  IF array_length(v_updated, 1) > 200 THEN
    v_updated := v_updated[array_length(v_updated, 1) - 199 : array_length(v_updated, 1)];
  END IF;

  INSERT INTO rate_limits (user_id, function_name, timestamps, updated_at)
  VALUES (p_user_id, p_function_name, v_updated, NOW())
  ON CONFLICT (user_id, function_name)
  DO UPDATE SET timestamps = v_updated, updated_at = NOW();

  RETURN TRUE;
END;
$$;
