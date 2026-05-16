import { BarChart3,
  Calendar,
  ChevronDown,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  Dimensions,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors } from "@/constants/colors";
import { NotificationBell } from "@/components/notification-bell";
import { useFinance } from "@/lib/finance-context";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
} from "date-fns";

const { width } = Dimensions.get("window");

const DATE_RANGES = [
  { key: "daily" as const, label: "Today", days: 1 },
  { key: "weekly" as const, label: "This Week", days: 7 },
  { key: "monthly" as const, label: "This Month", days: 30 },
  { key: "yearly" as const, label: "This Year", days: 365 },
];

function BarChart({
  data,
  maxValue,
  barColor,
}: {
  data: { label: string; value: number }[];
  maxValue: number;
  barColor: string;
}) {
  return (
    <View className="mb-3">
      <View className="flex-row items-end justify-around h-[150px] gap-1">
        {data.map((item, i) => {
          const height = maxValue > 0 ? (item.value / maxValue) * 120 : 0;
          return (
            <View key={i} className="flex-1 items-center">
              <View className="w-[70%] h-[120px] justify-end bg-appSurface-highlight rounded-md overflow-hidden">
                <View
                  className="w-full rounded-md min-h-[4px]" style={{ height: Math.max(height, 4), backgroundColor: barColor }}
                />
              </View>
              <Text className="text-[9px] text-appText-muted mt-1.5 text-center" numberOfLines={1}>
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function ReportsScreen() {
  const { getReportData } = useFinance();
  const [range, setRange] =
    useState<(typeof DATE_RANGES)[number]["key"]>("monthly");
  const [showRangePicker, setShowRangePicker] = useState(false);

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (range) {
      case "daily":
        return {
          start: format(now, "yyyy-MM-dd"),
          end: format(now, "yyyy-MM-dd"),
          label: "Today",
        };
      case "weekly":
        return {
          start: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
          end: format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
          label: "This Week",
        };
      case "monthly":
        return {
          start: format(startOfMonth(now), "yyyy-MM-dd"),
          end: format(endOfMonth(now), "yyyy-MM-dd"),
          label: "This Month",
        };
      case "yearly":
        return {
          start: format(startOfYear(now), "yyyy-MM-dd"),
          end: format(endOfYear(now), "yyyy-MM-dd"),
          label: "This Year",
        };
      default:
        return {
          start: format(startOfMonth(now), "yyyy-MM-dd"),
          end: format(endOfMonth(now), "yyyy-MM-dd"),
          label: "This Month",
        };
    }
  }, [range]);

  const report = useMemo(
    () => getReportData(dateRange.start, dateRange.end),
    [getReportData, dateRange.start, dateRange.end],
  );

  const categoryChartData = useMemo(() => {
    return Object.entries(report.categoryBreakdown)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [report.categoryBreakdown]);

  const dailyChartData = useMemo(() => {
    return report.dailyTrend.map((d) => ({
      label: formatShortDate(d.date),
      value: d.expense,
    }));
  }, [report.dailyTrend]);

  const maxCategory = useMemo(
    () => Math.max(...categoryChartData.map((d) => d.value), 1),
    [categoryChartData],
  );

  const maxDaily = useMemo(
    () => Math.max(...dailyChartData.map((d) => d.value), 1),
    [dailyChartData],
  );

  return (
    <ScrollView className="flex-1 bg-appBackground" showsVerticalScrollIndicator={false}>
      <View className="flex-row justify-between items-center px-5 pt-4 pb-3">
        <Text className="text-[28px] font-[800] text-appText">Reports</Text>
        <View className="flex-row items-center gap-[10px]">
          <TouchableOpacity
            className="flex-row items-center gap-[6px] bg-appSurface px-[14px] py-[8px] rounded-[20px] border border-appBorder"
            onPress={() => setShowRangePicker(true)}
          >
            <Calendar size={14} color={Colors.primary} />
            <Text className="text-[13px] font-[600] text-appPrimary">{dateRange.label}</Text>
            <ChevronDown size={14} color={Colors.primary} />
          </TouchableOpacity>
          <NotificationBell />
        </View>
      </View>

      <View className="flex-row gap-3 px-5 mb-3">
        <View
          className="flex-1 rounded-2xl p-4 gap-2 bg-appPrimary-muted"
        >
          <TrendingUp size={20} color={Colors.primary} />
          <Text className="text-[12px] text-appText-muted uppercase tracking-[0.5px]">Income</Text>
          <Text className="text-[20px] font-[800] text-appPrimary">
            {formatCurrency(report.totalIncome)}
          </Text>
        </View>
        <View
          className="flex-1 rounded-2xl p-4 gap-2 bg-appDanger-muted"
        >
          <TrendingDown size={20} color={Colors.danger} />
          <Text className="text-[12px] text-appText-muted uppercase tracking-[0.5px]">Expenses</Text>
          <Text className="text-[20px] font-[800] text-appDanger-light">
            {formatCurrency(report.totalExpenses)}
          </Text>
        </View>
      </View>

      <View className="mx-5 bg-appSurface rounded-2xl p-4 flex-row justify-between items-center mb-6">
        <Text className="text-[14px] font-[600] text-appText-secondary">Net Balance</Text>
        <Text
          className={`text-[24px] font-[800] ${report.netBalance >= 0 ? "text-appPrimary" : "text-appDanger-light"}`}
        >
          {formatCurrency(report.netBalance)}
        </Text>
      </View>

      {categoryChartData.length > 0 && (
        <View className="mb-6 px-5">
          <View className="flex-row items-center gap-2 mb-3">
            <BarChart3 size={18} color={Colors.primary} />
            <Text className="text-[17px] font-[700] text-appText">Spending by Category</Text>
          </View>
          <View className="bg-appSurface rounded-2xl p-4">
            <BarChart
              data={categoryChartData}
              maxValue={maxCategory}
              barColor={Colors.primary}
            />
            <View className="gap-2 pt-3 border-t border-appBorder">
              {categoryChartData.map((item, i) => (
                <View key={i} className="flex-row items-center gap-[10px]">
                  <View
                    className="w-[10px] h-[10px] rounded-full" style={{ backgroundColor: Colors.chartColors[i % Colors.chartColors.length] }}
                  />
                  <Text className="flex-1 text-[13px] text-appText-secondary">{item.label}</Text>
                  <Text className="text-[13px] font-[600] text-appText">
                    {formatCurrency(item.value)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {dailyChartData.length > 0 && dailyChartData.some((d) => d.value > 0) && (
        <View className="mb-6 px-5">
          <View className="flex-row items-center gap-2 mb-3">
            <BarChart3 size={18} color={Colors.accent} />
            <Text className="text-[17px] font-[700] text-appText">Daily Spending Trend</Text>
          </View>
          <View className="bg-appSurface rounded-2xl p-4">
            <BarChart
              data={dailyChartData}
              maxValue={maxDaily}
              barColor={Colors.accent}
            />
          </View>
        </View>
      )}

      {Object.keys(report.categoryBreakdown).length === 0 && (
        <View className="items-center py-15">
          <Text className="text-appText text-[16px] font-[600]">No data for this period</Text>
          <Text className="text-appText-muted text-[13px] mt-1">Add transactions to see reports</Text>
        </View>
      )}

      <View style={{ height: 40 }} />

      <Modal visible={showRangePicker} animationType="fade" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-appSurface-elevated rounded-t-3xl px-5 pt-5 pb-10">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-[20px] font-[700] text-appText">Select Period</Text>
              <TouchableOpacity onPress={() => setShowRangePicker(false)}>
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            {DATE_RANGES.map((r) => (
              <TouchableOpacity
                key={r.key}
                className={`py-4 border-b border-appBorder ${range === r.key ? "bg-appPrimary-muted -mx-5 px-5" : ""}`}
                onPress={() => {
                  setRange(r.key);
                  setShowRangePicker(false);
                }}
              >
                <Text
                  className={`text-[16px] ${range === r.key ? "text-appPrimary font-[700]" : "text-appText"}`}
                >
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

