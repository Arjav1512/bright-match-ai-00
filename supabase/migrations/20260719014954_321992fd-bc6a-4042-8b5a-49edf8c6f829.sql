
DROP FUNCTION IF EXISTS public.get_applicant_profiles_for_employer(uuid);

CREATE FUNCTION public.get_applicant_profiles_for_employer(p_internship_id uuid)
RETURNS TABLE(
  user_id uuid, skills text[], university text, major text, graduation_year integer,
  resume_url text, reputation_score numeric, completed_internships integer,
  skill_test_score numeric, company_feedback_score numeric, profile_strength_score numeric,
  linkedin_url text, website_url text, location text, preferred_course text,
  experience_years text, current_job_title text, current_company text,
  full_name text, avatar_url text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    sp.user_id, sp.skills, sp.university, sp.major, sp.graduation_year,
    sp.resume_url, sp.reputation_score, sp.completed_internships,
    sp.skill_test_score, sp.company_feedback_score, sp.profile_strength_score,
    sp.linkedin_url, sp.website_url, sp.location, sp.preferred_course,
    sp.experience_years, sp.current_job_title, sp.current_company,
    NULLIF(BTRIM(p.full_name), '') AS full_name,
    p.avatar_url
  FROM public.student_profiles sp
  LEFT JOIN public.profiles p ON p.user_id = sp.user_id
  WHERE EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.internships i ON i.id = a.internship_id
    WHERE a.student_id = sp.user_id
      AND i.id = p_internship_id
      AND i.employer_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "Users can view own messages" ON public.direct_messages;
DROP POLICY IF EXISTS "Students can send messages to connections" ON public.direct_messages;
DROP POLICY IF EXISTS "Receiver can mark as read" ON public.direct_messages;

CREATE OR REPLACE FUNCTION public.has_application_relationship(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.internships i ON i.id = a.internship_id
    WHERE (a.student_id = _a AND i.employer_id = _b)
       OR (a.student_id = _b AND i.employer_id = _a)
  );
$$;

CREATE POLICY "Participants can view messages"
  ON public.direct_messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Send messages to connections or applicants"
  ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      public.are_connected(auth.uid(), receiver_id)
      OR public.has_application_relationship(auth.uid(), receiver_id)
    )
  );

CREATE POLICY "Receiver can mark as read"
  ON public.direct_messages FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);
