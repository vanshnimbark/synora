import { Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { Colors, Radius, Space } from "@/constants/theme";
import { supabase } from "../../../lib/supabase";
import { useAuthStore } from "@/store/authStore";

export default function OwnProfileScreen() {
  const router = useRouter();
  const { user, clearAuth, setUser } = useAuthStore();
  const isInvisible = user?.is_invisible ?? false;

  const updateInvisible = async (nextValue: boolean) => {
    if (!user?.id) {
      return;
    }
    const { error } = await supabase
      .from("users")
      .update({ is_invisible: nextValue } as never)
      .eq("id", user.id);
    if (error) {
      Alert.alert("Update failed", error.message);
      return;
    }
    setUser({ ...user, is_invisible: nextValue });
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Profile</Text>
        <Pressable>
          <Text style={styles.editText}>Edit</Text>
        </Pressable>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatar} />
        <View style={styles.meta}>
          <Text style={styles.name}>{user?.full_name ?? "Your profile"}</Text>
          <Text style={styles.subtle}>{`@${user?.handle ?? "synora"}`}</Text>
        </View>
      </View>

      <View style={styles.settingsList}>
        <View style={styles.settingRow}>
          <Text style={styles.settingText}>Go Invisible</Text>
          <Switch
            value={isInvisible}
            onValueChange={(next) => void updateInvisible(next)}
            trackColor={{ false: Colors.mist, true: Colors.haze }}
            thumbColor={Colors.cream}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingText}>Subscription status</Text>
          <Text style={styles.valueText}>{user?.subscription_status ?? "inactive"}</Text>
        </View>

        <Pressable style={styles.settingRow}>
          <Text style={styles.settingText}>About Synora</Text>
          <Text style={styles.valueText}>{">"}</Text>
        </Pressable>

        <Pressable
          style={styles.settingRow}
          onPress={async () => {
            await supabase.auth.signOut();
            clearAuth();
            router.replace("/(auth)");
          }}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.void,
    padding: Space.md,
    gap: Space.md,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  header: {
    color: Colors.cream,
    fontFamily: "serif",
    fontSize: 30,
    fontWeight: "300",
  },
  editText: {
    color: Colors.ember,
    fontSize: 14,
    fontWeight: "600",
  },
  profileCard: {
    borderWidth: 1,
    borderColor: Colors.mist,
    borderRadius: Radius.md,
    backgroundColor: Colors.obsidian,
    padding: Space.md,
    flexDirection: "row",
    gap: Space.sm,
    alignItems: "center",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: Radius.pill,
    backgroundColor: Colors.dusk,
  },
  meta: {
    flex: 1,
  },
  name: {
    color: Colors.cream,
    fontSize: 16,
    fontWeight: "700",
  },
  subtle: {
    color: Colors.fog,
    fontSize: 12,
    marginTop: 2,
  },
  settingsList: {
    borderWidth: 1,
    borderColor: Colors.mist,
    borderRadius: Radius.md,
    backgroundColor: Colors.obsidian,
  },
  settingRow: {
    minHeight: 54,
    paddingHorizontal: Space.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: Colors.mist,
  },
  settingText: {
    color: Colors.cream,
    fontSize: 14,
  },
  valueText: {
    color: Colors.fog,
    fontSize: 13,
  },
  signOutText: {
    color: Colors.ember,
    fontSize: 14,
    fontWeight: "600",
  },
});
