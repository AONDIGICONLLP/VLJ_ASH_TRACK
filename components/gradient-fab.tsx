import { Pressable, StyleSheet, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Gradients } from "@/constants/theme";

type Props = {
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
};

export function GradientFab({ icon = "plus", onPress, disabled, style }: Props) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.wrap, style]}>
      <LinearGradient
        colors={disabled ? ["#9CA3AF", "#B0B7C3"] : Gradients.brand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <MaterialCommunityIcons name={icon} size={26} color={Colors.white} />
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    elevation: 8,
    shadowColor: "#0B1F33",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  gradient: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
  },
});
