CREATE OR REPLACE FUNCTION public.protect_employer_verification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified
     AND auth.role() <> 'service_role'
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.is_verified := OLD.is_verified;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.protect_employer_verification() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_protect_employer_verification ON public.employer_profiles;
CREATE TRIGGER trg_protect_employer_verification BEFORE UPDATE ON public.employer_profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_employer_verification();