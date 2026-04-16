import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Colors, Gradients, Radius, Space } from "@/constants/theme";

interface OnboardingProgressProps {
  currentStep: number;
}

export function OnboardingProgress({ currentStep }: OnboardingProgressProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {Array.from({ length: 5 }).map((_, index) => {
          const step = index + 1;
          const done = step <= currentStep;
          if (done) {
            return (
              <LinearGradient
                key={step}
                colors={Gradients.primaryCta}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.segment}
              />
            );
          }
          return <View key={step} style={[styles.segment, styles.pending]} />;
        })}
      </View>
      <Text style={styles.label}>{`Step ${currentStep} of 5`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Space.sm,
  },
  row: {
    flexDirection: "row",
    gap: Space.xs,
  },
  segment: {
    flex: 1,
    height: 6,
    borderRadius: Radius.pill,
  },
  pending: {
    backgroundColor: Colors.mist,
  },
  label: {
    color: Colors.fog,
    fontSize: 12,
    fontWeight: "500",
  },
});
