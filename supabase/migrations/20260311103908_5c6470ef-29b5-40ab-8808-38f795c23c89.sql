
-- Create follows table
CREATE TABLE public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Enable RLS
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Users can see follows involving themselves or public follow counts
CREATE POLICY "Anyone can view follows"
  ON public.follows FOR SELECT
  TO authenticated
  USING (true);

-- Users can follow others
CREATE POLICY "Users can follow others"
  ON public.follows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

-- Users can unfollow
CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);
