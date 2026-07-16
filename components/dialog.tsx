import { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Portal, Surface, Text } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Gradients, Radius, Spacing } from "@/constants/theme";
import { GradientButton } from "@/components/gradient-button";

export type DialogAction = {
  label: string;
  onPress: () => void;
  mode?: "text" | "outlined" | "contained";
  loading?: boolean;
  disabled?: boolean;
};

type Props = {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  accentColors?: [string, string];
  children: ReactNode;
  position?: "center" | "top";
  backgroundColor?: string;
  cornerRadius?: number;
  actions?: DialogAction[];
  /** Expands the dialog to fill nearly the whole screen instead of a small centered card. */
  fullScreen?: boolean;
};

export default function DialogComponent({
  visible,
  onDismiss,
  title,
  icon,
  accentColors = Gradients.brand,
  children,
  position = "center",
  backgroundColor = Colors.card,
  cornerRadius = 24,
  actions = [],
  fullScreen = false,
}: Props) {
  if (!visible) return null;

  return (
    <Portal>
      <Pressable
        style={[styles.overlay, position === "top" ? styles.overlayTop : styles.overlayCenter]}
        onPress={onDismiss}
      >
        <Pressable
          onPress={() => {}}
          style={[styles.cardWrapper, fullScreen && styles.cardWrapperFull]}
        >
          <Surface
            style={[
              styles.card,
              fullScreen && styles.cardFull,
              { backgroundColor, borderRadius: cornerRadius },
            ]}
            elevation={4}
          >
            <LinearGradient
              colors={accentColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.accentBar}
            />
            <View style={[styles.inner, fullScreen && styles.innerFull]}>
              <View style={styles.header}>
                {icon && (
                  <LinearGradient
                    colors={accentColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconBadge}
                  >
                    <MaterialCommunityIcons name={icon} size={20} color={Colors.white} />
                  </LinearGradient>
                )}
                <Text variant="titleMedium" style={styles.title}>
                  {title}
                </Text>
                {fullScreen && (
                  <Pressable onPress={onDismiss} style={styles.closeBtn}>
                    <MaterialCommunityIcons name="close" size={22} color={Colors.textMuted} />
                  </Pressable>
                )}
              </View>
              <View style={[styles.body, fullScreen && styles.bodyFull]}>{children}</View>
              {actions.length > 0 && (
                <View style={[styles.actions, fullScreen && styles.actionsFull]}>
                  {actions.map((action) =>
                    action.mode === "contained" ? (
                      <GradientButton
                        key={action.label}
                        label={action.label}
                        onPress={action.onPress}
                        colors={accentColors}
                        loading={action.loading}
                        disabled={action.disabled}
                      />
                    ) : (
                      <Button
                        key={action.label}
                        mode={action.mode ?? "text"}
                        onPress={action.onPress}
                        disabled={action.disabled}
                        style={styles.actionBtn}
                      >
                        {action.label}
                      </Button>
                    )
                  )}
                </View>
              )}
            </View>
          </Surface>
        </Pressable>
      </Pressable>
    </Portal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    padding: Spacing.lg,
  },
  overlayCenter: {
    justifyContent: "center",
  },
  overlayTop: {
    justifyContent: "flex-start",
    paddingTop: 60,
  },
  cardWrapper: {
    width: "100%",
  },
  cardWrapperFull: {
    height: "100%",
  },
  card: {
    overflow: "hidden",
  },
  cardFull: {
    flex: 1,
  },
  accentBar: {
    height: 5,
    width: "100%",
  },
  inner: {
    padding: Spacing.lg,
  },
  innerFull: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontWeight: "800",
    color: Colors.text,
    flex: 1,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  body: {
    marginBottom: Spacing.md,
  },
  bodyFull: {
    flex: 1,
    marginBottom: 0,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.sm,
  },
  actionsFull: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionBtn: {
    borderRadius: Radius.sm,
  },
});
