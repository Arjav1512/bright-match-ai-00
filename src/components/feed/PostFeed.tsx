import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Post {
  id: string;
  author_id: string;
  author_type: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
}

const PAGE_SIZE = 12;

interface PostFeedProps {
  refreshKey: number;
}

const PostFeed = ({ refreshKey }: PostFeedProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchPosts = useCallback(async (pageNum: number, append = false) => {
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data: rawPosts } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (!rawPosts) {
      setLoading(false);
      return;
    }

    setHasMore(rawPosts.length === PAGE_SIZE);

    // Resolve author names
    const authorIds = [...new Set(rawPosts.map((p) => p.author_id))];

    const [{ data: profiles }, { data: employers }] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", authorIds),
      supabase.from("employer_profiles").select("user_id, company_name, logo_url").in("user_id", authorIds),
    ]);

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
    const employerMap = new Map((employers || []).map((e) => [e.user_id, e]));

    const enriched: Post[] = rawPosts.map((p) => {
      const gp = profileMap.get(p.author_id);
      const ep = employerMap.get(p.author_id);

      let authorName = "User";
      let authorAvatar: string | null = null;

      if (p.author_type === "company" && ep?.company_name) {
        authorName = ep.company_name;
        authorAvatar = ep.logo_url;
      } else if (gp?.full_name) {
        authorName = gp.full_name;
        authorAvatar = gp.avatar_url;
      }

      return { ...p, author_name: authorName, author_avatar: authorAvatar };
    });

    setPosts(append ? (prev) => [...prev, ...enriched] : enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    setPage(0);
    fetchPosts(0);
  }, [fetchPosts, refreshKey]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchPosts(next, true);
  };

  const deletePost = async (postId: string) => {
    setDeleting(postId);
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) {
      toast({ title: "Error", description: "Failed to delete post", variant: "destructive" });
    } else {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast({ title: "Post deleted" });
    }
    setDeleting(null);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-48 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No posts yet. Be the first to share something!
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <Card key={post.id} className="overflow-hidden">
          <CardContent className="p-0">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={post.author_avatar || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {post.author_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{post.author_name}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                      {post.author_type === "company" ? "Company" : "Student"}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>

              {user?.id === post.author_id && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete post?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. The post will be permanently removed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deletePost(post.id)}
                        disabled={deleting === post.id}
                      >
                        {deleting === post.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            {/* Image */}
            <img
              src={post.image_url}
              alt={post.caption || "Post image"}
              className="w-full max-h-[500px] object-cover"
              loading="lazy"
            />

            {/* Caption */}
            {post.caption && (
              <p className="px-4 py-3 text-sm">
                <span className="font-semibold mr-1.5">{post.author_name}</span>
                {post.caption}
              </p>
            )}
          </CardContent>
        </Card>
      ))}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={loadMore}>
            Load More
          </Button>
        </div>
      )}
    </div>
  );
};

export default PostFeed;
