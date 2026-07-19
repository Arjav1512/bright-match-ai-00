import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFollowList } from "@/hooks/useFollows";
import { useAuth } from "@/contexts/AuthContext";
import FollowButton from "@/components/FollowButton";
import { formatShortDate } from "@/lib/formatDate";

interface FollowListDialogProps {
  userId: string;
  followerCount: number;
  followingCount: number;
  /** Role of the profile being viewed; drives label semantics (Followers vs Connections). */
  targetRole?: "student" | "employer";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const FollowListDialog = ({ userId, followerCount, followingCount, targetRole }: FollowListDialogProps) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"followers" | "following">("followers");
  const navigate = useNavigate();
  const { role: viewerRole } = useAuth();

  const { data: followers = [], isLoading: loadingFollowers } = useFollowList(userId, "followers");
  const { data: following = [], isLoading: loadingFollowing } = useFollowList(userId, "following");

  // Labels follow the TARGET's role. Companies show "Followers / Following",
  // students show "Connections / Connected To". Fallback to viewer role
  // when targetRole isn't provided (used by the user's own profile screen).
  const effectiveRole = targetRole ?? viewerRole;
  const isStudent = effectiveRole === "student";
  const followersLabel = isStudent ? "Connections" : "Followers";
  const followingLabel = isStudent ? "Connected To" : "Following";
  const sinceLabel = isStudent ? "Connected since" : "Following since";
  const noFollowersText = isStudent ? "No connections yet" : "No followers yet";
  const noFollowingText = isStudent ? "Not connected to anyone yet" : "Not following anyone yet";


  return (
    <>
      <div className="flex gap-4 text-sm">
        <button
          type="button"
          onClick={() => { setTab("followers"); setOpen(true); }}
          className="hover:underline"
        >
          <span className="font-semibold">{followerCount}</span>{" "}
          <span className="text-muted-foreground">{followersLabel}</span>
        </button>
        <button
          type="button"
          onClick={() => { setTab("following"); setOpen(true); }}
          className="hover:underline"
        >
          <span className="font-semibold">{followingCount}</span>{" "}
          <span className="text-muted-foreground">{followingLabel}</span>
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connections</DialogTitle>
          </DialogHeader>
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="w-full">
              <TabsTrigger value="followers" className="flex-1">{followersLabel} ({followerCount})</TabsTrigger>
              <TabsTrigger value="following" className="flex-1">{followingLabel} ({followingCount})</TabsTrigger>
            </TabsList>
            <TabsContent value="followers" className="mt-4 max-h-72 overflow-y-auto space-y-3">
              {loadingFollowers ? (
                <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
              ) : followers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">{noFollowersText}</p>
              ) : (
                followers.map((p: any) => (
                  <div key={p.user_id} className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={p.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{getInitials(p.full_name || "?")}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <button
                          type="button"
                          className="text-sm font-medium hover:text-primary hover:underline transition-colors text-left"
                          onClick={() => { setOpen(false); navigate(p.role === "employer" ? `/employer/${p.user_id}` : `/students?highlight=${p.user_id}`); }}
                        >
                          {p.full_name || "Unknown User"}
                        </button>
                        {p.connected_at && (
                          <span className="text-[10px] text-muted-foreground">
                            {sinceLabel} {formatShortDate(p.connected_at)}
                          </span>
                        )}
                        {/* P0-2: Explicit View Profile action for company rows. */}
                        {p.role === "employer" && (
                          <button
                            type="button"
                            className="text-[11px] font-medium text-primary hover:underline text-left mt-0.5"
                            onClick={() => { setOpen(false); navigate(`/employer/${p.user_id}`); }}
                          >
                            View profile →
                          </button>
                        )}
                      </div>
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
                <p className="text-sm text-muted-foreground text-center py-4">{noFollowingText}</p>
              ) : (
                following.map((p: any) => (
                  <div key={p.user_id} className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={p.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{getInitials(p.full_name || "?")}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <button
                          type="button"
                          className="text-sm font-medium hover:text-primary hover:underline transition-colors text-left"
                          onClick={() => { setOpen(false); navigate(p.role === "employer" ? `/employer/${p.user_id}` : `/students?highlight=${p.user_id}`); }}
                        >
                          {p.full_name || "Unknown User"}
                        </button>
                        {p.connected_at && (
                          <span className="text-[10px] text-muted-foreground">
                            {sinceLabel} {formatShortDate(p.connected_at)}
                          </span>
                        )}
                        {/* P0-2: Explicit View Profile action for company rows. */}
                        {p.role === "employer" && (
                          <button
                            type="button"
                            className="text-[11px] font-medium text-primary hover:underline text-left mt-0.5"
                            onClick={() => { setOpen(false); navigate(`/employer/${p.user_id}`); }}
                          >
                            View profile →
                          </button>
                        )}
                      </div>
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
