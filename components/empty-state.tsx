import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Spacing } from "@/constants/theme";

type Props = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  message: string;
};

export function EmptyState({ icon, message }: Props) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons name={icon} size={36} color={Colors.secondaryLight} />
      </View>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl * 1.5,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#E4EEF7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  text: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
