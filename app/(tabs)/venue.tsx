import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Notifications from "expo-notifications";

import { Colors, Gradients, Radius, Space } from "@/constants/theme";
import { useVenueMode } from "@/hooks/useVenueMode";
import { supabase } from "../../lib/supabase";
import type { Venue } from "@/types/database";

const venueEmojiByCategory: Record<string, string> = {
  cafe: "☕",
  club: "🪩",
  bar: "🍸",
  restaurant: "🍽️",
  campus: "🎓",
  default: "📍",
};

const formatTimer = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}:${remMins.toString().padStart(2, "0")}`;
};

export default function VenueModeScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const previousActiveRef = useRef(false);
  const thumbX = useRef(new Animated.Value(2)).current;

  const { isActive, nearbyUsers, timeRemaining, loading, activate, deactivate } = useVenueMode(
    selectedVenue?.id ?? null,
  );

  useEffect(() => {
    Animated.timing(thumbX, {
      toValue: isActive ? 24 : 2,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [isActive, thumbX]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void (async () => {
        if (!search.trim()) {
          setSearchResults([]);
          return;
        }

        const { data } = await supabase
          .from("venues")
          .select("*")
          .ilike("name", `%${search.trim()}%`)
          .order("name", { ascending: true })
          .limit(12);

        setSearchResults((data ?? []) as Venue[]);
      })();
    }, 300);

    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const becameInactive = previousActiveRef.current && !isActive && Boolean(selectedVenue);
    previousActiveRef.current = isActive;

    if (!becameInactive || !selectedVenue) {
      return;
    }

    void (async () => {
      const perms = await Notifications.getPermissionsAsync();
      if (!perms.granted) {
        await Notifications.requestPermissionsAsync();
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "You crossed paths ✦",
          body: `See who was at ${selectedVenue.name} with you last night`,
          data: {
            target: "/(tabs)/paths",
            venueId: selectedVenue.id,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 45 * 60,
        },
      });
    })();
  }, [isActive, selectedVenue]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const venueIdRaw = response.notification.request.content.data?.venueId;
      const venueId = typeof venueIdRaw === "string" ? venueIdRaw : "";
      if (venueId) {
        router.push(`/(tabs)/paths?venueId=${venueId}`);
      }
    });

    return () => sub.remove();
  }, [router]);

  const cityName = useMemo(() => selectedVenue?.city ?? "Your City", [selectedVenue?.city]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerKicker}>VENUE MODE</Text>
        <Text style={styles.headerCity}>{cityName}</Text>
      </View>

      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search venues..."
          placeholderTextColor={Colors.smoke}
          style={styles.searchInput}
        />
      </View>

      {!selectedVenue ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.searchResults}
          ItemSeparatorComponent={() => <View style={{ height: Space.sm }} />}
          renderItem={({ item }) => (
            <Pressable style={styles.resultItem} onPress={() => setSelectedVenue(item)}>
              <Text style={styles.resultTitle}>{item.name}</Text>
              <Text style={styles.resultSub}>{item.address ?? item.city}</Text>
            </Pressable>
          )}
        />
      ) : (
        <View style={styles.selectedWrap}>
          <LinearGradient colors={Gradients.venueMode} style={styles.selectedBorder}>
            <View style={styles.selectedCard}>
              <View style={styles.selectedTopRow}>
                <View>
                  <Text style={styles.selectedVenueName}>
                    {(venueEmojiByCategory[selectedVenue.category ?? ""] ?? venueEmojiByCategory.default) +
                      " " +
                      selectedVenue.name}
                  </Text>
                  <Text style={styles.selectedVenueAddress}>
                    {selectedVenue.address ?? selectedVenue.city}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    if (!selectedVenue) {
                      return;
                    }
                    if (isActive) {
                      void deactivate();
                    } else {
                      void activate(selectedVenue);
                    }
                  }}
                  disabled={loading}
                >
                  <View style={[styles.toggleTrack, isActive && styles.toggleTrackActive]}>
                    <Animated.View style={[styles.toggleThumb, { transform: [{ translateX: thumbX }] }]} />
                  </View>
                </Pressable>
              </View>
              <Text style={styles.statusText}>
                {isActive
                  ? `You're live here · expires in ${formatTimer(timeRemaining)}`
                  : "Activate to be discovered"}
              </Text>
            </View>
          </LinearGradient>

          {isActive ? (
            <FlatList
              data={nearbyUsers}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.nearbyList}
              ItemSeparatorComponent={() => <View style={{ height: Space.sm }} />}
              renderItem={({ item }) => (
                <View style={styles.userCard}>
                  <View style={styles.userAvatar} />
                  <View style={styles.userMeta}>
                    <Text style={styles.userName}>{`${item.full_name}, ${item.age}`}</Text>
                    <View style={styles.userTags}>
                      <View style={styles.intentTag}>
                        <Text style={styles.intentTagText}>{item.intent ?? "Open"}</Text>
                      </View>
                      <View style={styles.hereNowBadge}>
                        <Text style={styles.hereNowText}>HERE NOW</Text>
                      </View>
                    </View>
                  </View>
                  <Pressable style={styles.commentBtn} onPress={() => router.push(`/(tabs)/profile/${item.id}`)}>
                    <Text style={styles.commentBtnText}>Comment</Text>
                  </Pressable>
                </View>
              )}
            />
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.void,
    paddingHorizontal: Space.md,
    paddingTop: Space.md,
  },
  header: {
    marginBottom: Space.md,
  },
  headerKicker: {
    color: Colors.haze,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "600",
  },
  headerCity: {
    color: Colors.cream,
    fontSize: 20,
    fontFamily: "serif",
    fontWeight: "300",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.mist,
    backgroundColor: Colors.obsidian,
    borderRadius: Radius.md,
    paddingHorizontal: Space.sm,
    marginBottom: Space.md,
  },
  searchIcon: {
    color: Colors.fog,
    fontSize: 16,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    height: 46,
    color: Colors.cream,
    fontSize: 15,
  },
  searchResults: {
    paddingBottom: Space.lg,
  },
  resultItem: {
    padding: Space.md,
    borderWidth: 1,
    borderColor: Colors.mist,
    borderRadius: Radius.md,
    backgroundColor: Colors.obsidian,
  },
  resultTitle: {
    color: Colors.cream,
    fontSize: 15,
    fontWeight: "600",
  },
  resultSub: {
    color: Colors.fog,
    fontSize: 13,
    marginTop: 4,
  },
  selectedWrap: {
    flex: 1,
  },
  selectedBorder: {
    borderRadius: Radius.md,
    padding: 1,
  },
  selectedCard: {
    backgroundColor: Colors.dusk,
    borderRadius: Radius.md,
    padding: Space.md,
    gap: Space.sm,
  },
  selectedTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Space.sm,
  },
  selectedVenueName: {
    color: Colors.cream,
    fontSize: 16,
    fontWeight: "600",
  },
  selectedVenueAddress: {
    color: Colors.fog,
    fontSize: 13,
    marginTop: 4,
  },
  toggleTrack: {
    width: 50,
    height: 28,
    borderRadius: Radius.pill,
    backgroundColor: Colors.mist,
    justifyContent: "center",
  },
  toggleTrackActive: {
    backgroundColor: Colors.haze,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: Radius.pill,
    backgroundColor: Colors.cream,
    position: "absolute",
    top: 2,
  },
  statusText: {
    color: Colors.fog,
    fontSize: 13,
  },
  nearbyList: {
    marginTop: Space.md,
    paddingBottom: Space.lg,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.mist,
    backgroundColor: Colors.obsidian,
    borderRadius: Radius.md,
    padding: Space.sm,
    gap: Space.sm,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: Colors.dusk,
  },
  userMeta: {
    flex: 1,
    gap: 6,
  },
  userName: {
    color: Colors.cream,
    fontSize: 15,
    fontWeight: "600",
  },
  userTags: {
    flexDirection: "row",
    gap: 6,
  },
  intentTag: {
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.mist,
    backgroundColor: Colors.dusk,
  },
  intentTagText: {
    color: Colors.fog,
    fontSize: 11,
  },
  hereNowBadge: {
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Colors.mutual,
  },
  hereNowText: {
    color: Colors.cream,
    fontSize: 10,
    fontWeight: "700",
  },
  commentBtn: {
    borderWidth: 1,
    borderColor: Colors.ember,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  commentBtnText: {
    color: Colors.ember,
    fontSize: 12,
    fontWeight: "600",
  },
});
