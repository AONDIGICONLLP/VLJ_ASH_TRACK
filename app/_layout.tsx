import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PaperProvider } from "react-native-paper";
import * as SplashScreen from "expo-splash-screen";
import { AppSplashGate } from "@/components/app-splash";
import { SecurityGate } from "@/components/security-gate";
import { AuthProvider } from "@/lib/auth-context";
import { PaperTheme } from "@/lib/paper-theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={PaperTheme}>
        <StatusBar style="light" />
        <SecurityGate>
          <AuthProvider>
            <AppSplashGate>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="login" />
                <Stack.Screen name="register" />
                <Stack.Screen name="(tabs)" />
              </Stack>
            </AppSplashGate>
          </AuthProvider>
        </SecurityGate>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
