import DialogComponent from "@/components/dialog";
import { DropdownField } from "@/components/dropdown-field";
import { EmptyState } from "@/components/empty-state";
import { GradientFab } from "@/components/gradient-fab";
import { ResultDialog } from "@/components/result-dialog";
import { Colors, Radius, Spacing, TabBarMetrics } from "@/constants/theme";
import { ApiError, getVehiclesApi, mapMultipleRfidApi } from "@/lib/api";
import { usePermission, usePermissionGuard } from "@/lib/use-permission-guard";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Chip, Text, TextInput } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function VehicleRfidScreen() {
  const { allowed, loading: guardLoading } = usePermissionGuard("RFIDVehicleMapping");
  const { canAdd } = usePermission("RFIDVehicleMapping");
  const insets = useSafeAreaInsets();
  const fabBottom = insets.bottom + TabBarMetrics.height + TabBarMetrics.bottomMargin + 14;

  const [modalVisible, setModalVisible] = useState(false);
  const [apiVehicles, setApiVehicles] = useState<string[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehiclesError, setVehiclesError] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tagList, setTagList] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ variant: "success" | "error"; message: string } | null>(
    null
  );

  useEffect(() => {
    if (!modalVisible) return;
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
  }, [modalVisible]);

  function openAssignModal() {
    setVehicleNo("");
    setTagList([]);
    setTagInput("");
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setVehicleNo("");
    setTagList([]);
    setTagInput("");
  }
  function commitTags(rawTags: string[]) {
    const cleaned = rawTags.map((t) => t.trim().toUpperCase()).filter((t) => t.length > 4);
    if (cleaned.length === 0) return;
    setTagList((prev) => {
      const next = [...prev];
      for (const tag of cleaned) {
        if (!next.includes(tag)) next.unshift(tag);
      }
      return next;
    });
  }

  function handleTagInputChange(text: string) {
    if (text.includes("\n")) {
      const segments = text.split("\n");
     
      const trailing = segments.pop() ?? "";
      commitTags(segments);
      setTagInput(trailing.toUpperCase());
      return;
    }
    setTagInput(text.toUpperCase());
  }

  function removeQueuedTag(tag: string) {
    setTagList((prev) => prev.filter((t) => t !== tag));
  }

  async function handleSubmit() {
    if (!vehicleNo) return;
    let finalTags = tagList;
    const pending = tagInput.trim().toUpperCase();
    if (pending.length > 4 && !finalTags.includes(pending)) {
      finalTags = [pending, ...finalTags];
    }
    if (finalTags.length === 0) return;

    setSubmitting(true);
    try {
      const data = await mapMultipleRfidApi(vehicleNo, finalTags);
      setSubmitting(false);

      if (data.failed.length > 0) {
        setTagList(data.failed);
        setTagInput("");
        setResult({
          variant: "error",
          message: `Failed: ${data.failed.join(", ")}.`,
        });
        return;
      }

      closeModal();
      const parts: string[] = [];
      if (data.inserted.length > 0) parts.push(`Mapped: ${data.inserted.join(", ")}.`);
      if (data.ignored.length > 0) parts.push(`Already mapped: ${data.ignored.join(", ")}.`);
      setResult({
        variant: "success",
        message: parts.join(" ") || `Processed ${finalTags.length} tag${finalTags.length > 1 ? "s" : ""} for ${vehicleNo}.`,
      });
    } catch (e) {
      setSubmitting(false);
      setResult({
        variant: "error",
        message: e instanceof ApiError ? e.message : "Request failed.",
      });
    }
  }

  if (guardLoading || !allowed) return null;

  return (
    <View style={styles.safe}>
      <EmptyState
        icon="tag-multiple-outline"
        message="Tap + to map an RFID tag to a vehicle."
      />

      <GradientFab style={[styles.fab, { bottom: fabBottom }]} onPress={openAssignModal} disabled={!canAdd} />

      <DialogComponent
        visible={modalVisible}
        onDismiss={closeModal}
        title={vehicleNo ? `Assign Tags · ${vehicleNo}` : "Assign Tags"}
        icon="tag-plus-outline"
        cornerRadius={24}
        fullScreen
        actions={[
          { label: "Cancel", onPress: closeModal, disabled: submitting },
          { label: "Submit", mode: "contained", onPress: handleSubmit, loading: submitting },
        ]}
      >
        <ScrollView keyboardShouldPersistTaps="handled" style={styles.formScroll}>
          {vehiclesLoading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={Colors.secondary} />
              <Text style={styles.loadingRowText}>Loading vehicles...</Text>
            </View>
          )}
          <DropdownField
            label="Vehicle Number"
            value={vehicleNo || null}
            options={apiVehicles.map((v) => ({ label: v, value: v }))}
            onSelect={setVehicleNo}
            disabled={vehiclesLoading}
            emptyMessage={
              vehiclesLoading ? "Loading vehicles..." : vehiclesError || "No vehicles found."
            }
          />
          <TextInput
            label="Enter RFID tag & press Enter"
            value={tagInput}
            onChangeText={handleTagInputChange}
            onSubmitEditing={() => {
              commitTags([tagInput]);
              setTagInput("");
            }}
            autoCapitalize="characters"
            mode="outlined"
            style={styles.input}
          />
          <View style={styles.chipContainer}>
            {tagList.map((tag) => (
              <Chip key={tag} onClose={() => removeQueuedTag(tag)} style={styles.tagChip}>
                {tag}
              </Chip>
            ))}
          </View>
        </ScrollView>
      </DialogComponent>

      <ResultDialog
        visible={!!result}
        variant={result?.variant ?? "success"}
        title={result?.variant === "error" ? "Mapping Failed" : "Success"}
        message={result?.message ?? ""}
        onClose={() => setResult(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  fab: {
    position: "absolute",
    right: 16,
  },
  input: {
    marginBottom: Spacing.md,
  },
  formScroll: {
    flex: 1,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "#EAF2FA",
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  loadingRowText: {
    fontSize: 12,
    color: Colors.secondary,
    fontWeight: "600",
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  tagChip: {
    backgroundColor: "#E3F2D3",
  },
});
