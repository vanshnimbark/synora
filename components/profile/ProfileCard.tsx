import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

import { MatchCelebration } from "@/components/MatchCelebration";
import { ReportBottomSheet } from "@/components/ReportBottomSheet";
import { Colors, Gradients, Radius, Space } from "@/constants/theme";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "@/store/authStore";
import type { Match, User } from "@/types/database";

interface ProfileCardProps {
  profile: User & { hasActiveVenuePresence?: boolean };
}

export function ProfileCard({ profile }: ProfileCardProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const currentUser = useAuthStore((state) => state.user);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [commentExpanded, setCommentExpanded] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [badgePulse] = useState(() => new Animated.Value(0.4));
  const [commentHeight] = useState(() => new Animated.Value(0));
  const cardWidth = useMemo(() => width - Space.md * 2, [width]);
  const photos = profile.photo_urls?.length ? profile.photo_urls : profile.avatar_url ? [profile.avatar_url] : [];

  useEffect(() => {
    if (!profile.hasActiveVenuePresence) {
      return;
    }
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(badgePulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(badgePulse, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ]),
    );
    pulseAnim.start();
    return () => pulseAnim.stop();
  }, [badgePulse, profile.hasActiveVenuePresence]);

  const toggleComment = () => {
    const next = !commentExpanded;
    setCommentExpanded(next);
    Animated.timing(commentHeight, {
      toValue: next ? 120 : 0,
      duration: 240,
      useNativeDriver: false,
    }).start();
  };

  const checkMutualMatch = async () => {
    if (!currentUser) {
      return;
    }
    const { data } = await supabase
      .from("matches")
      .select("*")
      .or(
        `and(user_one_id.eq.${currentUser.id},user_two_id.eq.${profile.id}),and(user_one_id.eq.${profile.id},user_two_id.eq.${currentUser.id})`,
      )
      .limit(1)
      .maybeSingle<Match>();

    if (data?.id) {
      setActiveMatchId(data.id);
      setShowMatchModal(true);
    }
  };

  const handleSendComment = async () => {
    if (!currentUser) {
      Alert.alert("Not signed in", "Please sign in again.");
      return;
    }
    const trimmed = commentText.trim();
    if (!trimmed) {
      Alert.alert("Empty comment", "Write something first.");
      return;
    }

    try {
      setSendingComment(true);
      const payload = {
        from_user: currentUser.id,
        to_user: profile.id,
        prompt_index: 0,
        comment_text: trimmed,
      };
      const { error } = await supabase.from("comments").insert(payload as never);
      if (error) {
        throw error;
      }
      setCommentText("");
      await checkMutualMatch();
      toggleComment();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send comment.";
      Alert.alert("Could not send", message);
    } finally {
      setSendingComment(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.photoWrap}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / cardWidth);
            setPhotoIndex(index);
          }}
        >
          {photos.length ? (
            photos.map((photo) => (
              <Image key={photo} source={{ uri: photo }} style={[styles.photo, { width: cardWidth }]} resizeMode="cover" />
            ))
          ) : (
            <View style={[styles.photoFallback, { width: cardWidth }]} />
          )}
        </ScrollView>

        <LinearGradient
          colors={["transparent", Colors.void]}
          style={styles.photoOverlay}
        />

        {profile.hasActiveVenuePresence ? (
          <LinearGradient colors={Gradients.venueMode} style={styles.hereBadge}>
            <Animated.View style={[styles.hereDot, { opacity: badgePulse }]} />
            <Text style={styles.hereText}>HERE NOW</Text>
          </LinearGradient>
        ) : null}

        <View style={styles.bottomInfo}>
          <Text style={styles.nameText}>{profile.full_name}</Text>
          <Text style={styles.metaText}>{`${profile.age} • Nearby`}</Text>
        </View>

        <Pressable style={styles.menuBtn} onPress={() => setShowReportSheet(true)}>
          <Text style={styles.menuIcon}>⋯</Text>
        </Pressable>

        <View style={styles.dotsWrap}>
          {photos.map((_, idx) => (
            <View key={`${idx}-dot`} style={[styles.dot, idx === photoIndex && styles.dotActive]} />
          ))}
        </View>
      </View>

      <View style={styles.tagsRow}>
        <View style={styles.intentTag}>
          <Text style={styles.intentTagText}>{profile.intent ?? "Open to connect"}</Text>
        </View>
        {(profile.city ? [profile.city] : ["Nearby"]).slice(0, 2).map((tag) => (
          <View key={tag} style={styles.interestTag}>
            <Text style={styles.interestTagText}>{tag}</Text>
          </View>
        ))}
      </View>

      <View style={styles.promptCard}>
        <Text style={styles.promptLabel}>{(profile.prompt_one ?? "The way to my heart is...").toUpperCase()}</Text>
        <Text style={styles.promptAnswer}>{profile.prompt_one_answer ?? "Tell me what makes you smile."}</Text>
      </View>

      <Pressable onPress={toggleComment}>
        <LinearGradient colors={Gradients.primaryCta} style={styles.commentBtn}>
          <Text style={styles.commentBtnText}>💬 Comment to Connect</Text>
        </LinearGradient>
      </Pressable>

      <Animated.View style={[styles.commentExpand, { height: commentHeight }]}>
        <Text style={styles.commentHint}>{`Commenting on: ${profile.prompt_one ?? "Prompt #1"}`}</Text>
        <TextInput
          value={commentText}
          onChangeText={setCommentText}
          placeholder="Write your comment..."
          placeholderTextColor={Colors.smoke}
          multiline
          style={styles.commentInput}
        />
        <Pressable onPress={() => void handleSendComment()} disabled={sendingComment}>
          <LinearGradient colors={Gradients.primaryCta} style={styles.sendBtn}>
            <Text style={styles.sendBtnText}>{sendingComment ? "..." : "Send"}</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>

      <MatchCelebration
        visible={showMatchModal}
        name={profile.full_name}
        matchId={activeMatchId}
        onKeepExploring={() => setShowMatchModal(false)}
        onStartConversation={(matchId) => {
          setShowMatchModal(false);
          router.push(`/(tabs)/chat/${matchId}`);
        }}
      />
      <ReportBottomSheet
        visible={showReportSheet}
        onClose={() => setShowReportSheet(false)}
        reportedId={profile.id}
        reportedName={profile.full_name}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Space.md,
  },
  photoWrap: {
    height: 260,
    borderRadius: Radius.lg,
    overflow: "hidden",
    backgroundColor: Colors.dusk,
  },
  photo: {
    height: 260,
  },
  photoFallback: {
    height: 260,
    backgroundColor: Colors.dusk,
  },
  photoOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "40%",
  },
  hereBadge: {
    position: "absolute",
    top: Space.sm,
    right: Space.sm,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.sm,
    paddingVertical: Space.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  hereDot: {
    width: 6,
    height: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.cream,
  },
  hereText: {
    color: Colors.cream,
    fontSize: 10,
    fontWeight: "700",
  },
  bottomInfo: {
    position: "absolute",
    left: Space.md,
    bottom: Space.md,
  },
  nameText: {
    color: Colors.cream,
    fontFamily: "serif",
    fontSize: 24,
    fontWeight: "300",
  },
  metaText: {
    color: Colors.fog,
    fontSize: 18,
  },
  dotsWrap: {
    position: "absolute",
    bottom: Space.sm,
    right: Space.md,
    flexDirection: "row",
    gap: 5,
  },
  menuBtn: {
    position: "absolute",
    right: Space.sm,
    top: Space.sm,
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.mist,
    backgroundColor: Colors.void,
    alignItems: "center",
    justifyContent: "center",
  },
  menuIcon: {
    color: Colors.cream,
    fontSize: 16,
    marginTop: -4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.smoke,
  },
  dotActive: {
    backgroundColor: Colors.cream,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.sm,
  },
  intentTag: {
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.mist,
    backgroundColor: Colors.dusk,
    paddingHorizontal: Space.sm,
    paddingVertical: 6,
  },
  intentTagText: {
    color: Colors.cream,
    fontSize: 12,
    fontWeight: "500",
  },
  interestTag: {
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.mist,
    backgroundColor: Colors.obsidian,
    paddingHorizontal: Space.sm,
    paddingVertical: 6,
  },
  interestTagText: {
    color: Colors.fog,
    fontSize: 12,
  },
  promptCard: {
    backgroundColor: Colors.dusk,
    borderWidth: 1,
    borderColor: Colors.mist,
    borderRadius: 18,
    padding: Space.md,
    gap: 8,
  },
  promptLabel: {
    color: Colors.smoke,
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "600",
  },
  promptAnswer: {
    color: Colors.cream,
    fontSize: 14,
    lineHeight: 22,
  },
  commentBtn: {
    height: 52,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  commentBtnText: {
    color: Colors.cream,
    fontSize: 16,
    fontWeight: "600",
  },
  commentExpand: {
    overflow: "hidden",
    gap: Space.sm,
  },
  commentHint: {
    color: Colors.fog,
    fontSize: 11,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: Colors.mist,
    borderRadius: 12,
    backgroundColor: Colors.dusk,
    color: Colors.cream,
    minHeight: 72,
    padding: Space.sm,
    textAlignVertical: "top",
  },
  sendBtn: {
    alignSelf: "flex-end",
    paddingHorizontal: Space.md,
    height: 34,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnText: {
    color: Colors.cream,
    fontSize: 12,
    fontWeight: "600",
  },
});
