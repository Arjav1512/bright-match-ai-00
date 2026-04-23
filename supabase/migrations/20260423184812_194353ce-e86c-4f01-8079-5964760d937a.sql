-- Allow guests (anon) to view published internships and employer profiles
DROP POLICY IF EXISTS "Anyone can view published internships" ON public.internships;
CREATE POLICY "Anyone can view published internships"
ON public.internships
FOR SELECT
TO anon, authenticated
USING (status = 'published');

DROP POLICY IF EXISTS "Anyone can view employer profiles" ON public.employer_profiles;
CREATE POLICY "Anyone can view employer profiles"
ON public.employer_profiles
FOR SELECT
TO anon, authenticated
USING (true);