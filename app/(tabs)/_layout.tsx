import { Tabs } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Colors, Gradients } from "@/constants/theme";

/**
 * Minimal, custom-drawn tab icons (pure <View> primitives, no emojis).
 * Each icon is 22×22 and flips to ember/gradient when focused.
 */
function DiscoveryIcon({ color }: { color: string }) {
  return (
    <View style={icon.box}>
      <View
        style={[
          icon.diamond,
          { borderColor: color, transform: [{ rotate: "45deg" }] },
        ]}
      />
    </View>
  );
}

function VenueIcon({ color }: { color: string }) {
  return (
    <View style={icon.box}>
      <View style={[icon.pin, { borderColor: color }]}>
        <View style={[icon.pinDot, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

function PathsIcon({ color }: { color: string }) {
  return (
    <View style={icon.box}>
      <View style={[icon.pathRing, { borderColor: color }]} />
      <View style={[icon.pathRing, icon.pathRingOffset, { borderColor: color, opacity: 0.45 }]} />
    </View>
  );
}

function ChatIcon({ color }: { color: string }) {
  return (
    <View style={icon.box}>
      <View style={[icon.bubble, { borderColor: color }]} />
      <View style={[icon.bubbleTail, { borderTopColor: color }]} />
    </View>
  );
}

function ProfileIcon({ color }: { color: string }) {
  return (
    <View style={icon.box}>
      <View style={[icon.head, { borderColor: color }]} />
      <View style={[icon.shoulders, { borderColor: color }]} />
    </View>
  );
}

function TabBadge({
  label,
  focused,
  render,
}: {
  label: string;
  focused: boolean;
  render: (color: string) => React.ReactNode;
}) {
  const color = focused ? Colors.cream : Colors.smoke;
  return (
    <View style={wrap.wrap}>
      {focused ? (
        <LinearGradient
          colors={Gradients.primaryCta as unknown as readonly [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={wrap.activePill}
        >
          {render(Colors.cream)}
        </LinearGradient>
      ) : (
        <View style={wrap.inactivePill}>{render(color)}</View>
      )}
      <Text style={[wrap.label, focused && wrap.labelActive]}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: { paddingTop: 8 },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ focused }) => (
            <TabBadge
              label="Discover"
              focused={focused}
              render={(c) => <DiscoveryIcon color={c} />}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="venue"
        options={{
          title: "Venue",
          tabBarIcon: ({ focused }) => (
            <TabBadge
              label="Venue"
              focused={focused}
              render={(c) => <VenueIcon color={c} />}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="paths"
        options={{
          title: "Paths",
          tabBarIcon: ({ focused }) => (
            <TabBadge
              label="Paths"
              focused={focused}
              render={(c) => <PathsIcon color={c} />}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chat/index"
        options={{
          title: "Chat",
          tabBarIcon: ({ focused }) => (
            <TabBadge
              label="Chat"
              focused={focused}
              render={(c) => <ChatIcon color={c} />}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <TabBadge
              label="Profile"
              focused={focused}
              render={(c) => <ProfileIcon color={c} />}
            />
          ),
        }}
      />
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="chat/[matchId]" options={{ href: null }} />
      <Tabs.Screen name="profile/[id]" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#0B0914",
    borderTopColor: "#1A1728",
    borderTopWidth: 1,
    height: 80,
    paddingTop: 6,
    paddingBottom: 12,
  },
});

const wrap = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minWidth: 64,
  },
  activePill: {
    width: 46,
    height: 30,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  inactivePill: {
    width: 46,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.smoke,
    letterSpacing: 0.3,
  },
  labelActive: { color: Colors.cream },
});

const icon = StyleSheet.create({
  box: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  diamond: {
    width: 14,
    height: 14,
    borderWidth: 1.6,
    borderRadius: 2,
  },
  pin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -2,
  },
  pinDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  pathRing: {
    position: "absolute",
    width: 12,
    height: 12,
    borderWidth: 1.6,
    borderRadius: 6,
    left: 2,
    top: 4,
  },
  pathRingOffset: {
    left: 8,
    top: 6,
  },
  bubble: {
    width: 16,
    height: 13,
    borderWidth: 1.6,
    borderRadius: 6,
  },
  bubbleTail: {
    position: "absolute",
    bottom: 3,
    left: 8,
    width: 0,
    height: 0,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 4,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  head: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.6,
    marginBottom: 1,
  },
  shoulders: {
    width: 16,
    height: 9,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 1.6,
    borderBottomWidth: 0,
  },
});
