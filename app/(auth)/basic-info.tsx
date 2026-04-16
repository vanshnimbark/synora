import { useState } from "react";
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
import type { Gender } from "@/types/database";

const AGES = Array.from({ length: 23 }, (_, index) => index + 18);
const GENDERS: { label: string; value: Gender }[] = [
  { label: "Male", value: "man" },
  { label: "Female", value: "woman" },
  { label: "Other", value: "other" },
];

export default function BasicInfoScreen() {
  const router = useRouter();
  const setBasicInfo = useOnboardingStore((state) => state.setBasicInfo);
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);

  const canContinue = fullName.trim().length > 1 && age !== null && gender !== null;

  const handleContinue = () => {
    if (!canContinue || !age || !gender) {
      Alert.alert("Incomplete", "Please fill your name, age, and gender.");
      return;
    }
    setBasicInfo({ fullName: fullName.trim(), age, gender });
    router.push("/(auth)/paywall");
  };

  return (
    <View style={styles.container}>
      <OnboardingProgress currentStep={4} />
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backIcon}>{"<"}</Text>
      </Pressable>
      <Text style={styles.title}>Basic details.</Text>

      <TextInput
        value={fullName}
        onChangeText={setFullName}
        placeholder="Full name"
        placeholderTextColor={Colors.smoke}
        style={styles.nameInput}
      />

      <View style={styles.section}>
        <Text style={styles.label}>Age</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ageRow}>
          {AGES.map((value) => {
            const selected = age === value;
            return (
              <Pressable
                key={value}
                style={[styles.agePill, selected && styles.agePillSelected]}
                onPress={() => setAge(value)}
              >
                <Text style={[styles.ageText, selected && styles.ageTextSelected]}>{value}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Gender</Text>
        <View style={styles.genderRow}>
          {GENDERS.map((item) => {
            const selected = gender === item.value;
            return (
              <Pressable
                key={item.value}
                style={[styles.genderCard, selected && styles.genderCardSelected]}
                onPress={() => setGender(item.value)}
              >
                <Text style={styles.genderText}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable
        onPress={handleContinue}
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
  nameInput: {
    height: 56,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.mist,
    backgroundColor: Colors.obsidian,
    color: Colors.cream,
    paddingHorizontal: Space.md,
    fontSize: 16,
  },
  section: {
    gap: Space.sm,
  },
  label: {
    color: Colors.fog,
    fontSize: 13,
    fontWeight: "500",
  },
  ageRow: {
    gap: Space.sm,
  },
  agePill: {
    width: 46,
    height: 46,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.mist,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.obsidian,
  },
  agePillSelected: {
    borderColor: Colors.ember,
    backgroundColor: Colors.dusk,
  },
  ageText: {
    color: Colors.cream,
    fontWeight: "500",
  },
  ageTextSelected: {
    color: Colors.ember,
  },
  genderRow: {
    flexDirection: "row",
    gap: Space.sm,
  },
  genderCard: {
    flex: 1,
    minHeight: 64,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.mist,
    backgroundColor: Colors.obsidian,
    alignItems: "center",
    justifyContent: "center",
  },
  genderCardSelected: {
    borderColor: Colors.ember,
    backgroundColor: Colors.dusk,
  },
  genderText: {
    color: Colors.cream,
    fontSize: 15,
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
  disabledWrap: {
    opacity: 0.4,
  },
});
