-- Create recommendation_cache so fresh `supabase db reset` succeeds.
-- Production already has this table (created out-of-band before the index
-- migration shipped); IF NOT EXISTS makes this a no-op there.

CREATE TABLE IF NOT EXISTS public.recommendation_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  internship_id uuid NOT NULL,
  match_score numeric NOT NULL DEFAULT 0,
  skill_match_score numeric DEFAULT 0,
  interest_alignment_score numeric DEFAULT 0,
  location_match_score numeric DEFAULT 0,
  explanation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  UNIQUE (student_id, internship_id)
);

GRANT SELECT ON public.recommendation_cache TO authenticated;
GRANT ALL    ON public.recommendation_cache TO service_role;

ALTER TABLE public.recommendation_cache ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Students can view own recommendations"
    ON public.recommendation_cache FOR SELECT
    TO authenticated
    USING (auth.uid() = student_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_recommendation_cache_student
  ON public.recommendation_cache(student_id, expires_at);