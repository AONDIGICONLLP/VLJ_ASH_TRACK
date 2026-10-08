import { useEffect, useRef } from "react";
import { router, Tabs } from "expo-router";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { Alert, Animated, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActivityIndicator, Appbar } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors, Gradients, Radius } from "@/constants/theme";
import { useAuth } from "@/lib/auth-context";
import { hasAnyView, hasView } from "@/lib/permissions";
import type { Session } from "@/types";

const TITLES: Record<string, string> = {
  "vehicle-rfid": "Vehicle RFID Mapping",
  "device-creation": "Device Registration",
  "trip-start": "Trip Start",
  "trip-end": "Trip End",
  history: "History",
  "user-creation": "User Register",
};

const ROUTE_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  "vehicle-rfid": "car-outline",
  "device-creation": "cellphone-cog",
  "trip-start": "flag-outline",
  "trip-end": "flag-checkered",
  history: "history",
  "user-creation": "account-plus-outline",
};

// Maps each bottom-tab route to the permission shortCode that gates it.
// History isn't tied to a single resource permission — it's visible as long
// as the account can view anything at all.
const ROUTE_PERMISSION: Record<string, string | null> = {
  "vehicle-rfid": "RFIDVehicleMapping",
  "device-creation": "HandheldReaderRegistration",
  "trip-start": "TripStart",
  "trip-end": "TripEnd",
  history: null,
  "user-creation": "UserCreation",
};

function tabHref(session: Session | null, name: string) {
  if (!session) return null;
  const shortCode = ROUTE_PERMISSION[name];
  const visible = shortCode === null ? hasAnyView(session.permissions) : hasView(session.permissions, shortCode);
  return visible ? undefined : null;
}

function renderTabIcon(iconName: keyof typeof MaterialCommunityIcons.glyphMap) {
  function TabIcon({ color, size, focused }: { color: string; size: number; focused: boolean }) {
    if (focused) {
      return (
        <LinearGradient
          colors={Gradients.primaryButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.iconPillActive}
        >
          <MaterialCommunityIcons name={iconName} size={size + 1} color={Colors.white} />
        </LinearGradient>
      );
    }
    return (
      <View style={styles.iconPill}>
        <MaterialCommunityIcons name={iconName} size={size} color={color} />
      </View>
    );
  }
  return TabIcon;
}

// Adds a tactile press-in bounce + a light haptic tick on tab change, on top
// of the default tab button — purely a feel/polish layer.
function AnimatedTabButton({
  children,
  style,
  onPress,
  onLongPress,
  accessibilityState,
}: BottomTabBarButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  function pressIn() {
    Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  }

  function pressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start();
  }

  function handlePress(event: Parameters<NonNullable<BottomTabBarButtonProps["onPress"]>>[0]) {
    if (!accessibilityState?.selected) {
      Haptics.selectionAsync();
    }
    onPress?.(event);
  }

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      accessibilityState={accessibilityState}
      style={style}
    >
      <Animated.View style={[styles.tabButtonInner, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

export default function TabsLayout() {
  const { session, loading, logout } = useAuth();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/login");
    }
  }, [loading, session]);

  function handleLogout() {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  }

  if (loading || !session) {
    return <ActivityIndicator style={styles.loader} color={Colors.primary} size="large" />;
  }

  return (
    <Tabs
      screenOptions={({ route }) => ({
        header: () => {
          return (
            <View style={styles.headerWrap}>
              <LinearGradient
                colors={Gradients.hero}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerGradient}
              />
              <View style={styles.headerGlow} pointerEvents="none" />
              <Appbar.Header style={styles.appbar}>
                <View style={styles.headerIconBadge}>
                  <MaterialCommunityIcons
                    name={ROUTE_ICONS[route.name] ?? "view-grid-outline"}
                    size={18}
                    color={Colors.white}
                  />
                </View>
                <Appbar.Content
                  title={TITLES[route.name] ?? route.name}
                  titleStyle={styles.appbarTitle}
                  style={styles.appbarContent}
                  color={Colors.white}
                />
                <Appbar.Action
                  icon="logout"
                  color={Colors.white}
                  style={styles.headerBadge}
                  onPress={handleLogout}
                />
              </Appbar.Header>
            </View>
          );
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: [styles.tabBar, { bottom: 14 + insets.bottom }],
        tabBarBackground: () => (
          <LinearGradient
            colors={["#FFFFFF", "#F3F8FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.tabBarGradient}
          />
        ),
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
        tabBarButton: AnimatedTabButton,
      })}
    >
      <Tabs.Screen
        name="vehicle-rfid"
        options={{
          title: TITLES["vehicle-rfid"],
          tabBarLabel: "RFID Mapping",
          href: tabHref(session, "vehicle-rfid"),
          tabBarIcon: renderTabIcon("car-outline"),
        }}
      />
      <Tabs.Screen
        name="device-creation"
        options={{
          title: TITLES["device-creation"],
          tabBarLabel: "Register Device",
          href: tabHref(session, "device-creation"),
          tabBarIcon: renderTabIcon("cellphone-cog"),
        }}
      />
      <Tabs.Screen
        name="trip-start"
        options={{
          title: TITLES["trip-start"],
          tabBarLabel: "Trip Start",
          href: tabHref(session, "trip-start"),
          tabBarIcon: renderTabIcon("flag-outline"),
        }}
      />
      <Tabs.Screen
        name="trip-end"
        options={{
          title: TITLES["trip-end"],
          tabBarLabel: "Trip End",
          href: tabHref(session, "trip-end"),
          tabBarIcon: renderTabIcon("flag-checkered"),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: TITLES.history,
          tabBarLabel: "History",
          href: tabHref(session, "history"),
          tabBarIcon: renderTabIcon("history"),
        }}
      />
      <Tabs.Screen
        name="user-creation"
        options={{
          title: TITLES["user-creation"],
          tabBarLabel: "User Register",
          href: tabHref(session, "user-creation"),
          tabBarIcon: renderTabIcon("account-plus-outline"),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    position: "relative",
    elevation: 8,
    shadowColor: "#001A38",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
  },
  // Rounded on its own corners (not the wrapper) so the shadow above is
  // never fighting an overflow:hidden clip on Android.
  headerGradient: {
    ...StyleSheet.absoluteFillObject,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
  },
  // A single soft ambient highlight in the top-right corner — restrained,
  // not a repeating pattern.
  headerGlow: {
    position: "absolute",
    top: -46,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  appbar: {
    backgroundColor: "transparent",
  },
  headerIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginLeft: 12,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginHorizontal: 8,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  appbarContent: {
    marginLeft: 6,
  },
  appbarTitle: {
    fontWeight: "800",
    fontSize: 19,
    letterSpacing: 0.3,
  },
  tabBar: {
    position: "absolute",
    left: 14,
    right: 14,
    // bottom is set dynamically from useSafeAreaInsets() so the floating bar
    // clears the gesture-nav/home-indicator area on every device.
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(0,82,152,0.08)",
    borderRadius: Radius.xl,
    height: 68,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 4,
    elevation: 18,
    shadowColor: "#0B1F33",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
  },
  tabBarGradient: {
    flex: 1,
    borderRadius: Radius.xl,
  },
  tabBarLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    marginTop: 3,
  },
  tabBarItem: {
    paddingTop: 0,
    borderRadius: Radius.lg,
  },
  tabButtonInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  iconPillActive: {
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 999,
    elevation: 6,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  loader: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
  },
});
