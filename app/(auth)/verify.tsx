import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { Colors, Gradients, Radius, Space } from "@/constants/theme";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "@/store/authStore";
import type { User } from "@/types/database";

type VerifyStep = "phone" | "otp";

// --- Mock OTP Flow ----------------------------------------------------
// We accept any 10-digit phone and any 6-digit code. Under the hood we
// sign the user into Supabase with a deterministic email/password derived
// from the phone so we get a real session for RLS + realtime to work.
// Swap to `supabase.auth.signInWithOtp` (SMS) once Twilio is configured.
const MOCK_OTP_FALLBACK = "123456";

function phoneToEmail(phone: string): string {
  return `${phone}@synora.mock`;
}
function phoneToPassword(phone: string): string {
  // Deterministic so the same phone always yields the same credentials.
  return `Synora!${phone}#mvp`;
}

export default function VerifyScreen() {
  const router = useRouter();
  const { setSession, setUser } = useAuthStore();
  const [step, setStep] = useState<VerifyStep>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    const normalized = phone.replace(/\D/g, "");
    if (normalized.length !== 10) {
      Alert.alert("Invalid phone", "Please enter a valid 10-digit number.");
      return;
    }
    setPhone(normalized);
    setStep("otp");
    // Show hint so the user knows mock code
    setTimeout(() => {
      Alert.alert(
        "Demo mode",
        `OTP sent to +91 ${normalized}. Use code ${MOCK_OTP_FALLBACK} to continue.`,
      );
    }, 150);
  };

  const handleVerifyOtp = async () => {
    const trimmed = otp.trim();
    if (trimmed.length !== 6) {
      Alert.alert("Invalid code", "Please enter the 6-digit OTP.");
      return;
    }

    try {
      setLoading(true);

      const email = phoneToEmail(phone);
      const password = phoneToPassword(phone);

      // Try sign in; if user doesn't exist, sign up.
      let signInRes = await supabase.auth.signInWithPassword({ email, password });

      if (signInRes.error || !signInRes.data.session) {
        const signUpRes = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { phone: `+91${phone}` },
          },
        });
        if (signUpRes.error) {
          throw signUpRes.error;
        }
        // If email confirmation is enforced, there's no session yet — try sign-in again.
        if (!signUpRes.data.session) {
          const retry = await supabase.auth.signInWithPassword({ email, password });
          if (retry.error || !retry.data.session) {
            throw new Error(
              "Could not establish a session. Disable email confirmations in Supabase → Auth → Providers.",
            );
          }
          signInRes = retry;
        } else {
          signInRes = { data: signUpRes.data, error: null } as typeof signInRes;
        }
      }

      const session = signInRes.data.session!;
      const authUserId = session.user.id;
      setSession(session);

      // Look up existing user profile
      const { data: existingUser, error: userLookupError, status } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", authUserId)
        .maybeSingle<User>();

      if (userLookupError && status !== 406) {
        throw userLookupError;
      }

      if (existingUser) {
        setUser(existingUser);
        router.replace("/(tabs)/discover");
        return;
      }

      router.replace("/(auth)/profile-setup");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to verify the code.";
      Alert.alert("Verification failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.backButton}
        onPress={() => {
          if (step === "otp") {
            setStep("phone");
            setOtp("");
          } else {
            router.back();
          }
        }}
        testID="verify-back-btn"
      >
        <Text style={styles.backIcon}>{"<"}</Text>
      </Pressable>

      <View style={styles.content}>
        <Text style={styles.kicker}>{step === "phone" ? "STEP 2 OF 5" : "STEP 2 OF 5 · OTP"}</Text>
        <Text style={styles.title}>
          {step === "phone" ? "Verify your phone." : "Enter the code."}
        </Text>
        <Text style={styles.subtitle}>
          {step === "phone"
            ? "We'll send a one-time code to confirm it's you."
            : `Demo code: ${MOCK_OTP_FALLBACK} — sent to +91 ${phone}`}
        </Text>

        {step === "phone" ? (
          <View style={styles.inputWrap}>
            <View style={styles.prefixBox}>
              <Text style={styles.prefixText}>+91</Text>
            </View>
            <TextInput
              value={phone}
              onChangeText={(value) => setPhone(value.replace(/\D/g, "").slice(0, 10))}
              keyboardType="number-pad"
              placeholder="10-digit phone number"
              placeholderTextColor={Colors.smoke}
              style={styles.phoneInput}
              testID="verify-phone-input"
            />
          </View>
        ) : (
          <TextInput
            value={otp}
            onChangeText={(value) => setOtp(value.replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            placeholder="123456"
            placeholderTextColor={Colors.smoke}
            style={styles.otpInput}
            testID="verify-otp-input"
          />
        )}
      </View>

      <Pressable
        onPress={step === "phone" ? handleSendCode : handleVerifyOtp}
        disabled={loading}
        testID="verify-continue-btn"
      >
        <LinearGradient
          colors={Gradients.primaryCta as unknown as readonly [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.button, loading && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>
            {loading ? "Please wait..." : step === "phone" ? "Send Code" : "Continue"}
          </Text>
        </LinearGradient>
      </Pressable>
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
  content: { flex: 1, marginTop: Space.xl, gap: Space.sm },
  kicker: { color: Colors.haze, fontSize: 10, letterSpacing: 3, fontWeight: "600" },
  title: {
    color: Colors.cream,
    fontFamily: "serif",
    fontSize: 34,
    fontWeight: "300",
    marginBottom: Space.xs,
  },
  subtitle: { color: Colors.fog, fontSize: 14, lineHeight: 21, marginBottom: Space.lg },
  inputWrap: { flexDirection: "row", gap: Space.sm },
  prefixBox: {
    width: 72,
    height: 58,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.mist,
    backgroundColor: Colors.obsidian,
    alignItems: "center",
    justifyContent: "center",
  },
  prefixText: { color: Colors.cream, fontSize: 18, fontWeight: "600" },
  phoneInput: {
    flex: 1,
    height: 58,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.mist,
    backgroundColor: Colors.obsidian,
    color: Colors.cream,
    fontSize: 18,
    paddingHorizontal: Space.md,
  },
  otpInput: {
    height: 68,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.mist,
    backgroundColor: Colors.obsidian,
    color: Colors.cream,
    textAlign: "center",
    fontSize: 34,
    letterSpacing: 8,
    fontWeight: "600",
  },
  button: {
    height: 56,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: Colors.cream, fontSize: 16, fontWeight: "600" },
});
