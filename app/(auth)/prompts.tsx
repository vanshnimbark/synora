import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { OnboardingProgress } from "@/components/OnboardingProgress";
import { Colors, Gradients, Radius, Space } from "@/constants/theme";
import { useOnboardingStore } from "@/store/onboardingStore";

const PROMPTS = [
  "The way to my heart is...",
  "I'm looking for someone who...",
  "My most controversial opinion is...",
  "A perfect evening looks like...",
  "The last thing that made me laugh was...",
  "I know too much about...",
  "My love language is...",
  "You should know that I...",
  "We'll get along if...",
  "Unpopular opinion:",
  "I'm weirdly passionate about...",
  "The best way to ask me out is...",
] as const;

export default function PromptsScreen() {
  const router = useRouter();
  const setPrompts = useOnboardingStore((state) => state.setPrompts);
  const [selected, setSelected] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const canContinue = useMemo(() => {
    if (selected.length !== 2) {
      return false;
    }
    return selected.every((prompt) => answers[prompt]?.trim().length > 0);
  }, [answers, selected]);

  const togglePrompt = (prompt: string) => {
    setSelected((prev) => {
      if (prev.includes(prompt)) {
        const next = prev.filter((item) => item !== prompt);
        setAnswers((old) => {
          const clone = { ...old };
          delete clone[prompt];
          return clone;
        });
        return next;
      }
      if (prev.length >= 2) {
        Alert.alert("Only two prompts", "Please select exactly 2 prompts.");
        return prev;
      }
      return [...prev, prompt];
    });
  };

  const handleContinue = () => {
    if (!canContinue) {
      Alert.alert("Incomplete", "Please answer both selected prompts.");
      return;
    }
    setPrompts(
      selected.map((prompt) => ({
        prompt,
        answer: answers[prompt].trim(),
      })),
    );
    router.push("/(auth)/intent");
  };

  return (
    <View style={styles.container}>
      <OnboardingProgress currentStep={2} />
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backIcon}>{"<"}</Text>
      </Pressable>
      <Text style={styles.title}>Your story.</Text>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {PROMPTS.map((prompt) => {
          const isSelected = selected.includes(prompt);
          return (
            <View key={prompt} style={[styles.promptCard, isSelected && styles.promptCardSelected]}>
              <Pressable onPress={() => togglePrompt(prompt)}>
                <Text style={styles.promptText}>{prompt}</Text>
              </Pressable>
              {isSelected ? (
                <TextInput
                  value={answers[prompt] ?? ""}
                  onChangeText={(value) => setAnswers((prev) => ({ ...prev, [prompt]: value }))}
                  placeholder="Your answer..."
                  placeholderTextColor={Colors.smoke}
                  multiline
                  style={styles.answerInput}
                />
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      <Pressable onPress={handleContinue} disabled={!canContinue} style={!canContinue ? styles.disabledWrap : undefined}>
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
  scrollContent: {
    gap: Space.sm,
    paddingBottom: Space.md,
  },
  promptCard: {
    borderWidth: 1,
    borderColor: Colors.mist,
    borderRadius: Radius.md,
    backgroundColor: Colors.obsidian,
    padding: Space.md,
    gap: Space.sm,
  },
  promptCardSelected: {
    borderColor: Colors.ember,
    backgroundColor: Colors.dusk,
  },
  promptText: {
    color: Colors.cream,
    fontSize: 15,
    fontWeight: "500",
  },
  answerInput: {
    borderWidth: 1,
    borderColor: Colors.mist,
    borderRadius: Radius.sm,
    backgroundColor: Colors.void,
    color: Colors.cream,
    minHeight: 80,
    textAlignVertical: "top",
    padding: Space.sm,
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
