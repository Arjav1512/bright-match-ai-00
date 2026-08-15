DROP POLICY "Published blogs are publicly readable" ON public.blog_posts;

CREATE POLICY "Anyone can read published blogs"
  ON public.blog_posts FOR SELECT
  USING (published = true);

CREATE POLICY "Admins can read all blogs"
  ON public.blog_posts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));