import { Tabs } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/theme";

function TabIcon({
  glyph,
  focused,
}: {
  glyph: string;
  focused: boolean;
}) {
  return (
    <View style={styles.iconWrap}>
      <Text style={[styles.iconGlyph, focused ? styles.iconActive : styles.iconInactive]}>
        {glyph}
      </Text>
      {focused ? <View style={styles.activeDot} /> : null}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.label,
        tabBarActiveTintColor: Colors.ember,
        tabBarInactiveTintColor: Colors.smoke,
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discovery",
          tabBarIcon: ({ focused }) => <TabIcon glyph="◈" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="venue"
        options={{
          title: "Venue",
          tabBarIcon: ({ focused }) => <TabIcon glyph="◎" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="paths"
        options={{
          title: "Paths",
          tabBarIcon: ({ focused }) => <TabIcon glyph="✦" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ focused }) => <TabIcon glyph="💬" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => <TabIcon glyph="👤" focused={focused} />,
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
    backgroundColor: Colors.obsidian,
    borderTopColor: Colors.dusk,
    borderTopWidth: 1,
    height: 72,
    paddingTop: 6,
  },
  label: {
    fontSize: 11,
    marginBottom: 4,
  },
  iconWrap: {
    alignItems: "center",
    minHeight: 24,
    justifyContent: "center",
  },
  iconGlyph: {
    fontSize: 16,
  },
  iconActive: {
    color: Colors.ember,
  },
  iconInactive: {
    color: Colors.smoke,
  },
  activeDot: {
    marginTop: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.ember,
  },
});
