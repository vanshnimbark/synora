import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { Colors, Space } from "@/constants/theme";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "@/store/authStore";
import type { User } from "@/types/database";

export default function PendingApprovalScreen() {
  const router = useRouter();
  const pulse = useRef(new Animated.Value(0.4)).current;
  const session = useAuthStore((state) => state.session);
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  useEffect(() => {
    const authId = session?.user.id;
    if (!authId) {
      return;
    }

    const pollApproval = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", authId)
        .single<User>();

      if (error || !data) {
        return;
      }

      const approved = data.is_approved || data.is_founder_approved;
      if (approved) {
        setUser(data);
        router.replace("/(tabs)/discover");
      }
    };

    void pollApproval();
    const interval = setInterval(() => {
      void pollApproval();
    }, 30000);

    return () => clearInterval(interval);
  }, [router, session, setUser]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoMark, { opacity: pulse }]} />
      <Text style={styles.title}>Your profile is being reviewed.</Text>
      <Text style={styles.subtitle}>
        We manually review each profile to keep Synora intentional and high quality.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.void,
    alignItems: "center",
    justifyContent: "center",
    padding: Space.lg,
    gap: Space.md,
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.ember,
  },
  title: {
    color: Colors.cream,
    fontFamily: "serif",
    fontSize: 32,
    fontWeight: "300",
    textAlign: "center",
  },
  subtitle: {
    color: Colors.fog,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
});
