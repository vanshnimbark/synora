import { Image, Pressable, StyleSheet, Text, View } from "react-native";
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
        <View style={styles.logoCard}>
          <Image
            source={require("../../assets/synora-logo.png")}
            style={styles.logoImage}
            resizeMode="cover"
          />
        </View>
        <Text style={styles.tagline}>CONTEXT-AWARE DATING</Text>
        <Text style={styles.sub}>
          Meet in real places, not on a swipe feed.
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={() => router.push("/(auth)/invite")} testID="landing-invite-btn">
          <LinearGradient
            colors={Gradients.primaryCta as unknown as readonly [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Enter Invite Code</Text>
          </LinearGradient>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          testID="landing-request-btn"
          onPress={() => router.push("/(auth)/invite")}
        >
          <Text style={styles.secondaryButtonText}>Request Access</Text>
        </Pressable>
        <Text style={styles.fineprint}>
          By continuing you agree to our Terms · Privacy
        </Text>
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
  orb: { position: "absolute", borderRadius: Radius.pill },
  orbOne: {
    width: 220,
    height: 220,
    backgroundColor: Colors.haze,
    opacity: 0.18,
    top: 80,
    left: -60,
  },
  orbTwo: {
    width: 260,
    height: 260,
    backgroundColor: Colors.bloom,
    opacity: 0.16,
    top: 160,
    right: -90,
  },
  orbThree: {
    width: 200,
    height: 200,
    backgroundColor: Colors.ember,
    opacity: 0.12,
    bottom: 140,
    left: 10,
  },
  brandWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 18,
  },
  logoCard: {
    width: 160,
    height: 160,
    borderRadius: 40,
    overflow: "hidden",
    shadowColor: "#C23B8A",
    shadowOpacity: 0.45,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 10 },
  },
  logoImage: { width: "100%", height: "100%" },
  tagline: {
    color: Colors.cream,
    fontSize: 11,
    letterSpacing: 5,
    fontWeight: "600",
  },
  sub: {
    color: Colors.fog,
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 30,
    lineHeight: 20,
  },
  actions: { gap: Space.md },
  primaryButton: {
    height: 56,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { color: Colors.cream, fontSize: 16, fontWeight: "700" },
  secondaryButton: {
    height: 56,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.mist,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  secondaryButtonText: { color: Colors.fog, fontSize: 15, fontWeight: "500" },
  fineprint: {
    color: Colors.smoke,
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
  },
});
