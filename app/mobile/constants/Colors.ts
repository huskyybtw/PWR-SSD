export const Colors = {
  background: "#0B1120",
  surface: "#111827",
  surfaceElevated: "#1A2236",
  surfaceHighlight: "#1E293B",
  border: "#1F2937",
  borderLight: "#374151",

  text: "#F1F5F9",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",

  primary: "#10B981",
  primaryLight: "#34D399",
  primaryDark: "#059669",
  primaryMuted: "#064E3B",

  accent: "#F59E0B",
  accentLight: "#FBBF24",
  accentMuted: "#451A03",

  danger: "#EF4444",
  dangerLight: "#F87171",
  dangerMuted: "#450A0A",

  info: "#3B82F6",
  infoLight: "#60A5FA",
  infoMuted: "#172554",

  chartColors: [
    "#10B981",
    "#F59E0B",
    "#3B82F6",
    "#EF4444",
    "#8B5CF6",
    "#EC4899",
    "#06B6D4",
    "#84CC16",
  ],
} as const;

export const CategoryColors: Record<string, string> = {
  Food: "#10B981",
  Transport: "#3B82F6",
  Shopping: "#F59E0B",
  Entertainment: "#8B5CF6",
  Bills: "#EF4444",
  Health: "#EC4899",
  Education: "#06B6D4",
  Travel: "#84CC16",
  Uncategorized: "#64748B",
  Income: "#10B981",
};
