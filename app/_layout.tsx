import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Colors } from "@/constants/theme";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "@/store/authStore";
import type { User } from "@/types/database";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const queryClient = useMemo(() => new QueryClient(), []);
  const router = useRouter();
  const segments = useSegments();
  const [authReady, setAuthReady] = useState(false);

  const { session, setSession, setUser, clearAuth } = useAuthStore();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const registerPushToken = async () => {
      try {
        if (!Device.isDevice) {
          return;
        }

        const permissions = await Notifications.getPermissionsAsync();
        let finalStatus = permissions.status;
        if (finalStatus !== "granted") {
          const requested = await Notifications.requestPermissionsAsync();
          finalStatus = requested.status;
        }
        if (finalStatus !== "granted") {
          return;
        }

        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          Constants.easConfig?.projectId ??
          undefined;
        const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
        const token = tokenResponse.data;
        const authUserId = useAuthStore.getState().session?.user?.id;
        if (!authUserId || !token) {
          return;
        }

        await supabase
          .from("users")
          .update({ expo_push_token: token } as never)
          .eq("auth_id", authUserId);
      } catch (error) {
        console.warn("Push token registration skipped:", error);
      }
    };

    void registerPushToken();
  }, []);

  useEffect(() => {
    let mounted = true;

    const hydrateAuth = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (error || !data.session) {
        clearAuth();
        setAuthReady(true);
        return;
      }

      setSession(data.session);
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", data.session.user.id)
        .single<User>();

      setUser(profile ?? null);
      setAuthReady(true);
    };

    void hydrateAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted) {
        return;
      }

      if (!nextSession) {
        clearAuth();
        return;
      }

      setSession(nextSession);
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", nextSession.user.id)
        .single<User>();

      setUser(profile ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [clearAuth, setSession, setUser]);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    const inAuthGroup = segments[0] === "(auth)";
    const inTabsGroup = segments[0] === "(tabs)";
    const routePath = segments.join("/");
    const currentUser = useAuthStore.getState().user;
    const hasProfile = Boolean(currentUser);
    const isApproved =
      currentUser?.is_approved ?? currentUser?.is_founder_approved ?? false;

    if (!session) {
      if (!inAuthGroup) {
        router.replace("/(auth)");
      }
      void SplashScreen.hideAsync();
      return;
    }

    if (!hasProfile || !isApproved) {
      if (!inAuthGroup) {
        router.replace(hasProfile ? "/(auth)/pending" : "/(auth)/profile-setup");
      } else if (hasProfile && routePath === "(auth)/profile-setup") {
        router.replace("/(auth)/pending");
      }
      void SplashScreen.hideAsync();
      return;
    }

    if (!inTabsGroup) {
      router.replace("/(tabs)");
    }
    void SplashScreen.hideAsync();
  }, [authReady, router, segments, session]);

  return (
    <QueryClientProvider client={queryClient}>
      <MobileFrame>
        <View style={{ flex: 1, backgroundColor: Colors.void }}>
          {user?.is_invisible ? (
            <Pressable
              style={{
                backgroundColor: Colors.ash,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: Colors.mist,
              }}
              onPress={async () => {
                if (!user.id) {
                  return;
                }
                await supabase
                  .from("users")
                  .update({ is_invisible: false } as never)
                  .eq("id", user.id);
                setUser({ ...user, is_invisible: false });
              }}
            >
              <Text style={{ color: Colors.fog, fontSize: 13 }}>
                You&apos;re invisible · Tap to reappear
              </Text>
            </Pressable>
          ) : null}
          <Slot />
        </View>
      </MobileFrame>
    </QueryClientProvider>
  );
}

/**
 * On web + wide viewports, constrain app width to a mobile frame
 * (420 × 900) centered on a dim backdrop. On native (iOS/Android) or
 * narrow viewports, this is a no-op.
 */
function MobileFrame({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  if (Platform.OS !== "web" || width <= 640) {
    return <View style={{ flex: 1, backgroundColor: Colors.void }}>{children}</View>;
  }
  return (
    <View style={styles.webBackdrop}>
      <View style={styles.webFrame}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  webBackdrop: {
    flex: 1,
    backgroundColor: "#050309",
    alignItems: "center",
    justifyContent: "center",
  },
  webFrame: {
    width: 420,
    height: "100%",
    maxHeight: 900,
    backgroundColor: Colors.void,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1A1728",
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 40,
  },
});
