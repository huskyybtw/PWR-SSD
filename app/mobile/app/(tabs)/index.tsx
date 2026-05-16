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
      <View
        className="relative items-center justify-center"
        style={{ width: size, height: size }}
      >
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
          className="absolute bg-appSurface items-center justify-center"
          style={[
            {
              width: size - strokeWidth * 2.5,
              height: size - strokeWidth * 2.5,
              borderRadius: (size - strokeWidth * 2.5) / 2,
            },
          ]}
        >
          <Text className="text-xl font-extrabold text-appText">
            {data.length}
          </Text>
          <Text className="text-[10px] text-appText-muted">cats</Text>
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
    <ScrollView
      className="flex-1 bg-appBackground"
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[Colors.surfaceElevated, Colors.background]}
        className="px-5 pt-4 pb-6"
      >
        <View className="flex-row justify-between items-start mb-5">
          <View>
            <Text className="text-2xl font-extrabold text-appText">
              Dashboard
            </Text>
            <Text className="text-sm text-appText-muted mt-0.5">
              Your financial overview
            </Text>
          </View>
          <NotificationBell />
        </View>

        <View className="rounded-[20px] overflow-hidden">
          <LinearGradient
            colors={[Colors.primaryDark, Colors.primary]}
            className="p-5 rounded-[20px]"
          >
            <View className="flex-row justify-around mb-4">
              <View className="items-center">
                <Text className="text-xs text-[rgba(255,255,255,0.7)] mb-1">
                  Income
                </Text>
                <Text className="text-[22px] font-bold text-white">
                  {formatCurrency(totalIncome)}
                </Text>
              </View>
              <View className="w-px bg-[rgba(255,255,255,0.2)]" />
              <View className="items-center">
                <Text className="text-xs text-[rgba(255,255,255,0.7)] mb-1">
                  Expenses
                </Text>
                <Text className="text-[22px] font-bold text-white">
                  {formatCurrency(totalExpenses)}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center justify-center gap-1.5 pt-3 border-t border-[rgba(255,255,255,0.15)]">
              <Wallet size={16} color={Colors.primaryLight} />
              <Text className="text-[13px] text-[rgba(255,255,255,0.8)]">
                Net Balance
              </Text>
              <Text
                className="text-base font-bold"
                style={[
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
        <View className="mt-6 px-5">
          <Text className="text-lg font-bold text-appText mb-3">Alerts</Text>
          {recentAlerts.map((alert) => (
            <TouchableOpacity
              key={alert.id}
              className={[
                "flex-row items-start gap-2.5 p-3.5 rounded-xl mb-2",
                alert.type === "budget_exceeded"
                  ? "bg-appDanger-muted border-l-4 border-appDanger"
                  : alert.type === "budget_near_limit"
                    ? "bg-appAccent-muted border-l-4 border-appAccent"
                    : "bg-appPrimary-muted border-l-4 border-appPrimary",
              ].join(" ")}
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
              <View className="flex-1">
                <Text className="text-sm font-bold text-appText">
                  {alert.title}
                </Text>
                <Text className="text-xs text-appText-secondary mt-0.5">
                  {alert.message}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View className="mt-6 px-5">
        <Text className="text-lg font-bold text-appText mb-3">
          Spending by Category
        </Text>
        <View className="flex-row items-center bg-appSurface rounded-2xl p-4 gap-4">
          <DonutChart data={chartData} size={140} strokeWidth={16} />
          <View className="flex-1 gap-2">
            {chartData.map((item) => (
              <View key={item.name} className="flex-row items-center gap-2">
                <View
                  className="w-2.5 h-2.5 rounded-full"
                  style={[{ backgroundColor: item.color }]}
                />
                <Text className="text-[13px] text-appText-secondary flex-1">
                  {item.name}
                </Text>
                <Text className="text-[13px] font-semibold text-appText">
                  {formatCurrency(item.value)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {exceededBudgets.length > 0 && (
        <View className="mt-6 px-5">
          <Text className="text-lg font-bold text-appText mb-3">
            Budget Warnings
          </Text>
          {exceededBudgets.map((status) => (
            <View
              key={status.budget.id}
              className="bg-appSurface rounded-xl p-3.5 mb-2"
            >
              <View className="flex-row items-center gap-2 mb-2.5">
                <TrendingUp size={16} color={Colors.danger} />
                <Text className="text-sm font-semibold text-appText flex-1">
                  {status.budget.name}
                </Text>
                <Text className="text-[13px] text-appDanger-light font-semibold">
                  {formatCurrency(status.spent)} /{" "}
                  {formatCurrency(status.budget.amount)}
                </Text>
              </View>
              <View className="h-2 bg-appSurface-highlight rounded-full overflow-hidden">
                <View
                  className="h-full rounded-full"
                  style={[
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

      <View className="mt-6 px-5">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-lg font-bold text-appText">Savings Goals</Text>
          <PiggyBank size={18} color={Colors.primary} />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingRight: 20 }}
        >
          {goalProgresses.map((progress) => (
            <View
              key={progress.goal.id}
              className="w-[55vw] bg-appSurface rounded-2xl p-4"
            >
              <Text className="text-sm font-bold text-appText">
                {progress.goal.name}
              </Text>
              <Text className="text-xs text-appText-secondary mt-1">
                {formatCurrency(progress.goal.currentAmount)} /{" "}
                {formatCurrency(progress.goal.targetAmount)}
              </Text>
              <View className="h-1.5 bg-appSurface-highlight rounded mt-3 overflow-hidden">
                <View
                  className="h-full rounded"
                  style={[
                    {
                      width: `${progress.percentage}%`,
                      backgroundColor: progress.isAchieved
                        ? Colors.primary
                        : Colors.accent,
                    },
                  ]}
                />
              </View>
              <Text className="text-[11px] text-appText-muted mt-2">
                {progress.percentage.toFixed(0)}% • {progress.daysRemaining}{" "}
                days left
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View className="mt-6 px-5">
        <Text className="text-lg font-bold text-appText mb-3">
          Recent Transactions
        </Text>
        {recentTransactions.map((tx) => (
          <View
            key={tx.id}
            className="flex-row items-center gap-3 bg-appSurface rounded-xl p-3.5 mb-2"
          >
            <View
              className="w-[38px] h-[38px] rounded-full items-center justify-center"
              style={[
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
            <View className="flex-1">
              <Text className="text-sm font-semibold text-appText">
                {tx.description}
              </Text>
              <Text className="text-xs text-appText-muted mt-0.5">
                {tx.category} • {formatShortDate(tx.date)}
              </Text>
            </View>
            <Text
              className="text-sm font-bold mr-1"
              style={[
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

