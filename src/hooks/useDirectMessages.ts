import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  read: boolean;
  created_at: string;
}

export interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string | null;
  // FIX (HIGH-chat-route): Role is needed so the chat header can link to the
  // correct profile route (/student/:id vs /employers/:id).
  partnerRole: "student" | "employer";
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export function useDirectMessages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUnread, setTotalUnread] = useState(0);
  const mountedRef = useRef(true);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    const { data: messages } = await supabase
      .from("direct_messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (!messages || !mountedRef.current) return;

    // Group by conversation partner
    const convMap = new Map<string, { messages: DirectMessage[]; unread: number }>();

    for (const msg of messages as DirectMessage[]) {
      const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      if (!convMap.has(partnerId)) {
        convMap.set(partnerId, { messages: [], unread: 0 });
      }
      const conv = convMap.get(partnerId)!;
      conv.messages.push(msg);
      if (!msg.read && msg.receiver_id === user.id) {
        conv.unread++;
      }
    }

    // Fetch partner profiles
    const partnerIds = Array.from(convMap.keys());
    if (partnerIds.length === 0) {
      setConversations([]);
      setTotalUnread(0);
      setLoading(false);
      return;
    }

    const [profilesRes, rolesRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", partnerIds),
      // FIX (HIGH-chat-route): Fetch partner roles so chat header can link to
      // the correct profile route (/student/:id vs /employers/:id).
      supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", partnerIds),
    ]);

    if (!mountedRef.current) return;

    const profileMap = new Map(
      (profilesRes.data || []).map((p) => [p.user_id, p])
    );
    const roleMap = new Map(
      (rolesRes.data || []).map((r) => [r.user_id, r.role as "student" | "employer"])
    );

    let unread = 0;
    const convList: Conversation[] = partnerIds.map((pid) => {
      const conv = convMap.get(pid)!;
      const profile = profileMap.get(pid);
      unread += conv.unread;
      return {
        partnerId: pid,
        partnerName: profile?.full_name || "User",
        partnerAvatar: profile?.avatar_url || null,
        partnerRole: roleMap.get(pid) ?? "student",
        lastMessage: conv.messages[0]?.text || "",
        lastMessageAt: conv.messages[0]?.created_at || "",
        unreadCount: conv.unread,
      };
    });

    convList.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

    setConversations(convList);
    setTotalUnread(unread);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    mountedRef.current = true;
    fetchConversations();

    if (!user) return;

    // FIX (HIGH-dm-privacy): Replace shared unfiltered "dm-realtime" channel with
    // per-user channels that carry server-side row filters. The old approach subscribed
    // all connected users to the same channel without a filter — Supabase delivered
    // every direct_message INSERT payload (including text) to every subscriber, and
    // the existing client-side `if (sender_id === user.id || receiver_id === user.id)`
    // guard only controlled whether to re-fetch, not whether the payload was received.
    //
    // With server-side filters, Supabase only delivers rows that match the filter to
    // this subscriber. Two subscriptions on the same channel object cover both sides
    // of a conversation:
    //   • sender_id=eq.{user.id}  → messages this user sent (outbox)
    //   • receiver_id=eq.{user.id} → messages this user received (inbox)
    const channel = supabase
      .channel(`dm-user-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `sender_id=eq.${user.id}`,
        },
        () => { fetchConversations(); }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        () => { fetchConversations(); }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "direct_messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        () => { fetchConversations(); }
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations]);

  return { conversations, loading, totalUnread, refetch: fetchConversations };
}

export function useChatMessages(partnerId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!partnerId || !user) return;
    setLoading(true);

    supabase
      .from("direct_messages")
      .select("*")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`
      )
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data as DirectMessage[]);
        setLoading(false);
      });

    // Mark unread messages as read
    supabase
      .from("direct_messages")
      .update({ read: true })
      .eq("sender_id", partnerId)
      .eq("receiver_id", user.id)
      .eq("read", false)
      .then(() => {});

    // FIX (HIGH-dm-privacy): Use per-user server-side filters — same approach as
    // useDirectMessages. Two subscriptions: one for messages sent by this user to
    // the partner, one for messages received from the partner.
    const channel = supabase
      .channel(`dm-chat-${user.id}-${partnerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const msg = payload.new as DirectMessage;
          // Server guarantees receiver_id === user.id; additionally confirm sender.
          if (msg.sender_id === partnerId) {
            setMessages((prev) => [...prev, msg]);
            supabase
              .from("direct_messages")
              .update({ read: true })
              .eq("id", msg.id)
              .then(() => {});
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `sender_id=eq.${user.id}`,
        },
        (payload) => {
          const msg = payload.new as DirectMessage;
          // Server guarantees sender_id === user.id; additionally confirm receiver.
          if (msg.receiver_id === partnerId) {
            setMessages((prev) => [...prev, msg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partnerId, user]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!partnerId || !user) return { error: "Not signed in" as string | null };
      const { error } = await supabase.from("direct_messages").insert({
        sender_id: user.id,
        receiver_id: partnerId,
        text,
      });
      return { error: error?.message ?? null };
    },
    [partnerId, user]
  );

  return { messages, sendMessage, loading };
}
