import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { Colors, Radius, Space } from "@/constants/theme";
import { useMatches } from "@/hooks/useMatches";

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export default function ChatListScreen() {
  const router = useRouter();
  const { matches, loading } = useMatches();

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Conversations</Text>

      <FlatList
        data={matches}
        keyExtractor={(item) => item.match.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: Space.sm }} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>
              {loading ? "Loading conversations..." : "No matches yet. Keep connecting."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push(`/(tabs)/chat/${item.match.id}`)}
          >
            <View style={styles.avatarWrap}>
              <View style={styles.avatar} />
              {item.unreadCount > 0 ? <View style={styles.unreadDot} /> : null}
            </View>

            <View style={styles.rowContent}>
              <View style={styles.topLine}>
                <Text style={styles.name}>{item.otherUser.full_name}</Text>
                <Text style={styles.time}>
                  {item.latestMessage?.created_at
                    ? formatTime(item.latestMessage.created_at)
                    : ""}
                </Text>
              </View>
              <Text numberOfLines={1} style={styles.preview}>
                {item.latestMessage?.content ?? "Say hi to start chatting"}
              </Text>
              <Text style={styles.context}>✦ Antisocial</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.void,
    paddingHorizontal: Space.md,
    paddingTop: Space.md,
  },
  header: {
    color: Colors.cream,
    fontFamily: "serif",
    fontSize: 24,
    fontWeight: "300",
    marginBottom: Space.md,
  },
  list: {
    paddingBottom: Space.lg,
  },
  row: {
    flexDirection: "row",
    gap: Space.sm,
    padding: Space.sm,
    borderWidth: 1,
    borderColor: Colors.mist,
    borderRadius: Radius.md,
    backgroundColor: Colors.obsidian,
  },
  avatarWrap: {
    width: 44,
    height: 44,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: Colors.dusk,
  },
  unreadDot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
    backgroundColor: Colors.ember,
  },
  rowContent: {
    flex: 1,
  },
  topLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Space.sm,
  },
  name: {
    color: Colors.cream,
    fontSize: 14,
    fontWeight: "700",
  },
  time: {
    color: Colors.smoke,
    fontSize: 10,
  },
  preview: {
    color: Colors.fog,
    fontSize: 12,
    marginTop: 3,
  },
  context: {
    color: Colors.haze,
    fontSize: 10,
    marginTop: 5,
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
