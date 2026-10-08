import { GradientButton } from "@/components/gradient-button";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { isDeveloperOptionsEnabled } from "expo-security-checks";
import * as SplashScreen from "expo-splash-screen";
import { ReactNode, useCallback, useEffect, useState } from "react";
import { AppState, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

export function SecurityGate({ children }: { children: ReactNode }) {
  const [blocked, setBlocked] = useState<boolean | null>(null);

  const check = useCallback(() => {
    setBlocked(isDeveloperOptionsEnabled());
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    check();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });
    return () => subscription.remove();
  }, [check]);

  if (blocked === null) return null;
  if (!blocked) return <>{children}</>;

  return (
    <LinearGradient
      colors={[Colors.secondaryDark, Colors.secondary, Colors.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.iconBadge}>
        <MaterialCommunityIcons name="shield-alert-outline" size={40} color={Colors.white} />
      </View>
      <Text style={styles.title}>Developer Options Enabled</Text>
      <Text style={styles.message}>
        For your security, ASH TRACK can&apos;t be used while Developer Options are turned on — this setting
        is required by most fake/mock location apps.
      </Text>
      <View style={styles.steps}>
        <Text style={styles.stepsTitle}>To disable it:</Text>
        <Text style={styles.step}>1. Open your device Settings</Text>
        <Text style={styles.step}>
          2. Go to System → Developer options{"\n"}(labeled &quot;Additional settings&quot; on some phones)
        </Text>
        <Text style={styles.step}>3. Turn the Developer options switch off</Text>
        <Text style={styles.step}>4. Come back here and tap Retry below</Text>
      </View>
      <GradientButton label="Retry" onPress={check} icon="refresh" fullWidth />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  iconBadge: {
    width: 84,
    height: 84,
    borderRadius: Radius.xl,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  message: {
    color: "#D7E9F7",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  steps: {
    alignSelf: "stretch",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  stepsTitle: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: Spacing.sm,
  },
  step: {
    color: "#D7E9F7",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
});
