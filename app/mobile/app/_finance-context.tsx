import createContextHook from "@nkzw/create-context-hook";
import { useCallback } from "react";

import { useAlertsService } from "@/services/alrets-service";
import { useBudgetsService } from "@/services/budgets-service";
import { useCategoriesService } from "@/services/categories-service";
import { useGoalsService } from "@/services/goals-service";
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

export const [FinanceProvider, useFinance] = createContextHook(() => {
  const budgetsState = useBudgetsService();
  const goalsState = useGoalsService();
  const alertsState = useAlertsService();
  const categoriesState = useCategoriesService();

  const handleGoalsUpdate = useCallback(
    async (income: number, expense: number) => {
      for (const goal of goalsState.goals) {
        const wasAchieved = goal.currentAmount >= goal.targetAmount;

        const nextAmount =
          income > 0
            ? goal.currentAmount + income
            : Math.max(0, goal.currentAmount - expense);

        const updatedGoal = await goalsState.updateGoalAmount(
          goal.id,
          nextAmount,
        );

        if (updatedGoal && !wasAchieved && nextAmount >= goal.targetAmount) {
          try {
            await alertsState.addAlert({
              type: "goal_achieved",
              title: "Goal Achieved! 🎉",
              message: `Congratulations! You've reached your "${goal.name}" savings goal of ${goal.targetAmount.toFixed(2)}!`,
              relatedId: goal.id,
            });
            await alertsState.refreshAlerts();
          } catch (e) {
            console.error("Goal achieved alert failed", e);
          }
        }
      }

      await alertsState.refreshAlerts();
    },
    [goalsState.goals, goalsState.updateGoalAmount, alertsState],
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
          await alertsState.addAlert({
            type: "budget_exceeded",
            title: "Budget Exceeded",
            message: `Your "${budgetName}" budget of ${amount} has been exceeded. Current spending: ${spent.toFixed(2)}`,
            relatedId: budgetId,
          });
        } else {
          await alertsState.addAlert({
            type: "budget_near_limit",
            title: "Budget Near Limit",
            message: `Your "${budgetName}" budget is at ${percentage.toFixed(0)}%.`,
            relatedId: budgetId,
          });
        }
        await alertsState.refreshAlerts();
      } catch (e) {
        console.error("Budget alert failed", e);
      }
    },
    [alertsState],
  );

  const transactionsState = useTransactionsService(
    handleGoalsUpdate,
    handleBudgetAlert,
  );

  const addTransaction = transactionsState.addTransaction;
  const importTransactions = transactionsState.importTransactions;
  const updateTransactionCategory = transactionsState.updateTransactionCategory;
  const deleteTransaction = transactionsState.deleteTransaction;
  const importFromReceiptImage = transactionsState.importFromReceiptImage;
  const importFromStatementDocument =
    transactionsState.importFromStatementDocument;

  const addBudget = budgetsState.addBudget;
  const deleteBudget = budgetsState.deleteBudget;
  const addGoal = goalsState.addGoal;
  const deleteGoal = goalsState.deleteGoal;
  const addCategory = categoriesState.addCategory;

  const isRefreshing = alertsState.isRefreshing;
  const refreshAlerts = alertsState.refreshAlerts;

  const updateGoalAmount = useCallback(
    async (goalId: string, amount: number) => {
      const goal = goalsState.goals.find((g) => g.id === goalId);
      const wasAchieved = goal ? goal.currentAmount >= goal.targetAmount : true;

      const updatedGoal = await goalsState.updateGoalAmount(goalId, amount);

      if (updatedGoal && !wasAchieved && amount >= updatedGoal.targetAmount) {
        try {
          await alertsState.addAlert({
            type: "goal_achieved",
            title: "Goal Achieved! 🎉",
            message: `Congratulations! You've reached your "${updatedGoal.name}" savings goal of ${updatedGoal.targetAmount.toFixed(2)}!`,
            relatedId: updatedGoal.id,
          });
          await alertsState.refreshAlerts();
        } catch (e) {
          console.error("Goal achieved alert failed", e);
        }
      }

      return updatedGoal;
    },
    [alertsState, goalsState],
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

  const unreadAlertsCount = alertsState.unreadAlertsCount;
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
    categories: categoriesState.categories,
    isReady,
    unreadAlertsCount,
    addTransaction,
    importTransactions,
    updateTransactionCategory,
    deleteTransaction,
    importFromReceiptImage,
    importFromStatementDocument,
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
    getReportData: getReportDataForRange,
    addAlert: alertsState.addAlert,
    markAlertRead: alertsState.markAlertRead,
    isRefreshing,
    refreshAlerts,
  };
});
