import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { Chip, Text, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Gradients, Radius, Spacing } from "@/constants/theme";
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/stat-card";
import { useRoleGuard } from "@/lib/use-role-guard";
import { formatRelativeTime } from "@/lib/format";
import { getTrips } from "@/lib/storage";
import type { TripRecord, TripType } from "@/types";

const FILTERS: { label: string; value: TripType | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Device Register", value: "start" },
  { label: "Trip End", value: "end" },
];

export default function HistoryScreen() {
  const { allowed, loading } = useRoleGuard(["admin", "superadmin"]);
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [filter, setFilter] = useState<TripType | "all">("all");
  const [search, setSearch] = useState("");

  const loadTrips = useCallback(() => {
    getTrips().then((all) => all.sort((a, b) => b.createdAt - a.createdAt)).then(setTrips);
  }, []);

  useFocusEffect(loadTrips);

  const stats = useMemo(
    () => ({
      total: trips.length,
      register: trips.filter((t) => t.type === "start").length,
      tripOut: trips.filter((t) => t.type === "end").length,
    }),
    [trips]
  );

  const filtered = trips.filter((trip) => {
    if (filter !== "all" && trip.type !== filter) return false;
    if (!search.trim()) return true;
    const needle = search.trim().toUpperCase();
    return trip.vehicleNo.includes(needle) || trip.rfidTag.includes(needle);
  });

  if (loading || !allowed) return null;

  return (
    <View style={styles.safe}>
      <View style={styles.statsRow}>
        <StatCard icon="format-list-bulleted" label="Total" value={stats.total} colors={Gradients.header} />
        <StatCard icon="login" label="Register" value={stats.register} colors={Gradients.primaryButton} />
        <StatCard icon="flag-checkered" label="Trip End" value={stats.tripOut} colors={Gradients.secondaryButton} />
      </View>

      <TextInput
        placeholder="Search Vehicle / Tag"
        value={search}
        onChangeText={(v) => setSearch(v.toUpperCase())}
        mode="outlined"
        style={styles.search}
        autoCapitalize="characters"
        left={<TextInput.Icon icon="magnify" />}
      />

      <View style={styles.chipRow}>
        {FILTERS.map((f) => (
          <Chip
            key={f.value}
            selected={filter === f.value}
            onPress={() => setFilter(f.value)}
            style={styles.filterChip}
          >
            {f.label}
          </Chip>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {filtered.length === 0 && (
          <EmptyState icon="map-marker-path" message="No history records found." />
        )}
        {filtered.map((trip, index) => {
          const isStart = trip.type === "start";
          const dotColor = isStart ? Colors.primary : Colors.secondary;
          return (
            <View key={trip.id} style={styles.row}>
              <View style={styles.rail}>
                <View style={[styles.dot, { backgroundColor: dotColor }]} />
                {index < filtered.length - 1 && <View style={styles.railLine} />}
              </View>

              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    {trip.imageUri && (
                      <Image source={{ uri: trip.imageUri }} style={styles.headerThumb} />
                    )}
                    <Text style={styles.vehicleNo}>{trip.vehicleNo}</Text>
                  </View>
                  <View style={[styles.typeTag, { backgroundColor: isStart ? "#E3F2D3" : "#D6E8FA" }]}>
                    <MaterialCommunityIcons
                      name={isStart ? "login" : "flag-checkered"}
                      size={12}
                      color={dotColor}
                    />
                    <Text style={[styles.typeTagText, { color: dotColor }]}>
                      {isStart ? "Device Register" : "Trip End"}
                    </Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <MaterialCommunityIcons name="tag-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.detail}>{trip.rfidTag || "-"}</Text>
                </View>
                <View style={styles.metaRow}>
                  <MaterialCommunityIcons
                    name={isStart ? "map-marker-outline" : "flag-checkered"}
                    size={14}
                    color={Colors.textMuted}
                  />
                  <Text style={styles.detail}>{trip.place}</Text>
                </View>
                <View style={styles.metaRow}>
                  <MaterialCommunityIcons name="cellphone-cog" size={14} color={Colors.textMuted} />
                  <Text style={styles.detail}>{trip.deviceName}</Text>
                </View>

                <View style={styles.footerRow}>
                  <View style={styles.coordChip}>
                    <MaterialCommunityIcons name="crosshairs-gps" size={12} color={Colors.secondary} />
                    <Text style={styles.coordText}>
                      {trip.latitude}, {trip.longitude}
                    </Text>
                  </View>
                  <Text style={styles.timestamp}>{formatRelativeTime(trip.createdAt)}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background, padding: Spacing.md },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  search: {
    backgroundColor: Colors.white,
    marginBottom: Spacing.sm,
  },
  chipRow: {
    flexDirection: "row",
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  filterChip: {
    backgroundColor: Colors.white,
  },
  list: {
    paddingBottom: 60,
  },
  row: {
    flexDirection: "row",
  },
  rail: {
    width: 24,
    alignItems: "center",
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 6,
    borderWidth: 2,
    borderColor: Colors.white,
    elevation: 2,
  },
  railLine: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.border,
    marginVertical: 2,
  },
  card: {
    flex: 1,
    marginBottom: Spacing.md,
    borderRadius: Radius.md,
    padding: Spacing.md,
    backgroundColor: Colors.white,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  headerThumb: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  vehicleNo: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
  },
  typeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  typeTagText: {
    fontSize: 10,
    fontWeight: "800",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },
  detail: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  coordChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EAF2FA",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  coordText: {
    fontSize: 11,
    color: Colors.secondary,
    fontWeight: "600",
  },
  timestamp: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "600",
  },
});
