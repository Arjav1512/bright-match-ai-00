
-- Create posts table
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  author_type text NOT NULL CHECK (author_type IN ('student', 'company')),
  image_url text NOT NULL,
  caption text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view posts
CREATE POLICY "Anyone can view posts"
ON public.posts FOR SELECT TO authenticated
USING (true);

-- Authors can insert their own posts
CREATE POLICY "Users can create posts"
ON public.posts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = author_id);

-- Authors can delete their own posts
CREATE POLICY "Users can delete own posts"
ON public.posts FOR DELETE TO authenticated
USING (auth.uid() = author_id);

-- Create post-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true);

-- Storage policies for post-images
CREATE POLICY "Authenticated users can upload post images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view post images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'post-images');

CREATE POLICY "Users can delete own post images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Add caption length constraint via trigger
CREATE OR REPLACE FUNCTION public.validate_post_caption()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.caption IS NOT NULL AND length(NEW.caption) > 300 THEN
    RAISE EXCEPTION 'Caption must be 300 characters or less';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_post_caption_trigger
BEFORE INSERT ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.validate_post_caption();
