import { router } from "expo-router";
import {
  AlertTriangle,
  ChevronRight,
  PartyPopper,
  PiggyBank,
  Wallet,
  X,
} from "lucide-react-native";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { CategoryBreakdown } from "@/components/category-breakdown";
import { CategoryIcon } from "@/components/category-icon";
import { IncomeExpenseCards } from "@/components/income-expense-cards";
import { TransactionRow } from "@/components/transaction-row";
import { Colors } from "@/constants/colors";
import { useFinance } from "@/shared/finance-context";
import { AlertMessage } from "@/shared/types/finance";
import {
  formatCurrency,
  formatMonthYear,
  monthKey,
  toIsoDate,
} from "@/shared/utils";

// ---------- small building blocks ----------

function SectionHeader({
  title,
  actionLabel = "See all",
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between mb-3">
      <Text className="text-[17px] font-bold text-appText">{title}</Text>
      {onAction && (
        <TouchableOpacity
          className="flex-row items-center"
          onPress={onAction}
          hitSlop={10}
        >
          <Text className="text-[13px] font-semibold text-appPrimary">
            {actionLabel}
          </Text>
          <ChevronRight size={16} color={Colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function ProgressRow({
  icon,
  title,
  subtitle,
  value,
  percentage,
  color,
  valueColor = Colors.text,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  value: string;
  percentage: number;
  color: string;
  valueColor?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity className="py-2.5" onPress={onPress} activeOpacity={0.7}>
      <View className="flex-row items-center gap-3 mb-2">
        {icon}
        <View className="flex-1">
          <Text className="text-[14px] font-semibold text-appText" numberOfLines={1}>
            {title}
          </Text>
          <Text className="text-[11px] text-appText-muted" numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <Text className="text-[13px] font-semibold" style={{ color: valueColor }}>
          {value}
        </Text>
      </View>
      <View className="h-1.5 bg-appSurface-highlight rounded-full overflow-hidden">
        <View
          className="h-full rounded-full"
          style={{
            width: `${Math.max(0, Math.min(100, percentage))}%`,
            backgroundColor: color,
          }}
        />
      </View>
    </TouchableOpacity>
  );
}

function AlertRow({
  alert,
  onDismiss,
}: {
  alert: AlertMessage;
  onDismiss: () => void;
}) {
  const style =
    alert.type === "budget_exceeded"
      ? { color: Colors.dangerLight, bg: "bg-appDanger-muted" }
      : alert.type === "budget_near_limit"
        ? { color: Colors.accent, bg: "bg-appAccent-muted" }
        : { color: Colors.primaryLight, bg: "bg-appPrimary-muted" };
  const Icon = alert.type === "goal_achieved" ? PartyPopper : AlertTriangle;

  return (
    <View
      className={`flex-row items-center gap-3 rounded-xl px-3.5 py-3 mb-2 ${style.bg}`}
    >
      <Icon size={18} color={style.color} />
      <View className="flex-1">
        <Text className="text-[13px] font-bold text-appText" numberOfLines={1}>
          {alert.title.replace(/\s*🎉/, "")}
        </Text>
        <Text className="text-[12px] text-appText-secondary" numberOfLines={2}>
          {alert.message}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onDismiss}
        className="w-11 h-11 items-center justify-center -mr-3"
      >
        <X size={16} color={Colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

// ---------- screen ----------

export default function DashboardScreen() {
  const {
    transactions,
    getBudgetStatuses,
    getGoalProgresses,
    alerts,
    markAlertRead,
  } = useFinance();

  // Show the current month; if it has no activity, fall back to the month of
  // the most recent transaction and say so.
  const nowKey = monthKey(toIsoDate(new Date()));
  const latestKey = transactions.reduce(
    (max, t) => (monthKey(t.date) > max ? monthKey(t.date) : max),
    "",
  );
  const hasCurrentMonth = transactions.some((t) => monthKey(t.date) === nowKey);
  const periodKey = hasCurrentMonth || !latestKey ? nowKey : latestKey;
  const isFallbackPeriod = periodKey !== nowKey;
  const periodLabel = formatMonthYear(`${periodKey}-01`);
  const periodTxs = transactions.filter((t) => monthKey(t.date) === periodKey);

  const totalIncome = periodTxs
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpenses = periodTxs
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  const byCategory = new Map<string, number>();
  for (const t of periodTxs) {
    if (t.type !== "expense") continue;
    byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount);
  }
  const budgetStatuses = [...getBudgetStatuses()].sort(
    (a, b) => b.percentage - a.percentage,
  );
  const goalProgresses = getGoalProgresses();
  const unreadAlerts = alerts.filter((a) => !a.read).slice(0, 2);
  const recentTransactions = transactions.slice(0, 4);

  function openTransactions(extra: { type?: string; category?: string } = {}) {
    const [y, m] = periodKey.split("-").map(Number);
    router.push({
      pathname: "/transactions",
      params: {
        ...extra,
        from: `${periodKey}-01`,
        to: toIsoDate(new Date(y, m, 0)),
        ts: String(Date.now()),
      },
    });
  }

  /** Opens Reports for exactly the month shown on the dashboard. */
  function openReport() {
    const [y, m] = periodKey.split("-").map(Number);
    router.push({
      pathname: "/reports",
      params: {
        from: `${periodKey}-01`,
        to: toIsoDate(new Date(y, m, 0)),
        label: periodLabel,
        ts: String(Date.now()),
      },
    });
  }

  const openPlanning = (tab: "budgets" | "goals") =>
    router.push({ pathname: "/budgets", params: { tab } });

  return (
    <ScrollView
      className="flex-1 bg-appBackground"
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}
      <View className="pt-4 pb-4">
        <Text className="text-[28px] font-extrabold text-appText">
          Dashboard
        </Text>
        <Text className="text-sm text-appText-muted mt-0.5">
          {periodLabel}
          {isFallbackPeriod && (
            <Text className="text-appAccent">
              {"  "}• latest activity (nothing in{" "}
              {formatMonthYear(`${nowKey}-01`)})
            </Text>
          )}
        </Text>
      </View>

      <IncomeExpenseCards
        income={totalIncome}
        expenses={totalExpenses}
        onPressIncome={() => openTransactions({ type: "income" })}
        onPressExpenses={() => openTransactions({ type: "expense" })}
      />

      {/* ALERTS */}
      {unreadAlerts.length > 0 && (
        <View className="mt-4">
          {unreadAlerts.map((alert) => (
            <AlertRow
              key={alert.id}
              alert={alert}
              onDismiss={() => markAlertRead(alert.id)}
            />
          ))}
        </View>
      )}

      {/* SPENDING BY CATEGORY */}
      <View className="mt-7">
        <SectionHeader
          title="Spending by category"
          actionLabel="View report"
          onAction={openReport}
        />
        <CategoryBreakdown
          breakdown={Object.fromEntries(byCategory)}
          emptyText={`No expenses in ${periodLabel}.`}
          onPressCategory={openReport}
        />
      </View>

      {/* PLANNING: budgets + savings goals */}
      <View className="mt-7">
        <SectionHeader title="Planning" onAction={() => openPlanning("budgets")} />
        <View className="bg-appSurface rounded-2xl px-4 py-1.5 border border-appBorder">
          <Text className="text-[11px] font-semibold text-appText-muted uppercase tracking-wider pt-2.5">
            Budgets
          </Text>
          {budgetStatuses.length === 0 ? (
            <TouchableOpacity
              className="py-3"
              onPress={() => openPlanning("budgets")}
            >
              <Text className="text-[13px] text-appText-muted">
                No budgets yet — tap to set a spending limit.
              </Text>
            </TouchableOpacity>
          ) : (
            budgetStatuses.slice(0, 3).map((s) => (
              <ProgressRow
                key={s.budget.id}
                icon={<CategoryIcon category={s.budget.category} size={32} />}
                title={s.budget.name}
                subtitle={
                  s.isExceeded
                    ? `Over by ${formatCurrency(s.spent - s.budget.amount)}`
                    : `${formatCurrency(s.remaining)} left`
                }
                value={`${formatCurrency(s.spent)} / ${formatCurrency(s.budget.amount)}`}
                valueColor={s.isExceeded ? Colors.dangerLight : Colors.text}
                percentage={s.percentage}
                color={
                  s.isExceeded
                    ? Colors.danger
                    : s.isNearLimit
                      ? Colors.accent
                      : Colors.primary
                }
                onPress={() => openPlanning("budgets")}
              />
            ))
          )}

          <View className="h-px bg-appBorder my-2" />

          <Text className="text-[11px] font-semibold text-appText-muted uppercase tracking-wider pt-1">
            Savings goals
          </Text>
          {goalProgresses.length === 0 ? (
            <TouchableOpacity
              className="py-3"
              onPress={() => openPlanning("goals")}
            >
              <Text className="text-[13px] text-appText-muted">
                No savings goals yet — tap to add one.
              </Text>
            </TouchableOpacity>
          ) : (
            goalProgresses.slice(0, 3).map((g) => (
              <ProgressRow
                key={g.goal.id}
                icon={
                  <View className="w-8 h-8 rounded-full bg-appPrimary-muted items-center justify-center">
                    <PiggyBank size={15} color={Colors.primary} />
                  </View>
                }
                title={g.goal.name}
                subtitle={
                  g.isAchieved
                    ? "Achieved 🎉"
                    : `${g.percentage.toFixed(0)}% • ${g.daysRemaining} days left`
                }
                value={`${formatCurrency(g.goal.currentAmount)} / ${formatCurrency(g.goal.targetAmount)}`}
                percentage={g.percentage}
                color={g.isAchieved ? Colors.primary : Colors.accent}
                onPress={() => openPlanning("goals")}
              />
            ))
          )}
        </View>
      </View>

      {/* RECENT TRANSACTIONS */}
      <View className="mt-7">
        <SectionHeader
          title="Recent transactions"
          onAction={() => router.push("/transactions")}
        />
        {recentTransactions.length === 0 ? (
          <View className="bg-appSurface rounded-2xl p-4 border border-appBorder">
            <Text className="text-[13px] text-appText-muted">
              No transactions yet. Add one or import a receipt.
            </Text>
          </View>
        ) : (
          recentTransactions.map((tx) => (
            <TransactionRow
              key={tx.id}
              tx={tx}
              onPress={() => router.push("/transactions")}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}
