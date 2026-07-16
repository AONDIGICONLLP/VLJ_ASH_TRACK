import { useState } from "react";
import { router } from "expo-router";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Button, Surface, Text, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Gradients, Radius, Spacing } from "@/constants/theme";
import { AshBackground } from "@/components/ash-background";
import { AshCelebration } from "@/components/ash-celebration";
import { GradientButton } from "@/components/gradient-button";
import { useAuth } from "@/lib/auth-context";
import { ApiError, loginApi } from "@/lib/api";

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      setError("Enter username and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await loginApi(username.trim(), password);
      console.log("[login] response:", JSON.stringify(data, null, 2));
      await login({
        username: data.username,
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        roleID: data.roleID,
        permissions: data.permissions,
        token: data.token,
        // TEMPORARY: real roleID -> app role mapping not defined yet.
        role: "superadmin",
      });
      setLoading(false);
      setCelebrate(true);
      setTimeout(() => {
        router.replace("/(tabs)/vehicle-rfid");
      }, 1100);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <LinearGradient
      colors={[Colors.secondaryDark, Colors.secondary, Colors.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <AshBackground intense />
      <AshCelebration active={celebrate} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.brand}>ASH TRACKING</Text>
            <View style={styles.brandUnderline} />
          </View>

          <Surface style={styles.card} elevation={4}>
            <LinearGradient
              colors={Gradients.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cardAccent}
            />
            <View style={styles.securePill}>
              <MaterialCommunityIcons name="shield-check-outline" size={12} color={Colors.secondary} />
              <Text style={styles.securePillText}>Secure Login</Text>
            </View>
            <Text style={styles.title}>Sign in</Text>

            <TextInput
              label="Username"
              mode="outlined"
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
              style={styles.input}
              left={<TextInput.Icon icon="account-outline" />}
            />
            <TextInput
              label="Password"
              mode="outlined"
              secureTextEntry={secure}
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              left={<TextInput.Icon icon="lock-outline" />}
              right={
                <TextInput.Icon
                  icon={secure ? "eye-outline" : "eye-off-outline"}
                  onPress={() => setSecure((s) => !s)}
                />
              }
            />

            {!!error && <Text style={styles.error}>{error}</Text>}

            <GradientButton
              label="Login"
              onPress={handleLogin}
              loading={loading}
              icon="login"
              fullWidth
            />

            <Button
              mode="text"
              onPress={() => router.push("/register")}
              style={styles.registerLinkBtn}
            >
              Don&apos;t have an account? Register
            </Button>
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: Spacing.lg,
  },
  hero: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  brand: {
    color: Colors.white,
    fontSize: 27,
    fontWeight: "800",
    letterSpacing: 3,
  },
  brandUnderline: {
    width: 40,
    height: 3,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryLight,
    marginTop: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  cardAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 5,
  },
  securePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "#EAF2FA",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  securePillText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.secondary,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 21,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  input: {
    marginBottom: Spacing.md,
  },
  error: {
    color: Colors.danger,
    marginBottom: Spacing.md,
    fontSize: 13,
  },
  registerLinkBtn: {
    marginTop: Spacing.sm,
  },
});
