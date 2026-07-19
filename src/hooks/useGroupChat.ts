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

  // Resolve current display names for a set of sender_ids and rewrite the
  // stored `sender_name` snapshot so name changes propagate to old messages.
  const applyLiveNames = useCallback(async (msgs: GroupMessage[]) => {
    const ids = Array.from(new Set(msgs.map((m) => m.sender_id))).filter(Boolean);
    if (ids.length === 0) return msgs;
    const { data } = await (supabase as any).rpc("resolve_display_names", { _user_ids: ids });
    const map = new Map<string, string>((data || []).map((r: any) => [r.user_id, r.display_name]));
    return msgs.map((m) => ({ ...m, sender_name: map.get(m.sender_id) || m.sender_name }));
  }, []);

  useEffect(() => {
    if (!groupId) return;
    setLoading(true);

    // Fetch existing messages
    supabase
      .from("group_messages")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true })
      .then(async ({ data }) => {
        if (data) {
          const resolved = await applyLiveNames(data as GroupMessage[]);
          setMessages(resolved);
        }
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
        async (payload) => {
          const next = payload.new as GroupMessage;
          const [withName] = await applyLiveNames([next]);
          setMessages((prev) => {
            if (prev.some((m) => m.id === next.id)) return prev;
            return [...prev, withName];
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
  }, [groupId, user, applyLiveNames]);


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
        sender_name: profile?.full_name || user.email?.split("@")[0] || "Unknown User",
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
