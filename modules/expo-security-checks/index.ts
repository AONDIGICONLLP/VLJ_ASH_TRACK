import { Platform } from "react-native";
import { requireNativeModule } from "expo-modules-core";

type ExpoSecurityChecksModule = {
  isDeveloperOptionsEnabled(): boolean;
  openDeveloperOptionsSettings(): boolean;
};

// Resolved lazily (not at import time) and cached — requireNativeModule
// throws synchronously if the native module isn't linked into the running
// binary yet (e.g. a dev client build from before this module was added).
// Resolving eagerly at import time would crash the whole app on load in
// that case; resolving lazily on first use, wrapped in try/catch, means a
// missing native module just makes this check unavailable (fails open)
// instead of bringing down everything that imports this file.
let native: ExpoSecurityChecksModule | null | undefined;

function getNativeModule(): ExpoSecurityChecksModule | null {
  if (native !== undefined) return native;
  if (Platform.OS !== "android") {
    native = null;
    return native;
  }
  try {
    native = requireNativeModule<ExpoSecurityChecksModule>("ExpoSecurityChecks");
  } catch {
    native = null;
  }
  return native;
}

// Whether Android's Developer Options are currently switched on for this
// device. Always false on non-Android platforms, or if the native module
// isn't available yet (see getNativeModule above).
export function isDeveloperOptionsEnabled(): boolean {
  return getNativeModule()?.isDeveloperOptionsEnabled() ?? false;
}

// Opens Android's Developer Options settings screen directly. Returns
// whether the screen was actually launched — false on non-Android
// platforms, if the native module isn't available, if there's no
// foreground activity to launch from, or if the native module is present
// but doesn't have this function yet (a build from before it was added —
// JS-only reloads never pick up native/Kotlin changes, only a full rebuild
// does, so this stays possible even once the module itself is linked).
export function openDeveloperOptionsSettings(): boolean {
  const module = getNativeModule();
  if (!module || typeof module.openDeveloperOptionsSettings !== "function") {
    return false;
  }
  return module.openDeveloperOptionsSettings();
}
