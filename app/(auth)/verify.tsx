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

export default function VerifyScreen() {
  const router = useRouter();
  const { setSession, setUser } = useAuthStore();
  const [step, setStep] = useState<VerifyStep>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const phoneE164 = `+91${phone}`;

  const handleSendCode = async () => {
    const normalized = phone.replace(/\D/g, "");
    if (normalized.length !== 10) {
      Alert.alert("Invalid phone", "Please enter a valid 10-digit number.");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOtp({
        phone: `+91${normalized}`,
      });

      if (error) {
        throw error;
      }

      setPhone(normalized);
      setStep("otp");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to send verification code.";
      Alert.alert("Failed to send code", message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.trim().length !== 6) {
      Alert.alert("Invalid code", "Please enter the 6-digit OTP.");
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phoneE164,
        token: otp.trim(),
        type: "sms",
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        setSession(data.session);
      }

      const authUserId = data.user?.id;
      if (!authUserId) {
        throw new Error("Auth session could not be established.");
      }

      const {
        data: existingUser,
        error: userLookupError,
        status,
      } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", authUserId)
        .maybeSingle<User>();

      if (userLookupError && status !== 406) {
        throw userLookupError;
      }

      if (existingUser) {
        setUser(existingUser);
        router.replace("/(tabs)");
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
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backIcon}>{"<"}</Text>
      </Pressable>

      <View style={styles.content}>
        <Text style={styles.title}>Verify your phone</Text>

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
          />
        )}
      </View>

      <Pressable
        onPress={step === "phone" ? handleSendCode : handleVerifyOtp}
        disabled={loading}
      >
        <LinearGradient
          colors={Gradients.primaryCta}
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
  backIcon: {
    color: Colors.cream,
    fontSize: 20,
    marginTop: -2,
  },
  content: {
    flex: 1,
    marginTop: Space.xl,
  },
  title: {
    color: Colors.cream,
    fontFamily: "serif",
    fontSize: 32,
    fontWeight: "300",
    marginBottom: Space.lg,
  },
  inputWrap: {
    flexDirection: "row",
    gap: Space.sm,
  },
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
  prefixText: {
    color: Colors.cream,
    fontSize: 18,
    fontWeight: "600",
  },
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
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: Colors.cream,
    fontSize: 16,
    fontWeight: "600",
  },
});
