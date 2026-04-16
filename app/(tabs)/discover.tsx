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

import { ProfileCard } from "@/components/profile/ProfileCard";
import { Colors, Space } from "@/constants/theme";
import { useDiscovery } from "@/hooks/useDiscovery";
import { useAuthStore } from "@/store/authStore";

export default function DiscoverScreen() {
  const { profiles, loading, error, refetch } = useDiscovery();
  const user = useAuthStore((state) => state.user);
  const shimmer = useRef(new Animated.Value(0.4)).current;
  const intentFilter = user?.intent ? `Intent: ${user.intent}` : "Intent";

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

  const pills = ["Nearby 3km", "Age 22–28", intentFilter, "+ Filters"];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.navRow}>
        <Text style={styles.logo}>Synora</Text>
        <Pressable style={styles.settingsBtn}>
          <Text style={styles.settingsIcon}>⚙</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
        {pills.map((pill, idx) => {
          const active = idx < 3;
          return (
            <View key={pill} style={[styles.pill, active && styles.pillActive]}>
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{pill}</Text>
            </View>
          );
        })}
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
                {error ? "We hit a snag. Pull to refresh." : "Try widening your filters in a bit."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.void,
  },
  navRow: {
    paddingHorizontal: Space.md,
    paddingTop: Space.md,
    paddingBottom: Space.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    color: Colors.cream,
    fontFamily: "serif",
    fontSize: 30,
    fontWeight: "300",
  },
  settingsBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.dusk,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.mist,
  },
  settingsIcon: {
    color: Colors.cream,
    fontSize: 14,
  },
  pillsRow: {
    paddingHorizontal: Space.md,
    paddingBottom: Space.md,
    gap: Space.sm,
  },
  pill: {
    borderWidth: 1,
    borderColor: Colors.mist,
    borderRadius: 999,
    backgroundColor: Colors.obsidian,
    paddingHorizontal: Space.md,
    paddingVertical: 8,
  },
  pillActive: {
    backgroundColor: Colors.dusk,
    borderColor: Colors.ember,
  },
  pillText: {
    color: Colors.fog,
    fontSize: 13,
    fontWeight: "500",
  },
  pillTextActive: {
    color: Colors.cream,
  },
  listContent: {
    paddingHorizontal: Space.md,
    paddingBottom: Space.lg,
  },
  separator: {
    height: 16,
  },
  emptyWrap: {
    paddingTop: 120,
    alignItems: "center",
    gap: Space.sm,
  },
  emptyTitle: {
    color: Colors.cream,
    fontFamily: "serif",
    fontSize: 30,
    fontWeight: "300",
  },
  emptySubtitle: {
    color: Colors.fog,
    fontSize: 14,
    textAlign: "center",
  },
  skeletonList: {
    paddingHorizontal: Space.md,
    gap: 16,
  },
  skeletonCard: {
    height: 440,
    borderRadius: 22,
    backgroundColor: Colors.dusk,
  },
});
