import { LinearGradient } from "expo-linear-gradient";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  PiggyBank,
  TrendingUp,
  Wallet,
} from "lucide-react-native";
import React from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors } from "@/constants/colors";
import { NotificationBell } from "@/components/notification-bell";
import { useFinance } from "@/lib/finance-context";
import { formatCurrency, formatDate, formatShortDate } from "@/lib/utils";

const { width } = Dimensions.get("window");

function DonutChart({
  data,
  size = 120,
  strokeWidth = 14,
}: {
  data: { value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  let currentAngle = -Math.PI / 2;

  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.donutContainer, { width: size, height: size }]}>
        {data.map((segment, i) => {
          if (total === 0) return null;
          const angle = (segment.value / total) * Math.PI * 2;
          const x1 = center + radius * Math.cos(currentAngle);
          const y1 = center + radius * Math.sin(currentAngle);
          const x2 = center + radius * Math.cos(currentAngle + angle);
          const y2 = center + radius * Math.sin(currentAngle + angle);
          const largeArc = angle > Math.PI ? 1 : 0;
          const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
          currentAngle += angle;

          return (
            <View
              key={i}
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: size / 2,
                  overflow: "hidden",
                },
              ]}
            >
              <View
                style={[
                  {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    borderWidth: strokeWidth,
                    borderColor: segment.color,
                    position: "absolute",
                    transform: [
                      {
                        rotate: `${(currentAngle - angle) * (180 / Math.PI)}deg`,
                      },
                    ],
                    opacity: 0.9,
                  },
                ]}
              />
            </View>
          );
        })}
        <View
          style={[
            styles.donutCenter,
            {
              width: size - strokeWidth * 2.5,
              height: size - strokeWidth * 2.5,
              borderRadius: (size - strokeWidth * 2.5) / 2,
            },
          ]}
        >
          <Text style={styles.donutTotal}>{data.length}</Text>
          <Text style={styles.donutLabel}>cats</Text>
        </View>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const {
    transactions,
    getBudgetStatuses,
    getGoalProgresses,
    alerts,
    unreadAlertsCount,
    markAlertRead,
  } = useFinance();

  const currentMonthTxs = transactions.filter((t) => {
    const d = new Date(t.date);
    const now = new Date();
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  });

  const totalIncome = currentMonthTxs
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpenses = currentMonthTxs
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const netBalance = totalIncome - totalExpenses;

  const categoryBreakdown: Record<string, number> = {};
  for (const t of currentMonthTxs.filter((t) => t.type === "expense")) {
    categoryBreakdown[t.category] =
      (categoryBreakdown[t.category] || 0) + t.amount;
  }

  const chartData = Object.entries(categoryBreakdown)
    .map(([name, value], i) => ({
      name,
      value,
      color: Colors.chartColors[i % Colors.chartColors.length],
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const budgetStatuses = getBudgetStatuses();
  const exceededBudgets = budgetStatuses.filter((b) => b.isExceeded);
  const goalProgresses = getGoalProgresses();
  const recentTransactions = transactions.slice(0, 5);
  const recentAlerts = alerts.filter((a) => !a.read).slice(0, 3);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={[Colors.surfaceElevated, Colors.background]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Dashboard</Text>
            <Text style={styles.subGreeting}>Your financial overview</Text>
          </View>
          <NotificationBell />
        </View>

        <View style={styles.balanceCard}>
          <LinearGradient
            colors={[Colors.primaryDark, Colors.primary]}
            style={styles.balanceGradient}
          >
            <View style={styles.balanceRow}>
              <View style={styles.balanceItem}>
                <Text style={styles.balanceLabel}>Income</Text>
                <Text style={styles.balanceValue}>
                  {formatCurrency(totalIncome)}
                </Text>
              </View>
              <View style={styles.balanceDivider} />
              <View style={styles.balanceItem}>
                <Text style={styles.balanceLabel}>Expenses</Text>
                <Text style={styles.balanceValue}>
                  {formatCurrency(totalExpenses)}
                </Text>
              </View>
            </View>
            <View style={styles.netRow}>
              <Wallet size={16} color={Colors.primaryLight} />
              <Text style={styles.netLabel}>Net Balance</Text>
              <Text
                style={[
                  styles.netValue,
                  {
                    color:
                      netBalance >= 0
                        ? Colors.primaryLight
                        : Colors.dangerLight,
                  },
                ]}
              >
                {formatCurrency(netBalance)}
              </Text>
            </View>
          </LinearGradient>
        </View>
      </LinearGradient>

      {recentAlerts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alerts</Text>
          {recentAlerts.map((alert) => (
            <TouchableOpacity
              key={alert.id}
              style={[
                styles.alertCard,
                alert.type === "budget_exceeded"
                  ? styles.alertDanger
                  : alert.type === "budget_near_limit"
                    ? styles.alertWarning
                    : styles.alertSuccess,
              ]}
              onPress={() => markAlertRead(alert.id)}
            >
              <AlertTriangle
                size={18}
                color={
                  alert.type === "budget_exceeded"
                    ? Colors.danger
                    : alert.type === "budget_near_limit"
                      ? Colors.accent
                      : Colors.primary
                }
              />
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>{alert.title}</Text>
                <Text style={styles.alertMessage}>{alert.message}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Spending by Category</Text>
        <View style={styles.chartCard}>
          <DonutChart data={chartData} size={140} strokeWidth={16} />
          <View style={styles.legend}>
            {chartData.map((item) => (
              <View key={item.name} style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: item.color }]}
                />
                <Text style={styles.legendName}>{item.name}</Text>
                <Text style={styles.legendValue}>
                  {formatCurrency(item.value)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {exceededBudgets.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Budget Warnings</Text>
          {exceededBudgets.map((status) => (
            <View key={status.budget.id} style={styles.warningCard}>
              <View style={styles.warningHeader}>
                <TrendingUp size={16} color={Colors.danger} />
                <Text style={styles.warningName}>{status.budget.name}</Text>
                <Text style={styles.warningAmount}>
                  {formatCurrency(status.spent)} /{" "}
                  {formatCurrency(status.budget.amount)}
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, status.percentage)}%`,
                      backgroundColor: Colors.danger,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Savings Goals</Text>
          <PiggyBank size={18} color={Colors.primary} />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.goalsScroll}
        >
          {goalProgresses.map((progress) => (
            <View key={progress.goal.id} style={styles.goalCard}>
              <Text style={styles.goalName}>{progress.goal.name}</Text>
              <Text style={styles.goalAmount}>
                {formatCurrency(progress.goal.currentAmount)} /{" "}
                {formatCurrency(progress.goal.targetAmount)}
              </Text>
              <View style={styles.goalProgressBg}>
                <View
                  style={[
                    styles.goalProgressFill,
                    {
                      width: `${progress.percentage}%`,
                      backgroundColor: progress.isAchieved
                        ? Colors.primary
                        : Colors.accent,
                    },
                  ]}
                />
              </View>
              <Text style={styles.goalMeta}>
                {progress.percentage.toFixed(0)}% • {progress.daysRemaining}{" "}
                days left
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {recentTransactions.map((tx) => (
          <View key={tx.id} style={styles.transactionItem}>
            <View
              style={[
                styles.txIcon,
                {
                  backgroundColor:
                    tx.type === "income"
                      ? Colors.primaryMuted
                      : Colors.surfaceHighlight,
                },
              ]}
            >
              {tx.type === "income" ? (
                <ArrowDownLeft size={16} color={Colors.primary} />
              ) : (
                <ArrowUpRight size={16} color={Colors.dangerLight} />
              )}
            </View>
            <View style={styles.txDetails}>
              <Text style={styles.txDesc}>{tx.description}</Text>
              <Text style={styles.txMeta}>
                {tx.category} • {formatShortDate(tx.date)}
              </Text>
            </View>
            <Text
              style={[
                styles.txAmount,
                { color: tx.type === "income" ? Colors.primary : Colors.text },
              ]}
            >
              {tx.type === "income" ? "+" : "-"}
              {formatCurrency(tx.amount)}
            </Text>
            <ChevronRight size={14} color={Colors.textMuted} />
          </View>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.text,
  },
  subGreeting: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 2,
  },
  balanceCard: {
    borderRadius: 20,
    overflow: "hidden",
  },
  balanceGradient: {
    padding: 20,
    borderRadius: 20,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  balanceItem: {
    alignItems: "center",
  },
  balanceLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
  },
  balanceDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  netRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
  },
  netLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },
  netValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 12,
  },
  chartCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  donutContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  donutCenter: {
    position: "absolute",
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  donutTotal: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.text,
  },
  donutLabel: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  legend: {
    flex: 1,
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendName: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  legendValue: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  alertDanger: {
    backgroundColor: Colors.dangerMuted,
    borderLeftWidth: 3,
    borderLeftColor: Colors.danger,
  },
  alertWarning: {
    backgroundColor: Colors.accentMuted,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  alertSuccess: {
    backgroundColor: Colors.primaryMuted,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
  },
  alertMessage: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  warningCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  warningName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    flex: 1,
  },
  warningAmount: {
    fontSize: 13,
    color: Colors.dangerLight,
    fontWeight: "600",
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.surfaceHighlight,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  goalsScroll: {
    gap: 12,
    paddingRight: 20,
  },
  goalCard: {
    width: width * 0.55,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  goalName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
  },
  goalAmount: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  goalProgressBg: {
    height: 6,
    backgroundColor: Colors.surfaceHighlight,
    borderRadius: 3,
    marginTop: 12,
    overflow: "hidden",
  },
  goalProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  goalMeta: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 8,
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  txIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  txDetails: {
    flex: 1,
  },
  txDesc: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  txMeta: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: "700",
    marginRight: 4,
  },
});
