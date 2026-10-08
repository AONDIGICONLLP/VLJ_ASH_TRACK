import { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { Button, Portal, Surface, Text } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  if (!visible) return null;

  // Cap the dialog to the visible screen (minus safe-area insets) so it can
  // never render taller than the device's usable area — on small/handheld
  // screens a tall body (e.g. many zone points) would otherwise push the
  // action buttons below the fold with no way to reach them.
  const topInset = (position === "top" ? 60 : Spacing.lg) + insets.top;
  const bottomInset = Spacing.lg + insets.bottom;
  const dialogMaxHeight = Math.max(windowHeight - topInset - bottomInset, 260);
  const bodyMaxHeight = Math.max(dialogMaxHeight - 150, 100);

  // A fullScreen dialog is meant to cover the entire device screen edge to
  // edge (only safe-area insets carve out the notch/status bar/nav bar) —
  // no floating-card margin and no rounded corners, unlike the small
  // centered dialog which keeps its margin and corner radius.
  const overlayPadding = fullScreen
    ? { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }
    : { paddingTop: topInset, paddingBottom: bottomInset };

  return (
    <Portal>
      <Pressable
        style={[
          styles.overlay,
          position === "top" ? styles.overlayTop : styles.overlayCenter,
          overlayPadding,
        ]}
        onPress={onDismiss}
      >
        <Pressable
          onPress={() => {}}
          style={[
            styles.cardWrapper,
            fullScreen ? styles.cardWrapperFull : { maxHeight: dialogMaxHeight },
          ]}
        >
          <Surface
            style={[
              styles.card,
              fullScreen && styles.cardFull,
              { backgroundColor, borderRadius: fullScreen ? 0 : cornerRadius },
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
              </View>
              {fullScreen ? (
                <View style={[styles.body, styles.bodyFull]}>{children}</View>
              ) : (
                <ScrollView
                  style={[styles.body, { maxHeight: bodyMaxHeight }]}
                  contentContainerStyle={styles.bodyContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {children}
                </ScrollView>
              )}
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
                        compact
                      />
                    ) : (
                      <Button
                        key={action.label}
                        mode={action.mode ?? "text"}
                        onPress={action.onPress}
                        disabled={action.disabled}
                        compact
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
  body: {
    marginBottom: Spacing.md,
  },
  bodyContent: {
    paddingBottom: Spacing.xs,
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
