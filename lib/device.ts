import { Platform } from "react-native";
import * as Application from "expo-application";

export async function getDeviceId(): Promise<string> {
  if (Platform.OS === "android") {
    return Application.getAndroidId() ?? "unknown-device";
  }
  if (Platform.OS === "ios") {
    const id = await Application.getIosIdForVendorAsync();
    return id ?? "unknown-device";
  }
  return "web-device";
}
