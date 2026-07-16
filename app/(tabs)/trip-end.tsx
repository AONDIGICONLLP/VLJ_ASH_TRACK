import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, IconButton, Text, TextInput } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { captureRef } from "react-native-view-shot";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Gradients, Radius, Spacing } from "@/constants/theme";
import { AshSuccessDialog } from "@/components/ash-success-dialog";
import DialogComponent from "@/components/dialog";
import { DropdownField } from "@/components/dropdown-field";
import { EmptyState } from "@/components/empty-state";
import { GradientFab } from "@/components/gradient-fab";
import { ResultDialog } from "@/components/result-dialog";
import { StatusDot } from "@/components/status-dot";
import { ApiError, getVehiclesApi, submitTripEndApi } from "@/lib/api";
import { getDeviceId } from "@/lib/device";
import {
  formatRelativeTime,
  formatStampCoordinate,
  formatStampDate,
  formatStampTime,
} from "@/lib/format";
import { getCurrentCoordinates, LocationError, reverseGeocode } from "@/lib/location";
import { useRoleGuard } from "@/lib/use-role-guard";
import { findVehicleByNo, findVehicleByTag, getTrips } from "@/lib/storage";
import type { TripMethod, TripRecord, Vehicle } from "@/types";

function StampRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stampRow}>
      <Text style={styles.stampRowLabel}>{label}</Text>
      <Text style={styles.stampRowColon}>:</Text>
      <Text style={styles.stampRowValue}>{value}</Text>
    </View>
  );
}

export default function TripEndScreen() {
  const { allowed, loading: guardLoading } = useRoleGuard(["user", "superadmin"]);

  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [readerId, setReaderId] = useState("");

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

  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [locationName, setLocationName] = useState("");
  const [address, setAddress] = useState("");

  const [note, setNote] = useState("");
  const [rawImageUri, setRawImageUri] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [stamping, setStamping] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const stampRef = useRef<View>(null);

  const [errorResult, setErrorResult] = useState("");
  const [successResult, setSuccessResult] = useState("");

  const loadTrips = useCallback(() => {
    getTrips("end").then(setTrips);
  }, []);

  useFocusEffect(loadTrips);

  useEffect(() => {
    getDeviceId().then(setReaderId);
  }, []);

  const refreshLocation = useCallback(() => {
    setLocationLoading(true);
    setLocationError("");
    getCurrentCoordinates()
      .then(async (c) => {
        setCoords(c);
        const geo = await reverseGeocode(c);
        setLocationName(geo.locationName);
        setAddress(geo.address);
      })
      .catch((e) => setLocationError(e instanceof LocationError ? e.message : "Could not get location."))
      .finally(() => setLocationLoading(false));
  }, []);

  useFocusEffect(refreshLocation);

  useEffect(() => {
    if (!modalVisible) return;
    refreshLocation();
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
  }, [modalVisible, refreshLocation]);

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

  async function pickImage() {
    setError("");
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError(
        permission.canAskAgain
          ? "Camera permission is required to attach a photo."
          : "Camera permission was denied. Enable it from your device settings to attach a photo."
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setImageUri(null);
      setStamping(true);
      setRawImageUri(result.assets[0].uri);
    }
  }

  async function handleStampReady() {
    // Give the composited layout time to actually paint before snapshotting it.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await new Promise((resolve) => setTimeout(resolve, 200));
    try {
      const uri = await captureRef(stampRef, { format: "jpg", quality: 0.85, result: "tmpfile" });
      setImageUri(uri);
    } catch {
      setImageUri(rawImageUri);
    } finally {
      setRawImageUri(null);
      setStamping(false);
    }
  }

  function closeModal() {
    setModalVisible(false);
    setMethod("rfid");
    setRfidInput("");
    setVehicleNoInput("");
    setMatchedVehicle(null);
    setMatchedTag("");
    setLookupFailed(false);
    setNote("");
    setRawImageUri(null);
    setStamping(false);
    setImageUri(null);
    setError("");
  }

  async function handleSubmit() {
    if (!matchedVehicle) {
      setError(
        method === "rfid"
          ? "Enter a valid RFID tag that is mapped to a vehicle."
          : "Enter a valid vehicle number that is mapped."
      );
      return;
    }
    if (!coords) {
      setError("Current location is not available yet.");
      return;
    }
    if (!readerId) {
      setError("This handheld device's ID is not available yet.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const message = await submitTripEndApi({
        deviceID: matchedVehicle.vehicleNo,
        rfid: matchedTag,
        readerID: readerId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        endTimestamp: Math.floor(Date.now() / 1000),
        imageUri: imageUri ?? undefined,
      });

      closeModal();
      loadTrips();
      setSuccessResult(message);
    } catch (e) {
      setErrorResult(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (guardLoading || !allowed) return null;

  return (
    <View style={styles.safe}>
      <LinearGradient
        colors={Gradients.secondaryButton}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.readerCard}
      >
        <View style={styles.liveRow}>
          <StatusDot color={Colors.white} size={8} />
          <Text style={styles.liveText}>READER READY</Text>
        </View>
        <View style={styles.deviceMetaRow}>
          <MaterialCommunityIcons name="cellphone-nfc" size={16} color="rgba(255,255,255,0.9)" />
          <Text style={styles.deviceMetaText}>{readerId || "Detecting..."}</Text>
        </View>
        <Pressable style={styles.deviceMetaRow} onPress={refreshLocation} disabled={locationLoading}>
          <MaterialCommunityIcons name="crosshairs-gps" size={16} color="rgba(255,255,255,0.9)" />
          <Text style={styles.deviceMetaText}>
            {locationLoading
              ? "Getting current location..."
              : coords
                ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
                : locationError || "Location unavailable · tap to retry"}
          </Text>
        </Pressable>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.list}>
        {trips.length === 0 && (
          <EmptyState icon="flag-checkered" message="No trip end records yet. Tap + to close out a trip." />
        )}
        {trips.map((trip) => (
          <Card key={trip.id} style={styles.card} mode="elevated" elevation={2}>
            <View style={styles.cardHeader}>
              {trip.imageUri ? (
                <Image source={{ uri: trip.imageUri }} style={styles.thumb} />
              ) : (
                <View style={styles.iconWrap}>
                  <MaterialCommunityIcons name="flag-checkered" size={18} color={Colors.white} />
                </View>
              )}
              <Text style={styles.vehicleNo}>{trip.vehicleNo}</Text>
            </View>
            <Text style={styles.detail}>RFID: {trip.rfidTag || "-"}</Text>
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

      <GradientFab style={styles.fab} onPress={() => setModalVisible(true)} />

      <DialogComponent
        visible={modalVisible}
        onDismiss={closeModal}
        title="Trip End"
        icon="flag-checkered"
        accentColors={Gradients.secondaryButton}
        cornerRadius={24}
        fullScreen
        actions={[
          { label: "Cancel", onPress: closeModal, disabled: submitting },
          {
            label: "Submit",
            mode: "contained",
            onPress: handleSubmit,
            loading: submitting,
            disabled: stamping,
          },
        ]}
      >
        <ScrollView keyboardShouldPersistTaps="handled" style={styles.formScroll}>
          <Text style={styles.formSubtitle}>
            Identify the vehicle and capture its current location to close out this trip.
          </Text>

          <Text style={styles.sectionLabel}>Vehicle</Text>
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

          <Text style={styles.sectionLabel}>Reader & Location</Text>
          <View style={styles.locationBox}>
            <View style={styles.locationHeader}>
              <MaterialCommunityIcons name="cellphone-nfc" size={16} color={Colors.secondary} />
              <Text style={styles.locationLabel}>Reader ID</Text>
            </View>
            <Text style={styles.locationValue}>{readerId || "Detecting..."}</Text>

            <View style={styles.locationDivider} />

            <View style={styles.locationHeader}>
              <MaterialCommunityIcons name="crosshairs-gps" size={16} color={Colors.secondary} />
              <Text style={styles.locationLabel}>Current Location</Text>
              <IconButton icon="refresh" size={18} onPress={refreshLocation} disabled={locationLoading} />
            </View>
            {locationLoading ? (
              <Text style={styles.detail}>Getting location...</Text>
            ) : coords ? (
              <>
                <Text style={styles.locationValue}>
                  {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
                </Text>
                {!!(locationName || address) && (
                  <Text style={styles.detail}>
                    {[locationName, address].filter(Boolean).join(" · ")}
                  </Text>
                )}
              </>
            ) : (
              <Text style={styles.warningInline}>{locationError || "Location not available."}</Text>
            )}
          </View>

          <Text style={styles.fieldLabel}>Note (optional)</Text>
          <TextInput
            label="Add a note before taking the photo"
            value={note}
            onChangeText={setNote}
            mode="outlined"
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>Trip End Vehicle Image (optional)</Text>
          <Text style={styles.imageHint}>
            Location, address, date/time and your note are stamped onto the photo.
          </Text>
          {stamping ? (
            <View style={styles.stampingBox}>
              <MaterialCommunityIcons name="image-sync-outline" size={18} color={Colors.secondary} />
              <Text style={styles.detail}>Stamping photo details...</Text>
            </View>
          ) : imageUri ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: imageUri }} style={styles.preview} />
              <IconButton
                icon="close-circle"
                size={22}
                iconColor={Colors.danger}
                style={styles.previewRemove}
                onPress={() => setImageUri(null)}
              />
            </View>
          ) : (
            <View style={styles.imageButtonRow}>
              <Button mode="outlined" icon="camera-outline" onPress={pickImage} style={styles.imageBtn}>
                Camera
              </Button>
            </View>
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>
      </DialogComponent>

      {rawImageUri &&
        (() => {
          const now = new Date();
          return (
            <View style={styles.stampOffscreen} pointerEvents="none">
              <View ref={stampRef} collapsable={false} style={styles.stampCanvas}>
                <Image
                  source={{ uri: rawImageUri }}
                  style={styles.stampImage}
                  resizeMode="cover"
                  onLoad={handleStampReady}
                />
                <View style={styles.stampBox}>
                  <View style={styles.stampHeader}>
                    <View style={styles.stampHeaderIcon}>
                      <MaterialCommunityIcons name="crosshairs-gps" size={13} color={Colors.white} />
                    </View>
                    <Text style={styles.stampHeaderText}>ASH TRACK</Text>
                  </View>
                  <View style={styles.stampDivider} />
                  <StampRow
                    label="Latitude"
                    value={coords ? formatStampCoordinate(coords.latitude, "N", "S") : "-"}
                  />
                  <StampRow
                    label="Longitude"
                    value={coords ? formatStampCoordinate(coords.longitude, "E", "W") : "-"}
                  />
                  {!!locationName && <StampRow label="Location" value={locationName} />}
                  {!!address && <StampRow label="Address" value={address} />}
                  <StampRow label="Date" value={formatStampDate(now)} />
                  <StampRow label="Time" value={formatStampTime(now)} />
                  {!!note.trim() && <StampRow label="Note" value={note.trim()} />}
                </View>
              </View>
            </View>
          );
        })()}

      <ResultDialog
        visible={!!errorResult}
        variant="error"
        title="Trip End Failed"
        message={errorResult}
        onClose={() => setErrorResult("")}
      />

      <AshSuccessDialog
        visible={!!successResult}
        title="Trip Completed"
        message={successResult}
        onClose={() => setSuccessResult("")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background, padding: Spacing.md },
  readerCard: {
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
  deviceMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  deviceMetaText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
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
    backgroundColor: Colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  thumb: {
    width: 30,
    height: 30,
    borderRadius: 8,
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
  formScroll: {
    flex: 1,
  },
  formSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 19,
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.sm,
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
    marginTop: Spacing.xs,
  },
  autofillBox: {
    backgroundColor: "#EEF3F2",
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  locationBox: {
    backgroundColor: "#EAF2FA",
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  locationDivider: {
    height: 1,
    backgroundColor: "rgba(0,82,152,0.12)",
    marginVertical: Spacing.sm,
  },
  locationLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: Colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  locationValue: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: Spacing.xs,
  },
  imageHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  imageButtonRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  imageBtn: {
    flex: 1,
  },
  stampingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "#EAF2FA",
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  previewWrap: {
    marginBottom: Spacing.md,
    alignSelf: "flex-start",
  },
  preview: {
    width: 130,
    height: 173,
    borderRadius: Radius.sm,
  },
  previewRemove: {
    position: "absolute",
    top: -10,
    right: -10,
    backgroundColor: Colors.white,
    margin: 0,
  },
  error: {
    color: Colors.danger,
    marginBottom: Spacing.md,
    fontSize: 13,
  },
  stampOffscreen: {
    position: "absolute",
    top: 0,
    left: 0,
    opacity: 0,
  },
  stampCanvas: {
    width: 720,
    height: 960,
    backgroundColor: "#000",
    overflow: "hidden",
  },
  stampImage: {
    ...StyleSheet.absoluteFillObject,
  },
  stampBox: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 24,
    backgroundColor: "rgba(0,0,0,0.36)",
    borderRadius: 14,
    padding: 18,
  },
  stampHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  stampHeaderIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stampHeaderText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  stampDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginBottom: 8,
  },
  stampRow: {
    flexDirection: "row",
    marginTop: 5,
  },
  stampRowLabel: {
    width: 92,
    color: "rgba(255,255,255,0.9)",
    fontSize: 15,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  stampRowColon: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 15,
    fontWeight: "600",
    marginRight: 6,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  stampRowValue: {
    flex: 1,
    color: Colors.white,
    fontSize: 15,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
