import {
  BarChart3,
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
  StyleSheet,
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
    <View style={styles.chartContainer}>
      <View style={styles.barsRow}>
        {data.map((item, i) => {
          const height = maxValue > 0 ? (item.value / maxValue) * 120 : 0;
          return (
            <View key={i} style={styles.barWrapper}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: Math.max(height, 4),
                      backgroundColor: barColor,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barLabel} numberOfLines={1}>
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Reports</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.rangeBtn}
            onPress={() => setShowRangePicker(true)}
          >
            <Calendar size={14} color={Colors.primary} />
            <Text style={styles.rangeText}>{dateRange.label}</Text>
            <ChevronDown size={14} color={Colors.primary} />
          </TouchableOpacity>
          <NotificationBell />
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View
          style={[styles.statCard, { backgroundColor: Colors.primaryMuted }]}
        >
          <TrendingUp size={20} color={Colors.primary} />
          <Text style={styles.statLabel}>Income</Text>
          <Text style={[styles.statValue, { color: Colors.primary }]}>
            {formatCurrency(report.totalIncome)}
          </Text>
        </View>
        <View
          style={[styles.statCard, { backgroundColor: Colors.dangerMuted }]}
        >
          <TrendingDown size={20} color={Colors.danger} />
          <Text style={styles.statLabel}>Expenses</Text>
          <Text style={[styles.statValue, { color: Colors.dangerLight }]}>
            {formatCurrency(report.totalExpenses)}
          </Text>
        </View>
      </View>

      <View style={styles.netCard}>
        <Text style={styles.netLabel}>Net Balance</Text>
        <Text
          style={[
            styles.netValue,
            {
              color:
                report.netBalance >= 0 ? Colors.primary : Colors.dangerLight,
            },
          ]}
        >
          {formatCurrency(report.netBalance)}
        </Text>
      </View>

      {categoryChartData.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <BarChart3 size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Spending by Category</Text>
          </View>
          <View style={styles.chartCard}>
            <BarChart
              data={categoryChartData}
              maxValue={maxCategory}
              barColor={Colors.primary}
            />
            <View style={styles.categoryLegend}>
              {categoryChartData.map((item, i) => (
                <View key={i} style={styles.legendRow}>
                  <View
                    style={[
                      styles.legendDot,
                      {
                        backgroundColor:
                          Colors.chartColors[i % Colors.chartColors.length],
                      },
                    ]}
                  />
                  <Text style={styles.legendName}>{item.label}</Text>
                  <Text style={styles.legendValue}>
                    {formatCurrency(item.value)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {dailyChartData.length > 0 && dailyChartData.some((d) => d.value > 0) && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <BarChart3 size={18} color={Colors.accent} />
            <Text style={styles.sectionTitle}>Daily Spending Trend</Text>
          </View>
          <View style={styles.chartCard}>
            <BarChart
              data={dailyChartData}
              maxValue={maxDaily}
              barColor={Colors.accent}
            />
          </View>
        </View>
      )}

      {Object.keys(report.categoryBreakdown).length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No data for this period</Text>
          <Text style={styles.emptySub}>Add transactions to see reports</Text>
        </View>
      )}

      <View style={{ height: 40 }} />

      <Modal visible={showRangePicker} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Period</Text>
              <TouchableOpacity onPress={() => setShowRangePicker(false)}>
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            {DATE_RANGES.map((r) => (
              <TouchableOpacity
                key={r.key}
                style={[
                  styles.rangeOption,
                  range === r.key && styles.rangeOptionActive,
                ]}
                onPress={() => {
                  setRange(r.key);
                  setShowRangePicker(false);
                }}
              >
                <Text
                  style={[
                    styles.rangeOptionText,
                    range === r.key && styles.rangeOptionTextActive,
                  ]}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.text,
  },
  rangeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rangeText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  netCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  netLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  netValue: {
    fontSize: 24,
    fontWeight: "800",
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text,
  },
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  chartContainer: {
    marginBottom: 12,
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    height: 150,
    gap: 4,
  },
  barWrapper: {
    flex: 1,
    alignItems: "center",
  },
  barTrack: {
    width: "70%",
    height: 120,
    justifyContent: "flex-end",
    backgroundColor: Colors.surfaceHighlight,
    borderRadius: 6,
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    borderRadius: 6,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    marginTop: 6,
    textAlign: "center",
  },
  categoryLegend: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendName: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  legendValue: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  emptySub: {
    color: Colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
  },
  rangeOption: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rangeOptionActive: {
    backgroundColor: Colors.primaryMuted,
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  rangeOptionText: {
    fontSize: 16,
    color: Colors.text,
  },
  rangeOptionTextActive: {
    color: Colors.primary,
    fontWeight: "700",
  },
});
