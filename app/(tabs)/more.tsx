import { useEffect, useState } from "react";
import { router } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { Card, List, Text } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Gradients, Radius, Spacing } from "@/constants/theme";
import { StatCard } from "@/components/stat-card";
import { useAuth } from "@/lib/auth-context";
import { useRoleGuard } from "@/lib/use-role-guard";
import { ApiError, getVehiclesApi, getZonesApi } from "@/lib/api";
import { getUsers } from "@/lib/storage";

const ROLE_LABEL: Record<string, string> = {
  superadmin: "Superadmin",
  admin: "Admin",
  user: "User",
};

const ITEMS: {
  title: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  route: "/(tabs)/user-creation";
}[] = [
  {
    title: "User Register",
    description: "Register Admin and User accounts",
    icon: "account-plus-outline",
    route: "/(tabs)/user-creation",
  },
];

export default function MoreScreen() {
  const { allowed, loading } = useRoleGuard(["admin", "superadmin"]);
  const { session } = useAuth();

  const [vehicleCount, setVehicleCount] = useState<number | null>(null);
  const [zoneCount, setZoneCount] = useState<number | null>(null);
  const [teamCount, setTeamCount] = useState<number | null>(null);

  useEffect(() => {
    getVehiclesApi()
      .then((v) => setVehicleCount(v.length))
      .catch((e) => {
        console.log("[vehicles]", e instanceof ApiError ? e.message : e);
        setVehicleCount(0);
      });
    getZonesApi()
      .then((z) => setZoneCount(z.length))
      .catch((e) => {
        console.log("[zones]", e instanceof ApiError ? e.message : e);
        setZoneCount(0);
      });
    getUsers().then((u) => setTeamCount(u.length));
  }, []);

  if (loading || !allowed) return null;

  const initial = (session?.username || "?").trim().charAt(0).toUpperCase();

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.scroll}>
      <LinearGradient
        colors={Gradients.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.profileCard}
      >
        <View style={styles.watermarkWrap} pointerEvents="none">
          <MaterialCommunityIcons name="shield-star-outline" size={110} color="rgba(255,255,255,0.08)" />
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{session?.username}</Text>
          <Text style={styles.profileEmail}>{session?.email}</Text>
          <View style={styles.rolePill}>
            <MaterialCommunityIcons name="shield-check-outline" size={12} color={Colors.white} />
            <Text style={styles.rolePillText}>{ROLE_LABEL[session?.role ?? ""] ?? session?.role}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.statsRow}>
        <StatCard
          icon="truck-outline"
          label="Fleet Vehicles"
          value={vehicleCount ?? "…"}
          colors={Gradients.primaryButton}
        />
        <StatCard
          icon="map-marker-radius-outline"
          label="Zones"
          value={zoneCount ?? "…"}
          colors={Gradients.secondaryButton}
        />
        <StatCard
          icon="account-group-outline"
          label="Team"
          value={teamCount ?? "…"}
          colors={Gradients.danger}
        />
      </View>

      <View style={styles.sectionLabelRow}>
        <MaterialCommunityIcons name="cog-outline" size={14} color={Colors.textMuted} />
        <Text style={styles.sectionLabel}>Administration</Text>
      </View>
      <Card style={styles.card} mode="elevated" elevation={2}>
        {ITEMS.map((item, index) => (
          <View key={item.route}>
            <List.Item
              title={item.title}
              description={item.description}
              titleStyle={styles.itemTitle}
              descriptionStyle={styles.itemDescription}
              left={() => (
                <LinearGradient
                  colors={Gradients.brand}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconWrap}
                >
                  <MaterialCommunityIcons name={item.icon} size={20} color={Colors.white} />
                </LinearGradient>
              )}
              right={(props) => (
                <View style={styles.chevronWrap}>
                  <List.Icon {...props} icon="chevron-right" color={Colors.textMuted} />
                </View>
              )}
              onPress={() => router.push(item.route)}
              style={styles.listItem}
            />
            {index < ITEMS.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.md, paddingBottom: 120 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.md,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  watermarkWrap: {
    position: "absolute",
    right: -20,
    top: -20,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.white,
  },
  profileEmail: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    marginTop: 6,
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.white,
    letterSpacing: 0.4,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  card: {
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    overflow: "hidden",
  },
  listItem: {
    paddingVertical: Spacing.sm,
  },
  itemTitle: {
    fontWeight: "700",
    color: Colors.text,
  },
  itemDescription: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  chevronWrap: {
    justifyContent: "center",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginLeft: Spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: Spacing.lg,
  },
});
