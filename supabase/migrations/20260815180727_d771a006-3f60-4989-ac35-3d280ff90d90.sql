CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  content text NOT NULL DEFAULT '',
  cover_image text,
  category text,
  author text NOT NULL DEFAULT 'Wroob Team',
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published blogs are publicly readable"
  ON public.blog_posts FOR SELECT
  USING (published = true OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert blogs"
  ON public.blog_posts FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update blogs"
  ON public.blog_posts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete blogs"
  ON public.blog_posts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_blog_posts_published ON public.blog_posts (published, published_at DESC);

CREATE POLICY "Blog images are readable by anyone"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'blog-images');

CREATE POLICY "Admins can upload blog images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update blog images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete blog images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.blog_posts (title, slug, excerpt, content, category, author, published, published_at) VALUES
('5 Tips to Land Your First Tech Internship','5-tips-to-land-your-first-tech-internship','Breaking into tech can feel overwhelming. Here''s how to stand out from the crowd and get noticed by top companies.','Breaking into the tech industry as an intern can feel daunting, but with the right approach, you can stand out. First, focus on building real projects — even small ones — that demonstrate your skills. Second, tailor your resume to highlight relevant coursework and side projects. Third, practice common technical interview questions. Fourth, network through LinkedIn and university career fairs. Fifth, apply early and broadly — don''t limit yourself to just the big names.','Career Tips','Wroob Team',true,'2026-02-28T00:00:00Z'),
('Why Skills-Based Hiring Is the Future','why-skills-based-hiring-is-the-future','Traditional resumes are losing relevance. Learn how skills-based matching is transforming the way companies find talent.','The hiring landscape is shifting. Companies are increasingly moving away from degree-based requirements and toward skills-based assessments. This approach opens doors for talented individuals regardless of their educational background. Platforms like Wroob are at the forefront of this movement, matching students with opportunities based on what they can actually do, not just where they went to school.','Industry','Wroob Team',true,'2026-02-20T00:00:00Z'),
('How to Build a Portfolio That Gets Interviews','how-to-build-a-portfolio-that-gets-interviews','Your portfolio is your most powerful tool. We break down what hiring managers actually look for.','A strong portfolio can be the difference between landing an interview and being overlooked. Start with 3-5 quality projects that showcase different skills. Include clear descriptions of your role, the technologies used, and the impact of your work. Make it visually clean and easy to navigate. Most importantly, include a compelling about section that tells your story.','Career Tips','Wroob Team',true,'2026-02-12T00:00:00Z'),
('Remote Internships: What to Expect in 2026','remote-internships-what-to-expect-in-2026','Remote work is here to stay. Here''s how to thrive in a virtual internship and make a lasting impression.','Remote internships offer incredible flexibility but require discipline. Set up a dedicated workspace, maintain regular communication with your team, and be proactive about asking for feedback. Use tools like Slack, Notion, and video calls to stay connected. Remember, out of sight shouldn''t mean out of mind — make your contributions visible.','Trends','Wroob Team',true,'2026-02-05T00:00:00Z'),
('Wroob Platform Update: Match Scores 2.0','wroob-platform-update-match-scores-2','We''ve upgraded our matching algorithm to better surface opportunities tailored to your unique skill set.','We''re excited to announce Match Scores 2.0! Our improved algorithm now considers a wider range of factors including skill proficiency levels, location preferences, and work culture fit. Students will see more relevant internship recommendations, and employers will receive better-matched applicants. This update is live for all users.','Product','Wroob Team',true,'2026-01-28T00:00:00Z'),
('From Intern to Full-Time: Success Stories','from-intern-to-full-time-success-stories','Real stories from students who turned their Wroob internships into full-time offers.','Meet three students who parlayed their Wroob internships into full-time positions. Priya started as a marketing intern at a startup and is now leading their content strategy. Arjun''s engineering internship turned into a junior developer role within three months. And Sneha''s design internship led to a full-time UX position at a growing fintech company. Their secret? Going above and beyond, building relationships, and treating every task as a learning opportunity.','Stories','Wroob Team',true,'2026-01-15T00:00:00Z')
ON CONFLICT (slug) DO NOTHING;