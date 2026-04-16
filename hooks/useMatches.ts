import { useEffect, useMemo, useState } from "react";

import { supabase } from "../lib/supabase";
import { useAuthStore } from "@/store/authStore";
import type { Match, Message, User } from "@/types/database";

export interface MatchListItem {
  match: Match;
  otherUser: User;
  latestMessage: Message | null;
  unreadCount: number;
}

interface UseMatchesResult {
  matches: MatchListItem[];
  loading: boolean;
}

export function useMatches(): UseMatchesResult {
  const currentUser = useAuthStore((state) => state.user);
  const [matches, setMatches] = useState<MatchListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!currentUser?.id) {
        setMatches([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data: matchRows } = await supabase
        .from("matches")
        .select("*")
        .or(`user_one_id.eq.${currentUser.id},user_two_id.eq.${currentUser.id}`)
        .order("updated_at", { ascending: false });

      const typedMatches = (matchRows ?? []) as Match[];
      if (!typedMatches.length) {
        setMatches([]);
        setLoading(false);
        return;
      }

      const otherUserIds = typedMatches.map((item) =>
        item.user_one_id === currentUser.id ? item.user_two_id : item.user_one_id,
      );

      const [{ data: usersRows }, { data: messagesRows }] = await Promise.all([
        supabase.from("users").select("*").in("id", otherUserIds),
        supabase.from("messages").select("*").in(
          "match_id",
          typedMatches.map((item) => item.id),
        ),
      ]);

      const users = (usersRows ?? []) as User[];
      const messages = ((messagesRows ?? []) as Message[]).sort((a, b) =>
        a.created_at.localeCompare(b.created_at),
      );

      const usersMap = new Map(users.map((user) => [user.id, user]));
      const messagesByMatch = new Map<string, Message[]>();
      for (const message of messages) {
        const bucket = messagesByMatch.get(message.match_id) ?? [];
        bucket.push(message);
        messagesByMatch.set(message.match_id, bucket);
      }

      const mapped: MatchListItem[] = typedMatches
        .map((match) => {
          const otherUserId = match.user_one_id === currentUser.id ? match.user_two_id : match.user_one_id;
          const otherUser = usersMap.get(otherUserId);
          if (!otherUser) {
            return null;
          }

          const threadMessages = messagesByMatch.get(match.id) ?? [];
          const latestMessage = threadMessages.length ? threadMessages[threadMessages.length - 1] : null;
          const unreadCount = threadMessages.filter(
            (message) => !message.is_read && message.sender_id !== currentUser.id,
          ).length;

          return {
            match,
            otherUser,
            latestMessage,
            unreadCount,
          };
        })
        .filter((item): item is MatchListItem => Boolean(item));

      setMatches(mapped);
      setLoading(false);
    };

    void load();
  }, [currentUser?.id]);

  return useMemo(
    () => ({
      matches,
      loading,
    }),
    [loading, matches],
  );
}
