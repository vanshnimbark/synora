import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "../lib/supabase";
import { useAuthStore } from "@/store/authStore";
import type { Message } from "@/types/database";

interface UseChatResult {
  messages: Message[];
  loading: boolean;
  sendMessage: (content: string) => Promise<void>;
}

export function useChat(matchId: string): UseChatResult {
  const currentUser = useAuthStore((state) => state.user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!matchId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true });

    setMessages(((data ?? []) as Message[]).sort((a, b) => a.created_at.localeCompare(b.created_at)));
    setLoading(false);
  }, [matchId]);

  useEffect(() => {
    void fetchMessages();

    const channel = supabase
      .channel(`match:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const next = payload.new as Message;
          setMessages((prev) => [...prev, next]);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchMessages, matchId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!currentUser?.id || !matchId) {
        return;
      }

      const trimmed = content.trim();
      if (!trimmed) {
        return;
      }

      const payload = {
        match_id: matchId,
        sender_id: currentUser.id,
        content: trimmed,
        is_read: false,
      };

      await supabase.from("messages").insert(payload as never);
    },
    [currentUser?.id, matchId],
  );

  return useMemo(
    () => ({
      messages,
      loading,
      sendMessage,
    }),
    [loading, messages, sendMessage],
  );
}
