import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export type ConnectionState =
  | "none"
  | "pending_outgoing"
  | "pending_incoming"
  | "accepted";

export type FollowTargetRole = "student" | "employer";

export function useFollows(targetUserId: string, opts?: { targetRole?: FollowTargetRole }) {
  const { user, role: viewerRole } = useAuth();
  const queryClient = useQueryClient();

  // Resolve the target's role. Approval is required ONLY for student → student.
  // Caller may pass targetRole explicitly to avoid an extra query.
  const { data: resolvedTargetRole } = useQuery({
    queryKey: ["user-role", targetUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", targetUserId)
        .maybeSingle();
      return ((data as any)?.role ?? null) as FollowTargetRole | null;
    },
    enabled: !!targetUserId && !opts?.targetRole,
    staleTime: 5 * 60_000,
  });
  const targetRole: FollowTargetRole | null = opts?.targetRole ?? resolvedTargetRole ?? null;
  const requireApproval =
    viewerRole === "student" && targetRole === "student";


  // Outgoing row: I follow target
  const { data: outgoing } = useQuery({
    queryKey: ["follow-outgoing", user?.id, targetUserId],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("follows")
        .select("id, status, created_at, accepted_at")
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId)
        .maybeSingle();
      return (data as any) ?? null;
    },
    enabled: !!user && !!targetUserId && user.id !== targetUserId,
  });

  // Incoming row: target follows me (used for accept/reject buttons)
  const { data: incoming } = useQuery({
    queryKey: ["follow-incoming", user?.id, targetUserId],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("follows")
        .select("id, status, created_at, accepted_at")
        .eq("follower_id", targetUserId)
        .eq("following_id", user.id)
        .maybeSingle();
      return (data as any) ?? null;
    },
    enabled: !!user && !!targetUserId && user.id !== targetUserId,
  });

  // Counts: accepted connections only
  const { data: followerCount = 0 } = useQuery({
    queryKey: ["followerCount", targetUserId],
    queryFn: async () => {
      const { count } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", targetUserId)
        .eq("status", "accepted");
      return count ?? 0;
    },
    enabled: !!targetUserId,
  });

  const { data: followingCount = 0 } = useQuery({
    queryKey: ["followingCount", targetUserId],
    queryFn: async () => {
      const { count } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", targetUserId)
        .eq("status", "accepted");
      return count ?? 0;
    },
    enabled: !!targetUserId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["follow-outgoing", user?.id, targetUserId] });
    queryClient.invalidateQueries({ queryKey: ["follow-incoming", user?.id, targetUserId] });
    queryClient.invalidateQueries({ queryKey: ["followerCount", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["followingCount", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["followerCount", targetUserId] });
    queryClient.invalidateQueries({ queryKey: ["followingCount", targetUserId] });
    queryClient.invalidateQueries({ queryKey: ["followersList", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["followingList", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["followersList", targetUserId] });
    queryClient.invalidateQueries({ queryKey: ["followingList", targetUserId] });
  };

  // Realtime: react to changes made by the OTHER party (or in another tab)
  // so the UI updates immediately without manual refresh.
  useEffect(() => {
    if (!user || !targetUserId || user.id === targetUserId) return;
    const channel = supabase
      .channel(`follows:${user.id}:${targetUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "follows" },
        (payload: any) => {
          const row = (payload.new ?? payload.old) as
            | { follower_id?: string; following_id?: string }
            | undefined;
          if (!row) return;
          const involvesPair =
            (row.follower_id === user.id && row.following_id === targetUserId) ||
            (row.follower_id === targetUserId && row.following_id === user.id);
          if (involvesPair) invalidate();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, targetUserId]);

  // Determine connection state
  let state: ConnectionState = "none";
  if (outgoing?.status === "accepted") state = "accepted";
  else if (outgoing?.status === "pending") state = "pending_outgoing";
  else if (incoming?.status === "pending") state = "pending_incoming";
  else if (incoming?.status === "accepted") state = "accepted";

  // For employer follows we want one-tap (no approval). Caller decides via `requireApproval`.
  const sendRequest = useMutation({
    mutationFn: async (opts: { requireApproval: boolean }) => {
      if (!user) throw new Error("Not logged in");
      const { error } = await supabase.from("follows").insert({
        follower_id: user.id,
        following_id: targetUserId,
        status: opts.requireApproval ? "pending" : "accepted",
      } as any);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const cancelOrUnfollow = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not logged in");
      const rowId = outgoing?.id ?? incoming?.id;
      if (!rowId) throw new Error("No connection found");

      const { data, error } = await supabase
        .from("follows")
        .delete()
        .eq("id", rowId)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Connection was not removed");
    },
    onSuccess: invalidate,
  });

  const acceptIncoming = useMutation({
    mutationFn: async () => {
      if (!user || !incoming?.id) throw new Error("No pending request");
      const { error } = await supabase
        .from("follows")
        .update({ status: "accepted" } as any)
        .eq("id", incoming.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const rejectIncoming = useMutation({
    mutationFn: async () => {
      if (!user || !incoming?.id) throw new Error("No pending request");
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("id", incoming.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  // Pull the relevant timestamps regardless of which side authored the row.
  const requestSentAt: string | null = outgoing?.created_at ?? null;
  const requestReceivedAt: string | null = incoming?.created_at ?? null;
  const connectedAt: string | null =
    (state === "accepted"
      ? (outgoing?.status === "accepted"
          ? outgoing?.accepted_at
          : incoming?.accepted_at)
      : null) ?? null;

  return {
    state,
    isFollowing: state === "accepted",
    followerCount,
    followingCount,
    sendRequest,
    cancelOrUnfollow,
    acceptIncoming,
    rejectIncoming,
    requestSentAt,
    requestReceivedAt,
    connectedAt,
  };
}

export function useFollowList(userId: string, type: "followers" | "following") {
  return useQuery({
    queryKey: [type === "followers" ? "followersList" : "followingList", userId],
    queryFn: async () => {
      if (type === "followers") {
        const { data } = await supabase
          .from("follows")
          .select("follower_id, created_at, accepted_at")
          .eq("following_id", userId)
          .eq("status", "accepted");
        if (!data || data.length === 0) return [];
        const ids = data.map((d) => d.follower_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", ids);
        const byId = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
        return data
          .map((r: any) => {
            const p = byId.get(r.follower_id);
            return p ? { ...p, connected_at: r.accepted_at ?? r.created_at } : null;
          })
          .filter(Boolean) as any[];
      } else {
        const { data } = await supabase
          .from("follows")
          .select("following_id, created_at, accepted_at")
          .eq("follower_id", userId)
          .eq("status", "accepted");
        if (!data || data.length === 0) return [];
        const ids = data.map((d) => d.following_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", ids);
        const byId = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
        return data
          .map((r: any) => {
            const p = byId.get(r.following_id);
            return p ? { ...p, connected_at: r.accepted_at ?? r.created_at } : null;
          })
          .filter(Boolean) as any[];
      }
    },
    enabled: !!userId,
  });
}
