
-- 1. Extend peerup_circles
ALTER TABLE public.peerup_circles
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'offline',
  ADD COLUMN IF NOT EXISTS additional_info text;

ALTER TABLE public.peerup_circles
  ALTER COLUMN fuel_type DROP NOT NULL;

ALTER TABLE public.peerup_circles
  DROP CONSTRAINT IF EXISTS peerup_circles_mode_check;
ALTER TABLE public.peerup_circles
  ADD CONSTRAINT peerup_circles_mode_check CHECK (mode IN ('offline','online'));

-- 2. Credentials table (sensitive; separate for strict RLS)
CREATE TABLE IF NOT EXISTS public.peerup_circle_credentials (
  circle_id uuid PRIMARY KEY REFERENCES public.peerup_circles(id) ON DELETE CASCADE,
  meeting_link text,
  meeting_login_id text,
  meeting_password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.peerup_circle_credentials TO authenticated;
GRANT ALL ON public.peerup_circle_credentials TO service_role;

ALTER TABLE public.peerup_circle_credentials ENABLE ROW LEVEL SECURITY;

-- Host can manage credentials
DROP POLICY IF EXISTS "Host manages credentials" ON public.peerup_circle_credentials;
CREATE POLICY "Host manages credentials"
ON public.peerup_circle_credentials
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.peerup_circles c
  WHERE c.id = peerup_circle_credentials.circle_id AND c.creator_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.peerup_circles c
  WHERE c.id = peerup_circle_credentials.circle_id AND c.creator_id = auth.uid()
));

-- Approved participants can read credentials
DROP POLICY IF EXISTS "Approved participants can view credentials" ON public.peerup_circle_credentials;
CREATE POLICY "Approved participants can view credentials"
ON public.peerup_circle_credentials
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.peerup_participants p
  WHERE p.circle_id = peerup_circle_credentials.circle_id AND p.user_id = auth.uid()
));

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_peerup_credentials_updated_at ON public.peerup_circle_credentials;
CREATE TRIGGER trg_peerup_credentials_updated_at
BEFORE UPDATE ON public.peerup_circle_credentials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
