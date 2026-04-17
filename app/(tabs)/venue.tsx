import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { Colors, Gradients, Radius, Space } from "@/constants/theme";
import { useVenueMode } from "@/hooks/useVenueMode";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "@/store/authStore";
import type { User, Venue } from "@/types/database";

type VenueWithActivity = Venue & { active_count: number };
type Category = "all" | "cafe" | "bar" | "club" | "campus" | "restaurant";

const CATEGORY_META: Record<
  string,
  { glyph: string; label: string; tint: string }
> = {
  cafe:       { glyph: "◐", label: "Cafe",       tint: "#E8572A" },
  club:       { glyph: "◉", label: "Club",       tint: "#C23B8A" },
  bar:        { glyph: "◈", label: "Bar",        tint: "#8B68D4" },
  restaurant: { glyph: "◇", label: "Dining",     tint: "#E8572A" },
  campus:     { glyph: "▲", label: "Campus",     tint: "#1FBFA0" },
  default:    { glyph: "●", label: "Venue",      tint: "#8B68D4" },
};

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "all",        label: "All" },
  { id: "cafe",       label: "Cafes" },
  { id: "bar",        label: "Bars" },
  { id: "club",       label: "Clubs" },
  { id: "restaurant", label: "Dining" },
  { id: "campus",     label: "Campus" },
];

const formatCountdown = (seconds: number): string => {
  if (seconds <= 0) return "Expired";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m.toString().padStart(2, "0")}m left` : `${m}m left`;
};

const timeSince = (iso: string): string => {
  const mins = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
};

export default function VenueModeScreen() {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [venues, setVenues] = useState<VenueWithActivity[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<VenueWithActivity | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const pulse = useRef(new Animated.Value(0.4)).current;

  const {
    isActive,
    nearbyUsers,
    timeRemaining,
    loading,
    error,
    activate,
    deactivate,
  } = useVenueMode(selectedVenue?.id ?? null);

  // Pulse animation for live indicators
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  // Load venues with their active counts (presence join)
  const loadVenues = async () => {
    setListLoading(true);
    const [{ data: venueRows }, { data: presenceRows }] = await Promise.all([
      supabase.from("venues").select("*").eq("is_active", true).order("name"),
      supabase.from("venue_presence").select("venue_id").eq("is_active", true),
    ]);
    const counts = new Map<string, number>();
    for (const p of (presenceRows ?? []) as Array<{ venue_id: string }>) {
      counts.set(p.venue_id, (counts.get(p.venue_id) ?? 0) + 1);
    }
    const merged: VenueWithActivity[] = ((venueRows ?? []) as Venue[]).map(
      (v) => ({ ...v, active_count: counts.get(v.id) ?? 0 }),
    );
    setVenues(merged);
    setListLoading(false);
  };

  useEffect(() => {
    void loadVenues();
    const interval = setInterval(() => void loadVenues(), 30000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return venues
      .filter((v) => (category === "all" ? true : v.category === category))
      .filter((v) =>
        !q
          ? true
          : v.name.toLowerCase().includes(q) ||
            v.city.toLowerCase().includes(q) ||
            (v.address ?? "").toLowerCase().includes(q),
      )
      .sort((a, b) => b.active_count - a.active_count);
  }, [venues, search, category]);

  const totalActive = venues.reduce((acc, v) => acc + v.active_count, 0);

  // ============================================================
  // STATE C: ACTIVE AT VENUE
  // ============================================================
  if (selectedVenue && isActive) {
    const meta = CATEGORY_META[selectedVenue.category ?? "default"] ?? CATEGORY_META.default;
    return (
      <View style={styles.container}>
        <ActiveVenueHeader
          venue={selectedVenue}
          meta={meta}
          pulse={pulse}
          timeRemaining={timeRemaining}
          onExit={() => {
            Alert.alert(
              "Leave venue?",
              `You'll be removed from the ${selectedVenue.name} feed and we'll show you who you crossed paths with.`,
              [
                { text: "Stay", style: "cancel" },
                {
                  text: "Leave",
                  style: "destructive",
                  onPress: async () => {
                    await deactivate();
                    router.push(`/(tabs)/paths?venueId=${selectedVenue.id}`);
                  },
                },
              ],
            );
          }}
        />
        <View style={styles.hereNowRow}>
          <Text style={styles.hereNowTitle}>People Here Now</Text>
          <View style={styles.countChip}>
            <Animated.View style={[styles.liveDotSmall, { opacity: pulse }]} />
            <Text style={styles.countChipText}>{nearbyUsers.length} active</Text>
          </View>
        </View>
        {nearbyUsers.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>Nobody else here — yet.</Text>
            <Text style={styles.emptySubtitle}>
              We'll ping you when someone activates Venue Mode at {selectedVenue.name}.
            </Text>
          </View>
        ) : (
          <FlatList
            data={nearbyUsers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            renderItem={({ item }) => (
              <NearbyUserRow
                user={item}
                onOpen={() => router.push(`/(tabs)/profile/${item.id}`)}
              />
            )}
          />
        )}
      </View>
    );
  }

  // ============================================================
  // STATE B: VENUE SELECTED, NOT YET ACTIVATED
  // ============================================================
  if (selectedVenue && !isActive) {
    const meta = CATEGORY_META[selectedVenue.category ?? "default"] ?? CATEGORY_META.default;
    return (
      <View style={styles.container}>
        <View style={styles.detailHeader}>
          <Pressable
            style={styles.iconBtn}
            onPress={() => setSelectedVenue(null)}
            testID="venue-detail-back"
          >
            <Text style={styles.iconBtnText}>‹</Text>
          </Pressable>
          <Text style={styles.detailHeaderTitle}>Venue</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: Space.md, gap: Space.md }}>
          <LinearGradient
            colors={Gradients.venueMode as unknown as readonly [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBorder}
          >
            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <View style={[styles.heroGlyphPill, { backgroundColor: meta.tint + "22", borderColor: meta.tint + "55" }]}>
                  <Text style={[styles.heroGlyph, { color: meta.tint }]}>{meta.glyph}</Text>
                </View>
                <View style={styles.heroActivityPill}>
                  <Animated.View style={[styles.liveDotSmall, { opacity: pulse }]} />
                  <Text style={styles.heroActivityText}>
                    {selectedVenue.active_count} here now
                  </Text>
                </View>
              </View>
              <Text style={styles.heroName}>{selectedVenue.name}</Text>
              <Text style={styles.heroAddress}>
                {selectedVenue.address ?? selectedVenue.city} · {meta.label}
              </Text>
              <View style={styles.heroMetaRow}>
                <View style={styles.heroMetaPill}>
                  <Text style={styles.heroMetaText}>◎ 500m geofence</Text>
                </View>
                <View style={styles.heroMetaPill}>
                  <Text style={styles.heroMetaText}>◷ 4h presence</Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={() => void activate(selectedVenue)}
            disabled={loading}
            testID="venue-activate-btn"
          >
            <LinearGradient
              colors={Gradients.venueMode as unknown as readonly [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.primaryBtn, loading && styles.btnDisabled]}
            >
              <Text style={styles.primaryBtnText}>
                {loading ? "Activating…" : "Activate Venue Mode"}
              </Text>
            </LinearGradient>
          </Pressable>
          <Text style={styles.tip}>
            You'll appear in the “People Here Now” feed. Auto-expires in 4 hours.
          </Text>

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>How this works</Text>
          <View style={styles.howCard}>
            <HowRow
              step="1"
              title="Activate on arrival"
              body="We verify you're within 500m of the venue."
            />
            <HowRow
              step="2"
              title="See who else is here"
              body="Comment to connect with anyone in the live feed."
            />
            <HowRow
              step="3"
              title="Crossed paths"
              body="After you leave, see everyone you shared space with."
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  // ============================================================
  // STATE A: BROWSING VENUES
  // ============================================================
  return (
    <View style={styles.container}>
      <View style={styles.browseHeader}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.kicker}>VENUE MODE</Text>
            <Text style={styles.title}>Be here now.</Text>
          </View>
          <View style={styles.headerStatChip}>
            <Animated.View style={[styles.liveDotSmall, { opacity: pulse }]} />
            <Text style={styles.headerStatText}>{totalActive} active</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>
          Pick a venue you're at — we'll show you who else is there.
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search for a venue"
          placeholderTextColor={Colors.smoke}
          style={styles.searchInput}
          testID="venue-search-input"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catRow}
      >
        {CATEGORIES.map((c) => {
          const active = category === c.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => setCategory(c.id)}
              testID={`venue-cat-${c.id}`}
            >
              {active ? (
                <LinearGradient
                  colors={Gradients.venueMode as unknown as readonly [string, string, ...string[]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.catPill, styles.catPillActive]}
                >
                  <Text style={styles.catTextActive}>{c.label}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.catPill}>
                  <Text style={styles.catText}>{c.label}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {listLoading && !venues.length ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptySubtitle}>Loading venues…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => (
            <VenueRow
              venue={item}
              pulse={pulse}
              onSelect={() => setSelectedVenue(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No venues match.</Text>
              <Text style={styles.emptySubtitle}>
                Try a different category or search term.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// -----------------------------------------------------------------------
// SUB-COMPONENTS
// -----------------------------------------------------------------------

function VenueRow({
  venue,
  pulse,
  onSelect,
}: {
  venue: VenueWithActivity;
  pulse: Animated.Value;
  onSelect: () => void;
}) {
  const meta = CATEGORY_META[venue.category ?? "default"] ?? CATEGORY_META.default;
  const isHot = venue.active_count > 0;
  return (
    <Pressable onPress={onSelect} testID={`venue-row-${venue.slug}`}>
      <View style={styles.venueRow}>
        <View style={[styles.venueGlyph, { borderColor: meta.tint + "55", backgroundColor: meta.tint + "18" }]}>
          <Text style={[styles.venueGlyphText, { color: meta.tint }]}>
            {meta.glyph}
          </Text>
        </View>
        <View style={styles.venueMeta}>
          <Text style={styles.venueName}>{venue.name}</Text>
          <Text style={styles.venueSub}>
            {venue.address ?? venue.city} · {meta.label}
          </Text>
        </View>
        {isHot ? (
          <LinearGradient
            colors={Gradients.venueMode as unknown as readonly [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.venueBadgeHot}
          >
            <Animated.View style={[styles.liveDotSmall, { opacity: pulse }]} />
            <Text style={styles.venueBadgeHotText}>
              {venue.active_count}
            </Text>
          </LinearGradient>
        ) : (
          <View style={styles.venueBadgeCold}>
            <Text style={styles.venueBadgeColdText}>—</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function ActiveVenueHeader({
  venue,
  meta,
  pulse,
  timeRemaining,
  onExit,
}: {
  venue: Venue;
  meta: { glyph: string; label: string; tint: string };
  pulse: Animated.Value;
  timeRemaining: number;
  onExit: () => void;
}) {
  return (
    <LinearGradient
      colors={Gradients.venueMode as unknown as readonly [string, string, ...string[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.activeHeaderBorder}
    >
      <View style={styles.activeHeaderCard}>
        <View style={styles.activeHeaderTopRow}>
          <Text style={[styles.activeGlyph, { color: meta.tint }]}>{meta.glyph}</Text>
          <View style={styles.activeLiveChip}>
            <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
            <Text style={styles.activeLiveText}>YOU'RE HERE NOW</Text>
          </View>
        </View>
        <Text style={styles.activeVenueName}>{venue.name}</Text>
        <View style={styles.activeMetaRow}>
          <Text style={styles.activeMetaText}>{venue.address ?? venue.city}</Text>
          <Text style={styles.activeMetaDot}>·</Text>
          <Text style={styles.activeMetaText}>{formatCountdown(timeRemaining)}</Text>
        </View>
        <Pressable
          style={styles.leaveBtn}
          onPress={onExit}
          testID="venue-leave-btn"
        >
          <Text style={styles.leaveBtnText}>Leave venue</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

function NearbyUserRow({
  user,
  onOpen,
}: {
  user: User & { presenceEnteredAt: string };
  onOpen: () => void;
}) {
  return (
    <Pressable
      style={styles.userRow}
      onPress={onOpen}
      testID={`venue-user-${user.id}`}
    >
      <View style={styles.userAvatarWrap}>
        {user.avatar_url ? (
          <Image source={{ uri: user.avatar_url }} style={styles.userAvatar} />
        ) : (
          <View style={styles.userAvatar} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.userName}>
          {user.full_name}, {user.age}
        </Text>
        <Text style={styles.userSub}>
          {(user.intent ?? "Open to connect").toString()} · Here {timeSince(user.presenceEnteredAt)}
        </Text>
      </View>
      <View style={styles.commentBtn}>
        <Text style={styles.commentBtnText}>Comment</Text>
      </View>
    </Pressable>
  );
}

function HowRow({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <View style={styles.howRow}>
      <View style={styles.howStep}>
        <Text style={styles.howStepText}>{step}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.howTitle}>{title}</Text>
        <Text style={styles.howBody}>{body}</Text>
      </View>
    </View>
  );
}

// -----------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.void },

  // BROWSE HEADER ------------------------------------------------------
  browseHeader: {
    paddingHorizontal: Space.md,
    paddingTop: 18,
    paddingBottom: 10,
    gap: 6,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    marginTop: 2,
    letterSpacing: -0.4,
  },
  subtitle: {
    color: Colors.fog,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  headerStatChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(31,191,160,0.45)",
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    height: 28,
    backgroundColor: "rgba(31,191,160,0.14)",
  },
  headerStatText: { color: "#6EE7CA", fontSize: 11, fontWeight: "700" },

  // SEARCH -------------------------------------------------------------
  searchWrap: {
    marginHorizontal: Space.md,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.mist,
    backgroundColor: Colors.obsidian,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    gap: 6,
  },
  searchIcon: { color: Colors.fog, fontSize: 16 },
  searchInput: { flex: 1, color: Colors.cream, fontSize: 15 },

  // CATEGORIES ---------------------------------------------------------
  catRow: { paddingHorizontal: Space.md, paddingTop: 12, paddingBottom: 8, gap: 8 },
  catPill: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.mist,
    backgroundColor: Colors.obsidian,
    alignItems: "center",
    justifyContent: "center",
  },
  catPillActive: { borderColor: "transparent" },
  catText: { color: Colors.fog, fontSize: 12, fontWeight: "600" },
  catTextActive: { color: Colors.cream, fontSize: 12, fontWeight: "700" },

  // LIST ---------------------------------------------------------------
  listContent: { padding: Space.md, paddingBottom: 28 },

  venueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.mist,
    backgroundColor: Colors.obsidian,
  },
  venueGlyph: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  venueGlyphText: { fontSize: 20 },
  venueMeta: { flex: 1, gap: 2 },
  venueName: { color: Colors.cream, fontSize: 15, fontWeight: "700" },
  venueSub: { color: Colors.fog, fontSize: 12 },

  venueBadgeHot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: Radius.pill,
  },
  venueBadgeHotText: { color: Colors.cream, fontSize: 12, fontWeight: "800" },
  venueBadgeCold: {
    width: 40,
    height: 28,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.mist,
    alignItems: "center",
    justifyContent: "center",
  },
  venueBadgeColdText: { color: Colors.smoke, fontSize: 14 },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.cream,
  },
  liveDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#1FBFA0",
  },

  // DETAIL -------------------------------------------------------------
  detailHeader: {
    paddingHorizontal: Space.md,
    paddingTop: 18,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailHeaderTitle: {
    color: Colors.cream,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.mist,
    backgroundColor: Colors.obsidian,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnText: { color: Colors.cream, fontSize: 22, marginTop: -3 },

  heroBorder: { borderRadius: 22, padding: 1 },
  heroCard: {
    borderRadius: 22,
    backgroundColor: Colors.obsidian,
    padding: 18,
    gap: 10,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroGlyphPill: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroGlyph: { fontSize: 22 },
  heroActivityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: Radius.pill,
    backgroundColor: "rgba(31,191,160,0.16)",
    borderWidth: 1,
    borderColor: "rgba(31,191,160,0.4)",
  },
  heroActivityText: { color: "#6EE7CA", fontSize: 11, fontWeight: "700" },
  heroName: {
    color: Colors.cream,
    fontFamily: "Georgia",
    fontSize: 26,
    fontWeight: "400",
    letterSpacing: -0.4,
    marginTop: 4,
  },
  heroAddress: { color: Colors.fog, fontSize: 13 },
  heroMetaRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  heroMetaPill: {
    paddingHorizontal: 10,
    height: 26,
    borderRadius: Radius.pill,
    backgroundColor: Colors.dusk,
    borderWidth: 1,
    borderColor: Colors.mist,
    alignItems: "center",
    justifyContent: "center",
  },
  heroMetaText: { color: Colors.fog, fontSize: 11, fontWeight: "600" },

  primaryBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: Colors.cream, fontSize: 16, fontWeight: "700" },
  tip: {
    color: Colors.fog,
    fontSize: 12,
    textAlign: "center",
    marginTop: -4,
  },
  errorBanner: {
    borderRadius: 12,
    backgroundColor: "rgba(232,87,42,0.12)",
    borderWidth: 1,
    borderColor: "rgba(232,87,42,0.5)",
    padding: 12,
  },
  errorText: { color: "#FFB898", fontSize: 13 },

  divider: { height: 1, backgroundColor: Colors.mist, marginVertical: 6 },
  sectionTitle: {
    color: Colors.cream,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  howCard: {
    backgroundColor: Colors.obsidian,
    borderWidth: 1,
    borderColor: Colors.mist,
    borderRadius: 16,
    padding: 14,
    gap: 14,
  },
  howRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  howStep: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.haze,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139,104,212,0.14)",
  },
  howStepText: { color: Colors.haze, fontWeight: "800", fontSize: 13 },
  howTitle: { color: Colors.cream, fontSize: 14, fontWeight: "700" },
  howBody: { color: Colors.fog, fontSize: 12, lineHeight: 18, marginTop: 2 },

  // ACTIVE STATE -------------------------------------------------------
  activeHeaderBorder: {
    marginHorizontal: Space.md,
    marginTop: 16,
    borderRadius: 22,
    padding: 1,
  },
  activeHeaderCard: {
    backgroundColor: Colors.obsidian,
    borderRadius: 22,
    padding: 18,
    gap: 8,
  },
  activeHeaderTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  activeGlyph: { fontSize: 28 },
  activeLiveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    height: 26,
    borderRadius: Radius.pill,
    backgroundColor: "rgba(31,191,160,0.2)",
    borderWidth: 1,
    borderColor: "rgba(31,191,160,0.5)",
  },
  activeLiveText: {
    color: "#6EE7CA",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  activeVenueName: {
    color: Colors.cream,
    fontFamily: "Georgia",
    fontSize: 22,
    fontWeight: "400",
    letterSpacing: -0.3,
    marginTop: 2,
  },
  activeMetaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  activeMetaText: { color: Colors.fog, fontSize: 13 },
  activeMetaDot: { color: Colors.smoke, fontSize: 13 },
  leaveBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    height: 34,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.mist,
    alignItems: "center",
    justifyContent: "center",
  },
  leaveBtnText: { color: Colors.cream, fontSize: 12, fontWeight: "700" },

  hereNowRow: {
    paddingHorizontal: Space.md,
    paddingTop: 14,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hereNowTitle: {
    color: Colors.cream,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  countChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    height: 26,
    borderRadius: Radius.pill,
    backgroundColor: "rgba(31,191,160,0.14)",
    borderWidth: 1,
    borderColor: "rgba(31,191,160,0.4)",
  },
  countChipText: { color: "#6EE7CA", fontSize: 11, fontWeight: "700" },

  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.mist,
    backgroundColor: Colors.obsidian,
  },
  userAvatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: Colors.dusk,
    borderWidth: 1,
    borderColor: Colors.mist,
  },
  userAvatar: { flex: 1, width: "100%" },
  userName: { color: Colors.cream, fontSize: 15, fontWeight: "700" },
  userSub: { color: Colors.fog, fontSize: 12, marginTop: 2, textTransform: "capitalize" },
  commentBtn: {
    paddingHorizontal: 14,
    height: 32,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.ember,
    alignItems: "center",
    justifyContent: "center",
  },
  commentBtnText: { color: Colors.ember, fontSize: 12, fontWeight: "700" },

  emptyWrap: {
    paddingTop: 90,
    paddingHorizontal: 40,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    color: Colors.cream,
    fontFamily: "Georgia",
    fontSize: 24,
    fontWeight: "400",
    textAlign: "center",
  },
  emptySubtitle: {
    color: Colors.fog,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
});
