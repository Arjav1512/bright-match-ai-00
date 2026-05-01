-- Grant SELECT on additional public columns so the public profile pages can load.
GRANT SELECT (linkedin_profile) ON public.employer_profiles TO authenticated, anon;
GRANT SELECT (linkedin_url, website_url) ON public.student_profiles TO authenticated, anon;