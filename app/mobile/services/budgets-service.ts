import { useCallback, useEffect, useState } from "react";

import {
  createBudget,
  deleteBudget,
  listBudgets,
  replaceBudgets,
} from "@/repositories/budgets-repository";
import { Budget, BudgetStatus, Transaction } from "@/shared/types/finance";
import { generateId } from "@/shared/utils";
import {
  addDays,
  endOfMonth,
  endOfWeek,
  endOfYear,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";

export function useBudgetsService() {
  const [budgets, setLocalBudgets] = useState<Budget[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const storedBudgets = await listBudgets();

      if (!active) return;

      if (storedBudgets && storedBudgets.length > 0) {
        setLocalBudgets(storedBudgets);
      } else {
        setLocalBudgets([]);
        await replaceBudgets([]);
      }

      setIsReady(true);
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const addBudget = useCallback(
    async (data: Omit<Budget, "id" | "createdAt">) => {
      const start = parseISO(data.startDate);
      const end = parseISO(data.endDate);
      if (isAfter(start, end)) {
        throw new Error("Start date must be before end date.");
      }

      const duplicate = budgets.some(
        (budget) =>
          budget.category === data.category &&
          budget.period === data.period &&
          budget.startDate === data.startDate &&
          budget.endDate === data.endDate,
      );

      if (duplicate) {
        throw new Error("A budget for this category and period already exists.");
      }

      const newBudget: Budget = {
        ...data,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      const next = [...budgets, newBudget];
      setLocalBudgets(next);
      await createBudget(newBudget);
      return newBudget;
    },
    [budgets],
  );

  const removeBudget = useCallback(
    async (budgetId: string) => {
      const next = budgets.filter((budget) => budget.id !== budgetId);
      setLocalBudgets(next);
      await deleteBudget(budgetId);
    },
    [budgets],
  );

  function getBudgetStatus(
    budget: Budget,
    txs: Transaction[] = [],
  ): BudgetStatus {
    const { start, end } = getBudgetPeriodDates(budget);

    const spent = txs
      .filter(
        (transaction) =>
          transaction.category === budget.category &&
          transaction.type === "expense" &&
          isAfter(parseISO(transaction.date), addDays(start, -1)) &&
          isBefore(parseISO(transaction.date), addDays(end, 1)),
      )
      .reduce((sum, transaction) => sum + transaction.amount, 0);

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

  function getBudgetStatuses(txs: Transaction[] = []): BudgetStatus[] {
    return budgets.map((budget) => getBudgetStatus(budget, txs));
  }

  return {
    budgets,
    isReady,
    addBudget,
    deleteBudget: removeBudget,
    getBudgetStatus,
    getBudgetStatuses,
  };
}

function getBudgetPeriodDates(budget: Budget): { start: Date; end: Date } {
  const referenceDate = parseISO(budget.startDate);

  switch (budget.period) {
    case "daily": {
      const start = startOfDay(referenceDate);
      return { start, end: addDays(start, 1) };
    }
    case "weekly":
      return {
        start: startOfWeek(referenceDate, { weekStartsOn: 1 }),
        end: endOfWeek(referenceDate, { weekStartsOn: 1 }),
      };
    case "monthly":
      return {
        start: startOfMonth(referenceDate),
        end: endOfMonth(referenceDate),
      };
    case "yearly":
      return {
        start: startOfYear(referenceDate),
        end: endOfYear(referenceDate),
      };
    default:
      return {
        start: parseISO(budget.startDate),
        end: parseISO(budget.endDate),
      };
  }
}
