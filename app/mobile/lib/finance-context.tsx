import createContextHook from "@nkzw/create-context-hook";
import { useCallback, useEffect, useState } from "react";

import { Storage } from "@/lib/storage";
import {
  AlertMessage,
  Budget,
  BudgetStatus,
  GoalProgress,
  ReportData,
  SavingsGoal,
  Transaction,
  TransactionType,
} from "@/types/finance";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
} from "date-fns";

import { autoCategorize, DEFAULT_CATEGORIES } from "./categories";
import { generateId } from "./utils";

function isDuplicate(existing: Transaction, candidate: Transaction): boolean {
  const sameDate = isSameDay(parseISO(existing.date), parseISO(candidate.date));
  const sameAmount = Math.abs(existing.amount - candidate.amount) < 0.01;
  const sameDesc =
    existing.description.toLowerCase().trim() ===
    candidate.description.toLowerCase().trim();
  return sameDate && sameAmount && sameDesc;
}

function getBudgetPeriodDates(
  budget: Budget,
  referenceDate: Date = new Date(),
): { start: Date; end: Date } {
  const start = parseISO(budget.startDate);
  const end = parseISO(budget.endDate);

  switch (budget.period) {
    case "daily":
      return { start: startOfDay(referenceDate), end: endOfDay(referenceDate) };
    case "weekly": {
      const weekStart = addDays(referenceDate, -referenceDate.getDay());
      return {
        start: startOfDay(weekStart),
        end: endOfDay(addDays(weekStart, 6)),
      };
    }
    case "monthly":
      return {
        start: startOfMonth(referenceDate),
        end: endOfMonth(referenceDate),
      };
    case "yearly": {
      const yearStart = new Date(referenceDate.getFullYear(), 0, 1);
      const yearEnd = new Date(referenceDate.getFullYear(), 11, 31, 23, 59, 59);
      return { start: yearStart, end: yearEnd };
    }
    default:
      return { start, end };
  }
}

function seedData(): {
  transactions: Transaction[];
  budgets: Budget[];
  goals: SavingsGoal[];
} {
  const today = new Date();
  const transactions: Transaction[] = [
    {
      id: generateId(),
      amount: 45.67,
      description: "Whole Foods Market",
      date: format(addDays(today, -1), "yyyy-MM-dd"),
      category: "Food",
      type: "expense",
      createdAt: new Date().toISOString(),
    },
    {
      id: generateId(),
      amount: 12.5,
      description: "Starbucks Coffee",
      date: format(addDays(today, -2), "yyyy-MM-dd"),
      category: "Food",
      type: "expense",
      createdAt: new Date().toISOString(),
    },
    {
      id: generateId(),
      amount: 85.0,
      description: "Shell Gas Station",
      date: format(addDays(today, -3), "yyyy-MM-dd"),
      category: "Transport",
      type: "expense",
      createdAt: new Date().toISOString(),
    },
    {
      id: generateId(),
      amount: 129.99,
      description: "Amazon Purchase",
      date: format(addDays(today, -4), "yyyy-MM-dd"),
      category: "Shopping",
      type: "expense",
      createdAt: new Date().toISOString(),
    },
    {
      id: generateId(),
      amount: 15.99,
      description: "Netflix Subscription",
      date: format(addDays(today, -5), "yyyy-MM-dd"),
      category: "Entertainment",
      type: "expense",
      createdAt: new Date().toISOString(),
    },
    {
      id: generateId(),
      amount: 1200.0,
      description: "Monthly Rent",
      date: format(addDays(today, -6), "yyyy-MM-dd"),
      category: "Bills",
      type: "expense",
      createdAt: new Date().toISOString(),
    },
    {
      id: generateId(),
      amount: 75.0,
      description: "Planet Fitness",
      date: format(addDays(today, -7), "yyyy-MM-dd"),
      category: "Health",
      type: "expense",
      createdAt: new Date().toISOString(),
    },
    {
      id: generateId(),
      amount: 3500.0,
      description: "Salary Deposit",
      date: format(addDays(today, -8), "yyyy-MM-dd"),
      category: "Income",
      type: "income",
      createdAt: new Date().toISOString(),
    },
    {
      id: generateId(),
      amount: 89.99,
      description: "Udemy Course",
      date: format(addDays(today, -9), "yyyy-MM-dd"),
      category: "Education",
      type: "expense",
      createdAt: new Date().toISOString(),
    },
    {
      id: generateId(),
      amount: 250.0,
      description: "Flight Booking",
      date: format(addDays(today, -10), "yyyy-MM-dd"),
      category: "Travel",
      type: "expense",
      createdAt: new Date().toISOString(),
    },
  ];

  const budgets: Budget[] = [
    {
      id: generateId(),
      name: "Monthly Food Budget",
      amount: 600,
      category: "Food",
      period: "monthly",
      startDate: format(startOfMonth(today), "yyyy-MM-dd"),
      endDate: format(endOfMonth(today), "yyyy-MM-dd"),
      createdAt: new Date().toISOString(),
    },
    {
      id: generateId(),
      name: "Transport Budget",
      amount: 300,
      category: "Transport",
      period: "monthly",
      startDate: format(startOfMonth(today), "yyyy-MM-dd"),
      endDate: format(endOfMonth(today), "yyyy-MM-dd"),
      createdAt: new Date().toISOString(),
    },
    {
      id: generateId(),
      name: "Entertainment",
      amount: 100,
      category: "Entertainment",
      period: "monthly",
      startDate: format(startOfMonth(today), "yyyy-MM-dd"),
      endDate: format(endOfMonth(today), "yyyy-MM-dd"),
      createdAt: new Date().toISOString(),
    },
  ];

  const goals: SavingsGoal[] = [
    {
      id: generateId(),
      name: "Emergency Fund",
      targetAmount: 10000,
      currentAmount: 4500,
      deadline: format(addMonths(today, 6), "yyyy-MM-dd"),
      createdAt: new Date().toISOString(),
    },
    {
      id: generateId(),
      name: "New Laptop",
      targetAmount: 2500,
      currentAmount: 1800,
      deadline: format(addMonths(today, 2), "yyyy-MM-dd"),
      createdAt: new Date().toISOString(),
    },
    {
      id: generateId(),
      name: "Vacation Fund",
      targetAmount: 5000,
      currentAmount: 1200,
      deadline: format(addMonths(today, 8), "yyyy-MM-dd"),
      createdAt: new Date().toISOString(),
    },
  ];

  return { transactions, budgets, goals };
}

export const [FinanceProvider, useFinance] = createContextHook(() => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [alerts, setAlerts] = useState<AlertMessage[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function load() {
      const storedTx = await Storage.getTransactions();
      const storedBudgets = await Storage.getBudgets();
      const storedGoals = await Storage.getGoals();
      const storedAlerts = await Storage.getAlerts();
      const storedCategories = await Storage.getCategories();

      if (storedTx && storedTx.length > 0) {
        setTransactions(storedTx as Transaction[]);
      } else {
        const seeded = seedData();
        setTransactions(seeded.transactions);
        await Storage.setTransactions(seeded.transactions);
      }

      if (storedBudgets && storedBudgets.length > 0) {
        setBudgets(storedBudgets as Budget[]);
      } else {
        const seeded = seedData();
        setBudgets(seeded.budgets);
        await Storage.setBudgets(seeded.budgets);
      }

      if (storedGoals && storedGoals.length > 0) {
        setGoals(storedGoals as SavingsGoal[]);
      } else {
        const seeded = seedData();
        setGoals(seeded.goals);
        await Storage.setGoals(seeded.goals);
      }

      if (storedAlerts) {
        setAlerts(storedAlerts as AlertMessage[]);
      }

      if (storedCategories) {
        setCategories(storedCategories);
      }

      setIsReady(true);
    }
    load();
  }, []);

  const persistTransactions = useCallback(async (txs: Transaction[]) => {
    setTransactions(txs);
    await Storage.setTransactions(txs);
  }, []);

  const persistBudgets = useCallback(async (b: Budget[]) => {
    setBudgets(b);
    await Storage.setBudgets(b);
  }, []);

  const persistGoals = useCallback(async (g: SavingsGoal[]) => {
    setGoals(g);
    await Storage.setGoals(g);
  }, []);

  const persistAlerts = useCallback(async (a: AlertMessage[]) => {
    setAlerts(a);
    await Storage.setAlerts(a);
  }, []);

  const addAlert = useCallback(
    async (alert: Omit<AlertMessage, "id" | "createdAt" | "read">) => {
      const newAlert: AlertMessage = {
        ...alert,
        id: generateId(),
        createdAt: new Date().toISOString(),
        read: false,
      };
      const updated = [newAlert, ...alerts];
      await persistAlerts(updated);
    },
    [alerts, persistAlerts],
  );

  const markAlertRead = useCallback(
    async (alertId: string) => {
      const updated = alerts.map((a) =>
        a.id === alertId ? { ...a, read: true } : a,
      );
      await persistAlerts(updated);
    },
    [alerts, persistAlerts],
  );

  const addTransaction = useCallback(
    async (
      data: Omit<Transaction, "id" | "createdAt" | "category" | "source"> & {
        category?: string;
        source?: Transaction["source"];
      },
    ) => {
      const category = data.category || autoCategorize(data.description);
      const newTx: Transaction = {
        ...data,
        id: generateId(),
        createdAt: new Date().toISOString(),
        category,
        source: data.source || "manual",
      };

      const isDup = transactions.some((t) => isDuplicate(t, newTx));
      if (isDup) {
        throw new Error("Duplicate transaction detected.");
      }

      const updated = [newTx, ...transactions];
      await persistTransactions(updated);

      const relevantBudgets = budgets.filter(
        (b) =>
          b.category === category &&
          isBefore(parseISO(newTx.date), addDays(parseISO(b.endDate), 1)) &&
          isAfter(parseISO(newTx.date), addDays(parseISO(b.startDate), -1)),
      );

      for (const budget of relevantBudgets) {
        const status = getBudgetStatus(budget, [...updated]);
        if (status.isExceeded && data.type === "expense") {
          await addAlert({
            type: "budget_exceeded",
            title: "Budget Exceeded",
            message: `Your "${budget.name}" budget of ${budget.amount} has been exceeded. Current spending: ${status.spent.toFixed(2)}`,
            relatedId: budget.id,
          });
        } else if (status.isNearLimit && data.type === "expense") {
          await addAlert({
            type: "budget_near_limit",
            title: "Budget Near Limit",
            message: `Your "${budget.name}" budget is at ${status.percentage.toFixed(0)}%.`,
            relatedId: budget.id,
          });
        }
      }

      return newTx;
    },
    [transactions, budgets, persistTransactions, addAlert],
  );

  const importTransactions = useCallback(
    async (
      rawTransactions: Array<{
        amount: number;
        description: string;
        date: string;
        type?: TransactionType;
      }>,
    ) => {
      const imported: Transaction[] = [];
      const skipped: typeof rawTransactions = [];

      for (const raw of rawTransactions) {
        const category = autoCategorize(raw.description);
        const newTx: Transaction = {
          amount: raw.amount,
          description: raw.description,
          date: raw.date,
          category,
          type: raw.type || "expense",
          id: generateId(),
          createdAt: new Date().toISOString(),
          source: "import",
        };

        const isDup = [...transactions, ...imported].some((t) =>
          isDuplicate(t, newTx),
        );
        if (isDup) {
          skipped.push(raw);
          continue;
        }
        imported.push(newTx);
      }

      if (imported.length > 0) {
        const updated = [...imported, ...transactions];
        await persistTransactions(updated);
      }

      return { imported, skipped };
    },
    [transactions, persistTransactions],
  );

  const updateTransactionCategory = useCallback(
    async (txId: string, category: string) => {
      const updated = transactions.map((t) =>
        t.id === txId ? { ...t, category } : t,
      );
      await persistTransactions(updated);
    },
    [transactions, persistTransactions],
  );

  const deleteTransaction = useCallback(
    async (txId: string) => {
      const updated = transactions.filter((t) => t.id !== txId);
      await persistTransactions(updated);
    },
    [transactions, persistTransactions],
  );

  const addCategory = useCallback(
    async (name: string) => {
      if (categories.includes(name)) return;
      const updated = [...categories, name];
      setCategories(updated);
      await Storage.setCategories(updated);
    },
    [categories],
  );

  const addBudget = useCallback(
    async (data: Omit<Budget, "id" | "createdAt">) => {
      const start = parseISO(data.startDate);
      const end = parseISO(data.endDate);
      if (isAfter(start, end)) {
        throw new Error("Start date must be before end date.");
      }

      const newBudget: Budget = {
        ...data,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      const updated = [...budgets, newBudget];
      await persistBudgets(updated);
      return newBudget;
    },
    [budgets, persistBudgets],
  );

  const deleteBudget = useCallback(
    async (budgetId: string) => {
      const updated = budgets.filter((b) => b.id !== budgetId);
      await persistBudgets(updated);
    },
    [budgets, persistBudgets],
  );

  const addGoal = useCallback(
    async (data: Omit<SavingsGoal, "id" | "createdAt" | "currentAmount">) => {
      const start = parseISO(data.deadline);
      if (!isValid(start)) {
        throw new Error("Invalid deadline date.");
      }

      const newGoal: SavingsGoal = {
        ...data,
        id: generateId(),
        currentAmount: 0,
        createdAt: new Date().toISOString(),
      };
      const updated = [...goals, newGoal];
      await persistGoals(updated);
      return newGoal;
    },
    [goals, persistGoals],
  );

  const updateGoalAmount = useCallback(
    async (goalId: string, amount: number) => {
      const goal = goals.find((g) => g.id === goalId);
      if (!goal) return;

      const updatedGoal = { ...goal, currentAmount: amount };
      const updated = goals.map((g) => (g.id === goalId ? updatedGoal : g));
      await persistGoals(updated);

      if (amount >= goal.targetAmount) {
        await addAlert({
          type: "goal_achieved",
          title: "Goal Achieved!",
          message: `Congratulations! You've reached your "${goal.name}" savings goal of ${goal.targetAmount.toFixed(2)}!`,
          relatedId: goal.id,
        });
      }
    },
    [goals, persistGoals, addAlert],
  );

  const deleteGoal = useCallback(
    async (goalId: string) => {
      const updated = goals.filter((g) => g.id !== goalId);
      await persistGoals(updated);
    },
    [goals, persistGoals],
  );

  function getBudgetStatus(
    budget: Budget,
    txs: Transaction[] = transactions,
  ): BudgetStatus {
    const { start, end } = getBudgetPeriodDates(budget);

    const spent = txs
      .filter(
        (t) =>
          t.category === budget.category &&
          t.type === "expense" &&
          isAfter(parseISO(t.date), addDays(start, -1)) &&
          isBefore(parseISO(t.date), addDays(end, 1)),
      )
      .reduce((sum, t) => sum + t.amount, 0);

    const remaining = Math.max(0, budget.amount - spent);
    const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

    return {
      budget,
      spent,
      remaining,
      percentage,
      isExceeded: spent > budget.amount,
      isNearLimit: percentage >= 80 && percentage <= 100,
    };
  }

  function getBudgetStatuses(): BudgetStatus[] {
    return budgets.map((b) => getBudgetStatus(b));
  }

  function getGoalProgress(goal: SavingsGoal): GoalProgress {
    const percentage =
      goal.targetAmount > 0
        ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
        : 0;
    const daysRemaining = Math.max(
      0,
      Math.ceil(
        (parseISO(goal.deadline).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    return {
      goal,
      percentage,
      isAchieved: goal.currentAmount >= goal.targetAmount,
      daysRemaining,
    };
  }

  function getGoalProgresses(): GoalProgress[] {
    return goals.map((g) => getGoalProgress(g));
  }

  function getReportData(startDate: string, endDate: string): ReportData {
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    const filtered = transactions.filter(
      (t) =>
        isAfter(parseISO(t.date), addDays(start, -1)) &&
        isBefore(parseISO(t.date), addDays(end, 1)),
    );

    const totalIncome = filtered
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = filtered
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const categoryBreakdown: Record<string, number> = {};
    for (const t of filtered.filter((t) => t.type === "expense")) {
      categoryBreakdown[t.category] =
        (categoryBreakdown[t.category] || 0) + t.amount;
    }

    const days = eachDayOfInterval({ start, end });
    const dailyTrend = days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayTxs = filtered.filter((t) => t.date === dayStr);
      return {
        date: dayStr,
        income: dayTxs
          .filter((t) => t.type === "income")
          .reduce((s, t) => s + t.amount, 0),
        expense: dayTxs
          .filter((t) => t.type === "expense")
          .reduce((s, t) => s + t.amount, 0),
      };
    });

    return {
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      categoryBreakdown,
      dailyTrend,
    };
  }

  const unreadAlertsCount = alerts.filter((a) => !a.read).length;

  return {
    transactions,
    budgets,
    goals,
    alerts,
    categories,
    isReady,
    unreadAlertsCount,
    addTransaction,
    importTransactions,
    updateTransactionCategory,
    deleteTransaction,
    addCategory,
    addBudget,
    deleteBudget,
    addGoal,
    updateGoalAmount,
    deleteGoal,
    getBudgetStatus,
    getBudgetStatuses,
    getGoalProgress,
    getGoalProgresses,
    getReportData,
    addAlert,
    markAlertRead,
  };
});
