import { createAlert } from "@/repositories/alerts-repository";
import { listBudgets } from "@/repositories/budgets-repository";
import {
  autoCategorize,
  DEFAULT_CATEGORIES,
} from "@/repositories/categories-repository";
import { listGoals, updateGoalAmount } from "@/repositories/goals-repository";
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  replaceTransactions,
  updateTransactionCategory,
} from "@/repositories/transactions-repository";
import {
  AlertMessage,
  Transaction,
  TransactionType,
} from "@/shared/types/finance";
import { generateId } from "@/shared/utils";
import { GoogleGenAI, Type } from "@google/genai"; // Import SDK
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

const ai = new GoogleGenAI({
  apiKey: cleanKey,
});

// --- NOWOŚĆ: Importujemy Twoją bezbłędną funkcję do celów! ---
import { processTransactionForGoals } from "./goal-transactions-service";

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
      // Oczekujemy teraz podania categoryId (number) zamiast category (string)
      data: Omit<Transaction, "id" | "createdAt" | "source"> & {
        source?: string;
      },
    ) => {
      // UWAGA: Auto-kategoryzacja musi teraz zwracać ID (number).
      // Na ten moment zakładamy, że użytkownik przekazuje categoryId w formularzu.
      const newTx: Transaction = {
        ...data,
        id: Date.now(), // Zakładając, że Transaction.id to number (zgodnie z SQLite 'integer')
        categoryId: data.categoryId || 1, // Zabezpieczenie na domyślną kategorię nr 1
        description: data.description || "",
        createdAt: new Date().toISOString(),
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
    try {
      const goals = await listGoals();

          for (const goal of goals) {
            const nextAmount =
              newTx.type === "income"
                ? goal.currentAmount + newTx.amount
                : Math.max(0, goal.currentAmount - newTx.amount);

            await updateGoalAmount(goal.id, nextAmount);
          }
        } catch (e) {
          console.error("Goal update failed", e);
        }
      // Orchestration: check budgets and create alerts when limits are reached
      // --- ORKIESTRACJA CELÓW: Wywołanie nowej logiki! ---
      try {
        await processTransactionForGoals(newTx);
      } catch (e) {
        console.error("Goals orchestration failed", e);
      }
      // ---------------------------------------------------

      // Orchestration: Budżety (wymagają w przyszłości migracji na categoryId tak jak Cele!)
      try {
        const budgets = await listBudgets();
        // Tymczasowo rzutujemy do String lub używamy ID, docelowo budżety też muszą przejść na relacje z categoryId
        const relevantBudgets = budgets.filter(
          (b) => String(b.category) === String(newTx.categoryId),
        );

        for (const budget of relevantBudgets) {
          const status = getBudgetStatus(budget, next);
          if (status.isExceeded && newTx.type === "expense") {
            const alert: AlertMessage = {
              id: generateId(),
              type: "budget_exceeded",
              title: "Budget Exceeded",
              message: `Your "${budget.name}" budget of ${budget.amount} has been exceeded. Current spending: ${status.spent.toFixed(2)}`,
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
              message: `Your "${budget.name}" budget is at ${status.percentage.toFixed(0)}%.`,
              relatedId: budget.id,
              createdAt: new Date().toISOString(),
              read: false,
            };
            await createAlert(alert);
          }
        }
      } catch (e) {
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
      category: string | number;
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
          String(transaction.categoryId) === String(budget.category) && // Zmiana na categoryId
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

  // const updateCategory = useCallback(
  //   async (txId: string, category: string) => {
  //     const next = transactions.map((transaction) =>
  //       transaction.id === txId ? { ...transaction, category } : transaction,
  //     );
  //     setLocalTransactions(next);
  //     await updateTransactionCategory(txId, category);
  //   },
  //   [transactions],
  // );

  // const removeTransaction = useCallback(
  //   async (txId: string) => {
  //     const next = transactions.filter(
  //       (transaction) => transaction.id !== txId,
  //     );
  //     setLocalTransactions(next);
  //     await deleteTransaction(txId);
  //   },
  //   [transactions],
  // );

  const importTransactions = useCallback(
    async (
      rawTransactions: Array<{
        amount: number;
        description: string;
        date: string;
        categoryId?: number; // Zmiana na categoryId
        type?: TransactionType;
      }>,
    ) => {
      const imported: Transaction[] = [];
      const skipped: typeof rawTransactions = [];

      for (const raw of rawTransactions) {
        const newTx: Transaction = {
          amount: raw.amount,
          description: raw.description,
          date: raw.date,
          categoryId: raw.categoryId || 1, // Domyślna kategoria zamiast autoCategorize (które zwracało tekst)
          type: raw.type || "expense",
          id: Date.now() + Math.floor(Math.random() * 1000), // Szybki generator ID
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

 const importFromReceiptImage = useCallback(
   async (base64Data: string, mimeType: string) => {
     return processReceiptWithAI(ai, base64Data, mimeType, importTransactions);
   },
   [importTransactions],
 );

 const importFromStatementDocument = useCallback(
   async (base64Data: string, mimeType: string) => {
     return processStatementWithAI(
       ai,
       base64Data,
       mimeType,
       importTransactions,
     );
   },
   [importTransactions],
 );
  const updateCategory = useCallback(
    async (txId: number, categoryId: number) => {
      // Zmiana z txId: string na number
      const next = transactions.map((transaction) =>
        transaction.id === txId ? { ...transaction, categoryId } : transaction,
      );
      setLocalTransactions(next);
      // await updateTransactionCategory(txId, categoryId); // Wymaga dostosowania po stronie repozytorium
    },
    [transactions],
  );

  const removeTransaction = useCallback(
    async (txId: number) => {
      // Zmiana z txId: string na number
      const next = transactions.filter(
        (transaction) => transaction.id !== txId,
      );
      setLocalTransactions(next);
      await deleteTransaction(String(txId)); // Rzutowanie dla bezpieczeństwa starego kodu
    },
    [transactions],
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

function isDuplicateTransaction(
  existing: Transaction,
  candidate: Transaction,
): boolean {
  return (
    existing.amount === candidate.amount &&
    (existing.description || "").trim().toLowerCase() ===
      (candidate.description || "").trim().toLowerCase() &&
    existing.date === candidate.date &&
    existing.type === candidate.type
  );
}
