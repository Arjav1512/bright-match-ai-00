-- 1) skills: reference catalog should not be world-readable by anonymous callers.
DROP POLICY IF EXISTS "Anyone can view skills" ON public.skills;
CREATE POLICY "Authenticated users can view skills"
ON public.skills
FOR SELECT
TO authenticated
USING (true);

REVOKE SELECT ON public.skills FROM anon;
GRANT SELECT ON public.skills TO authenticated;

-- 2) blog images: only cover objects of published posts, scoped to the covers/ prefix.
DROP POLICY IF EXISTS "Published blog images are readable by anyone" ON storage.objects;
CREATE POLICY "Published blog covers are readable"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'blog-images'
  AND (storage.foldername(name))[1] = 'covers'
  AND EXISTS (
    SELECT 1 FROM public.blog_posts bp
    WHERE bp.published = true
      AND bp.cover_image = storage.objects.name
  )
);