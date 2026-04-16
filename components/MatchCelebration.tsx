import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Colors, Gradients, Radius, Space } from "@/constants/theme";

interface MatchCelebrationProps {
  visible: boolean;
  name: string;
  matchId: string | null;
  onStartConversation: (matchId: string) => void;
  onKeepExploring: () => void;
}

export function MatchCelebration({
  visible,
  name,
  matchId,
  onStartConversation,
  onKeepExploring,
}: MatchCelebrationProps) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={[styles.orb, styles.orbTop]} />
        <View style={[styles.orb, styles.orbBottom]} />

        <View style={styles.content}>
          <View style={styles.mark}>
            <Text style={styles.markText}>✕</Text>
          </View>
          <Text style={styles.title}>It&apos;s a match.</Text>
          <Text style={styles.subtitle}>{`You & ${name}`}</Text>

          <View style={styles.avatarsRow}>
            <View style={styles.avatar} />
            <LinearGradient colors={Gradients.primaryCta} style={styles.centerBadge}>
              <Text style={styles.centerBadgeText}>❤</Text>
            </LinearGradient>
            <View style={styles.avatar} />
          </View>

          <Pressable
            onPress={() => {
              if (matchId) {
                onStartConversation(matchId);
              }
            }}
          >
            <LinearGradient colors={Gradients.primaryCta} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Start Conversation →</Text>
            </LinearGradient>
          </Pressable>

          <Pressable style={styles.ghostBtn} onPress={onKeepExploring}>
            <Text style={styles.ghostBtnText}>Keep Exploring</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Colors.void,
    justifyContent: "center",
    padding: Space.lg,
  },
  orb: {
    position: "absolute",
    borderRadius: Radius.pill,
  },
  orbTop: {
    width: 240,
    height: 240,
    backgroundColor: Colors.bloom,
    opacity: 0.14,
    top: 100,
    right: -80,
  },
  orbBottom: {
    width: 220,
    height: 220,
    backgroundColor: Colors.ember,
    opacity: 0.12,
    bottom: 140,
    left: -60,
  },
  content: {
    gap: Space.md,
    alignItems: "center",
  },
  mark: {
    width: 80,
    height: 80,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.mist,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dusk,
  },
  markText: {
    color: Colors.cream,
    fontSize: 42,
    fontWeight: "300",
  },
  title: {
    color: Colors.cream,
    fontFamily: "serif",
    fontSize: 32,
    fontWeight: "300",
  },
  subtitle: {
    color: Colors.fog,
    fontSize: 16,
  },
  avatarsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
    marginVertical: Space.sm,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: Radius.pill,
    backgroundColor: Colors.dusk,
    borderWidth: 1,
    borderColor: Colors.mist,
  },
  centerBadge: {
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  centerBadgeText: {
    color: Colors.cream,
    fontSize: 16,
  },
  primaryBtn: {
    height: 52,
    minWidth: 260,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: Colors.cream,
    fontSize: 16,
    fontWeight: "600",
  },
  ghostBtn: {
    height: 44,
    minWidth: 220,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.mist,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  ghostBtnText: {
    color: Colors.fog,
    fontSize: 15,
    fontWeight: "500",
  },
});
