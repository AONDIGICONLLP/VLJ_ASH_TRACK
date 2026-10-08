import { AshSuccessDialog } from "@/components/ash-success-dialog";
import DialogComponent from "@/components/dialog";
import { DropdownField } from "@/components/dropdown-field";
import { EmptyState } from "@/components/empty-state";
import { GradientFab } from "@/components/gradient-fab";
import { ResultDialog } from "@/components/result-dialog";
import { Colors, Gradients, Radius, Spacing, TabBarMetrics } from "@/constants/theme";
import {
  ApiError,
  getImageRequiredApi,
  getVehiclesApi,
  getVehiclesByRfidApi,
  getVehicleTagsApi,
  submitTripEndApi,
  type VehicleTag,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { getDeviceId } from "@/lib/device";
import {
  formatRelativeTime,
  formatSqlDateTime,
  formatStampCoordinate,
  formatStampDate,
  formatStampTime,
} from "@/lib/format";
import {
  getCurrentCoordinates,
  LowAccuracyError,
  MockLocationError,
  reverseGeocode,
  type Coordinates,
} from "@/lib/location";
import { getTrips } from "@/lib/storage";
import { usePermission, usePermissionGuard } from "@/lib/use-permission-guard";
import type { TripRecord } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Card, Chip, IconButton, Text, TextInput } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

type RfidQueueItem = {
  rfid: string;
  status: "loading" | "resolved" | "error";
  deviceID?: string;
  imageRequired?: boolean;
  error?: string;
};

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
  const { allowed, loading: guardLoading } = usePermissionGuard("TripEnd");
  const { canAdd } = usePermission("TripEnd");
  const { session } = useAuth();
  // Only roleID 1 (the top-level admin account) can pick a vehicle from the
  // dropdown and close out every tag mapped to it. Every other login only
  // ever gets the RFID-entry flow — no vehicle dropdown, no method toggle.
  const isFullAccess = String(session?.roleID) === "1";
  const insets = useSafeAreaInsets();
  const listBottomPadding = insets.bottom + TabBarMetrics.height + TabBarMetrics.bottomMargin + Spacing.md;
  const fabBottom = insets.bottom + TabBarMetrics.height + TabBarMetrics.bottomMargin + 14;

  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [readerId, setReaderId] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [method, setMethod] = useState<"vehicle" | "rfid">("vehicle");

  useEffect(() => {
    if (!isFullAccess) setMethod("rfid");
  }, [isFullAccess]);

  const [apiVehicles, setApiVehicles] = useState<string[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehiclesError, setVehiclesError] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [vehicleTags, setVehicleTags] = useState<VehicleTag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagsError, setTagsError] = useState("");
  const [selectedVehicleTag, setSelectedVehicleTag] = useState<string | null>(null);
  // Defaults to not required until getImageFlag says otherwise for the
  // selected tag.
  const [vehicleImageRequired, setVehicleImageRequired] = useState(false);

  const [rfidInput, setRfidInput] = useState("");
  const [rfidQueue, setRfidQueue] = useState<RfidQueueItem[]>([]);
  // getImageFlag is checked against a separate mapping than the vehicle
  // lookup — a tag with no vehicle mapped is dropped from rfidQueue, but if
  // that tag's own image flag said "required", that must still count here;
  // otherwise a required-photo answer silently vanishes along with the tag.
  const [rfidAnyImageRequired, setRfidAnyImageRequired] = useState(false);

  const [coords, setCoords] = useState<Coordinates | null>(null);
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

  useEffect(() => {
    return () => clearPendingRfidLookup();
  }, []);

  const getAccurateLocation = async () => {
  const maxAttempts = 10;
  const delay = 1000; // 1 second

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const c = await getCurrentCoordinates();

    if (c && c.accuracy !<= 200) {
      return c;
    }

    // Wait 1 second before trying again
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  throw new LowAccuracyError(
    "Unable to get a location with accuracy within 200 meters."
  );
};

const refreshLocation = useCallback(() => {
  setLocationLoading(true);
  setLocationError("");

  getAccurateLocation()
    .then(async (c) => {
      setCoords(c);

      const geo = await reverseGeocode(c);

      setLocationName(geo.locationName);
      setAddress(geo.address);
    })
    .catch((e) => {
      setCoords(null);

      if (
        e instanceof MockLocationError ||
        e instanceof LowAccuracyError
      ) {
        setLocationError(e.message);
      }
    })
    .finally(() => {
      setLocationLoading(false);
    });
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
        setApiVehicles([]);
        setVehiclesError(message);
      })
      .finally(() => setVehiclesLoading(false));
  }, [modalVisible, refreshLocation]);

  useEffect(() => {
    if (!vehicleNo) {
      setVehicleTags([]);
      setTagsError("");
      setSelectedVehicleTag(null);
      setVehicleImageRequired(false);
      return;
    }
    let cancelled = false;
    setTagsLoading(true);
    setTagsError("");
    setSelectedVehicleTag(null);
    setVehicleImageRequired(false);
    getVehicleTagsApi(vehicleNo)
      .then((tags) => {
        if (cancelled) return;
        setVehicleTags(tags);
        const activeTags = tags.filter((t) => t.isActive);
        // Only one possible choice — select it automatically.
        if (activeTags.length === 1) selectVehicleTag(activeTags[0].rfid);
      })
      .catch((e) => {
        if (cancelled) return;
        const message = e instanceof ApiError ? e.message : "Could not load RFID tags.";
        setTagsError(message);
        setVehicleTags([]);
      })
      .finally(() => {
        if (!cancelled) setTagsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [vehicleNo]);

  function handleVehicleSelect(value: string) {
    setVehicleNo(value);
  }

  function selectVehicleTag(rfid: string) {
    setSelectedVehicleTag(rfid);
    setVehicleImageRequired(false);
    getImageRequiredApi(rfid)
      .then((required) => {
        console.log(`[trip-end] rfid=${rfid} imageRequired=${required}`);
        setVehicleImageRequired(required);
      })
      .catch(() => {
        console.log(`[trip-end] rfid=${rfid} imageRequired=false (check failed)`);
        setVehicleImageRequired(false);
      });
  }

  function switchMethod(next: "vehicle" | "rfid") {
    setMethod(next);
    setVehicleNo("");
    setVehicleTags([]);
    setTagsError("");
    setSelectedVehicleTag(null);
    setVehicleImageRequired(false);
    setRfidInput("");
    setRfidQueue([]);
    setRfidAnyImageRequired(false);
    clearPendingRfidLookup();
  }

  // Tags scanned within a short window are collected here and looked up
  // together in one request instead of one request per tag — previously
  // every tag fired its own getVehiclesByRfidApi call, so a burst of scans
  // could fire a pile of simultaneous network requests and stall the
  // handheld on a slow connection.
  const pendingRfidLookupRef = useRef<string[]>([]);
  const rfidLookupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearPendingRfidLookup() {
    if (rfidLookupTimerRef.current) {
      clearTimeout(rfidLookupTimerRef.current);
      rfidLookupTimerRef.current = null;
    }
    pendingRfidLookupRef.current = [];
  }

  function flushRfidLookups() {
    rfidLookupTimerRef.current = null;
    const batch = Array.from(new Set(pendingRfidLookupRef.current));
    pendingRfidLookupRef.current = [];
    if (batch.length === 0) return;

    // getImageFlag is checked against a separate zone mapping than
    // getVehiclesByRfid's vehicle mapping — a tag can be found in one and
    // not the other. So it's fired for every scanned tag immediately,
    // independent of whether the vehicle lookup below finds a match, comes
    // back empty, or fails outright.
    const imageFlags = new Map<string, boolean>();
    const imageFlagsSettled = Promise.all(
      batch.map((tag) =>
        getImageRequiredApi(tag)
          .then((required) => imageFlags.set(tag, required))
          .catch(() => imageFlags.set(tag, false))
      )
    );
    imageFlagsSettled.then(() => {
      if (batch.some((tag) => imageFlags.get(tag) === true)) {
        setRfidAnyImageRequired(true);
      }
    });

    getVehiclesByRfidApi(batch)
      .then(async (vehicles) => {
        await imageFlagsSettled;
        const unmapped = batch.filter((tag) => !vehicles[tag]);
        if (unmapped.length > 0) {
          // No vehicle mapped to these tags — drop them from the queue
          // instead of leaving a permanent "not found" row sitting there.
          setRfidQueue((prev) => prev.filter((item) => !unmapped.includes(item.rfid)));
        }
        const mapped = batch.filter((tag) => vehicles[tag]);
        if (mapped.length > 0) {
          setRfidQueue((prev) =>
            prev.map((item) =>
              mapped.includes(item.rfid)
                ? {
                    ...item,
                    status: "resolved",
                    deviceID: vehicles[item.rfid],
                    imageRequired: imageFlags.get(item.rfid) ?? false,
                  }
                : item
            )
          );
        }
      })
      .catch((e) => {
        const message = e instanceof ApiError ? e.message : "Could not look up these RFID tags.";
        setRfidQueue((prev) =>
          prev.map((item) => (batch.includes(item.rfid) ? { ...item, status: "error", error: message } : item))
        );
      });
  }

  // A handheld scanner fires an Enter after every tag it reads, but scanning
  // several tags fast enough can batch multiple "TAG\n" segments into a
  // single onChangeText call — each segment is a distinct tag, not one
  // garbled string, so each gets its own queue entry.
  function commitRfidTags(rawTags: string[]) {
    const cleaned = Array.from(new Set(rawTags.map((t) => t.trim().toUpperCase()).filter(Boolean)));
    if (cleaned.length === 0) return;

    // A new tag changes what "image required" should mean for this batch —
    // don't carry forward a stale required flag from a tag that's no longer
    // part of the current set; let it be re-derived from scratch.
    setRfidAnyImageRequired(false);
    setError("");

    setRfidQueue((prev) => {
      const next = [...prev];
      cleaned.forEach((rfid) => {
        if (!next.some((item) => item.rfid === rfid)) {
          next.unshift({ rfid, status: "loading" });
        }
      });
      return next;
    });

    pendingRfidLookupRef.current.push(...cleaned);
    if (rfidLookupTimerRef.current) clearTimeout(rfidLookupTimerRef.current);
    rfidLookupTimerRef.current = setTimeout(flushRfidLookups, 200);
  }

  function handleRfidInputChange(text: string) {
    if (text.includes("\n")) {
      const segments = text.split("\n");
      // The last segment has no trailing newline yet — it's still being
      // typed/scanned, so keep it in the input instead of committing it.
      const trailing = segments.pop() ?? "";
      commitRfidTags(segments);
      setRfidInput(trailing.toUpperCase());
      return;
    }
    setRfidInput(text.toUpperCase());
  }

  function removeQueuedRfid(tag: string) {
    // Same reasoning as commitRfidTags — removing a tag changes the set
    // that "image required" is derived from, so the stale flag is cleared
    // and left to be re-derived from whatever tags remain.
    setRfidAnyImageRequired(false);
    setError("");
    setRfidQueue((prev) => prev.filter((item) => item.rfid !== tag));
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
    setMethod(isFullAccess ? "vehicle" : "rfid");
    setVehicleNo("");
    setVehicleTags([]);
    setTagsError("");
    setSelectedVehicleTag(null);
    setVehicleImageRequired(false);
    setRfidInput("");
    setRfidQueue([]);
    setRfidAnyImageRequired(false);
    clearPendingRfidLookup();
    setNote("");
    setRawImageUri(null);
    setStamping(false);
    setImageUri(null);
    setError("");
    setLocationError("");
  }

  // Defaults to not required unless getImageFlag has explicitly confirmed it
  // for a resolved tag. rfidAnyImageRequired also covers tags that came back
  // "required" from getImageFlag but were then dropped from rfidQueue for
  // having no mapped vehicle — that answer must still count here.
  const imageRequired =
    method === "rfid"
      ? rfidAnyImageRequired || rfidQueue.some((item) => item.imageRequired === true)
      : vehicleImageRequired;

  async function handleSubmit() {
    if (!coords) {
      setError(locationError || "Current location is not available yet.");
      return;
    }
    if (!readerId) {
      setError("This handheld device's ID is not available yet.");
      return;
    }
    if (imageRequired && !imageUri) {
      setError("Attach a vehicle photo before submitting.");
      return;
    }

    if (method === "rfid") {
      if (rfidQueue.length === 0) {
        setError("Enter at least one RFID tag.");
        return;
      }
      if (rfidQueue.some((item) => item.status === "loading")) {
        setError("Wait for the RFID lookups to finish.");
        return;
      }
      const resolved = rfidQueue.filter(
        (item): item is RfidQueueItem & { deviceID: string } => item.status === "resolved" && !!item.deviceID
      );
      if (resolved.length === 0) {
        setError(
          rfidQueue.length === 1
            ? "Vehicle not available for this RFID tag."
            : "Vehicle not available for any of the entered RFID tags."
        );
        return;
      }

      setSubmitting(true);
      setError("");

      const succeeded: { rfid: string; message: string }[] = [];
      const failures: RfidQueueItem[] = [];

      for (const item of resolved) {
        try {
          const payload = {
            readerID: readerId,
            endTimestamp: formatSqlDateTime(new Date()),
            latitude: String(coords.latitude),
            longitude: String(coords.longitude),
            deviceID: item.deviceID,
            rfid: item.rfid,
            imageUri: imageUri ?? undefined,
          };
          const message = await submitTripEndApi(payload);
          succeeded.push({ rfid: item.rfid, message });
        } catch (e) {
          failures.push({
            ...item,
            status: "error",
            error: e instanceof ApiError ? e.message : "Request failed.",
          });
        }
      }

      setSubmitting(false);

      if (failures.length > 0) {
        setRfidQueue(failures);
        loadTrips();
        const parts: string[] = [];
        if (succeeded.length > 0) parts.push(`Closed: ${succeeded.map((s) => s.rfid).join(", ")}.`);
        parts.push(`Failed: ${failures.map((f) => `${f.rfid} (${f.error})`).join(", ")}`);
        setErrorResult(parts.join(" "));
        return;
      }

      closeModal();
      loadTrips();
      // Show the server's own message(s) rather than a locally-made-up one
      // — if every tag got back the same text, show it once; otherwise list
      // each tag's own message so nothing the API said gets dropped.
      const uniqueMessages = Array.from(new Set(succeeded.map((s) => s.message).filter(Boolean)));
      setSuccessResult(
        uniqueMessages.length === 1
          ? uniqueMessages[0]
          : uniqueMessages.length === 0
            ? `Trip ended for ${succeeded.length} tag${succeeded.length === 1 ? "" : "s"}.`
            : succeeded.map((s) => `${s.rfid}: ${s.message}`).join("\n")
      );
      return;
    }

    if (!vehicleNo) {
      setError("Select a vehicle.");
      return;
    }
    if (!selectedVehicleTag) {
      setError("Select an RFID tag for this vehicle.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const payload = {
        readerID: readerId,
        endTimestamp: formatSqlDateTime(new Date()),
        latitude: String(coords.latitude),
        longitude: String(coords.longitude),
        deviceID: vehicleNo,
        rfid: selectedVehicleTag,
        imageUri: imageUri ?? undefined,
      };
      console.log("[trip-end] submitting:", payload);
      const message = await submitTripEndApi(payload);
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
      <ScrollView contentContainerStyle={{ paddingBottom: listBottomPadding }}>
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

      <GradientFab style={[styles.fab, { bottom: fabBottom }]} onPress={() => setModalVisible(true)} disabled={!canAdd} />

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
          <View style={[styles.locationBox, !!locationError && styles.locationBoxError]}>
            <View style={styles.locationBoxRow}>
              <MaterialCommunityIcons
                name={locationError ? "shield-alert-outline" : "crosshairs-gps"}
                size={16}
                color={locationError ? Colors.danger : Colors.secondary}
              />
              <Text
                style={[styles.locationBoxText, !!locationError && styles.tagChipErrorText]}
                numberOfLines={2}
              >
                {locationLoading
                  ? "Getting current location..."
                  : locationError
                    ? locationError
                    : coords
                      ? `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`
                      : "Location unavailable"}
              </Text>
              {locationLoading ? (
                <ActivityIndicator size="small" color={Colors.secondary} style={styles.locationRefreshBtn} />
              ) : (
                <IconButton
                  icon="refresh"
                  size={16}
                  onPress={refreshLocation}
                  style={styles.locationRefreshBtn}
                />
              )}
            </View>
            {!!coords && coords.accuracy != null && (
              <Text style={styles.locationAccuracy}>
                Accuracy: ±{Math.round(coords.accuracy)} m
                {coords.accuracy > 20 ? " — move to open sky for a better fix" : ""}
              </Text>
            )}
          </View>

          <Text style={styles.sectionLabel}>{method === "vehicle" ? "Vehicle" : "RFID Tag"}</Text>
          {isFullAccess && (
            <View style={styles.methodToggle}>
              <Button
                mode={method === "vehicle" ? "contained" : "outlined"}
                onPress={() => switchMethod("vehicle")}
                compact
                style={styles.methodBtn}
              >
                Via Vehicle No
              </Button>
              <Button
                mode={method === "rfid" ? "contained" : "outlined"}
                onPress={() => switchMethod("rfid")}
                compact
                style={styles.methodBtn}
              >
                Via RFID
              </Button>
            </View>
          )}

          {method === "vehicle" ? (
            <>
              {vehiclesLoading && (
                <View style={styles.lookupBanner}>
                  <ActivityIndicator size="small" color={Colors.secondary} />
                  <Text style={styles.lookupBannerText}>Loading vehicles...</Text>
                </View>
              )}
              <DropdownField
                label="Vehicle No *"
                value={vehicleNo || null}
                options={apiVehicles.map((v) => ({ label: v, value: v }))}
                onSelect={handleVehicleSelect}
                disabled={vehiclesLoading}
                emptyMessage={
                  vehiclesLoading ? "Loading vehicles..." : vehiclesError || "No vehicles found."
                }
              />

              {!!vehicleNo && (
                <>
                  <Text style={styles.fieldLabel}>RFID Tag * (select one to close)</Text>
                  {tagsLoading ? (
                    <Text style={styles.detail}>Loading RFID tags...</Text>
                  ) : tagsError ? (
                    <Text style={styles.warningInline}>{tagsError}</Text>
                  ) : vehicleTags.length === 0 ? (
                    <Text style={styles.warningInline}>No RFID tags mapped to this vehicle.</Text>
                  ) : vehicleTags.every((t) => !t.isActive) ? (
                    <Text style={styles.warningInline}>No active RFID tags found for this vehicle.</Text>
                  ) : (
                    <View style={styles.chipContainer}>
                      {vehicleTags.map((tag) => (
                        <Chip
                          key={tag.rfid}
                          selected={selectedVehicleTag === tag.rfid}
                          disabled={!tag.isActive}
                          onPress={() => selectVehicleTag(tag.rfid)}
                          style={[
                            styles.tagChip,
                            !tag.isActive && styles.tagChipInactive,
                          ]}
                        >
                          {tag.rfid}
                          {!tag.isActive ? " · inactive" : ""}
                        </Chip>
                      ))}
                    </View>
                  )}
                  {!!selectedVehicleTag && (
                    <View style={styles.lookupBanner}>
                      <MaterialCommunityIcons
                        name={vehicleImageRequired ? "camera-outline" : "camera-off-outline"}
                        size={16}
                        color={Colors.secondary}
                      />
                      <Text style={styles.lookupBannerText}>
                        {selectedVehicleTag}: Image {vehicleImageRequired ? "Required" : "Optional"}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <TextInput
                label="Enter RFID tag & press Enter"
                value={rfidInput}
                onChangeText={handleRfidInputChange}
                onSubmitEditing={() => {
                  commitRfidTags([rfidInput]);
                  setRfidInput("");
                }}
                autoCapitalize="characters"
                mode="outlined"
                style={styles.input}
              />
              {rfidQueue.some((item) => item.status === "loading") && (
                <View style={styles.lookupBanner}>
                  <ActivityIndicator size="small" color={Colors.secondary} />
                  <Text style={styles.lookupBannerText}>Looking up RFID tag(s)...</Text>
                </View>
              )}
              {rfidQueue.length > 0 && (
                <ScrollView
                  style={styles.rfidStatusList}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {rfidQueue.map((item) => (
                    <View key={item.rfid} style={styles.rfidStatusRow}>
                      <MaterialCommunityIcons
                        name={
                          item.status === "resolved"
                            ? "check-circle-outline"
                            : item.status === "error"
                              ? "alert-circle-outline"
                              : "clock-outline"
                        }
                        size={16}
                        color={
                          item.status === "resolved"
                            ? Colors.secondary
                            : item.status === "error"
                              ? Colors.danger
                              : Colors.textMuted
                        }
                      />
                      <Text style={styles.rfidStatusTag} numberOfLines={1}>
                        {item.rfid}
                      </Text>
                      <Text
                        style={[
                          styles.rfidStatusValue,
                          item.status === "error" && styles.tagChipErrorText,
                        ]}
                        numberOfLines={1}
                      >
                        {item.status === "loading"
                          ? "Looking up..."
                          : item.status === "resolved"
                            ? `Vehicle: ${item.deviceID} · Image ${item.imageRequired ? "Required" : "Optional"}`
                            : item.error || "Not found"}
                      </Text>
                      <IconButton
                        icon="close"
                        size={16}
                        onPress={() => removeQueuedRfid(item.rfid)}
                        style={styles.rfidStatusRemove}
                      />
                    </View>
                  ))}
                </ScrollView>
              )}
            </>
          )}

          <Text style={styles.fieldLabel}>Note (optional)</Text>
          <TextInput
            label="Add a note before taking the photo"
            value={note}
            onChangeText={setNote}
            mode="outlined"
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>
            Trip End Vehicle Image {imageRequired ? "*" : "(optional)"}
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
              <Button mode="outlined" icon="camera-outline" onPress={pickImage} compact style={styles.imageBtn}>
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
  },
  formScroll: {
    flex: 1,
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
    marginBottom: Spacing.md,
  },
  lookupBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "#EAF2FA",
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  lookupBannerText: {
    fontSize: 12,
    color: Colors.secondary,
    fontWeight: "600",
  },
  locationBox: {
    backgroundColor: "#EAF2FA",
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  locationBoxError: {
    backgroundColor: "#FBE9E3",
  },
  locationBoxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  locationBoxText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
  },
  locationRefreshBtn: {
    margin: 0,
    width: 28,
    height: 28,
  },
  locationAccuracy: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    marginLeft: 24,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  tagChip: {
    backgroundColor: "#E3F2D3",
  },
  tagChipInactive: {
    backgroundColor: "#F1F5F9",
    opacity: 0.6,
  },
  tagChipErrorText: {
    color: Colors.danger,
  },
  rfidStatusList: {
    maxHeight: 220,
    backgroundColor: "#F8FAFC",
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.md,
  },
  rfidStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#EEF2F6",
  },
  rfidStatusTag: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
  },
  rfidStatusValue: {
    flexShrink: 0,
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: "600",
    textAlign: "right",
  },
  rfidStatusRemove: {
    margin: 0,
    width: 28,
    height: 28,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: Spacing.xs,
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
