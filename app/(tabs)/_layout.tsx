import { useEffect } from "react";
import { router, Tabs } from "expo-router";
import { Alert, StyleSheet, View } from "react-native";
import { ActivityIndicator, Appbar } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Gradients, Radius } from "@/constants/theme";
import { useAuth } from "@/lib/auth-context";
import type { Role } from "@/types";

const TITLES: Record<string, string> = {
  "vehicle-rfid": "Vehicle RFID Mapping",
  "device-creation": "Device Registration",
  "trip-start": "Trip Start",
  "trip-end": "Trip End",
  "user-creation": "User Register",
  history: "History",
  more: "More",
};

const ROUTE_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  "vehicle-rfid": "car-outline",
  "device-creation": "cellphone-cog",
  "trip-start": "flag-outline",
  "trip-end": "flag-checkered",
  "user-creation": "account-plus-outline",
  history: "history",
  more: "dots-horizontal-circle-outline",
};

const VISIBLE_IN_BAR: Record<Role, string[]> = {
  superadmin: ["vehicle-rfid", "device-creation", "trip-end", "history", "more"],
  admin: ["vehicle-rfid", "user-creation", "device-creation", "history", "more"],
  user: ["vehicle-rfid", "device-creation", "trip-end"],
};

const BACK_TO_MORE_ROUTES = ["user-creation"];

function tabHref(role: Role | undefined, name: string) {
  if (!role) return null;
  return VISIBLE_IN_BAR[role].includes(name) ? undefined : null;
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

export default function TabsLayout() {
  const { session, loading, logout } = useAuth();

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

  const role = session.role;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        header: () => {
          const showBackToMore =
            role === "superadmin" && BACK_TO_MORE_ROUTES.includes(route.name);
          return (
            <View style={styles.headerWrap}>
              <LinearGradient
                colors={Gradients.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
              <Appbar.Header style={styles.appbar}>
                {showBackToMore ? (
                  <Appbar.BackAction
                    color={Colors.white}
                    onPress={() => router.replace("/(tabs)/more")}
                  />
                ) : (
                  <View style={styles.headerIconBadge}>
                    <MaterialCommunityIcons
                      name={ROUTE_ICONS[route.name] ?? "view-grid-outline"}
                      size={19}
                      color={Colors.white}
                    />
                  </View>
                )}
                <Appbar.Content
                  title={TITLES[route.name] ?? route.name}
                  titleStyle={styles.appbarTitle}
                  style={styles.appbarContent}
                  color={Colors.white}
                />
                <Appbar.Action icon="logout" color={Colors.white} onPress={handleLogout} />
              </Appbar.Header>
            </View>
          );
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      })}
    >
      <Tabs.Screen
        name="vehicle-rfid"
        options={{
          title: TITLES["vehicle-rfid"],
          tabBarLabel: "RFID Mapping",
          href: tabHref(role, "vehicle-rfid"),
          tabBarIcon: renderTabIcon("car-outline"),
        }}
      />
      <Tabs.Screen
        name="user-creation"
        options={{
          title: TITLES["user-creation"],
          tabBarLabel: "User Register",
          href: tabHref(role, "user-creation"),
          tabBarIcon: renderTabIcon("account-plus-outline"),
        }}
      />
      <Tabs.Screen
        name="device-creation"
        options={{
          title: TITLES["device-creation"],
          tabBarLabel: "Register Device",
          href: tabHref(role, "device-creation"),
          tabBarIcon: renderTabIcon("cellphone-cog"),
        }}
      />
      <Tabs.Screen
        name="trip-start"
        options={{
          title: TITLES["trip-start"],
          tabBarLabel: "Trip Start",
          href: tabHref(role, "trip-start"),
          tabBarIcon: renderTabIcon("flag-outline"),
        }}
      />
      <Tabs.Screen
        name="trip-end"
        options={{
          title: TITLES["trip-end"],
          tabBarLabel: "Trip End",
          href: tabHref(role, "trip-end"),
          tabBarIcon: renderTabIcon("flag-checkered"),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: TITLES.history,
          tabBarLabel: "History",
          href: tabHref(role, "history"),
          tabBarIcon: renderTabIcon("history"),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: TITLES.more,
          tabBarLabel: "More",
          href: tabHref(role, "more"),
          tabBarIcon: renderTabIcon("dots-horizontal-circle-outline"),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    position: "relative",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
  appbar: {
    backgroundColor: "transparent",
  },
  headerIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    marginLeft: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  appbarContent: {
    marginLeft: 4,
  },
  appbarTitle: {
    fontWeight: "800",
    fontSize: 19,
    letterSpacing: 0.2,
  },
  tabBar: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    backgroundColor: Colors.white,
    borderTopWidth: 0,
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
  tabBarLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    marginTop: 3,
  },
  tabBarItem: {
    paddingTop: 0,
    borderRadius: Radius.lg,
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
