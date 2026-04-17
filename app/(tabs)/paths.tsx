import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { Colors, Gradients, Radius, Space } from "@/constants/theme";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "@/store/authStore";
import type { User, Venue, VenuePresence } from "@/types/database";

// --- Types -----------------------------------------------------------
interface CrossedPathUser {
  user_id: string;
  full_name: string;
  age: number;
  avatar_url: string | null;
  intent: string | null;
  match_percent: number;
}

interface RevealState {
  [userId: string]: "idle" | "sending" | "waiting" | "matched";
}

interface VenueSession {
  presence: VenuePresence;
  venue: Venue;
  peopleCount: number;
  people: CrossedPathUser[];
  isOngoing: boolean;
}

const CATEGORY_GLYPH: Record<string, string> = {
  cafe: "◐",
  club: "◉",
  bar: "◈",
  restaurant: "◇",
  campus: "▲",
};

const timeAgo = (iso: string): string => {
  const mins = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  const remaining = mins % 60;
  if (hrs < 24) return remaining ? `${hrs}h ${remaining}m ago` : `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const presenceDuration = (presence: VenuePresence): string => {
  const start = new Date(presence.entered_at).getTime();
  const end = presence.exited_at
    ? new Date(presence.exited_at).getTime()
    : Date.now();
  const mins = Math.max(1, Math.floor((end - start) / 60000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  return `${h}h`;
};

// =====================================================================
// MAIN
// =====================================================================
export default function CrossedPathsScreen() {
  const router = useRouter();
  const { venueId: venueIdParam } = useLocalSearchParams<{ venueId?: string }>();
  const user = useAuthStore((state) => state.user);
  const [sessions, setSessions] = useState<VenueSession[]>([]);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [revealStates, setRevealStates] = useState<RevealState>({});
  const [loading, setLoading] = useState(false);

  const loadSessions = async () => {
    if (!user?.id) return;
    setLoading(true);

    // 1) Load up to 5 most recent presence entries (any venue)
    const { data: presenceRows } = await supabase
      .from("venue_presence")
      .select("*")
      .eq("user_id", user.id)
      .order("entered_at", { ascending: false })
      .limit(5);

    const presenceList = (presenceRows ?? []) as VenuePresence[];
    if (presenceList.length === 0) {
      setSessions([]);
      setLoading(false);
      return;
    }

    // 2) Hydrate venues
    const venueIds = [...new Set(presenceList.map((p) => p.venue_id))];
    const { data: venuesRows } = await supabase
      .from("venues")
      .select("*")
      .in("id", venueIds);
    const venueById = new Map(
      ((venuesRows ?? []) as Venue[]).map((v) => [v.id, v]),
    );

    // 3) For each session, call get_crossed_paths
    const built: VenueSession[] = [];
    for (const presence of presenceList) {
      const venue = venueById.get(presence.venue_id);
      if (!venue) continue;
      const { data: cpRows } = await supabase.rpc(
        "get_crossed_paths" as never,
        {
          current_user_id: user.id,
          venue_id: venue.id,
          limit_count: 10,
        } as never,
      );
      const rawPeople = (cpRows ?? []) as CrossedPathUser[];
      const seen = new Set<string>();
      const people: CrossedPathUser[] = [];
      for (const p of rawPeople) {
        if (!seen.has(p.user_id)) {
          seen.add(p.user_id);
          people.push(p);
        }
      }
      built.push({
        presence,
        venue,
        peopleCount: people.length,
        people,
        isOngoing: presence.is_active,
      });
    }

    // 4) Also hydrate existing mutual matches so already-matched people show unblurred
    const { data: existingMatches } = await supabase
      .from("matches")
      .select("user_one_id,user_two_id")
      .or(`user_one_id.eq.${user.id},user_two_id.eq.${user.id}`);

    const matchedIds = new Set<string>();
    for (const m of (existingMatches ?? []) as {
      user_one_id: string;
      user_two_id: string;
    }[]) {
      matchedIds.add(m.user_one_id === user.id ? m.user_two_id : m.user_one_id);
    }

    // 5) Mark previously-sent-interest comments as "waiting"
    const { data: sentComments } = await supabase
      .from("comments")
      .select("to_user")
      .eq("from_user", user.id);
    const sentIds = new Set<string>(
      ((sentComments ?? []) as { to_user: string }[]).map((c) => c.to_user),
    );

    setRevealStates((prev) => {
      const next = { ...prev };
      for (const session of built) {
        for (const person of session.people) {
          if (matchedIds.has(person.user_id)) {
            next[person.user_id] = "matched";
          } else if (sentIds.has(person.user_id) && !next[person.user_id]) {
            next[person.user_id] = "waiting";
          }
        }
      }
      return next;
    });

    setSessions(built);
    setLoading(false);

    // Auto-expand the session matching a passed venueId, or the first
    if (venueIdParam) {
      const match = built.find((s) => s.venue.id === venueIdParam);
      if (match) setExpandedSession(match.presence.id);
    } else if (!expandedSession && built.length) {
      setExpandedSession(built[0].presence.id);
    }
  };

  useEffect(() => {
    void loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, venueIdParam]);

  const handleReveal = async (targetId: string) => {
    if (!user?.id) return;
    if (revealStates[targetId] === "sending" || revealStates[targetId] === "matched") return;

    setRevealStates((p) => ({ ...p, [targetId]: "sending" }));
    try {
      // Try to insert; unique constraint will prevent duplicates
      await supabase
        .from("comments")
        .insert({
          from_user: user.id,
          to_user: targetId,
          prompt_index: 0,
          comment_text: "Crossed paths — curious to connect?",
        } as never);

      // Check if this created a match (mutual)
      const { data: maybeMatch } = await supabase
        .from("matches")
        .select("id")
        .or(
          `and(user_one_id.eq.${user.id},user_two_id.eq.${targetId}),and(user_one_id.eq.${targetId},user_two_id.eq.${user.id})`,
        )
        .limit(1)
        .maybeSingle<{ id: string }>();

      if (maybeMatch?.id) {
        setRevealStates((p) => ({ ...p, [targetId]: "matched" }));
        Alert.alert("Path matched ✦", "You both revealed. Start the conversation.", [
          { text: "Later", style: "cancel" },
          {
            text: "Say hi",
            onPress: () => router.push(`/(tabs)/chat/${maybeMatch.id}`),
          },
        ]);
      } else {
        setRevealStates((p) => ({ ...p, [targetId]: "waiting" }));
      }
    } catch (error) {
      setRevealStates((p) => ({ ...p, [targetId]: "idle" }));
      Alert.alert(
        "Could not reveal",
        error instanceof Error ? error.message : "Try again in a moment.",
      );
    }
  };

  const totalSessions = sessions.length;
  const totalPeople = useMemo(
    () => sessions.reduce((acc, s) => acc + s.peopleCount, 0),
    [sessions],
  );
  const revealedCount = Object.values(revealStates).filter((s) => s === "matched").length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.kicker}>RETROSPECTIVE DISCOVERY</Text>
        <Text style={styles.title}>Crossed paths.</Text>
        <Text style={styles.subtitle}>
          People who shared your space. Reveal one — they'll only see you if they reveal back.
        </Text>
      </View>

      {loading && !sessions.length ? (
        <EmptyState
          title="Gathering your paths…"
          body="Finding everyone whose time overlapped with yours."
        />
      ) : sessions.length === 0 ? (
        <EmptyState
          title="No crossed paths yet"
          body="Activate Venue Mode somewhere to start building a trail."
          ctaLabel="Open Venue Mode"
          onCta={() => router.push("/(tabs)/venue")}
        />
      ) : (
        <>
          <View style={styles.statStrip}>
            <StatCell big={String(totalPeople)} label="people" />
            <View style={styles.statDivider} />
            <StatCell big={String(totalSessions)} label="sessions" />
            <View style={styles.statDivider} />
            <StatCell big={String(revealedCount)} label="matched" />
          </View>

          <FlatList
            data={sessions}
            keyExtractor={(item) => item.presence.id}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
            renderItem={({ item }) => (
              <SessionCard
                session={item}
                expanded={expandedSession === item.presence.id}
                onToggle={() =>
                  setExpandedSession((prev) =>
                    prev === item.presence.id ? null : item.presence.id,
                  )
                }
                revealStates={revealStates}
                onReveal={handleReveal}
                onOpenProfile={(id) => router.push(`/(tabs)/profile/${id}`)}
              />
            )}
          />
        </>
      )}
    </View>
  );
}

// =====================================================================
// SESSION CARD
// =====================================================================
function SessionCard({
  session,
  expanded,
  onToggle,
  revealStates,
  onReveal,
  onOpenProfile,
}: {
  session: VenueSession;
  expanded: boolean;
  onToggle: () => void;
  revealStates: RevealState;
  onReveal: (id: string) => void;
  onOpenProfile: (id: string) => void;
}) {
  const glyph = CATEGORY_GLYPH[session.venue.category ?? ""] ?? "●";
  return (
    <View style={styles.sessionCard}>
      <Pressable onPress={onToggle} style={styles.sessionHeader} testID={`session-${session.venue.slug}`}>
        <LinearGradient
          colors={Gradients.venueMode as unknown as readonly [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sessionGlyph}
        >
          <Text style={styles.sessionGlyphText}>{glyph}</Text>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <View style={styles.sessionTopRow}>
            <Text style={styles.sessionVenue} numberOfLines={1}>
              {session.venue.name}
            </Text>
            {session.isOngoing ? (
              <View style={styles.liveChipRow}>
                <View style={styles.liveDotSmall} />
                <Text style={styles.liveChipText}>LIVE</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.sessionMeta}>
            {presenceDuration(session.presence)} here · {timeAgo(session.presence.entered_at)}
          </Text>
        </View>
        <View style={styles.sessionPeopleBadge}>
          <Text style={styles.sessionPeopleBadgeValue}>{session.peopleCount}</Text>
          <Text style={styles.sessionPeopleBadgeLabel}>
            {session.peopleCount === 1 ? "person" : "people"}
          </Text>
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.expandedRegion}>
          {session.peopleCount === 0 ? (
            <Text style={styles.noPathsText}>
              No one else activated during your window.
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingVertical: 4 }}
            >
              {session.people.map((person) => (
                <CrossedPathCard
                  key={person.user_id}
                  person={person}
                  state={revealStates[person.user_id] ?? "idle"}
                  onReveal={() => onReveal(person.user_id)}
                  onOpenProfile={() => onOpenProfile(person.user_id)}
                />
              ))}
            </ScrollView>
          )}
          <Text style={styles.helperText}>
            Profiles stay hidden until both of you tap reveal.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// =====================================================================
// CROSSED PATH CARD (per person, Hinge-style tall tile)
// =====================================================================
function CrossedPathCard({
  person,
  state,
  onReveal,
  onOpenProfile,
}: {
  person: CrossedPathUser;
  state: RevealState[string];
  onReveal: () => void;
  onOpenProfile: () => void;
}) {
  const unblur = useRef(new Animated.Value(state === "matched" ? 1 : 0)).current;

  useEffect(() => {
    if (state === "matched") {
      Animated.timing(unblur, {
        toValue: 1,
        duration: 620,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [state, unblur]);

  const isMatched = state === "matched";
  const isWaiting = state === "waiting";
  const isSending = state === "sending";

  return (
    <Pressable
      onPress={isMatched ? onOpenProfile : onReveal}
      disabled={isSending}
      testID={`cp-card-${person.user_id}`}
      style={styles.cpCard}
    >
      <View style={styles.cpImageWrap}>
        {person.avatar_url ? (
          <Image
            source={{ uri: person.avatar_url }}
            style={StyleSheet.absoluteFillObject}
            blurRadius={isMatched ? 0 : 28}
          />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: Colors.dusk }]} />
        )}
        {!isMatched ? (
          <>
            <Animated.View
              style={[
                StyleSheet.absoluteFillObject,
                {
                  backgroundColor: "rgba(10,8,18,0.45)",
                  opacity: unblur.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                },
              ]}
            />
            <Animated.View
              style={[
                StyleSheet.absoluteFillObject,
                styles.cpFrost,
                {
                  opacity: unblur.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                },
              ]}
            />
          </>
        ) : null}
        <LinearGradient
          colors={["rgba(0,0,0,0)", "rgba(8,6,15,0.82)"]}
          style={styles.cpVignette}
          pointerEvents="none"
        />

        {isMatched ? (
          <View style={styles.cpMatchBadge}>
            <Text style={styles.cpMatchBadgeText}>✦ MATCHED</Text>
          </View>
        ) : (
          <View style={styles.cpMatchPctBadge}>
            <Text style={styles.cpMatchPctText}>{person.match_percent}% · path</Text>
          </View>
        )}
      </View>

      <View style={styles.cpInfo}>
        <Text style={styles.cpName}>
          {isMatched ? `${person.full_name}, ${person.age}` : "█ █ █ █"}
        </Text>
        <Text style={styles.cpIntent} numberOfLines={1}>
          {isMatched
            ? (person.intent ?? "Open to connect")
            : isWaiting
              ? "Interest sent — waiting for them"
              : isSending
                ? "Sending…"
                : "Tap to reveal if you both connect"}
        </Text>

        {isMatched ? (
          <LinearGradient
            colors={Gradients.primaryCta as unknown as readonly [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cpCta}
          >
            <Text style={styles.cpCtaText}>Say hi →</Text>
          </LinearGradient>
        ) : isWaiting ? (
          <View style={[styles.cpCta, styles.cpCtaWaiting]}>
            <Text style={styles.cpCtaWaitingText}>Waiting…</Text>
          </View>
        ) : (
          <LinearGradient
            colors={Gradients.venueMode as unknown as readonly [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cpCta}
          >
            <Text style={styles.cpCtaText}>{isSending ? "…" : "Reveal"}</Text>
          </LinearGradient>
        )}
      </View>
    </Pressable>
  );
}

// =====================================================================
// SMALL PIECES
// =====================================================================
function StatCell({ big, label }: { big: string; label: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statBig}>{big}</Text>
      <Text style={styles.statSmall}>{label}</Text>
    </View>
  );
}

function EmptyState({
  title,
  body,
  ctaLabel,
  onCta,
}: {
  title: string;
  body: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyGlyphWrap}>
        <Text style={styles.emptyGlyph}>◎</Text>
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {ctaLabel && onCta ? (
        <Pressable onPress={onCta} testID="paths-empty-cta">
          <LinearGradient
            colors={Gradients.venueMode as unknown as readonly [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.emptyCta}
          >
            <Text style={styles.emptyCtaText}>{ctaLabel}</Text>
          </LinearGradient>
        </Pressable>
      ) : null}
    </View>
  );
}

// =====================================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.void },

  header: {
    paddingHorizontal: Space.md,
    paddingTop: 18,
    paddingBottom: 6,
    gap: 4,
  },
  kicker: {
    color: Colors.haze,
    fontSize: 10,
    letterSpacing: 2.5,
    fontWeight: "700",
  },
  title: {
    color: Colors.cream,
    fontFamily: "Georgia",
    fontSize: 30,
    fontWeight: "400",
    letterSpacing: -0.4,
    marginTop: 2,
  },
  subtitle: {
    color: Colors.fog,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },

  // Stat strip ---------------------------------------------------------
  statStrip: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Space.md,
    marginTop: 14,
    backgroundColor: Colors.obsidian,
    borderWidth: 1,
    borderColor: Colors.mist,
    borderRadius: 16,
    paddingVertical: 12,
  },
  statCell: { flex: 1, alignItems: "center" },
  statBig: {
    color: Colors.cream,
    fontFamily: "Georgia",
    fontSize: 22,
    fontWeight: "400",
  },
  statSmall: {
    color: Colors.fog,
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  statDivider: { width: 1, height: 24, backgroundColor: Colors.mist },

  // List ---------------------------------------------------------------
  list: { paddingHorizontal: Space.md, paddingTop: 14, paddingBottom: 24 },

  // SESSION CARD -------------------------------------------------------
  sessionCard: {
    borderWidth: 1,
    borderColor: Colors.mist,
    borderRadius: 20,
    backgroundColor: Colors.obsidian,
    overflow: "hidden",
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  sessionGlyph: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionGlyphText: { color: Colors.cream, fontSize: 20, fontWeight: "700" },
  sessionTopRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sessionVenue: { color: Colors.cream, fontSize: 15, fontWeight: "700", flexShrink: 1 },
  sessionMeta: { color: Colors.fog, fontSize: 12, marginTop: 2 },
  liveChipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    height: 22,
    borderRadius: Radius.pill,
    backgroundColor: "rgba(31,191,160,0.18)",
    borderWidth: 1,
    borderColor: "rgba(31,191,160,0.5)",
  },
  liveChipText: {
    color: "#6EE7CA",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  liveDotSmall: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#1FBFA0",
  },
  sessionPeopleBadge: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 56,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: Colors.dusk,
    borderWidth: 1,
    borderColor: Colors.mist,
  },
  sessionPeopleBadgeValue: {
    color: Colors.cream,
    fontFamily: "Georgia",
    fontSize: 20,
    fontWeight: "500",
    lineHeight: 22,
  },
  sessionPeopleBadgeLabel: {
    color: Colors.smoke,
    fontSize: 10,
    letterSpacing: 0.6,
    marginTop: 1,
  },
  expandedRegion: {
    borderTopWidth: 1,
    borderTopColor: Colors.mist,
    padding: 14,
    gap: 10,
  },
  noPathsText: {
    color: Colors.fog,
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 16,
  },
  helperText: {
    color: Colors.smoke,
    fontSize: 11,
    textAlign: "center",
    marginTop: 2,
    fontStyle: "italic",
  },

  // CROSSED PATH CARD (horizontal tile) -------------------------------
  cpCard: {
    width: 188,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: Colors.dusk,
    borderWidth: 1,
    borderColor: Colors.mist,
  },
  cpImageWrap: {
    width: "100%",
    height: 232,
    overflow: "hidden",
  },
  cpFrost: {
    backgroundColor: "rgba(155,114,207,0.18)",
  },
  cpVignette: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "50%",
  },
  cpMatchBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(194,59,138,0.85)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  cpMatchBadgeText: {
    color: Colors.cream,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  cpMatchPctBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(8,6,15,0.65)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  cpMatchPctText: {
    color: Colors.cream,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  cpInfo: {
    padding: 12,
    gap: 4,
  },
  cpName: { color: Colors.cream, fontSize: 15, fontWeight: "700" },
  cpIntent: { color: Colors.fog, fontSize: 11, textTransform: "capitalize" },
  cpCta: {
    marginTop: 8,
    height: 34,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  cpCtaText: { color: Colors.cream, fontSize: 12, fontWeight: "700" },
  cpCtaWaiting: {
    backgroundColor: Colors.dusk,
    borderWidth: 1,
    borderColor: Colors.mist,
  },
  cpCtaWaitingText: {
    color: Colors.fog,
    fontSize: 12,
    fontWeight: "700",
  },

  // EMPTY STATE --------------------------------------------------------
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 30,
  },
  emptyGlyphWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: Colors.mist,
    backgroundColor: Colors.dusk,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyGlyph: { color: Colors.haze, fontSize: 26 },
  emptyTitle: {
    color: Colors.cream,
    fontFamily: "Georgia",
    fontSize: 24,
    fontWeight: "400",
    textAlign: "center",
  },
  emptyBody: {
    color: Colors.fog,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  emptyCta: {
    marginTop: 14,
    height: 46,
    paddingHorizontal: 22,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCtaText: { color: Colors.cream, fontSize: 14, fontWeight: "700" },
});
