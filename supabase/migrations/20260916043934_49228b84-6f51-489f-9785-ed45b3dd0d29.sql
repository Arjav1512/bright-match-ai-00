CREATE TABLE public.account_deletion_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_account_deletion_otps_user ON public.account_deletion_otps (user_id, created_at DESC);

GRANT ALL ON public.account_deletion_otps TO service_role;

ALTER TABLE public.account_deletion_otps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No client access to deletion codes"
  ON public.account_deletion_otps
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.delete_user_account_data(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'user id required';
  END IF;

  DELETE FROM public.status_replies WHERE sender_id = _user_id;
  DELETE FROM public.campus_statuses WHERE student_id = _user_id;
  DELETE FROM public.direct_messages WHERE sender_id = _user_id OR receiver_id = _user_id;
  DELETE FROM public.follows WHERE follower_id = _user_id OR following_id = _user_id;
  DELETE FROM public.group_messages WHERE sender_id = _user_id;
  DELETE FROM public.group_members WHERE user_id = _user_id;
  DELETE FROM public.internship_feedback WHERE student_id = _user_id OR company_id = _user_id;
  DELETE FROM public.peerup_requests WHERE requester_id = _user_id;
  DELETE FROM public.peerup_participants WHERE user_id = _user_id;
  DELETE FROM public.peerup_circles WHERE creator_id = _user_id;
  DELETE FROM public.recommendation_cache WHERE student_id = _user_id;
  DELETE FROM public.recommendation_feedback WHERE student_id = _user_id;
  DELETE FROM public.skill_test_results WHERE student_id = _user_id;
  DELETE FROM public.student_culture WHERE user_id = _user_id;
  DELETE FROM public.student_preferences WHERE user_id = _user_id;
  DELETE FROM public.employer_invitations WHERE inviter_id = _user_id;
  DELETE FROM public.rate_limits WHERE user_id = _user_id;
  DELETE FROM public.account_deletion_otps WHERE user_id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account_data(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account_data(uuid) TO service_role;