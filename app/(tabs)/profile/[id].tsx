import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Colors, Space } from "@/constants/theme";

export default function ProfileDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>{`userId: ${id}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.void,
    alignItems: "center",
    justifyContent: "center",
    gap: Space.sm,
  },
  title: {
    color: Colors.cream,
    fontFamily: "serif",
    fontSize: 32,
    fontWeight: "300",
  },
  subtitle: {
    color: Colors.fog,
    fontSize: 14,
  },
});
