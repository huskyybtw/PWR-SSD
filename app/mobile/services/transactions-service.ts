import { listBudgets } from "@/repositories/budgets-repository";
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
import { Transaction, TransactionType } from "@/shared/types/finance";
import { generateId } from "@/shared/utils";
import { GoogleGenAI } from "@google/genai";
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
import { useCallback, useEffect, useState } from "react";
import { processReceiptWithAI } from "./transactions/ocr-reader";
import { processStatementWithAI } from "./transactions/statement-analyzer";

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
const cleanKey = apiKey.trim();

if (!apiKey) {
  console.warn(
    "Warning: EXPO_PUBLIC_GEMINI_API_KEY is not defined in your environment variables.",
  );
}

const ai = new GoogleGenAI({ apiKey: cleanKey });

export function useTransactionsService(
  onGoalsUpdate?: (income: number, expense: number) => Promise<void>,
  onBudgetAlert?: (
    type: "budget_exceeded" | "budget_near_limit",
    budgetName: string,
    budgetId: string,
    amount: number,
    spent: number,
    percentage: number,
  ) => Promise<void>,
) {
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

  async function runGoalsUpdate(income: number, expense: number) {
    if (!onGoalsUpdate) return;
    try {
      await onGoalsUpdate(income, expense);
    } catch (e) {
      console.error("Goal update failed", e);
    }
  }

  async function runBudgetAlerts(newTxs: Transaction[], allTxs: Transaction[]) {
    if (!onBudgetAlert) return;
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
          await onBudgetAlert(
            "budget_exceeded",
            budget.name,
            budget.id,
            budget.amount,
            status.spent,
            status.percentage,
          );
        } else if (status.isNearLimit) {
          await onBudgetAlert(
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
  }

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

      const isDup = transactions.some((t) => isDuplicateTransaction(t, newTx));
      if (isDup) throw new Error("Duplicate transaction detected.");

      const next = [newTx, ...transactions];
      setLocalTransactions(next);
      await createTransaction(newTx);

      await runGoalsUpdate(
        newTx.type === "income" ? newTx.amount : 0,
        newTx.type === "expense" ? newTx.amount : 0,
      );

      await runBudgetAlerts([newTx], next);

      return newTx;
    },
    [transactions, onGoalsUpdate, onBudgetAlert],
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
          isDuplicateTransaction(t, newTx),
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
    [transactions, onGoalsUpdate, onBudgetAlert],
  );

  const updateCategory = useCallback(
    async (txId: string, category: string) => {
      const next = transactions.map((t) =>
        t.id === txId ? { ...t, category } : t,
      );
      setLocalTransactions(next);
      await updateTransactionCategory(txId, category);
    },
    [transactions],
  );

  const removeTransaction = useCallback(
    async (txId: string) => {
      const next = transactions.filter((t) => t.id !== txId);
      setLocalTransactions(next);
      await deleteTransaction(txId);
    },
    [transactions],
  );

  const importFromReceiptImage = useCallback(
    async (base64Data: string, mimeType: string) =>
      processReceiptWithAI(ai, base64Data, mimeType, importTransactions),
    [importTransactions],
  );

  const importFromStatementDocument = useCallback(
    async (base64Data: string, mimeType: string) =>
      processStatementWithAI(ai, base64Data, mimeType, importTransactions),
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
        new Date(t.date) >= start &&
        new Date(t.date) <= end,
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
