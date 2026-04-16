import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";

import { Colors, Gradients, Radius, Space } from "@/constants/theme";

export default function InviteCodeScreen() {
  const router = useRouter();
  const [code, setCode] = useState("");

  const handleContinue = () => {
    const normalized = code.trim().toUpperCase();
    if (!normalized.startsWith("SYN")) {
      Alert.alert("Invalid code", "Please enter a valid invite code.");
      return;
    }
    router.push("/(auth)/verify");
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backIcon}>{"<"}</Text>
      </Pressable>

      <View style={styles.content}>
        <Text style={styles.title}>{"You're invited."}</Text>
        <TextInput
          value={code}
          onChangeText={setCode}
          placeholder="SYN-XXXX"
          placeholderTextColor={Colors.smoke}
          autoCapitalize="characters"
          autoCorrect={false}
          style={styles.input}
        />
      </View>

      <Pressable onPress={handleContinue}>
        <LinearGradient
          colors={Gradients.primaryCta}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Continue</Text>
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
  input: {
    height: 58,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.mist,
    backgroundColor: Colors.obsidian,
    color: Colors.cream,
    textAlign: "center",
    fontSize: 22,
    letterSpacing: 3,
    fontWeight: "500",
  },
  button: {
    height: 56,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: Colors.cream,
    fontSize: 16,
    fontWeight: "600",
  },
});
