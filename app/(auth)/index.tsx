import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { Colors, Gradients, Radius, Space } from "@/constants/theme";

export default function AuthIndexScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={[styles.orb, styles.orbOne]} />
      <View style={[styles.orb, styles.orbTwo]} />
      <View style={[styles.orb, styles.orbThree]} />

      <View style={styles.brandWrap}>
        <Text style={styles.brand}>Synora</Text>
        <Text style={styles.tagline}>CONTEXT-AWARE DATING</Text>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={() => router.push("/(auth)/invite")}>
          <LinearGradient
            colors={Gradients.primaryCta}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Enter Invite Code</Text>
          </LinearGradient>
        </Pressable>

        <Pressable style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Request Access</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.void,
    paddingHorizontal: Space.lg,
    paddingTop: Space.xl,
    paddingBottom: Space.lg,
    justifyContent: "space-between",
  },
  orb: {
    position: "absolute",
    borderRadius: Radius.pill,
  },
  orbOne: {
    width: 170,
    height: 170,
    backgroundColor: Colors.haze,
    opacity: 0.16,
    top: 90,
    left: -30,
  },
  orbTwo: {
    width: 220,
    height: 220,
    backgroundColor: Colors.bloom,
    opacity: 0.12,
    top: 210,
    right: -80,
  },
  orbThree: {
    width: 150,
    height: 150,
    backgroundColor: Colors.ember,
    opacity: 0.1,
    bottom: 180,
    left: 30,
  },
  brandWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  brand: {
    color: Colors.cream,
    fontFamily: "serif",
    fontSize: 48,
    fontWeight: "300",
    marginBottom: Space.sm,
  },
  tagline: {
    color: Colors.fog,
    fontSize: 10,
    letterSpacing: 4,
    fontWeight: "500",
  },
  actions: {
    gap: Space.md,
  },
  primaryButton: {
    height: 56,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: Colors.cream,
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    height: 56,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.mist,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  secondaryButtonText: {
    color: Colors.fog,
    fontSize: 15,
    fontWeight: "500",
  },
});
