import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Button, Chip, TextInput } from "react-native-paper";
import { Colors, Spacing } from "@/constants/theme";
import DialogComponent from "@/components/dialog";
import { DropdownField } from "@/components/dropdown-field";
import { EmptyState } from "@/components/empty-state";
import { GradientButton } from "@/components/gradient-button";
import { GradientFab } from "@/components/gradient-fab";
import { ResultDialog } from "@/components/result-dialog";
import { ApiError, getVehiclesApi, mapRfidApi } from "@/lib/api";

export default function VehicleRfidScreen() {
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
        console.log("[vehicles]", message);
        setApiVehicles([]);
        setVehiclesError(message);
      })
      .finally(() => setVehiclesLoading(false));

    // TEMPORARY diagnostic: hits a neutral third-party echo endpoint with a
    // test Authorization header and logs back exactly what it received.
    // Proves whether this device/network delivers the header at all,
    // independent of the glovision backend. Remove once the header-missing
    // issue is resolved.
    fetch("https://httpbin.org/headers", {
      headers: { Authorization: "Bearer test123" },
    })
      .then((r) => r.json())
      .then((json) => console.log("[echo]", JSON.stringify(json)))
      .catch((e) => console.log("[echo] request failed:", String(e)));
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

  function commitTag(raw: string) {
    const cleanTag = raw.replace(/\n/g, "").trim().toUpperCase();
    if (cleanTag.length <= 4) return;
    setTagList((prev) => (prev.includes(cleanTag) ? prev : [cleanTag, ...prev]));
  }

  function handleTagInputChange(text: string) {
    if (text.includes("\n")) {
      commitTag(text);
      setTagInput("");
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
    const succeeded: string[] = [];
    const failures: { tag: string; message: string }[] = [];

    for (const tag of finalTags) {
      try {
        await mapRfidApi(vehicleNo, tag);
        succeeded.push(tag);
      } catch (e) {
        failures.push({
          tag,
          message: e instanceof ApiError ? e.message : "Request failed.",
        });
      }
    }

    setSubmitting(false);

    if (failures.length > 0) {
      setTagList(failures.map((f) => f.tag));
      setTagInput("");
      setResult({
        variant: "error",
        message: failures.map((f) => `${f.tag}: ${f.message}`).join("\n"),
      });
      return;
    }

    closeModal();
    setResult({
      variant: "success",
      message: `Mapped ${succeeded.length} tag${succeeded.length > 1 ? "s" : ""} to ${vehicleNo}.`,
    });
  }

  return (
    <View style={styles.safe}>
      <EmptyState
        icon="tag-multiple-outline"
        message="Tap + to map an RFID tag to a vehicle."
      />

      <GradientFab style={styles.fab} onPress={openAssignModal} />

      <DialogComponent
        visible={modalVisible}
        onDismiss={closeModal}
        title={vehicleNo ? `Assign Tags · ${vehicleNo}` : "Assign Tags"}
        icon="tag-plus-outline"
        cornerRadius={24}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
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
              commitTag(tagInput);
              setTagInput("");
            }}
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
          <View style={styles.actionRow}>
            <Button onPress={closeModal} disabled={submitting}>
              Cancel
            </Button>
            <GradientButton label="Submit" onPress={handleSubmit} loading={submitting} />
          </View>
        </KeyboardAvoidingView>
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
    bottom: 96,
  },
  input: {
    marginBottom: Spacing.md,
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
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
});
