import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { Colors, Gradients, Radius, Space } from "@/constants/theme";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "@/store/authStore";

const REASONS = [
  "Fake Profile",
  "Inappropriate Content",
  "Harassment",
  "Spam",
  "Other",
] as const;

interface ReportBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  reportedId: string;
  reportedName: string;
}

export function ReportBottomSheet({
  visible,
  onClose,
  reportedId,
  reportedName,
}: ReportBottomSheetProps) {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);
  const [selectedReason, setSelectedReason] = useState<string>(REASONS[0]);
  const [details, setDetails] = useState("");
  const slideY = useRef(new Animated.Value(360)).current;

  useEffect(() => {
    Animated.timing(slideY, {
      toValue: visible ? 0 : 360,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [slideY, visible]);

  const submitReport = async () => {
    if (!currentUser?.id) {
      return;
    }
    const payload = {
      reporter_id: currentUser.id,
      reported_id: reportedId,
      reason: selectedReason,
      details: details.trim() || null,
    };
    const { error } = await supabase.from("reports").insert(payload as never);
    if (error) {
      Alert.alert("Could not submit report", error.message);
      return;
    }
    Alert.alert("Report submitted");
    onClose();
    setDetails("");
    setSelectedReason(REASONS[0]);
  };

  const blockUser = async () => {
    if (!currentUser?.id) {
      return;
    }

    await supabase
      .from("blocks")
      .insert({ blocker_id: currentUser.id, blocked_id: reportedId } as never);

    await supabase
      .from("matches")
      .delete()
      .or(
        `and(user_one_id.eq.${currentUser.id},user_two_id.eq.${reportedId}),and(user_one_id.eq.${reportedId},user_two_id.eq.${currentUser.id})`,
      );

    Alert.alert("User blocked");
    onClose();
    router.replace("/(tabs)/discover");
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideY }] }]}>
          <Pressable>
            <Text style={styles.title}>{`Report ${reportedName}`}</Text>
            <View style={styles.reasons}>
              {REASONS.map((reason) => (
                <Pressable
                  key={reason}
                  style={[
                    styles.reasonRow,
                    selectedReason === reason && styles.reasonRowSelected,
                  ]}
                  onPress={() => setSelectedReason(reason)}
                >
                  <Text style={styles.reasonText}>{reason}</Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              value={details}
              onChangeText={setDetails}
              placeholder="Add details (optional)"
              placeholderTextColor={Colors.smoke}
              style={styles.detailsInput}
              multiline
            />

            <Pressable onPress={() => void submitReport()}>
              <LinearGradient colors={Gradients.primaryCta} style={styles.submitBtn}>
                <Text style={styles.submitText}>Submit Report</Text>
              </LinearGradient>
            </Pressable>

            <Pressable style={styles.blockBtn} onPress={() => void blockUser()}>
              <Text style={styles.blockText}>{`Block ${reportedName}`}</Text>
            </Pressable>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(8,6,15,0.6)",
  },
  sheet: {
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    backgroundColor: Colors.obsidian,
    borderWidth: 1,
    borderColor: Colors.mist,
    padding: Space.md,
    gap: Space.sm,
  },
  title: {
    color: Colors.cream,
    fontSize: 20,
    fontFamily: "serif",
    fontWeight: "300",
    marginBottom: Space.sm,
  },
  reasons: {
    gap: 6,
  },
  reasonRow: {
    minHeight: 42,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.mist,
    backgroundColor: Colors.dusk,
    justifyContent: "center",
    paddingHorizontal: Space.sm,
  },
  reasonRowSelected: {
    borderColor: Colors.ember,
  },
  reasonText: {
    color: Colors.cream,
    fontSize: 14,
  },
  detailsInput: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.mist,
    backgroundColor: Colors.dusk,
    color: Colors.cream,
    minHeight: 84,
    textAlignVertical: "top",
    padding: Space.sm,
    marginTop: Space.sm,
  },
  submitBtn: {
    height: 48,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Space.sm,
  },
  submitText: {
    color: Colors.cream,
    fontSize: 15,
    fontWeight: "600",
  },
  blockBtn: {
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    marginTop: 4,
  },
  blockText: {
    color: Colors.ember,
    fontSize: 14,
    fontWeight: "600",
  },
});
