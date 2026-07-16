import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Text, TextInput } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Gradients, Radius, Spacing } from "@/constants/theme";
import DialogComponent from "@/components/dialog";
import { DropdownField } from "@/components/dropdown-field";
import { EmptyState } from "@/components/empty-state";
import { GradientButton } from "@/components/gradient-button";
import { GradientFab } from "@/components/gradient-fab";
import { StatusDot } from "@/components/status-dot";
import { ApiError, getVehiclesApi } from "@/lib/api";
import { getDeviceId } from "@/lib/device";
import { formatRelativeTime } from "@/lib/format";
import { useRoleGuard } from "@/lib/use-role-guard";
import { findDeviceByHardwareId, findVehicleByNo, findVehicleByTag, getTrips } from "@/lib/storage";
import type { DeviceRecord, TripMethod, TripRecord, Vehicle } from "@/types";

export function TripScreen() {
  const { allowed, loading: guardLoading } = useRoleGuard(["user", "superadmin"]);

  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [registeredDevice, setRegisteredDevice] = useState<DeviceRecord | null>(null);
  const [checkingDevice, setCheckingDevice] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [apiVehicles, setApiVehicles] = useState<string[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehiclesError, setVehiclesError] = useState("");
  const [method, setMethod] = useState<TripMethod>("rfid");
  const [rfidInput, setRfidInput] = useState("");
  const [vehicleNoInput, setVehicleNoInput] = useState("");
  const [matchedVehicle, setMatchedVehicle] = useState<Vehicle | null>(null);
  const [matchedTag, setMatchedTag] = useState("");
  const [lookupFailed, setLookupFailed] = useState(false);
  const [error, setError] = useState("");

  const loadTrips = useCallback(() => {
    getTrips("start").then(setTrips);
  }, []);

  useFocusEffect(loadTrips);

  useEffect(() => {
    setCheckingDevice(true);
    getDeviceId().then(async (id) => {
      const device = await findDeviceByHardwareId(id);
      setRegisteredDevice(device ?? null);
      setCheckingDevice(false);
    });
  }, []);

  useEffect(() => {
    if (!modalVisible) return;
    setVehiclesLoading(true);
    setVehiclesError("");
    getVehiclesApi()
      .then(setApiVehicles)
      .catch((e) => {
        const message = e instanceof ApiError ? e.message : "Could not load vehicles.";
        console.log("[vehicles]", message);
        setApiVehicles([]);
        setVehiclesError(message);
      })
      .finally(() => setVehiclesLoading(false));
  }, [modalVisible]);

  useEffect(() => {
    if (method !== "rfid" || !rfidInput.trim()) {
      setMatchedVehicle(null);
      setMatchedTag("");
      setLookupFailed(false);
      return;
    }
    let cancelled = false;
    findVehicleByTag(rfidInput.trim()).then((vehicle) => {
      if (cancelled) return;
      setMatchedVehicle(vehicle ?? null);
      setMatchedTag(vehicle ? rfidInput.trim().toUpperCase() : "");
      setLookupFailed(!vehicle);
    });
    return () => {
      cancelled = true;
    };
  }, [rfidInput, method]);

  function switchMethod(next: TripMethod) {
    setMethod(next);
    setMatchedVehicle(null);
    setMatchedTag("");
    setLookupFailed(false);
    setRfidInput("");
    setVehicleNoInput("");
  }

  async function handleVehicleNoChange(value: string) {
    setVehicleNoInput(value);
    if (!value.trim()) {
      setMatchedVehicle(null);
      setMatchedTag("");
      return;
    }
    const vehicle = await findVehicleByNo(value.trim());
    setMatchedVehicle(vehicle ?? null);
    setMatchedTag(vehicle?.rfidTags.join(", ") ?? "");
  }

  function closeModal() {
    setModalVisible(false);
    setMethod("rfid");
    setRfidInput("");
    setVehicleNoInput("");
    setMatchedVehicle(null);
    setMatchedTag("");
    setLookupFailed(false);
    setError("");
  }

  async function handleSubmit() {
    if (!registeredDevice) {
      setError("This device is not registered.");
      return;
    }
    if (!matchedVehicle) {
      setError(
        method === "rfid"
          ? "Enter a valid RFID tag that is mapped to a vehicle."
          : "Enter a valid vehicle number that is mapped."
      );
      return;
    }
    closeModal();
    loadTrips();
  }

  if (guardLoading || !allowed) return null;

  return (
    <View style={styles.safe}>
      {!checkingDevice && !registeredDevice && (
        <Card style={styles.warningCard}>
          <Text style={styles.warningText}>
            This device is not registered yet. Register it from the Device Registration tab.
          </Text>
        </Card>
      )}

      {registeredDevice && (
        <LinearGradient
          colors={Gradients.primaryButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.deviceCard}
        >
          <View style={styles.liveRow}>
            <StatusDot color={Colors.white} size={8} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <Text style={styles.deviceName}>{registeredDevice.deviceName}</Text>
          {!!registeredDevice.zoneName && (
            <View style={styles.deviceMetaRow}>
              <MaterialCommunityIcons
                name="map-marker-outline"
                size={14}
                color="rgba(255,255,255,0.9)"
              />
              <Text style={styles.deviceMetaText}>{registeredDevice.zoneName}</Text>
            </View>
          )}
          {(registeredDevice.latitude || registeredDevice.longitude) && (
            <View style={styles.coordChip}>
              <MaterialCommunityIcons name="crosshairs-gps" size={12} color={Colors.white} />
              <Text style={styles.coordText}>
                {registeredDevice.latitude || ""}, {registeredDevice.longitude || ""}
                {registeredDevice.zoneType !== "Polygon" && registeredDevice.radius
                  ? ` · ${registeredDevice.radius} m`
                  : ""}
              </Text>
            </View>
          )}
        </LinearGradient>
      )}

      <ScrollView contentContainerStyle={styles.list}>
        {trips.length === 0 && (
          <EmptyState
            icon="login"
            message="No trip start records yet. Tap + to log a vehicle movement."
          />
        )}
        {trips.map((trip) => (
          <Card key={trip.id} style={styles.card} mode="elevated" elevation={2}>
            <View style={styles.cardHeader}>
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons name="login" size={18} color={Colors.white} />
              </View>
              <Text style={styles.vehicleNo}>{trip.vehicleNo}</Text>
            </View>
            <Text style={styles.detail}>RFID: {trip.rfidTag || "-"}</Text>
            <Text style={styles.detail}>Source: {trip.place}</Text>
            <Text style={styles.detail}>Device: {trip.deviceName}</Text>
            <View style={styles.cardFooter}>
              <View style={styles.coordChipLight}>
                <MaterialCommunityIcons name="crosshairs-gps" size={12} color={Colors.secondary} />
                <Text style={styles.coordTextLight}>
                  {trip.latitude}, {trip.longitude}
                </Text>
              </View>
              <Text style={styles.timestamp}>{formatRelativeTime(trip.createdAt)}</Text>
            </View>
          </Card>
        ))}
      </ScrollView>

      <GradientFab
        disabled={!registeredDevice}
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      />

      <DialogComponent
        visible={modalVisible}
        onDismiss={closeModal}
        title="Trip Start"
        icon="login"
        cornerRadius={24}
      >
        <View style={styles.methodToggle}>
          <Button
            mode={method === "rfid" ? "contained" : "outlined"}
            onPress={() => switchMethod("rfid")}
            style={styles.methodBtn}
          >
            Via RFID
          </Button>
          <Button
            mode={method === "vehicle" ? "contained" : "outlined"}
            onPress={() => switchMethod("vehicle")}
            style={styles.methodBtn}
          >
            Via Vehicle No
          </Button>
        </View>

        {method === "rfid" ? (
          <TextInput
            label="RFID Tag *"
            value={rfidInput}
            onChangeText={(v) => setRfidInput(v.toUpperCase())}
            autoCapitalize="characters"
            mode="outlined"
            style={styles.input}
          />
        ) : (
          <DropdownField
            label="Vehicle No *"
            value={vehicleNoInput || null}
            options={apiVehicles.map((v) => ({ label: v, value: v }))}
            onSelect={handleVehicleNoChange}
            disabled={vehiclesLoading}
            emptyMessage={
              vehiclesLoading ? "Loading vehicles..." : vehiclesError || "No vehicles found."
            }
          />
        )}

        {method === "rfid" && lookupFailed && (
          <Text style={styles.warningInline}>No vehicle mapped to this RFID tag.</Text>
        )}

        {matchedVehicle && (
          <View style={styles.autofillBox}>
            <Text style={styles.detail}>Vehicle No: {matchedVehicle.vehicleNo}</Text>
            <Text style={styles.detail}>RFID Tag(s): {matchedTag}</Text>
          </View>
        )}

        {!!error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.actionRow}>
          <Button onPress={closeModal}>Cancel</Button>
          <GradientButton label="Submit" onPress={handleSubmit} />
        </View>
      </DialogComponent>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background, padding: Spacing.md },
  warningCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  warningText: {
    color: Colors.danger,
    fontSize: 13,
  },
  deviceCard: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  liveText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.white,
    letterSpacing: 1.2,
  },
  deviceName: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.white,
    marginBottom: 4,
  },
  deviceMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: Spacing.sm,
  },
  deviceMetaText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
  coordChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  coordText: {
    fontSize: 11,
    color: Colors.white,
    fontWeight: "600",
  },
  coordChipLight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EAF2FA",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  coordTextLight: {
    fontSize: 11,
    color: Colors.secondary,
    fontWeight: "600",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  list: {
    paddingBottom: 120,
  },
  card: {
    marginBottom: Spacing.md,
    borderRadius: Radius.md,
    padding: Spacing.md,
    backgroundColor: Colors.white,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleNo: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  detail: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  timestamp: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 96,
  },
  methodToggle: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  methodBtn: {
    flex: 1,
  },
  input: {
    marginBottom: Spacing.md,
  },
  warningInline: {
    color: Colors.danger,
    fontSize: 12,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
  },
  autofillBox: {
    backgroundColor: "#EEF3F2",
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  error: {
    color: Colors.danger,
    marginBottom: Spacing.md,
    fontSize: 13,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: Spacing.sm,
  },
});
