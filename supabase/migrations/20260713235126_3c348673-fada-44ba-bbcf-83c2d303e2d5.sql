
-- Add proper FK from groups to peerup_circles instead of relying on label string matching
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS circle_id uuid REFERENCES public.peerup_circles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_groups_circle_id ON public.groups(circle_id);

-- Backfill circle_id for existing 'circle' groups by matching the legacy label format
UPDATE public.groups g
SET circle_id = c.id
FROM public.peerup_circles c
WHERE g.type = 'circle'
  AND g.circle_id IS NULL
  AND g.label = COALESCE(c.topic, 'PeerUp Circle') || ' @ ' || COALESCE(c.spot_name, 'Spot');

-- Harden is_group_owner: use FK, not label string matching
CREATE OR REPLACE FUNCTION public.is_group_owner(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = _group_id
      AND (
        (g.type = 'cohort' AND g.company_id = _user_id::text)
        OR (g.type = 'circle' AND EXISTS (
          SELECT 1 FROM public.peerup_circles c
          WHERE c.id = g.circle_id
            AND c.creator_id = _user_id
        ))
      )
  )
$$;
