import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
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
  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.wrapper}>
      <Pressable
        disabled={disabled}
        onPress={() => setOpen((p) => !p)}
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
          {options.length === 0 ? (
            <View style={styles.emptyRow}>
              <MaterialCommunityIcons name="inbox-outline" size={16} color={Colors.textMuted} />
              <Text style={styles.emptyText}>{emptyMessage}</Text>
            </View>
          ) : (
            <ScrollView style={styles.scroll} nestedScrollEnabled bounces={false}>
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    style={[styles.option, isSelected && styles.optionSelected]}
                    onPress={() => {
                      onSelect(option.value);
                      setOpen(false);
                    }}
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
