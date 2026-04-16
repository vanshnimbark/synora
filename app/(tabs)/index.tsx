import { Text, View } from "react-native";

import { Colors, Space } from "@/constants/theme";

export default function TabsHomeScreen() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: Colors.void,
        alignItems: "center",
        justifyContent: "center",
        padding: Space.md,
      }}
    >
      <Text style={{ color: Colors.cream }}>Main app tab shell.</Text>
    </View>
  );
}
