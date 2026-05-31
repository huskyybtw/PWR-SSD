import createContextHook from "@nkzw/create-context-hook";
import { useCallback } from "react";

import { useAlertsService } from "@/services/alrets-service";
import { useBudgetsService } from "@/services/budgets-service";
import { useCategoriesService } from "@/services/categories-service";
import { useGoalsService } from "@/services/goals-service";
import { getReportData } from "@/services/reports-service";
import { useTransactionsService } from "@/services/transactions-service";
import { autoCategorize } from "@/repositories/categories-repository";
import {
  Budget,
  BudgetStatus,
  GoalProgress,
  ReportData,
  SavingsGoal,
  Transaction,
} from "@/shared/types/finance";

export const [FinanceProvider, useFinance] = createContextHook(() => {
  const transactionsState = useTransactionsService();
  const budgetsState = useBudgetsService();
  const goalsState = useGoalsService();
  const alertsState = useAlertsService();
  const categoriesState = useCategoriesService();

  const addTransaction = transactionsState.addTransaction;

  const importTransactions = transactionsState.importTransactions;
  const updateTransactionCategory = transactionsState.updateTransactionCategory;
  const deleteTransaction = transactionsState.deleteTransaction;

  const addBudget = budgetsState.addBudget;
  const deleteBudget = budgetsState.deleteBudget;
  const addGoal = goalsState.addGoal;
  const deleteGoal = goalsState.deleteGoal;
  const addCategory = categoriesState.addCategory;

  const updateGoalAmount = useCallback(
    async (goalId: string, amount: number) => {
      const updatedGoal = await goalsState.updateGoalAmount(goalId, amount);

      if (updatedGoal && amount >= updatedGoal.targetAmount) {
        await alertsState.addAlert({
          type: "goal_achieved",
          title: "Goal Achieved!",
          message: `Congratulations! You've reached your "${updatedGoal.name}" savings goal of ${updatedGoal.targetAmount.toFixed(2)}!`,
          relatedId: updatedGoal.id,
        });
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

  function getReportDataForRange(
    startDate: string,
    endDate: string,
  ): ReportData {
    return getReportData(transactionsState.transactions, startDate, endDate);
  }

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
  };
});
