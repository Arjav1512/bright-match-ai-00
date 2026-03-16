
-- Campus statuses table
CREATE TABLE public.campus_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  content text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  CONSTRAINT content_max_length CHECK (char_length(content) <= 200)
);

CREATE INDEX idx_campus_statuses_expires ON public.campus_statuses (expires_at);
CREATE INDEX idx_campus_statuses_student ON public.campus_statuses (student_id);
CREATE INDEX idx_campus_statuses_location ON public.campus_statuses (latitude, longitude);

ALTER TABLE public.campus_statuses ENABLE ROW LEVEL SECURITY;

-- Only students can view active statuses
CREATE POLICY "Students can view active statuses"
  ON public.campus_statuses FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'student') AND expires_at > now());

-- Students can insert own statuses
CREATE POLICY "Students can insert own statuses"
  ON public.campus_statuses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id AND has_role(auth.uid(), 'student'));

-- Students can delete own statuses
CREATE POLICY "Students can delete own statuses"
  ON public.campus_statuses FOR DELETE TO authenticated
  USING (auth.uid() = student_id);

-- Status replies table
CREATE TABLE public.status_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status_id uuid NOT NULL REFERENCES public.campus_statuses(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reply_max_length CHECK (char_length(message) <= 500)
);

CREATE INDEX idx_status_replies_status ON public.status_replies (status_id);

ALTER TABLE public.status_replies ENABLE ROW LEVEL SECURITY;

-- Students can view replies on statuses they can see
CREATE POLICY "Students can view replies"
  ON public.status_replies FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'student'));

-- Students can insert replies
CREATE POLICY "Students can insert replies"
  ON public.status_replies FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND has_role(auth.uid(), 'student'));

-- Students can delete own replies
CREATE POLICY "Students can delete own replies"
  ON public.status_replies FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);

-- Enable realtime for campus_statuses
ALTER PUBLICATION supabase_realtime ADD TABLE public.campus_statuses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.status_replies;
