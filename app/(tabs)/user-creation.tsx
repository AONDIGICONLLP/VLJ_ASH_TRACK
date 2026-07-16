import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { Colors, Spacing } from "@/constants/theme";
import DialogComponent from "@/components/dialog";
import { DropdownField } from "@/components/dropdown-field";
import { EmptyState } from "@/components/empty-state";
import { GradientFab } from "@/components/gradient-fab";
import { ResultDialog } from "@/components/result-dialog";
import { useRoleGuard } from "@/lib/use-role-guard";
import { ApiError, getRolesApi, registerApi } from "@/lib/api";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{10}$/;

export default function UserCreationScreen() {
  const { allowed, loading } = useRoleGuard(["admin", "superadmin"]);

  const [modalVisible, setModalVisible] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState("");
  const [roleID, setRoleID] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [secure, setSecure] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [result, setResult] = useState<{ variant: "success" | "error"; message: string } | null>(
    null
  );

  useEffect(() => {
    if (!modalVisible) return;
    setRolesLoading(true);
    setRolesError("");
    getRolesApi()
      .then(setRoles)
      .catch((e) => {
        const message = e instanceof ApiError ? e.message : "Could not load roles.";
        console.log("[roles]", message);
        setRoles([]);
        setRolesError(message);
      })
      .finally(() => setRolesLoading(false));
  }, [modalVisible]);

  function openModal() {
    setRoleID("");
    setUsername("");
    setName("");
    setCompany("");
    setPassword("");
    setEmail("");
    setPhone("");
    setIsActive(true);
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setRoleID("");
    setUsername("");
    setName("");
    setCompany("");
    setPassword("");
    setEmail("");
    setPhone("");
    setIsActive(true);
  }

  async function handleSubmit() {
    if (!PASSWORD_REGEX.test(password)) return;
    if (email.trim() && !EMAIL_REGEX.test(email.trim())) return;
    if (phone.trim() && !PHONE_REGEX.test(phone.trim())) return;

    setSubmitting(true);
    try {
      const message = await registerApi({
        roleID: roleID.trim(),
        username: username.trim(),
        name: name.trim(),
        company: company.trim(),
        password,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        isActive: isActive ? 1 : 0,
      });
      closeModal();
      setResult({ variant: "success", message });
    } catch (e) {
      setResult({
        variant: "error",
        message: e instanceof ApiError ? e.message : "Something went wrong. Try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !allowed) return null;

  const passwordError =
    password.length > 0 && !PASSWORD_REGEX.test(password)
      ? "Password must be 8-20 characters with an uppercase letter, lowercase letter, digit and special character."
      : "";
  const emailError =
    email.trim().length > 0 && !EMAIL_REGEX.test(email.trim())
      ? "Enter a valid email address."
      : "";
  const phoneError =
    phone.trim().length > 0 && !PHONE_REGEX.test(phone.trim())
      ? "Phone number must be exactly 10 digits."
      : "";

  return (
    <View style={styles.safe}>
      <EmptyState
        icon="account-plus-outline"
        message="Tap + to register a new user account."
      />

      <GradientFab style={styles.fab} onPress={openModal} />

      <DialogComponent
        visible={modalVisible}
        onDismiss={closeModal}
        title="User Register"
        icon="account-plus-outline"
        cornerRadius={24}
        actions={[
          { label: "Cancel", onPress: closeModal, disabled: submitting },
          { label: "Register", mode: "contained", onPress: handleSubmit, loading: submitting },
        ]}
      >
        <View>
          <DropdownField
            label="Role ID *"
            value={roleID || null}
            options={roles.map((r) => ({ label: r, value: r }))}
            onSelect={setRoleID}
            disabled={rolesLoading}
            emptyMessage={
              rolesLoading ? "Loading roles..." : rolesError || "No roles found."
            }
          />
          <TextInput
            label="Username *"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Full Name *"
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Company *"
            value={company}
            onChangeText={setCompany}
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Password *"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={secure}
            mode="outlined"
            style={styles.input}
            right={
              <TextInput.Icon
                icon={secure ? "eye-outline" : "eye-off-outline"}
                onPress={() => setSecure((s) => !s)}
              />
            }
          />
          <Text style={passwordError ? styles.fieldError : styles.helperText}>
            {passwordError ||
              "8–20 characters, with at least one uppercase letter, one lowercase letter, one number and one special character."}
          </Text>
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            mode="outlined"
            style={styles.input}
          />
          {!!emailError && <Text style={styles.fieldError}>{emailError}</Text>}
          <TextInput
            label="Phone"
            value={phone}
            onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, "").slice(0, 10))}
            keyboardType="phone-pad"
            maxLength={10}
            mode="outlined"
            style={styles.input}
          />
          {!!phoneError && <Text style={styles.fieldError}>{phoneError}</Text>}

          <Text style={styles.fieldLabel}>Status</Text>
          <View style={styles.statusToggle}>
            <Button
              mode={isActive ? "contained" : "outlined"}
              onPress={() => setIsActive(true)}
              style={styles.statusBtn}
            >
              Active
            </Button>
            <Button
              mode={!isActive ? "contained" : "outlined"}
              onPress={() => setIsActive(false)}
              style={styles.statusBtn}
            >
              Inactive
            </Button>
          </View>
        </View>
      </DialogComponent>

      <ResultDialog
        visible={!!result}
        variant={result?.variant ?? "success"}
        title={result?.variant === "error" ? "Registration Failed" : "Success"}
        message={result?.message ?? ""}
        onClose={() => setResult(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 96,
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
  fieldError: {
    color: Colors.danger,
    fontSize: 12,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: Spacing.xs,
  },
  statusToggle: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statusBtn: {
    flex: 1,
  },
});
