import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Radius, Spacing } from "@/constants/theme";

export type DropdownOption = {
  label: string;
  value: string;
};

type Props = {
  label: string;
  value: string | null;
  options: DropdownOption[];
  onSelect: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
};

export function DropdownField({
  label,
  value,
  options,
  onSelect,
  placeholder = "Select",
  disabled,
  emptyMessage = "No options available",
}: Props) {
  const [open, setOpen] = useState(false);
  // The trigger flips open on the very same tap; rendering the (possibly
  // long) option list is deferred a couple of frames so the tap itself
  // never waits on that list layout — a brief "Loading options..." row
  // fills the gap instead of the dropdown appearing to stall.
  const [listReady, setListReady] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<TextInput>(null);
  const selected = options.find((o) => o.value === value);

  const trimmedQuery = query.trim().toLowerCase();
  const filtered = trimmedQuery
    ? options.filter((o) => o.label.toLowerCase().includes(trimmedQuery))
    : options;

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => searchRef.current?.focus(), 60);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setListReady(false);
      return;
    }
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setListReady(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [open]);

  function toggle() {
    setOpen((prev) => {
      if (prev) setQuery("");
      return !prev;
    });
  }

  function selectOption(optionValue: string) {
    onSelect(optionValue);
    setOpen(false);
    setQuery("");
  }

  return (
    <View style={styles.wrapper}>
      <Pressable
        disabled={disabled}
        onPress={toggle}
        style={[styles.trigger, open && styles.triggerOpen, disabled && styles.triggerDisabled]}
      >
        <View style={styles.triggerText}>
          <Text style={styles.label}>{label}</Text>
          <Text style={[styles.value, !selected && styles.placeholder]} numberOfLines={1}>
            {selected ? selected.label : placeholder}
          </Text>
        </View>
        <MaterialCommunityIcons
          name={open ? "chevron-up" : "chevron-down"}
          size={22}
          color={open ? Colors.secondary : Colors.textMuted}
        />
      </Pressable>

      {open && (
        <View style={styles.list}>
          {options.length > 0 && (
            <View style={styles.searchRow}>
              <MaterialCommunityIcons name="magnify" size={16} color={Colors.textMuted} />
              <TextInput
                ref={searchRef}
                value={query}
                onChangeText={setQuery}
                placeholder="Type to filter..."
                placeholderTextColor={Colors.textMuted}
                style={styles.searchInput}
                autoCorrect={false}
              />
              {!!query && (
                <Pressable onPress={() => setQuery("")} hitSlop={8}>
                  <MaterialCommunityIcons name="close-circle" size={16} color={Colors.textMuted} />
                </Pressable>
              )}
            </View>
          )}

          {!listReady ? (
            <View style={styles.emptyRow}>
              <ActivityIndicator size="small" color={Colors.secondary} />
              <Text style={styles.emptyText}>Loading options...</Text>
            </View>
          ) : options.length === 0 ? (
            <View style={styles.emptyRow}>
              <MaterialCommunityIcons name="inbox-outline" size={16} color={Colors.textMuted} />
              <Text style={styles.emptyText}>{emptyMessage}</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyRow}>
              <MaterialCommunityIcons name="text-search" size={16} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No matches for &quot;{query.trim()}&quot;</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              nestedScrollEnabled
              bounces={false}
              keyboardShouldPersistTaps="handled"
            >
              {filtered.map((option) => {
                const isSelected = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    style={[styles.option, isSelected && styles.optionSelected]}
                    onPress={() => selectOption(option.value)}
                  >
                    <Text
                      style={[styles.optionText, isSelected && styles.optionTextSelected]}
                      numberOfLines={1}
                    >
                      {option.label}
                    </Text>
                    {isSelected && (
                      <MaterialCommunityIcons name="check" size={18} color={Colors.secondary} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.md,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    minHeight: 56,
  },
  triggerOpen: {
    borderColor: Colors.secondary,
    backgroundColor: "#EAF2FA",
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  triggerDisabled: {
    opacity: 0.6,
  },
  triggerText: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  value: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
  },
  placeholder: {
    color: Colors.textMuted,
    fontWeight: "400",
  },
  list: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: Colors.secondary,
    borderBottomLeftRadius: Radius.sm,
    borderBottomRightRadius: Radius.sm,
    overflow: "hidden",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#F8FAFC",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    padding: 0,
  },
  scroll: {
    maxHeight: 240,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  optionSelected: {
    backgroundColor: "#EAF2FA",
  },
  optionText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    flex: 1,
  },
  optionTextSelected: {
    color: Colors.secondary,
    fontWeight: "800",
  },
  emptyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
});
