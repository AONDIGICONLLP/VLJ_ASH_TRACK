import { useEffect } from "react";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator } from "react-native-paper";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/lib/auth-context";

export default function AuthGate() {
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    router.replace(session ? "/(tabs)/vehicle-rfid" : "/login");
  }, [loading, session]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={Colors.white} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.secondaryDark,
  },
});
