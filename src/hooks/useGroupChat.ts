import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  sender_name: string;
  text: string;
  created_at: string;
}

export function useGroupChat(groupId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!groupId) return;
    setLoading(true);

    // Fetch existing messages
    supabase
      .from("group_messages")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data as GroupMessage[]);
        setLoading(false);
      });

    // Resolve ownership for current user
    if (user) {
      supabase
        .rpc("is_group_owner", { _group_id: groupId, _user_id: user.id })
        .then(({ data }) => setIsOwner(Boolean(data)));
    } else {
      setIsOwner(false);
    }

    // Subscribe to realtime INSERT + DELETE
    const channel = supabase
      .channel(`group-chat-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          setMessages((prev) => {
            const next = payload.new as GroupMessage;
            if (prev.some((m) => m.id === next.id)) return prev;
            return [...prev, next];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const oldId = (payload.old as { id?: string })?.id;
          if (!oldId) return;
          setMessages((prev) => prev.filter((m) => m.id !== oldId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, user]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!groupId || !user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      await supabase.from("group_messages").insert({
        group_id: groupId,
        sender_id: user.id,
        sender_name: profile?.full_name || "Anonymous",
        text,
      });
    },
    [groupId, user]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      const { error } = await supabase
        .from("group_messages")
        .delete()
        .eq("id", messageId);
      if (error) throw error;
      // Optimistic: also drop locally in case realtime is delayed
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    },
    []
  );

  return { messages, sendMessage, deleteMessage, loading, isOwner };
}
