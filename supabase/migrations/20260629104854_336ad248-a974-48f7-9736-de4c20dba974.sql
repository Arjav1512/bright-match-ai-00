
REVOKE SELECT (latitude, longitude) ON public.campus_statuses FROM authenticated, anon, PUBLIC;
REVOKE SELECT ON public.campus_statuses FROM anon, PUBLIC;

REVOKE SELECT (phone_number, lat, lng, geohash) ON public.student_profiles FROM authenticated, anon, PUBLIC;

DROP POLICY IF EXISTS "Students can view replies" ON public.status_replies;
CREATE POLICY "Students can view own replies or replies to own status"
  ON public.status_replies
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = sender_id
    OR EXISTS (
      SELECT 1 FROM public.campus_statuses cs
      WHERE cs.id = status_replies.status_id
        AND cs.student_id = auth.uid()
    )
  );

REVOKE ALL ON public.status_replies FROM anon, PUBLIC;
GRANT SELECT, INSERT, DELETE ON public.status_replies TO authenticated;
