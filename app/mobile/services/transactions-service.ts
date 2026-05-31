import { useCallback, useEffect, useState } from "react";

import {
  autoCategorize,
  DEFAULT_CATEGORIES,
} from "@/repositories/categories-repository";
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  replaceTransactions,
  updateTransactionCategory,
} from "@/repositories/transactions-repository";
import { listBudgets } from "@/repositories/budgets-repository";
import { createAlert } from "@/repositories/alerts-repository";
import { AlertMessage } from "@/shared/types/finance";
import {
  addDays,
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { Transaction, TransactionType } from "@/shared/types/finance";
import { generateId } from "@/shared/utils";

export function useTransactionsService() {
  const [transactions, setLocalTransactions] = useState<Transaction[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const storedTransactions = await listTransactions();

      if (!active) return;

      if (storedTransactions && storedTransactions.length > 0) {
        setLocalTransactions(storedTransactions);
      } else {
        setLocalTransactions([]);
        await replaceTransactions([]);
      }

      setIsReady(true);
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const addTransaction = useCallback(
    async (
      data: Omit<Transaction, "id" | "createdAt" | "category" | "source"> & {
        category?: string;
        source?: Transaction["source"];
      },
    ) => {
      const category =
        data.category ||
        autoCategorize(data.description) ||
        DEFAULT_CATEGORIES[0];
      const newTx: Transaction = {
        ...data,
        id: generateId(),
        createdAt: new Date().toISOString(),
        category,
        source: data.source || "manual",
      };

      const isDup = transactions.some((transaction) =>
        isDuplicateTransaction(transaction, newTx),
      );
      if (isDup) {
        throw new Error("Duplicate transaction detected.");
      }

      const next = [newTx, ...transactions];
      setLocalTransactions(next);
      await createTransaction(newTx);

      // Orchestration: check budgets and create alerts when limits are reached
      try {
        const budgets = await listBudgets();
        const relevantBudgets = budgets.filter(
          (b) => b.category === newTx.category,
        );

        for (const budget of relevantBudgets) {
          const status = getBudgetStatus(budget, next);
          if (status.isExceeded && newTx.type === "expense") {
            const alert: AlertMessage = {
              id: generateId(),
              type: "budget_exceeded",
              title: "Budget Exceeded",
              message: `Your \"${budget.name}\" budget of ${budget.amount} has been exceeded. Current spending: ${status.spent.toFixed(2)}`,
              relatedId: budget.id,
              createdAt: new Date().toISOString(),
              read: false,
            };
            await createAlert(alert);
          } else if (status.isNearLimit && newTx.type === "expense") {
            const alert: AlertMessage = {
              id: generateId(),
              type: "budget_near_limit",
              title: "Budget Near Limit",
              message: `Your \"${budget.name}\" budget is at ${status.percentage.toFixed(0)}%.`,
              relatedId: budget.id,
              createdAt: new Date().toISOString(),
              read: false,
            };
            await createAlert(alert);
          }
        }
      } catch (e) {
        // swallow orchestration errors to avoid blocking transaction creation
        // but log for debugging
        // eslint-disable-next-line no-console
        console.error("Transaction orchestration failed", e);
      }

      return newTx;
    },
    [transactions],
  );

  function getBudgetStatus(
    budget: {
      id: string;
      amount: number;
      category: string;
      period: string;
      startDate: string;
      endDate: string;
    },
    txs: Transaction[] = [],
  ) {
    const { start, end } = getBudgetPeriodDates(budget as any);

    const spent = txs
      .filter(
        (transaction) =>
          transaction.category === budget.category &&
          transaction.type === "expense" &&
          new Date(transaction.date) >= addDays(start, 0) &&
          new Date(transaction.date) <= addDays(end, 0),
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

  // helper re-used from other modules (avoid new file creation)
  function getBudgetPeriodDates(budget: any): { start: Date; end: Date } {
    const referenceDate = new Date(budget.startDate);

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
          start: new Date(budget.startDate),
          end: new Date(budget.endDate),
        };
    }
  }

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

        const isDup = [...transactions, ...imported].some((transaction) =>
          isDuplicateTransaction(transaction, newTx),
        );
        if (isDup) {
          skipped.push(raw);
          continue;
        }
        imported.push(newTx);
      }

      if (imported.length > 0) {
        const next = [...imported, ...transactions];
        setLocalTransactions(next);
        await replaceTransactions(next);
      }

      return { imported, skipped };
    },
    [transactions],
  );

  const updateCategory = useCallback(
    async (txId: string, category: string) => {
      const next = transactions.map((transaction) =>
        transaction.id === txId ? { ...transaction, category } : transaction,
      );
      setLocalTransactions(next);
      await updateTransactionCategory(txId, category);
    },
    [transactions],
  );

  const removeTransaction = useCallback(
    async (txId: string) => {
      const next = transactions.filter(
        (transaction) => transaction.id !== txId,
      );
      setLocalTransactions(next);
      await deleteTransaction(txId);
    },
    [transactions],
  );

  return {
    transactions,
    isReady,
    addTransaction,
    importTransactions,
    updateTransactionCategory: updateCategory,
    deleteTransaction: removeTransaction,
  };
}

function isDuplicateTransaction(
  existing: Transaction,
  candidate: Transaction,
): boolean {
  return (
    existing.amount === candidate.amount &&
    existing.description.trim().toLowerCase() ===
      candidate.description.trim().toLowerCase() &&
    existing.date === candidate.date &&
    existing.type === candidate.type
  );
}
