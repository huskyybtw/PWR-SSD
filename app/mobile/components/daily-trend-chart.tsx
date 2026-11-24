import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Colors } from "@/constants/colors";
import {
  formatCurrency,
  formatMonthYear,
  formatShortDate,
  parseLocalDate,
} from "@/shared/utils";

type Point = { date: string; expense: number };
type Bucket = { key: string; label: string; tick: string; value: number };

const CHART_HEIGHT = 140;
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Daily bars up to ~2 months, monthly bars for longer ranges. */
function toBuckets(points: Point[]): { buckets: Bucket[]; unit: "day" | "month" } {
  if (points.length <= 62) {
    return {
      unit: "day",
      buckets: points.map((p) => ({
        key: p.date,
        label: formatShortDate(p.date),
        tick: String(parseLocalDate(p.date).getDate()),
        value: p.expense,
      })),
    };
  }
  const byMonth = new Map<string, number>();
  for (const p of points) {
    const k = p.date.slice(0, 7);
    byMonth.set(k, (byMonth.get(k) ?? 0) + p.expense);
  }
  return {
    unit: "month",
    buckets: [...byMonth.entries()].map(([k, value]) => ({
      key: k,
      label: formatMonthYear(`${k}-01`),
      tick: MONTHS_SHORT[Number(k.slice(5, 7)) - 1],
      value,
    })),
  };
}

export function DailyTrendChart({ points }: { points: Point[] }) {
  const { buckets, unit } = useMemo(() => toBuckets(points), [points]);
  const [selected, setSelected] = useState<string | null>(null);

  const max = Math.max(...buckets.map((b) => b.value), 0);
  const total = buckets.reduce((s, b) => s + b.value, 0);
  const activeCount = buckets.filter((b) => b.value > 0).length;
  const peak = buckets.reduce<Bucket | null>(
    (best, b) => (b.value > (best?.value ?? 0) ? b : best),
    null,
  );
  const selectedBucket = buckets.find((b) => b.key === selected) ?? null;

  // Show roughly 6 tick labels, always including first and last.
  const tickEvery = Math.max(1, Math.ceil(buckets.length / 6));

  if (total === 0) {
    return (
      <Text className="text-[13px] text-appText-muted text-center py-6">
        No spending in this period.
      </Text>
    );
  }

  return (
    <View>
      {/* Summary / selected value */}
      <View className="flex-row justify-between items-end mb-4">
        <View>
          <Text className="text-[11px] text-appText-muted uppercase tracking-wider">
            {selectedBucket ? selectedBucket.label : "Total spent"}
          </Text>
          <Text className="text-[20px] font-extrabold text-appText mt-0.5">
            {formatCurrency(selectedBucket ? selectedBucket.value : total)}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-[11px] text-appText-muted">
            Avg / {unit === "day" ? "day" : "month"}
          </Text>
          <Text className="text-[13px] font-semibold text-appText-secondary">
            {formatCurrency(total / Math.max(1, buckets.length))}
          </Text>
          {peak && (
            <Text className="text-[11px] text-appText-muted mt-0.5">
              Peak: {peak.label}
            </Text>
          )}
        </View>
      </View>

      {/* Bars */}
      <View style={{ height: CHART_HEIGHT }}>
        {/* guide lines: max and half */}
        {[1, 0.5].map((f) => (
          <View
            key={f}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: CHART_HEIGHT * (1 - f),
              borderTopWidth: 1,
              borderColor: Colors.border,
              borderStyle: "dashed",
            }}
          />
        ))}
        <Text
          className="text-[9px] text-appText-muted"
          style={{ position: "absolute", right: 0, top: -12 }}
        >
          {formatCurrency(max)}
        </Text>

        <View className="flex-1 flex-row items-end" style={{ gap: 2 }}>
          {buckets.map((b) => {
            const h = max > 0 ? (b.value / max) * CHART_HEIGHT : 0;
            const isSelected = b.key === selected;
            return (
              <Pressable
                key={b.key}
                className="flex-1 h-full justify-end"
                onPress={() => setSelected(isSelected ? null : b.key)}
                hitSlop={4}
              >
                {b.value > 0 && (
                  <View
                    style={{
                      height: Math.max(h, 3),
                      borderTopLeftRadius: 3,
                      borderTopRightRadius: 3,
                      backgroundColor:
                        selected && !isSelected
                          ? Colors.accentMuted
                          : Colors.accent,
                    }}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Baseline + ticks */}
      <View className="h-px bg-appBorder-light" />
      <View className="flex-row mt-1.5" style={{ gap: 2 }}>
        {buckets.map((b, i) => (
          <View key={b.key} className="flex-1 items-center">
            {(i % tickEvery === 0 || i === buckets.length - 1) && (
              <Text
                className="text-[10px] text-appText-muted"
                numberOfLines={1}
                style={{ width: 32, textAlign: "center" }}
              >
                {b.tick}
              </Text>
            )}
          </View>
        ))}
      </View>

      <Text className="text-[11px] text-appText-muted mt-3">
        {activeCount} {unit === "day" ? "day" : "month"}
        {activeCount === 1 ? "" : "s"} with spending · tap a bar for details
      </Text>
    </View>
  );
}
