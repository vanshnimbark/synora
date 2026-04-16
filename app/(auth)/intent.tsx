import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { OnboardingProgress } from "@/components/OnboardingProgress";
import { Colors, Gradients, Radius, Space } from "@/constants/theme";
import { useOnboardingStore, type IntentOption } from "@/store/onboardingStore";

const OPTIONS: { key: Exclude<IntentOption, null>; icon: string; label: string; subtitle: string }[] = [
  { key: "serious", icon: "💍", label: "Serious", subtitle: "Looking for something real" },
  { key: "casual", icon: "☀️", label: "Casual", subtitle: "Open, no pressure" },
  { key: "exploring", icon: "🔍", label: "Exploring", subtitle: "Just seeing what's out there" },
];

export default function IntentScreen() {
  const router = useRouter();
  const intent = useOnboardingStore((state) => state.intent);
  const setIntent = useOnboardingStore((state) => state.setIntent);
  const canContinue = Boolean(intent);

  return (
    <View style={styles.container}>
      <OnboardingProgress currentStep={3} />
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backIcon}>{"<"}</Text>
      </Pressable>

      <Text style={styles.title}>Your intent.</Text>
      <View style={styles.cardStack}>
        {OPTIONS.map((option) => {
          const selected = intent === option.key;
          return (
            <Pressable key={option.key} onPress={() => setIntent(option.key)}>
              {selected ? (
                <LinearGradient colors={Gradients.primaryCta} style={styles.gradientBorder}>
                  <View style={[styles.card, styles.cardSelected]}>
                    <Text style={styles.cardTitle}>{`${option.icon} ${option.label}`}</Text>
                    <Text style={styles.cardSubtitle}>{option.subtitle}</Text>
                  </View>
                </LinearGradient>
              ) : (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>{`${option.icon} ${option.label}`}</Text>
                  <Text style={styles.cardSubtitle}>{option.subtitle}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => router.push("/(auth)/basic-info")}
        disabled={!canContinue}
        style={!canContinue ? styles.disabledWrap : undefined}
      >
        <LinearGradient colors={Gradients.primaryCta} style={styles.button}>
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
  title: {
    color: Colors.cream,
    fontFamily: "serif",
    fontSize: 32,
    fontWeight: "300",
  },
  cardStack: {
    flex: 1,
    gap: Space.md,
  },
  gradientBorder: {
    borderRadius: Radius.md,
    padding: 1,
  },
  card: {
    borderWidth: 1,
    borderColor: Colors.mist,
    borderRadius: Radius.md,
    backgroundColor: Colors.obsidian,
    padding: Space.md,
    minHeight: 104,
    justifyContent: "center",
    gap: Space.xs,
  },
  cardSelected: {
    borderWidth: 0,
    backgroundColor: Colors.dusk,
  },
  cardTitle: {
    color: Colors.cream,
    fontSize: 18,
    fontWeight: "600",
  },
  cardSubtitle: {
    color: Colors.fog,
    fontSize: 14,
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
  disabledWrap: {
    opacity: 0.4,
  },
});
