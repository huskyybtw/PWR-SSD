import { listBudgets } from "@/repositories/budgets-repository";
import {
  autoCategorize,
  DEFAULT_CATEGORIES,
  INCOME_CATEGORY,
} from "@/repositories/categories-repository";
import {
  createTransaction,
  deleteTransaction,
  insertTransactions,
  listTransactions,
  updateTransactionCategory,
} from "@/repositories/transactions-repository";
import {
  isDuplicateTransaction,
  partitionNewTransactions,
} from "@/shared/duplicates";
import { Transaction, TransactionType } from "@/shared/types/finance";
import { generateId } from "@/shared/utils";
import {
  addDays,
  endOfMonth,
  endOfWeek,
  endOfYear,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AiImportOptions } from "./transactions/ocr-reader";
import { processReceiptWithAI } from "./transactions/ocr-reader";
import { processStatementWithAI } from "./transactions/statement-analyzer";

export type RawTransactionInput = {
  amount: number;
  description: string;
  date: string;
  type?: TransactionType;
  category?: string;
};

type BudgetAlertFn = (
  type: "budget_exceeded" | "budget_near_limit",
  budgetName: string,
  budgetId: string,
  amount: number,
  spent: number,
  percentage: number,
) => Promise<void>;

export function useTransactionsService(
  onGoalsUpdate?: (income: number, expense: number) => Promise<void>,
  onBudgetAlert?: BudgetAlertFn,
) {
  const [transactions, setLocalTransactions] = useState<Transaction[]>([]);
  const [isReady, setIsReady] = useState(false);
  // Always-current snapshot so async callbacks never work on stale state.
  const txRef = useRef<Transaction[]>([]);
  // Latest callbacks, so memoised functions don't capture stale handlers.
  const goalsCbRef = useRef(onGoalsUpdate);
  const budgetCbRef = useRef(onBudgetAlert);
  goalsCbRef.current = onGoalsUpdate;
  budgetCbRef.current = onBudgetAlert;

  const setTransactions = useCallback((next: Transaction[]) => {
    txRef.current = next;
    setLocalTransactions(next);
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const storedTransactions = await listTransactions();
        if (active) setTransactions(storedTransactions ?? []);
      } catch (error) {
        console.error("Failed to load transactions", error);
      } finally {
        if (active) setIsReady(true);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [setTransactions]);

  const runGoalsUpdate = useCallback(async (income: number, expense: number) => {
    if (!goalsCbRef.current) return;
    try {
      await goalsCbRef.current(income, expense);
    } catch (e) {
      console.error("Goal update failed", e);
    }
  }, []);

  const runBudgetAlerts = useCallback(
    async (newTxs: Transaction[], allTxs: Transaction[]) => {
      const onAlert = budgetCbRef.current;
      if (!onAlert) return;
      try {
        const budgets = await listBudgets();
        const relevantCategories = new Set(newTxs.map((t) => t.category));
        const relevantBudgets = budgets.filter((b) =>
          relevantCategories.has(b.category),
        );

        for (const budget of relevantBudgets) {
          const status = getBudgetStatus(budget, allTxs);
          const hasExpense = newTxs.some(
            (t) => t.type === "expense" && t.category === budget.category,
          );
          if (!hasExpense) continue;

          if (status.isExceeded) {
            await onAlert(
              "budget_exceeded",
              budget.name,
              budget.id,
              budget.amount,
              status.spent,
              status.percentage,
            );
          } else if (status.isNearLimit) {
            await onAlert(
              "budget_near_limit",
              budget.name,
              budget.id,
              budget.amount,
              status.spent,
              status.percentage,
            );
          }
        }
      } catch (e) {
        console.error("Budget orchestration failed", e);
      }
    },
    [],
  );

  const addTransaction = useCallback(
    async (
      data: Omit<Transaction, "id" | "createdAt" | "category" | "source"> & {
        category?: string;
        source?: Transaction["source"];
      },
    ) => {
      const category =
        data.type === "income"
          ? INCOME_CATEGORY
          : data.category && data.category !== INCOME_CATEGORY
            ? data.category
            : autoCategorize(data.description) || DEFAULT_CATEGORIES[0];

      const newTx: Transaction = {
        ...data,
        id: generateId(),
        createdAt: new Date().toISOString(),
        category,
        source: data.source || "manual",
      };

      const isDup = txRef.current.some((t) => isDuplicateTransaction(t, newTx));
      if (isDup) throw new Error("Duplicate transaction detected.");

      // Database first: if it fails, the UI is not left with a ghost row.
      await createTransaction(newTx);
      const next = sortByDateDesc([newTx, ...txRef.current]);
      setTransactions(next);

      await runGoalsUpdate(
        newTx.type === "income" ? newTx.amount : 0,
        newTx.type === "expense" ? newTx.amount : 0,
      );
      await runBudgetAlerts([newTx], next);

      return newTx;
    },
    [setTransactions, runGoalsUpdate, runBudgetAlerts],
  );

  const importTransactions = useCallback(
    async (rawTransactions: RawTransactionInput[]) => {
      const candidates = rawTransactions.map((raw) => ({
        raw,
        amount: raw.amount,
        description: raw.description,
        date: raw.date,
        category:
          raw.type === "income"
            ? INCOME_CATEGORY
            : raw.category &&
                raw.category !== "Uncategorized" &&
                raw.category !== INCOME_CATEGORY
              ? raw.category
              : autoCategorize(raw.description),
        type: raw.type || ("expense" as TransactionType),
        id: generateId(),
        createdAt: new Date().toISOString(),
        source: "import" as const,
      }));

      const { fresh, duplicates } = partitionNewTransactions(
        txRef.current,
        candidates,
      );
      const imported: Transaction[] = fresh.map(({ raw, ...tx }) => tx);
      const skipped: RawTransactionInput[] = duplicates.map((d) => d.raw);

      if (imported.length > 0) {
        // Only the new rows are written; existing data is never deleted.
        await insertTransactions(imported);
        const next = sortByDateDesc([...imported, ...txRef.current]);
        setTransactions(next);

        const totalIncome = imported
          .filter((t) => t.type === "income")
          .reduce((s, t) => s + t.amount, 0);
        const totalExpense = imported
          .filter((t) => t.type === "expense")
          .reduce((s, t) => s + t.amount, 0);

        await runGoalsUpdate(totalIncome, totalExpense);
        await runBudgetAlerts(imported, next);
      }

      return { imported, skipped };
    },
    [setTransactions, runGoalsUpdate, runBudgetAlerts],
  );

  const updateCategory = useCallback(
    async (txId: string, category: string) => {
      const tx = txRef.current.find((t) => t.id === txId);
      if (tx?.type === "income" && category !== INCOME_CATEGORY) {
        throw new Error('Income always uses the "Income" category.');
      }
      if (tx?.type === "expense" && category === INCOME_CATEGORY) {
        throw new Error('"Income" can only be used for income.');
      }
      await updateTransactionCategory(txId, category);
      setTransactions(
        txRef.current.map((t) => (t.id === txId ? { ...t, category } : t)),
      );
    },
    [setTransactions],
  );

  const removeTransaction = useCallback(
    async (txId: string) => {
      await deleteTransaction(txId);
      setTransactions(txRef.current.filter((t) => t.id !== txId));
    },
    [setTransactions],
  );

  const importFromReceiptImage = useCallback(
    async (base64Data: string, mimeType: string, options?: AiImportOptions) =>
      processReceiptWithAI(base64Data, mimeType, importTransactions, options),
    [importTransactions],
  );

  const importFromStatementDocument = useCallback(
    async (base64Data: string, mimeType: string, options?: AiImportOptions) =>
      processStatementWithAI(base64Data, mimeType, importTransactions, options),
    [importTransactions],
  );

  return {
    transactions,
    isReady,
    addTransaction,
    importTransactions,
    importFromReceiptImage,
    importFromStatementDocument,
    updateTransactionCategory: updateCategory,
    deleteTransaction: removeTransaction,
  };
}

function sortByDateDesc(list: Transaction[]): Transaction[] {
  return [...list].sort((a, b) =>
    a.date === b.date
      ? b.createdAt.localeCompare(a.createdAt)
      : b.date.localeCompare(a.date),
  );
}

function getBudgetStatus(
  budget: {
    id: string;
    amount: number;
    category: string;
    period: string;
    startDate: string;
    endDate: string;
  },
  txs: Transaction[],
) {
  const { start, end } = getBudgetPeriodDates(budget);

  const spent = txs
    .filter(
      (t) =>
        t.category === budget.category &&
        t.type === "expense" &&
        parseISO(t.date) >= start &&
        parseISO(t.date) <= end,
    )
    .reduce((s, t) => s + t.amount, 0);

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

function getBudgetPeriodDates(budget: {
  period: string;
  startDate: string;
  endDate: string;
}): { start: Date; end: Date } {
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
