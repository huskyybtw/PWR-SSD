import { useLocalSearchParams } from "expo-router";
import { BarChart3, Calendar, ChevronDown, PieChart, X } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import {
  CategoryBreakdown,
  ChartMode,
  ChartModeSwitch,
} from "@/components/category-breakdown";
import { AppModal } from "@/components/app-modal";
import { DailyTrendChart } from "@/components/daily-trend-chart";
import { IncomeExpenseCards } from "@/components/income-expense-cards";
import { Colors } from "@/constants/colors";
import { useFinance } from "@/shared/finance-context";
import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";

type PresetKey = "daily" | "weekly" | "monthly" | "yearly";
type Range = { start: string; end: string; label: string };

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "daily", label: "Today" },
  { key: "weekly", label: "This Week" },
  { key: "monthly", label: "This Month" },
  { key: "yearly", label: "This Year" },
];

function presetRange(key: PresetKey): Range {
  const now = new Date();
  const d = (date: Date) => format(date, "yyyy-MM-dd");
  switch (key) {
    case "daily":
      return { start: d(now), end: d(now), label: "Today" };
    case "weekly":
      return {
        start: d(startOfWeek(now, { weekStartsOn: 1 })),
        end: d(endOfWeek(now, { weekStartsOn: 1 })),
        label: "This Week",
      };
    case "yearly":
      return { start: d(startOfYear(now)), end: d(endOfYear(now)), label: "This Year" };
    default:
      return { start: d(startOfMonth(now)), end: d(endOfMonth(now)), label: "This Month" };
  }
}

function SectionTitle({
  icon,
  title,
  right,
}: {
  icon: React.ReactNode;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center gap-2 mb-3">
      {icon}
      <Text className="flex-1 text-[17px] font-[700] text-appText">{title}</Text>
      {right}
    </View>
  );
}

export default function ReportsScreen() {
  const { getReportData } = useFinance();
  const [preset, setPreset] = useState<PresetKey>("monthly");
  // A specific period opened from the Dashboard (e.g. "October 2021").
  const [customRange, setCustomRange] = useState<Range | null>(null);
  const [showRangePicker, setShowRangePicker] = useState(false);
  const [chartMode, setChartMode] = useState<ChartMode>("circle");

  // /reports?from=2021-10-01&to=2021-10-31&label=October%202021&ts=123
  const params = useLocalSearchParams<{
    from?: string;
    to?: string;
    label?: string;
    ts?: string;
  }>();
  useEffect(() => {
    if (params.ts && params.from && params.to) {
      setCustomRange({
        start: params.from,
        end: params.to,
        label: params.label || `${params.from} – ${params.to}`,
      });
    }
  }, [params.ts, params.from, params.to, params.label]);

  const dateRange = useMemo(
    () => customRange ?? presetRange(preset),
    [customRange, preset],
  );

  const report = useMemo(
    () => getReportData(dateRange.start, dateRange.end),
    [getReportData, dateRange.start, dateRange.end],
  );

  const hasData = report.totalExpenses > 0 || report.totalIncome > 0;

  return (
    <ScrollView
      className="flex-1 bg-appBackground"
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-row justify-between items-center px-5 pt-4 pb-3">
        <Text className="text-[28px] font-[800] text-appText">Reports</Text>
        <TouchableOpacity
          className="flex-row items-center gap-[6px] bg-appSurface px-[14px] h-11 rounded-[22px] border border-appBorder"
          onPress={() => setShowRangePicker(true)}
        >
          <Calendar size={14} color={Colors.primary} />
          <Text className="text-[13px] font-[600] text-appPrimary">
            {dateRange.label}
          </Text>
          <ChevronDown size={14} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View className="px-5 mb-6">
        <IncomeExpenseCards
          income={report.totalIncome}
          expenses={report.totalExpenses}
        />
      </View>

      {report.totalExpenses > 0 && (
        <View className="mb-6 px-5">
          <SectionTitle
            icon={<PieChart size={18} color={Colors.primary} />}
            title="Spending by Category"
            right={<ChartModeSwitch mode={chartMode} onChange={setChartMode} />}
          />
          <CategoryBreakdown
            breakdown={report.categoryBreakdown}
            emptyText="No expenses in this period."
            mode={chartMode}
            limit={6}
          />
        </View>
      )}

      {report.totalExpenses > 0 && (
        <View className="mb-6 px-5">
          <SectionTitle
            icon={<BarChart3 size={18} color={Colors.accent} />}
            title="Spending Trend"
          />
          <View className="bg-appSurface rounded-2xl p-4 border border-appBorder">
            <DailyTrendChart points={report.dailyTrend} />
          </View>
        </View>
      )}

      {!hasData && (
        <View className="items-center py-16">
          <Text className="text-appText text-[16px] font-[600]">
            No data for {dateRange.label}
          </Text>
          <Text className="text-appText-muted text-[13px] mt-1">
            Pick another period or add transactions
          </Text>
        </View>
      )}

      <View style={{ height: 40 }} />

      <AppModal
        name="report_period"
        visible={showRangePicker}
        animationType="fade"
        transparent
        onRequestClose={() => setShowRangePicker(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-appSurface-elevated rounded-t-3xl px-5 pt-5 pb-10">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-[20px] font-[700] text-appText">
                Select Period
              </Text>
              <TouchableOpacity
                onPress={() => setShowRangePicker(false)}
                className="w-11 h-11 items-center justify-center -mr-2"
              >
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            {customRange && (
              <View className="py-4 border-b border-appBorder bg-appPrimary-muted -mx-5 px-5">
                <Text className="text-[16px] text-appPrimary font-[700]">
                  {customRange.label}
                </Text>
              </View>
            )}
            {PRESETS.map((r) => {
              const active = !customRange && preset === r.key;
              return (
                <TouchableOpacity
                  key={r.key}
                  className={`py-4 border-b border-appBorder ${active ? "bg-appPrimary-muted -mx-5 px-5" : ""}`}
                  onPress={() => {
                    setCustomRange(null);
                    setPreset(r.key);
                    setShowRangePicker(false);
                  }}
                >
                  <Text
                    className={`text-[16px] ${active ? "text-appPrimary font-[700]" : "text-appText"}`}
                  >
                    {r.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </AppModal>
    </ScrollView>
  );
}
