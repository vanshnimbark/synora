import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Linking } from "react-native";

import { getCurrentPosition, haversineDistance, requestLocationPermission } from "@/lib/venueDetection";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "@/store/authStore";
import type { User, Venue, VenuePresence } from "@/types/database";

interface NearbyUser extends User {
  presenceEnteredAt: string;
}

interface UseVenueModeResult {
  isActive: boolean;
  nearbyUsers: NearbyUser[];
  timeRemaining: number;
  loading: boolean;
  activate: (venue: Venue) => Promise<void>;
  deactivate: () => Promise<void>;
  refetchNearbyUsers: () => Promise<void>;
}

const FOUR_HOURS_SECONDS = 4 * 60 * 60;

export function useVenueMode(venueId: string | null): UseVenueModeResult {
  const currentUser = useAuthStore((state) => state.user);
  const [isActive, setIsActive] = useState(false);
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(false);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoDeactivateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (autoDeactivateTimeoutRef.current) {
      clearTimeout(autoDeactivateTimeoutRef.current);
      autoDeactivateTimeoutRef.current = null;
    }
  }, []);

  const startCountdown = useCallback(
    (enteredAtIso: string) => {
      clearTimers();
      const enteredAtMs = new Date(enteredAtIso).getTime();
      const expiryMs = enteredAtMs + FOUR_HOURS_SECONDS * 1000;

      const tick = () => {
        const nowMs = Date.now();
        const remainingSeconds = Math.max(0, Math.floor((expiryMs - nowMs) / 1000));
        setTimeRemaining(remainingSeconds);
      };

      tick();
      countdownIntervalRef.current = setInterval(tick, 1000);

      const timeoutMs = Math.max(0, expiryMs - Date.now());
      autoDeactivateTimeoutRef.current = setTimeout(() => {
        void deactivateInternal();
      }, timeoutMs);
    },
    [clearTimers],
  );

  const refetchNearbyUsers = useCallback(async () => {
    if (!venueId || !currentUser?.id) {
      setNearbyUsers([]);
      return;
    }

    const { data: presenceRows, error: presenceError } = await supabase
      .from("venue_presence")
      .select("user_id,entered_at")
      .eq("venue_id", venueId)
      .eq("is_active", true)
      .neq("user_id", currentUser.id);

    if (presenceError || !presenceRows?.length) {
      setNearbyUsers([]);
      return;
    }

    const activePresenceRows = (presenceRows ?? []) as Array<{
      user_id: string;
      entered_at: string;
    }>;
    const userIds = activePresenceRows.map((row) => row.user_id);
    const { data: usersRows, error: usersError } = await supabase
      .from("users")
      .select("*")
      .in("id", userIds);

    if (usersError || !usersRows) {
      setNearbyUsers([]);
      return;
    }

    const typedUsersRows = (usersRows ?? []) as User[];
    const enteredAtMap = new Map(activePresenceRows.map((row) => [row.user_id, row.entered_at]));
    const merged = typedUsersRows.map((user) => ({
      ...user,
      presenceEnteredAt: enteredAtMap.get(user.id) ?? new Date().toISOString(),
    }));
    setNearbyUsers(merged);
  }, [currentUser?.id, venueId]);

  const deactivateInternal = useCallback(async () => {
    if (!venueId || !currentUser?.id) {
      return;
    }

    await supabase
      .from("venue_presence")
      .update(
        {
          is_active: false,
          exited_at: new Date().toISOString(),
          left_at: new Date().toISOString(),
          status: "out",
        } as never,
      )
      .eq("user_id", currentUser.id)
      .eq("venue_id", venueId)
      .eq("is_active", true);

    clearTimers();
    setIsActive(false);
    setTimeRemaining(0);
    await refetchNearbyUsers();
  }, [clearTimers, currentUser?.id, refetchNearbyUsers, venueId]);

  const deactivate = useCallback(async () => {
    setLoading(true);
    try {
      await deactivateInternal();
    } finally {
      setLoading(false);
    }
  }, [deactivateInternal]);

  const activate = useCallback(
    async (venue: Venue) => {
      if (!currentUser?.id) {
        Alert.alert("Not signed in", "Please sign in again.");
        return;
      }

      setLoading(true);
      try {
        const granted = await requestLocationPermission();
        if (!granted) {
          Alert.alert(
            "Location permission required",
            "Please enable location access from Settings to activate Venue Mode.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Open Settings", onPress: () => void Linking.openSettings() },
            ],
          );
          return;
        }

        const position = await getCurrentPosition();
        const distance = haversineDistance(
          position.latitude,
          position.longitude,
          venue.latitude,
          venue.longitude,
        );

        if (distance > venue.geofence_radius_meters) {
          Alert.alert("You don't seem to be at this venue yet");
          return;
        }

        const now = new Date().toISOString();
        const payload: Omit<VenuePresence, "id" | "created_at" | "updated_at"> = {
          venue_id: venue.id,
          user_id: currentUser.id,
          status: "in",
          is_active: true,
          entered_at: now,
          exited_at: null,
          left_at: null,
        };

        const { error } = await supabase.from("venue_presence").insert(payload as never);
        if (error) {
          throw error;
        }

        setIsActive(true);
        startCountdown(now);
        await refetchNearbyUsers();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not activate Venue Mode.";
        Alert.alert("Activation failed", message);
      } finally {
        setLoading(false);
      }
    },
    [currentUser?.id, refetchNearbyUsers, startCountdown],
  );

  useEffect(() => {
    if (!venueId || !currentUser?.id) {
      setIsActive(false);
      setNearbyUsers([]);
      setTimeRemaining(0);
      clearTimers();
      return;
    }

    let mounted = true;

    const loadCurrentState = async () => {
      const { data } = await supabase
        .from("venue_presence")
        .select("*")
        .eq("user_id", currentUser.id)
        .eq("venue_id", venueId)
        .eq("is_active", true)
        .order("entered_at", { ascending: false })
        .limit(1)
        .maybeSingle<VenuePresence>();

      if (!mounted) {
        return;
      }

      if (data) {
        setIsActive(true);
        startCountdown(data.entered_at);
      } else {
        setIsActive(false);
        setTimeRemaining(0);
      }

      await refetchNearbyUsers();
    };

    void loadCurrentState();

    const channel = supabase
      .channel(`venue-presence-${venueId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "venue_presence",
          filter: `venue_id=eq.${venueId},is_active=eq.true`,
        },
        () => {
          void refetchNearbyUsers();
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      clearTimers();
      void supabase.removeChannel(channel);
    };
  }, [clearTimers, currentUser?.id, refetchNearbyUsers, startCountdown, venueId]);

  return useMemo(
    () => ({
      isActive,
      nearbyUsers,
      timeRemaining,
      loading,
      activate,
      deactivate,
      refetchNearbyUsers,
    }),
    [activate, deactivate, isActive, loading, nearbyUsers, refetchNearbyUsers, timeRemaining],
  );
}
