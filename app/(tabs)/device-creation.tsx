import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, IconButton, Text, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Gradients, Radius, Spacing } from "@/constants/theme";
import DialogComponent from "@/components/dialog";
import { DropdownField } from "@/components/dropdown-field";
import { EmptyState } from "@/components/empty-state";
import { GradientButton } from "@/components/gradient-button";
import { GradientFab } from "@/components/gradient-fab";
import { ResultDialog } from "@/components/result-dialog";
import { useRoleGuard } from "@/lib/use-role-guard";
import { getDeviceId } from "@/lib/device";
import { ApiError, getZonesApi, parseZoneCoordinates, registerDeviceApi } from "@/lib/api";
import type { Zone } from "@/lib/api";
import { deleteDevice, getDevices } from "@/lib/storage";
import type { DeviceRecord } from "@/types";

export default function DeviceCreationScreen() {
  const { allowed, loading } = useRoleGuard(["user", "admin", "superadmin"]);
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeviceRecord | null>(null);

  const [deviceName, setDeviceName] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [zones, setZones] = useState<Zone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ variant: "success" | "error"; message: string } | null>(
    null
  );

  const loadDevices = useCallback(() => {
    getDevices().then(setDevices);
  }, []);

  useFocusEffect(loadDevices);

  useEffect(() => {
    if (!modalVisible) return;
    getDeviceId().then(setDeviceId);

    setZonesLoading(true);
    getZonesApi()
      .then(setZones)
      .catch((e) => {
        const message = e instanceof ApiError ? e.message : "Could not load zones.";
        console.log("[zones]", message);
        setZones([]);
        setError(message);
      })
      .finally(() => setZonesLoading(false));
  }, [modalVisible]);

  function closeModal() {
    setModalVisible(false);
    setDeviceName("");
    setSelectedZone(null);
    setError("");
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const readerID = deviceId.trim();
      const zoneID = (selectedZone?.zoneId ?? "").trim();
      console.log(JSON.stringify({ readerID, zoneID }, null, 1));
      const message = await registerDeviceApi(readerID, zoneID);

      closeModal();
      setResult({ variant: "success", message });
    } catch (e) {
      setResult({
        variant: "error",
        message: e instanceof ApiError ? e.message : "Something went wrong. Try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteDevice(deleteTarget.id);
    setDeleteTarget(null);
    loadDevices();
  }

  if (loading || !allowed) return null;

  const selectedZonePoints = selectedZone ? parseZoneCoordinates(selectedZone.latLong) : [];

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={styles.list}>
        {devices.length === 0 && (
          <EmptyState
            icon="cellphone-cog"
            message="No devices registered yet. Tap + to register this device to a zone."
          />
        )}
        {devices.map((device) => (
          <Card key={device.id} style={styles.card} mode="elevated" elevation={2}>
            <View style={styles.cardHeader}>
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons name="cellphone-cog" size={20} color={Colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{device.deviceName}</Text>
                {(device.zoneName || device.zoneType) && (
                  <Text style={styles.typeTag}>
                    {device.zoneName ?? ""}
                    {device.zoneType ? ` (${device.zoneType})` : ""}
                  </Text>
                )}
              </View>
              <IconButton
                icon="delete-outline"
                iconColor={Colors.danger}
                onPress={() => setDeleteTarget(device)}
              />
            </View>
            <Text style={styles.detail}>Device ID: {device.deviceId}</Text>
            {(device.latitude || device.longitude) && (
              <Text style={styles.detail}>
                Lat/Long: {device.latitude || ""}, {device.longitude || ""}
              </Text>
            )}
            {device.zoneType !== "Polygon" && device.radius && (
              <Text style={styles.detail}>Radius: {device.radius} m</Text>
            )}
          </Card>
        ))}
      </ScrollView>

      <GradientFab style={styles.fab} onPress={() => setModalVisible(true)} />

      <DialogComponent
        visible={modalVisible}
        onDismiss={closeModal}
        title="Register Device"
        icon="cellphone-cog"
        cornerRadius={24}
      >
        <TextInput
          label="Device Name"
          value={deviceName}
          onChangeText={setDeviceName}
          mode="outlined"
          style={styles.input}
        />
        <TextInput label="Device ID" value={deviceId} disabled mode="outlined" style={styles.input} />
        <DropdownField
          label="Zone"
          value={selectedZone?.zoneId ?? null}
          options={zones.map((z) => ({
            label: z.zoneName ? `${z.zoneName}${z.zoneType ? ` (${z.zoneType})` : ""}` : z.zoneId,
            value: z.zoneId,
          }))}
          onSelect={(id) => setSelectedZone(zones.find((z) => z.zoneId === id) ?? null)}
          disabled={zonesLoading}
          emptyMessage={zonesLoading ? "Loading zones..." : error || "No zones found."}
        />
        {selectedZone && (selectedZone.zoneName || selectedZone.zoneType || selectedZonePoints.length > 0 || selectedZone.radius != null) && (
          <View style={styles.autofillBox}>
            {!!selectedZone.zoneName && (
              <Text style={styles.detail}>Zone Name: {selectedZone.zoneName}</Text>
            )}
            {!!selectedZone.zoneType && (
              <Text style={styles.detail}>Zone Type: {selectedZone.zoneType}</Text>
            )}
            {selectedZonePoints.map((point, index) => (
              <Text key={`${point.latitude}-${point.longitude}-${index}`} style={styles.detail}>
                {selectedZonePoints.length > 1 ? `Point ${index + 1}: ` : "Lat/Long: "}
                {point.latitude}, {point.longitude}
              </Text>
            ))}
            {selectedZone.zoneType !== "Polygon" && selectedZone.radius != null && (
              <Text style={styles.detail}>Radius: {selectedZone.radius} m</Text>
            )}
          </View>
        )}
        {!!error && <Text style={styles.error}>{error}</Text>}
        <View style={styles.actionRow}>
          <Button onPress={closeModal} disabled={submitting}>
            Cancel
          </Button>
          <GradientButton label="Submit" onPress={handleSubmit} loading={submitting} />
        </View>
      </DialogComponent>

      <ResultDialog
        visible={!!result}
        variant={result?.variant ?? "success"}
        title={result?.variant === "error" ? "Registration Failed" : "Device Registered"}
        message={result?.message ?? ""}
        onClose={() => setResult(null)}
      />

      <DialogComponent
        visible={!!deleteTarget}
        onDismiss={() => setDeleteTarget(null)}
        title="Delete Device?"
        icon="delete-outline"
        accentColors={Gradients.danger}
        actions={[
          { label: "Cancel", onPress: () => setDeleteTarget(null) },
          { label: "Delete", mode: "contained", onPress: handleDelete },
        ]}
      >
        <Text>
          Delete device <Text style={styles.highlight}>{deleteTarget?.deviceName}</Text>?
        </Text>
      </DialogComponent>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Spacing.md, paddingBottom: 120 },
  card: {
    marginBottom: Spacing.md,
    borderRadius: Radius.md,
    padding: Spacing.md,
    backgroundColor: Colors.white,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.secondary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  typeTag: {
    fontSize: 12,
    color: Colors.secondary,
    fontWeight: "600",
    marginTop: 2,
  },
  detail: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 96,
  },
  input: {
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
  highlight: {
    fontWeight: "700",
    color: Colors.danger,
  },
});
