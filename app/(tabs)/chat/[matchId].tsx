import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Colors, Gradients, Radius, Space } from "@/constants/theme";
import { ReportBottomSheet } from "@/components/ReportBottomSheet";
import { useChat } from "@/hooks/useChat";
import { useMatches } from "@/hooks/useMatches";
import { useAuthStore } from "@/store/authStore";

export default function ChatScreen() {
  const params = useLocalSearchParams<{ matchId: string }>();
  const router = useRouter();
  const { messages, loading, sendMessage } = useChat(params.matchId ?? "");
  const { matches } = useMatches();
  const currentUser = useAuthStore((state) => state.user);
  const [content, setContent] = useState("");
  const [showReportSheet, setShowReportSheet] = useState(false);
  const listRef = useRef<FlatList>(null);
  const match = matches.find((item) => item.match.id === params.matchId);

  useEffect(() => {
    if (!messages.length) {
      return;
    }
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages.length]);

  const formatTime = (iso: string): string =>
    new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: "padding", android: undefined })}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>{"<"}</Text>
        </Pressable>
        <View style={styles.avatar} />
        <View style={styles.headerMeta}>
          <Text style={styles.name}>{match?.otherUser.full_name ?? "Conversation"}</Text>
          <Text style={styles.context}>✦ Matched at Antisocial</Text>
        </View>
        <Pressable
          style={styles.menuBtn}
          onPress={() => setShowReportSheet(true)}
          disabled={!match?.otherUser.id}
        >
          <Text style={styles.menuIcon}>⋯</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>{loading ? "Loading messages..." : "Say hi 👋"}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const mine = item.sender_id === currentUser?.id;
          return (
            <View style={[styles.msgRow, mine ? styles.msgRowMine : styles.msgRowTheirs]}>
              {mine ? (
                <LinearGradient colors={Gradients.primaryCta} style={[styles.bubble, styles.bubbleMine]}>
                  <Text style={styles.bubbleTextMine}>{item.content}</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.bubble, styles.bubbleTheirs]}>
                  <Text style={styles.bubbleTextTheirs}>{item.content}</Text>
                </View>
              )}
              <Text style={styles.timestamp}>{formatTime(item.created_at)}</Text>
            </View>
          );
        }}
      />

      <View style={styles.inputBar}>
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="Type a message..."
          placeholderTextColor={Colors.smoke}
          style={styles.input}
        />
        <Pressable
          onPress={async () => {
            const trimmed = content.trim();
            if (!trimmed) {
              return;
            }
            await sendMessage(trimmed);
            setContent("");
          }}
        >
          <LinearGradient colors={Gradients.primaryCta} style={styles.sendBtn}>
            <Text style={styles.sendIcon}>↑</Text>
          </LinearGradient>
        </Pressable>
      </View>
      <ReportBottomSheet
        visible={showReportSheet}
        onClose={() => setShowReportSheet(false)}
        reportedId={match?.otherUser.id ?? ""}
        reportedName={match?.otherUser.full_name ?? "User"}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.void,
  },
  header: {
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mist,
    backgroundColor: Colors.obsidian,
  },
  backBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.mist,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    color: Colors.cream,
    fontSize: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: Colors.dusk,
  },
  headerMeta: {
    flex: 1,
  },
  menuBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.mist,
    alignItems: "center",
    justifyContent: "center",
  },
  menuIcon: {
    color: Colors.cream,
    fontSize: 16,
    marginTop: -4,
  },
  name: {
    color: Colors.cream,
    fontSize: 14,
    fontWeight: "700",
  },
  context: {
    color: Colors.mutual,
    fontSize: 10,
    marginTop: 2,
  },
  messagesList: {
    padding: Space.md,
    paddingBottom: 96,
    gap: Space.sm,
  },
  msgRow: {
    marginBottom: Space.sm,
    maxWidth: "86%",
  },
  msgRowMine: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  msgRowTheirs: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  bubble: {
    paddingHorizontal: Space.sm,
    paddingVertical: 10,
  },
  bubbleMine: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 18,
    borderBottomLeftRadius: 18,
  },
  bubbleTheirs: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    borderBottomLeftRadius: 18,
    backgroundColor: Colors.dusk,
    borderWidth: 1,
    borderColor: Colors.mist,
  },
  bubbleTextMine: {
    color: Colors.cream,
    fontSize: 14,
  },
  bubbleTextTheirs: {
    color: Colors.cream,
    fontSize: 14,
  },
  timestamp: {
    color: Colors.smoke,
    fontSize: 10,
    marginTop: 3,
  },
  inputBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: Space.sm,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    backgroundColor: Colors.obsidian,
    borderTopWidth: 1,
    borderTopColor: Colors.dusk,
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.mist,
    backgroundColor: Colors.dusk,
    color: Colors.cream,
    paddingHorizontal: Space.md,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sendIcon: {
    color: Colors.cream,
    fontSize: 16,
    fontWeight: "700",
  },
  emptyWrap: {
    paddingTop: 80,
    alignItems: "center",
  },
  emptyText: {
    color: Colors.fog,
    fontSize: 14,
  },
});
