
-- Tighten follows SELECT: only rows involving the caller are visible.
DROP POLICY IF EXISTS "View accepted or own follow rows" ON public.follows;

CREATE POLICY "Users can view their own follow rows"
ON public.follows
FOR SELECT
TO authenticated
USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- Public aggregate counts (accepted only) via SECURITY DEFINER RPC so
-- profile pages can still show follower/following counts without exposing
-- the underlying social graph.
CREATE OR REPLACE FUNCTION public.get_follow_counts(_user_id uuid)
RETURNS TABLE(follower_count integer, following_count integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*)::int FROM public.follows
       WHERE following_id = _user_id AND status = 'accepted'),
    (SELECT COUNT(*)::int FROM public.follows
       WHERE follower_id  = _user_id AND status = 'accepted');
$$;

GRANT EXECUTE ON FUNCTION public.get_follow_counts(uuid) TO anon, authenticated;

-- List a user's accepted connections. Callable by anyone, returns only the
-- counterparty user_ids and timestamps (no cross-user pair mapping beyond
-- the requested user's own graph).
CREATE OR REPLACE FUNCTION public.list_follow_connections(_user_id uuid, _type text)
RETURNS TABLE(user_id uuid, connected_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE WHEN _type = 'followers' THEN f.follower_id ELSE f.following_id END AS user_id,
    COALESCE(f.accepted_at, f.created_at) AS connected_at
  FROM public.follows f
  WHERE f.status = 'accepted'
    AND (
      (_type = 'followers' AND f.following_id = _user_id)
      OR (_type = 'following' AND f.follower_id = _user_id)
    );
$$;

GRANT EXECUTE ON FUNCTION public.list_follow_connections(uuid, text) TO anon, authenticated;
