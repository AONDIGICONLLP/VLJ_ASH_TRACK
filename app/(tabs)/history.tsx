import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Chip, Text, TextInput } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Gradients, Radius, Spacing, TabBarMetrics } from "@/constants/theme";
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/stat-card";
import { useAuth } from "@/lib/auth-context";
import { useAnyPermissionGuard } from "@/lib/use-permission-guard";
import { formatRelativeTime, parseSqlDateTime } from "@/lib/format";
import { ApiError, getRolesApi, getUserHistoryApi, type UserHistory } from "@/lib/api";

type Category = "user" | "rfid" | "reader" | "trip";

type FeedItem = {
  key: string;
  category: Category;
  timestamp: number;
  title: string;
  lines: string[];
  active?: boolean;
  searchText: string;
};

const CATEGORY_META: Record<
  Category,
  {
    label: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    colors: [string, string];
    tint: string;
    text: string;
  }
> = {
  user: {
    label: "User",
    icon: "account-outline",
    colors: Gradients.primaryButton,
    tint: "#E3F2D3",
    text: Colors.primaryDark,
  },
  rfid: {
    label: "RFID",
    icon: "tag-outline",
    colors: Gradients.secondaryButton,
    tint: "#D6E8FA",
    text: Colors.secondary,
  },
  reader: {
    label: "Reader",
    icon: "cellphone-cog",
    colors: Gradients.danger,
    tint: "#FBE3DA",
    text: Colors.dangerDark,
  },
  trip: {
    label: "Trip",
    icon: "flag-checkered",
    colors: Gradients.brand,
    tint: "#E4E9F5",
    text: Colors.secondaryDark,
  },
};

const FILTERS: { label: string; value: "all" | Category }[] = [
  { label: "All", value: "all" },
  { label: "Users", value: "user" },
  { label: "RFID", value: "rfid" },
  { label: "Readers", value: "reader" },
  { label: "Trips", value: "trip" },
];

function buildFeed(history: UserHistory, roleNames: string[]): FeedItem[] {
  const items: FeedItem[] = [];

  history.users.forEach((u) => {
    const timestamp = parseSqlDateTime(u.updatedAt ?? u.createdAt) ?? 0;
    const roleName = roleNames[u.roleID - 1] ?? `Role ${u.roleID}`;
    items.push({
      key: `user-${u.id}`,
      category: "user",
      timestamp,
      title: u.name || u.username,
      lines: [`@${u.username} · ${roleName}`, u.company].filter(Boolean),
      active: !!u.isActive,
      searchText: `${u.username} ${u.name} ${u.email} ${u.company}`.toLowerCase(),
    });
  });

  history.rfid.forEach((r) => {
    const timestamp = parseSqlDateTime(r.updatedAt ?? r.createdAt) ?? 0;
    items.push({
      key: `rfid-${r.id}`,
      category: "rfid",
      timestamp,
      title: r.rfid,
      lines: [`Vehicle: ${r.deviceID}`],
      active: !!r.isActive,
      searchText: `${r.rfid} ${r.deviceID}`.toLowerCase(),
    });
  });

  history.readers.forEach((rd) => {
    const timestamp = parseSqlDateTime(rd.updatedAt ?? rd.createdAt) ?? 0;
    items.push({
      key: `reader-${rd.id}`,
      category: "reader",
      timestamp,
      title: rd.readerID,
      lines: [`Zone: ${rd.zoneID}`],
      active: !!rd.isActive,
      searchText: `${rd.readerID} ${rd.zoneID}`.toLowerCase(),
    });
  });

  // Shape unverified — the live endpoint has only ever returned an empty
  // array here. Extract common-sounding fields defensively rather than
  // assuming a schema.
  history.trips.forEach((raw, index) => {
    const createdAt = typeof raw.createdAt === "string" ? raw.createdAt : undefined;
    const timestamp = parseSqlDateTime(createdAt) ?? 0;
    const id = raw.id;
    const deviceID = raw.deviceID ?? raw.vehicleNo;
    const rfid = raw.rfid;
    items.push({
      key: `trip-${typeof id === "number" || typeof id === "string" ? id : index}`,
      category: "trip",
      timestamp,
      title: deviceID ? String(deviceID) : "Trip record",
      lines: rfid ? [`RFID: ${String(rfid)}`] : [],
      searchText: JSON.stringify(raw).toLowerCase(),
    });
  });

  return items.sort((a, b) => b.timestamp - a.timestamp);
}

export default function HistoryScreen() {
  const { allowed, loading: guardLoading } = useAnyPermissionGuard();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const listBottomPadding = insets.bottom + TabBarMetrics.height + TabBarMetrics.bottomMargin + Spacing.md;
  // Only roleID 1 (the top-level admin account) sees the full audit trail —
  // every other login only ever sees their own trip history here.
  const isFullAccess = String(session?.roleID) === "1";

  const [history, setHistory] = useState<UserHistory | null>(null);
  const [roleNames, setRoleNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<"all" | Category>("all");
  const [search, setSearch] = useState("");

  const loadHistory = useCallback(() => {
    setLoading(true);
    setLoadError("");
    const rolesPromise = isFullAccess ? getRolesApi().catch(() => [] as string[]) : Promise.resolve([]);
    Promise.all([getUserHistoryApi(), rolesPromise])
      .then(([data, roles]) => {
        setHistory(data);
        setRoleNames(roles);
      })
      .catch((e) => {
        setHistory(null);
        setLoadError(e instanceof ApiError ? e.message : "Could not load history.");
      })
      .finally(() => setLoading(false));
  }, [isFullAccess]);

  useFocusEffect(loadHistory);

  const feed = useMemo(() => {
    if (!history) return [];
    const full = buildFeed(history, roleNames);
    return isFullAccess ? full : full.filter((item) => item.category === "trip");
  }, [history, roleNames, isFullAccess]);

  const stats = useMemo(
    () => ({
      users: history?.users.length ?? 0,
      rfid: history?.rfid.length ?? 0,
      readers: history?.readers.length ?? 0,
      trips: history?.trips.length ?? 0,
    }),
    [history]
  );

  const filtered = feed.filter((item) => {
    if (filter !== "all" && item.category !== filter) return false;
    if (!search.trim()) return true;
    return item.searchText.includes(search.trim().toLowerCase());
  });

  if (guardLoading || !allowed) return null;

  return (
    <View style={styles.safe}>
      <View style={styles.statsGrid}>
        {isFullAccess && (
          <>
            <StatCard icon="account-group-outline" label="Users" value={stats.users} colors={Gradients.primaryButton} />
            <StatCard icon="tag-multiple-outline" label="RFID Tags" value={stats.rfid} colors={Gradients.secondaryButton} />
            <StatCard icon="cellphone-cog" label="Readers" value={stats.readers} colors={Gradients.danger} />
          </>
        )}
        <StatCard icon="flag-checkered" label="Trips" value={stats.trips} colors={Gradients.brand} />
      </View>

      <TextInput
        placeholder="Search history"
        value={search}
        onChangeText={setSearch}
        mode="outlined"
        style={styles.search}
        left={<TextInput.Icon icon="magnify" />}
      />

      {isFullAccess && (
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
      )}

      {loading && !history ? (
        <ActivityIndicator style={styles.loader} color={Colors.secondary} />
      ) : loadError ? (
        <EmptyState icon="alert-circle-outline" message={loadError} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: listBottomPadding }}>
          {filtered.length === 0 && (
            <EmptyState icon="map-marker-path" message="No history records found." />
          )}
          {filtered.map((item, index) => {
            const meta = CATEGORY_META[item.category];
            return (
              <View key={item.key} style={styles.row}>
                <View style={styles.rail}>
                  <LinearGradient
                    colors={meta.colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.dot}
                  />
                  {index < filtered.length - 1 && <View style={styles.railLine} />}
                </View>

                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <LinearGradient
                        colors={meta.colors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.iconWrap}
                      >
                        <MaterialCommunityIcons name={meta.icon} size={16} color={Colors.white} />
                      </LinearGradient>
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                    </View>
                    <View style={styles.badgeGroup}>
                      {item.active === false && (
                        <View style={styles.inactiveBadge}>
                          <Text style={styles.inactiveBadgeText}>Inactive</Text>
                        </View>
                      )}
                      <View style={[styles.typeTag, { backgroundColor: meta.tint }]}>
                        <Text style={[styles.typeTagText, { color: meta.text }]}>{meta.label}</Text>
                      </View>
                    </View>
                  </View>

                  {item.lines.map((line, lineIndex) => (
                    <Text key={lineIndex} style={styles.detail}>
                      {line}
                    </Text>
                  ))}

                  <View style={styles.cardFooter}>
                    <Text style={styles.timestamp}>
                      {item.timestamp ? formatRelativeTime(item.timestamp) : "-"}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background, padding: Spacing.md },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
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
    flexWrap: "wrap",
  },
  filterChip: {
    backgroundColor: Colors.white,
  },
  loader: {
    marginTop: Spacing.xl,
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
    gap: Spacing.sm,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.text,
    flexShrink: 1,
  },
  badgeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  typeTagText: {
    fontSize: 10,
    fontWeight: "800",
  },
  inactiveBadge: {
    backgroundColor: "#FBE9E3",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  inactiveBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.danger,
  },
  detail: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  timestamp: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "600",
  },
});
