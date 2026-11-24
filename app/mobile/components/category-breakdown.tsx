import { BarChart3, PieChart } from "lucide-react-native";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { CategoryIcon, categoryColor } from "@/components/category-icon";
import { DonutChart } from "@/components/donut-chart";
import { Colors } from "@/constants/colors";
import { formatCurrency } from "@/shared/utils";

const OTHER_LABEL = "Other";

type Segment = { name: string; value: number; color: string };
export type ChartMode = "circle" | "bars";

/** Top `limit` categories, the rest grouped as "Other". */
function toSegments(breakdown: Record<string, number>, limit: number): Segment[] {
  const sorted = Object.entries(breakdown)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const segments: Segment[] = sorted.slice(0, limit).map(([name, value]) => ({
    name,
    value,
    color: categoryColor(name),
  }));
  const other = sorted.slice(limit).reduce((s, [, v]) => s + v, 0);
  if (other > 0) {
    segments.push({ name: OTHER_LABEL, value: other, color: Colors.textMuted });
  }
  return segments;
}

/**
 * Expense breakdown by category. Same component on Dashboard and Reports;
 * `mode` picks circle or bars (see ChartModeSwitch).
 */
export function CategoryBreakdown({
  breakdown,
  emptyText,
  onPressCategory,
  mode = "circle",
  limit = 4,
}: {
  breakdown: Record<string, number>;
  emptyText: string;
  onPressCategory?: (category: string) => void;
  mode?: ChartMode;
  limit?: number;
}) {
  const segments = toSegments(breakdown, limit);
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const pct = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);

  const pressable = (name: string) => !!onPressCategory && name !== OTHER_LABEL;

  return (
    <View className="bg-appSurface rounded-2xl p-4 border border-appBorder">
      {segments.length === 0 ? (
        <Text className="text-[13px] text-appText-muted">{emptyText}</Text>
      ) : mode === "circle" ? (
        <View className="flex-row items-center gap-4">
          <DonutChart
            data={segments}
            centerLabel={formatCurrency(total)}
            centerSubLabel="spent"
          />
          <View className="flex-1">
            {segments.map((seg) => (
              <TouchableOpacity
                key={seg.name}
                className="flex-row items-center gap-2 min-h-[44px]"
                disabled={!pressable(seg.name)}
                onPress={() => onPressCategory?.(seg.name)}
              >
                <View
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: seg.color }}
                />
                <Text
                  className="flex-1 text-[13px] text-appText-secondary"
                  numberOfLines={1}
                >
                  {seg.name}
                </Text>
                <View className="items-end">
                  <Text className="text-[13px] font-semibold text-appText">
                    {formatCurrency(seg.value)}
                  </Text>
                  <Text className="text-[10px] text-appText-muted">
                    {pct(seg.value)}%
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <Histogram
          segments={segments}
          pct={pct}
          pressable={pressable}
          onPressCategory={onPressCategory}
        />
      )}
    </View>
  );
}

const HISTOGRAM_HEIGHT = 150;

/** Vertical column per category, tallest = biggest spend. */
function Histogram({
  segments,
  pct,
  pressable,
  onPressCategory,
}: {
  segments: Segment[];
  pct: (v: number) => number;
  pressable: (name: string) => boolean;
  onPressCategory?: (category: string) => void;
}) {
  const max = Math.max(...segments.map((s) => s.value), 0);
  return (
    <View>
      {/* columns */}
      <View
        className="flex-row items-end"
        style={{ height: HISTOGRAM_HEIGHT + 34, gap: 10 }}
      >
        {segments.map((seg) => {
          const h = max > 0 ? (seg.value / max) * HISTOGRAM_HEIGHT : 0;
          return (
            <TouchableOpacity
              key={seg.name}
              className="flex-1 items-center justify-end h-full"
              disabled={!pressable(seg.name)}
              onPress={() => onPressCategory?.(seg.name)}
              activeOpacity={0.7}
            >
              <Text
                className="text-[11px] font-semibold text-appText mb-0.5"
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatCurrency(seg.value)}
              </Text>
              <Text className="text-[10px] text-appText-muted mb-1">
                {pct(seg.value)}%
              </Text>
              <View
                style={{
                  width: "100%",
                  maxWidth: 48,
                  height: Math.max(h, 4),
                  backgroundColor: seg.color,
                  borderTopLeftRadius: 8,
                  borderTopRightRadius: 8,
                }}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* baseline + labels */}
      <View className="h-px bg-appBorder-light" />
      <View className="flex-row mt-2" style={{ gap: 10 }}>
        {segments.map((seg) => (
          <View key={seg.name} className="flex-1 items-center gap-1">
            {seg.name === OTHER_LABEL ? (
              <View
                className="w-7 h-7 rounded-full"
                style={{ backgroundColor: `${Colors.textMuted}26` }}
              />
            ) : (
              <CategoryIcon category={seg.name} size={28} />
            )}
            <Text
              className="text-[11px] text-appText-secondary text-center"
              numberOfLines={1}
            >
              {seg.name}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Small circle / bars toggle, meant for a section header. */
export function ChartModeSwitch({
  mode,
  onChange,
}: {
  mode: ChartMode;
  onChange: (mode: ChartMode) => void;
}) {
  return (
    <View className="flex-row bg-appSurface rounded-lg p-0.5 border border-appBorder">
      {(
        [
          { key: "circle", Icon: PieChart },
          { key: "bars", Icon: BarChart3 },
        ] as const
      ).map(({ key, Icon }) => (
        <TouchableOpacity
          key={key}
          className={`w-11 h-10 items-center justify-center rounded-md ${mode === key ? "bg-appSurface-highlight" : ""}`}
          onPress={() => onChange(key)}
          hitSlop={4}
        >
          <Icon
            size={16}
            color={mode === key ? Colors.primaryLight : Colors.textMuted}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}
