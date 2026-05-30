# Fix schema drift: missing `recommendation_cache` table

## Root cause confirmed

- `public.recommendation_cache` exists in production but no migration creates it.
- The only reference is `supabase/migrations/20260316133257_…sql` line 30, which runs `CREATE INDEX … ON public.recommendation_cache(...)`.
- On `supabase db reset --no-seed` (used by `.github/workflows/e2e-circle.yml`), that index statement aborts the reset with `relation "public.recommendation_cache" does not exist`, blocking every later migration and the E2E test.

## Production schema captured

Columns (from `information_schema`):
- `id uuid PK default gen_random_uuid()`
- `student_id uuid NOT NULL`
- `internship_id uuid NOT NULL`
- `match_score numeric NOT NULL default 0`
- `skill_match_score numeric default 0`
- `interest_alignment_score numeric default 0`
- `location_match_score numeric default 0`
- `explanation text`
- `created_at timestamptz NOT NULL default now()`
- `expires_at timestamptz NOT NULL default now() + interval '24h'`

Constraints/indexes:
- PK on `id`
- UNIQUE `(student_id, internship_id)`
- INDEX `idx_recommendation_cache_student (student_id, expires_at)` ← created by the existing 03-16 migration

RLS policy in prod:
- `Students can view own recommendations` — `SELECT` to `authenticated` using `auth.uid() = student_id`

No FKs in prod (matches the rest of the schema where `internships`/`auth.users` are referenced loosely).

## Fix

### 1. New migration: `supabase/migrations/20260316133256_create_recommendation_cache.sql`

Timestamp is one second **before** `20260316133257_…` so the table exists before the index is created. This is the only safe way to make a fresh `db reset` linear; renaming the existing 03-16 file would break prod's `schema_migrations` history.

Contents (mirrors production exactly, plus required GRANTs):

```sql
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
```

Writes are done only by the `ai-recommendations` edge function with the service role, so no `INSERT/UPDATE/DELETE` policies are needed (matches prod).

### 2. No changes to existing migrations

`20260316133257_…sql` keeps its `CREATE INDEX IF NOT EXISTS …` — it now runs against an existing table on fresh DBs and is a no-op in prod.

### 3. Verification on a fresh DB

Run locally what CI runs:

```bash
supabase db reset --no-seed
supabase db lint
```

Confirm:
- Reset completes without `relation "public.recommendation_cache" does not exist`.
- `\d public.recommendation_cache` matches the prod columns/indexes/policy listed above.
- The E2E workflow `.github/workflows/e2e-circle.yml` then proceeds past seeding.

## Additional drift scan (reported, not fixed unless you approve)

I diffed every public-schema relation in prod against the migrations directory:

| Relation | In migrations? | Notes |
|---|---|---|
| `recommendation_cache` | ❌ table missing | Fixed by this plan |
| `employer_profiles_public` | ✅ (view, created in `20260423185626_…` and refined later) | OK |
| `student_profiles_public` | ✅ (view, same chain) | OK |
| All other 27 tables | ✅ | OK |

So `recommendation_cache` is the only table-level drift. The two `_public` relations are views, fully covered by migrations.

Separately, `20260316133257_…sql` declares `recommendation_feedback.internship_id … REFERENCES public.internships(id) ON DELETE CASCADE`, but prod has no FK on that column (the whole project deliberately avoids FKs to `internships`/`auth.users`). On a fresh DB the FK will be created and behave more strictly than prod. **Not in scope for this fix** — flagging so you can decide whether to drop the FK in a follow-up migration to keep CI and prod identical.

## Files

- **New**: `supabase/migrations/20260316133256_create_recommendation_cache.sql` — creates the missing table with prod-matching columns, unique constraint, GRANTs, RLS, and the student-view policy. Required so the immediately-following `CREATE INDEX` migration (and every later migration / the CI reset) succeeds on a fresh database.
