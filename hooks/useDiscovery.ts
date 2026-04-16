import { useQuery } from "@tanstack/react-query";

import { supabase } from "../lib/supabase";
import { useAuthStore } from "@/store/authStore";
import type { Gender, User } from "@/types/database";

interface DiscoveryProfile extends User {
  hasActiveVenuePresence: boolean;
}

const oppositeGender: Record<Gender, Gender> = {
  woman: "man",
  man: "woman",
  non_binary: "other",
  other: "non_binary",
};

export function useDiscovery() {
  const currentUser = useAuthStore((state) => state.user);

  const query = useQuery({
    queryKey: ["discovery", currentUser?.id],
    enabled: Boolean(currentUser?.id),
    queryFn: async (): Promise<DiscoveryProfile[]> => {
      if (!currentUser) {
        return [];
      }

      const targetGender = oppositeGender[currentUser.gender];

      const [commentedResult, matchesResult, blockedResult] = await Promise.all([
        supabase
          .from("comments")
          .select("to_user")
          .eq("from_user", currentUser.id),
        supabase
          .from("matches")
          .select("user_one_id,user_two_id")
          .or(`user_one_id.eq.${currentUser.id},user_two_id.eq.${currentUser.id}`),
        // Optional table for block relationships; fail open if missing.
        supabase.from("blocks").select("blocker_id").eq("blocked_id", currentUser.id),
      ]);

      const excludedIds = new Set<string>([currentUser.id]);
      const commentedRows = (commentedResult.data ?? []) as Array<{ to_user: string }>;
      const matchedRows = (matchesResult.data ?? []) as Array<{
        user_one_id: string;
        user_two_id: string;
      }>;
      const blockedRows = (blockedResult.data ?? []) as Array<{ blocker_id: string }>;

      for (const row of commentedRows) {
        excludedIds.add(row.to_user);
      }

      for (const match of matchedRows) {
        excludedIds.add(match.user_one_id === currentUser.id ? match.user_two_id : match.user_one_id);
      }

      for (const row of blockedRows) {
        excludedIds.add(row.blocker_id);
      }

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("is_approved", true)
        .eq("is_banned", false)
        .eq("is_invisible", false)
        .eq("gender", targetGender)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        throw error;
      }

      const profileRows = (data ?? []) as User[];
      const filtered = profileRows.filter((profile) => !excludedIds.has(profile.id));
      if (!filtered.length) {
        return [];
      }

      const { data: venueRows } = await supabase
        .from("venue_presence")
        .select("user_id,status")
        .eq("status", "in")
        .in(
          "user_id",
          filtered.map((profile) => profile.id),
        );

      const venuePresenceRows = (venueRows ?? []) as Array<{ user_id: string }>;
      const activeVenueUserIds = new Set(venuePresenceRows.map((row) => row.user_id));

      return filtered.map((profile) => ({
        ...profile,
        hasActiveVenuePresence: activeVenueUserIds.has(profile.id),
      }));
    },
  });

  return {
    profiles: query.data ?? [],
    loading: query.isLoading,
    error: query.error ? String(query.error) : null,
    refetch: query.refetch,
  };
}

export type { DiscoveryProfile };
