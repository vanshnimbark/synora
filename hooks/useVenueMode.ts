import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";

import {
  getCurrentPosition,
  haversineDistance,
  requestLocationPermission,
} from "@/lib/venueDetection";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "@/store/authStore";
import type { User, Venue, VenuePresence } from "@/types/database";

interface NearbyUser extends User {
  presenceEnteredAt: string;
}

export interface UseVenueModeResult {
  isActive: boolean;
  nearbyUsers: NearbyUser[];
  timeRemaining: number;
  loading: boolean;
  error: string | null;
  activate: (venue: Venue, opts?: { bypassGps?: boolean }) => Promise<void>;
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
  const [error, setError] = useState<string | null>(null);
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

  const deactivateInternal = useCallback(async () => {
    if (!venueId || !currentUser?.id) return;
    await supabase
      .from("venue_presence")
      .update({
        is_active: false,
        exited_at: new Date().toISOString(),
        left_at: new Date().toISOString(),
        status: "out",
      } as never)
      .eq("user_id", currentUser.id)
      .eq("venue_id", venueId)
      .eq("is_active", true);

    clearTimers();
    setIsActive(false);
    setTimeRemaining(0);
  }, [clearTimers, currentUser?.id, venueId]);

  const startCountdown = useCallback(
    (enteredAtIso: string) => {
      clearTimers();
      const enteredAtMs = new Date(enteredAtIso).getTime();
      const expiryMs = enteredAtMs + FOUR_HOURS_SECONDS * 1000;
      const tick = () => {
        const remaining = Math.max(0, Math.floor((expiryMs - Date.now()) / 1000));
        setTimeRemaining(remaining);
      };
      tick();
      countdownIntervalRef.current = setInterval(tick, 1000);
      const timeoutMs = Math.max(0, expiryMs - Date.now());
      autoDeactivateTimeoutRef.current = setTimeout(() => {
        void deactivateInternal();
      }, timeoutMs);
    },
    [clearTimers, deactivateInternal],
  );

  const refetchNearbyUsers = useCallback(async () => {
    if (!venueId || !currentUser?.id) {
      setNearbyUsers([]);
      return;
    }
    const { data: presenceRows } = await supabase
      .from("venue_presence")
      .select("user_id,entered_at")
      .eq("venue_id", venueId)
      .eq("is_active", true)
      .neq("user_id", currentUser.id);
    if (!presenceRows?.length) {
      setNearbyUsers([]);
      return;
    }
    const activePresenceRows = presenceRows as Array<{
      user_id: string;
      entered_at: string;
    }>;
    const userIds = activePresenceRows.map((r) => r.user_id);
    const { data: usersRows } = await supabase
      .from("users")
      .select("*")
      .in("id", userIds)
      .eq("is_approved", true)
      .eq("is_banned", false)
      .eq("is_invisible", false);
    if (!usersRows) {
      setNearbyUsers([]);
      return;
    }
    const typed = usersRows as User[];
    const enteredAtMap = new Map(
      activePresenceRows.map((r) => [r.user_id, r.entered_at]),
    );
    setNearbyUsers(
      typed.map((u) => ({
        ...u,
        presenceEnteredAt: enteredAtMap.get(u.id) ?? new Date().toISOString(),
      })),
    );
  }, [currentUser?.id, venueId]);

  const deactivate = useCallback(async () => {
    setLoading(true);
    try {
      await deactivateInternal();
      await refetchNearbyUsers();
    } finally {
      setLoading(false);
    }
  }, [deactivateInternal, refetchNearbyUsers]);

  const activate = useCallback(
    async (venue: Venue, opts?: { bypassGps?: boolean }) => {
      if (!currentUser?.id) {
        setError("Please sign in again.");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // GPS check — on web demo, we bypass by default so the flow is testable.
        // On native, the user must be within the venue's geofence_radius_meters.
        const isWeb = Platform.OS === "web";
        const skipGps = opts?.bypassGps ?? isWeb;

        if (!skipGps) {
          const granted = await requestLocationPermission();
          if (!granted) {
            throw new Error(
              "Location permission is required to activate Venue Mode.",
            );
          }
          const pos = await getCurrentPosition();
          const dist = haversineDistance(
            pos.latitude,
            pos.longitude,
            venue.latitude,
            venue.longitude,
          );
          if (dist > venue.geofence_radius_meters) {
            throw new Error(
              `You must be within ${venue.geofence_radius_meters}m of ${venue.name} to activate.`,
            );
          }
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
        const { error: insertError } = await supabase
          .from("venue_presence")
          .insert(payload as never);
        if (insertError) throw insertError;

        setIsActive(true);
        startCountdown(now);
        await refetchNearbyUsers();
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Could not activate Venue Mode.";
        setError(message);
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
    const loadCurrent = async () => {
      const { data } = await supabase
        .from("venue_presence")
        .select("*")
        .eq("user_id", currentUser.id)
        .eq("venue_id", venueId)
        .eq("is_active", true)
        .order("entered_at", { ascending: false })
        .limit(1)
        .maybeSingle<VenuePresence>();
      if (!mounted) return;
      if (data) {
        setIsActive(true);
        startCountdown(data.entered_at);
      } else {
        setIsActive(false);
        setTimeRemaining(0);
      }
      await refetchNearbyUsers();
    };
    void loadCurrent();

    const channel = supabase
      .channel(`venue-presence-${venueId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "venue_presence",
          filter: `venue_id=eq.${venueId}`,
        },
        () => void refetchNearbyUsers(),
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
      error,
      activate,
      deactivate,
      refetchNearbyUsers,
    }),
    [activate, deactivate, error, isActive, loading, nearbyUsers, refetchNearbyUsers, timeRemaining],
  );
}
