import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PeerUpMode = "offline" | "online";

export interface PeerUpCredentials {
  meeting_link: string | null;
  meeting_login_id: string | null;
  meeting_password: string | null;
}

export interface PeerUpCircle {
  id: string;
  creator_id: string;
  spot_name: string;
  spot_location: string | null;
  topic: string;
  fuel_type: string | null;
  additional_info: string | null;
  mode: PeerUpMode;
  drop_in_time: string;
  created_at: string;
  expires_at: string;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
  creator_name?: string;
  creator_avatar?: string | null;
  creator_university?: string | null;
  request_count?: number;
  participant_count?: number;
  my_request_status?: string | null;
  is_participant?: boolean;
}

export interface CircleRequest {
  id: string;
  circle_id: string;
  requester_id: string;
  status: string;
  created_at: string;
  requester_name?: string;
  requester_avatar?: string | null;
  requester_info?: string;
}

export interface CircleParticipant {
  id: string;
  circle_id: string;
  user_id: string;
  joined_at: string;
  user_name?: string;
  user_avatar?: string | null;
  user_info?: string;
  is_creator?: boolean;
}

const fetchStudentIdentity = async (userId: string) => {
  const { data: studentProfile } = await (supabase as any)
    .from("student_profiles_public")
    .select("full_name, avatar_url, university, major, graduation_year")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    name: studentProfile?.full_name || "Student",
    avatar: studentProfile?.avatar_url ?? null,
    university: studentProfile?.university ?? null,
    info: studentProfile
      ? `${studentProfile.major || "Student"} · Year ${studentProfile.graduation_year || ""}`
      : "Student",
  };
};

export function usePeerUpCircles(userLocation?: { lat: number; lng: number } | null) {
  const { user } = useAuth();
  const [circles, setCircles] = useState<PeerUpCircle[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCircles = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Discovery goes through a SECURITY DEFINER RPC so location details
      // for offline circles are only returned to nearby students (plus the
      // creator, participants, and requesters). Online circles are always
      // returned regardless of the caller's location.
      const { data: circlesData, error } = await (supabase as any).rpc(
        "list_visible_peerup_circles",
        {
          _lat: userLocation?.lat ?? null,
          _lng: userLocation?.lng ?? null,
          _radius_km: 5,
        }
      );

      if (error) throw error;
      if (!circlesData) { setCircles([]); return; }
      // Sort newest first — RPC returns unsorted rows.
      circlesData.sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Enrich with creator info and counts
      const enriched = await Promise.all(
        circlesData.map(async (c: any) => {
          // Get creator identity from the public student listing, which joins
          // registered profile names under backend-controlled permissions.
          const creatorIdentity = await fetchStudentIdentity(c.creator_id);

          // Get request count (for creator)
          let request_count = 0;
          if (c.creator_id === user.id) {
            const { count } = await supabase
              .from("peerup_requests")
              .select("*", { count: "exact", head: true })
              .eq("circle_id", c.id)
              .eq("status", "pending");
            request_count = count || 0;
          }

          // Get participant count
          const { count: pCount } = await supabase
            .from("peerup_participants")
            .select("*", { count: "exact", head: true })
            .eq("circle_id", c.id);

          // Check my request status
          let my_request_status: string | null = null;
          if (c.creator_id !== user.id) {
            const { data: myReq } = await supabase
              .from("peerup_requests")
              .select("status")
              .eq("circle_id", c.id)
              .eq("requester_id", user.id)
              .maybeSingle();
            my_request_status = myReq?.status || null;
          }

          // Check if I'm a participant
          let is_participant = c.creator_id === user.id;
          if (!is_participant) {
            const { data: part } = await supabase
              .from("peerup_participants")
              .select("id")
              .eq("circle_id", c.id)
              .eq("user_id", user.id)
              .maybeSingle();
            is_participant = !!part;
          }

          return {
            ...c,
            creator_name: creatorIdentity.name,
            creator_avatar: creatorIdentity.avatar,
            creator_university: creatorIdentity.university,
            request_count,
            participant_count: (pCount || 0) + 1, // +1 for creator
            my_request_status,
            is_participant,
          } as PeerUpCircle;
        })
      );

      setCircles(enriched);
    } catch (err) {
      console.error("Failed to fetch circles:", err);
    } finally {
      setLoading(false);
    }
  }, [user, userLocation?.lat, userLocation?.lng]);

  useEffect(() => {
    fetchCircles();
  }, [fetchCircles]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("peerup-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "peerup_circles" }, () => fetchCircles())
      .on("postgres_changes", { event: "*", schema: "public", table: "peerup_requests" }, () => fetchCircles())
      .on("postgres_changes", { event: "*", schema: "public", table: "peerup_participants" }, () => fetchCircles())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchCircles]);

  const createCircle = async (data: {
    spot_name: string;
    spot_location?: string;
    topic: string;
    fuel_type?: string;
    additional_info?: string;
    mode: PeerUpMode;
    drop_in_time: string;
    meeting_link?: string;
    meeting_login_id?: string;
    meeting_password?: string;
    latitude?: number | null;
    longitude?: number | null;
  }) => {
    if (!user) throw new Error("Not authenticated");
    const { data: inserted, error } = await supabase
      .from("peerup_circles")
      .insert({
        creator_id: user.id,
        spot_name: data.spot_name,
        spot_location: data.spot_location || null,
        topic: data.topic,
        fuel_type: data.mode === "offline" ? (data.fuel_type || null) : null,
        additional_info: data.mode === "online" ? (data.additional_info || null) : null,
        mode: data.mode,
        drop_in_time: data.drop_in_time,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
      } as any)
      .select("id")
      .single();
    if (error) throw error;

    if (data.mode === "online" && inserted?.id) {
      const { error: credErr } = await (supabase as any)
        .from("peerup_circle_credentials")
        .insert({
          circle_id: inserted.id,
          meeting_link: data.meeting_link || null,
          meeting_login_id: data.meeting_login_id || null,
          meeting_password: data.meeting_password || null,
        });
      if (credErr) throw credErr;
    }
    await fetchCircles();
  };

  const fetchCredentials = async (circleId: string): Promise<PeerUpCredentials | null> => {
    const { data, error } = await (supabase as any)
      .from("peerup_circle_credentials")
      .select("meeting_link, meeting_login_id, meeting_password")
      .eq("circle_id", circleId)
      .maybeSingle();
    if (error) {
      console.warn("fetchCredentials error:", error.message);
      return null;
    }
    return data || null;
  };

  const requestToJoin = async (circleId: string) => {
    if (!user) throw new Error("Not authenticated");
    const { error } = await supabase.from("peerup_requests").insert({
      circle_id: circleId,
      requester_id: user.id,
    });
    if (error) throw error;
    await fetchCircles();
  };

  const fetchRequests = async (circleId: string): Promise<CircleRequest[]> => {
    const { data, error } = await supabase
      .from("peerup_requests")
      .select("*")
      .eq("circle_id", circleId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    const enriched = await Promise.all(
      data.map(async (r: any) => {
        const requesterIdentity = await fetchStudentIdentity(r.requester_id);
        return {
          ...r,
          requester_name: requesterIdentity.name,
          requester_avatar: requesterIdentity.avatar,
          requester_info: requesterIdentity.info,
        } as CircleRequest;
      })
    );
    return enriched;
  };

  const handleRequest = async (requestId: string, action: "approved" | "declined", circleId: string, requesterId: string) => {
    const { error } = await supabase
      .from("peerup_requests")
      .update({ status: action })
      .eq("id", requestId);
    if (error) throw error;

    if (action === "approved") {
      await supabase.from("peerup_participants").insert({
        circle_id: circleId,
        user_id: requesterId,
      });
    }
    await fetchCircles();
  };

  const approveAll = async (circleId: string) => {
    const { data: pending } = await supabase
      .from("peerup_requests")
      .select("id, requester_id")
      .eq("circle_id", circleId)
      .eq("status", "pending");

    if (!pending) return;

    for (const req of pending) {
      await handleRequest(req.id, "approved", circleId, req.requester_id);
    }
  };

  const fetchParticipants = async (circleId: string, creatorId: string): Promise<CircleParticipant[]> => {
    const { data, error } = await supabase
      .from("peerup_participants")
      .select("*")
      .eq("circle_id", circleId);

    if (error || !data) return [];

    // Include creator
    const allUserIds = [...new Set([creatorId, ...data.map((p: any) => p.user_id)])];
    
    const participants: CircleParticipant[] = await Promise.all(
      allUserIds.map(async (uid) => {
        const participantIdentity = await fetchStudentIdentity(uid);
        const participant = data.find((p: any) => p.user_id === uid);
        return {
          id: participant?.id || uid,
          circle_id: circleId,
          user_id: uid,
          joined_at: participant?.joined_at || new Date().toISOString(),
          user_name: participantIdentity.name,
          user_avatar: participantIdentity.avatar,
          user_info: participantIdentity.info,
          is_creator: uid === creatorId,
        };
      })
    );

    return participants;
  };

  const deleteCircle = async (circleId: string) => {
    const { error } = await supabase
      .from("peerup_circles")
      .delete()
      .eq("id", circleId);
    if (error) throw error;
    await fetchCircles();
  };

  return {
    circles,
    loading,
    createCircle,
    fetchCredentials,
    requestToJoin,
    fetchRequests,
    handleRequest,
    approveAll,
    fetchParticipants,
    deleteCircle,
    refresh: fetchCircles,
  };
}
