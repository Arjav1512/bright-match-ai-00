
-- Add slots, app_cap, and application_count columns to internships
ALTER TABLE public.internships
  ADD COLUMN IF NOT EXISTS slots integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS app_cap integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS application_count integer NOT NULL DEFAULT 0;

-- Backfill application_count from existing applications
UPDATE public.internships SET application_count = (
  SELECT COUNT(*) FROM public.applications WHERE applications.internship_id = internships.id
);

-- Backfill app_cap = slots * 2 (default slots=5 so app_cap=10)
UPDATE public.internships SET app_cap = slots * 2;

-- Auto-close internships that have hit their cap
UPDATE public.internships SET status = 'closed' WHERE application_count >= app_cap AND status = 'published';
