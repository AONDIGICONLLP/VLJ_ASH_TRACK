import { MD3LightTheme } from "react-native-paper";
import { Colors } from "@/constants/theme";

export const PaperTheme = {
  ...MD3LightTheme,
  roundness: 3,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.primary,
    onPrimary: Colors.white,
    primaryContainer: "#E3F2D3",
    onPrimaryContainer: Colors.primaryDark,
    secondary: Colors.secondary,
    onSecondary: Colors.white,
    secondaryContainer: "#D6E8FA",
    onSecondaryContainer: Colors.secondaryDark,
    background: Colors.background,
    onBackground: Colors.text,
    surface: Colors.card,
    onSurface: Colors.text,
    error: Colors.danger,
    outline: Colors.border,
  },
};
