-- Create recommendation_cache BEFORE the index migration at 20260316133257_*.
-- Backdated by one second so `supabase db reset --no-seed` applies migrations
-- linearly on a fresh database. Production already has this table
-- (originally created out-of-band); IF NOT EXISTS makes it a safe no-op there.
-- The index idx_recommendation_cache_student is created by the next migration
-- (20260316133257_*), not here.

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
