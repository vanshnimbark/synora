import { useEffect, useMemo, useState } from "react";
import { Alert, Animated, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { Colors, Gradients, Radius, Space } from "@/constants/theme";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "@/store/authStore";

interface CrossedPathUser {
  user_id: string;
  full_name: string;
  age: number;
  avatar_url: string | null;
  intent: string | null;
  match_percent: number;
}

export default function CrossedPathsScreen() {
  const { venueId } = useLocalSearchParams<{ venueId?: string }>();
  const user = useAuthStore((state) => state.user);
  const [items, setItems] = useState<CrossedPathUser[]>([]);
  const [reveal, setReveal] = useState(false);
  const [loading, setLoading] = useState(false);
  const blurAnim = useState(() => new Animated.Value(1))[0];

  const loadCrossedPaths = async () => {
    if (!user?.id || !venueId) {
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc(
      "get_crossed_paths" as never,
      {
        current_user_id: user.id,
        venue_id: venueId,
        limit_count: 6,
      } as never,
    );
    setLoading(false);

    if (error) {
      Alert.alert("Could not load crossed paths", error.message);
      return;
    }
    setItems((data ?? []) as CrossedPathUser[]);
  };

  useEffect(() => {
    void loadCrossedPaths();
  }, [user?.id, venueId]);

  const stats = useMemo(() => {
    const people = items.length;
    const activated = items.filter((item) => item.match_percent >= 40).length;
    const compatible = items.filter((item) => item.match_percent >= 70).length;
    return { people, activated, compatible };
  }, [items]);

  const revealProfiles = () => {
    setReveal(true);
    Animated.timing(blurAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: false,
    }).start();
  };

  const sendInterest = async (targetId: string) => {
    if (!user?.id) {
      return;
    }
    const payload = {
      from_user: user.id,
      to_user: targetId,
      prompt_index: 0,
      comment_text: "Crossed your path. Want to connect?",
    };
    const { error } = await supabase.from("comments").insert(payload as never);
    if (error) {
      Alert.alert("Could not express interest", error.message);
      return;
    }
    const { data: maybeMatch } = await supabase
      .from("matches")
      .select("id")
      .or(`and(user_one_id.eq.${user.id},user_two_id.eq.${targetId}),and(user_one_id.eq.${targetId},user_two_id.eq.${user.id})`)
      .limit(1)
      .maybeSingle<{ id: string }>();

    if (maybeMatch?.id) {
      Alert.alert("It's a match.", "You can start chatting now.");
      return;
    }

    Alert.alert("Interest sent", "They will see your comment in discovery.");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.mark}>
          <Text style={styles.markText}>✕</Text>
        </View>
        <Text style={styles.title}>Crossed Paths</Text>
      </View>

      {!venueId ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No recent venue history</Text>
          <Text style={styles.emptySub}>Visit a venue and activate Venue Mode to see crossed paths.</Text>
        </View>
      ) : (
        <>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.people}</Text>
              <Text style={styles.statLabel}>People at venue</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.activated}</Text>
              <Text style={styles.statLabel}>Activated</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.compatible}</Text>
              <Text style={styles.statLabel}>Compatible</Text>
            </View>
          </View>

          {!reveal ? (
            <Pressable onPress={revealProfiles}>
              <LinearGradient colors={Gradients.matchMoment} style={styles.revealBtn}>
                <Text style={styles.revealBtnText}>✦ Reveal Crossed Paths</Text>
              </LinearGradient>
            </Pressable>
          ) : null}

          <FlatList
            data={items}
            keyExtractor={(item) => item.user_id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>{loading ? "Loading..." : "No crossed paths yet"}</Text>
                <Text style={styles.emptySub}>Try another venue or check back later.</Text>
              </View>
            }
            ItemSeparatorComponent={() => <View style={{ height: Space.sm }} />}
            renderItem={({ item }) => (
              <View style={styles.profileCard}>
                <View style={styles.avatarWrap}>
                  <View style={styles.avatar} />
                  {!reveal ? (
                    <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: blurAnim }]}>
                      <BlurView tint="dark" intensity={80} style={StyleSheet.absoluteFillObject} />
                    </Animated.View>
                  ) : null}
                </View>
                <View style={styles.meta}>
                  <Text style={styles.nameText}>{reveal ? `${item.full_name}, ${item.age}` : "████████"}</Text>
                  <Text style={styles.matchText}>{`${item.match_percent}% match`}</Text>
                </View>
                {reveal ? (
                  <Pressable style={styles.interestBtn} onPress={() => void sendInterest(item.user_id)}>
                    <Text style={styles.interestBtnText}>Express Interest</Text>
                  </Pressable>
                ) : null}
              </View>
            )}
          />
        </>
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
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
    marginBottom: Space.md,
  },
  mark: {
    width: 30,
    height: 30,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.mist,
    backgroundColor: Colors.dusk,
  },
  markText: {
    color: Colors.cream,
    fontSize: 14,
  },
  title: {
    color: Colors.cream,
    fontSize: 30,
    fontFamily: "serif",
    fontWeight: "300",
  },
  statsRow: {
    flexDirection: "row",
    gap: Space.sm,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.mist,
    borderRadius: Radius.md,
    backgroundColor: Colors.obsidian,
    padding: Space.sm,
    alignItems: "center",
  },
  statValue: {
    color: Colors.cream,
    fontSize: 18,
    fontWeight: "700",
  },
  statLabel: {
    color: Colors.fog,
    fontSize: 11,
  },
  revealBtn: {
    marginTop: Space.md,
    height: 50,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  revealBtnText: {
    color: Colors.cream,
    fontSize: 15,
    fontWeight: "600",
  },
  list: {
    paddingVertical: Space.md,
    paddingBottom: Space.lg,
  },
  profileCard: {
    borderWidth: 1,
    borderColor: Colors.mist,
    borderRadius: Radius.md,
    backgroundColor: Colors.obsidian,
    padding: Space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    overflow: "hidden",
  },
  avatar: {
    flex: 1,
    backgroundColor: Colors.dusk,
  },
  meta: {
    flex: 1,
  },
  nameText: {
    color: Colors.cream,
    fontSize: 15,
    fontWeight: "600",
  },
  matchText: {
    color: Colors.fog,
    fontSize: 12,
    marginTop: 4,
  },
  interestBtn: {
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.ember,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  interestBtnText: {
    color: Colors.ember,
    fontSize: 11,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Space.lg,
  },
  emptyTitle: {
    color: Colors.cream,
    fontSize: 28,
    fontFamily: "serif",
    fontWeight: "300",
    textAlign: "center",
  },
  emptySub: {
    color: Colors.fog,
    fontSize: 14,
    marginTop: Space.sm,
    textAlign: "center",
    lineHeight: 20,
  },
});
