import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { Portal, Text } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Gradients, Radius, Spacing } from "@/constants/theme";
import { AshCelebration } from "@/components/ash-celebration";

type Variant = "success" | "error";

type Props = {
  visible: boolean;
  variant: Variant;
  title: string;
  message: string;
  buttonLabel?: string;
  onClose: () => void;
};

export function ResultDialog({
  visible,
  variant,
  title,
  message,
  buttonLabel = "Done",
  onClose,
}: Props) {
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0.85);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, bounciness: 10, speed: 14 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    if (variant === "success") {
      setCelebrate(true);
      const timer = setTimeout(() => setCelebrate(false), 1400);
      return () => clearTimeout(timer);
    }
  }, [visible, variant, scale, opacity]);

  if (!visible) return null;

  const isSuccess = variant === "success";
  const bannerColors = isSuccess ? Gradients.success : Gradients.danger;
  const icon = isSuccess ? "check-circle" : "alert-circle";

  return (
    <Portal>
      <View style={styles.overlay}>
        {isSuccess && <AshCelebration active={celebrate} />}
        <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
          <LinearGradient
            colors={bannerColors}
            style={styles.banner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />

          <View style={styles.iconWrap}>
            <LinearGradient
              colors={bannerColors}
              style={styles.iconCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialCommunityIcons name={icon} size={42} color={Colors.white} />
            </LinearGradient>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <Pressable onPress={onClose} style={styles.button}>
            <LinearGradient
              colors={bannerColors}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.buttonText}>{buttonLabel}</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    alignItems: "center",
    overflow: "hidden",
    paddingBottom: Spacing.lg,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  banner: {
    width: "100%",
    height: 8,
  },
  iconWrap: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: Spacing.xs,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  button: {
    width: "100%",
    paddingHorizontal: Spacing.lg,
  },
  buttonGradient: {
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: Colors.white,
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
