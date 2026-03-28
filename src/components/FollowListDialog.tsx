import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFollowList } from "@/hooks/useFollows";
import FollowButton from "@/components/FollowButton";

interface FollowListDialogProps {
  userId: string;
  followerCount: number;
  followingCount: number;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const FollowListDialog = ({ userId, followerCount, followingCount }: FollowListDialogProps) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"followers" | "following">("followers");
  const navigate = useNavigate();

  const { data: followers = [], isLoading: loadingFollowers } = useFollowList(userId, "followers");
  const { data: following = [], isLoading: loadingFollowing } = useFollowList(userId, "following");

  return (
    <>
      <div className="flex gap-4 text-sm">
        <button
          type="button"
          onClick={() => { setTab("followers"); setOpen(true); }}
          className="hover:underline"
        >
          <span className="font-semibold">{followerCount}</span>{" "}
          <span className="text-muted-foreground">Followers</span>
        </button>
        <button
          type="button"
          onClick={() => { setTab("following"); setOpen(true); }}
          className="hover:underline"
        >
          <span className="font-semibold">{followingCount}</span>{" "}
          <span className="text-muted-foreground">Following</span>
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connections</DialogTitle>
          </DialogHeader>
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="w-full">
              <TabsTrigger value="followers" className="flex-1">Followers ({followerCount})</TabsTrigger>
              <TabsTrigger value="following" className="flex-1">Following ({followingCount})</TabsTrigger>
            </TabsList>
            <TabsContent value="followers" className="mt-4 max-h-72 overflow-y-auto space-y-3">
              {loadingFollowers ? (
                <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
              ) : followers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No followers yet</p>
              ) : (
                followers.map((p: any) => (
                  <div key={p.user_id} className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={p.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{getInitials(p.full_name || "?")}</AvatarFallback>
                      </Avatar>
                      <button
                        type="button"
                        className="text-sm font-medium hover:text-primary hover:underline transition-colors text-left"
                        onClick={() => { setOpen(false); navigate(`/students?highlight=${p.user_id}`); }}
                      >
                        {p.full_name || "Anonymous"}
                      </button>
                    </div>
                    <FollowButton targetUserId={p.user_id} />
                  </div>
                ))
              )}
            </TabsContent>
            <TabsContent value="following" className="mt-4 max-h-72 overflow-y-auto space-y-3">
              {loadingFollowing ? (
                <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
              ) : following.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Not following anyone yet</p>
              ) : (
                following.map((p: any) => (
                  <div key={p.user_id} className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={p.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{getInitials(p.full_name || "?")}</AvatarFallback>
                      </Avatar>
                      <button
                        type="button"
                        className="text-sm font-medium hover:text-primary hover:underline transition-colors text-left"
                        onClick={() => { setOpen(false); navigate(`/students?highlight=${p.user_id}`); }}
                      >
                        {p.full_name || "Anonymous"}
                      </button>
                    </div>
                    <FollowButton targetUserId={p.user_id} />
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FollowListDialog;
