DROP POLICY IF EXISTS "Admins can read all blog images" ON storage.objects;
CREATE POLICY "Admins can read all blog images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));