import { useState } from "react";
import { router } from "expo-router";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Button, Surface, Text, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { AshBackground } from "@/components/ash-background";
import { GradientButton } from "@/components/gradient-button";
import { ResultDialog } from "@/components/result-dialog";
import { ApiError, registerApi } from "@/lib/api";

export default function RegisterScreen() {
  const [roleID, setRoleID] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ variant: "success" | "error"; message: string } | null>(
    null
  );

  async function handleRegister() {
    setError("");

    if (password !== confirmPassword) {
      setError("Password and Confirm Password do not match.");
      return;
    }

    setLoading(true);
    try {
      const message = await registerApi({
        roleID: roleID.trim(),
        username: username.trim(),
        name: name.trim(),
        company: company.trim(),
        password,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      setResult({ variant: "success", message });
    } catch (e) {
      setResult({
        variant: "error",
        message: e instanceof ApiError ? e.message : "Something went wrong. Try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleResultClose() {
    const wasSuccess = result?.variant === "success";
    setResult(null);
    if (wasSuccess) {
      router.replace("/login");
    }
  }

  return (
    <LinearGradient
      colors={[Colors.secondaryDark, Colors.secondary, Colors.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <AshBackground />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.hero}>
          <View style={styles.logoCircle}>
            <MaterialCommunityIcons name="account-plus-outline" size={38} color={Colors.primary} />
          </View>
          <Text style={styles.brand}>ASH TRACK</Text>
          <Text style={styles.tagline}>Create your account</Text>
        </View>

        <Surface style={styles.card} elevation={4}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Register</Text>

            <TextInput
              label="Role ID"
              mode="outlined"
              autoCapitalize="none"
              value={roleID}
              onChangeText={setRoleID}
              style={styles.input}
              left={<TextInput.Icon icon="shield-account-outline" />}
            />
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
              label="Full Name"
              mode="outlined"
              value={name}
              onChangeText={setName}
              style={styles.input}
              left={<TextInput.Icon icon="badge-account-outline" />}
            />
            <TextInput
              label="Company"
              mode="outlined"
              value={company}
              onChangeText={setCompany}
              style={styles.input}
              left={<TextInput.Icon icon="domain" />}
            />
            <TextInput
              label="Email"
              mode="outlined"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              left={<TextInput.Icon icon="email-outline" />}
            />
            <TextInput
              label="Phone"
              mode="outlined"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              style={styles.input}
              left={<TextInput.Icon icon="phone-outline" />}
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
            <TextInput
              label="Confirm Password"
              mode="outlined"
              secureTextEntry={secure}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              style={styles.input}
              left={<TextInput.Icon icon="lock-check-outline" />}
            />
            <Text style={styles.helperText}>
              8–20 characters, with at least one uppercase letter, one lowercase letter, one
              number and one special character.
            </Text>

            {!!error && <Text style={styles.error}>{error}</Text>}

            <GradientButton
              label="Register"
              onPress={handleRegister}
              loading={loading}
              icon="account-plus-outline"
              fullWidth
            />

            <Button mode="text" onPress={() => router.back()} style={styles.loginLinkBtn}>
              Already have an account? Login
            </Button>
          </ScrollView>
        </Surface>
      </KeyboardAvoidingView>

      <ResultDialog
        visible={!!result}
        variant={result?.variant ?? "success"}
        title={result?.variant === "error" ? "Registration Failed" : "Success"}
        message={result?.message ?? ""}
        buttonLabel={result?.variant === "success" ? "Go to Login" : "OK"}
        onClose={handleResultClose}
      />
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
  hero: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 48,
    paddingBottom: 24,
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  brand: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 3,
  },
  tagline: {
    color: "#D7E9F7",
    fontSize: 13,
    marginTop: Spacing.xs,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
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
  helperText: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
  },
  error: {
    color: Colors.danger,
    marginBottom: Spacing.md,
    fontSize: 13,
  },
  loginLinkBtn: {
    marginTop: Spacing.sm,
  },
});
