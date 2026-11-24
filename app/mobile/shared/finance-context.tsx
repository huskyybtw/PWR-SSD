import createContextHook from "@nkzw/create-context-hook";
import { useCallback } from "react";

import type { GeminiProgress } from "@/services/ai/gemini";
import { useAlertsService } from "@/services/alrets-service";
import { useBudgetsService } from "@/services/budgets-service";
import { useCategoriesService } from "@/services/categories-service";
import { useGoalsService } from "@/services/goals-service";
import { expenseCategories } from "@/repositories/categories-repository";
import { getReportData } from "@/services/reports-service";
import { useTransactionsService } from "@/services/transactions-service";
import {
  Budget,
  BudgetStatus,
  GoalProgress,
  ReportData,
  SavingsGoal,
  Transaction,
} from "@/shared/types/finance";
import { tracked } from "@/shared/uat/tracked";
import { formatCurrency } from "@/shared/utils";

export const [FinanceProvider, useFinance] = createContextHook(() => {
  const budgetsState = useBudgetsService();
  const goalsState = useGoalsService();
  const alertsState = useAlertsService();
  const categoriesState = useCategoriesService();

  const { goalsRef, updateGoalAmounts } = goalsState;
  const { addAlert, refreshAlerts } = alertsState;

  const notifyGoalAchieved = useCallback(
    async (goal: SavingsGoal) => {
      try {
        await addAlert({
          type: "goal_achieved",
          title: "Goal Achieved! 🎉",
          message: `Congratulations! You've reached your "${goal.name}" savings goal of ${formatCurrency(goal.targetAmount)}!`,
          relatedId: goal.id,
        });
      } catch (e) {
        console.error("Goal achieved alert failed", e);
      }
    },
    [addAlert],
  );

  /**
   * Automatic goal tracking: income is added to every goal, expenses are
   * subtracted. All goals are updated in one batch from the current state.
   */
  const handleGoalsUpdate = useCallback(
    async (income: number, expense: number) => {
      const currentGoals = goalsRef.current;
      if (currentGoals.length === 0) return;

      const updates = currentGoals.map((goal) => ({
        goal,
        amount:
          income > 0
            ? goal.currentAmount + income
            : Math.max(0, goal.currentAmount - expense),
      }));

      await updateGoalAmounts(
        updates.map(({ goal, amount }) => ({ goalId: goal.id, amount })),
      );

      for (const { goal, amount } of updates) {
        const wasAchieved = goal.currentAmount >= goal.targetAmount;
        if (!wasAchieved && amount >= goal.targetAmount) {
          await notifyGoalAchieved(goal);
        }
      }
    },
    [goalsRef, updateGoalAmounts, notifyGoalAchieved],
  );

  const handleBudgetAlert = useCallback(
    async (
      type: "budget_exceeded" | "budget_near_limit",
      budgetName: string,
      budgetId: string,
      amount: number,
      spent: number,
      percentage: number,
    ) => {
      try {
        if (type === "budget_exceeded") {
          await addAlert({
            type: "budget_exceeded",
            title: "Budget Exceeded",
            message: `Your "${budgetName}" budget of ${formatCurrency(amount)} has been exceeded. Current spending: ${formatCurrency(spent)}`,
            relatedId: budgetId,
          });
        } else {
          await addAlert({
            type: "budget_near_limit",
            title: "Budget Near Limit",
            message: `Your "${budgetName}" budget is at ${percentage.toFixed(0)}%.`,
            relatedId: budgetId,
          });
        }
      } catch (e) {
        console.error("Budget alert failed", e);
      }
    },
    [addAlert],
  );

  const transactionsState = useTransactionsService(
    handleGoalsUpdate,
    handleBudgetAlert,
  );

  const categories = categoriesState.categories;
  const aiCategories = expenseCategories(categories);

  const importFromReceiptImage = useCallback(
    (
      base64Data: string,
      mimeType: string,
      onProgress?: (progress: GeminiProgress) => void,
    ) =>
      transactionsState.importFromReceiptImage(base64Data, mimeType, {
        categories: aiCategories,
        onProgress,
      }),
    [transactionsState.importFromReceiptImage, aiCategories],
  );

  const importFromStatementDocument = useCallback(
    (
      base64Data: string,
      mimeType: string,
      onProgress?: (progress: GeminiProgress) => void,
    ) =>
      transactionsState.importFromStatementDocument(base64Data, mimeType, {
        categories: aiCategories,
        onProgress,
      }),
    [transactionsState.importFromStatementDocument, aiCategories],
  );

  const updateGoalAmount = useCallback(
    async (goalId: string, amount: number) => {
      const goal = goalsRef.current.find((g) => g.id === goalId);
      const wasAchieved = goal ? goal.currentAmount >= goal.targetAmount : true;

      const updatedGoal = await goalsState.updateGoalAmount(goalId, amount);

      if (updatedGoal && !wasAchieved && amount >= updatedGoal.targetAmount) {
        await notifyGoalAchieved(updatedGoal);
      }

      return updatedGoal;
    },
    [goalsRef, goalsState.updateGoalAmount, notifyGoalAchieved],
  );

  function getGoalProgress(goal: SavingsGoal): GoalProgress {
    return goalsState.getGoalProgress(goal);
  }

  function getGoalProgresses(): GoalProgress[] {
    return goalsState.getGoalProgresses();
  }

  function getBudgetStatus(
    budget: Budget,
    txs: Transaction[] = transactionsState.transactions,
  ): BudgetStatus {
    return budgetsState.getBudgetStatus(budget, txs);
  }

  function getBudgetStatuses(
    txs: Transaction[] = transactionsState.transactions,
  ): BudgetStatus[] {
    return budgetsState.getBudgetStatuses(txs);
  }

  const getReportDataForRange = useCallback(
    (startDate: string, endDate: string): ReportData => {
      return getReportData(transactionsState.transactions, startDate, endDate);
    },
    [transactionsState.transactions],
  );

  const isReady =
    transactionsState.isReady &&
    budgetsState.isReady &&
    goalsState.isReady &&
    alertsState.isReady &&
    categoriesState.isReady;

  return {
    transactions: transactionsState.transactions,
    budgets: budgetsState.budgets,
    goals: goalsState.goals,
    alerts: alertsState.alerts,
    categories,
    isReady,
    unreadAlertsCount: alertsState.unreadAlertsCount,
    addTransaction: tracked("transaction_added", transactionsState.addTransaction, {
      args: ([d]) => ({ type: d.type, amount: d.amount, category: d.category ?? "auto" }),
      result: (tx) => ({ id: tx.id, category: tx.category }),
    }),
    importTransactions: transactionsState.importTransactions,
    updateTransactionCategory: tracked(
      "category_changed",
      transactionsState.updateTransactionCategory,
      { args: ([id, category]) => ({ id, category }) },
    ),
    deleteTransaction: tracked("transaction_deleted", transactionsState.deleteTransaction, {
      args: ([id]) => ({ id }),
    }),
    importFromReceiptImage: tracked("import_receipt", importFromReceiptImage, {
      result: (tx) => ({ amount: tx?.amount, category: tx?.category, date: tx?.date }),
    }),
    importFromStatementDocument: tracked("import_statement", importFromStatementDocument, {
      result: (r) => ({ imported: r.imported.length, skipped: r.skipped.length }),
    }),
    addCategory: tracked("category_created", categoriesState.addCategory, {
      args: ([name]) => ({ name }),
    }),
    addBudget: tracked("budget_created", budgetsState.addBudget, {
      args: ([b]) => ({
        amount: b.amount,
        category: b.category,
        period: b.period,
        startDate: b.startDate,
        endDate: b.endDate,
      }),
    }),
    deleteBudget: tracked("budget_deleted", budgetsState.deleteBudget, {
      args: ([id]) => ({ id }),
    }),
    addGoal: tracked("goal_created", goalsState.addGoal, {
      args: ([g]) => ({ targetAmount: g.targetAmount, deadline: g.deadline }),
    }),
    updateGoalAmount: tracked("goal_contribution", updateGoalAmount, {
      args: ([id, amount]) => ({ id, newAmount: amount }),
    }),
    deleteGoal: tracked("goal_deleted", goalsState.deleteGoal, {
      args: ([id]) => ({ id }),
    }),
    getBudgetStatus,
    getBudgetStatuses,
    getGoalProgress,
    getGoalProgresses,
    getReportData: getReportDataForRange,
    addAlert,
    markAlertRead: alertsState.markAlertRead,
    isRefreshing: alertsState.isRefreshing,
    refreshAlerts,
  };
});
