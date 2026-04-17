import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { OnboardingProgress } from "@/components/OnboardingProgress";
import { Colors, Gradients, Radius, Space } from "@/constants/theme";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useOnboardingStore } from "@/store/onboardingStore";
import type { Database, User } from "@/types/database";

export default function PaywallScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const setUser = useAuthStore((state) => state.setUser);
  const clearOnboarding = useOnboardingStore((state) => state.clearOnboarding);
  const onboarding = useOnboardingStore((state) => state);
  const [loading, setLoading] = useState(false);
  const [processingMock, setProcessingMock] = useState(false);

  const isFemale = onboarding.gender === "woman";

  const upsertUser = async (subscriptionStatus: "free" | "active"): Promise<User> => {
    const authId = session?.user.id;
    if (!authId) {
      throw new Error("No active auth session.");
    }
    if (!onboarding.fullName || !onboarding.age || !onboarding.gender) {
      throw new Error("Basic profile information is incomplete.");
    }

    const promptOne = onboarding.prompts[0];
    const promptTwo = onboarding.prompts[1];
    const handleSeed = onboarding.fullName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const generatedHandle = `${handleSeed.slice(0, 12) || "synora"}${Date.now().toString().slice(-4)}`;
    const now = new Date().toISOString();

    const payload: Database["public"]["Tables"]["users"]["Insert"] = {
      id: authId,
      auth_id: authId,
      handle: generatedHandle,
      full_name: onboarding.fullName,
      age: onboarding.age,
      gender: onboarding.gender,
      bio: null,
      avatar_url: onboarding.photoUrls[0] ?? null,
      photo_urls: onboarding.photoUrls,
      prompt_one: promptOne?.prompt ?? null,
      prompt_one_answer: promptOne?.answer ?? null,
      prompt_two: promptTwo?.prompt ?? null,
      prompt_two_answer: promptTwo?.answer ?? null,
      intent: onboarding.intent,
      city: null,
      college: null,
      // Auto-approve for MVP demo
      is_approved: true,
      is_founder_approved: true,
      is_banned: false,
      is_invisible: false,
      is_paid: subscriptionStatus === "active",
      subscription_status: subscriptionStatus,
      payment_expires_at:
        subscriptionStatus === "active"
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          : null,
      current_zone: "nearby",
      current_venue_id: null,
      expo_push_token: null,
      last_active_at: now,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from("users")
      .upsert(payload as never, { onConflict: "id" })
      .select("*")
      .single<User>();

    if (error) {
      throw error;
    }

    setUser(data);
    return data;
  };

  const handleEnterFree = async () => {
    try {
      setLoading(true);
      await upsertUser("free");
      clearOnboarding();
      router.replace("/(tabs)/discover");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save your account.";
      Alert.alert("Could not continue", message);
    } finally {
      setLoading(false);
    }
  };

  const handleMockSubscribe = async () => {
    try {
      setLoading(true);
      setProcessingMock(true);
      // Simulate a Razorpay checkout round-trip
      await new Promise((resolve) => setTimeout(resolve, 1800));
      await upsertUser("active");
      clearOnboarding();
      setProcessingMock(false);
      router.replace("/(tabs)/discover");
    } catch (error) {
      setProcessingMock(false);
      const message =
        error instanceof Error ? error.message : "Payment failed. Please try again.";
      Alert.alert("Subscription failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <OnboardingProgress currentStep={5} />
      <Pressable
        style={styles.backButton}
        onPress={() => router.back()}
        testID="paywall-back-btn"
      >
        <Text style={styles.backIcon}>{"<"}</Text>
      </Pressable>

      {isFemale ? (
        <View style={styles.content}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>✦ FREE FOR WOMEN</Text>
          </View>
          <Text style={styles.title}>Synora is free for you.</Text>
          <Text style={styles.subtitle}>
            We believe in building a balanced ecosystem. Your access is on us.
          </Text>
          <View style={styles.features}>
            <Text style={styles.featureItem}>◈  Full discovery access</Text>
            <Text style={styles.featureItem}>◎  Venue mode unlocked</Text>
            <Text style={styles.featureItem}>✦  Crossed paths reveals</Text>
          </View>
          <Pressable
            onPress={() => void handleEnterFree()}
            disabled={loading}
            testID="paywall-enter-free-btn"
          >
            <LinearGradient
              colors={Gradients.primaryCta as unknown as readonly [string, string, ...string[]]}
              style={[styles.button, loading && styles.buttonDisabled]}
            >
              <Text style={styles.buttonText}>
                {loading ? "Setting up your profile..." : "Enter Synora →"}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>◆ MEMBERSHIP</Text>
          </View>
          <Text style={styles.title}>₹499 / month</Text>
          <Text style={styles.subtitle}>
            Serious intent means serious access. Unlock Synora in full.
          </Text>
          <View style={styles.features}>
            <Text style={styles.featureItem}>◈  Full discovery access</Text>
            <Text style={styles.featureItem}>◎  Venue mode · real-world matches</Text>
            <Text style={styles.featureItem}>✦  Crossed paths with blurred reveal</Text>
            <Text style={styles.featureItem}>💬  Unlimited comments & chats</Text>
          </View>
          <Pressable
            onPress={() => void handleMockSubscribe()}
            disabled={loading}
            testID="paywall-subscribe-btn"
          >
            <LinearGradient
              colors={Gradients.primaryCta as unknown as readonly [string, string, ...string[]]}
              style={[styles.button, loading && styles.buttonDisabled]}
            >
              <Text style={styles.buttonText}>
                {loading ? "Processing..." : "Subscribe ₹499 / month"}
              </Text>
            </LinearGradient>
          </Pressable>
          <Text style={styles.fineprint}>
            Demo build · Razorpay is MOCKED. No real charge.
          </Text>
        </View>
      )}

      <Modal visible={processingMock} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ActivityIndicator color={Colors.ember} size="large" />
            <Text style={styles.modalTitle}>Processing payment…</Text>
            <Text style={styles.modalSub}>Razorpay (mock) · ₹499 · INR</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.void,
    paddingHorizontal: Space.lg,
    paddingTop: Space.lg,
    paddingBottom: Space.lg,
    gap: Space.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.mist,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { color: Colors.cream, fontSize: 20, marginTop: -2 },
  content: { flex: 1, justifyContent: "center", gap: Space.md },
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: Colors.mist,
    backgroundColor: Colors.dusk,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: { color: Colors.haze, fontSize: 10, letterSpacing: 2, fontWeight: "700" },
  title: {
    color: Colors.cream,
    fontFamily: "serif",
    fontSize: 40,
    fontWeight: "300",
  },
  subtitle: { color: Colors.fog, fontSize: 15, lineHeight: 22 },
  features: {
    borderWidth: 1,
    borderColor: Colors.mist,
    borderRadius: Radius.md,
    padding: Space.md,
    backgroundColor: Colors.obsidian,
    gap: Space.sm,
  },
  featureItem: { color: Colors.cream, fontSize: 14, lineHeight: 20 },
  button: {
    height: 56,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: Colors.cream, fontSize: 16, fontWeight: "600" },
  fineprint: {
    color: Colors.smoke,
    fontSize: 11,
    textAlign: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(8,6,15,0.78)",
    alignItems: "center",
    justifyContent: "center",
    padding: Space.lg,
  },
  modalCard: {
    backgroundColor: Colors.obsidian,
    borderWidth: 1,
    borderColor: Colors.mist,
    borderRadius: Radius.md,
    padding: Space.lg,
    alignItems: "center",
    gap: Space.sm,
    minWidth: 260,
  },
  modalTitle: {
    color: Colors.cream,
    fontSize: 16,
    fontWeight: "600",
    marginTop: Space.sm,
  },
  modalSub: { color: Colors.fog, fontSize: 12 },
});
