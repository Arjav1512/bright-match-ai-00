DROP POLICY IF EXISTS "Blog images are readable by anyone" ON storage.objects;

CREATE POLICY "Published blog images are readable by anyone"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'blog-images'
    AND EXISTS (
      SELECT 1 FROM public.blog_posts bp
      WHERE bp.published = true
        AND bp.cover_image = storage.objects.name
    )
  );

CREATE POLICY "Admins can read all blog images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'blog-images'
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );