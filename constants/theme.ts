export const Colors = {
  primary: "#71B32F",
  primaryDark: "#588F24",
  primaryLight: "#8FC957",
  secondary: "#005298",
  secondaryDark: "#003B70",
  secondaryLight: "#3378B5",
  background: "#F3F6FB",
  card: "#FFFFFF",
  border: "#E2E8F0",
  text: "#0F172A",
  textMuted: "#64748B",
  danger: "#DC2626",
  dangerDark: "#991B1B",
  white: "#FFFFFF",
} as const;

// Ready-made gradient stops for expo-linear-gradient, kept alongside Colors so
// every "premium" surface (headers, hero, buttons, dialogs) pulls from one place.
export const Gradients = {
  brand: ["#005298", "#71B32F"] as [string, string],
  header: ["#003B70", "#005298"] as [string, string],
  hero: ["#003B70", "#005298", "#588F24"] as [string, string, string],
  primaryButton: ["#588F24", "#71B32F"] as [string, string],
  secondaryButton: ["#003B70", "#005298"] as [string, string],
  success: ["#588F24", "#71B32F"] as [string, string],
  danger: ["#991B1B", "#DC2626"] as [string, string],
  // A richer, tighter palette used only for the app icon and the JS splash
  // screen (components/app-splash.tsx) — deep indigo grounding into a rich
  // azure and a single vivid teal accent, distinct from the in-app UI
  // gradients above so headers/buttons elsewhere are unaffected.
  splash: ["#0B1229", "#0E6BA8", "#14B8A6"] as [string, string, string],
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const Radius = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 28,
  pill: 999,
} as const;

// The floating bottom tab bar's own footprint (app/(tabs)/_layout.tsx),
// kept here so every screen's scrollable list can reserve enough space to
// clear it — combined with useSafeAreaInsets().bottom at each call site,
// since that part varies per device (gesture-nav bar, home indicator, etc).
export const TabBarMetrics = {
  height: 68,
  bottomMargin: 14,
} as const;
