import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Constants from "expo-constants";

import { OnboardingProgress } from "@/components/OnboardingProgress";
import { Colors, Gradients, Radius, Space } from "@/constants/theme";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useOnboardingStore } from "@/store/onboardingStore";
import type { Database, User } from "@/types/database";

const RAZORPAY_AMOUNT_PAISE = 49900;
const isExpoGo = Constants.executionEnvironment === "storeClient";

export default function PaywallScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const setUser = useAuthStore((state) => state.setUser);
  const clearOnboarding = useOnboardingStore((state) => state.clearOnboarding);
  const onboarding = useOnboardingStore((state) => state);
  const [loading, setLoading] = useState(false);

  const isFemale = onboarding.gender === "woman";

  const upsertUser = async (subscriptionStatus: "free" | "active") => {
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
      is_approved: false,
      is_founder_approved: false,
      is_banned: false,
      is_invisible: false,
      is_paid: subscriptionStatus === "active",
      subscription_status: subscriptionStatus,
      payment_expires_at: null,
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
  };

  const handleEnterFree = async () => {
    try {
      setLoading(true);
      await upsertUser("free");
      clearOnboarding();
      router.replace("/(auth)/pending");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save your account.";
      Alert.alert("Could not continue", message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    const key = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID;
    if (!key) {
      Alert.alert("Missing payment key", "Set EXPO_PUBLIC_RAZORPAY_KEY_ID in your env.");
      return;
    }
    if (isExpoGo) {
      Alert.alert(
        "Unsupported in Expo Go",
        "Razorpay requires a development build. Use `npx expo run:ios` / EAS dev client to test payments.",
      );
      return;
    }

    try {
      setLoading(true);
      const prefillName = onboarding.fullName || "Synora User";
      const prefillContact = session?.user.phone ?? "";
      const razorpayModule = await import("react-native-razorpay");
      const razorpayCheckout = razorpayModule.default;
      await razorpayCheckout.open({
        key,
        amount: RAZORPAY_AMOUNT_PAISE,
        name: "Synora",
        description: "Synora monthly subscription",
        currency: "INR",
        prefill: {
          name: prefillName,
          contact: prefillContact,
        },
      });

      await upsertUser("active");
      clearOnboarding();
      router.replace("/(auth)/pending");
    } catch (error) {
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
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backIcon}>{"<"}</Text>
      </Pressable>

      {isFemale ? (
        <View style={styles.content}>
          <Text style={styles.title}>Synora is free for women.</Text>
          <Text style={styles.subtitle}>We believe in building a balanced ecosystem.</Text>
          <Pressable onPress={() => void handleEnterFree()} disabled={loading}>
            <LinearGradient colors={Gradients.primaryCta} style={[styles.button, loading && styles.buttonDisabled]}>
              <Text style={styles.buttonText}>{loading ? "Please wait..." : "Enter Synora →"}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.title}>₹499/month</Text>
          <Text style={styles.subtitle}>Unlock full access to Synora.</Text>
          <View style={styles.features}>
            <Text style={styles.featureItem}>• Full access</Text>
            <Text style={styles.featureItem}>• Venue mode</Text>
            <Text style={styles.featureItem}>• Crossed paths</Text>
          </View>
          <Pressable onPress={() => void handleSubscribe()} disabled={loading}>
            <LinearGradient colors={Gradients.primaryCta} style={[styles.button, loading && styles.buttonDisabled]}>
              <Text style={styles.buttonText}>
                {loading ? "Processing..." : "Subscribe ₹499/month"}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}
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
  backIcon: {
    color: Colors.cream,
    fontSize: 20,
    marginTop: -2,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    gap: Space.md,
  },
  title: {
    color: Colors.cream,
    fontFamily: "serif",
    fontSize: 32,
    fontWeight: "300",
  },
  subtitle: {
    color: Colors.fog,
    fontSize: 15,
    lineHeight: 22,
  },
  features: {
    borderWidth: 1,
    borderColor: Colors.mist,
    borderRadius: Radius.md,
    padding: Space.md,
    backgroundColor: Colors.obsidian,
    gap: Space.xs,
  },
  featureItem: {
    color: Colors.cream,
    fontSize: 14,
  },
  button: {
    height: 56,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: Colors.cream,
    fontSize: 16,
    fontWeight: "600",
  },
});
