
-- Update circle group creation trigger to set circle_id FK
CREATE OR REPLACE FUNCTION public.create_circle_group()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _group_id uuid;
BEGIN
  INSERT INTO public.groups (type, label, centroid_lat, centroid_lng, circle_id)
  VALUES (
    'circle',
    COALESCE(NEW.topic, 'PeerUp Circle') || ' @ ' || COALESCE(NEW.spot_name, 'Spot'),
    NULL, NULL,
    NEW.id
  )
  RETURNING id INTO _group_id;

  INSERT INTO public.group_members (group_id, user_id)
  VALUES (_group_id, NEW.creator_id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Update participant-to-group trigger to use FK lookup
CREATE OR REPLACE FUNCTION public.add_circle_participant_to_group()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _group_id uuid;
BEGIN
  SELECT id INTO _group_id FROM public.groups
  WHERE type = 'circle' AND circle_id = NEW.circle_id
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
