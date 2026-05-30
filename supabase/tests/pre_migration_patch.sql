-- Pre-migration patch applied by CI BEFORE running migration history.
--
-- Reason: `public.recommendation_cache` was originally created out-of-band
-- in production, and an early migration (20260316133257_…sql) only creates
-- an INDEX on it. Replaying migrations against a truly empty database fails
-- on that index because the table does not yet exist. We pre-create the
-- table here so the legacy index migration succeeds; the later migration
-- (20260530204807_…sql) is a no-op thanks to `IF NOT EXISTS`.
--
-- This file must be kept in sync with the canonical definition in
-- supabase/migrations/20260530204807_*.sql.

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
