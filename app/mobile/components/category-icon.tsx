import {
  Banknote,
  Car,
  Clapperboard,
  GraduationCap,
  HeartPulse,
  Plane,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Utensils,
  type LucideIcon,
} from "lucide-react-native";
import React from "react";
import { View } from "react-native";

import { CategoryColors, Colors } from "@/constants/colors";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Food: Utensils,
  Groceries: ShoppingCart,
  Transport: Car,
  Shopping: ShoppingBag,
  Entertainment: Clapperboard,
  Bills: Receipt,
  Health: HeartPulse,
  Education: GraduationCap,
  Travel: Plane,
  Income: Banknote,
};

/** Custom categories get a stable colour derived from their name. */
export function categoryColor(category: string): string {
  if (CategoryColors[category]) return CategoryColors[category];
  let hash = 0;
  for (const ch of category) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return Colors.chartColors[Math.abs(hash) % Colors.chartColors.length];
}

export function CategoryIcon({
  category,
  isIncome = false,
  size = 40,
}: {
  category: string;
  isIncome?: boolean;
  size?: number;
}) {
  const Icon = isIncome
    ? Banknote
    : (CATEGORY_ICONS[category] ?? Tag);
  const color = isIncome ? Colors.primary : categoryColor(category);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: `${color}26`, // ~15% opacity tint
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon size={size * 0.45} color={color} />
    </View>
  );
}
