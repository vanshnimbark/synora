import { useState } from "react";
import {
  Alert,
  Animated,
  Image,
  Pressable,
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

type PromptAnchor = {
  kind: "prompt";
  label: string;
  answer: string;
  index: number;
};
type PhotoAnchor = { kind: "photo"; uri: string };
type CardAnchor = PromptAnchor | PhotoAnchor;

export function ProfileCard({ profile }: ProfileCardProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const currentUser = useAuthStore((state) => state.user);
  const [commentTarget, setCommentTarget] = useState<PromptAnchor | null>(null);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);

  const cardWidth = Math.min(width, 520) - Space.md * 2;
  const photoHeight = Math.round(cardWidth * 1.25); // 4:5

  const photos = profile.photo_urls?.length
    ? profile.photo_urls
    : profile.avatar_url
      ? [profile.avatar_url]
      : [];

  const prompts: PromptAnchor[] = [];
  if (profile.prompt_one && profile.prompt_one_answer) {
    prompts.push({
      kind: "prompt",
      label: profile.prompt_one,
      answer: profile.prompt_one_answer,
      index: 0,
    });
  }
  if (profile.prompt_two && profile.prompt_two_answer) {
    prompts.push({
      kind: "prompt",
      label: profile.prompt_two,
      answer: profile.prompt_two_answer,
      index: 1,
    });
  }

  // Interleave: photo, prompt, photo, prompt, photo...
  const stack: CardAnchor[] = [];
  const maxLen = Math.max(photos.length, prompts.length);
  for (let i = 0; i < maxLen; i += 1) {
    if (i < photos.length) stack.push({ kind: "photo", uri: photos[i] });
    if (i < prompts.length) stack.push(prompts[i]);
  }
  // If no prompts at all, still show photos
  if (!prompts.length) {
    stack.push(...photos.map<PhotoAnchor>((uri) => ({ kind: "photo", uri })));
  }

  const checkMutualMatch = async () => {
    if (!currentUser) return;
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

  const sendComment = async () => {
    if (!currentUser) {
      Alert.alert("Not signed in", "Please sign in again.");
      return;
    }
    if (!commentTarget) return;
    const trimmed = commentText.trim();
    if (!trimmed) {
      Alert.alert("Empty comment", "Write something first.");
      return;
    }
    try {
      setSending(true);
      const { error } = await supabase.from("comments").insert({
        from_user: currentUser.id,
        to_user: profile.id,
        prompt_index: commentTarget.index,
        comment_text: trimmed,
      } as never);
      if (error) throw error;
      setCommentText("");
      setCommentTarget(null);
      await checkMutualMatch();
    } catch (err) {
      Alert.alert(
        "Could not send",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.cardWrap}>
      {/* HEADLINE — sticky above card */}
      <View style={styles.headline}>
        <View style={styles.headlineRow}>
          <Text style={styles.name}>{profile.full_name}</Text>
          <Pressable
            style={styles.menuBtn}
            onPress={() => setShowReportSheet(true)}
            testID="profile-menu-btn"
          >
            <Text style={styles.menuIcon}>•••</Text>
          </Pressable>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{profile.age}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>Nearby</Text>
          {profile.city ? (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>{profile.city}</Text>
            </>
          ) : null}
          {profile.intent ? (
            <View style={styles.intentChip}>
              <Text style={styles.intentChipText}>{profile.intent}</Text>
            </View>
          ) : null}
          {profile.hasActiveVenuePresence ? (
            <LinearGradient
              colors={Gradients.venueMode as unknown as readonly [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.hereBadge}
            >
              <View style={styles.hereDot} />
              <Text style={styles.hereText}>HERE NOW</Text>
            </LinearGradient>
          ) : null}
        </View>
      </View>

      {/* INTERLEAVED STACK */}
      <View style={{ gap: Space.md }}>
        {stack.map((item, idx) => {
          if (item.kind === "photo") {
            return (
              <View
                key={`p-${idx}`}
                style={[styles.photoCard, { width: cardWidth, height: photoHeight }]}
              >
                <Image
                  source={{ uri: item.uri }}
                  style={StyleSheet.absoluteFillObject}
                  resizeMode="cover"
                />
                {idx === 0 ? (
                  <LinearGradient
                    colors={["rgba(0,0,0,0)", "rgba(8,6,15,0.55)"]}
                    style={styles.photoVignette}
                    pointerEvents="none"
                  />
                ) : null}
              </View>
            );
          }

          const isTarget = commentTarget?.index === item.index;
          return (
            <View key={`q-${idx}`} style={[styles.promptCard, { width: cardWidth }]}>
              <Text style={styles.promptQuote}>“</Text>
              <Text style={styles.promptLabel}>{item.label}</Text>
              <Text style={styles.promptAnswer}>{item.answer}</Text>
              <View style={styles.promptDivider} />
              <Pressable
                onPress={() =>
                  setCommentTarget((prev) =>
                    prev?.index === item.index ? null : item,
                  )
                }
                testID={`comment-cta-${item.index}`}
                style={styles.promptAction}
              >
                <LinearGradient
                  colors={Gradients.primaryCta as unknown as readonly [string, string, ...string[]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.promptActionInner}
                >
                  <Text style={styles.promptActionText}>
                    {isTarget ? "Close" : "Comment"}
                  </Text>
                </LinearGradient>
              </Pressable>

              {isTarget ? (
                <View style={styles.commentBox}>
                  <Text style={styles.commentHint}>
                    Commenting on this prompt to connect
                  </Text>
                  <TextInput
                    value={commentText}
                    onChangeText={setCommentText}
                    placeholder="What stood out to you?"
                    placeholderTextColor={Colors.smoke}
                    multiline
                    style={styles.commentInput}
                    testID={`comment-input-${item.index}`}
                  />
                  <View style={styles.commentActions}>
                    <Pressable onPress={() => setCommentTarget(null)}>
                      <Text style={styles.commentCancel}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void sendComment()}
                      disabled={sending}
                      testID={`comment-send-${item.index}`}
                    >
                      <LinearGradient
                        colors={Gradients.primaryCta as unknown as readonly [string, string, ...string[]]}
                        style={styles.commentSend}
                      >
                        <Text style={styles.commentSendText}>
                          {sending ? "Sending…" : "Send"}
                        </Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

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

// Silence RN warnings around Animated / unused imports in this file.
void Animated;

const styles = StyleSheet.create({
  cardWrap: {
    gap: Space.md,
  },
  headline: {
    gap: 4,
    paddingHorizontal: 2,
  },
  headlineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    color: Colors.cream,
    fontFamily: "Georgia",
    fontSize: 30,
    fontWeight: "400",
    letterSpacing: -0.4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  metaText: { color: Colors.fog, fontSize: 14, fontWeight: "500" },
  metaDot: { color: Colors.smoke, fontSize: 14, marginHorizontal: 2 },
  intentChip: {
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: Colors.dusk,
    borderWidth: 1,
    borderColor: Colors.mist,
    marginLeft: 4,
  },
  intentChipText: {
    color: Colors.cream,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
    letterSpacing: 0.3,
  },
  hereBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 4,
  },
  hereDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.cream,
  },
  hereText: {
    color: Colors.cream,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.mist,
    backgroundColor: Colors.obsidian,
    alignItems: "center",
    justifyContent: "center",
  },
  menuIcon: {
    color: Colors.fog,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -1,
  },

  // PHOTO CARD ---------------------------------------------------------
  photoCard: {
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: Colors.dusk,
    borderWidth: 1,
    borderColor: Colors.mist,
  },
  photoVignette: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "30%",
  },

  // PROMPT CARD --------------------------------------------------------
  promptCard: {
    backgroundColor: "#F2EEE8",
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 18,
    gap: 6,
    // subtle paper feel
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  promptQuote: {
    color: "#C23B8A",
    fontSize: 42,
    fontFamily: "Georgia",
    lineHeight: 28,
    marginBottom: -2,
    marginLeft: -4,
  },
  promptLabel: {
    color: "#5C5478",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  promptAnswer: {
    color: "#141026",
    fontSize: 22,
    lineHeight: 30,
    fontFamily: "Georgia",
    fontWeight: "400",
    letterSpacing: -0.2,
    marginTop: 4,
  },
  promptDivider: {
    height: 1,
    backgroundColor: "rgba(20,16,38,0.08)",
    marginTop: 14,
    marginBottom: 2,
  },
  promptAction: {
    alignSelf: "flex-start",
    marginTop: 6,
  },
  promptActionInner: {
    paddingHorizontal: 18,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  promptActionText: {
    color: Colors.cream,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.4,
  },

  // INLINE COMMENT BOX ------------------------------------------------
  commentBox: {
    marginTop: 10,
    gap: 8,
  },
  commentHint: {
    color: "#5C5478",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  commentInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: "rgba(20,16,38,0.15)",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    padding: 12,
    color: "#141026",
    fontSize: 15,
    textAlignVertical: "top",
  },
  commentActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 14,
  },
  commentCancel: {
    color: "#5C5478",
    fontSize: 14,
    fontWeight: "600",
  },
  commentSend: {
    paddingHorizontal: 20,
    height: 38,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  commentSendText: {
    color: Colors.cream,
    fontSize: 13,
    fontWeight: "700",
  },
});
