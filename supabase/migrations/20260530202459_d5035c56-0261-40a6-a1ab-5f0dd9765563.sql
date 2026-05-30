
ALTER TABLE public.groups DROP CONSTRAINT IF EXISTS groups_type_check;
ALTER TABLE public.groups ADD CONSTRAINT groups_type_check
  CHECK (type = ANY (ARRAY['geo'::text, 'cohort'::text, 'local'::text, 'circle'::text]));
