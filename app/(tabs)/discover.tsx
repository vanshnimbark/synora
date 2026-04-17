import { useEffect, useRef } from "react";
import {
  Animated,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";

import { ProfileCard } from "@/components/profile/ProfileCard";
import { Colors, Gradients, Radius, Space } from "@/constants/theme";
import { useDiscovery } from "@/hooks/useDiscovery";
import { useAuthStore } from "@/store/authStore";

type Filter = { id: string; label: string; active: boolean };

export default function DiscoverScreen() {
  const { profiles, loading, error, refetch } = useDiscovery();
  const user = useAuthStore((state) => state.user);
  const shimmer = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const intentLabel = user?.intent
    ? user.intent.charAt(0).toUpperCase() + user.intent.slice(1)
    : "Any";

  const filters: Filter[] = [
    { id: "d", label: "Nearby 3km", active: true },
    { id: "a", label: "22–28", active: true },
    { id: "i", label: intentLabel, active: true },
    { id: "f", label: "More filters", active: false },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* HEADER */}
      <View style={styles.navRow}>
        <View style={styles.brandRow}>
          <LinearGradient
            colors={Gradients.primaryCta as unknown as readonly [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.brandMark}
          >
            <Text style={styles.brandMarkText}>S</Text>
          </LinearGradient>
          <View>
            <Text style={styles.logo}>Synora</Text>
            <Text style={styles.kicker}>DISCOVERY</Text>
          </View>
        </View>
        <Pressable style={styles.settingsBtn} testID="open-settings">
          <Text style={styles.settingsIcon}>⚙</Text>
        </Pressable>
      </View>

      {/* FILTER BAR */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsRow}
      >
        {filters.map((pill) =>
          pill.active ? (
            <LinearGradient
              key={pill.id}
              colors={["rgba(232,87,42,0.2)", "rgba(194,59,138,0.2)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.pill, styles.pillActive]}
            >
              <View style={styles.pillDot} />
              <Text style={styles.pillTextActive}>{pill.label}</Text>
            </LinearGradient>
          ) : (
            <View key={pill.id} style={styles.pill}>
              <Text style={styles.pillText}>+ {pill.label}</Text>
            </View>
          ),
        )}
      </ScrollView>

      {loading ? (
        <View style={styles.skeletonList}>
          {[0, 1].map((item) => (
            <Animated.View key={item} style={[styles.skeletonCard, { opacity: shimmer }]} />
          ))}
        </View>
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ProfileCard profile={item} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={() => void refetch()}
          refreshing={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No one nearby yet</Text>
              <Text style={styles.emptySubtitle}>
                {error
                  ? "We hit a snag. Pull to refresh."
                  : "New profiles appear when they go Here Now. Try again soon."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.void },
  navRow: {
    paddingHorizontal: Space.md,
    paddingTop: 18,
    paddingBottom: Space.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  brandMarkText: {
    color: Colors.cream,
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Georgia",
  },
  logo: {
    color: Colors.cream,
    fontFamily: "Georgia",
    fontSize: 22,
    fontWeight: "400",
    letterSpacing: -0.4,
    lineHeight: 24,
  },
  kicker: {
    color: Colors.haze,
    fontSize: 9,
    letterSpacing: 2.5,
    fontWeight: "700",
    marginTop: 1,
  },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.obsidian,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.mist,
  },
  settingsIcon: { color: Colors.cream, fontSize: 15 },
  pillsRow: {
    paddingHorizontal: Space.md,
    paddingBottom: 14,
    gap: 8,
    alignItems: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.mist,
    borderRadius: Radius.pill,
    backgroundColor: Colors.obsidian,
    paddingHorizontal: 14,
    height: 34,
  },
  pillActive: {
    borderColor: "rgba(232,87,42,0.55)",
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.ember,
  },
  pillText: { color: Colors.fog, fontSize: 12, fontWeight: "600" },
  pillTextActive: { color: Colors.cream, fontSize: 12, fontWeight: "600" },
  listContent: {
    paddingHorizontal: Space.md,
    paddingTop: 2,
    paddingBottom: Space.lg,
  },
  separator: { height: 28 },
  emptyWrap: { paddingTop: 140, alignItems: "center", gap: Space.sm },
  emptyTitle: {
    color: Colors.cream,
    fontFamily: "Georgia",
    fontSize: 26,
    fontWeight: "400",
  },
  emptySubtitle: {
    color: Colors.fog,
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  skeletonList: { paddingHorizontal: Space.md, gap: 16 },
  skeletonCard: { height: 440, borderRadius: 22, backgroundColor: Colors.dusk },
});
