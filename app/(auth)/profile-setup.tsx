import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";

import { OnboardingProgress } from "@/components/OnboardingProgress";
import { Colors, Gradients, Radius, Space } from "@/constants/theme";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useOnboardingStore } from "@/store/onboardingStore";

export default function ProfileSetupScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const setPhotoAt = useOnboardingStore((state) => state.setPhotoAt);
  const [slots, setSlots] = useState<(string | null)[]>(Array(6).fill(null));
  const [loadingSlot, setLoadingSlot] = useState<number | null>(null);

  const filledPhotos = slots.filter((slot): slot is string => Boolean(slot)).length;
  const canContinue = filledPhotos >= 3;

  const uploadPhoto = async (uri: string): Promise<string> => {
    const userId = session?.user.id;
    if (!userId) {
      throw new Error("You must be signed in to upload photos.");
    }

    const response = await fetch(uri);
    const blob = await response.blob();
    const filePath = `${userId}/${Date.now()}.jpg`;

    const { error } = await supabase.storage
      .from("profile-photos")
      .upload(filePath, blob, { contentType: "image/jpeg", upsert: false });

    if (error) {
      throw error;
    }

    const { data } = supabase.storage.from("profile-photos").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handlePick = async (index: number) => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Please allow photo library access.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      setLoadingSlot(index);
      const publicUrl = await uploadPhoto(result.assets[0].uri);
      setSlots((prev) => {
        const next = [...prev];
        next[index] = publicUrl;
        return next;
      });
      setPhotoAt(index, publicUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload photo.";
      Alert.alert("Upload failed", message);
    } finally {
      setLoadingSlot(null);
    }
  };

  return (
    <View style={styles.container}>
      <OnboardingProgress currentStep={1} />

      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backIcon}>{"<"}</Text>
      </Pressable>

      <Text style={styles.title}>Your photos.</Text>

      <View style={styles.grid}>
        {slots.map((photo, index) => (
          <Pressable key={`${index}-slot`} style={styles.slot} onPress={() => void handlePick(index)}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.image} />
            ) : (
              <View style={styles.emptySlot}>
                {loadingSlot === index ? (
                  <ActivityIndicator color={Colors.cream} />
                ) : (
                  <Text style={styles.plus}>+</Text>
                )}
              </View>
            )}
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={() => router.push("/(auth)/prompts")}
        disabled={!canContinue}
        style={!canContinue ? styles.disabledWrap : undefined}
      >
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: Space.md,
    marginTop: Space.sm,
    marginBottom: Space.md,
  },
  slot: {
    width: "48%",
    aspectRatio: 3 / 4,
    borderRadius: Radius.md,
    overflow: "hidden",
  },
  emptySlot: {
    flex: 1,
    borderRadius: Radius.md,
    backgroundColor: Colors.dusk,
    borderWidth: 1,
    borderColor: Colors.mist,
    alignItems: "center",
    justifyContent: "center",
  },
  plus: {
    color: Colors.fog,
    fontSize: 32,
    fontWeight: "500",
  },
  image: {
    width: "100%",
    height: "100%",
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
