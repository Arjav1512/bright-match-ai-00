
-- ============================================================
-- 1. INTERNSHIPS: closed_at + auto-cleanup support
-- ============================================================
ALTER TABLE public.internships
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- Backfill existing closed rows so they aren't immediately deleted
UPDATE public.internships SET closed_at = updated_at WHERE status = 'closed' AND closed_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_internship_closed_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'closed' AND (OLD.status IS DISTINCT FROM 'closed') THEN
    NEW.closed_at := now();
  ELSIF NEW.status <> 'closed' THEN
    NEW.closed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_internships_set_closed_at ON public.internships;
CREATE TRIGGER trg_internships_set_closed_at
BEFORE UPDATE OF status ON public.internships
FOR EACH ROW EXECUTE FUNCTION public.set_internship_closed_at();

-- ============================================================
-- 2. PEERUP CIRCLES → auto-create community group on creation
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_circle_group()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _group_id uuid;
BEGIN
  INSERT INTO public.groups (type, label, centroid_lat, centroid_lng)
  VALUES (
    'circle',
    COALESCE(NEW.topic, 'PeerUp Circle') || ' @ ' || COALESCE(NEW.spot_name, 'Spot'),
    NULL, NULL
  )
  RETURNING id INTO _group_id;

  INSERT INTO public.group_members (group_id, user_id)
  VALUES (_group_id, NEW.creator_id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_peerup_create_group ON public.peerup_circles;
CREATE TRIGGER trg_peerup_create_group
AFTER INSERT ON public.peerup_circles
FOR EACH ROW EXECUTE FUNCTION public.create_circle_group();

-- Also auto-add approved participants to the group
CREATE OR REPLACE FUNCTION public.add_circle_participant_to_group()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _group_id uuid;
  _topic text;
  _spot text;
BEGIN
  SELECT topic, spot_name INTO _topic, _spot
  FROM public.peerup_circles WHERE id = NEW.circle_id;

  -- Find the group created for this circle (best-effort match on label)
  SELECT id INTO _group_id FROM public.groups
  WHERE type = 'circle' AND label = COALESCE(_topic, 'PeerUp Circle') || ' @ ' || COALESCE(_spot, 'Spot')
  ORDER BY created_at DESC
  LIMIT 1;

  IF _group_id IS NOT NULL THEN
    INSERT INTO public.group_members (group_id, user_id)
    VALUES (_group_id, NEW.user_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_peerup_participant_to_group ON public.peerup_participants;
CREATE TRIGGER trg_peerup_participant_to_group
AFTER INSERT ON public.peerup_participants
FOR EACH ROW EXECUTE FUNCTION public.add_circle_participant_to_group();

-- ============================================================
-- 3. Helper: hard-delete internships closed > 30 days ago.
--    Called by edge function (service role).
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_closed_internships()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _deleted integer;
BEGIN
  WITH del AS (
    DELETE FROM public.internships
    WHERE status = 'closed'
      AND closed_at IS NOT NULL
      AND closed_at < (now() - interval '30 days')
    RETURNING id
  )
  SELECT COUNT(*) INTO _deleted FROM del;
  RETURN _deleted;
END;
$$;
